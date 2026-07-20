import { test } from "node:test";
import assert from "node:assert/strict";

import { STARTERS, WORLD_LAYOUT_REVISION, createNewGameV2 } from "../../shared/index.ts";
import { resolveWorldResume } from "../client/world-layout.ts";

test("world layout: an old Meadow save keeps its region and discards local coordinates", () => {
  const save = createNewGameV2(STARTERS[0]);
  save.worldLayoutRevision = 0;
  save.location = { regionId: "meadow/orchard", x: 28, y: 20 };
  save.money = 777;
  save.flags["arc.woolly.pen"] = 2;
  const before = structuredClone(save);

  assert.deepEqual(resolveWorldResume(save), {
    regionId: "meadow/orchard",
    startAt: null,
    migrated: true,
  });
  assert.deepEqual(save, before, "the resolver never mutates progress or the stored save");
});

test("world layout: old Harbor coordinates remain exact while the revision advances", () => {
  const save = createNewGameV2(STARTERS[0]);
  save.worldLayoutRevision = 0;
  save.location = { regionId: "harbor", x: 4, y: 7 };
  assert.deepEqual(resolveWorldResume(save), {
    regionId: "harbor",
    startAt: { regionId: "harbor", x: 4, y: 7 },
    migrated: true,
  });
});

test("world layout: current Meadow coordinates resume on the exact tile", () => {
  const save = createNewGameV2(STARTERS[0]);
  save.worldLayoutRevision = WORLD_LAYOUT_REVISION;
  save.location = { regionId: "meadow/gardens", x: 8, y: 7 };
  assert.deepEqual(resolveWorldResume(save), {
    regionId: "meadow/gardens",
    startAt: { regionId: "meadow/gardens", x: 8, y: 7 },
    migrated: false,
  });
});

test("world layout: an unknown saved region falls back to Harbor", () => {
  const save = createNewGameV2(STARTERS[0]);
  save.worldLayoutRevision = 0;
  save.location = { regionId: "removed/place", x: 1, y: 1 };
  assert.deepEqual(resolveWorldResume(save), { regionId: "harbor", startAt: null, migrated: true });
});
