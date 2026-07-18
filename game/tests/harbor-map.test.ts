import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HARBOR_NPCS,
  MAP,
  MAP_H,
  MAP_W,
  PLAYER_SPAWN,
  isWalkable,
  npcAt,
  tileAt,
} from "../assets/src/world/map-data.ts";

test("Harbor Town is a rectangular 20x13 map with no encounter grass", () => {
  assert.equal(MAP_W, 20);
  assert.equal(MAP_H, 13);
  assert.ok(MAP.every((row) => row.length === MAP_W));
  assert.ok(MAP.every((row) => !row.includes("G")));
});

test("Harbor NPCs occupy blocked N tiles", () => {
  for (const npc of HARBOR_NPCS) {
    assert.equal(tileAt(npc.x, npc.y), "N");
    assert.equal(isWalkable(npc.x, npc.y), false);
    assert.equal(npcAt(npc.x, npc.y), npc);
  }
});

test("home, workshop, shop, and ferry are reachable from the plaza", () => {
  const queue: Array<[number, number]> = [[PLAYER_SPAWN.x, PLAYER_SPAWN.y]];
  const visited = new Set([`${PLAYER_SPAWN.x},${PLAYER_SPAWN.y}`]);

  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && isWalkable(nx, ny)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }

  for (const destination of ["H", "P", "S", "D"]) {
    const coordinates = MAP.flatMap((row, y) =>
      [...row].flatMap((tile, x) => tile === destination ? [[x, y] as const] : []),
    );
    assert.ok(coordinates.length > 0, `${destination} should exist`);

    for (const [x, y] of coordinates) {
      assert.equal(visited.has(`${x},${y}`), true, `${destination} should be reachable`);
      const hasWalkableApproach = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(
        ([dx, dy]) => isWalkable(x + dx, y + dy),
      );
      assert.equal(hasWalkableApproach, true, `${destination} should have a walkable approach`);
    }
  }
});
