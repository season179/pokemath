// Woolly Meadows: fenced counting pens on the north-west stretch of the ring.
// The first area with wild encounters (preview, issue #8): tall grass (`g`)
// can start battles drawn from the ordinary Woolly roster below. No boss and
// no Unique appear here.

import { guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_WOOLLY: RegionDef = {
  id: "meadow/woolly",
  title: "WOOLLY MEADOWS  ·  羊毛草原",
  art: "meadow",
  rows: [
    "TTTTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
    "T..gg...........p..gggg........T",
    "T...f...........p..gggg.T......T",
    "T..gg...........p..gggg........T",
    "T....XXXXXXX....p..............T",
    "T....X.....X....p..gggg........T",
    "T....X.....X....p.........f....T",
    "T....X.....X....p..gggg........T",
    "T....X.....X....p........T.....T",
    "T....XXX.XXX....p..............T",
    "ppppppppppppppppp..............T",
    "T.N.................ggggggggg..T",
    "T.................XXXXXXXX.....T",
    "T.................X......X.....T",
    "T........................X.....T",
    "T.................X......X.....T",
    "T.................X......X.....T",
    "T.................XXXXXXXX.....T",
    "T.....gggggg...................T",
    "T............gggggggg..f.......T",
    "T....................ggggggg...T",
    "T..........T...................T",
    "T....gggggggggg................T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 10 },
  npcs: [guide(2, 11, "characters/character_5/character05-sheet.png")],
  // Preview roster (M2A): three ordinary, catchable creatures. Weights sum to
  // 100 so they read as percentages — clear common / uncommon / rare rates.
  //   Fluffball (common) 65 · Balltail Hare (uncommon) 27 · Woolly Ram (rare) 8
  // Encounters fire only on the `g` tiles above, at the rate below per step,
  // and only when isEncounterRegion(this region) is true (the #29 preview gate).
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "woolly/fluffball", weight: 65, rarity: "common" },
      { speciesId: "woolly/hare", weight: 27, rarity: "uncommon" },
      { speciesId: "woolly/ram", weight: 8, rarity: "rare" },
    ],
  },
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
