// Question engine: bilingual money word problems, split into answer turns.
// Pure domain — no DOM, no canvas. Ported from the prototype's questions.js.
//
// Data schema note: Question/QuestionStep keep the snake_case field names of
// the authored JSON bank format. JSON is the content source of truth; this
// module owns the runtime contract and behavior, not the authored questions.

import type { FigureSpec } from "./figures.ts";

export interface QuestionStep {
  prompt_zh: string;
  prompt_en: string;
  expression: string;
  answer: number;
}

// A hand-authored distractor: a numeric value plus the misconception it
// targets. The `strategy` is a human-review annotation drawn from the
// curriculum question-style doc (off-by-one-count, wrong-operation,
// digit-reversal, …); the engine never interprets it, it only records *why*
// an author chose this wrong answer so a reviewer can audit it.
export interface Distractor {
  value: number;
  strategy: string;
}

// How a numeric answer should be displayed. Omitting `answer_unit` preserves
// the legacy money rendering (the original bank is all currency), so
// SAMPLE_BANK renders byte-for-byte identically. New banks set it explicitly
// so a count is never shown as currency.
export type AnswerUnit = "none" | "RM" | "sen";

export interface Question {
  id: number;
  question_zh: string;
  question_en: string;
  operation: string; // "addition" | "subtraction" | ... | "mixed (...)"
  expression: string;
  answer: number;
  table?: Record<string, number>;
  steps?: QuestionStep[];
  // --- additive metadata (optional; schema-v1 legacy banks omit these) ---
  // Curriculum anchors so a bank can be filtered/adapted to schema v2 later.
  // `topic` is a curriculum-doc section id (e.g. "4.1" whole numbers),
  // `tp_level` is the PBD performance level 1..6, and `profile` is the
  // curriculum-profile flag the item was authored for.
  topic?: string;
  tp_level?: number;
  profile?: string;
  // Hand-authored MCQ distractors. When present, QuestionRound serves these
  // (shuffled) instead of the generic makeChoices() near-misses, so a bank
  // can drive choices from real misconceptions.
  distractors?: Distractor[];
  // Display unit for the numeric answer/choices. See AnswerUnit.
  answer_unit?: AnswerUnit;
  // Answer-form marker (schema v2 vocabulary, question-v2.ts). Optional here:
  // legacy v1 banks omit it and keep numeric MCQ serving. The engine reads it
  // for exactly one serving rule — see chooseOptions.
  answer_form?: string;
  // Declared ordering sequence (answer_form "ordering", #12). Never present
  // on legacy banks; served by question-ordering.ts, not QuestionRound.
  sequence?: QuestionSequence;
  // Presentation marker (schema-v2 vocabulary, question-v2.ts). Optional:
  // legacy v1 banks omit it and keep prose serving. The FigureView kit
  // (#16) reads it for the deliberate prose fallback (resolveFigureView).
  presentation?: string;
  // Declarative figure spec (schema-v2 wire only, #16): authored content
  // data rendered by the shared FigureView kit. Absent on legacy banks —
  // the v1 wire rejects it and the v1 adapter never fabricates one.
  figure?: FigureSpec;
}

export interface QuestionBankData {
  source: string;
  currency: string;
  questions: Question[];
}

// Versioned envelope used by authored JSON assets. v2 (question-v2.ts)
// extends this additively; v1 remains the contract for the first Woolly
// Meadows preview and parses unchanged at the trust boundary.
export interface VersionedQuestionBankData extends QuestionBankData {
  schema_version: 1;
  bank_id: string;
  version: number;
  profile?: string;
  scope?: string;
}

// A "turn" is one answer round. Plain questions are one turn; questions with
// `steps` become one turn per step so kids solve big problems piece by piece.
// Convenience fields (expression/answer/promptZh/promptEn) are resolved at
// construction so renderers never have to know whether a step is active.
export interface QuestionTurn {
  readonly question: Question;
  readonly step: QuestionStep | null;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly expression: string;
  readonly answer: number;
  readonly promptZh: string;
  readonly promptEn: string;
}

export function turnsOf(q: Question): QuestionTurn[] {
  const make = (step: QuestionStep | null, stepIndex: number, stepCount: number): QuestionTurn => ({
    question: q,
    step,
    stepIndex,
    stepCount,
    expression: step ? step.expression : q.expression,
    answer: step ? step.answer : q.answer,
    promptZh: step ? step.prompt_zh : q.question_zh,
    promptEn: step ? step.prompt_en : q.question_en,
  });
  if (!q.steps) return [make(null, 0, 1)];
  return q.steps.map((s, i) => make(s, i, q.steps!.length));
}

export class QuestionBank {
  readonly data: QuestionBankData;
  private rng: () => number;
  private lastId: number | null = null;

  constructor(data: QuestionBankData, rng: () => number = Math.random) {
    this.data = data;
    this.rng = rng;
  }

  get questions(): readonly Question[] {
    return this.data.questions;
  }

  // Pick a random question, optionally filtered (e.g. "no multi-step"),
  // avoiding an immediate repeat of the previous pick when the pool allows.
  pick(filter?: (q: Question) => boolean): Question {
    let pool = this.data.questions.filter(filter ?? (() => true));
    if (pool.length === 0) {
      throw new Error("QuestionBank.pick: no question matches the filter");
    }
    if (pool.length > 1) pool = pool.filter((q) => q.id !== this.lastId);
    const q = pool[Math.floor(this.rng() * pool.length)];
    this.lastId = q.id;
    return q;
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// One right answer + three near-miss distractors, scaled to the answer's
// size so the options can only be told apart by doing the math.
export function makeChoices(answer: number, rng: () => number = Math.random): number[] {
  const step = Math.pow(10, Math.max(1, String(answer).length - 2));
  const candidates = shuffle(
    [1, -1, 2, -2, 3, -3, 5, -5].map((k) => answer + k * step).filter((v) => v > 0),
    rng,
  );
  const distractors = candidates.slice(0, 3);
  // Degenerate tiny answers may not yield three positive near-misses; pad
  // with consecutive numbers (step is always >= 10, so these never collide).
  for (let v = answer + 1; distractors.length < 3; v++) {
    if (!distractors.includes(v)) distractors.push(v);
  }
  return shuffle([answer, ...distractors], rng);
}

// Format a numeric answer (or choice) for display, honouring its unit. Pure —
// no DOM, no Cocos — so it is unit-testable and shared by every renderer.
// Thousands are separated by a regular space (matching the game's fmtNum and
// the Malaysian money style "RM55 000"). An omitted unit falls back to the
// legacy money rendering ("RM 12 800").
export function formatAnswer(value: number, unit?: AnswerUnit): string {
  const digits = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (unit === "none") return digits;
  if (unit === "sen") return `${digits} sen`;
  return `RM ${digits}`; // "RM" and undefined (legacy) both prefix RM
}

// True-false answer form (#11): the answer is encoded 1 = 对/✓ (true),
// 0 = 错/✗ (false) so the numeric QuestionRound contract (choices, judge)
// serves it unchanged. The option set is a closed pair served in
// conventional worksheet order (✓ before ✗) — never shuffled, never
// near-miss generated. The literal mirrors the question-v2.ts vocabulary;
// the engine deliberately does not import the v2 module (v2 layers on top).
export const TRUE_FALSE_FORM = "true-false";
export const TRUTH_TRUE = 1;
export const TRUTH_FALSE = 0;

// Ordering answer form (#12): the question declares a sequence of tiles in
// their CORRECT order plus a direction (ascending/descending values, or
// "forward" for event/pattern order). The engine never serves ordering
// rounds — the tray/slot interaction lives in question-ordering.ts — but
// the Question record carries the declaration so turns flow it through.
// The direction vocabulary is a v2 wire concern (question-v2.ts
// ORDERING_DIRECTIONS); structurally the engine only requires the shape.
export const ORDERING_FORM = "ordering";

export interface QuestionSequenceItem {
  value: number; // numeric identity; the tile text for numeric ordering
  label_zh?: string; // tile text; required by the wire for "forward" events
  label_en?: string;
}

export interface QuestionSequence {
  direction: string; // wire constrains to ORDERING_DIRECTIONS (question-v2.ts)
  items: QuestionSequenceItem[]; // declared in correct order; serving shuffles
}

// One answer round presented to the player: a turn plus its choices.
// Scenes keep the round, render `choices`, and report `judge(picked)`.
export class QuestionRound {
  readonly turn: QuestionTurn;
  readonly choices: readonly number[];

  constructor(turn: QuestionTurn, rng: () => number = Math.random) {
    this.turn = turn;
    this.choices = chooseOptions(turn, rng);
  }

  judge(picked: number): boolean {
    return picked === this.turn.answer;
  }
}

// Prefer hand-authored distractors when the question supplies them (so a
// curriculum author can drive choices from real misconceptions); otherwise
// fall back to the generic scaled near-miss generator. Authored options are
// shuffled so the correct answer's position is not fixed by authoring order.
function chooseOptions(turn: QuestionTurn, rng: () => number): number[] {
  if (turn.question.answer_form === TRUE_FALSE_FORM) {
    return [TRUTH_TRUE, TRUTH_FALSE];
  }
  const authored = turn.question.distractors;
  if (authored && authored.length > 0) {
    return shuffle([turn.answer, ...authored.map((d) => d.value)], rng);
  }
  return makeChoices(turn.answer, rng);
}
