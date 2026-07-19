// Woolly Meadows: fenced counting pens on the north-west stretch of the ring.
// The first area with wild encounters (preview, issue #8): tall grass (`g`)
// can start battles drawn from the ordinary Woolly roster below. No boss and
// no Unique appear here. Since M2B (#9) every Meadow monster region hosts its
// own table; this one stays exactly as the playtest shipped it.

import { guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_WOOLLY: RegionDef = {
  id: "meadow/woolly",
  title: "WOOLLY MEADOWS  ·  羊毛草原",
  art: "meadow",
  // Woolly Meadows (meadow-isle.md §2): counting country — whole numbers to
  // 100, comparing, ten-frame number bonds (#17 arc; its topic lives in REGION_TOPICS).
  map: { group: "meadow", role: "monster", position: { x: 44, y: 74 } },
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
    "T................N.......X.....T",
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
  npcs: [
    guide(2, 11, "characters/character_5/character05-sheet.png"),
    {
      // The broken-pen intention (#17): the shipped south pen has a gap in
      // its west wall (x 18, row 14); Fern stands watch beside it. Her
      // dialog is arc-driven (offer → progress → repaired + shortcut), and
      // rounding up the three wanderers mends the fence for good.
      x: 17,
      y: 14,
      name: "Shepherd Fern",
      message:
        "Oh no — the pen fence broke, and three little fluffballs wandered into the tall grass! 哎呀——羊圈的栅栏破了，三只小毛球跑进了草丛！",
      characterSheet: "characters/character_4/character04-sheet.png",
      arcId: "woolly-pen",
    },
  ],
  // Preview roster (M2A): three ordinary, catchable creatures. Weights sum to
  // 100 so they read as percentages — clear common / uncommon / rare rates.
  //   Fluffball (common) 65 · Balltail Hare (uncommon) 27 · Woolly Ram (rare) 8
  // Encounters fire only on the `g` tiles above, at the rate below per step,
  // and only when isEncounterRegion(this region) is true (the open-region
  // scope in regions/index.ts). Shipped in the kids playtest and deliberately
  // untouched by M2B: the habitat registry's woolly rows also list Pufftail,
  // making this live table a grandfathered subset of them.
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
