// The hand-authored Standard-1 (SJKC Year 1) starter bank for the first
// Woolly Meadows encounter (M2A, issue #6).
//
// **Status: AWAITING SEASON REVIEW — not wired into gameplay.** This bank is
// exported but is NOT consumed by GameApp or any encounter yet. It must not
// be served to children until reviewed. Before serving, also preview the
// emoji counting items in Cocos to confirm font glyph support. See
// ROADMAP / docs/islands/meadow-isle.md.
//
// Scope: 20 bilingual items, all within the Woolly Meadows TP1–TP2 band
// (docs/islands/meadow-isle.md region 2: "counting country"), centred on
// counting and early number sense. Every item is topic 4.1 (whole numbers)
// — counting, place-value composition, patterns, number bonds, and comparison
// — exactly the cognitive work the first encounter is built around. (Explicit
// before/after/between drills are `original_dskp_extra`, so they are NOT here.)
// Basic `+ −` procedure drills and one-step word problems
// (TP3–TP4) belong to later meadow areas (Appledore Orchard, M2B) and are
// intentionally NOT here, so this bank serves the first encounter in full.
//
// Hard constraints (docs/curriculum/standard-1-sjkc-math.md §2): numbers
// ≤ 100, `+ −` only (no `× ÷`), single-step, money ≤ RM10 (this bank is
// non-money throughout, so every item is `answer_unit: "none"`).
//
// TP classification note (for Season's review). Two curriculum docs govern
// TP, and they relate as high-level ladder vs per-item authority:
//  - scope doc §6 ladder: TP3 = "apply a basic procedure", exemplar `36 + 14`.
//  - style doc §C per-item tags: number bonds, compare-difference, and small
//    facts are TP2 — e.g. "6 比 4 多 2" (compare, TP2), "parts 3 和 7 → 10"
//    and teen bond "whole 15, part 6 → 9" (number bond, TP2), even bare
//    "32 + 7 = ?" / "10 − 8 = ?" (TP2).
// This bank follows the per-item authority: single-digit number bonds and
// comparisons within 20 are TP2 (number sense / part-part-whole), reserving
// TP3 for two-digit procedure drills (e.g. `48 + 25`), which are NOT here.
// The scope ladder's descriptor lists match/classify/true-false as EXAMPLES
// of TP2, not an exhaustive set; those specific formats are also non-numeric
// answer forms the engine does not support yet (M3). If Season reads the
// ladder strictly, the bonds/compare items are the ones to re-adjudicate.
//
// Every item is mechanically verified by shared/question-verify.ts (answer
// re-derived from `expression`, scope enforced, distractor validity checked).
// The `strategy` strings on distractors are human-review annotations drawn
// from the curriculum question-style doc §D — they name the misconception a
// real child might hold, but are not themselves machine-checkable, so the
// independent misconception check is part of Season's review.
//
// Bilingual: question_zh is Mandarin (SJKC representation, always on),
// question_en is the English gloss. A language-neutral figure (the countable
// emoji row on the counting items) lives in question_zh ONLY, because
// QuestionView draws both language fields on one card — putting it in both
// would double the visible count. All items use the default
// `dpk3_2026_core` profile (no `original_dskp_extra` items here).

import type { AnswerUnit, Distractor, Question, QuestionBankData } from "./question-engine";

// A Standard-1 item makes the additive metadata *required*, so a reviewer can
// trust that every question carries its curriculum anchors. It remains a
// structural subtype of Question, so it feeds QuestionBank unchanged.
export interface Std1Question extends Question {
  topic: "4.1" | "4.2";
  tp_level: 1 | 2 | 3 | 4;
  profile: "dpk3_2026_core";
  // Required so a count is never rendered as currency. This whole bank is
  // non-money, so every item is `"none"`.
  answer_unit: AnswerUnit;
  distractors: Distractor[];
}

export interface Std1Bank {
  source: string;
  currency: string;
  profile: "dpk3_2026_core";
  scope: string;
  questions: Std1Question[];
}

export const STD1_WOOLLY_BANK: Std1Bank = {
  source:
    "Hand-authored for the first Woolly Meadows encounter (M2A, issue #6); " +
    "scope: docs/curriculum/standard-1-sjkc-math.md; " +
    "format/distractor patterns: docs/curriculum/standard-1-question-style.md",
  currency: "RM",
  profile: "dpk3_2026_core",
  scope: "standard-1-sjkc-math §2 (hard constraints) + §4.1; TP1–TP2 (Woolly Meadows)",
  questions: [
    // --- TP1: count pictured objects (count-write) ---
    {
      id: 1,
      topic: "4.1",
      tp_level: 1,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "8",
      answer: 8,
      // Countable set in question_zh ONLY — see file header.
      question_zh: "数一数，羊圈里共有几只羊？\n🐑🐑🐑🐑🐑🐑🐑🐑",
      question_en: "Count the sheep in the pen. How many are there?",
      distractors: [
        { value: 7, strategy: "off-by-one-count (skipped one)" },
        { value: 9, strategy: "off-by-one-count (double-counted one)" },
        { value: 10, strategy: "near-ten-bias" },
      ],
    },
    {
      id: 2,
      topic: "4.1",
      tp_level: 1,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "12",
      answer: 12,
      question_zh: "树下有几个苹果？\n🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎🍎",
      question_en: "How many apples are under the tree?",
      distractors: [
        { value: 11, strategy: "off-by-one-count" },
        { value: 13, strategy: "off-by-one-count" },
        { value: 10, strategy: "round-to-ten" },
      ],
    },
    {
      id: 3,
      topic: "4.1",
      tp_level: 1,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "15",
      answer: 15,
      question_zh: "花园里有几只蝴蝶？\n🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋",
      question_en: "How many butterflies are in the garden?",
      distractors: [
        { value: 14, strategy: "off-by-one-count" },
        { value: 16, strategy: "off-by-one-count" },
        { value: 20, strategy: "round-to-ten" },
      ],
    },
    {
      id: 4,
      topic: "4.1",
      tp_level: 1,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "20",
      answer: 20,
      question_zh: "数一数，共有几朵花？\n🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸",
      question_en: "Count the flowers. How many are there?",
      distractors: [
        { value: 19, strategy: "off-by-one-count" },
        { value: 21, strategy: "off-by-one-count" },
        { value: 18, strategy: "off-by-two" },
      ],
    },

    // --- TP2: place-value composition (tens + ones) ---
    {
      id: 5,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "70 + 3",
      answer: 73,
      question_zh: "7 个十和 3 个一合起来是多少？",
      question_en: "7 tens and 3 ones make what number?",
      distractors: [
        { value: 37, strategy: "digit-reversal" },
        { value: 70, strategy: "drop-ones (raw-operand)" },
        { value: 3, strategy: "drop-tens (raw-operand)" },
      ],
    },
    {
      id: 6,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "50 + 6",
      answer: 56,
      question_zh: "5 个十和 6 个一合起来是多少？",
      question_en: "5 tens and 6 ones make what number?",
      distractors: [
        { value: 65, strategy: "digit-reversal" },
        { value: 50, strategy: "drop-ones (raw-operand)" },
        { value: 11, strategy: "digit-sum (5 + 6)" },
      ],
    },
    {
      id: 7,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "30 + 2",
      answer: 32,
      question_zh: "3 个十和 2 个一合起来是多少？",
      question_en: "3 tens and 2 ones make what number?",
      distractors: [
        { value: 23, strategy: "digit-reversal" },
        { value: 30, strategy: "drop-ones (raw-operand)" },
        { value: 5, strategy: "digit-sum (3 + 2)" },
      ],
    },

    // --- TP2: number patterns (continue the sequence) ---
    {
      id: 8,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "6 + 2",
      answer: 8,
      question_zh: "按规律填数：2, 4, 6, __, 10。",
      question_en: "Fill in the pattern: 2, 4, 6, __, 10.",
      distractors: [
        { value: 7, strategy: "wrong-step (counted by 1)" },
        { value: 9, strategy: "off-by-one" },
        { value: 10, strategy: "raw-operand (repeated the last shown)" },
      ],
    },
    {
      id: 9,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "30 + 10",
      answer: 40,
      question_zh: "十个十个地数：10, 20, 30, __, 50。",
      question_en: "Count by tens: 10, 20, 30, __, 50.",
      distractors: [
        { value: 31, strategy: "wrong-step (counted by 1)" },
        { value: 35, strategy: "wrong-step (halved the step)" },
        { value: 50, strategy: "raw-operand (repeated the last shown)" },
      ],
    },
    {
      id: 10,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "13 - 1",
      answer: 12,
      question_zh: "倒着数：15, 14, 13, __, 11。",
      question_en: "Count backwards: 15, 14, 13, __, 11.",
      distractors: [
        { value: 14, strategy: "wrong-direction (counted up)" },
        { value: 11, strategy: "raw-operand (next shown)" },
        { value: 13, strategy: "raw-operand (prev shown)" },
      ],
    },

    // --- TP2: number bonds (part-part-whole) ---
    {
      id: 11,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "10 - 3",
      answer: 7,
      question_zh: "__ 和 3 合起来是 10。空格里是多少？", // missing part
      question_en: "__ and 3 make 10. What is the missing number?",
      distractors: [
        { value: 13, strategy: "wrong-operation (10 + 3)" },
        { value: 10, strategy: "raw-operand" },
        { value: 3, strategy: "raw-operand" },
      ],
    },
    {
      id: 12,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "8 + 5",
      answer: 13,
      question_zh: "8 和 5 合起来是多少？", // combine parts
      question_en: "8 and 5 make what number?",
      distractors: [
        { value: 12, strategy: "off-by-one" },
        { value: 14, strategy: "off-by-one" },
        { value: 3, strategy: "wrong-operation (8 − 5)" },
      ],
    },
    {
      id: 13,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "10 - 6",
      answer: 4,
      question_zh: "6 和 __ 合起来是 10。空格里是多少？", // missing part
      question_en: "6 and __ make 10. What is the missing number?",
      distractors: [
        { value: 16, strategy: "wrong-operation (10 + 6)" },
        { value: 10, strategy: "raw-operand" },
        { value: 6, strategy: "raw-operand" },
      ],
    },

    // --- TP2: compare quantities (more / fewer, no story context) ---
    {
      id: 14,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "9 - 6",
      answer: 3,
      question_zh: "9 比 6 多几？",
      question_en: "How many more is 9 than 6?",
      distractors: [
        { value: 15, strategy: "wrong-operation (9 + 6)" },
        { value: 9, strategy: "raw-operand" },
        { value: 6, strategy: "raw-operand" },
      ],
    },
    {
      id: 15,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "8 - 5",
      answer: 3,
      question_zh: "5 比 8 少几？",
      question_en: "How many fewer is 5 than 8?",
      distractors: [
        { value: 13, strategy: "wrong-operation (8 + 5)" },
        { value: 8, strategy: "raw-operand" },
        { value: 5, strategy: "raw-operand" },
      ],
    },

    // --- TP2: more number-bond (decompose to 20) and place-value composition ---
    {
      id: 16,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "subtraction",
      expression: "20 - 13",
      answer: 7,
      question_zh: "13 和 __ 合起来是 20。空格里是多少？", // number bond to 20
      question_en: "13 and __ make 20. What is the missing number?",
      distractors: [
        { value: 33, strategy: "wrong-operation (20 + 13)" },
        { value: 20, strategy: "raw-operand" },
        { value: 13, strategy: "raw-operand" },
      ],
    },
    {
      id: 17,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "addition",
      expression: "60 + 4",
      answer: 64,
      question_zh: "6 个十和 4 个一合起来是多少？", // place-value composition
      question_en: "6 tens and 4 ones make what number?",
      distractors: [
        { value: 46, strategy: "digit-reversal" },
        { value: 60, strategy: "drop-ones (raw-operand)" },
        { value: 10, strategy: "digit-sum (6 + 4)" },
      ],
    },

    // --- TP2: compare / select by value (largest / smallest / digit value) ---
    {
      id: 18,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "20",
      answer: 20,
      question_zh: "选出最大的数目：18, 20, 14, 10。",
      question_en: "Choose the largest number: 18, 20, 14, 10.",
      distractors: [
        { value: 18, strategy: "place-value-slip (compared the ones digit)" },
        { value: 14, strategy: "near-pick" },
        { value: 10, strategy: "wrong-extreme (smallest)" },
      ],
    },
    {
      id: 19,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "19",
      answer: 19,
      question_zh: "选出最小的数目：23, 32, 19, 41。",
      question_en: "Choose the smallest number: 23, 32, 19, 41.",
      distractors: [
        { value: 23, strategy: "near-pick" },
        { value: 32, strategy: "digit-reversal confusion" },
        { value: 41, strategy: "wrong-extreme (largest)" },
      ],
    },
    {
      id: 20,
      topic: "4.1",
      tp_level: 2,
      profile: "dpk3_2026_core",
      answer_unit: "none",
      operation: "counting",
      expression: "40",
      answer: 40,
      question_zh: "在 42 中，数字 4 的数值是多少？", // digit value (place value)
      question_en: "In 42, what is the value of the digit 4?",
      distractors: [
        { value: 4, strategy: "place-value-slip (digit, not its value)" },
        { value: 42, strategy: "raw-operand" },
        { value: 2, strategy: "ones-digit" },
      ],
    },
  ],
};

// Re-export the underlying wire format so the engine and (later) the worker
// can load this bank exactly like the legacy SAMPLE_BANK. The extra `profile`
// and `scope` fields are inert for QuestionBank, which only reads source /
// currency / questions.
export const STD1_WOOLLY_BANK_DATA: QuestionBankData = {
  source: STD1_WOOLLY_BANK.source,
  currency: STD1_WOOLLY_BANK.currency,
  questions: STD1_WOOLLY_BANK.questions,
};
