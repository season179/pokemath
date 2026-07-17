// JSON API: anonymous player creation, save load/store, cross-device claim.
//
//   POST /api/player        → create player + starter save → {token, code, save, saveVersion}
//   GET  /api/save          → (Bearer) → {save, saveVersion}
//   PUT  /api/save          → (Bearer, {save, baseVersion}) → CAS write → {saveVersion} | 409
//   POST /api/player/claim  → {code} → fresh token for that player → {token, code, save, saveVersion}
//
// Concurrency: integer version counter, compare-and-swap in one UPDATE.
// Codes are treated as passwords: constant 404 on miss, rate-limit at the edge.

import { createNewGame, validateSaveState, MAX_SAVE_JSON_BYTES } from "../../shared/index.ts";
import { bearerToken, generateSaveCode, generateToken, hashToken, normalizeSaveCode } from "./auth.ts";

export async function handleApi(request: Request, url: URL, env: Env): Promise<Response> {
  const route = `${request.method} ${url.pathname}`;
  switch (route) {
    case "POST /api/player":
      if (await isRateLimited(request, env)) return json({ error: "slow down" }, 429);
      return createPlayer(env);
    case "GET /api/save":
      return loadSave(request, env);
    case "PUT /api/save":
      return storeSave(request, env);
    case "POST /api/player/claim":
      if (await isRateLimited(request, env)) return json({ error: "slow down" }, 429);
      return claimPlayer(request, env);
    case "GET /api/health":
      return json({ ok: true, service: "pokemath", time: new Date().toISOString() });
    default:
      return json({ error: "not found" }, 404);
  }
}

async function createPlayer(env: Env): Promise<Response> {
  const now = new Date().toISOString();
  const playerId = crypto.randomUUID();
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const save = createNewGame();

  // Save codes collide rarely (26^6 ≈ 309M); retry a few times if unlucky.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSaveCode();
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO players (id, code, created_at) VALUES (?, ?, ?)").bind(playerId, code, now),
        env.DB.prepare(
          "INSERT INTO tokens (token_hash, player_id, created_at, last_used_at) VALUES (?, ?, ?, ?)",
        ).bind(tokenHash, playerId, now, now),
        env.DB.prepare(
          "INSERT INTO saves (player_id, payload_json, version, updated_at) VALUES (?, ?, 1, ?)",
        ).bind(playerId, JSON.stringify(save), now),
      ]);
      return json({ token, code, save, saveVersion: 1 }, 201);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return json({ error: "could not allocate save code" }, 500);
}

async function loadSave(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth) return json({ error: "unauthorized" }, 401);

  const row = await env.DB.prepare("SELECT payload_json, version FROM saves WHERE player_id = ?")
    .bind(auth.playerId)
    .first<{ payload_json: string; version: number }>();
  if (!row) return json({ error: "no save" }, 404);
  return json({ save: JSON.parse(row.payload_json), saveVersion: row.version });
}

async function storeSave(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth) return json({ error: "unauthorized" }, 401);

  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "invalid body" }, 400);
  const { save, baseVersion } = body as { save?: unknown; baseVersion?: unknown };
  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion)) {
    return json({ error: "baseVersion required" }, 400);
  }
  if (!validateSaveState(save)) return json({ error: "invalid save payload" }, 400);
  const payload = JSON.stringify(save);
  if (payload.length > MAX_SAVE_JSON_BYTES) return json({ error: "save too large" }, 400);

  const result = await env.DB.prepare(
    "UPDATE saves SET payload_json = ?, version = version + 1, updated_at = ? WHERE player_id = ? AND version = ?",
  )
    .bind(payload, new Date().toISOString(), auth.playerId, baseVersion)
    .run();

  if (result.meta.changes === 0) {
    const current = await env.DB.prepare("SELECT version FROM saves WHERE player_id = ?")
      .bind(auth.playerId)
      .first<{ version: number }>();
    return json({ error: "version conflict", saveVersion: current?.version ?? null }, 409);
  }
  return json({ saveVersion: baseVersion + 1 });
}

async function claimPlayer(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const rawCode = isRecord(body) && typeof body.code === "string" ? body.code : null;
  const code = rawCode ? normalizeSaveCode(rawCode) : null;
  if (!code) return json({ error: "not found" }, 404); // same shape as a miss

  const player = await env.DB.prepare("SELECT id FROM players WHERE code = ?")
    .bind(code)
    .first<{ id: string }>();
  if (!player) return json({ error: "not found" }, 404);

  const now = new Date().toISOString();
  const token = generateToken();
  await env.DB.prepare(
    "INSERT INTO tokens (token_hash, player_id, created_at, last_used_at) VALUES (?, ?, ?, ?)",
  )
    .bind(await hashToken(token), player.id, now, now)
    .run();

  const row = await env.DB.prepare("SELECT payload_json, version FROM saves WHERE player_id = ?")
    .bind(player.id)
    .first<{ payload_json: string; version: number }>();
  if (!row) return json({ error: "not found" }, 404);
  return json({ token, code, save: JSON.parse(row.payload_json), saveVersion: row.version });
}

async function authenticate(request: Request, env: Env): Promise<{ playerId: string } | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare("SELECT player_id FROM tokens WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ player_id: string }>();
  if (!row) return null;
  // Fire-and-forget freshness stamp; failure must not break the request.
  await env.DB.prepare("UPDATE tokens SET last_used_at = ? WHERE token_hash = ?")
    .bind(new Date().toISOString(), tokenHash)
    .run()
    .catch(() => {});
  return { playerId: row.player_id };
}

async function isRateLimited(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.SENSITIVE_RATE.limit({ key: ip });
  return !success;
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

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes("UNIQUE constraint failed");
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
