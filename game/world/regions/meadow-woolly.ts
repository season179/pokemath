// Woolly Meadows: fenced counting pens on the north-west stretch of the ring.

import { guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_WOOLLY: RegionDef = {
  id: "meadow/woolly",
  title: "WOOLLY MEADOWS  ·  羊毛草原",
  art: "meadow",
  rows: [
    "TTTTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
    "T...............p..............T",
    "T...f...........p.......T......T",
    "T...............p..............T",
    "T....XXXXXXX....p..............T",
    "T....X.....X....p..............T",
    "T....X.....X....p.........f....T",
    "T....X.....X....p..............T",
    "T....X.....X....p........T.....T",
    "T....XXX.XXX....p..............T",
    "ppppppppppppppppp..............T",
    "T.N............................T",
    "T.................XXXXXXXX.....T",
    "T.................X......X.....T",
    "T........................X.....T",
    "T.................X......X.....T",
    "T.................X......X.....T",
    "T.................XXXXXXXX.....T",
    "T..............................T",
    "T......................f.......T",
    "T..............................T",
    "T..........T...................T",
    "T..............................T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 10 },
  npcs: [guide(2, 11, "characters/character_05/character05-sheet.png")],
  gateways: [
    {
      name: "west",
      tiles: [{ x: 0, y: 10 }],
      to: "meadow/dock",
      toGateway: "east",
      arriveAt: { x: 1, y: 10 },
    },
    {
      name: "north",
      tiles: [{ x: 16, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "west",
      arriveAt: { x: 16, y: 1 },
    },
  ],
};
