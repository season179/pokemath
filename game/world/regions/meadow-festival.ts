// Harvest Festival Green: money and data, around a plaza of stalls.
// M2B (issue #9): tall grass (`g`) on the green's margins hosts the
// Festival's ordinary roster — island-wide spillover around a rare anchor.

import { POCKET_MESSAGE, guide } from "./meadow-shared.ts";
import type { RegionDef } from "./types.ts";

export const MEADOW_FESTIVAL: RegionDef = {
  id: "meadow/festival",
  title: "HARVEST FESTIVAL GREEN  ·  丰收节草地",
  art: "meadow",
  map: { group: "meadow", role: "monster", position: { x: 86, y: 40 } },
  rows: [
    "TTTTTTTTTTTTTTpTTTTTTTTTTTTT",
    "T.ggg..........p...........T",
    "T.ggg..........p...........T",
    "T.............p.....gggg...T",
    "T.............p.....gggg...T",
    "T.............p............T",
    "T.......XX........XX.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "ppppppppppppppppppp........T",
    "T.N........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T..........ppppppppp.......T",
    "T.......XX........XX.......T",
    "T.gggg.........p...........T",
    "T.gggg.........p...........T",
    "T.............p.....f.gggg.T",
    "T.............p.......gggg.T",
    "TTTTTTTTTTTTTT.TTTTTTTTTTTTT",
  ],
  spawn: { x: 14, y: 1 },
  npcs: [guide(2, 11, "characters/character_8/character08-sheet.png")],
  // M2B roster (issue #9): a calm common spillover pool around the Festival's
  // rare dusk anchor. Per the habitat registry header the Festival draws
  // island-wide common spillover as a share of the common pool — the three
  // non-Pufftail commons below are that spillover (each is common and lives
  // in another Meadow habitat); they are not extra registry rows. Petalfae is
  // the area anchor AND the rare slot, so it intentionally weighs less than
  // the commons (rare means rare); Pufftail leads the spillover pool only.
  // Weights sum to 100 (percentages).
  //   Pufftail 44 · Fluffball 20 · Mothling 14 · Plumelet 14 (all common)
  //   · Petalfae (rare) 8
  encounters: {
    rate: 0.2,
    entries: [
      { speciesId: "meadow/pufftail", weight: 44, rarity: "common" },
      { speciesId: "woolly/fluffball", weight: 20, rarity: "common" },
      { speciesId: "meadow/mothling", weight: 14, rarity: "common" },
      { speciesId: "meadow/plumelet", weight: 14, rarity: "common" },
      { speciesId: "meadow/petalfae", weight: 8, rarity: "rare" },
    ],
  },
  gateways: [
    {
      name: "north",
      tiles: [{ x: 14, y: 0 }],
      to: "meadow/orchard",
      toGateway: "south",
      arriveAt: { x: 14, y: 1 },
    },
    {
      name: "west",
      tiles: [{ x: 0, y: 10 }],
      to: "meadow/barn",
      toGateway: "east",
      arriveAt: { x: 1, y: 10 },
    },
    { name: "pocket-south", tiles: [{ x: 14, y: 19 }], to: null, message: POCKET_MESSAGE },
  ],
};
