// Save-state v2: player-owned progression + persistent collection.
//
// The v2 contract supersedes save-types.ts (v1). The Woolly preview shipped v1
// (creature-owned XP, session-only spawn); save-migrate.ts converts every v1
// save to this shape losslessly, and the Worker migrates v1 before the client
// begins writing v2 (issue #3 / M1.5).
//
// Design authority: docs/islands/meadow-isle.md "Progression, collection, and
// reward contract" + "Decisions locked with the revised dev plan".

import type { Species } from "./creature.ts";
import { mintCreatureId } from "./player-progression.ts";
import { MAX_TEAM_SIZE, STARTING_BAG, STARTING_MONEY, type BagState } from "./save-types.ts";

export type { BagState };
export { MAX_TEAM_SIZE, STARTING_BAG, STARTING_MONEY };

export const SAVE_VERSION = 2 as const;
// Network payload cap for a v2 save (matches the v1 ceiling; the collection is
// bounded by validation, and the Field Guide stays modest at this scale).
export const MAX_SAVE_JSON_BYTES_V2 = 16 * 1024;

// Creatures in v2 carry stable per-instance identity. `stage` is the 1-based
// evolution stage (starters and wild encounters are stage 1; the Meadow Badge
// evolves the starter to stage 2 — M6). `variant` is the palette id ("normal"
// default, "alt" for the alternate palette); a variant is NEVER a separate
// species or a separate rarity (meadow-isle.md creature roster).
export interface OwnedCreatureState {
  creatureId: string;
  speciesId: string;
  stage: number;
  variant: string;
  name: string;
  color: string;
  maxHp: number;
  hp: number;
  attack: number;
  level: number;
  xp: number;
  boss: boolean;
}

export interface PlayerProgress {
  // SEEDED at migration from the highest legacy creature level + fractional
  // progress (player-progression.ts legacyToPlayerProgress). Not yet advanced
  // by live battles — M2A switches battle XP-awarding from creatures to the
  // player. Until then this is the source-of-truth seed for the future
  // player-owned curve, kept in sync only by migration.
  level: number;
  totalXp: number;
}

// Location persists as regionId + LOCAL x/y inside that region's map (regions
// are never resized after they ship, so saved tiles never drift). `null` means
// "never persisted" — the client spawns at the region's default (safe gateway)
// and validates the saved tile is still walkable on load, falling back to the
// safe gateway if a layout edit stranded the save (meadow-isle.md region
// graph). The region registry + walkable check live in the client (game/world),
// not here, so this module stays free of Cocos/world data.
export interface LocationState {
  regionId: string;
  x: number;
  y: number;
}

// Field Guide state (Unknown → Seen → Caught). Unknown is the absent entry;
// met-in-the-wild is "seen"; owned-now-or-ever is "caught". `variants` lists
// discovered palette ids ("normal" and/or "alt"). The Field Guide UI is the
// Harbor Sanctuary slice (issue #5); M1.5 shipped the state itself.
export type FieldGuideStatus = "seen" | "caught";

export interface FieldGuideEntryState {
  speciesId: string;
  status: FieldGuideStatus;
  variants: readonly string[];
}

export type CurriculumProfile = "dpk3_2026_core" | "original_dskp_extra";

export interface SaveStateV2 {
  version: 2;
  /** The player's very first creature — located for starter evolution (M6). */
  starterCreatureId: string;
  /** Player-owned progression seed (see PlayerProgress). */
  player: PlayerProgress;
  /** The full collection — every creature the player has ever caught. */
  ownedCreatures: OwnedCreatureState[];
  /** The active battle party — at most six creatureIds into ownedCreatures. */
  teamIds: string[];
  /** The creatureId currently leading the party (must be in teamIds). */
  activeTeamId: string;
  money: number;
  bag: BagState;
  /** Persisted regionId + tile; null until the client first checkpoints it. */
  location: LocationState | null;
  fieldGuide: FieldGuideEntryState[];
  badges: readonly string[];
  profile: CurriculumProfile;
  savedAt: string; // ISO timestamp
}

// --- Factory: a brand-new v2 game from a chosen starter ---

function ownedFromSpecies(species: Species, creatureId: string): OwnedCreatureState {
  return {
    creatureId,
    speciesId: species.id,
    stage: 1,
    variant: "normal",
    name: species.name,
    color: species.color,
    maxHp: species.maxHp,
    hp: species.maxHp,
    attack: species.attack,
    level: 1,
    xp: 0,
    boss: false,
  };
}

export function createNewGameV2(
  starter: Species,
  now: Date = new Date(),
  mintId: () => string = mintCreatureId,
): SaveStateV2 {
  const starterId = mintId();
  const starterCreature = ownedFromSpecies(starter, starterId);
  return {
    version: SAVE_VERSION,
    starterCreatureId: starterId,
    player: { level: 1, totalXp: 0 },
    ownedCreatures: [starterCreature],
    teamIds: [starterId],
    activeTeamId: starterId,
    money: STARTING_MONEY,
    bag: { ...STARTING_BAG },
    location: null,
    fieldGuide: [
      { speciesId: starter.id, status: "caught", variants: ["normal"] },
    ],
    badges: [],
    profile: "dpk3_2026_core",
    savedAt: now.toISOString(),
  };
}

// --- Collection mechanics ---

export type CaptureOutcome = "joined-team" | "sent-to-storage";

export interface CaptureResult {
  save: SaveStateV2;
  outcome: CaptureOutcome;
}

/**
 * Add a freshly-caught creature to the collection. If the active party has
 * room (< MAX_TEAM_SIZE) the creature joins the party; otherwise it goes to
 * owned storage. Either way the creature is KEPT — Meadow never rejects a
 * successful ordinary capture (issue #3). The Harbor Sanctuary UI that
 * inspects storage and swaps the active party shipped with issue #5.
 */
export function captureCreature(
  save: SaveStateV2,
  caught: OwnedCreatureState,
): CaptureResult {
  if (save.teamIds.includes(caught.creatureId)) {
    throw new Error(`captureCreature: creature ${caught.creatureId} already on the team`);
  }
  if (save.ownedCreatures.some((c) => c.creatureId === caught.creatureId)) {
    throw new Error(`captureCreature: creature ${caught.creatureId} already owned`);
  }
  const teamFull = save.teamIds.length >= MAX_TEAM_SIZE;
  const ownedCreatures = [...save.ownedCreatures, caught];
  const teamIds = teamFull ? save.teamIds : [...save.teamIds, caught.creatureId];
  const fieldGuide = markCaught(save.fieldGuide, caught.speciesId, caught.variant);
  return {
    save: { ...save, ownedCreatures, teamIds, fieldGuide },
    outcome: teamFull ? "sent-to-storage" : "joined-team",
  };
}

/**
 * Mark a species seen in the Field Guide (met in the wild — a battle start
 * counts, even if the player runs). Never upgrades to "caught" (markCaught
 * owns that) and never downgrades a caught entry; a newly-discovered variant
 * is recorded on either status. Like markCaught: idempotent, never mutates
 * its input, and returns the SAME reference when there is nothing to change.
 */
export function markSeen(
  fieldGuide: FieldGuideEntryState[],
  speciesId: string,
  variant: string,
): FieldGuideEntryState[] {
  const existing = fieldGuide.find((e) => e.speciesId === speciesId);
  if (!existing) {
    return [...fieldGuide, { speciesId, status: "seen", variants: dedupeVariants([variant]) }];
  }
  if (existing.variants.includes(variant)) {
    return fieldGuide; // already recorded — avoid a needless new array
  }
  return fieldGuide.map((e) =>
    e.speciesId === speciesId
      ? { ...e, variants: dedupeVariants([...e.variants, variant]) }
      : e,
  );
}

/**
 * Mark a species caught (and a variant seen) in the Field Guide. Idempotent:
 * re-catching a species keeps its highest status and dedups variants. Used by
 * captureCreature and by migration seeding. Accepts and returns the party's
 * mutable field-guide array; it never mutates its input in place (it spreads
 * / maps), and returns the SAME reference when there is nothing to change.
 */
export function markCaught(
  fieldGuide: FieldGuideEntryState[],
  speciesId: string,
  variant: string,
): FieldGuideEntryState[] {
  const existing = fieldGuide.find((e) => e.speciesId === speciesId);
  if (!existing) {
    return [...fieldGuide, { speciesId, status: "caught", variants: dedupeVariants([variant]) }];
  }
  if (existing.status === "caught" && existing.variants.includes(variant)) {
    return fieldGuide; // nothing to do — avoid a needless new array
  }
  return fieldGuide.map((e) =>
    e.speciesId === speciesId
      ? { ...e, status: "caught", variants: dedupeVariants([...e.variants, variant]) }
      : e,
  );
}

function dedupeVariants(variants: readonly string[]): string[] {
  // No spreading of Set literals: the Cocos bundler lowers an iterable
  // spread to `[].concat(iterable)`, which wraps a Set as a single element
  // instead of iterating it — variants silently corrupted into [{}] in the
  // shipped bundle (Node tests can't see it; bundler-safe.test.ts guards it).
  return variants.filter((variant, index) => variants.indexOf(variant) === index);
}

// --- Team edits (Harbor Sanctuary, issue #5) ---

/**
 * Replace the active team wholesale — the Sanctuary's membership edit.
 * Throws on an invalid roster (the UI guards these BEFORE calling, so a
 * throw means a caller bug, matching captureCreature's discipline):
 * 1..MAX_TEAM_SIZE ids, no duplicates, every id owned. The active leader
 * keeps the lead while still on the team; otherwise leadership moves to the
 * first member. `starterCreatureId` is identity, not team state — never
 * touched here. Returns a new save; the input is not mutated.
 */
export function setTeam(save: SaveStateV2, teamIds: readonly string[]): SaveStateV2 {
  if (teamIds.length < 1) throw new Error("setTeam: the team needs at least one creature");
  if (teamIds.length > MAX_TEAM_SIZE) {
    throw new Error(`setTeam: a team holds at most ${MAX_TEAM_SIZE} creatures`);
  }
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error("setTeam: duplicate creatureId in the team");
  }
  const ownedIds = new Set(save.ownedCreatures.map((c) => c.creatureId));
  for (const id of teamIds) {
    if (!ownedIds.has(id)) throw new Error(`setTeam: creature ${id} is not owned`);
  }
  const activeTeamId = teamIds.includes(save.activeTeamId) ? save.activeTeamId : teamIds[0];
  return { ...save, teamIds: [...teamIds], activeTeamId };
}
