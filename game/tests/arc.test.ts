// The #17 counting arc: flag-driven world state (visible creatures, the
// pen-fence patch, Fern's dialog, battle settlement) is pure and tested
// here — WorldScreen and GameApp only render and route it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DOCK_MOTHLING_ID,
  FLAG_DOCK_MOTHLING,
  FLAG_WOOLLY_PEN,
  FLAG_WOOLLY_PEN_FOUND,
  WOOLLY_PEN_GAP,
  WOOLLY_PEN_WANDERERS,
  arcBattleTopicsFor,
  arcCrittersFor,
  fernDialogFor,
  patchRegionForArc,
  settleArcBattle,
} from "../world/arc.ts";
import {
  isWalkable,
  region,
  regionH,
  regionW,
  tileAt,
  type RegionDef,
} from "../world/regions/index.ts";
import { MEADOW_DOCK_ANCHORS } from "../world/regions/meadow-dock.ts";
import { MEADOW_WOOLLY_ANCHORS } from "../world/regions/meadow-woolly.ts";

function boundaryReachable(def: RegionDef): Set<string> {
  const reachable = new Set<string>();
  const queue: Array<[number, number]> = [];
  const seed = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (isWalkable(def, x, y) && !reachable.has(key)) {
      reachable.add(key);
      queue.push([x, y]);
    }
  };
  for (let x = 0; x < regionW(def); x++) {
    seed(x, 0);
    seed(x, regionH(def) - 1);
  }
  for (let y = 0; y < regionH(def); y++) {
    seed(0, y);
    seed(regionW(def) - 1, y);
  }
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) seed(x + dx, y + dy);
  }
  return reachable;
}

// --- geography anchors the arc depends on ----------------------------------

test("arc: the shipped Woolly map still has the broken pen gap the arc mends", () => {
  const woolly = region("meadow/woolly");
  // If the map is ever re-authored, the arc's patch point must move too —
  // this guard fails loudly instead of silently corrupting a changed map.
  assert.deepEqual(WOOLLY_PEN_GAP, MEADOW_WOOLLY_ANCHORS.penGap);
  assert.equal(tileAt(woolly, WOOLLY_PEN_GAP.x, WOOLLY_PEN_GAP.y), ".");
  // …and the same column is fence in the rows above and below (the wall).
  assert.equal(tileAt(woolly, WOOLLY_PEN_GAP.x, WOOLLY_PEN_GAP.y - 1), "X");
  assert.equal(tileAt(woolly, WOOLLY_PEN_GAP.x, WOOLLY_PEN_GAP.y + 1), "X");
});

test("arc: every visible arc creature stands on a walkable tile", () => {
  for (const regionId of ["meadow/dock", "meadow/woolly"]) {
    for (const flags of [
      {},
      { [FLAG_WOOLLY_PEN]: 1 },
      { [FLAG_WOOLLY_PEN]: 1, [FLAG_WOOLLY_PEN_FOUND]: 2 },
      { [FLAG_WOOLLY_PEN]: 2 },
    ]) {
      for (const critter of arcCrittersFor(regionId, flags)) {
        const def = patchRegionForArc(region(regionId), flags);
        assert.ok(
          isWalkable(def, critter.x, critter.y),
          `${regionId} ${critter.id} on blocked tile ${critter.x},${critter.y}`,
        );
      }
    }
  }
});

// --- the pen-fence patch ----------------------------------------------------

test("arc: no repair flag, no patch (identity)", () => {
  const woolly = region("meadow/woolly");
  assert.equal(patchRegionForArc(woolly, {}), woolly);
  assert.equal(patchRegionForArc(woolly, { [FLAG_WOOLLY_PEN]: 1 }), woolly);
  assert.equal(patchRegionForArc(region("harbor"), { [FLAG_WOOLLY_PEN]: 2 }), region("harbor"));
});

test("arc: the repaired pen closes the gap without mutating the shipped def", () => {
  const woolly = region("meadow/woolly");
  const before = woolly.rows[WOOLLY_PEN_GAP.y];
  const patched = patchRegionForArc(woolly, { [FLAG_WOOLLY_PEN]: 2 });
  assert.notEqual(patched, woolly);
  assert.equal(tileAt(patched, WOOLLY_PEN_GAP.x, WOOLLY_PEN_GAP.y), "X");
  assert.ok(!isWalkable(patched, WOOLLY_PEN_GAP.x, WOOLLY_PEN_GAP.y));
  // Only the one character changed, and the registry constant is untouched.
  assert.equal(patched.rows.length, woolly.rows.length);
  for (let y = 0; y < woolly.rows.length; y++) {
    if (y !== WOOLLY_PEN_GAP.y) assert.equal(patched.rows[y], woolly.rows[y]);
  }
  assert.equal(woolly.rows[WOOLLY_PEN_GAP.y], before);
});

test("arc: the patch guard refuses a drifted map instead of corrupting it", () => {
  const woolly = region("meadow/woolly");
  const rows = [...woolly.rows];
  rows[WOOLLY_PEN_GAP.y] =
    rows[WOOLLY_PEN_GAP.y].slice(0, WOOLLY_PEN_GAP.x) + "T" + rows[WOOLLY_PEN_GAP.y].slice(WOOLLY_PEN_GAP.x + 1);
  const drifted = { ...woolly, rows };
  assert.equal(patchRegionForArc(drifted, { [FLAG_WOOLLY_PEN]: 2 }), drifted);
});

// --- visible creatures --------------------------------------------------------

test("arc: the dock mothling waits on the pier until met", () => {
  const [mothling] = arcCrittersFor("meadow/dock", {});
  assert.equal(mothling.id, DOCK_MOTHLING_ID);
  assert.equal(mothling.speciesId, "meadow/mothling");
  assert.equal(mothling.kind, "battle");
  assert.equal(mothling.topic, "4.1");
  assert.deepEqual({ x: mothling.x, y: mothling.y }, MEADOW_DOCK_ANCHORS.mothling);
  assert.equal(tileAt(region("meadow/dock"), mothling.x, mothling.y), "d");
  assert.deepEqual(arcCrittersFor("meadow/dock", { [FLAG_DOCK_MOTHLING]: 1 }), []);
});

test("arc: wanderers appear only after accepting, and thin out as they settle", () => {
  // Not accepted yet: no wanderers, no flock.
  assert.deepEqual(arcCrittersFor("meadow/woolly", {}), []);
  const all = arcCrittersFor("meadow/woolly", { [FLAG_WOOLLY_PEN]: 1 });
  assert.equal(all.length, WOOLLY_PEN_WANDERERS);
  assert.ok(all.every((c) => c.kind === "battle" && c.speciesId === "woolly/fluffball"));
  assert.deepEqual(all.map(({ x, y }) => ({ x, y })), MEADOW_WOOLLY_ANCHORS.wandererSpots);
  // They hide in tall grass, matching Fern's directions.
  const woolly = region("meadow/woolly");
  assert.ok(all.every((c) => tileAt(woolly, c.x, c.y) === "g"));
  const left = arcCrittersFor("meadow/woolly", { [FLAG_WOOLLY_PEN]: 1, [FLAG_WOOLLY_PEN_FOUND]: 2 });
  assert.equal(left.length, 1);
  assert.equal(left[0].id, `woolly-wanderer-${WOOLLY_PEN_WANDERERS - 1}`);
});

test("arc: the repaired pen brings the flock into an actually enclosed pasture", () => {
  const flags = { [FLAG_WOOLLY_PEN]: 2 };
  const flock = arcCrittersFor("meadow/woolly", flags);
  assert.equal(flock.length, 4);
  assert.ok(flock.every((c) => c.kind === "decor" && c.speciesId === "woolly/fluffball"));
  assert.deepEqual(flock.map(({ x, y }) => ({ x, y })), MEADOW_WOOLLY_ANCHORS.flockSpots);

  // Flood from every walkable map edge after the gap closes. A flock tile is
  // genuinely inside the fence only when the outside flood cannot reach it.
  const repaired = patchRegionForArc(region("meadow/woolly"), flags);
  const outside = boundaryReachable(repaired);
  for (const c of flock) {
    assert.equal(tileAt(repaired, c.x, c.y), ".");
    assert.ok(!outside.has(`${c.x},${c.y}`), `${c.id} is not enclosed by the repaired fence`);
  }
});

test("arc: battle topics stay on routed slices (4.1 today and post-import)", () => {
  assert.deepEqual(arcBattleTopicsFor("meadow/dock", {}), ["4.1"]);
  assert.deepEqual(arcBattleTopicsFor("meadow/woolly", { [FLAG_WOOLLY_PEN]: 1 }), ["4.1"]);
  assert.deepEqual(arcBattleTopicsFor("meadow/woolly", { [FLAG_WOOLLY_PEN]: 2 }), []);
  assert.deepEqual(arcBattleTopicsFor("harbor", {}), []);
});

// --- Fern's dialog ------------------------------------------------------------

test("arc: Fern offers, reports progress, then thanks with the shortcut", () => {
  assert.equal(fernDialogFor({}).kind, "offer");
  const progress = fernDialogFor({ [FLAG_WOOLLY_PEN]: 1, [FLAG_WOOLLY_PEN_FOUND]: 1 });
  assert.equal(progress.kind, "progress");
  if (progress.kind === "progress") {
    assert.match(progress.message, /found 1 of 3/);
    assert.match(progress.message, /已经找回 1 只/);
  }
  const thanks = fernDialogFor({ [FLAG_WOOLLY_PEN]: 2 });
  assert.equal(thanks.kind, "thanks");
  if (thanks.kind === "thanks") {
    assert.equal(thanks.sailTo, "meadow/ticktock");
    assert.equal(thanks.sailArrive, "west");
  }
});

// --- battle settlement ----------------------------------------------------------

test("arc: only a win or a capture settles a beat", () => {
  const flags = { [FLAG_WOOLLY_PEN]: 1 };
  assert.equal(settleArcBattle(flags, "woolly-wanderer-0", "fled"), null);
  assert.equal(settleArcBattle(flags, "woolly-wanderer-0", "defeated"), null);
  assert.equal(settleArcBattle(flags, "something-else", "won"), null);
});

test("arc: the mothling settles once", () => {
  const settled = settleArcBattle({}, DOCK_MOTHLING_ID, "captured");
  assert.deepEqual(settled, { flags: { [FLAG_DOCK_MOTHLING]: 1 }, penRepaired: false });
  assert.equal(settleArcBattle({ [FLAG_DOCK_MOTHLING]: 1 }, DOCK_MOTHLING_ID, "won"), null);
});

test("arc: the third wanderer repairs the pen", () => {
  const helping = { [FLAG_WOOLLY_PEN]: 1 };
  // A wanderer won before ever accepting (stale battle) settles nothing.
  assert.equal(settleArcBattle({}, "woolly-wanderer-0", "won"), null);
  const first = settleArcBattle(helping, "woolly-wanderer-0", "won");
  assert.deepEqual(first, { flags: { [FLAG_WOOLLY_PEN_FOUND]: 1 }, penRepaired: false });
  const third = settleArcBattle(
    { [FLAG_WOOLLY_PEN]: 1, [FLAG_WOOLLY_PEN_FOUND]: 2 },
    "woolly-wanderer-2",
    "captured",
  );
  assert.deepEqual(third, {
    flags: { [FLAG_WOOLLY_PEN_FOUND]: 3, [FLAG_WOOLLY_PEN]: 2 },
    penRepaired: true,
  });
});
