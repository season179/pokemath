// Appledore Orchard: tree rows for grouping and arrays, east of the knoll.
// M2B (issue #9): tall grass (`g`) between the tree rows hosts the Orchard's
// ordinary roster.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_ORCHARD: RegionDef = {
  id: "meadow/orchard",
  title: "APPLEDORE ORCHARD  ·  苹果园",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 84, y: 70 } },
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
    "T.............p..............T",
    "T.............p.N............T",
    "T...T..T..T...p...T..T..T....T",
    "T.gggg........p..............T",
    "T.gggg........p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p...gggg.......T",
    "T.............p...gggg.......T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p.........gggg.T",
    "..............p..............T",
    "T.............p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.gggg........p..............T",
    "T.gggg........p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.....N.......p...gggg.......T",
    "T.............p...gggg.......T",
    "T...XXXX......p..............T",
    "T...X..X......p..............T",
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 14, y: 1 },
  npcs: [
    guide(16, 2, "characters/character_7/character07-sheet.png"),
    {
      // The Fruit Stand (M5, #18): the orchard arc's visible payoff. The
      // keeper's dialog pays off the counting/money work the orchard's
      // battles drill and points — unhurried — at the next stop south.
      x: 6,
      y: 17,
      name: "Fruit-Stand Keeper",
      message:
        "You've counted every apple and every sen — the fruit stand is ready for the harvest! The Harvest Festival Green is just south; visit anytime. 你数清了苹果，也算清了钱——水果摊准备好啦！丰收节草地就在南边，想去就去看看吧。",
      characterSheet: "characters/character_8/character08-sheet.png",
    },
  ],
  // M2B roster (issue #9): Plumelet anchors the orchard flocks. Weights sum
  // to 100 (percentages); membership and rarity match the MEADOW_HABITATS
  // rows for "meadow/orchard" exactly, with Pufftail below the area anchor.
  //   Plumelet (common) 60 · Blossomfox (uncommon) 25 · Pufftail (common) 15
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
      tiles: [{ x: 14, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "east",
      arriveAt: { x: 14, y: 1 },
    },
    {
      name: "south",
      tiles: [{ x: 14, y: 21 }],
      to: "meadow/festival",
      toGateway: "north",
      arriveAt: { x: 14, y: 20 },
    },
    { name: "pocket-west", tiles: [{ x: 0, y: 11 }], to: null, message: POCKET_MESSAGE },
  ],
};
