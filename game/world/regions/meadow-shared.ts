// Shared flavor for Meadow Isle region files: pocket copy and the dock
// guide NPC every region (except the dock itself) places near its entrance.

import type { NpcDef } from "./types.ts";

export const POCKET_MESSAGE =
  "The bushes rustle… something is in there, but the way isn't open yet. 树丛沙沙响……这条路还没开。";

const GUIDE_MESSAGE =
  "This path runs straight back to the Meadow Dock. Shall we walk there together? 这条路直通青草码头。一起走回去吗？";

export function guide(x: number, y: number, characterSheet: string): NpcDef {
  return {
    x,
    y,
    name: "Meadow Guide",
    message: GUIDE_MESSAGE,
    characterSheet,
    sailTo: "meadow/dock",
    sailArrive: "east",
  };
}
