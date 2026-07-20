// The #21 Cloudmane research trail: flag-driven hunt state (clue sequence,
// Keeper Yun's dialog, the summoned guardian, Field Guide telegraphing) is
// pure and tested here — WorldScreen and GameApp only render and route it.
// The trail's promise: progress only ever moves forward, so leaving the
// island, losing the battle, or a Unique escape erases nothing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { settleArcBattle } from "../assets/src/world/arc.ts";
import {
  CLOUDMANE_CRITTER_ID,
  FLAG_TRAIL_STARTED,
  FLAG_TRAIL_SUMMONED,
  GUARDIAN_BANK_PATH,
  GUARDIAN_SPECIES_ID,
  GUARDIAN_SPOT,
  GUARDIAN_TOPIC,
  TRAIL_CLUES,
  nextTrailClue,
  trailBattleTopicsFor,
  trailClueAt,
  trailClueFlag,
  trailCluesFound,
  trailCrittersFor,
  trailGuideLine,
  trailReadyToCall,
  yunDialogFor,
} from "../assets/src/world/trail.ts";
import { isWalkable, npcAt, region, tileAt } from "../world/regions/index.ts";

const STARTED = { [FLAG_TRAIL_STARTED]: 1 };
const ALL_FOUND = {
  [FLAG_TRAIL_STARTED]: 1,
  [trailClueFlag(1)]: 1,
  [trailClueFlag(2)]: 1,
  [trailClueFlag(3)]: 1,
};
const SUMMONED = { ...ALL_FOUND, [FLAG_TRAIL_SUMMONED]: 1 };

// --- geography the trail depends on -----------------------------------------

test("trail: Keeper Yun stands at the stones on a blocked N marker with the trail arcId", () => {
  const stones = region("meadow/stones");
  const yun = npcAt(stones, 12, 2);
  assert.ok(yun, "no NPC at the keeper's tile");
  assert.equal(yun.name, "Keeper Yun 阿云");
  assert.equal(yun.arcId, "cloudmane-trail");
  assert.equal(tileAt(stones, 12, 2), "N");
  assert.equal(isWalkable(stones, 12, 2), false);
});

test("trail: every evidence spot's center tile is walkable in the shipped maps", () => {
  for (const clue of TRAIL_CLUES) {
    const def = region(clue.regionId);
    assert.ok(
      isWalkable(def, clue.x, clue.y),
      `${clue.regionId} clue ${clue.n} on blocked tile ${clue.x},${clue.y}`,
    );
  }
});

test("trail: the summoned guardian waits on a walkable tile in the ring", () => {
  const stones = region("meadow/stones");
  assert.ok(isWalkable(stones, GUARDIAN_SPOT.x, GUARDIAN_SPOT.y));
});

// --- the authored sequence -----------------------------------------------------

test("trail: the clue sequence is fixed and starts only after accepting", () => {
  assert.equal(nextTrailClue({}), null); // spots inert before Yun's request
  assert.equal(nextTrailClue(STARTED)?.n, 1);
  assert.equal(nextTrailClue({ ...STARTED, [trailClueFlag(1)]: 1 })?.n, 2);
  assert.equal(nextTrailClue({ ...STARTED, [trailClueFlag(1)]: 1, [trailClueFlag(2)]: 1 })?.n, 3);
  assert.equal(nextTrailClue(ALL_FOUND), null); // proof complete
  assert.equal(nextTrailClue(SUMMONED), null);
});

test("trail: clues are found in order — later spots stay inert early", () => {
  const clue2 = TRAIL_CLUES[1];
  // Standing on clue 2's spot with nothing found: inert (fixed order).
  assert.equal(trailClueAt(clue2.regionId, clue2.x, clue2.y, {}), null);
  assert.equal(trailClueAt(clue2.regionId, clue2.x, clue2.y, STARTED), null);
  // Once clue 1 is recorded, the same tile is live.
  assert.equal(
    trailClueAt(clue2.regionId, clue2.x, clue2.y, { ...STARTED, [trailClueFlag(1)]: 1 })?.n,
    2,
  );
});

test("trail: the search spot forgives one tile in every direction", () => {
  const clue1 = TRAIL_CLUES[0];
  assert.equal(trailClueAt(clue1.regionId, clue1.x, clue1.y, STARTED)?.n, 1);
  assert.equal(trailClueAt(clue1.regionId, clue1.x + 1, clue1.y - 1, STARTED)?.n, 1);
  assert.equal(trailClueAt(clue1.regionId, clue1.x + 2, clue1.y, STARTED), null);
  assert.equal(trailClueAt("meadow/stones", clue1.x, clue1.y, STARTED), null);
});

test("trail: progress counts only forward", () => {
  assert.equal(trailCluesFound({}), 0);
  assert.equal(trailCluesFound(STARTED), 0);
  assert.equal(trailCluesFound({ ...STARTED, [trailClueFlag(2)]: 1 }), 1);
  assert.equal(trailCluesFound(ALL_FOUND), 3);
  assert.equal(trailReadyToCall({ ...STARTED, [trailClueFlag(1)]: 1, [trailClueFlag(2)]: 1 }), false);
  assert.equal(trailReadyToCall(ALL_FOUND), true);
});

// --- the summoned guardian -----------------------------------------------------

test("trail: the guardian appears only after the Call, and only at the stones", () => {
  assert.deepEqual(trailCrittersFor("meadow/stones", {}), []);
  assert.deepEqual(trailCrittersFor("meadow/stones", ALL_FOUND), []); // not called yet
  assert.deepEqual(trailCrittersFor("meadow/woolly", SUMMONED), []);
  const [guardian] = trailCrittersFor("meadow/stones", SUMMONED);
  assert.equal(guardian.id, CLOUDMANE_CRITTER_ID);
  assert.equal(guardian.speciesId, GUARDIAN_SPECIES_ID);
  assert.equal(guardian.kind, "battle");
  assert.equal(guardian.capturable, false); // never ball-caught — #22 trust
  assert.equal(guardian.x, GUARDIAN_SPOT.x);
  assert.equal(guardian.y, GUARDIAN_SPOT.y);
});

test("trail: the waiting guardian is the standing second chance", () => {
  // Every battle outcome leaves the guardian standing: arc settlement never
  // touches trail flags, and the critter derives only from `summoned`.
  // "escaped" is the Unique-flee outcome (#22) — progress still survives.
  for (const outcome of ["won", "captured", "fled", "escaped", "defeated"] as const) {
    assert.equal(settleArcBattle(SUMMONED, CLOUDMANE_CRITTER_ID, outcome), null);
    assert.equal(trailCrittersFor("meadow/stones", SUMMONED).length, 1);
  }
});

test("trail: battle topics name the guardian slate load key after the Call", () => {
  assert.deepEqual(trailBattleTopicsFor("meadow/stones", {}), []);
  assert.deepEqual(trailBattleTopicsFor("meadow/stones", SUMMONED), [GUARDIAN_TOPIC]);
  assert.deepEqual(trailBattleTopicsFor("harbor", SUMMONED), []);
});

// --- Keeper Yun's dialog ---------------------------------------------------------

test("trail: Yun offers, points at each next spot, calls, then stands by", () => {
  const offer = yunDialogFor({});
  assert.equal(offer.kind, "offer");
  if (offer.kind === "offer") assert.match(offer.message, /天马/);

  const seek1 = yunDialogFor(STARTED);
  assert.equal(seek1.kind, "seek");
  assert.match(seek1.message, /0 of 3/);
  assert.match(seek1.message, /Ticktock Knoll/);
  assert.match(seek1.message, /滴答山丘/);

  const seek2 = yunDialogFor({ ...STARTED, [trailClueFlag(1)]: 1 });
  assert.match(seek2.message, /1 of 3/);
  assert.match(seek2.message, /Appledore Orchard/);
  assert.match(seek2.message, /苹果园/);

  const seek3 = yunDialogFor({ ...STARTED, [trailClueFlag(1)]: 1, [trailClueFlag(2)]: 1 });
  assert.match(seek3.message, /2 of 3/);
  assert.match(seek3.message, /Pattern Gardens/);
  assert.match(seek3.message, /图案花园/);

  assert.equal(yunDialogFor(ALL_FOUND).kind, "ready");
  const summoned = yunDialogFor(SUMMONED);
  assert.equal(summoned.kind, "summoned");
  // The second-chance promise is telegraphed, bilingually.
  assert.match(summoned.message, /always returns/);
  assert.match(summoned.message, /总会回到/);
});

// --- Field Guide telegraphing ----------------------------------------------------

test("trail: the guide line always names the hunt's next opportunity", () => {
  assert.match(trailGuideLine({}, false), /ask the keeper there/);
  assert.match(trailGuideLine(STARTED, false), /Research 0\/3/);
  assert.match(trailGuideLine({ ...STARTED, [trailClueFlag(1)]: 1 }, false), /Research 1\/3/);
  assert.match(trailGuideLine({ ...STARTED, [trailClueFlag(1)]: 1 }, false), /水果摊/);
  assert.match(trailGuideLine(ALL_FOUND, false), /proof is complete/);
  assert.match(trailGuideLine(SUMMONED, false), /waits among the Hundred Stones/);
  assert.match(trailGuideLine(SUMMONED, true), /Met among the Hundred Stones/);
});

// --- save hygiene ------------------------------------------------------------------

test("trail: flag keys stay well inside the save's id-length bound", () => {
  for (const key of [
    FLAG_TRAIL_STARTED,
    FLAG_TRAIL_SUMMONED,
    ...TRAIL_CLUES.map((c) => trailClueFlag(c.n)),
  ]) {
    assert.ok(key.length > 0 && key.length <= 64, key);
  }
});

test("trail: the guardian is never in a wild table (no random low-probability hunt)", () => {
  for (const id of ["meadow/stones", "meadow/ticktock", "meadow/orchard", "meadow/gardens"]) {
    const table = region(id).encounters;
    if (!table) continue;
    assert.ok(
      table.entries.every((e) => e.speciesId !== GUARDIAN_SPECIES_ID),
      `${id} wild table names the guardian`,
    );
  }
});

// --- guardian slate routing (#23) ---------------------------------------------

test("trail: the summoned guardian names the multi-topic slate load key", () => {
  const [guardian] = trailCrittersFor("meadow/stones", SUMMONED);
  assert.equal(guardian.topic, GUARDIAN_TOPIC);
  assert.equal(GUARDIAN_TOPIC, "guardian");
  assert.equal(GUARDIAN_BANK_PATH, "question-banks/std1/std1.meadow-guardian.v1");
  assert.deepEqual(trailBattleTopicsFor("meadow/stones", SUMMONED), [GUARDIAN_TOPIC]);
});
