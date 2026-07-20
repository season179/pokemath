// Meadow Dock: a compact arrival path linking the ferry to both sides of the
// Meadow Loop. Authored coordinates live beside the grid so layout edits keep
// scripted beats and their map data in one review surface.

import { POCKET_MESSAGE } from "./meadow-shared";
import type { RegionDef } from "./types";

export const MEADOW_DOCK_ANCHORS = {
  mothling: { x: 1, y: 9 },
  landmark: { x: 8, y: 8 }, // Captain Ro beside the ferry junction
} as const;

export const MEADOW_DOCK: RegionDef = {
  id: "meadow/dock",
  title: "MEADOW DOCK  ·  青草码头",
  art: "meadow",
  map: { group: "meadow", role: "transit", position: { x: 28, y: 52 } },
  rows: [
    "TTTTTTT..TTTTTTTTT",
    "T......p.........T",
    "T......p.........T",
    "T......p.....T...T",
    "wwwbbb.p.........T",
    "wwwbbb.p.....X...T",
    "wwwbbb.ppppppppppp",
    "wwwbbb.p.pXXXXXXXT",
    "wwwbbb.pNp.......T",
    "dddddddddd....f..T",
    "wwwbbb...p.......T",
    "T........p.......T",
    "TTTTTTTTTpTTTTTTTT",
  ],
  spawn: { x: 2, y: 9 },
  landmark: MEADOW_DOCK_ANCHORS.landmark,
  npcs: [
    {
      ...MEADOW_DOCK_ANCHORS.landmark,
      name: "Captain Ro",
      message: "All aboard! Back to Harbor Town we go! 上船啦，回港湾镇！",
      characterSheet: "characters/character_10/character10-sheet.png",
      sailTo: "harbor",
      sailArrive: "ferry",
      sailKind: "ferry",
    },
  ],
  gateways: [
    { name: "ferry", tiles: [], to: null, arriveAt: { x: 2, y: 9 } },
    {
      name: "east",
      tiles: [{ x: 17, y: 6 }],
      to: "meadow/woolly",
      toGateway: "west",
      arriveAt: { x: 16, y: 6 },
    },
    {
      name: "south",
      tiles: [{ x: 9, y: 12 }],
      to: "meadow/gardens",
      toGateway: "north",
      arriveAt: { x: 9, y: 11 },
    },
    {
      name: "pocket-north",
      tiles: [{ x: 7, y: 0 }, { x: 8, y: 0 }],
      to: null,
      message: POCKET_MESSAGE,
    },
  ],
};
