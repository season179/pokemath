// Figure specs: the declarative figure DSL (M5, #16).
//
// Standard-1 items are overwhelmingly visual (question-style doc §E) —
// counting groups, ten-frames, clocks, coins. A figure spec is CONTENT
// DATA: the bank authors a small declarative payload and one shared
// renderer (game/assets/src/questions/FigureView.ts) draws it. No question
// ships custom UI code.
//
// The nine kinds here are the highest-frequency Standard-1 visuals. The
// remaining `figure:*` presentation values (number-bond, number-line,
// balance, calendar, grid, table) deliberately fall back to prose plus the
// world's sprites until their renderers land — see resolveFigureView.
//
// Wire posture: figures are a schema-v2 feature. The v1 wire stays frozen
// (its unknown-field guard rejects `figure`), and the v1→v2 adapter never
// fabricates a figure for legacy content.
//
// The DSL itself enforces the island's hard scope laws where it can: the
// clock cannot describe a non-quarter-hour time, and a coin pile cannot
// exceed RM1. Content rules that need the question context (does the
// figure match the answer?) stay in question-verify.ts / human review.

import type { Question } from "./question-engine.ts";
import {
  record,
  rejectUnknownFields,
  requiredInteger,
  requiredString,
} from "./parse-util.ts";

// --- spec kinds --------------------------------------------------------------

export const FIGURE_KINDS = [
  "ten-frame",
  "clock",
  "coins",
  "objects",
  "shapes",
  "solids",
  "abacus",
  "measure",
  "pictograph",
] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

/** A ten-frame's counters run 0..20: a second frame carries teen numbers
 * (the double ten-frame, 二十格, of within-20 number bonds). */
export const TEN_FRAME_MAX_FILLED = 20;

/** Ten-frame (十格框): `filled` counters fill 10-cell frames in reading
 * order (left→right, top→bottom); the remaining cells stay visibly empty
 * so bonds to 10/20 read off the gaps. */
export interface TenFrameFigure {
  kind: "ten-frame";
  filled: number;
}

/** Standard 1 reads whole / half / quarter hours only (scope doc §2), so
 * the minute hand can only point at 12, 3, 6, or 9 — the spec cannot
 * describe an off-scope clock. */
export const CLOCK_MINUTES = [0, 15, 30, 45] as const;
export type ClockMinute = (typeof CLOCK_MINUTES)[number];

/** Analog clock face (钟面). `hour` is the numeral the hour hand has
 * passed (1..12); the hand travels with the minutes (see clockHandAngles). */
export interface ClockFigure {
  kind: "clock";
  hour: number; // 1..12
  minute: ClockMinute;
}

/** Malaysian sen coins. Standard-1 money scope keeps sen totals ≤ RM1 —
 * the spec refuses a pile a Standard-1 child should never have to sum.
 * Ringgit notes join the DSL with the money topic arc (#18). */
export const COIN_DENOMINATIONS = [5, 10, 20, 50] as const;
export type CoinDenomination = (typeof COIN_DENOMINATIONS)[number];
export const COINS_MAX_TOTAL_SEN = 100;

export interface CoinsFigure {
  kind: "coins";
  coins: CoinDenomination[]; // non-empty; total ≤ COINS_MAX_TOTAL_SEN
}

/** Island law: numbers ≤ 100 (scope doc §2). */
export const OBJECTS_MAX_COUNT = 100;

/** A countable group of one emoji object laid out in rows. `crossedOut`
 * strikes the trailing N items — the picture-sentence (看图列式)
 * subtraction convention ("12 个苹果，划掉 5 个，还剩几个？"). */
export interface ObjectsFigure {
  kind: "objects";
  icon: string; // one emoji grapheme, e.g. "🐑"
  count: number; // 1..OBJECTS_MAX_COUNT
  crossedOut?: number; // 1..count; omit when nothing is struck
}

/** One declarative figure. Renderers switch exhaustively over `kind`. */
export type FigureSpec =
  | TenFrameFigure
  | ClockFigure
  | CoinsFigure
  | ObjectsFigure
  | ShapesFigure
  | SolidsFigure
  | AbacusFigure
  | MeasureFigure
  | PictographFigure;

// --- the visual-math arc kinds (M5, #20) --------------------------------------

/** The four named Standard-1 2D shapes (scope doc §4.6 — no other polygons). */
export const SHAPES_2D = ["square", "rectangle", "triangle", "circle"] as const;
export type Shape2D = (typeof SHAPES_2D)[number];

/** A frieze row stays inside the figure band (pattern runs show one unit
 * repeat, e.g. ○ △ ○ △ __). */
export const SHAPES_MAX_SEQUENCE = 8;

/** A row of 2D shapes (Pattern Gardens). One shape for name-count items
 * ("正方形有几条边？"); a short row for pattern items, where `blank` adds a
 * dashed "?" slot after the last shape — the child names what fills it. */
export interface ShapesFigure {
  kind: "shapes";
  sequence: Shape2D[]; // 1..SHAPES_MAX_SEQUENCE
  blank?: boolean; // trailing empty slot (pattern-continue only)
}

/** The six named Standard-1 solids (scope doc §4.6: 正方体/长方体/圆柱体/
 * 圆锥体/角锥体/球体). */
export const SOLIDS_3D = ["cube", "cuboid", "cylinder", "cone", "pyramid", "sphere"] as const;
export type Solid3D = (typeof SOLIDS_3D)[number];

/** A solid scavenger hunt shows one solid (name it, count 面/边/顶点), a
 * small line-up to compare, or a short 3D pattern row. */
export const SOLIDS_MAX_SHOWN = 4;

/** Simple line-drawn 3D solids (Harvest Barn). One solid for name-count
 * items; up to four for comparisons and pattern rows. */
export interface SolidsFigure {
  kind: "solids";
  solids: Solid3D[]; // 1..SOLIDS_MAX_SHOWN
}

/** The miller's 1:4 abacus (one heaven bead worth 5, four earth beads worth
 * 1 each) reads two rods — 十位 and 个位 — so it shows 0..99. Representation
 * only (scope doc §3): the figure never asks for abacus arithmetic. */
export const ABACUS_MAX_VALUE = 99;

export interface AbacusFigure {
  kind: "abacus";
  value: number; // 0..ABACUS_MAX_VALUE
}

/** Non-standard measurement (scope doc §4.5): the measured object as one
 * emoji, the unit as one emoji, and `count` unit icons laid end-to-end —
 * "这支铅笔长几个回形针？". Length, mass (marbles), and volume (cups) all
 * read as a count of unit icons. No standard units can be expressed: the
 * spec carries no cm/kg/ℓ vocabulary at all. */
export const MEASURE_MAX_UNITS = 10;

export interface MeasureFigure {
  kind: "measure";
  object: string; // one emoji grapheme, e.g. "✏️"
  unit: string; // one emoji grapheme, e.g. "📎"
  count: number; // 1..MEASURE_MAX_UNITS unit icons
}

/** Pictograph rows stay small: a Standard-1 board shows a handful of
 * categories with counts a child can recount by pointing. */
export const PICTOGRAPH_MAX_ROWS = 4;
export const PICTOGRAPH_MAX_COUNT = 10;

/** One pictograph category row. The island law is structural: ONE PICTURE =
 * ONE VALUE — the spec carries no scale field, so a scaled pictograph
 * (1 icon = N) is unauthorable (those are original_dskp_extra only). */
export interface PictographRow {
  icon: string; // one emoji grapheme, e.g. "🍎"
  label_zh: string; // category name, e.g. "苹果"
  label_en?: string; // optional gloss, e.g. "apples"
  count: number; // 1..PICTOGRAPH_MAX_COUNT — the value IS the icon count
}

export interface PictographFigure {
  kind: "pictograph";
  rows: PictographRow[]; // 2..PICTOGRAPH_MAX_ROWS, distinct icons
}

// --- presentation axis bridge --------------------------------------------------

/** Every figure kind is named by a `figure:<kind>` presentation value
 * (question-v2.ts QUESTION_PRESENTATIONS); the rest of that axis has no
 * renderer yet and falls back to prose. */
export function figureKindForPresentation(presentation: string): FigureKind | null {
  if (!presentation.startsWith("figure:")) return null;
  const kind = presentation.slice("figure:".length);
  return (FIGURE_KINDS as readonly string[]).includes(kind) ? (kind as FigureKind) : null;
}

/** The presentation value a figure kind answers to, e.g. "figure:clock". */
export function figurePresentation(kind: FigureKind): string {
  return `figure:${kind}`;
}

// --- structural validation (the wire parsers call this) ------------------------

const TEN_FRAME_FIELDS = new Set(["kind", "filled"]);
const CLOCK_FIELDS = new Set(["kind", "hour", "minute"]);
const COINS_FIELDS = new Set(["kind", "coins"]);
const OBJECTS_FIELDS = new Set(["kind", "icon", "count", "crossedOut"]);
const SHAPES_FIELDS = new Set(["kind", "sequence", "blank"]);
const SOLIDS_FIELDS = new Set(["kind", "solids"]);
const ABACUS_FIELDS = new Set(["kind", "value"]);
const MEASURE_FIELDS = new Set(["kind", "object", "unit", "count"]);
const PICTOGRAPH_FIELDS = new Set(["kind", "rows"]);
const PICTOGRAPH_ROW_FIELDS = new Set(["icon", "label_zh", "label_en", "count"]);

/** A required enum member from a small readonly vocabulary (figure kinds
 * reuse this for shape/solid names; bank-level enums live in parse-util). */
function requiredFigureEnum<const T extends readonly string[]>(
  value: unknown,
  vocabulary: T,
  label: string,
): T[number] {
  const text = requiredString(value, label);
  if (!(vocabulary as readonly string[]).includes(text)) {
    throw new Error(`${label} must be one of: ${vocabulary.join(", ")}`);
  }
  return text as T[number];
}

/**
 * Validate an untrusted figure spec. Same posture as the bank parsers:
 * reject unknown fields, label every error with its path, never guess.
 * Structural rules only — cross-field content checks (does the figure show
 * the question's answer?) belong to authoring review.
 */
export function parseFigureSpec(raw: unknown, label: string): FigureSpec {
  const spec = record(raw);
  if (!spec) throw new Error(`${label} must be an object`);
  switch (spec.kind) {
    case "ten-frame": {
      rejectUnknownFields(spec, TEN_FRAME_FIELDS, label);
      const filled = requiredInteger(spec.filled, `${label}.filled`);
      if (filled < 0 || filled > TEN_FRAME_MAX_FILLED) {
        throw new Error(`${label}.filled must be in [0, ${TEN_FRAME_MAX_FILLED}] (single or double ten-frame)`);
      }
      return { kind: "ten-frame", filled };
    }
    case "clock": {
      rejectUnknownFields(spec, CLOCK_FIELDS, label);
      const hour = requiredInteger(spec.hour, `${label}.hour`);
      if (hour < 1 || hour > 12) throw new Error(`${label}.hour must be in [1, 12]`);
      const minute = requiredInteger(spec.minute, `${label}.minute`);
      if (!(CLOCK_MINUTES as readonly number[]).includes(minute)) {
        throw new Error(
          `${label}.minute must be one of: ${CLOCK_MINUTES.join(", ")} ` +
            `(Standard 1 reads whole/half/quarter hours only)`,
        );
      }
      return { kind: "clock", hour, minute: minute as ClockMinute };
    }
    case "coins": {
      rejectUnknownFields(spec, COINS_FIELDS, label);
      if (!Array.isArray(spec.coins) || spec.coins.length === 0) {
        throw new Error(`${label}.coins must be a non-empty array`);
      }
      let total = 0;
      const coins = spec.coins.map((value, index): CoinDenomination => {
        const coin = requiredInteger(value, `${label}.coins[${index}]`);
        if (!(COIN_DENOMINATIONS as readonly number[]).includes(coin)) {
          throw new Error(
            `${label}.coins[${index}] must be a Malaysian sen denomination: ` +
              `${COIN_DENOMINATIONS.join(", ")}`,
          );
        }
        total += coin;
        return coin as CoinDenomination;
      });
      if (total > COINS_MAX_TOTAL_SEN) {
        throw new Error(
          `${label}.coins total ${total} sen exceeds RM1 (${COINS_MAX_TOTAL_SEN} sen) — Standard-1 sen scope`,
        );
      }
      return { kind: "coins", coins };
    }
    case "objects": {
      rejectUnknownFields(spec, OBJECTS_FIELDS, label);
      const icon = requiredString(spec.icon, `${label}.icon`);
      const count = requiredInteger(spec.count, `${label}.count`);
      if (count < 1 || count > OBJECTS_MAX_COUNT) {
        throw new Error(`${label}.count must be in [1, ${OBJECTS_MAX_COUNT}]`);
      }
      if (spec.crossedOut === undefined) return { kind: "objects", icon, count };
      const crossedOut = requiredInteger(spec.crossedOut, `${label}.crossedOut`);
      if (crossedOut < 1 || crossedOut > count) {
        throw new Error(`${label}.crossedOut must be in [1, ${count}] (within count)`);
      }
      return { kind: "objects", icon, count, crossedOut };
    }
    case "shapes": {
      rejectUnknownFields(spec, SHAPES_FIELDS, label);
      if (!Array.isArray(spec.sequence) || spec.sequence.length === 0) {
        throw new Error(`${label}.sequence must be a non-empty array`);
      }
      if (spec.sequence.length > SHAPES_MAX_SEQUENCE) {
        throw new Error(
          `${label}.sequence shows ${spec.sequence.length} shapes; a frieze row shows at most ${SHAPES_MAX_SEQUENCE}`,
        );
      }
      const sequence = spec.sequence.map((value, index) =>
        requiredFigureEnum(value, SHAPES_2D, `${label}.sequence[${index}]`),
      );
      if (spec.blank === undefined) return { kind: "shapes", sequence };
      if (typeof spec.blank !== "boolean") {
        throw new Error(`${label}.blank must be a boolean`);
      }
      return { kind: "shapes", sequence, blank: spec.blank };
    }
    case "solids": {
      rejectUnknownFields(spec, SOLIDS_FIELDS, label);
      if (!Array.isArray(spec.solids) || spec.solids.length === 0) {
        throw new Error(`${label}.solids must be a non-empty array`);
      }
      if (spec.solids.length > SOLIDS_MAX_SHOWN) {
        throw new Error(
          `${label}.solids shows ${spec.solids.length} solids; at most ${SOLIDS_MAX_SHOWN} fit the figure band`,
        );
      }
      const solids = spec.solids.map((value, index) =>
        requiredFigureEnum(value, SOLIDS_3D, `${label}.solids[${index}]`),
      );
      return { kind: "solids", solids };
    }
    case "abacus": {
      rejectUnknownFields(spec, ABACUS_FIELDS, label);
      const value = requiredInteger(spec.value, `${label}.value`);
      if (value < 0 || value > ABACUS_MAX_VALUE) {
        throw new Error(
          `${label}.value must be in [0, ${ABACUS_MAX_VALUE}] (the 1:4 abacus figure reads two rods: 十位 and 个位)`,
        );
      }
      return { kind: "abacus", value };
    }
    case "measure": {
      rejectUnknownFields(spec, MEASURE_FIELDS, label);
      const object = requiredString(spec.object, `${label}.object`);
      const unit = requiredString(spec.unit, `${label}.unit`);
      const count = requiredInteger(spec.count, `${label}.count`);
      if (count < 1 || count > MEASURE_MAX_UNITS) {
        throw new Error(`${label}.count must be in [1, ${MEASURE_MAX_UNITS}]`);
      }
      return { kind: "measure", object, unit, count };
    }
    case "pictograph": {
      rejectUnknownFields(spec, PICTOGRAPH_FIELDS, label);
      if (!Array.isArray(spec.rows) || spec.rows.length < 2) {
        throw new Error(`${label}.rows must list at least 2 categories`);
      }
      if (spec.rows.length > PICTOGRAPH_MAX_ROWS) {
        throw new Error(
          `${label}.rows shows ${spec.rows.length} categories; a Standard-1 board shows at most ${PICTOGRAPH_MAX_ROWS}`,
        );
      }
      const icons = new Set<string>();
      const rows = spec.rows.map((value, index): PictographRow => {
        const row = record(value);
        const rowLabel = `${label}.rows[${index}]`;
        if (!row) throw new Error(`${rowLabel} must be an object`);
        rejectUnknownFields(row, PICTOGRAPH_ROW_FIELDS, rowLabel);
        const icon = requiredString(row.icon, `${rowLabel}.icon`);
        if (icons.has(icon)) {
          throw new Error(
            `${rowLabel}.icon repeats "${icon}" — pictograph categories must be distinct`,
          );
        }
        icons.add(icon);
        const count = requiredInteger(row.count, `${rowLabel}.count`);
        if (count < 1 || count > PICTOGRAPH_MAX_COUNT) {
          throw new Error(
            `${rowLabel}.count must be in [1, ${PICTOGRAPH_MAX_COUNT}] (one picture = one value)`,
          );
        }
        const parsed: PictographRow = {
          icon,
          label_zh: requiredString(row.label_zh, `${rowLabel}.label_zh`),
          count,
        };
        if (row.label_en !== undefined) {
          parsed.label_en = requiredString(row.label_en, `${rowLabel}.label_en`);
        }
        return parsed;
      });
      return { kind: "pictograph", rows };
    }
    default:
      throw new Error(`${label}.kind must be one of: ${FIGURE_KINDS.join(", ")}`);
  }
}

// --- the view model: figure, or a deliberate fallback ---------------------------

/**
 * What the question layout should draw for an item:
 * - "figure": an authored spec — draw it (every spec kind has a renderer).
 * - "prose-fallback": the item declares a `figure:*` presentation but
 *   carries no spec, or names a presentation with no renderer yet (e.g.
 *   figure:pictograph) — the layout renders the bilingual prose card with
 *   the world's sprites behind it. Deliberate by construction: never a
 *   blank panel, never a half-drawn figure.
 * - "prose": plain / picture / story / legacy content — prose as always.
 */
export type FigureViewModel =
  | { mode: "figure"; spec: FigureSpec }
  | { mode: "prose-fallback"; presentation: string }
  | { mode: "prose" };

export function resolveFigureView(q: Question): FigureViewModel {
  // The trust boundary guarantees figure.kind matches presentation, so an
  // authored spec is always renderable here.
  if (q.figure !== undefined) return { mode: "figure", spec: q.figure };
  const presentation = q.presentation;
  if (presentation !== undefined && presentation.startsWith("figure:")) {
    return { mode: "prose-fallback", presentation };
  }
  return { mode: "prose" };
}

// --- pure figure math (the Cocos renderer stays a thin painter) -----------------

/**
 * Clock hand angles in degrees, 0° = twelve o'clock, clockwise. The hour
 * hand travels with the minutes — at 3:30 it points halfway between 3 and
 * 4 — the curriculum-authentic behavior the `clock-hand-swap` distractor
 * probes.
 */
export function clockHandAngles(
  hour: number,
  minute: number,
): { hourDeg: number; minuteDeg: number } {
  return { hourDeg: ((hour % 12) + minute / 60) * 30, minuteDeg: minute * 6 };
}

/** Ten-frame fill split into frames of ten, full frames first: 13 → [10, 3],
 * 10 → [10], 0 → [0] (one empty frame). */
export function tenFrameFrames(filled: number): number[] {
  const frames: number[] = [];
  let rest = filled;
  while (rest > 10) {
    frames.push(10);
    rest -= 10;
  }
  frames.push(rest);
  return frames;
}

/** Total of a coins figure in sen (validated ≤ COINS_MAX_TOTAL_SEN). */
export function coinsTotalSen(coins: readonly number[]): number {
  return coins.reduce((total, coin) => total + coin, 0);
}

/** Per-rod digits of an abacus value, high rod first: 7 → [0, 7],
 * 40 → [4, 0]. The renderer labels the rods 十位 / 个位. */
export function abacusDigits(value: number): [number, number] {
  return [Math.floor(value / 10), value % 10];
}

/** Bead engagement for one 1:4 rod showing `digit` (0..9): the heaven bead
 * (worth 5) is engaged at 5+, and `digit % 5` of the four earth beads are
 * engaged. Engaged beads are drawn touching the beam; the rest park at the
 * frame edge. */
export function abacusBeads(digit: number): { heaven: boolean; earth: number } {
  return { heaven: digit >= 5, earth: digit % 5 };
}
