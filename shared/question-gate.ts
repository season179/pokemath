// Offline validation gate for generated Standard-1 question banks (M4, #14).
//
// Before a generated batch may enter an approved bank, the gate independently
// proves four things, in three phases:
//
//   1. structural   — schema v2 at the trust boundary (question-bank-validate):
//                     format validity, answer-form and figure payload shapes,
//                     unknown fields rejected. (The tools/ CLI additionally
//                     runs AJV against schemas/question-bank-v2.schema.json so
//                     the editor-facing JSON schema is proven in lockstep.)
//   2. mechanical   — question-verify: the answer is re-derived from
//                     `expression` (never edited), scope is enforced
//                     (≤ 100, `+ −` only, single-step, RM ≤ 10, sen ≤ 100,
//                     no mixed coin-note exchange).
//   3. adversarial  — the corpus checklist below, applied over the RAW JSON
//                     (not the parser output, so nothing the parser accepted
//                     is taken on trust) plus cross-field coherence rules a
//                     single-field check cannot see.
//
// The corpus checklist (docs/question-banks/std1-corpus-checklist.md) derives
// every row from docs/curriculum/standard-1-sjkc-math.md §2/§4 and
// docs/curriculum/standard-1-question-style.md. Each row names the phase that
// enforces it; the gate report maps findings back to checklist ids so a
// reviewer gets accept/reject evidence, not vibes.
//
// Verdicts are REJECT-only: the gate never edits content. Anything short of a
// clean pass goes back to the generator.
//
// This is a dev/test tool: it is not imported by the game or the worker.

import { parseQuestionBankData } from "./question-bank-validate.ts";
import type { Question } from "./question-engine.ts";
import { chineseNumeral } from "./question-v2.ts";
import { verifyBank, type Severity } from "./question-verify.ts";

export type GatePhase = "structural" | "mechanical" | "adversarial";

export interface GateFinding {
  phase: GatePhase;
  /** Checklist row id (std1-corpus-checklist.md), e.g. "MONEY-RM10". */
  rule: string;
  /** Question id when the finding belongs to one question. */
  id?: number;
  severity: Severity;
  code: string;
  message: string;
}

export interface GatePhaseReport {
  phase: GatePhase;
  accept: boolean;
  findings: GateFinding[];
}

export interface GateReport {
  bankId?: string;
  bankVersion?: number;
  schemaVersion?: number;
  questionCount: number;
  accept: boolean;
  phases: GatePhaseReport[];
}

/** One row of the corpus checklist. `phase` names the enforcing phase. */
export interface ChecklistRow {
  rule: string;
  phase: GatePhase;
  /** Curriculum-doc source for the rule. */
  source: string;
  description: string;
}

/**
 * The corpus checklist (docs/question-banks/std1-corpus-checklist.md). Ids
 * are stable: findings and the Markdown report cite them, so renaming a rule
 * is a breaking change to review evidence.
 */
export const CORPUS_CHECKLIST: readonly ChecklistRow[] = [
  {
    rule: "SCHEMA-V2",
    phase: "structural",
    source: "docs/question-banks/schema-v2.md",
    description:
      "Bank parses at the trust boundary: a supported schema_version, every required field, no unknown fields, answer-form and figure payloads well-formed.",
  },
  {
    rule: "SCOPE-100",
    phase: "mechanical",
    source: "scope doc §2",
    description: "Every number in the problem (operands, answer, distractors, table values) is within [0, 100].",
  },
  {
    rule: "OPS-PLUSMINUS",
    phase: "mechanical",
    source: "scope doc §2",
    description: "Only + and − appear; × ÷ * / and parentheses are rejected.",
  },
  {
    rule: "STEP-SINGLE",
    phase: "mechanical",
    source: "scope doc §2",
    description: "Single-step items; chained subtraction and mixed +/− chains are rejected (pure repeated addition is allowed).",
  },
  {
    rule: "ANSWER-REDERIVE",
    phase: "mechanical",
    source: "issue #14",
    description:
      "The answer is independently re-derived from expression and must match — including the declared order on ordering items; wrong answers are rejected, never edited.",
  },
  {
    rule: "OPERATION-LABEL",
    phase: "mechanical",
    source: "schema-v2 doc",
    description:
      "operation labels the arithmetic in expression (counting / addition / subtraction); ordering and numeral comparisons label counting.",
  },
  {
    rule: "MONEY-RM10",
    phase: "mechanical",
    source: "scope doc §2/§4.3",
    description: "Ringgit amounts stay ≤ RM10 (answer_unit RM caps every number at 10).",
  },
  {
    rule: "MONEY-SEN100",
    phase: "mechanical",
    source: "scope doc §2/§4.3",
    description: "Sen amounts stay ≤ RM1 (answer_unit sen caps every number at 100).",
  },
  {
    rule: "MONEY-MIXED",
    phase: "mechanical",
    source: "scope doc §4.3",
    description: "No mixed coin-note exchange: a prompt exchanging equivalent value across the ringgit/sen boundary is rejected.",
  },
  {
    rule: "DISTRACTORS",
    phase: "mechanical",
    source: "schema-v2 doc; style doc §D",
    description: "Authored distractors are in-scope, unique, distinct from the answer, and strategy-annotated.",
  },
  {
    rule: "BILINGUAL",
    phase: "mechanical",
    source: "style doc §B; scope doc §3",
    description: "bilingual.numeral is the answer's digits; zh_word matches the derived Chinese number word.",
  },
  {
    rule: "RAW-NUMERAL",
    phase: "adversarial",
    source: "issue #14",
    description: "Raw bilingual.numeral equals String(answer) — checked on the raw JSON, not the parsed object.",
  },
  {
    rule: "RAW-IDS",
    phase: "adversarial",
    source: "schema-v2 doc",
    description: "Question ids are unique positive integers in the raw JSON.",
  },
  {
    rule: "UNIT-TOPIC",
    phase: "adversarial",
    source: "scope doc §4.3",
    description: "answer_unit RM/sen appears only on topic 4.3 (money); money items outside 4.3 are incoherent.",
  },
  {
    rule: "STRATEGY-TOPIC",
    phase: "adversarial",
    source: "style doc §D",
    description: "money-denom-miscount distractors only on money items; clock-hand-swap only on topic 4.4 (time).",
  },
  {
    rule: "EXTRA-PROFILE",
    phase: "adversarial",
    source: "scope doc §1/§5",
    description: "topic \"extra\" requires profile original_dskp_extra; core topics (4.1–4.7) are authored as dpk3_2026_core.",
  },
  {
    rule: "ZH-WORD-DRIFT",
    phase: "adversarial",
    source: "style doc §B",
    description: "Raw bilingual.zh_word matches the independently derived Chinese number word (human-review evidence on drift).",
  },
] as const;

// --- raw-JSON helpers (adversarial phase reads untrusted records directly) ---

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function find(rule: string, phase: GatePhase, severity: Severity, code: string, message: string, id?: number): GateFinding {
  return { phase, rule, severity, code, message, ...(id === undefined ? {} : { id }) };
}

const MONEY_UNITS = new Set(["RM", "sen"]);
const CORE_TOPIC = /^4\.[1-7]$/;

/**
 * The adversarial phase: the corpus checklist's cross-field and raw-JSON
 * rows. Reads the raw bank record so parser acceptance is never taken on
 * trust. v2 coherence rows apply only when the bank declares schema v2 —
 * legacy v1 banks predate the v2 vocabulary and are out of this checklist's
 * reach (they are served by the adapter under golden-test protection).
 */
export function auditBankAdversarial(raw: unknown): GateFinding[] {
  const findings: GateFinding[] = [];
  const bank = asRecord(raw);
  if (!bank || !Array.isArray(bank.questions)) {
    findings.push(
      find("SCHEMA-V2", "adversarial", "error", "adv-shape", "raw bank is not an object with a questions array"),
    );
    return findings;
  }
  const isV2 = bank.schema_version === 2;

  const seen = new Set<number>();
  for (const value of bank.questions) {
    const q = asRecord(value);
    if (!q) {
      findings.push(find("RAW-IDS", "adversarial", "error", "adv-shape", "raw question is not an object"));
      continue;
    }
    const id = typeof q.id === "number" && Number.isInteger(q.id) && q.id > 0 ? q.id : undefined;
    if (id === undefined) {
      findings.push(find("RAW-IDS", "adversarial", "error", "adv-id", "raw question id is not a positive integer"));
    } else if (seen.has(id)) {
      findings.push(find("RAW-IDS", "adversarial", "error", "adv-duplicate-id", `duplicate question id ${id} in raw bank`, id));
    } else {
      seen.add(id);
    }

    const bilingual = asRecord(q.bilingual);
    if (bilingual !== null || q.bilingual !== undefined) {
      const answer = q.answer;
      if (typeof answer === "number" && Number.isInteger(answer)) {
        const numeral = bilingual?.numeral;
        if (numeral !== String(answer)) {
          findings.push(
            find(
              "RAW-NUMERAL",
              "adversarial",
              "error",
              "adv-numeral",
              `raw bilingual.numeral ${JSON.stringify(numeral)} does not equal String(answer) "${answer}"`,
              id,
            ),
          );
        }
        const zhWord = bilingual?.zh_word;
        if (typeof zhWord === "string" && answer >= 0) {
          const derived = chineseNumeral(answer);
          if (zhWord !== derived) {
            findings.push(
              find(
                "ZH-WORD-DRIFT",
                "adversarial",
                "warn",
                "adv-zh-word",
                `raw bilingual.zh_word "${zhWord}" differs from the derived "${derived}" for ${answer}`,
                id,
              ),
            );
          }
        }
      }
    }

    if (!isV2) continue; // v2 coherence rows below

    const topic = typeof q.topic === "string" ? q.topic : "";
    const unit = typeof q.answer_unit === "string" ? q.answer_unit : "none";
    if (MONEY_UNITS.has(unit) && topic !== "4.3") {
      findings.push(
        find(
          "UNIT-TOPIC",
          "adversarial",
          "error",
          "adv-unit-topic",
          `answer_unit "${unit}" appears on topic "${topic}"; money units belong to topic 4.3 only`,
          id,
        ),
      );
    }

    if (topic === "extra" && q.profile !== "original_dskp_extra") {
      findings.push(
        find(
          "EXTRA-PROFILE",
          "adversarial",
          "error",
          "adv-extra-profile",
          `topic "extra" requires profile "original_dskp_extra", got ${JSON.stringify(q.profile)}`,
          id,
        ),
      );
    }
    if (CORE_TOPIC.test(topic) && q.profile !== "dpk3_2026_core") {
      findings.push(
        find(
          "EXTRA-PROFILE",
          "adversarial",
          "error",
          "adv-core-profile",
          `core topic "${topic}" should be authored as profile "dpk3_2026_core", got ${JSON.stringify(q.profile)}`,
          id,
        ),
      );
    }

    const moneyItem = topic === "4.3" || MONEY_UNITS.has(unit);
    if (Array.isArray(q.distractors)) {
      q.distractors.forEach((value, index) => {
        const d = asRecord(value);
        const strategy = typeof d?.strategy === "string" ? d.strategy : "";
        if (strategy === "money-denom-miscount" && !moneyItem) {
          findings.push(
            find(
              "STRATEGY-TOPIC",
              "adversarial",
              "error",
              "adv-strategy-topic",
              `distractors[${index}] uses money-denom-miscount on a non-money item (topic "${topic}", unit "${unit}")`,
              id,
            ),
          );
        }
        if (strategy === "clock-hand-swap" && topic !== "4.4") {
          findings.push(
            find(
              "STRATEGY-TOPIC",
              "adversarial",
              "error",
              "adv-strategy-topic",
              `distractors[${index}] uses clock-hand-swap outside topic 4.4 (topic "${topic}")`,
              id,
            ),
          );
        }
      });
    }
  }
  return findings;
}

// Map verifier finding codes to checklist rows (report evidence).
const MECHANICAL_RULE_BY_CODE: Record<string, string> = {
  "expression-parse": "OPS-PLUSMINUS",
  "operand-out-of-range": "SCOPE-100",
  "answer-out-of-range": "SCOPE-100",
  "side-out-of-range": "SCOPE-100",
  "sequence-out-of-range": "SCOPE-100",
  "distractor-out-of-range": "SCOPE-100",
  "table-out-of-range": "SCOPE-100",
  "multi-step": "STEP-SINGLE",
  "answer-mismatch": "ANSWER-REDERIVE",
  "truth-answer-domain": "ANSWER-REDERIVE",
  "order-mismatch": "ANSWER-REDERIVE",
  "expression-drift": "ANSWER-REDERIVE",
  "sequence-missing": "ANSWER-REDERIVE",
  "sequence-length": "ANSWER-REDERIVE",
  "sequence-value": "ANSWER-REDERIVE",
  "sequence-duplicate": "ANSWER-REDERIVE",
  "sequence-label": "ANSWER-REDERIVE",
  "sequence-direction": "ANSWER-REDERIVE",
  "operation-mismatch": "OPERATION-LABEL",
  "money-mixed-exchange": "MONEY-MIXED",
  "distractor-count": "DISTRACTORS",
  "distractor-non-integer": "DISTRACTORS",
  "distractor-equals-answer": "DISTRACTORS",
  "distractor-duplicate": "DISTRACTORS",
  "distractor-collision": "DISTRACTORS",
  "distractor-no-strategy": "DISTRACTORS",
  "distractor-non-truth": "DISTRACTORS",
  "bilingual-numeral-mismatch": "BILINGUAL",
  "bilingual-zh-word-mismatch": "BILINGUAL",
};

function mechanicalRule(code: string, q: Question | undefined): string {
  // Range findings on money items are the money cap rows, not generic SCOPE-100.
  if (
    (code === "operand-out-of-range" ||
      code === "answer-out-of-range" ||
      code === "distractor-out-of-range" ||
      code === "table-out-of-range") &&
    q?.answer_unit === "RM"
  ) {
    return "MONEY-RM10";
  }
  if (
    (code === "operand-out-of-range" ||
      code === "answer-out-of-range" ||
      code === "distractor-out-of-range" ||
      code === "table-out-of-range") &&
    q?.answer_unit === "sen"
  ) {
    return "MONEY-SEN100";
  }
  return MECHANICAL_RULE_BY_CODE[code] ?? "SCOPE-100";
}

/**
 * Run the offline validation gate over raw bank JSON. Returns the full
 * accept/reject evidence; `accept` is true only when every phase is clean
 * (warnings pass but stay attached to the report for the human reviewer).
 */
export function gateQuestionBank(raw: unknown): GateReport {
  const phases: GatePhaseReport[] = [];

  // --- phase 1: structural (schema v2 at the trust boundary) ---
  let questions: Question[] | null = null;
  let bankId: string | undefined;
  let bankVersion: number | undefined;
  let schemaVersion: number | undefined;
  const structuralFindings: GateFinding[] = [];
  try {
    const parsed = parseQuestionBankData(raw);
    questions = parsed.questions;
    bankId = parsed.bank_id;
    bankVersion = parsed.version;
    schemaVersion = parsed.schema_version;
  } catch (e) {
    structuralFindings.push(
      find("SCHEMA-V2", "structural", "error", "schema-v2", (e as Error).message),
    );
    const rawBank = asRecord(raw);
    if (typeof rawBank?.bank_id === "string") bankId = rawBank.bank_id;
    if (typeof rawBank?.version === "number") bankVersion = rawBank.version;
    if (typeof rawBank?.schema_version === "number") schemaVersion = rawBank.schema_version;
  }
  phases.push({
    phase: "structural",
    accept: structuralFindings.length === 0,
    findings: structuralFindings,
  });

  // --- phase 2: mechanical (re-derivation + scope; needs parsed content) ---
  const mechanicalFindings: GateFinding[] = [];
  if (questions !== null) {
    const byId = new Map(questions.map((q) => [q.id, q]));
    for (const row of verifyBank(questions)) {
      for (const f of row.findings) {
        mechanicalFindings.push(
          find(
            mechanicalRule(f.code, byId.get(row.id)),
            "mechanical",
            f.severity,
            f.code,
            f.message,
            row.id,
          ),
        );
      }
    }
  } else {
    mechanicalFindings.push(
      find(
        "SCHEMA-V2",
        "mechanical",
        "error",
        "gate-skipped",
        "mechanical phase skipped: the bank failed structural validation",
      ),
    );
  }
  phases.push({
    phase: "mechanical",
    accept: !mechanicalFindings.some((f) => f.severity === "error"),
    findings: mechanicalFindings,
  });

  // --- phase 3: adversarial (corpus checklist over the raw JSON) ---
  const adversarialFindings = auditBankAdversarial(raw);
  phases.push({
    phase: "adversarial",
    accept: !adversarialFindings.some((f) => f.severity === "error"),
    findings: adversarialFindings,
  });

  const questionCount = questions?.length ??
    (Array.isArray(asRecord(raw)?.questions) ? (asRecord(raw)?.questions as unknown[]).length : 0);
  return {
    ...(bankId === undefined ? {} : { bankId }),
    ...(bankVersion === undefined ? {} : { bankVersion }),
    ...(schemaVersion === undefined ? {} : { schemaVersion }),
    questionCount,
    accept: phases.every((p) => p.accept),
    phases,
  };
}
