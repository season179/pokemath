// Pattern Gardens: compact flowerbeds and encounter patches on the south-west loop.

import { POCKET_MESSAGE, guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_GARDENS_ANCHORS = {
  landmark: { x: 13, y: 5 }, // Gardener Po beside the pattern beds
  trailClue: { x: 5, y: 4 },
} as const;

export const MEADOW_GARDENS: RegionDef = {
  id: "meadow/gardens",
  title: "PATTERN GARDENS  ·  图案花园",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 42, y: 34 } },
  rows: [
    "TTTTTTTTpTTTTTTTTTTT",
    "T.......p.N........T",
    "T.fffff.p...ffffff.T",
    "T.fffff.p...ffffff.T",
    "T.fffffXp...ffffff.T",
    "T..gggg.p...gNgg...T",
    "T..gggg.p...gggg...T",
    "T.......pppppppppppp",
    "T.........p........T",
    "T.fffff...p..fffff.T",
    "T.fffff...p..fffff.T",
    "T.fffff...p..fffff.T",
    "T..gggg...p..gggg..T",
    "T..gggg...p..gggg..T",
    "TTTTTTTTTT.TTTTTTTTT",
  ],
  spawn: { x: 8, y: 1 },
  landmark: MEADOW_GARDENS_ANCHORS.landmark,
  npcs: [
    guide(10, 1, "characters/character_5/character05-sheet.png"),
    {
      ...MEADOW_GARDENS_ANCHORS.landmark,
      name: "Gardener Po 园丁婆婆",
      message: "",
      characterSheet: "characters/character_7/character07-sheet.png",
      payoff: true,
    },
  ],
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
      tiles: [{ x: 19, y: 7 }],
      to: "meadow/barn",
      toGateway: "west",
      arriveAt: { x: 18, y: 7 },
    },
    { name: "pocket-grove", tiles: [{ x: 10, y: 14 }], to: null, message: POCKET_MESSAGE },
  ],
};
