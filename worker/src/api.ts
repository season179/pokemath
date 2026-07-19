// Game JSON API (auth itself lives under /api/auth/*, handled by better-auth):
//
//   GET  /api/save          → (session) → {save|null, saveVersion, playerName}
//   POST /api/save/new      → (session, {starter}) → mint save with chosen starter → {save, saveVersion}
//   PUT  /api/save          → (session, {save, baseVersion}) → CAS write → {saveVersion} | 409
//   PUT  /api/profile/name  → (session, {name}) → validate ^[A-Za-z0-9]{1,10}$ → {name}
//   POST /api/events        → (session, {events[]}) → {accepted, dropped} — telemetry ingest (#24)
//   GET  /api/health        → liveness
//
// A null save from GET means the player never chose a starter; the client
// shows the starter screen and calls POST /api/save/new.
// Concurrency: integer version counter, compare-and-swap in one UPDATE.
// All routes 401 without a valid session cookie.
//
// Save versioning (#3): the wire format is save v2. Every payload that crosses
// this boundary — a stored row on read, a client write, a fresh mint — passes
// through `normalizeSave`: a v1 (Woolly preview) payload is migrated to v2,
// a v2 payload is validated and passed through, anything else is rejected.
// This deploys BEFORE any client writes v2, so no v1 save is left behind.

import {
  createNewGameV2,
  isStarterId,
  MAX_SAVE_JSON_BYTES_V2,
  normalizeSave,
  SaveMigrationError,
  SPECIES_BY_ID,
  type SaveStateV2,
} from "../../shared/index.ts";
import type { Auth } from "./auth.ts";
import { ingestEvents } from "./events.ts";

export const PLAYER_NAME_RE = /^[A-Za-z0-9]{1,10}$/;

export async function handleApi(request: Request, url: URL, auth: Auth, env: Env): Promise<Response> {
  const route = `${request.method} ${url.pathname}`;
  if (route === "GET /api/health") {
    return json({ ok: true, service: "pokemath", time: new Date().toISOString() });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "unauthorized" }, 401);
  const userId = session.user.id;

  switch (route) {
    case "GET /api/save":
      return loadSave(userId, env);
    case "POST /api/save/new":
      return createSave(request, userId, env);
    case "PUT /api/save":
      return storeSave(request, userId, env);
    case "PUT /api/profile/name":
      return setName(request, userId, env);
    case "POST /api/events":
      return ingestEvents(request, userId, env);
    default:
      return json({ error: "not found" }, 404);
  }
}

// No row yet means the player hasn't chosen a starter: the save is only
// minted by POST /api/save/new, so a brand-new account sees save: null.
async function loadSave(userId: string, env: Env): Promise<Response> {
  const player = await env.DB.prepare('SELECT "playerName" FROM "user" WHERE id = ?')
    .bind(userId)
    .first<{ playerName: string | null }>();
  if (!player) return json({ error: "unauthorized" }, 401);

  const row = await env.DB.prepare("SELECT payload_json, version FROM saves WHERE user_id = ?")
    .bind(userId)
    .first<{ payload_json: string; version: number }>();
  if (row) {
    let save;
    try {
      // Migrate-on-read: a v1 row is served as v2; the row itself is
      // rewritten on the next successful PUT.
      save = normalizeSave(JSON.parse(row.payload_json));
    } catch (err) {
      if (err instanceof SaveMigrationError) {
        return json({ error: "stored save is unreadable" }, 500);
      }
      throw err;
    }
    return json({
      save,
      saveVersion: row.version,
      playerName: player.playerName,
    });
  }
  return json({ save: null, saveVersion: 0, playerName: player.playerName });
}

// The first-start choice. Idempotent: if a save already exists (double tap,
// second tab), the existing one is returned untouched — a choice can never
// overwrite progress.
async function createSave(request: Request, userId: string, env: Env): Promise<Response> {
  const body = await readJson(request);
  const starterId = isRecord(body) ? body.starter : null;
  if (!isStarterId(starterId)) return json({ error: "unknown starter" }, 400);

  const save = createNewGameV2(SPECIES_BY_ID[starterId]);
  await env.DB.prepare(
    "INSERT INTO saves (user_id, payload_json, version, updated_at) VALUES (?, ?, 1, ?) " +
      "ON CONFLICT (user_id) DO NOTHING",
  )
    .bind(userId, JSON.stringify(save), new Date().toISOString())
    .run();

  // Read back whichever row won so the response always matches the DB.
  const row = await env.DB.prepare("SELECT payload_json, version FROM saves WHERE user_id = ?")
    .bind(userId)
    .first<{ payload_json: string; version: number }>();
  if (!row) return json({ error: "internal error" }, 500);
  return json({ save: JSON.parse(row.payload_json), saveVersion: row.version });
}

async function storeSave(request: Request, userId: string, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "invalid body" }, 400);
  const { save: rawSave, baseVersion } = body as { save?: unknown; baseVersion?: unknown };
  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion)) {
    return json({ error: "baseVersion required" }, 400);
  }
  let save: SaveStateV2;
  try {
    // Migrate-on-write: a v1 (preview) payload converges to v2; a v2 payload
    // is validated as-is; anything else is rejected at the trust boundary.
    save = normalizeSave(rawSave);
  } catch (err) {
    if (err instanceof SaveMigrationError) {
      return json({ error: "invalid save payload" }, 400);
    }
    throw err;
  }
  const payload = JSON.stringify(save);
  if (payload.length > MAX_SAVE_JSON_BYTES_V2) return json({ error: "save too large" }, 400);

  const result = await env.DB.prepare(
    "UPDATE saves SET payload_json = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?",
  )
    .bind(payload, new Date().toISOString(), userId, baseVersion)
    .run();

  if (result.meta.changes === 0) {
    const current = await env.DB.prepare("SELECT version FROM saves WHERE user_id = ?")
      .bind(userId)
      .first<{ version: number }>();
    return json({ error: "version conflict", saveVersion: current?.version ?? null }, 409);
  }
  return json({ saveVersion: baseVersion + 1 });
}

async function setName(request: Request, userId: string, env: Env): Promise<Response> {
  const body = await readJson(request);
  const name = isRecord(body) && typeof body.name === "string" ? body.name : null;
  if (!name || !PLAYER_NAME_RE.test(name)) {
    return json({ error: "name must be 1-10 letters or numbers" }, 400);
  }
  await env.DB.prepare('UPDATE "user" SET "playerName" = ?, "updatedAt" = ? WHERE id = ?')
    .bind(name, new Date().toISOString(), userId)
    .run();
  return json({ name });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
