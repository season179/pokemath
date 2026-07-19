// Telemetry ingest + retention tests (issue #24). Runs under plain
// `node --test` with an in-memory D1 double modelling only the SQL that
// events.ts issues — if a query changes, the double fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";

import { TELEMETRY_RETENTION_DAYS } from "../shared/telemetry.ts";
import { handleApi } from "./src/api.ts";
import { ingestEvents, purgeOldEvents } from "./src/events.ts";
import type { Auth } from "./src/auth.ts";

const USER_ID = "user-1";

type EventRow = {
  user_id: string;
  event_id: string;
  name: string;
  occurred_at: string;
  received_at: string;
  props_json: string;
};

class FakeD1 {
  events = new Map<string, EventRow>();
  batches = 0;

  async batch(statements: { run(): Promise<{ meta: { changes: number } }> }[]) {
    this.batches++;
    return Promise.all(statements.map((s) => s.run()));
  }

  prepare(sql: string) {
    const db = this;
    const args: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        args.push(...bound);
        return this;
      },
      async run(): Promise<{ meta: { changes: number } }> {
        if (sql.startsWith("INSERT OR IGNORE INTO events")) {
          const [userId, eventId, name, occurredAt, receivedAt, propsJson] = args as [
            string,
            string,
            string,
            string,
            string,
            string,
          ];
          const key = `${userId}|${eventId}`;
          if (db.events.has(key)) return { meta: { changes: 0 } };
          db.events.set(key, {
            user_id: userId,
            event_id: eventId,
            name,
            occurred_at: occurredAt,
            received_at: receivedAt,
            props_json: propsJson,
          });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("DELETE FROM events WHERE received_at < ?")) {
          const [cutoff] = args as [string];
          let changes = 0;
          for (const [key, row] of db.events) {
            if (row.received_at < cutoff) {
              db.events.delete(key);
              changes++;
            }
          }
          return { meta: { changes } };
        }
        throw new Error(`FakeD1: unexpected write: ${sql}`);
      },
    };
  }
}

function fakeAuth(signedIn = true): Auth {
  return {
    api: {
      getSession: async () => (signedIn ? { user: { id: USER_ID } } : null),
    },
  } as unknown as Auth;
}

function envOf(db: FakeD1): Env {
  return { DB: db } as unknown as Env;
}

function event(id: string, name = "session_ended", props: Record<string, unknown> = { reason: "sign_out", duringBattle: false }) {
  return { id, name, at: "2026-07-20T10:00:00.000Z", props };
}

function batchRequest(events: unknown[], contentLength?: number): Request {
  const body = JSON.stringify({ events });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (contentLength !== undefined) headers["content-length"] = String(contentLength);
  return new Request("https://game.pokemath.fun/api/events", { method: "POST", headers, body });
}

test("POST /api/events 401s without a session", async () => {
  const db = new FakeD1();
  const req = new Request("https://game.pokemath.fun/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: [] }),
  });
  const res = await handleApi(req, new URL(req.url), fakeAuth(false), envOf(db));
  assert.equal(res.status, 401);
});

test("a valid batch is stored with a server-side received_at", async () => {
  const db = new FakeD1();
  const res = await ingestEvents(
    batchRequest([
      event("aaaaaaaa-1111-4111-8111-111111111111"),
      event("bbbbbbbb-2222-4222-8222-222222222222", "creature_captured", { speciesId: "woolbright" }),
    ]),
    USER_ID,
    envOf(db),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { accepted: 2, dropped: 0 });
  assert.equal(db.events.size, 2);
  const row = db.events.get(`${USER_ID}|bbbbbbbb-2222-4222-8222-222222222222`)!;
  assert.equal(row.name, "creature_captured");
  assert.deepEqual(JSON.parse(row.props_json), { speciesId: "woolbright" });
  assert.equal(row.occurred_at, "2026-07-20T10:00:00.000Z");
  assert.ok(!Number.isNaN(Date.parse(row.received_at)));
});

test("individually invalid events are dropped, not fatal", async () => {
  const db = new FakeD1();
  const poisoned = {
    ...event("cccccccc-3333-4333-8333-333333333333", "question_answered", {
      battle: "wild",
      operation: "addition",
      correct: true,
    }),
    props: { battle: "wild", operation: "addition", correct: true, answer: 42 },
  };
  const res = await ingestEvents(
    batchRequest([event("dddddddd-4444-4444-8444-444444444444"), poisoned]),
    USER_ID,
    envOf(db),
  );
  assert.deepEqual(await res.json(), { accepted: 1, dropped: 1 });
  assert.equal(db.events.size, 1);
});

test("malformed envelopes are a whole-request 400", async () => {
  const db = new FakeD1();
  for (const body of ["not json", JSON.stringify({ events: "nope" }), JSON.stringify({})]) {
    const req = new Request("https://game.pokemath.fun/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const res = await ingestEvents(req, USER_ID, envOf(db));
    assert.equal(res.status, 400, body);
  }
});

test("oversized batches are refused before parsing", async () => {
  const db = new FakeD1();
  const res = await ingestEvents(batchRequest([], 17 * 1024), USER_ID, envOf(db));
  assert.equal(res.status, 413);
});

test("an oversized DECODED body is 413 even without a content-length header", async () => {
  const db = new FakeD1();
  // A streamed body carries no content-length; the size cap must bite on
  // the decoded payload, not the header.
  const padded = JSON.stringify({ events: [], pad: "x".repeat(17 * 1024) });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(padded));
      controller.close();
    },
  });
  const req = new Request("https://game.pokemath.fun/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // @ts-expect-error undici requires duplex for stream bodies
    duplex: "half",
  });
  assert.equal(req.headers.get("content-length"), null);
  const res = await ingestEvents(req, USER_ID, envOf(db));
  assert.equal(res.status, 413);
});

test("ingest writes the whole batch in one D1 batch round trip", async () => {
  const db = new FakeD1();
  await ingestEvents(
    batchRequest([
      event("aaaaaaaa-1111-4111-8111-111111111111"),
      event("bbbbbbbb-2222-4222-8222-222222222222"),
    ]),
    USER_ID,
    envOf(db),
  );
  assert.equal(db.batches, 1);
  assert.equal(db.events.size, 2);
});

test("retried flushes are idempotent on (user, event id)", async () => {
  const db = new FakeD1();
  const batch = [event("eeeeeeee-5555-4555-8555-555555555555")];
  await ingestEvents(batchRequest(batch), USER_ID, envOf(db));
  const res = await ingestEvents(batchRequest(batch), USER_ID, envOf(db));
  assert.deepEqual(await res.json(), { accepted: 1, dropped: 0 });
  assert.equal(db.events.size, 1);
});

test("purgeOldEvents deletes rows past the retention window only", async () => {
  const db = new FakeD1();
  const now = new Date("2026-07-20T00:00:00.000Z");
  const dayMs = 24 * 60 * 60 * 1000;
  const insert = async (id: string, receivedAt: Date) => {
    await db
      .prepare(
        "INSERT OR IGNORE INTO events (user_id, event_id, name, occurred_at, received_at, props_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(USER_ID, id, "session_ended", receivedAt.toISOString(), receivedAt.toISOString(), "{}")
      .run();
  };
  await insert("old-old-old-4111-8111-111111111111", new Date(now.getTime() - (TELEMETRY_RETENTION_DAYS + 1) * dayMs));
  await insert("new-new-new-4222-8222-222222222222", new Date(now.getTime() - (TELEMETRY_RETENTION_DAYS - 1) * dayMs));

  const deleted = await purgeOldEvents(envOf(db), now);
  assert.equal(deleted, 1);
  assert.equal(db.events.size, 1);
  assert.ok(db.events.has(`${USER_ID}|new-new-new-4222-8222-222222222222`));
});
