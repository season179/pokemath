# Standard 3 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-3-sjkc-math.md](./standard-3-sjkc-math.md). That doc says
**what content** a Standard 3 question may contain. This doc says **how it is
asked** — the authentic formats used by SJKC Year-3 practice papers and the
official curriculum, so the LLM generator produces varied, age-correct items.

> **Why this exists.** Year 3 is the top of Tahap 1 and the first grade where
> combined / multi-step operations are genuinely in scope. It also adds hundredths,
> percentages, compound-unit arithmetic, prisms, symmetry, coordinates, and pie
> charts. Those topics need much more than direct arithmetic: tables, diagrams,
> movement instructions, multi-part questions, drawing, and chart reading.

## How to use for prompting

1. Pick a **topic** (§4.1–4.9 of the scope doc, or `original_dskp_extra`) and a
   **PBD level** (TP1–TP6 → difficulty).
2. Sample a **format** from the taxonomy (§A), weighted toward that topic (§C).
3. Sample an **item shape** (§B): `objective`, `fill-blank`, `constructed`, or
   `activity`.
4. If `objective`, derive distractors from a child-error strategy (§D).
5. Apply the scope doc's hard constraints: numbers/results ≤10 000; allowed
   divisors; fraction/decimal bounds; only the three stated unit pairs; first-
   quadrant coordinate language; and no arbitrary percentage-of-quantity items.

As at every grade, format is largely **topic-independent**: `compute`, `compare`,
`table-read`, `multipart`, and `verify-reasonable` recur across operations, money,
time, and measurement. The taxonomy is the reusable core; §C supplies authentic
weighting and phrasing.

---

## A. Cross-cutting format taxonomy

Each format has a generator ID (`format_type`). Presentation and answer form are
separate axes (§E). Formats new or newly prominent at Year 3 are marked ⁺.

| ID | Format | What the pupil does |
|---|---|---|
| `compute` | Direct computation | Evaluate a `+ − × ÷` sentence, now including three values and compound units |
| `fill-blank` | Fill the blank | Complete a sentence, sequence, table, or missing term |
| `solve-unknown` ⁺ | Find an unknown | Solve a one-operation letter/blank equation such as `108 ÷ y = 9` |
| `remainder-division` | Division with remainder | Give both quotient and remainder |
| `convert-form` | Convert representation | Numeral ↔ Chinese words; fraction ↔ decimal ↔ percent |
| `place-value` | Place & digit value | Name 数位/数值; decompose or compose a four-digit number |
| `pattern-continue` | Continue a pattern | Extend or complete number/shape patterns |
| `compare` | Compare | Use 大/小, 多/少, `> < =`, difference, or a bounded range |
| `order-sequence` | Order / before-after | Arrange ascending/descending; identify between/before/after |
| `round` | Round | Round to nearest ten, hundred, or thousand |
| `estimate` | Estimate | Estimate a quantity against a reference using 多于/少于 |
| `number-line` | Number-line reasoning | Read a marked value, interval, decimal, or missing term |
| `figure-read` | Read a figure | Extract values from an abacus, clock, diagram, cards, grid, or pictured set |
| `table-read` ⁺ | Read a table | Extract absolute/relative entries, then compare or compute |
| `model-equation` ⁺ | Model the situation | Choose/write the number sentence represented by a story or picture |
| `word-single` | Single-step word problem | Apply one operation in a daily-life context |
| `word-multi` ⁺ | Multi-step word problem | Chain two or more related steps; first legitimate at Year 3 |
| `multipart` ⁺ | Structured multi-part | Answer `(a)(b)` parts, often using (a) in (b) |
| `shade-fraction` | Shade / name a fraction | Shade or circle a stated fraction of a shape/set; name a shaded part |
| `shade-hundred` ⁺ | Shade / read a hundred-square | Represent or read a hundredths decimal / percentage |
| `unit-convert` ⁺ | Convert units | `m↔cm`, `kg↔g`, `ℓ↔mℓ`, `h↔min`, `min↔s` only |
| `compound-unit` ⁺ | Compound-unit arithmetic | Compute/regroup answers such as `7 m 61 cm` or `4 h 14 min` |
| `count-money` | Read a money representation | Total pictured notes/coins or a 1:4 abacus money value |
| `read-instrument` | Read clock / scale | Read an analogue clock, ruler, scale, or measuring cylinder |
| `name-count` | Name / count a shape | Identify prism/polygon; count faces, vertices, edges, symmetry axes |
| `classify-sort` | Classify / sort | Prism vs non-prism; need vs want; data categories |
| `draw` | Draw / construct | Draw a polygon/prism from properties or complete a representation |
| `draw-symmetry` ⁺ | Draw symmetry axis | Draw all / a specified number of lines of symmetry |
| `coordinate-read` ⁺ | Read/name a grid position | Name the object at horizontal/vertical axis positions, or state its position |
| `move-route` ⁺ | Follow/describe movement | Move right/up/east/north from a reference point and name the destination |
| `read-chart` | Read a data display | Read table/tally/pictograph/bar/pie: value, most/least, difference, total |
| `relate-charts` ⁺ | Relate data displays | Match the same data across pictograph ↔ bar chart ↔ pie chart |
| `build-table` | Organise data | Complete tally marks, frequencies, or a simple table from raw data |
| `true-false` | Judge / error-spot | Select the correct/incorrect statement or equation |
| `write-story` | Write a story (编写故事) | Compose a daily-life story for a given sentence _(extra)_ |
| `verify-reasonable` | Check reasonableness | Decide whether a result is reasonable and justify briefly |

`presentation` axis: `plain` · `picture` · `story` · `table` ·
`figure:number-line` · `figure:place-value` · `figure:fraction` ·
`figure:hundred-square` · `figure:coins` · `figure:clock` · `figure:calendar` ·
`figure:ruler` · `figure:scale` · `figure:cylinder` · `figure:shapes` ·
`figure:grid` · `figure:pictograph` · `figure:bar-chart` · `figure:pie-chart` ·
`figure:abacus`.

`answer_form` axis: `numeral` · `chinese-word` · `number-sentence` ·
`quotient-remainder` · `fraction` · `decimal` · `percentage` · `measure` ·
`compound-unit` · `money` · `time` · `position` · `direction` · `label` ·
`symmetry-count` · `circle` · `order` · `tick` · `drawing` · `story`.

---

## B. Assessment context (still **no exam**)

- **Standard 3 has no national exam.** Assessment is classroom **PBD** (课堂评估),
  not UASA. `tp_level` is a performance band, not an exam mark.
- Authentic sources still use worksheet/test shapes that the generator can model:
  - `objective` — choose/circle one of A–D.
  - `fill-blank` — write a missing value, word, table entry, or label.
  - `constructed` — show working, answer a diagram, draw, or write a story.
  - `activity` — shade, circle, classify, draw, tally, or follow a route.
- Year 3 makes `multipart` and `word-multi` prominent. A part (b) may depend on
  part (a), but every intermediate result must remain within grade constraints.
- Use Chinese mathematical wording, local MYR contexts, and the 1:4 abacus as a
  representation. Keep Malay/English glosses for the UI.
- Do not generate a UASA-style paper or attach marks/grades as if Year 3 were
  Tahap 2.

Generator param: `item_format: objective | fill-blank | constructed | activity`.

---

## C. Per-topic format catalog (authentic examples)

Examples are tagged `[format · item_format · TP]` with source and confidence.
`verified` means verbatim from a text-layer source and its answer key, or an
official DPK *Contoh*. `plausible` means standard-derived phrasing where no
verbatim SJKC exemplar was captured. English glosses are compact rather than
word-for-word translations.

### C.1 一万以内的整数 · Whole numbers to 10 000

- `[convert-form · objective · TP1]` 把 `4 630` 写成文字。→ **四千六百三十**。／把三千一百五十九写成数字。→ **3 159**。 — Numeral ↔ Chinese words. (buxi · verified)
- `[place-value · objective · TP1]` 在 `7 133` 中，7 的数值是？→ **7 000**。／在 `6 187` 中，1 的数位是？→ **百位**。 — Digit value vs place. (buxi · verified)
- `[figure-read · objective · TP2]` 看 1:4 珠算盘，写出所显示的数目。→ **673**。 — Read an abacus. (buxi · verified)
- `[order-sequence · objective · TP2]` `4 398` 与 `6 289` 之间的是哪一个数？→ **4 410**。 — Choose a number between two bounds. (buxi · verified)
- `[number-line · objective · TP2]` `7 250, 7 350, 7 450, Y, 7 650`，Y 是多少？→ **7 550**。 — Read a constant-step line. (buxi · verified)
- `[pattern-continue · constructed · TP3]` `2 105, 2 110, X, 2 120, Y`。→ **X=2 115；Y=2 125**。 — Complete a pattern. (buxi · verified)
- `[round · constructed · TP3]` 写出 `5 285` 的百位近似值。→ **5 300**。／`6 400` 的千位近似值 → **6 000**。 — Round to the required place. (buxi / DPK · verified)
- `[figure-read · constructed · TP3]` 用 `4, 6, 0, 2` 组成最大的四位数，再以文字写出。→ **6 420；六千四百二十**。 — Compose from digit cards, then convert. (buxi · verified)
- `[estimate · objective · TP3]` 以 `1 200 粒` 的罐子作参考，估计 Q 少于 1 200 粒、R 多于 1 200 粒。 — Estimate relative to a pictured reference set. (buxi · verified)

### C.2 基本运算 · Operations (`+ − × ÷`, combined `+ −`)

- `[compute · objective · TP2]` `125 + 302 + 4 251 =` **4 678**；`8 154 − 2 724 − 1 831 =` **3 599**。 — Three-value computation. (buxi · verified)
- `[true-false · objective · TP3]` 以下哪项不正确？`3 491 − 2 463 = 128`。→ **不正确**（应为 1 028）。 — Spot the incorrect equation. (buxi · verified)
- `[table-read · multipart · TP4]` 水族馆三个月人数：1 487、1 963、第三个月比第一个月多 382。(a) 第三个月？→ **1 869**；(b) 三个月总数？→ **5 319**。 — Relative table entry, then total. (buxi · verified)
- `[word-multi · constructed · TP4]` 第一个月卖 1 548 盘鸡饭，第二个月多 735 盘；两个月共多少？→ `1 548 + 1 548 + 735 =` **3 831**。 — Find a relative amount, then total. (buxi · verified)
- `[word-multi · constructed · TP4]` 工厂有 8 713 个杯子，打破 645 个，再送出 5 500 个，还剩多少？→ **2 568**。 — Chained subtraction. (buxi · verified)
- `[model-equation · objective · TP2]` 哪组重复加法与乘法相符？`2+2+2+2+2+2` ↔ **`6×2`**。 — Match repeated addition to multiplication. (buxi · verified)
- `[figure-read · objective · TP2]` 看苹果分组图，写出乘法算式。→ **`5×4`**。 — Picture → equation. (buxi · verified)
- `[solve-unknown · objective · TP3]` `108 ÷ y = 9`，y =？→ **12**。 — One-operation unknown. (buxi · verified)
- `[remainder-division · constructed · TP3]` `988 ÷ 3 =` **329 余 1**；每罐 329 颗，剩 1 颗。 — Quotient plus contextual remainder. (buxi · verified)
- `[multipart · constructed · TP4]` 心怡与两个妹妹平分 117 颗糖。(a) 每人 **39** 颗；(b) 每天吃 3 颗，要 **13 天**。 — Dependent two-part division. (buxi · verified)
- `[compute · constructed · TP3]` `2 060 + 580 − 1 550 =` **1 090**。 — Combined addition/subtraction. (DPK Contoh · verified)

### C.3 分数、小数与百分比 · Fractions, decimals & percentages

- `[convert-form · objective · TP1]` 把 `2/3` 写成文字。→ **三分之二**。／把五分之二写成数字。→ **2/5**。 (buxi · verified)
- `[shade-fraction · objective · TP2]` 看等分圆形，写出阴影部分代表的分数。→ **3/4**。 — Read a fraction diagram. (buxi · verified)
- `[shade-fraction · activity · TP2]` 把 10 支铅笔中的 `6/10` 圈起来。／把长方形的 `1/5` 涂黑。 — Fraction of a set / shape. (buxi · verified)
- `[true-false · objective · TP2]` 以下哪项不是 `1/2` 的等值分数？→ **3/7**。／把 `6/8` 写成最简分数 → **3/4**。 (buxi · verified)
- `[classify-sort · objective · TP1]` P 是一个分数，P 不是真分数；找出 P。→ **8/6**。 — Identify improper vs proper fraction. (buxi · verified)
- `[compute · constructed · TP3]` `2/5 + 1/5 =` **3/5**；`5/6 − 1/3 =` **1/2**。 — Add/subtract two proper fractions only. (DSKP 3.1.5–3.1.6 · plausible)
- `[convert-form · objective · TP1]` 把 `18/100` 写成小数。→ **0.18**。／把 `0.03` 写成分数。→ **3/100**。 (buxi · verified)
- `[shade-hundred · objective · TP2]` 看百格图，写出阴影部分的小数。→ **0.08**。／按 `0.62` 把百格图涂色。 (buxi · verified)
- `[number-line · constructed · TP2]` 数轴从 `0.40` 到 `0.60`，J 所在位置是？→ **0.46；零点四六**。 (buxi · verified)
- `[compare · constructed · TP3]` 写出三个比 `0.63` 大的小数。／写出三个介于 `0.58` 与 `0.64` 之间的小数。→ **0.59–0.63 中任三个**。 (buxi · verified)
- `[compute · constructed · TP3]` `0.34 + 0.25 =` **0.59**；`0.83 − 0.27 =` **0.56**。 — Decimal +/−, result ≤0.99. (DSKP 3.2.4–3.2.5 · plausible)
- `[convert-form · objective · TP1]` 把 `0.43` 写成百分比。→ **43%**；把 `23/100` 写成百分比。→ **23%**。 (buxi · verified)
- `[shade-hundred · activity · TP2]` 把百格图的 `56%` 涂黑。／从百格图读出阴影部分 → **60%**。 (buxi · verified)
- `[word-single · constructed · TP4]` 100 个电池中 78 个合格，不合格的百分比是多少？→ `100−78=22`，**22%**。 — Base-100 representation, not arbitrary percent-of-quantity. (buxi · verified)

> **Drop (over-level):** no fraction ×/÷, no decimal ×/÷, no decimals beyond two
> places, and no “find 28% of 250” type. Percentage stories must be direct
> parts-of-100 representations.

### C.4 钱币 · Money (≤ RM10 000)

- `[count-money · objective · TP1]` 看钱币图，写出币值。→ **RM173.20**。／看 1:4 珠算盘 → **RM536.05**。 (buxi · verified)
- `[compute · objective · TP3]` `RM431.80 − RM314.70 =` **RM117.10**；`RM122 × 4 =` **RM488**；`RM344 ÷ 8 =` **RM43**。 (buxi · verified)
- `[table-read · constructed · TP3]` 三人的存款 RM264.10、RM229.70、RM291.60，总数 → **RM785.40**。 (buxi · verified)
- `[word-single · constructed · TP4]` 扑满原有 RM292.80，存入红包后有 RM627；红包钱多少？→ **RM334.20**。 — Find the original change/addend. (buxi · verified)
- `[word-multi · constructed · TP4]` 有 RM593.30，买两张 RM164.50 的票后剩多少？→ **RM264.30**。 (buxi · verified)
- `[multipart · constructed · TP4]` 每天薪水 RM90：(a) 一星期 **RM630**；(b) 买 RM589.90 相机后剩 **RM40.10**。 (buxi · verified)
- `[classify-sort · activity · TP2]` 把食物、房屋分为“需要”，玩具、雪糕分为“想要”；说明储蓄与消费的选择。 (DPK 4.4 · plausible)
- `[classify-sort · objective · TP1]` 认出 ASEAN 货币（泰铢、新加坡元、印尼盾等），**不计算汇率**。 (DPK 4.3 · plausible)

### C.5 时间与时刻 · Time

- `[read-instrument · objective · TP1]` 看钟面，写出时刻。→ **7 时 30 分**。 (buxi · verified)
- `[figure-read · objective · TP2]` 看日历：四月份第二个星期五是几日？→ **14 日**。 (buxi · verified)
- `[table-read · objective · TP3]` 时间表：4:30 开始画画，20 分钟后爸爸到家。→ **下午 4:50**。 (buxi · verified)
- `[unit-convert · objective · TP2]` 哪项正确？`9 分钟 =` **540 秒**；`8 小时 =` **480 分钟**。 (buxi · verified)
- `[compound-unit · objective · TP3]` `1 小时 29 分钟 + 2 小时 53 分钟 =` **4 小时 22 分钟**。 (buxi · verified)
- `[compute · objective · TP3]` `10 分钟 44 秒 + 23 分钟 9 秒 + 14 分钟 36 秒 =` **48 分钟 29 秒**。 (buxi · verified)
- `[word-single · constructed · TP4]` 看 9 集电视剧，每集 47 分钟，共 → **423 分钟**。／288 分钟做 6 条手链，每条 → **48 分钟**。 (buxi · verified)
- `[word-multi · constructed · TP4]` 有 5 小时 45 分钟空闲；整理花园 2 小时 17 分钟，再打扫 1 小时 52 分钟；剩 → **1 小时 36 分钟**。 (buxi · verified)
- `[multipart · constructed · TP4]` 三人跑步共用 6 小时；平均一人 → **2 小时**。 (buxi · verified)

### C.6 度量衡 · Measurement (unit conversion + compound units)

The same formats recur across length (`m/cm`), mass (`kg/g`), and liquid volume
(`ℓ/mℓ`). Keep conversions to these pairs only.

- `[unit-convert · objective · TP2]` `2 400 cm =` **24 m**；`7 000 g =` **7 kg**；`3 ℓ =` **3 000 mℓ**。 (buxi · verified)
- `[compound-unit · objective · TP3]` `5 m 64 cm + 1 m 59 cm + 6 m 13 cm =` **13 m 36 cm**。 (buxi · verified)
- `[compound-unit · objective · TP3]` `28 kg 755 g − 6 kg 318 g − 12 kg 429 g =` **10 kg 8 g**。 (buxi · verified)
- `[compute · objective · TP3]` `4 ℓ 220 mℓ × 4 =` **16 ℓ 880 mℓ**；`3 425 mℓ ÷ 5 =` **685 mℓ**。 (buxi · verified)
- `[word-single · objective · TP4]` 妈妈有 231 cm 的布，还需要 164 cm；窗帘共需 → **395 cm**。 — Find the required whole. (buxi · verified)
- `[table-read · constructed · TP4]` 三张桌子长 `1 m 47 cm, 1 m 52 cm, 96 cm`，总长 → **3 m 95 cm**。 (buxi · verified)
- `[word-multi · constructed · TP4]` 594 m 铁丝，第一天用 224 m，第二天用 176 m，剩 → **194 m**。 (buxi · verified)
- `[multipart · constructed · TP4]` 三人平均身高 1 m 61 cm：(a) 总高 **4 m 83 cm**；后续可用总量求未知身高。 (buxi · verified)
- `[word-multi · constructed · TP4]` 西瓜汁三天数据中，先求第二天，再求总量 **13 ℓ 200 mℓ**，最后平均一天 **4 ℓ 400 mℓ**。 (buxi · verified)

> Reject values or conversions outside `m↔cm`, `kg↔g`, `ℓ↔mℓ`; no area,
> perimeter, volume formula, temperature, or decimal-unit conversion.

### C.7 空间 · Space, prisms, polygons & symmetry

- `[classify-sort · objective · TP1]` 以下哪项是非棱柱体？／以下哪项是棱柱体？ — Classify pictured solids. (buxi · verified)
- `[name-count · objective · TP1]` 看立体，写出名称。→ **三角棱柱体**。 (buxi · verified)
- `[true-false · objective · TP2]` 关于长方棱柱体哪项不正确？→ “**8 个表面**”（应为 6）。 (buxi · verified)
- `[name-count · objective · TP2]` W 有 12 条边、6 个表面、底面是正方形；W 是？→ **正方棱柱体**。 (buxi · verified)
- `[name-count · objective · TP1]` 看平面图形，写出名称。→ **五边形 / 八边形**。 (buxi · verified)
- `[draw · constructed · TP3]` 根据“8 条相等直边、8 个顶点、没有曲边”画图。→ **正八边形**。 (buxi · verified)
- `[draw-symmetry · activity · TP2]` 画出所给图形的所有对称轴。／画一个只有 1 条对称轴的图形。 (buxi · verified)
- `[name-count · objective · TP2]` 这个图形有几条对称轴？／哪个图形没有对称轴？ (buxi · verified)
- `[name-count · constructed · TP2]` 写出五边形的任何两个特征。→ **5 条相等直边、5 个顶点、没有曲边、一个平面**（任二）。 (buxi · verified)

### C.8 坐标 · Coordinates (first quadrant, no `(x,y)` notation)

- `[coordinate-read · objective · TP1]` 以参考点说明物体位置：在参考点的**右边／上方／东边／北边**。 (DPK 8.1.1 · plausible)
- `[move-route · activity · TP2]` 向右走 3 步，然后向北走 5 步；说出该位置的物体。 (DPK Contoh · plausible — translated from the official Malay example)
- `[coordinate-read · constructed · TP2]` 根据横轴与纵轴所显示的位置，说出物体名称。 (SJKC DSKP 8.1.2 · plausible)
- `[coordinate-read · fill-blank · TP3]` 看第一象限格图，写出星星在横轴第 __ 格、纵轴第 __ 格。 (SJKC DSKP 8.1.3 · plausible)
- `[move-route · constructed · TP4]` 从课室参考点出发，先向东再向北到达哪个地点？写出走法与终点。 (SJKC DSKP 8.2 · plausible)

> **Do not use ordered pairs `(x, y)`, an origin, negative coordinates, or other
> quadrants.** Year 3 names horizontal/vertical positions and movement in words;
> formal ordered-pair notation comes later.

### C.9 数据处理 · Data handling (table/tally + pie chart)

- `[table-read · objective · TP2]` 食物人数表：喜欢咖喱面的有多少人？→ **8**；哪个年级人数最少？→ **二年级**。 (buxi · verified)
- `[table-read · objective · TP3]` 动物园男成人 16、女成人 22、儿童 17；共有 → **55 人**。 (buxi · verified)
- `[build-table · activity · TP2]` 按学生最喜欢的水果完成记数符号与数量表。→ 苹果 8、草莓 7、西瓜 7、樱桃 5、香蕉 4。 (buxi · verified)
- `[table-read · constructed · TP3]` 哪两种水果人数相同？→ **草莓和西瓜**；一共有多少学生？→ **31**。 (buxi · verified)
- `[build-table · constructed · TP3]` 把零用钱按 RM16–20、21–25、26–30、31–35 分类，完成 tally/frequency。→ **5, 7, 5, 4**。 (buxi · verified)
- `[read-chart · objective · TP2]` 看日常情境饼图：哪一类最多／最少？说出标题和图例所代表的资料。 (DPK 9.2 · plausible)
- `[read-chart · constructed · TP3]` 从饼图读取指定类别的资料，并用“多于／少于／相同”比较两个扇区。 (SJKC DSKP 9.2 · plausible)
- `[relate-charts · activity · TP3]` 同一组资料分别以象形统计图、条形统计图和饼图表示；把相同类别/数量连起来，并判断三图是否一致。 (DPK 9.2.2 · plausible)

> **Coverage boundary:** Year 3 reads a pie chart and relates it to other displays;
> the standard does **not** require constructing a pie chart or calculating angles.

### C.10 Extras (`original_dskp_extra` only)

- `[write-story · constructed · TP5]` 为 `2 060 + 580 − 1 550 = 1 090` 编写一个日常生活故事，并按 审题→策略→计算→验算 作答。 (SJKC DSKP 2.7 · plausible)
- `[write-story · constructed · TP5]` 为一个分数加减、小数加减或**百格图百分比**算式编写故事。百分比仍只可表示 parts-of-100；不可写 arbitrary “28% of 250”。 (SJKC DSKP 3.5 · plausible)
- `[verify-reasonable · constructed · TP3–5]` 先估算/逆运算，再说明答案是否合理。 (SJKC DSKP performance standards · plausible)
- `[classify-sort · activity · TP2]` 说明储蓄与投资如何满足未来需要；可认识当前 RM 与 ASEAN 外币兑换率，但汇率数据必须实时提供，不能由模型臆造。 (SJKC DSKP 4.6–4.7 · plausible)

---

## D. Objective-item distractor patterns (圈出 / choose)

Grounded in the observed buxi A–D options. Wrong answers should be reachable by a
real pupil error, not random values.

| Strategy | Mechanism | Example (correct → distractors) |
|---|---|---|
| `digit-transposition` | Same digits in wrong order | 1 307 → 1 370 / 1 037 |
| `place-value-shift` | Right digit, wrong magnitude/place | 7 in 7 133 → 700 / 70 / 7 |
| `rounding-neighbour` | Wrong direction/place | 2 948 → 2 940 / 3 000 instead of 2 950 |
| `no-carry-borrow` | Omit regrouping | 4 627+2 351 → 6 877 instead of 6 978 |
| `omit-a-step` | Offer an intermediate result | chained subtraction returns value after first subtraction |
| `product-near-fact` | Adjacent fact/carry error | 154×6 → 824 / 724 / 624 instead of 924 |
| `remainder-variant` | Drop/change remainder | 247÷3 → 82 / 82余2 / 82余3 instead of 82余1 |
| `unknown-inverse-slip` | Apply wrong inverse | `108÷y=9` → 9/10/11 instead of 12 |
| `fraction-bigger-denominator` | Treat larger denominator as larger value | choose 1/10 > 1/5 |
| `fraction-equivalence-slip` | Numerator/denominator not scaled equally | 2/4 → 3/7 |
| `decimal-point-shift` | Right digits, wrong scale/order | 18/100 → 18 / 1.8 / 0.81 instead of 0.18 |
| `percent-scale-slip` | Forget/misapply ×100 | 0.43 → 0.43% / 4.3% / 430% |
| `money-cent-slip` | Wrong sen regrouping/decimal digits | RM431.80−RM314.70 → RM117.50 / RM127.10 |
| `compound-base-slip` | Regroup as base 10 rather than 60/100/1000 | 5m64cm+1m59cm+6m13cm → 12m36cm |
| `time-conversion-slip` | Wrong unit factor | 9 min → 90 / 900 s instead of 540 s |
| `shape-property-slip` | Confuse prism feature counts | rectangular prism → 8 faces instead of 6 |
| `symmetry-off-by-one` | Miss/double-count an axis | 4 axes → 3 or 2 |
| `direction-axis-swap` | Swap horizontal/vertical or east/north | right 3/up 5 → right 5/up 3 |
| `chart-category-slip` | Read adjacent category / omit category in total | total 55 → 38 / 39 |

Rules: use 3–4 comparable options; exactly one correct; preserve units in every
option; and never make an option violate the grade's hard range so obviously that
it ceases to diagnose a real misconception.

---

## E. Generator implications (schema note)

```
item := {
  grade:        3,
  topic:        "4.1".."4.9" | "extra",
  profile:      "dpk3_2026_core" | "original_dskp_extra",
  representation: "sjkc_representation",       // always on
  tp_level:     1..6,                     // PBD performance level; no exam
  item_format:  "objective" | "fill-blank" | "constructed" | "activity",
  format_type:  <one of §A IDs>,
  presentation: "plain"|"picture"|"story"|"table"|"figure:number-line"
               |"figure:place-value"|"figure:fraction"|"figure:hundred-square"
               |"figure:coins"|"figure:clock"|"figure:calendar"|"figure:ruler"
               |"figure:scale"|"figure:cylinder"|"figure:shapes"|"figure:grid"
               |"figure:pictograph"|"figure:bar-chart"|"figure:pie-chart"
               |"figure:abacus",
  answer_form:  "numeral"|"chinese-word"|"number-sentence"|"quotient-remainder"
               |"fraction"|"decimal"|"percentage"|"measure"|"compound-unit"
               |"money"|"time"|"position"|"direction"|"label"|"symmetry-count"
               |"circle"|"order"|"tick"|"drawing"|"story",
  num_parts:    1..3,
  depends_on:   [part_id...],              // for multipart chains
  // objective only:
  options:      [...],
  distractor_strategy: <one of §D>,
}
```

Key Year-3 requirements beyond the current numeric `answer` + `makeChoices()`
engine:

- **Multi-step dependency graph.** `word-multi` and `multipart` need explicit
  intermediate values, part dependencies, and validation of every step.
- **Structured, unit-aware answers.** Fractions, percentages, remainders,
  compound units, money, time, coordinate positions, and symmetry cannot be
  graded reliably as one number.
- **Figure DSL expansion.** Add hundred-squares, first-quadrant word-position
  grids, prisms/symmetry, calendars, and pie charts. Coordinate grids must not
  expose formal `(x,y)` notation at this grade.
- **Constraint validation keyed by grade.** Enforce ≤10 000; allowed multiplier/
  divisor set; fraction denominator pairings; decimal result ≤0.99; percentage as
  direct hundredths only; exact unit pairs; first quadrant; read-only pie charts.
- **Topic-weighted format sampling.** E.g. `move-route` only for Coordinates,
  `read-chart`/`relate-charts` for Data, `compound-unit` for Time/Measurement, and
  `shade-hundred` for decimals/percentages.
- **Profile gating.** Free story-writing, explicit multi-strategy problem solving,
  savings/investment, and current exchange-rate awareness belong to
  `original_dskp_extra`. Any exchange-rate value must be supplied live.
- **No exam framing.** Keep `tp_level`; do not use UASA `mcq/subjective`, marks, or
  paper-level grading for Year 3.

---

## Sources

The core examples come from 29 text-layer SJKC Year-3 unit-test PDFs. Each has
objective and/or constructed items plus its own answer key, so transcribed items
can be tagged `verified`.

| Tag | Source | Topics |
|---|---|---|
| buxi / 30.com.my SJKC 三年级 unit tests (units 1–15; text-based PDFs with 答案) | Hub: https://30.com.my/sjkc-math-std-3/ | C.1–C.7, C.9 |
| DPK Edisi 3 Matematik Tahap I, Tahun 3 (official *Contoh* and core standards) | https://asiemodel.net/wp-content/uploads/2025/02/DOKUMEN-PENJAJARAN_KSSR-MATEMATIK-TAHAP-1_EDISI-3.pdf | all; especially combined operations, coordinates, pie chart |
| BPK SJKC DSKP KSSR Semakan 2017 Matematik Tahun 3 (Chinese) | https://bpk.moe.gov.my/kurikulum/kssr/kssr-tahun-3/132-dskp-kssr-semakan-2017-matematik-tahun-3-sjkc-v3/file | scope, TP mapping, `original_dskp_extra` |

- **Currency note:** Year 3 in 2026 is KSSR Semakan 2017, not KP2027. Content
  scope is anchored to the official DPK/DSKP even where older practice sheets show
  stable formats.
- **Coverage gaps:** the buxi corpus does not cover coordinates or the current
  pie-chart emphasis. Those phrasings are standard-derived and explicitly `plausible`; no
  claim of a captured Chinese worksheet exemplar is made.
- **Exclusions:** source typos/mis-keyed conversions were not reused. Items outside
  the scope guardrails (formal `(x,y)`, pie-chart angle/construction, arbitrary
  percent of a quantity, unsupported units) were dropped.
