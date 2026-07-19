// Ordering answer form (#12): wire validation, serving (tray/slot round),
// keyboard map, bilingual feedback, and content verification. The battle
// renderer stays thin — everything here is the pure contract it renders.

import { test } from "node:test";
import assert from "node:assert/strict";

import { turnsOf } from "../question-engine.ts";
import { parseQuestionBankV2Data } from "../question-v2-validate.ts";
import { resultFeedback } from "../question-objective.ts";
import {
  ORDERING_INCOMPLETE_HINT,
  OrderingRound,
  isOrdering,
  orderingHint,
  orderingKeyIndex,
  orderingResultFeedback,
} from "../question-ordering.ts";
import { verifyQuestion } from "../question-verify.ts";
import type { QuestionV2 } from "../question-v2.ts";

// --- fixtures ---------------------------------------------------------------

/** A valid ordering bank: one ascending numeric item, one forward event item
 * (the same pair the schema-v2 doc executes). */
function validOrderingBank(): Record<string, unknown> {
  return {
    schema_version: 2,
    bank_id: "std1.test-ordering",
    version: 1,
    source: "shared/tests/question-ordering.test.ts",
    currency: "RM",
    profile: "dpk3_2026_core",
    questions: [
      {
        id: 1,
        topic: "4.1",
        tp_level: 3,
        profile: "dpk3_2026_core",
        item_format: "objective",
        format_type: "order-sequence",
        presentation: "plain",
        answer_form: "ordering",
        answer_unit: "none",
        operation: "counting",
        expression: "5 < 6 < 7 < 8 < 9",
        answer: 5,
        bilingual: { numeral: "5", zh_word: "五" },
        question_zh: "从小到大排列：5、7、9、6、8",
        question_en: "Arrange from smallest to largest: 5, 7, 9, 6, 8",
        distractors: [],
        sequence: {
          direction: "ascending",
          items: [{ value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }],
        },
      },
      {
        id: 2,
        topic: "4.4",
        tp_level: 2,
        profile: "dpk3_2026_core",
        item_format: "objective",
        format_type: "order-sequence",
        presentation: "story",
        answer_form: "ordering",
        answer_unit: "none",
        operation: "counting",
        expression: "起床 → 刷牙 → 上学",
        answer: 1,
        bilingual: { numeral: "1", zh_word: "一" },
        question_zh: "按事情发生的顺序排列：小明的早晨",
        question_en: "Put Xiaoming's morning in the order it happens",
        distractors: [],
        sequence: {
          direction: "forward",
          items: [
            { value: 1, label_zh: "起床", label_en: "wake up" },
            { value: 2, label_zh: "刷牙", label_en: "brush teeth" },
            { value: 3, label_zh: "上学", label_en: "go to school" },
          ],
        },
      },
    ],
  };
}

function parsedQuestions(): QuestionV2[] {
  return parseQuestionBankV2Data(validOrderingBank()).questions;
}

/** rng() = 0: Fisher-Yates swaps each position with index 0, so the tray is
 * a deterministic rotation of the declared order — never the correct order. */
const zeroRng = () => 0;

function ascendingRound(rng: () => number = zeroRng): OrderingRound {
  return new OrderingRound(turnsOf(parsedQuestions()[0])[0], rng);
}

/** Place tiles from the tray so the slots end up in the declared order. */
function placeCorrectly(round: OrderingRound): void {
  for (const value of round.expectedValues()) {
    const trayIndex = round.tray.findIndex((tile) => tile.value === value);
    assert.ok(trayIndex >= 0, `tile ${value} should be in the tray`);
    assert.ok(round.placeFromTray(trayIndex));
  }
}

// --- wire validation ----------------------------------------------------------

test("wire: ordering questions parse with their declared sequence", () => {
  const [ascending, forward] = parsedQuestions();
  assert.ok(isOrdering(ascending));
  assert.deepEqual(ascending.sequence, {
    direction: "ascending",
    items: [{ value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }],
  });
  assert.deepEqual(forward.sequence, {
    direction: "forward",
    items: [
      { value: 1, label_zh: "起床", label_en: "wake up" },
      { value: 2, label_zh: "刷牙", label_en: "brush teeth" },
      { value: 3, label_zh: "上学", label_en: "go to school" },
    ],
  });
});

test("wire: malformed sequences and misplaced fields are rejected", () => {
  type Mutation = (question: Record<string, any>) => void;
  const cases: Array<[string, Mutation, RegExp]> = [
    ["sequence missing on the ordering form", (q) => {
      delete q.sequence;
    }, /question 1\.sequence is required for answer_form "ordering"/],
    ["sequence forbidden on numeric forms", (q) => {
      q.answer_form = "numeral";
      q.distractors = [
        { value: 6, strategy: "off-by-one-count" },
        { value: 7, strategy: "off-by-one-count" },
        { value: 9, strategy: "off-by-one-count" },
      ];
    }, /question 1\.sequence is only allowed for answer_form "ordering"/],
    ["unknown direction", (q) => {
      q.sequence.direction = "sideways";
    }, /question 1\.sequence\.direction must be one of: ascending, descending, forward/],
    ["too few items", (q) => {
      q.sequence.items = [{ value: 5 }, { value: 6 }];
    }, /question 1\.sequence\.items must contain 3 to 5 items/],
    ["too many items", (q) => {
      q.sequence.items.push({ value: 10 });
    }, /question 1\.sequence\.items must contain 3 to 5 items/],
    ["duplicate values make the order ambiguous", (q) => {
      q.sequence.items[4] = { value: 8 };
    }, /question 1\.sequence\.items must have unique values \(duplicate 8/],
    ["non-object item", (q) => {
      q.sequence.items[1] = 6;
    }, /question 1\.sequence\.items\[1\] must be an object/],
    ["unknown item field", (q) => {
      q.sequence.items[0].color = "red";
    }, /question 1\.sequence\.items\[0\] has unknown field\(s\): color/],
    ["negative item value", (q) => {
      q.sequence.items[0].value = -5;
    }, /question 1\.sequence\.items\[0\]\.value must be non-negative/],
    ["non-integer item value", (q) => {
      q.sequence.items[0].value = 5.5;
    }, /question 1\.sequence\.items\[0\]\.value must be an integer/],
    ["forward items need label_zh", (q, bank) => {
      bank.questions[1].sequence.items[0] = { value: 1, label_en: "wake up" };
    }, /question 2\.sequence\.items\[0\]\.label_zh is required for direction "forward"/],
    ["forward items need label_en", (q, bank) => {
      bank.questions[1].sequence.items[1] = { value: 2, label_zh: "刷牙" };
    }, /question 2\.sequence\.items\[1\]\.label_en is required for direction "forward"/],
    ["ordering serves no MCQ distractors", (q) => {
      q.distractors = [{ value: 6, strategy: "off-by-one-count" }];
    }, /question 1\.distractors must be empty for answer_form "ordering"/],
    ["unknown sequence field", (q) => {
      q.sequence.shuffled = true;
    }, /question 1\.sequence has unknown field\(s\): shuffled/],
  ];
  for (const [name, mutate, pattern] of cases) {
    const bank = validOrderingBank();
    const question = (bank.questions as Array<Record<string, any>>)[0];
    mutate(question, bank);
    assert.throws(() => parseQuestionBankV2Data(bank), pattern, name);
  }
});

// --- serving: the tray/slot round --------------------------------------------

test("serving: the tray offers exactly the declared tiles, shuffled", () => {
  const round = ascendingRound();
  assert.equal(round.direction, "ascending");
  assert.deepEqual(
    [...round.tray.map((tile) => tile.value)].sort((a, b) => a - b),
    [5, 6, 7, 8, 9],
  );
  assert.notDeepEqual(
    round.tray.map((tile) => tile.value),
    [5, 6, 7, 8, 9],
    "zero rng rotates the tray off the declared order",
  );
  assert.deepEqual(round.slots, [null, null, null, null, null]);
  assert.equal(round.complete, false);
  // Numeric tiles render the numeral, as on a worksheet.
  assert.equal(round.tray[0].labelZh, String(round.tray[0].value));
  assert.equal(round.tray[0].labeled, false);
});

test("serving: forward tiles carry their bilingual labels", () => {
  const round = new OrderingRound(turnsOf(parsedQuestions()[1])[0], zeroRng);
  const wakeUp = round.tray.find((tile) => tile.value === 1);
  assert.equal(wakeUp?.labelZh, "起床");
  assert.equal(wakeUp?.labelEn, "wake up");
  assert.equal(wakeUp?.labeled, true);
});

test("serving: placing and returning tiles moves them between tray and slots", () => {
  const round = ascendingRound();
  const first = round.tray[0];
  assert.ok(round.placeFromTray(0));
  assert.deepEqual(round.slots[0], first);
  assert.equal(round.tray.length, 4);

  // A bad index and a full slot row are refused.
  assert.equal(round.placeFromTray(99), false);
  for (let i = 0; i < 4; i++) assert.ok(round.placeFromTray(0));
  assert.equal(round.complete, true);
  assert.equal(round.placeFromTray(0), false);

  // Returning a slot sends the tile back to the tray; empty slots refuse.
  assert.ok(round.returnToTray(2));
  assert.equal(round.slots[2], null);
  assert.equal(round.tray.length, 1);
  assert.equal(round.returnToTray(2), false);

  // Backspace undoes the most recent placement.
  assert.ok(round.returnLast());
  assert.equal(round.slots[4], null);
});

test("serving: judging distinguishes incomplete, incorrect, and correct", () => {
  const round = ascendingRound();
  assert.equal(round.judge(), "incomplete");

  round.placeFromTray(0);
  round.placeFromTray(0);
  assert.equal(round.judge(), "incomplete", "partially filled is still incomplete");

  // Fill the remaining slots in tray order: the zero-rng rotation is not the
  // declared order, so the full arrangement is incorrect — never "incomplete".
  while (!round.complete) round.placeFromTray(0);
  assert.equal(round.judge(), "incorrect");

  const solved = ascendingRound();
  placeCorrectly(solved);
  assert.equal(solved.judge(), "correct");
});

test("serving: constructing a round without a sequence fails loudly", () => {
  const numeric = turnsOf(parsedQuestions()[0])[0];
  const orphan = { ...numeric, question: { ...numeric.question, sequence: undefined } };
  assert.throws(() => new OrderingRound(orphan), /declares no sequence/);
});

// --- form surface: hints, keyboard, feedback ----------------------------------

test("hints are direction-aware and bilingual", () => {
  assert.equal(orderingHint("ascending"), "从小到大排列 · Arrange from smallest to largest");
  assert.equal(orderingHint("descending"), "从大到小排列 · Arrange from largest to smallest");
  assert.equal(orderingHint("forward"), "按顺序排列 · Put them in the right order");
});

test("the incomplete reminder is calm and bilingual", () => {
  assert.equal(
    ORDERING_INCOMPLETE_HINT,
    "还没有排完 — 把每张卡片都放好再检查 · Place every card before checking.",
  );
});

test("keyboard: digit keys place tray tiles 1–5", () => {
  assert.deepEqual(
    ["1", "2", "3", "4", "5"].map(orderingKeyIndex),
    [0, 1, 2, 3, 4],
  );
  assert.equal(orderingKeyIndex("6"), -1);
  assert.equal(orderingKeyIndex("0"), -1);
  assert.equal(orderingKeyIndex("q"), -1);
});

test("feedback states the declared order, bilingually", () => {
  const turn = turnsOf(parsedQuestions()[0])[0];
  assert.equal(
    orderingResultFeedback(turn, true),
    "排对了！5 < 6 < 7 < 8 < 9。 Correct — well ordered!",
  );
  assert.equal(
    orderingResultFeedback(turn, false),
    "再想一想，正确的顺序是 5 < 6 < 7 < 8 < 9。 Good try — the correct order is 5 < 6 < 7 < 8 < 9.",
  );
  // The shared battle result line routes ordering turns to this feedback.
  assert.equal(resultFeedback(turn, true), orderingResultFeedback(turn, true));
  assert.equal(resultFeedback(turn, false), orderingResultFeedback(turn, false));

  const forwardTurn = turnsOf(parsedQuestions()[1])[0];
  assert.equal(
    resultFeedback(forwardTurn, false),
    "再想一想，正确的顺序是 起床 → 刷牙 → 上学。 Good try — the correct order is 起床 → 刷牙 → 上学.",
  );
});

// --- content verification ------------------------------------------------------

test("verify: valid ordering items pass clean", () => {
  for (const question of parsedQuestions()) {
    assert.deepEqual(verifyQuestion(question), [], `question ${question.id}`);
  }
});

test("verify: content slips are caught mechanically", () => {
  const cases: Array<[string, (q: QuestionV2) => void, string]> = [
    ["declared order must match the direction", (q) => {
      q.sequence!.items = [{ value: 5 }, { value: 7 }, { value: 6 }, { value: 8 }, { value: 9 }];
      q.expression = "5 < 7 < 6 < 8 < 9";
    }, "order-mismatch"],
    ["comparator must match the direction", (q) => {
      q.expression = "5 > 6 > 7 > 8 > 9";
    }, "expression-parse"],
    ["expression must restate the declared values", (q) => {
      q.expression = "5 < 6 < 7 < 8 < 10";
    }, "expression-parse"],
    ["a broken chain is not an ordering expression", (q) => {
      q.expression = "5 + 6 + 7";
    }, "expression-parse"],
    ["the answer is the first value in the order", (q) => {
      q.answer = 9;
      q.bilingual = { numeral: "9", zh_word: "九" };
    }, "answer-mismatch"],
    ["duplicate values are ambiguous", (q) => {
      q.sequence!.items = [{ value: 5 }, { value: 6 }, { value: 6 }, { value: 8 }, { value: 9 }];
      q.expression = "5 < 6 < 6 < 8 < 9";
    }, "sequence-duplicate"],
    ["items stay inside the Standard-1 scope", (q) => {
      q.sequence!.items = [{ value: 5 }, { value: 6 }, { value: 7 }, { value: 8 }, { value: 101 }];
      q.expression = "5 < 6 < 7 < 8 < 101";
    }, "sequence-out-of-range"],
    ["ordering performs no arithmetic", (q) => {
      q.operation = "addition";
    }, "operation-mismatch"],
    ["ordering declares no distractors", (q) => {
      q.distractors = [{ value: 6, strategy: "off-by-one-count" }];
    }, "distractor-count"],
    ["a missing sequence is malformed", (q) => {
      delete q.sequence;
    }, "sequence-missing"],
  ];
  for (const [name, mutate, code] of cases) {
    const question = structuredClone(parsedQuestions()[0]);
    mutate(question);
    const codes = verifyQuestion(question).map((finding) => finding.code);
    assert.ok(codes.includes(code), `${name}: expected ${code}, got ${codes.join(", ")}`);
  }
});

test("verify: forward ordering checks labels and drift, not sortedness", () => {
  const drifted = structuredClone(parsedQuestions()[1]);
  drifted.expression = "刷牙 → 起床 → 上学";
  assert.ok(
    verifyQuestion(drifted).some((finding) => finding.code === "expression-drift"),
    "the expression must restate the declared labels",
  );

  const unlabeled = structuredClone(parsedQuestions()[1]);
  delete unlabeled.sequence!.items[0].label_zh;
  assert.ok(
    verifyQuestion(unlabeled).some((finding) => finding.code === "sequence-label"),
  );

  const wrongStart = structuredClone(parsedQuestions()[1]);
  wrongStart.answer = 2;
  wrongStart.bilingual = { numeral: "2", zh_word: "二" };
  assert.ok(
    verifyQuestion(wrongStart).some((finding) => finding.code === "answer-mismatch"),
    "the answer is the first step's value",
  );
});
