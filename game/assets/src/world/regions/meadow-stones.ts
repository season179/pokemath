// The Hundred Stones: compact guardian ground at the island's center.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_STONES_ANCHORS = {
  landmark: { x: 8, y: 2 }, // Keeper Yun
  guardian: { x: 9, y: 6 },
} as const;

export const MEADOW_STONES: RegionDef = {
  id: "meadow/stones",
  title: "THE HUNDRED STONES  ·  百石原",
  art: "meadow",
  map: { group: "meadow", role: "guardian", position: { x: 62, y: 52 } },
  rows: [
    "TTTTTTTTTpTTTTTTTTT",
    "T........p........T",
    "T......NNp........T",
    "T...o....p....o...T",
    "T..o.o...p...o.o..T",
    "T...o....p....o...T",
    "T........p........T",
    "T.....o.op..o.....T",
    "T....o.o.p.o.o....T",
    "T.gggg...p...gggg.T",
    "T.ggggf..p...gggg.T",
    "T.gggg...p...gggg.T",
    "TTTTTTTTTpTTTTTTTTT",
  ],
  spawn: { x: 9, y: 1 },
  landmark: MEADOW_STONES_ANCHORS.landmark,
  npcs: [
    guide(7, 2, "characters/character_6/character06-sheet.png"),
    {
      ...MEADOW_STONES_ANCHORS.landmark,
      name: "Keeper Yun 阿云",
      message: "",
      characterSheet: "characters/character_10/character10-sheet.png",
      arcId: "cloudmane-trail",
    },
  ],
  encounters: {
    rate: 0.2,
    entries: [{ speciesId: "woolly/ram", weight: 100, rarity: "rare" }],
  },
  gateways: [
    {
      name: "north",
      tiles: [{ x: 9, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "south",
      arriveAt: { x: 9, y: 1 },
    },
    {
      name: "south",
      tiles: [{ x: 9, y: 12 }],
      to: "meadow/barn",
      toGateway: "north",
      arriveAt: { x: 9, y: 11 },
    },
  ],
};
