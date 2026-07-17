# Standard 6 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-6-sjkc-math.md](./standard-6-sjkc-math.md). The scope doc
says **what** a current Standard 6 question may target. This doc says **how it is
asked** so the generator produces genuine SJKC variety rather than only narrative
word problems.

> **Evidence rule.** The sampled Chinese unit sheets and exam papers are useful
> format evidence but many are UPSR-era and pre-date the **2021** Year 6 DSKP.
> Every example below is retained or adapted only when it fits a current learning
> standard. Never copy an old paper's unit label into generator metadata without
> a `standard_code` check.

## How to use for prompting

1. Pick a 2021 DSKP **topic**, **learning standard**, and **TP level**.
2. Sample a `format_type` from §A, weighted by the topic catalog in §C.
3. Pick `item_format`: `mcq` or `constructed-response` (§B).
4. Pick an answer shape and, if necessary, a visual type.
5. For MCQ, generate distractors from §D by simulating plausible pupil errors.
6. Run the finished item through the scope constraints. Reject it if its Year 6
   target is merely old-paper content such as ordinary clock reading, statistics,
   composite geometry, surface area, unscaled point movement, or numerical
   probability.

---

## A. Cross-cutting format taxonomy

| ID | Format | What the pupil does |
|---|---|---|
| `compute-direct` | Direct computation | Evaluate a horizontal or vertical expression |
| `fill-sentence` | Complete a sentence | Fill `□`, a blank, a missing operand, or a term |
| `solve-unknown` | Solve one unknown | Find a letter or missing value and verify it |
| `model-equation` | Model the story | Write the expression before solving |
| `word-single` | Single-step word problem | Choose and apply one operation or relationship |
| `word-multi` | Multi-step word problem | Chain permitted steps and representations |
| `multipart` | Structured parts | Answer `(a)(b)(c)`, often with rising difficulty |
| `table-read` | Read a table | Extract, compare, and calculate from rows/columns |
| `invoice-receipt` | Financial document | Complete or interpret an invoice, bill, or receipt |
| `figure-read` | Diagram / card / grid | Read a visual before answering |
| `dialogue` | Speech-bubble scenario | Combine or evaluate statements by characters |
| `compare-select` | Compare / verify | Select the largest, correct, equivalent, or reasonable option |
| `order-pattern` | Sequence / order | Complete a pattern or order representations |
| `convert` | Convert representation | Change whole↔million, fraction/decimal/percent, or unit form |
| `round-embed` | Rounding embedded | Compute then report to a requested precision |
| `error-spot` | Diagnose an error | Identify and correct a wrong step, label, or claim |
| `reverse-given` | Work backwards | Recover an original amount, ratio part, or missing count |
| `concept-define` | Define / distinguish | State a meaning, purpose, or difference |
| `classify-scenario` | Classify a situation | Categorise a number, finance term, or event likelihood |
| `tick-select` | Tick one or more boxes | Mark every statement or representation that applies |
| `match-connect` | Match pairs | Connect equivalent forms, terms, labels, or outcomes |
| `explain-justify` | Explain / justify | Give a reason, strategy, or reasonableness check |
| `timezone-table` | Time-zone lookup | Apply supplied offsets/differences, possibly across midnight |
| `relationship-table` | Proportional measure table | Complete pairs of related measures |
| `construct-angle` | Construct an angle | Use a protractor to draw a stated angle ≤180° |
| `construct-polygon` | Draw a regular polygon | Use a grid/software, then measure an interior angle |
| `measure-tool` | Measure with a tool | Read an angle or length using the shown instrument |
| `draw-label-circle` | Draw / label a circle | Apply centre, radius, and diameter definitions |
| `scale-coordinate` | Read a scaled grid/map | Convert axis-aligned grid separation to real distance |
| `complete-pie` | Complete a pie chart | Draw a 45°/90°/180° sector in a prepared circle |
| `interpret-chart` | Interpret a chart | Recover or compare quantities represented visually |
| `likelihood-order` | Compare likelihood | Order or classify outcomes qualitatively |

`presentation` is an independent axis, for example `plain`, `vertical_working`,
`number_cards`, `number_line`, `table`, `invoice`, `receipt`, `speech_bubbles`,
`timezone_strip`, `conversion_table`, `square_grid`, `triangle_grid`, `protractor`,
`circle_template`, `coordinate_grid`, `graphical_scale`, `pie_chart`, `spinner`,
`cards`, `beads`, or `containers`.

---

## B. The two UASA item modes

Year 6 UASA Mathematics is one written paper, but the generator needs two item
modes inside that paper.

### `mcq` / objective

- Usually four options with one best answer.
- May be multi-step, visual, or conceptual; “objective” does not mean easy.
- Options should encode recognisable misconceptions, not random nearby values.
- The stem must be self-contained. Time-zone facts, scales, tax rates, and
  financial conventions needed for a calculation must appear in the item.

### `constructed-response` / subjective

- Direct blank, working, short explanation, drawing, measurement, chart
  completion, or multipart response.
- Marks should attach to meaningful steps: representation/model, method,
  construction accuracy, answer, unit, label, or explanation.
- A rubric should accept equivalent working and mathematically equivalent forms.
- Construction items need tolerances, for example `±2°` and a reasonable line or
  radius tolerance, rather than pixel-perfect matching.

Do not call these current “试卷一” and “试卷二”. That split belongs to the sampled
older worksheets, not the current single UASA Mathematics instrument.

---

## C. Per-topic format catalog

Examples marked **paper-shaped** preserve or closely adapt the sampled SJKC
worksheet format. Examples marked **DSKP-shaped** are newly written around a 2021
learning standard. Both must pass the Standard 6 scope validator.

### C.1 整数与基本运算 · Whole numbers & basic operations

Good weights: `convert`, `order-pattern`, `compute-direct`, `fill-sentence`,
`solve-unknown`, `table-read`, `model-equation`, `word-multi`, `error-spot`.

- `[classify-scenario · mcq · TP2 · paper-shaped · 1.3.1]` 以下哪个数目是质数？
  `27, 15, 57, 73`.
- `[compute-direct · mcq · TP3 · paper-shaped/adapted · 1.2.1]` 用计算器计算
  `12 438 × 46`，再用逆运算检查答案。
- `[convert · mcq · TP2 · paper-shaped · 1.1.4–1.1.5]` 把 `7 240 000` 写成
  百万单位的小数。
- `[convert · constructed · TP2 · paper-shaped · 1.1.3–1.1.5]` 以整数写出
  `5 3/10 百万`，并说明十分位的意义。
- `[order-pattern · multipart · TP4 · paper-shaped · 1.1.2]` Complete the same
  number-card row once by repeatedly multiplying by 2 and once by subtracting
  `12 500`.
- `[table-read + word-multi · constructed · TP4 · paper-shaped · 1.4.1]` A
  table gives `2.93 million`, `2.14 million`, and `0.88 million less than A`;
  express all three as whole numbers and find the total.
- `[error-spot · constructed · TP5 · DSKP-shaped · 1.1.3]` A pupil writes
  `3/8 million = 375 000` using `3 ÷ 8 × 1 000 000`; verify and explain the
  denominator restriction.
- `[solve-unknown · constructed · TP4 · DSKP-shaped · 1.2.1]` Complete a valid
  mixed-operation sentence containing one unknown, then check by substitution.

Common traps: losing zeroes in million conversion; treating `0.47 million` as
`47 000`; confusing digit with place value; ignoring brackets; applying operation
precedence incorrectly; calling 1 prime; exceeding 10 000 000.

### C.2 分数、小数与百分比 · Fractions, decimals & percentages

Good weights: `compute-direct`, `convert`, `fill-sentence`, `reverse-given`,
`compare-select`, `error-spot`, `word-multi`, `multipart`.

**Fractions**

- `[compute-direct · mcq · TP3 · paper-shaped · 2.1.1]` `4/5 ÷ 6/7 = ____`.
- `[solve-unknown · mcq · TP3 · paper-shaped · 2.1.1]`
  `P × 3/7 = 1 1/2`; find `P`.
- `[word-single · constructed · TP3 · paper-shaped · 2.1.1]` A `2 1/7 m` pole
  is divided equally into 7 pieces. Find one piece in metres.
- `[error-spot · constructed · TP5 · DSKP-shaped · 2.1.1]` Correct a pupil who
  divides fractions by dividing numerator by numerator and denominator by
  denominator; explain “multiply by the reciprocal”.

**Decimals and percentages**

- `[compute-direct · mcq · TP3 · paper-shaped · 2.4.1]`
  `0.871 × 0.9 ÷ 0.3 = ____`.
- `[compare-select · mcq · TP4 · paper-shaped · 2.4.1]` Four expressions
  are shown; choose the one whose value is different from `5.86 × 0.3 ÷ 0.6`.
- `[round-embed · constructed · TP3 · DSKP-shaped · 2.2.2]` Divide two decimals,
  report the answer to 3 d.p., and name the rounding digit.
- `[convert · match-connect · TP2 · DSKP-shaped · 2.3.1]` Match `1.25`, `125%`,
  `0.375`, and `37.5%`.
- `[compute-direct · constructed · TP3 · DSKP-shaped · 2.3.2]` Calculate
  `162.5% − 48.75%`.
- `[reverse-given · constructed · TP4 · DSKP-shaped · 2.3.3]` `1.44 kg` is
  `120%` of what decimal mass?
- `[model-equation + word-multi · constructed · TP5 · DSKP-shaped · 2.4.1]`
  Model a context using fractions and decimals with exactly two operation types,
  then solve using correct precedence.

Common traps: failing to invert the divisor; inverting both fractions; mixed→
improper conversion errors; decimal-point shift; rounding too early; `125% =
0.125`; confusing percentage addition with percentage-of-quantity; using three
different operation types in a supposedly valid `2.4.1` item.

### C.3 钱币 · Money, commerce, insurance & takaful

Good weights: `invoice-receipt`, `table-read`, `compute-direct`, `reverse-given`,
`concept-define`, `classify-scenario`, `compare-select`, `word-multi`,
`explain-justify`.

- `[compare-select/table · mcq · TP3 · paper-shaped · 3.1.2]` Choose the row in
  which cost, selling price, profit, and loss agree.
- `[reverse-given · mcq · TP3 · paper-shaped · 3.1.2]` Net assets are
  `RM752 800` and liabilities are `RM314 000`; find assets.
- `[invoice-receipt · constructed · TP4 · paper-shaped · 3.1.1–3.1.2]` Complete
  missing unit price, subtotal, discount, service tax, and final total on an
  invoice.
- `[word-multi · constructed · TP4 · paper-shaped · 3.1.2]` Apply a stated
  discount to four shirts, then find the amount saved and price paid.
- `[compute-direct · constructed · TP4 · DSKP-shaped · 3.1.2]` A supplied
  principal, annual simple-interest rate, and duration are given; calculate
  interest and final amount using the convention stated in the stem.
- `[reverse-given · constructed · TP5 · DSKP-shaped · 3.1.2]` A dividend plus
  original investment is known; recover the dividend rate, with every term
  defined in the question.
- `[concept-define · constructed · TP2 · DSKP-shaped · 3.2.1]` State one
  similarity and one difference between insurance and takaful at primary-school
  level.
- `[explain-justify · constructed · TP4 · DSKP-shaped · 3.2.2]` Explain why
  protecting a fictional family's home or shop asset reduces financial risk.

Common traps: reversing cost and selling price; profit = cost − selling price;
applying a discount as an added charge; applying tax before/after discount against
the stated order; calculating interest for the wrong duration; assets = net
assets − liabilities; treating insurance as guaranteed profit.

### C.4 时间与时刻 · Time zones

Good weights: `timezone-table`, `table-read`, `figure-read`, `multipart`,
`word-multi`, `reverse-given`, `error-spot`, `explain-justify`.

- `[timezone-table · mcq · TP3 · paper-shaped · 4.1.2]` 吉隆坡比迪拜快 4 小时。
  吉隆坡是下午 1 时，迪拜是什么时刻？
- `[timezone-table · constructed · TP3 · DSKP-shaped · 4.1.1]` A supplied map
  shows two zones within one fictional country; explain why two cities there can
  show different local times.
- `[number_line + multipart · constructed · TP4 · DSKP-shaped · 4.1.2]` Mark
  City A and City B on a time strip, find the difference, then convert a meeting
  time from A to B.
- `[word-multi · constructed · TP5 · DSKP-shaped · 4.2.1]` A flight departs at
  `2215`, lasts 5 h 40 min, and the destination is 3 hours behind. Find local
  arrival time and date from only the supplied facts.
- `[error-spot · constructed · TP4 · DSKP-shaped · 4.2.1]` Correct a pupil who
  adds the zone difference when travelling to a city that is behind.

Use old clock-face and elapsed-date layouts only as supporting presentation.
They are not current Year 6 targets by themselves.

Common traps: adding instead of subtracting an offset; mixing a.m./p.m. with
24-hour notation; failing to cross midnight; changing the date in the wrong
direction; importing daylight-saving information not stated in the item.

### C.5 度量衡 · Measurement relationships

Good weights: `relationship-table`, `convert`, `table-read`, `reverse-given`,
`compare-select`, `word-multi`, `error-spot`, `explain-justify`.

- `[relationship-table · mcq · TP3 · paper-shaped/adapted · 5.1.1]` `5 m` of
  cable has mass `130 g`; find the mass of `16 m` after finding the mass per metre.
- `[word-multi · constructed · TP4 · paper-shaped/adapted · 5.1.1]` `60 g` of
  flowers makes `3 ℓ` of tea; find the mass needed for `1 ℓ` per day in April.
- `[relationship-table · multipart · constructed · TP4 · DSKP-shaped · 5.1.1]`
  Complete a table relating fabric length and dye volume, then find the amount
  needed for a non-unit quantity.
- `[reverse-given · constructed · TP5 · DSKP-shaped · 5.1.1]` A mass of drink
  concentrate produces a stated liquid volume; recover the concentrate needed
  for another volume after one unit conversion.
- `[compare-select · mcq · TP4 · DSKP-shaped · 5.1.1]` Three cable brands state
  length and mass. Choose the heaviest for an equal length and justify using a
  common unit length.
- `[error-spot · constructed · TP5 · DSKP-shaped · 5.1.1]` Diagnose a solution
  that compares `kg per m` with `g per cm` without converting units.

Common traps: assuming additive rather than proportional change; finding the unit
rate but not scaling back up; mixing g/kg or mℓ/ℓ; treating a relationship as a
formal density/speed formula; reporting the wrong quantity or unit.

### C.6 空间 · Geometry construction and circles

Good weights: `construct-angle`, `construct-polygon`, `draw-label-circle`,
`figure-read`, `measure-tool`, `error-spot`, `multipart`, `explain-justify`.

- `[construct-angle · constructed · TP3 · DSKP-shaped · 6.1.2]` 利用量角器画
  一个 `135°` 的角，并标上顶点和两条边。
- `[construct-polygon · multipart · constructed · TP4 · DSKP-shaped · 6.1.1]`
  Draw a regular hexagon on an equilateral-triangle grid, measure one interior
  angle, then compare it with a square's interior angle.
- `[error-spot/protractor · constructed · TP5 · DSKP-shaped · 6.1.2]` A pupil
  starts from the wrong zero scale. Identify the mistake and redraw the angle.
- `[figure-read · mcq · TP2 · DSKP-shaped · 6.2.1]` Select the segment that is a
  diameter rather than a radius or chord from a labelled circle.
- `[draw-label-circle · constructed · TP3 · DSKP-shaped · 6.2.2]` 画一个半径
  `3 cm` 的圆，并标示圆心、半径和直径。
- `[explain-justify · constructed · TP4 · DSKP-shaped · 6.2.1–6.2.2]` Explain
  why every diameter passes through the centre and equals two radii.

**Hard rejection examples:** sampled worksheets ask for composite perimeter,
composite area, composite volume, and surface area. Those visuals are not evidence
for the current Year 6 targets. Replace them with polygon/angle construction or
centre-radius-diameter work. Do not ask for circle area or circumference.

Common traps: wrong protractor scale; vertex not at the centre mark; polygon sides
not regular; measuring an exterior angle; radius/diameter confusion; drawing a
diameter that misses the centre; introducing π.

### C.7 坐标、比与比例 · Scaled coordinates, ratio & proportion

Good weights: `scale-coordinate`, `figure-read`, `table-read`, `convert`,
`reverse-given`, `multipart`, `word-multi`, `error-spot`.

**Coordinates with scale**

- `[scale-coordinate · mcq · TP3 · paper-shaped/adapted · 7.1.1]` Points P and
  Q are 4 horizontal grid units apart; the explicit scale is `1 unit = 2 km`.
  Find the real horizontal distance.
- `[scale-coordinate/graphical-scale · multipart · constructed · TP4 ·
  DSKP-shaped · 7.1.1]` Read horizontal and vertical separations on a first-
  quadrant map, convert each using the graphical scale, and state directions.
- `[error-spot · constructed · TP5 · DSKP-shaped · 7.1.1]` Correct a pupil who
  uses diagonal straight-line distance when the question asks for horizontal and
  vertical distances.

**Ratio and proportion**

- `[compute-direct · mcq · TP3 · paper-shaped · 7.2.1]` Simplify the ratio of
  `225` male residents to `175` female residents.
- `[figure-read/count · constructed · TP3 · paper-shaped · 7.2.1]` Count two
  groups, write the requested ratio in the correct order, and simplify it.
- `[reverse-given · mcq · TP4 · paper-shaped · 7.3.1]` Apples:oranges is `2:3`;
  there are 72 apples. Find the oranges.
- `[multipart · constructed · TP4 · paper-shaped · 7.3.1]` Red:white is `3:2`
  and the total is 120; find each quantity and verify the sum.
- `[word-multi · constructed · TP5 · DSKP-shaped · 7.4.1]` Apply a recipe ratio
  after converting unlike units, then determine two ingredient quantities.

**Hard rejection example:** the old coordinate sheets ask pupils to move left or
right by unscaled units and recover a point. Adapt the grid format by adding an
explicit scale and asking for axis-aligned real-world distance.

Common traps: ignoring the scale; applying `1:100 000` as `1:100`; swapping x/y;
using a diagonal; reversing ratio order; leaving a ratio unsimplified; confusing
part:part with part:whole; forgetting that ratio parts must sum to the total.

### C.8 数据处理与可能性 · Pie charts and qualitative likelihood

Good weights: `complete-pie`, `interpret-chart`, `classify-scenario`,
`likelihood-order`, `compare-select`, `reverse-given`, `multipart`,
`explain-justify`.

**Pie charts**

- `[complete-pie · constructed · TP3 · DSKP-shaped · 8.1.1]` A prepared circle
  shows half the class as sports. Complete a `90°` reading sector for 10 of 40
  pupils, label it, and state the remaining quantity.
- `[interpret-chart · mcq · TP3 · paper-shaped/adapted · 8.1.1]` A `90°` sector
  represents reference books; find its percentage or count from a supplied total.
- `[reverse-given + complete-pie · multipart · constructed · TP5 · DSKP-shaped ·
  8.1.1]` Recover a missing category from the total, decide whether its sector is
  45°/90°/180°, then complete the prepared chart.

**Likelihood**

- `[classify-scenario · mcq · TP2 · paper-shaped · 8.2.1]` 从只有绿豆的罐子里
  取出一颗红豆。发生的可能性是什么？
- `[compare-select · mcq · TP3 · paper-shaped · 8.2.2]` Given counts of coloured
  cards, choose the correct “可能性小 / 可能性相同 / 可能性大” statement.
- `[likelihood-order · constructed · TP4 · DSKP-shaped · 8.2.2]` Place five
  described events from impossible to certain and give a reason for two.
- `[reverse-given · constructed · TP5 · paper-shaped · 8.3.1]` There are 27
  apple sweets and 33 strawberry sweets. Find how many apple sweets to add so the
  two outcomes are equally likely.
- `[explain-justify · constructed · TP5 · DSKP-shaped · 8.3.1]` Two bags contain
  different totals. Decide which makes blue more likely without converting to a
  numerical probability, and justify by relative counts.

**Hard rejection examples:** mean/median/mode/range belong to Year 5, while
numerical probability is not a Year 6 target. A current item may use counts to
justify a qualitative category but must not ask for `P(red) = 5/18`.

Common traps: sector angle not proportional to quantity; using a full circle
other than 360°; drawing from the circle edge instead of the centre; “possible”
confused with “likely”; equal raw counts misread when totals differ; expressing
the final likelihood numerically.

---

## D. MCQ distractor patterns

Generate wrong options from named error models and store the model in metadata.

| Strategy | Example error |
|---|---|
| Million place shift | `7.24 million` → `724 000` or `72 400 000` |
| Unsupported fraction conversion | denominator treated as a decimal place count |
| Prime/composite boundary | classify `1` as prime |
| Operation precedence | calculate strictly left-to-right or ignore brackets |
| Fraction reciprocal | invert the dividend, both fractions, or neither |
| Mixed-fraction conversion | multiply/divide only the whole-number parts |
| Decimal placement | decimal product/quotient off by ×10 or ×100 |
| Premature rounding | round an intermediate decimal before the final result |
| Percent scale | `125%` → `0.125`; add `%` values as raw whole numbers |
| Profit/loss direction | cost − selling price labelled profit |
| Discount/tax base | apply a percentage to the wrong base amount |
| Asset equation | assets = net assets − liabilities |
| Time-zone sign | add when destination is behind; subtract when ahead |
| Midnight rollover | correct clock time but wrong day/date |
| Relationship inversion | use mass per length when length per mass is needed |
| Unit mismatch | compare g with kg or mℓ with ℓ without conversion |
| Protractor scale | read the supplementary scale value |
| Radius/diameter | use radius as diameter or draw a chord off-centre |
| Scale omission | return grid units instead of real distance |
| Coordinate-axis swap | use vertical separation for horizontal distance |
| Ratio-order reversal | answer blue:red when asked red:blue |
| Ratio not simplified | give an equivalent but non-simplest ratio |
| Pie-sector mapping | map 1/4 to 45° or 1/8 to 90° |
| Likelihood language | choose “certain” merely because an outcome is most common |
| Equal-likelihood count | compare totals rather than target-category proportions |

Quality rules:

- Options must be distinct after simplification, formatting, and unit conversion.
- Do not use “all of the above” or joke answers.
- Time-zone options should differ through genuine offset/rollover errors.
- Finance distractors must be misconceptions, not unsafe financial advice.
- Avoid making the correct option visibly longer or more precise than the rest.
- Recompute every option independently; never use random numeric jitter.

---

## E. Generator implications (schema note)

Suggested item shape:

```ts
type Standard6Item = {
  grade: 6;
  topic: "whole_ops" | "frac_dec_pct" | "money" | "time_zones" |
         "measurement_relations" | "space" | "coord_ratio" |
         "data_likelihood";
  standard_code: string;
  tp_level: 1 | 2 | 3 | 4 | 5 | 6;
  item_format: "mcq" | "constructed-response";
  format_type: string;
  presentation: string;
  answer_type: "integer" | "decimal" | "fraction" | "percentage" |
               "money" | "time" | "measure" | "angle" | "drawing" |
               "circle-labels" | "scaled-distance" | "ratio" |
               "pie-sector" | "likelihood" | "short-explanation";
  requires_visual: boolean;
  scope_evidence: "dskp-2021";
  distractor_models?: string[];
  rubric?: Array<{ criterion: string; marks: number }>;
  tolerance?: { kind: "angle-degrees" | "length"; plusMinus: number };
};
```

Validation gates:

1. `standard_code` exists in the 2021 Year 6 DSKP topic.
2. Whole numbers stay ≤10 000 000; million fractions use only denominators
   2/4/5/8/10; fraction-operation denominators stay ≤10.
3. Decimal answers use ≤3 d.p.; mixed expressions use exactly two different
   basic operation types.
4. Finance calculations state the rate, base, duration, and calculation order;
   insurance/takaful prompts remain educational and non-advisory.
5. Time-zone items supply every offset/difference and handle date rollover.
6. Measurement items state a proportional relationship and do not silently test
   formal density, speed, or flow formulae.
7. Geometry items assess regular-polygon/angle construction or circle parts, not
   composite geometry, surface area, circumference, or circle area.
8. Coordinate items require an explicit scale and axis-aligned distance.
9. Pie completion uses a prepared circle/centre and only 45°/90°/180° target
   sectors; likelihood remains qualitative.
10. The worked solution, rubric, units, labels, and final answer agree. MCQ
    distractors map to real error models and are not accidentally equivalent.

Recommended mix for a varied practice set: about one-quarter direct/conversion,
one-quarter visual/construction, one-quarter table/document, and one-quarter
contextual/reasoning. Include both item modes; do not let narrative problems or
old-paper formats dominate.

---

## Sources

**Scope authority:**

1. KPM/BPK, *DSKP KSSR (Semakan 2017) Matematik Tahun 6 SJKC*, Terbitan 2021 — historical BPK URL (currently unavailable): https://bpk.moe.gov.my/index.php/terbitan-bpk/kurikulum-sekolah-rendah/category/524-dskp-tahun-6?download=4726%3Adskp-kssr-semakan-2017-matematik-tahun-6-sjkc
2. Browser-readable publication copy, pages 1–50 — https://anyflip.com/iqzwk/dxzg/basic
3. Browser-readable publication copy, pages 51–80 — https://anyflip.com/iqzwk/dxzg/basic/51-80
4. KPM UASA administration guide and FAQ — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf

**Format evidence (older scope; filtered and adapted):**

5. 30.com.my, SJKC Year 6 maths unit index — https://30.com.my/sjkc-math-std-6/
6. Sample unit pages: [whole numbers](https://30.com.my/sjkc%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7%e6%95%b0%e5%ad%a6-%e5%8d%95%e5%85%831-%e6%95%b4%e6%95%b0%e4%b8%8e%e8%bf%90%e7%ae%97/), [fractions](https://30.com.my/%E5%85%AD%E5%B9%B4%E7%BA%A7/sjkc%E5%8D%8E%E5%B0%8F%E5%85%AD%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%832-%E5%88%86%E6%95%B0/), [money](https://30.com.my/sjkc%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7%e6%95%b0%e5%ad%a6-%e5%8d%95%e5%85%835-%e9%92%b1%e5%b8%81/), [time](https://30.com.my/%E5%85%AD%E5%B9%B4%E7%BA%A7/sjkc%E5%8D%8E%E5%B0%8F%E5%85%AD%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%836-%E6%97%B6%E9%97%B4%E4%B8%8E%E6%97%B6%E5%88%BB/), [space](https://30.com.my/%E5%85%AD%E5%B9%B4%E7%BA%A7/sjkc%E5%8D%8E%E5%B0%8F%E5%85%AD%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%838-%E7%A9%BA%E9%97%B4/), [coordinates](https://30.com.my/%E5%85%AD%E5%B9%B4%E7%BA%A7/sjkc%E5%8D%8E%E5%B0%8F%E5%85%AD%E5%B9%B4%E7%BA%A7%E6%95%B0%E5%AD%A6-%E5%8D%95%E5%85%839-%E5%9D%90%E6%A0%87/), [ratio](https://30.com.my/%e5%85%ad%e5%b9%b4%e7%ba%a7/sjkc%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7%e6%95%b0%e5%ad%a6-%e5%8d%95%e5%85%8310-%e6%af%94%e4%b8%8e%e6%af%94%e4%be%8b/), [data](https://30.com.my/%e5%85%ad%e5%b9%b4%e7%ba%a7/sjkc%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7%e6%95%b0%e5%ad%a6-%e5%8d%95%e5%85%8311-%e6%95%b0%e6%8d%ae%e5%a4%84%e7%90%86/), and [likelihood](https://30.com.my/%e5%85%ad%e5%b9%b4%e7%ba%a7/sjkc%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7%e6%95%b0%e5%ad%a6-%e5%8d%95%e5%85%8312-%e5%8f%af%e8%83%bd%e6%80%a7/).

Local research extracts: `/tmp/pokemath-std6-research/` (one selected
objective/constructed-response PDF-to-text sample per unit plus source metadata).
