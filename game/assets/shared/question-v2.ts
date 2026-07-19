// Question schema v2: the explicit Standard-1 question contract (M3, #10).
//
// v2 is ADDITIVE over v1 (question-engine.ts): the engine's runtime behavior
// is unchanged, and every v2 question is still a v1 `Question` the battle
// loop can serve. What v2 adds is the explicit curriculum contract sketched
// in docs/curriculum/standard-1-question-style.md §E — format, TP,
// presentation, answer form, distractor strategy, bilingual values, and a
// curriculum-profile gate on every item.
//
// Two shapes, one contract:
// - WIRE (authored JSON, parsed by question-v2-validate.ts): strict. Every
//   v2 field is required, distractors are 3 authored misconception choices,
//   and `steps` is gone — Standard 1 is single-step by scope.
// - RUNTIME (this module's types): what the engine and the v1 adapter hold.
//   `distractors`/`answer_unit`/`steps`/`table` stay optional so adapted
//   legacy banks keep their exact v1 serving behavior (engine near-misses,
//   legacy RM rendering, multi-step turns). Invariant: wire-valid implies
//   runtime-valid; the converse is false.

import type { CurriculumProfile } from "./curriculum";
import type {
  Question,
  QuestionBankData,
  VersionedQuestionBankData,
} from "./question-engine";

// --- enum axes (vocabulary: standard-1-question-style.md §A/§B/§D/§E) ---

/** Item shape (style doc §B). v2 serves numeric objective rounds only;
 * fill-blank/constructed/activity shapes arrive with their graders (#11+). */
export const ITEM_FORMATS = ["objective"] as const;
export type ItemFormat = (typeof ITEM_FORMATS)[number];

/** Worksheet format taxonomy (style doc §A), kept verbatim — the axis is
 * descriptive (generation weighting, review), so the full menu is allowed;
 * `answer_form` is what constrains serveability. */
export const QUESTION_FORMAT_TYPES = [
  "count-write",
  "count-circle",
  "match-connect",
  "color-shade",
  "fill-blank",
  "number-bond",
  "ten-frame",
  "pattern-continue",
  "compare",
  "order-sequence",
  "picture-sentence",
  "word-single",
  "read-instrument",
  "name-count",
  "classify-sort",
  "true-false",
  "trace-write",
  "tally",
  "estimate",
  "round-ten",
] as const;
export type QuestionFormatType = (typeof QUESTION_FORMAT_TYPES)[number];

/** Presentation axis (style doc §E): how the item is shown. figure:* values
 * name the declarative figure the FigureView kit (#16) will render. */
export const QUESTION_PRESENTATIONS = [
  "plain",
  "picture",
  "story",
  "figure:ten-frame",
  "figure:number-bond",
  "figure:number-line",
  "figure:clock",
  "figure:abacus",
  "figure:coins",
  "figure:shapes",
  "figure:pictograph",
  "figure:objects",
  "figure:balance",
  "figure:calendar",
  "figure:grid",
  "figure:table",
] as const;
export type QuestionPresentation = (typeof QUESTION_PRESENTATIONS)[number];

/** Answer form (style doc §E), restricted to the numeric objective forms v2
 * can serve as a 4-choice numeric round. `circle`/true-false (#11) and
 * `ordering` (#12) extend this list with their renderers. */
export const QUESTION_ANSWER_FORMS = ["numeral", "count", "chinese-word"] as const;
export type QuestionAnswerForm = (typeof QUESTION_ANSWER_FORMS)[number];

/** Misconception menu for authored distractors (style doc §D). The wire
 * schema requires these canonical ids so reviews stay uniform; legacy v1
 * free-text annotations are preserved verbatim by the adapter at runtime. */
export const DISTRACTOR_STRATEGIES = [
  "off-by-one-count",
  "count-all-vs-add",
  "wrong-operation",
  "raw-operand",
  "no-carry-concat",
  "digit-reversal",
  "place-value-slip",
  "more-fewer-flip",
  "next-vs-between",
  "clock-hand-swap",
  "word-operator-scramble",
  "money-denom-miscount",
] as const;
export type DistractorStrategy = (typeof DISTRACTOR_STRATEGIES)[number];

/** Curriculum topic anchors (scope doc §4 + the §5 extras bucket). */
export const QUESTION_TOPICS = [
  "4.1", // whole numbers to 100
  "4.2", // basic operations (+ −)
  "4.3", // money (≤ RM10)
  "4.4", // time
  "4.5", // measurement (non-standard units)
  "4.6", // space & shapes
  "4.7", // data handling
  "extra", // original_dskp_extra profile only
] as const;
export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

/** v2 numeric-objective operations (Std-1 hard constraints: + − only). */
export const QUESTION_V2_OPERATIONS = ["counting", "addition", "subtraction"] as const;
export type QuestionV2Operation = (typeof QUESTION_V2_OPERATIONS)[number];

/** The answer in both written forms (style doc §E): the numeral string and
 * the Chinese number word ("18" / "十八"), so a bank can serve options in
 * either script. The wire schema pins `numeral` to the answer's digits;
 * question-verify.ts checks `zh_word` against chineseNumeral(). */
export interface BilingualValue {
  numeral: string;
  zh_word: string;
}

/**
 * The runtime v2 question: a v1 `Question` with the curriculum metadata made
 * explicit and required. `distractors`, `answer_unit`, `steps`, and `table`
 * remain optional — adapted v1 banks legitimately lack authored choices and
 * rely on the engine's near-miss generator and legacy RM rendering, and
 * legacy multi-step items keep their step turns. Authored v2 wire JSON makes
 * distractors and answer_unit mandatory and drops steps entirely.
 */
export interface QuestionV2 extends Question {
  topic: string; // wire constrains to QUESTION_TOPICS; "legacy" marks adapted v1 content
  tp_level: number; // PBD performance level 1..6 (no exam at Standard 1)
  profile: CurriculumProfile;
  item_format: ItemFormat;
  format_type: QuestionFormatType;
  presentation: QuestionPresentation;
  answer_form: QuestionAnswerForm;
  bilingual: BilingualValue;
}

/** Versioned v2 envelope: same bank fields as v1, schema_version 2. */
export interface VersionedQuestionBankV2Data extends QuestionBankData {
  schema_version: 2;
  bank_id: string;
  version: number;
  profile?: CurriculumProfile;
  scope?: string;
  questions: QuestionV2[];
}

/** What the trust boundary returns: a parsed v1 or v2 bank. */
export type AnyVersionedQuestionBankData =
  | VersionedQuestionBankData
  | VersionedQuestionBankV2Data;

// --- Chinese number words (bilingual value derivation) ---

const ZH_DIGITS = "零一二三四五六七八九";

/** Render 1..9999 as a Chinese group with 千/百/十 units and 零 rules.
 * At the head of the number, 10–19 read 十…, not 一十… (leading 一 drops);
 * mid-number groups keep it (10 010 → 一万零一十). */
function zhFourDigits(n: number, head: boolean): string {
  const units = ["千", "百", "十", ""];
  const digits = String(n).padStart(4, "0");
  let out = "";
  let zeroPending = false;
  for (let i = 0; i < 4; i++) {
    const d = digits.charCodeAt(i) - 48;
    if (d === 0) {
      if (out !== "") zeroPending = true;
      continue;
    }
    if (zeroPending) {
      out += "零";
      zeroPending = false;
    }
    out += ZH_DIGITS[d] + units[i];
  }
  return head && out.startsWith("一十") ? out.slice(1) : out;
}

/**
 * Chinese number word for a non-negative integer, e.g. 8 → "八",
 * 73 → "七十三", 108 → "一百零八", 46390 → "四万六千三百九十".
 * Supports 0..99,999,999 — far past the Standard-1 scope (≤100) so legacy
 * v1 banks adapt cleanly. Throws on negatives, non-integers, and larger
 * values rather than emitting a wrong gloss.
 */
export function chineseNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`chineseNumeral: ${String(n)} is not a non-negative integer`);
  }
  if (n === 0) return "零";
  if (n > 99_999_999) {
    throw new Error(`chineseNumeral: ${String(n)} exceeds 99,999,999`);
  }
  const low = n % 10_000;
  const high = Math.floor(n / 10_000);
  if (high === 0) return zhFourDigits(low, true);
  const head = zhFourDigits(high, true) + "万";
  if (low === 0) return head;
  // A low group under 1000 needs a 零 bridge (10 201 → 一万零二百零一).
  return head + (low < 1000 ? "零" : "") + zhFourDigits(low, false);
}
