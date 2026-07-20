// Pure one-time world-grid migration. Shared save normalization can identify
// an old revision but deliberately does not import game geography; the client
// owns region openness and safe spawns.

import {
  WORLD_LAYOUT_REVISION,
  type LocationState,
  type SaveStateV2,
} from "../../shared/index";
import { isOpenRegion } from "../world/regions/index";

export interface WorldResume {
  readonly regionId: string;
  readonly startAt: LocationState | null;
  readonly migrated: boolean;
}

/** Decide where boot should enter before WorldScreen resolves the safe spawn. */
export function resolveWorldResume(save: SaveStateV2): WorldResume {
  const migrated = save.worldLayoutRevision < WORLD_LAYOUT_REVISION;
  const saved = save.location && isOpenRegion(save.location.regionId) ? save.location : null;
  if (!saved) return { regionId: "harbor", startAt: null, migrated };

  // Compact Meadow grids deliberately invalidate old local coordinates. Keep
  // the child's region, but let WorldScreen use that region's authored spawn.
  if (migrated && saved.regionId.startsWith("meadow/")) {
    return { regionId: saved.regionId, startAt: null, migrated: true };
  }

  // Harbor did not change, and current-revision Meadow coordinates are exact.
  return { regionId: saved.regionId, startAt: { ...saved }, migrated };
}
