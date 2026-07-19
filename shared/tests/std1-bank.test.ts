import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

import {
  evaluateExpression,
  parseExpression,
  verifyBank,
  verifyQuestion,
} from "../question-verify.ts";
import {
  formatAnswer,
  QuestionBank,
  QuestionRound,
  turnsOf,
  type Question,
} from "../question-engine.ts";
import { parseQuestionBankData } from "../question-bank-validate.ts";
import { renderQuestionBankReview } from "../../tools/render-question-bank-review.mjs";
import { SAMPLE_BANK } from "../question-bank.ts";

const BANK_URL = new URL(
  "../../game/assets/resources/question-banks/std1/woolly-meadows.v1.json",
  import.meta.url,
);
const BANK_SOURCE = await readFile(BANK_URL, "utf8");
const STD1_WOOLLY_BANK = parseQuestionBankData(JSON.parse(BANK_SOURCE));
const SCHEMA_URL = new URL("../../schemas/question-bank-v1.schema.json", import.meta.url);
const QUESTION_BANK_SCHEMA = JSON.parse(await readFile(SCHEMA_URL, "utf8"));
const schemaAjv = new Ajv2020({ allErrors: true });
const validateSchema = schemaAjv.compile(QUESTION_BANK_SCHEMA);

// --- expression evaluator: positive cases ---

test("evaluateExpression: bare numeral (counting item)", () => {
  assert.equal(evaluateExpression("8"), 8);
  assert.equal(evaluateExpression("12"), 12);
});

test("evaluateExpression: addition and subtraction", () => {
  assert.equal(evaluateExpression("70 + 3"), 73);
  assert.equal(evaluateExpression("48 + 25"), 73);
  assert.equal(evaluateExpression("60 - 24"), 36);
});

test("evaluateExpression: repeated addition (×-readiness)", () => {
  assert.equal(evaluateExpression("5 + 5 + 5"), 15);
  assert.equal(evaluateExpression("2 + 2 + 2 + 2"), 8);
});

test("evaluateExpression: compact and spaced subtraction are consistent", () => {
  // A `-` between numbers is an operator, not a sign on the second number,
  // so `10-3` and `10 - 3` must parse identically.
  assert.equal(evaluateExpression("10-3"), 7);
  assert.equal(evaluateExpression("10 - 3"), 7);
  assert.equal(evaluateExpression("15-5"), 10);
});

// --- expression evaluator: rejection cases (parser must not silently fold) ---

test("evaluateExpression: rejects adjacent operands", () => {
  assert.throws(() => evaluateExpression("12 3"), /adjacent operands/);
  assert.throws(() => evaluateExpression("5 + 5 5"), /adjacent operands/);
});

test("evaluateExpression: rejects malformed operator placement", () => {
  assert.throws(() => evaluateExpression("-5"), /starts with an operator/);
  assert.throws(() => evaluateExpression("5 +"), /ends with an operator/);
  assert.throws(() => evaluateExpression("5 + + 3"), /consecutive operators/);
});

test("evaluateExpression: rejects unsupported operators and grouping", () => {
  assert.throws(() => evaluateExpression("5 × 3"), /unsupported operator/);
  assert.throws(() => evaluateExpression("10 ÷ 2"), /unsupported operator/);
  assert.throws(() => evaluateExpression("(5 + 3) - 2"), /parentheses/);
  assert.throws(() => evaluateExpression(""), /empty/);
});

test("evaluateExpression: tolerates tabs and newlines without hanging", () => {
  // Regression: a stray tab/newline must not infinite-loop the tokenizer.
  // All whitespace collapses to a single space before tokenizing.
  assert.equal(evaluateExpression("5\t+\t5"), 10);
  assert.equal(evaluateExpression("10\n-\n3"), 7);
  assert.equal(evaluateExpression("5\n+\n5\n+\n5"), 15);
  assert.equal(evaluateExpression("  8  "), 8);
});

test("parseExpression: compact subtraction yields UNSIGNED operands", () => {
  // `-` is always an operator, never a sign, so `10-3` has operands [10, 3]
  // (not [10, -3]) — otherwise the scope check would reject a valid item.
  const p = parseExpression("10-3");
  assert.equal(p.value, 7);
  assert.deepEqual(p.operands, [10, 3]);
  assert.deepEqual(p.operators, ["-"]);
});

test("parseExpression: repeated addition operands and operators", () => {
  const p = parseExpression("5 + 5 + 5");
  assert.equal(p.value, 15);
  assert.deepEqual(p.operands, [5, 5, 5]);
  assert.deepEqual(p.operators, ["+", "+"]);
});

// --- formatAnswer: the display helper that keeps counts out of currency ---

test("formatAnswer: unit drives the prefix; omitted unit stays legacy money", () => {
  assert.equal(formatAnswer(8, "none"), "8");
  assert.equal(formatAnswer(73, "none"), "73");
  assert.equal(formatAnswer(12800, "none"), "12 800", "thousands still grouped");
  assert.equal(formatAnswer(12800), "RM 12 800", "omitted unit → legacy RM");
  assert.equal(formatAnswer(12800, "RM"), "RM 12 800");
  assert.equal(formatAnswer(50, "sen"), "50 sen");
  assert.equal(formatAnswer(8, "RM"), "RM 8");
});

test("verifyQuestion: a valid compact `10-3` subtraction has no findings", () => {
  const q: Question = {
    id: 9001,
    question_zh: "10 − 3 = ?",
    question_en: "10 − 3 = ?",
    operation: "subtraction",
    expression: "10-3",
    answer: 7,
    topic: "4.2",
    tp_level: 2,
    profile: "dpk3_2026_core",
    answer_unit: "none",
    distractors: [
      { value: 13, strategy: "wrong-operation" },
      { value: 10, strategy: "raw-operand" },
      { value: 3, strategy: "raw-operand" },
    ],
  };
  assert.deepEqual(verifyQuestion(q), [], "compact subtraction must not trip operand-out-of-range");
});

// --- the bank passes every mechanical check ---

test("std1 bank: every question verifies with no findings", () => {
  const rows = verifyBank(STD1_WOOLLY_BANK.questions);
  assert.deepEqual(rows, [], `findings: ${JSON.stringify(rows, null, 2)}`);
});

test("std1 bank: independently re-derived answers match (spot check)", () => {
  const byId = new Map(STD1_WOOLLY_BANK.questions.map((q) => [q.id, q]));
  assert.equal(evaluateExpression(byId.get(5)!.expression), 73);  // 70 + 3
  assert.equal(evaluateExpression(byId.get(16)!.expression), 7);  // 20 - 13
  assert.equal(evaluateExpression(byId.get(20)!.expression), 40); // digit value, bare 40
});

test("std1 bank: size, bilingual text, and required metadata", () => {
  const qs = STD1_WOOLLY_BANK.questions;
  assert.ok(qs.length >= 18 && qs.length <= 22, `about 20 questions, got ${qs.length}`);
  for (const q of qs) {
    assert.ok(q.question_zh.trim(), `q${q.id} missing zh`);
    assert.ok(q.question_en.trim(), `q${q.id} missing en`);
    assert.ok(q.topic === "4.1" || q.topic === "4.2", `q${q.id} bad topic ${q.topic}`);
    assert.ok(q.tp_level >= 1 && q.tp_level <= 2, `q${q.id} outside TP1–TP2`);
    assert.equal(q.profile, "dpk3_2026_core", `q${q.id} profile`);
    assert.equal(q.answer_unit, "none", `q${q.id} must be unitless`);
    assert.equal(q.distractors.length, 3, `q${q.id} must carry 3 distractors`);
  }
});

test("std1 bank: every item serves the first Woolly encounter (TP1–TP2)", () => {
  // docs/islands/meadow-isle.md scopes Woolly Meadows to TP1–TP2; issue #6
  // asks for ~20 questions for that first encounter. So the WHOLE bank is
  // TP1–TP2 — pictured counts are TP1, every other number-sense item TP2.
  // No TP3 procedure drills or TP4 word problems here (those are later areas).
  //
  // The TP2 reading of the bond/compare items follows the style doc §C per-item
  // tags (see the bank header's TP-classification note); a test can pin the
  // labels but cannot prove curricular validity, which is Season's to confirm.
  const byId = new Map(STD1_WOOLLY_BANK.questions.map((q) => [q.id, q]));
  for (const q of STD1_WOOLLY_BANK.questions) {
    assert.ok(q.tp_level === 1 || q.tp_level === 2, `q${q.id} outside TP1–TP2`);
  }
  for (const id of [1, 2, 3, 4]) assert.equal(byId.get(id)!.tp_level, 1, `q${id} should be TP1`);
  for (let id = 5; id <= 20; id++) assert.equal(byId.get(id)!.tp_level, 2, `q${id} should be TP2`);
});

test("std1 bank: countable set appears once on the rendered card", () => {
  // QuestionView draws question_zh AND question_en on one card, so a
  // language-neutral figure must live in only one field — otherwise the
  // child sees double the count. Each pictured-count item (TP1) carries its
  // figure in question_zh only; non-counting items carry no figure.
  const count = (s: string, re: string) => (s.match(new RegExp(re, "g")) ?? []).length;
  const byId = new Map(STD1_WOOLLY_BANK.questions.map((q) => [q.id, q]));
  const cases: Array<[number, string, number]> = [
    [1, "🐑", 8],
    [2, "🍎", 12],
    [3, "🦋", 15],
    [4, "🌸", 20],
  ];
  for (const [id, sym, want] of cases) {
    const q = byId.get(id)!;
    const zh = count(q.question_zh, sym);
    const en = count(q.question_en, sym);
    assert.equal(Math.min(zh, en), 0, `q${id} figure in at most one field`);
    assert.equal(zh + en, want, `q${id} card shows ${want} total`);
  }
  // non-counting items must not carry any emoji figure
  for (const q of STD1_WOOLLY_BANK.questions) {
    if (q.tp_level !== 1) {
      assert.equal(count(q.question_zh, "🐑|🍎|🦋|🌸"), 0, `q${q.id} zh unexpectedly has a figure`);
      assert.equal(count(q.question_en, "🐑|🍎|🦋|🌸"), 0, `q${q.id} en unexpectedly has a figure`);
    }
  }
});

test("std1 bank: no question exceeds the Standard-1 scope", () => {
  // Every operand, answer, and distractor within [0, 100]; no ×/÷; single-step.
  for (const q of STD1_WOOLLY_BANK.questions) {
    const findings = verifyQuestion(q);
    assert.deepEqual(findings, [], `q${q.id}: ${JSON.stringify(findings)}`);
  }
});

// --- authored distractors flow through the engine ---

test("QuestionRound: serves authored distractors, shuffled, judge works", () => {
  const q = STD1_WOOLLY_BANK.questions[0]; // answer 8, distractors 7/9/10
  const turn = turnsOf(q)[0];
  const round = new QuestionRound(turn, () => 0); // fixed rng → deterministic order
  assert.equal(round.choices.length, 4, "answer + 3 distractors");
  assert.ok(round.choices.includes(8), "answer present");
  for (const d of [7, 9, 10]) assert.ok(round.choices.includes(d), `distractor ${d} present`);
  assert.equal(new Set(round.choices).size, 4, "all distinct");
  assert.ok(round.judge(8), "correct answer judged right");
  assert.ok(!round.judge(9), "distractor judged wrong");
});

test("QuestionRound: authored order is shuffled (correct slot varies)", () => {
  // Across several rounds with a varying rng, the correct answer must not be
  // pinned to one position by authoring order.
  const q = STD1_WOOLLY_BANK.questions[0];
  const turn = turnsOf(q)[0];
  let rng = 0;
  const positions = new Set<number>();
  for (let i = 0; i < 20; i++) {
    const round = new QuestionRound(turn, () => (rng = (rng + 0.37) % 1));
    positions.add(round.choices.indexOf(8));
  }
  assert.ok(positions.size > 1, `answer position varied: ${[...positions].join(",")}`);
});

// --- the wire-format view still feeds the engine like the legacy bank ---

test("std1 bank: versioned JSON is QuestionBank-compatible", () => {
  const runtime = new QuestionBank(STD1_WOOLLY_BANK);
  assert.equal(runtime.questions.length, STD1_WOOLLY_BANK.questions.length);
  assert.equal(runtime.data.currency, "RM");
  assert.equal(STD1_WOOLLY_BANK.schema_version, 1);
  assert.equal(STD1_WOOLLY_BANK.bank_id, "std1.woolly-meadows");
  assert.equal(STD1_WOOLLY_BANK.version, 1);
});

test("std1 bank: canonical JSON passes the executable JSON Schema", () => {
  assert.equal(
    validateSchema(JSON.parse(BANK_SOURCE)),
    true,
    schemaAjv.errorsText(validateSchema.errors),
  );
});

test("question-bank v1 contract supports legacy stepped questions", () => {
  const versionedLegacy = {
    schema_version: 1,
    bank_id: "legacy.sample",
    version: 1,
    ...SAMPLE_BANK,
  };
  assert.equal(
    validateSchema(versionedLegacy),
    true,
    schemaAjv.errorsText(validateSchema.errors),
  );
  const parsed = parseQuestionBankData(versionedLegacy);
  assert.equal(parsed.questions[4].steps?.length, 2);
  assert.deepEqual(parsed.questions[4].table, { P: 8655, Q: 40256 });
  assert.match(
    renderQuestionBankReview(parsed, JSON.stringify(versionedLegacy), "#source"),
    /No authored choices; the runtime generates near-misses/,
  );
});

test("parseQuestionBankData rejects unsupported or malformed JSON", () => {
  assert.throws(
    () => parseQuestionBankData({ ...STD1_WOOLLY_BANK, schema_version: 99 }),
    /unsupported question-bank schema version: 99 \(supported: 1, 2\)/,
  );
  assert.throws(
    () => parseQuestionBankData({ ...STD1_WOOLLY_BANK, questions: [] }),
    /at least one question/,
  );

  const malformedChoice = structuredClone(STD1_WOOLLY_BANK);
  malformedChoice.questions[0].distractors![0].value = malformedChoice.questions[0].answer;
  assert.throws(
    () => parseQuestionBankData(malformedChoice),
    /answer and distractors must be unique/,
  );

  const malformedUnit = structuredClone(STD1_WOOLLY_BANK) as unknown as Record<string, unknown>;
  const questions = malformedUnit.questions as Array<Record<string, unknown>>;
  questions[0].answer_unit = "coins";
  assert.throws(
    () => parseQuestionBankData(malformedUnit),
    /answer_unit is unsupported/,
  );

  const malformedCount = structuredClone(STD1_WOOLLY_BANK);
  malformedCount.questions[0].distractors!.pop();
  assert.throws(
    () => parseQuestionBankData(malformedCount),
    /exactly 3 choices/,
  );

  const duplicateId = structuredClone(STD1_WOOLLY_BANK);
  duplicateId.questions[1].id = duplicateId.questions[0].id;
  assert.throws(
    () => parseQuestionBankData(duplicateId),
    /duplicate question id/,
  );

  const misspelledField = structuredClone(STD1_WOOLLY_BANK) as unknown as Record<string, unknown>;
  const misspelledQuestions = misspelledField.questions as Array<Record<string, unknown>>;
  delete misspelledQuestions[0].answer_unit;
  misspelledQuestions[0].answer_unitt = "none";
  assert.throws(
    () => parseQuestionBankData(misspelledField),
    /unknown field.*answer_unitt/,
  );
});

test("human review document is generated from the canonical JSON", async () => {
  const reviewUrl = new URL(
    "../../docs/question-banks/std1-woolly-meadows-v1-review.md",
    import.meta.url,
  );
  assert.equal(
    await readFile(reviewUrl, "utf8"),
    renderQuestionBankReview(STD1_WOOLLY_BANK, BANK_SOURCE),
  );
});
