// Harvest Barn & Mill: compact three-way farm junction around the barn door.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_BARN_ANCHORS = {
  landmark: { x: 9, y: 6 }, // central barn door
  garland: { from: { x: 5, y: 2 }, to: { x: 13, y: 2 } },
  flowerPots: [{ x: 8, y: 6 }, { x: 10, y: 6 }],
} as const;

export const MEADOW_BARN: RegionDef = {
  id: "meadow/barn",
  title: "HARVEST BARN & MILL  ·  丰收谷仓与磨坊",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 62, y: 24 } },
  rows: [
    "TTTTTTTTTpTTTTTTTTT",
    "T........p........T",
    "T.gggXXXXpXXXXggg.T",
    "T.gggX...p...Xggg.T",
    "T.gggX...p...Xggg.T",
    "T....X...p...X....T",
    "T....XXXXpXNXX....T",
    "ppppppppppppppppppp",
    "TN.............f..T",
    "T..gggg.....gggg..T",
    "T..ggggT....gggg..T",
    "T..gggg.....gggg..T",
    "T.................T",
    "TTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 7 },
  landmark: MEADOW_BARN_ANCHORS.landmark,
  npcs: [
    guide(1, 8, "characters/character_9/character09-sheet.png"),
    {
      x: 11,
      y: 6,
      name: "Miller Han 磨坊主韩师傅",
      message: "",
      characterSheet: "characters/character_10/character10-sheet.png",
      payoff: true,
    },
  ],
  payoff: {
    badge: "meadow-barn-helped",
    helps: 3,
    quest:
      "Harvest crates everywhere and my mill not dressed at all! Help 3 wild friends in the pastures, and I'll garland the barn for the festival. 丰收的谷仓还乱糟糟的！去草场帮助 3 只野生小伙伴答题，我就把谷仓装扮起来。",
    thanks:
      "The barn is garlanded and the mill is ready — measure by measure, you did it! 谷仓挂好了彩旗，磨坊也准备好了——都是你一份一份量出来的！",
    changedNotice:
      "Garlands rise over the Harvest Barn — the mill is festival-ready! 丰收谷仓挂起了彩旗——磨坊准备好过节了！",
  },
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/plumelet", weight: 45, rarity: "common" },
      { speciesId: "meadow/barnpup", weight: 30, rarity: "uncommon" },
      { speciesId: "meadow/pufftail", weight: 25, rarity: "common" },
    ],
  },
  gateways: [
    {
      name: "east",
      tiles: [{ x: 18, y: 7 }],
      to: "meadow/festival",
      toGateway: "west",
      arriveAt: { x: 17, y: 7 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 7 }],
      to: "meadow/gardens",
      toGateway: "east",
      arriveAt: { x: 1, y: 7 },
    },
    {
      name: "north",
      tiles: [{ x: 9, y: 0 }],
      to: "meadow/stones",
      toGateway: "south",
      arriveAt: { x: 9, y: 1 },
    },
  ],
};
