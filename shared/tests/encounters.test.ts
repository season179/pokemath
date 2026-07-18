import { test } from "node:test";
import assert from "node:assert/strict";

import { pickEncounter, rollEncounter, type EncounterEntry } from "../encounters.ts";
import { WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM } from "../creature.ts";

// The Woolly Meadows preview table (mirrors game/world/regions/meadow-woolly.ts):
// common 65 / uncommon 27 / rare 8 — sums to 100.
const WOOLLY_TABLE: readonly EncounterEntry[] = [
  { speciesId: WOOLLY_FLUFFBALL.id, weight: 65, rarity: "common" },
  { speciesId: WOOLLY_HARE.id, weight: 27, rarity: "uncommon" },
  { speciesId: WOOLLY_RAM.id, weight: 8, rarity: "rare" },
];

const constRng = (v: number) => () => v;

test("rollEncounter: rate is a < comparison against the rng", () => {
  assert.equal(rollEncounter(0.2, constRng(0)), true); // 0 < 0.2
  assert.equal(rollEncounter(0.2, constRng(0.19)), true);
  assert.equal(rollEncounter(0.2, constRng(0.2)), false); // not strictly less
  assert.equal(rollEncounter(0.2, constRng(0.99)), false);
});

test("pickEncounter: weighted buckets — common first, rare last", () => {
  const table = WOOLLY_TABLE;
  // total 100; rng()*100 lands in [0,65) → fluffball, [65,92) → hare, [92,100) → ram
  assert.equal(pickEncounter(table, constRng(0.0)).id, WOOLLY_FLUFFBALL.id);
  assert.equal(pickEncounter(table, constRng(0.64)).id, WOOLLY_FLUFFBALL.id);
  assert.equal(pickEncounter(table, constRng(0.65)).id, WOOLLY_HARE.id);
  assert.equal(pickEncounter(table, constRng(0.91)).id, WOOLLY_HARE.id);
  assert.equal(pickEncounter(table, constRng(0.92)).id, WOOLLY_RAM.id);
  assert.equal(pickEncounter(table, constRng(0.999)).id, WOOLLY_RAM.id);
});

test("pickEncounter: observed distribution roughly matches the weights", () => {
  const counts: Record<string, number> = {};
  let seed = 0.91283;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const s = pickEncounter(WOOLLY_TABLE, rng);
    counts[s.id] = (counts[s.id] ?? 0) + 1;
  }
  // 65 / 27 / 8 over 6000 draws — allow a healthy band either side.
  assert.ok(counts[WOOLLY_FLUFFBALL.id]! > 0.55 * N && counts[WOOLLY_FLUFFBALL.id]! < 0.75 * N);
  assert.ok(counts[WOOLLY_HARE.id]! > 0.2 * N && counts[WOOLLY_HARE.id]! < 0.34 * N);
  assert.ok(counts[WOOLLY_RAM.id]! > 0.04 * N && counts[WOOLLY_RAM.id]! < 0.13 * N);
});

test("pickEncounter: never returns a boss or out-of-table species", () => {
  for (const v of [0, 0.3, 0.5, 0.7, 0.95, 0.999]) {
    const s = pickEncounter(WOOLLY_TABLE, constRng(v));
    assert.ok([WOOLLY_FLUFFBALL.id, WOOLLY_HARE.id, WOOLLY_RAM.id].includes(s.id));
  }
});

test("pickEncounter: rejects empty tables, zero total weight, and unknown ids", () => {
  assert.throws(() => pickEncounter([], constRng(0.5)), /empty encounter table/);
  assert.throws(
    () => pickEncounter([{ speciesId: WOOLLY_FLUFFBALL.id, weight: 0, rarity: "common" }], constRng(0.5)),
    /total weight must be positive/,
  );
  assert.throws(
    () => pickEncounter([{ speciesId: "no/such/species", weight: 10, rarity: "rare" }], constRng(0.5)),
    /unknown speciesId/,
  );
});
