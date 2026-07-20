// Woolly Meadows: compact counting pens on the north-west stretch of the ring.
// The kid-tested encounter table is unchanged; only traversal and authored
// coordinates move. Arc anchors live here beside the fence and grass they use.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_WOOLLY_ANCHORS = {
  landmark: { x: 9, y: 6 }, // the ten-pen beside the route junction
  penGap: { x: 14, y: 10 },
  wandererSpots: [
    { x: 5, y: 10 },
    { x: 9, y: 13 },
    { x: 18, y: 14 },
  ],
  flockSpots: [
    { x: 16, y: 9 },
    { x: 18, y: 10 },
    { x: 17, y: 11 },
    { x: 19, y: 12 },
  ],
} as const;

export const MEADOW_WOOLLY: RegionDef = {
  id: "meadow/woolly",
  title: "WOOLLY MEADOWS  ·  羊毛草原",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 44, y: 74 } },
  rows: [
    "TTTTTTTTTTTpTTTTTTTTTTTT",
    "T..........p...........T",
    "T..XXXXXXX.p...gggg....T",
    "T..Xf....X.p...gggg....T",
    "T..X.....X.p...gggg....T",
    "T..X.....X.p..........TT",
    "T..XXX.XXX.p...........T",
    "ppppppppppppp..........T",
    "T.N...........XXXXXXXX.T",
    "T.............X......X.T",
    "T...ggggg....N.......X.T",
    "T...ggggg.....X......X.T",
    "T...ggggggggg.X......X.T",
    "T........gggg.XXXXXXXX.T",
    "T........gggg....gggg..T",
    "TTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 7 },
  landmark: MEADOW_WOOLLY_ANCHORS.landmark,
  npcs: [
    guide(2, 8, "characters/character_5/character05-sheet.png"),
    {
      x: 13,
      y: 10,
      name: "Shepherd Fern",
      message:
        "Oh no — the pen fence broke, and three little fluffballs wandered into the tall grass! 哎呀——羊圈的栅栏破了，三只小毛球跑进了草丛！",
      characterSheet: "characters/character_4/character04-sheet.png",
      arcId: "woolly-pen",
    },
  ],
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
      tiles: [{ x: 0, y: 7 }],
      to: "meadow/dock",
      toGateway: "east",
      arriveAt: { x: 1, y: 7 },
    },
    {
      name: "north",
      tiles: [{ x: 11, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "west",
      arriveAt: { x: 11, y: 1 },
    },
  ],
};
