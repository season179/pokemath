#!/usr/bin/env node
// Offline question-batch generator (M4, #15): produces immutable candidate
// batches for one curriculum slice (grade / topic / TP band / profile) with
// full provenance. Generation NEVER runs during a child's battle — this is a
// dev tool, not imported by the game or the worker, and battles only ever
// see banks that survived the gate (#14), human review, and manifest
// approval (#13).
//
// The generator is procedural and seeded: the same parameters and seed
// reproduce the batch byte-for-byte, so the gate's verdict, the human
// review sample, and the import record all correlate to exact content.
// It is deliberately a *volume scaffolding* tool — it exercises the
// validate → review → import pipeline with correct, in-scope, bilingual
// items drawn from the style doc's authentic format menu (§A/§C). Richer
// wording variety can later arrive from an LLM front-end that emits the
// same candidate format; the gate treats both identically.
//
// Usage:
//   node tools/generate-question-batch.mjs \
//     --bank std1.sample-money --topic 4.3 --tp 2-3 \
//     --profile dpk3_2026_core --count 20 --seed 43
//   node tools/generate-question-batch.mjs ... --allow-routed-slice
//
// Outputs (never overwritten — pick a new seed for a new batch):
//   question-batches/candidates/<batch-id>.candidate.json    schema-v2 bank
//   question-batches/candidates/<batch-id>.provenance.json   generation record
//
// Slice precheck (#76): refuses to write a batch whose grade/topic/TP-band/
// profile already has a live route in the active manifest — those batches
// can never be activated without --replace at import. Pass
// --allow-routed-slice to override (merge into the same bank_id, or a
// deliberate replace candidate).
//
// Next steps: npm run validate:questions -- <candidate> (gate), then
// npm run review:question-batch -- <candidate> (sampling + review doc), then
// npm run import:questions -- <candidate> --decisions <file> [--replace] (import).

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CURRICULUM_PROFILES } from "../shared/curriculum.ts";
import {
  parseActiveManifestPointer,
  parseQuestionBankManifest,
  routesOverlap,
} from "../shared/question-bank-manifest.ts";
import { chineseNumeral } from "../shared/question-v2.ts";

// Version 3 (M5): #18 added figure-carrying templates (objects/coins) and
// the 4.2/4.3 exchange + repeated-addition forms; #17 adds the ten-frame
// figure templates to topic 4.1, and the sampler tries each eligible
// template first once before the shuffled deck, so arc-sized batches always
// cover the topic's full format menu. Earlier provenance stays reproducible
// from git history, never by editing a shipped candidate.
export const GENERATOR_VERSION = 3;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_RESOURCES_DIR = join(root, "game", "assets", "resources");
export const DEFAULT_CANDIDATES_DIR = join(root, "question-batches", "candidates");

// --- seeded PRNG (mulberry32): all randomness flows from the one seed ---

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng, min, max) {
  // inclusive both ends
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// --- distractor machinery -------------------------------------------------
// Authored distractors must be valid MCQ options (non-negative integers
// inside the scope cap, unique, never the answer) AND honestly labelled with
// a §D strategy. Each template offers strategy candidates in preference
// order; invalid ones drop out and the off-by-one fallback chain tops the
// set up to 3. The fallback label stays honest: a plain near-miss is an
// off-by-one-count error.

const NUMERIC_DISTRACTORS = 3;

export function buildDistractors(rng, answer, scopeMax, candidates) {
  const seen = new Set([answer]);
  const out = [];
  const accept = (value, strategy) => {
    if (out.length >= NUMERIC_DISTRACTORS) return;
    if (!Number.isInteger(value) || value < 0 || value > scopeMax || seen.has(value)) return;
    seen.add(value);
    out.push({ value, strategy });
  };
  for (const c of candidates) accept(c.value, c.strategy);
  for (const delta of shuffle(rng, [1, -1, 2, -2, 3, -3, 10, -10])) {
    accept(answer + delta, "off-by-one-count");
  }
  if (out.length < NUMERIC_DISTRACTORS) {
    throw new Error(`cannot build ${NUMERIC_DISTRACTORS} distractors for answer ${answer} (scope ${scopeMax})`);
  }
  return out;
}

function digitReversal(n) {
  if (n < 10 || n > 99) return null;
  return (n % 10) * 10 + Math.floor(n / 10);
}

function bilingual(answer) {
  return { numeral: String(answer), zh_word: chineseNumeral(answer) };
}

// --- curated bilingual content pools --------------------------------------
// Wording follows the authentic exemplars transcribed in the style doc §C.
// Every pool entry is hand-written; the generator only does slot-filling.

// Emoji counting scenes (topic 4.1). measure = the Chinese measure word.
const COUNT_SCENES = [
  { emoji: "🐑", noun_zh: "羊", measure: "只", place_zh: "羊圈里", noun_en: "sheep", plural_en: "sheep", place_en: "in the pen" },
  { emoji: "🍎", noun_zh: "苹果", measure: "个", place_zh: "树下", noun_en: "apple", plural_en: "apples", place_en: "under the tree" },
  { emoji: "🦋", noun_zh: "蝴蝶", measure: "只", place_zh: "花园里", noun_en: "butterfly", plural_en: "butterflies", place_en: "in the garden" },
  { emoji: "🦆", noun_zh: "鸭子", measure: "只", place_zh: "池塘里", noun_en: "duck", plural_en: "ducks", place_en: "in the pond" },
  { emoji: "🌸", noun_zh: "花", measure: "朵", place_zh: "花盆里", noun_en: "flower", plural_en: "flowers", place_en: "in the flowerpot" },
  { emoji: "🐟", noun_zh: "鱼", measure: "条", place_zh: "鱼缸里", noun_en: "fish", plural_en: "fish", place_en: "in the tank" },
  { emoji: "🐔", noun_zh: "鸡", measure: "只", place_zh: "院子里", noun_en: "chicken", plural_en: "chickens", place_en: "in the yard" },
  { emoji: "🥕", noun_zh: "胡萝卜", measure: "根", place_zh: "篮子里", noun_en: "carrot", plural_en: "carrots", place_en: "in the basket" },
  { emoji: "🍓", noun_zh: "草莓", measure: "颗", place_zh: "盘子里", noun_en: "strawberry", plural_en: "strawberries", place_en: "on the plate" },
  { emoji: "🎈", noun_zh: "气球", measure: "个", place_zh: "小明手里", noun_en: "balloon", plural_en: "balloons", place_en: "in Xiaoming's hand" },
  { emoji: "⭐", noun_zh: "星星", measure: "颗", place_zh: "夜空中", noun_en: "star", plural_en: "stars", place_en: "in the night sky" },
  { emoji: "🐦", noun_zh: "小鸟", measure: "只", place_zh: "树上", noun_en: "bird", plural_en: "birds", place_en: "in the tree" },
];

// Word-problem props (topic 4.2). giver_zh pairs with 又买了/又给了 frames;
// verb_zh/verb_en is the subtraction action, matched to the object so a
// story never eats the stationery (#18).
const STORY_OBJECTS = [
  { noun_zh: "故事书", measure: "本", noun_en: "storybook", plural_en: "storybooks", verb_zh: "送出", verb_en: "gave away" },
  { noun_zh: "贴纸", measure: "张", noun_en: "sticker", plural_en: "stickers", verb_zh: "送出", verb_en: "gave away" },
  { noun_zh: "弹珠", measure: "颗", noun_en: "marble", plural_en: "marbles", verb_zh: "送出", verb_en: "gave away" },
  { noun_zh: "饼干", measure: "块", noun_en: "cookie", plural_en: "cookies", verb_zh: "吃了", verb_en: "ate" },
  { noun_zh: "铅笔", measure: "支", noun_en: "pencil", plural_en: "pencils", verb_zh: "送出", verb_en: "gave away" },
  { noun_zh: "鸡蛋", measure: "个", noun_en: "egg", plural_en: "eggs", verb_zh: "吃了", verb_en: "ate" },
  { noun_zh: "苹果", measure: "个", noun_en: "apple", plural_en: "apples", verb_zh: "吃了", verb_en: "ate" },
  { noun_zh: "糖果", measure: "颗", noun_en: "candy", plural_en: "candies", verb_zh: "吃了", verb_en: "ate" },
];
const STORY_NAMES = [
  { zh: "美美", en: "Meimei" },
  { zh: "妮妮", en: "Nini" },
  { zh: "小明", en: "Xiaoming" },
  { zh: "嘉嘉", en: "Jiajia" },
  { zh: "小华", en: "Xiaohua" },
];

// Daily-event / calendar sequences for forward ordering (topic 4.4).
const FORWARD_EVENTS = [
  {
    scenario_zh: "小明的早晨", scenario_en: "Xiaoming's morning",
    steps: [
      { label_zh: "起床", label_en: "wake up" },
      { label_zh: "刷牙", label_en: "brush teeth" },
      { label_zh: "吃早餐", label_en: "eat breakfast" },
      { label_zh: "上学", label_en: "go to school" },
    ],
  },
  {
    scenario_zh: "一天的学习", scenario_en: "a school day",
    steps: [
      { label_zh: "上学", label_en: "go to school" },
      { label_zh: "吃午饭", label_en: "eat lunch" },
      { label_zh: "放学", label_en: "school ends" },
      { label_zh: "吃晚饭", label_en: "eat dinner" },
    ],
  },
  {
    scenario_zh: "一天的不同时段", scenario_en: "parts of a day",
    steps: [
      { label_zh: "清晨", label_en: "early morning" },
      { label_zh: "上午", label_en: "morning" },
      { label_zh: "下午", label_en: "afternoon" },
      { label_zh: "晚上", label_en: "evening" },
    ],
  },
  {
    scenario_zh: "连续三天", scenario_en: "three days in a row",
    steps: [
      { label_zh: "昨天", label_en: "yesterday" },
      { label_zh: "今天", label_en: "today" },
      { label_zh: "明天", label_en: "tomorrow" },
    ],
  },
  {
    scenario_zh: "一周的前三天", scenario_en: "the first three days of the week",
    steps: [
      { label_zh: "星期一", label_en: "Monday" },
      { label_zh: "星期二", label_en: "Tuesday" },
      { label_zh: "星期三", label_en: "Wednesday" },
    ],
  },
  {
    scenario_zh: "春天的三个月", scenario_en: "the spring months",
    steps: [
      { label_zh: "三月", label_en: "March" },
      { label_zh: "四月", label_en: "April" },
      { label_zh: "五月", label_en: "May" },
    ],
  },
];

// Money denominations (topic 4.3): coins in sen, notes in ringgit.
const SEN_COINS = [5, 10, 20, 50];
const RM_NOTES = [1, 5, 10];

// Clock faces (topic 4.4): Standard 1 reads whole / half / quarter /
// three-quarter hours only (scope doc §4.4), so the minute hand can only
// rest on 12, 3, 6, or 9. `hand` is the numeral the minute hand points to.
const CLOCK_MINUTE_SPECS = [
  {
    minute: 0,
    hand: 12,
    ask_zh: "钟面上是几时？",
    ask_en: "What o'clock is it?",
    time_zh: (h) => `${h}时`,
    time_en: (h) => `${h} o'clock`,
  },
  {
    minute: 15,
    hand: 3,
    ask_zh: "钟面上是几时一刻？",
    ask_en: "It is quarter past which hour?",
    time_zh: (h) => `${h}时一刻`,
    time_en: (h) => `quarter past ${h}`,
  },
  {
    minute: 30,
    hand: 6,
    ask_zh: "钟面上是几时半？",
    ask_en: "It is half past which hour?",
    time_zh: (h) => `${h}时半`,
    time_en: (h) => `half past ${h}`,
  },
  {
    minute: 45,
    hand: 9,
    ask_zh: "钟面上是几时三刻？",
    ask_en: "It is three quarters past which hour?",
    time_zh: (h) => `${h}时三刻`,
    time_en: (h) => `three quarters past ${h}`,
  },
];

// Day (星期) and month names for calendar naming items (topic 4.4).
const WEEKDAYS = [
  { zh: "星期一", en: "Monday" },
  { zh: "星期二", en: "Tuesday" },
  { zh: "星期三", en: "Wednesday" },
  { zh: "星期四", en: "Thursday" },
  { zh: "星期五", en: "Friday" },
  { zh: "星期六", en: "Saturday" },
  { zh: "星期日", en: "Sunday" },
];
const MONTH_ZH = (n) => `${n}月`;
const MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Hour-numeral distractors: candidates first (honest strategy labels),
 * then any remaining clock numeral as a plain near-miss. Clock answers and
 * options live on the 1..12 dial — never 0, never 13+. */
function clockDistractors(answer, candidates) {
  const seen = new Set([answer]);
  const out = [];
  const accept = (value, strategy) => {
    if (out.length >= NUMERIC_DISTRACTORS) return;
    if (!Number.isInteger(value) || value < 1 || value > 12 || seen.has(value)) return;
    seen.add(value);
    out.push({ value, strategy });
  };
  for (const c of candidates) accept(c.value, c.strategy);
  for (let step = 1; out.length < NUMERIC_DISTRACTORS && step <= 11; step++) {
    accept(((answer - 1 + step) % 12) + 1, "off-by-one-count");
  }
  return out;
}

/** The hour numeral after `h` on the dial (12 wraps to 1). */
function nextHour(h, step = 1) {
  return ((h - 1 + step) % 12) + 1;
}

// --- arithmetic range policy by TP ----------------------------------------
// Style doc §C.2: facts within 20, results ≤ 100. TP1 stays within 10,
// TP2 within 20 (no carry/borrow), TP3 within 100 without carry/borrow,
// TP4 allows carry/borrow. Money caps are separate (RM ≤ 10, sen ≤ 100).

function arithmeticPair(rng, tp, operation, scopeMax = 100, step = 1) {
  const cap = Math.min(scopeMax, tp <= 1 ? 10 : tp === 2 ? 20 : 100);
  const capU = Math.floor(cap / step); // sample in units of `step` (sen = coin multiples)
  for (let attempt = 0; attempt < 200; attempt++) {
    let a;
    let b;
    if (operation === "addition") {
      a = step * int(rng, 1, capU - 1);
      b = step * int(rng, 1, capU - a / step);
    } else {
      a = step * int(rng, 2, capU);
      b = step * int(rng, 1, a / step - 1);
    }
    // Carry/borrow bans start at TP2: within-10 facts (TP1) include the
    // make-ten bonds (7+3, 10−5) — those are anchors, not carries.
    if (operation === "addition" && tp >= 2 && tp <= 3 && (a % 10) + (b % 10) >= 10) continue; // no carry yet
    if (operation === "subtraction" && tp >= 2 && tp <= 3 && (a % 10) < (b % 10)) continue; // no borrow yet
    return { a, b };
  }
  throw new Error(`no arithmetic pair for TP${tp} ${operation} within ${cap} (step ${step})`);
}

/** Display form for an amount: RM7 / 40 sen / 7 (Chinese and English agree). */
function moneyText(n, unit) {
  if (unit === "RM") return `RM${n}`;
  if (unit === "sen") return `${n} sen`;
  return String(n);
}

// --- item templates ---------------------------------------------------------
// Each template serves a (topic, TP-band) window and emits one v2 question
// (minus id/topic/profile, which the batch assembler stamps). `make` receives
// the seeded rng and the item's tp_level.

function makeCountItem(rng, tp, form) {
  const scene = pick(rng, COUNT_SCENES);
  const n = int(rng, ...(tp <= 1 ? [3, 10] : [6, 20]));
  const row = scene.emoji.repeat(n);
  const circle = form === "circle";
  const question_zh = circle
    ? `圈出正确的答案：${row} 共有几${scene.measure}${scene.noun_zh}？`
    : `数一数，${scene.place_zh}共有几${scene.measure}${scene.noun_zh}？\n${row}`;
  const question_en = circle
    ? `Circle the correct answer: how many ${scene.plural_en} are there?`
    : `Count the ${scene.plural_en} ${scene.place_en}. How many are there?`;
  const candidates = [
    { value: n - 1, strategy: "off-by-one-count" },
    { value: n + 1, strategy: "off-by-one-count" },
    { value: digitReversal(n) ?? n + 2, strategy: digitReversal(n) === null ? "off-by-one-count" : "digit-reversal" },
  ];
  return {
    format_type: circle ? "count-circle" : "count-write",
    presentation: "picture",
    answer_form: form,
    answer_unit: "none",
    operation: "counting",
    expression: String(n),
    answer: n,
    question_zh,
    question_en,
    distractors: buildDistractors(rng, n, 100, candidates),
  };
}

function makeCompareTruthItem(rng, tp) {
  const cap = tp <= 2 ? 20 : 100;
  const a = int(rng, 1, cap);
  const b = int(rng, 1, cap);
  const cmp = pick(rng, [">", "<", "="]);
  const zh =
    cmp === ">" ? `${a} 比 ${b} 大` : cmp === "<" ? `${a} 比 ${b} 小` : `${a} 和 ${b} 一样多`;
  const en =
    cmp === ">" ? `${a} is greater than ${b}` : cmp === "<" ? `${a} is less than ${b}` : `${a} is equal to ${b}`;
  const truth = cmp === ">" ? a > b : cmp === "<" ? a < b : a === b;
  const answer = truth ? 1 : 0;
  return {
    format_type: "compare",
    presentation: "plain",
    answer_form: "true-false",
    answer_unit: "none",
    operation: "counting",
    expression: `${a} ${cmp} ${b}`,
    answer,
    question_zh: `对的画 ✓，错的画 ✗：${zh}`,
    question_en: `Mark ✓ for true and ✗ for false: ${en}`,
    distractors: [{ value: truth ? 0 : 1, strategy: "more-fewer-flip" }],
  };
}

function makeNumericOrderingItem(rng, tp) {
  const cap = tp <= 2 ? 20 : 100;
  const count = int(rng, 3, 5);
  const values = new Set();
  while (values.size < count) values.add(int(rng, 1, cap));
  const direction = pick(rng, ["ascending", "descending"]);
  const ordered = [...values].sort((x, y) => (direction === "ascending" ? x - y : y - x));
  let scrambled = shuffle(rng, ordered);
  while (scrambled.every((v, i) => v === ordered[i])) scrambled = shuffle(rng, ordered);
  const joinZh = scrambled.join("、");
  const joinEn = scrambled.join(", ");
  const chain = ordered.join(direction === "ascending" ? " < " : " > ");
  return {
    format_type: "order-sequence",
    presentation: "plain",
    answer_form: "ordering",
    answer_unit: "none",
    operation: "counting",
    expression: chain,
    answer: ordered[0],
    question_zh:
      direction === "ascending"
        ? `从小到大排列：${joinZh}`
        : `从大到小排列：${joinZh}`,
    question_en:
      direction === "ascending"
        ? `Arrange from smallest to largest: ${joinEn}`
        : `Arrange from largest to smallest: ${joinEn}`,
    distractors: [],
    sequence: { direction, items: ordered.map((value) => ({ value })) },
  };
}

const SKIP_STEPS_CORE = [
  { step: 1, zh: "一个一个地数", en: "Count on by ones" },
  { step: 2, zh: "两个两个地数", en: "Count in twos" },
  { step: 5, zh: "五个五个地数", en: "Count in fives" },
  { step: 10, zh: "十个十个地数", en: "Count in tens" },
];
const SKIP_STEPS_EXTRA = [
  { step: 3, zh: "三个三个地数", en: "Count in threes" },
  { step: 4, zh: "四个四个地数", en: "Count in fours" },
];

function makePatternItem(rng, tp, steps) {
  const { step, zh, en } = pick(rng, steps);
  const backward = tp >= 2 && rng() < 0.35;
  const shown = 3;
  const start = backward
    ? int(rng, shown * step + step, 100)
    : int(rng, step, 100 - shown * step);
  const terms = Array.from({ length: shown }, (_, i) =>
    backward ? start - step * (i + 1) : start + step * i,
  );
  const last = terms[terms.length - 1];
  const answer = backward ? last - step : last + step;
  const expression = backward ? `${last} - ${step}` : `${last} + ${step}`;
  const seq = terms.join("、");
  const question_zh = backward
    ? `倒着数，${zh}：${seq}、___`
    : `${zh}：${seq}、___`;
  const question_en = backward
    ? `${en} backward: ${terms.join(", ")}, ___`
    : `${en}: ${terms.join(", ")}, ___`;
  const nextSlot = backward ? answer - step : answer + step;
  return {
    format_type: "pattern-continue",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: backward ? "subtraction" : "addition",
    expression,
    answer,
    question_zh,
    question_en,
    distractors: buildDistractors(rng, answer, 100, [
      { value: nextSlot, strategy: "next-vs-between" },
      { value: last, strategy: "raw-operand" },
      { value: answer + (backward ? step : -step), strategy: "next-vs-between" },
    ]),
  };
}

function makeChineseWordItem(rng, tp) {
  const n = tp <= 2 ? int(rng, 4, 20) : int(rng, 21, 100);
  const tensValue = Math.floor(n / 10) * 10;
  return {
    format_type: "fill-blank",
    presentation: "plain",
    answer_form: "chinese-word",
    answer_unit: "none",
    operation: "counting",
    expression: String(n),
    answer: n,
    question_zh: `「${n}」写成文字是哪一个？`,
    question_en: `Which is ${n} written in Chinese words?`,
    distractors: buildDistractors(rng, n, 100, [
      { value: digitReversal(n) ?? n + 1, strategy: digitReversal(n) === null ? "off-by-one-count" : "digit-reversal" },
      { value: tensValue === n ? n % 10 : tensValue, strategy: "place-value-slip" },
      { value: n - 1, strategy: "off-by-one-count" },
    ]),
  };
}

// Ten-frame items (#17): the Woolly pen is a walkable 十格框, so these
// carry the declarative figure spec (#16) the FigureView renders — the child
// sees the frame, not just prose. Counting the counters is 4.1 count-write;
// reading the gaps is the within-10 number bond the pen arc anchors (scope
// doc §4.1: number bonds start within 10).
function makeTenFrameCountItem(rng, tp) {
  // TP1–2 fills a single frame; TP3+ reads the double ten-frame (teens).
  const filled = int(rng, ...(tp <= 2 ? [3, 10] : [11, 20]));
  return {
    format_type: "count-write",
    presentation: "figure:ten-frame",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(filled),
    answer: filled,
    figure: { kind: "ten-frame", filled },
    question_zh: `数一数，十格框里有几个圆点？`,
    question_en: `Count the counters in the ten-frame. How many are there?`,
    distractors: buildDistractors(rng, filled, 100, [
      { value: filled - 1, strategy: "off-by-one-count" },
      { value: filled + 1, strategy: "off-by-one-count" },
      { value: digitReversal(filled) ?? filled + 2, strategy: digitReversal(filled) === null ? "off-by-one-count" : "digit-reversal" },
    ]),
  };
}

function makeTenFrameBondItem(rng) {
  const filled = int(rng, 2, 9);
  const answer = 10 - filled;
  return {
    format_type: "number-bond",
    presentation: "figure:ten-frame",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "subtraction",
    // The completed bond written so the gate can re-derive the missing part
    // (10 − filled = answer), matching the 4.2 split-form convention.
    expression: `10 - ${filled}`,
    answer,
    figure: { kind: "ten-frame", filled },
    question_zh: `十格框里有 ${filled} 个圆点，再画几个就满 10 个？`,
    question_en: `The ten-frame shows ${filled} counters. How many more make 10?`,
    distractors: buildDistractors(rng, answer, 10, [
      // Counting the shown counters instead of the empty gaps.
      { value: filled, strategy: "raw-operand" },
      { value: answer + 1, strategy: "off-by-one-count" },
      { value: answer - 1, strategy: "off-by-one-count" },
    ]),
  };
}

function makeComputeItem(rng, tp, scopeMax = 100, unit = "none") {
  const operation = pick(rng, ["addition", "subtraction"]);
  const { a, b } = arithmeticPair(rng, tp, operation, scopeMax, unit === "sen" ? 5 : 1);
  const sign = operation === "addition" ? "+" : "-";
  const answer = operation === "addition" ? a + b : a - b;
  const flipped = operation === "addition" ? a - b : a + b;
  const text = `${moneyText(a, unit)} ${sign} ${moneyText(b, unit)}`;
  return {
    format_type: "fill-blank",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: unit,
    operation,
    expression: `${a} ${sign} ${b}`,
    answer,
    question_zh: `算一算：${text} = ___`,
    question_en: `Calculate: ${text} = ___`,
    distractors: buildDistractors(rng, answer, scopeMax, [
      { value: flipped, strategy: "wrong-operation" },
      { value: answer + 10, strategy: "place-value-slip" },
      { value: answer - 10, strategy: "place-value-slip" },
    ]),
  };
}

function makeWordProblemItem(rng, tp, scopeMax = 100, unit = "none") {
  const operation = pick(rng, ["addition", "subtraction"]);
  const { a, b } = arithmeticPair(rng, tp, operation, scopeMax, unit === "sen" ? 5 : 1);
  const obj = pick(rng, STORY_OBJECTS);
  const name = pick(rng, STORY_NAMES);
  const answer = operation === "addition" ? a + b : a - b;
  const flipped = operation === "addition" ? a - b : a + b;
  const sign = operation === "addition" ? "+" : "-";
  const m = obj.measure;
  let question_zh;
  let question_en;
  if (unit === "RM" || unit === "sen") {
    const ta = moneyText(a, unit);
    const tb = moneyText(b, unit);
    question_zh =
      operation === "addition"
        ? `${name.zh}有 ${ta}，妈妈又给了 ${tb}，现在共有多少钱？`
        : `${name.zh}有 ${ta}，买文具用了 ${tb}，现在还有多少钱？`;
    question_en =
      operation === "addition"
        ? `${name.en} had ${ta}. Mother gave ${tb} more. How much money does ${name.en} have now?`
        : `${name.en} had ${ta} and spent ${tb} on stationery. How much money is left?`;
  } else if (operation === "addition") {
    question_zh = `${name.zh}有 ${a} ${m}${obj.noun_zh}，妈妈又买了 ${b} ${m}，现在共有几${m}${obj.noun_zh}？`;
    question_en = `${name.en} had ${a} ${obj.plural_en}. Mother bought ${b} more. How many ${obj.plural_en} does ${name.en} have now?`;
  } else {
    question_zh = `${name.zh}有 ${a} ${m}${obj.noun_zh}，${obj.verb_zh} ${b} ${m}，还剩几${m}${obj.noun_zh}？`;
    question_en = `${name.en} had ${a} ${obj.plural_en} and ${obj.verb_en} ${b}. How many ${obj.plural_en} are left?`;
  }
  return {
    format_type: "word-single",
    presentation: "story",
    answer_form: "numeral",
    answer_unit: unit,
    operation,
    expression: `${a} ${sign} ${b}`,
    answer,
    question_zh,
    question_en,
    distractors: buildDistractors(rng, answer, scopeMax, [
      { value: flipped, strategy: "wrong-operation" },
      { value: b, strategy: "raw-operand" },
      { value: a, strategy: "raw-operand" },
    ]),
  };
}

function makeNumberBondItem(rng, tp) {
  if (rng() < 0.5) {
    const { a, b } = arithmeticPair(rng, tp, "addition");
    const answer = a + b;
    return {
      format_type: "number-bond",
      presentation: "plain",
      answer_form: "numeral",
      answer_unit: "none",
      operation: "addition",
      expression: `${a} + ${b}`,
      answer,
      question_zh: `${a} 和 ${b} 合起来是多少？`,
      question_en: `What do ${a} and ${b} make together?`,
      distractors: buildDistractors(rng, answer, 100, [
        { value: a, strategy: "count-all-vs-add" },
        { value: b, strategy: "count-all-vs-add" },
        { value: answer + 1, strategy: "off-by-one-count" },
      ]),
    };
  }
  const { a: whole, b: part } = arithmeticPair(rng, tp, "subtraction");
  const answer = whole - part;
  return {
    format_type: "number-bond",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "subtraction",
    expression: `${whole} - ${part}`,
    answer,
    question_zh: `${whole} 可以分成 ${part} 和 ___`,
    question_en: `${whole} can be split into ${part} and ___`,
    distractors: buildDistractors(rng, answer, 100, [
      { value: whole + part, strategy: "wrong-operation" },
      { value: part, strategy: "raw-operand" },
      { value: answer - 1, strategy: "off-by-one-count" },
    ]),
  };
}

function makeEquationTruthItem(rng, tp) {
  const operation = pick(rng, ["addition", "subtraction"]);
  const { a, b } = arithmeticPair(rng, tp, operation);
  const sign = operation === "addition" ? "+" : "-";
  const value = operation === "addition" ? a + b : a - b;
  // Build the right-hand side: honest half the time, a believable
  // miscomputation otherwise (operator flip, then off-by-one).
  const mode = pick(rng, ["true", "flip", "off-by-one"]);
  let right = value;
  if (mode === "flip") {
    const flipped = operation === "addition" ? a - b : a + b;
    if (flipped >= 0 && flipped <= 100 && flipped !== value) right = flipped;
  } else if (mode === "off-by-one") {
    right = value + pick(rng, [1, -1, 2, -2]);
    if (right < 0 || right > 100) right = value;
  }
  const answer = right === value ? 1 : 0;
  const wrongStrategy = mode === "flip" ? "wrong-operation" : "off-by-one-count";
  return {
    format_type: "true-false",
    presentation: "plain",
    answer_form: "true-false",
    answer_unit: "none",
    operation,
    expression: `${a} ${sign} ${b} = ${right}`,
    answer,
    question_zh: `算一算，对的画 ✓，错的画 ✗：${a} ${sign} ${b} = ${right}`,
    question_en: `Calculate and mark ✓ for true and ✗ for false: ${a} ${sign} ${b} = ${right}`,
    distractors: [{ value: answer === 1 ? 0 : 1, strategy: wrongStrategy }],
  };
}

/** Draw a coin pile whose total stays within the sen cap (RM1, scope §4.3). */
function drawCoins(rng, tp) {
  const count = tp <= 2 ? 2 : pick(rng, [2, 3]);
  let coins = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    coins = Array.from({ length: count }, () => pick(rng, SEN_COINS));
    if (coins.reduce((x, y) => x + y, 0) <= 100) break; // sen cap (RM1)
  }
  const sum = coins.reduce((x, y) => x + y, 0);
  if (sum > 100) throw new Error("no coin set within the sen cap");
  return { coins, sum };
}

function makeCoinTotalItem(rng, tp) {
  const { coins, sum } = drawCoins(rng, tp);
  const name = pick(rng, STORY_NAMES);
  const listZh = coins.map((c) => `一枚 ${c} sen`).join(" 和 ");
  const listEn = coins.map((c) => `a ${c}-sen coin`).join(" and ");
  return {
    format_type: "count-write",
    presentation: "story",
    answer_form: "numeral",
    answer_unit: "sen",
    operation: "addition",
    expression: coins.join(" + "),
    answer: sum,
    question_zh: `${name.zh}存了${listZh}，一共存了多少钱？`,
    question_en: `${name.en} saved ${listEn}. How much did ${name.en} save in total?`,
    distractors: buildDistractors(rng, sum, 100, [
      { value: sum - (coins[0] === 50 ? 40 : 0), strategy: "money-denom-miscount" },
      { value: sum - 5, strategy: "money-denom-miscount" },
      { value: coins[0], strategy: "raw-operand" },
    ]),
  };
}

/**
 * Read a clock face (topic 4.4): the figure shows one of the four supported
 * times and the child names the hour. The `clock-hand-swap` distractor is
 * the numeral the MINUTE hand points to (reading the wrong hand); the
 * next-hour distractor probes the travelling hour hand (at 3:45 the hand
 * sits nearest 4).
 */
function makeClockReadItem(rng, tp, spec) {
  const hour = int(rng, 1, 12);
  return {
    format_type: "read-instrument",
    presentation: "figure:clock",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(hour),
    answer: hour,
    question_zh: spec.ask_zh,
    question_en: spec.ask_en,
    figure: { kind: "clock", hour, minute: spec.minute },
    distractors: clockDistractors(hour, [
      { value: spec.hand, strategy: "clock-hand-swap" },
      { value: nextHour(hour), strategy: "next-vs-between" },
      { value: nextHour(hour, 11), strategy: "off-by-one-count" },
    ]),
  };
}

/**
 * Identify the hands (topic 4.4): name the numeral a hand points to. The
 * minute-hand variant works at any supported time; the hour-hand variant
 * stays at whole hours, where the hour hand points exactly at a numeral.
 */
function makeClockHandsItem(rng) {
  if (rng() < 0.5) {
    const spec = pick(rng, CLOCK_MINUTE_SPECS);
    const hour = int(rng, 1, 12);
    return {
      format_type: "read-instrument",
      presentation: "figure:clock",
      answer_form: "numeral",
      answer_unit: "none",
      operation: "counting",
      expression: String(spec.hand),
      answer: spec.hand,
      question_zh: "钟面上，分针指着哪个数字？",
      question_en: "Which numeral does the minute hand point to?",
      figure: { kind: "clock", hour, minute: spec.minute },
      distractors: clockDistractors(spec.hand, [
        { value: hour, strategy: "clock-hand-swap" },
        { value: nextHour(spec.hand, 3), strategy: "next-vs-between" },
        { value: nextHour(spec.hand, 9), strategy: "next-vs-between" },
      ]),
    };
  }
  const hour = int(rng, 1, 12);
  return {
    format_type: "read-instrument",
    presentation: "figure:clock",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(hour),
    answer: hour,
    question_zh: "钟面上是整点，时针指着哪个数字？",
    question_en: "It is exactly on the hour. Which numeral does the hour hand point to?",
    figure: { kind: "clock", hour, minute: 0 },
    distractors: clockDistractors(hour, [
      { value: 12, strategy: "clock-hand-swap" },
      { value: nextHour(hour), strategy: "off-by-one-count" },
      { value: nextHour(hour, 11), strategy: "off-by-one-count" },
    ]),
  };
}

/**
 * Set a clock (topic 4.4): given a supported time in words, pick the
 * numeral the minute hand must point to. No figure — a drawn clock would
 * give the setting away.
 */
function makeClockSetItem(rng) {
  const spec = pick(rng, CLOCK_MINUTE_SPECS);
  const hour = int(rng, 1, 12);
  const timeZh = spec.time_zh(hour);
  const timeEn = spec.time_en(hour);
  return {
    format_type: "read-instrument",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(spec.hand),
    answer: spec.hand,
    question_zh: `要把钟面调到${timeZh}，分针应该指着几？`,
    question_en: `To set the clock to ${timeEn}, which numeral should the minute hand point to?`,
    distractors: clockDistractors(spec.hand, [
      { value: hour, strategy: "clock-hand-swap" },
      { value: nextHour(spec.hand, 3), strategy: "next-vs-between" },
      { value: nextHour(spec.hand, 9), strategy: "next-vs-between" },
    ]),
  };
}

/** Day naming (topic 4.4): yesterday / today / tomorrow / the day after
 * tomorrow, within the 星期一..星期日 week (answers 1..7, Sunday = 7). */
function makeDayNameItem(rng) {
  const given = int(rng, 0, 6);
  const offset = pick(rng, [
    { d: -1, zh: "昨天", ask_en: "What day was it yesterday?" },
    { d: 1, zh: "明天", ask_en: "What day will it be tomorrow?" },
    { d: 2, zh: "后天", ask_en: "What day will it be the day after tomorrow?" },
  ]);
  const answer = ((given + offset.d) % 7 + 7) % 7 + 1; // 1..7, no wrap ambiguity
  const givenDay = WEEKDAYS[given];
  const candidates = [
    { value: answer + 1 <= 7 ? answer + 1 : answer - 1, strategy: "off-by-one-count" },
    { value: answer - 1 >= 1 ? answer - 1 : answer + 1, strategy: "off-by-one-count" },
    { value: ((given - offset.d) % 7 + 7) % 7 + 1, strategy: "next-vs-between" },
  ];
  return {
    format_type: "fill-blank",
    presentation: "story",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(answer),
    answer,
    question_zh: `今天是${givenDay.zh}，${offset.zh}是星期几？`,
    question_en: `Today is ${givenDay.en}. ${offset.ask_en}`,
    distractors: buildDistractors(rng, answer, 7, candidates),
  };
}

/** Month naming (topic 4.4): the month before/after, and the first/last
 * month of the year (answers 1..12). */
function makeMonthNameItem(rng) {
  const kind = pick(rng, ["before", "after", "first", "last"]);
  let answer;
  let question_zh;
  let question_en;
  if (kind === "first") {
    answer = 1;
    question_zh = "一年中的第一个月是几月？";
    question_en = "Which is the first month of the year?";
  } else if (kind === "last") {
    answer = 12;
    question_zh = "一年中的最后一个月是几月？";
    question_en = "Which is the last month of the year?";
  } else {
    const given = int(rng, 1, 12);
    answer = kind === "before" ? (given === 1 ? 12 : given - 1) : (given === 12 ? 1 : given + 1);
    question_zh =
      kind === "before"
        ? `${MONTH_ZH(given)}的前一个月是几月？`
        : `${MONTH_ZH(given)}的后一个月是几月？`;
    question_en =
      kind === "before"
        ? `Which month comes just before ${MONTH_EN[given - 1]}?`
        : `Which month comes just after ${MONTH_EN[given - 1]}?`;
  }
  const candidates = [
    { value: answer + 1 <= 12 ? answer + 1 : answer - 1, strategy: "off-by-one-count" },
    { value: answer - 1 >= 1 ? answer - 1 : answer + 1, strategy: "off-by-one-count" },
    { value: answer + 2 <= 12 ? answer + 2 : answer - 2, strategy: "next-vs-between" },
  ];
  return {
    format_type: "fill-blank",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(answer),
    answer,
    question_zh,
    question_en,
    distractors: buildDistractors(rng, answer, 12, candidates),
  };
}

// --- topic 4.2: Appledore orchard picture-sentence + repeated addition (#18) ---

// 看图列式 (picture → number sentence): the objects figure strikes the
// trailing `crossedOut` apples — crossing-out IS the Standard-1 subtraction
// convention (style doc §C.2), so the picture fully determines the sentence.
function makePictureSentenceItem(rng, tp) {
  const total = tp <= 2 ? int(rng, 6, 10) : int(rng, 11, 20);
  const crossed = int(rng, 1, total - 1);
  const answer = total - crossed;
  return {
    format_type: "picture-sentence",
    presentation: "figure:objects",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "subtraction",
    expression: `${total} - ${crossed}`,
    answer,
    question_zh: `看图写出算式：一共有 ${total} 个苹果，划掉 ${crossed} 个，还剩几个？ ${total} - ${crossed} = ___`,
    question_en: `Write the number sentence: ${total} apples, ${crossed} crossed out. How many are left? ${total} - ${crossed} = ___`,
    figure: { kind: "objects", icon: "🍎", count: total, crossedOut: crossed },
    distractors: buildDistractors(rng, answer, 100, [
      { value: total + crossed, strategy: "wrong-operation" },
      { value: crossed, strategy: "raw-operand" },
      { value: answer + 1, strategy: "off-by-one-count" },
    ]),
  };
}

// Repeated addition as ×-readiness (scope doc §4.2): orchard rows of 2, 5,
// or 10 trees, written as a `+` chain — never a × symbol.
function makeRepeatedAdditionItem(rng, tp) {
  const step = pick(rng, [2, 5, 10]);
  const terms = int(rng, 3, 5);
  const sentence = Array(terms).fill(step).join(" + ");
  const answer = step * terms;
  return {
    format_type: "fill-blank",
    presentation: "story",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "addition",
    expression: sentence,
    answer,
    question_zh: `果园里有 ${terms} 行苹果树，每行 ${step} 棵。算一算：${sentence} = ___ 棵`,
    question_en: `The orchard has ${terms} rows with ${step} apple trees each. Calculate: ${sentence} = ___ trees`,
    distractors: buildDistractors(rng, answer, 100, [
      { value: answer - step, strategy: "off-by-one-count" }, // missed a row
      { value: answer + step, strategy: "off-by-one-count" }, // counted an extra row
      { value: step + terms, strategy: "count-all-vs-add" },
    ]),
  };
}

// --- topic 4.3: fruit-stand figures, identification, exchange (#18) --------

// 认钱 with the coins figure (#16): the pictured pile carries the
// denominations, so the prompt no longer lists them (contrast the story
// presentation of makeCoinTotalItem). Same sen cap, drawn by drawCoins.
function makeCoinFigureItem(rng, tp) {
  const { coins, sum } = drawCoins(rng, tp);
  return {
    format_type: "count-write",
    presentation: "figure:coins",
    answer_form: "numeral",
    answer_unit: "sen",
    operation: "addition",
    expression: coins.join(" + "),
    answer: sum,
    question_zh: "这些硬币一共多少钱？",
    question_en: "How much are these coins worth in total?",
    figure: { kind: "coins", coins },
    distractors: buildDistractors(rng, sum, 100, [
      { value: sum - (coins[0] === 50 ? 40 : 0), strategy: "money-denom-miscount" },
      { value: sum - 5, strategy: "money-denom-miscount" },
      { value: coins[0], strategy: "raw-operand" },
    ]),
  };
}

// Note identification / totals (认钱, style doc §C.3): notes only, totals ≤
// RM10 — never mixed with coins in one item.
function makeNoteTotalItem(rng, tp) {
  const count = tp <= 2 ? 2 : pick(rng, [2, 3]);
  let notes = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    notes = Array.from({ length: count }, () => pick(rng, RM_NOTES));
    if (notes.reduce((x, y) => x + y, 0) <= 10) break; // RM cap (scope §4.3)
  }
  const sum = notes.reduce((x, y) => x + y, 0);
  if (sum > 10) throw new Error("no note set within the RM cap");
  const name = pick(rng, STORY_NAMES);
  const listZh = notes.map((n) => `一张 RM${n}`).join(" 和 ");
  const listEn = notes.map((n) => `an RM${n} note`).join(" and ");
  return {
    format_type: "count-write",
    presentation: "story",
    answer_form: "numeral",
    answer_unit: "RM",
    operation: "addition",
    expression: notes.join(" + "),
    answer: sum,
    question_zh: `${name.zh}有${listZh}，一共有多少钱？`,
    question_en: `${name.en} has ${listEn}. How much money is that in total?`,
    distractors: buildDistractors(rng, sum, 10, [
      { value: sum - (notes[0] === 5 ? 4 : 0), strategy: "money-denom-miscount" },
      { value: sum + 1, strategy: "off-by-one-count" },
      { value: notes[0], strategy: "raw-operand" },
    ]),
  };
}

// Equivalent-value exchange, coins for coins within RM1 (scope §4.3). The
// answer is a COUNT of coins, so the item is a counting item with a
// bare-value expression (no ÷ at Standard 1); sen-only vocabulary keeps the
// #14 gate's mixed coin-note exchange check silent.
const COIN_EXCHANGES = [
  { from: 50, to: 10 },
  { from: 50, to: 5 },
  { from: 20, to: 10 },
  { from: 20, to: 5 },
  { from: 10, to: 5 },
];

function makeCoinExchangeItem(rng) {
  const { from, to } = pick(rng, COIN_EXCHANGES);
  const answer = from / to;
  return {
    format_type: "count-write",
    presentation: "plain",
    answer_form: "count",
    answer_unit: "none",
    operation: "counting",
    expression: String(answer),
    answer,
    question_zh: `一枚 ${from} sen 可以换几枚 ${to} sen？`,
    question_en: `How many ${to}-sen coins can you exchange for one ${from}-sen coin?`,
    distractors: buildDistractors(rng, answer, 100, [
      { value: answer + 1, strategy: "off-by-one-count" },
      { value: answer - 1, strategy: "off-by-one-count" },
      { value: from - to, strategy: "wrong-operation" }, // subtracted the denominations
    ]),
  };
}

// Equivalent-value exchange, notes for notes within RM10 (scope §4.3) — the
// ringgit twin of the coin exchange; never mixed in one item.
const NOTE_EXCHANGES = [
  { from: 10, to: 5 },
  { from: 10, to: 1 },
  { from: 5, to: 1 },
];

function makeNoteExchangeItem(rng) {
  const { from, to } = pick(rng, NOTE_EXCHANGES);
  const answer = from / to;
  return {
    format_type: "count-write",
    presentation: "plain",
    answer_form: "count",
    answer_unit: "none",
    operation: "counting",
    expression: String(answer),
    answer,
    question_zh: `一张 RM${from} 可以换几张 RM${to}？`,
    question_en: `How many RM${to} notes can you exchange for one RM${from} note?`,
    distractors: buildDistractors(rng, answer, 100, [
      { value: answer + 1, strategy: "off-by-one-count" },
      { value: answer - 1, strategy: "off-by-one-count" },
      { value: from - to, strategy: "wrong-operation" },
    ]),
  };
}

function makeCalendarFactItem(rng) {
  const fact = pick(rng, [
    {
      zh: "一星期有 ___ 天", en: "How many days are there in a week?",
      answer: 7,
      candidates: [
        { value: 6, strategy: "off-by-one-count" },
        { value: 8, strategy: "off-by-one-count" },
        { value: 5, strategy: "next-vs-between" },
      ],
    },
    {
      zh: "一年有 ___ 个月", en: "How many months are there in a year?",
      answer: 12,
      candidates: [
        { value: 11, strategy: "off-by-one-count" },
        { value: 13, strategy: "off-by-one-count" },
        { value: 21, strategy: "digit-reversal" },
      ],
    },
  ]);
  return {
    format_type: "fill-blank",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: "counting",
    expression: String(fact.answer),
    answer: fact.answer,
    question_zh: `填一填：${fact.zh}`,
    question_en: `Fill in the blank: ${fact.en}`,
    distractors: buildDistractors(rng, fact.answer, 100, fact.candidates),
  };
}

function makeForwardOrderingItem(rng) {
  const pool = pick(rng, FORWARD_EVENTS);
  const count = Math.min(pool.steps.length, int(rng, 3, 5));
  const steps = pool.steps.slice(0, count);
  const items = steps.map((s, i) => ({ value: i + 1, label_zh: s.label_zh, label_en: s.label_en }));
  const scrambledZh = shuffle(rng, steps.map((s) => s.label_zh)).join("、");
  const scrambledEn = shuffle(rng, steps.map((s) => s.label_en)).join(", ");
  return {
    format_type: "order-sequence",
    presentation: "story",
    answer_form: "ordering",
    answer_unit: "none",
    operation: "counting",
    expression: items.map((item) => item.label_zh).join(" → "),
    answer: 1,
    question_zh: `按事情发生的顺序排列：${pool.scenario_zh}（${scrambledZh}）`,
    question_en: `Put these in the order they happen: ${pool.scenario_en} (${scrambledEn})`,
    distractors: [],
    sequence: { direction: "forward", items },
  };
}

function makeRoundTenItem(rng) {
  let n = int(rng, 11, 99);
  while (n % 10 === 0) n = int(rng, 11, 99);
  const ones = n % 10;
  const answer = ones < 5 ? n - ones : n + (10 - ones);
  const expression = ones < 5 ? `${n} - ${ones}` : `${n} + ${10 - ones}`;
  const otherTen = ones < 5 ? answer + 10 : answer - 10;
  return {
    format_type: "round-ten",
    presentation: "plain",
    answer_form: "numeral",
    answer_unit: "none",
    operation: ones < 5 ? "subtraction" : "addition",
    expression,
    answer,
    question_zh: `${n} 的十位近似值是 ___`,
    question_en: `Round ${n} to the nearest ten.`,
    distractors: buildDistractors(rng, answer, 100, [
      { value: otherTen, strategy: "next-vs-between" },
      { value: n, strategy: "raw-operand" },
      { value: answer === 10 ? 0 : answer - 10, strategy: "place-value-slip" },
    ]),
  };
}

/**
 * The template registry: which authentic formats the generator can build per
 * topic, each with the TP window it fits (style doc §C). Topics 4.5–4.7 are
 * figure-first (measurement, shapes, data) and arrive with the FigureView
 * kit (#16); `extra` requires the original_dskp_extra profile.
 */
export const TEMPLATES_BY_TOPIC = {
  "4.1": [
    { tp: [1, 2], make: (rng, tp) => makeCountItem(rng, tp, "count") },
    { tp: [1, 2], make: (rng, tp) => makeCountItem(rng, tp, "circle") },
    { tp: [2, 4], make: (rng, tp) => makeCompareTruthItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeNumericOrderingItem(rng, tp) },
    { tp: [1, 4], make: (rng, tp) => makePatternItem(rng, tp, SKIP_STEPS_CORE) },
    { tp: [2, 4], make: (rng, tp) => makeChineseWordItem(rng, tp) },
    { tp: [1, 4], make: (rng, tp) => makeTenFrameCountItem(rng, tp) },
    { tp: [1, 2], make: (rng, tp) => makeTenFrameBondItem(rng, tp) },
  ],
  "4.2": [
    { tp: [1, 4], make: (rng, tp) => makeComputeItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeWordProblemItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeNumberBondItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeEquationTruthItem(rng, tp) },
    { tp: [2, 3], make: (rng, tp) => makePictureSentenceItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeRepeatedAdditionItem(rng, tp) },
  ],
  "4.3": [
    { tp: [2, 3], make: (rng, tp) => makeCoinTotalItem(rng, tp) },
    { tp: [2, 3], make: (rng, tp) => makeCoinFigureItem(rng, tp) },
    { tp: [2, 3], make: (rng, tp) => makeNoteTotalItem(rng, tp) },
    { tp: [3, 4], make: (rng, tp) => makeCoinExchangeItem(rng, tp) },
    { tp: [3, 4], make: (rng, tp) => makeNoteExchangeItem(rng, tp) },
    { tp: [2, 4], make: (rng, tp) => makeComputeItem(rng, tp, 10, "RM") },
    { tp: [2, 4], make: (rng, tp) => makeComputeItem(rng, tp, 100, "sen") },
    { tp: [2, 4], make: (rng, tp) => makeWordProblemItem(rng, tp, 10, "RM") },
    { tp: [2, 4], make: (rng, tp) => makeWordProblemItem(rng, tp, 100, "sen") },
  ],
  "4.4": [
    { tp: [1, 2], make: (rng) => makeCalendarFactItem(rng) },
    { tp: [1, 3], make: (rng) => makeForwardOrderingItem(rng) },
    { tp: [1, 2], make: (rng) => makeClockHandsItem(rng) },
    { tp: [1, 2], make: (rng, tp) => makeClockReadItem(rng, tp, CLOCK_MINUTE_SPECS[0]) },
    { tp: [2, 3], make: (rng, tp) => makeClockReadItem(rng, tp, CLOCK_MINUTE_SPECS[2]) },
    { tp: [3, 4], make: (rng, tp) => makeClockReadItem(rng, tp, pick(rng, [CLOCK_MINUTE_SPECS[1], CLOCK_MINUTE_SPECS[3]])) },
    { tp: [3, 4], make: (rng) => makeClockSetItem(rng) },
    { tp: [2, 3], make: (rng) => makeDayNameItem(rng) },
    { tp: [2, 4], make: (rng) => makeMonthNameItem(rng) },
  ],
  extra: [
    { tp: [2, 3], make: (rng, tp) => makePatternItem(rng, tp, SKIP_STEPS_EXTRA) },
    { tp: [3, 4], make: (rng) => makeRoundTenItem(rng) },
  ],
};

export const SUPPORTED_TOPICS = Object.keys(TEMPLATES_BY_TOPIC);

// --- batch assembly ---------------------------------------------------------

function validateParams({ topic, tpMin, tpMax, profile, count, seed, bankId }) {
  if (typeof bankId !== "string" || bankId.trim() === "") {
    throw new Error("--bank <bank_id> is required (e.g. std1.sample-money)");
  }
  if (!SUPPORTED_TOPICS.includes(topic)) {
    throw new Error(
      `topic "${topic}" has no generator templates yet (supported: ${SUPPORTED_TOPICS.join(", ")}). ` +
        "Figure-first topics 4.5–4.7 arrive with the FigureView kit (#16).",
    );
  }
  if (!Number.isInteger(tpMin) || !Number.isInteger(tpMax) || tpMin < 1 || tpMax > 6 || tpMin > tpMax) {
    throw new Error(`--tp must be a band inside [1, 6], got ${tpMin}-${tpMax}`);
  }
  if (!CURRICULUM_PROFILES.includes(profile)) {
    throw new Error(`--profile must be one of: ${CURRICULUM_PROFILES.join(", ")}`);
  }
  if (topic === "extra" && profile !== "original_dskp_extra") {
    throw new Error('topic "extra" requires --profile original_dskp_extra (scope doc §5)');
  }
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new Error("--count must be an integer in [1, 200]");
  }
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error("--seed must be a non-negative integer");
  }
  const templates = TEMPLATES_BY_TOPIC[topic].filter(
    (t) => t.tp[0] <= tpMax && t.tp[1] >= tpMin,
  );
  if (templates.length === 0) {
    throw new Error(
      `no ${topic} templates cover TP${tpMin}–${tpMax}; widen the band or pick another topic`,
    );
  }
  return templates;
}

/** Existing versions of a bank id under the grade directory (for next-version). */
export async function bankVersionsOnDisk(bankId, resourcesDir = DEFAULT_RESOURCES_DIR) {
  const dir = join(resourcesDir, "question-banks", "std1");
  let names = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const escaped = bankId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}\\.v(\\d+)\\.json$`);
  return names.map((n) => re.exec(n)?.[1]).filter(Boolean).map(Number);
}

export function batchIdFor({ bankId, topic, tpMin, tpMax, seed }) {
  return `${bankId}-${topic}-tp${tpMin}-${tpMax}-s${seed}`;
}

/**
 * Live active-manifest routes that would overlap a proposed batch slice.
 * Missing/unreadable resources trees yield [] so tests and fresh worktrees
 * still generate; a parse failure on a present pointer is a hard error.
 */
export async function findLiveRouteOverlaps(
  { topic, tpMin, tpMax, profile, grade = "std1" },
  resourcesDir = DEFAULT_RESOURCES_DIR,
) {
  const pointerPath = join(resourcesDir, "question-banks", "active-manifest.json");
  let pointerRaw;
  try {
    pointerRaw = JSON.parse(await readFile(pointerPath, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  const pointer = parseActiveManifestPointer(pointerRaw);
  const manifest = parseQuestionBankManifest(
    JSON.parse(await readFile(join(resourcesDir, `${pointer.manifest}.json`), "utf8")),
  );
  const proposed = {
    grade,
    topic,
    tp_min: tpMin,
    tp_max: tpMax,
    profile,
    bank_id: "__proposed__",
    version: 1,
    path: "question-banks/std1/__proposed__.v1",
  };
  return manifest.entries.filter((e) => routesOverlap(e, proposed));
}

/** Human-readable collision message used by writeBatch and the CLI. */
export function formatRoutedSliceCollision(params, overlaps) {
  const live = overlaps
    .map(
      (e) =>
        `${e.bank_id} v${e.version} (${e.grade}/${e.topic} TP${e.tp_min}–${e.tp_max} ${e.profile})`,
    )
    .join("; ");
  return (
    `slice std1/${params.topic} TP${params.tpMin}–${params.tpMax} ${params.profile} ` +
    `already has a live route: ${live}. ` +
    "Generating this batch would produce content that cannot activate without `import --replace`. " +
    "Pick a disjoint TP band/topic, or pass --allow-routed-slice to override " +
    "(merge into the same bank_id, or a deliberate replace candidate)."
  );
}

/**
 * Generate one candidate batch as a schema-v2 bank object. Deterministic:
 * the same params and seed always produce the same questions in the same
 * order. Candidate ids are 1..count (batch-local; import renumbers on merge).
 */
export function generateBatch(params) {
  const { topic, tpMin, tpMax, profile, count, seed } = params;
  const templates = validateParams(params);
  const rng = mulberry32(seed);
  const questions = [];
  const seenContent = new Set();
  const templateCounts = {};
  // Coverage pass (#17): the first `templates.length` questions each try a
  // different template first, so an arc-sized batch always covers the topic's
  // full format menu — the ten-frame bond must appear in a 20-question 4.1
  // batch, not hope the roulette lands on it. A forced template whose content
  // space is exhausted simply yields to the rest of the shuffled deck for
  // that question (small pools like calendar facts must not deadlock).
  const coverage = shuffle(rng, templates);
  for (let id = 1; id <= count; id++) {
    const rest = shuffle(rng, templates);
    let order = rest;
    if (id <= coverage.length) {
      const first = coverage[id - 1];
      order = [first, ...rest.filter((t) => t !== first)];
    }
    let built = null;
    for (let attempt = 0; attempt < 40 && built === null; attempt++) {
      const template = order[attempt % order.length];
      const lo = Math.max(tpMin, template.tp[0]);
      const hi = Math.min(tpMax, template.tp[1]);
      const tp = int(rng, lo, hi);
      const item = template.make(rng, tp);
      const key = `${item.format_type}|${item.expression}|${item.answer}|${item.question_zh}`;
      if (seenContent.has(key)) continue; // no duplicate questions in a batch
      seenContent.add(key);
      templateCounts[item.format_type] = (templateCounts[item.format_type] ?? 0) + 1;
      built = {
        id,
        topic,
        tp_level: tp,
        profile,
        item_format: "objective",
        format_type: item.format_type,
        presentation: item.presentation,
        answer_form: item.answer_form,
        answer_unit: item.answer_unit,
        operation: item.operation,
        expression: item.expression,
        answer: item.answer,
        bilingual: bilingual(item.answer),
        question_zh: item.question_zh,
        question_en: item.question_en,
        distractors: item.distractors,
        ...(item.sequence ? { sequence: item.sequence } : {}),
        ...(item.figure ? { figure: item.figure } : {}),
      };
    }
    if (built === null) {
      throw new Error(
        `could not build ${count} distinct questions for ${topic} TP${tpMin}–${tpMax} (seed ${seed}); ` +
          "the template space is exhausted — lower --count or widen the band",
      );
    }
    questions.push(built);
  }
  return { questions, templateCounts };
}

/** Build the full candidate bank envelope plus its provenance record. */
export function buildBatchArtifacts(params, version) {
  const { questions, templateCounts } = generateBatch(params);
  const batchId = batchIdFor(params);
  const source =
    `Generated offline by tools/generate-question-batch.mjs v${GENERATOR_VERSION} ` +
    `(M4, issue #15): seed ${params.seed}, ${params.topic} TP${params.tpMin}–${params.tpMax}, ` +
    `profile ${params.profile}, ${questions.length} questions; ` +
    `provenance: question-batches/candidates/${batchId}.provenance.json`;
  const bank = {
    schema_version: 2,
    bank_id: params.bankId,
    version,
    source,
    currency: "RM",
    profile: params.profile,
    scope:
      `standard-1-sjkc-math §2 (hard constraints) + §${params.topic === "extra" ? "5 extras" : params.topic}; ` +
      `TP${params.tpMin}–${params.tpMax} candidate batch (pending gate + human review)`,
    questions,
  };
  return { batchId, bank, templateCounts };
}

export function buildProvenance(params, batchId, bank, templateCounts) {
  const body = JSON.stringify(bank, null, 2) + "\n";
  return {
    schema_version: 1,
    batch_id: batchId,
    generator: {
      tool: "tools/generate-question-batch.mjs",
      version: GENERATOR_VERSION,
    },
    generated_at: new Date().toISOString(),
    params: {
      bank_id: params.bankId,
      grade: "std1",
      topic: params.topic,
      tp_min: params.tpMin,
      tp_max: params.tpMax,
      profile: params.profile,
      count: params.count,
      seed: params.seed,
      bank_version: bank.version,
    },
    question_count: bank.questions.length,
    template_counts: templateCounts,
    sha256: createHash("sha256").update(body).digest("hex"),
    reproduce: `node tools/generate-question-batch.mjs --bank ${params.bankId} --topic ${params.topic} --tp ${params.tpMin}-${params.tpMax} --profile ${params.profile} --count ${params.count} --seed ${params.seed}`,
  };
}

/** Generate a batch and write the immutable candidate + provenance files. */
export async function writeBatch(params, opts = {}) {
  const resourcesDir = opts.resourcesDir ?? DEFAULT_RESOURCES_DIR;
  const candidatesDir = opts.candidatesDir ?? DEFAULT_CANDIDATES_DIR;
  const allowRoutedSlice = Boolean(opts.allowRoutedSlice);
  if (!allowRoutedSlice) {
    const overlaps = await findLiveRouteOverlaps(params, resourcesDir);
    if (overlaps.length > 0) {
      throw new Error(formatRoutedSliceCollision(params, overlaps));
    }
  }
  const versions = await bankVersionsOnDisk(params.bankId, resourcesDir);
  const version = versions.length === 0 ? 1 : Math.max(...versions) + 1;
  const { batchId, bank, templateCounts } = buildBatchArtifacts(params, version);
  const candidatePath = join(candidatesDir, `${batchId}.candidate.json`);
  const provenancePath = join(candidatesDir, `${batchId}.provenance.json`);
  try {
    await readFile(candidatePath, "utf8");
    throw new Error(
      `candidate batch already exists: ${candidatePath}\n` +
        "candidate batches are immutable — pick a new --seed for a new batch",
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const provenance = buildProvenance(params, batchId, bank, templateCounts);
  await mkdir(candidatesDir, { recursive: true });
  await writeFile(candidatePath, JSON.stringify(bank, null, 2) + "\n");
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + "\n");
  return { batchId, bank, candidatePath, provenancePath, provenance };
}

// --- CLI -------------------------------------------------------------------

function parseArgs(argv) {
  const args = { tp: "1-2", profile: "dpk3_2026_core", count: 20, allowRoutedSlice: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--bank") args.bankId = argv[++i];
    else if (arg === "--topic") args.topic = argv[++i];
    else if (arg === "--tp") args.tp = argv[++i];
    else if (arg === "--profile") args.profile = argv[++i];
    else if (arg === "--count") args.count = Number(argv[++i]);
    else if (arg === "--seed") args.seed = Number(argv[++i]);
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--allow-routed-slice") args.allowRoutedSlice = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  const m = /^(\d+)-(\d+)$/.exec(args.tp ?? "");
  if (!m) throw new Error(`--tp must look like "1-2", got "${args.tp}"`);
  if (args.seed === undefined) throw new Error("--seed <n> is required (batches are reproducible)");
  return {
    params: {
      bankId: args.bankId,
      topic: args.topic,
      tpMin: Number(m[1]),
      tpMax: Number(m[2]),
      profile: args.profile,
      count: args.count,
      seed: args.seed,
    },
    out: args.out,
    allowRoutedSlice: args.allowRoutedSlice,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1]);
if (isMain) {
  try {
    const { params, out, allowRoutedSlice } = parseArgs(process.argv.slice(2));
    const result = await writeBatch(params, { candidatesDir: out, allowRoutedSlice });
    console.log(`candidate batch: ${result.candidatePath}`);
    console.log(`provenance:      ${result.provenancePath}`);
    console.log(`bank: ${result.bank.bank_id} v${result.bank.version} · ${result.bank.questions.length} questions`);
    console.log(`next: npm run validate:questions -- "${result.candidatePath}"`);
  } catch (e) {
    console.error(`generate error: ${e.message}`);
    process.exit(1);
  }
}
