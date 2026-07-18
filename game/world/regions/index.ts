// Region registry. Meadow Isle is a ring: dock → woolly → ticktock →
// orchard → festival → barn → gardens → dock, with the Hundred Stones at
// the center (inner paths from ticktock and barn) and blocked expansion
// pockets reserved for future rest stops, mini-games, and the Hidden Grove.

import { HARBOR } from "./harbor.ts";
import { MEADOW_BARN } from "./meadow-barn.ts";
import { MEADOW_DOCK } from "./meadow-dock.ts";
import { MEADOW_FESTIVAL } from "./meadow-festival.ts";
import { MEADOW_GARDENS } from "./meadow-gardens.ts";
import { MEADOW_ORCHARD } from "./meadow-orchard.ts";
import { MEADOW_STONES } from "./meadow-stones.ts";
import { MEADOW_TICKTOCK } from "./meadow-ticktock.ts";
import { MEADOW_WOOLLY } from "./meadow-woolly.ts";
import type { RegionDef } from "./types.ts";

export * from "./types.ts";

export const REGIONS: Record<string, RegionDef> = {
  harbor: HARBOR,
  "meadow/dock": MEADOW_DOCK,
  "meadow/woolly": MEADOW_WOOLLY,
  "meadow/ticktock": MEADOW_TICKTOCK,
  "meadow/orchard": MEADOW_ORCHARD,
  "meadow/festival": MEADOW_FESTIVAL,
  "meadow/barn": MEADOW_BARN,
  "meadow/gardens": MEADOW_GARDENS,
  "meadow/stones": MEADOW_STONES,
};

export function region(id: string): RegionDef {
  const def = REGIONS[id];
  if (!def) throw new Error(`Unknown region: ${id}`);
  return def;
}
