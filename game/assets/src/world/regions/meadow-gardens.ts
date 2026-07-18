// Pattern Gardens: shape and pattern beds on the ring's south-west.
// The south pocket is reserved for the Hidden Grove (original_dskp_extra).

import { POCKET_MESSAGE, guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_GARDENS: RegionDef = {
  id: "meadow/gardens",
  title: "PATTERN GARDENS  ·  图案花园",
  art: "meadow",
  rows: [
    "TTTTTTTTpTTTTTTTTTTTTTTTTTTTTT",
    "T.......p.N..................T",
    "T.......p....................T",
    "T...fffff....................T",
    "T...fffff.........ffffff.....T",
    "T...fffff.........ffffff.....T",
    "T.......p.........ffffff.....T",
    "T.......p....................T",
    "T...fffff....................T",
    "T...fffff.........ffffff.....T",
    "T...fffff.........ffffff.....T",
    "T.......p....................T",
    "T.......pppppppppppppppppppppp",
    "T..............p.............T",
    "T..............p.............T",
    "T..............p.............T",
    "T..............p.............T",
    "T..............p.............T",
    "T..............p.............T",
    "TTTTTTTTTTTTTTT.TTTTTTTTTTTTTT",
  ],
  spawn: { x: 8, y: 1 },
  npcs: [guide(10, 1, "characters/character_5/character05-sheet.png")],
  gateways: [
    {
      name: "north",
      tiles: [{ x: 8, y: 0 }],
      to: "meadow/dock",
      toGateway: "south",
      arriveAt: { x: 8, y: 1 },
    },
    {
      name: "east",
      tiles: [{ x: 29, y: 12 }],
      to: "meadow/barn",
      toGateway: "west",
      arriveAt: { x: 28, y: 12 },
    },
    // The Hidden Grove (original_dskp_extra) will open here one day.
    { name: "pocket-grove", tiles: [{ x: 15, y: 19 }], to: null, message: POCKET_MESSAGE },
  ],
};
