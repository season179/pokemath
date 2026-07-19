// Telemetry ingest + retention (issue #24). The client batches learning
// events to POST /api/events; the shared registry (shared/telemetry.ts) is
// the only schema, so nothing free-form or child-identifying can be stored.
// Retention: rows live TELEMETRY_RETENTION_DAYS after receipt; a daily cron
// (index.ts scheduled handler) purges older rows.

import {
  MAX_BATCH_JSON_BYTES,
  TELEMETRY_RETENTION_DAYS,
  parseEventBatch,
} from "../../shared/telemetry.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function ingestEvents(request: Request, userId: string, env: Env): Promise<Response> {
  // Reject oversized envelopes before parsing; the registry caps each
  // event's props separately.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BATCH_JSON_BYTES) return json({ error: "batch too large" }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  // Content-Length can lie (or be absent under chunked encoding) — enforce
  // the cap on the decoded payload too.
  if (JSON.stringify(body ?? null).length > MAX_BATCH_JSON_BYTES) {
    return json({ error: "batch too large" }, 413);
  }

  const parsed = parseEventBatch(body);
  if (!parsed) return json({ error: "invalid event batch" }, 400);

  const receivedAt = new Date().toISOString();
  for (const event of parsed.events) {
    // INSERT OR IGNORE: client retries (offline queue flushes) can resend an
    // id; the first write wins and the event is never double-counted.
    await env.DB.prepare(
      "INSERT OR IGNORE INTO events (user_id, event_id, name, occurred_at, received_at, props_json) " +
        "VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(userId, event.id, event.name, event.at, receivedAt, JSON.stringify(event.props))
      .run();
  }
  return json({ accepted: parsed.events.length, dropped: parsed.dropped });
}

/** Delete rows older than the retention window. Returns the delete count. */
export async function purgeOldEvents(env: Env, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await env.DB.prepare("DELETE FROM events WHERE received_at < ?")
    .bind(cutoff.toISOString())
    .run();
  return result.meta.changes;
}
