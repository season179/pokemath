# Standard 6 SJKC Mathematics — Question Scope (2026)

> **Purpose.** Reference material for an LLM question generator (see
> [README.md](./README.md) for shared framing). Defines what a Standard 6
> (六年级 / Tahun 6) SJKC maths question may and may not target. Treat **Hard
> constraints** as prompt guardrails and each topic's **out of scope** notes as
> negative constraints.
>
> Researched 2026-07-17. **Standard 6 is Tahap 2:** the KSSR (Semakan 2017)
> DSKP is the curriculum authority and UASA supplies the assessment frame.
> Primary curriculum source: KPM/BPK's Chinese DSKP for SJKC Mathematics Year 6,
> **Terbitan 2021** (publication copy linked under Sources).

---

## 1. Which curriculum applies in 2026

- Standard 6 in 2026 uses **KSSR (Semakan 2017)**. KP2027 starts with Year 1 in
  2027 and rolls upward one grade per year, so it does not reach Year 6 in 2026.
- **No DPK Edisi 3 profile split:** DPK Edisi 3 applies to Tahap 1 (Years 1–3).
  For Year 6 the DSKP is the sole scope authority; only the
  `sjkc_representation` language/context layer remains.
- The governing Year 6 document is **Terbitan 2021**, introduced for the 2022
  Year 6 cohort. Do not copy the Year 5 document's 2019 publication date onto
  Year 6 metadata.
- The DSKP has **8 topics**. Year 6 adds numbers expressed in millions, fraction
  division, decimal-by-decimal operations, mixed arithmetic with two operation
  types, commercial arithmetic, insurance/takaful, time zones, cross-measure
  relationships, geometric construction, scaled coordinates, pie-chart
  completion, and qualitative likelihood.

### Source-age warning

Many downloadable “六年级数学” papers are UPSR-era or otherwise pre-date the
2021 Year 6 DSKP. Their layouts and Chinese phrasing are useful format evidence,
but their topic labels are not scope authority. In particular, older unit sheets
may target ordinary clock reading, date duration, statistics, composite area and
volume, surface area, point movement, or descriptive statistics as if these were
new Year 6 standards. Those can appear only as supporting prior knowledge.
Filter every paper item through sections 3 and 5.

---

## 2. Assessment — UASA (Tahap 2)

- **UASA (Ujian Akhir Sesi Akademik / 学年末考试)** applies to Years 4–6 as the
  summative component of PBD.
- Mathematics uses one written paper. KPM supplies the standard instrument format
  and JSU (Jadual Spesifikasi Ujian); schools administer and mark the paper.
- A generator must support both **objective/MCQ** and **constructed-response**
  items, distributed across content and cognitive levels.
- Old “试卷一 / 试卷二” and UPSR papers are presentation evidence only. Do not
  describe the current UASA instrument as two separate Mathematics papers.

---

## 3. Hard constraints (prompt guardrails)

- **Whole numbers ≤ 10 000 000.** Read, write, represent, compare, order, and
  sequence them. Include values expressed as:
  - a whole number;
  - a fraction of a million whose denominator is `2`, `4`, `5`, `8`, or `10`;
  - a decimal of a million to at most 3 decimal places.
  Convert these million-unit forms to whole numbers and back. “Billion” and
  “trillion” may be mentioned for awareness, but are not computational targets.
- **Whole-number and million-unit operations:** use the four basic operations,
  including bracketed or unbracketed mixed operations and a single unknown.
  Keep all quantities and final answers within 10 000 000. Preserve ordinary
  primary-school arithmetic; do not infer Year 5's exact operand-count and
  multiplier limits where the Year 6 DSKP does not restate them.
- **Prime/composite:** classify integers ≤100. `0` and `1` are neither prime nor
  composite.
- **Fractions:** multiply and **divide** two values drawn from whole numbers,
  proper fractions, and mixed numbers; denominators ≤10.
- **Decimals:** decimal × decimal and decimal ÷ decimal, with answers to at most
  3 decimal places.
- **Percentages:** decimal ↔ percentage including >100%; add and subtract
  percentages; determine a percentage from decimal quantities and determine a
  decimal quantity from a percentage, including >100%.
- **Mixed number operations:** combine integers, decimals, and fractions, with or
  without brackets, using exactly **two different basic operation types** in one
  expression. Convert representations as needed; do not create free-form
  three- or four-operation chains.
- **Money and commerce:** recognise and calculate cost, selling price, profit,
  loss, discount, rebate, interest, dividend, and service tax; interpret vouchers,
  bills, receipts, invoices, assets, and liabilities. Unlike Year 5, **interest,
  dividend, and service-tax calculations are in scope** when all terms and the
  calculation convention are supplied.
- **Insurance and takaful:** know what they are and explain the purpose and
  importance of financial protection. Do not require policy selection, actuarial
  pricing, premiums, excess, claims law, or real financial advice.
- **Time zones:** identify time zones and determine the time difference between
  cities in different zones. A country may have more than one zone. Supply every
  needed offset or city-to-city difference; do not depend on live daylight-saving
  knowledge.
- **Measurement relationships:** solve daily-life proportional relationships
  involving (i) length and mass, (ii) length and liquid volume, or (iii) mass and
  liquid volume. State the relationship in the item. Do not introduce density,
  speed, flow rate, or scientific formulae as formal targets.
- **Geometry construction:** draw regular polygons up to 8 sides on a square or
  equilateral-triangle grid (or suitable software), then measure the resulting
  interior angles. Draw an angle from a given value ≤180°.
- **Circles:** identify and label centre, radius, and diameter; draw a circle from
  a given radius. A full turn is 360°. No circumference or area formulae.
- **Coordinates with scale:** first quadrant only. Use a stated numeric, verbal,
  or graphical scale to determine horizontal and vertical real-world distances
  between two positions. No diagonal-distance formula.
- **Ratio and proportion:** express the ratio of two integer quantities in
  simplest form and find one or two proportional quantities from a given ratio.
- **Data:** complete a pie chart using sectors of `45°`, `90°`, or `180°` and
  given quantities, then interpret it. Supply a circle and centre for completion.
- **Likelihood:** possible/impossible and the five qualitative categories
  impossible, unlikely, equally likely, likely, and certain, with reasons. Do not
  calculate numerical probability as fractions, decimals, or percentages.
- **Problem solving is normal.** Every topic includes daily-life application.
  TP4–TP6 should use multi-step, strategy-sensitive, and non-routine items rather
  than only larger numbers.

### Cumulative-skill rule

Lower-grade knowledge may support a Year 6 problem, but its declared target must
be a 2021 Year 6 learning standard. For example, a time-zone problem may require
24-hour notation, and a scaled-coordinate problem may require subtraction. Do
not relabel plain elapsed time, mean/median/mode/range, composite geometry, or
unscaled coordinate movement as new Year 6 content.

---

## 4. SJKC representation notes (`sjkc_representation`)

- Use Mandarin instructions and Chinese mathematical terminology, with a Malay or
  English gloss in metadata when useful. Read `7 240 000` as `七百二十四万` and
  `7.24 million` as `7.24 百万`.
- Use Malaysian **ringgit/sen** notation and locally plausible receipts, vouchers,
  taxes, and invoices. Financial examples must be fictional and educational.
- For time zones, state offsets or differences inside the item so it remains
  deterministic over time.
- Key terms: 百万单位的分数/小数 (fraction/decimal in millions), 合数
  (composite), 分数除法 (fraction division), 两种基本运算 (two different basic
  operations), 成本/售价/盈利/亏损 (cost/selling price/profit/loss), 折扣/回扣
  (discount/rebate), 利息/股息/服务税 (interest/dividend/service tax), 资产/负债
  (asset/liability), 保险/伊斯兰保险 (insurance/takaful), 时区/时差 (time
  zone/time difference), 长度与质量/液体体积的关系 (measurement relationship),
  正多边形/内角 (regular polygon/interior angle), 圆心/半径/直径
  (centre/radius/diameter), 比例尺 (scale), 最简比 (simplest ratio), 完成饼分图
  (complete a pie chart), 不可能/可能性小/可能性相同/可能性大/一定发生
  (impossible/unlikely/equally likely/likely/certain).

---

## 5. DSKP core — the eight topics

Each topic lists **in scope**, **examples**, and **out of scope**. Chinese label ·
Malay label.

### 5.1 整数与基本运算 · Whole numbers & basic operations — `Nombor Bulat dan Operasi Asas`

**Learning standards:** `1.1.1`–`1.1.5`, `1.2.1`, `1.3.1`, `1.4.1`.

**In scope:** numbers ≤10 000 000; patterned sequences; fractions of a million
with denominators 2/4/5/8/10; decimals of a million ≤3 d.p.; conversions between
million-unit forms and whole numbers; basic and mixed operations, brackets and a
single unknown; primes/composites ≤100; daily-life problems.

**Examples:** `7.24 百万 = 7 240 000`; `5 3/10 百万 = 5 300 000`; continue a
sequence by repeatedly multiplying by 2; evaluate a bracketed expression with a
million-unit decimal; find the missing value and verify it; classify `73` as
prime and `57` as composite.

**Out of scope:** computation beyond 10 000 000; fractions of a million with an
unsupported denominator; negative numbers; exponents; simultaneous equations;
calculating with billions or trillions.

### 5.2 分数、小数与百分比 · Fractions, decimals & percentages — `Pecahan, Perpuluhan dan Peratus`

**Learning standards:** `2.1.1`, `2.2.1`–`2.2.2`, `2.3.1`–`2.3.3`, `2.4.1`,
`2.5.1`.

**In scope:** multiplication and division of two whole/proper/mixed fraction
values (denominators ≤10); decimal-by-decimal multiplication/division (answer
≤3 d.p.); decimal ↔ percentage >100%; percentage addition/subtraction;
part/whole percentage relationships using decimal quantities; mixed integer,
decimal, and fraction expressions using exactly two operation types.

**Examples:** `4/5 ÷ 6/7 = 14/15`; `0.871 × 0.9 ÷ 0.3 = 2.613`; convert `1.35`
to `135%`; `162.5% − 48.75%`; determine the original decimal quantity when 125%
is given; evaluate `3/4 + 1.2 × 2` using correct precedence.

**Out of scope:** recurring decimals; algebraic percentage equations; compound
growth unless framed under the supplied Year 6 money standard; an expression
whose design target is three or four distinct operations.

### 5.3 钱币 · Money — `Wang`

**Learning standards:** `3.1.1`–`3.1.2`, `3.2.1`–`3.2.2`, `3.3.1`.

**In scope:** meaning and calculation of cost, selling price, profit, loss,
discount, rebate, interest, dividend, and service tax; vouchers, bills, receipts,
invoices, assets, and liabilities; basic understanding and importance of
insurance/takaful; financial-management and risk problems.

**Examples:** recover cost from selling price and profit; apply a 30% discount;
calculate a stated service tax; use a supplied simple-interest convention;
complete an invoice; find assets from net assets and liabilities; explain how
insurance/takaful protects assets and contributors.

**Out of scope:** unstated compound-frequency conventions; amortisation tables;
credit scores; exchange rates not supplied; policy comparison or recommendation;
actuarial probability; tax law beyond a fully stated classroom calculation.

### 5.4 时间与时刻 · Time — `Masa dan Waktu`

**Learning standards:** `4.1.1`–`4.1.2`, `4.2.1`.

**In scope:** know that places use time zones; recognise that some countries have
multiple zones; determine time differences between cities; solve daily-life
time-zone problems, including crossing midnight or a date boundary.

**Examples:** Kuala Lumpur is 4 hours ahead of a fictional City D; find the local
time there; compare three cities from a supplied offset table; find arrival time
after adding travel time and applying a stated zone difference.

**Out of scope:** memorising current global offsets; daylight-saving rules; the
International Date Line unless all rules are supplied; ordinary clock reading or
date duration as the sole Year 6 target.

### 5.5 度量衡 · Measurement relationships — `Ukuran dan Sukatan`

**Learning standard:** `5.1.1`.

**In scope:** daily-life relationships between length and mass, length and liquid
volume, and mass and liquid volume. Find a corresponding quantity through a
stated constant relationship, including multi-step comparisons and unit
conversion.

**Examples:** 5 m of cable has mass 1.3 kg—find 16 m; 3 m of fabric requires
1.2 ℓ dye—find the dye for 7.5 m; 750 g concentrate makes 4.5 ℓ drink—find the
volume from 2 kg after converting units.

**Out of scope:** presenting density, speed, pressure, or flow as formal formulae;
imperial units; scientific notation; unsupported nonlinear relationships.

### 5.6 空间 · Space (geometry) — `Ruang`

**Learning standards:** `6.1.1`–`6.1.2`, `6.2.1`–`6.2.2`, `6.3.1`.

**In scope:** draw regular polygons up to 8 sides on suitable grids/software and
measure their interior angles; construct an angle ≤180°; identify centre, radius,
and diameter; draw and label a circle from a stated radius; daily-life geometry
problems.

**Examples:** draw a regular hexagon on an equilateral-triangle grid and measure
one interior angle; construct `135°`; label centre O, radius OP, and diameter PQ;
draw a circle of radius 3 cm and explain why its diameter is 6 cm.

**Out of scope:** circumference/area of a circle; arcs, sectors, tangents, or π
calculations; surface area; composite perimeter/area/volume as a Year 6 target;
angles >180° for construction.

### 5.7 坐标、比与比例 · Coordinates, ratio & proportion — `Koordinat, Nisbah dan Kadaran`

**Learning standards:** `7.1.1`, `7.2.1`, `7.3.1`, `7.4.1`.

**In scope:** horizontal and vertical real-world distance between first-quadrant
positions using a stated scale (`1 cm = 1 km`, `1:100 000`, or graphical); ratios
of two integer quantities in simplest form; derive one or two proportional
quantities from a given ratio; daily-life problems.

**Examples:** points differ by 4 grid units and each unit represents 2 km—find
8 km; interpret `1:100 000`; simplify `225:175` to `9:7`; if red:blue is `3:5`
and there are 64 objects, find both quantities.

**Out of scope:** diagonal/Euclidean distance; negative coordinates or quadrants
2–4; latitude/longitude; gradients; direct/inverse-proportion formulae; area-scale
or volume-scale factors.

### 5.8 数据处理与可能性 · Data handling & likelihood — `Pengurusan Data dan Kebolehjadian`

**Learning standards:** `8.1.1`, `8.2.1`–`8.2.2`, `8.3.1`.

**In scope:** complete and interpret a pie chart using 45°/90°/180° sectors and
given quantities; state whether an event is possible or impossible; classify and
justify events as impossible, unlikely, equally likely, likely, or certain; solve
daily-life problems.

**Examples:** complete a prepared circle when 1/4 of 40 pupils choose music;
recover a quantity from a 90° sector; classify drawing a red bead from an all-green
jar as impossible; compare coloured-card counts and justify “likely”; determine a
missing count that makes two outcomes equally likely.

**Out of scope:** numerical probability fractions/decimals/percentages; sample
spaces, tree diagrams, independent/dependent events, expected value; mean,
median, mode, and range as the declared Year 6 target; constructing bar charts.

---

## 6. Difficulty ladder (TP1–TP6 → generation difficulty)

| TP 级别 | DSKP intent | Suitable generated item |
|---|---|---|
| TP1 | 讲述 / state | name a term, part, time-zone fact, or likelihood category |
| TP2 | 解说 / explain | convert a representation; explain a concept or procedure |
| TP3 | 应用并判断合理性 | calculate, construct, complete, interpret, and check |
| TP4 | 解答常规问题 | familiar multi-step daily-life problem |
| TP5 | 运用各种策略 | solve or compare strategies in a routine problem |
| TP6 | 创意、创新、非常规 | non-routine/open problem with justified reasoning |

Do not equate TP with number size. A small circle-construction diagnosis or
likelihood justification can be TP5; a direct 10 000 000 conversion can be TP2.

---

## 7. Implications for the PokeMath generator (schema note)

- Year 6 needs answer types for integers, million-unit fractions/decimals,
  fractions, decimals, percentages, money, time/time-zone, measures with units,
  angles/constructions, circle labels, scaled distance, ratios, pie-chart sectors,
  likelihood categories, and short explanations.
- Recommended parameters: `grade`, `topic`, `standard_code`, `tp_level`,
  `item_format` (`mcq` | `constructed-response`), `format_type`, `answer_type`,
  `requires_visual`, and `sjkc_representation`.
- Store the exact 2021 DSKP learning-standard code on every item. This prevents an
  old UPSR/unit-sheet skill from silently becoming a Year 6 target.
- Add guards for `mixed_operation_type_count: 2`,
  `fraction_denominator_max: 10`, `decimal_places_max: 3`,
  `coordinate_scale_required: true`, and `probability_mode: qualitative_only`.
- Geometry construction needs a drawable/gradable visual representation; pie
  completion needs a prepared circle and centre; scaled coordinates need an
  explicit scale and axis orientation.
- See [standard-6-question-style.md](./standard-6-question-style.md) for the
  format menu, visual requirements, and DSKP-filtered Chinese examples.

---

## Sources

**Curriculum and assessment:**

1. KPM/BPK, *DSKP KSSR (Semakan 2017) Matematik Tahun 6 SJKC*, Terbitan 2021 — historical BPK download URL (currently unavailable): https://bpk.moe.gov.my/index.php/terbitan-bpk/kurikulum-sekolah-rendah/category/524-dskp-tahun-6?download=4726%3Adskp-kssr-semakan-2017-matematik-tahun-6-sjkc
2. Browser-readable publication copy, pages 1–50 — https://anyflip.com/iqzwk/dxzg/basic
3. Same publication copy, pages 51–80 — https://anyflip.com/iqzwk/dxzg/basic/51-80
4. KPM UASA administration guide and FAQ (Years 4–6; standard format and JSU) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf
5. KPM, *Panduan Pengurusan PBS Edisi 1 Tahun 2025* — https://www.moe.gov.my/storage/files/shares/pekeliling_dan_garis_panduan/Panduan%20Pengurusan%20PBS%20Edisi%201%20Tahun%202025.pdf
6. KPM KP2027 rollout material — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf

**Question-format evidence (scope-filtered against the 2021 DSKP):**

7. 30.com.my / buxi, SJKC Year 6 maths unit index (12 units; objective and constructed-response samples with answers) — https://30.com.my/sjkc-math-std-6/
8. 30.com.my, archived Standard 6 exam-paper index (UPSR-era; format evidence only) — https://30.com.my/sjkc-exam-papers-standard-6-%e5%8d%8e%e5%b0%8f%e5%85%ad%e5%b9%b4%e7%ba%a7-%e5%8e%86%e5%b9%b4%e8%80%83%e5%8d%b7-%e7%ac%ac%e4%b8%80%e6%ac%a1%e8%af%84%e5%ae%a1/

Local research extracts: `/tmp/pokemath-std6-research/` (WordPress source
metadata plus one objective/constructed-response PDF-to-text sample per unit).
