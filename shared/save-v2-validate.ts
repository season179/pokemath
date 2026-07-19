// Validation for SaveStateV2 payloads crossing a trust boundary.
// Used by the Worker (untrusted client JSON on PUT) and available to the
// client (sanity-check server responses / cached saves). Hand-rolled: no
// runtime deps. Mirrors the discipline of save-validate.ts (v1).
//
// validateSaveV2 checks shape and bounds only — it does NOT resolve species
// ids against the roster or teamIds against ownedCreatures beyond the size and
// reference checks below. Unknown fields are tolerated (they survive a
// round-trip); migration constructs clean payloads that omit them.

import {
  MAX_TEAM_SIZE,
  MAX_SAVE_JSON_BYTES_V2,
  type BagState,
  type CurriculumProfile,
  type FieldGuideEntryState,
  type LocationState,
  type OwnedCreatureState,
  type PlayerProgress,
  type SaveStateV2,
} from "./save-v2.ts";
import { levelForTotalXp } from "./player-progression.ts";

export { MAX_SAVE_JSON_BYTES_V2 };

const MAX_STAT = 100_000; // generous ceilings — reject garbage, not progress
const MAX_MONEY = 1_000_000;
const MAX_ITEM_COUNT = 1_000;
const MAX_NAME_LENGTH = 40;
const MAX_ID_LENGTH = 64; // creatureId (uuid = 36), speciesId, regionId, variant
const MAX_COLLECTION = 1_000; // owned creatures / field-guide entries
const MAX_BADGES = 64;
const MAX_FLAGS = 128;
const MAX_COORD = 10_000;

export function validateSaveV2(value: unknown): value is SaveStateV2 {
  if (!isRecord(value)) return false;
  if (value.version !== 2) return false;
  if (!isId(value.starterCreatureId)) return false;
  if (!isPlayer(value.player)) return false;
  if (!Array.isArray(value.ownedCreatures)) return false;
  if (value.ownedCreatures.length < 1 || value.ownedCreatures.length > MAX_COLLECTION) return false;
  if (!value.ownedCreatures.every(isOwnedCreature)) return false;
  if (!Array.isArray(value.teamIds)) return false;
  if (value.teamIds.length < 1 || value.teamIds.length > MAX_TEAM_SIZE) return false;
  if (!value.teamIds.every(isId)) return false;
  // Every team member must reference an owned creature, and teamIds must be
  // unique (a creature can't occupy two party slots).
  const ownedIds = new Set(value.ownedCreatures.map((c) => (c as OwnedCreatureState).creatureId));
  if (!value.teamIds.every((id) => ownedIds.has(id))) return false;
  if (new Set(value.teamIds).size !== value.teamIds.length) return false;
  // owned creatureIds must be unique.
  if (ownedIds.size !== value.ownedCreatures.length) return false;
  // starterCreatureId must reference an owned creature.
  if (!ownedIds.has(value.starterCreatureId)) return false;
  if (!isId(value.activeTeamId)) return false;
  if (!value.teamIds.includes(value.activeTeamId)) return false;
  if (!isBoundedInt(value.money, 0, MAX_MONEY)) return false;
  if (!isBag(value.bag)) return false;
  if (!isLocationOrNull(value.location)) return false;
  if (!isFieldGuide(value.fieldGuide)) return false;
  if (!isBadges(value.badges)) return false;
  if (!isFlags(value.flags)) return false;
  if (!isProfile(value.profile)) return false;
  if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) return false;
  return true;
}

function isPlayer(value: unknown): value is PlayerProgress {
  if (!isRecord(value)) return false;
  if (!isBoundedInt(value.level, 1, MAX_STAT)) return false;
  if (!isBoundedInt(value.totalXp, 0, MAX_STAT)) return false;
  // level and totalXp must agree on the player curve. They are seeded
  // together by migration (legacyToPlayerProgress), and battles advance
  // totalXp with level derived from it (M2A awardPlayerXp) — so a
  // disagreement is always invalid.
  return levelForTotalXp(value.totalXp).level === value.level;
}

function isOwnedCreature(value: unknown): value is OwnedCreatureState {
  if (!isRecord(value)) return false;
  if (!isId(value.creatureId)) return false;
  if (!isId(value.speciesId)) return false;
  if (!isBoundedInt(value.stage, 1, MAX_STAT)) return false;
  if (!isId(value.variant)) return false;
  if (typeof value.name !== "string" || value.name.length === 0 || value.name.length > MAX_NAME_LENGTH) {
    return false;
  }
  if (typeof value.color !== "string" || value.color.length > MAX_NAME_LENGTH) return false;
  if (!isBoundedInt(value.maxHp, 1, MAX_STAT)) return false;
  if (!isBoundedInt(value.hp, 0, MAX_STAT) || value.hp > value.maxHp) return false;
  if (!isBoundedInt(value.attack, 0, MAX_STAT)) return false;
  if (!isBoundedInt(value.level, 1, MAX_STAT)) return false;
  if (!isBoundedInt(value.xp, 0, MAX_STAT)) return false;
  if (typeof value.boss !== "boolean") return false;
  return true;
}

function isLocationOrNull(value: unknown): value is LocationState | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  if (!isId(value.regionId)) return false;
  if (!isBoundedInt(value.x, 0, MAX_COORD)) return false;
  if (!isBoundedInt(value.y, 0, MAX_COORD)) return false;
  return true;
}

function isFieldGuide(value: unknown): value is FieldGuideEntryState[] {
  if (!Array.isArray(value)) return false;
  if (value.length > MAX_COLLECTION) return false;
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) return false;
    if (!isId(entry.speciesId)) return false;
    if (seen.has(entry.speciesId)) return false; // one entry per species
    seen.add(entry.speciesId);
    const status = entry.status;
    if (status !== "seen" && status !== "caught") return false;
    if (!Array.isArray(entry.variants)) return false;
    if (!entry.variants.every(isId)) return false;
    if (new Set(entry.variants).size !== entry.variants.length) return false; // dedup
  }
  return true;
}

function isBadges(value: unknown): value is readonly string[] {
  if (!Array.isArray(value)) return false;
  if (value.length > MAX_BADGES) return false;
  if (!value.every(isId)) return false;
  return new Set(value).size === value.length;
}

// World/arc flags (#17): stable string ids → small counters. Bounds match
// the other save ceilings — reject garbage, never a real playthrough.
function isFlags(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > MAX_FLAGS) return false;
  return entries.every(
    ([key, flag]) => key.length > 0 && key.length <= MAX_ID_LENGTH && isBoundedInt(flag, 0, MAX_STAT),
  );
}

function isProfile(value: unknown): value is CurriculumProfile {
  return value === "dpk3_2026_core" || value === "original_dskp_extra";
}

function isBag(value: unknown): value is BagState {
  if (!isRecord(value)) return false;
  return (
    isBoundedInt(value.potion, 0, MAX_ITEM_COUNT) && isBoundedInt(value.ball, 0, MAX_ITEM_COUNT)
  );
}

// `id` strings: non-empty, bounded length. A regionId/variant may carry a
// slash (e.g. "meadow/woolly", "woolly/fluffball") so we allow any printable
// character set via the length bound rather than a charset.
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
