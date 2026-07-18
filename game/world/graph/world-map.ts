// World-map graph: a pure view over the region registry. The maps (#30) draw
// ONE geography — the regions themselves — so this module owns no second map.
//
//   nodes       ← every region's `map` pin (label/role/position come from the
//                 region; open/encounter come from the preview scope helpers).
//   edges       ← physical gateways (the Meadow ring) plus ferry sails; the
//                 back-to-dock "shortcut" guides are deliberately hidden so
//                 the map shows the island's real shape, not a Dock star.
//   lock state  ← isOpenRegion / isEncounterRegion (the same helpers
//                 WorldScreen and GameApp use to seal the preview).
//
// This directory holds the pure (Node-runnable, no Cocos) world modules; the
// sync script mirrors it into game/assets/src/world/graph/ for the game build.
// A dedicated mirror dir keeps the sync deletion-safe, like regions/.
//
// Adding a future island or reopening a sealed area needs no change here: a new
// region file carrying its own pin appears as a node, and growing the preview
// open set flips that node's `open` flag. The functions take an optional
// registry so the tests can prove that parametrically.

import {
  REGIONS,
  isEncounterRegion,
  isOpenRegion,
  type MapRole,
  type RegionDef,
} from "../regions/index.ts";

export type { MapRole } from "../regions/index.ts";

export interface MapNode {
  readonly id: string;
  /** Full bilingual title (the region's own banner). */
  readonly title: string;
  readonly group: RegionDef["map"]["group"];
  readonly role: MapRole;
  readonly position: { readonly x: number; readonly y: number };
  /** Reachable in the current preview scope. */
  readonly open: boolean;
  /** Encounter-capable in the current preview scope (a strict subset of open). */
  readonly encounter: boolean;
}

export type MapEdgeKind = "walk" | "ferry";

export interface MapEdge {
  readonly a: string;
  readonly b: string;
  readonly kind: MapEdgeKind;
}

type RegionMap = Record<string, RegionDef>;

/** Every region as a world-map node, in stable registry order. */
export function worldMapNodes(regions: RegionMap = REGIONS): MapNode[] {
  return Object.values(regions).map(toNode);
}

/** The map-visible connections between regions, de-duplicated. */
export function worldMapEdges(regions: RegionMap = REGIONS): MapEdge[] {
  const seen = new Set<string>();
  const edges: MapEdge[] = [];
  const add = (a: string, b: string, kind: MapEdgeKind) => {
    // Gateways are declared symmetrically (A→B and B→A); sails are declared on
    // both endpoints too. Canonicalise by sorted endpoints within each kind so
    // a connection renders as one line.
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const key = `${kind}|${lo}|${hi}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a: lo, b: hi, kind });
  };

  for (const def of Object.values(regions)) {
    // Physical gateways are the island's ring geography — always visible.
    for (const gateway of def.gateways) {
      if (gateway.to !== null) add(def.id, gateway.to, "walk");
    }
    // Only ferry sails are map geography; guide shortcuts are a convenience
    // mechanic, not a route, so they stay off the world map.
    for (const npc of def.npcs) {
      if (npc.sailTo && npc.sailKind === "ferry") add(def.id, npc.sailTo, "ferry");
    }
  }
  return edges;
}

/** A single region's node, or undefined when it has no map pin / is unknown. */
export function mapNode(id: string, regions: RegionMap = REGIONS): MapNode | undefined {
  const def = regions[id];
  return def ? toNode(def) : undefined;
}

/** The declared role of a region on the maps (hub / transit / monster / guardian). */
export function regionRole(id: string, regions: RegionMap = REGIONS): MapRole | undefined {
  return regions[id]?.map.role;
}

function toNode(def: RegionDef): MapNode {
  return {
    id: def.id,
    title: def.title,
    group: def.map.group,
    role: def.map.role,
    position: def.map.position,
    open: isOpenRegion(def.id),
    encounter: isEncounterRegion(def.id),
  };
}
