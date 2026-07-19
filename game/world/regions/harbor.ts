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
    "TT.Np.....p....p..TT",
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
      // The Harbor Sanctuary (issue #5): the physical place to inspect
      // storage and change the active team. Her dialog opens the screen.
      x: 3,
      y: 5,
      name: "Keeper Flo",
      message:
        "Welcome to the Sanctuary! Come see all your friends and pick your team. 欢迎来到保育园！来看看你的伙伴们，挑一挑队伍吧！",
      characterSheet: "characters/character_8/character08-sheet.png",
      opens: "sanctuary",
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
