// Report aggregation tests (issue #24, AC4): predicted-vs-observed
// difficulty, cell suppression, and both export shapes.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MIN_CELL,
  aggregate,
  parseRows,
  renderMarkdown,
} from "./render-learning-report.mjs";

function row(name, props, at = "2026-07-20T10:00:00.000Z") {
  return { name, occurred_at: at, props_json: JSON.stringify(props) };
}

function answers(tp, total, correctShare) {
  const rows = [];
  for (let i = 0; i < total; i++) {
    rows.push(
      row("question_answered", {
        battle: "wild",
        operation: "addition",
        tp,
        correct: i < Math.round(total * correctShare),
      }),
    );
  }
  return rows;
}

test("parseRows accepts both wrangler's envelope and a bare array", () => {
  const bare = [row("session_ended", { reason: "sign_out", duringBattle: false })];
  assert.equal(parseRows(bare).length, 1);
  const wrapped = [{ results: bare }];
  assert.equal(parseRows(wrapped).length, 1);
});

test("correctness aggregates by operation/topic/TP with rates", () => {
  const agg = aggregate(answers(2, 10, 0.8));
  assert.deepEqual(agg.byOperation.get("addition"), { asked: 10, correct: 8 });
  assert.deepEqual(agg.byTp.get(2), { asked: 10, correct: 8 });
});

test("small cells are suppressed in the rendered report", () => {
  const md = renderMarkdown(aggregate(answers(4, 2, 1)));
  assert.match(md, new RegExp(`suppressed: n<${MIN_CELL}`));
  // The suppressed rate itself must not leak.
  assert.doesNotMatch(md, /\| 2 \| 2 \| 100% \|/);
});

test("a TP inversion is flagged; a monotone decline is not", () => {
  // TP3 answered MORE correctly than TP2 → predicted ≠ observed.
  const inverted = renderMarkdown(aggregate([...answers(2, 10, 0.5), ...answers(3, 10, 0.9)]));
  assert.match(inverted, /TP3 correct rate .* HIGHER than TP2/);

  const healthy = renderMarkdown(aggregate([...answers(2, 10, 0.9), ...answers(3, 10, 0.5)]));
  assert.match(healthy, /None — observed correct rates fall as TP rises/);
});

test("outcomes, captures, and sessions aggregate; unknown events ignored", () => {
  const agg = aggregate([
    row("battle_outcome", { battle: "wild", outcome: "fled", asked: 1, correct: 0 }),
    row("battle_outcome", { battle: "wild", outcome: "won", asked: 3, correct: 3 }),
    row("creature_captured", { speciesId: "woolbright" }),
    row("creature_captured", { speciesId: "woolbright" }),
    row("creature_captured", { speciesId: "countasaur" }),
    row("session_ended", { reason: "page_unload", duringBattle: true }),
    row("future_unregistered_event", { anything: true }),
  ]);
  assert.equal(agg.outcomes.get("wild|fled"), 1);
  assert.equal(agg.outcomes.get("wild|won"), 1);
  assert.equal(agg.species.size, 2);
  assert.equal(agg.species.get("woolbright"), 2);
  assert.equal(agg.sessions.page_unload, 1);
  assert.equal(agg.sessions.unload_during_battle, 1);

  const md = renderMarkdown(agg);
  assert.match(md, /\| wild \| fled \| 1 \| 50% \|/);
  assert.match(md, /Distinct species captured: 2/);
});

test("the report never contains user ids, event ids, or answers", () => {
  const rows = [
    { name: "question_answered", occurred_at: "2026-07-20T10:00:00.000Z", user_id: "secret-user", event_id: "secret-event", props_json: '{"battle":"wild","operation":"addition","correct":true}' },
    ...answers(1, 6, 0.5),
  ];
  const md = renderMarkdown(aggregate(rows));
  assert.doesNotMatch(md, /secret-user|secret-event/);
});
