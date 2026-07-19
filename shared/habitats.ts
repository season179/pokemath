// Meadow Isle habitat registry (issue #4): which ordinary species live in
// which area, at which rarity — keyed entirely by permanent speciesId, per
// the approved naming slate's habitat matrix
// (docs/islands/meadow-naming-slate.md). This is the semantic layer; the live
// weighted encounter tables landed with M2B (issue #9) and sit next to each
// area's map data (game/world/regions/meadow-*.ts, mirrored into Cocos).
// Membership and rarity here are registry; weights there are tuning — the
// regions test suite (game/tests/regions.test.ts, "M2B") mechanically keeps
// the two consistent, with the two enshrined exceptions below.
//
// Two deliberate shapes from the slate:
// - meadow/pufftail spans every ordinary area (the roster's "everywhere"
//   background mouse); area tables still weight it below each area's anchor.
// - The Festival also draws island-wide common spillover, expressed as a
//   share of its live table's common pool — not as extra rows here.
// And two deliberate divergences between registry and live tables:
// - Woolly Meadows' live table predates this registry (the kids-playtest
//   table, grandfathered): it omits pufftail, a subset of the rows below.
// - Meadow Dock has NO live table yet: it is transit infrastructure (#27),
//   and its slate encounter ("first guaranteed encounter") is a scripted
//   tutorial beat that lands with the Dockside tutorial slice, not an
//   ordinary weighted roll.
// The guardian (meadow/cloudmane) appears in NO entry: a fixed authored
// battle, never a wild roll — no Unique capture pressure by construction.

import type { Rarity } from "./encounters.ts";

// The Meadow Isle ring's region ids (game/assets/src/world/regions/index.ts).
export type MeadowAreaId =
  | "meadow/dock"
  | "meadow/woolly"
  | "meadow/orchard"
  | "meadow/gardens"
  | "meadow/barn"
  | "meadow/ticktock"
  | "meadow/festival"
  | "meadow/stones";

export interface HabitatEntry {
  readonly speciesId: string;
  readonly area: MeadowAreaId;
  readonly rarity: Rarity;
}

export const MEADOW_HABITATS: readonly HabitatEntry[] = [
  // Dockside — the first guaranteed encounter is the mothling line.
  { speciesId: "meadow/mothling", area: "meadow/dock", rarity: "common" },
  { speciesId: "meadow/pufftail", area: "meadow/dock", rarity: "common" },
  // Woolly Meadows — the preview's live table (fluffball 65 / hare 27 /
  // ram 8) shipped before this registry existed: a grandfathered subset of
  // these rows (pufftail is absent from the shipped table), with the same
  // rarity split.
  { speciesId: "woolly/fluffball", area: "meadow/woolly", rarity: "common" },
  { speciesId: "meadow/pufftail", area: "meadow/woolly", rarity: "common" },
  { speciesId: "woolly/hare", area: "meadow/woolly", rarity: "uncommon" },
  { speciesId: "woolly/ram", area: "meadow/woolly", rarity: "rare" },
  // Orchard.
  { speciesId: "meadow/pufftail", area: "meadow/orchard", rarity: "common" },
  { speciesId: "meadow/plumelet", area: "meadow/orchard", rarity: "common" },
  { speciesId: "meadow/blossomfox", area: "meadow/orchard", rarity: "uncommon" },
  // Pattern Gardens.
  { speciesId: "meadow/mothling", area: "meadow/gardens", rarity: "common" },
  { speciesId: "meadow/pufftail", area: "meadow/gardens", rarity: "common" },
  { speciesId: "woolly/hare", area: "meadow/gardens", rarity: "uncommon" },
  // Barn.
  { speciesId: "meadow/pufftail", area: "meadow/barn", rarity: "common" },
  { speciesId: "meadow/plumelet", area: "meadow/barn", rarity: "common" },
  { speciesId: "meadow/barnpup", area: "meadow/barn", rarity: "uncommon" },
  // Ticktock Knoll.
  { speciesId: "meadow/pufftail", area: "meadow/ticktock", rarity: "common" },
  { speciesId: "meadow/owlet", area: "meadow/ticktock", rarity: "uncommon" },
  { speciesId: "meadow/blossomfox", area: "meadow/ticktock", rarity: "uncommon" },
  // Festival Green — petalfae anchors at dusk; spillover commons ride the
  // island-wide pool (see header note).
  { speciesId: "meadow/pufftail", area: "meadow/festival", rarity: "common" },
  { speciesId: "meadow/petalfae", area: "meadow/festival", rarity: "rare" },
  // The Hundred Stones — only the ram drifts between the stones; the
  // guardian's authored battle is not a habitat.
  { speciesId: "woolly/ram", area: "meadow/stones", rarity: "rare" },
];

export function habitatFor(area: MeadowAreaId): readonly HabitatEntry[] {
  return MEADOW_HABITATS.filter((e) => e.area === area);
}
