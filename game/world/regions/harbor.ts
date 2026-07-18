// Harbor Town: the home hub. Bespoke art composition; the ferry pier is an
// arrival-only gateway (Captain Ro's dialog does the actual sailing).

import type { RegionDef } from "./types.ts";

export const HARBOR: RegionDef = {
  id: "harbor",
  title: "HARBOR TOWN  ·  港湾镇",
  art: "harbor",
  map: { group: "harbor", role: "hub", position: { x: 8, y: 52 } },
  rows: [
    "TTTTTTTTTTTTTTTTTTTT",
    "T.XXXX..XXXXX.XXXX.T",
    "T.XXXXT.XXXXX.XXXX.T",
    "T.XXXX..XXXXX.XXXX.T",
    "T...H.....P....S...T",
    "TT..p.....p....p..TT",
    "T.ppppNpppppppppNp.T",
    "T.........p.N......T",
    "T.T....T.dd..T...T.T",
    "bbbbbbbbbddbbbbbbbbb",
    "wwwwwwwwwddwwwwwwwww",
    "wwwwwwwwwNdwwwwwwwww",
    "wwwwwwwwwDDwwwwwwwww",
  ],
  spawn: { x: 10, y: 7 },
  npcs: [
    {
      x: 6,
      y: 6,
      name: "Professor Sum",
      message: "Welcome to Harbor Town! Every great journey begins with one small answer.",
      characterSheet: "characters/character_02/character02-sheet.png",
    },
    {
      x: 12,
      y: 7,
      name: "Harbor Master",
      message: "The island ferries leave from the long dock. Captain Ro sails to Meadow Isle.",
      characterSheet: "characters/character_03/character03-sheet.png",
    },
    {
      x: 16,
      y: 6,
      name: "Mina",
      message: "I like watching the waves. There are no wild creatures inside Harbor Town.",
      characterSheet: "characters/character_4/character04-sheet.png",
    },
    {
      x: 9,
      y: 11,
      name: "Captain Ro",
      message: "Ahoy! Hop aboard — next stop, Meadow Isle! 上船啦，去青草岛！",
      characterSheet: "characters/character_10/character10-sheet.png",
      sailTo: "meadow/dock",
      sailArrive: "ferry",
      sailKind: "ferry",
    },
  ],
  gateways: [
    // Arrival-only: Captain Ro's ferry from Meadow Isle docks here.
    { name: "ferry", tiles: [], to: null, arriveAt: { x: 9, y: 10 } },
  ],
  handlers: { H: "heal", S: "shop", P: "workshop" },
};
