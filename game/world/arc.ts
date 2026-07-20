// The Dockside & Woolly counting arc (M5, #17): two short, chosen intentions
// a child can finish in one healthy session, each with a visible, persistent
// payoff — meadow-isle.md §1 (Dockside tutorial) and §2 (Woolly counting
// country, the ten-pen fences). No timers, no streaks, nothing resets.
//
// Questions never come from this file: every battle beat names a curriculum
// topic and GameApp serves it from the routed, approved bank (#13). World
// state lives in save v2 `flags` (number-valued; missing key = not started),
// so a paused intention resumes exactly where the child left it.

import { MEADOW_DOCK_ANCHORS } from "./regions/meadow-dock.ts";
import { MEADOW_WOOLLY_ANCHORS } from "./regions/meadow-woolly.ts";
import type { RegionDef } from "./regions/types.ts";

// --- flag keys ---------------------------------------------------------------

/** Dockside: the stowaway mothling has been met (won or captured) — it
 * leaves the pier for good. */
export const FLAG_DOCK_MOTHLING = "arc.dock.mothling";
/** Woolly broken pen: 1 = the child promised to help, 2 = fence repaired. */
export const FLAG_WOOLLY_PEN = "arc.woolly.pen";
/** Woolly broken pen: wanderers brought home so far (0..3). */
export const FLAG_WOOLLY_PEN_FOUND = "arc.woolly.pen.found";

export const WOOLLY_PEN_WANDERERS = 3;
export const WOOLLY_PEN_REWARD_BALLS = 3;
const PEN_HELPING = 1;
const PEN_REPAIRED = 2;

/** The south-pen repair tile is authored beside the compact grid. */
export const WOOLLY_PEN_GAP = MEADOW_WOOLLY_ANCHORS.penGap;

// --- visible creatures ---------------------------------------------------------

/**
 * A wild creature standing on a world tile. "battle" critters are solid and
 * start a scripted, calm battle (ordinary capture rules — no flee clock) when
 * bumped; "decor" critters are pure scenery (the flock home in its pen).
 */
export interface ArcCritter {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly speciesId: string;
  /** Curriculum topic the scripted battle draws from (routed bank, #13). */
  readonly topic: string;
  readonly kind: "battle" | "decor";
  /**
   * Legacy opt-out kept for the trail's guardian row (#21). Unique pressure
   * itself is gated purely by species rarity in BattleScreen (#22); ordinary
   * critters omit this field.
   */
  readonly capturable?: boolean;
}

const WANDERER_SPOTS = MEADOW_WOOLLY_ANCHORS.wandererSpots;
const FLOCK_SPOTS = MEADOW_WOOLLY_ANCHORS.flockSpots;

export const DOCK_MOTHLING_ID = "dock-mothling";

/**
 * The creatures currently visible in a region, derived purely from flags so
 * a rebuilt world always agrees with the save.
 */
export function arcCrittersFor(regionId: string, flags: Record<string, number>): ArcCritter[] {
  if (regionId === "meadow/dock") {
    if (flags[FLAG_DOCK_MOTHLING]) return [];
    // The first guaranteed encounter (meadow-isle.md §1): a weak, catchable
    // mothling on the pier, right where the ferry lands. Counting within 10.
    return [
      {
        id: DOCK_MOTHLING_ID,
        ...MEADOW_DOCK_ANCHORS.mothling,
        speciesId: "meadow/mothling",
        topic: "4.1",
        kind: "battle",
      },
    ];
  }
  if (regionId === "meadow/woolly") {
    const pen = flags[FLAG_WOOLLY_PEN] ?? 0;
    if (pen === PEN_REPAIRED) {
      return FLOCK_SPOTS.map((spot, i) => ({
        id: `woolly-flock-${i}`,
        ...spot,
        speciesId: "woolly/fluffball",
        topic: "4.1",
        kind: "decor" as const,
      }));
    }
    if (pen === PEN_HELPING) {
      const found = flags[FLAG_WOOLLY_PEN_FOUND] ?? 0;
      // Rounding them up is number-bond work at the ten-pen fence — the pen
      // IS a ten-frame. The 4.1 slice serves it both today (the routed
      // Woolly bank's within-10 bonds, #6) and after the orchestrator
      // activates the meadow-counting bank (its ten-frame bond items), so
      // the intention is always finishable — never gated on a route that
      // does not exist yet (#17).
      return WANDERER_SPOTS.slice(found).map((spot, i) => ({
        id: `woolly-wanderer-${found + i}`,
        ...spot,
        speciesId: "woolly/fluffball",
        topic: "4.1",
        kind: "battle" as const,
      }));
    }
  }
  return [];
}

/** Topics with visible scripted battles in the region right now — GameApp
 * pre-loads these routed banks alongside the region's ordinary topic. */
export function arcBattleTopicsFor(regionId: string, flags: Record<string, number>): string[] {
  // Array-only dedup — the Cocos bundler corrupts Set/Map spreads (see
  // shared/tests/bundler-safe.test.ts).
  const topics: string[] = [];
  for (const critter of arcCrittersFor(regionId, flags)) {
    if (critter.kind === "battle" && !topics.includes(critter.topic)) topics.push(critter.topic);
  }
  return topics;
}

// --- region patching -----------------------------------------------------------

/**
 * Apply flag-driven world changes to a region definition (pure: returns a
 * new def, the shipped constant is never mutated). Today: the Woolly pen's
 * broken west wall is mended once the intention completes — walkability,
 * minimap, and painting all flow from the def, so one swapped character
 * closes the gap everywhere.
 */
export function patchRegionForArc(def: RegionDef, flags: Record<string, number>): RegionDef {
  if (def.id === "meadow/woolly" && (flags[FLAG_WOOLLY_PEN] ?? 0) === PEN_REPAIRED) {
    const { x, y } = WOOLLY_PEN_GAP;
    const row = def.rows[y];
    if (row[x] !== ".") return def; // geography drift guard — never corrupt a changed map
    const rows = [...def.rows];
    rows[y] = row.slice(0, x) + "X" + row.slice(x + 1);
    return { ...def, rows };
  }
  return def;
}

// --- Shepherd Fern's dialog ------------------------------------------------------

export type FernDialog =
  | { kind: "offer"; message: string }
  | { kind: "progress"; message: string }
  | { kind: "thanks"; message: string; sailTo: string; sailArrive: string };

export const FERN_OFFER =
  "Oh no — the pen fence broke, and three little fluffballs wandered into the tall grass south of here! " +
  "Will you help me bring them home? 哎呀——羊圈的栅栏破了，三只小毛球跑进了南边的草丛！帮我找它们回家，好吗？";

export const FERN_ACCEPTED =
  "Thank you! They're hiding in the tall grass south of the pen — walk up to one and be gentle. " +
  "谢谢你！它们躲在羊圈南边的草丛里——走过去，轻轻叫它们。";

export const FERN_THANKS =
  "The pen is mended and my flock is home, all thanks to you, little shepherd! " +
  "Want me to walk you up to Ticktock Knoll? 羊圈修好了，羊群也回家了，谢谢你，小牧童！要我带你走去滴答山丘吗？";

export function fernProgressMessage(found: number): string {
  const left = WOOLLY_PEN_WANDERERS - found;
  return (
    `You've found ${found} of ${WOOLLY_PEN_WANDERERS} — ${left} more ${left === 1 ? "is" : "are"} still hiding in the tall grass. ` +
    `已经找回 ${found} 只，还有 ${left} 只躲在草丛里。`
  );
}

export function fernDialogFor(flags: Record<string, number>): FernDialog {
  const pen = flags[FLAG_WOOLLY_PEN] ?? 0;
  if (pen === PEN_REPAIRED) {
    // The payoff shortcut: a grateful shepherd walks you up the hill (a
    // convenience edge like the Meadow Guides — never required).
    return { kind: "thanks", message: FERN_THANKS, sailTo: "meadow/ticktock", sailArrive: "west" };
  }
  if (pen === PEN_HELPING) {
    return { kind: "progress", message: fernProgressMessage(flags[FLAG_WOOLLY_PEN_FOUND] ?? 0) };
  }
  return { kind: "offer", message: FERN_OFFER };
}

/** Shown when the third wanderer settles and the pen repairs. */
export const PEN_REPAIRED_NOTICE =
  "The pen is mended — the fluffballs are home! Fern gave you 3 capture balls. " +
  "羊圈修好了，毛球们回家了！阿蕨送你 3 个精灵球。";

// --- battle settlement -----------------------------------------------------------

export type ArcBattleOutcome = "won" | "captured" | "fled" | "escaped" | "defeated";

export interface ArcSettlement {
  /** The next flag record (apply every entry, then checkpoint). */
  readonly flags: Record<string, number>;
  /** True when this settle repaired the pen — the payoff beat. */
  readonly penRepaired: boolean;
}

/**
 * Fold one scripted battle's outcome into the flag record. Only a win or a
 * capture settles a beat (rounding up is gentle: fleeing leaves the wanderer
 * grazing, defeat just sends you home to rest). Returns null when nothing
 * changed.
 */
export function settleArcBattle(
  flags: Record<string, number>,
  critterId: string,
  outcome: ArcBattleOutcome,
): ArcSettlement | null {
  if (outcome !== "won" && outcome !== "captured") return null;
  if (critterId === DOCK_MOTHLING_ID) {
    if (flags[FLAG_DOCK_MOTHLING]) return null;
    return { flags: { [FLAG_DOCK_MOTHLING]: 1 }, penRepaired: false };
  }
  if (critterId.startsWith("woolly-wanderer-") && (flags[FLAG_WOOLLY_PEN] ?? 0) === PEN_HELPING) {
    const found = (flags[FLAG_WOOLLY_PEN_FOUND] ?? 0) + 1;
    const penRepaired = found >= WOOLLY_PEN_WANDERERS;
    return {
      flags: {
        [FLAG_WOOLLY_PEN_FOUND]: found,
        ...(penRepaired ? { [FLAG_WOOLLY_PEN]: PEN_REPAIRED } : {}),
      },
      penRepaired,
    };
  }
  return null;
}
