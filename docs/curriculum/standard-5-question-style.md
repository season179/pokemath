# Standard 5 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-5-sjkc-math.md](./standard-5-sjkc-math.md). The scope doc
says **what** a current Standard 5 question may target. This doc says **how it is
asked** so the generator produces genuine SJKC variety rather than only narrative
word problems.

> **Evidence rule.** The sampled Chinese papers are useful format evidence but
> pre-date the 2019 Semakan DSKP. Every example below is retained or adapted only
> when it fits the current DSKP. Do not copy an old paper's topic label into the
> generator without a `standard_code` check.

## How to use for prompting

1. Pick a DSKP **topic**, **learning standard**, and **TP level**.
2. Sample a `format_type` from §A, weighted by the topic catalog in §C.
3. Pick `item_format`: `mcq` or `constructed-response` (§B).
4. Pick an answer shape and, if necessary, a visual type.
5. For MCQ, generate distractors from §D by simulating plausible pupil errors.
6. Run the finished item through the scope constraints. Reject it if its main
   target is only an old-paper topic such as compound-interest calculation, map
   scale, point plotting, bar-chart construction, or surface area.

---

## A. Cross-cutting format taxonomy

| ID | Format | What the pupil does |
|---|---|---|
| `compute-direct` | Direct computation | Evaluate a horizontal or vertical number sentence |
| `fill-sentence` | Complete a sentence | Fill `□`, a blank, or a missing operand |
| `solve-unknown` | Solve one unknown | Find a letter in a valid × or ÷ sentence |
| `model-equation` | Model the story | Write the bracketed/unbracketed expression before solving |
| `word-single` | Single-step word problem | Choose and apply one operation |
| `word-multi` | Multi-step word problem | Chain two or more permitted steps |
| `multipart` | Structured parts | Answer `(a)(b)(c)`, often with rising difficulty |
| `table-read` | Table / invoice | Extract values, including “more/less than”, then compute |
| `figure-read` | Diagram / card / grid | Read a visual before answering |
| `dialogue` | Speech-bubble scenario | Combine information stated by different characters |
| `compare-select` | Compare / verify | Select the largest, correct, reasonable, or equivalent option |
| `order-pattern` | Sequence / order | Complete a number pattern or order values |
| `convert` | Convert | Change numeral/form/unit/percentage representation |
| `round-embed` | Rounding embedded | Round directly or compute then round |
| `estimate-range` | Estimate / interval | Select or justify a plausible range |
| `error-spot` | Diagnose an error | Find and correct a wrong step or claim |
| `remainder-context` | Interpret remainder | Decide what a remainder means in context |
| `concept-define` | Define / distinguish | State the meaning or difference between concepts |
| `classify-scenario` | Classify a situation | Identify prime/non-prime, saving/investment, loan/debt, etc. |
| `measure-tool` | Use an instrument | Read or place a protractor and record an angle |
| `composite-decompose` | Decompose a figure | Split a composite figure/solid into known components |
| `reverse-given` | Work backwards | Recover a whole, percentage, mean total, or proportional value |
| `tick-select` | Tick one or more boxes | Mark all statements or representations that apply |
| `match-connect` | Match pairs | Connect equivalent forms, terms, ratios, or units |
| `shade-represent` | Shade / represent | Show a fraction or percentage visually |
| `explain-reasonableness` | Explain / justify | Decide whether an answer is sensible and say why |
| `interpret-chart` | Read a data display | Infer values or statistics from a pictograph/bar/pie chart |

`presentation` is an independent axis, for example `plain`, `vertical_working`,
`number_cards`, `number_line`, `table`, `invoice`, `calendar`, `protractor`,
`coordinate_grid`, `composite_figure`, `composite_solid`, `pictograph`,
`bar_chart`, `pie_chart`, or `speech_bubbles`.

---

## B. The two UASA item modes

Year 5 UASA Mathematics is one written paper, but the generator needs two item
modes inside that paper:

### `mcq` / objective

- Usually four options, one best answer.
- Can still be multi-step and visual; “objective” does not mean easy.
- Options should encode recognisable misconceptions, not random nearby numbers.
- The stem must contain enough information without relying on answer options to
  repair an ambiguous question.

### `constructed-response` / subjective

- Direct blank, working, short explanation, drawing, measurement, or multipart
  response.
- Marks should attach to meaningful steps: model/operation, method, answer, unit,
  or explanation.
- A rubric should accept equivalent working and mathematically equivalent forms.

Do not call these current “Kertas 1” and “Kertas 2”. The sampled older worksheets
use that split, but current UASA Mathematics is a single written instrument.

---

## C. Per-topic format catalog

Examples marked **paper-shaped** are paraphrased from the sampled SJKC worksheets;
examples marked **DSKP-shaped** are newly written to exercise a 2019 learning
standard that the old papers did not cover correctly.

### C.1 整数与基本运算 · Whole numbers & basic operations

Good weights: `compute-direct`, `order-pattern`, `compare-select`,
`fill-sentence`, `solve-unknown`, `model-equation`, `word-multi`, `table-read`,
`remainder-context`.

- `[convert · mcq · TP2 · paper-shaped]` 六十八万二千零三十写成数字是：
  `682 030` (distractors swap/place omitted zeroes).
- `[compare-select · mcq · TP3 · paper-shaped]` 哪组数目的百位和千位近似值
  相同？ — compare four pairs after rounding.
- `[order-pattern/figure-read · mcq · TP4 · paper-shaped]` Number cards show
  `753 025 → 752 925 → 752 725 → 752 425`; determine the two changing step sizes.
- `[compute-direct · mcq · TP3 · paper-shaped]`
  `23 × (29 413 + 4 190) = ____`.
- `[model-equation + word-multi · constructed · TP4 · paper-shaped]` A library
  has `237 489` books and buys three language sets of `8 139` each. Write one
  expression and find the new total.
- `[solve-unknown · constructed · TP3 · DSKP-shaped]`
  `114 × b = 342`. Find `b` and check by substitution.
- `[solve-unknown/remainder-context · mcq · TP5 · DSKP-shaped]`
  `K ÷ 48 = 1 275 remainder 11`; find `K`.
- `[classify-scenario · tick-select · TP2 · DSKP-shaped]` Tick every prime from
  `51, 59, 87, 97`, then explain one rejected choice.
- `[estimate-range · mcq · TP3 · DSKP-shaped]` Estimate a pictured crowd using a
  known reference block; choose the reasonable interval.

Common traps: reading zeroes incorrectly; confusing place with place value;
rounding on the wrong digit; ignoring brackets; using left-to-right instead of
operation precedence; treating a remainder as a decimal; solving an unknown with
the wrong inverse operation.

### C.2 分数、小数与百分比 · Fractions, decimals & percentages

Good weights: `compute-direct`, `convert`, `fill-sentence`, `reverse-given`,
`shade-represent`, `compare-select`, `word-single`, `word-multi`, `table-read`.

**Fractions**

- `[compute-direct · mcq · TP3 · paper-shaped]` `23 × 1/5 = ____`.
- `[figure-read/cards · constructed · TP3 · DSKP-shaped]` Two cards show
  `2 1/2` and `1 3/5`; find their product and show the improper-fraction step.
- `[word-multi · constructed · TP4 · DSKP-shaped]` One batch uses `3/5 kg` flour.
  Find the flour for `7` batches, then express the answer as a mixed number.

**Decimals**

- `[compute-direct · mcq · TP3 · paper-shaped]`
  `8.513 + 4.84 − 3.69 = ____`.
- `[solve-unknown · mcq · TP3 · paper-shaped]`
  `S ÷ 4 = 5.66`; find `S`.
- `[table-read + word-multi · constructed · TP5 · paper-shaped]` L has mass
  `2.95 kg`, M is `0.473 kg` heavier, N is `1.128 kg` heavier than M; find N and
  then the mass of 13 N items.
- `[round-embed · constructed · TP3 · DSKP-shaped]` Compute a decimal quotient
  and round the result to 3 d.p.; state the rounding digit used.

**Percentages**

- `[convert · mcq · TP2 · paper-shaped]` Write `250%` as a mixed number.
- `[compute-direct · mcq · TP3 · paper-shaped]` `348 × 125% = ____`.
- `[word-multi · mcq · TP4 · paper-shaped]` Of 560 drinks, 50% are original and
  20% chocolate; how many are the remaining flavour?
- `[reverse-given · constructed · TP4 · paper-shaped]` 234 of 780 sweets are
  mint. What percentage is mint?
- `[error-spot · constructed · TP5 · DSKP-shaped]` A pupil says
  `1 2/5 = 120%`. Correct the reasoning and conversion.

Common traps: forgetting to convert a mixed fraction before multiplication;
multiplying numerators but not denominators; decimal-column misalignment;
decimal-point shift by the wrong number of places; treating `125%` as `0.125`;
using the part as denominator in a reverse-percentage calculation.

### C.3 钱币 · Money and financial concepts

Good weights: `table-read`, `invoice`, `word-multi`, `concept-define`,
`classify-scenario`, `compare-select`, `error-spot`, `explain-reasonableness`.

- `[compute-direct · mcq · TP3 · paper-shaped]`
  `RM986 076.05 − RM67 981.60 − RM641 892.35`.
- `[table-read/invoice · constructed · TP4 · paper-shaped]` An incomplete invoice
  shows 13 phones costing `RM21 955.70`; find one phone's price.
- `[table-read + word-multi · constructed · TP5 · paper-shaped]` A house costs
  half of `RM358 350.20`; after a stated fee and resale price, calculate the
  gain using only money operations.
- `[concept-define · constructed · TP2 · DSKP-shaped]` Explain one difference
  between simple-interest saving and compound-interest saving. **No calculation.**
- `[classify-scenario · mcq · TP2 · DSKP-shaped]` Choose whether each action is
  saving, investment, a loan, or debt.
- `[compare-select · constructed · TP4 · DSKP-shaped]` Given cash price and total
  loan price, find the difference and explain the role of interest.
- `[error-spot · constructed · TP5 · DSKP-shaped]` A character says a credit-card
  purchase is “not debt because no cash was used”. Explain the error.

**Hard rejection example:** an older worksheet asks for the balance after two
years at 3% compound interest. Its MCQ shape is valid evidence; its calculation
target is not. Replace it with a conceptual comparison or a cash-vs-loan price
difference item.

Common traps: omitting sen-place alignment; interpreting “less than” backward;
using an incomplete invoice total as a unit price; confusing interest with total
loan price; treating saving and investment as synonyms.

### C.4 时间与时刻 · Time

Good weights: `calendar`, `convert`, `compute-direct`, `timeline`, `table-read`,
`multipart`, `word-multi`, `error-spot`.

- `[calendar/figure-read · constructed · TP3 · DSKP-shaped]` Find the elapsed
  number of days between two dates; one interval crosses February in a leap year.
- `[convert · mcq · TP2 · DSKP-shaped]` `1 1/2 hours = ____ minutes`.
- `[convert · mcq · TP2 · DSKP-shaped]` `0.35 century = ____ years`.
- `[compute-direct · constructed · TP3 · DSKP-shaped]` Add `1.5 years` and
  `9 months`, giving the answer in years and months.
- `[multipart/table-read · constructed · TP4 · DSKP-shaped]` A table gives three
  project durations as fractional or decimal years. Convert each to months, then
  compare the longest and shortest.
- `[error-spot · constructed · TP5 · DSKP-shaped]` Correct a pupil who converts
  `0.4 day` to `40 hours` by treating time as base 100.

Use the older “century/decade/year” questions only for table, comparison, and
mixed-unit presentation ideas. Their multiplication/division focus is not the
new Year 5 target under the 2019 DSKP.

Common traps: base-10 instead of 60/24/12/10/100; failure to borrow/regroup mixed
units; counting both endpoints in a date interval; ignoring leap year; leaving a
non-integer answer when the conversion standard requires an integer.

### C.5 度量衡 · Measurement

Good weights: `convert`, `compute-direct`, `figure-read`, `table-read`,
`compare-select`, `reverse-given`, `word-multi`, `explain-reasonableness`.

**Length**

- `[convert · mcq · TP2 · paper-shaped]` `0.58 km = ____ m`.
- `[convert · mcq · TP3 · paper-shaped]` Express `1 1/5 m` in metres and
  centimetres.
- `[figure-read/route · constructed · TP4 · paper-shaped]` Read three route
  lengths with fraction/decimal units and find a return journey.
- `[reverse-given · constructed · TP5 · paper-shaped]` Seven scarves use
  `66.15 m`; find the length for 15 at the same rate.

**Mass and liquid volume**

- `[figure-read/packages · mcq · TP3 · paper-shaped]` Add `300 g`, `600 g`, and
  `1 2/5 kg`, answering in kilograms.
- `[explain-reasonableness · constructed · TP4 · paper-shaped]` A dozen packets
  weigh `10 kg 300 g`; decide whether one packet exceeds `0.5 kg`, with working.
- `[table-read + multipart · constructed · TP5 · paper-shaped]` Compare three
  drink volumes in litres/millilitres, find the difference, then identify which
  drink five people consumed at `0.76 ℓ` each.
- `[reverse-given · constructed · TP4 · paper-shaped]` 18 cups need `2 700 mℓ`;
  find one cup and then 50 cups in litres.

Common traps: factor 10/100/1000 confusion; keeping mixed units misaligned;
forgetting to convert before compare/add; losing the fractional component;
reporting the right number with the wrong unit.

### C.6 空间 · Space (geometry)

Good weights: `figure-read`, `measure-tool`, `composite-decompose`, `multipart`,
`solve-unknown`, `compare-select`, `error-spot`.

- `[concept-define/figure-read · mcq · TP2 · DSKP-shaped]` From four regular
  polygons, select the one with the stated number of diagonals or symmetry axes.
- `[measure-tool · constructed · TP3 · DSKP-shaped]` Measure the marked interior
  angle of a regular polygon with a protractor and record degrees.
- `[error-spot/protractor · constructed · TP4 · DSKP-shaped]` A pupil reads the
  wrong protractor scale. Identify the error and correct the angle.
- `[composite-decompose · mcq · TP3 · paper-shaped]` Find the outer perimeter of
  two joined triangles, excluding the shared edge.
- `[multipart/composite-decompose · constructed · TP4 · paper-shaped]` A joined
  rectangle and square: (i) total perimeter, (ii) total area.
- `[solve-unknown + composite-decompose · constructed · TP5 · DSKP-shaped]` Given
  the total composite perimeter, find a missing side and then the area.
- `[figure-read/composite-solid · constructed · TP4 · paper-shaped]` Add the
  volumes of a cube and cuboid after identifying their dimensions.

**Hard rejection example:** “find the shaded face area of two cubes” assesses
surface area, not Year 5 composite volume.

Common traps: counting a shared edge in the outer perimeter; adding lengths for
area; omitting `²`/`³`; confusing protractor inner and outer scales; treating a
composite solid as one bounding cuboid.

### C.7 坐标、比与比例 · Coordinates, ratio & proportion

Good weights: `coordinate-grid`, `figure-read`, `table-read`, `convert`,
`reverse-given`, `multipart`, `word-multi`.

**Coordinates**

- `[figure-read/coordinate-grid · mcq · TP3 · DSKP-shaped]` Points A and B share
  `y=5`; read their coordinates and find the horizontal distance.
- `[multipart/coordinate-grid · constructed · TP4 · DSKP-shaped]` Find the
  horizontal distance P–Q and vertical distance Q–R, then compare them.
- `[error-spot · constructed · TP4 · DSKP-shaped]` Correct a pupil who subtracts
  the y-values to find a horizontal distance.

**Ratio and proportion**

- `[figure-read/count · mcq · TP2 · paper-shaped]` Count two animal groups and
  write the part:part ratio in the requested order.
- `[convert · constructed · TP3 · DSKP-shaped]` Given red:blue = `3:5`, write
  red:all and all:blue.
- `[table-read/reverse-given · constructed · TP4 · paper-shaped]` Sugar:flour is
  `1:5`; find the flour for `45 g` sugar and sugar for `500 g` flour.
- `[word-multi · mcq · TP5 · paper-shaped]` Girls:boys is `1:3`; with 10 girls,
  find the class total rather than only the boys.
- `[compare-select · constructed · TP4 · DSKP-shaped]` Decide whether two pairs
  are proportional and justify using a unitary value.

**Hard rejection examples:** plotting a point, translating it three squares, or
using a map scale may be familiar from older worksheets, but none is the Year 5
target here. Ask axis-aligned distance or proportion instead.

Common traps: reversing ratio order; confusing part:whole with part:part;
comparing unlike units; finding one part but forgetting the requested total;
using diagonal distance when only horizontal/vertical distance is taught.

### C.8 数据处理 · Data handling

Good weights: `concept-define`, `interpret-chart`, `order-pattern`, `table-read`,
`reverse-given`, `multipart`, `error-spot`, `explain-reasonableness`.

- `[concept-define · mcq · TP1 · paper-shaped]` “数据中出现最多的数值” refers
  to mode, median, mean, or range?
- `[order-pattern · mcq · TP3 · paper-shaped]` Order five values before selecting
  the median.
- `[compute-direct · constructed · TP3 · paper-shaped]` Find mode, median, mean,
  and range for an ungrouped set of pupil heights.
- `[reverse-given · constructed · TP5 · paper-shaped]` What value must be added
  so the mean becomes `500 g`?
- `[interpret-chart/pie-chart · multipart · TP4 · DSKP-shaped]` From a pie chart
  and a total of 240 pupils: (i) find one category, (ii) find the mode category,
  (iii) calculate the range of category counts.
- `[error-spot · constructed · TP4 · DSKP-shaped]` A pupil chooses the middle
  number before ordering the data. Correct the median method.
- `[explain-reasonableness · constructed · TP5 · DSKP-shaped]` Decide whether a
  reported mean can exceed every value in the data set and justify.

**Hard rejection example:** an older worksheet asks pupils to draw a horizontal
bar chart. Construction is a Year 4 target; Year 5 should interpret a chart and
calculate statistics from ungrouped data.

Common traps: not sorting before median; choosing the most frequent *category
label* instead of its value; dividing by the wrong count; range = max + min;
reading a pie sector as a raw count without using the total.

---

## D. MCQ distractor patterns

Generate wrong options from named error models and store the model in metadata.

| Strategy | Example error |
|---|---|
| Place-value shift | `682 030` → `68 203` or `682 300` |
| Wrong rounding digit | nearest 100 000 treated as nearest 10 000 |
| Ignore brackets | evaluate multiplication before/after the wrong group |
| Wrong inverse | solve `114 × b = 342` using multiplication |
| Remainder loss | return quotient only or append remainder as decimals |
| Fraction algorithm slip | omit mixed→improper conversion; multiply whole part only |
| Decimal alignment | align final digits instead of decimal points |
| Percent scale | `125%` → `0.125`; `250%` → `25` |
| Part/whole reversal | reverse the fraction in percentage or ratio |
| Money direction | subtract “A less than B” in the wrong order |
| Unit-base error | use 10/100 rather than 60, 24, 12, 1 000 |
| Unit omission | correct magnitude but wrong `m`, `m²`, `m³`, `kg`, or `mℓ` |
| Shared-edge error | include an internal edge in composite perimeter |
| Bounding-box error | use the outer cuboid volume for a two-block solid |
| Protractor scale | read the supplementary scale value |
| Coordinate-axis swap | subtract y for horizontal distance or reverse `(x,y)` |
| Ratio-order reversal | answer blue:red when asked red:blue |
| Median-before-sort | choose the visual middle entry in the unsorted list |
| Mean denominator | divide by the wrong number of observations |
| Range operation | add maximum and minimum instead of subtracting |

Quality rules:

- Options must be distinct after formatting and unit conversion.
- Do not use “all of the above” or joke answers.
- For conceptual finance items, wrong options should be misconceptions, not
  dangerous financial advice presented as plausible truth.
- Avoid a correct option that is visibly longer or more precise than every
  distractor.
- Recompute every option independently; never create distractors by random jitter.

---

## E. Generator implications (schema note)

Suggested item shape:

```ts
type Standard5Item = {
  grade: 5;
  topic: "whole_ops" | "frac_dec_pct" | "money" | "time" |
         "measurement" | "space" | "coord_ratio" | "data";
  standard_code: string;
  tp_level: 1 | 2 | 3 | 4 | 5 | 6;
  item_format: "mcq" | "constructed-response";
  format_type: string;
  presentation: string;
  answer_type: "integer" | "decimal" | "fraction" | "percentage" |
               "money" | "measure" | "time" | "angle" | "ratio" |
               "statistic" | "short-explanation";
  requires_visual: boolean;
  scope_evidence: "dskp-2019";
  distractor_models?: string[];
  rubric?: Array<{ criterion: string; marks: number }>;
};
```

Validation gates:

1. `standard_code` exists in the Year 5 DSKP topic.
2. Numeric, operator, unit, and geometry bounds match the scope doc.
3. The requested visual contains every value needed to answer.
4. The worked solution and final answer agree; units are canonical.
5. MCQ distractors map to real error models and none is accidentally equivalent.
6. Finance standards 3.3–3.4 are conceptual except for the allowed cash/loan price
   difference and ordinary money arithmetic.
7. Coordinate items assess horizontal/vertical distance, not old plotting/movement.
8. Data items interpret charts/statistics; they do not make chart construction the
   Year 5 target.

Recommended default mix for a varied practice set: roughly one-third direct or
conversion items, one-third visual/table items, and one-third contextual or
reasoning items; include both item modes and do not let `word-multi` dominate.

---

## Sources

**Scope authority:**

1. KPM/BPK, *DSKP KSSR (Semakan 2017) Matematik Tahun 5 SJKC*, Terbitan 2019 — https://cikgulim.com/wp-content/uploads/2020/08/DSKP-KSSR-Semakan-2017-Matematik-Tahun-5-SJKC.pdf
2. Browser-readable copy of the same KPM/BPK document — https://fliphtml5.com/dsymy/qpkj/DSKP_KSSR_Semakan_2017_Matematik_Tahun_5_SJKC/
3. KPM UASA administration guide and FAQ — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf

**Format evidence (older scope; filtered and adapted):**

4. 30.com.my, SJKC Year 5 maths exercise index — https://30.com.my/sjkc-math-exercise-download/
5. 30.com.my, Year 5 final-exam revision hub — https://30.com.my/std-5-math-final-exam-revision/
6. Sample unit pages: [whole numbers](https://30.com.my/sjkc%E5%8D%8E%E5%B0%8F%E4%BA%94%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%83%E4%B8%80-1-000-000%E4%BB%A5%E5%86%85%E7%9A%84%E6%95%B4%E6%95%B0/), [mixed operations](https://30.com.my/sjkc%E5%8D%8E%E5%B0%8F%E4%BA%94%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%836-%E6%B7%B7%E5%90%88%E8%BF%90%E7%AE%97/), [percentages](https://30.com.my/sjkc%E5%8D%8E%E5%B0%8F%E4%BA%94%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%839-%E7%99%BE%E5%88%86%E6%AF%94/), [space](https://30.com.my/sjkc-standard-5-math-ch-15/), [ratio and proportion](https://30.com.my/sjkc-standard-5-math-ch-17/), [data](https://30.com.my/sjkc-standard-5-math-ch-18/).

Local research extracts: `/tmp/pokemath-std5-research/` (DSKP plus selected
objective/constructed-response PDF-to-text samples for units 1 and 6–18).
