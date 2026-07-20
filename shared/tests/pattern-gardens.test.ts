import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parseQuestionBankData } from "../question-bank-validate.ts";
import {
  parseActiveManifestPointer,
  parseQuestionBankManifest,
  resolveManifestEntry,
  verifyManifestEntryAgainstBank,
} from "../question-bank-manifest.ts";

const RESOURCES_URL = new URL("../../game/assets/resources/", import.meta.url);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, RESOURCES_URL), "utf8"));
}

function nextInRepeatedPattern<T>(items: readonly T[]): T {
  assert.ok(items.length > 0 && items.length % 2 === 0, "pattern must contain two complete repeats");
  const half = items.length / 2;
  assert.deepEqual(items.slice(0, half), items.slice(half), "pattern halves must repeat");
  return items[0];
}

const bank = parseQuestionBankData(
  await readJson("question-banks/std1/std1.pattern-gardens.v2.json"),
);
const byId = new Map(bank.questions.map((question) => [question.id, question]));

test("Pattern Gardens v2 pattern answers describe the next rendered shape", () => {
  assert.equal(bank.version, 2);

  const shapes = byId.get(5);
  assert.ok(shapes);
  assert.equal(shapes.figure?.kind, "shapes");
  if (shapes.figure?.kind !== "shapes") throw new Error("question 5 needs a shapes figure");
  const nextShape = nextInRepeatedPattern(shapes.figure.sequence);
  assert.equal(nextShape, "triangle");
  assert.equal(shapes.answer, 3, "the next triangle has 3 sides");
  assert.match(shapes.question_zh, /△ ○ △ ○/);
  assert.match(shapes.question_en, /triangle, circle, triangle, circle/);

  const solids = byId.get(15);
  assert.ok(solids);
  assert.equal(solids.figure?.kind, "solids");
  if (solids.figure?.kind !== "solids") throw new Error("question 15 needs a solids figure");
  const nextSolid = nextInRepeatedPattern(solids.figure.solids);
  assert.equal(nextSolid, "cone");
  assert.equal(solids.answer, 1, "the next cone has 1 vertex");
  assert.match(solids.question_zh, /圆锥体、球体、圆锥体、球体/);
  assert.match(solids.question_en, /cone, sphere, cone, sphere/);
});

test("the active manifest serves Pattern Gardens v2", async () => {
  const pointer = parseActiveManifestPointer(
    await readJson("question-banks/active-manifest.json"),
  );
  const manifest = parseQuestionBankManifest(await readJson(`${pointer.manifest}.json`));
  const entry = resolveManifestEntry(manifest, {
    grade: "std1",
    topic: "4.6",
    tpLevel: 2,
    profile: "dpk3_2026_core",
  });

  assert.equal(entry.bank_id, "std1.pattern-gardens");
  assert.equal(entry.version, 2);
  assert.equal(entry.path, "question-banks/std1/std1.pattern-gardens.v2");
  verifyManifestEntryAgainstBank(entry, bank);
});
