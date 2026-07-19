// The #11 objective interaction contract: circle and true-false option
// labels, hints, keyboard mapping, bilingual feedback, and result scoring.
// QuestionView (Cocos) is a thin renderer over these helpers — pointer taps
// and digit keys both land on QuestionView.choose(index), so the contract
// tested here is exactly what both input paths exercise.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  QuestionRound,
  formatAnswer,
  turnsOf,
  type Question,
} from "../question-engine.ts";
import { parseQuestionBankV2Data } from "../question-v2-validate.ts";
import {
  answerFormOf,
  formatObjectiveChoice,
  isTrueFalse,
  objectiveHint,
  objectiveKeyIndex,
  resultFeedback,
  truthLabel,
} from "../question-objective.ts";

// --- fixtures -----------------------------------------------------------------

const legacyNumeric: Question = {
  id: 1,
  question_zh: "测试",
  question_en: "Test",
  operation: "addition",
  expression: "70 + 3",
  answer: 73,
};

const legacyMoney: Question = {
  id: 2,
  question_zh: "测试",
  question_en: "Test",
  operation: "addition",
  expression: "12800",
  answer: 12800,
};

const circleQuestion: Question = {
  ...legacyNumeric,
  id: 3,
  operation: "counting",
  expression: "8",
  answer: 8,
  answer_unit: "none",
  answer_form: "circle",
  distractors: [
    { value: 7, strategy: "off-by-one-count" },
    { value: 9, strategy: "off-by-one-count" },
    { value: 10, strategy: "off-by-one-count" },
  ],
};

function trueFalseQuestion(answer: 0 | 1): Question {
  return {
    id: 4,
    question_zh: "对的画 ✓，错的画 ✗：7 比 8 大",
    question_en: "Mark ✓ for true and ✗ for false: 7 is greater than 8",
    operation: "counting",
    expression: "7 > 8",
    answer,
    answer_unit: "none",
    answer_form: "true-false",
    distractors: [{ value: answer === 1 ? 0 : 1, strategy: "more-fewer-flip" }],
  };
}

const chineseWordQuestion: Question = {
  ...legacyNumeric,
  id: 5,
  answer: 18,
  answer_unit: "none",
  answer_form: "chinese-word",
};

// --- answer-form reading --------------------------------------------------------

test("answerFormOf / isTrueFalse: legacy questions carry no form", () => {
  assert.equal(answerFormOf(legacyNumeric), undefined);
  assert.equal(isTrueFalse(legacyNumeric), false);
  assert.equal(answerFormOf(trueFalseQuestion(0)), "true-false");
  assert.equal(isTrueFalse(trueFalseQuestion(0)), true);
});

test("truthLabel: the closed bilingual pair; rejects non-truth values", () => {
  assert.deepEqual(truthLabel(1), { glyph: "✓", zh: "对", en: "true" });
  assert.deepEqual(truthLabel(0), { glyph: "✗", zh: "错", en: "false" });
  assert.throws(() => truthLabel(7), /not a truth value/);
});

// --- option labels --------------------------------------------------------------

test("formatObjectiveChoice: legacy and numeric forms render via formatAnswer", () => {
  // byte-identical to the pre-#11 renderer (formatAnswer + answer_unit)
  assert.equal(formatObjectiveChoice(legacyMoney, 12800), "RM 12 800");
  assert.equal(formatObjectiveChoice(legacyNumeric, 73), "RM 73");
  assert.equal(formatObjectiveChoice(circleQuestion, 8), "8");
  for (const v of [7, 8, 9, 10]) {
    assert.equal(formatObjectiveChoice(circleQuestion, v), formatAnswer(v, "none"));
  }
});

test("formatObjectiveChoice: chinese-word serves options in Chinese script", () => {
  assert.equal(formatObjectiveChoice(chineseWordQuestion, 18), "十八");
  assert.equal(formatObjectiveChoice(chineseWordQuestion, 100), "一百");
});

test("formatObjectiveChoice: true-false options are bilingual truth marks", () => {
  assert.equal(formatObjectiveChoice(trueFalseQuestion(0), 1), "✓ 对 True");
  assert.equal(formatObjectiveChoice(trueFalseQuestion(0), 0), "✗ 错 False");
});

// --- prompt hint ------------------------------------------------------------------

test("objectiveHint: form-aware hints; the default is the exact pre-#11 line", () => {
  assert.equal(objectiveHint(legacyNumeric), "Pick the right answer / 选出正确答案");
  assert.equal(objectiveHint(chineseWordQuestion), "Pick the right answer / 选出正确答案");
  assert.equal(objectiveHint(circleQuestion), "圈出正确的答案 · Circle the correct answer");
  assert.equal(objectiveHint(trueFalseQuestion(0)), "对的选 ✓，错的选 ✗ · True or false?");
});

// --- keyboard and pointer selection -------------------------------------------------

test("objectiveKeyIndex: digit keys map to option positions, others do not", () => {
  assert.equal(objectiveKeyIndex("1"), 0);
  assert.equal(objectiveKeyIndex("2"), 1);
  assert.equal(objectiveKeyIndex("3"), 2);
  assert.equal(objectiveKeyIndex("4"), 3);
  assert.equal(objectiveKeyIndex("5"), -1);
  assert.equal(objectiveKeyIndex("0"), -1);
  assert.equal(objectiveKeyIndex("a"), -1);
});

test("selection: keyboard index and pointer index land on the same option", () => {
  // QuestionView.handleKey resolves a digit through objectiveKeyIndex and
  // calls choose(index); a pointer tap calls choose(index) directly. Both
  // paths pick round.choices[index] and judge it — pinned here for the
  // circle round (4 options) and the true-false round (2 options).
  const circleRound = new QuestionRound(turnsOf(circleQuestion)[0], () => 0.42);
  assert.equal(circleRound.choices.length, 4);
  for (let index = 0; index < circleRound.choices.length; index++) {
    const keyIndex = objectiveKeyIndex(String(index + 1));
    assert.equal(keyIndex, index);
    const picked = circleRound.choices[keyIndex];
    assert.equal(circleRound.judge(picked), picked === 8);
  }

  const truthRound = new QuestionRound(turnsOf(trueFalseQuestion(0))[0]);
  assert.equal(truthRound.choices.length, 2, "true-false serves exactly ✓/✗");
  assert.equal(truthRound.choices[objectiveKeyIndex("1")], 1, "key 1 picks ✓ (true)");
  assert.equal(truthRound.choices[objectiveKeyIndex("2")], 0, "key 2 picks ✗ (false)");
  // out-of-range keys find no option (QuestionView.choose ignores them)
  assert.equal(truthRound.choices[objectiveKeyIndex("3")], undefined);
});

// --- correction feedback and result scoring ------------------------------------------

test("resultFeedback: numeric forms keep the exact pre-#11 strings", () => {
  const turn = turnsOf(legacyNumeric)[0];
  assert.equal(resultFeedback(turn, true), "Correct! 70 + 3 = 73");
  assert.equal(resultFeedback(turn, false), "Good try — 70 + 3 = 73.");
  const moneyTurn = turnsOf(legacyMoney)[0];
  assert.equal(resultFeedback(moneyTurn, true), "Correct! 12800 = 12 800");
  assert.equal(resultFeedback(moneyTurn, false), "Good try — 12800 = 12 800.");
});

test("resultFeedback: circle items correct with the value, like any numeric form", () => {
  const turn = turnsOf(circleQuestion)[0];
  assert.equal(resultFeedback(turn, true), "Correct! 8 = 8");
  assert.equal(resultFeedback(turn, false), "Good try — 8 = 8.");
});

test("resultFeedback: true-false feedback states the truth bilingually", () => {
  const turn = turnsOf(trueFalseQuestion(0))[0];
  assert.equal(
    resultFeedback(turn, true),
    "答对了！「7 > 8」是错的 (✗)。 Correct! \"7 > 8\" is false.",
  );
  assert.equal(
    resultFeedback(turn, false),
    "再想一想，「7 > 8」是错的 (✗)。 Good try — \"7 > 8\" is false.",
  );
  const trueTurn = turnsOf(trueFalseQuestion(1))[0];
  assert.equal(
    resultFeedback(trueTurn, true),
    "答对了！「7 > 8」是对的 (✓)。 Correct! \"7 > 8\" is true.",
  );
});

test("result scoring: judged picks drive the win/lose feedback path", () => {
  // The battle scores a round by judge(picked) and shows resultFeedback for
  // that outcome — played end to end here for both objective forms.
  const truth = trueFalseQuestion(0);
  const round = new QuestionRound(turnsOf(truth)[0]);
  const picked = round.choices[objectiveKeyIndex("2")]; // child keys 2 = ✗
  const correct = round.judge(picked);
  assert.equal(correct, true);
  assert.match(resultFeedback(round.turn, correct), /答对了！/);

  const wrongPicked = round.choices[objectiveKeyIndex("1")]; // key 1 = ✓
  const wrong = round.judge(wrongPicked);
  assert.equal(wrong, false);
  assert.match(resultFeedback(round.turn, wrong), /再想一想/);
});

// --- the served options come from the parsed wire bank --------------------------------

test("wire-parsed objective questions serve exactly their declared selections", () => {
  const bank = parseQuestionBankV2Data({
    schema_version: 2,
    bank_id: "std1.objective-contract",
    version: 1,
    source: "shared/tests/question-objective.test.ts",
    currency: "RM",
    questions: [
      {
        id: 1,
        topic: "4.1",
        tp_level: 1,
        profile: "dpk3_2026_core",
        item_format: "objective",
        format_type: "count-circle",
        presentation: "picture",
        answer_form: "circle",
        answer_unit: "none",
        operation: "counting",
        expression: "8",
        answer: 8,
        bilingual: { numeral: "8", zh_word: "八" },
        question_zh: "圈出正确的答案：🦆🦆🦆🦆🦆🦆🦆🦆 共有几只鸭子？",
        question_en: "Circle the correct answer: how many ducks are there?",
        distractors: [
          { value: 7, strategy: "off-by-one-count" },
          { value: 9, strategy: "off-by-one-count" },
          { value: 10, strategy: "off-by-one-count" },
        ],
      },
      {
        id: 2,
        topic: "4.1",
        tp_level: 2,
        profile: "dpk3_2026_core",
        item_format: "objective",
        format_type: "true-false",
        presentation: "plain",
        answer_form: "true-false",
        answer_unit: "none",
        operation: "counting",
        expression: "7 > 8",
        answer: 0,
        bilingual: { numeral: "0", zh_word: "零" },
        question_zh: "对的画 ✓，错的画 ✗：7 比 8 大",
        question_en: "Mark ✓ for true and ✗ for false: 7 is greater than 8",
        distractors: [{ value: 1, strategy: "more-fewer-flip" }],
      },
    ],
  });
  const [circle, trueFalse] = bank.questions;

  const circleRound = new QuestionRound(turnsOf(circle)[0], () => 0.99);
  assert.deepEqual([...circleRound.choices].sort((a, b) => a - b), [7, 8, 9, 10]);

  const truthRound = new QuestionRound(turnsOf(trueFalse)[0], () => 0.99);
  assert.deepEqual(truthRound.choices, [1, 0]);
  assert.equal(formatObjectiveChoice(trueFalse, truthRound.choices[0]), "✓ 对 True");
  assert.equal(formatObjectiveChoice(trueFalse, truthRound.choices[1]), "✗ 错 False");
});
