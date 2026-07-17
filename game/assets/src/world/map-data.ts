// The overworld map. Ported from the prototype's map.js.
//   T = tree (blocks walking)
//   . = grass ground
//   p = path
//   G = tall grass (wild encounters)
//   H = home (stepping on it heals the team)
//   S = shop (stepping on it opens the shop)

export const MAP: string[] = [
  "TTTTTTTTTTTTTTTT",
  "T....GGG.......T",
  "T....GGG..TT...T",
  "T.Hpppppppppp..T",
  "T.p...T...GGG..T",
  "T.p...T...GGG..T",
  "T.p.......GGG..T",
  "T.ppppppS......T",
  "T....GG.p..TT..T",
  "T....GG.p......T",
  "T........ppppp.T",
  "TTTTTTTTTTTTTTTT",
];

export const TILE = 48;
export const MAP_W = MAP[0].length; // 16
export const MAP_H = MAP.length; // 12

const SOLID_TILES = new Set(["T"]);

export function tileAt(x: number, y: number): string {
  if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) return "T";
  return MAP[y][x];
}

export function isWalkable(x: number, y: number): boolean {
  return !SOLID_TILES.has(tileAt(x, y));
}

export type Direction = "up" | "down" | "left" | "right";

export const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
