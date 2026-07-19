// Generator tests (M4, #15): seeded determinism, the gate accepts every
// supported slice, and content invariants hold by construction.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SUPPORTED_TOPICS,
  TEMPLATES_BY_TOPIC,
  buildBatchArtifacts,
  generateBatch,
  mulberry32,
  writeBatch,
} from "./generate-question-batch.mjs";
import { checkJsonSchema } from "./validate-question-bank.mjs";
import { gateQuestionBank } from "../shared/question-gate.ts";

const PROFILES = { "4.1": "dpk3_2026_core", "4.2": "dpk3_2026_core", "4.3": "dpk3_2026_core", "4.4": "dpk3_2026_core", extra: "original_dskp_extra" };

test("generator: same seed and params produce byte-identical batches", () => {
  const params = { bankId: "std1.det", topic: "4.2", tpMin: 2, tpMax: 4, profile: "dpk3_2026_core", count: 24, seed: 7 };
  const a = buildBatchArtifacts(params, 1);
  const b = buildBatchArtifacts(params, 1);
  assert.equal(JSON.stringify(a.bank), JSON.stringify(b.bank));
  assert.notEqual(JSON.stringify(a.bank), JSON.stringify(buildBatchArtifacts({ ...params, seed: 8 }, 1).bank));
});

test("generator: the gate accepts batches for every supported topic and band", async () => {
  for (const topic of SUPPORTED_TOPICS) {
    for (const [tpMin, tpMax] of [[1, 2], [2, 3], [3, 4]]) {
      const templates = TEMPLATES_BY_TOPIC[topic].filter((t) => t.tp[0] <= tpMax && t.tp[1] >= tpMin);
      if (templates.length === 0) continue;
      for (const seed of [1, 42]) {
        const params = { bankId: "std1.gate", topic, tpMin, tpMax, profile: PROFILES[topic], count: 20, seed };
        const { bank } = buildBatchArtifacts(params, 1);
        const report = gateQuestionBank(bank);
        const ajv = await checkJsonSchema(bank);
        assert.equal(
          report.accept,
          true,
          `${topic} TP${tpMin}-${tpMax} seed ${seed}: ${JSON.stringify(report.phases.flatMap((p) => p.findings), null, 1)}`,
        );
        assert.equal(ajv.length, 0, `${topic} AJV: ${JSON.stringify(ajv)}`);
      }
    }
  }
});

test("generator: every question carries the batch's slice tags", () => {
  const params = { bankId: "std1.tags", topic: "4.3", tpMin: 2, tpMax: 3, profile: "dpk3_2026_core", count: 30, seed: 5 };
  const { bank } = buildBatchArtifacts(params, 1);
  for (const q of bank.questions) {
    assert.equal(q.topic, "4.3");
    assert.ok(q.tp_level >= 2 && q.tp_level <= 3, `Q${q.id} tp ${q.tp_level}`);
    assert.equal(q.profile, "dpk3_2026_core");
    assert.equal(q.bilingual.numeral, String(q.answer));
  }
});

test("generator: counting items show exactly <answer> emoji (no miscounted pictures)", () => {
  const params = { bankId: "std1.emoji", topic: "4.1", tpMin: 1, tpMax: 2, profile: "dpk3_2026_core", count: 40, seed: 11 };
  const { bank } = buildBatchArtifacts(params, 1);
  const counting = bank.questions.filter((q) => q.format_type === "count-write" || q.format_type === "count-circle");
  assert.ok(counting.length > 0, "expected counting items in the batch");
  for (const q of counting) {
    const emoji = [...q.question_zh].filter((ch) => ch.codePointAt(0) > 0xffff);
    assert.equal(emoji.length, q.answer, `Q${q.id}: ${q.question_zh}`);
  }
});

test("generator: TP1 includes make-ten facts (7+3, 10−5 are anchors, not carries)", () => {
  let sawMakeTenAdd = false;
  let sawFromTenSub = false;
  for (const seed of [1, 2, 3, 4, 5]) {
    const { questions } = generateBatch({ bankId: "std1.tp1", topic: "4.2", tpMin: 1, tpMax: 1, profile: "dpk3_2026_core", count: 20, seed });
    for (const q of questions) {
      if (q.operation === "addition" && q.answer === 10) sawMakeTenAdd = true;
      if (q.operation === "subtraction" && q.expression.startsWith("10 ")) sawFromTenSub = true;
      if (q.operation === "addition") assert.ok(q.answer <= 10, `TP1 sum ${q.answer}`);
    }
  }
  assert.ok(sawMakeTenAdd, "TP1 addition must be able to make ten");
  assert.ok(sawFromTenSub, "TP1 subtraction must be able to subtract from ten");
});

test("generator: 4.4 clock items stay on the dial and carry matching figures (#19)", () => {
  const params = { bankId: "std1.clock", topic: "4.4", tpMin: 1, tpMax: 4, profile: "dpk3_2026_core", count: 40, seed: 19 };
  const { questions } = generateBatch(params);
  const clockReads = questions.filter((q) => q.presentation === "figure:clock");
  assert.ok(clockReads.length > 0, "expected clock-figure items in the batch");
  for (const q of clockReads) {
    // The figure exists, matches the presentation, and can only describe
    // whole/half/quarter/three-quarter hours (AC: no exact-minute reading).
    assert.equal(q.figure?.kind, "clock", `Q${q.id} figure matches presentation`);
    assert.ok([0, 15, 30, 45].includes(q.figure.minute), `Q${q.id} minute ${q.figure.minute}`);
    assert.ok(q.figure.hour >= 1 && q.figure.hour <= 12, `Q${q.id} hour ${q.figure.hour}`);
  }
  // Clock items live on the dial: answers and options are 1..12 — never 0,
  // never 13+.
  const clockItems = questions.filter((q) => q.format_type === "read-instrument");
  assert.ok(clockItems.length > 0, "expected clock items in the batch");
  for (const q of clockItems) {
    assert.ok(q.answer >= 1 && q.answer <= 12, `Q${q.id} answer ${q.answer}`);
    for (const d of q.distractors) {
      assert.ok(d.value >= 1 && d.value <= 12, `Q${q.id} distractor ${d.value}`);
      assert.notEqual(d.value, q.answer, `Q${q.id} distractor equals answer`);
    }
  }
  // The clock-hand-swap probe appears on clock items, and only there
  // (STRATEGY-TOPIC confines it to 4.4 anyway).
  const swaps = questions.filter((q) => q.distractors.some((d) => d.strategy === "clock-hand-swap"));
  assert.ok(swaps.length > 0, "expected clock-hand-swap distractors");
  for (const q of swaps) {
    assert.equal(q.format_type, "read-instrument", `Q${q.id} swap on a clock item`);
  }
});

test("generator: 4.4 covers the full arc menu (read, hands, set, days, months, order)", () => {
  const params = { bankId: "std1.arcmenu", topic: "4.4", tpMin: 1, tpMax: 4, profile: "dpk3_2026_core", count: 60, seed: 7 };
  const { questions } = generateBatch(params);
  const zh = questions.map((q) => q.question_zh);
  assert.ok(zh.some((t) => t.includes("几时？") || t.includes("几时半") || t.includes("几时一刻") || t.includes("几时三刻")), "clock reads");
  assert.ok(zh.some((t) => t.includes("分针") || t.includes("时针")), "hand identification");
  assert.ok(zh.some((t) => t.includes("调到")), "set-the-clock");
  assert.ok(zh.some((t) => t.includes("星期")), "day naming");
  assert.ok(zh.some((t) => t.includes("个月") || t.includes("几月")), "month naming");
  assert.ok(questions.some((q) => q.answer_form === "ordering"), "event ordering");
});

test("generator: batch ids are unique and content is not duplicated within a batch", () => {
  const params = { bankId: "std1.dupe", topic: "4.2", tpMin: 2, tpMax: 4, profile: "dpk3_2026_core", count: 30, seed: 3 };
  const { questions } = generateBatch(params);
  assert.equal(new Set(questions.map((q) => q.id)).size, 30);
  assert.equal(new Set(questions.map((q) => `${q.expression}|${q.question_zh}`)).size, 30);
});

test("generator: refuses unsupported topics, bad bands, and profile mismatches", () => {
  const base = { bankId: "std1.x", topic: "4.1", tpMin: 1, tpMax: 2, profile: "dpk3_2026_core", count: 5, seed: 1 };
  assert.throws(() => generateBatch({ ...base, topic: "4.5" }), /no generator templates/);
  assert.throws(() => generateBatch({ ...base, topic: "extra" }), /original_dskp_extra/);
  assert.throws(() => generateBatch({ ...base, tpMin: 0, tpMax: 9 }), /--tp/);
  assert.throws(() => generateBatch({ ...base, profile: "nonsense" }), /--profile/);
  assert.throws(() => generateBatch({ ...base, count: 0 }), /--count/);
  assert.throws(() => generateBatch({ ...base, topic: "4.4", tpMin: 5, tpMax: 6 }), /no 4\.4 templates cover/);
});

test("generator: writeBatch never overwrites an existing candidate", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gen-"));
  try {
    const params = { bankId: "std1.immutable", topic: "4.1", tpMin: 1, tpMax: 2, profile: "dpk3_2026_core", count: 5, seed: 9 };
    const first = await writeBatch(params, { candidatesDir: dir, resourcesDir: dir });
    await assert.rejects(writeBatch(params, { candidatesDir: dir, resourcesDir: dir }), /immutable/);
    const provenance = JSON.parse(await readFile(first.provenancePath, "utf8"));
    assert.equal(provenance.params.seed, 9);
    assert.equal(provenance.question_count, 5);
    assert.match(provenance.reproduce, /--seed 9/);
    assert.equal(provenance.sha256.length, 64);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mulberry32: deterministic stream", () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});
