// Pattern Gardens: shape and pattern beds on the ring's south-west.
// The south pocket is reserved for the Hidden Grove (original_dskp_extra).
// M2B (issue #9): tall grass (`g`) among the beds hosts the Gardens'
// ordinary roster — the best place to meet the Mothling line.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_GARDENS: RegionDef = {
  id: "meadow/gardens",
  title: "PATTERN GARDENS  ·  图案花园",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 42, y: 34 } },
  rows: [
    "TTTTTTTTpTTTTTTTTTTTTTTTTTTTTT",
    "T.......p.N..................T",
    "T.......p....................T",
    "T...fffffggggg...............T",
    "T...fffffggggg....ffffff.....T",
    "T...fffffggggg....ffffff.....T",
    "T.......p........Nffffff.....T",
    "T.......p....................T",
    "T...fffffggggg...............T",
    "T...fffffggggg....ffffff.....T",
    "T...fffffggggg....ffffff.....T",
    "T.......p....................T",
    "T.......pppppppppppppppppppppp",
    "T..............p.ggggg.......T",
    "T..............p.ggggg.......T",
    "T..............p.ggggg.......T",
    "T.ggggg........p.............T",
    "T.ggggg........p.............T",
    "T.ggggg........p.............T",
    "TTTTTTTTTTTTTTT.TTTTTTTTTTTTTT",
  ],
  spawn: { x: 8, y: 1 },
  npcs: [
    guide(10, 1, "characters/character_5/character05-sheet.png"),
    // The topic-arc payoff NPC (M5, #20): Gardener Po tends the pattern
    // beds beside the east bed block.
    {
      x: 17,
      y: 6,
      name: "Gardener Po 园丁婆婆",
      message: "", // payoff NPC — the dialog comes from `payoff` below
      characterSheet: "characters/character_7/character07-sheet.png",
      payoff: true,
    },
  ],
  // M5 topic arc (#20): the Gardens serve space & shapes — 2D shapes and
  // repeating patterns (routed in REGION_TOPICS, world/regions/index.ts).
  payoff: {
    badge: "meadow-gardens-helped",
    helps: 3,
    quest:
      "The pattern beds lost their last row to the rain! Help 3 wild friends in the grass with their math, and my flowerbeds will bloom again. 花坛的最后一排被雨打乱了！去草丛里帮助 3 只野生小伙伴答题，花坛就会重新开满花。",
    thanks:
      "Look at the beds — every pattern in bloom! Thank you, little helper. 看这些花坛——每排图案都开满了！谢谢你，小帮手。",
    changedNotice:
      "The flowerbeds burst into bloom — every pattern complete! 花坛开满了花——每排图案都完成了！",
  },
  // M2B roster (issue #9): Mothling anchors the garden beds (the slate calls
  // this the best place to meet all three of its stages). Weights sum to 100
  // (percentages); membership and rarity match the MEADOW_HABITATS rows for
  // "meadow/gardens" exactly, with Pufftail below the area anchor.
  //   Mothling (common) 60 · Balltail Hare (uncommon) 25 · Pufftail (common) 15
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/mothling", weight: 60, rarity: "common" },
      { speciesId: "woolly/hare", weight: 25, rarity: "uncommon" },
      { speciesId: "meadow/pufftail", weight: 15, rarity: "common" },
    ],
  },
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
