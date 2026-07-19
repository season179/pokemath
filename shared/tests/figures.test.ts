// Figure spec tests (M5, #16): the declarative DSL, its structural wire
// validation, the deliberate-fallback view model, the pure figure math, and
// the shipped gallery bank (game/assets/resources/question-banks/std1/
// figure-gallery.v1.json) as the executable reference content.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

import {
  CLOCK_MINUTES,
  COINS_MAX_TOTAL_SEN,
  COIN_DENOMINATIONS,
  OBJECTS_MAX_COUNT,
  TEN_FRAME_MAX_FILLED,
  clockHandAngles,
  coinsTotalSen,
  figureKindForPresentation,
  figurePresentation,
  parseFigureSpec,
  resolveFigureView,
  tenFrameFrames,
  type FigureSpec,
} from "../figures.ts";
import {
  QuestionBank,
  QuestionRound,
  formatAnswer,
  turnsOf,
  type Question,
} from "../question-engine.ts";
import {
  parseQuestionBankData,
  parseQuestionBankV1Data,
} from "../question-bank-validate.ts";
import { parseQuestionBankV2Data } from "../question-v2-validate.ts";
import { adaptV1Question } from "../question-v2-adapt.ts";
import { verifyBank } from "../question-verify.ts";
import type { QuestionV2 } from "../question-v2.ts";

// --- parseFigureSpec: happy paths -------------------------------------------

test("parseFigureSpec: ten-frame, clock, coins, objects", () => {
  assert.deepEqual(parseFigureSpec({ kind: "ten-frame", filled: 7 }, "f"), {
    kind: "ten-frame",
    filled: 7,
  });
  assert.deepEqual(parseFigureSpec({ kind: "clock", hour: 3, minute: 30 }, "f"), {
    kind: "clock",
    hour: 3,
    minute: 30,
  });
  assert.deepEqual(parseFigureSpec({ kind: "coins", coins: [50, 20, 10] }, "f"), {
    kind: "coins",
    coins: [50, 20, 10],
  });
  assert.deepEqual(parseFigureSpec({ kind: "objects", icon: "🐑", count: 8 }, "f"), {
    kind: "objects",
    icon: "🐑",
    count: 8,
  });
  assert.deepEqual(
    parseFigureSpec({ kind: "objects", icon: "🍎", count: 12, crossedOut: 5 }, "f"),
    { kind: "objects", icon: "🍎", count: 12, crossedOut: 5 },
  );
});

test("parseFigureSpec: boundary values are accepted", () => {
  assert.deepEqual(parseFigureSpec({ kind: "ten-frame", filled: 0 }, "f"), {
    kind: "ten-frame",
    filled: 0,
  });
  assert.deepEqual(
    parseFigureSpec({ kind: "ten-frame", filled: TEN_FRAME_MAX_FILLED }, "f"),
    { kind: "ten-frame", filled: TEN_FRAME_MAX_FILLED },
  );
  for (const minute of CLOCK_MINUTES) {
    assert.deepEqual(parseFigureSpec({ kind: "clock", hour: 12, minute }, "f"), {
      kind: "clock",
      hour: 12,
      minute,
    });
  }
  // A 100-sen pile is exactly RM1 — the top of the Standard-1 sen scope.
  assert.deepEqual(parseFigureSpec({ kind: "coins", coins: [50, 50] }, "f"), {
    kind: "coins",
    coins: [50, 50],
  });
});

// --- parseFigureSpec: rejections (strict, labeled, never guessing) ------------

test("parseFigureSpec: rejects unknown kinds and unknown fields", () => {
  assert.throws(() => parseFigureSpec(null, "q.figure"), /must be an object/);
  assert.throws(() => parseFigureSpec([], "q.figure"), /must be an object/);
  assert.throws(
    () => parseFigureSpec({ kind: "pictograph", icons: 5 }, "q.figure"),
    /q\.figure\.kind must be one of: ten-frame, clock, coins, objects/,
  );
  assert.throws(
    () => parseFigureSpec({ kind: "clock", hour: 3, minute: 0, style: "roman" }, "q.figure"),
    /q\.figure has unknown field\(s\): style/,
  );
  assert.throws(
    () => parseFigureSpec({ kind: "objects", icon: "🐑", count: 8, color: "red" }, "q.figure"),
    /unknown field\(s\): color/,
  );
});

test("parseFigureSpec: ten-frame bounds the double frame", () => {
  assert.throws(
    () => parseFigureSpec({ kind: "ten-frame", filled: -1 }, "q.figure"),
    new RegExp(`filled must be in \\[0, ${TEN_FRAME_MAX_FILLED}\\]`),
  );
  assert.throws(
    () => parseFigureSpec({ kind: "ten-frame", filled: TEN_FRAME_MAX_FILLED + 1 }, "q.figure"),
    new RegExp(`filled must be in \\[0, ${TEN_FRAME_MAX_FILLED}\\]`),
  );
  assert.throws(
    () => parseFigureSpec({ kind: "ten-frame", filled: 3.5 }, "q.figure"),
    /filled must be an integer/,
  );
});

test("parseFigureSpec: the clock cannot describe an off-scope time", () => {
  assert.throws(() => parseFigureSpec({ kind: "clock", hour: 0, minute: 0 }, "q.figure"), /hour must be in \[1, 12\]/);
  assert.throws(() => parseFigureSpec({ kind: "clock", hour: 13, minute: 0 }, "q.figure"), /hour must be in \[1, 12\]/);
  // 07 and 59 minutes are real times, but not Standard-1 readable ones.
  assert.throws(
    () => parseFigureSpec({ kind: "clock", hour: 3, minute: 7 }, "q.figure"),
    /minute must be one of: 0, 15, 30, 45/,
  );
  assert.throws(
    () => parseFigureSpec({ kind: "clock", hour: 3, minute: 59 }, "q.figure"),
    /minute must be one of: 0, 15, 30, 45/,
  );
});

test("parseFigureSpec: coins are Malaysian sen, totaling ≤ RM1", () => {
  assert.throws(
    () => parseFigureSpec({ kind: "coins", coins: [] }, "q.figure"),
    /coins must be a non-empty array/,
  );
  for (const fake of [1, 2, 25, 100]) {
    assert.throws(
      () => parseFigureSpec({ kind: "coins", coins: [fake] }, "q.figure"),
      /Malaysian sen denomination: 5, 10, 20, 50/,
      `coin ${fake} sen`,
    );
  }
  assert.throws(
    () => parseFigureSpec({ kind: "coins", coins: [50, 50, 5] }, "q.figure"),
    new RegExp(`total 105 sen exceeds RM1 \\(${COINS_MAX_TOTAL_SEN} sen\\)`),
  );
});

test("parseFigureSpec: objects counts and cross-outs stay within the island laws", () => {
  assert.throws(
    () => parseFigureSpec({ kind: "objects", icon: "🐑", count: 0 }, "q.figure"),
    new RegExp(`count must be in \\[1, ${OBJECTS_MAX_COUNT}\\]`),
  );
  assert.throws(
    () => parseFigureSpec({ kind: "objects", icon: "🐑", count: OBJECTS_MAX_COUNT + 1 }, "q.figure"),
    new RegExp(`count must be in \\[1, ${OBJECTS_MAX_COUNT}\\]`),
  );
  assert.throws(
    () => parseFigureSpec({ kind: "objects", icon: "🐑", count: 8, crossedOut: 9 }, "q.figure"),
    /crossedOut must be in \[1, 8\]/,
  );
  assert.throws(
    () => parseFigureSpec({ kind: "objects", icon: "", count: 8 }, "q.figure"),
    /icon must be a non-empty string/,
  );
});

// --- presentation bridge -------------------------------------------------------

test("figureKindForPresentation: only the four rendered kinds map", () => {
  assert.equal(figureKindForPresentation("figure:ten-frame"), "ten-frame");
  assert.equal(figureKindForPresentation("figure:clock"), "clock");
  assert.equal(figureKindForPresentation("figure:coins"), "coins");
  assert.equal(figureKindForPresentation("figure:objects"), "objects");
  assert.equal(figureKindForPresentation("figure:pictograph"), null);
  assert.equal(figureKindForPresentation("figure:number-bond"), null);
  assert.equal(figureKindForPresentation("picture"), null);
  assert.equal(figureKindForPresentation("plain"), null);
});

test("figurePresentation round-trips figureKindForPresentation", () => {
  for (const kind of ["ten-frame", "clock", "coins", "objects"] as const) {
    assert.equal(figureKindForPresentation(figurePresentation(kind)), kind);
  }
});

// --- the deliberate fallback view model ----------------------------------------

function q(overrides: Partial<Question>): Question {
  return {
    id: 1,
    question_zh: "问题",
    question_en: "Question",
    operation: "counting",
    expression: "8",
    answer: 8,
    ...overrides,
  };
}

test("resolveFigureView: an authored spec renders", () => {
  const spec: FigureSpec = { kind: "clock", hour: 8, minute: 0 };
  const model = resolveFigureView(q({ presentation: "figure:clock", figure: spec }));
  assert.deepEqual(model, { mode: "figure", spec });
});

test("resolveFigureView: figure:* presentations without a spec fall back deliberately", () => {
  // A renderer-less presentation (pictograph) and a renderable presentation
  // that simply carries no data both land on prose — never a blank panel.
  assert.deepEqual(resolveFigureView(q({ presentation: "figure:pictograph" })), {
    mode: "prose-fallback",
    presentation: "figure:pictograph",
  });
  assert.deepEqual(resolveFigureView(q({ presentation: "figure:clock" })), {
    mode: "prose-fallback",
    presentation: "figure:clock",
  });
});

test("resolveFigureView: plain/picture/story and legacy questions stay prose", () => {
  assert.deepEqual(resolveFigureView(q({ presentation: "plain" })), { mode: "prose" });
  assert.deepEqual(resolveFigureView(q({ presentation: "picture" })), { mode: "prose" });
  assert.deepEqual(resolveFigureView(q({ presentation: "story" })), { mode: "prose" });
  assert.deepEqual(resolveFigureView(q({})), { mode: "prose" });
});

// --- pure figure math ------------------------------------------------------------

test("clockHandAngles: the hour hand travels with the minutes", () => {
  assert.deepEqual(clockHandAngles(3, 0), { hourDeg: 90, minuteDeg: 0 });
  // 3:30: halfway between 3 and 4 — the clock-hand-swap distractor's probe.
  assert.deepEqual(clockHandAngles(3, 30), { hourDeg: 105, minuteDeg: 180 });
  assert.deepEqual(clockHandAngles(12, 0), { hourDeg: 0, minuteDeg: 0 });
  assert.deepEqual(clockHandAngles(6, 45), { hourDeg: 202.5, minuteDeg: 270 });
  assert.deepEqual(clockHandAngles(9, 15), { hourDeg: 277.5, minuteDeg: 90 });
});

test("tenFrameFrames: full frames first", () => {
  assert.deepEqual(tenFrameFrames(0), [0]);
  assert.deepEqual(tenFrameFrames(7), [7]);
  assert.deepEqual(tenFrameFrames(10), [10]);
  assert.deepEqual(tenFrameFrames(13), [10, 3]);
  assert.deepEqual(tenFrameFrames(20), [10, 10]);
});

test("coinsTotalSen sums the pile", () => {
  assert.equal(coinsTotalSen([50, 20, 10]), 80);
  assert.equal(coinsTotalSen([5]), 5);
  assert.equal(coinsTotalSen(COIN_DENOMINATIONS), 85);
});

// --- wire integration ------------------------------------------------------------

function minimalV2Question(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 1,
    topic: "4.1",
    tp_level: 1,
    profile: "dpk3_2026_core",
    item_format: "objective",
    format_type: "count-write",
    presentation: "figure:objects",
    answer_form: "count",
    answer_unit: "none",
    operation: "counting",
    expression: "8",
    answer: 8,
    bilingual: { numeral: "8", zh_word: "八" },
    question_zh: "数一数，共有几只羊？",
    question_en: "How many sheep are there?",
    distractors: [
      { value: 6, strategy: "off-by-one-count" },
      { value: 7, strategy: "off-by-one-count" },
      { value: 9, strategy: "off-by-one-count" },
    ],
    ...overrides,
  };
}

function bankWith(question: Record<string, unknown>): Record<string, unknown> {
  return {
    schema_version: 2,
    bank_id: "std1.figure-fixture",
    version: 1,
    source: "shared/tests/figures.test.ts",
    currency: "RM",
    questions: [question],
  };
}

test("v2 wire: a matching figure spec parses through the trust boundary", () => {
  const parsed = parseQuestionBankData(
    bankWith(minimalV2Question({ figure: { kind: "objects", icon: "🐑", count: 8 } })),
  );
  assert.equal(parsed.schema_version, 2);
  const [question] = (parsed as { questions: QuestionV2[] }).questions;
  assert.deepEqual(question.figure, { kind: "objects", icon: "🐑", count: 8 });
});

test("v2 wire: a figure whose kind mismatches the presentation is rejected", () => {
  assert.throws(
    () =>
      parseQuestionBankData(
        bankWith(
          minimalV2Question({
            presentation: "figure:clock",
            figure: { kind: "objects", icon: "🐑", count: 8 },
          }),
        ),
      ),
    /question 1\.figure\.kind "objects" does not match presentation "figure:clock"/,
  );
});

test("v2 wire: malformed figures are rejected at the trust boundary", () => {
  assert.throws(
    () =>
      parseQuestionBankData(
        bankWith(minimalV2Question({ figure: { kind: "clock", hour: 3, minute: 22 } })),
      ),
    /question 1\.figure\.minute must be one of: 0, 15, 30, 45/,
  );
  assert.throws(
    () =>
      parseQuestionBankV2Data(
        bankWith(minimalV2Question({ presentation: "figure:coins", figure: { kind: "coins", coins: [50, 50, 20] } })),
      ),
    /question 1\.figure\.coins total 120 sen exceeds RM1/,
  );
});

test("v1 wire stays frozen: figure and presentation are unknown fields", () => {
  const v1 = {
    schema_version: 1,
    bank_id: "legacy.fixture",
    version: 1,
    source: "shared/tests/figures.test.ts",
    currency: "RM",
    questions: [
      {
        id: 1,
        question_zh: "数一数",
        question_en: "Count",
        operation: "counting",
        expression: "8",
        answer: 8,
        figure: { kind: "objects", icon: "🐑", count: 8 },
      },
    ],
  };
  assert.throws(() => parseQuestionBankV1Data(structuredClone(v1)), /unknown field\(s\): figure/);
  v1.questions[0] = (({ figure: _figure, ...rest }) => rest)(v1.questions[0]) as never;
  (v1.questions[0] as Record<string, unknown>).presentation = "figure:objects";
  assert.throws(() => parseQuestionBankV1Data(structuredClone(v1)), /unknown field\(s\): presentation/);
});

test("the v1 adapter never fabricates a figure for legacy content", () => {
  const legacy: Question = q({ operation: "counting" });
  const adapted = adaptV1Question(legacy);
  assert.equal(adapted.figure, undefined);
  assert.equal(adapted.presentation, "picture"); // legacy inference unchanged
});

// --- the shipped gallery bank ------------------------------------------------------

const GALLERY_URL = new URL(
  "../../game/assets/resources/question-banks/std1/figure-gallery.v1.json",
  import.meta.url,
);
const GALLERY_SOURCE = await readFile(GALLERY_URL, "utf8");
const GALLERY = parseQuestionBankData(JSON.parse(GALLERY_SOURCE));

const V2_SCHEMA_URL = new URL("../../schemas/question-bank-v2.schema.json", import.meta.url);
const V2_SCHEMA = JSON.parse(await readFile(V2_SCHEMA_URL, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const validateV2 = ajv.compile(V2_SCHEMA);

test("gallery bank: parses as schema v2 and validates against the JSON schema", () => {
  assert.equal(GALLERY.schema_version, 2);
  assert.equal(validateV2(JSON.parse(GALLERY_SOURCE)), true, ajv.errorsText(validateV2.errors));
});

test("gallery bank: content verification is clean (answers re-derive, scope holds)", () => {
  const rows = verifyBank(GALLERY.questions);
  const problems = rows.flatMap((row) =>
    row.findings
      .filter((f) => f.severity === "error" || f.severity === "warn")
      .map((f) => `question ${row.id}: ${f.code} — ${f.message}`),
  );
  assert.deepEqual(problems, []);
});

test("gallery bank: every figure kind is exercised, with the deliberate fallback", () => {
  const questions = (GALLERY as { questions: QuestionV2[] }).questions;
  const byPresentation = new Map(questions.map((question) => [question.presentation, question]));
  for (const kind of ["ten-frame", "clock", "coins", "objects"] as const) {
    const question = byPresentation.get(figurePresentation(kind));
    assert.ok(question, `gallery carries a ${figurePresentation(kind)} item`);
    assert.equal(question.figure?.kind, kind);
    assert.deepEqual(resolveFigureView(question), { mode: "figure", spec: question.figure });
  }
  // The pictograph item declares its presentation but no spec: the desktop
  // layout deliberately serves prose plus the world sprites.
  const fallback = byPresentation.get("figure:pictograph");
  assert.ok(fallback, "gallery carries the fallback exemplar");
  assert.equal(fallback.figure, undefined);
  assert.deepEqual(resolveFigureView(fallback), {
    mode: "prose-fallback",
    presentation: "figure:pictograph",
  });
});

test("gallery bank: serves through the stock engine (choices include the answer)", () => {
  const bank = new QuestionBank(GALLERY, () => 0);
  const picked = bank.pick();
  const round = new QuestionRound(turnsOf(picked)[0], () => 0);
  assert.equal(round.choices.length, 4);
  assert.ok(round.choices.includes(picked.answer));
  assert.equal(formatAnswer(picked.answer, picked.answer_unit).length > 0, true);
});
