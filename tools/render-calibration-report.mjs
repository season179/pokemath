#!/usr/bin/env node
// Issue #25: reproducible configured-vs-observed calibration report.
//
// Runtime values are read from the shipped shared modules, active question
// manifest/banks, and live Meadow region tables. Observed values come from the
// aggregate-only event export documented in docs/learning-events.md. Sparse
// cells stay suppressed and can never justify a constants change.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  PLAYER_XP_BASE_PER_TURN,
  PLAYER_XP_GAP_FLOOR,
  PLAYER_XP_GAP_STEP,
  PLAYER_XP_HARD_OP_BONUS,
  PLAYER_XP_MIN_PER_TURN,
  PLAYER_XP_TP_BONUS_CAP,
  UNIQUE_FLEE_ACTIONS,
  UNIQUE_TRUST_MAX,
  playerXpForTurn,
} from "../shared/battle-rules.ts";
import { Creature, MEADOW_SPECIES } from "../shared/creature.ts";
import {
  PLAYER_XP_BASE,
  PLAYER_XP_GROWTH,
  awardPlayerXp,
  formatPlayerLevel,
  formatPlayerProgress,
  formatPlayerXpGain,
  playerXpRequirement,
  totalXpForLevel,
} from "../shared/player-progression.ts";
import { turnsOf } from "../shared/question-engine.ts";
import { MIN_CELL, parseRows } from "./render-learning-report.mjs";

const ROOT = new URL("../", import.meta.url);
const BANK_ROOT = new URL("game/assets/resources/question-banks/", ROOT);

const REGION_FILES = [
  "meadow-woolly.ts",
  "meadow-orchard.ts",
  "meadow-gardens.ts",
  "meadow-barn.ts",
  "meadow-ticktock.ts",
  "meadow-festival.ts",
  "meadow-stones.ts",
];

function propsOf(row) {
  try {
    return JSON.parse(row.props_json);
  } catch {
    return {};
  }
}

function bump(map, key, correct) {
  const cell = map.get(key) ?? { answered: 0, correct: 0 };
  cell.answered++;
  if (correct) cell.correct++;
  map.set(key, cell);
}

/** Aggregate only the bounded event properties needed for calibration. */
export function aggregateCalibration(rows) {
  const byTp = new Map();
  const outcomes = new Map();
  const sessions = { total: 0, healthy: 0, duringBattle: 0 };
  let questions = 0;
  let reviews = 0;
  let captures = 0;
  let minAt = null;
  let maxAt = null;

  for (const row of rows) {
    if (typeof row.occurred_at === "string") {
      if (minAt === null || row.occurred_at < minAt) minAt = row.occurred_at;
      if (maxAt === null || row.occurred_at > maxAt) maxAt = row.occurred_at;
    }
    const props = propsOf(row);
    if (row.name === "question_answered") {
      questions++;
      if (Number.isInteger(props.tp)) bump(byTp, props.tp, props.correct === true);
    } else if (row.name === "review_question_answered") {
      reviews++;
    } else if (row.name === "battle_outcome") {
      const key = `${props.battle}|${props.outcome}`;
      outcomes.set(key, (outcomes.get(key) ?? 0) + 1);
    } else if (row.name === "creature_captured") {
      captures++;
    } else if (row.name === "session_ended") {
      sessions.total++;
      if (props.duringBattle === true) sessions.duringBattle++;
      else sessions.healthy++;
    }
  }

  return {
    total: rows.length,
    questions,
    reviews,
    captures,
    byTp,
    outcomes,
    sessions,
    window: { minAt, maxAt },
  };
}

function turn(tp = 2, operation = "addition") {
  return turnsOf({
    id: 1,
    question_zh: "1 + 1 = ?",
    question_en: "1 + 1 = ?",
    operation,
    expression: "1 + 1",
    answer: 2,
    tp_level: tp,
  })[0];
}

function rewardExample(label, playerLevel, wildLevel) {
  const gain = playerXpForTurn(turn(), playerLevel, wildLevel);
  const award = awardPlayerXp(
    { level: playerLevel, totalXp: totalXpForLevel(playerLevel) },
    gain,
  );
  return {
    label,
    playerLevel,
    wildLevel,
    gain,
    gainDisplay: formatPlayerXpGain(gain),
    levelDisplay: formatPlayerLevel(award.after),
    progressDisplay: formatPlayerProgress(award.after),
  };
}

function catchChanceAt(hp, maxHp = 100) {
  const creature = new Creature({
    name: "Calibration creature",
    color: "#000000",
    maxHp,
    hp,
    attack: 1,
    level: 1,
    xp: 0,
    boss: false,
    speciesId: null,
  });
  return creature.catchChance;
}

async function loadQuestionRanks() {
  const active = JSON.parse(await readFile(new URL("active-manifest.json", BANK_ROOT), "utf8"));
  const manifestName = active.manifest.replace(/^question-banks\//, "") + ".json";
  const manifest = JSON.parse(await readFile(new URL(manifestName, BANK_ROOT), "utf8"));
  const byTp = new Map();
  let questions = 0;

  for (const entry of manifest.entries) {
    const path = entry.path.replace(/^question-banks\//, "") + ".json";
    const bank = JSON.parse(await readFile(new URL(path, BANK_ROOT), "utf8"));
    for (const question of bank.questions) {
      questions++;
      byTp.set(question.tp_level, (byTp.get(question.tp_level) ?? 0) + 1);
    }
  }
  return { manifestVersion: manifest.version, banks: manifest.entries.length, questions, byTp };
}

function parseEncounterTable(source, file) {
  const block = source.match(/encounters:\s*{\s*rate:\s*([0-9.]+),\s*entries:\s*\[([\s\S]*?)\]\s*,?\s*}/);
  if (!block) throw new Error(`cannot parse encounters from ${file}`);
  const entries = [];
  const row = /speciesId:\s*"([^"]+)",\s*weight:\s*([0-9.]+),\s*rarity:\s*"([^"]+)"/g;
  for (const match of block[2].matchAll(row)) {
    entries.push({ speciesId: match[1], weight: Number(match[2]), rarity: match[3] });
  }
  if (entries.length === 0) throw new Error(`cannot parse encounter entries from ${file}`);
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    region: file.replace(/^meadow-/, "").replace(/\.ts$/, ""),
    rate: Number(block[1]),
    entries: entries.map((entry) => ({ ...entry, share: entry.weight / totalWeight })),
  };
}

async function loadEncounters() {
  const dir = new URL("game/assets/src/world/regions/", ROOT);
  return Promise.all(
    REGION_FILES.map(async (file) => parseEncounterTable(await readFile(new URL(file, dir), "utf8"), file)),
  );
}

function encounterEffort() {
  const ordinary = MEADOW_SPECIES.filter((species) => species.rarity !== "guardian");
  const byRarity = new Map();
  for (const species of ordinary) {
    const current = byRarity.get(species.rarity) ?? [];
    current.push(species.maxHp);
    byRarity.set(species.rarity, current);
  }
  // Two of three starters have attack 4. A routine +/− answer therefore
  // deals 4..6 after rollDamage; the table reports deterministic bounds.
  return [...byRarity.entries()].map(([rarity, hps]) => {
    const minHp = Math.min(...hps);
    const maxHp = Math.max(...hps);
    return {
      rarity,
      minHp,
      maxHp,
      minTurns: Math.ceil(minHp / 6),
      maxTurns: Math.ceil(maxHp / 4),
    };
  });
}

/** Read the shipped configuration directly; no copied tuning constants. */
export async function loadConfiguredCalibration() {
  return {
    xp: {
      levelBase: PLAYER_XP_BASE,
      levelGrowth: PLAYER_XP_GROWTH,
      turnBase: PLAYER_XP_BASE_PER_TURN,
      hardBonus: PLAYER_XP_HARD_OP_BONUS,
      tpBonusCap: PLAYER_XP_TP_BONUS_CAP,
      gapStep: PLAYER_XP_GAP_STEP,
      gapFloor: PLAYER_XP_GAP_FLOOR,
      minimumPerTurn: PLAYER_XP_MIN_PER_TURN,
    },
    levels: Array.from({ length: 30 }, (_, index) => {
      const level = index + 1;
      const toNext = playerXpRequirement(level);
      const routineTp2PerTurn = playerXpForTurn(turn(), level, 1);
      return {
        level,
        totalToReach: totalXpForLevel(level),
        toNext,
        routineTp2PerTurn,
        correctTurnsToNext: Math.ceil(toNext / routineTp2PerTurn),
      };
    }),
    rewards: [
      rewardExample("weaker", 1, 3),
      rewardExample("equal-level", 3, 3),
      rewardExample("stronger", 8, 3),
    ],
    encounters: await loadEncounters(),
    effort: encounterEffort(),
    capture: {
      fullHp: catchChanceAt(100),
      halfHp: catchChanceAt(50),
      tenPercentHp: catchChanceAt(10),
      uniqueActions: UNIQUE_FLEE_ACTIONS,
      uniqueTrust: UNIQUE_TRUST_MAX,
    },
    ranks: await loadQuestionRanks(),
    variants: { wild: "normal", altEncounterRate: null },
  };
}

/** Minimum aggregate evidence gate. Passing permits review, never auto-tuning. */
export function calibrationEvidence(observed) {
  const tpBands = [...observed.byTp.values()].filter((cell) => cell.answered >= MIN_CELL).length;
  const battles = [...observed.outcomes.values()].reduce((sum, count) => sum + count, 0);
  const checks = [
    { signal: "correctness by question rank", sample: `${tpBands} TP bands with n≥${MIN_CELL}`, pass: tpBands >= 2 },
    { signal: "battle abandonment", sample: `${battles} outcomes`, pass: battles >= MIN_CELL },
    { signal: "delayed review", sample: `${observed.reviews} answers`, pass: observed.reviews >= MIN_CELL },
    { signal: "healthy stopping", sample: `${observed.sessions.total} stops`, pass: observed.sessions.total >= MIN_CELL },
    { signal: "completed captures", sample: `${observed.captures} captures`, pass: observed.captures >= MIN_CELL },
  ];
  return { checks, ready: checks.every((check) => check.pass) };
}

const pct = (value) => `${Math.round(value * 100)}%`;
const observedPct = (part, whole) => (whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`);

function renderSuppressedRate(cell) {
  return cell.answered < MIN_CELL
    ? `suppressed (n<${MIN_CELL})`
    : observedPct(cell.correct, cell.answered);
}

export function renderCalibrationMarkdown(configured, observed) {
  const evidence = calibrationEvidence(observed);
  const out = ["# PokeMath calibration report", ""];
  out.push(`**Decision: ${evidence.ready ? "READY FOR STRUCTURED HUMAN REVIEW" : "INSUFFICIENT EVIDENCE — KEEP SHIPPED BASELINE"}.**`, "");
  out.push(`Events: ${observed.total} · window: ${observed.window.minAt ?? "—"} → ${observed.window.maxAt ?? "—"}`);
  out.push(`Aggregate only; cells with n<${MIN_CELL} are suppressed. Passing a gate permits Season's review—it never changes constants automatically.`, "");

  out.push("## Evidence gate", "", "| signal | observed sample | status |", "| --- | ---: | --- |");
  for (const check of evidence.checks) {
    out.push(`| ${check.signal} | ${check.sample} | ${check.pass ? "reviewable" : "insufficient"} |`);
  }
  out.push("", "Capture outcomes do **not** measure throw success: current telemetry has no capture-attempt denominator. Delayed review is defined but is not emitted until that mechanic ships.", "");

  out.push("## Observed learning and stopping", "", "| TP | answered | correct rate |", "| ---: | ---: | ---: |");
  if (observed.byTp.size === 0) out.push("| — | 0 | — |");
  for (const [tp, cell] of [...observed.byTp.entries()].sort(([a], [b]) => a - b)) {
    out.push(`| ${tp} | ${cell.answered} | ${renderSuppressedRate(cell)} |`);
  }
  const battles = [...observed.outcomes.values()].reduce((sum, count) => sum + count, 0);
  const fled = [...observed.outcomes.entries()]
    .filter(([key]) => key.endsWith("|fled"))
    .reduce((sum, [, count]) => sum + count, 0);
  out.push("", `Battle outcomes: ${battles}; abandonment rate: ${battles < MIN_CELL ? `suppressed (n<${MIN_CELL})` : observedPct(fled, battles)}.`);
  out.push(`Delayed-review answers: ${observed.reviews}. Completed captures: ${observed.captures}.`);
  out.push(`Stops outside battle: ${observed.sessions.healthy}; during battle: ${observed.sessions.duringBattle}; stopping split: ${observed.sessions.total < MIN_CELL ? `suppressed (n<${MIN_CELL})` : observedPct(observed.sessions.healthy, observed.sessions.total) + " outside battle"}.`, "");

  out.push("## Configured XP and level-gap baseline", "");
  const xp = configured.xp;
  out.push(`Level requirement: ${xp.levelBase} + ${xp.levelGrowth} × (level−1) XP.`);
  out.push(`Turn reward: base ${xp.turnBase}; hard-operation bonus +${xp.hardBonus}; TP bonus capped at +${xp.tpBonusCap}.`);
  out.push(`Over-level modifier: max(${xp.gapFloor}, 1 − ${xp.gapStep} × positive gap); absolute floor ${xp.minimumPerTurn} XP per correct turn.`, "");
  out.push("### Before/after review examples", "", "No constant change is proposed: current and candidate-after values are identical pending representative evidence.", "");
  out.push("| relationship | player / wild | current | candidate after | displayed result from level boundary |", "| --- | ---: | ---: | ---: | --- |");
  for (const reward of configured.rewards) {
    const display = `${reward.gainDisplay} · ${reward.levelDisplay} · ${reward.progressDisplay}`;
    out.push(`| ${reward.label} | L${reward.playerLevel} / L${reward.wildLevel} | ${reward.gain} XP | ${reward.gain} XP | ${display} |`);
  }

  out.push("", "### Levels 1–30", "", "Routine comparison uses a correct TP2 +/− turn against a live level-1 wild creature.", "");
  out.push("| level | total XP to reach | XP to next | routine XP / correct turn | correct turns to next |", "| ---: | ---: | ---: | ---: | ---: |");
  for (const level of configured.levels) {
    out.push(`| ${level.level} | ${level.totalToReach} | ${level.toNext} | ${level.routineTp2PerTurn} | ${level.correctTurnsToNext} |`);
  }

  out.push("", "## Configured question rank", "");
  out.push(`Active manifest v${configured.ranks.manifestVersion}: ${configured.ranks.banks} banks, ${configured.ranks.questions} questions.`);
  out.push("", "| TP | configured questions | observed correct rate |", "| ---: | ---: | ---: |");
  for (const [tp, count] of [...configured.ranks.byTp.entries()].sort(([a], [b]) => a - b)) {
    const cell = observed.byTp.get(tp);
    out.push(`| ${tp} | ${count} | ${cell ? renderSuppressedRate(cell) : "no data"} |`);
  }

  out.push("", "## Configured encounter rate and roster", "", "All live Meadow grass tables currently use a 20% roll per grass step (5 grass steps per encounter in expectation).", "");
  out.push("| region | per-step rate | weighted roster |", "| --- | ---: | --- |");
  for (const table of configured.encounters) {
    const roster = table.entries.map((entry) => `${entry.speciesId} ${pct(entry.share)}`).join(", ");
    out.push(`| ${table.region} | ${pct(table.rate)} | ${roster} |`);
  }

  out.push("", "### Ordinary encounter effort", "", "Bounds assume a representative attack-4 starter and routine +/− questions (4–6 damage per correct answer). They are deterministic review bounds, not a claim about child skill.", "");
  out.push("| rarity | wild HP | correct-answer turns |", "| --- | ---: | ---: |");
  for (const effort of configured.effort) {
    out.push(`| ${effort.rarity} | ${effort.minHp}–${effort.maxHp} | ${effort.minTurns}–${effort.maxTurns} |`);
  }

  out.push("", "## Configured capture and variants", "");
  out.push(`Ordinary capture: ${pct(configured.capture.fullHp)} at full HP, ${pct(configured.capture.halfHp)} at half HP, ${pct(configured.capture.tenPercentHp)} at 10% HP.`);
  out.push("Ordinary capture has no action countdown and no thinking timer. Unlimited question thinking time is unchanged.");
  out.push(`The authored Unique path uses ${configured.capture.uniqueTrust} trust from ${configured.capture.uniqueActions} committed answers; wall-clock time is absent.`);
  out.push("Wild variant baseline: normal only. Alt encounter rate is not implemented, so there is no variant constant to tune or approve yet.", "");

  out.push("## Approval record", "");
  out.push("- Runtime constants changed: **none**.");
  out.push("- Baseline disposition: retain until the evidence gate and representative desktop worksheet are complete.");
  out.push("- Guardrails retained: nonzero XP floor; calm ordinary capture; unlimited question thinking time.", "");
  return out.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node tools/render-calibration-report.mjs <events.json>");
    process.exit(1);
  }
  const rows = parseRows(JSON.parse(await readFile(file, "utf8")));
  console.log(renderCalibrationMarkdown(await loadConfiguredCalibration(), aggregateCalibration(rows)));
}
