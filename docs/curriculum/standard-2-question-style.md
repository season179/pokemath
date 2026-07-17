# Standard 2 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-2-sjkc-math.md](./standard-2-sjkc-math.md). That doc says
**what content** a Standard 2 question may contain. This doc says **how it is
asked** — the many authentic *formats* real SJKC Year-2 worksheets and school
papers use, so the LLM generator produces genuine, age-appropriate variety.

> **Why this exists.** The scope doc's own constraint demands it: *"Question shape
> ≠ arithmetic drill only. Keep picture/number-line reasoning, matching, ordering,
> shading (fractions), estimation, and 'write a story for this number sentence.'"*
> Year 2 is a **large jump** from Year 1 — numbers to 1000, all four operations
> (bounded to basic facts), fractions & decimals, standard-unit measurement, and
> bar charts — and each new topic brings its own question shapes. This doc is that
> format menu.

## How to use for prompting

1. Pick a **topic** (§4.1–4.8 of the scope doc, or the `original_dskp_extra`
   items) and a **PBD level** (TP1–TP6 → difficulty).
2. Sample a **format** from the taxonomy (§A) — weight toward the formats common
   for that topic (per-topic catalog, §C).
3. Sample an **item shape** (§B): `objective` (圈/选), `fill-blank` (填空),
   `constructed` (解答/看图作答/画/编故事), or `activity` (连/涂/排/分类).
4. If `objective`, build distractors with an age-appropriate strategy (§D).
5. Apply the scope doc's **hard constraints** (≤1000; `+ −` up to 3 numbers; `×`
   basic facts & `×10`; `÷` basic facts incl. remainder & `÷10`; money ≤RM100;
   proper fractions; tenths decimals; standard units, no conversion; time on the
   5-minute grid; single-step word problems) as guardrails so no format smuggles in
   out-of-level content.

As at every grade, the format is largely **topic-independent** — `compute`,
`fill-blank`, `compare`, `match-connect`, `pattern-continue` apply to whole
numbers, money, fractions, or data alike. The taxonomy (§A) is the reusable core;
the per-topic catalog (§C) records which formats fit where, with authentic
examples.

---

## A. Cross-cutting format taxonomy

Each format has an ID for the generator (`format_type`). Presentation and
answer-form are separate axes (§E). Formats **new or newly prominent at Year 2**
(vs. Year 1) are marked ⁺.

| ID | Format | What the pupil does |
|---|---|---|
| `compute` ⁺ | Direct computation | Evaluate a `+ − × ÷` number sentence (incl. 3 addends, `×10`, `÷10`) |
| `fill-blank` | Fill the blank (填空) | Complete a number sentence, sequence, table, or missing term/operand |
| `compute-missing` ⁺ | Missing number/operand | `__ × 10 = 60`; `850 − __ = 683`; find the missing factor/addend |
| `remainder-division` ⁺ | Division with remainder | `17 ÷ 5 = ? 余 ?` → `3 余 2` (商 & 余数) |
| `count-write` | Count & write | Count objects; write the number as numeral **and** 中文数字 |
| `count-circle` | Count & circle | Count/read, then circle the correct numeral/group/answer (圈出) |
| `place-value` ⁺ | Place & digit value | 位值/数值 (hundreds/tens/ones); decompose `136 = 100+30+6` |
| `pattern-continue` | Continue the pattern | Extend a number pattern (by 1/5/10/100, fwd/back) or a shape pattern |
| `compare` | Compare (比一比) | `> < =` for numbers, fractions, decimals, money, measures |
| `order-sequence` | Order / before-after | Arrange asc/desc; before/after/between |
| `round-ten` ⁺ | Round | Round to the nearest **ten and hundred** |
| `estimate` | Estimate (估一估) | Estimate a quantity or a measure against a reference set, then compare |
| `number-line` ⁺ | Number-line reasoning | Locate/read a number, fraction, or decimal on a line; jumps → sentence |
| `shade-fraction` ⁺ | Shade / name a fraction | Shade `3/4` of a shape; name the shaded fraction; fraction of a set |
| `convert-form` ⁺ | Convert representation | tenths fraction ↔ decimal (`1/10`↔`0.1`); numeral ↔ Chinese word; words ↔ symbols |
| `match-connect` | Match / connect (连一连) | Pair numeral↔word, fraction↔diagram, net↔solid, clock↔time, item↔price |
| `color-shade` | Colour / shade (涂一涂) | Colour the larger/longer one, or a stated portion |
| `count-money` ⁺ | Total a money set | Add the value of pictured notes/coins (≤RM100) |
| `compose-value` ⁺ | Compose / exchange money | Make a value from notes/coins; equivalent value (`RM20 = 4×RM5`) |
| `change` ⁺ | Money change (找钱) | Single-step buy-and-get-change |
| `read-instrument` | Read a clock / scale | Tell time to 5 min (一刻/半/三刻); read a ruler/scale/measuring cylinder |
| `measure-write` ⁺ | Measure & record | Measure with a standard unit; write value + unit (`15 cm`) |
| `draw` ⁺ | Draw / construct | Draw a named 2D shape; draw clock hands; draw a line of a given length; draw water level |
| `name-count` | Name / count a shape | Name a 2D/3D shape; count 面 / 边 / 顶点; name a solid's 2D base |
| `net-match` ⁺ | Net ↔ solid (展开图) | Match/choose the net of a solid, or the solid of a net |
| `classify-sort` | Classify / sort (分类) | Group objects/shapes/data by an attribute; pick the suitable unit/tool |
| `read-chart` ⁺ | Read a bar chart (条形统计图) | Read a value, most/least/tallest, difference, total (one mark = one unit) |
| `build-chart` ⁺ | Build / complete a chart | Fill a bar chart or table from given data |
| `true-false` | True / false, yes / no | Judge 对/错 or ✓/✗ (property, comparison, equation) |
| `word-single` | Single-step word problem | One `+ − × ÷` step; two quantities; usually context-rich |
| `write-story` ⁺ | Write a story (编写故事) | Compose a daily-life story fitting a given number sentence _(extra)_ |
| `verify-reasonable` ⁺ | Check reasonableness | Judge/verify whether an answer is reasonable (确定答案的合理性) _(TP3)_ |

`presentation` axis: `plain` · `picture` · `story` · `figure:number-line` ·
`figure:place-value` · `figure:fraction` · `figure:coins` · `figure:clock` ·
`figure:ruler` · `figure:scale` · `figure:cylinder` · `figure:shapes` ·
`figure:net` · `figure:bar-chart` · `figure:table` · `figure:abacus`.

`answer_form` axis: `numeral` · `chinese-word` · `number-sentence` · `quotient-remainder`
(`3 余 2`) · `fraction` · `decimal` · `measure` (value+unit) · `money` · `time` ·
`circle` · `match` · `order` · `tick` · `drawing` · `chart` · `story`.

---

## B. Assessment context (still **no exam**)

- **Standard 2 has no national exam.** Assessment is classroom **PBD** (校本评估):
  teacher observation + worksheets, mapped to performance levels **TP1–TP6**.
  (Contrast Tahap 2, which has the UASA — see the Standard 4 format doc.)
- Real items come from **worksheets / activity books (练习 / 活动本 / lembaran
  kerja)** and **school-internal tests (校内 ujian / 评审 / peperiksaan)**. Year-2
  papers do split into shapes, so the generator models an **item shape**:
  - `objective` — circle/choose the answer (圈出/选出正确答案); 3–4 options.
  - `fill-blank` — write into a blank (填空).
  - `constructed` — 解答 (show working + 答: sentence), 看图作答, 画一画, or the
    Year-2-distinctive **编写故事** (write a story for a number sentence).
  - `activity` — connect (连), colour (涂), order (排列), classify (分类), draw (画).
- **Bilingual:** numbers as numeral **and** Chinese word, read correctly
  (`235` → `二百三十五`, **not** `二三五`). Keep a Malay/English gloss for the UI.
- **1:4 abacus (1:4 珠算盘)** is a *representation* for number/place value, the four
  operations, and money value (SJKC DSKP) — a legitimate prop, not a scaled
  instrument.
- **PBD, not exam marks:** `tp_level` is a performance band; do not generate
  UASA-style papers for Standard 2.

Generator param: `item_format: objective | fill-blank | constructed | activity`.

---

## C. Per-topic format catalog (authentic examples)

Examples are tagged `[format · item_format · TP]` with a source + confidence (see
§Sources). Chinese is as-found; an English gloss follows. Over-level items were
dropped per the §2 hard constraints (see the "Drop" notes in C.5/C.6).

### C.1 一千以内的整数 · Whole numbers to 1000

Verbatim from the **text-based** buxi/30.com.my Std-2 unit-1 tests (with 答案) and
official DPK Edisi 3 Tahun 2 *Contoh* (BM).

- `[convert · objective · TP1]` `193 =` A 一百九十三 B 一百八十三 C 一百九十二 D 一百八十二 → **A**. — Numeral → Chinese word (MCQ). (buxi · verified)
- `[convert · constructed · TP2]` 把代号写成文字：`724` → **七百二十四**。／`二百四十八 =` → **248**。 — Numeral ↔ Chinese word, both directions. (buxi · verified)
- `[match-connect · activity · TP2]` 连一连：`430 ↔ empat ratus tiga puluh`。 — Match numeral ↔ word. (DPK3 · verified BM)
- `[count-write · fill-blank · TP2]` 一百一百地数，填一填：`600, __, __` → **700, 800**。／五个五个地数：`410, 415, 420, __, __`。 — Skip-count by 100s / 5s / 10s. (buxi · verified)
- `[compare · activity · TP2]` 比一比，在较大数目旁画〇：`738 / 378` → **738**。 — Compare two, circle the bigger. (buxi · verified)
- `[compare · objective · TP2]` 以下哪一项正确？A 492比429小 B 742比933小 C 203比230大 D 230比203小 → **B**. — Comparison truth-judgement (spot the correct). (buxi · verified)
- `[place-value · constructed · TP2]` 比较 `294` 与 `315` 的百位：百位 3 大于 2 → **315 大于 294**。 — Compare starting at the hundreds place. (DPK3 · verified BM)
- `[order-sequence · fill-blank · TP3]` 顺序／逆序排列：`850, 845, 835, 840` 逆序 → **850, 845, 840, 835**。 — Arrange ascending / descending. (buxi · verified)
- `[order-sequence · activity · TP2]` 把答案涂色：`250 与 252 之间的数目是`（249/251/351）→ **251**。 — "Number between X and Y". (buxi · verified)
- `[pattern-continue · objective · TP2]` `100, 200, Q, 400, 500`，Q 是？ → **300**。 — Missing term in a counting pattern. (buxi · verified)
- `[pattern-continue · fill-blank · TP3]` 完成数列：`125, __, 135, __, 140` → **130, 145**。／`144, 154, __, 174, 184, __` → **164, 194**。 — Complete a patterned sequence. (buxi / DPK3 · verified)
- `[place-value · objective · TP2]` `831 =` A 八个百二个十二个一 B 八个百三个十一个一 … → **B**。／`六个百三个十二个一 =` → **632**。 — Decompose ↔ compose in place-value words. (buxi · verified)
- `[place-value · objective · TP2]` `372 =` A 300+80+2 B 300+70+2 … → **B**；反向 `400+90+2 =` → **492**。 — Expanded form, both directions. (buxi · verified)
- `[place-value · constructed · TP2]` 把 `136` 填入位值/数值表：位值 1/3/6；数值 **100/30/6**。 — Place-value & digit-value table / decompose. (DPK3 · verified BM)
- `[estimate · constructed · TP3]` 已知 A 罐有 100 粒糖，估计 B 罐的糖 → **多于 100**（大约／多于／少于）。 — Estimate a quantity vs a reference set. (DPK3 · verified BM; Chinese exemplar not captured)
- `[round-ten · constructed · TP3]` 写出十位近似值：`748` → **750**；`874` → **870**。 — Round to nearest ten. (buxi · verified)
- `[round-ten · constructed · TP3]` 写出百位近似值：`662` → **700**；`730` → **700**。 — Round to nearest hundred. (buxi · verified)
- `[round-ten · objective · TP3]` 哪一项错误？…D 293的十位近似值是300 → **D**（293→290）。 — Rounding stated as fact; spot the wrong one. (buxi · verified)

### C.2 基本运算 · Basic operations (`+ − × ÷` basic facts)

Verbatim from the buxi Std-2 unit-2..5 tests (with 答案) + DPK Edisi 3 *Contoh*.

**Addition & subtraction (up to three numbers ≤ 1000)**
- `[compute · objective · TP2]` `13 + 39 =` A 42 B 51 C 52 D 35 → **C**。／`75 − 38 =` → **37**。 — Direct computation (MCQ). (buxi · verified)
- `[compute · objective · TP2]` `92 和 4 的和数是` → **96**；`65 和 35 的差数是` → **30**；`84 多 9 是` → **93**；`84 少 9 是` → **75**。 — "sum / difference / N more / N less". (buxi · verified)
- `[compute-missing · objective · TP4]` 什么数目加三十等于九十？ → **60**。 — Missing addend. (buxi · verified)
- `[compare · objective · TP3]` 哪一项的和数最小／差数最大？／哪一项的和数大过 92？(13+78 / 64+29) → **64+29**。 — Compare the value of expressions / against a threshold. (buxi · verified)
- `[true-false · objective · TP3]` 哪一项不正确？A 739+192=931 … → **A**（=931 错）。 — Spot the incorrect equation. (buxi · verified)
- `[word-single · constructed · TP4]` 买进 192 个苹果和 32 个橙，共几个水果？→ `192+32=` **224**。／卖出 293 包后剩 72 包，原有多少？→ `293+72=` **365**。／采 75 朵给 35 朵，剩多少？→ `75−35=` **40**。 — Combine / find-original (inverse) / give-away word problems. (buxi · verified)
- `[compute · fill-blank · TP3]` 连加：`42 + 186 + 323` → **799**；连减：`957 − 384 − 24` → **549**。 — Add / subtract three numbers. (buxi · verified)
- `[compute · constructed · TP3]` `70 + 135 + 200 =` **405**（竖式 bentuk lazim）。 — 3-addend word problem in vertical form. (DPK3 · verified BM)
- `[compute · fill-blank · TP3]` 按位值分拆：`115 + 20 + 30 = 165`；`387 − 20 − 40 = 327`。 — Add/subtract by place-value decomposition. (DPK3 · verified BM)
- `[match-connect · activity · TP3]` 连一连（等值算式）：`243+152` ↔ `261+134`（都=395）。／连到答案：`42+186+323` ↔ 799。 — Match expression ↔ equal expression / its answer. (buxi · verified)
- `[write-story · fill-blank · TP5]` 根据算式完成短文。`495 + 391 = 886`：文文有 **495** 枚邮票，妮妮比他多 **391** 枚，妮妮有 **886** 枚。 — Complete a story that fits a number sentence (scaffolded 编写故事). (buxi · verified)

**Multiplication (1-digit × 1-digit, and × 10)**
- `[compute · objective · TP2]` 哪项等于 `6 × 5`？A 6+6+6+6+6 … C 5+5+5+5+5+5 → **C**。 — Match × to its repeated addition. (buxi · verified)
- `[compute · objective · TP2]` `8 × 0 =` → **0**；`9 × 1 =` → **9**；`8 × 10 =` → **80**；`__ × 10 = 60` → **6**。 — ×0 / ×1 / ×10 (incl. missing factor). (buxi / DPK3 · verified)
- `[convert-form · objective · TP3]` `2+2+2+2+2+2+2 = ( )×( )` → **7×2**。 — Convert repeated addition to a × sentence. (buxi · verified)
- `[compute · objective · TP3]` 哪一项等于 `5×7`？A 7×5 … → **A**（`a×b=b×a`）。 — Commutativity as MCQ. (buxi · verified)
- `[true-false · activity · TP3]` 在正确算式的□内画✓：`8+2=16` □　`8×2=16` □ → tick **8×2=16**。 — Distinguish `+` vs `×`. (buxi · verified)
- `[fill-blank · fill-blank · TP3]` 把 "×" 或 "=" 填进去：`3 __ 2 __ 6` → **3 × 2 = 6**。 — Build the × sentence with the right symbols. (buxi · verified)
- `[word-single · constructed · TP4]` 6 只青蛙有多少条腿？→ **24**（6×4）。／4 行、每行 5 株，共几株？→ `4×5=` **20**。／10 个遥控器各 2 颗电池 → `10×2=` **20**。 — Groups-of / array / ×10 word problems. (buxi · verified)

**Division (basic facts, with/without remainder; ÷ 10)**
- `[compute · objective · TP2]` 哪项等于 `20 ÷ 4`？A 20−4−4−4−4−4 … → **A**。 — Division as repeated subtraction. (buxi · verified)
- `[compute · fill-blank · TP2]` `45 ÷ 9 =` **5**；`56 ÷ 7 =` **8**；`40 ÷ 10 =` **4**；`4 ÷ 1 =` **4**。 — Basic facts, incl. ÷10 / ÷1. (buxi · verified)
- `[compute-missing · objective · TP3]` `3 ÷ __ = 3` → **1**；`__ ÷ 8 = 0` → **0**；`__ ÷ 10 = 9` → **90**。 — Missing divisor / dividend (incl. ÷10). (buxi / DPK3 · verified)
- `[word-single · objective · TP4]` 36 个瓶，4 瓶一包，可分几包？→ **9**（grouping）。／15 颗糖分成 3 袋，每袋几颗？→ **5**（sharing）。 — Quotitive vs partitive word problems. (buxi · verified)
- `[match-connect · activity · TP3]` 连一连（等值）：`12÷2` ↔ `3×2`；`36÷2` ↔ `9×2`。 — Match ÷ to an equal expression (incl. ×). (buxi · verified)
- `[fill-blank · fill-blank · TP3]` 填一填：`35 ÷ 7 = __`（5）；`__ × 7 = 35`（5）。 — Division ↔ multiplication fact family. (buxi · verified)
- `[remainder-division · constructed · TP3]` 算算看（连减）：`45 ÷ 9`：45−9−9−9−9−9=0，减了 **5** 次 → **5**。 — Divide by repeated subtraction; count the times. (buxi · verified)
- `[remainder-division · fill-blank · TP4]` `17 ÷ 5 = 3 余 2`（用竖式）。 — Division WITH remainder. (DPK3 · verified BM; no Chinese `…余…` worksheet exemplar captured)
- `[verify-reasonable · constructed · TP3]` 解题四步：审题→拟定策略→进行策略→**验算**；确定答案的合理性。 — "Is the answer reasonable?" meta-step. (DSKP · plausible — standard-derived)

### C.3 分数与小数 · Fractions & decimals *(new in Y2)*

Verbatim from buxi Std-2 unit-6 (分数) and unit-7 (小数) tests + DPK Edisi 3 *Contoh*.
Diagrams are load-bearing — the text keeps the wording & answer; a figure DSL must
render the shape/number line.

**Fractions (concept ½ ¼ 2/4 ¾; proper fractions, num 1–9, denom 1–10)**
- `[shade-fraction · objective · TP2]` 下列哪个图像代表三分之一？(四个涂色图 A–D) → **D**。 — Pick the diagram showing a given fraction. (buxi · verified)
- `[name-count · constructed · TP2]` 根据涂黑部分，写出分子、分母和分数。→ 分子 **2**、分母 **5**、分数 **2/5**。 — Name numerator / denominator / fraction from shading. (buxi · verified)
- `[convert-form · constructed · TP2]` 以文字和数字写出涂黑部分的分数：文字 **六分之四**、数字 **4/6**。 — Write the shaded fraction in words AND numerals. (buxi · verified)
- `[shade-fraction · activity · TP2]` 根据分数涂色：`九分之五` → 涂 9 格中的 5 格。 — Shade a diagram to show a given fraction. (buxi · verified)
- `[match-connect · activity · TP3]` 根据涂黑部分连一连（图 ↔ 分数）。 — Match shaded diagrams to fraction names. (buxi · verified)
- `[compare · objective · TP2]` 哪个分数最大？A 五分之一 B 七分之一 C 九分之一 D 十分之一 → **A**。 — Compare same-numerator fractions (largest/smallest). (buxi · verified)
- `[compare · objective · TP3]` 圈一圈：`1/9` 比 `1/6`（大／小）→ **小**。／哪项正确？(四分之一比五分之一小) → spot correct. — Circle the comparison / truth-judge. (buxi · verified)
- `[compare · activity · TP3]` 把较小的分数涂色：a 六分之一 b 五分之一 → **六分之一**。 — Shade the smaller / larger of two fractions. (buxi · verified)
- `[shade-fraction · activity · TP1]` 认识 ½, ¼, 2/4, ¾（折纸、涂黑）。 — Introduce the ½/¼/2/4/¾ concept (whole vs part). (DPK3 · verified BM)

**Decimals (tenths only, 0.1–0.9)**
- `[compute · objective · TP1]` `0.3 怎么念？` → **零点三**；`0.7` → **零点七**。 — Read a decimal in words. (buxi · verified)
- `[convert-form · objective · TP3]` [分母 10 的分数/涂色图] 的小数是？A 0.4 B 4.0 → **0.4**。 — Convert a tenths fraction / diagram to a decimal. (buxi · verified)
- `[shade-fraction · objective · TP2]` 根据涂黑部分，圈出小数：0.2 / 0.3 / 0.8 / 0.1 → **0.2**。 — Read a shaded diagram as a decimal. (buxi · verified)
- `[compare · objective · TP3]` `0.8 比 0.5 多 __ 个部分` → **3**；`0.1 比 0.6 少 __ 个部分` → **5**。 — Compare two decimals by counting tenths apart. (buxi · verified)
- `[number-line · activity · TP2]` 连一连（数轴/图 ↔ 小数）：↔ 0.3, 0.4, 0.6, 0.7。 — Match number-line positions to decimals. (buxi · verified)
- `[number-line · fill-blank · TP3]` 根据数轴，填 "大" 或 "小"：`0.9 比 0.8` → **大**；`0.6 比 0.9` → **小**。 — Compare on a number line. (buxi · verified)
- `[convert-form · constructed · TP3]` 把每个十分之几化成小数：`1/10 → 0.1` … `9/10 → 0.9`（用数轴/图）。 — Convert each tenths fraction to a decimal. (DPK3 · verified BM)
- `[compare · constructed · TP3]` 比较分数值与小数值（如 `1/2` 与 `0.5`，用图/数轴）。 — Compare a fraction's value against a decimal's. (DPK3 · verified BM — `original_dskp_extra`)

### C.4 钱币 · Money (≤ RM100)

Verbatim from buxi Std-2 unit-8 (钱币) tests + real 二年级评审 papers (scanned →
`plausible`). RM notation and RM↔sen are money *notation*, not forbidden unit
conversion.

- `[compose-value · fill-blank · TP2]` 填写纸币数量：`RM78 = __×RM50, __×RM10, __×RM5, __×RM1` → **1, 2, 1, 3**。 — Compose an amount from notes/coins. (buxi · verified)
- `[count-money · fill-blank · TP2]` 算一算，写出币值。[图：RM50+RM20+RM5+20仙×3+10仙] → **RM75.70**。 — Total a pictured set of notes + coins. (exam · plausible)
- `[convert-form · objective · TP1]` 三十五令吉六十仙写作 → **RM35.60**。／`RM56.80` 读作 → **五十六令吉八十仙**。 — Write / read an amount in words ↔ RM. (buxi · verified)
- `[convert-form · fill-blank · TP2]` `RM5.30 = __ sen` → **530 sen**；`90 sen = RM __` → **RM0.90**。 — Convert between RM and sen (money notation). (exam · plausible)
- `[change · constructed · TP4]` 我有 RM45.60，物品价 RM35.20，找回多少？ → **RM10.40**。 — Calculate the change (找钱). (buxi · verified)
- `[word-single · objective · TP4]` 颜色笔 RM4.50，小奈有 RM2.90，还需要多少钱？ → **RM1.60**。 — Shortfall ("how much more needed"). (buxi · verified)
- `[word-single · objective · TP4]` 婷婷有 3 张 RM5，买 RM8.90 练习簿后剩多少？ → **RM6.10**。 — Compose from notes, then subtract. (buxi · verified)
- `[word-single · constructed · TP4]` 数学课本 RM43.80，英文课本便宜 RM12.35，英文课本多少？ → **RM31.45**。／买鞋用 RM30.20 后剩 RM20.40，原有多少？ → **RM50.60**。 — "cheaper by" / find-original (reverse). (buxi · verified)
- `[word-single · constructed · TP4]` 小杰有 RM4.90，妈妈又给 79 sen，共有多少？ → **RM5.69**。 — Add RM + sen mixed. (buxi · verified)
- `[compute · fill-blank · TP4]` `RM35 + RM29 + RM7 =` **RM71**；`790sen − 235sen − 90sen =` **465 sen**。 — Add three amounts / chained subtraction. (exam · plausible)
- `[compute · constructed · TP4]` 启文每天零用钱 RM2，五天的零用钱是多少？ → `5 × RM2 =` **RM10**。 — Multiply money (× 1-digit), pocket-money context. (exam · plausible)
- `[compute-missing · constructed · TP4]` `RM53.20 − ( ) = RM25.30` → **RM27.90**。 — Find the missing amount. (exam · plausible)
- `[true-false · activity · TP1]` 把 RM50 和 RM100 的共同特征画 ✓/✗（面额、国家元首肖像、大红花、油棕、国行标志）。 — Feature-table: which features two notes share. (buxi · verified)
- `[write-story · constructed · TP5]` 根据算式和图编写短文。`RM15.60 + RM20.80 = RM36.40` → "小诗有 RM15.60，小玲有 RM20.80，她们共有 RM36.40。" — Write a money story for a number sentence. (buxi · verified)
- `[compute · constructed · TP4]` 钱币 ÷ 一位数（如 RM48 ÷ 6 = RM8）。 — Divide money. (DSKP 4.5 · plausible — no verbatim exemplar found)
- `[compose-value · activity · TP3]` 记录储蓄与消费（理财，≤ RM1000）。 — Savings & financial literacy record. (DSKP 4.6 · plausible — `original_dskp_extra`; no verbatim table found)

### C.5 时间与时刻 · Time (5-minute grid)

Verbatim from buxi Std-2 unit-9 (时间) tests + real 评审 papers (`plausible`).

- `[convert-form · objective · TP2]` 把八时十五分写成数字 → **8:15**。／把 `4:30` 写成文字 → **四时三十分**。 — Convert time between words ↔ digits. (buxi · verified)
- `[read-instrument · objective · TP1]` 找出钟面上显示的分钟刻度 → **30 分钟**。／找出钟面显示的时刻 → **7:55**。 — Read the minute value / the whole time off an analogue clock (5-min marks). (buxi · verified)
- `[read-instrument · objective · TP1]` 分针指着 5，时针在 9 和 10 之间，是什么时刻？ → **9 时 25 分**。 — Name the time from a *verbal description* of hand positions. (buxi · verified)
- `[read-instrument · fill-blank · TP2]` 根据钟面：i 以数字写时刻 → **11:15**；ii 以文字写时刻 → **四时四十五分**。 — Read a clock, write BOTH digits and words. (exam · plausible)
- `[compute · objective · TP2]` `2 天 = __ 小时` → **48**；`半个小时 = __ 分钟` → **30**；`3 小时 = __ 分钟` → **180**；`时针走完 2 圈 = __ 天` → **1**。 — Day↔hour, hour↔min, half-hour relations (1天=24时, 1时=60分). (buxi / exam · verified/plausible)
- `[picture-sentence · fill-blank · TP3]` 看星期六活动图，记录时刻：上午 __ 起床（9 时）；下午 __ 去游泳（5 时 15 分）。 — Read a picture timetable and record each event's time. (buxi · verified)
- `[compute · fill-blank · TP3]` 钟面显示 6:05，半小时后是 __ → **6:35**。 — Single whole/half-hour forward step (keep to one step). (exam · plausible)
- `[read-instrument · objective · TP2]` 一刻 / 半 / 三刻 的时刻（如 三时一刻 = 3:15）。 — Quarter / half / three-quarter hour. (DSKP 5.1 备注 · plausible — only 半 appears verbatim; 一刻/三刻 phrased as 十五分/四十五分 in the corpus)
- `[draw · activity · TP2]` 在钟面上画出时针和分针，显示指定时刻。 — Draw the clock hands for a given time. (DSKP 5.1.2 "展示" · plausible — corpus clock items are read-only; parallels the verified draw-pointer/draw-level formats)

> **Drop (over-level):** elapsed-time arithmetic appears in some source papers but is
> out of scope — e.g. 「从下午 3:15 至下午 6:15 过了几小时？」, cross-day 「星期六
> 晚上 9:00 至星期日晚上 9:00 共几小时？」, 「分针走了多少分钟」(sector sweep). No
> 24-hour notation. Keep only a single whole/half-hour forward step if at all.

### C.6 度量衡 · Measurement (standard units)

Verbatim from buxi Std-2 unit-10/11/12 (长度/质量/体积) tests + real 评审 papers.
Formats mostly recur across length (cm/m), mass (kg/g), and volume (ℓ/mℓ); each is
shown once with a representative example. **No unit conversion** at this grade.

- `[classify-sort · objective · TP1]` 名称／选工具：这个测量工具的名称是？（卷尺/米尺）／哪个不是测量液体体积的工具？ → **秤**。 — Name / pick the suitable measuring tool. (buxi · verified)
- `[fill-blank · objective · TP1]` 厘米的符号是？ → **cm**；`3 升` 写成符号 → **3 l**。 — Recognise the unit & its symbol. (buxi · verified)
- `[true-false · objective · TP1]` 哪项正确？…D `3 米 = 3 m` → **D**。 — Word-unit equals its symbol (⚠ tests 米=m, **not** cm↔m conversion). (buxi · verified)
- `[measure-write · fill-blank · TP2]` 量一量，写出长度：订书机 → **10 cm**。／读秤面：烤鸡 → **2 公斤**；compound → **1 kg 500 g**。／读量筒 → **300 ml**。 — Measure/read an instrument and record with the unit. (buxi · verified)
- `[estimate · objective · TP3]` 铅笔约 12 cm，电脑约多少 cm？ → **24 cm**（参照参考物）。／黑板参照 1 m，约 **3 m**。／估计脚踏车重 → **20 公斤**。 — Estimate a measure against a reference. (buxi · verified)
- `[estimate · objective · TP3]` 估计时钟重 500 g，实际见图，相差多少？ → **200 g**。／估茶 300 ml，实际 → **250 ml**。 — Estimate-then-compare against the actual reading. (buxi · verified)
- `[compare · objective · TP3]` 佩琳比姐姐（50 公斤）轻 6 公斤，多重？ → **44 公斤**。／哪种水果比较重／哪个容器的液体比较多？ — "轻/重了", heavier / more comparisons. (buxi · verified)
- `[order-sequence · constructed · TP3]` 把 P–T 从轻到重排列 → **S,Q,P,T,R**，再求最重与最轻相差 → **650 克**。／容器 J,K,L 从大到小（5l/500ml/30ml，只排序不运算）。 — Order objects by size; range. (buxi · verified)
- `[compute · objective · TP4]` 1 罐头 200 g，4 罐共多重？ → **800 g**（×）。／3 粒梨共重，1 粒多重？ → **100 g**（÷）。／200 ml + 300 ml → **500 ml**（+）；两筒相差 → **200 ml**（−）。 — Multiply / divide / add / subtract a measure (single-step). (buxi · verified)
- `[draw · activity · TP2]` 在秤面上画出指针，显示指定质量（700 g）。／把水位画在量筒里（300 ml）。 — Draw the scale needle / liquid level to a given value. (buxi · verified)
- `[draw · constructed · TP3]` 从 ＊ 开始，画出指定长度的直线：3 厘米；8 cm。 — Draw a straight line of a given length. (exam; DSKP 6.1.2 备注 · plausible — `original_dskp_extra`)
- `[read-instrument · objective · TP2]` 测量液体体积时，眼睛最正确的位置是？ → C。 — Correct eye level when reading a scale (technique). (buxi · verified)

> **Drop (over-level):** unit-conversion items appear in some source PDFs but are out
> of scope — 「白米换算成克」, `2 公斤 = 2000 克`, `300 克 = 3 公斤`, or summing across
> 公斤 + 克 in one total. DSKP Tahun 2 has **no** conversion standard. Ordering a
> mixed ℓ/mℓ list (no arithmetic) is fine.

### C.7 空间 · Space & shapes (incl. nets 展开图)

From AnyFlip 万宜 KSSR-Semakan Y2 practice (space ~p54) + corroborated solid-feature
facts + DSKP 4.7 for nets. Solid features (for count/true-false items): 正方体 6面
8顶点 12边; 长方体 6/8/12; 正方棱锥体 5面 5顶点 8边; 圆柱体 2平面+1曲面 0顶点 2边;
圆锥体 1平面+1曲面 1顶点 1边. (球体 dropped in Y2 — no net.)

- `[name-count · constructed · TP1]` 说出下列立体图形的名称。(正方体/长方体/正方棱锥体/圆柱体/圆锥体) — Name the 3D solids. (AnyFlip · verified-structure)
- `[match-connect · activity · TP2]` 连一连：把立体图形连到正确的名称。 — Match solid ↔ name. (AnyFlip · verified-structure)
- `[name-count · fill-blank · TP2]` 正方体有 __ 个面、__ 个顶点、__ 条边。 → **6, 8, 12**。／圆柱体有 __ 个平面和 __ 个曲面 → **2, 1**。 — Count faces / vertices / edges / curved surfaces. (feature facts · verified)
- `[true-false · objective · TP2]` 判断对错：圆锥体有一个顶点（对）；圆柱体有 8 个顶点（错）。 — True/false about a solid's property. (feature facts · plausible)
- `[name-count · objective · TP2]` 圆柱体的平面是什么形状？ → **圆**。 — Name a solid's 2D base shape. (DSKP 4.7 · plausible)
- `[net-match · objective · TP3]` 下列展开图可折成哪个立体图形？ → **正方体**。／哪一个是正方体的展开图？ — Net (展开图) ↔ solid. (DSKP 4.7 · plausible)
- `[name-count · constructed · TP1]` 说出/圈出平面图形。(正方形/长方形/三角形/圆) → 三角形有 __ 条边和 __ 个顶点 → **3, 3**。 — Identify 2D shapes; count sides/vertices. (AnyFlip · verified-structure)
- `[classify-sort · activity · TP3]` 把图形按特征分类：边是直线的／边是曲线的。 — Classify shapes by straight vs curved sides. (DSKP 4.7 · plausible)
- `[pattern-continue · fill-blank · TP3]` 接下来的图形是什么？(○△□○△…) — Continue a 2D-shape pattern. (DSKP · plausible)
- `[draw · constructed · TP2]` 画一个三角形／长方形。 — Draw a named 2D shape. (DSKP 4.7 · plausible)
- `[compare · fill-blank · TP4]` 正方形和长方形有什么相同和不同？(同：4 边 4 顶点；异：正方形四边等长) — Compare two 2D shapes. (DSKP · plausible)

### C.8 数据处理 · Data handling (bar chart 条形统计图)

From AnyFlip 万宜 Y2 practice (data ~p58) + DSKP 4.8. Bar charts at this grade use
**one mark = one unit** (no scaled axes; pictograph-only was Year 1).

- `[classify-sort · activity · TP2]` 把资料整理在表格里。(运动 | 人数：足球 5，羽毛球 10，乒乓 6，篮球 3) — Collect / organize data into a table. (AnyFlip · verified-structure)
- `[read-chart · objective · TP2]` 看条形统计图，喜欢足球的有几人？ → **5**。 — Read a single value off a bar. (AnyFlip · plausible)
- `[read-chart · objective · TP2]` 哪一项运动的人数最多／最少？ → **羽毛球／篮球**。 — Most / least (tallest / shortest bar). (AnyFlip · verified-structure)
- `[read-chart · fill-blank · TP3]` 羽毛球比篮球多几人？ → **7**。／一共有多少人？ → **24**。 — Difference between two bars / total. (AnyFlip · plausible)
- `[build-chart · constructed · TP3]` 根据表格完成条形统计图。 — Complete / draw a bar chart from a table. (DSKP 4.8 · plausible)
- `[read-chart · objective · TP4]` 看「小贩所售卖的水果数量」条形统计图回答问题。 — Solve a daily-life problem from a bar chart. (AnyFlip · verified-structure)

### C.9 Extras (`original_dskp_extra` only)

Generate only when the profile is `original_dskp_extra`. The DSKP adds an explicit
problem-solving standard in every topic (solve a routine one-step application, and
the distinctive **write-a-story** item), plus the finer sub-standards below.

- `[write-story · constructed · TP5]` 为算式 `24 ÷ 2 = 12` 编写一个日常生活故事（审题→拟定策略→进行策略→验算）。 — Write a full story that fits a given number sentence (编写故事). (VCR confirms 编故事(1)/(2); DSKP 2.5.1 · plausible)
- `[word-single · constructed · TP4]` （每个课题都有）解答一道日常生活应用题。 — Routine one-step problem-solving standard. (DSKP · plausible)
- `[compose-value · activity · TP3]` 储蓄与消费：记录储蓄／消费（理财，≤ RM1000）。 — Savings & financial literacy. (AnyFlip 储蓄和消费 · verified topic; no verbatim table)
- `[true-false · objective · TP4]` `1/2 = 0.5` 吗？（用图形/实物验证） — Compare a fraction's value directly against a decimal. (DSKP 3.3 · plausible)
- `[draw · constructed · TP3]` 画一条长 6 cm 的直线。 — Draw a straight line of a given length. (DSKP 6.1.2 · plausible)

---

## D. Objective-item distractor patterns (圈出 / choose)

Grounded in the observed answer keys (buxi Std-2 MCQ papers). Distractors should
reflect real child errors, not random numbers.

| Strategy | Mechanism | Example (correct → distractors) |
|---|---|---|
| `false-comparison` | Offer several `> < =` statements; one is true | 「492比429小 / 742比933小 / 203比230大」→ only 742<933 true |
| `off-by-place-round` | Round to the wrong place / wrong direction | 293 → 300 (nearest-ten is 290) |
| `times-vs-add` | Confuse `×` with `+` | `8 × 2` → 10 (=8+2); tick the wrong sentence |
| `product-off-by-fact` | Adjacent times-table fact | product 28: `7×4` vs `7×2` |
| `remainder-dropped` | Drop or mis-state the remainder | `17÷5` → 3 or 2 instead of `3 余 2` |
| `missing-operand-near` | Plausible near-miss for a blank | `__+30=90` → 50 vs 60 |
| `no-carry / no-borrow` | Column arithmetic without carry/borrow | `94+9` → 93 instead of 103 |
| `fraction-bigger-denominator` | Larger denominator "looks bigger" | picks `1/10 > 1/5` |
| `fraction-decimal-mismatch` | Mis-map tenths | `4/10` → 4.0 instead of 0.4 |
| `decimal-point-slip` | Money digits/decimal misplaced | 三十五令吉六十仙 → RM35.50 / RM35.65 |
| `time-notation-slip` | Digit-swap or 24-h confusion | 八时十五分 → 8:50 / 15:08 / 15:8 |
| `clock-hand-swap / nearest-5` | Read minute hand as hour; off by one 5-min mark | 9:25 → 5:45 |
| `unit-confusion` | Wrong unit for the quantity | 重量单位 → 厘米/毫升; cm vs m |
| `estimate-magnitude` | Implausible size for a real object | 脚踏车重 → 150 g / 700 g / 3 公斤 |
| `net-wrong-solid` | A net that folds to a different solid | cube net → 圆柱体 |
| `bar-read-off-by-one` | Misread a bar against the one-unit scale | reads 5 as 4 or 6 |

Rules: keep option magnitudes close and plausible; 3–4 options; exactly one
correct; for constructed items, the "answer" is the value/word/drawing, not a choice.

---

## E. Generator implications (schema note)

```
item := {
  grade:        2,
  topic:        "4.1".."4.8" | "extra",
  tp_level:     1..6,                     // PBD performance level (no exam)
  item_format:  "objective" | "fill-blank" | "constructed" | "activity",
  format_type:  <one of §A IDs>,
  presentation: "plain"|"picture"|"story"|"figure:number-line"|"figure:place-value"
               |"figure:fraction"|"figure:coins"|"figure:clock"|"figure:ruler"
               |"figure:scale"|"figure:cylinder"|"figure:shapes"|"figure:net"
               |"figure:bar-chart"|"figure:table"|"figure:abacus",
  answer_form:  "numeral"|"chinese-word"|"number-sentence"|"quotient-remainder"
               |"fraction"|"decimal"|"measure"|"money"|"time"|"circle"|"match"
               |"order"|"tick"|"drawing"|"chart"|"story",
  bilingual:    { numeral: "235", zh_word: "二百三十五" },
  // objective only:
  options:      [...],                    // 3–4 options
  distractor_strategy: <one of §D>,
}
```

Key gaps vs. the current numeric-`answer` + `makeChoices()` engine (these are the
Year-2 additions flagged in the scope doc §7):
- **New answer types.** `quotient-remainder` (`3 余 2`), `fraction`, `decimal`,
  `measure` (value + unit), `net-match` choices, and `chart` reads cannot be held
  by a single numeric field — they need structured answer types and matching
  graders.
- **New figures.** Fraction diagrams, number lines, rulers/scales/measuring
  cylinders, solid **nets (展开图)**, and **bar charts** need a small figure DSL,
  not prose.
- **Constraints are hard limits, keyed by grade.** ≤1000; `×`/`÷` basic facts only;
  proper fractions; tenths decimals; standard units with **no conversion**; time on
  the 5-minute grid; single-step word problems — enforce at generation and reject
  over-level items. The Y1 and Y2 constraint sets differ and must not leak.
- **Format weighting by topic.** Sample `format_type` from a topic-appropriate
  distribution (§C) — e.g. `read-chart` for Data, `net-match`/`name-count` for
  Shapes, `shade-fraction`/`convert-form` for Fractions & decimals.
- **Profile gating.** `write-story` (编写故事), savings/financial-literacy,
  fraction-vs-decimal equality, and draw-a-line are `original_dskp_extra` — gate
  them behind the profile flag.
- **No exam framing.** `tp_level` is a PBD band, not an exam mark; TP3 explicitly
  includes 确定答案的合理性 (check reasonableness) — a good generatable meta-item.

---

## Sources

Examples were gathered from real SJKC Year-2 practice papers, activity books, and
the official curriculum. **Confidence key:** `verified` = transcribed from a source
downloaded and read verbatim (text layer + its own 答案 key, or an official
*Contoh*); `plausible` = a real source of the right topic/level, but the exact item
is scanned-image-transcribed or standard-derived (no verbatim text exemplar). A key
find: the buxi/30.com.my Std-2 unit PDFs are **text-based** (not scans), so they are
verbatim-`verified`.

| Tag | Source | Topics |
|---|---|---|
| buxi / 30.com.my SJKC 二年级 unit tests (试卷一 6 MCQ + 试卷二 constructed, each with 答案; text-based → **verified**) | Hub: https://30.com.my/sjkc-math-std-2/ (units 1-12: 整数/加/减/乘/除/分数/小数/钱币/时间/长度/质量/体积) | C.1–C.6 |
| Real 二年级数学评审 papers (2018, 第三/四次评审; **scanned** → `plausible`) | via 30.com.my 试卷库 (https://30.com.my/sjkc-exam-papers-standard-2-华小二年级-历年考卷-第一次评审/) | C.4–C.6 |
| AnyFlip 万宜数学练习2 (PRAKTIS KSSR BANGI MM2; text-extractable) | https://anyflip.com/eypgy/gqrx/basic | C.7, C.8 |
| SlideShare/Scribd 单元7.1 确认立体图形 + corroborated solid-feature facts | https://www.slideshare.net/slideshow/7-1_2-_-pptx/284716165 | C.7 |
| DPK Edisi 3 Matematik Tahap 1 (Tahun 2 *Contoh*, verbatim BM) | https://asiemodel.net/wp-content/uploads/2025/02/DOKUMEN-PENJAJARAN_KSSR-MATEMATIK-TAHAP-1_EDISI-3.pdf | C.1–C.3 |
| BPK **SJKC** DSKP KSSR Semakan 2017 Matematik Tahun 2 (Chinese; scope, learning standards, TP1–TP6) | https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-2/90-43-dskp-kssr-semakan-2017-matematik-tahun-2-sjkc/file | all |
| Malaysia VCR SJKC Std2 Math (confirms 编故事 items) | https://sites.google.com/view/msiaclassroom/sjkcstd2/sjkstd2math | C.2, C.9 |

- **Currency note:** Standard 2 in 2026 runs on **KSSR Semakan 2017** (KP2027 reaches
  Year 2 around 2028). All sources are Semakan-2017-era; formats and ranges are
  stable. Scope stays anchored to the Semakan-2017 DSKP/DPK.
- **Verification / exclusions:** each item was checked on-level against §2 hard
  constraints; **over-level material found in the corpus was dropped** — elapsed-time
  arithmetic and 24-h notation (C.5), and measurement unit-conversion (C.6). See the
  "Drop" notes in those sections.
- **Coverage gaps** (generate from the standard, not a captured exemplar): money ÷ and
  the savings/理财 record table (curriculum-confirmed, no verbatim item); the free
  编写故事 composition and 验算/合理性 meta-step (standard-derived); remainder division
  and estimate-quantity verbatim **only in Malay** DPK (Chinese exemplar not captured);
  一刻/三刻 wording (corpus uses 十五分/四十五分); draw-clock-hands (corpus clocks are
  read-only; parallels the verified draw-pointer/draw-level); net (展开图) and
  bar-chart phrasings (grounded in DSKP scope, AnyFlip renders only partially).
- **Note on gathering:** C.1–C.6 came from two research agents over the text-based
  papers; C.7–C.9 were gathered directly after two subagent attempts on that slice
  returned prompt-injection payloads instead of research (disregarded).
- Scope, curriculum status, profiles, and PBD levels: see
  [standard-2-sjkc-math.md](./standard-2-sjkc-math.md).
