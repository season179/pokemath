// Appledore Orchard: compact tree rows around the arithmetic path and fruit stand.

import { POCKET_MESSAGE, guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_ORCHARD_ANCHORS = {
  landmark: { x: 7, y: 8 }, // Fruit-Stand Keeper
  trailClue: { x: 5, y: 11 },
} as const;

export const MEADOW_ORCHARD: RegionDef = {
  id: "meadow/orchard",
  title: "APPLEDORE ORCHARD  ·  苹果园",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 84, y: 70 } },
  rows: [
    "TTTTTTTTTTpTTTTTTTTT",
    "T.........p.N......T",
    "T.........p........T",
    "T.T..T..T.p..T..T..T",
    "T.gggg....p..gggg..T",
    "T.gggg...Xp..gggg..T",
    "Tpppppppppp........T",
    ".p.XXXX...p........T",
    "T..X..XN..p..gggg..T",
    "T..X..X...p..gggg..T",
    "T..XX.X...p........T",
    "T.T....gggp..T..T..T",
    "T......gggp........T",
    "T......gggp........T",
    "TTTTTTTTTTpTTTTTTTTT",
  ],
  spawn: { x: 10, y: 1 },
  landmark: MEADOW_ORCHARD_ANCHORS.landmark,
  npcs: [
    guide(12, 1, "characters/character_7/character07-sheet.png"),
    {
      ...MEADOW_ORCHARD_ANCHORS.landmark,
      name: "Fruit-Stand Keeper",
      message:
        "You've counted every apple and every sen — the fruit stand is ready for the harvest! The Harvest Festival Green is just south; visit anytime. 你数清了苹果，也算清了钱——水果摊准备好啦！丰收节草地就在南边，想去就去看看吧。",
      characterSheet: "characters/character_8/character08-sheet.png",
    },
  ],
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/plumelet", weight: 60, rarity: "common" },
      { speciesId: "meadow/blossomfox", weight: 25, rarity: "uncommon" },
      { speciesId: "meadow/pufftail", weight: 15, rarity: "common" },
    ],
  },
  gateways: [
    {
      name: "north",
      tiles: [{ x: 10, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "east",
      arriveAt: { x: 10, y: 1 },
    },
    {
      name: "south",
      tiles: [{ x: 10, y: 14 }],
      to: "meadow/festival",
      toGateway: "north",
      arriveAt: { x: 10, y: 13 },
    },
    { name: "pocket-west", tiles: [{ x: 0, y: 7 }], to: null, message: POCKET_MESSAGE },
  ],
};
