# Standard 5 SJKC Mathematics — Question Scope (2026)

> **Purpose.** Reference material for an LLM question generator (see
> [README.md](./README.md) for shared framing). Defines what a Standard 5
> (五年级 / Tahun 5) SJKC maths question may and may not target. Treat **Hard
> constraints** as prompt guardrails and each topic's **out of scope** notes as
> negative constraints.
>
> Researched 2026-07-17. **Standard 5 is Tahap 2:** the KSSR (Semakan 2017)
> DSKP is the curriculum authority and UASA supplies the assessment frame.
> Primary curriculum source: KPM/BPK's 2019 Chinese DSKP for SJKC Mathematics
> Year 5 (publication copy linked under Sources).

---

## 1. Which curriculum applies in 2026

- Standard 5 in 2026 uses **KSSR (Semakan 2017)**. KP2027 begins with Year 1 in
  2027 and rolls upward one grade at a time, so it does not reach Year 5 in 2026.
- **No DPK Edisi 3 profile split:** DPK Edisi 3 applies to Tahap 1 (Years 1–3).
  For Year 5 the **2019 DSKP is the sole scope authority**; only the
  `sjkc_representation` language/context layer remains.
- The DSKP has **8 topics**, the same top-level structure as Standard 4. The
  content is not merely “larger Year 4”: Year 5 adds primes, bracketed mixed
  operations, multiplication/division unknowns, fraction multiplication,
  percentages above 100%, financial concepts, fraction/decimal measurement,
  composite geometry, coordinate distance, and descriptive statistics.

### Source-age warning

Many freely available “五年级数学” papers pre-date the **2019** Year 5 SJKC
DSKP. They are useful evidence for presentation formats, but not for scope. In
particular, older papers may ask pupils to **calculate compound interest, plot or
move points, use map scales, construct bar charts, or calculate surface area**.
Those are not Year 5 targets in this DSKP. Filter every practice-paper item through
sections 3 and 5 before using it as a generator example.

---

## 2. Assessment — UASA (Tahap 2)

- **UASA (Ujian Akhir Sesi Akademik / 学年末考试)** applies to Years 4–6 as the
  summative component of PBD.
- Mathematics uses one written paper. KPM supplies the standard instrument format
  and JSU (Jadual Spesifikasi Ujian); schools administer and mark the paper.
- A useful generator must support both **objective/MCQ** and
  **constructed-response** items, spread across topics and cognitive levels.
- Commercial and school papers are evidence for *how an item is presented*, not
  authority for what Year 5 may assess.

---

## 3. Hard constraints (prompt guardrails)

- **Whole numbers ≤ 1 000 000.** Include primes ≤ 100; estimates; rounding to the
  nearest **hundred-thousand**; ascending/descending patterns with steps from 1–10,
  100, 1 000, 10 000, or 100 000 (normally no more than 6 displayed terms).
- **Four operations:**
  - `+`: up to **five** numbers, sum ≤ 1 000 000.
  - `−`: up to **three** numbers, within 1 000 000.
  - `×`: up to a 6-digit number by a number ≤ 2 digits, 100, or 1 000; product
    ≤ 1 000 000.
  - `÷`: a number ≤ 1 000 000 by a number ≤ 2 digits, 100, or 1 000.
  - **Mixed operations, with or without brackets:** `+×`, `−×`, `+÷`, or `−÷`.
    Do not introduce arbitrary three-operator expressions or treat `+−` / `×÷`
    alone as the new Year 5 target.
- **Unknowns:** one letter-valued unknown in a multiplication or division sentence;
  the same numeric multiplier/divisor limits apply. No two-variable algebra.
- **Fractions:** multiply **two** values drawn from whole numbers, proper fractions,
  and mixed numbers; denominators ≤ 10. No fraction division as a Year 5 target.
- **Decimals:** round to ≤ 3 decimal places; mixed `+−`; multiply/divide by ≤2
  digits, 100, or 1 000; quotient/result ≤ 3 decimal places.
- **Percentages:** mixed number ↔ percentage; calculate a quantity from a percentage
  **and the percentage from a quantity**, including percentages ≤100% and >100%.
- **Money ≤ RM1 000 000:** four operations and the same bracketed mixed-operation
  pairs; concepts of saving, investment, simple/compound saving, loans, debt,
  appreciation/depreciation, dividend/bonus, interest, cash-vs-loan price, and
  credit-card debt. **Explain/compare these concepts; do not calculate simple or
  compound interest, dividends, or loan amortisation.**
- **Time:** elapsed time in day/hour, month/day, and year/month/day contexts;
  fraction or decimal conversions from larger to smaller units
  (hour→minute, day→hour, year→month, decade→year, century→decade/year), with an
  integer result; add/subtract fractional or decimal time quantities. Do not make
  multiplication/division of time the Year 5 target.
- **Measurement:** length (mm/cm/m/km), mass (g/kg), and liquid volume (mℓ/ℓ) with
  fractions or decimals; convert, add/subtract up to three quantities, and
  multiply/divide by ≤2 digits, 100, or 1 000. Decimal conversion answers ≤3 d.p.
- **Space:** describe regular polygons by sides, angles, symmetry axes, degrees,
  and diagonals; measure **interior angles** of regular polygons up to 8 sides with
  a protractor; perimeter/area of two-component composite plane figures; volume of
  a two-component cube/cuboid solid. No circles, surface area, or Pythagoras.
- **Coordinates, ratio & proportion:** first-quadrant **horizontal/vertical distance
  between two coordinates**; ratio `a:b` for part:part, part:whole, and whole:part
  with like units; find an unknown proportional value (including unitary method).
  No diagonal-distance formula, map scale, negative coordinates, or movement rules.
- **Data:** interpret a pie chart; determine **mode, median, mean, and range** from
  ungrouped data, including data shown in pictographs, bar charts, and pie charts.
  No grouped distributions or probability.
- **Problem solving is normal.** Every topic includes daily-life application
  problems. TP4–TP6 should use multi-step, strategy-sensitive, and non-routine
  items rather than only scaling the arithmetic.

### Cumulative-skill rule

Lower-grade skills can appear as supporting steps (for example, fraction
addition inside a longer problem), but the item's declared Year 5 target must come
from this DSKP. Never use an older paper to promote a prior-year or obsolete skill
into a Year 5 content standard.

---

## 4. SJKC representation notes (`sjkc_representation`)

- Use Mandarin instructions and Chinese mathematics terminology, with a Malay or
  English gloss in metadata when useful. Read `382 425` as
  `三十八万二千四百二十五`, not digit by digit.
- Use Malaysian **ringgit/sen** notation. Finance questions should be realistic
  but must not imply that a child should choose a real investment or loan.
- Key terms: 质数 (prime), 估算 (estimate), 近似值 (rounded value), 有括号/无括号
  (with/without brackets), 未知数 (unknown), 真分数/带分数 (proper/mixed
  fraction), 百分比 (percentage), 储蓄/投资 (saving/investment), 单利/复利
  (simple/compound interest), 贷款/负债 (loan/debt), 相隔时间 (elapsed time),
  分数/小数单位换算 (fraction/decimal unit conversion), 正多边形/内角/对角线
  (regular polygon/interior angle/diagonal), 综合图形/综合立体 (composite
  figure/solid), 横向/直向距离 (horizontal/vertical distance), 部分比整体
  (part:whole), 众数/中位数/平均数/极差 (mode/median/mean/range), 饼分图
  (pie chart).

---

## 5. DSKP core — the eight topics

Each topic lists **in scope**, **examples**, and **out of scope**. Chinese label ·
Malay label.

### 5.1 整数与基本运算 · Whole numbers & basic operations — `Nombor Bulat dan Operasi Asas`

**In scope:** read/write, place/digit value, compare, order, and sequence numbers
to **1 000 000**; primes ≤100; estimate and judge reasonableness; round to the
nearest hundred-thousand and reverse-identify possible original values; number
patterns; bounded four operations; bracketed/unbracketed `+×`, `−×`, `+÷`, `−÷`;
one unknown in multiplication or division; daily-life problems.

**Examples:** identify `97` as prime; round `752 425` to the nearest 100 000;
`23 × (29 413 + 4 190)`; find `b` in `114 × b = 342`; reconstruct the dividend
from divisor, quotient, and remainder.

**Out of scope:** numbers >1 000 000; arbitrary operator chains; exponents;
negative numbers; two unknowns or formal algebraic manipulation.

### 5.2 分数、小数与百分比 · Fractions, decimals & percentages — `Pecahan, Perpuluhan dan Peratus`

**In scope:** multiply two whole/proper/mixed fraction values (denominators ≤10);
round decimals to 3 d.p.; decimal mixed `+−`; decimal `×÷` by ≤2 digits/100/1 000;
mixed number ↔ percentage; percentage-of and reverse-percentage quantities,
including >100%; daily-life problems.

**Examples:** `23 × 1/5 = 4 3/5`; `2 1/2 × 1 3/5 = 4`; round `8.513` to 2 d.p.;
`22.783 + p − 11.18 = 13.944`; `250% = 2 1/2`; `348 × 125% = 435`.

**Out of scope:** fraction division; recurring decimals; compound percentage
growth; percentage points; interest calculations.

### 5.3 钱币 · Money — `Wang`

**In scope:** money operations ≤ **RM1 000 000**; bracketed/unbracketed `+×`,
`−×`, `+÷`, `−÷`; meanings and comparisons involving saving, investment,
simple/compound saving, appreciation/depreciation, dividend/bonus, loan, debt,
interest, cash purchase, and credit-card use; daily-life problems.

**Examples:** complete an invoice by finding unit price; compare cash and loan
prices; explain why credit-card spending creates debt; classify a scenario as
saving or investment; explain the difference between simple and compound saving.

**Out of scope:** calculating simple/compound interest or investment return;
monthly instalment/amortisation; exchange-rate calculations; tax and insurance.

### 5.4 时间与时刻 · Time — `Masa dan Waktu`

**In scope:** elapsed time in day/hour, month/day, and year/month/day contexts
(introduce leap years; the longer date spans are calculated in days); convert
fractional/decimal larger units to smaller units with integer answers; add/subtract
fractional and decimal time quantities, with or without unit conversion.

**Examples:** determine days between two dates; `1 1/2 hours = 90 minutes`;
`0.25 day = 6 hours`; `2.5 decades = 25 years`; add `1.5 years + 9 months` after
converting units.

**Out of scope:** time zones; timetable optimisation; multiplication/division as
the assessed Year 5 operation; decimal answers after unit conversion.

### 5.5 度量衡 · Measurement — `Ukuran dan Sukatan`

**In scope:** fraction/decimal conversion and operations for length
(`mm↔cm`, `cm↔m`, `m↔km`), mass (`g↔kg`), and liquid volume (`mℓ↔ℓ`); up to three
addends/subtrahends; `×÷` by ≤2 digits, 100, or 1 000; conversion answers ≤3 d.p.

**Examples:** `0.58 km = 580 m`; `1 1/5 m = 1 m 20 cm`; `2.65 km × 13`;
compare `3.8 ℓ` with `3 280 mℓ`; find a per-item mass from a dozen items.

**Out of scope:** area and solid volume here (they belong to Space); imperial
conversions; density, speed, or scientific unit notation.

### 5.6 空间 · Space (geometry) — `Ruang`

**In scope:** properties of regular polygons (sides, interior angles, axes of
symmetry, angle size, diagonals); protractor measurement of interior angles up to
regular octagons; perimeter and area of two-component composite figures made from
rectangles, squares, and the named triangle types; volume of a composite solid
made from a cube and/or cuboid.

**Examples:** measure a regular hexagon's interior angle; determine the missing
outer side before finding a composite perimeter; find the combined area of a
rectangle and right triangle; find a two-block cuboid volume.

**Out of scope:** surface area; shaded faces of a solid; circle formulae;
Pythagoras; transformations; arbitrary irregular curves.

### 5.7 坐标、比与比例 · Coordinates, ratio & proportion — `Koordinat, Nisbah dan Kadaran`

**In scope:** horizontal and vertical distance between two first-quadrant points;
write a ratio `a:b` for part:part, part:whole, or whole:part after matching units;
find an unknown in a proportion by a suitable method, including unitary method.

**Examples:** horizontal distance between `(2, 5)` and `(8, 5)` is 6 units;
3 red : 5 blue → red:all = `3:8`; if sugar:flour = `1:5`, 45 g sugar needs
225 g flour.

**Out of scope:** merely plotting points as the Year 5 target; coordinate
translations; diagonal/Euclidean distance; quadrants 2–4; map scales; direct or
inverse-proportion formulae.

### 5.8 数据处理 · Data handling — `Pengurusan Data`

**In scope:** interpret pie charts; recognise and determine mode, median, mean,
and range from **ungrouped** data; use pictographs, bar charts, or pie charts as
the data source; solve daily-life problems.

**Examples:** identify the mode of `30, 33, 35, 30, 45, 30`; order five values
before choosing the median; calculate mean and range from a bar chart; recover a
category count from a pie-chart share and total.

**Out of scope:** constructing a bar chart as the Year 5 target; grouped data,
histograms, quartiles, standard deviation, or probability.

---

## 6. Difficulty ladder (TP1–TP6 → generation difficulty)

| TP 级别 | DSKP intent | Suitable generated item |
|---|---|---|
| TP1 | 讲述 / state | read an expression; name a financial or statistical concept |
| TP2 | 解说 / explain | explain a procedure; convert a unit; describe a polygon |
| TP3 | 应用并判断合理性 | compute, measure, interpret, and check reasonableness |
| TP4 | 解答常规问题 | familiar multi-step daily-life problem |
| TP5 | 运用各种策略 | solve a routine problem using or comparing strategies |
| TP6 | 创意、创新、非常规 | non-routine/open problem with justified reasoning |

Do not equate TP with number size. A small-number proportional-reasoning item can
be TP5; a direct calculation near 1 000 000 can still be TP3.

---

## 7. Implications for the PokeMath generator (schema note)

- Year 5 needs typed answers for integers, decimals, fractions/mixed numbers,
  percentages, money, measures-with-unit, elapsed time, angles, composite
  perimeter/area/volume, coordinate distance, ratios, statistics, and short
  conceptual explanations.
- Recommended parameters: `grade`, `topic`, `standard_code`, `tp_level`,
  `item_format` (`mcq` | `constructed-response`), `format_type`,
  `answer_type`, `requires_visual`, and `sjkc_representation`.
- Store the exact DSKP learning-standard code (for example `2.3.2`, `6.3.2`, or
  `8.2.1`) on every generated item. This makes older-paper scope leakage auditable.
- Finance items need a `conceptual_only` guard for standards 3.3–3.4. Coordinate
  items need a `distance_axis` guard (`horizontal` | `vertical`). Geometry items
  should describe enough dimensions to make the answer unique.
- See [standard-5-question-style.md](./standard-5-question-style.md) for the
  format menu, visual requirements, and DSKP-filtered examples.

---

## Sources

**Curriculum and assessment:**

1. KPM/BPK, *DSKP KSSR (Semakan 2017) Matematik Tahun 5 SJKC*, Terbitan 2019 — publication-copy PDF: https://cikgulim.com/wp-content/uploads/2020/08/DSKP-KSSR-Semakan-2017-Matematik-Tahun-5-SJKC.pdf
2. Same KPM/BPK document, browser-readable mirror (84 pages) — https://fliphtml5.com/dsymy/qpkj/DSKP_KSSR_Semakan_2017_Matematik_Tahun_5_SJKC/
3. KPM UASA administration guide and FAQ (Years 4–6; standard format and JSU) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf
4. KPM, *Panduan Pengurusan PBS Edisi 1 Tahun 2025* — https://moe.gov.my/storage/files/shares/pekeliling_dan_garis_panduan/Panduan%20Pengurusan%20PBS%20Edisi%201%20Tahun%202025.pdf
5. KPM KP2027 rollout material — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf

**Question-format evidence (scope-filtered against the 2019 DSKP):**

6. 30.com.my / buxi, SJKC Year 5 maths exercise index (18 units; objective and constructed-response papers with answers) — https://30.com.my/sjkc-math-exercise-download/
7. 30.com.my, Year 5 final-exam revision hub — https://30.com.my/std-5-math-final-exam-revision/

**Local extraction artifacts** (may be cleaned by the OS):

- `/tmp/pokemath-std5-research/dskp-y5-sjkc.pdf` and `.txt`
- `/tmp/pokemath-std5-research/ch1-ex1` … `ch18-ex1` selected PDF/text pairs
