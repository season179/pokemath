// Ticktock Knoll: a compact three-way junction around the working clock post.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_TICKTOCK_ANCHORS = {
  landmark: { x: 9, y: 4 },
  trailClue: { x: 9, y: 7 },
} as const;

export const MEADOW_TICKTOCK: RegionDef = {
  id: "meadow/ticktock",
  title: "TICKTOCK KNOLL  ·  滴答山丘",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 62, y: 82 } },
  rows: [
    "TTTTTTTTTTTTTTTTTTT",
    "T.ggg.............T",
    "T.ggg....o........T",
    "T.ggg...o.o...T...T",
    "T......o.C.o......T",
    "T.......opo.......T",
    "ppppppppppppppppppp",
    "TN.......p........T",
    "T........p.....f..T",
    "T.gggg...p...gggg.T",
    "T.gggg...p...gggg.T",
    "T.gggg...p...gggg.T",
    "T........p........T",
    "TTTTTTTTTpTTTTTTTTT",
  ],
  spawn: { x: 1, y: 6 },
  landmark: MEADOW_TICKTOCK_ANCHORS.landmark,
  npcs: [guide(1, 7, "characters/character_6/character06-sheet.png")],
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/owlet", weight: 40, rarity: "uncommon" },
      { speciesId: "meadow/pufftail", weight: 35, rarity: "common" },
      { speciesId: "meadow/blossomfox", weight: 25, rarity: "uncommon" },
    ],
  },
  gateways: [
    {
      name: "west",
      tiles: [{ x: 0, y: 6 }],
      to: "meadow/woolly",
      toGateway: "north",
      arriveAt: { x: 1, y: 6 },
    },
    {
      name: "east",
      tiles: [{ x: 18, y: 6 }],
      to: "meadow/orchard",
      toGateway: "north",
      arriveAt: { x: 17, y: 6 },
    },
    {
      name: "south",
      tiles: [{ x: 9, y: 13 }],
      to: "meadow/stones",
      toGateway: "north",
      arriveAt: { x: 9, y: 12 },
    },
  ],
};
