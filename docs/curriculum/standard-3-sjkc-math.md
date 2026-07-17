# Standard 3 SJKC Mathematics — Question Scope (2026)

> **Purpose.** Reference material for an LLM question generator (see
> [README.md](./README.md) for shared framing, and the Year 1 / Year 2 docs).
> Defines what a Standard 3 (三年级 / Tahun 3) SJKC maths question may and may not
> contain, so the generator's prompt can be constrained to age-correct items.
> Treat **Hard constraints** as prompt guardrails and each topic's **out of scope**
> notes as negative constraints.
>
> Researched 2026-07-17. Primary sources: official DPK Edisi 3 (Tahap I, TAHUN 3)
> and the official BPK **SJKC** DSKP Matematik Tahun 3 (Chinese). Sources at bottom.

---

## 1. Which curriculum applies in 2026

- Standard 3 in calendar year **2026 runs on KSSR (Semakan 2017)** — **not**
  KP2027. KP2027 reaches **Year 1 in 2027**; Year 3 is expected to transition
  around **2029** by the phased ("berperingkat") rollout (one year-level per year),
  though the official timeline PDF is only detailed through 2027. Either way,
  **2026 Year 3 = KSSR Semakan 2017** — unambiguous.
- Same teacher option as Years 1–2: since **3 May 2024** (Surat Siaran KPM Bil.
  6/2024, covering all of **Tahap I** = Years 1–3), Level 1 Maths may be taught
  from **either** the original **DSKP** *or* the slimmer **DPK Edisi 3**. A
  `pilihan`. **No single universal Year 3 topic list.**
- Use the same **profile** flag (`dpk3_2026_core` default, `original_dskp_extra`,
  always-on `sjkc_representation`) — see [README.md](./README.md).

> **Topic count:** **9 topics in both** DPK Edisi 3 and the original DSKP for Year
> 3 — structures align. Year 3 adds a whole new topic vs Year 2: **Coordinates**.
> The DPK-vs-DSKP difference is at the sub-standard level (section 5).

---

## 2. Hard constraints (prompt guardrails)

Year 3 is the **top of Tahap 1** and the widest scope. This is where **combined /
multi-step operations** genuinely begin.

- **Numbers ≤ 10 000** (Year 2 was ≤ 1000).
- **Four operations, scaled up:**
  - `+` / `−`: up to **three** numbers within 10 000; **combined `+` and `−`** in
    one problem (e.g. `2060 + 580 − 1550`). ← first real multi-step.
  - `×`: up to a **4-digit number × (1-digit, 10, 100, or 1000)**, product ≤ 10 000.
  - `÷`: up to a **4-digit number ÷ (1-digit, 10, 100, or 1000)**, with remainders.
- **Rounding** to the nearest **ten, hundred, and thousand**.
- **Fractions (denominators ≤ 10):** equivalent fractions; simplify to **lowest
  terms (最简分数)**; **add & subtract two proper fractions** (same *and* different
  denominators; result is a proper fraction); identify **improper fractions (假分数)
  and mixed numbers (带分数)**; hundredths fractions → decimals. **No** fraction ×/÷.
- **Decimals:** up to **2 decimal places**; compare; **add & subtract** — in the
  decimals topic the sum stays **≤ 0.99**. **No** decimal ×/÷ (that's Year 4+).
- **Percentages (new):** `1%`–`100%`; represent in a **hundred-square (百格图)**;
  convert **fraction ↔ decimal ↔ percentage** (percent = a fraction over 100).
- **Money ≤ RM10 000**, including **decimal money (RM__.sen)**; add/subtract up to
  three values + combined; **multiply/divide** money by 1-digit / 10 / 100 / 1000
  (e.g. `RM24.20 × 7`, `RM29.40 ÷ 10`). Plus **ASEAN foreign-currency awareness**
  and **needs vs wants** (conceptual, no calc in DPK).
- **Time now includes seconds.** Read/record time; **convert units** (hour↔minute,
  minute↔second); add/subtract/×/÷ time (× or ÷ by a 1-digit number); compound time
  (e.g. `9 jam 15 minit + 3 jam 26 minit`). Calendar facts (days per month, leap
  Feb = 29, 1 year = 12 months, 1 week = 7 days).
- **Measurement now includes unit conversion & arithmetic.** Convert `m↔cm`,
  `kg↔g`, `ℓ↔mℓ` (1 m = 100 cm, 1 kg = 1000 g, 1 ℓ = 1000 mℓ); add/subtract/×/÷
  (× or ÷ by 1-digit) with **compound units** (e.g. `1 m 28 cm`, `3 kg 700 g`).
- **Space:** identify **prisms** (square / rectangular / triangular) vs non-prisms
  by faces/base/vertices/edges; **regular polygons** pentagon–octagon; **lines of
  symmetry (对称轴)** — identify, draw, count, relate to number of sides.
- **Coordinates (new topic):** **first quadrant only**; locate/name a position by
  horizontal & vertical axes; describe position from a reference point using
  direction words (right/up/east/north).
- **Data:** read & extract from a **pie chart (饼图)**; relate the same data across
  **pictograph ↔ bar chart ↔ pie chart**.
- **Question shape ≠ arithmetic drill only** — keep multi-step word problems,
  diagram/number-line reasoning, "write a story for this number sentence", chart
  reads, and hands-on/spatial items. See the difficulty ladder (section 6).

---

## 3. SJKC representation notes (`sjkc_representation`)

- Mandarin with Chinese maths terminology; keep a Malay/English gloss. Read numbers
  in words, e.g. `3527` → `三千五百二十七`.
- Numbers written **both** as numerals and Chinese words.
- The SJKC DSKP still references the **1:4 abacus (1:4 珠算盘)** as a representation
  for value/place value/operations — use as context, not a required answer format.
- Money is **ringgit/sen**; contexts local. Foreign currency is **ASEAN** (Thai
  baht, Singapore/Brunei dollar, Indonesian rupiah, etc.).
- Key Chinese terms: 等值分数 (equivalent fraction), 最简分数 (lowest terms),
  真/假/带分数 (proper/improper/mixed), 百分比 (percentage), 棱柱体 (prism),
  正多边形 (regular polygon), 五/六/七/八边形 (pentagon/hexagon/heptagon/octagon),
  对称轴 (line of symmetry), 坐标 · 横轴 · 纵轴 (coordinates · horizontal · vertical
  axis), 饼图 (pie chart).

---

## 4. DPK Edisi 3 core — the nine topics

Each topic: **in scope**, **examples** (bilingual), **out of scope**.
Chinese label · Malay label.

### 4.1 一万以内的整数 · Whole numbers to 10 000 — `Nombor Bulat Hingga 10 000`
**In scope:** name numbers to 10 000, count by 1000s, write numerals **and** words;
place value & digit value to **thousands**, decompose; compare up to **three**
numbers (biggest/smallest), order ascending/descending; **estimate** a quantity;
**round to nearest 1000**; number patterns (up to six terms).
**Examples:**
- `3527` → `3 ribu + 5 ratus + 2 puluh + 7 sa` = `3000 + 500 + 20 + 7`
- Order `2971, 2716, 6771` → asc `2716, 2971, 6771`
- Round `6400` to nearest thousand → `6000`
- `6580, __, 6560, 6550, __, __` → `6570, 6540, 6530`
**Out of scope:** numbers > 10 000.

### 4.2 基本运算 · Basic operations — `Operasi Asas`
**In scope:** add/subtract up to three numbers within 10 000 **and combined +/−**;
multiply a number (to 4 digits) by 1-digit / 10 / 100 / 1000 (product ≤ 10 000);
divide (to 4 digits) by 1-digit / 10 / 100 / 1000 (with remainders); all in
daily-life contexts.
**Examples:**
- `2347 + 653 = ?` → `3000`; `3426 − 392 = ?` → `3034`
- `2060 + 580 − 1550 = ?` → `1090` (combined)
- `RM/qty` products like `4-digit × 1-digit` within 10 000
**Out of scope:** results > 10 000; divisors other than 1-digit/10/100/1000.

### 4.3 分数、小数与百分比 · Fractions, decimals & percentages — `Pecahan, Perpuluhan dan Peratus`
**In scope:** equivalent fractions (denom ≤ 10); simplify to lowest terms;
**add & subtract two proper fractions** (same and unlike denominators, result
proper); identify improper fractions & mixed numbers (denom ≤ 10); hundredths
fraction → decimal; compare two decimals to 2 dp; **add & subtract decimals to 2 dp
(sum ≤ 0.99)**; **percentages** 1%–100% in a hundred-square; convert fraction ↔
decimal ↔ percentage.
**Examples:**
- `1/2 = 2/4 = 4/8`; simplest form of `6/10` → `3/5`
- `2/5 + 1/5 = 3/5`; `5/6 − 1/3 = 1/2`
- `16/100 = 0.16 = 16%`; `28% = 28/100 = 0.28`
**Out of scope:** fraction ×/÷; decimals > 2 dp; percentages of a quantity (Year 4+).

### 4.4 钱币 · Money — `Wang`
**In scope:** add/subtract up to three money values to **RM10 000** and combined;
multiply/divide money by 1-digit / 10 / 100 / 1000 (incl. **decimal money**);
**recognise ASEAN foreign currencies** (values differ by country); **needs vs
wants** as the basis of saving vs spending (conceptual).
**Examples:**
- `RM560 + RM78 = RM638`; `RM215 + RM94 = RM309`
- `RM240 × 5`; `RM24.20 × 7`; `RM180 ÷ 6`; `RM29.40 ÷ 10`
- Sort items into "need" (food, home) vs "want" (toy, ice cream)
**Out of scope:** amounts > RM10 000; computing exchange-rate conversions (DPK only
requires *awareness*; the exchange-rate calc is a DSKP extra — section 5).

### 4.5 时间与时刻 · Time — `Masa dan Waktu`
**In scope:** read/record time for activities (timetable, calendar); **convert
units** hour↔minute, minute↔second; add/subtract up to three time values and
combined; multiply/divide time by a 1-digit number; compound time (h/min/s);
calendar facts.
**Examples:**
- `3 jam = 3 × 60 = 180 minit`; `1 jam 20 minit = 80 minit`
- `9 jam 15 minit + 3 jam 26 minit = 12 jam 41 minit`
- `23 minit 14 saat + 18 minit 43 saat = ?`
**Out of scope:** 24-hour/12-hour conversion, time zones, duration across days.

### 4.6 度量衡 · Measurement — `Ukuran dan Sukatan`
**In scope:** length (m, cm), mass (kg, g), liquid volume (ℓ, mℓ); **convert units**
(1 m = 100 cm, 1 kg = 1000 g, 1 ℓ = 1000 mℓ); add/subtract up to three measures and
combined; multiply/divide by a 1-digit number; **compound units** (e.g. `1 m 28 cm`,
`3 kg 700 g`).
**Examples:**
- `2 m = 200 cm`; `128 cm = 1 m 28 cm`; `9 m 20 cm = 920 cm`
- `453 m + 360 m = 813 m`; `4 × 95 cm = 380 cm`; `360 cm ÷ 4 = 90 cm`
**Out of scope:** area/perimeter/volume formulas; temperature; conversions beyond
the three unit pairs above.

### 4.7 空间 · Space & shapes — `Ruang`
**In scope:** **prisms** — recognise square / rectangular / triangular prisms
(cube = square prism, cuboid = rectangular prism); state features (flat faces,
base/tapak, vertices, edges); compare prisms vs non-prisms (sphere, cone, pyramid,
cylinder); **regular polygons** pentagon, hexagon, heptagon, octagon (by number of
straight sides); design patterns with polygons; **lines of symmetry** — identify,
draw, count, relate to number of sides.
**Examples:**
- "A rectangular prism has how many faces / vertices / edges?" → `6 / 8 / 12`
- "A regular pentagon has how many sides / lines of symmetry?" → `5 / 5`
**Out of scope:** angles in degrees, area/perimeter, 3D nets arithmetic, irregular
polygon properties.

### 4.8 坐标 · Coordinates — `Koordinat` *(new topic in Y3)*
**In scope:** **first quadrant only**; identify an object's position from a
reference point using direction words (right/up/east/north); introduce horizontal
& vertical axes; determine/name an object's position on the axes; follow
move-instructions to a grid position.
**Examples:**
- "Move 3 steps right, then 5 steps up — which object is there?"
- "Name the position of the star on the grid."
**Out of scope:** negative coordinates, quadrants 2–4, ordered-pair `(x, y)`
notation (introduced later), plotting from numeric pairs.

### 4.9 数据处理 · Data handling — `Pengurusan Data`
**In scope:** collect, classify, arrange data; **read and extract information from
a pie chart (carta pai / 饼图)**; **relate the same data across pictograph ↔ bar
chart ↔ pie chart**.
**Examples:**
- Pie chart of favourite colours; "which slice is largest?"
- "This pictograph and this bar chart show the same data — match them."
**Out of scope:** computing exact pie-chart percentages/angles; mean/mode/median;
constructing charts to scale.

---

## 5. Original-DSKP extras (`original_dskp_extra` only)

Same 9 topics; the original SJKC DSKP adds finer standards the DPK folds away.
Generate these **only** when the profile is `original_dskp_extra`:

- **解决问题 · Explicit problem-solving standard per topic** (1.8, 2.7, 3.5, 4.8,
  6.4, 7.5, …): solve a routine daily-life problem **and** **write a story (编写故事)
  for a given number sentence** (now including sentences with fractions/decimals/
  percentages represented as parts of 100), taught with the 4-step method
  (审题 → 拟定策略 → 进行策略 → 验算).
- **钱币 · Foreign-currency exchange rate** — DSKP 4.6.2 requires stating the
  **current RM ↔ foreign-currency exchange rate** (说出当前一令吉与外币的兑换率),
  where the DPK core only requires *recognising* ASEAN currencies. Also DSKP 4.7
  spells out **savings & investment** (储蓄与投资) as needs/wants driven.
- Generally more granular sub-standards and the per-topic **表现标准 (performance
  levels)** wording in section 6.

---

## 6. Difficulty ladder (PBD performance levels → generation difficulty)

Still **no national exam paper for Year 3** (UASA is Years 4–6). Year 3 uses
continuous classroom assessment (**PBD / 课堂评估**). The DSKP 表现标准 give a
per-topic difficulty scale:

| TP 级别 | Descriptor | Question style to generate |
|----|-----------|----------------------------|
| TP1 | 讲述 / state a fact | name/recognise (a prism, a fraction, a %) |
| TP2 | 解说 / explain, determine | explain features, identify, convert simple units |
| TP3 | 应用 & check reasonableness | compute (multi-digit ×/÷, fraction +/−, unit convert), verify |
| TP4 | 解答常规问题 / routine problem | multi-step daily-life word problem |
| TP5 | 运用各种策略 / multiple strategies | same problem, alternative method |
| TP6 | 创意/非常规 / non-routine, creative | open-ended / puzzle |

Guidance: Year 3 legitimately supports **multi-step (combined-operation) TP4
problems** — unlike Years 1–2 which stay single-step. Still skew TP1–TP4; use
TP5–TP6 sparingly.

---

## 7. Implications for the PokeMath generator (schema note)

- Year 3 is where the generator must support **multi-step problems**, **many new
  answer shapes**, and **unit-aware arithmetic**. New answer/answer-check types
  beyond Years 1–2: **fraction results** (proper, and improper/mixed
  identification), **percentage answers**, **compound-unit answers** (`1 m 28 cm`,
  `9 jam 41 minit`), **quotient-with-remainder**, **coordinate/position answers**,
  **pie-chart reads**, and **symmetry-count / polygon-property** answers.
- `shared/question-engine.ts`'s numeric-`answer` + `makeChoices()` model covers the
  larger whole-number/money arithmetic, but a growing share of Year 3 needs
  structured, unit-aware, or non-numeric answers — this grade is the strongest
  argument for generalising the answer model before scaling content.
- Recommended generation parameters unchanged in shape: `profile`, `grade` (1–3),
  `topic` (4.1–4.9 / 5), `tp_level`, with hard constraints (section 2) injected as
  fixed system rules **keyed by grade** — the Y1/Y2/Y3 constraint sets differ
  sharply and must not leak across grades.

---

## Sources

**Authoritative (official KPM/BPK):**
1. DPK Edisi 3 Matematik Tahap 1 (contains TAHUN 3) — https://asiemodel.net/wp-content/uploads/2025/02/DOKUMEN-PENJAJARAN_KSSR-MATEMATIK-TAHAP-1_EDISI-3.pdf
2. BPK **SJKC** DSKP KSSR (Semakan 2017) Matematik Tahun 3 (Chinese; primary for original-DSKP scope + terminology) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3/132-dskp-kssr-semakan-2017-matematik-tahun-3-sjkc-v3/file
3. BPK DSKP KSSR (Semakan 2017) Matematik Tahun 3 (Malay/SK) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3/107-005-dskp-kssr-semakan-2017-matematik-tahun-3/file
4. BPK KSSR Tahun 3 index — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3
5. Surat Siaran KPM Bil. 6/2024 (DPK Edisi 3 option for **Tahap I**, eff. 3 May 2024) — https://www.moe.gov.my/surat-siaran-kpm-bil-6-tahun-2024
6. KP2027 timeline (Year 1 in 2027; confirms Year 3 not yet transitioned in 2026) — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf
7. UASA administration guide (no UASA paper for Year 3) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf

**Local extraction artifacts** (may be cleaned by the OS): `/tmp/pokemath-research/dpk3.txt`
(DPK Edisi 3, TAHUN 3 at lines ~1113–1965) and `/tmp/pokemath-research/dskp-y3-sjkc.txt`
(SJKC DSKP Tahun 3).
