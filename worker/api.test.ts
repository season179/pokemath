// API save-route tests (issue #3): the Worker is the save trust boundary.
// Every payload crossing it — stored rows on read, client writes, fresh
// mints — passes through normalizeSave, so v1 (preview) payloads converge to
// v2 and garbage never reaches D1.
//
// Runs under plain `node --test` with an in-memory D1/auth double; no
// wrangler, no network. Only the SQL statements api.ts actually issues are
// modelled — if a query changes, these doubles fail loudly.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createNewGame,
  createNewGameV2,
  migrateSave,
  SPECIES_BY_ID,
  validateSaveV2,
  type SaveState,
  type SaveStateV2,
} from "../shared/index.ts";
import { handleApi } from "./src/api.ts";
import type { Auth } from "./src/auth.ts";

const USER_ID = "user-1";

type SaveRow = { payload_json: string; version: number };

class FakeD1 {
  users = new Map<string, { playerName: string | null }>([[USER_ID, { playerName: "WINNI" }]]);
  saves = new Map<string, SaveRow>();

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  storedSave(): SaveStateV2 | SaveState {
    const row = this.saves.get(USER_ID);
    assert.ok(row, "expected a stored save row");
    return JSON.parse(row.payload_json);
  }
}

class FakeStatement {
  private args: unknown[] = [];
  private db: FakeD1;
  private sql: string;
  constructor(db: FakeD1, sql: string) {
    this.db = db;
    this.sql = sql;
  }
  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }
  async first<T>(): Promise<T | null> {
    const [a0] = this.args;
    if (this.sql.includes('SELECT "playerName" FROM "user"')) {
      return (this.db.users.get(a0 as string) ?? null) as T | null;
    }
    if (this.sql.includes("SELECT payload_json, version FROM saves")) {
      return (this.db.saves.get(a0 as string) ?? null) as T | null;
    }
    if (this.sql.includes("SELECT version FROM saves")) {
      const row = this.db.saves.get(a0 as string);
      return (row ? { version: row.version } : null) as T | null;
    }
    throw new Error(`FakeD1: unexpected SELECT: ${this.sql}`);
  }
  async run(): Promise<{ meta: { changes: number } }> {
    if (this.sql.startsWith("INSERT INTO saves")) {
      const [userId, payload] = this.args as [string, string];
      if (this.db.saves.has(userId)) return { meta: { changes: 0 } }; // ON CONFLICT DO NOTHING
      this.db.saves.set(userId, { payload_json: payload, version: 1 });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE saves SET payload_json")) {
      const [payload, , userId, baseVersion] = this.args as [string, string, string, number];
      const row = this.db.saves.get(userId);
      if (!row || row.version !== baseVersion) return { meta: { changes: 0 } }; // CAS miss
      this.db.saves.set(userId, { payload_json: payload, version: row.version + 1 });
      return { meta: { changes: 1 } };
    }
    if (this.sql.includes('UPDATE "user" SET "playerName"')) return { meta: { changes: 1 } };
    throw new Error(`FakeD1: unexpected write: ${this.sql}`);
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

function apiRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`https://game.pokemath.fun${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function storeV1(db: FakeD1, save: SaveState, version = 1): void {
  db.saves.set(USER_ID, { payload_json: JSON.stringify(save), version });
}

async function callApi(db: FakeD1, request: Request, signedIn = true): Promise<Response> {
  return handleApi(request, new URL(request.url), fakeAuth(signedIn), envOf(db));
}

// --- fixtures ---

function v1Fixture(): SaveState {
  return createNewGame(SPECIES_BY_ID.cloudhorn, new Date("2026-07-18T12:00:00.000Z"));
}

function v2Fixture(): SaveStateV2 {
  return createNewGameV2(SPECIES_BY_ID.lumentail, new Date("2026-07-18T12:00:00.000Z"));
}

// --- tests ---

test("all API routes 401 without a session", async () => {
  const db = new FakeD1();
  const res = await callApi(db, apiRequest("GET", "/api/save"), false);
  assert.equal(res.status, 401);
});

test("GET /api/save migrates a stored v1 row to v2 on read", async () => {
  const db = new FakeD1();
  storeV1(db, v1Fixture(), 7);
  const res = await callApi(db, apiRequest("GET", "/api/save"));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { save: SaveStateV2; saveVersion: number; playerName: string };
  assert.equal(body.save.version, 2);
  assert.ok(validateSaveV2(body.save));
  assert.equal(body.save.ownedCreatures[0].speciesId, "cloudhorn");
  assert.equal(body.saveVersion, 7); // integer CAS counter is independent of payload version
  assert.equal(body.playerName, "WINNI");
  // Read alone does not rewrite the stored row — the next PUT converges it.
  assert.equal(db.storedSave().version, 1);
});

test("GET /api/save passes a stored v2 row through", async () => {
  const db = new FakeD1();
  db.saves.set(USER_ID, { payload_json: JSON.stringify(v2Fixture()), version: 3 });
  const res = await callApi(db, apiRequest("GET", "/api/save"));
  const body = (await res.json()) as { save: SaveStateV2 };
  assert.equal(body.save.version, 2);
  assert.equal(body.save.ownedCreatures[0].speciesId, "lumentail");
});

test("GET /api/save with no row signals the starter screen", async () => {
  const db = new FakeD1();
  const res = await callApi(db, apiRequest("GET", "/api/save"));
  const body = (await res.json()) as { save: null; saveVersion: number };
  assert.equal(body.save, null);
  assert.equal(body.saveVersion, 0);
});

test("POST /api/save/new mints a v2 save and is idempotent", async () => {
  const db = new FakeD1();
  const res = await callApi(db, apiRequest("POST", "/api/save/new", { starter: "sproutkit" }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { save: SaveStateV2; saveVersion: number };
  assert.equal(body.save.version, 2);
  assert.equal(body.save.ownedCreatures.length, 1);
  assert.equal(body.save.ownedCreatures[0].speciesId, "sproutkit");
  assert.equal(body.save.starterCreatureId, body.save.ownedCreatures[0].creatureId);
  assert.equal(db.storedSave().version, 2); // stored as v2 from the first write

  const again = (await (
    await callApi(db, apiRequest("POST", "/api/save/new", { starter: "cloudhorn" }))
  ).json()) as { save: SaveStateV2 };
  assert.equal(again.save.ownedCreatures[0].speciesId, "sproutkit"); // untouched
});

test("POST /api/save/new rejects an unknown starter", async () => {
  const db = new FakeD1();
  const res = await callApi(db, apiRequest("POST", "/api/save/new", { starter: "pikachu" }));
  assert.equal(res.status, 400);
});

test("PUT /api/save migrates a v1 write to v2 (accepts and migrates v1)", async () => {
  const db = new FakeD1();
  storeV1(db, v1Fixture(), 4);
  const res = await callApi(db, apiRequest("PUT", "/api/save", { save: v1Fixture(), baseVersion: 4 }));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { saveVersion: number };
  assert.equal(body.saveVersion, 5);
  const stored = db.storedSave();
  assert.equal(stored.version, 2, "the stored row converged to v2");
  assert.ok(validateSaveV2(stored));
});

test("PUT /api/save stores a v2 write", async () => {
  const db = new FakeD1();
  db.saves.set(USER_ID, { payload_json: JSON.stringify(v2Fixture()), version: 2 });
  const write = v2Fixture();
  const res = await callApi(db, apiRequest("PUT", "/api/save", { save: write, baseVersion: 2 }));
  assert.equal(res.status, 200);
  assert.equal(db.storedSave().version, 2);
});

test("PUT /api/save enforces the compare-and-swap version", async () => {
  const db = new FakeD1();
  db.saves.set(USER_ID, { payload_json: JSON.stringify(v2Fixture()), version: 9 });
  const res = await callApi(db, apiRequest("PUT", "/api/save", { save: v2Fixture(), baseVersion: 8 }));
  assert.equal(res.status, 409);
  const body = (await res.json()) as { saveVersion: number };
  assert.equal(body.saveVersion, 9);
});

test("PUT /api/save rejects garbage and future versions at the boundary", async () => {
  const db = new FakeD1();
  storeV1(db, v1Fixture(), 1);
  for (const bad of [null, { hello: "world" }, { version: 3 }, { version: 2, team: {} }]) {
    const res = await callApi(db, apiRequest("PUT", "/api/save", { save: bad, baseVersion: 1 }));
    assert.equal(res.status, 400, `payload should be rejected: ${JSON.stringify(bad)}`);
  }
  assert.equal(db.storedSave().version, 1, "rejected writes never touch the row");
});

test("PUT /api/save requires an integer baseVersion", async () => {
  const db = new FakeD1();
  storeV1(db, v1Fixture(), 1);
  const res = await callApi(db, apiRequest("PUT", "/api/save", { save: v1Fixture() }));
  assert.equal(res.status, 400);
});

test("a v1 row survives a full read-write round trip as v2", async () => {
  // The migration path the kids' real preview saves take on first contact
  // with the v2 world: read migrates in memory, the client's checkpoint then
  // converges the stored row.
  const db = new FakeD1();
  storeV1(db, v1Fixture(), 1);
  const got = (await (
    await callApi(db, apiRequest("GET", "/api/save"))
  ).json()) as { save: SaveStateV2; saveVersion: number };
  const migrated = migrateSave(v1Fixture());
  assert.equal(got.save.ownedCreatures.length, migrated.ownedCreatures.length);

  const put = await callApi(
    db,
    apiRequest("PUT", "/api/save", { save: got.save, baseVersion: got.saveVersion }),
  );
  assert.equal(put.status, 200);
  const stored = db.storedSave();
  assert.equal(stored.version, 2);
  assert.ok(validateSaveV2(stored));
});
