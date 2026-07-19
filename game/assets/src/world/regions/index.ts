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
import type { GatewayDef, RegionDef } from "./types";

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

// --- Open-region scope (issues #29, #9) ---
//
// The kids-playtest preview (#29) kept Woolly Meadows as the only open
// monster area. M2B (#9) lifted those travel gates: every Meadow region is
// now open on foot, and every region whose habitat table has landed hosts
// encounters. The two sets below remain the single scope mechanism — a
// future island (or a resealed area) is gated by shrinking them again, never
// by moving a map, gateway, NPC, or artwork.
//
//   - OPEN_REGIONS      — where a player may stand (travel targets).
//   - ENCOUNTER_REGIONS — where monster encounters may trigger.
//
// Meadow Dock stays open but encounter-free: it is transit infrastructure,
// not a monster area (#27). Its ratified habitat rows (shared/habitats.ts)
// land with the Dockside tutorial slice — the design's "first guaranteed
// encounter" is a scripted beat, not a weighted roll, so there is nothing
// ordinary to table here yet. Consumed by WorldScreen (encounter check) and
// guarded at GameApp.startBattle.
//
// The full region graph stays connected (see regions.test.ts), so sealing or
// reopening an area is just editing these sets. See docs/islands/meadow-isle.md.
const OPEN_REGIONS: ReadonlySet<string> = new Set([
  "harbor",
  "meadow/dock",
  "meadow/woolly",
  "meadow/ticktock",
  "meadow/orchard",
  "meadow/festival",
  "meadow/barn",
  "meadow/gardens",
  "meadow/stones",
]);

const ENCOUNTER_REGIONS: ReadonlySet<string> = new Set([
  "meadow/woolly",
  "meadow/ticktock",
  "meadow/orchard",
  "meadow/festival",
  "meadow/barn",
  "meadow/gardens",
  "meadow/stones",
]);

/** True when `id` is reachable in the current scope. */
export function isOpenRegion(id: string): boolean {
  return OPEN_REGIONS.has(id);
}

/**
 * True when monster encounters may trigger in `id` — a strict subset of the
 * open regions (enforced structurally, not just by tests): Meadow Dock is
 * transit-only, so it is open but not encounter-capable. WorldScreen's
 * encounter check consumes this so battle triggers can never fire in a
 * transit or sealed region, and GameApp.startBattle guards it as well.
 */
export function isEncounterRegion(id: string): boolean {
  return isOpenRegion(id) && ENCOUNTER_REGIONS.has(id);
}

/**
 * A gateway may be crossed only when it targets a real region that is
 * currently open. Pocket gateways (`to === null`, e.g. reserved expansion
 * lots) and sealed gateways (a wired target that has not opened yet — none
 * on Meadow Isle since #9, the shape a future island takes) both fail this
 * check and fall through to their arrival notice instead of travelling.
 * Shared by WorldScreen and the region tests so the runtime and the tests
 * can never drift apart.
 */
export function canTraverseGateway(gateway: GatewayDef): boolean {
  return gateway.to !== null && isOpenRegion(gateway.to);
}

/** Notice shown when a wired gateway is sealed (its target is not open yet). */
export const SEALED_GATEWAY_MESSAGE =
  "This path opens in a later update! 这条路稍后开放！";

/**
 * The notice shown when a player steps on a gateway that does not travel. A
 * pocket or sealed gateway's own message wins; otherwise the bilingual
 * opens-later notice. Used by WorldScreen.onArrive so the message picked for
 * a sealed wired gateway is asserted by the region tests rather than buried
 * in Cocos code.
 */
export function gatewayNotice(gateway: GatewayDef): string {
  return gateway.message ?? SEALED_GATEWAY_MESSAGE;
}
