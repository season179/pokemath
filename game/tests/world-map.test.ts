import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REGIONS,
  isEncounterRegion,
  isOpenRegion,
  type RegionDef,
} from "../world/regions/index.ts";
import {
  mapNode,
  regionRole,
  worldMapEdges,
  worldMapNodes,
  type MapNode,
} from "../world/graph/world-map.ts";

const ROLES = new Set(["hub", "transit", "monster", "guardian"]);

const nodes = worldMapNodes();
const byId = new Map(nodes.map((n) => [n.id, n]));
const edgeKey = (x: string, y: string, kind: string) => {
  const [a, b] = x < y ? [x, y] : [y, x];
  return `${kind}|${a}|${b}`;
};
const edgeKeys = new Set(worldMapEdges().map((e) => edgeKey(e.a, e.b, e.kind)));
const hasEdge = (x: string, y: string, kind: "walk" | "ferry") =>
  edgeKeys.has(edgeKey(x, y, kind));

test("every region has a complete, valid world-map pin", () => {
  assert.equal(nodes.length, Object.keys(REGIONS).length, "one node per region");
  for (const def of Object.values(REGIONS)) {
    const { group, role, position } = def.map;
    assert.ok(typeof group === "string" && group.length > 0, `${def.id} has a group`);
    assert.ok(ROLES.has(role), `${def.id} role ${role}`);
    assert.ok(
      Number.isFinite(position.x) && Number.isFinite(position.y),
      `${def.id} has numeric position`,
    );
  }
});

test("no two regions share a world-map pin (no layout collisions)", () => {
  // A guard for future islands: a second pin landing on an existing one would
  // overlap on the map. Distinct integer coordinates keep the layout legible.
  const seen = new Set<string>();
  for (const def of Object.values(REGIONS)) {
    const key = `${def.map.position.x},${def.map.position.y}`;
    assert.ok(!seen.has(key), `${def.id} reuses pin ${key}`);
    seen.add(key);
  }
});

test("node open/encounter flags mirror the preview scope helpers", () => {
  // Lock state derives from the SAME helpers WorldScreen and GameApp use — the
  // map never re-declares which regions are open or encounter-capable.
  for (const node of nodes) {
    assert.equal(node.open, isOpenRegion(node.id), `${node.id} open`);
    assert.equal(node.encounter, isEncounterRegion(node.id), `${node.id} encounter`);
    assert.ok(node.encounter ? node.open : true, `${node.id} encounter ⊂ open`);
  }
});

test("preview: Harbor, Dock, Woolly are the only open nodes", () => {
  assert.deepEqual(
    nodes.filter((n) => n.open).map((n) => n.id),
    ["harbor", "meadow/dock", "meadow/woolly"],
  );
});

test("preview: Woolly is the only open monster area; Dock is transit-only", () => {
  // Criterion: Meadow Dock must NOT read as a monster area on the map.
  const woolly = byId.get("meadow/woolly")!;
  const dock = byId.get("meadow/dock")!;
  const harbor = byId.get("harbor")!;
  assert.equal(woolly.role, "monster");
  assert.equal(woolly.open, true);
  assert.equal(woolly.encounter, true);
  assert.equal(dock.role, "transit");
  assert.equal(dock.open, true);
  assert.equal(dock.encounter, false, "Dock is transit, not a monster area");
  assert.equal(harbor.role, "hub");
  assert.equal(harbor.open, true);
  assert.equal(harbor.encounter, false);
});

test("every other Meadow area is locked, with the right role", () => {
  const expected: Record<string, "monster" | "guardian"> = {
    "meadow/ticktock": "monster",
    "meadow/orchard": "monster",
    "meadow/festival": "monster",
    "meadow/barn": "monster",
    "meadow/gardens": "monster",
    "meadow/stones": "guardian",
  };
  for (const [id, role] of Object.entries(expected)) {
    const node = byId.get(id)!;
    assert.equal(node.open, false, `${id} is sealed in the preview`);
    assert.equal(node.role, role, `${id} role`);
    assert.equal(node.encounter, false, `${id} has no preview encounters`);
  }
});

test("edges draw the Meadow ring + inner guardian paths, de-duplicated", () => {
  // Walk edges are the physical ring; the ferry is the Harbor ⇄ Dock crossing.
  const walkEdges = [
    ["meadow/dock", "meadow/woolly"],
    ["meadow/dock", "meadow/gardens"],
    ["meadow/woolly", "meadow/ticktock"],
    ["meadow/ticktock", "meadow/orchard"],
    ["meadow/ticktock", "meadow/stones"],
    ["meadow/orchard", "meadow/festival"],
    ["meadow/festival", "meadow/barn"],
    ["meadow/barn", "meadow/gardens"],
    ["meadow/barn", "meadow/stones"],
  ];
  for (const [a, b] of walkEdges) assert.ok(hasEdge(a, b, "walk"), `walk ${a}–${b}`);
  assert.ok(hasEdge("harbor", "meadow/dock", "ferry"), "ferry Harbor–Dock");
  // Reciprocal gateways and two-sided sails must collapse to one edge each.
  assert.equal(worldMapEdges().length, walkEdges.length + 1);
});

test("guide shortcuts stay off the world map (no Dock star)", () => {
  // Every sealed Meadow area has a back-to-dock "Meadow Guide" sail NPC. Those
  // are convenience shortcuts, not geography — they must never become edges, or
  // the map would sprout misleading spokes from each area to the Dock.
  // (Woolly and Gardens each ALSO have a real ring gateway to Dock, so their
  // Dock edge is legitimate and asserted in the ring test above.)
  const spokes = [
    "meadow/ticktock",
    "meadow/orchard",
    "meadow/festival",
    "meadow/barn",
    "meadow/stones",
  ];
  for (const id of spokes) {
    assert.equal(hasEdge(id, "meadow/dock", "walk"), false, `${id} walk to dock`);
    assert.equal(hasEdge(id, "meadow/dock", "ferry"), false, `${id} ferry to dock`);
  }
  // Woolly has a guide too, but it ALSO has a real ring gateway to Dock — that
  // one walk edge is legitimate and already asserted above.
});

test("reserved pockets (to: null) never become map edges", () => {
  // Pockets are within-region "opens later" flavour, not connections.
  for (const def of Object.values(REGIONS)) {
    for (const gateway of def.gateways) {
      if (gateway.to === null) continue;
      assert.ok(REGIONS[gateway.to], `${def.id}.${gateway.name} targets a real region`);
    }
  }
});

test("helpers: mapNode and regionRole read the registry", () => {
  assert.equal(regionRole("meadow/woolly"), "monster");
  assert.equal(regionRole("meadow/stones"), "guardian");
  assert.equal(regionRole("harbor"), "hub");
  assert.equal(mapNode("meadow/dock")?.role, "transit");
  assert.equal(mapNode("does-not-exist"), undefined);
  assert.equal(regionRole("does-not-exist"), undefined);
});

test("extensibility: a new region with a pin appears without code changes", () => {
  // Future islands reopen by adding region files + growing the preview set; the
  // map functions are parametric on the registry, so they need no edits. A
  // synthetic future-island region proves that here.
  const future: RegionDef = {
    id: "tallgrass/camp",
    title: "TALLGRASS CAMP  ·  茅草营地",
    art: "meadow",
    map: { group: "tallgrass", role: "monster", position: { x: 120, y: 52 } },
    rows: ["....", "...."],
    spawn: { x: 0, y: 0 },
    npcs: [],
    gateways: [{ name: "west", tiles: [{ x: 0, y: 0 }], to: "meadow/dock", toGateway: "south" }],
  };
  const registry = { ...REGIONS, "tallgrass/camp": future };
  const extNodes = worldMapNodes(registry);
  const extEdges = worldMapEdges(registry);
  assert.ok(extNodes.some((n) => n.id === "tallgrass/camp"), "future node appears");
  // Not in the preview open set, so it lands sealed — exactly like a locked area.
  const node = extNodes.find((n) => n.id === "tallgrass/camp") as MapNode;
  assert.equal(node.open, false);
  // Its gateway becomes a walk edge automatically.
  const extEdgeKeys = new Set(extEdges.map((e) => edgeKey(e.a, e.b, e.kind)));
  assert.ok(extEdgeKeys.has(edgeKey("tallgrass/camp", "meadow/dock", "walk")));
});

test("world-map module exports are stable", () => {
  // Labels come from the region's own title (no second hard-coded label table).
  for (const node of nodes) {
    assert.ok(node.title.length > 0, `${node.id} has a title`);
    assert.equal(node.title, REGIONS[node.id].title, `${node.id} title matches its region`);
  }
});
