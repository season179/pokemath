// Question engine: bilingual money word problems, split into answer turns.
// Pure domain — no DOM, no canvas. Ported from the prototype's questions.js.
//
// Data schema note: Question/QuestionStep keep the snake_case field names of
// the authored bank format (math-questions.json). That schema IS the wire
// format — banks are authored in it and Phase 3 imports it into D1 as-is.

export interface QuestionStep {
  prompt_zh: string;
  prompt_en: string;
  expression: string;
  answer: number;
}

export interface Question {
  id: number;
  question_zh: string;
  question_en: string;
  operation: string; // "addition" | "subtraction" | ... | "mixed (...)"
  expression: string;
  answer: number;
  table?: Record<string, number>;
  steps?: QuestionStep[];
}

export interface QuestionBankData {
  source: string;
  currency: string;
  questions: Question[];
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

// One answer round presented to the player: a turn plus its choices.
// Scenes keep the round, render `choices`, and report `judge(picked)`.
export class QuestionRound {
  readonly turn: QuestionTurn;
  readonly choices: readonly number[];

  constructor(turn: QuestionTurn, rng: () => number = Math.random) {
    this.turn = turn;
    this.choices = makeChoices(turn.answer, rng);
  }

  judge(picked: number): boolean {
    return picked === this.turn.answer;
  }
}
