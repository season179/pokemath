// Encounter engine: pure, injectable-rng selection of a wild species from a
// weighted table. Region data carries only stable species ids (strings) plus
// weights; this module resolves ids to Species through the shared roster so
// region files never import Species objects directly (the regions directory is
// mirrored into Cocos at a different depth — see tools/sync-shared.mjs).
//
// Rarity labels live on the region table for human readability; selection uses
// only `weight`, so the common/uncommon/rare split is verifiable from data.

import { SPECIES_BY_ID, type Species } from "./creature.ts";

export type Rarity = "common" | "uncommon" | "rare";

export interface EncounterEntry {
  readonly speciesId: string;
  readonly weight: number;
  readonly rarity: Rarity;
}

export interface EncounterTable {
  /** Probability of an encounter when entering an encounter tile. */
  readonly rate: number;
  readonly entries: readonly EncounterEntry[];
}

export function rollEncounter(rate: number, rng: () => number = Math.random): boolean {
  return rng() < rate;
}

function resolveSpecies(speciesId: string): Species {
  const species = SPECIES_BY_ID[speciesId];
  if (!species) throw new Error(`pickEncounter: unknown speciesId "${speciesId}"`);
  return species;
}

// Weighted pick over the table. A seeded rng makes the distribution testable.
export function pickEncounter(
  entries: readonly EncounterEntry[],
  rng: () => number = Math.random,
): Species {
  if (entries.length === 0) throw new Error("pickEncounter: empty encounter table");
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) throw new Error("pickEncounter: total weight must be positive");
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) return resolveSpecies(entry.speciesId);
  }
  // rng() ∈ [0, 1) keeps roll strictly under `total`, so the loop above always
  // returns. This fallback only guards against float drift at the boundary.
  return resolveSpecies(entries[entries.length - 1].speciesId);
}
