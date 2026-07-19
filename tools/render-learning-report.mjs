#!/usr/bin/env node
// Learning-quality report (issue #24, AC4): compares configured ("predicted")
// question difficulty with observed play outcomes from telemetry events.
//
// Input: a JSON export of the events table —
//   npx wrangler d1 execute pokemath-db --remote --json \
//     --command "SELECT name, occurred_at, props_json FROM events" > /tmp/events.json
//   npm run report:learning -- /tmp/events.json
// (Both wrangler's `[{results: [...]}]` shape and a bare row array work.)
//
// Privacy: the report is AGGREGATE-ONLY. It never prints an event id, a user
// id, an answer, or a name — and any cell with fewer than MIN_CELL events is
// suppressed so small groups (e.g. two siblings) can't be singled out.

import { readFile } from "node:fs/promises";

export const MIN_CELL = 5;

// --- input -----------------------------------------------------------------

/** Normalize either export shape into flat event rows. */
export function parseRows(json) {
  const rows = Array.isArray(json) ? json : (json.results ?? []);
  // wrangler --json: [{results: [...]}]; bare array: rows directly.
  if (rows.length > 0 && rows.every((r) => r && Array.isArray(r.results))) {
    return rows.flatMap((r) => r.results);
  }
  return rows;
}

function propsOf(row) {
  try {
    return JSON.parse(row.props_json);
  } catch {
    return {};
  }
}

// --- aggregation -----------------------------------------------------------

function cell() {
  return { asked: 0, correct: 0 };
}

function bump(map, key, correct) {
  const c = map.get(key) ?? cell();
  c.asked++;
  if (correct) c.correct++;
  map.set(key, c);
}

export function aggregate(rows) {
  const byOperation = new Map();
  const byTopic = new Map();
  const byTp = new Map();
  const outcomes = new Map(); // "wild|fled" → count
  const species = new Map(); // speciesId → captures
  const sessions = { sign_out: 0, page_unload: 0, unload_during_battle: 0 };
  let minAt = null;
  let maxAt = null;

  for (const row of rows) {
    if (typeof row.occurred_at === "string") {
      if (minAt === null || row.occurred_at < minAt) minAt = row.occurred_at;
      if (maxAt === null || row.occurred_at > maxAt) maxAt = row.occurred_at;
    }
    const props = propsOf(row);
    switch (row.name) {
      case "question_answered":
      case "review_question_answered": {
        const correct = props.correct === true;
        if (typeof props.operation === "string") bump(byOperation, props.operation, correct);
        if (typeof props.topic === "string") bump(byTopic, props.topic, correct);
        if (Number.isInteger(props.tp)) bump(byTp, props.tp, correct);
        break;
      }
      case "battle_outcome": {
        const key = `${props.battle}|${props.outcome}`;
        outcomes.set(key, (outcomes.get(key) ?? 0) + 1);
        break;
      }
      case "creature_captured": {
        if (typeof props.speciesId === "string") {
          species.set(props.speciesId, (species.get(props.speciesId) ?? 0) + 1);
        }
        break;
      }
      case "session_ended": {
        if (props.reason === "sign_out") sessions.sign_out++;
        if (props.reason === "page_unload") {
          sessions.page_unload++;
          if (props.duringBattle === true) sessions.unload_during_battle++;
        }
        break;
      }
      default:
        break; // unknown/future events are ignored, not fatal
    }
  }
  return { byOperation, byTopic, byTp, outcomes, species, sessions, window: { minAt, maxAt }, total: rows.length };
}

// --- rendering ---------------------------------------------------------------

const pct = (part, whole) => (whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`);

function rateTable(title, map, keyHeader) {
  const lines = [`### ${title}`, "", `| ${keyHeader} | answered | correct | rate |`, "| --- | ---: | ---: | ---: |"];
  const keys = [...map.keys()].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  if (keys.length === 0) lines.push(`| _(no data yet)_ | | | |`);
  for (const key of keys) {
    const c = map.get(key);
    if (c.asked < MIN_CELL) {
      lines.push(`| ${key} | ${c.asked} | — | _(suppressed: n<${MIN_CELL})_ |`);
    } else {
      lines.push(`| ${key} | ${c.asked} | ${c.correct} | ${pct(c.correct, c.asked)} |`);
    }
  }
  return lines;
}

// Predicted difficulty = TP (PBD performance level): higher TP should be
// harder. An inversion — a higher TP band with a HIGHER observed correct
// rate than a lower band — is where calibration (#25) should look first.
function tpInversions(byTp) {
  const bands = [...byTp.entries()]
    .filter(([, c]) => c.asked >= MIN_CELL)
    .sort(([a], [b]) => a - b);
  const notes = [];
  for (let i = 1; i < bands.length; i++) {
    const [prevTp, prev] = bands[i - 1];
    const [tp, cur] = bands[i];
    if (cur.correct / cur.asked > prev.correct / prev.asked) {
      notes.push(
        `TP${tp} correct rate (${pct(cur.correct, cur.asked)}, n=${cur.asked}) is HIGHER than ` +
          `TP${prevTp} (${pct(prev.correct, prev.asked)}, n=${prev.asked}) — predicted and observed difficulty disagree.`,
      );
    }
  }
  return notes;
}

export function renderMarkdown(agg) {
  const out = [];
  out.push("# Pokemath learning-quality report", "");
  out.push(`Events: ${agg.total} · window: ${agg.window.minAt ?? "—"} → ${agg.window.maxAt ?? "—"}`);
  out.push(`Aggregate only; cells with n<${MIN_CELL} are suppressed.`, "");

  out.push("## Question correctness (predicted vs observed)", "");
  out.push(...rateTable("By operation", agg.byOperation, "operation"), "");
  out.push(...rateTable("By TP level (predicted difficulty)", agg.byTp, "TP"), "");
  out.push(...rateTable("By curriculum topic", agg.byTopic, "topic"), "");

  const inversions = tpInversions(agg.byTp);
  out.push("### Difficulty inversions", "");
  if (inversions.length === 0) out.push("None — observed correct rates fall as TP rises, as configured.");
  else for (const note of inversions) out.push(`- ⚠️ ${note}`);
  out.push("");

  out.push("## Battle outcomes", "");
  out.push("| battle | outcome | count | share |", "| --- | --- | ---: | ---: |");
  const kinds = [...new Set([...agg.outcomes.keys()].map((k) => k.split("|")[0]))].sort();
  for (const kind of kinds) {
    const total = [...agg.outcomes.entries()]
      .filter(([k]) => k.startsWith(`${kind}|`))
      .reduce((sum, [, v]) => sum + v, 0);
    for (const outcome of ["won", "captured", "fled", "defeated"]) {
      const n = agg.outcomes.get(`${kind}|${outcome}`) ?? 0;
      out.push(`| ${kind} | ${outcome} | ${n} | ${pct(n, total)} |`);
    }
  }
  out.push("", "`fled` is the abandonment signal; a rising share marks over-hard encounters.", "");

  out.push("## Collection variety", "");
  out.push(`Distinct species captured: ${agg.species.size} · total captures: ${[...agg.species.values()].reduce((a, b) => a + b, 0)}`, "");

  out.push("## Voluntary stopping", "");
  out.push(`Sign-outs: ${agg.sessions.sign_out} · page unloads: ${agg.sessions.page_unload} ` + `(of which during a battle: ${agg.sessions.unload_during_battle})`, "");
  out.push("A healthy pattern is stops landing after payoffs, not mid-battle. `page_unload` also fires on refresh, so treat its absolute count with care.", "");

  return out.join("\n");
}

// --- CLI ---------------------------------------------------------------------

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node tools/render-learning-report.mjs <events.json>");
    process.exit(1);
  }
  const rows = parseRows(JSON.parse(await readFile(file, "utf8")));
  console.log(renderMarkdown(aggregate(rows)));
}
