// Curriculum profiles: which Standard-1 syllabus a bank/question is authored
// for, and which questions a given profile may be served.
//
// Source of truth: docs/curriculum/standard-1-sjkc-math.md §1. Since Surat
// Siaran KPM Bil. 6/2024, Level-1 maths may follow either the slimmer DPK
// Edisi 3 core or the full original DSKP, so content carries a profile flag
// instead of one universal topic list. `sjkc_representation` (Chinese wording,
// 1:4 abacus, MYR context) is an always-on layer, NOT a profile, and is
// deliberately absent here.

export const CURRICULUM_PROFILES = ["dpk3_2026_core", "original_dskp_extra"] as const;

export type CurriculumProfile = (typeof CURRICULUM_PROFILES)[number];

export function isCurriculumProfile(value: unknown): value is CurriculumProfile {
  return typeof value === "string" && (CURRICULUM_PROFILES as readonly string[]).includes(value);
}

/**
 * Which questions an active profile may be served. `original_dskp_extra` is
 * defined as DPK core PLUS the DSKP-only extras, so core material is served
 * under every profile and extra-profile material only under its own.
 */
export function servesProfile(
  itemProfile: CurriculumProfile,
  activeProfile: CurriculumProfile,
): boolean {
  return itemProfile === "dpk3_2026_core" || itemProfile === activeProfile;
}

/**
 * Filter a question list down to what the active curriculum profile may see.
 * Questions without a profile tag (legacy v1 content) default to core, the
 * safest reading — the v1→v2 adapter applies the same default. An unknown
 * profile string on a question or as the active profile is a content error:
 * it fails loudly here rather than silently reaching a child.
 */
export function gateQuestionsByProfile<T extends { profile?: string }>(
  questions: readonly T[],
  activeProfile: CurriculumProfile,
): T[] {
  if (!isCurriculumProfile(activeProfile)) {
    throw new Error(
      `active curriculum profile must be one of: ${CURRICULUM_PROFILES.join(", ")}`,
    );
  }
  return questions.filter((q) => {
    const profile = q.profile ?? "dpk3_2026_core";
    if (!isCurriculumProfile(profile)) {
      throw new Error(
        `question has unknown curriculum profile "${q.profile}" ` +
          `(expected one of: ${CURRICULUM_PROFILES.join(", ")})`,
      );
    }
    return servesProfile(profile, activeProfile);
  });
}
