import { test } from "node:test";
import assert from "node:assert/strict";

import { Creature, STARTERS, isStarterId } from "../creature.ts";
import {
  createNewGame,
  STARTING_BAG,
  STARTING_MONEY,
  type SaveState,
} from "../save-types.ts";
import { validateSaveState } from "../save-validate.ts";

test("createNewGame: chosen starter, starting money and bag", () => {
  const save = createNewGame(STARTERS[0], new Date("2026-01-01T00:00:00Z"));
  assert.equal(save.version, 1);
  assert.equal(save.money, STARTING_MONEY);
  assert.deepEqual(save.bag, STARTING_BAG);
  assert.equal(save.team.activeIndex, 0);
  assert.equal(save.team.creatures.length, 1);

  const starter = save.team.creatures[0];
  assert.equal(starter.name, STARTERS[0].name);
  assert.equal(starter.speciesId, STARTERS[0].id);
  assert.equal(starter.hp, STARTERS[0].maxHp);
  assert.equal(starter.level, 1);
  assert.equal(starter.xp, 0);
  assert.equal(save.savedAt, "2026-01-01T00:00:00.000Z");
});

test("createNewGame: every starter mints its own species and validates", () => {
  for (const species of STARTERS) {
    const save = createNewGame(species);
    assert.equal(save.team.creatures[0].speciesId, species.id);
    assert.equal(save.team.creatures[0].maxHp, species.maxHp);
    assert.ok(validateSaveState(save));
  }
});

test("isStarterId: accepts exactly the starter trio", () => {
  for (const species of STARTERS) assert.ok(isStarterId(species.id));
  assert.equal(isStarterId("woolly/fluffball"), false);
  assert.equal(isStarterId(""), false);
  assert.equal(isStarterId(null), false);
  assert.equal(isStarterId(42), false);
});

test("createNewGame: mutating the fresh bag doesn't touch the constant", () => {
  const save = createNewGame(STARTERS[0]);
  save.bag.ball = 99;
  assert.equal(STARTING_BAG.ball, 3);
});

test("a SaveState round-trips through creatures", () => {
  const save: SaveState = createNewGame(STARTERS[0]);
  const creature = Creature.fromState(save.team.creatures[0]);
  creature.takeDamage(5);
  save.team.creatures[0] = creature.toState();
  assert.equal(save.team.creatures[0].hp, STARTERS[0].maxHp - 5);
  assert.equal(save.team.creatures[0].speciesId, STARTERS[0].id);
});

test("pre-speciesId creature states stay valid and round-trip without the field", () => {
  const legacy = {
    name: "Multiplybara",
    color: "#81c784",
    maxHp: 22,
    hp: 22,
    attack: 5,
    level: 1,
    xp: 0,
    boss: false,
  };
  const save = createNewGame(STARTERS[0]);
  save.team.creatures[0] = legacy;
  assert.ok(validateSaveState(save));

  const roundTripped = Creature.fromState(legacy).toState();
  assert.ok(!("speciesId" in roundTripped));
});

test("validateSaveState rejects malformed speciesId", () => {
  for (const bad of ["", 7, "x".repeat(41)]) {
    const save = createNewGame(STARTERS[0]) as unknown as {
      team: { creatures: Record<string, unknown>[] };
    };
    save.team.creatures[0].speciesId = bad;
    assert.equal(validateSaveState(save), false, `speciesId ${JSON.stringify(bad)} should fail`);
  }
});
