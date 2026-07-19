// Save migration: version 1 (Woolly preview) → version 2 (player progression
// + persistent collection). Issue #3 / M1.5.
//
//   migrateSave(raw)   validates a v1 save, drops unknown fields, constructs a
//                      v2 save, validates the result, and returns it. Throws
//                      SaveMigrationError on corrupt input or an unknown
//                      (future) version.
//   normalizeSave(raw) accepts a v1 OR v2 payload and always returns a
//                      validated v2 save. The Worker uses this single path on
//                      both read and write so v1 saves in the DB and any v1
//                      write (e.g. a stale dirty cache reconciled after
//                      deploy) converge to v2 without an orphaned save.

import type { CreatureState } from "./creature.ts";
import { mintCreatureId, legacyToPlayerProgress, LEGACY_XP_PER_LEVEL } from "./player-progression.ts";
import type { OwnedCreatureState, SaveStateV2 } from "./save-v2.ts";
import { markCaught, SAVE_VERSION } from "./save-v2.ts";
import { validateSaveV2 } from "./save-v2-validate.ts";
import type { SaveState } from "./save-types.ts";
import { validateSaveState } from "./save-validate.ts";

/** Raised by migrateSave / normalizeSave when a payload cannot be migrated. */
export class SaveMigrationError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SaveMigrationError";
  }
}

export interface MigrateOptions {
  /** Inject deterministic ids in tests; defaults to mintCreatureId. */
  mintId?: () => string;
}

/**
 * Migrate a validated version-1 save to version 2. Throws SaveMigrationError
 * on anything that is not a valid v1 save (corrupt, wrong shape, or an
 * unknown/future version). The Woolly preview save (#8) is the realistic
 * input; the only lossy step is folding creature-owned level/XP into a single
 * player progression seed — every creature, level, XP point, coin, bag item,
 * and the active-party selection is preserved (issue #3 acceptance criteria).
 */
export function migrateSave(raw: unknown, options: MigrateOptions = {}): SaveStateV2 {
  const mintId = options.mintId ?? mintCreatureId;

  if (raw !== null && typeof raw === "object" && (raw as { version?: unknown }).version === SAVE_VERSION) {
    throw new SaveMigrationError("save is already version 2; use normalizeSave to pass it through");
  }

  if (!validateSaveState(raw)) {
    // A future version (3+) or a corrupt blob both land here: validateSaveState
    // requires version === 1 and a well-formed team/money/bag. Distinguish a
    // clearly-versioned-but-unknown payload for a clearer message.
    const version = (raw as { version?: unknown })?.version;
    if (typeof version === "number" && version > SAVE_VERSION) {
      throw new SaveMigrationError(`unsupported future save version ${version}`);
    }
    throw new SaveMigrationError("not a valid version-1 save");
  }

  const v1 = raw as SaveState;
  const team = v1.team.creatures;
  // The starter is always creatures[0]: createNewGame mints it first and the
  // preview never reorders the array (switchTo only changes activeIndex).
  const starter = team[0];
  if (!starter) throw new SaveMigrationError("version-1 save has no creatures");

  // Stable per-instance ids, minted in team order so fixtures are deterministic.
  const ids = team.map(() => mintId());

  const ownedCreatures: OwnedCreatureState[] = team.map((creature, i) => toOwned(creature, ids[i]));

  // Player progression seed: the highest legacy creature level plus the
  // fractional progress of the most-advanced creature at that level.
  const player = seedPlayer(team);

  const fieldGuide = ownedCreatures.reduce(
    (entries, c) => markCaught(entries, c.speciesId, c.variant),
    [] as ReturnType<typeof markCaught>,
  );

  const migrated: SaveStateV2 = {
    version: SAVE_VERSION,
    starterCreatureId: ids[0],
    player,
    ownedCreatures,
    teamIds: ids.slice(),
    activeTeamId: ids[v1.team.activeIndex] ?? ids[0],
    money: v1.money,
    bag: { potion: v1.bag.potion, ball: v1.bag.ball },
    location: null, // v1 never persisted location; client spawns at the safe gateway
    fieldGuide,
    badges: [],
    flags: {},
    profile: "dpk3_2026_core",
    savedAt: v1.savedAt,
  };

  if (!validateSaveV2(migrated)) {
    // Should be unreachable: the v1 input validated and the mapping is total.
    // Guard anyway so a future schema edit can never silently ship a bad save.
    throw new SaveMigrationError("migrated save failed v2 validation");
  }
  return migrated;
}

/**
 * Accept a v1 OR v2 payload and return a validated v2 save. The Worker's
 * single read/write path: a stored v1 row is migrated, a v2 row (or a v2
 * client write) passes through validated, and anything else fails cleanly.
 */
export function normalizeSave(raw: unknown, options: MigrateOptions = {}): SaveStateV2 {
  if (raw !== null && typeof raw === "object") {
    const version = (raw as { version?: unknown }).version;
    if (version === SAVE_VERSION) {
      // Additive v2 fields backfill on this single read/write path (#17):
      // a v2 row stored before `flags` existed gains an empty record here
      // rather than dying as "unreadable" — migrate on read, not a shim.
      const record = raw as Record<string, unknown>;
      if (record.flags === undefined) record.flags = {};
      if (validateSaveV2(raw)) return raw as SaveStateV2;
      throw new SaveMigrationError("version-2 save failed validation");
    }
  }
  return migrateSave(raw, options);
}

// --- helpers ---

function toOwned(creature: CreatureState, creatureId: string): OwnedCreatureState {
  return {
    creatureId,
    // The preview always set speciesId (post-starter-selection). A pre-speciesId
    // legacy creature lacks it; synthesize a stable, clearly-marked fallback so
    // migration never fails on an old save while keeping the id non-empty.
    speciesId: creature.speciesId ?? legacySpeciesId(creature.name),
    stage: 1,
    variant: "normal",
    name: creature.name,
    color: creature.color,
    maxHp: creature.maxHp,
    hp: creature.hp,
    attack: creature.attack,
    level: creature.level,
    xp: creature.xp,
    boss: creature.boss,
  };
}

function legacySpeciesId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
  return `legacy:${slug}`;
}

function seedPlayer(team: readonly CreatureState[]): { level: number; totalXp: number } {
  // Highest level wins; among ties, the most fractional progress (highest xp).
  let best = team[0];
  for (const c of team) {
    if (c.level > best.level || (c.level === best.level && c.xp > best.xp)) best = c;
  }
  // A legacy creature's xp is bounded [0, XP_PER_LEVEL) by awardXp, but a
  // hand-authored fixture could carry xp at the cap; clamp the fraction so the
  // helper's strict bound never rejects a realistic input.
  const clampedXp = Math.min(best.xp, LEGACY_XP_PER_LEVEL - 1);
  return legacyToPlayerProgress(best.level, clampedXp);
}
