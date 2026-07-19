// Player progression: the player, not each pet, owns a permanent level and
// totalXp on an approved variable curve (locked decision, meadow-isle.md
// "Progression, collection, and reward contract").
//
// M1.5 (this module + save-v2 + save-migrate) ships the curve and seeds the
// player's level/totalXp from the legacy creature-owned progression. M2A
// (issue #7) switched live battle XP-awarding from creatures to the player:
// battles accrue per-question XP (battle-rules.ts playerXpForTurn) and apply
// it through awardPlayerXp below. See save-v2.ts `PlayerProgress`.

// --- Variable player-level curve (approved 2026-07-19, M1.5) ---
//
// XP required to advance from level L to L+1 grows linearly with L, so the
// first few levels feel quick and later ones earn their weight:
//   requirement(1→2) = 20          (matches the legacy flat 20 XP/level at L1)
//   requirement(L→L+1) = 20 + 10*(L-1)   for L ≥ 1
// Cumulative totalXp to REACH a level (totalXpForLevel):
//   L1=0, L2=20, L3=50, L4=90, L5=140, L6=200, L7=280, …
export const PLAYER_LEVEL_FLOOR = 1;
export const PLAYER_XP_BASE = 20; // requirement to clear level 1 (→ level 2)
export const PLAYER_XP_GROWTH = 10; // extra XP added per level above 1

// The legacy creature curve was flat at 20 XP per level (creature.ts
// XP_PER_LEVEL). Migration folds a creature's whole level + fractional
// progress into the player curve; this constant is the source of the fraction.
export const LEGACY_XP_PER_LEVEL = 20;

/** XP required to advance FROM `level` to `level + 1`. */
export function playerXpRequirement(level: number): number {
  if (!Number.isInteger(level) || level < PLAYER_LEVEL_FLOOR) {
    throw new Error(`playerXpRequirement: invalid level ${level}`);
  }
  return PLAYER_XP_BASE + PLAYER_XP_GROWTH * (level - 1);
}

/** Total XP a player must have earned to HAVE reached `level` (level 1 → 0). */
export function totalXpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < PLAYER_LEVEL_FLOOR) {
    throw new Error(`totalXpForLevel: invalid level ${level}`);
  }
  const n = level - 1; // levels cleared
  return PLAYER_XP_BASE * n + (PLAYER_XP_GROWTH * n * (n - 1)) / 2;
}

export interface PlayerLevelInfo {
  level: number;
  /** XP earned toward the NEXT level (0 … span-1). */
  intoLevel: number;
  /** XP the current level needs to advance (requirement(level)). */
  span: number;
}

/**
 * Inverse of totalXpForLevel: given a total XP total, return the resulting
 * level and how far it is into that level (for the XP bar). total=0 → level 1.
 */
export function levelForTotalXp(totalXp: number): PlayerLevelInfo {
  if (!Number.isInteger(totalXp) || totalXp < 0) {
    throw new Error(`levelForTotalXp: invalid totalXp ${totalXp}`);
  }
  let level = PLAYER_LEVEL_FLOOR;
  let remaining = totalXp;
  for (;;) {
    const span = playerXpRequirement(level);
    if (remaining < span) return { level, intoLevel: remaining, span };
    remaining -= span;
    level++;
  }
}

/**
 * Migration helper: fold a legacy creature's (level, fractional xp) into a
 * player (level, totalXp) on the variable curve, preserving BOTH the whole
 * level AND the fractional progress into the next level.
 *
 *   legacyLevel = 3, legacyXp = 10 (half of 20)
 *     → level 3, totalXp = totalXpForLevel(3) + round(0.5 * requirement(3))
 *                     = 50 + round(0.5 * 40) = 70
 */
export function legacyToPlayerProgress(
  legacyLevel: number,
  legacyXp: number,
): { level: number; totalXp: number } {
  if (!Number.isInteger(legacyLevel) || legacyLevel < PLAYER_LEVEL_FLOOR) {
    throw new Error(`legacyToPlayerProgress: invalid legacyLevel ${legacyLevel}`);
  }
  if (!Number.isInteger(legacyXp) || legacyXp < 0 || legacyXp >= LEGACY_XP_PER_LEVEL) {
    throw new Error(`legacyToPlayerProgress: invalid legacyXp ${legacyXp}`);
  }
  const fraction = legacyXp / LEGACY_XP_PER_LEVEL; // 0 ≤ fraction < 1
  const base = totalXpForLevel(legacyLevel);
  const span = playerXpRequirement(legacyLevel);
  // round() can reach `span` when the fraction rounds up at an even span;
  // clamp to span-1 so the result stays strictly inside `legacyLevel`.
  const totalXp = Math.min(base + Math.round(fraction * span), base + span - 1);
  return { level: legacyLevel, totalXp };
}

/**
 * The result of awarding player XP: the new progress pair plus the before/
 * after level info (for the result panel's progress bar) and how many levels
 * were gained (for the level-up celebration).
 */
export interface PlayerXpAward {
  level: number;
  totalXp: number;
  before: PlayerLevelInfo;
  after: PlayerLevelInfo;
  levelsGained: number;
}

/**
 * Award earned XP to the player and derive the new level from the total.
 * This is the ONLY mutation path for live player progression (M2A): the
 * battle tallies per-question XP (battle-rules.ts playerXpForTurn), then
 * applies the tally once here — so the number the result panel shows IS the
 * number the save records, and the level always agrees with totalXp (the
 * invariant save-v2-validate enforces). Throws on a negative/non-integer
 * gain or a progress pair that already disagrees with the curve.
 */
export function awardPlayerXp(
  player: { level: number; totalXp: number },
  gain: number,
): PlayerXpAward {
  if (!Number.isInteger(gain) || gain < 0) {
    throw new Error(`awardPlayerXp: invalid gain ${gain}`);
  }
  const before = levelForTotalXp(player.totalXp);
  if (before.level !== player.level) {
    throw new Error(
      `awardPlayerXp: level ${player.level} disagrees with totalXp ${player.totalXp} (curve says ${before.level})`,
    );
  }
  const totalXp = player.totalXp + gain;
  const after = levelForTotalXp(totalXp);
  return { level: after.level, totalXp, before, after, levelsGained: after.level - before.level };
}

/**
 * Mint a stable per-instance creature id. Used when a creature becomes owned
 * (starter mint, capture). `crypto.randomUUID` is available in Node ≥19, in
 * Cloudflare Workers, and in evergreen browsers — all pokemath runtimes. The
 * cast through `unknown` avoids depending on a specific TS `lib` (the worker
 * tsconfig has no DOM lib, so `globalThis.crypto` is not typed there).
 */
interface RandomUuidCrypto {
  randomUUID(): string;
}
export function mintCreatureId(): string {
  const crypto = (globalThis as unknown as { crypto?: RandomUuidCrypto }).crypto;
  if (!crypto) {
    throw new Error("mintCreatureId: crypto.randomUUID is unavailable in this runtime");
  }
  return crypto.randomUUID();
}
