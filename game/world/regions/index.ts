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

// --- Topic arcs (M5: #17 money, #18 orchard, #19 time, #20) ---
//
// Every encounter region serves the question banks routed for ITS
// curriculum topics: GameApp asks this map for the region's topics, loads
// the routed bank for each (#13), caches per topic, and merges multi-topic
// sets into one battle bank. Regions without a mapping keep the Woolly
// default (4.1) until their arc lands. Later arcs add their case here —
// nothing else in the battle path names a topic.
export const REGION_TOPICS: Readonly<Record<string, readonly string[]>> = {
  "meadow/woolly": ["4.1"], // whole numbers to 100; ten-frame bonds (#17)
  "meadow/ticktock": ["4.4"], // time & calendar (#19)
  "meadow/orchard": ["4.2", "4.3"], // arithmetic & fruit-stand money (#18)
  "meadow/gardens": ["4.6"], // space & shapes: 2D shapes, repeating patterns (#20)
  "meadow/barn": ["4.5", "4.6"], // non-standard measure + the shared shapes slice (#20)
  "meadow/festival": ["4.7"], // data handling: pictographs & classification (#20)
};

/** The topic served in regions with no arc of their own yet. */
export const DEFAULT_REGION_TOPIC = "4.1";

/** The curriculum topics a region's battles serve (#13 routed loading). */
export function topicsForRegion(id: string): readonly string[] {
  return REGION_TOPICS[id] ?? [DEFAULT_REGION_TOPIC];
}

// Ticktock Knoll arc payoff (#19): winning TICKTOCK_ARC_WINS battles on the
// knoll (won or captured) awards the badge, the clock-post landmark chimes
// again (golden face set to 八时, the hour the owl keeper wakes), and the
// habitat clue below is revealed. The badge persists on save v2 `badges`.
export const TICKTOCK_ARC_BADGE = "arc/ticktock-time";
export const TICKTOCK_ARC_WINS = 3;
export const TICKTOCK_ARC_CLUE =
  "滴答钟塔重新敲响！咕咕在黄昏最活跃 · The tower clock chimes again — Owlets love dusk!";

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
