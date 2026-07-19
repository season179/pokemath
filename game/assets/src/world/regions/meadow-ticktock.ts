// Ticktock Knoll: the clock post on a stone-ringed rise, due north.
// M2B (issue #9): tall grass (`g`) hosts the Knoll's ordinary roster — the
// owl keeper's friends gather here, so this is deliberately uncommon-majority
// country (catch difficulty is HP-based and uniform everywhere; rarity is
// flavour and collection pacing, never a wall).

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_TICKTOCK: RegionDef = {
  id: "meadow/ticktock",
  title: "TICKTOCK KNOLL  ·  滴答山丘",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 62, y: 82 } },
  rows: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T.ggg......................T",
    "T.gggf.............T.......T",
    "T...........ooooo..........T",
    "T..........o..C..o.........T",
    "T..........o.....o.........T",
    "T...........ooooo..........T",
    "T.............p............T",
    "pppppppppppppppppppppppppppp",
    "T.N...........p............T",
    "T.gggg........p.....f......T",
    "T.gggg........p............T",
    "T..T..........p............T",
    "T.............p............T",
    "T.............p....T.......T",
    "T.............p............T",
    "T.......f.....p..ggggg.....T",
    "T.............p..ggggg.....T",
    "T.............p..ggggg.....T",
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
  ],
  spawn: { x: 1, y: 8 },
  npcs: [guide(2, 9, "characters/character_6/character06-sheet.png")],
  // M2B roster (issue #9): the tower is Owlet country — the island's one
  // uncommon-majority table, so the mascot line is genuinely findable here.
  // Weights sum to 100 (percentages); membership and rarity match the
  // MEADOW_HABITATS rows for "meadow/ticktock" exactly, and Pufftail (the
  // island-wide background mouse) sits below the area anchor as the slate
  // requires.
  //   Owlet (uncommon) 40 · Pufftail (common) 35 · Blossomfox (uncommon) 25
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
      tiles: [{ x: 0, y: 8 }],
      to: "meadow/woolly",
      toGateway: "north",
      arriveAt: { x: 1, y: 8 },
    },
    {
      name: "east",
      tiles: [{ x: 27, y: 8 }],
      to: "meadow/orchard",
      toGateway: "north",
      arriveAt: { x: 26, y: 8 },
    },
    {
      name: "south",
      tiles: [{ x: 14, y: 19 }],
      to: "meadow/stones",
      toGateway: "north",
      arriveAt: { x: 14, y: 18 },
    },
  ],
};
