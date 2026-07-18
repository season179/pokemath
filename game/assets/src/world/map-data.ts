// Harbor Town's logical tile map. Visuals are composed at runtime from the
// licensed Pocket Creature Tamer sheets; this data remains pure so movement,
// collision, and reachability can be tested without Cocos.
//
//   T = tree (blocked)
//   X = building footprint (blocked)
//   . = grass
//   p = path
//   b = beach
//   w = water (blocked)
//   d = dock
//   H = home door (heal)
//   P = professor's workshop
//   S = shop
//   N = NPC (blocked; bump/talk)
//   D = ferry edge

export const MAP: string[] = [
  "TTTTTTTTTTTTTTTTTTTT",
  "T.XXXX..XXXXX.XXXX.T",
  "T.XXXXT.XXXXX.XXXX.T",
  "T.XXXX..XXXXX.XXXX.T",
  "T...H.....P....S...T",
  "TT..p.....p....p..TT",
  "T.ppppNpppppppppNp.T",
  "T.........p.N......T",
  "T.T....T.dd..T...T.T",
  "bbbbbbbbbddbbbbbbbbb",
  "wwwwwwwwwddwwwwwwwww",
  "wwwwwwwwwddwwwwwwwww",
  "wwwwwwwwwDDwwwwwwwww",
];

export const TILE = 48;
export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;
export const PLAYER_SPAWN = { x: 10, y: 7 } as const;

const SOLID_TILES = new Set(["T", "X", "w", "N"]);

export function tileAt(x: number, y: number): string {
  if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) return "T";
  return MAP[y][x];
}

export function isWalkable(x: number, y: number): boolean {
  return !SOLID_TILES.has(tileAt(x, y));
}

export interface HarborNpc {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly message: string;
  readonly characterSheet: string;
}

export const HARBOR_NPCS: readonly HarborNpc[] = [
  {
    x: 6,
    y: 6,
    name: "Professor Sum",
    message: "Welcome to Harbor Town! Every great journey begins with one small answer.",
    characterSheet: "characters/character_02/character02-sheet.png",
  },
  {
    x: 12,
    y: 7,
    name: "Harbor Master",
    message: "The island ferries leave from the long dock. Meadow Isle is the first stop.",
    characterSheet: "characters/character_03/character03-sheet.png",
  },
  {
    x: 16,
    y: 6,
    name: "Mina",
    message: "I like watching the waves. There are no wild creatures inside Harbor Town.",
    characterSheet: "characters/character_4/character04-sheet.png",
  },
];

export function npcAt(x: number, y: number): HarborNpc | undefined {
  return HARBOR_NPCS.find((npc) => npc.x === x && npc.y === y);
}

export type Direction = "up" | "down" | "left" | "right";

export const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
