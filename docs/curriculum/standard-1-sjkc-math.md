# Standard 1 SJKC Mathematics — Question Scope (2026)

> **Purpose.** This is reference material for an LLM question generator. PokeMath
> will not ship a fixed question bank long-term; it will generate questions on
> the fly. This document defines what a Standard 1 (一年级 / Tahun 1) SJKC maths
> question may and may not contain, so the generator's prompt can be constrained
> to produce age-correct items. Treat the **Hard constraints** section as prompt
> guardrails and each topic's **out of scope** notes as negative constraints.
>
> Researched 2026-07-17. Sources at the bottom.

---

## 1. Which curriculum applies in 2026

- Standard 1 in calendar year **2026 runs on KSSR (Semakan 2017)** — **not** the
  new **KP2027**. KP2027 reaches Year 1 only in **2027**. Do not generate KP2027
  content for a 2026 Year 1 pupil.
- Since **3 May 2024** (Surat Siaran KPM Bil. 6/2024), Level 1 Maths may be
  taught from **either** the original **DSKP** *or* the slimmer
  **Dokumen Penjajaran Kurikulum (DPK) Edisi 3**. It is a teacher's `pilihan`
  (option), so **there is no single universal Year 1 topic list.**
- **Model this as a profile flag** the prompt selects, rather than baking one
  list in:

  | Profile | Meaning | Use when |
  |---|---|---|
  | `dpk3_2026_core` | The seven DPK Edisi 3 topics (section 4) | **Default.** Safest, narrowest, most schools |
  | `original_dskp_extra` | DPK core **+** the DSKP-only items (section 5) | Target school confirmed to teach full DSKP |
  | `sjkc_representation` | Layer on: Chinese wording, 1:4 abacus, MYR context | Always on for SJKC |

  Recommended default = `dpk3_2026_core` + `sjkc_representation`. Offer
  `original_dskp_extra` as an opt-in module.

---

## 2. Hard constraints (prompt guardrails)

These bound **every** Standard 1 item regardless of topic. They are the single
most important part of this doc — the existing PokeMath bank violates all three.

- **Numbers ≤ 100.** No thousands, no five-digit money. (Contrast: the frozen
  prototype bank has `40 × 320`, `55000 − 8610` — that is Year 4–6.)
- **Addition and subtraction only.** Use only `+`, `−`, `=`. **No** `×` or `÷`
  symbols and **no** times-tables. "Multiplication/division readiness" appears
  only as *repeated addition/subtraction* (see topic 2).
- **Money ≤ RM10** (and sen ≤ RM1). No large ringgit amounts.
- **One step.** Word problems are single-step. No multi-step chains.
- **Question shape ≠ arithmetic drill only.** Include picture-counting,
  matching, ordering, fill-in-the-blank, patterns, and yes/no comparisons — not
  just `a + b = ?`. See the difficulty ladder (section 6).

---

## 3. SJKC representation notes (`sjkc_representation`)

- Language is **Mandarin with Chinese maths terminology**; keep a Malay/English
  gloss available for bilingual UI.
- Numbers should be writable **both** as numerals and **Chinese number words**
  (`18` / `十八`).
- The SJKC DSKP repeatedly uses the **1:4 abacus (1:4 珠算盘)** as a
  representation for number value, place value, +/−, and money. It is a
  teaching/representation device, not a separate exam section — generator may use
  it as *context/illustration*, not as a required answer format.
- Money is **Malaysian ringgit/sen**; contexts are local (allowance/零用钱, duit
  raya/红包, saving, spending).

---

## 4. DPK Edisi 3 core — the seven topics

Each topic lists **in scope** (what the generator may produce), **examples**
(bilingual, shape-representative), and **out of scope** (negative constraints).

### 4.1 整数 · Whole numbers to 100 — `Nombor Bulat Hingga 100`
**In scope:** count pictured/concrete objects; match a group to its numeral;
write numbers as numerals **and** Chinese words; compare groups (more/fewer,
equal/not equal); tens & ones; place value and digit value; decompose by
place/digit; number patterns forwards/backwards by 1, 2, 5, 10; number bonds /
combinations (start within 10, grow with ability).
**Examples:**
- `47 中，数字 4 的数值是多少？` → `40` (digit value)
- `20, 22, __, 26, __` → `24, 28` (pattern, step 2)
- Count a picture group; write both `18` and `十八`.
**Out of scope:** numbers > 100; ordinal-heavy work beyond naming.

### 4.2 基本运算 · Basic operations — `Operasi Asas`
**In scope:** recognise/use `+ − =`; build a number sentence from a spoken,
pictured, or daily-life situation; addition facts and sums **within 100**;
subtraction facts and subtraction **within 100**; repeated addition by 2, 5, 10
(preparation for ×); repeated subtraction by 2, 5, 10 (preparation for ÷);
one-step daily-life word problems.
**Examples:**
- `36 + 14 = ?` → `50`
- `46 − 25 = ?` → `21`
- `4 + 4 + 4 + 4 + 4 = ?` → `20` (repeated addition)
**Out of scope:** `×` / `÷` symbols; times-tables; results > 100; multi-step.

### 4.3 钱币 · Money — `Wang`
**In scope:** identify Malaysian coins and notes; represent amounts in sen up to
**RM1** and ringgit up to **RM10**; make/exchange equivalent values (coins up to
RM1; notes up to RM10 — **exchange does not mix coins and notes**); add and
subtract money **within RM10**; contexts: allowance, duit raya, gifts, saving,
spending.
**Examples:**
- `RM3 + RM5 = ?` → `RM8`
- "50 sen 可以换几个 20 sen 和 …？" (equivalent value, coins only)
**Out of scope:** amounts > RM10; mixed coin+note exchange; multiplication of
money.

### 4.4 时间与时刻 · Time — `Masa dan Waktu`
**In scope:** order daily events chronologically; name days of the week and
months of the year; use yesterday/today/tomorrow/day-after-tomorrow; read an
analogue clock and identify the hour vs minute hand; say/write **whole-hour,
half-hour, quarter-hour** times; simple calendar/event questions.
**Examples:**
- "现在是几点？" over a clock showing 3:30 → `三点半 / 3:30`
- Order: 起床 → 上学 → 睡觉.
**Out of scope:** minutes to the exact minute beyond quarters; 24-hour time;
elapsed-time arithmetic.

### 4.5 度量衡 · Measurement — `Ukuran dan Sukatan`
**In scope:** measure length, mass, and liquid volume using **non-standard
units** (handspan/庹, cubit, steps, armspan, pencils, erasers, paper clips,
cups/containers); compare two or more objects (longer/shorter, heavier/lighter,
more/less liquid, most/least).
**Examples:**
- "这支铅笔长几个回形针？" (length in paper clips)
- "哪个比较重？" comparing two objects.
**Out of scope:** cm / kg / ℓ standard units; unit conversion; measuring
instruments with scales.

### 4.6 空间 · Space & shapes — `Ruang`
**In scope — 3D:** name cuboid, cube, cone, square-based pyramid, cylinder,
sphere; state/count faces (surfaces), edges (sides), vertices; continue 3D
patterns; combine solids into a model.
**In scope — 2D:** name square, rectangle, triangle, circle; identify straight
lines, sides, corners, curves; continue patterns; create a design from shapes.
**Examples:**
- "正方体有几个面？" → `6`
- "接下来是什么形状？ ○ △ ○ △ __" → `○`
**Out of scope:** angles, symmetry, area/perimeter, nets, polygons beyond the
four named 2D shapes.

### 4.7 数据处理 · Data handling — `Pengurusan Data`
**In scope:** collect, classify, and arrange simple real-life data; read and
obtain information from a **pictograph where one picture = one value**; answer
how many / most / least / total / compare-two-categories.
**Examples:**
- Pictograph of fruit; "苹果比香蕉多几个？"
- "哪一种最多？"
**Out of scope:** pictographs where 1 picture = N values; bar charts; tables with
scaled axes.

---

## 5. Original-DSKP extras (`original_dskp_extra` only)

Generate these **only** when the profile is `original_dskp_extra`. In DPK Edisi 3
the fractions/estimation/rounding items are pushed to **Year 2**.

- **分数 · Fractions** — recognise/name/shade/build `1/2, 1/4, 2/4, 3/4`; simple
  daily-life fraction problems.
- **Estimation** of object quantities.
- **Rounding** whole numbers to the nearest ten.
- Counting / repeated operations in **4s** as well as 2s, 5s, 10s.
- More explicit before/after/between, ordering, **tally marks**, and separate
  problem-solving standards.
- Sources of money; recording saving and spending.

---

## 6. Difficulty ladder (PBD performance levels → generation difficulty)

There is **no national exam paper for Year 1** (UASA is Years 4–6). Year 1 uses
continuous classroom assessment (**PBD / 课堂评估**): oral, observation, written
exercises, presentation, hands-on, projects. The DSKP performance levels give a
natural difficulty scale the generator can target:

| TP | Descriptor | Question style to generate |
|----|-----------|----------------------------|
| TP1 | identify / name a basic fact | "这是什么形状？" name/recognise |
| TP2 | show understanding | match, classify, true/false |
| TP3 | apply a basic procedure | `36 + 14 = ?`, read a clock |
| TP4 | solve a routine daily-life problem | one-step word problem |
| TP5 | solve routine problems with different strategies | same answer, ask for another way |
| TP6 | solve non-routine problems creatively | open-ended / puzzle |

Generator guidance: a healthy mix skews TP1–TP4 for Standard 1; use TP5–TP6
sparingly and always as single-step at this level.

---

## 7. Implications for the PokeMath generator (schema note)

- The current `shared/question-engine.ts` assumes a **numeric answer** plus
  `makeChoices()` near-miss distractors. That covers topics 4.1–4.3 but **not**
  shape-naming, matching, ordering, or pictograph reads (4.4–4.7). The generator
  contract will need **non-numeric answer types** (multiple-choice-of-labels,
  match-pairs, sequence/ordering, pick-from-image).
- Recommended generation parameters to expose in the prompt: `profile`
  (section 1), `topic` (4.1–4.7 / 5), `tp_level` (section 6), plus the hard
  constraints (section 2) injected as fixed system rules.

---

## Sources

**Authoritative (official KPM/BPK):**
1. KP2027 timeline — https://www.moe.gov.my/storage/files/shares/images/KPM/UKK/2023/12_Dis/Kurikulum%20Persekolahan%202027%20Terkini.pdf
2. Surat Siaran KPM Bil. 6/2024 (page) — https://www.moe.gov.my/surat-siaran-kpm-bil-6-tahun-2024
3. Surat Siaran Bil. 6/2024 PDF (DPK Edisi 3 option, effective 3 May 2024) — https://www.moe.gov.my/storage/files/shares/pekeliling_dan_garis_panduan/surat_siaran/bahagian-pengurusan-sekolah-harian/Surat%20Siaran%20KPM%20Bil.%206%202024%20Pelaksanaan%20Dokumen%20Penjajaran%20Kurikulum%20Standard%20Sekolah%20Rendah%20Edisi%203%20Sains%20Dan%20Math%20Tahap%201.pdf
4. BPK original DSKP Matematik Tahun 1 (Malay) — https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-1/51-34-dskp-kssr-semakan-matematik-tahun-1/file
5. DPK Edisi 3 Matematik Tahap 1 PDF (mirror) — https://asiemodel.net/wp-content/uploads/2025/02/DOKUMEN-PENJAJARAN_KSSR-MATEMATIK-TAHAP-1_EDISI-3.pdf
6. UASA administration guide (confirms Year 1 has no UASA paper) — https://www.moe.gov.my/storage/files/shares/pentaksiran-berasaskan-sekolah/5.%20Panduan%20Pengurusan%20dan%20Pentadbiran%20UASA%20%26%20FAQ%20UASA.pdf

**Corroborating (non-authoritative — style/examples only):**
7. SJKC Chinese DSKP copy — https://drive.google.com/file/d/0BzaVvsykKJJRbHlDUTlrX2JodWM/view
8. SJKC Year 1 textbook flipbook — https://anyflip.com/elti/yrjk/basic
9. SJKC Std 1 practice overview — https://30.com.my/sjkc-math-std-1/
10. 2025 commercial SJKC paper listing (paper *style* only, not syllabus authority) — https://shop.testpaper.com.my/modules/TP380/details/matematik-sjkc-tahun-1-uspt-2025
