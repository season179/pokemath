# Standard 4 SJKC Mathematics — Question Scope (2026)

> **Purpose.** Reference material for an LLM question generator (see
> [README.md](./README.md) for shared framing, and the Year 1–3 docs). Defines what
> a Standard 4 (四年级 / Tahun 4) SJKC maths question may and may not contain, so
> the generator's prompt can be constrained to age-correct items. Treat **Hard
> constraints** as prompt guardrails and each topic's **out of scope** notes as
> negative constraints.
>
> Researched 2026-07-17. **Standard 4 is Tahap 2** — a different regime from Years
> 1–3 (read section 1 carefully). Primary source: the official BPK **SJKC** DSKP
> KSSR (Semakan 2017) Matematik Tahun 4 (Chinese). Sources at bottom.

---

## 1. Which curriculum applies in 2026 — and two regime changes

- Standard 4 in 2026 **runs on KSSR (Semakan 2017)**. KP2027 reaches Year 1 in
  2027 and rolls out one level per year, so **Year 4 ≈ 2030** — well after 2026.
  2026 Year 4 = KSSR Semakan 2017, unambiguous.

- **Regime change #1 — no DPK Edisi 3, so no profile split.** DPK Edisi 3 (the
  slimmed teacher-option document) covers **Tahap 1 only** (Years 1–3). The BPK
  Tahun 4 page lists **no DPK**. So for Year 4 the **original DSKP is the single
  authority** — there is no `dpk3_2026_core` vs `original_dskp_extra` choice.
  Only **`sjkc_representation`** (Chinese wording, MYR/foreign-currency context)
  remains as a profile layer.

- **Regime change #2 — there is a national exam now.** See section 2. Tahap 1 was
  pure classroom PBD; Tahap 2 (Years 4–6) adds **UASA**.

> **Topic count:** **8 topics.** Two structural merges/additions vs Year 3:
> topic 1 is now "整数与运算" (whole numbers **and** operations combined), and
> topic 7 is "坐标、比与比例" (coordinates **+ ratio & proportion**, new).

---

## 2. Assessment — UASA (new for Tahap 2)

- **UASA (Ujian Akhir Sesi Akademik / 学年末考试)** applies to **Years 4–6**. It is
  a **summative** component of PBD (Tahap 1 had only continuous PBD).
- KPM provides a **standard instrument format and JSU (Jadual Spesifikasi Ujian /
  test-specification table)** for the seven Tahap-2 subjects, including
  **Matematik (SK/SJKC/SJKT)**. Maths is a **single written paper** (unlike Bahasa
  Melayu's two papers).
- Papers are **school-administered and school-marked** to KPM's format; scores are
  reported as a percentage. Items are a **mix of objective (MCQ) and subjective
  (constructed-response)** built to the JSU across topics and cognitive levels.
- KPM does **not publish fine-grained item counts** publicly; commercial UASA
  practice papers are the practical reference for item *style/format*, not
  syllabus authority.
- **Generator implication:** Year 4 should support both **MCQ** and
  **constructed-response** (show-working) item shapes, tagged by topic and TP level
  (section 6) so a set can be assembled JSU-style.

---

## 3. Hard constraints (prompt guardrails)

Year 4 is a large jump: numbers to **100 000**, **mixed ×÷ operations**, **pre-
algebra unknowns**, decimals **to 3 dp with all four operations**, **percentage of
a quantity**, **area/perimeter/volume**, **ratio & proportion**, **(x, y)
coordinates**, 24-hour time. Constraints:

- **Numbers ≤ 100 000.**
- **Four operations, scaled up:**
  - `+`: up to **four** numbers, sum < 100 000 (operands up to 5 digits).
  - `−`: two numbers, and up to a **three-number** chain.
  - `×`: up to a **5-digit × (≤2-digit, 100, or 1000)**, product < 100 000.
  - `÷`: a number < 100 000 **÷ (≤2-digit, 100, or 1000)**.
  - **Mixed operations:** combined `+/−` **and** combined `×/÷` (start without
    carrying/borrowing). ← `×÷` mixing is new vs Year 3.
- **Even & odd numbers** (identify, classify) — new.
- **Rounding** to the nearest **ten-thousand** (may involve money & measurement).
- **Unknowns / pre-algebra (new):** solve for **one** unknown (written as a
  **letter**) in a `+` or `−` equation with numbers up to 2 digits.
- **Fractions:** convert improper ↔ mixed; add up to three (proper fractions,
  whole numbers, mixed numbers) — **sum's denominator may exceed 10**; subtract two
  and three; mixed `+/−`; **fraction of a quantity** (the "的" / "of" concept).
  **No** fraction ×/÷.
- **Decimals:** add/subtract up to three decimals **to 3 decimal places**;
  **multiply and divide** a decimal by (1-digit, 10, 100, 1000) with result to 3 dp.
  ← decimal ×/÷ is new vs Year 3.
- **Percentages:** convert fraction ↔ percentage; **calculate a percentage of a
  quantity** (new).
- **Money ≤ RM100 000:** four operations + mixed; **budgeting** (day/week/month to
  a financial goal), saving/expense records; **financial-decision responsibility**
  (needs-vs-wants priority); **world foreign currencies** + the **RM1 exchange-rate
  table**; **payment instruments** (cash, e-payment, cards).
- **Time:** **12-hour ↔ 24-hour**; **elapsed time within 24 h**; estimate time;
  large units **millennium / century / decade / year**; convert hour↔day,
  day↔week, month↔year, year↔decade↔century; `+ − × ÷` on time (× / ÷ by ≤2-digit).
- **Measurement:** length adds **mm and km** (relations mm↔cm, m↔km) with convert /
  measure / estimate / `+ − × ÷`; mass (g, kg) and liquid volume (mℓ, ℓ) with mixed
  `+−` and `×÷`. **Imperial & extra metric units are awareness-only** (dm, dam, mg,
  tonne, inch/foot/yard/mile, pound/ounce, 两/斤, gallon/quart/pint) — introduce,
  don't compute with them.
- **Space (now measurement-geometry):** **angles** right/acute/obtuse; triangle
  types (scalene, isosceles, equilateral, right); **parallel & perpendicular
  lines** (recognise & draw); **perimeter** of polygons up to 8 sides; **area** of
  square/rectangle/right-, equilateral-, isosceles-triangle (unit squares +
  formula); **volume** of cube & cuboid (unit cubes + formula).
- **Coordinates, ratio & proportion:** **first-quadrant** `(x, y)` with axes and
  origin `(0, 0)` — read & plot points; **ratio** `1:1`…`1:10`, `1:100`, `1:1000`;
  **proportion** via the **unitary method (归一法)**.
- **Data:** **construct** a pictograph and a bar chart from **ungrouped** data, then
  analyse. (Pie-chart *reading* was Year 3; Year 4 = *building* pictograph/bar.)
- **Multi-step is normal.** Every topic has a problem-solving standard using the
  4-step method (审题 → 拟定策略 → 进行策略 → 验算). See section 6.

---

## 4. SJKC representation notes (`sjkc_representation`)

- Mandarin with Chinese maths terminology; keep a Malay/English gloss. Read numbers
  in words, e.g. `12 425` → `一万二千四百二十五`.
- Money is **ringgit/sen**; foreign currency is now **world** (not just ASEAN) —
  US dollar, etc. — with an RM1 exchange-rate table.
- Key Chinese terms: 偶数/奇数 (even/odd), 未知数 (unknown), 混合运算 (mixed
  operations), 假分数/带分数 (improper/mixed fraction), 百分比 (percentage), 理财
  (financial management), 预算 (budget), 汇率 (exchange rate), 付款工具 (payment
  instrument), 12/24 时计时法 (12/24-hour time), 相隔时间 (elapsed time),
  千禧/世纪/年代 (millennium/century/decade), 毫米/公里 (mm/km), 角度 · 直角/锐角/钝角
  (angle · right/acute/obtuse), 平行线/垂直线 (parallel/perpendicular lines),
  周长/面积/体积 (perimeter/area/volume), 坐标 · 原点 · 象限 (coordinate · origin ·
  quadrant), 比/比例/归一法 (ratio/proportion/unitary method), 象形统计图/条形统计图
  (pictograph/bar chart).

---

## 5. DSKP core — the eight topics

Each topic: **in scope**, **examples** (bilingual), **out of scope**.
Chinese label · Malay label.

### 5.1 整数与运算 · Whole numbers & operations — `Nombor Bulat dan Operasi`
**In scope:** numbers to **100 000** (read/write, place & digit value, compare,
order, sequences to six terms); **even & odd**; estimate quantity (with
reasonableness); round to **ten-thousands**; basic ops (`+` to 4 numbers; `−`;
`×` to 5-digit × ≤2-digit/100/1000; `÷` by ≤2-digit/100/1000), all < 100 000;
**mixed `+/−` and mixed `×/÷`**; **one unknown** in a `+`/`−` equation (letter).
**Examples:** `12 425` in words; classify `37` odd / `48` even; round `47 320` to
nearest ten-thousand → `50 000`; `a + 15 = 42` → `a = 27`.
**Out of scope:** numbers > 100 000; two-unknown or ×/÷ unknowns; long division
beyond 2-digit/100/1000 divisors.

### 5.2 分数、小数与百分比 · Fractions, decimals & percentages — `Pecahan, Perpuluhan dan Peratus`
**In scope:** improper ↔ mixed conversion; add up to three / subtract two–three
involving whole numbers, proper fractions, mixed numbers (**sum denom may exceed
10**); mixed `+/−`; **fraction of a quantity**; decimals to **3 dp** add/subtract
(≤3 numbers) and `× ÷` by 1-digit/10/100/1000; **fraction ↔ percentage**;
**percentage of a quantity**.
**Examples:** `7/4 = 1 3/4`; `2 1/2 + 1/4 = 2 3/4`; `1/3 of 90 = 30`;
`3.45 + 1.2 = 4.65`; `0.6 × 100 = 60`; `25% of 80 = 20`.
**Out of scope:** fraction ×/÷; decimals > 3 dp; compound percentage.

### 5.3 钱币 · Money — `Wang`
**In scope:** four operations + mixed on money **≤ RM100 000**; **budgeting**
(day/week/month toward a goal) and saving/expense records; **financial-decision
responsibility** (prioritise needs vs wants; analyse sources of financial info);
**world foreign currencies** + RM1 exchange-rate table; **payment instruments**
(cash, e-payment, cards).
**Examples:** `RM4 500 + RM980 + RM1 250`; plan a weekly budget from allowance;
"RM1 = ? THB from this table"; sort payment methods for a purchase.
**Out of scope:** amounts > RM100 000; interest/compound-interest calc (that's later).

### 5.4 时间与时刻 · Time — `Masa dan Waktu`
**In scope:** 12-hour ↔ 24-hour; elapsed time within 24 h; estimate time; large
units (millennium/century/decade/year); unit conversion (hour↔day, day↔week,
month↔year, year↔decade↔century); `+ − × ÷` on time.
**Examples:** `14:30 = 2:30 petang`; duration `08:15 → 11:45` = `3 j 30 min`;
`2 abad = 200 tahun`; `3 minggu 4 hari + 5 hari`.
**Out of scope:** time zones; durations spanning multiple days with date rollover.

### 5.5 度量衡 · Measurement — `Ukuran dan Sukatan`
**In scope:** length **mm, cm, m, km** (relations & conversion, measure in mm,
estimate in km, `+ − × ÷`); mass (g, kg) and liquid volume (mℓ, ℓ) with mixed
`+−` and `×÷`.
**Examples:** `3 km = 3000 m`; `45 mm = 4 cm 5 mm`; `1 kg 200 g × 3`.
**Out of scope:** computing in imperial/extra-metric units (awareness only);
area/volume live in topic 5.6.

### 5.6 空间 · Space (geometry) — `Ruang`
**In scope:** angles — right/acute/obtuse in square/rectangle/triangle; triangle
types (scalene, isosceles, equilateral, right); **parallel & perpendicular lines**
(recognise, draw); **perimeter** of polygons ≤ 8 sides; **area** of
square/rectangle/right-/equilateral-/isosceles-triangle (unit squares + formula);
**volume** of cube & cuboid (unit cubes + formula).
**Examples:** classify an angle as acute; area of a 6 cm × 4 cm rectangle = `24 cm²`;
volume of a 3×3×3 cube = `27 cm³`; perimeter of a hexagon.
**Out of scope:** angle measurement in degrees with a protractor beyond
naming; circle area/circumference; surface area.

### 5.7 坐标、比与比例 · Coordinates, ratio & proportion — `Koordinat, Nisbah dan Kadaran`
**In scope:** first-quadrant `(x, y)` with x-axis, y-axis, origin `(0, 0)` — read a
point's coordinates and plot a point; **ratio** two quantities `1:1`…`1:10`,
`1:100`, `1:1000`; **proportion** by the **unitary method (归一法)**.
**Examples:** "coordinates of point A?" → `(3, 2)`; boys:girls = `2:3`;
"3 pens cost RM6, so 5 pens cost ?" (unitary) → `RM10`.
**Out of scope:** negative coordinates / quadrants 2–4; simplifying ratios to
lowest terms beyond given forms; direct/inverse-proportion formulas.

### 5.8 数据处理 · Data handling — `Pengurusan Data`
**In scope:** **construct** a pictograph and a bar chart from **ungrouped** data;
analyse them; solve daily-life problems from them.
**Examples:** build a bar chart from a tally of favourite sports; "how many more
chose football than badminton?"
**Out of scope:** pie-chart construction; grouped data / frequency tables;
mean/mode/median.

---

## 6. Difficulty ladder (TP1–TP6 → generation difficulty)

Feeds **both** continuous PBD **and** the UASA JSU. Standard progression:

| TP 级别 | Descriptor | Question style |
|----|-----------|----------------|
| TP1 | 讲述 / state | read a number/fact, name an angle |
| TP2 | 解说 / explain, convert | explain a step, convert units, improper↔mixed |
| TP3 | 应用 & check reasonableness | compute (mixed ops, area, % of quantity), verify |
| TP4 | 解答常规问题 / routine problem | multi-step daily-life word problem |
| TP5 | 运用各种策略 / multiple strategies | alternative method / same answer |
| TP6 | 创意/非常规 / non-routine, creative | open-ended / puzzle |

Guidance: Year 4 fully supports **multi-step TP4** items and is the first grade
where a formal exam expects a spread across all TP levels and both MCQ and
constructed-response formats.

---

## 7. Implications for the PokeMath generator (schema note)

- Year 4 forces the generator well past a numeric-answer model. New answer/answer-
  check shapes beyond Years 1–3: **mixed-operation results**, **unknown-value
  (algebra) answers**, **fraction-of / percentage-of-a-quantity**, **area/perimeter/
  volume with units (`cm²`, `cm³`)**, **`(x, y)` coordinate answers**, **ratio and
  unitary-method answers**, and **constructed-response (show-working)** items for
  UASA-style practice — plus MCQ.
- `shared/question-engine.ts`'s numeric-`answer` + `makeChoices()` model is now a
  minority of the surface area. Generalising to typed answers (number, fraction,
  measure-with-unit, coordinate, ratio, chart, free-response) is effectively
  required to cover Tahap 2.
- Recommended generation parameters: `grade` (1–6), `topic`, `tp_level`,
  `item_format` (mcq | constructed-response), with hard constraints (section 3)
  injected as fixed system rules **keyed by grade**. For Year 4 there is **no DPK
  profile** — only `sjkc_representation` applies.

---

## Sources

**Authoritative (official KPM/BPK):**
1. BPK **SJKC** DSKP KSSR (Semakan 2017) Matematik Tahun 4 (Chinese; the single authority for Year 4) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3-1/154-dskp-kssr-semakan-2017-matematik-tahun-4-sjkc/file
2. BPK DSKP KSSR (Semakan 2017) Matematik Tahun 4 (Malay/SK) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3-1/156-dskp-kssr-semakan-2017-matematik-tahun-4/file
3. BPK KSSR Tahun 4 index (confirms **no DPK** for Year 4) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3-1
4. KPM UASA administration guide + FAQ (UASA = Years 4–6, standard format & JSU, single Maths paper, PBD-summative) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf
5. KP2027 timeline (Year 1 in 2027; Year 4 not transitioned until ~2030) — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf

**Local extraction artifact** (may be cleaned by the OS):
`/tmp/pokemath-research/dskp-y4-sjkc.txt` (SJKC DSKP Tahun 4, content tables at
lines ~1094–2100) and `/tmp/pokemath-research/uasa-guide.txt`.
