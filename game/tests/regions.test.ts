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
  // Regions without an arc yet keep the Woolly default, and the harbor
  // (never encounter-capable) defaults harmlessly too.
  assert.deepEqual(topicsForRegion("meadow/festival"), [DEFAULT_REGION_TOPIC]);
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

test("coverScale zooms small maps to cover 1280×720 and leaves large maps at 1", () => {
  const px = (def: RegionDef) => [regionW(def) * TILE, regionH(def) * TILE] as const;
  // Harbor (20×13 → 960×624 px) is smaller than the canvas on both axes:
  // zooms 4/3 so the width exactly fills 1280 (height becomes 832 and pans).
  assert.equal(coverScale(...px(REGIONS.harbor), 1280, 720), 4 / 3);
  // Meadow Dock (24×16 → 1152×768 px) covers vertically but not horizontally:
  // zooms 10/9 so the width exactly fills 1280.
  assert.equal(coverScale(...px(REGIONS["meadow/dock"]), 1280, 720), 10 / 9);
  // Woolly (32×24 → 1536×1152 px) already exceeds the canvas: untouched.
  assert.equal(coverScale(...px(REGIONS["meadow/woolly"]), 1280, 720), 1);
  // Any map larger than the canvas on both axes stays at exactly 1.
  assert.equal(coverScale(2000, 3000, 1280, 720), 1);
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
