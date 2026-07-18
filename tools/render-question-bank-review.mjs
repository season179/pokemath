#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseQuestionBankData } from "../shared/question-bank-validate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_BANK_PATH = join(
  root,
  "game",
  "assets",
  "resources",
  "question-banks",
  "std1",
  "woolly-meadows.v1.json",
);
export const DEFAULT_REVIEW_PATH = join(
  root,
  "docs",
  "question-banks",
  "std1-woolly-meadows-v1-review.md",
);

function quote(text) {
  return String(text)
    .split("\n")
    .map((line) => `> ${line || "&nbsp;"}`)
    .join("\n");
}

function cell(text) {
  return String(text).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function bankTitle(bankId) {
  return String(bankId)
    .replace(/^std(\d+)\./, "Standard $1 · ")
    .replaceAll(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function renderQuestionBankReview(
  bank,
  sourceText,
  sourceHref = "../../game/assets/resources/question-banks/std1/woolly-meadows.v1.json",
) {
  const hash = createHash("sha256").update(sourceText).digest("hex");
  const counts = new Map();
  for (const q of bank.questions) {
    if (q.tp_level !== undefined) {
      counts.set(q.tp_level, (counts.get(q.tp_level) ?? 0) + 1);
    }
  }
  const tpSummary = counts.size > 0
    ? [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([tp, count]) => `TP${tp}: ${count}`)
      .join(" · ")
    : "TP metadata not provided";

  const out = [
    `# ${bankTitle(bank.bank_id)} question-bank review`,
    "",
    "> Generated from the canonical JSON bank. Do not edit this review copy to change questions; change the JSON and regenerate it.",
    "",
    `**Review status:** Pending Season's approval<br>`,
    `**Bank:** \`${bank.bank_id}\` v${bank.version} · schema v${bank.schema_version}<br>`,
    `**Canonical source:** [versioned JSON](${sourceHref})<br>`,
    `**Questions:** ${bank.questions.length} · ${tpSummary}<br>`,
    `**Content SHA-256:** \`${hash}\``,
    "",
    "## How to review",
    "",
    "For each question, check the Chinese and English wording, age suitability, correct answer, and whether the three wrong answers are believable mistakes. The game shuffles the four choices. Tell the agent which question numbers need changes, or approve the complete bank.",
    "",
    "## Overview",
    "",
    "| Question | TP | Type | Correct answer |",
    "|---:|---:|---|---:|",
    ...bank.questions.map((q) => `| Q${q.id} | ${q.tp_level === undefined ? "—" : `TP${q.tp_level}`} | ${cell(q.operation)} | ${q.answer} |`),
    "",
    "## Questions",
    "",
  ];

  for (const q of bank.questions) {
    const tpLabel = q.tp_level === undefined ? "TP not set" : `TP${q.tp_level}`;
    const distractorRows = q.distractors?.length
      ? q.distractors.map((d) => `| ${d.value} | ${cell(d.strategy)} |`)
      : ["| — | No authored choices; the runtime generates near-misses. |"];
    out.push(
      `### Q${q.id} · ${tpLabel} · ${q.operation}`,
      "",
      "**中文**",
      "",
      quote(q.question_zh),
      "",
      "**English**",
      "",
      quote(q.question_en),
      "",
      `**Correct answer:** ${q.answer}`,
      "",
      "| Wrong choice | Why it is included |",
      "|---:|---|",
      ...distractorRows,
      "",
      "**Decision:** ☐ Approve · ☐ Revise · ☐ Replace",
      "",
      "---",
      "",
    );
  }

  return `${out.join("\n").trimEnd()}\n`;
}

export async function generateQuestionBankReview(
  bankPath = DEFAULT_BANK_PATH,
  reviewPath = DEFAULT_REVIEW_PATH,
) {
  const sourceText = await readFile(bankPath, "utf8");
  const bank = parseQuestionBankData(JSON.parse(sourceText));
  const sourceHref = relative(dirname(reviewPath), bankPath).replaceAll("\\", "/");
  const markdown = renderQuestionBankReview(bank, sourceText, sourceHref);
  await mkdir(dirname(reviewPath), { recursive: true });
  await writeFile(reviewPath, markdown, "utf8");
  return reviewPath;
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = await generateQuestionBankReview(process.argv[2], process.argv[3]);
  console.log(output);
}
