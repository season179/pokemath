import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PREVIEW_LOCKED_MESSAGE,
  REGIONS,
  camOffset,
  canTraverseGateway,
  gatewayNamed,
  gatewayNotice,
  isEncounterRegion,
  isOpenRegion,
  isWalkable,
  npcAt,
  regionH,
  regionW,
  tileAt,
} from "../world/regions/index.ts";
import type { RegionDef } from "../world/regions/index.ts";

const MEADOW_IDS = [
  "meadow/dock",
  "meadow/woolly",
  "meadow/ticktock",
  "meadow/orchard",
  "meadow/festival",
  "meadow/barn",
  "meadow/gardens",
  "meadow/stones",
];

function reachableTiles(def: RegionDef, from: { x: number; y: number }): Set<string> {
  const visited = new Set([`${from.x},${from.y}`]);
  const queue = [[from.x, from.y]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && isWalkable(def, nx, ny)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

test("every region is rectangular with a walkable spawn", () => {
  for (const def of Object.values(REGIONS)) {
    const w = regionW(def);
    assert.ok(w > 0, def.id);
    assert.ok(def.rows.every((row) => row.length === w), `${def.id} rows are rectangular`);
    assert.ok(isWalkable(def, def.spawn.x, def.spawn.y), `${def.id} spawn is walkable`);
  }
});

test("NPCs stand on blocked N marker tiles", () => {
  for (const def of Object.values(REGIONS)) {
    for (const npc of def.npcs) {
      assert.equal(tileAt(def, npc.x, npc.y), "N", `${def.id} ${npc.name}`);
      assert.equal(isWalkable(def, npc.x, npc.y), false, `${def.id} ${npc.name}`);
      assert.equal(npcAt(def, npc.x, npc.y), npc);
    }
  }
});

test("gateway tiles and arrival points are walkable and in bounds", () => {
  for (const def of Object.values(REGIONS)) {
    for (const gateway of def.gateways) {
      for (const tile of gateway.tiles) {
        assert.ok(isWalkable(def, tile.x, tile.y), `${def.id}.${gateway.name} tile is walkable`);
      }
      if (gateway.arriveAt) {
        assert.ok(
          isWalkable(def, gateway.arriveAt.x, gateway.arriveAt.y),
          `${def.id}.${gateway.name} arrival is walkable`,
        );
      }
      if (gateway.to === null && gateway.tiles.length > 0) {
        assert.ok(gateway.message, `${def.id}.${gateway.name} pocket has a message`);
      }
      if (gateway.to !== null) {
        const target = REGIONS[gateway.to];
        assert.ok(target, `${def.id}.${gateway.name} target ${gateway.to} exists`);
        const back = gatewayNamed(target, gateway.toGateway!);
        assert.ok(back, `${gateway.to}.${gateway.toGateway} exists`);
        assert.ok(back.arriveAt, `${gateway.to}.${gateway.toGateway} has an arrival point`);
      }
    }
  }
});

test("open gateways come in symmetric pairs", () => {
  for (const def of Object.values(REGIONS)) {
    for (const gateway of def.gateways) {
      if (gateway.to === null) continue;
      const back = gatewayNamed(REGIONS[gateway.to], gateway.toGateway!)!;
      assert.equal(back.to, def.id, `${gateway.to}.${gateway.toGateway} leads back to ${def.id}`);
      assert.equal(back.toGateway, gateway.name);
    }
  }
});

test("the full region graph stays connected when preview locks are ignored", () => {
  // Every region stays wired for later reopening (#29 criterion 5): with the
  // preview scope ignored, every region is still reachable from Harbor Town.
  const edges: Array<[string, string]> = [];
  for (const def of Object.values(REGIONS)) {
    for (const gateway of def.gateways) {
      if (gateway.to) edges.push([def.id, gateway.to]);
    }
    for (const npc of def.npcs) {
      if (npc.sailTo) edges.push([def.id, npc.sailTo]);
    }
  }
  const visited = new Set(["harbor"]);
  const queue = ["harbor"];
  for (let i = 0; i < queue.length; i++) {
    for (const [from, to] of edges) {
      if (from === queue[i] && !visited.has(to)) {
        visited.add(to);
        queue.push(to);
      }
    }
  }
  for (const id of Object.keys(REGIONS)) {
    assert.ok(visited.has(id), `${id} is reachable from harbor`);
  }
});

test("preview scope: only Harbor, Meadow Dock, and Woolly are open", () => {
  // Woolly Meadows is the only open monster area for the kids-playtest
  // preview; Meadow Dock is transit-only, every other area stays sealed.
  const open = Object.keys(REGIONS).filter((id) => isOpenRegion(id));
  assert.deepEqual(open, ["harbor", "meadow/dock", "meadow/woolly"]);
});

test("preview: only the open set is reachable from Harbor (gateways + ferries)", () => {
  // Breadth-first over actual traversal edges: crossable gateways use the
  // same canTraverseGateway helper as WorldScreen, and NPC sail offers are
  // included so a future sail route can never silently bypass the preview
  // seal by dropping a player in a locked region.
  const reachable = new Set<string>(["harbor"]);
  const queue = ["harbor"];
  for (let i = 0; i < queue.length; i++) {
    const def = REGIONS[queue[i]];
    for (const gateway of def.gateways) {
      if (gateway.to && canTraverseGateway(gateway) && !reachable.has(gateway.to)) {
        reachable.add(gateway.to);
        queue.push(gateway.to);
      }
    }
    for (const npc of def.npcs) {
      if (npc.sailTo && !reachable.has(npc.sailTo)) {
        reachable.add(npc.sailTo);
        queue.push(npc.sailTo);
      }
    }
  }
  assert.deepEqual([...reachable].sort(), ["harbor", "meadow/dock", "meadow/woolly"]);
});

test("preview: the two outward gates stay sealed but keep their wiring", () => {
  const dockSouth = gatewayNamed(REGIONS["meadow/dock"], "south")!;
  const woollyNorth = gatewayNamed(REGIONS["meadow/woolly"], "north")!;
  // Wiring is fully retained for later reopening (criterion 5)…
  assert.equal(dockSouth.to, "meadow/gardens");
  assert.equal(dockSouth.toGateway, "north");
  assert.ok(dockSouth.arriveAt, "dock.south still has an arrival point");
  assert.equal(woollyNorth.to, "meadow/ticktock");
  assert.equal(woollyNorth.toGateway, "west");
  assert.ok(woollyNorth.arriveAt, "woolly.north still has an arrival point");
  // …but neither can be crossed in the preview (criterion 3).
  assert.equal(canTraverseGateway(dockSouth), false);
  assert.equal(canTraverseGateway(woollyNorth), false);
});

test("preview: the Harbor ⇄ Dock ⇄ Woolly route is open both ways", () => {
  // Harbor ⇄ Dock via the ferry captains.
  const harborCaptain = REGIONS.harbor.npcs.find((n) => n.sailTo === "meadow/dock");
  const dockCaptain = REGIONS["meadow/dock"].npcs.find((n) => n.sailTo === "harbor");
  assert.ok(harborCaptain, "Harbor captain sails to Meadow Dock");
  assert.ok(dockCaptain, "Dock captain sails back to Harbor Town");
  // Dock ⇄ Woolly via the ring road gateways.
  assert.equal(canTraverseGateway(gatewayNamed(REGIONS["meadow/dock"], "east")!), true);
  assert.equal(canTraverseGateway(gatewayNamed(REGIONS["meadow/woolly"], "west")!), true);
});

test("preview: only Woolly is encounter-capable; Meadow Dock is transit-only", () => {
  // Criteria 2 + 4: among all regions, only Woolly may host encounters in the
  // preview, and Meadow Dock is reachable but explicitly transit-only.
  const encounterRegions = Object.keys(REGIONS).filter((id) => isEncounterRegion(id));
  assert.deepEqual(encounterRegions, ["meadow/woolly"]);
  // Encounter capability is a strict subset of travel openness — a region the
  // player cannot reach can never be a preview encounter region either.
  for (const id of encounterRegions) {
    assert.ok(isOpenRegion(id), `encounter region ${id} must also be open`);
  }
  assert.equal(isOpenRegion("meadow/dock"), true);
  assert.equal(isEncounterRegion("meadow/dock"), false);
  assert.equal(isOpenRegion("meadow/woolly"), true);
  assert.equal(isEncounterRegion("meadow/woolly"), true);
});

test("preview: sealed wired gateways show the bilingual opens-later notice", () => {
  // Criterion 3: the notice itself is friendly AND bilingual (English + 中文).
  assert.match(PREVIEW_LOCKED_MESSAGE, /[A-Za-z]/, "notice has English copy");
  assert.match(PREVIEW_LOCKED_MESSAGE, /[\u4e00-\u9fff]/, "notice has Chinese copy");
  // The two outward preview gates carry no per-gateway message, so they must
  // resolve to the bilingual opens-later notice — not the pocket rustle copy.
  const dockSouth = gatewayNamed(REGIONS["meadow/dock"], "south")!;
  const woollyNorth = gatewayNamed(REGIONS["meadow/woolly"], "north")!;
  assert.equal(dockSouth.message, undefined);
  assert.equal(woollyNorth.message, undefined);
  assert.equal(gatewayNotice(dockSouth), PREVIEW_LOCKED_MESSAGE);
  assert.equal(gatewayNotice(woollyNorth), PREVIEW_LOCKED_MESSAGE);
  // A reserved pocket keeps its own rustle message instead.
  const pocket = REGIONS["meadow/dock"].gateways.find((g) => g.name === "pocket-north")!;
  assert.equal(pocket.to, null);
  assert.ok(pocket.message, "pocket has its own message");
  assert.equal(gatewayNotice(pocket), pocket.message);
});

test("Meadow Isle regions are explorable: every gateway is reachable from spawn", () => {
  for (const id of MEADOW_IDS) {
    const def = REGIONS[id];
    const reachable = reachableTiles(def, def.spawn);
    for (const gateway of def.gateways) {
      for (const tile of gateway.tiles) {
        assert.ok(
          reachable.has(`${tile.x},${tile.y}`),
          `${id}.${gateway.name} tile ${tile.x},${tile.y} reachable from spawn`,
        );
      }
    }
  }
});

test("Harbor Town: home, workshop, shop, and ferry pier are reachable", () => {
  const harbor = REGIONS.harbor;
  const reachable = reachableTiles(harbor, harbor.spawn);
  for (const destination of ["H", "P", "S", "D"]) {
    const coordinates = harbor.rows.flatMap((row, y) =>
      [...row].flatMap((tile, x) => (tile === destination ? [[x, y] as const] : [])),
    );
    assert.ok(coordinates.length > 0, `${destination} should exist`);
    for (const [x, y] of coordinates) {
      assert.ok(reachable.has(`${x},${y}`), `${destination} at ${x},${y} is reachable`);
    }
  }
});

test("camOffset centers small maps and clamps large maps", () => {
  // Small map: centered on the canvas, regardless of player position.
  assert.equal(camOffset(100, 800, 960), -400);
  // Large map: player-centered…
  assert.equal(camOffset(1000, 2000, 960), -1000);
  // …but clamped at the near edge…
  assert.equal(camOffset(100, 2000, 960), -480);
  // …and at the far edge.
  assert.equal(camOffset(1950, 2000, 960), -1520);
});

test("NPC sail routes target real regions with real arrival gateways", () => {
  for (const def of Object.values(REGIONS)) {
    for (const npc of def.npcs) {
      if (!npc.sailTo) continue;
      const target = REGIONS[npc.sailTo];
      assert.ok(target, `${def.id} ${npc.name} sails to ${npc.sailTo}, which exists`);
      const gateway = gatewayNamed(target, npc.sailArrive!);
      assert.ok(gateway, `${npc.sailTo}.${npc.sailArrive} exists`);
      assert.ok(
        gateway.arriveAt && isWalkable(target, gateway.arriveAt.x, gateway.arriveAt.y),
        `${npc.sailTo}.${npc.sailArrive} arrival is walkable`,
      );
    }
  }
});

test("every arrival point lies in the region's reachable area", () => {
  for (const def of Object.values(REGIONS)) {
    const reachable = reachableTiles(def, def.spawn);
    for (const gateway of def.gateways) {
      if (!gateway.arriveAt) continue;
      assert.ok(
        reachable.has(`${gateway.arriveAt.x},${gateway.arriveAt.y}`),
        `${def.id}.${gateway.name} arrival ${gateway.arriveAt.x},${gateway.arriveAt.y} reachable from spawn`,
      );
    }
  }
});

test("region dimensions", () => {
  assert.equal(regionW(REGIONS.harbor), 20);
  assert.equal(regionH(REGIONS.harbor), 13);
});
