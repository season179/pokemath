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
import type { GatewayDef, RegionDef } from "./types.ts";

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

// --- Kids-playtest preview scope (issue #29) ---
//
// The first preview keeps Woolly Meadows as the only open monster area.
// Harbor Town is the home hub, Meadow Dock is transit-only (the ferry stop
// between Harbor Town and the meadow — walk straight through to Woolly), and
// every other Meadow region stays defined and fully wired but sealed.
//
// Two preview sets govern this:
//   - PREVIEW_OPEN_REGIONS      — where a player may stand (travel targets).
//   - PREVIEW_ENCOUNTER_REGIONS — where monster encounters may trigger. Dock
//     is open for travel but deliberately NOT encounter-capable here, even
//     though the design doc envisions a later Dockside tutorial encounter;
//     only Woolly exposes encounters in the preview. Consumed by the encounter
//     system when it lands (#8) and guarded at GameApp.startBattle today.
//
// The full region graph stays connected (see regions.test.ts), so reopening a
// sealed area is just growing these sets — no map, gateway, NPC, or artwork
// ever moves. See docs/islands/meadow-isle.md.
const PREVIEW_OPEN_REGIONS: ReadonlySet<string> = new Set([
  "harbor",
  "meadow/dock",
  "meadow/woolly",
]);

const PREVIEW_ENCOUNTER_REGIONS: ReadonlySet<string> = new Set(["meadow/woolly"]);

/** True when `id` is reachable in the current preview scope. */
export function isOpenRegion(id: string): boolean {
  return PREVIEW_OPEN_REGIONS.has(id);
}

/**
 * True when monster encounters may trigger in `id` during the preview — a
 * strict subset of the open regions (enforced structurally, not just by
 * tests): Meadow Dock is transit-only, so it is open but not encounter-capable.
 * The encounter system (#8) consumes this so battle triggers can never fire in
 * a transit or sealed region, and GameApp.startBattle guards it today.
 */
export function isEncounterRegion(id: string): boolean {
  return isOpenRegion(id) && PREVIEW_ENCOUNTER_REGIONS.has(id);
}

/**
 * A gateway may be crossed in the preview only when it targets a real region
 * that is currently open. Pocket gateways (`to === null`, e.g. reserved
 * expansion lots) and preview-sealed gateways (a wired target that has not
 * reopened yet) both fail this check and fall through to their arrival notice
 * instead of travelling. Shared by WorldScreen and the region tests so the
 * runtime and the tests can never drift apart.
 */
export function canTraverseGateway(gateway: GatewayDef): boolean {
  return gateway.to !== null && isOpenRegion(gateway.to);
}

/** Notice shown when a wired gateway is sealed for the preview. */
export const PREVIEW_LOCKED_MESSAGE =
  "This path opens in a later update — adventure in Woolly Meadows for now! 这条路稍后开放，先在羊毛草原冒险吧！";

/**
 * The notice shown when a player steps on a gateway that does not travel. A
 * pocket or sealed gateway's own message wins; otherwise the bilingual
 * preview "opens later" notice. Used by WorldScreen.onArrive so the message
 * picked for a sealed wired gateway (e.g. Dock→Gardens, Woolly→Ticktock) is
 * asserted by the region tests rather than buried in Cocos code.
 */
export function gatewayNotice(gateway: GatewayDef): string {
  return gateway.message ?? PREVIEW_LOCKED_MESSAGE;
}
