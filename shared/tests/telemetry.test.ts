// Telemetry registry tests (issue #24): the registry is the privacy boundary.
// These tests pin the event contract — names, required properties, rejection
// of anything free-form or answer-revealing — so a careless future edit can't
// widen what the game reports about a child.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_EVENTS_PER_BATCH,
  MAX_PROPS_JSON_BYTES,
  TELEMETRY_EVENTS,
  TELEMETRY_RETENTION_DAYS,
  parseEventBatch,
  validateTelemetryEvent,
} from "../telemetry.ts";

const base = { id: "01234567-89ab-cdef-0123-456789abcdef", at: "2026-07-20T10:00:00.000Z" };

function event(name: string, props: Record<string, unknown>): unknown {
  return { ...base, name, props };
}

// --- every emitted event validates with realistic payloads -----------------

test("emitted events accept their realistic payloads", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["question_answered", { battle: "wild", operation: "addition", correct: true }],
    [
      "question_answered",
      { battle: "boss", operation: "mixed (add/sub)", correct: false, topic: "4.1", tp: 3, step: 1, steps: 3 },
    ],
    ["battle_outcome", { battle: "wild", outcome: "fled", asked: 2, correct: 1 }],
    ["battle_outcome", { battle: "boss", outcome: "won", asked: 5, correct: 5 }],
    ["creature_captured", { speciesId: "woolbright" }],
    ["session_ended", { reason: "sign_out", duringBattle: false }],
    ["session_ended", { reason: "page_unload", duringBattle: true }],
  ];
  for (const [name, props] of cases) {
    assert.equal(validateTelemetryEvent(event(name, props)), null, `${name} ${JSON.stringify(props)}`);
  }
});

test("reserved hint/review events already validate their schemas", () => {
  assert.equal(TELEMETRY_EVENTS.hint_used.emitted, false);
  assert.equal(TELEMETRY_EVENTS.review_question_answered.emitted, false);
  assert.equal(
    validateTelemetryEvent(event("hint_used", { battle: "wild", operation: "subtraction", tp: 2 })),
    null,
  );
  assert.equal(
    validateTelemetryEvent(event("review_question_answered", { operation: "addition", correct: true })),
    null,
  );
});

// --- privacy boundary: free-form and answer-revealing payloads are refused --

test("unknown event names are rejected", () => {
  assert.match(validateTelemetryEvent(event("answer_speed_ms", { ms: 1200 }))!, /unknown event name/);
});

test("extra properties are rejected, even innocent-looking ones", () => {
  for (const extra of [
    { answer: 42 }, // raw answer value
    { picked: 3 }, // picked choice
    { durationMs: 850 }, // answer speed
    { playerName: "WINNI" }, // child-identifying
    { note: "she said hi" }, // free text
  ]) {
    const err = validateTelemetryEvent(
      event("question_answered", { battle: "wild", operation: "addition", correct: true, ...extra }),
    );
    assert.match(err!, /unknown prop/, JSON.stringify(extra));
  }
});

test("required properties must be present and well-typed", () => {
  assert.match(validateTelemetryEvent(event("question_answered", { battle: "wild", operation: "addition" }))!, /missing prop "correct"/);
  assert.match(
    validateTelemetryEvent(event("question_answered", { battle: "wild", operation: "addition", correct: "yes" }))!,
    /bad prop "correct"/,
  );
  assert.match(
    validateTelemetryEvent(event("battle_outcome", { battle: "wild", outcome: "rage-quit", asked: 1, correct: 0 }))!,
    /bad prop "outcome"/,
  );
  assert.match(
    validateTelemetryEvent(event("question_answered", { battle: "wild", operation: "ADDITION!!", correct: true }))!,
    /bad prop "operation"/,
  );
  assert.match(
    validateTelemetryEvent(event("question_answered", { battle: "wild", operation: "addition", correct: true, tp: 9 }))!,
    /bad prop "tp"/,
  );
});

test("envelope fields are checked", () => {
  assert.match(validateTelemetryEvent(null)!, /not an object/);
  assert.match(validateTelemetryEvent({ ...event("session_ended", { reason: "sign_out", duringBattle: false }), id: "x" })!, /bad event id/);
  assert.equal(
    validateTelemetryEvent(event("session_ended", { reason: "sign_out", duringBattle: false })),
    null,
  );
  const badAt = { ...event("session_ended", { reason: "sign_out", duringBattle: false }), at: "not-a-date" };
  assert.match(validateTelemetryEvent(badAt)!, /bad timestamp/);
});

test("props payload is size-capped", () => {
  const huge = "x".repeat(MAX_PROPS_JSON_BYTES);
  const err = validateTelemetryEvent(
    event("creature_captured", { speciesId: "woolbright", padding: huge }),
  );
  // Caught either as an unknown prop or by the byte cap — never accepted.
  assert.ok(err);
});

// --- batch parsing ----------------------------------------------------------

test("parseEventBatch drops bad events without poisoning the batch", () => {
  const good = event("creature_captured", { speciesId: "woolbright" });
  const bad = event("question_answered", { battle: "wild", operation: "addition", correct: true, answer: 42 });
  const parsed = parseEventBatch({ events: [good, bad] });
  assert.ok(parsed);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.dropped, 1);
});

test("parseEventBatch rejects malformed envelopes", () => {
  assert.equal(parseEventBatch(null), null);
  assert.equal(parseEventBatch({}), null);
  assert.equal(parseEventBatch({ events: "nope" }), null);
  const tooMany = { events: Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => event("session_ended", { reason: "sign_out", duringBattle: false })) };
  assert.equal(parseEventBatch(tooMany), null);
});

// --- the privacy constants are pinned ---------------------------------------

test("retention and caps stay at their documented values", () => {
  // docs/learning-events.md states these numbers; change both together.
  assert.equal(TELEMETRY_RETENTION_DAYS, 90);
  assert.ok(MAX_EVENTS_PER_BATCH <= 100);
});
