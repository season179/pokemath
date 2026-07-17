# Standard 2 SJKC Mathematics — Question Scope (2026)

> **Purpose.** Reference material for an LLM question generator (see
> [standard-1-sjkc-math.md](./standard-1-sjkc-math.md) for the same treatment of
> Year 1). Defines what a Standard 2 (二年级 / Tahun 2) SJKC maths question may
> and may not contain, so the generator's prompt can be constrained to age-correct
> items. Treat **Hard constraints** as prompt guardrails and each topic's
> **out of scope** notes as negative constraints.
>
> Researched 2026-07-17. Primary sources: the official DPK Edisi 3 (Tahap I) and
> the official BPK **SJKC** DSKP Matematik Tahun 2 (Chinese). Sources at bottom.

---

## 1. Which curriculum applies in 2026

- Standard 2 in calendar year **2026 runs on KSSR (Semakan 2017)** — **not**
  KP2027. KP2027 reaches **Year 1 only in 2027**; Year 2 is expected to transition
  in **2028** by the phased ("berperingkat") rollout, though the official timeline
  PDF is only detailed through 2027. Either way, **2026 Year 2 = KSSR Semakan
  2017** — unambiguous.
- Same teacher option as Year 1: since **3 May 2024** (Surat Siaran KPM Bil.
  6/2024, which covers all of **Tahap I** = Years 1–3), Level 1 Maths may be
  taught from **either** the original **DSKP** *or* the slimmer **DPK Edisi 3**.
  It is a `pilihan`. **No single universal Year 2 topic list.**
- Use the same **profile** flag as Year 1:

  | Profile | Meaning | Use when |
  |---|---|---|
  | `dpk3_2026_core` | The eight DPK Edisi 3 topics (section 4) | **Default.** Narrowest, safest |
  | `original_dskp_extra` | DPK core **+** the DSKP-only items (section 5) | School confirmed to teach full DSKP |
  | `sjkc_representation` | Layer on: Chinese wording, 1:4 abacus, MYR context | Always on for SJKC |

  Default = `dpk3_2026_core` + `sjkc_representation`.

> **Note the topic count.** Year 1 had DPK 7 vs DSKP 8. **Year 2 has 8 topics in
> both** documents — the structures align. The DPK-vs-DSKP difference in Year 2 is
> at the **sub-standard** level (section 5), not whole missing topics.

---

## 2. Hard constraints (prompt guardrails)

Year 2 is a **large jump** from Year 1. Constraints that bound every item:

- **Numbers ≤ 1000** (Year 1 was ≤ 100).
- **All four operations now allowed — but bounded:**
  - `+` / `−`: up to **three** numbers, result **within 1000**.
  - `×`: **basic facts only** (1-digit × 1-digit) **plus** `n × 10`. Introduced as
    repeated addition; teach commutativity `a × b = b × a`. **No** multi-digit
    multiplication.
  - `÷`: **basic facts only**, with **and without remainder** (e.g. `17 ÷ 5 = 3 r2`);
    plus **2-digit ÷ 10**. Divisor is 1-digit or 10 only.
- **Money ≤ RM100**, all four operations (× and ÷ by a 1-digit number or 10).
- **Fractions:** proper fractions only, **numerator 1–9, denominator 1–10**;
  emphasise `1/2, 1/4, 2/4, 3/4`; compare two proper fractions. **No** improper
  fractions, mixed numbers, or fraction arithmetic.
- **Decimals:** **tenths only** (`0.1`–`0.9`), as conversions of tenths fractions;
  compare two decimals. **No** hundredths, no decimal arithmetic.
- **No percentages** (那是 Year 3).
- **Measurement uses standard units** now: length `cm`/`m`, mass `g`/`kg`, volume
  `mℓ`/`ℓ` — recognise, measure, estimate. **No unit conversion yet** (e.g. not
  cm↔m).
- **Time to the minute** at **5-minute granularity** (clock marks are multiples of
  5); quarter/half/three-quarter hour; relations `1 hour = 60 min`, `1 day = 24 h`.
- **Rounding** to the nearest **ten and hundred**.
- **Word problems are essentially one-step / two-quantity.** Pure computation may
  chain three addends (e.g. `70 + 135 + 200`), but story problems stay single-step.
- **Question shape ≠ arithmetic drill only.** Keep picture/number-line reasoning,
  matching, ordering, shading (fractions), estimation, and "write a story for this
  number sentence" (see 5.1). See the difficulty ladder (section 6).

---

## 3. SJKC representation notes (`sjkc_representation`)

- Mandarin with Chinese maths terminology; keep a Malay/English gloss for
  bilingual UI. Read numbers in words correctly, e.g. `235` → `二百三十五`
  (**not** `二三五`).
- Numbers written **both** as numerals and Chinese words.
- The SJKC DSKP repeatedly names the **1:4 abacus (1:4 珠算盘)** as a representation
  for number value, place value, the four operations, and money value. Use as
  context/illustration, not a required answer format.
- Money is **ringgit/sen**; contexts local (allowance/零用钱, saving/储蓄,
  buying, wages).

---

## 4. DPK Edisi 3 core — the eight topics

Each topic: **in scope**, **examples** (bilingual, shape-representative),
**out of scope** (negative constraints). Chinese label · Malay label.

### 4.1 一千以内的整数 · Whole numbers to 1000 — `Nombor Bulat Hingga 1000`
**In scope:** name numbers to 1000; count by 1s / 5s / 10s / 100s (ascending &
descending), write numerals **and** words; compare two numbers by place value;
complete ascending/descending sequences; place value & digit value
(hundreds/tens/ones), decompose; number patterns; **estimate** a quantity of
objects (reference set + more-than/less-than); **round to nearest 10 and 100**.
**Examples:**
- `136` → 位值/数值: `1 ratus + 3 puluh + 6 sa` = `100 + 30 + 6`
- `144, 154, __, 174, 184, __` → `164, 194`
- `412, 512, 612, __, __, 912` → `712, 812`
- Round `23` to nearest ten → `20`
- Bekas A has 100 sweets; estimate bekas B → "more than 100"
**Out of scope:** numbers > 1000; rounding to nearest thousand.

### 4.2 基本运算 · Basic operations — `Operasi Asas`
**In scope:** add up to **three** numbers, sum within 1000; subtract up to three
numbers within 1000; **basic multiplication** (1-digit × 1-digit, and `× 10`),
introduced via repeated addition, with `a × b = b × a`; **basic division** (with
& without remainder, and 2-digit `÷ 10`) as equal-sharing / grouping / repeated
subtraction / inverse of ×; one-step daily-life word problems (two quantities).
**Examples:**
- `70 + 135 + 200 = ?` → `405`
- `850 − 167 = ?` → `683`
- `5 × 3 = ?` → `15`; `8 × 10 = ?` → `80`; `__ × 10 = 60` → `6`
- `12 ÷ 3 = ?` → `4`; `17 ÷ 5 = ?` → `3 baki 2`; `50 ÷ 10 = ?` → `5`
**Out of scope:** multi-digit ×/÷; times-tables beyond single-digit facts;
results > 1000; multi-step word chains.

### 4.3 分数与小数 · Fractions & decimals — `Pecahan dan Perpuluhan` *(new in Y2)*
**In scope:** concept of `1/2, 1/4, 2/4, 3/4` (whole vs part); proper fractions
numerator 1–9, denominator 1–10 — say/write/name, represent with a diagram,
compare two; **decimals (tenths)**: convert a tenths fraction to a decimal,
say/write `0.1`–`0.9`, represent on diagram/number line, compare two.
**Examples:**
- Shade `3/4` of a shape; name the shaded fraction.
- Which is larger, `2/4` or `3/4`?
- `1/10` → `0.1`; compare `0.3` and `0.7`.
**Out of scope:** improper fractions, mixed numbers, fraction/decimal arithmetic,
hundredths, percentages.

### 4.4 钱币 · Money — `Wang`
**In scope:** identify Malaysian money to **RM100** (RM1/5/10/20/50/100 + 10/20/50
sen); determine value to RM100 and compose a value from notes/coins; add up to
three values (sum ≤ RM100); subtract up to three within RM100; **multiply** money
(× 1-digit or 10, product ≤ RM100); **divide** money within RM100.
**Examples:**
- `RM20` = `2 × RM10` = `4 × RM5` = `20 × RM1`
- `RM22 + RM32 + RM24 = ?` → `RM78`
- `RM85 − RM15 − RM27 = ?` → `RM43`
- `RM5 × 5 = ?` → `RM25`; `RM48 ÷ 6 = ?` → `RM8`
**Out of scope:** amounts > RM100; multi-digit ×/÷ of money.

### 4.5 时间与时刻 · Time — `Masa dan Waktu`
**In scope:** read/write time in **hours and minutes** on an analogue clock (marks
in multiples of 5); quarter/half/three-quarter hour (一刻/半/三刻); record daily
events with times; relations `1 jam = 60 minit`, `1 hari = 24 jam`.
**Examples:**
- Clock at 7:10 → `pukul tujuh sepuluh minit / 7:10`
- Rehat `10:30 pagi`; balik `1:00 petang`
- `1 jam = ? minit` → `60`
**Out of scope:** minute-exact times off the 5-minute grid; 24-hour notation;
elapsed-time arithmetic.

### 4.6 度量衡 · Measurement — `Ukuran dan Sukatan`
**In scope — now standard units:** length in **cm & m** (ruler/tape); mass in
**kg & g** (scale); liquid volume in **ℓ & mℓ** (measuring cylinder/cup). For
each: recognise the unit & symbol, measure & record, and **estimate** against a
reference then compare to actual.
**Examples:**
- Measure a pencil → write `15 cm`.
- Book A is `20 cm`; estimate book B → "less/more than 20 cm".
- Watermelon `800 g`; estimate 3 of them → "more than 800 g".
**Out of scope:** unit conversion (cm↔m, g↔kg, mℓ↔ℓ); non-standard units are
Year 1, not the focus here.

### 4.7 空间 · Space & shapes — `Ruang`
**In scope — 3D:** identify by described features **cube, cuboid, square-based
pyramid, cylinder, cone** (state faces/surfaces, sides/edges, vertices);
recognise the 2D base shapes of a solid; **identify/recognise nets (展开图 /
bentangan)** of solids.
**In scope — 2D:** identify **square, rectangle, triangle, circle** by features
(straight/curved sides, vertices); **draw** basic 2D shapes.
**Examples:**
- "Which solid has this net?" → e.g. cube.
- "正方体有几个面？" → `6`
- Draw a triangle / rectangle.
**Out of scope:** **sphere** (dropped in Y2 — it has no net); angles, symmetry,
area/perimeter, polygons beyond the four named 2D shapes.

### 4.8 数据处理 · Data handling — `Pengurusan Data`
**In scope:** collect, classify, arrange data from daily situations; **read and
extract information from a bar chart (条形统计图 / carta palang)** — introduce
horizontal & vertical axes; **one scale mark = one unit**; solve daily-life
problems from a bar chart.
**Examples:**
- Bar chart of favourite fruit; "苹果比香蕉多几个？"
- "Which category is the tallest bar / the most?"
**Out of scope:** bar charts where one mark = N units; scaled axes; line/pie
charts. (Pictograph-only is Year 1.)

---

## 5. Original-DSKP extras (`original_dskp_extra` only)

Same 8 topics, but the original SJKC DSKP adds finer standards the DPK folds away.
Generate these **only** when the profile is `original_dskp_extra`:

- **解决问题 · Explicit problem-solving standard in every topic** (1.8, 2.5, 3.4,
  4.7, 5.3, 6.4, 7.3, 8.3). Two flavours:
  - **Solve** a routine daily-life application problem for the topic.
  - **Write a story (编写故事)** that fits a given number sentence (esp. operations:
    "write a daily-life story for `24 ÷ 2 = 12`"). This is a distinctive Year-2
    item type.
  - Taught with the 4-step method: 审题 (understand) → 拟定策略 (plan) → 进行策略
    (do) → 验算 (check).
- **钱币 4.6 储蓄与投资 · Savings & financial literacy** — sound money management as
  the basis for saving vs spending (context up to RM1000). Not in the DPK core.
- **分数与小数 3.3 · Compare a fraction's value directly against a decimal's value**
  (e.g. is `1/2` = `0.5`?), using objects/diagrams.
- **度量衡** — draw a straight line of a **given** length in cm/m (6.1.2).
- Generally more granular sub-standards and the per-topic **表现标准 (performance
  levels)** wording in section 6.

---

## 6. Difficulty ladder (PBD performance levels → generation difficulty)

Still **no national exam paper for Year 2** (UASA is Years 4–6). Year 2 uses
continuous classroom assessment (**PBD / 课堂评估**). The DSKP 表现标准 give a
per-topic difficulty scale the generator can target (wording below is the money
topic; every topic follows the same shape):

| TP 级别 | Descriptor | Question style to generate |
|----|-----------|----------------------------|
| TP1 | 讲述 / state a basic fact | name a value, read a fact |
| TP2 | 确定 / determine, identify | determine value, classify, match |
| TP3 | 应用 / apply a procedure & check reasonableness | compute `RM22+RM32+RM24`, round, read a clock, verify answer |
| TP4 | 解答常规问题 / solve a routine problem | one-step daily-life word problem |
| TP5 | 运用各种策略 / solve routine problems multiple ways | same answer, different strategy |
| TP6 | 创意/非常规 / solve non-routine problems creatively | open-ended / puzzle |

Guidance: skew TP1–TP4 for Standard 2; use TP5–TP6 sparingly and keep them
single-step. Note TP3 explicitly includes "确定答案的合理性" (check the answer is
reasonable) — a good generatable meta-question.

---

## 7. Implications for the PokeMath generator (schema note)

- The jump from Y1 to Y2 is the real design signal: a generator parameterised by
  **grade level** must widen numbers (100→1000), unlock **× and ÷** (bounded to
  basic facts), and add **fractions/decimals, standard-unit measurement, and bar
  charts**. Reuse the Y1 answer-type work and add: **fraction/decimal answers**,
  **division-with-remainder answers** (`3 r2`), **net→solid matching**, and
  **bar-chart reads**.
- `shared/question-engine.ts`'s numeric-`answer` + `makeChoices()` model now covers
  more of the arithmetic (4.1, 4.2, 4.4) but still not fractions, remainders,
  shape/net matching, or chart reads. Those need non-numeric / structured answer
  types.
- Recommended generation parameters: `profile` (section 1), `grade` (1 or 2),
  `topic` (4.1–4.8 / 5), `tp_level` (section 6), with the hard constraints
  (section 2) injected as fixed system rules **keyed by grade** — the Y1 and Y2
  constraint sets are different and must not leak across grades.

---

## Sources

**Authoritative (official KPM/BPK):**
1. DPK Edisi 3 Matematik Tahap 1 (contains Year 2, pp. for TAHUN 2) — https://asiemodel.net/wp-content/uploads/2025/02/DOKUMEN-PENJAJARAN_KSSR-MATEMATIK-TAHAP-1_EDISI-3.pdf
2. BPK **SJKC** DSKP KSSR (Semakan 2017) Matematik Tahun 2 (Chinese, primary source for original-DSKP scope + terminology) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-2/90-43-dskp-kssr-semakan-2017-matematik-tahun-2-sjkc/file
3. BPK DSKP KSSR (Semakan 2017) Matematik Tahun 2 (Malay/SK version) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-2/70-05-dskp-kssr-semakan-2017-matematik-tahun-2-v2/file
4. BPK KSSR Tahun 2 index (all versions incl. SJKC/SJKT) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-2
5. Surat Siaran KPM Bil. 6/2024 (DPK Edisi 3 as teacher option for **Tahap I**, eff. 3 May 2024) — https://www.moe.gov.my/surat-siaran-kpm-bil-6-tahun-2024
6. KP2027 timeline (Year 1 in 2027; confirms Year 2 not yet transitioned in 2026) — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf
7. UASA administration guide (confirms no UASA paper for Year 2) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf

**Local extraction artifacts** (may be cleaned by the OS): `/tmp/pokemath-research/dpk3.txt`
(DPK Edisi 3, TAHUN 2 at lines ~483–1112) and `/tmp/pokemath-research/dskp-y2-sjkc.txt`
(SJKC DSKP Tahun 2, content tables at lines ~1100–1870).
