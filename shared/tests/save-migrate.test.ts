import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Creature,
  STARTERS,
  WOOLLY_FLUFFBALL,
  WOOLLY_HARE,
  WOOLLY_RAM,
  type CreatureState,
  type Species,
} from "../creature.ts";
import { createNewGame, type SaveState } from "../save-types.ts";
import { validateSaveState } from "../save-validate.ts";
import { legacyToPlayerProgress, totalXpForLevel } from "../player-progression.ts";
import { createNewGameV2, type OwnedCreatureState } from "../save-v2.ts";
import { validateSaveV2 } from "../save-v2-validate.ts";
import { migrateSave, normalizeSave, SaveMigrationError } from "../save-migrate.ts";

// Deterministic id mint so migrated creatureIds are predictable in assertions.
function counterMint(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

// --- Realistic v1 fixtures (built the way the Woolly preview produced them) ---

function freshV1(): SaveState {
  return createNewGame(STARTERS[0], new Date("2026-07-18T12:00:00Z"));
}

// A child has played 2-3 Woolly battles: starter levelled up twice with some
// leftover XP, caught a Fluffball, spent a ball, earned some money.
function previewProgressV1(): SaveState {
  const save = freshV1();
  const starter = Creature.fromState(save.team.creatures[0]);
  // Two level-ups (40 XP) + 7 leftover XP into the next level.
  starter.awardXp(47);
  save.team.creatures[0] = starter.toState();

  const fluffball = Creature.fromSpecies(WOOLLY_FLUFFBALL);
  fluffball.takeDamage(8); // weakened before the catch
  fluffball.capture();
  save.team.creatures.push(fluffball.toState());

  save.team.activeIndex = 0;
  save.money += 65;
  save.bag = { potion: 0, ball: 1 };
  save.savedAt = "2026-07-19T09:30:00Z";
  assert.ok(validateSaveState(save), "fixture must be a valid v1 save");
  return save;
}

// Mid-game: a full six-member team at mixed levels. The highest level (5, on
// the starter) plus its fractional XP must seed the player progression.
function midGameV1(): SaveState {
  const save = freshV1();
  const starter = Creature.fromState(save.team.creatures[0]);
  starter.awardXp(82); // 4 level-ups (80 XP) + 2 leftover
  save.team.creatures[0] = starter.toState();
  for (const species of [WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM, WOOLLY_FLUFFBALL, WOOLLY_HARE]) {
    addCaught(save, species);
  }
  // Active selection is NOT the starter — preservation must keep the choice.
  save.team.activeIndex = 3;
  save.money = 540;
  save.bag = { potion: 2, ball: 4 };
  save.savedAt = "2026-07-19T18:00:00Z";
  assert.equal(save.team.creatures.length, 6);
  assert.ok(validateSaveState(save));
  return save;
}

function addCaught(save: SaveState, species: Species): void {
  const wild = Creature.fromSpecies(species);
  wild.takeDamage(5);
  wild.capture();
  save.team.creatures.push(wild.toState());
}

// --- migrateSave: fresh save ---

test("migrateSave: a fresh v1 save becomes a valid v2 save", () => {
  const v2 = migrateSave(freshV1(), { mintId: counterMint("c") });
  assert.equal(v2.version, 2);
  assert.equal(v2.money, 200);
  assert.deepEqual(v2.bag, { potion: 1, ball: 3 });
  assert.equal(v2.savedAt, "2026-07-18T12:00:00.000Z");
  assert.equal(v2.location, null);
  assert.equal(v2.profile, "dpk3_2026_core");
  assert.deepEqual(v2.badges, []);
  assert.ok(validateSaveV2(v2));
});

// --- migrateSave: preview-progress save loses nothing ---

test("migrateSave: preview progress preserves creatures, levels, XP, money, bag", () => {
  const v1 = previewProgressV1();
  const v2 = migrateSave(v1, { mintId: counterMint("c") });

  assert.equal(v2.ownedCreatures.length, v1.team.creatures.length, "no creature lost");
  assert.equal(v2.money, v1.money, "money preserved");
  assert.deepEqual(v2.bag, v1.bag, "bag preserved");

  // Each creature's battle state is carried byte-for-byte.
  for (let i = 0; i < v1.team.creatures.length; i++) {
    const before = v1.team.creatures[i];
    const after = v2.ownedCreatures[i];
    assert.equal(after.name, before.name);
    assert.equal(after.color, before.color);
    assert.equal(after.maxHp, before.maxHp);
    assert.equal(after.hp, before.hp);
    assert.equal(after.attack, before.attack);
    assert.equal(after.level, before.level);
    assert.equal(after.xp, before.xp);
    assert.equal(after.boss, before.boss);
    assert.equal(after.speciesId, before.speciesId);
  }

  // The active-party selection is preserved: teamIds in team order, and the
  // active creature resolves to the same v1 activeIndex.
  assert.equal(v2.teamIds.length, v1.team.creatures.length);
  assert.equal(v2.activeTeamId, v2.teamIds[v1.team.activeIndex]);
  assert.ok(validateSaveV2(v2));
});

test("migrateSave: starter identity is creatures[0] and starterCreatureId points at it", () => {
  const v2 = migrateSave(previewProgressV1(), { mintId: counterMint("c") });
  assert.equal(v2.starterCreatureId, v2.ownedCreatures[0].creatureId);
  assert.equal(v2.ownedCreatures[0].speciesId, STARTERS[0].id);
});

// --- migrateSave: player progression seed (criterion 3) ---

test("migrateSave: player progression seeds from the highest creature level + fraction", () => {
  const v1 = midGameV1();
  const highest = v1.team.creatures.reduce((best, c) =>
    c.level > best.level || (c.level === best.level && c.xp > best.xp) ? c : best,
  );
  const expected = legacyToPlayerProgress(highest.level, Math.min(highest.xp, 19));

  const v2 = migrateSave(v1, { mintId: counterMint("c") });
  assert.deepEqual(v2.player, expected);
  // Sanity: the starter is the level-5 creature here, so the seed reaches L5.
  assert.equal(v2.player.level, 5);
  assert.ok(v2.player.totalXp >= totalXpForLevel(5));
  assert.ok(v2.player.totalXp < totalXpForLevel(6));
});

test("migrateSave: a fractional-XP fixture maps onto the variable curve exactly", () => {
  // Hand-built save: one creature at level 3 with xp 10 (half of the legacy 20).
  const half: CreatureState = {
    name: "Cloudhorn",
    color: "#aec6e8",
    maxHp: 28,
    hp: 28,
    attack: 6,
    level: 3,
    xp: 10,
    boss: false,
    speciesId: "cloudhorn",
  };
  const v1: SaveState = {
    version: 1,
    team: { creatures: [half], activeIndex: 0 },
    money: 0,
    bag: { potion: 0, ball: 0 },
    savedAt: "2026-07-19T00:00:00.000Z",
  };
  const v2 = migrateSave(v1);
  assert.deepEqual(v2.player, legacyToPlayerProgress(3, 10));
});

// --- migrateSave: creatures gain stable identity (criterion 4) ---

test("migrateSave: every creature gains a unique creatureId, semantic speciesId, stage, variant", () => {
  const v2 = migrateSave(midGameV1(), { mintId: counterMint("c") });
  const ids = v2.ownedCreatures.map((c) => c.creatureId);
  assert.equal(new Set(ids).size, ids.length, "creatureIds are unique");
  for (const c of v2.ownedCreatures) {
    assert.ok(c.speciesId.length > 0, "semantic speciesId present");
    assert.equal(c.stage, 1);
    assert.equal(c.variant, "normal");
  }
  assert.deepEqual(v2.teamIds, ids, "teamIds list every owned creature, in team order");
  assert.ok(v2.teamIds.length <= 6, "teamIds capped at six");
  assert.ok(validateSaveV2(v2));
});

// --- migrateSave: unknown fields dropped (criterion 1) ---

test("migrateSave: unknown fields on a v1 save are dropped, not carried into v2", () => {
  const v1 = previewProgressV1() as unknown as Record<string, unknown>;
  (v1 as Record<string, unknown>).suspiciousExtra = "malware";
  (v1.team as Record<string, unknown>).leak = 42;
  const v2 = migrateSave(v1);
  assert.equal((v2 as unknown as Record<string, unknown>).suspiciousExtra, undefined);
  assert.ok(validateSaveV2(v2));
});

// --- migrateSave: round-trip + boot (criterion 7) ---

test("migrateSave: fresh, preview, and mid-game fixtures round-trip and re-validate (boot)", () => {
  for (const v1 of [freshV1(), previewProgressV1(), midGameV1()]) {
    const v2 = migrateSave(v1, { mintId: counterMint("c") });
    const json = JSON.stringify(v2);
    const reloaded = JSON.parse(json) as unknown;
    assert.ok(validateSaveV2(reloaded), "round-tripped save must re-validate (boot)");
    assert.deepEqual(reloaded, v2, "byte-identical round-trip");
  }
});

test("migrateSave: a v1 save migrated twice (via normalize) is stable", () => {
  const v2a = migrateSave(previewProgressV1(), { mintId: counterMint("c") });
  const v2b = normalizeSave(v2a);
  assert.deepEqual(v2b, v2a);
});

// --- migrateSave: corrupt + future saves fail cleanly (criterion 7) ---

test("migrateSave: corrupt saves fail with SaveMigrationError", () => {
  const cases: Array<{ name: string; value: unknown }> = [
    { name: "null", value: null },
    { name: "string", value: "not a save" },
    { name: "empty object", value: {} },
    { name: "missing team", value: { version: 1, money: 0, bag: { potion: 0, ball: 0 }, savedAt: "x" } },
    { name: "empty team", value: { version: 1, team: { creatures: [], activeIndex: 0 }, money: 0, bag: { potion: 0, ball: 0 }, savedAt: "2026-01-01T00:00:00Z" } },
    { name: "bad money", value: { version: 1, team: { creatures: [{ name: "x", color: "#fff", maxHp: 5, hp: 5, attack: 1, level: 1, xp: 0, boss: false }], activeIndex: 0 }, money: -5, bag: { potion: 0, ball: 0 }, savedAt: "2026-01-01T00:00:00Z" } },
    { name: "bad savedAt", value: { version: 1, team: { creatures: [{ name: "x", color: "#fff", maxHp: 5, hp: 5, attack: 1, level: 1, xp: 0, boss: false }], activeIndex: 0 }, money: 0, bag: { potion: 0, ball: 0 }, savedAt: "not-a-date" } },
  ];
  for (const { name, value } of cases) {
    assert.throws(() => migrateSave(value), SaveMigrationError, `${name} should fail`);
  }
});

test("migrateSave: a future-version save fails cleanly", () => {
  const future = { version: 99, ...previewProgressV1() };
  delete (future as Record<string, unknown>).version;
  (future as Record<string, unknown>).version = 99;
  assert.throws(() => migrateSave(future), SaveMigrationError);
});

test("migrateSave: an already-v2 save is refused by migrateSave (use normalizeSave)", () => {
  const v2 = createNewGameV2(STARTERS[0]);
  assert.throws(() => migrateSave(v2), SaveMigrationError);
});

// --- normalizeSave: the Worker's single read/write path ---

test("normalizeSave: passes a valid v2 through untouched", () => {
  const v2 = createNewGameV2(STARTERS[0]);
  assert.equal(normalizeSave(v2), v2);
});

test("normalizeSave: migrates a v1 save", () => {
  const v2 = normalizeSave(previewProgressV1(), { mintId: counterMint("n") });
  assert.equal(v2.version, 2);
  assert.ok(validateSaveV2(v2));
});

test("normalizeSave: rejects a v2-shaped but invalid payload", () => {
  const badV2 = { version: 2, ownedCreatures: "nope" };
  assert.throws(() => normalizeSave(badV2), SaveMigrationError);
});

test("normalizeSave: rejects garbage", () => {
  assert.throws(() => normalizeSave(null), SaveMigrationError);
  assert.throws(() => normalizeSave("nope"), SaveMigrationError);
  assert.throws(() => normalizeSave({ version: 7 }), SaveMigrationError);
});

// --- pre-speciesId legacy creature robustness ---

test("migrateSave: a pre-speciesId legacy creature gets a stable fallback speciesId", () => {
  const legacy: CreatureState = {
    name: "Multiplybara",
    color: "#81c784",
    maxHp: 22,
    hp: 22,
    attack: 5,
    level: 1,
    xp: 0,
    boss: false,
  };
  const v1: SaveState = {
    version: 1,
    team: { creatures: [legacy], activeIndex: 0 },
    money: 0,
    bag: { potion: 0, ball: 0 },
    savedAt: "2026-01-01T00:00:00Z",
  };
  const v2 = migrateSave(v1);
  const owned = v2.ownedCreatures[0] as OwnedCreatureState;
  assert.equal(owned.speciesId, "legacy:multiplybara");
  assert.ok(validateSaveV2(v2));
});
