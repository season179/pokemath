import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

import { parseQuestionBankData } from "../question-bank-validate.ts";
import {
  entryServes,
  parseActiveManifestPointer,
  parseQuestionBankManifest,
  resolveManifestEntry,
  verifyManifestEntryAgainstBank,
  type QuestionBankManifest,
  type QuestionBankManifestEntry,
} from "../question-bank-manifest.ts";

const RESOURCES_URL = new URL("../../game/assets/resources/", import.meta.url);
const POINTER_URL = new URL("question-banks/active-manifest.json", RESOURCES_URL);
const MANIFEST_V1_URL = new URL("question-banks/manifest.v1.json", RESOURCES_URL);

const POINTER_SCHEMA = JSON.parse(
  await readFile(new URL("../../schemas/question-bank-manifest-pointer-v1.schema.json", import.meta.url), "utf8"),
);
const MANIFEST_SCHEMA = JSON.parse(
  await readFile(new URL("../../schemas/question-bank-manifest-v1.schema.json", import.meta.url), "utf8"),
);
const schemaAjv = new Ajv2020({ allErrors: true });
const validatePointerSchema = schemaAjv.compile(POINTER_SCHEMA);
const validateManifestSchema = schemaAjv.compile(MANIFEST_SCHEMA);

const REAL_POINTER_JSON = JSON.parse(await readFile(POINTER_URL, "utf8"));
const REAL_MANIFEST_JSON = JSON.parse(await readFile(MANIFEST_V1_URL, "utf8"));
const REAL_POINTER = parseActiveManifestPointer(REAL_POINTER_JSON);
const REAL_MANIFEST = parseQuestionBankManifest(REAL_MANIFEST_JSON);

const WOOLLY_REQUEST = { grade: "std1", topic: "4.1", profile: "dpk3_2026_core" } as const;

async function readBankAtPath(path: string) {
  const url = new URL(`${path}.json`, RESOURCES_URL);
  return parseQuestionBankData(JSON.parse(await readFile(url, "utf8")));
}

/** A valid manifest fixture; tests mutate copies to probe rejection. */
function manifestFixture(): Record<string, unknown> {
  return {
    schema_version: 1,
    manifest_id: "test-manifest",
    version: 1,
    source: "test fixture",
    entries: [
      {
        grade: "std1",
        topic: "4.1",
        tp_min: 1,
        tp_max: 2,
        profile: "dpk3_2026_core",
        bank_id: "std1.woolly-meadows",
        version: 1,
        path: "question-banks/std1/woolly-meadows.v1",
      },
    ],
  };
}

function entryFixture(overrides: Partial<QuestionBankManifestEntry> = {}): QuestionBankManifestEntry {
  return { ...(manifestFixture().entries as QuestionBankManifestEntry[])[0], ...overrides };
}

// --- current manifest: the shipped pointer + manifest route to the real bank ---

test("current: active-manifest pointer is valid and schema-clean", () => {
  assert.equal(REAL_POINTER.schema_version, 1);
  assert.equal(REAL_POINTER.manifest, "question-banks/manifest.v1");
  assert.ok(
    validatePointerSchema(REAL_POINTER_JSON),
    JSON.stringify(validatePointerSchema.errors),
  );
});

test("current: manifest.v1 is valid and schema-clean", () => {
  assert.equal(REAL_MANIFEST.manifest_id, "std1-question-banks");
  assert.equal(REAL_MANIFEST.version, 1);
  assert.equal(REAL_MANIFEST.entries.length, 1);
  assert.ok(
    validateManifestSchema(REAL_MANIFEST_JSON),
    JSON.stringify(validateManifestSchema.errors),
  );
});

test("current: pointer names a manifest file that exists and parses", async () => {
  const url = new URL(`${REAL_POINTER.manifest}.json`, RESOURCES_URL);
  const reparsed = parseQuestionBankManifest(JSON.parse(await readFile(url, "utf8")));
  assert.deepEqual(reparsed, REAL_MANIFEST);
});

test("current: the Woolly route resolves to the reviewed bank, which verifies", async () => {
  const entry = resolveManifestEntry(REAL_MANIFEST, WOOLLY_REQUEST);
  assert.equal(entry.bank_id, "std1.woolly-meadows");
  assert.equal(entry.version, 1);
  // TP range selection: the whole declared band resolves.
  assert.equal(resolveManifestEntry(REAL_MANIFEST, { ...WOOLLY_REQUEST, tpLevel: 1 }), entry);
  assert.equal(resolveManifestEntry(REAL_MANIFEST, { ...WOOLLY_REQUEST, tpLevel: 2 }), entry);
  const bank = await readBankAtPath(entry.path);
  verifyManifestEntryAgainstBank(entry, bank);
});

test("current: a core route also serves the extra profile (curriculum gate)", () => {
  const entry = resolveManifestEntry(REAL_MANIFEST, {
    ...WOOLLY_REQUEST,
    profile: "original_dskp_extra",
  });
  assert.equal(entry.bank_id, "std1.woolly-meadows");
});

// --- previous manifest: rollback keeps an older approval record loadable ---

test("previous: an older approved manifest still resolves and verifies", async () => {
  // Simulate history: manifest v2 is the live approval, v1 (the shipped file)
  // is the rollback target. Restoring v1 must keep working without touching
  // the immutable bank artifact it names.
  const current = parseQuestionBankManifest({ ...REAL_MANIFEST_JSON, version: 2 });
  const previous = parseQuestionBankManifest(REAL_MANIFEST_JSON);
  assert.ok(previous.version < current.version);
  for (const manifest of [current, previous]) {
    const entry = resolveManifestEntry(manifest, WOOLLY_REQUEST);
    verifyManifestEntryAgainstBank(entry, await readBankAtPath(entry.path));
  }
});

// --- missing: unavailable routes and references fail loudly ---

test("missing: unrouted grade, topic, or TP level is rejected", () => {
  assert.throws(
    () => resolveManifestEntry(REAL_MANIFEST, { ...WOOLLY_REQUEST, grade: "std2" }),
    /no approved question-bank route/,
  );
  assert.throws(
    () => resolveManifestEntry(REAL_MANIFEST, { ...WOOLLY_REQUEST, topic: "4.4" }),
    /no approved question-bank route/,
  );
  assert.throws(
    () => resolveManifestEntry(REAL_MANIFEST, { ...WOOLLY_REQUEST, tpLevel: 3 }),
    /no approved question-bank route/,
  );
});

test("missing: a route naming the wrong bank id or version is rejected", async () => {
  const bank = await readBankAtPath("question-banks/std1/woolly-meadows.v1");
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture({ bank_id: "std1.other-bank" }), bank),
    /approves bank "std1\.other-bank" but .* holds "std1\.woolly-meadows"/,
  );
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture({ version: 2 }), bank),
    /approves std1\.woolly-meadows v2 but .* holds v1/,
  );
});

test("missing: unknown bank schema versions stay rejected at the bank boundary", () => {
  assert.throws(
    () => parseQuestionBankData({ schema_version: 99 }),
    /unsupported question-bank schema version: 99 \(supported: 1, 2\)/,
  );
});

test("missing: route content drifting outside its slice is rejected", async () => {
  const bank = await readBankAtPath("question-banks/std1/woolly-meadows.v1");
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture({ topic: "4.2" }), bank),
    /is outside route topic 4\.2/,
  );
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture({ tp_min: 2, tp_max: 4 }), bank),
    /is outside route TP2–4/,
  );
  // An extra-profile question is never served by a core route; a bank
  // carrying one must be approved under the extra route instead.
  const extraQuestion = { ...bank.questions[0], profile: "original_dskp_extra" };
  const mixedBank = { ...bank, questions: [extraQuestion, ...bank.questions.slice(1)] };
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture(), mixedBank),
    /never served by route profile/,
  );
  // Untagged legacy questions cannot prove they belong to the route.
  const untagged = { ...bank.questions[0] } as Record<string, unknown>;
  delete untagged.topic;
  const untaggedBank = { ...bank, questions: [untagged, ...bank.questions.slice(1)] };
  assert.throws(
    () => verifyManifestEntryAgainstBank(entryFixture(), untaggedBank as never),
    /has no topic tag/,
  );
});

// --- malformed pointer ---

test("malformed pointer: shape and version errors", () => {
  assert.throws(() => parseActiveManifestPointer(null), /must be an object/);
  assert.throws(
    () => parseActiveManifestPointer({ schema_version: 1, manifest: "x", extra: 1 }),
    /unknown field\(s\): extra/,
  );
  assert.throws(
    () => parseActiveManifestPointer({ schema_version: 2, manifest: "x" }),
    /unsupported active-manifest pointer schema version: 2 \(supported: 1\)/,
  );
  assert.throws(
    () => parseActiveManifestPointer({ schema_version: 1, manifest: "  " }),
    /pointer manifest must be a non-empty string/,
  );
});

// --- malformed manifest ---

test("malformed manifest: envelope errors", () => {
  assert.throws(() => parseQuestionBankManifest(null), /must be an object/);
  assert.throws(
    () => parseQuestionBankManifest({ ...manifestFixture(), schema_version: 2 }),
    /unsupported question-bank manifest schema version: 2 \(supported: 1\)/,
  );
  assert.throws(
    () => parseQuestionBankManifest({ ...manifestFixture(), notes: "x" }),
    /unknown field\(s\): notes/,
  );
  assert.throws(
    () => parseQuestionBankManifest({ ...manifestFixture(), entries: [] }),
    /at least one entry/,
  );
  assert.throws(
    () => parseQuestionBankManifest({ ...manifestFixture(), entries: "std1" }),
    /at least one entry/,
  );
  assert.throws(
    () => parseQuestionBankManifest({ ...manifestFixture(), version: 0 }),
    /positive integer version/,
  );
});

test("malformed manifest: entry field errors", () => {
  const withEntry = (patch: Record<string, unknown>) => {
    const fixture = manifestFixture();
    fixture.entries = [{ ...(fixture.entries as Record<string, unknown>[])[0], ...patch }];
    return fixture;
  };
  assert.throws(() => parseQuestionBankManifest(withEntry({ grade: "std2" })), /grade must be one of: std1/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ topic: "5.1" })), /topic must be one of/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ tp_min: 0 })), /tp_min must be in \[1, 6\]/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ tp_max: 7 })), /tp_max must be in \[1, 6\]/);
  assert.throws(
    () => parseQuestionBankManifest(withEntry({ tp_min: 3, tp_max: 2 })),
    /tp_min must not exceed tp_max/,
  );
  assert.throws(() => parseQuestionBankManifest(withEntry({ profile: "ib_pyp" })), /profile must be one of/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ bank_id: "" })), /bank_id must be a non-empty string/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ version: 0 })), /positive integer version/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ path: "" })), /path must be a non-empty string/);
  assert.throws(() => parseQuestionBankManifest(withEntry({ weight: 2 })), /unknown field\(s\): weight/);
});

test("malformed manifest: duplicate and overlapping routes", () => {
  const withEntries = (entries: Record<string, unknown>[]) => ({
    ...manifestFixture(),
    entries,
  });
  const base = (manifestFixture().entries as Record<string, unknown>[])[0];
  assert.throws(
    () => parseQuestionBankManifest(withEntries([base, { ...base, bank_id: "std1.copy" }])),
    /lists bank path twice/,
  );
  assert.throws(
    () => parseQuestionBankManifest(withEntries([base, { ...base, path: "question-banks/std1/copy" }])),
    /approves the same bank twice/,
  );
  // Same slice, intersecting TP bands — a core and an extra route still
  // collide, because an extra-profile request would match both.
  assert.throws(
    () =>
      parseQuestionBankManifest(
        withEntries([
          base,
          { ...base, profile: "original_dskp_extra", bank_id: "std1.extra", path: "question-banks/std1/extra" },
        ]),
      ),
    /routes must not overlap/,
  );
  // Disjoint TP bands over the same slice are legitimate (future TP bands).
  const disjoint = parseQuestionBankManifest(
    withEntries([
      base,
      { ...base, tp_min: 3, tp_max: 4, bank_id: "std1.band2", path: "question-banks/std1/band2" },
    ]),
  );
  assert.equal(disjoint.entries.length, 2);
});

test("malformed manifest: ambiguity past the parser still fails at resolution", () => {
  // Defense in depth: if a manifest ever reaches runtime with overlapping
  // routes (hand-edited past validation), resolution refuses to guess.
  const entry = entryFixture();
  const ambiguous: QuestionBankManifest = {
    schema_version: 1,
    manifest_id: "test-manifest",
    version: 1,
    source: "test fixture",
    entries: [entry, { ...entry, bank_id: "std1.copy", path: "question-banks/std1/copy" }],
  };
  assert.throws(() => resolveManifestEntry(ambiguous, WOOLLY_REQUEST), /ambiguous question-bank route/);
});

// --- route predicate ---

test("entryServes: grade, topic, TP band, and profile gate", () => {
  const entry = entryFixture();
  assert.ok(entryServes(entry, WOOLLY_REQUEST));
  assert.ok(entryServes(entry, { ...WOOLLY_REQUEST, tpLevel: 2 }));
  assert.ok(entryServes(entry, { ...WOOLLY_REQUEST, profile: "original_dskp_extra" }));
  assert.ok(!entryServes(entry, { ...WOOLLY_REQUEST, topic: "4.2" }));
  assert.ok(!entryServes(entry, { ...WOOLLY_REQUEST, tpLevel: 3 }));
  const extraRoute = entryFixture({ profile: "original_dskp_extra" });
  assert.ok(!entryServes(extraRoute, WOOLLY_REQUEST));
  assert.ok(entryServes(extraRoute, { ...WOOLLY_REQUEST, profile: "original_dskp_extra" }));
});
