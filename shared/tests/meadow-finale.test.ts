// Meadow finale (#23): Meadow Badge once + starter evolution always.

import { test } from "node:test";
import assert from "node:assert/strict";

import { artRefForStage, STARTERS, SPECIES_BY_ID } from "../creature.ts";
import {
  MEADOW_BADGE,
  MEADOW_STARTER_EVOLUTION_STAGE,
  awardMeadowFinale,
} from "../meadow-finale.ts";
import { createNewGameV2 } from "../save-v2.ts";

test("awardMeadowFinale: first victory awards the badge and evolves the starter", () => {
  const save = createNewGameV2(STARTERS[0]);
  const starter = save.ownedCreatures.find((c) => c.creatureId === save.starterCreatureId)!;
  assert.equal(starter.stage, 1);
  assert.equal(save.badges.includes(MEADOW_BADGE), false);

  const result = awardMeadowFinale(save);
  assert.equal(result.badgeAwarded, true);
  assert.equal(result.evolvedName, starter.name);
  assert.ok(result.save.badges.includes(MEADOW_BADGE));
  const evolved = result.save.ownedCreatures.find((c) => c.creatureId === save.starterCreatureId)!;
  assert.equal(evolved.stage, MEADOW_STARTER_EVOLUTION_STAGE);
  // Input is never mutated.
  assert.equal(save.badges.includes(MEADOW_BADGE), false);
  assert.equal(starter.stage, 1);
});

test("awardMeadowFinale: starter evolves whether active or stored", () => {
  const save = createNewGameV2(STARTERS[1]); // lumentail
  // Capture a second friend onto the team, then leave the starter in storage.
  const friendId = "friend-1";
  const withFriend = {
    ...save,
    ownedCreatures: [
      ...save.ownedCreatures,
      {
        creatureId: friendId,
        speciesId: "woolly/fluffball",
        stage: 1,
        variant: "normal",
        name: "Fluffball",
        color: "#ede0c8",
        maxHp: 13,
        hp: 13,
        attack: 2,
        level: 1,
        xp: 0,
        boss: false,
      },
    ],
    teamIds: [friendId],
    activeTeamId: friendId,
  };
  assert.equal(withFriend.teamIds.includes(withFriend.starterCreatureId), false);

  const result = awardMeadowFinale(withFriend);
  assert.equal(result.badgeAwarded, true);
  assert.equal(result.evolvedName, STARTERS[1].name);
  const starter = result.save.ownedCreatures.find(
    (c) => c.creatureId === withFriend.starterCreatureId,
  )!;
  assert.equal(starter.stage, MEADOW_STARTER_EVOLUTION_STAGE);
  // Team composition is untouched — evolution is identity, not team state.
  assert.deepEqual(result.save.teamIds, [friendId]);
  assert.equal(result.save.activeTeamId, friendId);
});

test("awardMeadowFinale: second victory is a pure no-op", () => {
  const once = awardMeadowFinale(createNewGameV2(STARTERS[2]));
  const twice = awardMeadowFinale(once.save);
  assert.equal(twice.badgeAwarded, false);
  assert.equal(twice.evolvedName, null);
  assert.equal(twice.save, once.save);
  const starter = twice.save.ownedCreatures.find(
    (c) => c.creatureId === twice.save.starterCreatureId,
  )!;
  assert.equal(starter.stage, MEADOW_STARTER_EVOLUTION_STAGE);
  assert.deepEqual(twice.save.badges, [MEADOW_BADGE]);
});

test("awardMeadowFinale: works for every starter species", () => {
  for (const starter of STARTERS) {
    const result = awardMeadowFinale(createNewGameV2(starter));
    assert.equal(result.badgeAwarded, true, starter.id);
    assert.equal(result.evolvedName, starter.name, starter.id);
    const evolved = result.save.ownedCreatures[0];
    assert.equal(evolved.stage, MEADOW_STARTER_EVOLUTION_STAGE, starter.id);
    assert.ok(starter.stages >= MEADOW_STARTER_EVOLUTION_STAGE, starter.id);
  }
});

test("artRefForStage: stage 1 is the registered cell; stage 2 steps right one cell", () => {
  const sprout = SPECIES_BY_ID.sproutkit;
  assert.ok(sprout.artRef);
  const s1 = artRefForStage(sprout, 1)!;
  const s2 = artRefForStage(sprout, 2)!;
  assert.equal(s1.x, sprout.artRef!.x);
  assert.equal(s2.x, sprout.artRef!.x + sprout.artRef!.w);
  assert.equal(s2.y, sprout.artRef!.y);
  assert.equal(s2.sheet, sprout.artRef!.sheet);
  // Clamps to the family's stage count.
  const past = artRefForStage(sprout, 99)!;
  assert.equal(past.x, sprout.artRef!.x + (sprout.stages - 1) * sprout.artRef!.w);
});
