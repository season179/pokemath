// v1 → v2 adapter (M3, #10). Lifts a parsed legacy bank into the runtime v2
// shape so the whole game can speak one question contract, while every
// serving decision (choices, shuffling, formatting, step turns) stays exactly
// as v1 behaved — the schema-v2 golden tests pin that byte-for-byte.
//
// The adapter only fills METADATA defaults; it never rewrites content, so
// adapted output is runtime-valid but not necessarily wire-valid: legacy
// free-text distractor strategies and multi-step items are preserved
// verbatim, and topic "legacy" marks content that predates topic tagging
// (the wire schema constrains topic to the curriculum ids).
//
// Inference is deliberately simple and deterministic — legacy metadata is
// descriptive (review tooling, generation weighting), never used to serve:
//   operation "counting" → format_type count-write, presentation picture,
//                          answer_form count   (the Woolly pictured counts)
//   stepped questions    → format_type word-single, presentation story
//                          (the legacy Year-4 multi-step word problems)
//   anything else        → format_type fill-blank, presentation plain,
//                          answer_form numeral

import { isCurriculumProfile, type CurriculumProfile } from "./curriculum.ts";
import type { Question, VersionedQuestionBankData } from "./question-engine.ts";
import {
  chineseNumeral,
  type QuestionV2,
  type VersionedQuestionBankV2Data,
} from "./question-v2.ts";

/** Topic marker for adapted content that predates topic tagging. Not a
 * curriculum section id — the v2 wire schema rejects it, which is the point. */
export const LEGACY_TOPIC = "legacy";

/** TP placeholder for adapted content (the PBD ladder midpoint). Legacy
 * banks predate TP tagging; nothing may gate on this value. */
export const LEGACY_TP_LEVEL = 3;

function adaptProfile(value: string | undefined, label: string): CurriculumProfile {
  if (value === undefined) return "dpk3_2026_core"; // safest default
  if (!isCurriculumProfile(value)) {
    throw new Error(
      `${label} "${value}" is not a known curriculum profile ` +
        `(expected one of: dpk3_2026_core, original_dskp_extra)`,
    );
  }
  return value;
}

/** Lift one legacy question. Never mutates — or aliases — the input. */
export function adaptV1Question(q: Question): QuestionV2 {
  const profile = adaptProfile(q.profile, `question ${q.id}.profile`);
  let zhWord: string;
  try {
    zhWord = chineseNumeral(q.answer);
  } catch (cause) {
    throw new Error(
      `question ${q.id}: cannot derive bilingual.zh_word — ${(cause as Error).message}`,
    );
  }
  const counting = q.operation === "counting";
  const stepped = q.steps !== undefined && q.steps.length > 0;
  // Deep-copy so the adapted bank owns its objects outright: legacy steps,
  // tables, and distractors must never alias the source bank's sub-objects.
  // Legacy banks never carry a declared ordering sequence (#12) — the v1
  // wire rejects unknown fields — so omit it from the runtime v2 view.
  const { sequence: _sequence, ...owned } = structuredClone(q);
  return {
    ...owned,
    topic: q.topic ?? LEGACY_TOPIC,
    tp_level: q.tp_level ?? LEGACY_TP_LEVEL,
    profile,
    item_format: "objective",
    format_type: counting ? "count-write" : stepped ? "word-single" : "fill-blank",
    presentation: counting ? "picture" : stepped ? "story" : "plain",
    answer_form: counting ? "count" : "numeral",
    bilingual: { numeral: String(q.answer), zh_word: zhWord },
  };
}

/** Lift a whole parsed v1 bank into the runtime v2 envelope. */
export function adaptQuestionBankV1ToV2(
  bank: VersionedQuestionBankData,
): VersionedQuestionBankV2Data {
  if (bank.schema_version !== 1) {
    throw new Error(
      `adaptQuestionBankV1ToV2 expects a schema v1 bank, got schema_version ${String(bank.schema_version)}`,
    );
  }
  const adapted: VersionedQuestionBankV2Data = {
    schema_version: 2,
    bank_id: bank.bank_id,
    version: bank.version,
    source: bank.source,
    currency: bank.currency,
    questions: bank.questions.map(adaptV1Question),
  };
  if (bank.profile !== undefined) {
    adapted.profile = adaptProfile(bank.profile, "question bank profile");
  }
  if (bank.scope !== undefined) adapted.scope = bank.scope;
  return adapted;
}
