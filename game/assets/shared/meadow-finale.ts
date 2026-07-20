// Meadow Isle finale (M6, #23): the Meadow Badge and guaranteed starter
// evolution after the Cloud-Maned Horse guardian battle.
//
// Design authority: docs/islands/meadow-isle.md §8 + locked decisions —
//   - Victory awards the Meadow Badge exactly once and persists it.
//   - The starter identified by `starterCreatureId` evolves whether active
//     or stored, with no FOMO condition.
//
// Pure domain: GameState applies the result; World/GameApp only show notices.

import { SPECIES_BY_ID } from "./creature";
import type { OwnedCreatureState, SaveStateV2 } from "./save-v2";

/** The island badge id on save v2 `badges`. Awarded once, never revoked. */
export const MEADOW_BADGE = "meadow-badge";

/** Stage the Meadow Badge evolves the starter to (1-based). */
export const MEADOW_STARTER_EVOLUTION_STAGE = 2;

/** Shown the first time the Meadow Badge is earned. */
export const MEADOW_BADGE_NOTICE =
  "You earned the Meadow Badge! The island remembers your kindness. " +
  "获得了牧场徽章！整座岛都记得你的温柔。";

/** Shown when the starter's stage advances with the badge. */
export function starterEvolvedNotice(name: string): string {
  return (
    `${name} is glowing — it evolved! ${name} 身上亮起了光——它进化了！`
  );
}

export interface MeadowFinaleResult {
  readonly save: SaveStateV2;
  /** True only the first time the badge is written. */
  readonly badgeAwarded: boolean;
  /** The starter's display name when its stage just advanced; null otherwise. */
  readonly evolvedName: string | null;
}

/**
 * Apply the Hundred Stones victory payoffs to a save:
 * 1. Award `meadow-badge` if not already held.
 * 2. Evolve the starter located by `starterCreatureId` to stage 2 when the
 *    species has a second stage and the starter is still stage 1.
 *
 * Idempotent: a second victory is a pure no-op (badge stays once; stage stays
 * at 2). Never mutates its input.
 */
export function awardMeadowFinale(save: SaveStateV2): MeadowFinaleResult {
  const badgeAwarded = !save.badges.includes(MEADOW_BADGE);
  const badges = badgeAwarded ? [...save.badges, MEADOW_BADGE] : save.badges;

  let evolvedName: string | null = null;
  const ownedCreatures: OwnedCreatureState[] = save.ownedCreatures.map((creature) => {
    if (creature.creatureId !== save.starterCreatureId) return creature;
    if (creature.stage >= MEADOW_STARTER_EVOLUTION_STAGE) return creature;
    const species = SPECIES_BY_ID[creature.speciesId];
    if (!species || species.stages < MEADOW_STARTER_EVOLUTION_STAGE) return creature;
    evolvedName = creature.name;
    return { ...creature, stage: MEADOW_STARTER_EVOLUTION_STAGE };
  });

  if (!badgeAwarded && evolvedName === null) {
    return { save, badgeAwarded: false, evolvedName: null };
  }

  return {
    save: { ...save, badges, ownedCreatures },
    badgeAwarded,
    evolvedName,
  };
}
