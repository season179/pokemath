// Shared region types and pure helpers. Regions are tile maps with stable
// LOCAL coordinates — a region file is never resized after it ships, so
// saved positions, gateways, and NPCs never shift.
//
//   T = tree (blocked)        X = fence/building (blocked)
//   . = grass                 p = path
//   g = tall grass (walkable; triggers wild encounters in regions that have an encounter table)
//   b = beach                 w = water (blocked)
//   d/D = boardwalk/pier      f = flowers (walkable decoration)
//   o = stone (blocked)       C = clock post (blocked)
//   N = NPC marker (blocked; bump/talk)
//   H = home door (heal)      P = workshop          S = shop
//
// Tile edits stay within the shipped grid: a region is never resized, so
// swapping `.`/`f` for `g` (M2B) must replace characters in place — never
// insert — or saved positions, gateways, and the mini-map shift.

export const TILE = 48;

const SOLID_TILES = new Set(["T", "X", "w", "N", "o", "C"]);

// Walkable tiles that can start a wild encounter. Only regions that also
// declare an `encounters` table actually trigger battles (see WorldScreen).
const ENCOUNTER_TILES = new Set(["g"]);

export type Direction = "up" | "down" | "left" | "right";

export const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface GatewayDef {
  readonly name: string;
  /** Local tiles that trigger this gateway on arrival. Empty = arrival-only. */
  readonly tiles: readonly { readonly x: number; readonly y: number }[];
  /** Target region id, or null for a not-yet-open expansion pocket. */
  readonly to: string | null;
  /** Gateway name to arrive through in the target region. */
  readonly toGateway?: string;
  /** Where travellers arriving THROUGH this gateway appear (local coords). */
  readonly arriveAt?: { readonly x: number; readonly y: number };
  /** Shown when a pocket gateway is stepped on before it opens. */
  readonly message?: string;
}

export interface NpcDef {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly message: string;
  readonly characterSheet: string;
  /** If set, dismissing the dialog travels to this region… */
  readonly sailTo?: string;
  /** …arriving through this named gateway there. */
  readonly sailArrive?: string;
  /**
   * Map-graph role of this NPC's travel offer. "ferry" edges are core island
   * geography and show on the world map (e.g. Harbor ⇄ Dock captains);
   * "shortcut" edges are convenience guides (the back-to-dock Meadow Guides)
   * and stay hidden so the world map draws the real ring, not a Dock star.
   */
  readonly sailKind?: "ferry" | "shortcut";
  /**
   * If set, dismissing this NPC's dialog opens a full screen instead of
   * just closing the banner (the Harbor Sanctuary keeper, issue #5).
   */
  readonly opens?: "sanctuary";
}

export type TileHandler = "heal" | "shop" | "workshop";

// Wild-encounter roster for a region. Every Meadow monster region declares
// one (M2B, issue #9); Meadow Dock stays transit-only and the Harbor stays
// peaceful, so neither declares a table. Entries reference species by stable
// semantic id (resolved through shared/encounters' SPECIES_BY_ID), so region
// data never imports Species objects. `weight` drives selection; `rarity` is
// a human-readable label so the common/uncommon/rare split is verifiable
// directly from the map data.
export type Rarity = "common" | "uncommon" | "rare";

export interface EncounterEntry {
  readonly speciesId: string;
  readonly weight: number;
  readonly rarity: Rarity;
}

export interface EncounterTable {
  /** Probability of an encounter each time the player enters a tall-grass tile. */
  readonly rate: number;
  readonly entries: readonly EncounterEntry[];
}

/**
 * Which island/hub cluster a region belongs to on the world map. Open-ended:
 * the known clusters are listed for autocomplete, but a future island simply
 * uses its own value ("tallgrass", "tidepool", …) — no map code needs to change
 * to accept it. Contrast MapRole below, which is a closed semantic set.
 */
export type MapGroup = "harbor" | "meadow" | (string & {});

/**
 * Semantic role of a region on the maps. Drives the world-map icon and lock
 * caption, and the mini-map's exit styling. "monster" marks ordinary creature
 * areas; "guardian" marks a boss ground; "transit" is open infrastructure that
 * is never a monster area (Meadow Dock); "hub" is the peaceful home town.
 */
export type MapRole = "hub" | "transit" | "monster" | "guardian";

/**
 * World-map descriptor. The ONLY authored geography beyond the tile grid:
 * every region carries its own pin so the map derives from the region registry
 * (one geography) rather than a second hard-coded layout. Positions are in a
 * shared abstract map space (x right, y up); the renderer scales them.
 */
export interface RegionMapDef {
  readonly group: MapGroup;
  readonly role: MapRole;
  readonly position: { readonly x: number; readonly y: number };
}

export interface RegionDef {
  readonly id: string;
  /** Bilingual name shown on the persistent location plate, mini-map, and world map. */
  readonly title: string;
  /** Art pipeline: Harbor keeps its bespoke composition; meadow is char-driven. */
  readonly art: "harbor" | "meadow";
  /** World-map pin. Required so no region can ship without appearing on the map. */
  readonly map: RegionMapDef;
  readonly rows: readonly string[];
  readonly spawn: { readonly x: number; readonly y: number };
  readonly npcs: readonly NpcDef[];
  readonly gateways: readonly GatewayDef[];
  readonly handlers?: Partial<Record<string, TileHandler>>;
  /** If present, tall-grass (`g`) tiles in this region can start wild battles. */
  readonly encounters?: EncounterTable;
}

export function regionW(def: RegionDef): number {
  return def.rows[0]?.length ?? 0;
}

export function regionH(def: RegionDef): number {
  return def.rows.length;
}

export function tileAt(def: RegionDef, x: number, y: number): string {
  if (y < 0 || y >= def.rows.length || x < 0 || x >= regionW(def)) return "T";
  return def.rows[y][x];
}

export function isWalkable(def: RegionDef, x: number, y: number): boolean {
  return !SOLID_TILES.has(tileAt(def, x, y));
}

export function isEncounterTile(def: RegionDef, x: number, y: number): boolean {
  return ENCOUNTER_TILES.has(tileAt(def, x, y));
}

export function npcAt(def: RegionDef, x: number, y: number): NpcDef | undefined {
  return def.npcs.find((npc) => npc.x === x && npc.y === y);
}

export function gatewayAt(def: RegionDef, x: number, y: number): GatewayDef | undefined {
  return def.gateways.find((g) => g.tiles.some((t) => t.x === x && t.y === y));
}

export function gatewayNamed(def: RegionDef, name: string): GatewayDef | undefined {
  return def.gateways.find((g) => g.name === name);
}

/**
 * Camera offset for a map axis: keep the player centered, but never scroll
 * the map past its own edges (maps smaller than the canvas stay centered).
 */
export function camOffset(playerPx: number, mapPx: number, canvasPx: number): number {
  if (mapPx <= canvasPx) return -mapPx / 2;
  const min = canvasPx / 2 - mapPx;
  const max = -canvasPx / 2;
  return Math.min(max, Math.max(min, -playerPx));
}

/** Smallest uniform scale ≥ 1 at which the map covers the whole canvas. */
export function coverScale(mapW: number, mapH: number, canvasW: number, canvasH: number): number {
  return Math.max(1, canvasW / mapW, canvasH / mapH);
}
