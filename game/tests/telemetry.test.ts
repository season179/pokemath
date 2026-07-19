// Client telemetry queue tests (issue #24): emission-time validation,
// offline queueing, flush reconciliation, and unload behaviour — driven with
// injected storage/fetch so no browser or network is involved.

import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_EVENTS_PER_BATCH, MAX_QUEUED_EVENTS } from "../../shared/telemetry.ts";
import { Telemetry } from "../client/telemetry.ts";

class FakeStorage {
  map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function fakeFetch(status: number): { fn: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fn = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(init?.body));
    return new Response("{}", { status });
  }) as typeof fetch;
  return { fn, calls };
}

let idCounter = 0;
const idgen = () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`;
const now = () => new Date("2026-07-20T10:00:00.000Z");

const CORRECT = { battle: "wild", operation: "addition", correct: true };

function make(fetchStatus = 200) {
  const storage = new FakeStorage();
  const { fn, calls } = fakeFetch(fetchStatus);
  const telemetry = new Telemetry({ storage, fetchFn: fn, now, idgen });
  return { storage, calls, telemetry };
}

test("emit queues a validated event and persists it", () => {
  const { storage, telemetry } = make();
  telemetry.emit("question_answered", CORRECT);
  assert.equal(telemetry.pending, 1);
  const stored = JSON.parse(storage.getItem("pokemath.events")!) as unknown[];
  assert.equal(stored.length, 1);
});

test("emit drops invalid events at the source — they never queue", () => {
  const { telemetry } = make();
  telemetry.emit("question_answered", { ...CORRECT, answer: 42 });
  telemetry.emit("not_an_event", {});
  assert.equal(telemetry.pending, 0);
});

test("a successful flush clears the sent events", async () => {
  const { telemetry, calls } = make(200);
  telemetry.emit("question_answered", CORRECT);
  telemetry.emit("session_ended", { reason: "sign_out", duringBattle: false });
  await telemetry.flush();
  assert.equal(telemetry.pending, 0);
  const body = JSON.parse(calls[0]) as { events: { name: string }[] };
  assert.deepEqual(
    body.events.map((e) => e.name),
    ["question_answered", "session_ended"],
  );
});

test("network failure keeps the queue for the next checkpoint", async () => {
  const storage = new FakeStorage();
  const failing = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  const telemetry = new Telemetry({ storage, fetchFn: failing, now, idgen });
  telemetry.emit("question_answered", CORRECT);
  await telemetry.flush();
  assert.equal(telemetry.pending, 1);
});

test("401/5xx keep the queue; a 400 (client bug) drops the bad batch", async () => {
  for (const status of [401, 500]) {
    const { telemetry } = make(status);
    telemetry.emit("question_answered", CORRECT);
    await telemetry.flush();
    assert.equal(telemetry.pending, 1, `status ${status}`);
  }
  const { telemetry } = make(400);
  telemetry.emit("question_answered", CORRECT);
  await telemetry.flush();
  assert.equal(telemetry.pending, 0);
});

test("flush sends at most one batch", async () => {
  const { telemetry, calls } = make(200);
  for (let i = 0; i < MAX_EVENTS_PER_BATCH + 20; i++) {
    telemetry.emit("question_answered", CORRECT);
  }
  await telemetry.flush();
  const body = JSON.parse(calls[0]) as { events: unknown[] };
  assert.equal(body.events.length, MAX_EVENTS_PER_BATCH);
  assert.equal(telemetry.pending, 20);
});

test("the queue caps at MAX_QUEUED_EVENTS, oldest first", () => {
  const { telemetry } = make();
  for (let i = 0; i < MAX_QUEUED_EVENTS + 10; i++) {
    telemetry.emit("question_answered", CORRECT);
  }
  assert.equal(telemetry.pending, MAX_QUEUED_EVENTS);
});

test("a reloaded queue survives, but hand-edited junk is dropped", () => {
  const storage = new FakeStorage();
  const { fn } = fakeFetch(200);
  const first = new Telemetry({ storage, fetchFn: fn, now, idgen });
  first.emit("question_answered", CORRECT);

  // Tamper: a stale entry that no longer matches the registry.
  const stored = JSON.parse(storage.getItem("pokemath.events")!) as Record<string, unknown>[];
  stored.push({ id: "junk-junk-junk-4111-8111-111111111111", name: "nope", at: "2026-07-20T10:00:00.000Z", props: {} });
  storage.setItem("pokemath.events", JSON.stringify(stored));

  const reloaded = new Telemetry({ storage, fetchFn: fn, now, idgen });
  assert.equal(reloaded.pending, 1);
});

test("close() empties the queue and refuses future emissions (sign-out)", async () => {
  const { storage, telemetry, calls } = make(200);
  telemetry.emit("question_answered", CORRECT);
  telemetry.close();
  assert.equal(telemetry.pending, 0);
  assert.equal(storage.getItem("pokemath.events"), null);
  telemetry.emit("question_answered", CORRECT); // dropped: closed
  await telemetry.flush();
  assert.equal(telemetry.pending, 0);
  assert.equal(calls.length, 0);
});

test("flushOnUnload posts with keepalive and reconciles on success", async () => {
  const { telemetry, calls } = make(200);
  telemetry.emit("question_answered", CORRECT);
  telemetry.flushOnUnload();
  await Promise.resolve(); // let the post promise settle
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(telemetry.pending, 0);
  assert.ok(calls[0].includes("question_answered"));
});
