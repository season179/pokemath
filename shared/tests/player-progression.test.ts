import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_XP_PER_LEVEL,
  PLAYER_LEVEL_FLOOR,
  PLAYER_XP_BASE,
  PLAYER_XP_GROWTH,
  legacyToPlayerProgress,
  levelForTotalXp,
  mintCreatureId,
  playerXpRequirement,
  totalXpForLevel,
} from "../player-progression.ts";

test("playerXpRequirement: grows linearly from the legacy 20 baseline", () => {
  assert.equal(playerXpRequirement(1), 20);
  assert.equal(playerXpRequirement(2), 30);
  assert.equal(playerXpRequirement(3), 40);
  assert.equal(playerXpRequirement(7), 80);
  assert.equal(playerXpRequirement(1), PLAYER_XP_BASE);
  assert.equal(playerXpRequirement(5), PLAYER_XP_BASE + PLAYER_XP_GROWTH * 4);
});

test("playerXpRequirement rejects non-positive / non-integer levels", () => {
  for (const bad of [0, -1, 1.5, NaN, "3", null]) {
    // @ts-expect-error — deliberately invalid inputs
    assert.throws(() => playerXpRequirement(bad));
  }
});

test("totalXpForLevel is the cumulative sum of requirements and starts at 0", () => {
  assert.equal(totalXpForLevel(1), 0);
  assert.equal(totalXpForLevel(2), 20);
  assert.equal(totalXpForLevel(3), 50); // 20 + 30
  assert.equal(totalXpForLevel(4), 90); // + 40
  assert.equal(totalXpForLevel(5), 140); // + 50
  assert.equal(totalXpForLevel(6), 200); // + 60
  // matches the closed form 20n + 5n(n-1) where n = level-1
  for (const level of [1, 2, 5, 10, 25]) {
    const n = level - 1;
    assert.equal(totalXpForLevel(level), PLAYER_XP_BASE * n + (PLAYER_XP_GROWTH * n * (n - 1)) / 2);
  }
});

test("levelForTotalXp is the inverse of totalXpForLevel", () => {
  assert.deepEqual(levelForTotalXp(0), { level: 1, intoLevel: 0, span: 20 });
  assert.deepEqual(levelForTotalXp(19), { level: 1, intoLevel: 19, span: 20 });
  assert.deepEqual(levelForTotalXp(20), { level: 2, intoLevel: 0, span: 30 });
  assert.deepEqual(levelForTotalXp(49), { level: 2, intoLevel: 29, span: 30 });
  assert.deepEqual(levelForTotalXp(50), { level: 3, intoLevel: 0, span: 40 });
  assert.deepEqual(levelForTotalXp(99), { level: 4, intoLevel: 9, span: 50 }); // 99 crosses the L3→L4 boundary at 90
  // round-trip across the curve
  for (const totalXp of [0, 1, 20, 50, 169, 260, 1000, 9999]) {
    const { level } = levelForTotalXp(totalXp);
    assert.ok(totalXpForLevel(level) <= totalXp, `${totalXp} should reach level ${level}`);
    assert.ok(totalXp < totalXpForLevel(level + 1), `${totalXp} should not reach level ${level + 1}`);
  }
});

test("levelForTotalXp rejects negative / non-integer totals", () => {
  for (const bad of [-1, 1.5, NaN]) {
    assert.throws(() => levelForTotalXp(bad));
  }
});

test("legacyToPlayerProgress preserves the whole level and fractional progress", () => {
  // level 3 with half progress: 50 (base for L3) + round(0.5 * 40) = 70
  assert.deepEqual(legacyToPlayerProgress(3, 10), { level: 3, totalXp: 70 });
  // no fractional progress maps cleanly onto the level boundary
  assert.deepEqual(legacyToPlayerProgress(2, 0), { level: 2, totalXp: 20 });
  assert.deepEqual(legacyToPlayerProgress(1, 0), { level: 1, totalXp: 0 });
  // full fraction (xp just under the legacy cap) stays strictly inside the level
  const nearFull = legacyToPlayerProgress(4, LEGACY_XP_PER_LEVEL - 1);
  assert.equal(nearFull.level, 4);
  assert.ok(nearFull.totalXp < totalXpForLevel(5), "must not round up into the next level");
});

test("legacyToPlayerProgress rejects out-of-range legacy xp", () => {
  for (const bad of [-1, LEGACY_XP_PER_LEVEL, 100]) {
    assert.throws(() => legacyToPlayerProgress(2, bad));
  }
  for (const bad of [0, -1, 1.5]) {
    assert.throws(() => legacyToPlayerProgress(bad, 0));
  }
});

test("mintCreatureId returns a unique non-empty string", () => {
  const a = mintCreatureId();
  const b = mintCreatureId();
  assert.equal(typeof a, "string");
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test("PLAYER_LEVEL_FLOOR is 1", () => {
  assert.equal(PLAYER_LEVEL_FLOOR, 1);
});
