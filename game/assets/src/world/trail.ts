// The Cloudmane research trail (M6, #21): the authored clue hunt that
// introduces the Cloud-Maned Horse as a fair, persistent Unique — never a
// random low-probability roll (meadow-isle.md §8 + "Unique-only capture
// pressure"). Keeper Yun at the Hundred Stones starts the trail; three
// habitat-evidence spots across the island are found in a fixed order; the
// Call then brings the guardian to the stone ring for its authored battle.
//
// Persistence is the point: progress lives in save v2 `flags` (number-valued;
// missing key = not reached), and every flag only ever moves FORWARD —
// leaving the island, losing the battle, or a Unique escape erases nothing,
// and the waiting guardian IS the standing second chance. No timers, no
// streaks, no gacha, no reward currency.
//
// Scope: this module owns the trail only. Unique flee pressure and trust
// capture (#22) live in shared/battle-rules + BattleScreen and key off the
// guardian rarity. The Meadow Badge, fixed multi-topic question slate, and
// starter evolution (#23) settle on victory in GameApp via meadow-finale.ts.
// The summit battle serves the hand-checked guardian bank in fixed order
// (not a routed single-topic slice).
//
// Pure and Node-testable (type-only imports, like arc.ts): WorldScreen and
// GameApp only render and route it; game/tests/trail.test.ts pins the logic.

import type { ArcCritter } from "./arc";

// --- flag keys ---------------------------------------------------------------

/** Keeper Yun's request accepted — the trail is active. */
export const FLAG_TRAIL_STARTED = "trail.cloudmane.started";
/** The Call performed — the guardian waits in the Hundred Stones ring. */
export const FLAG_TRAIL_SUMMONED = "trail.cloudmane.summoned";
/** One flag per evidence spot, in trail order (1..3). */
export function trailClueFlag(n: number): string {
  return `trail.cloudmane.clue.${n}`;
}

// --- the authored clue sequence ------------------------------------------------

export interface TrailClue {
  /** 1-based position in the fixed sequence. */
  readonly n: number;
  readonly regionId: string;
  /** Center tile of the search spot; stepping within one tile finds it. */
  readonly x: number;
  readonly y: number;
  /** Where the keeper sends the child, English short form (for dialogs). */
  readonly placeEn: string;
  /** Same, Chinese short form. */
  readonly placeZh: string;
  /** Bilingual evidence text shown on discovery (world notice). */
  readonly found: string;
}

// Fixed order, each clue building the legend: it FLIES (the mane-hair on the
// island's highest point) → it WALKS AMONG US gently (hoofprints, apples
// untouched) → it PLAYS where patterns live (the spiral dance). Tiles are
// walkable `.`/`f`/`p` spots pinned by game/tests/trail.test.ts.
export const TRAIL_CLUES: readonly TrailClue[] = [
  {
    n: 1,
    regionId: "meadow/ticktock",
    x: 14,
    y: 7,
    placeEn: "the rise under the clock post on Ticktock Knoll",
    placeZh: "滴答山丘钟塔下的山坡",
    found:
      "Evidence 1/3: a long silver-white mane-hair, soft as cloud, caught on the clock post! " +
      "线索 1/3：一根银白色的长鬃毛，像云一样软，挂在钟塔上！",
  },
  {
    n: 2,
    regionId: "meadow/orchard",
    x: 6,
    y: 18,
    placeEn: "the fruit stand in Appledore Orchard",
    placeZh: "苹果园的水果摊旁",
    found:
      "Evidence 2/3: four round hoofprints by the fruit stand — and not one fallen apple touched! " +
      "线索 2/3：水果摊旁有四个圆圆的蹄印——掉落的苹果一个也没碰！",
  },
  {
    n: 3,
    regionId: "meadow/gardens",
    x: 6,
    y: 4,
    placeEn: "the spiral flowerbed in Pattern Gardens",
    placeZh: "图案花园的螺旋花坛",
    found:
      "Evidence 3/3: the petals swirl in a perfect spiral — a little whirlwind danced here all night! " +
      "线索 3/3：花瓣排成完美的螺旋——小旋风在这里跳了一整夜的舞！",
  },
];

// --- the guardian at the summit --------------------------------------------------

export const GUARDIAN_SPECIES_ID = "meadow/cloudmane";
/** Where the summoned Cloudmane waits: the path at the heart of the ring. */
export const GUARDIAN_SPOT = { x: 13, y: 6 } as const;
export const CLOUDMANE_CRITTER_ID = "cloudmane-summit";

/**
 * Load key for the fixed multi-topic guardian slate. Not a curriculum topic
 * (QUESTION_TOPICS) — GameApp loads GUARDIAN_BANK_PATH directly because the
 * bank deliberately mixes 4.1 / 4.2 / 4.3 / 4.4 / 4.7 and cannot route through
 * the single-topic manifest.
 */
export const GUARDIAN_TOPIC = "guardian";
/** Cocos resources path (no extension) of the hand-checked guardian bank. */
export const GUARDIAN_BANK_PATH = "question-banks/std1/std1.meadow-guardian.v1";

/**
 * The summoned guardian, visible in its region. It stays put through every
 * battle outcome — flee, defeat, even victory — so a second (third, tenth)
 * chance is always standing in the ring — even after a Unique escape (#22)
 * or a victory. Badge/evolution payoffs (#23) are idempotent on re-battle.
 */
export function trailCrittersFor(regionId: string, flags: Record<string, number>): ArcCritter[] {
  if (regionId !== "meadow/stones" || !flags[FLAG_TRAIL_SUMMONED]) return [];
  return [
    {
      id: CLOUDMANE_CRITTER_ID,
      ...GUARDIAN_SPOT,
      speciesId: GUARDIAN_SPECIES_ID,
      topic: GUARDIAN_TOPIC,
      kind: "battle",
      capturable: false,
    },
  ];
}

/** Topics with visible trail battles right now (mirrors arcBattleTopicsFor). */
export function trailBattleTopicsFor(regionId: string, flags: Record<string, number>): string[] {
  // Array-only dedup — the Cocos bundler corrupts Set/Map spreads (see
  // shared/tests/bundler-safe.test.ts).
  const topics: string[] = [];
  for (const critter of trailCrittersFor(regionId, flags)) {
    if (critter.kind === "battle" && !topics.includes(critter.topic)) topics.push(critter.topic);
  }
  return topics;
}

// --- progress (pure reads over the flag record) --------------------------------

/** Evidence found so far (0..3). Flags only ever move forward. */
export function trailCluesFound(flags: Record<string, number>): number {
  let found = 0;
  for (const clue of TRAIL_CLUES) {
    if (flags[trailClueFlag(clue.n)]) found++;
  }
  return found;
}

/** True once every evidence spot is recorded. */
export function trailReadyToCall(flags: Record<string, number>): boolean {
  return trailCluesFound(flags) === TRAIL_CLUES.length;
}

/**
 * The next opportunity, in the fixed authored order: the first unfound clue
 * once the trail is active. Null before accepting Yun's request (the spots
 * stay inert and invisible) and once the proof is complete.
 */
export function nextTrailClue(flags: Record<string, number>): TrailClue | null {
  if (!flags[FLAG_TRAIL_STARTED]) return null;
  for (const clue of TRAIL_CLUES) {
    if (!flags[trailClueFlag(clue.n)]) return clue;
  }
  return null;
}

/**
 * The clue discovered by standing at (x, y) — the active clue's search spot,
 * one tile of grace in every direction so a child searching the named place
 * always finds it. Out-of-order spots stay inert: the keeper's directions
 * (and the Field Guide line) always name exactly one next place.
 */
export function trailClueAt(
  regionId: string,
  x: number,
  y: number,
  flags: Record<string, number>,
): TrailClue | null {
  const next = nextTrailClue(flags);
  if (!next || next.regionId !== regionId) return null;
  if (Math.abs(x - next.x) > 1 || Math.abs(y - next.y) > 1) return null;
  return next;
}

// --- Keeper Yun's dialog ---------------------------------------------------------

export type YunDialog =
  | { kind: "offer"; message: string }
  | { kind: "seek"; message: string }
  | { kind: "ready"; message: string }
  | { kind: "summoned"; message: string };

export const YUN_OFFER =
  "They say a Cloud-Maned Horse once pawed these very stones, and a hundred stones lit up like stars. " +
  "It still visits our island — I have seen its signs! Will you help me find proof? " +
  "传说有一匹天马曾踏过这些石头，百石齐亮，像星星一样。它还会来我们岛——我见过它留下的痕迹！帮我一起寻找证据，好吗？";

/** Shown when the child accepts: the first direction, loud and clear. */
export const TRAIL_ACCEPTED =
  "Wonderful, little researcher! Start where the wind is strongest: the rise under the clock post on Ticktock Knoll. " +
  "太好了，小研究员！从风最大的地方开始：滴答山丘钟塔下的山坡。";

export const YUN_READY =
  "The proof is complete — a cloud-maned friend walks the old stones even now! " +
  "Stand with me and call it, gently, by name. 证据集齐了——云鬃朋友此刻就在古石阵间散步！和我一起，轻轻地唤它的名字。";

/** Shown when the Call lands: the payoff beat — the guardian appears. */
export const TRAIL_CALLED =
  "The stones glow… hoofbeats on the wind! The Cloudmane waits among the Hundred Stones. " +
  "石头亮了……风中传来马蹄声！天马就在百石阵中等你。";

export const YUN_SUMMONED =
  "It waits for you among the stones. Walk up gently. And if it ever flies away, don't worry — " +
  "it knows your kindness now, and it always returns to this ring. " +
  "它在石阵中等你，轻轻走过去。就算它飞走了也别担心——它认得你了，总会回到这个石阵。";

function yunSeekMessage(found: number, next: TrailClue): string {
  return (
    `Evidence ${found} of ${TRAIL_CLUES.length} so far — every piece brings it closer! ` +
    `Next, search ${next.placeEn}. 线索 ${found}/${TRAIL_CLUES.length}——每一片证据都让它更近了！` +
    `下一站：${next.placeZh}。`
  );
}

export function yunDialogFor(flags: Record<string, number>): YunDialog {
  if (!flags[FLAG_TRAIL_STARTED]) return { kind: "offer", message: YUN_OFFER };
  if (flags[FLAG_TRAIL_SUMMONED]) return { kind: "summoned", message: YUN_SUMMONED };
  const next = nextTrailClue(flags);
  if (!next) return { kind: "ready", message: YUN_READY };
  return { kind: "seek", message: yunSeekMessage(trailCluesFound(flags), next) };
}

// --- Field Guide telegraphing ------------------------------------------------------

/**
 * The guardian's Field Guide detail line: even as an unknown silhouette the
 * guide always says where the hunt stands and what the next opportunity is.
 * `met` is the guide's own seen/caught state — once met, the line is a
 * memory, not a pointer.
 */
export function trailGuideLine(flags: Record<string, number>, met: boolean): string {
  if (met) {
    return "Met among the Hundred Stones — it watches you kindly. 在百石原见过——它温柔地看着你。";
  }
  if (!flags[FLAG_TRAIL_STARTED]) {
    return "??? — A legend sleeps at the Hundred Stones; ask the keeper there! 传说沉睡在百石原——去问问守石人！";
  }
  if (flags[FLAG_TRAIL_SUMMONED]) {
    return "??? — It waits among the Hundred Stones! 天马就在百石原等你！";
  }
  const next = nextTrailClue(flags);
  if (!next) {
    return "??? — The proof is complete! Ask Keeper Yun to call it. 证据集齐了——请守石人召唤它！";
  }
  return (
    `??? — Research ${trailCluesFound(flags)}/${TRAIL_CLUES.length}. Next: ${next.placeEn}. ` +
    `研究 ${trailCluesFound(flags)}/${TRAIL_CLUES.length}——下一站：${next.placeZh}。`
  );
}
