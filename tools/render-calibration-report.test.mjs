import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggregateCalibration,
  calibrationEvidence,
  loadConfiguredCalibration,
  renderCalibrationMarkdown,
} from "./render-calibration-report.mjs";

function row(name, props, at = "2026-07-20T10:00:00.000Z") {
  return { name, occurred_at: at, props_json: JSON.stringify(props) };
}

function repeated(count, make) {
  return Array.from({ length: count }, (_, index) => make(index));
}

test("configured calibration reads the shipped levels, question ranks, encounters, and display strings", async () => {
  const configured = await loadConfiguredCalibration();
  assert.equal(configured.levels.length, 30);
  assert.deepEqual(configured.levels[0], {
    level: 1,
    totalToReach: 0,
    toNext: 20,
    routineTp2PerTurn: 6,
    correctTurnsToNext: 4,
  });
  assert.deepEqual(configured.levels[29], {
    level: 30,
    totalToReach: 4640,
    toNext: 310,
    routineTp2PerTurn: 2,
    correctTurnsToNext: 155,
  });
  assert.equal(configured.ranks.questions, 132);
  assert.equal(configured.encounters.length, 7);
  assert.ok(configured.encounters.every((table) => table.rate === 0.2));
  assert.deepEqual(
    configured.rewards.map(({ label, gainDisplay, levelDisplay, progressDisplay }) => ({
      label,
      gainDisplay,
      levelDisplay,
      progressDisplay,
    })),
    [
      { label: "weaker", gainDisplay: "+6 XP", levelDisplay: "Lv 1", progressDisplay: "6/20" },
      { label: "equal-level", gainDisplay: "+6 XP", levelDisplay: "Lv 3", progressDisplay: "6/40" },
      { label: "stronger", gainDisplay: "+2 XP", levelDisplay: "Lv 8", progressDisplay: "2/90" },
    ],
  );
});

test("sparse smoke data is suppressed and keeps the shipped baseline", async () => {
  const rows = [
    ...repeated(4, () => row("question_answered", { battle: "wild", operation: "addition", tp: 2, correct: true })),
    row("battle_outcome", { battle: "wild", outcome: "won", asked: 4, correct: 4 }),
    row("session_ended", { reason: "page_unload", duringBattle: false }),
  ];
  const observed = aggregateCalibration(rows);
  assert.equal(calibrationEvidence(observed).ready, false);
  const markdown = renderCalibrationMarkdown(await loadConfiguredCalibration(), observed);
  assert.match(markdown, /INSUFFICIENT EVIDENCE — KEEP SHIPPED BASELINE/);
  assert.match(markdown, /\| 2 \| 4 \| suppressed \(n<5\) \|/);
  assert.match(markdown, /Runtime constants changed: \*\*none\*\*/);
});

test("every evidence cell must reach the aggregate threshold before human review", () => {
  const rows = [
    ...repeated(5, (i) => row("question_answered", { battle: "wild", operation: "counting", tp: 1, correct: i < 4 })),
    ...repeated(5, (i) => row("question_answered", { battle: "wild", operation: "addition", tp: 2, correct: i < 3 })),
    ...repeated(5, (i) => row("battle_outcome", { battle: "wild", outcome: i === 0 ? "fled" : "won", asked: 2, correct: 1 })),
    ...repeated(5, (i) => row("review_question_answered", { operation: "addition", tp: 2, correct: i < 3 })),
    ...repeated(5, () => row("session_ended", { reason: "sign_out", duringBattle: false })),
    ...repeated(5, (i) => row("creature_captured", { speciesId: `meadow/species-${i}` })),
  ];
  assert.equal(calibrationEvidence(aggregateCalibration(rows)).ready, true);
});

test("report remains aggregate-only and explains telemetry limits", async () => {
  const observed = aggregateCalibration([
    {
      user_id: "secret-user",
      event_id: "secret-event",
      name: "creature_captured",
      occurred_at: "2026-07-20T10:00:00.000Z",
      props_json: '{"speciesId":"woolly/fluffball"}',
    },
  ]);
  const markdown = renderCalibrationMarkdown(await loadConfiguredCalibration(), observed);
  assert.doesNotMatch(markdown, /secret-user|secret-event/);
  assert.match(markdown, /no capture-attempt denominator/);
  assert.match(markdown, /Alt encounter rate is not implemented/);
  assert.match(markdown, /Unlimited question thinking time is unchanged/);
});
