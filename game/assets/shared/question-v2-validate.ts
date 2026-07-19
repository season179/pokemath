// Runtime trust boundary for schema-v2 question-bank JSON (M3, #10). Same
// strictness posture as the v1 guard: reject unknown fields, label every
// error with its path, and never guess at malformed content. v2 additionally
// makes the curriculum metadata mandatory, constrains the enum axes to the
// style-doc vocabulary, and requires authored misconception distractors.
//
// Scope notes:
// - Structural checks only. Curriculum scope (≤100, +−, single-step) and
//   answer re-derivation stay in question-verify.ts for authoring/CI; the
//   bilingual zh_word gloss is likewise a content check (verify warns with
//   the derived reading). The one cross-field rule kept here is
//   bilingual.numeral === String(answer) — the numeral is the answer's
//   identity in string form, not a translation.
// - `steps` is deliberately not a v2 field: Standard 1 is single-step, so
//   the unknown-field rejection flags it. Legacy stepped items still serve
//   through the v1 adapter at runtime.

import { CURRICULUM_PROFILES } from "./curriculum";
import {
  record,
  rejectUnknownFields,
  requiredEnum,
  requiredInteger,
  requiredString,
} from "./parse-util";
import type { Distractor } from "./question-engine";
import {
  DISTRACTOR_STRATEGIES,
  ITEM_FORMATS,
  QUESTION_ANSWER_FORMS,
  QUESTION_FORMAT_TYPES,
  QUESTION_PRESENTATIONS,
  QUESTION_TOPICS,
  QUESTION_V2_OPERATIONS,
  type QuestionV2,
  type VersionedQuestionBankV2Data,
} from "./question-v2";

const BANK_FIELDS = new Set([
  "schema_version", "bank_id", "version", "source", "currency", "profile", "scope", "questions",
]);
const QUESTION_FIELDS = new Set([
  "id", "topic", "tp_level", "profile", "item_format", "format_type", "presentation",
  "answer_form", "answer_unit", "operation", "expression", "answer", "bilingual",
  "question_zh", "question_en", "table", "distractors",
]);
const BILINGUAL_FIELDS = new Set(["numeral", "zh_word"]);
const DISTRACTOR_FIELDS = new Set(["value", "strategy"]);

/**
 * Validate untrusted schema-v2 JSON before QuestionBank sees it. Throws with
 * a labeled message on the first violation.
 */
export function parseQuestionBankV2Data(raw: unknown): VersionedQuestionBankV2Data {
  const bank = record(raw);
  if (!bank) throw new Error("question bank must be an object");
  rejectUnknownFields(bank, BANK_FIELDS, "question bank");
  if (bank.schema_version !== 2) {
    throw new Error(`question bank v2 requires schema_version 2, got ${String(bank.schema_version)}`);
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
  const questions = bank.questions.map((value, index): QuestionV2 => {
    const q = record(value);
    if (!q) throw new Error(`question[${index}] must be an object`);
    rejectUnknownFields(q, QUESTION_FIELDS, `question[${index}]`);
    const id = requiredInteger(q.id, `question[${index}].id`);
    if (id < 1) throw new Error(`question[${index}].id must be positive`);
    if (ids.has(id)) throw new Error(`duplicate question id ${id}`);
    ids.add(id);

    const topic = requiredEnum(q.topic, QUESTION_TOPICS, `question ${id}.topic`);
    const tpLevel = requiredInteger(q.tp_level, `question ${id}.tp_level`);
    if (tpLevel < 1 || tpLevel > 6) throw new Error(`question ${id}.tp_level must be in [1, 6]`);
    const profile = requiredEnum(
      q.profile,
      CURRICULUM_PROFILES,
      `question ${id}.profile`,
    );
    const itemFormat = requiredEnum(q.item_format, ITEM_FORMATS, `question ${id}.item_format`);
    const formatType = requiredEnum(q.format_type, QUESTION_FORMAT_TYPES, `question ${id}.format_type`);
    const presentation = requiredEnum(
      q.presentation,
      QUESTION_PRESENTATIONS,
      `question ${id}.presentation`,
    );
    const answerForm = requiredEnum(
      q.answer_form,
      QUESTION_ANSWER_FORMS,
      `question ${id}.answer_form`,
    );
    const answerUnit = requiredEnum(q.answer_unit, ["none", "RM", "sen"], `question ${id}.answer_unit`);
    const operation = requiredEnum(q.operation, QUESTION_V2_OPERATIONS, `question ${id}.operation`);
    const expression = requiredString(q.expression, `question ${id}.expression`);
    const answer = requiredInteger(q.answer, `question ${id}.answer`);
    if (answer < 0) throw new Error(`question ${id}.answer must be non-negative`);

    const bilingualRaw = record(q.bilingual);
    if (!bilingualRaw) throw new Error(`question ${id}.bilingual must be an object`);
    rejectUnknownFields(bilingualRaw, BILINGUAL_FIELDS, `question ${id}.bilingual`);
    const numeral = requiredString(bilingualRaw.numeral, `question ${id}.bilingual.numeral`);
    if (numeral !== String(answer)) {
      throw new Error(
        `question ${id}.bilingual.numeral must be the answer's digits ("${answer}"), got "${numeral}"`,
      );
    }
    const zhWord = requiredString(bilingualRaw.zh_word, `question ${id}.bilingual.zh_word`);

    const question: QuestionV2 = {
      id,
      topic,
      tp_level: tpLevel,
      profile,
      item_format: itemFormat,
      format_type: formatType,
      presentation,
      answer_form: answerForm,
      answer_unit: answerUnit,
      operation,
      expression,
      answer,
      bilingual: { numeral, zh_word: zhWord },
      question_zh: requiredString(q.question_zh, `question ${id}.question_zh`),
      question_en: requiredString(q.question_en, `question ${id}.question_en`),
    };

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

    if (!Array.isArray(q.distractors) || q.distractors.length !== 3) {
      throw new Error(`question ${id}.distractors must contain exactly 3 choices`);
    }
    const values = new Set<number>([answer]);
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
      if (choice < 0) {
        throw new Error(`question ${id}.distractors[${distractorIndex}].value must be non-negative`);
      }
      if (values.has(choice)) throw new Error(`question ${id} answer and distractors must be unique`);
      values.add(choice);
      return {
        value: choice,
        strategy: requiredEnum(
          distractor.strategy,
          DISTRACTOR_STRATEGIES,
          `question ${id}.distractors[${distractorIndex}].strategy`,
        ),
      };
    });

    return question;
  });

  const parsed: VersionedQuestionBankV2Data = {
    schema_version: 2,
    bank_id: bankId,
    version,
    source,
    currency: bank.currency,
    questions,
  };
  if (bank.profile !== undefined) {
    parsed.profile = requiredEnum(bank.profile, CURRICULUM_PROFILES, "question bank profile");
  }
  if (bank.scope !== undefined) parsed.scope = requiredString(bank.scope, "question bank scope");
  return parsed;
}
