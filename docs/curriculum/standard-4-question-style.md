# Standard 4 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-4-sjkc-math.md](./standard-4-sjkc-math.md). That doc says
**what content** a Standard 4 question may contain. This doc says **how it is
asked** — the many authentic *formats* real SJKC papers use, so the LLM generator
produces genuine variety instead of only narrative word problems.

> **Why this exists.** The frozen prototype bank (`questions-data.js`) shows exactly
> **one** style: the multi-step Chinese word problem. Real Standard 4 papers use
> ~20 distinct formats, most of them *not* word problems (direct computation,
> fill-in-the-blank, solve-for-unknown, figure reading, error-spotting, model-the-
> equation, tick-the-box, construct-a-chart, …). A generator that only emits word
> problems is unrepresentative and quickly boring. Feed the taxonomy below as the
> generator's **format menu**; sample a format per item.

## How to use for prompting

1. Pick a **topic** (§5.1–5.8 of the scope doc) and a **TP level** (difficulty).
2. Sample a **format** from the cross-cutting taxonomy (§A) — weight toward the
   formats that actually occur for that topic (per-topic catalog, §C).
3. Sample an **item_format**: `mcq` (Kertas 1 objective) or `subjective`
   (Kertas 2 constructed-response). See §B for the two exam modes.
4. If `mcq`, build distractors with an authentic **distractor strategy** (§D) —
   this is what makes a generated MCQ feel real.
5. Apply the scope doc's **hard constraints** (number range, allowed operations)
   as guardrails so the format never smuggles in out-of-level content.

The format is largely **topic-independent**: "solve for the unknown", "read the
figure", "multi-part (i)(ii)(iii)" apply to fractions, money, or geometry alike.
So the taxonomy (§A) is the reusable core; the per-topic catalog (§C) just records
which formats are common where, with authentic examples.

---

## A. Cross-cutting format taxonomy

Each format has an ID for the generator (`format_type`). Presentation and
answer-form are separate axes (see §E params).

| ID | Format | What the pupil does |
|---|---|---|
| `compute-direct` | Direct computation | Evaluate a given number sentence, horizontal or vertical (竖式) |
| `fill-sentence` | Complete the number sentence | Fill a blank/□ inside an equation to make it true |
| `solve-unknown` | Solve for the unknown | Find the value of a letter/□ (`P + 29 474 = 51 259`) — pre-algebra |
| `name-unknown` | **Identify** the unknown | Say *what quantity* is unknown in a story — NOT its value |
| `model-equation` | Model / represent | Write the number sentence (or draw the model) that fits a story |
| `word-single` | Single-step word problem | One operation to answer |
| `word-multi` | Multi-step word problem | Two+ chained operations |
| `multipart` | Structured multi-part | `(i)(ii)(iii)` or `(a)(b)` parts, usually escalating |
| `table-read` | Table-based | Read a table (often with "比…多/少" relative entries) then compute |
| `figure-read` | Figure/diagram-based | Read a number line, number cards, shapes, packaging, grid, clock |
| `dialogue` | Speech-bubble scenario | Two characters' bubbles carry the data; combine them |
| `compare-select` | Compare / select (MCQ) | Pick largest product, the correct equation, the matching pattern |
| `order-pattern` | Order / sequence / pattern | Arrange ascending/descending; find missing term; extend a pattern |
| `convert` | Convert | Between units (cm↔m, min↔s) or forms (numeral↔words↔expanded) |
| `round-embed` | Rounding embedded | Round a value, or solve-then-round, or "which pair rounds the same" |
| `estimate-range` | Answer as a range (MCQ) | Options are intervals ("介于 6 000 至 6 500 之间") |
| `error-spot` | Error-spotting / correction | Given a wrong worked solution, find the error or the gap |
| `remainder-context` | Remainder interpretation | Division-with-remainder read into a real context (boxes, pots → ceil/floor) |
| `construct-display` | Construct a data display | Draw/complete a pictograph or bar chart from data |
| `tick-select` | Tick the correct box(es) | Put ✓ in the right cell(s) among candidates |
| `match-connect` | Match / connect (连一连) | Draw lines pairing equivalent items across two columns |
| `shade-represent` | Shade / represent | Colour a diagram/grid to show a fraction, decimal, or % |
| `name-select` | Name / identify | Name a shape, or pick which line is parallel/perpendicular |

`presentation` axis (orthogonal to format): `plain` · `word` · `table` ·
`figure:number-line` · `figure:cards` · `figure:shapes` · `figure:packaging` ·
`figure:grid` · `figure:clock` · `figure:scale` · `figure:money` ·
`figure:pictograph` · `figure:bar-chart` · `figure:diagram` · `dialogue`.

`answer_form` axis: `value` · `remainder` · `range` · `equation` · `words` ·
`expanded-form` · `ordering` · `rounded` · `tick` · `drawing` · `fraction` ·
`decimal` · `percent` · `compound-unit` · `coordinate` · `label` · `route`.

---

## B. The two exam modes (Tahap 2 / UASA)

- **Kertas 1 — objective (试卷一 / 选择题).** ~**40 MCQ**, each with options
  **A B C D**, one correct; pupil shades the answer sheet. Instruction seen
  verbatim: *"每题附有 A、B、C 和 D 四个选项，只可选一个答案…"*. Covers the full
  breadth of formats but each item is short. Distractors matter enormously (§D).
- **Kertas 2 — subjective (试卷二 / 主观题).** ~**15 items**, marks per item shown
  (e.g. `(2 分)`), pupil must **show working** (*"必须把所有的算草写出来"*). Heavy on
  `multipart`, `model-equation`, `table-read`, `figure-read`, `construct-display`.
- **Classroom PBD** (校内评审) uses the same two shapes; early-year papers are
  often single-topic (the two real papers mined for §C.1 were March tests covering
  Topic 1 only).

Generator param: `item_format: mcq | subjective`. MCQ ⇒ 4 options + distractor
strategy. Subjective ⇒ may carry `num_parts` and `show_working: true`.

---

## C. Per-topic format catalog (authentic examples)

Examples are transcribed from real SJKC Year-4 papers. Chinese is as-found; an
English gloss follows. Tags: `[format · item_format · TP]`.

### C.1 整数与运算 · Whole numbers & operations

Fully mined from two real papers (SJKC 四年级 校内评审 试卷一 40-MCQ + 试卷二
15-subjective, via 30.com.my / facebook.com/groups/sjkcmy). This is the richest
topic; it demonstrates almost every format in §A.

**MCQ (Kertas 1):**

- `[convert · mcq · TP1]` 把九万零九百九十写成数字。A 90 990　B 99 090　C 99 900　D 99 990
  — *Write "ninety thousand nine hundred ninety" as a numeral.*
- `[figure-read(none)/place-value · mcq · TP1]` 以下哪个数目中数字 4 的数位是万位？A 32 451　B 33 914　C 40 981　D 54 193
  — *In which number is the digit 4 in the ten-thousands place?*
- `[compute-direct · mcq · TP2]` 在数目 78 240 中，找出 2 的数值。A 20　B 200　C 2 000　D 20 000
  — *Find the digit-value of 2.* (place-name vs digit-value are asked separately)
- `[convert · mcq · TP2]` 图1显示 W 数目的分析式 {50 000, 9 000, 300, 70, 4}。W 数目是 …
  — *Number from its expanded form (数目分析式).*
- `[fill-sentence(figure:cards) · mcq · TP4]` 图2显示一张少了2个数字的数目卡 [2 □ 8 □ 7]。个位数比十位数多 3，千位数是万位数的一半。完整写出数目卡中的数目。
  — *Fill the two missing digits under stated constraints.*
- `[order-pattern(figure:cards) · mcq · TP3]` 图3显示四张逆序排列的数目卡 [49 301 | 32 127 | P | 28 088]。哪个数目代表 P？
  — *Missing term in a descending sequence.*
- `[compare-select/order-pattern · mcq · TP3]` 数列 54 521, 54 421, 54 321, 54 221。以下哪项的模式与上述数列相同？(options are 4 other sequences)
  — *Which sequence follows the same rule (−100)?*
- `[round-embed/compare-select · mcq · TP4]` 下列哪组数目的百位近似值是相同的？A 35 562, 40 584 … 
  — *Which pair rounds to the same value at the hundreds place?*
- `[compute-direct · mcq · TP2]` 15 326 + 4 738 + 15 423 = …　(three addends)
- `[solve-unknown · mcq · TP3]` P + 29 474 = 51 259。计算 P 的值。
- `[name-unknown · mcq · TP4]` [文具盒里原有 17 支铅笔。妹妹又放入了一些铅笔。现在有 24 支。] 找出上述情况中的未知数。A 取出的数量　B 妹妹放入的数量　C 总数量　D 原有的数量
  — *Identify WHICH quantity is the unknown (not solve it).*
- `[figure-read(number-line) · mcq · TP3]` 图4显示一条数轴 [… 25 218, 26 768, X, Y, 31 418 …]。找出 X + Y 的值。
- `[error-spot(figure) · mcq · TP5]` 图5显示文勇以竖式计算的答案 [31 258 + 29 827 + 6 549 = 56 514]。文勇计算的答案与正确的答案相差多少？
  — *A wrong vertical sum is shown; find the gap to the correct answer.*
- `[solve-unknown · mcq · TP4]` 50 000 − R = 48 250 − 1 894，R 代表什么数目？(expression on both sides)
- `[compute-direct(figure:cards) · mcq · TP2]` 图6显示三张数目卡 [90 999 | 99 099 | 90 909]。找出最大的数目和最小的数目的差。
- `[word-multi · mcq · TP5]` 某工厂制造了 10 560 块蓝色橡皮，比白色橡皮少 4 920 块，黑色橡皮比蓝色多 17 640 块。找出黑色和白色橡皮的总数量。
- `[word-multi · mcq · TP5]` 每间仓库可容纳 50 000 箱货物。一批货物有 78 450 箱，把 A 仓库装满后，其中 17 859 箱运到 B 仓库，剩余的运到 C 仓库。C 仓库还能容纳多少箱？
- `[round-embed/solve-unknown · mcq · TP5]` W − 27 169 − 8 537 = 34 264，把 W 的值写成千位近似值。
  — *Solve for the unknown, THEN round.*
- `[compute-direct · mcq · TP3]` 2 361 × 18 = …
- `[name-unknown · mcq · TP4]` [数学比赛中，丽敏获得 87 分，立强的分数比她少几分。立强获得 78 分。] 找出以上情境的未知数。A 几分　B 78 分　C 87 分　D 数学比赛
- `[compare-select · mcq · TP3]` 下列哪项的积数最大？A 4 821 × 6　B 45 × 1 000　C 234 × 100　D 253 × 12
  — *Which has the largest product?*
- `[compute-direct · mcq · TP3]` 51 260 ÷ 24 = …　(answer with remainder; options vary the remainder)
- `[dialogue · mcq · TP5]` 两位售货员的对话：「乐乐超市有 27 496 瓶果汁。今天销量 6 825 瓶，比昨天少 218 瓶。」「现在还剩 6 724 瓶苹果汁，其他都是橙汁。」计算剩余的橙汁数量。
- `[word-single · mcq · TP3]` 天天杂货店一月售出 18 523 颗鸡蛋。二月是一月的 2 倍。两个月共售出多少颗？
- `[word-multi · mcq · TP4]` 一辆卡车每趟运 658 个砖块。若 3 辆卡车行驶 2 趟，共运多少砖块？　(658 × 3 × 2)
- `[fill-sentence · mcq · TP3]` 1 220 ÷ □ = 12 余 20，空格该填什么？
  — *Missing divisor with a remainder.*
- `[round-embed/word · mcq · TP4]` 8 567 的百位近似值乘以 9 是什么数目？　(round then ×)
- `[order-pattern(figure:cards) · mcq · TP4]` 数列卡 [72 214, P, Q, 40 540]。P 和 Q 相差多少？
- `[word-single · mcq · TP3]` 兴隆印刷厂印制 28 448 本字典，每 16 本一箱，可装多少箱？
- `[word-multi · mcq · TP5]` 黄老伯 3 个星期内售出 15 267 包豆浆。每天平均售出多少包？　(trap: 3 週 = 21 天)
- `[fill-sentence · mcq · TP4]` 三个数目的总和是 48 090。其中一个是 5 968，另两个各是 ______。(options give pairs)
- `[compute-direct · mcq · TP3]` 91 308 ÷ 28 = …
- `[compare-select · mcq · TP4]` 哪项算式是正确的？A 10 040÷4 = 2 510　B 27 244÷8 = 3 450　C 13 255÷6 = 3 650　D 33 033÷5 = 6 600
  — *Which equation is correct?* (verify a computation)
- `[solve-unknown · mcq · TP4]` K ÷ 48 = 1 275 余 11，K 代表什么数目？　(solve dividend from quotient+remainder)
- `[remainder-context · mcq · TP5]` 林太太把 10 612 棵花苗平均种在 20 块园地，剩余的每盆种 1 棵。她共需准备多少个花盆？
  — *Remainder → count of pots.*
- `[word-single · mcq · TP3]` 玉翠每天习写楷字 250 个。三个星期内共写多少个？
- `[figure-read(cards)/compute · mcq · TP5]` 图8：数字卡 [0][2][7][3][5]。组成最大与最小的五位数，找出两数中数字 5 的**数值**的差。
- `[word-single · mcq · TP3]` 香溢咖啡厂把 25 424 包咖啡粉送去 7 间餐厅，每间可获得几包？
- `[estimate-range(figure:packaging) · mcq · TP4]` 图9：把 79 860 个乒乓球分成两种数量相同的包装。每种包装的数量是多少？A 介于 6 000 至 6 500 之间　B 6 500–7 000　C 7 000–7 500　D 7 500–8 000
  — *Answer as an interval.*
- `[figure-read(packaging)+table/word-multi · mcq · TP6]` 图10：一箱苹果汁的质量是一箱菊花茶的 4 倍，卡车上限 360 箱苹果汁。表中哪个组合（苹果汁箱数 / 菊花茶盒数）已超出上限？

**Subjective (Kertas 2):**

- `[multipart/figure-read(cards) · subj · TP2]` 图1 [76 803]。(i) 写出 6 的数位。(ii) 把 76 803 写成万位的近似值。
- `[multipart/convert · subj · TP2]` 图2 [52 918]。(i) 以文字写出卡中的数目。(ii) 写出 52 918 的数目分析式。
- `[order-pattern + tick-select · subj · TP3]` 图3 [32 565 | 32 655 | 23 342 | 24 323]。(i) 按顺序排列。(ii) 在 3(i) 数列中间增添两个数目，在正确的格子内画 ✓：[22 600][23 147][32 555][29 005]。
- `[model-equation + word · subj · TP4]` [罐子里有 P 颗糖果，慧慧放入 308 颗，现在共 1207 颗。] (i) 写出未知数和加法算式。未知数：___ 加法算式：___ (ii) 慧慧把 500 颗分给同学后，还剩多少颗？
- `[table-read · subj · TP4]` 表5：邮政局三个月信件数量 [2月 26 982封 | 3月 比2月少 9 932封 | 4月 比3月少 2 232封]。(i) 计算3月份数量。(ii) 计算2月与4月的差。
- `[figure-read(number-line) · subj · TP3]` 图6 数轴 [10 426, 10 429, X, 10 435]。(i) 找出 X。(ii) 计算数轴上四个数目的和。
- `[multipart/table-read · subj · TP4]` 表7 报馆员工 [男性 比女员工多 3900 | 女性 4650]。(i) 把女性数量写成百位近似值。(ii) 计算男性人数。(iii) 报馆共多少员工？
- `[multipart/word-multi · subj · TP5]` [巧克力厂一周出产 95 800 颗，其中 35 694 颗绿茶味，其余草莓味。] (i) 草莓味有多少颗？(ii) 从两种口味各取出 560 颗后，还剩多少颗？
- `[remainder-context/table-read · subj · TP5]` 表9 [教室 48 间 | 椅子 1800 张]。每间教室排相同数量，剩下的放视听室。(i) 每间教室椅子数量？(ii) 视听室椅子排成六行，每行多少张？

### C.2 分数、小数与百分比 · Fractions, decimals & percentages

Sources: [DJ16-P1/P2] Desa Jaya SJKC(2) 2016 year-end; [P1-2017] PKBS 3/2017;
[P2-2018] 2018 四年级(4) 试卷二; [UASA-BM] AnyFlip Matematik UASA Tahun 4 (Malay);
[DSKP]. Scope: improper↔mixed; add/subtract up to 3 terms; "…的" (fraction *of* a
quantity); decimals to 3 d.p. with ×/÷ by 1-digit/10/100/1000; fraction↔%↔decimal;
% of a quantity (百格图).

**Fractions — MCQ:**

- `[compare-select · mcq · TP2]` 以下哪个是真分数？ A 3/5　B 5/5　C 1 3/5　D 8/5 — *Which is a proper fraction?*
- `[convert · mcq · TP3]` 把 2 5/9 换成假分数。／把 4 1/6 化为假分数。 — *Mixed → improper.*
- `[compute-direct · mcq · TP3]` 1/6 + 2/3 = … — *Add fractions (unlike denominators).*
- `[fill-sentence/solve-unknown · mcq · TP3]` 3/8 + P/8 = 7/8，找出 P 的值。 — *Missing numerator.*
- `[compute-direct · mcq · TP3]` 找出 5/6 和 1/2 的差。 — *Difference of two fractions.*
- `[word-multi · mcq · TP5]` 桌上有 3/4 的蛋糕，爸爸吃了 1/8，哥哥又吃了 1/2，还剩下多少？ — *Multi-step fraction word problem.*

**Fractions — subjective:**

- `[shade-represent + compute · subj · TP4]` (a) 涂上颜色 (shade 5/6 of a hexagon in 6 triangles; 2/3 of a circle in 3 parts) (b) 找出两个分数的差数 (c) 以假分数和带分数写出两个分数的和数。 — [DJ16-P2 Q5]
- `[fill-sentence · subj · TP4]` (a) （  ）− 1/8 = 3/4，括号内应填什么？ (b) 2/9 + K = 2/3，计算 K 与 1/9 的差，并写成最简分数。 — [P2-2018 Q9]
- `[figure-read(cards) + convert · subj · TP3]` 图3 显示带分数 [4 9/10]。(a) 化为假分数 (b) 化为小数 (c) 以文字写出 (b) 的答案。 — [P2-2018 Q3]

**Decimals & percentage — MCQ:**

- `[convert · mcq · TP2]` 把 46/1000 写成小数。／32/100 写成小数是… — *Fraction → decimal.*
- `[compute-direct · mcq · TP3]` 101.11 + 11.011 = … — *Add decimals (align places).*
- `[compute-direct · mcq · TP3]` 1000 × 9.138 = …／找出 8 与 1.15 的积。 — *× by 1000 / by 1-digit.*
- `[convert · mcq · TP2]` 7% = …（0.07）／0.56 写成百分比是… — *%↔decimal, both directions.*
- `[compare-select · mcq · TP4]` 哪项是不正确的？ A 0.5=50%　B 3.1=31%　C 0.66=66%　D 0.82=82% — *Spot the wrong conversion.*
- `[figure-read/place-value · mcq · TP3]` 数字 2 在 8.26 的数位是…（十分位/百分位…） — *Decimal place name.*
- `[compare-select · mcq · TP3]` 以下哪项小于 8.407？ A 8.47　B 8.74　C 8.047　D 8.704 — *Compare decimals.*
- `[word-single · mcq · TP4]` 100 支粉笔，74 支白色…红色占多少百分比？／table 红35% 蓝28% 青(?) → 青色占百分之几？ — *% of a quantity / from a table.*
- `[figure-read(grid) · mcq · TP3]` 2×5 格，3 格涂色 → 占多少百分比？（30%） — *% of a shaded grid.*

**Decimals & percentage — subjective:**

- `[order-pattern · subj · TP3]` 0.01、0.1、0.001、0.101、1.1 递序排列。 — [DJ16-P2 Q3]
- `[match-connect · subj · TP3]` 连一连：1.803 / 0.7 / 0.09 / 0.12 ↔ 700/1000 / 12% / 1 803/1000 / 9%。 — [DJ16-P2 Q6]
- `[shade-represent + convert (chain) · subj · TP4]` 100 格图：(a) 涂成 25/100 (b) 最简分数 (c) 小数 (d) 百分比。 — [DJ16-P2 Q8]
- `[table-read + convert · subj · TP4]` 糖果口味表 → 牛奶+巧克力共占多少百分比？再写成小数。 — [P2-2018 Q4]

_Distractor patterns:_ decimal-point shift ×10/×100 (7 / 0.7 / 0.07 / 0.007);
digit reversal (0.46↔0.64); the "move 2 places" %-conversion trap (3.1→31%);
fraction "add both parts" `(a+c)/(b+d)`; mixed→improper "×denominator, forgot
+numerator".

### C.3 钱币 · Money

Sources: [DJ16-P1/P2], [P1-2017], [P2-2018], [UASA-BM], [DSKP]. Scope: +−×÷ within
RM100 000; mixed operations; budgeting/savings; foreign-currency awareness;
payment instruments.

**MCQ:**

- `[round-embed · mcq · TP3]` 把 RM3 149.55 写成令吉的近似值。／41 × RM128.95 = ?（写成最接近的令吉） — *Round to nearest RM / compute-then-round.*
- `[figure-read(money)/compare-select · mcq · TP2]` 以下哪项是汶莱的钱币？ (banknote images: Brunei / Philippines / RM / Indonesia) — *Identify a foreign currency.*
- `[table-read(money) · mcq · TP4]` 图表显示钱数 (RM100×20, RM50×12, 20 sen×45)。共有多少钱？ — *Total from a notes/coins table.*
- `[word-single · mcq · TP3]` 一家三口，每人旅费 RM2 547，共须付多少？ — *× word problem.*
- `[word-multi · mcq · TP5]` 陈女士原有 RM960，提出 RM1 500，买 RM2 299 的电脑，还剩多少？ — *Multi-step money.*
- `[table-read · mcq · TP4]` 价格表 (电脑辞典 RM1 799 / 手表 RM145 / 闹钟 RM38) → 共须付多少？ — *Sum from a price table.*
- `[word-single · mcq · TP3]` 15 个篮球 RM1 635，一个多少？ — *Unit price (÷).*
- `[figure-read(money)/word-single (unitary) · mcq · TP4]` 4 罐奶粉 RM140，买 20 罐须付多少？ — *Unitary "n-for-RMx".*

**Subjective:**

- `[convert + round-embed · subj · TP3]` RM9 801.42 → 文字：___；令吉的近似值：___。 — [DJ16-P2 Q1]
- `[word-multi · subj · TP5]` 奖金 RM44 925 平分 5 份，2 份存银行（共存多少？），再买 RM12 600 椅子 + RM5 855 摩托，计算所剩。 — [P2-2018 Q11]

_Distractor patterns:_ off-by-one rounding (RM3 148/49/50/51); place-value
miscount in note totals; subtract-only vs add-then-subtract partials.

### C.4 时间与时刻 · Time

Sources: [DJ16-P1/P2], [P1-2017], [P2-2018], [UASA-BM], [DSKP]. Scope: 12h↔24h;
elapsed time within 24h; unit relations (millennium/century/decade; hour↔day↔
week↔month↔year); +−×÷ across up to 3 time units.

**MCQ:**

- `[convert · mcq · TP2]` 5 星期 = ___ 天。 — *Unit conversion.*
- `[compute-direct · mcq · TP3]` 4 个月 4 天 + 3 个月 8 天 = …／2 年 3 个月 + 2 年 7 个月 + 8 年 = … — *Add durations (mixed units).*
- `[compute-direct · mcq · TP4]` 26 年 3 个月 ÷ 7 = …／14 个星期 4 天 ÷ 3 = … — *Divide a duration.*
- `[word-single · mcq · TP3]` 串一条项链 48 分钟，串 6 条需多久？ — *× duration word problem.*
- `[table-read · mcq · TP5]` M=6 天 5 小时，N 是 M 的 3 倍 → N 生产 10 000 包所需时间。 — *Table + multiple.*
- `[figure-read(diagram)/word-multi · mcq · TP5]` 5 城逗留 7 星期 1 天，平均每地逗留多久？／数线 S—2天18时—T—7天10时—U，S 到 U 多久？ — *Average / elapsed on a line.*

**Subjective:**

- `[figure-read(diagram)/multipart · subj · TP5]` 蝴蝶/青蛙生命周期图：(a) 蝴蝶周期共多久 (b) 青蛙 16 星期，蝌蚪→幼蛙阶段多久 (c) 两者相差多少。 — [DJ16-P2 Q7]
- `[figure-read(number-line)/multipart · subj · TP4]` X–3时25分–Y–1时45分–Z：(a) 相差多少 (b) 来回 Z 城 3 趟共花多少时间。 — [P2-2018 Q7]
- `[table-read/multipart · subj · TP4]` 雅雯=1天14时，美美比雅雯多13时：(a) 美美时间 (b) 5 个木雕需多久。 — [P2-2018 Q8]
- `[convert (figure:clock) · subj · TP2]` [UASA-BM] 将时钟上的时间以 24 小时制写出。 — *12h → 24h.*

_Distractor patterns:_ wrong regroup/carry between mixed units; using base-10
instead of the correct base (60 min/hr, 12 mo/yr, 7 day/wk); forgetting the
×-factor in "n times" problems.

### C.5 度量衡 · Measurement

Sources: [DJ16-P1/P2], [P1-2017], [P2-2018], [UASA-BM], [DSKP]. Scope: length
(mm/cm/m/km), mass (g/kg), liquid volume (ml/l) — recognise, measure, estimate,
convert, and +−×÷; compound units (5kg 150g, 179cm 4mm).

**Length — MCQ:**

- `[convert · mcq · TP3]` 45 cm + 72 cm = ___ m。 — *Add then convert units.*
- `[figure-read(scale) · mcq · TP2]` 利用尺，测量线的长度。 — *Ruler measurement.*
- `[compute-direct · mcq · TP4]` 179cm 4mm 剪成 3 条，一条多少 cm 和 mm？／92cm 分成 8 段，每段？ — *Divide a compound length.*
- `[figure-read(diagram)/word-multi · mcq · TP5]` 路线图 9km 425m + 16km 300m → 全程距离。 — *Multi-leg distance.*
- `[table-read · mcq · TP3]` T=2.85m，U 比 T 长 0.94m → U 长度。 — *"Longer than" table.*
- `[word-single · mcq · TP4]` 每分钟行 1 公里 750 米，8 分钟行多远？ — *Rate × time.*
- `[figure-read/word-multi · mcq · TP5]` 2m 24cm 分给 ~14 块木板，平均每块宽多少 cm？ — *Average width.*

**Length — subjective:**

- `[figure-read(diagram)/multipart · subj · TP4]` 路线图 学校–5km250m–家–4km750m–餐厅：(a) 学校↔餐厅距离 (b) 一星期来回骑多远。 — [DJ16-P2 Q11]
- `[estimate-range/figure-read · subj · TP3]` 估计大厦 Y 的高度 (X=210m)。 — [DJ16-P2 Q15a]
- `[figure-read(number-line)/multipart · subj · TP4]` 家–6km500m–学校–?–补习中心（补习中心段比…长 2km30m）：计算…来回共骑多少。 — [P2-2018 Q14]

**Mass — MCQ:**

- `[compute-direct · mcq · TP4]` 5 × 5kg 150g ÷ 10 = … — *Mixed ×/÷ compound mass.*
- `[word-multi · mcq · TP5]` 两人共重 69.2 kg，相差 3.4 kg，较轻者多重？ — *Sum & difference.*
- `[figure-read(scale) · mcq · TP3]` 木瓜 1 公斤 280 克，黄梨多少克？ — *Read a dial scale.*

**Mass — subjective:**

- `[figure-read(scale)/multipart · subj · TP5]` 读蛋糕质量：(a) …kg (b) 以克写出 (c) 8 个总质量 (d) RM116.80 卖出，一个价钱。 — [DJ16-P2 Q9]
- `[word-multi · subj · TP4]` 一篮苹果连篮 1kg600g，篮 500g，再放入 1kg700g 苹果 → 篮里苹果质量。 — [DJ16-P2 Q13]
- `[word-multi/multipart · subj · TP5]` 四人共 175kg650g，其中两人 77kg550g：(a) 另两人 (b) 美婷比李文轻 2kg100g，李文体重。 — [P2-2018 Q6]
- `[remainder-context/multipart · subj · TP5]` 仓库 1270kg400g − 630kg500g + 530kg200g：(a) 现有多少 (b) 每 10kg 一袋，可装几袋，剩多少 g。 — [P2-2018 Q13]

**Liquid volume — subjective:**

- `[table-read + order-pattern · subj · TP5]` 容器 W820ml/X490ml/Y1l500ml/Z950ml：(a) 从多到少排列 (b) X+Y 与 Z 相差多少 l 和 ml (c) W 须加多少 ml 使其等于 (b)。 — [P2-2018 Q15]

_Distractor patterns:_ forgot the unit conversion (keep 117 cm instead of 1.17 m);
compound-unit regroup errors; decimal-point placement in kg values.

### C.6 空间 · Space (geometry)

Sources: [P2-2018], [P1-2017], [UASA-BM], [DSKP]. Scope: angles (直角/锐角/钝角);
parallel & perpendicular lines (recognise + draw); perimeter of polygons ≤8 sides;
area (square-unit + formula) of squares/rectangles/triangles; volume of cube &
cuboid.

**MCQ:**

- `[word-single · mcq · TP4]` 120cm 铁丝做正五边形，每边多少 cm？ — *Perimeter → side.*

**Subjective:**

- `[figure-read(shapes)/name-select · subj · TP3]` 图2 长方形 PQRS：(a) 哪条线与 QR 平行 (b) 哪条线与 PS 垂直。 — [P2-2018 Q2]
- `[figure-read(shapes)/multipart · subj · TP4]` 图4 图形（正五边形，边 4cm）：(a) 写出名称 (b) 计算周长。 — [P2-2018 Q5]
- `[figure-read(shapes)/multipart · subj · TP5]` 正方形纸（边 90mm，SW=40mm）：(a) 以 mm² 计算 STW 三角形面积 (b) 剪掉后剩多少 mm²。 — [P2-2018 Q10]
- `[figure-read(shapes)/multipart · subj · TP5]` 立体（正方体 5cm）：(a) 名称 (b) 涂黑部分面积 (c) 边长比它长 3cm 的立体体积 (cm³)。 — [P2-2018 Q12]

> **Coverage gap:** angle identification (直角/锐角/钝角) did **not** appear in any
> collected SJKC paper or the Malay UASA, though DSKP 6.1 lists it. Generate angle
> items from the DSKP standard, not from a captured exemplar.

_Distractor patterns:_ perimeter ÷ wrong side-count; perimeter↔area confusion.

### C.7 坐标、比与比例 · Coordinates, ratio & proportion

Sources: [DJ16-P1/P2], [UASA-BM], [DSKP]. Scope: first-quadrant (x,y) coordinates
(x-axis/y-axis/origin, write/locate a point); ratio 1:1…1:1000; proportion via
**归一法 (unitary method)**.

**MCQ:**

- `[figure-read(grid) · mcq · TP2]` △ 的位置是 A (4, E)　B (E, 4)　C (3, E)　D (E, 3)。 — *Read a grid position (letter-column).*
- `[figure-read(grid) · mcq · TP3]` 要怎么从 P 走到 Q？（向左/右走 n 格，向上/下走 m 格） — *Describe a move on a grid.*

**Subjective:**

- `[figure-read(grid)/multipart · subj · TP4]` 校园地标图：(a) 把礼堂写在 (B, 2) (b) 办公室的位置是___ (c) 写出从图书馆到食堂的走法。 — [DJ16-P2 Q10]
- `[word-single (归一法/unitary) · subj · TP4]` 23 200 本杂志平均装入 100 个箱子，6 个箱子有多少本？ — [DJ16-P2 Q14]
- `[figure-read(grid)/coordinate · subj · TP3]` [UASA-BM] 写出各地点的 (x, y) 坐标。 — *True Cartesian.*
- `[table-read/ratio · subj · TP3]` [UASA-BM] A 型与 O 型献血者人数比 1:9…（ratio 甲:乙）。
- `[figure-read/word-single (unitary) · subj · TP4]` [UASA-BM] 4 支尺 RM2.80，15 支相同的尺多少钱？

> **Coverage note:** SJKC Chinese papers use **letter-column grids (A–E, 1–5) +
> movement**, not a true numbered `(x, y)` plane with an origin; explicit **ratio
> (甲:乙)** and true **(x, y) coordinates** appear only in the Malay UASA source.
> 归一法 is confirmed authentic in Chinese ([DJ16-P2 Q14]). For (x,y) and ratio,
> generate from DSKP or adapt the UASA phrasings.

_Distractor patterns:_ swapped order `(row, col)` vs `(col, row)`.

### C.8 数据处理 · Data handling

Sources: [DJ16-P1/P2], [UASA-BM], [DSKP]. Scope: build & analyse **pictographs
(象形统计图)** and **bar charts (条形统计图)** from ungrouped data.

**MCQ (pictograph):**

- `[figure-read(pictograph)/word-single · mcq · TP4]` 象形图：国权两天存 RM45，一个 $ 代表多少钱？ — *Find the symbol value.*
- `[figure-read(pictograph)/compare-select · mcq · TP2–4]` 兴趣班人数图 (☺=3 位)：哪个班人数最多？／总共多少学生？／乒乓与篮球相差多少？ — *Read/compare (a shared-figure set of 3 items).*

**Subjective (pictograph):**

- `[figure-read(pictograph) + construct-display · subj · TP4]` 晴天象形图 (☀=5 次)：(a) 标题是___ (b) 4 月共 ( ) 次 (c) 1 月比 ( ) 少 (d) 2 月与 3 月相差 ( ) 次 (e) 五个月共 75 次，为 5 月画上适量的太阳。 — [DJ16-P2 Q12]
- `[figure-read(bar-chart)/construct-display · subj · TP4]` [UASA-BM] 条形图比较各科 A 的人数；条形图补全。

> **Coverage gap:** every data item collected from SJKC papers was a
> **pictograph**; **bar charts appear only in the Malay UASA**, though DSKP
> includes them. Generate bar-chart reading/construction from the standard or
> adapt UASA.

---

## D. MCQ distractor patterns (how real wrong options are built)

Derived from the real Kertas-1 options above. The generator should pick one
strategy per item so distractors are *plausible*, not random.

| Strategy | Mechanism | Real example (correct → distractors) |
|---|---|---|
| `digit-transposition` | Same digits, reordered | 59 374 → 59 743 / 59 734 / 59 347 |
| `place-value-shift` | Right digits, wrong magnitude | 200 → 20 / 2 000 / 20 000 |
| `near-miss-arithmetic` | Off by a carry/borrow or small amount | 42 498 → 42 499 / 42 480 |
| `remainder-variant` | Same quotient, different remainder | 2 135 余 5 → 2 135 / 2 135 余 10 / 2 135 余 20 |
| `common-error` | Result of a predictable mistake (wrong op, skipped step, wrong day-count) | 15 267÷21=727 → 15 267÷3-type wrong answers |
| `omit-a-step` | Answer to an *earlier* sub-result (multi-step trap) | in `word-multi`, offer the intermediate value |
| `leading-digit-swap` | One transposed pair up front | 42 498 → 24 498 |
| `decimal-point-shift` | Right digits, wrong ×10/×100 scale | 0.07 → 7 / 0.7 / 0.007 |
| `rounding-neighbour` | Adjacent rounded values | RM3 150 → 3 148 / 3 149 / 3 151 |
| `skipped-conversion` | Unconverted-unit value offered | 1.17 m → 117 (kept cm) |
| `compound-unit-regroup` | Base-10 carry between mixed units | 7 mth 12 d → 8 mth 2 d |
| `fraction-add-both-parts` | `(a+c)/(b+d)` error | 1/6 + 2/3 → 3/9 |
| `mixed-improper-slip` | Whole × denominator, forgot + numerator | 2 5/9 → 18/9 |
| `coordinate-swap` | (row, col) vs (col, row) | (E, 4) → (4, E) |

Rules of thumb: exactly one correct; distractors should be **reachable by a real
mistake**; keep option magnitudes comparable; for `remainder-context`, offer both
the raw quotient and the ±1 (ceil/floor confusion).

---

## E. Generator implications (schema note)

Extend the item schema beyond the prototype's numeric-`answer` + `makeChoices()`:

```
item := {
  topic:        "5.1".."5.8",
  tp_level:     1..6,
  item_format:  "mcq" | "subjective",
  format_type:  <one of §A IDs>,
  presentation: "plain"|"word"|"table"|"figure:number-line"|"figure:cards"
               |"figure:shapes"|"figure:packaging"|"figure:grid"|"figure:clock"
               |"dialogue",
  answer_form:  "value"|"remainder"|"range"|"equation"|"words"|"expanded-form"
               |"ordering"|"rounded"|"tick"|"drawing",
  num_parts:    1..3,            // subjective (i)(ii)(iii)
  show_working: bool,            // subjective
  // mcq only:
  options:      [A,B,C,D],
  distractor_strategy: <one of §D>,
}
```

Key gaps vs. the current engine:
- **Non-numeric answers.** `words`, `expanded-form`, `ordering`, `equation`,
  `tick`, `range`, `remainder`, `drawing` all need answer types the numeric
  `answer` field can't hold — and matching graders.
- **Figures are first-class.** Number lines, number cards, shapes, packaging,
  coordinate grids, clocks recur across topics; the generator needs a small figure
  DSL, not just prose.
- **Format weighting.** Sample `format_type` from a topic-appropriate distribution
  (§C), not uniformly — e.g. `compute-direct` and `word-*` dominate Topic 5.1,
  while `construct-display` belongs to 5.8.
- **Distractors are generated, not incidental.** Pick a §D strategy and derive the
  three wrong options from it.

---

## Sources

All examples are transcribed **verbatim** from real papers (scanned image PDFs read
page-by-page — no Chinese OCR was available). Source tags used in §C:

| Tag | Paper | Items |
|---|---|---|
| **[DJ16-P1] / [DJ16-P2]** | 帝沙再也国民型华文小学(二校) 2016 年终评审 试卷一 / 试卷二 (Desa Jaya SJKC(2), 2016 year-end) | 40 MCQ / 15 subjective |
| **[P1-2017]** | 四年级数学 PKBS 3/2017 试卷一 (3rd school assessment) | 40 MCQ |
| **[P2-2018]** | 2018 四年级数学(4) 试卷二 | 15 subjective |
| **[Topic-1 papers]** | 校内评审 试卷一 (40-MCQ, 2018) + 试卷二 (15-subjective, 康乐二校 2017) — used for §C.1 | 40 MCQ + 15 subjective |
| **[UASA-BM]** | AnyFlip "Matematik UASA Tahun 4" (Malay-medium, supplementary; via WebFetch summary, not verbatim) | mixed |
| **[DSKP]** | DSKP KSSR Semakan 2017 Matematik Tahun 4 SJKC (official, Chinese) — scope authority | — |

- Papers distributed via 30.com.my (`https://30.com.my/sjkc-math-std-4/`) and
  facebook.com/groups/sjkcmy; local copies + rendered page images in
  `/tmp/pokemath-research/`.
- **Currency caveat:** these papers are 2016–2018 = old **KSSR (2011)**, since
  Semakan 2017 only reached Year 4 in 2020. Formats and number ranges are stable,
  so they are valid for *format* capture — but all **content-scope** decisions are
  anchored to the Semakan-2017 **[DSKP]**, not to these papers.
- **Coverage gaps** (see topic notes): angle identification (§C.6), true `(x,y)`
  coordinates & explicit ratio (§C.7), and bar charts (§C.8) did not appear in the
  Chinese SJKC papers — generate those from the [DSKP] standard / adapt [UASA-BM].
- Scope, curriculum status, and TP levels: see [standard-4-sjkc-math.md](./standard-4-sjkc-math.md).
