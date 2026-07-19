// Mechanical verifier for Standard-1 (SJKC Year 1) question banks.
//
// Pure domain — no DOM, no canvas. Given a Question, it independently
// re-derives the answer from `expression`, enforces the locked Standard-1
// scope (numbers ≤ 100, `+ −` only, single-step with repeated addition
// permitted), and checks that authored distractors are valid MCQ options.
// True-false items (#11) express their claim as a comparison
// (`E = E`, `E > E`, `E < E` — each side a Std-1 arithmetic expression) and
// the re-derived truth value (1 = 对/✓, 0 = 错/✗) must equal the answer.
//
// The scope rules come from docs/curriculum/standard-1-sjkc-math.md §2
// (hard constraints). Misconception *labels* on distractors are review
// annotations, not mechanically provable, so only the numeric validity of a
// distractor is checked here — a human reviews the strategy strings.
//
// This is a dev/test tool: it is not imported by the game or the worker, and
// ships no runtime cost to players.

import {
  TRUE_FALSE_FORM,
  TRUTH_FALSE,
  TRUTH_TRUE,
  type Question,
} from "./question-engine.ts";
import { chineseNumeral, type BilingualValue } from "./question-v2.ts";

export type Severity = "error" | "warn";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
}

export interface VerifyOptions {
  // Inclusive upper bound on every number in the problem (operands, answer,
  // and distractors). Standard-1 default is 100.
  maxNumber?: number;
  // How many authored distractors a question must carry when it carries any.
  // The current UI is a 4-option MCQ (answer + 3), so the default is 3.
  // True-false questions always require exactly 1 (the opposite truth
  // value), regardless of this option.
  distractorCount?: number;
}

const DEFAULT_MAX = 100;
const DEFAULT_DISTRACTORS = 3;

type Tok = { t: "num"; v: number } | { t: "op"; v: "+" | "-" };

export interface ParsedExpression {
  value: number;
  operands: number[]; // always unsigned: Standard-1 `-` is exclusively an operator
  operators: string[]; // e.g. ["+", "+"] for `5 + 5 + 5`
}

// Tokenize a normalized expression. `+`/`-` are always operators (Standard-1
// items never start negative), so compact `10-3` is subtraction, not the
// number `10` followed by `-3`. The `\s+` → " " collapse in parseExpression
// means only ASCII spaces reach here; the final `else throw` guarantees the
// loop always advances (no infinite loop on a stray tab/newline).
function tokenize(expr: string, raw: string): Tok[] {
  const tokens: Tok[] = [];
  for (let i = 0; i < expr.length; ) {
    const c = expr[i];
    if (c === " ") { i++; continue; }
    if (c === "+" || c === "-") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i;
      while (j < expr.length && expr[j] >= "0" && expr[j] <= "9") j++;
      tokens.push({ t: "num", v: parseInt(expr.slice(i, j), 10) });
      i = j;
      continue;
    }
    throw new Error(`expression "${raw}" has unexpected character '${c}'`);
  }
  if (tokens.length === 0) throw new Error(`expression "${raw}" has no tokens`);
  return tokens;
}

/**
 * Parse a Standard-1 arithmetic expression into its value plus the operands
 * and operators it contains.
 *
 * Supports `+` and `−` only, left-to-right (including repeated addition such
 * as `5 + 5 + 5`). A bare numeral (e.g. `"8"`, for a counting item) parses
 * to itself. Throws on any unsupported operator (`× ÷ * /`), parentheses,
 * unexpected characters, adjacent operands (`12 3`), or misplaced operators.
 * Because `-` is always an operator, operands are unsigned — `10-3` yields
 * operands `[10, 3]`, never `[10, -3]`.
 */
export function parseExpression(raw: string): ParsedExpression {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`expression is empty`);
  }
  const expr = raw.replace(/[−–]/g, "-").replace(/\s+/g, " ").trim();

  if (/[×÷*/]/.test(expr)) {
    throw new Error(`expression "${raw}" uses an unsupported operator (× ÷ * /)`);
  }
  if (/[()]/.test(expr)) {
    throw new Error(`expression "${raw}" uses parentheses (not allowed in Standard 1)`);
  }
  if (!/^[-+\d\s]+$/.test(expr)) {
    throw new Error(`expression "${raw}" has unexpected characters`);
  }

  const tokens = tokenize(expr, raw);

  // Grammar:  NUM (OP NUM)*  — strict, left-to-right. A leading operator,
  // consecutive operators, or adjacent operands are all malformed and rejected.
  let total: number | null = null;
  let op: "+" | "-" | null = null;
  const operands: number[] = [];
  const operators: string[] = [];
  for (const tok of tokens) {
    if (tok.t === "op") {
      if (op !== null) throw new Error(`expression "${raw}" has consecutive operators`);
      if (total === null) throw new Error(`expression "${raw}" starts with an operator`);
      op = tok.v;
      operators.push(tok.v);
      continue;
    }
    operands.push(tok.v);
    if (op === null) {
      if (total !== null) throw new Error(`expression "${raw}" has adjacent operands`);
      total = tok.v;
    } else {
      total = op === "-" ? total! - tok.v : total! + tok.v;
      op = null;
    }
  }
  if (op !== null) throw new Error(`expression "${raw}" ends with an operator`);
  if (total === null || !Number.isInteger(total)) {
    throw new Error(`expression "${raw}" produced no integer value`);
  }
  return { value: total, operands, operators };
}

/** Evaluate a Standard-1 expression to an integer (thin wrapper). */
export function evaluateExpression(raw: string): number {
  return parseExpression(raw).value;
}

export type TruthComparator = "=" | ">" | "<";

/** A true-false claim (#11): two Std-1 expressions joined by one comparator,
 * e.g. "7 > 8" (false → 0) or "5 + 4 = 9" (true → 1). `value` is the truth
 * encoding; operands/operators flatten both sides for the scope checks. */
export interface ParsedTruthExpression extends ParsedExpression {
  comparator: TruthComparator;
  left: ParsedExpression;
  right: ParsedExpression;
}

/**
 * Parse a true-false comparison claim. Each side must independently satisfy
 * the Standard-1 expression grammar (`+ −` only, repeated addition allowed),
 * and exactly one comparator (`=`, `>`, `<` — the Std-1 comparison
 * vocabulary) may appear. Throws on anything else.
 */
export function parseTruthExpression(raw: string): ParsedTruthExpression {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`expression is empty`);
  }
  const expr = raw.replace(/[−–]/g, "-").replace(/\s+/g, " ").trim();
  const marks = [...expr].filter((c) => c === "=" || c === ">" || c === "<");
  if (marks.length !== 1) {
    throw new Error(
      `truth expression "${raw}" must contain exactly one comparator (=, >, <), got ${marks.length}`,
    );
  }
  const at = expr.search(/[=<>]/);
  const comparator = expr[at] as TruthComparator;
  const leftRaw = expr.slice(0, at).trim();
  const rightRaw = expr.slice(at + 1).trim();
  if (leftRaw === "" || rightRaw === "") {
    throw new Error(`truth expression "${raw}" needs a value on both sides of "${comparator}"`);
  }
  const left = parseExpression(leftRaw);
  const right = parseExpression(rightRaw);
  const truth =
    comparator === "=" ? left.value === right.value
      : comparator === ">" ? left.value > right.value
        : left.value < right.value;
  return {
    value: truth ? 1 : 0,
    operands: [...left.operands, ...right.operands],
    operators: [...left.operators, ...right.operators],
    comparator,
    left,
    right,
  };
}

/**
 * Independently verify a single Standard-1 question. Returns any findings;
 * an empty array means the item passes every mechanical check.
 */
export function verifyQuestion(q: Question, opts: VerifyOptions = {}): Finding[] {
  const max = opts.maxNumber ?? DEFAULT_MAX;
  const answerForm = (q as { answer_form?: string }).answer_form;
  const trueFalse = answerForm === TRUE_FALSE_FORM;
  // True-false declares exactly one distractor (the opposite truth value);
  // numeric forms default to the 4-option MCQ shape (answer + 3).
  const wantDistractors = trueFalse ? 1 : (opts.distractorCount ?? DEFAULT_DISTRACTORS);
  const findings: Finding[] = [];
  const here = (severity: Severity, code: string, message: string) =>
    findings.push({ severity, code, message });

  // --- answer is independently re-derived from the expression ---
  // True-false expressions are comparison claims (parseTruthExpression);
  // everything else keeps the arithmetic grammar.
  let parsed: ParsedExpression;
  let truthSides: [ParsedExpression, ParsedExpression] | null = null;
  try {
    if (trueFalse) {
      const truth = parseTruthExpression(q.expression);
      parsed = truth;
      truthSides = [truth.left, truth.right];
    } else {
      parsed = parseExpression(q.expression);
    }
  } catch (e) {
    here("error", "expression-parse", (e as Error).message);
    return findings; // nothing else is meaningful without a value
  }
  const computed = parsed.value;
  if (computed !== q.answer) {
    here(
      "error",
      "answer-mismatch",
      `expression "${q.expression}" = ${computed}, but answer is ${q.answer}`,
    );
  }

  // --- hard scope constraints (numbers ≤ max) ---
  for (const n of parsed.operands) {
    if (n < 0 || n > max) here("error", "operand-out-of-range", `operand ${n} outside [0, ${max}]`);
  }
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > max) {
    here("error", "answer-out-of-range", `answer ${q.answer} outside [0, ${max}]`);
  }
  if (trueFalse && q.answer !== TRUTH_TRUE && q.answer !== TRUTH_FALSE) {
    here(
      "error",
      "truth-answer-domain",
      `true-false answer must be 1 (对/true) or 0 (错/false), got ${q.answer}`,
    );
  }
  // A truth claim's sides are intermediate values the answer check cannot
  // bound (unlike a numeric item, whose answer IS the computed value), so
  // each side must independently stay inside the scope.
  for (const side of truthSides ?? []) {
    if (side.value < 0 || side.value > max) {
      here(
        "error",
        "side-out-of-range",
        `expression "${q.expression}" has a side equal to ${side.value}, outside [0, ${max}]`,
      );
    }
  }

  // --- single-step rule (repeated addition IS permitted at this level) ---
  // Pure `+` chains of any length are 连加 / ×-readiness and allowed. A lone
  // `+` or `−` is a single step. Anything with two or more operators that
  // includes subtraction (e.g. `10 − 3 − 2`, `5 + 5 − 3`) is multi-step.
  // For a truth claim the rule applies per side: each side is its own
  // computation, and two different single-step sides (e.g. `7 + 1 = 9 − 1`)
  // do not chain into one multi-step computation.
  for (const run of truthSides ?? [parsed]) {
    const runOps = run.operators;
    if (runOps.length >= 2 && runOps.some((o) => o === "-")) {
      here(
        "error",
        "multi-step",
        `expression "${q.expression}" chains subtraction or mixes +/− (multi-step)`,
      );
    }
  }

  // --- operation label matches the operators that appear ---
  const ops = parsed.operators;
  const expected = expectOperation(ops);
  if (expected && q.operation !== expected) {
    here(
      "error",
      "operation-mismatch",
      `expression "${q.expression}" implies operation "${expected}", but field is "${q.operation}"`,
    );
  }

  // --- authored distractors (validity only; strategy labels are reviewed) ---
  const d = q.distractors;
  if (d) {
    if (d.length !== wantDistractors) {
      here(
        "error",
        "distractor-count",
        `expected ${wantDistractors} distractors, got ${d.length}`,
      );
    }
    const values = d.map((x) => x.value);
    const seen = new Set<number>();
    seen.add(q.answer);
    d.forEach((x, i) => {
      if (!x || typeof x.value !== "number" || !Number.isInteger(x.value)) {
        here("error", "distractor-non-integer", `distractor[${i}].value is not an integer`);
        return;
      }
      if (x.value < 0 || x.value > max) {
        here("error", "distractor-out-of-range", `distractor[${i}] = ${x.value} outside [0, ${max}]`);
      }
      if (trueFalse && x.value !== TRUTH_TRUE && x.value !== TRUTH_FALSE) {
        here(
          "error",
          "distractor-non-truth",
          `distractor[${i}] = ${x.value} is not a truth value (1 or 0)`,
        );
      }
      if (x.value === q.answer) {
        here("error", "distractor-equals-answer", `distractor[${i}] = ${x.value} equals the answer`);
      }
      if (seen.has(x.value)) {
        here("error", "distractor-duplicate", `distractor[${i}] = ${x.value} repeats an earlier option`);
      }
      seen.add(x.value);
      if (!x.strategy || !String(x.strategy).trim()) {
        here("error", "distractor-no-strategy", `distractor[${i}] has no strategy annotation`);
      }
    });
    // a duplicate answer among distractors is caught above; also guard a
    // 4-option set that collapses to <4 distinct values
    if (values.length + 1 !== seen.size) {
      here("warn", "distractor-collision", `answer + distractors are not all distinct`);
    }
  }

  // --- bilingual values (schema v2; content check, not the trust boundary) ---
  // The numeral is the answer's identity in string form (error); the zh word
  // is a gloss, so a mismatch warns with the derived reading rather than
  // hard-failing — legitimate variants may exist and deserve human review.
  const bilingual = (q as { bilingual?: BilingualValue }).bilingual;
  if (bilingual !== undefined) {
    if (bilingual.numeral !== String(q.answer)) {
      here(
        "error",
        "bilingual-numeral-mismatch",
        `bilingual.numeral "${bilingual.numeral}" does not match the answer ${q.answer}`,
      );
    }
    try {
      const derived = chineseNumeral(q.answer);
      if (bilingual.zh_word !== derived) {
        here(
          "warn",
          "bilingual-zh-word-mismatch",
          `bilingual.zh_word "${bilingual.zh_word}" differs from the derived "${derived}" for ${q.answer}`,
        );
      }
    } catch {
      // non-integer/negative answers are already flagged by the range checks
    }
  }

  return findings;
}

/** Derive the expected operation string from the operators present. */
function expectOperation(ops: string[]): string | null {
  if (ops.length === 0) return "counting";
  if (ops.every((o) => o === "+")) return "addition";
  if (ops.length === 1 && ops[0] === "-") return "subtraction";
  // mixed/chained subtraction → multi-step, caught separately; no label expectation.
  return null;
}

export interface BankFinding {
  id: number;
  findings: Finding[];
}

/** Verify every question in a bank; returns only rows that have findings. */
export function verifyBank(
  questions: readonly Question[],
  opts: VerifyOptions = {},
): BankFinding[] {
  const rows: BankFinding[] = [];
  const ids = new Set<number>();
  for (const q of questions) {
    if (ids.has(q.id)) {
      rows.push({ id: q.id, findings: [{ severity: "error", code: "duplicate-id", message: `duplicate id ${q.id}` }] });
    }
    ids.add(q.id);
    const f = verifyQuestion(q, opts);
    if (f.length > 0) rows.push({ id: q.id, findings: f });
  }
  return rows;
}
