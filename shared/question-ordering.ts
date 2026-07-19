// Ordering answer-form surface (M3, #12): the serving contract and the
// form-aware strings for schema-v2 `ordering` questions (style doc §A
// `order-sequence`). Pure domain — no Cocos — so the whole interaction is
// unit-testable; OrderingView stays a thin renderer.
//
// The bank declares the sequence in its CORRECT order plus a direction
// (ascending/descending values, or "forward" for event/pattern order) — no
// UI state enters the bank. A served round shuffles the tiles into a tray
// and the child places every tile into the answer slots; judging is
// three-valued so an unfinished arrangement is never scored as wrong:
//
//   incomplete — some slots are still empty: a calm hint, no battle penalty
//   incorrect  — every slot filled, wrong order: the normal wrong-answer flow
//   correct    — the declared order: the normal correct-answer flow
//
// The wire contract (validation, direction vocabulary, the 3–5 item bound)
// lives in question-v2.ts / question-v2-validate.ts; the content checks
// (sortedness, comparator chains, label drift) live in question-verify.ts.

import {
  ORDERING_FORM,
  type Question,
  type QuestionSequenceItem,
  type QuestionTurn,
} from "./question-engine.ts";

/** True when the question serves the tray/slot ordering round (#12). */
export function isOrdering(q: Question): boolean {
  return q.answer_form === ORDERING_FORM;
}

/** One served tile: the declared item with its display text resolved.
 * Numeric ordering leaves labels unauthored — tiles show the numeral, as on
 * a worksheet; `forward` events carry their bilingual labels from the bank. */
export interface OrderingTile {
  value: number;
  labelZh: string;
  labelEn: string;
}

function tileOf(item: QuestionSequenceItem): OrderingTile {
  return {
    value: item.value,
    labelZh: item.label_zh ?? String(item.value),
    labelEn: item.label_en ?? String(item.value),
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The three-valued ordering judgment (see the module header). */
export type OrderingOutcome = "incomplete" | "incorrect" | "correct";

/**
 * One ordering round presented to the player: the declared tiles shuffled
 * into a tray, plus one answer slot per tile. Pointer taps and digit keys
 * both land on `placeFromTray` / `returnToTray`; `judge()` scores the
 * arrangement. The bank's declared order is the answer — the round never
 * re-sorts or re-derives it (verification already did, at authoring time).
 */
export class OrderingRound {
  readonly turn: QuestionTurn;
  readonly direction: string;
  private readonly expected: readonly OrderingTile[];
  private trayItems: OrderingTile[];
  private slotItems: (OrderingTile | null)[];

  constructor(turn: QuestionTurn, rng: () => number = Math.random) {
    const sequence = turn.question.sequence;
    if (!sequence || sequence.items.length === 0) {
      throw new Error("OrderingRound: the question declares no sequence");
    }
    this.turn = turn;
    this.direction = sequence.direction;
    this.expected = sequence.items.map(tileOf);
    this.trayItems = shuffle([...this.expected], rng);
    this.slotItems = this.expected.map(() => null);
  }

  /** Tiles still in the tray, in tray order. */
  get tray(): readonly OrderingTile[] {
    return this.trayItems;
  }

  /** The answer slots (null = empty), left to right. */
  get slots(): readonly (OrderingTile | null)[] {
    return this.slotItems;
  }

  /** True when every slot holds a tile. */
  get complete(): boolean {
    return this.slotItems.every((tile) => tile !== null);
  }

  /** Move the tray tile at `trayIndex` into the first empty slot. Returns
   * false for a bad index or when every slot is already filled. */
  placeFromTray(trayIndex: number): boolean {
    const slot = this.slotItems.indexOf(null);
    const tile = this.trayItems[trayIndex];
    if (slot < 0 || tile === undefined) return false;
    this.trayItems.splice(trayIndex, 1);
    this.slotItems[slot] = tile;
    return true;
  }

  /** Return the tile in `slotIndex` to the end of the tray. */
  returnToTray(slotIndex: number): boolean {
    const tile = this.slotItems[slotIndex];
    if (!tile) return false;
    this.slotItems[slotIndex] = null;
    this.trayItems.push(tile);
    return true;
  }

  /** Undo the most recent placement (keyboard backspace). */
  returnLast(): boolean {
    for (let i = this.slotItems.length - 1; i >= 0; i--) {
      if (this.slotItems[i]) return this.returnToTray(i);
    }
    return false;
  }

  /** The correct values in the declared order. */
  expectedValues(): number[] {
    return this.expected.map((tile) => tile.value);
  }

  /** Score the current arrangement (three-valued; see the module header). */
  judge(): OrderingOutcome {
    if (!this.complete) return "incomplete";
    const correct = this.slotItems.every(
      (tile, i) => tile !== null && tile.value === this.expected[i].value,
    );
    return correct ? "correct" : "incorrect";
  }
}

// --- prompt hint -------------------------------------------------------------

/** The direction line under the question, bilingual. `forward` covers both
 * daily events and pattern stages, so its hint stays generic. */
export function orderingHint(direction: string): string {
  if (direction === "ascending") {
    return "从小到大排列 · Arrange from smallest to largest";
  }
  if (direction === "descending") {
    return "从大到小排列 · Arrange from largest to smallest";
  }
  return "按顺序排列 · Put them in the right order";
}

/** The calm reminder when the child checks an unfinished arrangement. This
 * is the `incomplete` outcome: it never reaches the battle's result line and
 * never costs a turn. */
export const ORDERING_INCOMPLETE_HINT =
  "还没有排完 — 把每张卡片都放好再检查 · Place every card before checking.";

// --- keyboard ----------------------------------------------------------------

/**
 * Keyboard mapping for ordering: digit keys "1".."5" place the tray tile at
 * that position into the first empty slot (the wire bounds sequences to five
 * items). Returns -1 for any other key. Enter submits and Backspace undoes —
 * those are single fixed keys the view maps directly.
 */
export function orderingKeyIndex(key: string): number {
  return ["1", "2", "3", "4", "5"].indexOf(key);
}

// --- result feedback ---------------------------------------------------------

/**
 * The battle result line for a judged ordering round, bilingual and calm.
 * The turn's `expression` IS the declared order (a comparator chain like
 * "5 < 6 < 7 < 8 < 9", or the label chain "起床 → 刷牙 → 上学" for forward
 * events), so the feedback can state it verbatim. Incomplete arrangements
 * never reach here — they are handled inside the round (see
 * ORDERING_INCOMPLETE_HINT).
 */
export function orderingResultFeedback(turn: QuestionTurn, correct: boolean): string {
  const order = turn.expression;
  return correct
    ? `排对了！${order}。 Correct — well ordered!`
    : `再想一想，正确的顺序是 ${order}。 Good try — the correct order is ${order}.`;
}
