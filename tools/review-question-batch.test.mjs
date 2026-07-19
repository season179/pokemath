// Review-planner tests (M4, #15): the first-200 quota forces full review,
// later batches get a reproducible 5% sample, and human work is protected.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FULL_REVIEW_QUOTA,
  planReview,
  sampleQuestionIds,
  sampleSizeFor,
  writeReviewPlan,
} from "./review-question-batch.mjs";
import { writeBatch } from "./generate-question-batch.mjs";

const PARAMS = { bankId: "std1.review", topic: "4.2", tpMin: 2, tpMax: 3, profile: "dpk3_2026_core", count: 40, seed: 17 };

async function withFixture(reviewedTotal, fn) {
  const dir = await mkdtemp(join(tmpdir(), "review-"));
  try {
    const ledgerPath = join(dir, "ledger.json");
    await writeFile(
      ledgerPath,
      JSON.stringify({ schema_version: 1, full_review_quota: FULL_REVIEW_QUOTA, sample_rate: 0.05, reviewed_total: reviewedTotal, history: [] }),
    );
    const { candidatePath } = await writeBatch(PARAMS, { candidatesDir: dir, resourcesDir: dir });
    await fn({ dir, ledgerPath, candidatePath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("review: under the 200 quota every question must be reviewed (full mode)", async () => {
  await withFixture(20, async ({ candidatePath, ledgerPath }) => {
    const plan = await planReview(await readFile(candidatePath, "utf8"), ledgerPath);
    assert.equal(plan.mode, "full");
    assert.equal(plan.requiredIds.length, 40);
    assert.deepEqual(plan.requiredIds, Array.from({ length: 40 }, (_, i) => i + 1));
  });
});

test("review: at the quota a reproducible 5% sample is required", async () => {
  await withFixture(FULL_REVIEW_QUOTA, async ({ candidatePath, ledgerPath }) => {
    const text = await readFile(candidatePath, "utf8");
    const plan = await planReview(text, ledgerPath);
    assert.equal(plan.mode, "sample");
    assert.equal(plan.requiredIds.length, sampleSizeFor(40)); // ceil(5% of 40) = 2
    for (const id of plan.requiredIds) assert.ok(id >= 1 && id <= 40);
    // Reproducible: same batch content → same sample, every time.
    const again = await planReview(text, ledgerPath);
    assert.deepEqual(again.requiredIds, plan.requiredIds);
  });
});

test("review: sample sizing is ceil(5%), minimum 1", () => {
  assert.equal(sampleSizeFor(1), 1);
  assert.equal(sampleSizeFor(20), 1);
  assert.equal(sampleSizeFor(21), 2);
  assert.equal(sampleSizeFor(40), 2);
  assert.equal(sampleSizeFor(200), 10);
  // Deterministic given the same hash.
  const ids = Array.from({ length: 40 }, (_, i) => i + 1);
  assert.deepEqual(sampleQuestionIds("ab".repeat(32), ids, 2), sampleQuestionIds("ab".repeat(32), ids, 2));
});

test("review: plan writes the doc and decisions template, and protects human work", async () => {
  await withFixture(20, async ({ dir, candidatePath, ledgerPath }) => {
    const outDir = join(dir, "out");
    const { plan, reviewPath, decisionsPath } = await writeReviewPlan(candidatePath, { outDir, ledgerPath });
    assert.equal(plan.mode, "full");
    const doc = await readFile(reviewPath, "utf8");
    assert.match(doc, /FULL — every question is reviewed/);
    assert.match(doc, /### Q1 /);
    assert.match(doc, /### Q40 /);
    const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
    assert.equal(decisions.schema_version, 1);
    assert.equal(decisions.batch_sha256, plan.sha256);
    assert.deepEqual(decisions.reviewed, plan.requiredIds);
    assert.deepEqual(decisions.rejected, []);
    // A second run must not clobber the decisions file the human is filling in.
    await assert.rejects(writeReviewPlan(candidatePath, { outDir, ledgerPath }), /holds human review work/);
    const forced = await writeReviewPlan(candidatePath, { outDir, ledgerPath, force: true });
    assert.ok(forced.decisionsPath);
  });
});

test("review: sample mode renders only the sampled questions", async () => {
  await withFixture(FULL_REVIEW_QUOTA, async ({ dir, candidatePath, ledgerPath }) => {
    const outDir = join(dir, "out");
    const { plan, reviewPath } = await writeReviewPlan(candidatePath, { outDir, ledgerPath });
    const doc = await readFile(reviewPath, "utf8");
    assert.match(doc, /SAMPLE — reproducible 5%/);
    for (let id = 1; id <= 40; id++) {
      const present = doc.includes(`### Q${id} `);
      assert.equal(present, plan.requiredIds.includes(id), `Q${id}`);
    }
  });
});
