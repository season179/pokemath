// The Hundred Stones: the island's center — number bonds and (one day) the
// guardian ground. Two stone clusters of five flank the guardian ring.
// M2B (issue #9): sparse tall grass (`g`) between the stones hosts the one
// wild regular here; the guardian's authored battle (M6) is never a wild roll.
// M6 (issue #21): Keeper Yun tends the ring and starts the Cloudmane
// research trail (world/trail.ts) — her `N` marker sits beside the guide,
// one character swapped in place so saved tiles never shift.

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
    "T..........NNp...........T",
    "T............p...........T",
    "T.....o......p.....o.....T",
    "T....o.o.....p....o.o....T",
    "T.....o......p.....o.....T",
    "T.........o..p.o.........T",
    "T........o...p..o........T",
    "T.........o..p.o.........T",
    "T.gggg.......p...........T",
    "T.gggg.......p...........T",
    "T.gggf.......p...........T",
    "T............p....ggggg..T",
    "T............p....ggggg..T",
    "T..gggg......p...........T",
    "T..gggg......p...........T",
    "TTTTTTTTTTTTTpTTTTTTTTTTTT",
  ],
  spawn: { x: 13, y: 1 },
  npcs: [
    guide(11, 2, "characters/character_6/character06-sheet.png"),
    {
      // Keeper Yun (M6, #21): the trail giver for the Cloudmane research
      // hunt. Her dialog is multi-state (offer → directions → the Call →
      // standing second chance), resolved by world/trail.ts from save flags.
      x: 12,
      y: 2,
      name: "Keeper Yun 阿云",
      message: "", // trail NPC — the dialog comes from world/trail.ts
      characterSheet: "characters/character_10/character10-sheet.png",
      arcId: "cloudmane-trail",
    },
  ],
  // M2B roster (issue #9): only the Woolly Ram drifts between the stones
  // (meadow-isle.md §8), so this single-entry table is rare-only by design —
  // the calm counterpart to Woolly Meadows' 8% rare slot, and the place to
  // meet the ram without the odds. Membership and rarity match the
  // MEADOW_HABITATS rows for "meadow/stones" exactly. The guardian
  // (meadow/cloudmane) appears in NO wild table, here or anywhere.
  //   Woolly Ram (rare) 100
  encounters: {
    rate: 0.2,
    entries: [{ speciesId: "woolly/ram", weight: 100, rarity: "rare" }],
  },
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
