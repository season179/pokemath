// Offline validation gate tests (M4, #14). Every rejection rule and known
// boundary case has a fixture bank under shared/tests/fixtures/gate/; these
// tests pin each fixture to its expected verdict and checklist evidence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CORPUS_CHECKLIST,
  auditBankAdversarial,
  gateQuestionBank,
} from "../question-gate.ts";
import { verifyQuestion } from "../question-verify.ts";

async function loadFixture(name) {
  const url = new URL(`./fixtures/gate/${name}`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

function findingsByRule(report, rule) {
  return report.phases.flatMap((p) => p.findings).filter((f) => f.rule === rule);
}

function allErrors(report) {
  return report.phases.flatMap((p) => p.findings).filter((f) => f.severity === "error");
}

// --- the accept fixture: every known boundary case passes clean ---

test("gate accepts the boundary fixture with zero findings", async () => {
  const report = gateQuestionBank(await loadFixture("valid-boundary.v2.json"));
  assert.equal(report.accept, true, JSON.stringify(report.phases.flatMap((p) => p.findings), null, 2));
  assert.equal(report.questionCount, 10);
  for (const phase of report.phases) {
    assert.equal(phase.accept, true, `${phase.phase}: ${JSON.stringify(phase.findings)}`);
    assert.deepEqual(phase.findings, [], `${phase.phase} findings`);
  }
});

test("boundary fixture pins the ceilings it exercises", async () => {
  const bank = await loadFixture("valid-boundary.v2.json");
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  assert.equal(byId.get(1).answer, 100); // scope ceiling
  assert.equal(byId.get(4).answer, 10); // RM10 ceiling
  assert.equal(byId.get(5).answer, 100); // 100 sen = RM1 ceiling
  assert.equal(byId.get(10).answer, 0); // floor
  assert.match(byId.get(6).question_zh, /可以换/); // single-unit exchange stays legal
});

// --- reject fixtures: one bank per rejection rule ---

const REJECT_CASES = [
  ["reject-multiply.v2.json", "OPS-PLUSMINUS", "expression-parse"],
  ["reject-division.v2.json", "OPS-PLUSMINUS", "expression-parse"],
  ["reject-over-100.v2.json", "SCOPE-100", "answer-out-of-range"],
  ["reject-multi-step.v2.json", "STEP-SINGLE", "multi-step"],
  ["reject-money-rm-over-10.v2.json", "MONEY-RM10", "answer-out-of-range"],
  ["reject-money-sen-over-100.v2.json", "MONEY-SEN100", "answer-out-of-range"],
  ["reject-money-mixed-exchange.v2.json", "MONEY-MIXED", "money-mixed-exchange"],
  ["reject-wrong-answer.v2.json", "ANSWER-REDERIVE", "answer-mismatch"],
  ["reject-unit-topic.v2.json", "UNIT-TOPIC", "adv-unit-topic"],
  ["reject-strategy-topic.v2.json", "STRATEGY-TOPIC", "adv-strategy-topic"],
  ["reject-extra-profile.v2.json", "EXTRA-PROFILE", "adv-extra-profile"],
  ["reject-table-out-of-scope.v2.json", "SCOPE-100", "table-out-of-range"],
  ["reject-operation-mismatch.v2.json", "OPERATION-LABEL", "operation-mismatch"],
  ["reject-order-unsorted.v2.json", "ANSWER-REDERIVE", "order-mismatch"],
  ["reject-schema-version.json", "SCHEMA-V2", "schema-v2"],
  ["reject-steps-field.v2.json", "SCHEMA-V2", "schema-v2"],
];

for (const [fixture, rule, code] of REJECT_CASES) {
  test(`gate rejects ${fixture} under ${rule}`, async () => {
    const report = gateQuestionBank(await loadFixture(fixture));
    assert.equal(report.accept, false, `${fixture} must be rejected`);
    const hits = findingsByRule(report, rule).filter((f) => f.code === code && f.severity === "error");
    assert.ok(
      hits.length > 0,
      `expected an error finding ${rule}/${code}, got ${JSON.stringify(report.phases.flatMap((p) => p.findings))}`,
    );
  });
}

// --- money scope: unit-level verifier rules (question-verify.ts) ---

function moneyQuestion(overrides) {
  return {
    id: 1,
    question_zh: "RM3 加 RM5 一共是多少钱？",
    question_en: "How much is RM3 plus RM5?",
    topic: "4.3",
    operation: "addition",
    expression: "3 + 5",
    answer: 8,
    answer_unit: "RM",
    distractors: [
      { value: 7, strategy: "off-by-one-count" },
      { value: 9, strategy: "off-by-one-count" },
      { value: 6, strategy: "money-denom-miscount" },
    ],
    ...overrides,
  };
}

test("money: RM amounts cap at RM10", () => {
  const codes = verifyQuestion(moneyQuestion({ expression: "8 + 4", answer: 12 })).map((f) => f.code);
  assert.ok(codes.includes("answer-out-of-range"), JSON.stringify(codes));
});

test("money: RM operands above RM10 are rejected even when the answer fits", () => {
  // RM12 − RM4 = RM8: the answer is in scope but RM12 is not Std-1 money.
  const findings = verifyQuestion(moneyQuestion({ expression: "12 - 4", answer: 8, operation: "subtraction" }));
  assert.ok(findings.some((f) => f.code === "operand-out-of-range"), JSON.stringify(findings));
});

test("money: sen amounts cap at 100 (RM1)", () => {
  const findings = verifyQuestion(moneyQuestion({ answer_unit: "sen", expression: "80 + 70", answer: 150 }));
  assert.ok(findings.some((f) => f.code === "answer-out-of-range" && f.message.includes("[0, 100]")));
});

test("money: distractors respect the unit cap", () => {
  const q = moneyQuestion({
    distractors: [
      { value: 11, strategy: "off-by-one-count" },
      { value: 7, strategy: "off-by-one-count" },
      { value: 6, strategy: "money-denom-miscount" },
    ],
  });
  assert.ok(verifyQuestion(q).some((f) => f.code === "distractor-out-of-range"));
});

test("money: table values respect the unit cap", () => {
  const q = moneyQuestion({ table: { 储蓄: 12 } });
  assert.ok(verifyQuestion(q).some((f) => f.code === "table-out-of-range"));
});

test("money: mixed coin-note exchange is rejected", () => {
  const q = moneyQuestion({
    answer_unit: "none",
    operation: "counting",
    expression: "25",
    answer: 25,
    question_zh: "一张 RM5 纸币相等于多少枚 20 sen 硬币？",
    question_en: "How many 20-sen coins are equal in value to one RM5 note?",
  });
  assert.ok(verifyQuestion(q).some((f) => f.code === "money-mixed-exchange"));
});

test("money: single-unit exchanges stay legal", () => {
  const coins = moneyQuestion({
    answer_unit: "none",
    operation: "counting",
    expression: "5",
    answer: 5,
    question_zh: "50 sen 可以换几枚 10 sen？",
    question_en: "How many 10-sen coins make 50 sen?",
  });
  assert.deepEqual(verifyQuestion(coins), []);
  const notes = moneyQuestion({
    answer_unit: "none",
    operation: "counting",
    expression: "2",
    answer: 2,
    question_zh: "一张 RM10 纸币可以换几张 RM5 纸币？",
    question_en: "How many RM5 notes make one RM10 note?",
  });
  assert.deepEqual(verifyQuestion(notes), []);
});

test("money: multiplication/division of money is rejected by the grammar", () => {
  const q = moneyQuestion({ expression: "5 × 2", answer: 10 });
  assert.ok(verifyQuestion(q).some((f) => f.code === "expression-parse"));
});

// --- adversarial phase: raw-JSON and coherence rows ---

test("adversarial: duplicate ids are caught on the raw JSON", () => {
  const raw = {
    schema_version: 2,
    questions: [
      { id: 1, bilingual: { numeral: "1", zh_word: "一" }, answer: 1 },
      { id: 1, bilingual: { numeral: "2", zh_word: "二" }, answer: 2 },
    ],
  };
  const findings = auditBankAdversarial(raw);
  assert.ok(findings.some((f) => f.code === "adv-duplicate-id" && f.rule === "RAW-IDS"));
});

test("adversarial: raw numeral drift is caught even off the parsed path", () => {
  const raw = {
    schema_version: 2,
    questions: [{ id: 1, answer: 8, bilingual: { numeral: "9", zh_word: "八" } }],
  };
  const findings = auditBankAdversarial(raw);
  assert.ok(findings.some((f) => f.code === "adv-numeral" && f.rule === "RAW-NUMERAL"));
});

test("adversarial: zh_word drift warns with the derived reading", () => {
  const raw = {
    schema_version: 2,
    questions: [{ id: 1, answer: 18, bilingual: { numeral: "18", zh_word: "八十" } }],
  };
  const findings = auditBankAdversarial(raw);
  const hit = findings.find((f) => f.rule === "ZH-WORD-DRIFT");
  assert.ok(hit && hit.severity === "warn" && hit.message.includes("十八"), JSON.stringify(findings));
});

test("adversarial: legacy v1 banks skip v2 coherence rows", () => {
  const raw = {
    schema_version: 1,
    questions: [
      // A legacy money-flavoured item: no topic/profile/unit metadata at all.
      { id: 1, answer: 8, question_zh: "RM3 + RM5", question_en: "RM3 + RM5" },
    ],
  };
  const findings = auditBankAdversarial(raw);
  assert.ok(!findings.some((f) => f.rule === "UNIT-TOPIC" || f.rule === "EXTRA-PROFILE"));
});

test("adversarial: clock-hand-swap outside topic 4.4 is incoherent", () => {
  const raw = {
    schema_version: 2,
    questions: [
      {
        id: 1,
        topic: "4.1",
        answer: 8,
        bilingual: { numeral: "8", zh_word: "八" },
        distractors: [{ value: 7, strategy: "clock-hand-swap" }],
      },
    ],
  };
  const findings = auditBankAdversarial(raw);
  assert.ok(findings.some((f) => f.rule === "STRATEGY-TOPIC" && f.code === "adv-strategy-topic"));
});

// --- gate mechanics ---

test("gate: structural failure skips the mechanical phase with evidence", async () => {
  const report = gateQuestionBank(await loadFixture("reject-schema-version.json"));
  const mechanical = report.phases.find((p) => p.phase === "mechanical");
  assert.equal(mechanical.accept, false);
  assert.ok(mechanical.findings.some((f) => f.code === "gate-skipped"));
});

test("gate: wrong answers are rejected, never edited", async () => {
  const raw = await loadFixture("reject-wrong-answer.v2.json");
  const before = JSON.stringify(raw);
  const report = gateQuestionBank(raw);
  assert.equal(report.accept, false);
  assert.equal(JSON.stringify(raw), before, "the gate must not mutate the bank");
  assert.equal(raw.questions[0].answer, 49, "the stated answer stays as authored");
});

test("gate: every checklist row is unique and cites a source", () => {
  const rules = CORPUS_CHECKLIST.map((r) => r.rule);
  assert.equal(new Set(rules).size, rules.length);
  for (const row of CORPUS_CHECKLIST) {
    assert.ok(row.source.length > 0 && row.description.length > 0, row.rule);
  }
});

test("gate: the shipped Woolly Meadows v1 bank passes", async () => {
  const url = new URL(
    "../../game/assets/resources/question-banks/std1/woolly-meadows.v1.json",
    import.meta.url,
  );
  const report = gateQuestionBank(JSON.parse(await readFile(url, "utf8")));
  assert.equal(report.accept, true, JSON.stringify(allErrors(report), null, 2));
});
