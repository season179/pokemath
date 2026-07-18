// Ticktock Knoll: the clock post on a stone-ringed rise, due north.

import { guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_TICKTOCK: RegionDef = {
  id: "meadow/ticktock",
  title: "TICKTOCK KNOLL  ·  滴答山丘",
  art: "meadow",
  rows: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T..........................T",
    "T....f.............T.......T",
    "T...........ooooo..........T",
    "T..........o..C..o.........T",
    "T..........o.....o.........T",
    "T...........ooooo..........T",
    "T.............p............T",
    "pppppppppppppppppppppppppppp",
    "T.N...........p............T",
    "T.............p.....f......T",
    "T.............p............T",
    "T..T..........p............T",
    "T.............p............T",
    "T.............p....T.......T",
    "T.............p............T",
    "T.......f.....p............T",
    "T.............p............T",
    "T.............p............T",
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 8 },
  npcs: [guide(2, 9, "characters/character_06/character06-sheet.png")],
  gateways: [
    {
      name: "west",
      tiles: [{ x: 0, y: 8 }],
      to: "meadow/woolly",
      toGateway: "north",
      arriveAt: { x: 1, y: 8 },
    },
    {
      name: "east",
      tiles: [{ x: 27, y: 8 }],
      to: "meadow/orchard",
      toGateway: "north",
      arriveAt: { x: 26, y: 8 },
    },
    {
      name: "south",
      tiles: [{ x: 14, y: 19 }],
      to: "meadow/stones",
      toGateway: "north",
      arriveAt: { x: 14, y: 18 },
    },
  ],
};
