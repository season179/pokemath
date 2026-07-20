// Question-bank manifest: the explicit approval record that routes a battle's
// question request to one approved, versioned bank (M3, #13).
//
// Banks are immutable versioned JSON; the manifest is the separate, small
// artifact that says WHICH bank version is approved to serve which slice of
// the curriculum. A bad content batch is disabled or rolled back by approving
// a new manifest (or repointing the active pointer at the previous one) —
// battle code and bank artifacts never change.
//
// Three artifacts, all plain JSON under game/assets/resources/question-banks/:
//   active-manifest.json   pointer: which manifest file is active right now
//   manifest.v{N}.json     immutable approval record, one per approval round
//   std1/*.v{N}.json       the banks themselves (question-bank-validate.ts)
//
// Route key: (grade, topic, TP range, curriculum profile). The entry declares
// the slice its bank was reviewed for; verifyManifestEntryAgainstBank then
// proves the bank's questions actually carry those tags, so the manifest can
// never silently drift from the content it approves.

import {
  CURRICULUM_PROFILES,
  servesProfile,
  type CurriculumProfile,
} from "./curriculum.ts";
import {
  record,
  rejectUnknownFields,
  requiredEnum,
  requiredInteger,
  requiredString,
} from "./parse-util.ts";
import { QUESTION_TOPICS, type AnyVersionedQuestionBankData } from "./question-v2.ts";

/** Grades a manifest can route. Only Standard 1 has banks today; new grades
 * extend this list alongside their bank directories. */
export const QUESTION_BANK_GRADES = ["std1"] as const;
export type QuestionBankGrade = (typeof QUESTION_BANK_GRADES)[number];

/** One approved route: the bank version allowed to serve a curriculum slice. */
export interface QuestionBankManifestEntry {
  grade: QuestionBankGrade;
  topic: string; // QUESTION_TOPICS vocabulary (question-v2.ts)
  tp_min: number; // PBD performance level range the bank covers, 1..6
  tp_max: number; // >= tp_min
  profile: CurriculumProfile;
  bank_id: string;
  version: number; // must equal the bank JSON's own version
  path: string; // Cocos resources path, no extension
}

/** The immutable approval record. Bump `version` on every approval change and
 * ship it as a new manifest.v{N}.json — never edit a shipped manifest. */
export interface QuestionBankManifest {
  schema_version: 1;
  manifest_id: string;
  version: number;
  source: string;
  entries: QuestionBankManifestEntry[];
}

/** The operator's rollback lever: repoint `manifest` at the previous approved
 * manifest file and redeploy. Bank artifacts are untouched either way. */
export interface ActiveManifestPointer {
  schema_version: 1;
  manifest: string; // Cocos resources path of the active manifest
}

/** What an encounter knows when it asks for a bank. `tpLevel` disambiguates
 * when two approved banks share (grade, topic, profile) with disjoint TP
 * bands; with a single matching entry it may be omitted. */
export interface BankRouteRequest {
  grade: string;
  topic: string;
  profile: CurriculumProfile;
  tpLevel?: number;
}

const MANIFEST_FIELDS = new Set(["schema_version", "manifest_id", "version", "source", "entries"]);
const ENTRY_FIELDS = new Set([
  "grade", "topic", "tp_min", "tp_max", "profile", "bank_id", "version", "path",
]);
const POINTER_FIELDS = new Set(["schema_version", "manifest"]);

/** Validate the active-manifest pointer (active-manifest.json). */
export function parseActiveManifestPointer(raw: unknown): ActiveManifestPointer {
  const pointer = record(raw);
  if (!pointer) throw new Error("active-manifest pointer must be an object");
  rejectUnknownFields(pointer, POINTER_FIELDS, "active-manifest pointer");
  if (pointer.schema_version !== 1) {
    throw new Error(
      `unsupported active-manifest pointer schema version: ${String(pointer.schema_version)} (supported: 1)`,
    );
  }
  return { schema_version: 1, manifest: requiredString(pointer.manifest, "pointer manifest") };
}

/** Validate an approval manifest. Rejects unknown fields, out-of-range TP
 * bands, duplicate bank references, and overlapping routes — an ambiguous
 * manifest must fail here, not at battle time. */
export function parseQuestionBankManifest(raw: unknown): QuestionBankManifest {
  const manifest = record(raw);
  if (!manifest) throw new Error("question-bank manifest must be an object");
  rejectUnknownFields(manifest, MANIFEST_FIELDS, "question-bank manifest");
  if (manifest.schema_version !== 1) {
    throw new Error(
      `unsupported question-bank manifest schema version: ${String(manifest.schema_version)} (supported: 1)`,
    );
  }
  const manifestId = requiredString(manifest.manifest_id, "manifest manifest_id");
  const version = requiredInteger(manifest.version, "manifest version");
  if (version < 1) throw new Error("manifest requires a positive integer version");
  const source = requiredString(manifest.source, "manifest source");
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error("manifest requires at least one entry");
  }

  const entries = manifest.entries.map((value, index): QuestionBankManifestEntry => {
    const label = `manifest entry[${index}]`;
    const entry = record(value);
    if (!entry) throw new Error(`${label} must be an object`);
    rejectUnknownFields(entry, ENTRY_FIELDS, label);
    const tpMin = requiredInteger(entry.tp_min, `${label} tp_min`);
    const tpMax = requiredInteger(entry.tp_max, `${label} tp_max`);
    for (const [name, tp] of [["tp_min", tpMin], ["tp_max", tpMax]] as const) {
      if (tp < 1 || tp > 6) throw new Error(`${label} ${name} must be in [1, 6]`);
    }
    if (tpMin > tpMax) throw new Error(`${label} tp_min must not exceed tp_max`);
    const entryVersion = requiredInteger(entry.version, `${label} version`);
    if (entryVersion < 1) throw new Error(`${label} requires a positive integer version`);
    return {
      grade: requiredEnum(entry.grade, QUESTION_BANK_GRADES, `${label} grade`),
      topic: requiredEnum(entry.topic, QUESTION_TOPICS, `${label} topic`),
      tp_min: tpMin,
      tp_max: tpMax,
      profile: requiredEnum(entry.profile, CURRICULUM_PROFILES, `${label} profile`),
      bank_id: requiredString(entry.bank_id, `${label} bank_id`),
      version: entryVersion,
      path: requiredString(entry.path, `${label} path`),
    };
  });

  const paths = new Set<string>();
  const bankRefs = new Set<string>();
  for (const entry of entries) {
    if (paths.has(entry.path)) throw new Error(`manifest lists bank path twice: ${entry.path}`);
    paths.add(entry.path);
    const ref = `${entry.bank_id} v${entry.version}`;
    if (bankRefs.has(ref)) throw new Error(`manifest approves the same bank twice: ${ref}`);
    bankRefs.add(ref);
  }
  for (let a = 0; a < entries.length; a++) {
    for (let b = a + 1; b < entries.length; b++) {
      if (routesOverlap(entries[a], entries[b])) {
        throw new Error(
          `manifest entries[${a}] and entries[${b}] both serve ` +
            `${entries[a].grade}/${entries[a].topic} TP${entries[a].tp_min}–${entries[a].tp_max}: ` +
            "routes must not overlap",
        );
      }
    }
  }

  return { schema_version: 1, manifest_id: manifestId, version, source, entries };
}

/** Two routes conflict when a single request could match both: same grade and
 * topic, intersecting TP bands, and profiles a request can satisfy together
 * (a core route matches every profile request). Exported so offline tools can
 * precheck and replace routes with the same overlap law the parser enforces. */
export function routesOverlap(
  a: QuestionBankManifestEntry,
  b: QuestionBankManifestEntry,
): boolean {
  if (a.grade !== b.grade || a.topic !== b.topic) return false;
  if (a.tp_min > b.tp_max || b.tp_min > a.tp_max) return false;
  return (
    a.profile === b.profile ||
    a.profile === "dpk3_2026_core" ||
    b.profile === "dpk3_2026_core"
  );
}

/** True when the entry's route covers the request. Profile follows the
 * curriculum gate: a core-approved bank serves every profile, an
 * extra-approved bank serves only the extra profile. */
export function entryServes(entry: QuestionBankManifestEntry, request: BankRouteRequest): boolean {
  if (entry.grade !== request.grade || entry.topic !== request.topic) return false;
  if (request.tpLevel !== undefined && (request.tpLevel < entry.tp_min || request.tpLevel > entry.tp_max)) {
    return false;
  }
  return servesProfile(entry.profile, request.profile);
}

/**
 * Pick the single approved entry for a request. Throws when no route exists
 * (bank never shipped for that slice) or when several match (manifest bug —
 * parse-time overlap checks should have caught it).
 */
export function resolveManifestEntry(
  manifest: QuestionBankManifest,
  request: BankRouteRequest,
): QuestionBankManifestEntry {
  const matches = manifest.entries.filter((entry) => entryServes(entry, request));
  const want =
    `grade=${request.grade} topic=${request.topic} profile=${request.profile}` +
    (request.tpLevel !== undefined ? ` tp=${request.tpLevel}` : "");
  if (matches.length === 0) {
    throw new Error(
      `no approved question-bank route for ${want} (manifest ${manifest.manifest_id} v${manifest.version})`,
    );
  }
  if (matches.length > 1) {
    const refs = matches.map((m) => `${m.bank_id} v${m.version}`).join(", ");
    throw new Error(`ambiguous question-bank route for ${want}: ${refs}`);
  }
  return matches[0];
}

/**
 * Prove a loaded bank is the one its route approves and that its questions
 * actually carry the route's curriculum tags. Runs at load time (before any
 * battle) and in CI; any drift fails loudly here. A mismatched bank_id or
 * version means the manifest points at the wrong artifact — the operator
 * rolls the manifest back, never edits the bank.
 */
export function verifyManifestEntryAgainstBank(
  entry: QuestionBankManifestEntry,
  bank: AnyVersionedQuestionBankData,
): void {
  const route = `${entry.grade}/${entry.topic} TP${entry.tp_min}–${entry.tp_max} ${entry.profile}`;
  if (bank.bank_id !== entry.bank_id) {
    throw new Error(
      `route ${route} approves bank "${entry.bank_id}" but ${entry.path} holds "${bank.bank_id}"`,
    );
  }
  if (bank.version !== entry.version) {
    throw new Error(
      `route ${route} approves ${entry.bank_id} v${entry.version} but ${entry.path} holds v${bank.version}`,
    );
  }
  for (const question of bank.questions) {
    if (question.topic === undefined) {
      throw new Error(`${entry.bank_id} question ${question.id} has no topic tag; routed banks must tag every question`);
    }
    if (question.topic !== entry.topic) {
      throw new Error(
        `${entry.bank_id} question ${question.id} topic ${question.topic} is outside route topic ${entry.topic}`,
      );
    }
    if (question.tp_level === undefined) {
      throw new Error(`${entry.bank_id} question ${question.id} has no tp_level tag; routed banks must tag every question`);
    }
    if (question.tp_level < entry.tp_min || question.tp_level > entry.tp_max) {
      throw new Error(
        `${entry.bank_id} question ${question.id} tp_level ${question.tp_level} is outside route TP${entry.tp_min}–${entry.tp_max}`,
      );
    }
    const questionProfile = question.profile ?? "dpk3_2026_core";
    if (
      !(CURRICULUM_PROFILES as readonly string[]).includes(questionProfile) ||
      !servesProfile(questionProfile as CurriculumProfile, entry.profile)
    ) {
      throw new Error(
        `${entry.bank_id} question ${question.id} profile "${questionProfile}" is never served by route profile ${entry.profile}`,
      );
    }
  }
}
