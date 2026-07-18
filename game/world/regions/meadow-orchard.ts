// Appledore Orchard: tree rows for grouping and arrays, east of the knoll.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_ORCHARD: RegionDef = {
  id: "meadow/orchard",
  title: "APPLEDORE ORCHARD  ·  苹果园",
  art: "meadow",
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
    "T.............p..............T",
    "T.............p.N............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p..............T",
    "T.............p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p..............T",
    "T.............p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p..............T",
    "..............p..............T",
    "T.............p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p..............T",
    "T.............p..............T",
    "T...T..T..T...p...T..T..T....T",
    "T.............p..............T",
    "T.............p..............T",
    "T...XXXX......p..............T",
    "T...X..X......p..............T",
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTTTT",
  ],
  spawn: { x: 14, y: 1 },
  npcs: [guide(16, 2, "characters/character_7/character07-sheet.png")],
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
