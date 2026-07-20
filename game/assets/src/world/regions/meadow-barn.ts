// Harvest Barn & Mill: measures and halves/quarters, at the ring's south.
// M2B (issue #9): tall grass (`g`) in the pastures hosts the Barn's
// ordinary roster.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_BARN: RegionDef = {
  id: "meadow/barn",
  title: "HARVEST BARN & MILL  ·  丰收谷仓与磨坊",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 62, y: 24 } },
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
    "T.ggggg.......p..gggggg....T",
    "T.ggggg.......p..gggggg....T",
    "T........XXXXXXXXXXX.......T",
    "T........X.........X..XX...T",
    "T........X.........X..XX...T",
    "T........X.........X..XX...T",
    "T........X.........X.......T",
    "T........X.........X.......T",
    "T........XXXXXpXXXXX.......T",
    "T.............pN...........T",
    "pppppppppppppppppppppppppppp",
    "T....ggggg.................T",
    "T.N.fgggg...........T......T",
    "T....ggggg.................T",
    "T..........T...............T",
    "T................ggggg.....T",
    "T...............fggggg.....T",
    "T................ggggg.....T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 11 },
  npcs: [
    guide(2, 13, "characters/character_9/character09-sheet.png"),
    // The topic-arc payoff NPC (M5, #20): Miller Han by the barn door.
    {
      x: 15,
      y: 10,
      name: "Miller Han 磨坊主韩师傅",
      message: "", // payoff NPC — the dialog comes from `payoff` below
      characterSheet: "characters/character_10/character10-sheet.png",
      payoff: true,
    },
  ],
  // M5 topic arc (#20): the Barn serves non-standard measurement (4.5) and,
  // for the solid scavenger hunt, shares the space & shapes slice (4.6)
  // with the Pattern Gardens (routed in REGION_TOPICS, world/regions/index.ts).
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
  // M2B roster (issue #9): Plumelet roosts on the roof and Barnpup works the
  // farm; even here the barn mouse stays below the anchor pair. Weights sum
  // to 100 (percentages); membership and rarity match the MEADOW_HABITATS
  // rows for "meadow/barn" exactly.
  //   Plumelet (common) 45 · Barnpup (uncommon) 30 · Pufftail (common) 25
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
      tiles: [{ x: 27, y: 11 }],
      to: "meadow/festival",
      toGateway: "west",
      arriveAt: { x: 26, y: 11 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 11 }],
      to: "meadow/gardens",
      toGateway: "east",
      arriveAt: { x: 1, y: 11 },
    },
    {
      name: "north",
      tiles: [{ x: 14, y: 0 }],
      to: "meadow/stones",
      toGateway: "south",
      arriveAt: { x: 14, y: 1 },
    },
  ],
};
