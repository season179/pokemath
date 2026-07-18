// Harvest Barn & Mill: measures and halves/quarters, at the ring's south.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_BARN: RegionDef = {
  id: "meadow/barn",
  title: "HARVEST BARN & MILL  ·  丰收谷仓与磨坊",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 62, y: 24 } },
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
    "T.............p............T",
    "T.............p............T",
    "T........XXXXXXXXXXX.......T",
    "T........X.........X..XX...T",
    "T........X.........X..XX...T",
    "T........X.........X..XX...T",
    "T........X.........X.......T",
    "T........X.........X.......T",
    "T........XXXXXpXXXXX.......T",
    "T.............p............T",
    "pppppppppppppppppppppppppppp",
    "T..........................T",
    "T.N.f...............T......T",
    "T..........................T",
    "T..........T...............T",
    "T..........................T",
    "T...............f..........T",
    "T..........................T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 11 },
  npcs: [guide(2, 13, "characters/character_9/character09-sheet.png")],
  gateways: [
    {
      name: "east",
      tiles: [{ x: 27, y: 11 }],
      to: "meadow/festival",
      toGateway: "west",
      arriveAt: { x: 26, y: 11 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 11 }],
      to: "meadow/gardens",
      toGateway: "east",
      arriveAt: { x: 1, y: 11 },
    },
    {
      name: "north",
      tiles: [{ x: 14, y: 0 }],
      to: "meadow/stones",
      toGateway: "south",
      arriveAt: { x: 14, y: 1 },
    },
  ],
};
