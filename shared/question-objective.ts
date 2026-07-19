// Objective answer-form surface (M3, #11): how schema-v2 circle and
// true-false questions are labeled, hinted, key-mapped, and fed back to the
// player. Pure domain — no Cocos — so the whole interaction contract is
// unit-testable; QuestionView and BattleScreen stay thin renderers.
//
// The serving contract itself (choices, judge) stays in question-engine.ts:
// circle serves the declared numeric options (answer + 3 authored choices,
// shuffled), and true-false serves the closed ✓/✗ pair encoded 1/0 in the
// fixed worksheet order. This module owns everything form-aware that is NOT
// serving: option labels, the prompt hint, keyboard mapping, and the
// bilingual result feedback. Legacy numeric forms get byte-identical legacy
// strings — the pre-#11 texts are pinned by tests.

import {
  TRUE_FALSE_FORM,
  TRUTH_FALSE,
  TRUTH_TRUE,
  formatAnswer,
  type Question,
  type QuestionTurn,
} from "./question-engine.ts";
import { isOrdering, orderingResultFeedback } from "./question-ordering.ts";
import { chineseNumeral } from "./question-v2.ts";

// Form literals mirror the question-v2.ts QUESTION_ANSWER_FORMS vocabulary.
const CIRCLE_FORM = "circle";
const CHINESE_WORD_FORM = "chinese-word";

/** The question's answer form, if it declares one (legacy questions don't). */
export function answerFormOf(q: Question): string | undefined {
  return q.answer_form;
}

/** True when the question judges a statement 对/错 (answer encoded 1/0). */
export function isTrueFalse(q: Question): boolean {
  return q.answer_form === TRUE_FALSE_FORM;
}

// --- truth values ------------------------------------------------------------

export interface TruthLabel {
  glyph: string; // ✓ / ✗
  zh: string; // 对 / 错
  en: string; // "true" / "false"
}

/**
 * The bilingual label of a truth value. The judgment words are a closed
 * universal pair, so they live here in code — not in the bank's `bilingual`
 * field, which stays the numeral's Chinese number word ("一"/"零").
 */
export function truthLabel(value: number): TruthLabel {
  if (value === TRUTH_TRUE) return { glyph: "✓", zh: "对", en: "true" };
  if (value === TRUTH_FALSE) return { glyph: "✗", zh: "错", en: "false" };
  throw new Error(`truthLabel: ${String(value)} is not a truth value (1 or 0)`);
}

// --- option labels -----------------------------------------------------------

/**
 * Display label for one served option, form-aware:
 * - true-false: the bilingual truth mark, e.g. "✓ 对 True" / "✗ 错 False"
 * - chinese-word: the Chinese number word, e.g. "十八" (the bilingual field's
 *   documented purpose: serving options in either script)
 * - everything else (numeral / count / circle / legacy): formatAnswer, so
 *   legacy banks render byte-for-byte as before.
 */
export function formatObjectiveChoice(q: Question, value: number): string {
  if (isTrueFalse(q)) {
    const t = truthLabel(value);
    return `${t.glyph} ${t.zh} ${t.en === "true" ? "True" : "False"}`;
  }
  if (q.answer_form === CHINESE_WORD_FORM) return chineseNumeral(value);
  return formatAnswer(value, q.answer_unit);
}

// --- prompt hint -------------------------------------------------------------

/** The hint line under the options, form-aware. The default is the exact
 * pre-#11 hint so legacy rounds are unchanged. */
export function objectiveHint(q: Question): string {
  if (isTrueFalse(q)) return "对的选 ✓，错的选 ✗ · True or false?";
  if (q.answer_form === CIRCLE_FORM) return "圈出正确的答案 · Circle the correct answer";
  return "Pick the right answer / 选出正确答案";
}

// --- keyboard ----------------------------------------------------------------

/**
 * Keyboard mapping for objective selection: digit keys "1".."4" pick the
 * option at that position (true-false uses "1" = ✓, "2" = ✗). Returns -1 for
 * any other key. Pointer taps and digit keys both land on the same
 * `QuestionView.choose(index)` — this map is the whole difference.
 */
export function objectiveKeyIndex(key: string): number {
  return ["1", "2", "3", "4"].indexOf(key);
}

// --- result feedback ---------------------------------------------------------

/**
 * The battle result line for a judged round, form-aware. Ordering rounds
 * (#12) route to their own feedback (it states the declared order);
 * true-false is bilingual ("对！…是错的 (✗)。 Correct! … is false.").
 * Numeric forms — including circle — return the exact pre-#11 strings
 * ("Correct! 70 + 3 = 73" / "Good try — 70 + 3 = 73."), so legacy feedback
 * is byte-identical.
 */
export function resultFeedback(turn: QuestionTurn, correct: boolean): string {
  if (isOrdering(turn.question)) return orderingResultFeedback(turn, correct);
  if (isTrueFalse(turn.question)) {
    const t = truthLabel(turn.answer);
    const zh = correct ? "答对了！" : "再想一想，";
    const en = correct
      ? `Correct! "${turn.expression}" is ${t.en}.`
      : `Good try — "${turn.expression}" is ${t.en}.`;
    return `${zh}「${turn.expression}」是${t.zh}的 (${t.glyph})。 ${en}`;
  }
  const digits = formatAnswer(turn.answer, "none");
  return correct
    ? `Correct! ${turn.expression} = ${digits}`
    : `Good try — ${turn.expression} = ${digits}.`;
}
