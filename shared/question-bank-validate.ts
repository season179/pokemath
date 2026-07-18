// Runtime trust boundary for versioned question-bank JSON. Structural checks
// live here rather than in the question engine so content loading and gameplay
// behavior remain separate concerns.

import type {
  Distractor,
  Question,
  QuestionStep,
  VersionedQuestionBankData,
} from "./question-engine.ts";

const BANK_FIELDS = new Set([
  "schema_version", "bank_id", "version", "source", "currency", "profile", "scope", "questions",
]);
const QUESTION_FIELDS = new Set([
  "id", "question_zh", "question_en", "operation", "expression", "answer", "table", "steps",
  "topic", "tp_level", "profile", "distractors", "answer_unit",
]);
const STEP_FIELDS = new Set(["prompt_zh", "prompt_en", "expression", "answer"]);
const DISTRACTOR_FIELDS = new Set(["value", "strategy"]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function rejectUnknownFields(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`${label} has unknown field(s): ${unknown.join(", ")}`);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
  return Number(value);
}

/**
 * Validate untrusted JSON before QuestionBank sees it. Curriculum and answer
 * derivation stay in question-verify.ts for authoring/CI; this guard enforces
 * the complete runtime shape and rejects unknown fields rather than guessing.
 */
export function parseQuestionBankData(raw: unknown): VersionedQuestionBankData {
  const bank = record(raw);
  if (!bank) throw new Error("question bank must be an object");
  rejectUnknownFields(bank, BANK_FIELDS, "question bank");
  if (bank.schema_version !== 1) {
    throw new Error(`unsupported question-bank schema version: ${String(bank.schema_version)}`);
  }
  const bankId = requiredString(bank.bank_id, "question bank bank_id");
  const version = requiredInteger(bank.version, "question bank version");
  if (version < 1) throw new Error("question bank requires a positive integer version");
  const source = requiredString(bank.source, "question bank source");
  if (typeof bank.currency !== "string") throw new Error("question bank currency must be a string");
  if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
    throw new Error("question bank requires at least one question");
  }

  const ids = new Set<number>();
  const questions = bank.questions.map((value, index): Question => {
    const q = record(value);
    if (!q) throw new Error(`question[${index}] must be an object`);
    rejectUnknownFields(q, QUESTION_FIELDS, `question[${index}]`);
    const id = requiredInteger(q.id, `question[${index}].id`);
    if (id < 1) throw new Error(`question[${index}].id must be positive`);
    if (ids.has(id)) throw new Error(`duplicate question id ${id}`);
    ids.add(id);

    const question: Question = {
      id,
      question_zh: requiredString(q.question_zh, `question ${id}.question_zh`),
      question_en: requiredString(q.question_en, `question ${id}.question_en`),
      operation: requiredString(q.operation, `question ${id}.operation`),
      expression: requiredString(q.expression, `question ${id}.expression`),
      answer: requiredInteger(q.answer, `question ${id}.answer`),
    };

    for (const field of ["topic", "profile"] as const) {
      if (q[field] !== undefined) question[field] = requiredString(q[field], `question ${id}.${field}`);
    }
    if (q.tp_level !== undefined) {
      const tp = requiredInteger(q.tp_level, `question ${id}.tp_level`);
      if (tp < 1 || tp > 6) throw new Error(`question ${id}.tp_level must be in [1, 6]`);
      question.tp_level = tp;
    }
    if (q.answer_unit !== undefined) {
      if (q.answer_unit !== "none" && q.answer_unit !== "RM" && q.answer_unit !== "sen") {
        throw new Error(`question ${id}.answer_unit is unsupported`);
      }
      question.answer_unit = q.answer_unit;
    }

    if (q.table !== undefined) {
      const table = record(q.table);
      if (!table) throw new Error(`question ${id}.table must be an object`);
      question.table = Object.fromEntries(Object.entries(table).map(([key, value]) => {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`question ${id}.table.${key} must be a finite number`);
        }
        return [key, value];
      }));
    }

    if (q.steps !== undefined) {
      if (!Array.isArray(q.steps) || q.steps.length === 0) {
        throw new Error(`question ${id}.steps must be a non-empty array`);
      }
      question.steps = q.steps.map((value, stepIndex): QuestionStep => {
        const step = record(value);
        if (!step) throw new Error(`question ${id}.steps[${stepIndex}] must be an object`);
        rejectUnknownFields(step, STEP_FIELDS, `question ${id}.steps[${stepIndex}]`);
        return {
          prompt_zh: requiredString(step.prompt_zh, `question ${id}.steps[${stepIndex}].prompt_zh`),
          prompt_en: requiredString(step.prompt_en, `question ${id}.steps[${stepIndex}].prompt_en`),
          expression: requiredString(step.expression, `question ${id}.steps[${stepIndex}].expression`),
          answer: requiredInteger(step.answer, `question ${id}.steps[${stepIndex}].answer`),
        };
      });
    }

    if (q.distractors !== undefined) {
      if (!Array.isArray(q.distractors) || q.distractors.length !== 3) {
        throw new Error(`question ${id}.distractors must contain exactly 3 choices`);
      }
      if (question.steps) throw new Error(`question ${id} cannot combine headline distractors with steps`);
      const values = new Set<number>([question.answer]);
      question.distractors = q.distractors.map((value, distractorIndex): Distractor => {
        const distractor = record(value);
        if (!distractor) {
          throw new Error(`question ${id}.distractors[${distractorIndex}] must be an object`);
        }
        rejectUnknownFields(
          distractor,
          DISTRACTOR_FIELDS,
          `question ${id}.distractors[${distractorIndex}]`,
        );
        const choice = requiredInteger(
          distractor.value,
          `question ${id}.distractors[${distractorIndex}].value`,
        );
        if (values.has(choice)) throw new Error(`question ${id} answer and distractors must be unique`);
        values.add(choice);
        return {
          value: choice,
          strategy: requiredString(
            distractor.strategy,
            `question ${id}.distractors[${distractorIndex}].strategy`,
          ),
        };
      });
    }

    return question;
  });

  const parsed: VersionedQuestionBankData = {
    schema_version: 1,
    bank_id: bankId,
    version,
    source,
    currency: bank.currency,
    questions,
  };
  if (bank.profile !== undefined) parsed.profile = requiredString(bank.profile, "question bank profile");
  if (bank.scope !== undefined) parsed.scope = requiredString(bank.scope, "question bank scope");
  return parsed;
}
