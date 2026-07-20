import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadConfiguredCalibration } from "../../tools/render-calibration-report.mjs";

const fixtureUrl = new URL("fixtures/calibration-baseline.v1.json", import.meta.url);

function serializable(configured: Awaited<ReturnType<typeof loadConfiguredCalibration>>) {
  return {
    schemaVersion: 1,
    disposition: "retain-shipped-baseline-until-evidence-gate",
    xp: configured.xp,
    levels: configured.levels,
    rewards: configured.rewards,
    encounters: configured.encounters,
    effort: configured.effort,
    capture: configured.capture,
    ranks: {
      manifestVersion: configured.ranks.manifestVersion,
      banks: configured.ranks.banks,
      questions: configured.ranks.questions,
      byTp: Object.fromEntries([...configured.ranks.byTp.entries()].sort(([a], [b]) => a - b)),
    },
    variants: configured.variants,
  };
}

test("calibration baseline locks levels 1–30, active encounters, rank, capture, and reward displays", async () => {
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
  assert.deepEqual(serializable(await loadConfiguredCalibration()), fixture);
});

test("calibration baseline keeps the three non-negotiable guardrails", async () => {
  const configured = await loadConfiguredCalibration();
  assert.ok(configured.xp.minimumPerTurn > 0, "correct answers retain nonzero XP");
  assert.ok(configured.capture.fullHp > 0, "ordinary capture is possible immediately");
  assert.ok(configured.capture.tenPercentHp < 1, "ordinary capture stays calm rather than guaranteed");
  // Thinking time cannot appear in the pure configured snapshot: pressure is
  // counted only in committed Unique answers, never seconds or milliseconds.
  assert.equal("timeLimit" in configured.capture, false);
  assert.equal("answerSpeed" in configured.xp, false);
});
