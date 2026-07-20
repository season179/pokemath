#!/usr/bin/env node
// Import an approved question batch into the served banks (M4, #15): the
// human-reviewed candidate becomes a new immutable bank version, routed by a
// new manifest, selected by repointing the active pointer, and rolled back
// by repointing it back (docs/question-banks/manifest.md).
//
// Hard guarantees (acceptance criteria):
//   - Re-gated, never repaired: the FINAL bank (merged content included) must
//     pass the offline gate + AJV before anything is written. A rejection
//     aborts the import; content is never edited to make it pass.
//   - Rejected items never enter: decisions.rejected ids are excluded, and
//     every required review id must be present (first-200 = full review,
//     later = reproducible 5% sample — see tools/review-question-batch.mjs).
//   - Rollback-safe: the new manifest must PARSE (no overlapping routes) and
//     the new entry must verify against the new bank IN MEMORY before any
//     file is written, and only with --activate is the pointer repointed.
//
// Usage:
//   node tools/import-question-batch.mjs <candidate.json> --decisions <file> [--activate]
//   node tools/import-question-batch.mjs <candidate.json> --decisions <file> --replace [--activate]
//   node tools/import-question-batch.mjs rollback --to manifest.v1
//
// Modes (matched by full slice — bank_id + topic + TP band + profile for
// merge/new; by overlapping curriculum slice for --replace):
//   new-bank / new-route — append a non-overlapping route (default)
//   merge                — same bank_id + exact slice: append questions
//   replace              — --replace: retire every active route that
//                          overlaps the candidate's slice and route the
//                          approved bank in their place. Old bank versions
//                          and prior manifests stay on disk for rollback.
// Schema-v1 bases cannot merge; replace is the path when a new bank should
// take over a live slice (e.g. a v2 bank displacing a hand-authored route).

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { bankVersionsOnDisk } from "./generate-question-batch.mjs";
import { planReview, readLedger, DEFAULT_LEDGER_PATH } from "./review-question-batch.mjs";
import { checkJsonSchema, validateQuestionBankFile } from "./validate-question-bank.mjs";
import {
  parseActiveManifestPointer,
  parseQuestionBankManifest,
  resolveManifestEntry,
  routesOverlap,
  verifyManifestEntryAgainstBank,
} from "../shared/question-bank-manifest.ts";
import { parseQuestionBankData } from "../shared/question-bank-validate.ts";
import { gateQuestionBank } from "../shared/question-gate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_RESOURCES_DIR = join(root, "game", "assets", "resources");
export const DEFAULT_DOCS_DIR = join(root, "docs", "question-banks");

/** Fewer approved questions than this imports with a loud warning. */
export const MIN_BANK_SIZE_WARNING = 10;

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function jsonMeta() {
  return {
    ver: "2.0.1",
    importer: "json",
    imported: true,
    uuid: randomUUID(),
    files: [".json"],
    subMetas: {},
    userData: {},
  };
}

const serialize = (value) => JSON.stringify(value, null, 2) + "\n";

// --- decisions ----------------------------------------------------------------

export async function readDecisions(decisionsPath) {
  const raw = JSON.parse(await readFile(decisionsPath, "utf8"));
  const fail = (msg) => {
    throw new Error(`decisions file ${decisionsPath}: ${msg}`);
  };
  if (raw?.schema_version !== 1) fail("need schema_version 1");
  if (typeof raw.batch_sha256 !== "string") fail("need batch_sha256");
  if (!Array.isArray(raw.reviewed) || !raw.reviewed.every((i) => Number.isInteger(i))) {
    fail("reviewed must be an array of question ids");
  }
  if (!Array.isArray(raw.rejected)) fail("rejected must be an array");
  for (const r of raw.rejected) {
    if (!Number.isInteger(r?.id) || typeof r?.reason !== "string" || r.reason.trim() === "") {
      fail('every rejected entry needs an integer id and a non-empty reason');
    }
  }
  return raw;
}

// --- import ---------------------------------------------------------------------

/**
 * Import one approved batch. All artifacts are built and validated in
 * memory; files are written only after every check passes, and the active
 * pointer is repointed last (and only with opts.activate).
 */
export async function importBatch(candidatePath, decisionsPath, opts = {}) {
  const resourcesDir = opts.resourcesDir ?? DEFAULT_RESOURCES_DIR;
  const docsDir = opts.docsDir ?? DEFAULT_DOCS_DIR;
  const ledgerPath = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const banksDir = join(resourcesDir, "question-banks", "std1");

  // 1. Candidate + decisions, hash-locked together.
  const candidateText = await readFile(candidatePath, "utf8");
  const candidate = JSON.parse(candidateText);
  const decisions = await readDecisions(decisionsPath);
  if (decisions.batch_sha256 !== sha256(candidateText)) {
    throw new Error(
      "decisions file does not match the candidate batch (sha256 mismatch) — " +
        "the batch changed after review; review the new batch instead",
    );
  }
  const byId = new Map(candidate.questions.map((q) => [q.id, q]));
  for (const id of [...decisions.reviewed, ...decisions.rejected.map((r) => r.id)]) {
    if (!byId.has(id)) throw new Error(`decisions reference unknown question id ${id}`);
  }

  // 2. Review coverage: every required id must be reviewed; rejections must
  //    come from reviewed questions.
  const plan = await planReview(candidateText, ledgerPath);
  const reviewed = new Set(decisions.reviewed);
  const missing = plan.requiredIds.filter((id) => !reviewed.has(id));
  if (missing.length > 0) {
    throw new Error(
      `review incomplete (${plan.mode} mode): required ids not reviewed: ${missing.map((i) => `Q${i}`).join(", ")}`,
    );
  }
  const rejected = new Map(decisions.rejected.map((r) => [r.id, r.reason]));
  for (const id of rejected.keys()) {
    if (!reviewed.has(id)) throw new Error(`Q${id} is rejected but was never reviewed`);
  }

  // 3. Approved set: reviewed questions minus rejections. In sample mode the
  //    unreviewed remainder enters by policy; rejected never do.
  const approved = candidate.questions.filter((q) => !rejected.has(q.id));
  if (approved.length === 0) {
    throw new Error("nothing to import: every question was rejected (the batch goes back to generation)");
  }
  const warnings = [];
  if (approved.length < MIN_BANK_SIZE_WARNING) {
    warnings.push(
      `only ${approved.length} approved questions — the routed bank will serve a thin pool; consider regenerating`,
    );
  }

  // 4. Mode: merge into the routed v2 bank, create a new bank_id/route, or
  //    --replace every active route that overlaps the candidate's slice.
  //    Routes are matched by full slice (bank_id + topic + TP band + profile)
  //    for merge; by curriculum overlap for replace — never bank_id alone.
  const bankId = opts.bankId ?? candidate.bank_id;
  const versions = await bankVersionsOnDisk(bankId, resourcesDir);
  const nextVersion = versions.length === 0 ? 1 : Math.max(...versions) + 1;
  if (candidate.version !== nextVersion) {
    throw new Error(
      `${bankId} is already at v${Math.max(...versions, 0)} on disk but the candidate declares v${candidate.version} — ` +
        "another import landed first; regenerate the batch so its version matches",
    );
  }
  const pointer = parseActiveManifestPointer(
    JSON.parse(await readFile(join(resourcesDir, "question-banks", "active-manifest.json"), "utf8")),
  );
  const activeManifest = parseQuestionBankManifest(
    JSON.parse(await readFile(join(resourcesDir, `${pointer.manifest}.json`), "utf8")),
  );
  const batchTopic = candidate.questions[0].topic;
  const batchTpMin = Math.min(...candidate.questions.map((q) => q.tp_level));
  const batchTpMax = Math.max(...candidate.questions.map((q) => q.tp_level));
  const approvedTpMin = Math.min(...approved.map((q) => q.tp_level));
  const approvedTpMax = Math.max(...approved.map((q) => q.tp_level));
  const sameSlice = (e) =>
    e.bank_id === bankId &&
    e.topic === batchTopic &&
    e.tp_min === batchTpMin &&
    e.tp_max === batchTpMax &&
    e.profile === candidate.profile;
  const routeEntry = activeManifest.entries.find(sameSlice) ?? null;
  // Proposed entry for overlap detection (version/path filled in below).
  const proposedRoute = {
    grade: "std1",
    topic: batchTopic,
    tp_min: approvedTpMin,
    tp_max: approvedTpMax,
    profile: candidate.profile,
    bank_id: bankId,
    version: nextVersion,
    path: `question-banks/std1/${bankId}.v${nextVersion}`,
  };
  const overlapping = activeManifest.entries.filter((e) => routesOverlap(e, proposedRoute));

  let newBank;
  let newEntry;
  let idMap = null;
  let mode;
  let replacedRoutes = [];
  if (opts.replace) {
    // Replace: retire every overlapping active route and install the new
    // bank as the sole servant of this slice. Requires at least one live
    // overlap — without one, a plain import is the right tool.
    if (overlapping.length === 0) {
      throw new Error(
        `--replace needs an active route overlapping std1/${batchTopic} TP${approvedTpMin}–${approvedTpMax} ${candidate.profile}; ` +
          "none found — drop --replace to import as a new route",
      );
    }
    mode = "replace";
    replacedRoutes = overlapping.map((e) => ({
      bank_id: e.bank_id,
      version: e.version,
      topic: e.topic,
      tp_min: e.tp_min,
      tp_max: e.tp_max,
      profile: e.profile,
      path: e.path,
    }));
    newBank = {
      ...candidate,
      bank_id: bankId,
      scope: candidate.scope.replace(
        "(pending gate + human review)",
        "(approved via the offline gate + human review)",
      ),
      questions: approved,
    };
    newEntry = proposedRoute;
  } else if (routeEntry === null) {
    // New route: either a brand-new bank_id, or a disjoint slice on an
    // existing bank_id (banks are immutable, so the disjoint content ships
    // as the next version of that bank_id and gets its own entry).
    // Candidate ids are the bank ids (gaps from rejections are legal).
    mode = versions.length === 0 ? "new-bank" : "new-route";
    newBank = {
      ...candidate,
      bank_id: bankId,
      scope: candidate.scope.replace(
        "(pending gate + human review)",
        "(approved via the offline gate + human review)",
      ),
      questions: approved,
    };
    newEntry = proposedRoute;
  } else {
    mode = "merge";
    // Merge: the routed base must be schema v2 (v1 content predates the v2
    // wire and cannot be carried into a v2 bank untouched).
    const basePath = join(resourcesDir, `${routeEntry.path}.json`);
    const base = JSON.parse(await readFile(basePath, "utf8"));
    if (base.schema_version !== 2) {
      throw new Error(
        `${bankId} v${routeEntry.version} is schema v${base.schema_version} — v1 banks predate the v2 wire and cannot merge; ` +
          "extend the slice with a new bank on a disjoint TP band, or re-import with --replace to retire the live route",
      );
    }
    const maxId = Math.max(...base.questions.map((q) => q.id));
    idMap = new Map(approved.map((q, i) => [q.id, maxId + 1 + i]));
    const appended = approved.map((q) => ({ ...q, id: idMap.get(q.id) }));
    newBank = {
      ...base,
      version: nextVersion,
      source:
        `${base.source} + candidate batch ${basename(candidatePath)} ` +
        `(sha256 ${sha256(candidateText).slice(0, 12)}…, ${approved.length} approved of ${candidate.questions.length})`,
      questions: [...base.questions, ...appended],
    };
    newEntry = { ...routeEntry, version: nextVersion, path: `question-banks/std1/${bankId}.v${nextVersion}` };
  }

  // 5. Prove the final artifact BEFORE writing: gate + AJV on the exact bank,
  //    manifest parses (overlap guard), entry verifies against the bank.
  const gateReport = gateQuestionBank(newBank);
  const ajvFindings = await checkJsonSchema(newBank);
  if (!gateReport.accept || ajvFindings.some((f) => f.severity === "error")) {
    const details = gateReport.phases
      .flatMap((p) => p.findings)
      .concat(ajvFindings)
      .map((f) => `  ${f.phase} ${f.rule} ${f.id === undefined ? "" : `Q${f.id} `}${f.message}`)
      .join("\n");
    throw new Error(`the final bank fails the gate — import aborted, content NOT repaired:\n${details}`);
  }
  const parsedBank = parseQuestionBankData(newBank);
  verifyManifestEntryAgainstBank(newEntry, parsedBank);

  const manifestsDir = join(resourcesDir, "question-banks");
  const manifestVersions = (await readdir(manifestsDir))
    .map((n) => /^manifest\.v(\d+)\.json$/.exec(n)?.[1])
    .filter(Boolean)
    .map(Number);
  const manifestVersion = Math.max(...manifestVersions, 0) + 1;
  const replacedNote =
    mode === "replace"
      ? `; replaced ${replacedRoutes.map((r) => `${r.bank_id} v${r.version} TP${r.tp_min}–${r.tp_max}`).join(", ")}`
      : "";
  const keptEntries =
    mode === "replace"
      ? activeManifest.entries.filter((e) => !routesOverlap(e, newEntry))
      : activeManifest.entries.map((e) => (sameSlice(e) ? newEntry : e));
  const newManifest = {
    schema_version: 1,
    manifest_id: activeManifest.manifest_id,
    version: manifestVersion,
    source:
      `Issue #15 import: ${basename(candidatePath)} → ${bankId} v${nextVersion} ` +
      `(${approved.length} approved of ${candidate.questions.length}; decisions: ${basename(decisionsPath)}; mode ${mode}${replacedNote})`,
    entries: mode === "replace" || routeEntry === null ? [...keptEntries, newEntry] : keptEntries,
  };
  // Overlapping routes fail HERE, before a single file is written — a bad
  // import must never brick the pointer rollback depends on.
  parseQuestionBankManifest(newManifest);
  resolveManifestEntry(newManifest, {
    grade: "std1",
    topic: newEntry.topic,
    profile: newEntry.profile,
    tpLevel: newEntry.tp_min,
  });

  // 6. Writes: bank + manifest (+ Cocos metas), pointer LAST (opt-in), then
  //    the ledger and the gate evidence for the new bank.
  await mkdir(banksDir, { recursive: true });
  const bankPath = join(banksDir, `${bankId}.v${nextVersion}.json`);
  await writeFile(bankPath, serialize(newBank));
  await writeFile(`${bankPath}.meta`, serialize(jsonMeta()));
  const manifestPath = join(manifestsDir, `manifest.v${manifestVersion}.json`);
  await writeFile(manifestPath, serialize(newManifest));
  await writeFile(`${manifestPath}.meta`, serialize(jsonMeta()));

  let pointerPath = null;
  if (opts.activate) {
    pointerPath = join(manifestsDir, "active-manifest.json");
    const newPointer = { schema_version: 1, manifest: `question-banks/manifest.v${manifestVersion}` };
    parseActiveManifestPointer(newPointer);
    await writeFile(pointerPath, serialize(newPointer));
  }

  const ledger = await readLedger(ledgerPath);
  ledger.reviewed_total += decisions.reviewed.length;
  ledger.history.push({
    at: new Date().toISOString(),
    batch: basename(candidatePath),
    batch_sha256: sha256(candidateText),
    bank_id: bankId,
    bank_version: nextVersion,
    manifest_version: manifestVersion,
    mode: plan.mode,
    import_mode: mode,
    reviewer: decisions.reviewer ?? "",
    reviewed: decisions.reviewed,
    rejected: decisions.rejected,
    imported_ids: newBank.questions.slice(-approved.length).map((q) => q.id),
    ...(idMap ? { candidate_id_map: Object.fromEntries(idMap) } : {}),
    ...(replacedRoutes.length > 0 ? { replaced_routes: replacedRoutes } : {}),
    activated: Boolean(opts.activate),
  });
  await writeFile(ledgerPath, serialize(ledger));

  const evidence = await validateQuestionBankFile(bankPath, { outDir: docsDir });
  return {
    bankId,
    bankVersion: nextVersion,
    bankPath,
    manifestVersion,
    manifestPath,
    pointerPath,
    approved: approved.length,
    rejected: decisions.rejected.length,
    mode,
    replacedRoutes,
    warnings,
    gateAccept: evidence.accept,
  };
}

// --- rollback ---------------------------------------------------------------------

/**
 * Repoint the active pointer at an earlier manifest — but only after the
 * target manifest parses and EVERY route verifies against the bank on disk,
 * so rollback can never select a broken chain.
 */
export async function rollbackManifest(to, opts = {}) {
  const resourcesDir = opts.resourcesDir ?? DEFAULT_RESOURCES_DIR;
  const manifestsDir = join(resourcesDir, "question-banks");
  const stem = to.replace(/\.json$/, "").replace(/^question-banks\//, "");
  const manifestPath = join(manifestsDir, `${stem}.json`);
  const manifest = parseQuestionBankManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  for (const entry of manifest.entries) {
    const bank = parseQuestionBankData(
      JSON.parse(await readFile(join(resourcesDir, `${entry.path}.json`), "utf8")),
    );
    verifyManifestEntryAgainstBank(entry, bank);
  }
  const pointerPath = join(manifestsDir, "active-manifest.json");
  const pointer = { schema_version: 1, manifest: `question-banks/${stem}` };
  parseActiveManifestPointer(pointer);
  await writeFile(pointerPath, serialize(pointer));
  return { pointerPath, manifest: pointer.manifest, routes: manifest.entries.length };
}

// --- CLI ---------------------------------------------------------------------------

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1]);
if (isMain) {
  try {
    const argv = process.argv.slice(2);
    if (argv[0] === "rollback") {
      const toAt = argv.indexOf("--to");
      if (toAt === -1) throw new Error("usage: import-question-batch.mjs rollback --to manifest.v{N}");
      const result = await rollbackManifest(argv[toAt + 1]);
      console.log(`rolled back: active manifest is now ${result.manifest} (${result.routes} routes verified)`);
    } else {
      const activate = argv.includes("--activate");
      const replace = argv.includes("--replace");
      const decisionsAt = argv.indexOf("--decisions");
      const candidate = argv.find((a) => !a.startsWith("--") && a !== argv[decisionsAt + 1]);
      if (!candidate || decisionsAt === -1) {
        throw new Error(
          "usage: import-question-batch.mjs <candidate.json> --decisions <file> [--replace] [--activate]",
        );
      }
      const result = await importBatch(candidate, argv[decisionsAt + 1], { activate, replace });
      for (const w of result.warnings) console.warn(`warning: ${w}`);
      const replaced =
        result.replacedRoutes.length > 0
          ? `; retired ${result.replacedRoutes.map((r) => `${r.bank_id} v${r.version}`).join(", ")}`
          : "";
      console.log(
        `imported ${result.approved} questions (${result.rejected} rejected) → ` +
          `${result.bankId} v${result.bankVersion} (${result.mode}${replaced}); ` +
          `manifest v${result.manifestVersion}; gate ${result.gateAccept ? "ACCEPT" : "REJECT"}`,
      );
      console.log(
        result.pointerPath
          ? `selected: active manifest repointed (${result.pointerPath})`
          : `not selected: re-run with --activate, or repoint question-banks/active-manifest.json at manifest.v${result.manifestVersion}`,
      );
    }
  } catch (e) {
    console.error(`import error: ${e.message}`);
    process.exit(1);
  }
}
