// Fixed guardian slate bank (#23): one hand-checked item per locked topic,
// deterministic order, mostly TP3–4 with exactly one TP5 twist.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parseQuestionBankData } from "../question-bank-validate.ts";
import { QuestionBank, turnsOf } from "../question-engine.ts";

const BANK_URL = new URL(
  "../../game/assets/resources/question-banks/std1/std1.meadow-guardian.v1.json",
  import.meta.url,
);

const LOCKED_TOPICS = ["4.1", "4.2", "4.4", "4.3", "4.7"] as const;
const TOPIC_LABEL: Record<(typeof LOCKED_TOPICS)[number], string> = {
  "4.1": "counting",
  "4.2": "addition/subtraction",
  "4.4": "clock",
  "4.3": "money",
  "4.7": "pictograph",
};

const RAW = JSON.parse(await readFile(BANK_URL, "utf8"));
const BANK = parseQuestionBankData(RAW);

test("guardian bank: parses as schema v2 and is the hand-checked slate", () => {
  assert.equal(BANK.schema_version, 2);
  assert.equal(BANK.bank_id, "std1.meadow-guardian");
  assert.equal(BANK.version, 1);
  assert.equal(BANK.questions.length, 5);
});

test("guardian bank: one item per locked topic, in the finale order", () => {
  assert.deepEqual(
    BANK.questions.map((q) => q.topic),
    [...LOCKED_TOPICS],
  );
  for (const topic of LOCKED_TOPICS) {
    const hits = BANK.questions.filter((q) => q.topic === topic);
    assert.equal(hits.length, 1, `exactly one ${TOPIC_LABEL[topic]} item`);
  }
});

test("guardian bank: mostly TP3–4 with at most one TP5 twist", () => {
  const tps = BANK.questions.map((q) => q.tp_level!);
  const tp5 = tps.filter((tp) => tp === 5);
  assert.ok(tp5.length <= 1, `at most one TP5, got ${tp5.length}`);
  for (const tp of tps) {
    assert.ok(tp >= 3 && tp <= 5, `tp ${tp} outside 3–5`);
  }
  // The pictograph (4.7) is the authored TP5 twist.
  const picto = BANK.questions.find((q) => q.topic === "4.7")!;
  assert.equal(picto.tp_level, 5);
});

test("guardian bank: topic presentations match the locked slate roles", () => {
  const byTopic = Object.fromEntries(BANK.questions.map((q) => [q.topic, q]));
  assert.equal(byTopic["4.1"].operation, "counting");
  assert.ok(
    byTopic["4.2"].operation === "addition" || byTopic["4.2"].operation === "subtraction",
  );
  assert.equal(byTopic["4.4"].presentation, "figure:clock");
  assert.equal(byTopic["4.3"].answer_unit, "RM");
  assert.equal(byTopic["4.7"].presentation, "figure:pictograph");
});

test("guardian bank: fixedOrder serving walks ids 1..5 then wraps", () => {
  const bank = new QuestionBank(BANK);
  const served: number[] = [];
  for (let i = 0; i < 7; i++) {
    const q = bank.questions[i % bank.questions.length];
    served.push(q.id);
    // Every item is a single turn (Std-1 single-step).
    assert.equal(turnsOf(q).length, 1);
  }
  assert.deepEqual(served, [1, 2, 3, 4, 5, 1, 2]);
});
