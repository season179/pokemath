import { test } from "node:test";
import assert from "node:assert/strict";

import { Creature, STARTER } from "../creature.ts";
import {
  createNewGame,
  STARTING_BAG,
  STARTING_MONEY,
  type SaveState,
} from "../save-types.ts";

test("createNewGame: starter creature, starting money and bag", () => {
  const save = createNewGame(new Date("2026-01-01T00:00:00Z"));
  assert.equal(save.version, 1);
  assert.equal(save.money, STARTING_MONEY);
  assert.deepEqual(save.bag, STARTING_BAG);
  assert.equal(save.team.activeIndex, 0);
  assert.equal(save.team.creatures.length, 1);

  const starter = save.team.creatures[0];
  assert.equal(starter.name, STARTER.name);
  assert.equal(starter.hp, STARTER.maxHp);
  assert.equal(starter.level, 1);
  assert.equal(starter.xp, 0);
  assert.equal(save.savedAt, "2026-01-01T00:00:00.000Z");
});

test("createNewGame: mutating the fresh bag doesn't touch the constant", () => {
  const save = createNewGame();
  save.bag.ball = 99;
  assert.equal(STARTING_BAG.ball, 3);
});

test("a SaveState round-trips through creatures", () => {
  const save: SaveState = createNewGame();
  const creature = Creature.fromState(save.team.creatures[0]);
  creature.takeDamage(5);
  save.team.creatures[0] = creature.toState();
  assert.equal(save.team.creatures[0].hp, STARTER.maxHp - 5);
});
