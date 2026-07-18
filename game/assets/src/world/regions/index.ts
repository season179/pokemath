// Region registry. Meadow Isle is a ring: dock → woolly → ticktock →
// orchard → festival → barn → gardens → dock, with the Hundred Stones at
// the center (inner paths from ticktock and barn) and blocked expansion
// pockets reserved for future rest stops, mini-games, and the Hidden Grove.

import { HARBOR } from "./harbor";
import { MEADOW_BARN } from "./meadow-barn";
import { MEADOW_DOCK } from "./meadow-dock";
import { MEADOW_FESTIVAL } from "./meadow-festival";
import { MEADOW_GARDENS } from "./meadow-gardens";
import { MEADOW_ORCHARD } from "./meadow-orchard";
import { MEADOW_STONES } from "./meadow-stones";
import { MEADOW_TICKTOCK } from "./meadow-ticktock";
import { MEADOW_WOOLLY } from "./meadow-woolly";
import type { RegionDef } from "./types";

export * from "./types";

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
