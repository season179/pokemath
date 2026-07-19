# Standard 1 corpus checklist (validation gate, M4 / issue #14)

> **Status:** ratified gate contract. The machine-readable copy lives in
> `shared/question-gate.ts` (`CORPUS_CHECKLIST`); this doc is the
> human-readable source a reviewer reads alongside a gate report. Rule ids are
> stable evidence identifiers — renaming one is a breaking change to reports.

The gate (`tools/validate-question-bank.mjs`) runs three phases and every row
below names its enforcing phase:

| Phase | What it proves | Implementation |
|---|---|---|
| structural | format validity, answer-form and figure payloads against schema v2 | `shared/question-bank-validate.ts` (authority) + AJV against `schemas/question-bank-v2.schema.json` |
| mechanical | scope + independently re-derived answers | `shared/question-verify.ts` via `verifyBank` |
| adversarial | corpus coherence over the **raw** JSON | `shared/question-gate.ts` `auditBankAdversarial` |

Verdicts are **reject-only**: the gate never edits content. A batch that fails
any row goes back to the generator; warnings (⚠) pass the gate but stay on the
report for the human reviewer.

## The checklist

| Rule | Phase | Rejects | Source |
|---|---|---|---|
| `SCHEMA-V2` | structural | Unknown/missing fields, unsupported `schema_version`, malformed answer-form or figure payloads, `steps` smuggled into v2 | [schema-v2.md](schema-v2.md) |
| `SCOPE-100` | mechanical | Any operand, answer, distractor, or table value outside [0, 100] | scope doc §2 |
| `OPS-PLUSMINUS` | mechanical | `× ÷ * /` or parentheses in any expression | scope doc §2 |
| `STEP-SINGLE` | mechanical | Chained subtraction or mixed `+/−` chains (pure repeated addition is allowed ×-readiness) | scope doc §2 |
| `ANSWER-REDERIVE` | mechanical | Stated answers that differ from the re-derived value, including declared orders that contradict their direction | issue #14 |
| `OPERATION-LABEL` | mechanical | `operation` labels that contradict the operators in `expression` | [schema-v2.md](schema-v2.md) |
| `MONEY-RM10` | mechanical | Ringgit amounts above RM10 (every number on an `answer_unit: "RM"` item caps at 10) | scope doc §2/§4.3 |
| `MONEY-SEN100` | mechanical | Sen amounts above RM1 (every number on an `answer_unit: "sen"` item caps at 100) | scope doc §2/§4.3 |
| `MONEY-MIXED` | mechanical | Mixed coin-note exchange: a prompt making/exchanging equivalent value across the ringgit/sen boundary | scope doc §4.3 |
| `DISTRACTORS` | mechanical | Out-of-scope, duplicate, or answer-equal choices; missing strategy annotations | style doc §D |
| `BILINGUAL` | mechanical | `bilingual.numeral` ≠ the answer's digits; `zh_word` drift (warns) | style doc §B |
| `RAW-NUMERAL` | adversarial | Raw-JSON `bilingual.numeral` ≠ `String(answer)` — checked off the parsed path | issue #14 |
| `RAW-IDS` | adversarial | Duplicate or malformed question ids in the raw JSON | [schema-v2.md](schema-v2.md) |
| `UNIT-TOPIC` | adversarial | `answer_unit` RM/sen outside topic 4.3 | scope doc §4.3 |
| `STRATEGY-TOPIC` | adversarial | `money-denom-miscount` on non-money items; `clock-hand-swap` outside topic 4.4 | style doc §D |
| `EXTRA-PROFILE` | adversarial | `topic: "extra"` not gated to `original_dskp_extra`; core topics gated to the extra profile warn (hidden from core-profile children) | scope doc §1/§5 |
| `ZH-WORD-DRIFT` | adversarial (⚠) | Raw `zh_word` differing from the derived Chinese number word — human-review evidence, not a hard fail | style doc §B |

## Money scope, precisely (scope doc §4.3)

- RM items: operands, answer, distractors, and table values ∈ [0, 10].
- Sen items: ∈ [0, 100] (RM1). Sen figures above RM1 are written as sen only up
  to 100; anything larger is out of Standard-1 money scope.
- Exchange items must be **single-unit**: coins↔coins in sen (totals ≤ RM1) or
  notes↔notes in RM (≤ RM10). The mechanical signal is the prompt text:
  ringgit-denominated amounts **and** sen-denominated amounts **and**
  exchange/equivalence language (相等于 / 兑换 / 可以换 / equivalent / exchange)
  in one item ⇒ `money-mixed-exchange`. Mixed note+coin *totals* carry no
  exchange language and are not flagged by this rule.
  - Strict-reading consequence: the style-doc corpus example "多少枚 10 sen
    相等于 RM1？" fails this rule (RM1 is a note). Author it in sen instead:
    "多少枚 10 sen 相等于 100 sen？" — pedagogically identical, mechanically clean.
- Multiplication/division of money needs no special rule: the expression
  grammar rejects `× ÷` on every item (`OPS-PLUSMINUS`).

## Adversarial posture

The adversarial phase reads the **raw** bank JSON rather than the parser
output, so nothing the parser accepted is taken on trust, and applies
cross-field coherence rows no single-field check can see (unit↔topic,
strategy↔topic, topic↔profile). It does **not** re-implement arithmetic —
`ANSWER-REDERIVE` has exactly one evaluator, and a second one would be
theater. v2 coherence rows apply only to `schema_version: 2` banks; legacy v1
banks are served by the adapter under golden-test protection and skip them.

## Running the gate

```sh
npm run validate:questions -- path/to/bank.json          # default: shipped Woolly bank
node tools/validate-question-bank.mjs bank.json --out docs/question-banks
```

Exit code 0 = accept, 1 = reject. Evidence lands next to the review docs:
`<bank_id>.v<version>.gate.json` (machine-readable) and `.gate.md` (checklist
rollup + every finding). Fixtures covering every rejection rule and boundary
case live in `shared/tests/fixtures/gate/` and are pinned by
`shared/tests/question-gate.test.ts` and `tools/validate-question-bank.test.mjs`.
