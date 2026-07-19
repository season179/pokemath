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
| `answer_form` | `"numeral"`, `"count"`, `"chinese-word"`, `"circle"`, `"true-false"`, `"ordering"` | the objective forms v2 serves (see below) |
| `answer_unit` | `"none"`, `"RM"`, `"sen"` | display unit; `"none"` keeps counts out of currency |
| `operation` | `"counting"`, `"addition"`, `"subtraction"` | Std-1 hard constraints: no × ÷ |
| `expression` | non-empty string, e.g. `"70 + 3"`, `"8"`; for true-false a comparison claim, e.g. `"7 > 8"`; for ordering the declared order, e.g. `"5 < 6 < 7 < 8 < 9"` | machine-checkable content (form-specific grammar) |
| `answer` | non-negative integer; for true-false only `1` (对/✓) or `0` (错/✗); for ordering the first value in the declared order | the correct choice |
| `bilingual` | `{ "numeral": "<answer digits>", "zh_word": "<中文>" }` | the answer as numeral and Chinese word (`"18"` / `"十八"`) |
| `question_zh` / `question_en` | non-empty strings | bilingual prompt |
| `distractors` | exactly 3 `{ "value", "strategy" }`; exactly 1 for true-false; empty (`[]`) for ordering | authored wrong choices; `strategy` is one of the style doc §D misconception ids |
| `sequence` | ordering only: `{ "direction": ..., "items": [...] }` (below) | the declared correct order (#12) |
| `table` | optional object of finite numbers | supporting data table |
| `figure` | optional declarative figure spec (below) | the visual behind a `figure:*` presentation (#16) |

## Rules the parser enforces (structural)

- **Unknown fields are rejected**, including `steps` — Standard 1 items are
  single-step, so v2 has no `steps` field. Legacy multi-step items still
  serve through the v1 adapter (below).
- `distractors`: for the numeric forms (including `circle`), exactly 3
  choices; each `value` a non-negative integer; all distinct and none equal
  to `answer`; each `strategy` one of the §D ids:
  `off-by-one-count`, `count-all-vs-add`, `wrong-operation`, `raw-operand`,
  `no-carry-concat`, `digit-reversal`, `place-value-slip`, `more-fewer-flip`,
  `next-vs-between`, `clock-hand-swap`, `word-operator-scramble`,
  `money-denom-miscount`.
- `bilingual.numeral` must equal `String(answer)` — the numeral is the
  answer's identity in string form.
- `answer_form` accepts the six values above.
- Every error names its path, e.g. `question 4.distractors[1].strategy must
  be one of: …`.

### The `circle` answer form (#11)

The worksheet 圈出 form: the prompt carries a figure or values and the child
circles one of the declared options. The wire contract is the numeric one
above (answer + 3 authored choices); the runtime serves exactly those four
selections, shuffled, with a circle-specific hint.

### The `true-false` answer form (#11)

The worksheet 对的画✓，错的打✗ form: the child judges a statement 对/错.
Because the serving contract is numeric, the truth value is encoded:

- `answer`: `1` = 对/✓ (the statement is true), `0` = 错/✗ (false).
- `distractors`: exactly **1** choice — the opposite truth value. The served
  round is the closed pair `[✓, ✗]` in that fixed order, never shuffled.
- `expression` is a **comparison claim**: `E = E`, `E > E`, or `E < E`,
  where each side is a Standard-1 arithmetic expression (`+ −` only, e.g.
  `"7 > 8"`, `"5 + 4 = 9"`, `"9 - 1 < 12"`). The verifier re-derives the
  truth value from it, so a flipped ✓/✗ answer fails mechanically.
- `operation` labels the arithmetic *inside* the claim: `"counting"` when
  both sides are bare numerals (`"7 > 8"` compares counts; no arithmetic is
  performed), `"addition"` / `"subtraction"` when the claim contains that
  operator (`"5 + 4 = 9"` → `"addition"`).
- `bilingual` follows the same rules as every form: `numeral` is the
  answer's digits (`"1"` / `"0"`) and `zh_word` the derived Chinese number
  word (`"一"` / `"零"`). The judgment words 对/错 are a closed universal
  pair rendered by the runtime — they are not per-item data, so they do not
  live in `bilingual`.

### The `ordering` answer form (#12)

The worksheet 排列 form (style doc §A `order-sequence`): the child arranges
tiles into the correct order — ascending/descending values, or the order
events or pattern stages happen. The bank declares the order **plus its
direction**; shuffling is serve-time UI state and never enters the bank.

- `sequence` (required on this form, forbidden on every other):
  - `direction`: `"ascending"` (从小到大), `"descending"` (从大到小), or
    `"forward"` (events / pattern stages, in the order they happen).
  - `items`: 3–5 tiles **in their correct order**. Each is
    `{ "value": <non-negative integer> }` for numeric ordering, plus
    `{ "label_zh", "label_en" }` (both required) for `forward` — the labels
    are the tile text (e.g. 刷牙 / brush teeth), while `value` stays the
    tile's numeric identity (conventionally 1, 2, 3…). Numeric-ordering
    tiles show the numeral, so their labels stay unauthored.
  - Values must be **unique** within a sequence — duplicates make the
    correct order ambiguous and are rejected.
- `answer`: the **first value in the declared order** (`items[0]`) — for
  ascending the smallest number, for descending the largest, for forward
  the first step. `bilingual` follows the same uniform rule as every form:
  `numeral` is the answer's digits and `zh_word` its Chinese number word
  (just as true-false carries `"1"`/`"一"` for its encoded answer).
- `distractors`: `[]` — the ordering round serves the sequence tiles, not
  MCQ choices. The field stays present (v2 omits nothing silently).
- `operation`: `"counting"` — ordering performs no arithmetic (comparing
  and sequencing counts), the same convention as true-false numerals.
- `expression` restates the declared order, form-specific grammar:
  - ascending/descending: a uniform comparator chain of the declared
    values — `"5 < 6 < 7 < 8 < 9"` or `"17 > 14 > 12 > 11 > 9"`. The
    verifier re-derives it: the chain must use one comparator matching the
    direction and restate exactly the declared values.
  - forward: the declared Chinese labels joined by `" → "` —
    `"起床 → 刷牙 → 上学"`. The verifier cross-checks it against the labels
    as an anti-drift guard (positional order cannot be re-derived).
- Scoring is three-valued (see `shared/question-ordering.ts`): an
  unfinished arrangement is `incomplete` (calm hint, no penalty), a full
  wrong arrangement is `incorrect`, and the declared order is `correct`.

## The declarative figure (#16)

Standard-1 items are overwhelmingly visual (style doc §E), so an item can
carry a small **figure spec** — content data, rendered by the shared
FigureView kit (`game/assets/src/questions/FigureView.ts`) rather than by
per-question UI code. The DSL lives in `shared/figures.ts`; the four kinds
cover the highest-frequency Standard 1 visuals:

| `figure.kind` | Shape | Renders |
|---|---|---|
| `"ten-frame"` | `{ "kind", "filled": 0–20 }` | counters filling 10-cell frames in reading order (11–20 draws the double frame, 二十格); empty cells stay visible so bonds to 10/20 read off the gaps |
| `"clock"` | `{ "kind", "hour": 1–12, "minute": 0\|15\|30\|45 }` | an analog face with all twelve numerals; the hour hand travels with the minutes (3:30 points halfway between 3 and 4) |
| `"coins"` | `{ "kind", "coins": [5\|10\|20\|50, ...] }` | Malaysian sen coins (silver; 50 sen gold), sized by value, labeled with the denomination; the pile must total ≤ 100 sen (RM1) |
| `"objects"` | `{ "kind", "icon": "🐑", "count": 1–100, "crossedOut"? }` | rows of one emoji (10 per row); the trailing `crossedOut` icons are struck through — the picture-sentence (看图列式) subtraction convention |

Wire rules (structural; `parseFigureSpec`):

- The spec is strict: unknown fields, out-of-range values, non-sen
  denominations, and off-scope clocks (any minute outside 0/15/30/45) are
  rejected at the trust boundary.
- When `figure` is present its `kind` **must match** `presentation`
  (`figure.kind: "clock"` requires `presentation: "figure:clock"`).
- A `figure:*` presentation **without** a spec is not an error — it is the
  deliberate fallback: the question layout renders the bilingual prose with
  the world's sprites behind it (see `resolveFigureView`). This is how the
  remaining presentations (`figure:pictograph`, `figure:number-bond`, …)
  serve safely until their renderers land.
- Whether the figure matches the *content* (does the ten-frame show the
  question's known part?) is an authoring-review concern, not structural —
  the canonical examples live in the gallery bank
  (`game/assets/resources/question-banks/std1/figure-gallery.v1.json`,
  executed by `shared/tests/figures.test.ts`).

Figures are a **schema-v2 feature**: the v1 wire stays frozen (its
unknown-field guard rejects `figure`), and the v1 adapter never fabricates
a figure for legacy content.

Executed examples: [below](#valid-clock-item-with-a-figure-16).

## Rules the verifier enforces (content, authoring/CI)

`shared/question-verify.ts` is the mechanical gate (#14 hardened it): it
re-derives the answer from `expression` — for true-false, by evaluating the
comparison claim (each side must independently stay in scope and single-
step); for ordering, by checking the declared order against the direction
(sortedness for ascending/descending, the label cross-check for forward) —
enforces the scope (numbers ≤ 100, `+ −` only, single-step), tightens it for
money items (RM amounts ≤ RM10, sen ≤ RM1, table values included, and mixed
coin-note exchange rejected from prompt text), and flags `bilingual` mismatches: a wrong `numeral` is an error, and a `zh_word`
that differs from the derived `chineseNumeral(answer)` reading warns with
the suggestion (the gloss is a translation; a human reviews variants). The
trust boundary never re-derives content.

The full offline gate — structural + mechanical + an adversarial corpus
checklist pass over the raw JSON, with accept/reject evidence — is
`shared/question-gate.ts`, driven by `tools/validate-question-bank.mjs`
(`npm run validate:questions`). The checklist contract is
[std1-corpus-checklist.md](std1-corpus-checklist.md).

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
      "expression": "18",
      "answer": 18,
      "bilingual": { "numeral": "18", "zh_word": "十八" },
      "question_zh": "数一数，共有几朵花？\n🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸",
      "question_en": "Count the flowers. How many are there?",
      "distractors": [
        { "value": 17, "strategy": "off-by-one-count" },
        { "value": 19, "strategy": "off-by-one-count" },
        { "value": 81, "strategy": "digit-reversal" }
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

### Valid: circle and true-false items (#11)

A circle item (the child circles one of the four declared values) and a
true-false item (the child judges the statement; the answer encodes 1 = ✓,
0 = ✗, and the single distractor is the opposite truth value).

<!-- example: valid -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.example-objective",
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
      "format_type": "count-circle",
      "presentation": "picture",
      "answer_form": "circle",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "8",
      "answer": 8,
      "bilingual": { "numeral": "8", "zh_word": "八" },
      "question_zh": "圈出正确的答案：🦆🦆🦆🦆🦆🦆🦆🦆 共有几只鸭子？",
      "question_en": "Circle the correct answer: how many ducks are there?",
      "distractors": [
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" },
        { "value": 10, "strategy": "off-by-one-count" }
      ]
    },
    {
      "id": 2,
      "topic": "4.1",
      "tp_level": 2,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "true-false",
      "presentation": "plain",
      "answer_form": "true-false",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "7 > 8",
      "answer": 0,
      "bilingual": { "numeral": "0", "zh_word": "零" },
      "question_zh": "对的画 ✓，错的画 ✗：7 比 8 大",
      "question_en": "Mark ✓ for true and ✗ for false: 7 is greater than 8",
      "distractors": [
        { "value": 1, "strategy": "more-fewer-flip" }
      ]
    }
  ]
}
```

### Valid: ordering items (#12)

An ascending numeric ordering item (tiles show numerals; the declared items
are already in correct order) and a forward event-ordering item (labels
carry the tile text; values are step identities).

<!-- example: valid -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.example-ordering",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "profile": "dpk3_2026_core",
  "questions": [
    {
      "id": 1,
      "topic": "4.1",
      "tp_level": 3,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "order-sequence",
      "presentation": "plain",
      "answer_form": "ordering",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "5 < 6 < 7 < 8 < 9",
      "answer": 5,
      "bilingual": { "numeral": "5", "zh_word": "五" },
      "question_zh": "从小到大排列：5、7、9、6、8",
      "question_en": "Arrange from smallest to largest: 5, 7, 9, 6, 8",
      "distractors": [],
      "sequence": {
        "direction": "ascending",
        "items": [
          { "value": 5 },
          { "value": 6 },
          { "value": 7 },
          { "value": 8 },
          { "value": 9 }
        ]
      }
    },
    {
      "id": 2,
      "topic": "4.4",
      "tp_level": 2,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "order-sequence",
      "presentation": "story",
      "answer_form": "ordering",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "起床 → 刷牙 → 上学",
      "answer": 1,
      "bilingual": { "numeral": "1", "zh_word": "一" },
      "question_zh": "按事情发生的顺序排列：小明的早晨",
      "question_en": "Put Xiaoming's morning in the order it happens",
      "distractors": [],
      "sequence": {
        "direction": "forward",
        "items": [
          { "value": 1, "label_zh": "起床", "label_en": "wake up" },
          { "value": 2, "label_zh": "刷牙", "label_en": "brush teeth" },
          { "value": 3, "label_zh": "上学", "label_en": "go to school" }
        ]
      }
    }
  ]
}
```

### Valid: clock item with a figure (#16)

<!-- example: valid -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.figure-example",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.4",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "read-instrument",
      "presentation": "figure:clock",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "3",
      "answer": 3,
      "bilingual": { "numeral": "3", "zh_word": "三" },
      "question_zh": "钟面上是几时？",
      "question_en": "What time is shown on the clock face?",
      "figure": { "kind": "clock", "hour": 3, "minute": 0 },
      "distractors": [
        { "value": 2, "strategy": "off-by-one-count" },
        { "value": 4, "strategy": "off-by-one-count" },
        { "value": 12, "strategy": "clock-hand-swap" }
      ]
    }
  ]
}
```

### Invalid: figure kind does not match the presentation

<!-- example: invalid: /question 1\.figure\.kind "objects" does not match presentation "figure:clock"/ -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.figure-example",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.4",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "read-instrument",
      "presentation": "figure:clock",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "3",
      "answer": 3,
      "bilingual": { "numeral": "3", "zh_word": "三" },
      "question_zh": "钟面上是几时？",
      "question_en": "What time is shown on the clock face?",
      "figure": { "kind": "objects", "icon": "🐑", "count": 3 },
      "distractors": [
        { "value": 2, "strategy": "off-by-one-count" },
        { "value": 4, "strategy": "off-by-one-count" },
        { "value": 12, "strategy": "clock-hand-swap" }
      ]
    }
  ]
}
```

### Invalid: an off-scope clock

<!-- example: invalid: /question 1\.figure\.minute must be one of: 0, 15, 30, 45/ -->
```json
{
  "schema_version": 2,
  "bank_id": "std1.figure-example",
  "version": 1,
  "source": "docs/question-banks/schema-v2.md",
  "currency": "RM",
  "questions": [
    {
      "id": 1,
      "topic": "4.4",
      "tp_level": 1,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "read-instrument",
      "presentation": "figure:clock",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "3",
      "answer": 3,
      "bilingual": { "numeral": "3", "zh_word": "三" },
      "question_zh": "钟面上是几时？",
      "question_en": "What time is shown on the clock face?",
      "figure": { "kind": "clock", "hour": 3, "minute": 22 },
      "distractors": [
        { "value": 2, "strategy": "off-by-one-count" },
        { "value": 4, "strategy": "off-by-one-count" },
        { "value": 12, "strategy": "clock-hand-swap" }
      ]
    }
  ]
}
```

### Invalid: forward ordering without labels

`forward` tiles are event/pattern text, so every item needs both bilingual
labels — an unlabeled event tile would render as a bare number.

<!-- example: invalid: /question 1\.sequence\.items\[0\]\.label_zh is required for direction "forward"/ -->
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
      "topic": "4.4",
      "tp_level": 2,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "order-sequence",
      "presentation": "story",
      "answer_form": "ordering",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "起床 → 刷牙 → 上学",
      "answer": 1,
      "bilingual": { "numeral": "1", "zh_word": "一" },
      "question_zh": "按事情发生的顺序排列：小明的早晨",
      "question_en": "Put Xiaoming's morning in the order it happens",
      "distractors": [],
      "sequence": {
        "direction": "forward",
        "items": [
          { "value": 1, "label_en": "wake up" },
          { "value": 2, "label_zh": "刷牙", "label_en": "brush teeth" },
          { "value": 3, "label_zh": "上学", "label_en": "go to school" }
        ]
      }
    }
  ]
}
```

### Invalid: sequence on a non-ordering form

The declared order only means something to the ordering renderer; on any
other form it is silent extras and rejected like any misplaced field.

<!-- example: invalid: /question 1\.sequence is only allowed for answer_form "ordering"/ -->
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
      "tp_level": 3,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "order-sequence",
      "presentation": "plain",
      "answer_form": "numeral",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "5 < 6 < 7 < 8 < 9",
      "answer": 5,
      "bilingual": { "numeral": "5", "zh_word": "五" },
      "question_zh": "从小到大排列：5、7、9、6、8",
      "question_en": "Arrange from smallest to largest: 5, 7, 9, 6, 8",
      "distractors": [
        { "value": 6, "strategy": "off-by-one-count" },
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" }
      ],
      "sequence": {
        "direction": "ascending",
        "items": [
          { "value": 5 },
          { "value": 6 },
          { "value": 7 },
          { "value": 8 },
          { "value": 9 }
        ]
      }
    }
  ]
}
```

### Invalid: ordering with MCQ distractors

The ordering round serves the sequence tiles — there are no four choices to
distract from, so the distractor list must stay empty.

<!-- example: invalid: /question 1\.distractors must be empty for answer_form "ordering"/ -->
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
      "tp_level": 3,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "order-sequence",
      "presentation": "plain",
      "answer_form": "ordering",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "5 < 6 < 7 < 8 < 9",
      "answer": 5,
      "bilingual": { "numeral": "5", "zh_word": "五" },
      "question_zh": "从小到大排列：5、7、9、6、8",
      "question_en": "Arrange from smallest to largest: 5, 7, 9, 6, 8",
      "distractors": [
        { "value": 6, "strategy": "off-by-one-count" }
      ],
      "sequence": {
        "direction": "ascending",
        "items": [
          { "value": 5 },
          { "value": 6 },
          { "value": 7 },
          { "value": 8 },
          { "value": 9 }
        ]
      }
    }
  ]
}
```

### Invalid: true-false with numeric-form distractors

A true-false item declares exactly one distractor — the opposite truth
value — not the numeric forms' three choices.

<!-- example: invalid: /question 2\.distractors must contain exactly 1 choice \(the opposite truth value\) for answer_form "true-false"/ -->
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
      "format_type": "count-circle",
      "presentation": "picture",
      "answer_form": "circle",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "8",
      "answer": 8,
      "bilingual": { "numeral": "8", "zh_word": "八" },
      "question_zh": "圈出正确的答案：🦆🦆🦆🦆🦆🦆🦆🦆 共有几只鸭子？",
      "question_en": "Circle the correct answer: how many ducks are there?",
      "distractors": [
        { "value": 7, "strategy": "off-by-one-count" },
        { "value": 9, "strategy": "off-by-one-count" },
        { "value": 10, "strategy": "off-by-one-count" }
      ]
    },
    {
      "id": 2,
      "topic": "4.1",
      "tp_level": 2,
      "profile": "dpk3_2026_core",
      "item_format": "objective",
      "format_type": "true-false",
      "presentation": "plain",
      "answer_form": "true-false",
      "answer_unit": "none",
      "operation": "counting",
      "expression": "7 > 8",
      "answer": 0,
      "bilingual": { "numeral": "0", "zh_word": "零" },
      "question_zh": "对的画 ✓，错的画 ✗：7 比 8 大",
      "question_en": "Mark ✓ for true and ✗ for false: 7 is greater than 8",
      "distractors": [
        { "value": 1, "strategy": "more-fewer-flip" },
        { "value": 7, "strategy": "raw-operand" },
        { "value": 9, "strategy": "raw-operand" }
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
      "expression": "18",
      "answer": 18,
      "bilingual": { "numeral": "18", "zh_word": "十八" },
      "question_zh": "数一数，共有几朵花？",
      "question_en": "Count the flowers. How many are there?",
      "distractors": [
        { "value": 17, "strategy": "off-by-one-count" },
        { "value": 19, "strategy": "off-by-one-count" },
        { "value": 81, "strategy": "digit-reversal" }
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
      "expression": "18",
      "answer": 18,
      "bilingual": { "numeral": "18", "zh_word": "十八" },
      "question_zh": "数一数，共有几朵花？",
      "question_en": "Count the flowers. How many are there?",
      "distractors": [
        { "value": 17, "strategy": "off-by-one-count" },
        { "value": 19, "strategy": "off-by-one-count" },
        { "value": 81, "strategy": "random-guess" }
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
