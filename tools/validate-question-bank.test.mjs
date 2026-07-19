// Gate CLI tests (M4, #14): the tools/ wrapper proves AJV and the hand-rolled
// gate agree, writes accept/reject evidence, and renders the review report.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkJsonSchema,
  checklistResults,
  renderGateReportMarkdown,
  validateQuestionBankFile,
} from "./validate-question-bank.mjs";
import { gateQuestionBank } from "../shared/question-gate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(root, "shared", "tests", "fixtures", "gate");
const fixture = (name) => join(FIXTURES, name);

test("valid boundary fixture: accept, evidence files written", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "gate-"));
  try {
    const evidence = await validateQuestionBankFile(fixture("valid-boundary.v2.json"), { outDir });
    assert.equal(evidence.accept, true);
    assert.equal(evidence.report.bankId, "std1.fixture-valid-boundary");
    assert.equal(evidence.jsonSchema.length, 0, JSON.stringify(evidence.jsonSchema));
    for (const row of evidence.checklist) {
      assert.equal(row.result, "pass", `${row.rule}: ${JSON.stringify(row.findings)}`);
    }
    const sidecar = JSON.parse(await readFile(join(outDir, "std1.fixture-valid-boundary.v1.gate.json"), "utf8"));
    assert.equal(sidecar.accept, true);
    const md = await readFile(join(outDir, "std1.fixture-valid-boundary.v1.gate.md"), "utf8");
    assert.match(md, /✅ ACCEPT/);
    assert.match(md, /MONEY-RM10/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("reject fixture: verdict and rule evidence land in the report", async () => {
  const evidence = await validateQuestionBankFile(fixture("reject-money-mixed-exchange.v2.json"), {
    noWrite: true,
  });
  assert.equal(evidence.accept, false);
  const mixed = evidence.checklist.find((r) => r.rule === "MONEY-MIXED");
  assert.equal(mixed.result, "fail");
  assert.ok(mixed.findings.some((f) => f.code === "money-mixed-exchange"));
  const md = renderGateReportMarkdown(evidence.report, evidence.jsonSchema, "{}", "reject-money-mixed-exchange.v2.json");
  assert.match(md, /❌ REJECT/);
  assert.match(md, /money-mixed-exchange/);
});

test("AJV catches answer-form shape violations the enum table publishes", async () => {
  // 2 distractors on a numeric form: the hand-rolled parser and AJV both reject.
  const raw = JSON.parse(await readFile(fixture("valid-boundary.v2.json"), "utf8"));
  raw.questions[0].distractors = raw.questions[0].distractors.slice(0, 2);
  const report = gateQuestionBank(raw);
  const ajvFindings = await checkJsonSchema(raw);
  assert.equal(report.accept, false);
  assert.ok(report.phases[0].findings.some((f) => f.message.includes("exactly 3")));
  assert.ok(ajvFindings.some((f) => f.code === "json-schema"), JSON.stringify(ajvFindings));
});

test("AJV rejects unknown schema versions with evidence", async () => {
  const findings = await checkJsonSchema({ schema_version: 9, questions: [] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "json-schema");
});

test("checklistResults rolls findings up per corpus rule", async () => {
  const raw = JSON.parse(await readFile(fixture("reject-money-rm-over-10.v2.json"), "utf8"));
  const report = gateQuestionBank(raw);
  const rows = checklistResults(report, []);
  const rm = rows.find((r) => r.rule === "MONEY-RM10");
  assert.equal(rm.result, "fail");
  assert.ok(rm.findings.length >= 1);
  const scope = rows.find((r) => r.rule === "SCOPE-100");
  assert.equal(scope.result, "pass", "money breaches attribute to MONEY-RM10, not SCOPE-100");
});

test("malformed JSON file rejects with structural evidence", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "gate-"));
  try {
    const bad = join(outDir, "not-json.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(bad, "{ nope");
    const evidence = await validateQuestionBankFile(bad, { noWrite: true });
    assert.equal(evidence.accept, false);
    assert.ok(evidence.report.phases[0].findings.some((f) => f.code === "json-parse"));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
