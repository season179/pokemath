# Curriculum reference — Malaysia SJKC Mathematics

Reference material for the future **LLM question generator**. PokeMath will not
ship a fixed question bank long-term; it will generate questions on the fly. These
docs define, per grade, what a question may and may not contain so the generator's
prompt can be constrained to age-correct items.

## Grade docs

| Grade | File | Numbers | Operations | Headline scope |
|---|---|---|---|---|
| Standard 1 (一年级) | [standard-1-sjkc-math.md](./standard-1-sjkc-math.md) | ≤ 100 | `+ −` only | 7 topics; non-standard units; pictograph |
| Standard 2 (二年级) | [standard-2-sjkc-math.md](./standard-2-sjkc-math.md) | ≤ 1000 | `+ − × ÷` (basic facts) | 8 topics; +fractions/decimals; standard units; bar chart |
| Standard 3 (三年级) | [standard-3-sjkc-math.md](./standard-3-sjkc-math.md) | ≤ 10 000 | `+ − × ÷` (multi-digit; combined) | 9 topics; +percentages, unit conversion, symmetry, coordinates, pie chart; first multi-step |
| Standard 4–6 | _not yet researched_ | — | — | — |

**Tahap 1 (Years 1–3) is complete.** Years 4–6 are **Tahap 2**, governed by a
different circular (DPK Edisi 3 covers Tahap 1 only) and — importantly — **do have
a national UASA exam**, so those docs will need an exam-format section the Tahap 1
docs don't.

## Shared framing (applies to every grade doc)

- **2026 = KSSR (Semakan 2017).** KP2027 reaches Year 1 in 2027 and rolls out one
  year-level per year after. Don't generate KP2027 content for 2026 pupils.
- **Profiles** (a prompt flag, because Level 1 has no single syllabus — teachers
  may use original DSKP or the slimmer DPK Edisi 3):
  - `dpk3_2026_core` — default, narrowest.
  - `original_dskp_extra` — DPK core + DSKP-only items.
  - `sjkc_representation` — always on for SJKC: Chinese wording, 1:4 abacus, MYR.
- **No national exam for Level 1** (UASA is Years 4–6). Assessment is classroom
  PBD; each doc maps the TP1–TP6 performance levels to generation difficulty.
- **How to use for prompting:** inject each grade's *Hard constraints* as fixed
  system rules **keyed by grade** (constraint sets differ and must not leak across
  grades); use per-topic *examples* as few-shot and *out of scope* as negative
  constraints.
