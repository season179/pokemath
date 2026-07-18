// Shared region types and pure helpers. Regions are tile maps with stable
// LOCAL coordinates — a region file is never resized after it ships, so
// saved positions, gateways, and NPCs never shift.
//
//   T = tree (blocked)        X = fence/building (blocked)
//   . = grass                 p = path
//   b = beach                 w = water (blocked)
//   d/D = boardwalk/pier      f = flowers (walkable decoration)
//   o = stone (blocked)       C = clock post (blocked)
//   N = NPC marker (blocked; bump/talk)
//   H = home door (heal)      P = workshop          S = shop

export const TILE = 48;

const SOLID_TILES = new Set(["T", "X", "w", "N", "o", "C"]);

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
}

export type TileHandler = "heal" | "shop" | "workshop";

export interface RegionDef {
  readonly id: string;
  /** Bilingual banner shown on arrival. */
  readonly title: string;
  /** Art pipeline: Harbor keeps its bespoke composition; meadow is char-driven. */
  readonly art: "harbor" | "meadow";
  readonly rows: readonly string[];
  readonly spawn: { readonly x: number; readonly y: number };
  readonly npcs: readonly NpcDef[];
  readonly gateways: readonly GatewayDef[];
  readonly handlers?: Partial<Record<string, TileHandler>>;
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
