# Standard 1 question bank schema v2

> **Status:** ratified contract (M3, issue #10). The runtime parser
> (`shared/question-v2-validate.ts`) is the authority;
> [`schemas/question-bank-v2.schema.json`](../../schemas/question-bank-v2.schema.json)
> mirrors it for editors/CI, and every JSON example in this doc is executed by
> the test suite (`shared/tests/schema-v2.test.ts`) so it cannot drift.

Audience: generator agents producing Standard 1 question batches (M4), human
reviewers approving them, and the runtime that serves them. Read this together
with the curriculum references: what content is allowed
([standard-1-sjkc-math.md](../curriculum/standard-1-sjkc-math.md)) and how
questions are asked
([standard-1-question-style.md](../curriculum/standard-1-question-style.md)).

## Version dispatch at the trust boundary

`parseQuestionBankData(json)` routes on `schema_version`:

| `schema_version` | Result |
|---|---|
| `1` | Parsed by the legacy v1 rules (unchanged behavior) |
| `2` | Parsed by the v2 rules below |
| anything else (including missing) | **Rejected:** `unsupported question-bank schema version: <value> (supported: 1, 2)` |

v2 is **additive**: every v2 question is still a v1 `Question` the battle loop
serves through the same `pick → turnsOf → QuestionRound → formatAnswer` path.

## Bank envelope

| Field | Required | Value |
|---|---|---|
| `schema_version` | ✓ | const `2` |
| `bank_id` | ✓ | non-empty string, e.g. `"std1.woolly-meadows"` |
| `version` | ✓ | positive integer content version |
| `source` | ✓ | non-empty provenance string |
| `currency` | ✓ | string (`"RM"`) |
| `profile` | optional | curriculum profile the bank was authored for |
| `scope` | optional | non-empty scope note |
| `questions` | ✓ | array, at least 1 question |

Unknown envelope fields are rejected.

## Question fields (all required unless marked optional)

| Field | Values | Meaning |
|---|---|---|
| `id` | positive integer, unique in the bank | stable question id |
| `topic` | `"4.1"`…`"4.7"`, `"extra"` | curriculum section (scope doc §4; `"extra"` = §5 extras bucket) |
| `tp_level` | integer 1–6 | PBD performance level (Standard 1 has no exam) |
| `profile` | `"dpk3_2026_core"`, `"original_dskp_extra"` | curriculum-profile gate (below) |
| `item_format` | `"objective"` | item shape (style doc §B); v2 serves numeric objective rounds only |
| `format_type` | one of the style doc §A ids (e.g. `count-write`, `number-bond`, `word-single`, `pattern-continue`, `round-ten`) | worksheet format the item models |
| `presentation` | `plain`, `picture`, `story`, `figure:ten-frame`, `figure:number-bond`, `figure:number-line`, `figure:clock`, `figure:abacus`, `figure:coins`, `figure:shapes`, `figure:pictograph`, `figure:objects`, `figure:balance`, `figure:calendar`, `figure:grid`, `figure:table` | how the item is shown |
| `answer_form` | `"numeral"`, `"count"`, `"chinese-word"` | the numeric objective forms v2 serves. Circle/true-false (#11) and ordering (#12) extend this list with their renderers |
| `answer_unit` | `"none"`, `"RM"`, `"sen"` | display unit; `"none"` keeps counts out of currency |
| `operation` | `"counting"`, `"addition"`, `"subtraction"` | Std-1 hard constraints: no × ÷ |
| `expression` | non-empty string, e.g. `"70 + 3"`, `"8"` | machine-checkable arithmetic (a bare numeral for counting items) |
| `answer` | non-negative integer | the correct choice |
| `bilingual` | `{ "numeral": "<answer digits>", "zh_word": "<中文>" }` | the answer as numeral and Chinese word (`"18"` / `"十八"`) |
| `question_zh` / `question_en` | non-empty strings | bilingual prompt |
| `distractors` | exactly 3 `{ "value", "strategy" }` | authored wrong choices; `strategy` is one of the style doc §D misconception ids |
| `table` | optional object of finite numbers | supporting data table |

## Rules the parser enforces (structural)

- **Unknown fields are rejected**, including `steps` — Standard 1 items are
  single-step, so v2 has no `steps` field. Legacy multi-step items still
  serve through the v1 adapter (below).
- `distractors`: exactly 3 choices; each `value` a non-negative integer; all
  distinct and none equal to `answer`; each `strategy` one of the §D ids:
  `off-by-one-count`, `count-all-vs-add`, `wrong-operation`, `raw-operand`,
  `no-carry-concat`, `digit-reversal`, `place-value-slip`, `more-fewer-flip`,
  `next-vs-between`, `clock-hand-swap`, `word-operator-scramble`,
  `money-denom-miscount`.
- `bilingual.numeral` must equal `String(answer)` — the numeral is the
  answer's identity in string form.
- `answer_form` accepts only the three numeric values above. `circle`,
  `tick`, and `ordering` are rejected until #11/#12 ship their renderers —
  do not generate them yet.
- Every error names its path, e.g. `question 4.distractors[1].strategy must
  be one of: …`.

## Rules the verifier enforces (content, authoring/CI)

`shared/question-verify.ts` stays the authoring gate (#14 hardens it): it
re-derives the answer from `expression`, enforces the scope (numbers ≤ 100,
`+ −` only, single-step), and — new with v2 — flags `bilingual` mismatches:
a wrong `numeral` is an error, and a `zh_word` that differs from the derived
`chineseNumeral(answer)` reading warns with the suggestion (the gloss is a
translation; a human reviews variants). The trust boundary never re-derives
content.

## Curriculum-profile gating

Profiles come from the scope doc §1 (`sjkc_representation` is an always-on
layer, not a profile). `original_dskp_extra` is defined as DPK core **plus**
the DSKP-only extras, so:

```ts
import { gateQuestionsByProfile } from "../../shared/curriculum.ts";

gateQuestionsByProfile(bank.questions, "dpk3_2026_core");      // core items only
gateQuestionsByProfile(bank.questions, "original_dskp_extra"); // core + extra items
```

Core items are served under every profile; extra-profile items only under
`original_dskp_extra`. Untagged legacy questions default to core (the safest
reading). An unknown profile string — on a question or as the active profile —
throws instead of silently reaching a child. The save-level flag
(`SaveStateV2.profile`) uses the same `CurriculumProfile` type from
`shared/curriculum.ts`.

## Legacy v1 banks: the adapter and the golden guarantee

Legacy banks stay v1 on disk and lift in memory:

```ts
const v1 = parseQuestionBankData(rawV1);            // schema_version 1
const v2 = adaptQuestionBankV1ToV2(v1);             // runtime v2 view
```

The adapter only fills metadata defaults — it never rewrites content:

| v2 field | Legacy default |
|---|---|
| `topic` | `"legacy"` when absent (not a curriculum id; wire rejects it) |
| `tp_level` | `3` when absent (placeholder; nothing gates on it) |
| `profile` | `"dpk3_2026_core"` when absent |
| `item_format` | `"objective"` (every legacy round is served as numeric MCQ) |
| `format_type` | `count-write` for `operation: "counting"`, `word-single` for stepped items, else `fill-blank` |
| `presentation` | `picture` for counting, `story` for stepped, else `plain` |
| `answer_form` | `count` for counting, else `numeral` |
| `bilingual` | derived: `{ numeral: String(answer), zh_word: chineseNumeral(answer) }` |

**Golden guarantee:** `shared/tests/schema-v2.test.ts` runs a seeded battle
transcript (pick → turns → choices → formatted choices → judging) over the
Woolly Meadows v1 bank and the legacy sample bank, both raw and adapted, and
requires byte-for-byte equality with the checked-in golden
(`shared/tests/goldens/schema-v2-legacy-battle.golden.txt`). Adapted output
is runtime-valid but intentionally **not** wire-valid: legacy free-text
distractor strategies, multi-step items, and the `"legacy"` topic marker are
preserved, not laundered. Regenerate the golden only after a deliberate
engine change: `UPDATE_GOLDENS=1 npm test`.

## Examples

### Valid minimal bank

A two-question bank: a core counting item and an extra-profile
counting-in-fours item. Under the `dpk3_2026_core` gate only question 1 is
served; under `original_dskp_extra` both are.

<!-- example: valid -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.example",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "profile": "dpk3_2026_core",
  "questions": [
    {
      "id": 1,
      "topic": "4.1",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "count-write",
      "presentation": "picture",
      "answer_form": "count",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "8",
      "answer": 8,
      "bilingual": { "numeral": "8", "zh_word": "八" },
      "question_zh": "数一数，共有几只羊？\n🐑🐑🐑🐑🐑🐑🐑🐑",
      "question_en": "Count the sheep. How many are there?",
      "distractors": [
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" },
        { "value": 10, "strategy": "raw-operand" }
      ]
    },
    {
      "id": 2,
      "topic": "extra",
      "tp_level": 2,
      "profile": "original_dskp_extra",
      "item_format": "objective",
      "format_type": "pattern-continue",
      "presentation": "plain",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "addition",
      "expression": "12 + 4",
      "answer": 16,
      "bilingual": { "numeral": "16", "zh_word": "十六" },
      "question_zh": "四个四个地数：4、8、12、__",
      "question_en": "Count in fours: 4, 8, 12, __",
      "distractors": [
        { "value": 14, "strategy": "off-by-one-count" },
        { "value": 12, "strategy": "raw-operand" },
        { "value": 20, "strategy": "next-vs-between" }
      ]
    }
  ]
}
```

### Invalid: unknown schema version

Anything other than `1` or `2` fails at the trust boundary with the supported
list — a bank that forgets or invents a version never loads.

<!-- example: invalid: /unsupported question-bank schema version: 99 \(supported: 1, 2\)/ -->
```json
{ "schema_version": 99 }
```

### Invalid: missing v2 metadata

A v1-shaped question labeled v2 fails on the first missing v2 field — v2
makes the curriculum metadata mandatory, it cannot be silently omitted.

<!-- example: invalid: /question 1\.item_format must be one of: objective/ -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.bad",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.1",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "8",
      "answer": 8,
      "bilingual": { "numeral": "8", "zh_word": "八" },
      "question_zh": "数一数，共有几只羊？",
      "question_en": "Count the sheep. How many are there?",
      "distractors": [
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" },
        { "value": 10, "strategy": "raw-operand" }
      ]
    }
  ]
}
```

### Invalid: distractor strategy outside the §D menu

Strategy labels are review vocabulary; anything off-menu is rejected so
reviews stay uniform.

<!-- example: invalid: /question 1\.distractors\[2\]\.strategy must be one of:/ -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.bad",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.1",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "count-write",
      "presentation": "picture",
      "answer_form": "count",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "8",
      "answer": 8,
      "bilingual": { "numeral": "8", "zh_word": "八" },
      "question_zh": "数一数，共有几只羊？",
      "question_en": "Count the sheep. How many are there?",
      "distractors": [
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" },
        { "value": 10, "strategy": "random-guess" }
      ]
    }
  ]
}
```

### Invalid: `steps` is not a v2 field

Standard 1 is single-step; v2 drops the legacy `steps` field entirely, so the
unknown-field guard flags it. Serve legacy multi-step content through the v1
adapter instead.

<!-- example: invalid: /question\[0\] has unknown field\(s\): steps/ -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.bad",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.2",
      "tp_level": 2,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "word-single",
      "presentation": "story",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "addition",
      "expression": "5 + 2",
      "answer": 7,
      "bilingual": { "numeral": "7", "zh_word": "七" },
      "question_zh": "妮妮有 5 本故事书，妈妈又买了 2 本，现在共有几本？",
      "question_en": "Nini had 5 storybooks. Her mother bought 2 more. How many does she have now?",
      "steps": [
        { "prompt_zh": "先算 5 + 2", "prompt_en": "First 5 + 2", "expression": "5 + 2", "answer": 7 }
      ],
      "distractors": [
        { "value": 6, "strategy": "off-by-one-count" },
        { "value": 8, "strategy": "off-by-one-count" },
        { "value": 3, "strategy": "wrong-operation" }
      ]
    }
  ]
}
```
