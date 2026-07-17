// Validation for SaveState payloads crossing a trust boundary.
// Used by the Worker (untrusted client JSON) and available to the client
// (sanity-check server responses). Hand-rolled: no runtime deps.

import type { BagState, SaveState, TeamState } from "./save-types.ts";
import type { CreatureState } from "./creature.ts";

export const MAX_TEAM_SIZE = 6;
export const MAX_SAVE_JSON_BYTES = 16 * 1024;

const MAX_STAT = 100_000; // generous ceilings — reject garbage, not progress
const MAX_MONEY = 1_000_000;
const MAX_ITEM_COUNT = 1_000;
const MAX_NAME_LENGTH = 40;

export function validateSaveState(value: unknown): value is SaveState {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isTeam(value.team)) return false;
  if (!isBoundedInt(value.money, 0, MAX_MONEY)) return false;
  if (!isBag(value.bag)) return false;
  if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) return false;
  return true;
}

function isTeam(value: unknown): value is TeamState {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.creatures)) return false;
  if (value.creatures.length < 1 || value.creatures.length > MAX_TEAM_SIZE) return false;
  if (!value.creatures.every(isCreature)) return false;
  if (!isBoundedInt(value.activeIndex, 0, value.creatures.length - 1)) return false;
  return true;
}

function isCreature(value: unknown): value is CreatureState {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string" || value.name.length === 0 || value.name.length > MAX_NAME_LENGTH) return false;
  if (typeof value.color !== "string" || value.color.length > MAX_NAME_LENGTH) return false;
  if (!isBoundedInt(value.maxHp, 1, MAX_STAT)) return false;
  if (!isBoundedInt(value.hp, 0, MAX_STAT) || value.hp > value.maxHp) return false;
  if (!isBoundedInt(value.attack, 0, MAX_STAT)) return false;
  if (!isBoundedInt(value.level, 1, MAX_STAT)) return false;
  if (!isBoundedInt(value.xp, 0, MAX_STAT)) return false;
  if (typeof value.boss !== "boolean") return false;
  return true;
}

function isBag(value: unknown): value is BagState {
  if (!isRecord(value)) return false;
  return (
    isBoundedInt(value.potion, 0, MAX_ITEM_COUNT) && isBoundedInt(value.ball, 0, MAX_ITEM_COUNT)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
