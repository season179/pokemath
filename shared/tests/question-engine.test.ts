import { test } from "node:test";
import assert from "node:assert/strict";

import {
  QuestionBank,
  QuestionRound,
  makeChoices,
  turnsOf,
  type Question,
} from "../question-engine.ts";
import { SAMPLE_BANK } from "../question-bank.ts";

// A rng that replays the given values on repeat — deterministic tests.
function rngSeq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const plain: Question = {
  id: 101,
  question_zh: "测试",
  question_en: "Test",
  operation: "addition",
  expression: "2 + 3",
  answer: 5,
};

const stepped: Question = SAMPLE_BANK.questions.find((q) => q.steps)!;

test("turnsOf: a plain question is a single turn", () => {
  const turns = turnsOf(plain);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].step, null);
  assert.equal(turns[0].stepIndex, 0);
  assert.equal(turns[0].stepCount, 1);
  assert.equal(turns[0].expression, "2 + 3");
  assert.equal(turns[0].answer, 5);
  assert.equal(turns[0].promptZh, "测试");
  assert.equal(turns[0].promptEn, "Test");
});

test("turnsOf: a stepped question becomes one turn per step", () => {
  const turns = turnsOf(stepped);
  assert.equal(turns.length, stepped.steps!.length);
  turns.forEach((t, i) => {
    assert.equal(t.step, stepped.steps![i]);
    assert.equal(t.stepIndex, i);
    assert.equal(t.stepCount, stepped.steps!.length);
    assert.equal(t.expression, stepped.steps![i].expression);
    assert.equal(t.answer, stepped.steps![i].answer);
    assert.equal(t.promptZh, stepped.steps![i].prompt_zh);
  });
});

test("pick: honours the filter", () => {
  const bank = new QuestionBank(SAMPLE_BANK, rngSeq(0));
  const q = bank.pick((q) => !q.steps);
  assert.equal(q.steps, undefined);
});

test("pick: avoids an immediate repeat when the pool allows", () => {
  // rng always returns 0 → always picks the first candidate. After filtering
  // out the previous pick, the second pick must differ.
  const bank = new QuestionBank(SAMPLE_BANK, rngSeq(0));
  const first = bank.pick();
  const second = bank.pick();
  assert.notEqual(second.id, first.id);
});

test("pick: tolerates a one-question pool (repeat is unavoidable)", () => {
  const bank = new QuestionBank(SAMPLE_BANK, rngSeq(0));
  const first = bank.pick((q) => q.id === 1);
  const second = bank.pick((q) => q.id === 1);
  assert.equal(first.id, 1);
  assert.equal(second.id, 1);
});

test("pick: throws when nothing matches", () => {
  const bank = new QuestionBank(SAMPLE_BANK);
  assert.throws(() => bank.pick(() => false), /no question matches/);
});

test("makeChoices: the answer plus three unique positive near-misses", () => {
  for (const answer of [5, 20, 790, 12800, 46390]) {
    const choices = makeChoices(answer, rngSeq(0.13, 0.57, 0.91, 0.34, 0.68));
    assert.equal(choices.length, 4, `answer ${answer}`);
    assert.ok(choices.includes(answer), `answer ${answer} present`);
    assert.equal(new Set(choices).size, 4, `answer ${answer} unique`);
    assert.ok(choices.every((v) => v > 0), `answer ${answer} all positive`);
  }
});

test("makeChoices: distractors are near the answer (scaled to its size)", () => {
  const answer = 46390; // 5 digits → step 1000
  const choices = makeChoices(answer, rngSeq(0.5));
  for (const d of choices.filter((v) => v !== answer)) {
    const off = Math.abs(d - answer);
    assert.ok(off >= 1000 && off <= 5000, `distractor ${d} within ±5 steps`);
  }
});

test("makeChoices: deterministic under a seeded rng", () => {
  const a = makeChoices(12800, rngSeq(0.1, 0.2, 0.3, 0.4));
  const b = makeChoices(12800, rngSeq(0.1, 0.2, 0.3, 0.4));
  assert.deepEqual(a, b);
});

test("QuestionRound: judges the picked choice", () => {
  const turn = turnsOf(plain)[0];
  const round = new QuestionRound(turn, rngSeq(0.25));
  assert.equal(round.choices.length, 4);
  assert.ok(round.judge(5));
  const wrong = round.choices.find((v) => v !== 5)!;
  assert.ok(!round.judge(wrong));
});

test("sample bank matches its declared schema", () => {
  for (const q of SAMPLE_BANK.questions) {
    assert.ok(q.id > 0 && q.question_zh && q.question_en && q.operation);
    assert.ok(Number.isFinite(q.answer) && q.answer > 0);
    if (q.steps) {
      // the final step answers the headline question
      assert.equal(q.steps[q.steps.length - 1].answer, q.answer, `question ${q.id}`);
    }
  }
});
