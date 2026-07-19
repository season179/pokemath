import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

import {
  formatAnswer,
  QuestionBank,
  QuestionRound,
  turnsOf,
  type Question,
  type QuestionBankData,
} from "../question-engine.ts";
import {
  parseQuestionBankData,
  parseQuestionBankV1Data,
} from "../question-bank-validate.ts";
import { parseQuestionBankV2Data } from "../question-v2-validate.ts";
import {
  adaptQuestionBankV1ToV2,
  adaptV1Question,
  LEGACY_TOPIC,
  LEGACY_TP_LEVEL,
} from "../question-v2-adapt.ts";
import {
  chineseNumeral,
  type QuestionV2,
  type VersionedQuestionBankV2Data,
} from "../question-v2.ts";
import {
  gateQuestionsByProfile,
  servesProfile,
} from "../curriculum.ts";
import { verifyQuestion } from "../question-verify.ts";
import { SAMPLE_BANK } from "../question-bank.ts";

// --- fixtures ---------------------------------------------------------------

const WOOLLY_URL = new URL(
  "../../game/assets/resources/question-banks/std1/woolly-meadows.v1.json",
  import.meta.url,
);
const WOOLLY_SOURCE = await readFile(WOOLLY_URL, "utf8");
const WOOLLY_V1 = parseQuestionBankV1Data(JSON.parse(WOOLLY_SOURCE));

const SCHEMA_URL = new URL("../../schemas/question-bank-v2.schema.json", import.meta.url);
const V2_SCHEMA = JSON.parse(await readFile(SCHEMA_URL, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const validateV2Schema = ajv.compile(V2_SCHEMA);

const LEGACY_SAMPLE_SOURCE = {
  schema_version: 1,
  bank_id: "legacy.sample",
  version: 1,
  ...SAMPLE_BANK,
};
const LEGACY_SAMPLE_V1 = parseQuestionBankV1Data(structuredClone(LEGACY_SAMPLE_SOURCE));

/** A minimal valid v2 bank: one core counting item, one extra-profile item. */
function validV2Bank(): Record<string, unknown> {
  return {
    schema_version: 2,
    bank_id: "std1.fixture",
    version: 1,
    source: "shared/tests/schema-v2.test.ts",
    currency: "RM",
    profile: "dpk3_2026_core",
    questions: [
      {
        id: 1,
        topic: "4.1",
        tp_level: 1,
        profile: "dpk3_2026_core",
        item_format: "objective",
        format_type: "count-write",
        presentation: "picture",
        answer_form: "count",
        answer_unit: "none",
        operation: "counting",
        expression: "18",
        answer: 18,
        bilingual: { numeral: "18", zh_word: "十八" },
        question_zh: "数一数，共有几朵花？",
        question_en: "Count the flowers. How many are there?",
        distractors: [
          { value: 17, strategy: "off-by-one-count" },
          { value: 19, strategy: "off-by-one-count" },
          { value: 81, strategy: "digit-reversal" },
        ],
      },
      {
        id: 2,
        topic: "extra",
        tp_level: 2,
        profile: "original_dskp_extra",
        item_format: "objective",
        format_type: "pattern-continue",
        presentation: "plain",
        answer_form: "numeral",
        answer_unit: "none",
        operation: "addition",
        expression: "12 + 4",
        answer: 16,
        bilingual: { numeral: "16", zh_word: "十六" },
        question_zh: "四个四个地数：4、8、12、__",
        question_en: "Count in fours: 4, 8, 12, __",
        distractors: [
          { value: 14, strategy: "off-by-one-count" },
          { value: 12, strategy: "raw-operand" },
          { value: 20, strategy: "next-vs-between" },
        ],
      },
    ],
  };
}

// --- battle transcript (the golden harness) ---------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The battle surface, serialized: pick → turns → round choices (formatted) →
 * judging. Two banks with identical transcripts serve identical battles.
 */
function battleTranscript(data: QuestionBankData, seed: number, rounds: number): string {
  const rng = mulberry32(seed);
  const bank = new QuestionBank(data, rng);
  const lines: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const q = bank.pick();
    for (const turn of turnsOf(q)) {
      const round = new QuestionRound(turn, rng);
      const choices = round.choices.map((c) => formatAnswer(c, q.answer_unit)).join("|");
      const judged = round.choices.map((c) => (round.judge(c) ? "T" : "F")).join("");
      lines.push(
        `round=${String(i).padStart(2, "0")} q=${q.id} turn=${turn.stepIndex + 1}/${turn.stepCount} ` +
          `expr=${turn.expression} answer=${formatAnswer(turn.answer, q.answer_unit)} ` +
          `choices=${choices} judged=${judged}`,
      );
    }
  }
  return lines.join("\n");
}

// --- legacy goldens: adapted v1 serves byte-for-byte identically ------------

test("golden: adapted Woolly v1 bank serves byte-for-byte identical battles", () => {
  const raw = battleTranscript(WOOLLY_V1, 20260719, 40);
  const adapted = battleTranscript(adaptQuestionBankV1ToV2(WOOLLY_V1), 20260719, 40);
  assert.equal(adapted, raw, "v1 → v2 adaptation changed Woolly battle behavior");
});

test("golden: adapted legacy sample bank serves byte-for-byte identical battles", () => {
  // Covers the engine near-miss fallback (no authored distractors), legacy
  // RM rendering (no answer_unit), and multi-step turns.
  const raw = battleTranscript(LEGACY_SAMPLE_V1, 20260720, 30);
  const adapted = battleTranscript(adaptQuestionBankV1ToV2(LEGACY_SAMPLE_V1), 20260720, 30);
  assert.equal(adapted, raw, "v1 → v2 adaptation changed legacy battle behavior");
});

test("golden: legacy battle transcripts match the checked-in golden file", async () => {
  const goldenUrl = new URL("./goldens/schema-v2-legacy-battle.golden.txt", import.meta.url);
  const golden = [
    "# Seeded battle transcripts of the legacy banks, served through the v1 path.",
    "# The v1→v2 adapter must produce byte-for-byte identical transcripts (see",
    "# the parity tests). Regenerate only after a deliberate engine change:",
    "# UPDATE_GOLDENS=1 npm test",
    "== woolly-meadows.v1 (seed 20260719, 40 rounds) ==",
    battleTranscript(WOOLLY_V1, 20260719, 40),
    "== legacy.sample (seed 20260720, 30 rounds) ==",
    battleTranscript(LEGACY_SAMPLE_V1, 20260720, 30),
    "",
  ].join("\n");
  if (process.env.UPDATE_GOLDENS === "1") {
    await mkdir(new URL(".", goldenUrl), { recursive: true });
    await writeFile(goldenUrl, golden, "utf8");
  }
  assert.equal(
    golden,
    await readFile(goldenUrl, "utf8"),
    "legacy battle behavior drifted from the golden file; " +
      "if this engine change was deliberate, regenerate with UPDATE_GOLDENS=1 npm test",
  );
});

// --- chineseNumeral ----------------------------------------------------------

test("chineseNumeral: Standard-1 range and legacy answers", () => {
  const cases: Array<[number, string]> = [
    [0, "零"],
    [5, "五"],
    [8, "八"],
    [10, "十"],
    [12, "十二"],
    [15, "十五"],
    [20, "二十"],
    [40, "四十"],
    [46, "四十六"],
    [73, "七十三"],
    [99, "九十九"],
    [100, "一百"],
    [108, "一百零八"],
    [110, "一百一十"],
    [115, "一百一十五"],
    [790, "七百九十"],
    [1000, "一千"],
    [1001, "一千零一"],
    [1015, "一千零一十五"],
    [1706, "一千七百零六"],
    [2010, "二千零一十"],
    [10000, "一万"],
    [10001, "一万零一"],
    [10010, "一万零一十"],
    [10201, "一万零二百零一"],
    [12000, "一万二千"],
    [12800, "一万二千八百"],
    [20100, "二万零一百"],
    [34411, "三万四千四百一十一"],
    [46390, "四万六千三百九十"],
    [100000, "十万"],
    [120000, "十二万"],
  ];
  for (const [n, want] of cases) {
    assert.equal(chineseNumeral(n), want, `chineseNumeral(${n})`);
  }
});

test("chineseNumeral: rejects negatives, non-integers, and huge values", () => {
  assert.throws(() => chineseNumeral(-1), /not a non-negative integer/);
  assert.throws(() => chineseNumeral(1.5), /not a non-negative integer/);
  assert.throws(() => chineseNumeral(100_000_000), /exceeds 99,999,999/);
});

// --- the v1 → v2 adapter -----------------------------------------------------

test("adapter: Woolly items keep authored metadata and gain explicit v2 fields", () => {
  const adapted = adaptQuestionBankV1ToV2(WOOLLY_V1);
  const q1 = adapted.questions[0];
  assert.equal(q1.topic, "4.1");
  assert.equal(q1.tp_level, 1);
  assert.equal(q1.profile, "dpk3_2026_core");
  assert.equal(q1.answer_unit, "none");
  assert.equal(q1.item_format, "objective");
  assert.equal(q1.format_type, "count-write");
  assert.equal(q1.presentation, "picture");
  assert.equal(q1.answer_form, "count");
  assert.deepEqual(q1.bilingual, { numeral: "8", zh_word: "八" });
  // legacy free-text strategies are preserved verbatim, never laundered
  assert.equal(q1.distractors?.[0].strategy, "off-by-one-count (skipped one)");
  assert.equal(q1.distractors?.length, 3);
  assert.equal(adapted.schema_version, 2);
  assert.equal(adapted.bank_id, "std1.woolly-meadows");
  assert.equal(adapted.profile, "dpk3_2026_core");
  assert.equal(adapted.scope, WOOLLY_V1.scope);
});

test("adapter: untagged legacy questions get safe documented defaults", () => {
  const adapted = adaptQuestionBankV1ToV2(LEGACY_SAMPLE_V1);
  const q1 = adapted.questions[0]; // legacy Year-4 multiplication word problem
  assert.equal(q1.topic, LEGACY_TOPIC);
  assert.equal(q1.tp_level, LEGACY_TP_LEVEL);
  assert.equal(q1.profile, "dpk3_2026_core");
  assert.equal(q1.format_type, "fill-blank");
  assert.equal(q1.presentation, "plain");
  assert.equal(q1.answer_form, "numeral");
  assert.deepEqual(q1.bilingual, { numeral: "12800", zh_word: "一万二千八百" });
  assert.equal(q1.answer_unit, undefined, "legacy RM rendering must survive");
  assert.equal(q1.distractors, undefined, "engine near-miss fallback must survive");
});

test("adapter: stepped legacy questions keep steps and table verbatim", () => {
  const adapted = adaptQuestionBankV1ToV2(LEGACY_SAMPLE_V1);
  const q5 = adapted.questions[4];
  assert.equal(q5.format_type, "word-single");
  assert.equal(q5.presentation, "story");
  assert.deepEqual(q5.steps, LEGACY_SAMPLE_V1.questions[4].steps);
  assert.deepEqual(q5.table, { P: 8655, Q: 40256 });
  assert.deepEqual(q5.bilingual, { numeral: "34411", zh_word: "三万四千四百一十一" });
});

test("adapter: never mutates the source bank", () => {
  const before = JSON.stringify(LEGACY_SAMPLE_V1);
  adaptQuestionBankV1ToV2(LEGACY_SAMPLE_V1);
  assert.equal(JSON.stringify(LEGACY_SAMPLE_V1), before);
});

test("adapter: output owns its objects (no aliasing of the source bank)", () => {
  const adapted = adaptQuestionBankV1ToV2(WOOLLY_V1);
  adapted.questions[0].distractors![0].value = 999;
  assert.notEqual(WOOLLY_V1.questions[0].distractors?.[0].value, 999);
  assert.equal(WOOLLY_V1.questions[0].distractors?.length, 3);
});

test("adapter: rejects unknown profiles and underivable bilingual values", () => {
  const badProfile: Question = {
    ...LEGACY_SAMPLE_V1.questions[0],
    profile: "ibm_model_1",
  };
  assert.throws(() => adaptV1Question(badProfile), /not a known curriculum profile/);

  const negative: Question = { ...LEGACY_SAMPLE_V1.questions[0], answer: -5 };
  assert.throws(() => adaptV1Question(negative), /cannot derive bilingual\.zh_word/);

  const badBankProfile = { ...LEGACY_SAMPLE_V1, profile: "ibm_model_1" };
  assert.throws(() => adaptQuestionBankV1ToV2(badBankProfile), /question bank profile/);
});

test("adapter: refuses non-v1 input", () => {
  const v2 = parseQuestionBankV2Data(validV2Bank());
  assert.throws(
    () => adaptQuestionBankV1ToV2(v2 as never),
    /expects a schema v1 bank, got schema_version 2/,
  );
});

// --- v2 wire parsing ----------------------------------------------------------

test("v2 wire: a valid bank parses with every field explicit", () => {
  const bank = parseQuestionBankV2Data(validV2Bank());
  assert.equal(bank.schema_version, 2);
  assert.equal(bank.questions.length, 2);
  const q1: QuestionV2 = bank.questions[0];
  assert.equal(q1.item_format, "objective");
  assert.equal(q1.format_type, "count-write");
  assert.equal(q1.presentation, "picture");
  assert.equal(q1.answer_form, "count");
  assert.deepEqual(q1.bilingual, { numeral: "18", zh_word: "十八" });
  assert.equal(q1.distractors?.length, 3);
  assert.equal(bank.profile, "dpk3_2026_core");
});

test("v2 wire: optional table is accepted; bank profile/scope validated", () => {
  const withTable = validV2Bank() as { questions: Array<Record<string, unknown>> };
  withTable.questions[0].table = { 羊: 8 };
  const badBankProfile = validV2Bank();
  badBankProfile.profile = "sjkc_representation"; // always-on layer, not a profile
  assert.throws(() => parseQuestionBankV2Data(badBankProfile), /question bank profile must be one of/);
  const parsed = parseQuestionBankV2Data(withTable);
  assert.deepEqual(parsed.questions[0].table, { 羊: 8 });
});

test("v2 wire: malformed questions fail with labeled diagnostics", () => {
  type Mutation = (bank: ReturnType<typeof validV2Bank>) => void;
  const cases: Array<[string, Mutation, RegExp]> = [
    ["missing format_type", (b) => {
      delete (b.questions as Array<Record<string, unknown>>)[0].format_type;
    }, /question 1\.format_type must be one of/],
    ["missing presentation", (b) => {
      delete (b.questions as Array<Record<string, unknown>>)[0].presentation;
    }, /question 1\.presentation must be one of/],
    ["missing bilingual", (b) => {
      delete (b.questions as Array<Record<string, unknown>>)[0].bilingual;
    }, /question 1\.bilingual must be an object/],
    ["missing distractors", (b) => {
      delete (b.questions as Array<Record<string, unknown>>)[0].distractors;
    }, /question 1\.distractors must contain exactly 3 choices/],
    ["bad topic", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].topic = "5.1";
    }, /question 1\.topic must be one of/],
    ["legacy topic marker is not wire-valid", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].topic = "legacy";
    }, /question 1\.topic must be one of/],
    ["tp out of range", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].tp_level = 7;
    }, /question 1\.tp_level must be in \[1, 6\]/],
    ["unknown profile", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].profile = "ibm_model_1";
    }, /question 1\.profile must be one of/],
    ["sjkc_representation is not a profile", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].profile = "sjkc_representation";
    }, /question 1\.profile must be one of/],
    ["item_format beyond objective", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].item_format = "fill-blank";
    }, /question 1\.item_format must be one of: objective/],
    ["answer_form beyond numeric (lands with #11/#12)", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].answer_form = "circle";
    }, /question 1\.answer_form must be one of: numeral, count, chinese-word/],
    ["bad operation", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].operation = "multiplication";
    }, /question 1\.operation must be one of: counting, addition, subtraction/],
    ["negative answer", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].answer = -1;
    }, /question 1\.answer must be non-negative/],
    ["numeral must be the answer's digits", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].bilingual = { numeral: "018", zh_word: "十八" };
    }, /question 1\.bilingual\.numeral must be the answer's digits \("18"\), got "018"/],
    ["bad distractor strategy", (b) => {
      (b.questions as Array<{ distractors: Array<Record<string, unknown>> }>)[0]
        .distractors[0].strategy = "random-guess";
    }, /question 1\.distractors\[0\]\.strategy must be one of/],
    ["distractor equals answer", (b) => {
      (b.questions as Array<{ distractors: Array<Record<string, unknown>> }>)[0]
        .distractors[0].value = 18;
    }, /question 1 answer and distractors must be unique/],
    ["negative distractor", (b) => {
      (b.questions as Array<{ distractors: Array<Record<string, unknown>> }>)[0]
        .distractors[0].value = -7;
    }, /question 1\.distractors\[0\]\.value must be non-negative/],
    ["wrong distractor count", (b) => {
      (b.questions as Array<{ distractors: Array<Record<string, unknown>> }>)[0]
        .distractors.pop();
    }, /question 1\.distractors must contain exactly 3 choices/],
    ["steps are not a v2 field", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].steps = [];
    }, /question\[0\] has unknown field\(s\): steps/],
    ["unknown question field", (b) => {
      (b.questions as Array<Record<string, unknown>>)[0].exam_mark = 5;
    }, /question\[0\] has unknown field\(s\): exam_mark/],
    ["duplicate id", (b) => {
      (b.questions as Array<Record<string, unknown>>)[1].id = 1;
    }, /duplicate question id 1/],
  ];
  for (const [name, mutate, pattern] of cases) {
    const bank = validV2Bank();
    mutate(bank);
    assert.throws(() => parseQuestionBankV2Data(bank), pattern, name);
  }
});

test("v2 wire: malformed envelopes fail with labeled diagnostics", () => {
  assert.throws(() => parseQuestionBankV2Data(null), /must be an object/);
  assert.throws(
    () => parseQuestionBankV2Data({ ...validV2Bank(), schema_version: 1 }),
    /question bank v2 requires schema_version 2, got 1/,
  );
  assert.throws(
    () => parseQuestionBankV2Data({ ...validV2Bank(), questions: [] }),
    /at least one question/,
  );
  assert.throws(
    () => parseQuestionBankV2Data({ ...validV2Bank(), exam: true }),
    /question bank has unknown field\(s\): exam/,
  );
  assert.throws(
    () => parseQuestionBankV2Data({ ...validV2Bank(), version: 0 }),
    /positive integer version/,
  );
});

// --- version dispatch at the trust boundary -----------------------------------

test("dispatch: v1, v2, and unknown versions route correctly", () => {
  const v1 = parseQuestionBankData(JSON.parse(WOOLLY_SOURCE));
  assert.equal(v1.schema_version, 1);
  assert.ok(!("item_format" in v1.questions[0]), "v1 questions stay v1-shaped");

  const v2 = parseQuestionBankData(validV2Bank());
  assert.equal(v2.schema_version, 2);

  assert.throws(
    () => parseQuestionBankData({ schema_version: 99 }),
    /unsupported question-bank schema version: 99 \(supported: 1, 2\)/,
  );
  assert.throws(
    () => parseQuestionBankData({}),
    /unsupported question-bank schema version: undefined \(supported: 1, 2\)/,
  );
  assert.throws(
    () => parseQuestionBankData({ schema_version: "2" }),
    /unsupported question-bank schema version: 2 \(supported: 1, 2\)/,
  );
  assert.throws(() => parseQuestionBankData(null), /question bank must be an object/);
  assert.throws(() => parseQuestionBankData([1, 2]), /question bank must be an object/);
});

test("dispatch: v1-shaped data labeled v2 fails with v2 diagnostics", () => {
  const mislabeled = { ...structuredClone(WOOLLY_V1), schema_version: 2 };
  assert.throws(() => parseQuestionBankData(mislabeled), /question 1\.item_format must be one of/);
});

// --- curriculum-profile gating -------------------------------------------------

test("servesProfile: core is universal, extra only under its own profile", () => {
  assert.ok(servesProfile("dpk3_2026_core", "dpk3_2026_core"));
  assert.ok(servesProfile("dpk3_2026_core", "original_dskp_extra"));
  assert.ok(!servesProfile("original_dskp_extra", "dpk3_2026_core"));
  assert.ok(servesProfile("original_dskp_extra", "original_dskp_extra"));
});

test("gateQuestionsByProfile: includes core Std-1 material, excludes extras", () => {
  const bank = parseQuestionBankV2Data(validV2Bank());
  const coreOnly = gateQuestionsByProfile(bank.questions, "dpk3_2026_core");
  assert.deepEqual(coreOnly.map((q) => q.id), [1]);
  const withExtras = gateQuestionsByProfile(bank.questions, "original_dskp_extra");
  assert.deepEqual(withExtras.map((q) => q.id), [1, 2]);
});

test("gateQuestionsByProfile: untagged legacy questions default to core", () => {
  const legacy = LEGACY_SAMPLE_V1.questions; // no profile tags
  assert.equal(gateQuestionsByProfile(legacy, "dpk3_2026_core").length, legacy.length);
  assert.equal(gateQuestionsByProfile(legacy, "original_dskp_extra").length, legacy.length);
});

test("gateQuestionsByProfile: unknown profiles fail loudly", () => {
  const badItem = [{ id: 1, profile: "ibm_model_1" }];
  assert.throws(
    () => gateQuestionsByProfile(badItem, "dpk3_2026_core"),
    /unknown curriculum profile "ibm_model_1"/,
  );
  const items = [{ id: 1, profile: "dpk3_2026_core" }];
  assert.throws(
    () => gateQuestionsByProfile(items, "ibm_model_1" as never),
    /active curriculum profile must be one of/,
  );
});

// --- verifier: bilingual content checks ---------------------------------------

test("verifyQuestion: adapted bilingual values verify clean", () => {
  const adapted = adaptV1Question(WOOLLY_V1.questions[0]);
  assert.deepEqual(verifyQuestion(adapted), []);
});

test("verifyQuestion: bilingual mismatches are findings, not trust-boundary failures", () => {
  const base = adaptV1Question(WOOLLY_V1.questions[0]);
  const badNumeral: QuestionV2 = {
    ...base,
    bilingual: { numeral: "9", zh_word: "八" },
  };
  const numeralFindings = verifyQuestion(badNumeral);
  assert.ok(
    numeralFindings.some(
      (f) => f.severity === "error" && f.code === "bilingual-numeral-mismatch",
    ),
    JSON.stringify(numeralFindings),
  );

  const badZhWord: QuestionV2 = { ...base, bilingual: { numeral: "8", zh_word: "九" } };
  const zhFindings = verifyQuestion(badZhWord);
  assert.ok(
    zhFindings.some(
      (f) =>
        f.severity === "warn" &&
        f.code === "bilingual-zh-word-mismatch" &&
        f.message.includes("八"),
    ),
    JSON.stringify(zhFindings),
  );
});

// --- executable JSON Schema -----------------------------------------------------

test("v2 JSON Schema: valid bank validates; weakened variants do not", () => {
  assert.equal(validateV2Schema(validV2Bank()), true, ajv.errorsText(validateV2Schema.errors));

  const noDistractors = validV2Bank();
  delete (noDistractors.questions as Array<Record<string, unknown>>)[0].distractors;
  assert.equal(validateV2Schema(noDistractors), false, "v2 requires authored distractors");

  const typoFormat = validV2Bank();
  (typoFormat.questions as Array<Record<string, unknown>>)[0].format_type = "count_write";
  assert.equal(validateV2Schema(typoFormat), false, "enum typos rejected");

  // v1 data must NOT pass the v2 schema — v2 strengthens, never weakens
  assert.equal(validateV2Schema(JSON.parse(WOOLLY_SOURCE)), false);
});

// --- the documentation examples are executable ----------------------------------

test("schema-v2.md examples: valid parses and validates, invalid throw as documented", async () => {
  const docUrl = new URL("../../docs/question-banks/schema-v2.md", import.meta.url);
  const doc = await readFile(docUrl, "utf8");
  const exampleRe = /<!-- example: (valid|invalid)(?::\s*\/([^/]+)\/)?\s*-->\s*```json\r?\n([\s\S]*?)```/g;
  const seen = { valid: 0, invalid: 0 };
  for (const match of doc.matchAll(exampleRe)) {
    const [, kind, pattern, json] = match;
    const raw = JSON.parse(json);
    if (kind === "valid") {
      seen.valid++;
      const parsed = parseQuestionBankData(raw);
      assert.equal(parsed.schema_version, 2);
      assert.equal(validateV2Schema(raw), true, ajv.errorsText(validateV2Schema.errors));
    } else {
      seen.invalid++;
      assert.ok(pattern, "invalid examples must document the expected error");
      assert.throws(() => parseQuestionBankData(raw), new RegExp(pattern), `doc example: ${pattern}`);
      assert.equal(validateV2Schema(raw), false, `doc example should fail the v2 schema: ${pattern}`);
    }
  }
  assert.ok(seen.valid >= 1, "doc must carry at least one valid example");
  assert.ok(seen.invalid >= 4, "doc must carry the malformed-value examples");
});

test("schema-v2.md valid example gates as documented", async () => {
  const docUrl = new URL("../../docs/question-banks/schema-v2.md", import.meta.url);
  const doc = await readFile(docUrl, "utf8");
  const exampleRe = /<!-- example: valid -->\s*```json\r?\n([\s\S]*?)```/;
  const raw = JSON.parse(exampleRe.exec(doc)![1]);
  const parsed = parseQuestionBankData(raw);
  assert.equal(parsed.schema_version, 2);
  const core = gateQuestionsByProfile(parsed.questions, "dpk3_2026_core");
  assert.deepEqual(core.map((q) => q.id), [1], "core profile excludes the extra item");
  const extra = gateQuestionsByProfile(parsed.questions, "original_dskp_extra");
  assert.deepEqual(extra.map((q) => q.id), [1, 2], "extra profile serves core + extra");
});

// --- v2 banks serve through the stock engine --------------------------------------

test("v2 bank: serves authored choices through QuestionBank like a v1 bank", () => {
  const bank = parseQuestionBankData(validV2Bank());
  const runtime = new QuestionBank(bank, () => 0);
  const q = runtime.pick();
  const round = new QuestionRound(turnsOf(q)[0], () => 0);
  assert.equal(round.choices.length, 4);
  assert.ok(round.choices.includes(q.answer));
  assert.equal(round.choices.filter((c) => round.judge(c)).length, 1, "exactly one correct");
  assert.equal(formatAnswer(q.answer, q.answer_unit), String(q.answer));
});
