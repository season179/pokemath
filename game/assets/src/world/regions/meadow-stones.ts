// The Hundred Stones: the island's center — number bonds and (one day) the
// guardian ground. Two stone clusters of five flank the guardian ring.

import { guide } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_STONES: RegionDef = {
  id: "meadow/stones",
  title: "THE HUNDRED STONES  ·  百石原",
  art: "meadow",
  map: { group: "meadow", role: "guardian", position: { x: 62, y: 52 } },
  rows: [
    "TTTTTTTTTTTTTpTTTTTTTTTTTT",
    "T............p...........T",
    "T..........N.p...........T",
    "T............p...........T",
    "T.....o......p.....o.....T",
    "T....o.o.....p....o.o....T",
    "T.....o......p.....o.....T",
    "T.........o..p.o.........T",
    "T........o...p..o........T",
    "T.........o..p.o.........T",
    "T............p...........T",
    "T............p...........T",
    "T....f.......p...........T",
    "T............p...........T",
    "T............p...........T",
    "T............p...........T",
    "T............p...........T",
    "TTTTTTTTTTTTTpTTTTTTTTTTTT",
  ],
  spawn: { x: 13, y: 1 },
  npcs: [guide(11, 2, "characters/character_6/character06-sheet.png")],
  gateways: [
    {
      name: "north",
      tiles: [{ x: 13, y: 0 }],
      to: "meadow/ticktock",
      toGateway: "south",
      arriveAt: { x: 13, y: 1 },
    },
    {
      name: "south",
      tiles: [{ x: 13, y: 17 }],
      to: "meadow/barn",
      toGateway: "north",
      arriveAt: { x: 13, y: 16 },
    },
  ],
};
