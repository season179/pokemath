// Harvest Festival Green: money and data, around a plaza of stalls.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_FESTIVAL: RegionDef = {
  id: "meadow/festival",
  title: "HARVEST FESTIVAL GREEN  ·  丰收节草地",
  art: "meadow",
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
    "T.............p............T",
    "T.............p............T",
    "T.............p............T",
    "T.............p............T",
    "T.............p............T",
    "T.......XX........XX.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "ppppppppppppppppppp........T",
    "T.N........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T.......XX........XX.......T",
    "T.............p............T",
    "T.............p............T",
    "T.............p.....f......T",
    "T.............p............T",
    "TTTTTTTTTTTTTT.TTTTTTTTTTTTT",
  ],
  spawn: { x: 14, y: 1 },
  npcs: [guide(2, 11, "characters/character_8/character08-sheet.png")],
  gateways: [
    {
      name: "north",
      tiles: [{ x: 14, y: 0 }],
      to: "meadow/orchard",
      toGateway: "south",
      arriveAt: { x: 14, y: 1 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 10 }],
      to: "meadow/barn",
      toGateway: "east",
      arriveAt: { x: 1, y: 10 },
    },
    { name: "pocket-south", tiles: [{ x: 14, y: 19 }], to: null, message: POCKET_MESSAGE },
  ],
};
