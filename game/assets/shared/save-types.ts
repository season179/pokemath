// Save-state shapes: the seam between the game and persistence.
// Phase 1 (Cocos) holds these in memory and serializes on save;
// Phase 2 (Worker + D1) persists SaveState as the API payload.

import { Creature, type CreatureState, type Species } from "./creature";

export type { CreatureState };

export interface TeamState {
  creatures: CreatureState[];
  activeIndex: number;
}

export interface BagState {
  potion: number;
  ball: number;
}

export interface SaveState {
  version: 1;
  team: TeamState;
  money: number;
  bag: BagState;
  savedAt: string; // ISO timestamp
}

export const STARTING_MONEY = 200;
export const STARTING_BAG: BagState = { potion: 1, ball: 3 };

// The active battle party never exceeds six — true across v1 and v2, so the
// canonical constant lives here (the version-agnostic save-constants module)
// and both validators import it. This avoids a barrel collision between the
// v1 and v2 modules.
export const MAX_TEAM_SIZE = 6;

// A new game starts with exactly the starter the player chose (one of
// STARTERS) — there is no default pet; the Worker refuses unknown ids.
export function createNewGame(starter: Species, now: Date = new Date()): SaveState {
  return {
    version: 1,
    team: { creatures: [Creature.fromSpecies(starter).toState()], activeIndex: 0 },
    money: STARTING_MONEY,
    bag: { ...STARTING_BAG },
    savedAt: now.toISOString(),
  };
}
