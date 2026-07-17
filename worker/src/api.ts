// Game JSON API (auth itself lives under /api/auth/*, handled by better-auth):
//
//   GET  /api/save          → (session) → {save, saveVersion, playerName} | starter
//   PUT  /api/save          → (session, {save, baseVersion}) → CAS write → {saveVersion} | 409
//   PUT  /api/profile/name  → (session, {name}) → validate ^[A-Za-z0-9]{1,10}$ → {name}
//   GET  /api/health        → liveness
//
// Concurrency: integer version counter, compare-and-swap in one UPDATE.
// All routes 401 without a valid session cookie.

import { createNewGame, validateSaveState, MAX_SAVE_JSON_BYTES } from "../../shared/index.ts";
import type { Auth } from "./auth.ts";

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
    case "PUT /api/save":
      return storeSave(request, userId, env);
    case "PUT /api/profile/name":
      return setName(request, userId, env);
    default:
      return json({ error: "not found" }, 404);
  }
}

// First load after sign-in creates the starter save row — no separate
// "create player" endpoint; the better-auth user row is the player.
async function loadSave(userId: string, env: Env): Promise<Response> {
  const player = await env.DB.prepare('SELECT "playerName" FROM "user" WHERE id = ?')
    .bind(userId)
    .first<{ playerName: string | null }>();
  if (!player) return json({ error: "unauthorized" }, 401);

  const row = await env.DB.prepare("SELECT payload_json, version FROM saves WHERE user_id = ?")
    .bind(userId)
    .first<{ payload_json: string; version: number }>();
  if (row) {
    return json({
      save: JSON.parse(row.payload_json),
      saveVersion: row.version,
      playerName: player.playerName,
    });
  }

  const save = createNewGame();
  await env.DB.prepare(
    "INSERT INTO saves (user_id, payload_json, version, updated_at) VALUES (?, ?, 1, ?) " +
      "ON CONFLICT (user_id) DO NOTHING",
  )
    .bind(userId, JSON.stringify(save), new Date().toISOString())
    .run();
  return json({ save, saveVersion: 1, playerName: player.playerName });
}

async function storeSave(request: Request, userId: string, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!isRecord(body)) return json({ error: "invalid body" }, 400);
  const { save, baseVersion } = body as { save?: unknown; baseVersion?: unknown };
  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion)) {
    return json({ error: "baseVersion required" }, 400);
  }
  if (!validateSaveState(save)) return json({ error: "invalid save payload" }, 400);
  const payload = JSON.stringify(save);
  if (payload.length > MAX_SAVE_JSON_BYTES) return json({ error: "save too large" }, 400);

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
