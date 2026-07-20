// Harvest Festival Green: compact data-and-money plaza with optional grass margins.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_FESTIVAL_ANCHORS = {
  landmark: { x: 7, y: 8 }, // Festival Host Mei
  lanternStrings: [
    { row: 5, fromX: 6, toX: 12 },
    { row: 7, fromX: 6, toX: 12 },
    { row: 9, fromX: 6, toX: 12 },
  ],
} as const;

export const MEADOW_FESTIVAL: RegionDef = {
  id: "meadow/festival",
  title: "HARVEST FESTIVAL GREEN  ·  丰收节草地",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 86, y: 40 } },
  rows: [
    "TTTTTTTTTpTTTTTTTTT",
    "T.ggg....p........T",
    "T.ggg....p....ggg.T",
    "T.ggg....p....ggg.T",
    "T....XpppppppXggg.T",
    "T.....ppppppp.....T",
    "T.....ppppppp.....T",
    "ppppppppppppppppppp",
    "TN....pNppppp..f..T",
    "T.....ppppppp.....T",
    "T.gggXpppppppXggg.T",
    "T.gggg...p....ggg.T",
    "T.gggg...p....ggg.T",
    "TTTTTTTTT.TTTTTTTTT",
  ],
  spawn: { x: 9, y: 1 },
  landmark: MEADOW_FESTIVAL_ANCHORS.landmark,
  npcs: [
    guide(1, 8, "characters/character_8/character08-sheet.png"),
    {
      ...MEADOW_FESTIVAL_ANCHORS.landmark,
      name: "Festival Host Mei 丰收节主持人梅姐",
      message: "",
      characterSheet: "characters/character_6/character06-sheet.png",
      payoff: true,
    },
  ],
  payoff: {
    badge: "meadow-festival-helped",
    helps: 3,
    quest:
      "The harvest board is painted, but the Green is dark! Help 3 wild friends around the green, and we'll light every lantern. 丰收板画好了，草地却还暗着！去周围帮助 3 只野生小伙伴答题，我们就点亮所有灯笼。",
    thanks:
      "Every lantern is lit — count them if you like! The Green glows thanks to you. 灯笼全亮了——数一数也行！草地因你而亮。",
    changedNotice: "The festival lanterns light up the Green! 丰收节的灯笼点亮了草地！",
  },
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/pufftail", weight: 44, rarity: "common" },
      { speciesId: "woolly/fluffball", weight: 20, rarity: "common" },
      { speciesId: "meadow/mothling", weight: 14, rarity: "common" },
      { speciesId: "meadow/plumelet", weight: 14, rarity: "common" },
      { speciesId: "meadow/petalfae", weight: 8, rarity: "rare" },
    ],
  },
  gateways: [
    {
      name: "north",
      tiles: [{ x: 9, y: 0 }],
      to: "meadow/orchard",
      toGateway: "south",
      arriveAt: { x: 9, y: 1 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 7 }],
      to: "meadow/barn",
      toGateway: "east",
      arriveAt: { x: 1, y: 7 },
    },
    { name: "pocket-south", tiles: [{ x: 9, y: 13 }], to: null, message: POCKET_MESSAGE },
  ],
};
