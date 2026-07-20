import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_REGION_TOPIC,
  REGIONS,
  REGION_TOPICS,
  SEALED_GATEWAY_MESSAGE,
  TICKTOCK_ARC_BADGE,
  TICKTOCK_ARC_CLUE,
  TICKTOCK_ARC_WINS,
  TILE,
  camOffset,
  canTraverseGateway,
  coverScale,
  gatewayNamed,
  gatewayNotice,
  isEncounterRegion,
  isEncounterTile,
  isOpenRegion,
  isWalkable,
  npcAt,
  regionH,
  regionW,
  tileAt,
  topicsForRegion,
} from "../world/regions/index.ts";
import type { GatewayDef, RegionDef } from "../world/regions/index.ts";
import { MEADOW_BARN_ANCHORS } from "../world/regions/meadow-barn.ts";
import { MEADOW_FESTIVAL_ANCHORS } from "../world/regions/meadow-festival.ts";
import { MEADOW_GARDENS_ANCHORS } from "../world/regions/meadow-gardens.ts";
import { MEADOW_TICKTOCK_ANCHORS } from "../world/regions/meadow-ticktock.ts";
import { MEADOW_HABITATS, SPECIES_BY_ID, habitatFor } from "../../shared/index.ts";

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

type Point = { x: number; y: number };
const STEP_DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function shortestPath(
  def: RegionDef,
  from: Point,
  targets: readonly Point[],
  allow: (tile: string) => boolean = () => true,
): Point[] {
  const targetKeys = new Set(targets.map(pointKey));
  const startKey = pointKey(from);
  const parents = new Map<string, string | null>([[startKey, null]]);
  const points = new Map<string, Point>([[startKey, from]]);
  const queue: Point[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    const key = pointKey(point);
    if (targetKeys.has(key)) {
      const path: Point[] = [];
      let cursor: string | null = key;
      while (cursor !== null) {
        path.push(points.get(cursor)!);
        cursor = parents.get(cursor)!;
      }
      return path.reverse();
    }
    const nextSteps = STEP_DIRS.map(([dx, dy]) => ({ x: point.x + dx, y: point.y + dy }));
    for (const next of nextSteps) {
      const nextKey = pointKey(next);
      const tile = tileAt(def, next.x, next.y);
      if (!parents.has(nextKey) && isWalkable(def, next.x, next.y) && allow(tile)) {
        parents.set(nextKey, key);
        points.set(nextKey, next);
        queue.push(next);
      }
    }
  }
  return [];
}

function shortestDistance(
  def: RegionDef,
  from: Point,
  to: Point,
  allow: (tile: string) => boolean = () => true,
): number {
  const path = shortestPath(def, from, [to], allow);
  return path.length === 0 ? Number.POSITIVE_INFINITY : path.length - 1;
}

function landmarkApproaches(def: RegionDef): Point[] {
  const landmark = def.landmark!;
  if (isWalkable(def, landmark.x, landmark.y)) return [landmark];
  return STEP_DIRS.flatMap(([dx, dy]) => {
    const point = { x: landmark.x + dx, y: landmark.y + dy };
    return isWalkable(def, point.x, point.y) ? [point] : [];
  });
}

function connectedGrass(def: RegionDef): Point[] {
  const grass = new Set<string>();
  for (let y = 0; y < regionH(def); y++) {
    for (let x = 0; x < regionW(def); x++) {
      if (tileAt(def, x, y) === "g") grass.add(`${x},${y}`);
    }
  }
  const qualifying: Point[] = [];
  while (grass.size > 0) {
    const first = grass.values().next().value as string;
    const [x, y] = first.split(",").map(Number);
    const component: Point[] = [{ x, y }];
    grass.delete(first);
    for (let i = 0; i < component.length; i++) {
      for (const [dx, dy] of STEP_DIRS) {
        const next = { x: component[i].x + dx, y: component[i].y + dy };
        const key = pointKey(next);
        if (grass.delete(key)) component.push(next);
      }
    }
    if (component.length >= 3) qualifying.push(...component);
  }
  return qualifying;
}

function longestDeadAirRun(def: RegionDef, path: readonly Point[]): number {
  const gateways = new Set(def.gateways.flatMap((gateway) => gateway.tiles.map(pointKey)));
  let longest = 0;
  let run = 0;
  for (const point of path) {
    const nearbyFeature = [[0, 0], ...STEP_DIRS].some(([dx, dy]) =>
      "gNXoC".includes(tileAt(def, point.x + dx, point.y + dy)),
    );
    const meaningful = nearbyFeature || gateways.has(pointKey(point)) || pointKey(point) === pointKey(def.landmark!);
    run = meaningful ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return longest;
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

test("open scope: every region is open (the #29 preview gates were lifted in #9)", () => {
  const open = Object.keys(REGIONS).filter((id) => isOpenRegion(id));
  assert.deepEqual(open, [
    "harbor",
    "meadow/dock",
    "meadow/woolly",
    "meadow/ticktock",
    "meadow/orchard",
    "meadow/festival",
    "meadow/barn",
    "meadow/gardens",
    "meadow/stones",
  ]);
});

test("every region is reachable from Harbor on foot or by ferry (gateways + sails)", () => {
  // Breadth-first over actual traversal edges: crossable gateways use the
  // same canTraverseGateway helper as WorldScreen, and NPC sail offers are
  // included so a future sail route can never silently bypass a seal by
  // dropping a player in a closed region.
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
  assert.deepEqual([...reachable].sort(), [
    "harbor",
    "meadow/barn",
    "meadow/dock",
    "meadow/festival",
    "meadow/gardens",
    "meadow/orchard",
    "meadow/stones",
    "meadow/ticktock",
    "meadow/woolly",
  ]);
});

test("the former #29 preview gates now travel; the expansion pockets stay sealed", () => {
  // The two gates the preview sealed are ordinary ring road again (#9).
  const dockSouth = gatewayNamed(REGIONS["meadow/dock"], "south")!;
  const woollyNorth = gatewayNamed(REGIONS["meadow/woolly"], "north")!;
  assert.equal(dockSouth.to, "meadow/gardens");
  assert.equal(canTraverseGateway(dockSouth), true);
  assert.equal(woollyNorth.to, "meadow/ticktock");
  assert.equal(canTraverseGateway(woollyNorth), true);
  // Reserved expansion pockets (the Hidden Grove and friends) are NOT part
  // of the #9 lift: they still have no target and still show their own
  // rustle message rather than the sealed-gateway fallback.
  const pockets = Object.values(REGIONS).flatMap((def) =>
    def.gateways.filter((g) => g.to === null && g.tiles.length > 0),
  );
  assert.ok(pockets.length >= 4, "expansion pockets are still reserved");
  for (const pocket of pockets) {
    assert.equal(canTraverseGateway(pocket), false, `pocket ${pocket.name} stays sealed`);
    assert.ok(pocket.message, `pocket ${pocket.name} has its own message`);
    assert.equal(gatewayNotice(pocket), pocket.message);
  }
});

test("the Harbor ⇄ Dock ⇄ Woolly route is open both ways", () => {
  // Harbor ⇄ Dock via the ferry captains.
  const harborCaptain = REGIONS.harbor.npcs.find((n) => n.sailTo === "meadow/dock");
  const dockCaptain = REGIONS["meadow/dock"].npcs.find((n) => n.sailTo === "harbor");
  assert.ok(harborCaptain, "Harbor captain sails to Meadow Dock");
  assert.ok(dockCaptain, "Dock captain sails back to Harbor Town");
  // Dock ⇄ Woolly via the ring road gateways.
  assert.equal(canTraverseGateway(gatewayNamed(REGIONS["meadow/dock"], "east")!), true);
  assert.equal(canTraverseGateway(gatewayNamed(REGIONS["meadow/woolly"], "west")!), true);
});

test("encounter scope: every habitat-table region is encounter-capable; Dock is transit-only", () => {
  // Issue #9: every Meadow region with an ordinary habitat table hosts
  // encounters; Meadow Dock stays open but encounter-free (transit, #27).
  const encounterRegions = Object.keys(REGIONS).filter((id) => isEncounterRegion(id));
  assert.deepEqual(encounterRegions, [
    "meadow/woolly",
    "meadow/ticktock",
    "meadow/orchard",
    "meadow/festival",
    "meadow/barn",
    "meadow/gardens",
    "meadow/stones",
  ]);
  // Encounter capability is a strict subset of travel openness.
  for (const id of encounterRegions) {
    assert.ok(isOpenRegion(id), `encounter region ${id} must also be open`);
  }
  assert.equal(isOpenRegion("meadow/dock"), true);
  assert.equal(isEncounterRegion("meadow/dock"), false);
  assert.equal(isOpenRegion("harbor"), true);
  assert.equal(isEncounterRegion("harbor"), false);
  // The scope sets and the region data can never drift apart: a region is
  // encounter-capable exactly when it declares a table.
  for (const def of Object.values(REGIONS)) {
    assert.equal(
      isEncounterRegion(def.id),
      def.encounters !== undefined,
      `${def.id} scope/table agreement`,
    );
  }
});

test("topic arcs: encounter regions serve their own curriculum topics (#18/#19)", () => {
  assert.deepEqual(topicsForRegion("meadow/woolly"), ["4.1"]);
  assert.deepEqual(topicsForRegion("meadow/ticktock"), ["4.4"]);
  // The orchard arc battles from two merged topics: arithmetic + money.
  assert.deepEqual(topicsForRegion("meadow/orchard"), ["4.2", "4.3"]);
  // The #20 visual-math arcs: the Barn merges its measurement slice with
  // the Gardens' shared shapes slice (solids are honestly 4.6 content).
  assert.deepEqual(topicsForRegion("meadow/gardens"), ["4.6"]);
  assert.deepEqual(topicsForRegion("meadow/barn"), ["4.5", "4.6"]);
  assert.deepEqual(topicsForRegion("meadow/festival"), ["4.7"]);
  // Regions without an arc yet keep the Woolly default, and the harbor
  // (never encounter-capable) defaults harmlessly too.
  assert.deepEqual(topicsForRegion("meadow/stones"), [DEFAULT_REGION_TOPIC]);
  assert.deepEqual(topicsForRegion("harbor"), [DEFAULT_REGION_TOPIC]);
  // Every mapped region hosts encounters.
  for (const id of Object.keys(REGION_TOPICS)) {
    assert.ok(isEncounterRegion(id), `topic-mapped region ${id} must host encounters`);
  }
});

test("ticktock arc payoff constants stay honest (#19)", () => {
  assert.match(TICKTOCK_ARC_BADGE, /^arc\//);
  assert.ok(TICKTOCK_ARC_WINS >= 1 && TICKTOCK_ARC_WINS <= 10);
  // The clue is bilingual and names the knoll's mascot line (咕咕/Owlet).
  assert.match(TICKTOCK_ARC_CLUE, /咕咕/);
  assert.match(TICKTOCK_ARC_CLUE, /Owlet/);
});

test("M5 topic arcs (#20): routed topics name real curriculum topics", () => {
  const TOPICS = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "extra"];
  for (const topics of Object.values(REGION_TOPICS)) {
    for (const topic of topics) {
      assert.ok(TOPICS.includes(topic), `REGION_TOPICS routes unknown topic ${topic}`);
    }
  }
});

test("compact landmark payoff anchors still sit on their authored structures", () => {
  const barn = REGIONS["meadow/barn"];
  for (const point of [
    MEADOW_BARN_ANCHORS.garland.from,
    MEADOW_BARN_ANCHORS.garland.to,
    ...MEADOW_BARN_ANCHORS.flowerPots,
  ]) {
    assert.equal(tileAt(barn, point.x, point.y), "X", `barn payoff anchor ${pointKey(point)} left the wall`);
  }

  const festival = REGIONS["meadow/festival"];
  for (const { row, fromX, toX } of MEADOW_FESTIVAL_ANCHORS.lanternStrings) {
    assert.equal(tileAt(festival, fromX, row), "p", `festival string ${fromX},${row} left the plaza`);
    assert.equal(tileAt(festival, toX, row), "p", `festival string ${toX},${row} left the plaza`);
  }

  assert.equal(tileAt(REGIONS["meadow/ticktock"], MEADOW_TICKTOCK_ANCHORS.landmark.x, MEADOW_TICKTOCK_ANCHORS.landmark.y), "C");
  assert.equal(tileAt(REGIONS["meadow/gardens"], MEADOW_GARDENS_ANCHORS.trailClue.x, MEADOW_GARDENS_ANCHORS.trailClue.y), "f");
});

test("M5 topic arcs (#20): payoff regions are coherent and completable", () => {
  for (const def of Object.values(REGIONS)) {
    const payoffNpcs = def.npcs.filter((npc) => npc.payoff);
    if (!def.payoff) {
      assert.equal(payoffNpcs.length, 0, `${def.id} has a payoff NPC but no payoff def`);
      continue;
    }
    assert.equal(payoffNpcs.length, 1, `${def.id} has exactly one payoff NPC`);
    // The island session shape: 2–4 battles plus the payoff.
    assert.ok(def.payoff.helps >= 1 && def.payoff.helps <= 4, `${def.id} helps fits a 10–15 minute visit`);
    assert.ok(def.payoff.badge.length > 0, `${def.id} payoff needs a badge id`);
    assert.ok(def.payoff.quest.length > 0, `${def.id} payoff needs quest copy`);
    assert.ok(def.payoff.thanks.length > 0, `${def.id} payoff needs thanks copy`);
    assert.ok(def.payoff.changedNotice.length > 0, `${def.id} payoff needs the change notice`);
    // Help battles must actually be possible here: encounters on, a table
    // present, and a routed topic declared (REGION_TOPICS, not the default).
    assert.ok(isEncounterRegion(def.id), `${def.id} payoff needs encounters enabled`);
    assert.ok(def.encounters, `${def.id} payoff needs an encounter table`);
    assert.notDeepEqual(topicsForRegion(def.id), [DEFAULT_REGION_TOPIC], `${def.id} payoff needs its own topic route`);
  }
});

test("a sealed wired gateway falls back to the bilingual opens-later notice", () => {
  // No Meadow gateway is sealed since #9, so exercise the fallback with a
  // synthetic gateway (the shape a future island's sealed gate takes). The
  // notice itself must stay friendly AND bilingual (English + 中文).
  assert.match(SEALED_GATEWAY_MESSAGE, /[A-Za-z]/, "notice has English copy");
  assert.match(SEALED_GATEWAY_MESSAGE, /[\u4e00-\u9fff]/, "notice has Chinese copy");
  const sealed: GatewayDef = { name: "future", tiles: [], to: "future/island" };
  assert.equal(sealed.message, undefined);
  assert.equal(gatewayNotice(sealed), SEALED_GATEWAY_MESSAGE);
  // A reserved pocket keeps its own rustle message instead.
  const pocket = REGIONS["meadow/dock"].gateways.find((g) => g.name === "pocket-north")!;
  assert.equal(pocket.to, null);
  assert.ok(pocket.message, "pocket has its own message");
  assert.equal(gatewayNotice(pocket), pocket.message);
});

test("compact Meadow grids stay within their reviewed footprint ceilings", () => {
  const ceilings: Record<string, readonly [number, number]> = {
    "meadow/dock": [18, 13],
    "meadow/woolly": [24, 16],
    "meadow/ticktock": [19, 14],
    "meadow/orchard": [20, 15],
    "meadow/festival": [19, 14],
    "meadow/barn": [19, 14],
    "meadow/gardens": [20, 15],
    "meadow/stones": [19, 13],
  };
  for (const id of MEADOW_IDS) {
    const [maxW, maxH] = ceilings[id];
    assert.ok(regionW(REGIONS[id]) <= maxW, `${id}: wider than ${maxW}`);
    assert.ok(regionH(REGIONS[id]) <= maxH, `${id}: taller than ${maxH}`);
  }
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

test("compact Meadow regions keep arrivals close to their primary landmark", () => {
  for (const id of MEADOW_IDS) {
    const def = REGIONS[id];
    assert.ok(def.landmark, `${id}: missing primary landmark`);
    const targets = landmarkApproaches(def);
    assert.ok(targets.length > 0, `${id}: landmark has no walkable approach`);
    const entries = [def.spawn, ...def.gateways.flatMap((gateway) => gateway.arriveAt ? [gateway.arriveAt] : [])];
    for (const entry of entries) {
      const path = shortestPath(def, entry, targets);
      assert.ok(path.length > 0 && path.length - 1 <= 10, `${id}: arrival ${pointKey(entry)} is too far from its landmark`);
      assert.ok(longestDeadAirRun(def, path) <= 8, `${id}: arrival ${pointKey(entry)} has a dead-air approach`);
    }
  }
});

test("compact Meadow encounter regions keep a real grass patch near an entry or landmark", () => {
  for (const id of MEADOW_IDS) {
    const def = REGIONS[id];
    if (!def.encounters) continue;
    const grass = connectedGrass(def);
    assert.ok(grass.length >= 3, `${id}: needs a connected grass patch of at least three tiles`);
    const starts = [
      def.spawn,
      ...def.gateways.flatMap((gateway) => gateway.arriveAt ? [gateway.arriveAt] : []),
      ...landmarkApproaches(def),
    ];
    const nearest = Math.min(...starts.map((start) => {
      const path = shortestPath(def, start, grass);
      return path.length === 0 ? Number.POSITIVE_INFINITY : path.length - 1;
    }));
    assert.ok(nearest <= 8, `${id}: no connected grass patch within 8 tiles of an entry or landmark`);
  }
});

test("compact Meadow regions keep ring travel short, optional, and free of dead air", () => {
  for (const id of MEADOW_IDS) {
    const def = REGIONS[id];
    assert.ok(def.landmark, `${id}: missing primary landmark`);
    const active = def.gateways.filter((gateway) => gateway.to !== null && gateway.tiles.length > 0);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const from = active[i].tiles[0];
        const to = active[j].tiles[0];
        const path = shortestPath(def, from, [to]);
        assert.ok(path.length > 0 && path.length - 1 <= 18, `${id}: ${active[i].name} → ${active[j].name} exceeds 18 tiles`);
        assert.ok(longestDeadAirRun(def, path) <= 8, `${id}: ${active[i].name} → ${active[j].name} has a dead-air run`);
        assert.ok(
          shortestDistance(def, from, to, (tile) => tile !== "g") <= 24,
          `${id}: ${active[i].name} → ${active[j].name} has no short grass-free route`,
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

test("coverScale fills the canvas for compact maps and leaves large maps at 1", () => {
  // Synthetic camera cases stay stable when authored region dimensions change.
  assert.equal(coverScale(960, 624, 1280, 720), 4 / 3);
  assert.equal(coverScale(1152, 768, 1280, 720), 10 / 9);
  assert.equal(coverScale(2000, 3000, 1280, 720), 1);

  // Every compact Meadow map still covers the target canvas after scaling.
  for (const id of MEADOW_IDS) {
    const def = REGIONS[id];
    const mapW = regionW(def) * TILE;
    const mapH = regionH(def) * TILE;
    const scale = coverScale(mapW, mapH, 1280, 720);
    assert.ok(mapW * scale >= 1280, `${id}: scaled width leaves a gap`);
    assert.ok(mapH * scale >= 720, `${id}: scaled height leaves a gap`);
  }
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

// --- M2B ordinary habitat tables (issue #9) ---
//
// Every Meadow monster region draws from an explicit, tested habitat table.
// This suite is the "tested rarity weights and valid species IDs" acceptance
// criterion: ids resolve through the shared registry, rarity labels match the
// ratified habitat registry (shared/habitats.ts), weights are reviewable
// percentages, and the live tables and the registry can never drift apart.

const ENCOUNTER_REGION_IDS = [
  "meadow/woolly",
  "meadow/ticktock",
  "meadow/orchard",
  "meadow/festival",
  "meadow/barn",
  "meadow/gardens",
  "meadow/stones",
] as const;

// The designed common/uncommon/rare totals per table (weights are
// percentages), enshrined so retuning is always a deliberate, reviewed act.
const EXPECTED_RARITY_TOTALS: Record<string, { common: number; uncommon: number; rare: number }> = {
  "meadow/woolly": { common: 65, uncommon: 27, rare: 8 },
  "meadow/ticktock": { common: 35, uncommon: 65, rare: 0 },
  "meadow/orchard": { common: 75, uncommon: 25, rare: 0 },
  "meadow/festival": { common: 92, uncommon: 0, rare: 8 },
  "meadow/barn": { common: 70, uncommon: 30, rare: 0 },
  "meadow/gardens": { common: 75, uncommon: 25, rare: 0 },
  "meadow/stones": { common: 0, uncommon: 0, rare: 100 },
};

// Areas whose ratified registry rows are deliberately NOT backed by a live
// table yet: Meadow Dock is transit infrastructure (#27), not a monster
// area — its rows land with the Dockside tutorial slice (a scripted
// guaranteed first encounter, not a weighted roll).
const TABLE_EXEMPT_AREAS: ReadonlySet<string> = new Set(["meadow/dock"]);

// Registry rows a live table deliberately omits. Woolly's shipped playtest
// table predates the registry and omits Pufftail; it is grandfathered (the
// kids' tested table is never edited under them), not a drift to "fix".
const GRANDFATHERED_ABSENT: Record<string, ReadonlySet<string>> = {
  "meadow/woolly": new Set(["meadow/pufftail"]),
};

// The Festival's common pool includes island-wide spillover (the habitat
// registry's header note): commons that live in another Meadow habitat, not
// extra registry rows. Enshrined exactly so spillover stays a reviewed set.
const FESTIVAL_SPILLOVER: ReadonlySet<string> = new Set([
  "woolly/fluffball",
  "meadow/mothling",
  "meadow/plumelet",
]);

function rarityTotals(entries: readonly { rarity: string; weight: number }[]) {
  const totals = { common: 0, uncommon: 0, rare: 0 };
  for (const entry of entries) {
    totals[entry.rarity as keyof typeof totals] += entry.weight;
  }
  return totals;
}

test("M2B: every table's weights are positive integers summing to the designed rarity split", () => {
  for (const id of ENCOUNTER_REGION_IDS) {
    const table = REGIONS[id].encounters!;
    let sum = 0;
    for (const entry of table.entries) {
      assert.ok(
        Number.isInteger(entry.weight) && entry.weight > 0,
        `${id}: ${entry.speciesId} weight is a positive integer`,
      );
      sum += entry.weight;
    }
    assert.equal(sum, 100, `${id}: weights sum to 100 (readable percentages)`);
    assert.deepEqual(rarityTotals(table.entries), EXPECTED_RARITY_TOTALS[id], `${id}: rarity split`);
    assert.ok(table.rate > 0 && table.rate <= 0.5, `${id}: encounter rate is calm and sane`);
  }
});

test("M2B: every table entry resolves through SPECIES_BY_ID with a matching ordinary rarity", () => {
  for (const id of ENCOUNTER_REGION_IDS) {
    for (const entry of REGIONS[id].encounters!.entries) {
      const species = SPECIES_BY_ID[entry.speciesId];
      assert.ok(species, `${id}: unknown speciesId ${entry.speciesId}`);
      assert.equal(species.rarity, entry.rarity, `${id}: ${entry.speciesId} rarity label matches the registry`);
      // Only ordinary rarities may appear in a wild table (issue #9): Unique
      // pressure is reserved for later authored hunts, and starters never
      // spawn wild — no flee clock can ever sneak in through a wild roll.
      assert.notEqual(species.rarity, "guardian", `${id}: the guardian is never a wild roll`);
      assert.notEqual(species.rarity, "starter", `${id}: starters never spawn wild`);
    }
  }
});

test("M2B: live tables and the habitat registry cover each other (no drift)", () => {
  for (const id of ENCOUNTER_REGION_IDS) {
    const tableIds = new Set(REGIONS[id].encounters!.entries.map((e) => e.speciesId));
    const registryIds = new Set(habitatFor(id as (typeof ENCOUNTER_REGION_IDS)[number]).map((e) => e.speciesId));
    const omitted = GRANDFATHERED_ABSENT[id] ?? new Set<string>();
    // Every registry row for the area is live in its table (unless the row is
    // an enshrined grandfathered omission).
    for (const speciesId of registryIds) {
      if (omitted.has(speciesId)) continue;
      assert.ok(tableIds.has(speciesId), `${id}: registry row ${speciesId} is missing from the live table`);
    }
    // Every live entry is a registry row for the area — or, at the Festival
    // only, an enshrined spillover common from another Meadow habitat.
    for (const speciesId of tableIds) {
      if (registryIds.has(speciesId)) continue;
      assert.equal(id, "meadow/festival", `${id}: ${speciesId} is not a registry row for this area`);
      assert.ok(FESTIVAL_SPILLOVER.has(speciesId), `festival: unreviewed spillover species ${speciesId}`);
      assert.equal(SPECIES_BY_ID[speciesId].rarity, "common", `festival: spillover ${speciesId} stays common`);
      assert.ok(
        MEADOW_HABITATS.some((e) => e.speciesId === speciesId && e.area !== id),
        `festival: spillover ${speciesId} lives in another Meadow habitat`,
      );
    }
  }
});

test("M2B: every habitat registry row is backed by a live table or an explicit exemption", () => {
  for (const entry of MEADOW_HABITATS) {
    if (TABLE_EXEMPT_AREAS.has(entry.area)) continue;
    if (GRANDFATHERED_ABSENT[entry.area]?.has(entry.speciesId)) continue;
    const table = REGIONS[entry.area].encounters;
    assert.ok(table, `${entry.area}: registry rows exist but no live table (add one or exempt the area)`);
    assert.ok(
      table.entries.some((e) => e.speciesId === entry.speciesId),
      `${entry.area}: registry row ${entry.speciesId} is not backed by the live table`,
    );
  }
  // The exemption list stays honest: only areas with registry rows may be
  // exempt, and an exempt area must have no table and no encounter tiles.
  for (const area of TABLE_EXEMPT_AREAS) {
    assert.ok(habitatFor(area as "meadow/dock").length > 0, `${area}: exempt but has no registry rows`);
    assert.equal(REGIONS[area].encounters, undefined, `${area}: exempt yet declares a table`);
  }
});

test("M2B: every table region has reachable tall grass; transit and hub have none", () => {
  for (const id of ENCOUNTER_REGION_IDS) {
    const def = REGIONS[id];
    const reachable = reachableTiles(def, def.spawn);
    const grass = def.rows.flatMap((row, y) =>
      [...row].flatMap((tile, x) => (tile === "g" ? [[x, y] as const] : [])),
    );
    assert.ok(grass.length > 0, `${id}: an encounter table needs tall grass`);
    const reachableGrass = grass.filter(([x, y]) => reachable.has(`${x},${y}`));
    assert.ok(reachableGrass.length > 0, `${id}: tall grass is reachable from spawn`);
    for (const [x, y] of reachableGrass) {
      assert.ok(isEncounterTile(def, x, y), `${id}: g at ${x},${y} is an encounter tile`);
    }
  }
  // Dock (transit) and Harbor (hub) host no encounters, so no tall grass.
  for (const id of ["meadow/dock", "harbor"]) {
    assert.ok(!REGIONS[id].rows.some((row) => row.includes("g")), `${id}: no tall grass`);
    assert.equal(REGIONS[id].encounters, undefined, `${id}: no encounter table`);
  }
});

test("M2B: the Woolly Meadows playtest table is byte-for-byte untouched", () => {
  // Shipped and kid-tested in the preview (#8); M2B expands around it but
  // never edits the proven table under the kids.
  assert.deepEqual(REGIONS["meadow/woolly"].encounters, {
    rate: 0.2,
    entries: [
      { speciesId: "woolly/fluffball", weight: 65, rarity: "common" },
      { speciesId: "woolly/hare", weight: 27, rarity: "uncommon" },
      { speciesId: "woolly/ram", weight: 8, rarity: "rare" },
    ],
  });
});
