// Meadow Dock: where the ferry lands. West pier, ring road east to the
// Woolly Meadows and south to the Pattern Gardens.

import { POCKET_MESSAGE } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_DOCK: RegionDef = {
  id: "meadow/dock",
  title: "MEADOW DOCK  ·  青草码头",
  art: "meadow",
  map: { group: "meadow", role: "transit", position: { x: 28, y: 52 } },
  rows: [
    "TTTTTTTT..TTTTTTTTTTTTTT",
    "T.......p..............T",
    "T.......p...T..........T",
    "T.......p..............T",
    "wbb.....p.....f........T",
    "wbb.....p..............T",
    "wbb.....p.....T........T",
    "wbb.....p..............T",
    "wbb.....pppppppppppppppp",
    "wbb.....p...p..........T",
    "wbb.....p...p..........T",
    "wbb.....p...p..........T",
    "dddd.N..p...p..........T",
    "wbb.....p...p..........T",
    "wbb.....p...p..........T",
    "wbbTTTTTTTTTpTTTTTTTTTTT",
  ],
  spawn: { x: 2, y: 12 },
  npcs: [
    {
      x: 5,
      y: 12,
      name: "Captain Ro",
      message: "All aboard! Back to Harbor Town we go! 上船啦，回港湾镇！",
      characterSheet: "characters/character_10/character10-sheet.png",
      sailTo: "harbor",
      sailArrive: "ferry",
      sailKind: "ferry",
    },
  ],
  gateways: [
    { name: "ferry", tiles: [], to: null, arriveAt: { x: 2, y: 12 } },
    {
      name: "east",
      tiles: [{ x: 23, y: 8 }],
      to: "meadow/woolly",
      toGateway: "west",
      arriveAt: { x: 22, y: 8 },
    },
    {
      name: "south",
      tiles: [{ x: 12, y: 15 }],
      to: "meadow/gardens",
      toGateway: "north",
      arriveAt: { x: 12, y: 14 },
    },
    {
      name: "pocket-north",
      tiles: [{ x: 8, y: 0 }, { x: 9, y: 0 }],
      to: null,
      message: POCKET_MESSAGE,
    },
  ],
};
