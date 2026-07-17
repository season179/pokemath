# Standard 1 SJKC Mathematics — Question-Style Reference (formats)

Companion to [standard-1-sjkc-math.md](./standard-1-sjkc-math.md). That doc says
**what content** a Standard 1 question may contain. This doc says **how it is
asked** — the many authentic *formats* real SJKC Year-1 worksheets and school
papers use, so the LLM generator produces genuine, age-appropriate variety.

> **Why this exists.** The scope doc's own hard constraints demand it: *"Question
> shape ≠ arithmetic drill only. Include picture-counting, matching, ordering,
> fill-in-the-blank, patterns, and yes/no comparisons — not just `a + b = ?`."* A
> six/seven-year-old rarely meets a bare equation; almost every item is **visual
> and hands-on** — count the pictures, connect with a line, colour the group,
> complete the number bond, read the clock. This doc is that format menu.

## How to use for prompting

1. Pick a **topic** (§4.1–4.7 of the scope doc, or the `original_dskp_extra`
   items) and a **PBD level** (TP1–TP6 → difficulty).
2. Sample a **format** from the taxonomy (§A) — weight toward the formats common
   for that topic (per-topic catalog, §C).
3. Sample an **item shape** (§B): `objective` (圈出), `fill-blank` (填空),
   `constructed` (write/draw/看图作答), or `activity` (连/涂/排/分类).
4. If `objective`, build distractors with an age-appropriate strategy (§D).
5. Apply the scope doc's **hard constraints** (≤100, `+ −` only, money ≤ RM10,
   single-step) as guardrails so no format smuggles in out-of-level content.

As at every grade, the format is largely **topic-independent** — `count-write`,
`match-connect`, `fill-blank`, `pattern-continue` apply to numbers, money, shapes,
or data alike. The taxonomy (§A) is the reusable core; the per-topic catalog (§C)
records which formats fit where, with authentic examples.

---

## A. Cross-cutting format taxonomy

Each format has an ID for the generator (`format_type`). Presentation and
answer-form are separate axes (§E).

| ID | Format | What the pupil does |
|---|---|---|
| `count-write` | Count & write | Count pictured/concrete objects; write the number (numeral and/or 中文数字) |
| `count-circle` | Count & circle | Count, then circle the correct numeral/group/answer (圈出) |
| `match-connect` | Match / connect (连一连) | Draw a line pairing numeral↔word, group↔numeral, clock↔time, object↔shape, item↔price |
| `color-shade` | Colour / shade (涂一涂) | Colour N objects, colour the bigger/longer one, or shade a fraction (extra) |
| `fill-blank` | Fill the blank (填空) | Complete a number sentence, a number line, or a missing term |
| `number-bond` | Number bond / decompose (分与合) | Split a whole into parts, or combine parts (part-part-whole) |
| `ten-frame` | Ten-frame / place-value picture | Read a 十格图 / base-ten (十位个位) / 1:4 abacus representation |
| `pattern-continue` | Continue the pattern | Extend a number pattern (+1/2/5/10, forward/back) or a shape pattern (○△○△__) |
| `compare` | Compare (比一比) | more/fewer/equal (多/少/一样多), bigger/smaller, longer/shorter, heavier/lighter — circle or tick |
| `order-sequence` | Order / before-after-between | Arrange small→large; before/after/between (前/后/中间); order daily events |
| `picture-sentence` | Picture → number sentence (看图列式) | Read a picture story and write the `+`/`−` sentence and answer |
| `word-single` | Single-step word problem | One `+` or `−` step; usually picture-supported |
| `read-instrument` | Read a clock / pictograph | Tell the time (整点/半点/一刻); read a 1-picture=1-value pictograph |
| `name-count` | Name / count a shape | Name a 2D/3D shape; count faces 面 / edges 边 / vertices 顶点 / sides / corners |
| `classify-sort` | Classify / sort (分类) | Group objects/shapes by an attribute; pick the suitable measuring tool |
| `true-false` | True / false, yes / no | Judge 对/错 or ✓/✗ (e.g. "8 > 5?") |
| `trace-write` | Trace / draw (写一写 / 画一画) | Form numerals/words, or draw clock hands / water levels |
| `tally` | Tally marks (正字) | Record/read counts with 正-strokes _(extra)_ |
| `estimate` | Estimate (估一估) | Estimate a quantity _(extra)_ |
| `round-ten` | Round to nearest ten | Round a number to the nearest 10 _(extra)_ |

`presentation` axis (orthogonal to format): `plain` · `picture` · `story` ·
`figure:ten-frame` · `figure:number-bond` · `figure:number-line` ·
`figure:clock` · `figure:abacus` · `figure:coins` · `figure:shapes` ·
`figure:pictograph` · `figure:objects` · `figure:balance` · `figure:calendar` ·
`figure:grid` · `figure:table`.

`answer_form` axis: `numeral` · `chinese-word` · `number-sentence` · `circle` ·
`match` · `color` · `ordering` · `tick` · `drawing` · `count`.

---

## B. Assessment context (there is **no exam**)

- **Standard 1 has no national exam.** Assessment is classroom **PBD** (校本评估):
  teacher observation + worksheets, mapped to performance levels **TP1–TP6**.
  (Contrast Tahap 2, which has the UASA — see the Standard 4 format doc.)
- Real items therefore come from **worksheets / activity books (练习 / 活动本 /
  lembaran kerja)** and **school-internal tests (校内 ujian / peperiksaan /
  评审)**. The school papers do split into shapes, so the generator models an
  **item shape**:
  - `objective` — circle/choose the answer (圈出正确答案); often 3 options (A/B/C)
    at this age, sometimes 4.
  - `fill-blank` — write into a blank (填空).
  - `constructed` — write the numeral/word, or 看图作答 (answer from a picture),
    sometimes writing the working line + a 答: sentence.
  - `activity` — connect (连), colour (涂), order (排列), classify (分类), draw (画).
- **1:4 abacus (算盘)** is a *representation* device (number value, place value,
  +/−) — a legitimate SJKC prop (DSKP 1.6), **not** a scaled measuring instrument,
  so it is allowed even under the non-standard-units rule.
- **Bilingual:** numbers should be expressible as numeral **and** Chinese word
  (`18` / `十八`); keep a Malay/English gloss for the UI.

Generator param: `item_format: objective | fill-blank | constructed | activity`.

---

## C. Per-topic format catalog (authentic examples)

Examples are transcribed from real SJKC Year-1 papers/worksheets, tagged
`[format · item_format · TP]`. Chinese is as-found; an English gloss follows. Each
example carries a source tag (see §Sources). Provenance & verification are noted
per topic; the corpus was cross-checked by an adversarial verify pass (authentic /
on-level / correctly-transcribed) — over-level or multi-step items were dropped.

### C.1 整数 · Whole numbers to 100

Richly mined from real papers (Sin Min 2016 P1/P2, Han Ming 2016, March-2018 P1,
2017 2nd-term P1/P2, 30.com.my unit-1 PDFs), most with answer keys.

- `[count-write · objective · TP1]` 上图有多少只小猪？（8 drawn）A 10　B 9　**C 8**　D 7。 — options are also given as Chinese words (二十/三十/四十/五十).
- `[count-write · constructed · TP1]` 数一数，以数字和文字写出答案。（cats → **4 / 四**；松鼠 → **18 / 十八**；base-ten 2 rods+2 cubes → **22 / 二十二**） — *Count; write numeral AND Chinese word.*
- `[convert · fill-blank/objective · TP2]` 数字|文字 table: `6 → __`, `__ → 十二`, `39 → __`。／MCQ「9 写成文字是」A 六　B 七　**C 九**。 — *Numeral ↔ Chinese word.*
- `[ten-frame · fill-blank · TP2]` 左图（7 捆十 + 3 根）表示什么数目？→ **73**；十位数字的数值是 → **70**。 — *Base-ten / place value picture.*
- `[read-instrument · objective · TP2]` 以下算盘所显示的数目是 A 2　B 12　**C 20**。 — *Read the 1:4 abacus (also asked as "write the number").*
- `[fill-blank · fill-blank · TP2]` 圈出画线数字的**数位**（个位/十位）：2**4** → 个位；**8**3 → 十位。／圈出**数值**：**7**8 → (**70**, 7)。 — *Digit place vs digit value.*
- `[compare · count-circle · TP1]` 看图圈出正确的答案：鸭子比鱼（多，**少**）；青蛙和鱼的数量（**相等**，不相等）。 — *more/fewer/equal from a picture.*
- `[compare · fill-blank · TP2]` 比较数量：6 少 3 是（9, **3**, 6）；4 多 5 是（10, 4, **9**）。／6 比 4（**多 2**，少 2）。 — *Compare with the difference.*
- `[compare · count-circle · TP2]` 比较大小，圈出正确的答案：8 比 9（大，**小**）。 — *bigger/smaller.*
- `[color-shade · activity · TP2]` 把最大的数目涂上颜色：18, 20, 14, 10 → **20**。 — *Colour the largest.*
- `[true-false · objective · TP2]` 对的画✓，错的打✗：7 比 8 大（✗）；9 比 8 少 1（✓）。 — *True/false comparison.*
- `[pattern-continue · fill-blank · TP2]` 两个两个地数：42 → 44 → **46** → 48 → **50**。／五个五个地数：**5** → 10 → 15 → 20 → **25**。／14, **13**, 12, **11**, 10。 — *Skip-count / sequence fill (forward & backward).*
- `[order-sequence · fill-blank · TP3]` 顺序排列 5,7,9,6,8 → 5,6,7,8,9。／逆序 17,14,12,11,9。 — *Ascending / descending order.*
- `[number-bond · fill-blank · TP2]` 填一填：parts 3 和 7 → whole **10**；whole 6，part 3 → **3**。／MCQ whole **15**，part **6** → 缺 **9**。 — *Number bond / decompose.*
- `[number-bond · activity · TP2]` 圈出两组物体，以组成指定的数目（（7）／（9）／（8）／（6））。 — *Combine two pictured groups to make a target.*
- `[order-sequence · objective · TP2]` 从左边算起，小狗排第几？→ **第五**。／50 之前和之后的数目？→ 49 50 51。 — *Ordinal; before/after.*
- `[read-instrument · constructed · TP2]` 写出数轴所显示的数目（0–10 line, arrow → 7）。 — *Read a number line.*

### C.2 基本运算 · Basic operations (`+ −` only)

Mined from the same papers + 30.com.my unit-2 PDFs. Note the range: facts within
20, results ≤ 100; **no ×/÷**.

- `[fill-blank · objective · TP2]` 32 + 7 = ___　**A 39**　B 102　C 38　D 93。／16 + 17 = ___ → **33**。／10 − 8 = ___ → **2**。 — *Direct compute (MCQ or fill).*
- `[fill-blank · fill-blank · TP4]` 5 + __ = 15；__ + 9 = 18；__ − 8 = 12。 — *Missing addend/subtrahend.*
- `[number-bond · fill-blank · TP2]` 五和二合起来是多少？→ 7。／6 和 8 合起来是 **14**；8 少 **2** 是 6。 — *Bond language (合起来 / 多 / 少).*
- `[number-bond · constructed · TP3]` 根据数目键（whole 10 → 7, 3），写出两个加法算式 → **3+7=10 / 7+3=10**。 — *Two sentences from one bond.*
- `[picture-sentence · constructed · TP3]` 妮妮原本有五本故事书，妈妈又买了两本…现在共有几本？`□ + □ = □` → **5 + 2 = 7**。 — *Picture → number sentence (fill boxes).*
- `[picture-sentence · constructed · TP3]` 根据下图写出算式（10 bags, 5 crossed out）→ **10 − 5 = 5**。 — *Subtraction shown by crossing out.*
- `[picture-sentence · activity · TP4]` 看图写出减法算式，然后编写故事（7 carrots, 4 crossed）→ 7−4=3；填故事「小兔子有 **7** 根…吃了 **4** 根…还剩 **3** 根」。 — *Write sentence + compose a story.*
- `[trace-write · activity · TP3]` 画小圆圈及写正确的算式（6 + 3）→ 画 9 个圈；**6 + 3 = 9**。 — *Draw the total, then write.*
- `[read-instrument · constructed · TP3]` 根据算盘/数轴写算式：数轴前进 12 再后退 8 → **12 − 8 = 4**。 — *Sentence from abacus / number line.*
- `[convert · constructed · TP3]` 以数字写出算式「八减五等于三」→ 8−5=3；以文字写出「6+3=9」→ 六加三等于九。 — *Word-form ↔ symbol sentence.*
- `[fill-blank · constructed · TP4]` 数字三角形（top 15, bottom 7 & 8）→ **( )+8=( )**，**( )−7=( )**。 — *Fact family from a number triangle.*
- `[compare · objective · TP3]` 以下哪项和七加五的答案一样？ A 6+7　B 5+5　**C 9+3**。／哪组不可以组成 15？→ **6+5**。 — *Equivalent expression / which can('t) make N.*
- `[true-false · objective · TP2]` 5 + 4 = 9 也可以写成 → **五多四，是九**。／9 − 3 = 6 → **九减三，等于六**。 — *Read a number sentence in words.*
- `[trace-write · fill-blank · TP3]` 17 + 36 = ___（竖式 tens/ones boxes）→ **53**。 — *Vertical addition frame.*
- `[word-single · objective · TP3]` 美美今年 7 岁，弟弟比她小 5 岁，弟弟几岁？→ **2**。／25 + 25 杯 → **50**。 — *Single-step word problem (MCQ).*
- `[word-single · constructed · TP4]` 阿里叔叔养了 7 只公鸡，8 只母鸡，一共几只？答：共有 **15** 只鸡。（送出 3 只后…还剩 **12** 只） — *Write working + 答: sentence.*
- `[word-single · constructed · TP3]` 连加（picture, 3 addends）：3 + 4 + 4 = **11**。 — *Repeated addition (×-readiness).*
- `[read-instrument · objective · TP3]` 看图回答问题（fish-tank set）：原本有？再放进？一共？ — *Linked multi-part picture set (each part single-step).*

### C.3 钱币 · Money (≤ RM10)

From 30.com.my unit-4 exercises + a 2018 year-end P2. Constraints enforced: sen
≤ RM1, ringgit ≤ RM10, **single-step** (multi-step chains were dropped in verify).

- `[count-write · constructed · TP2]` 以下的同学一天储蓄多少钱？算一算。（一枚 50 sen + 一枚 20 sen）→ **70 sen**。 — *Total a set of coins/notes.*
- `[compare · objective · TP3]` 以下哪项的币值最小？A 1 枚 50 sen　B 3 枚 20 sen　C 5 枚 10 sen　**D 1 枚 5 sen**。 — *Compare values.*
- `[count-write · objective · TP3]` 多少枚 10 sen 相等于 RM1？→ **10**。／RM5 相等于多少枚 20 sen？→ 25。 — *Exchange / equivalent value.*
- `[fill-blank · fill-blank · TP4]` 填一填，以组成相等的币值：50 sen + 20 sen + 10 sen = ___ 枚 20 sen → **4 枚**。 — *Make an equivalent value.*
- `[fill-blank · objective · TP2]` 25 sen + 20 sen = → **45 sen**。／RM10 − RM3 = → **RM7**。 — *Add/subtract money (MCQ).*
- `[fill-blank · constructed · TP3]` 找出 50 sen 与 25 sen 的和 → 75 sen。／找出 RM9 与 RM3 的差数 → RM6。 — *Sum / difference (constructed).*
- `[word-single · constructed · TP4]` 妈妈给美美 RM5…美美用了 RM3 买纸杯蛋糕。现在还有多少钱？→ RM5 − RM3 = **RM2**。 — *Single-step shopping/change.*
- `[match-connect · activity · TP3]` 连一连：把物品（附价钱 RM1.50/RM0.50…）连到等值的硬币/纸币组合。 — *Match item+price ↔ money set.*
- `[picture-sentence · constructed · TP4]` 图 5（尺 40 sen，橡皮 30 sen）：i) 买一把尺和一块橡皮共多少？ii) 有 90 sen，买后还剩多少？→ i) 70 sen　ii) 20 sen。 — *Item-price figure: add, then change (scaffolded into single steps).*
- `[picture-sentence · constructed · TP5]` 表 1（星期三：零用 RM3；消费 炒饭 RM1、文具 RM1；储蓄 ?）：共花多少？储蓄多少？→ 花 RM2，储蓄 RM1。 — *Savings/spending record table (economy source & saving standard).*

> **Caveats:** keep money items **single-step** (verify dropped RM+cents two-total
> subtractions and multi-purchase chains). Do not reproduce one source's 连一连
> coin breakdown for RM3.50 — its illustrated coins summed to RM2.90 (regenerate
> equal-value sets). Mixed note+coin totals (e.g. RM1.40) are fine as long as the
> value ≤ RM10.

### C.4 时间与时刻 · Time

From 30.com.my unit-5 exercises + a 2018 Oct year-end P2. Whole/half hour **and**
quarter/three-quarter (一刻/三刻, on-syllabus per DSKP 5.2).

- `[picture-sentence · objective · TP1]` （图：人躺床上、旭日）这是什么时段？A 清晨　B 上午　C 下午　D 午夜 → **清晨**。 — *Identify time-of-day from a picture.*
- `[fill-blank · objective · TP1]` 一星期有 ___ 天 → **七**。／一年有 ___ 个月 → **十二**。 — *Calendar facts.*
- `[picture-sentence · objective · TP2]` 国庆日在 ___ 月（图：马来西亚国旗）→ **八**（月）。 — *Which month is a holiday (picture-cued).*
- `[order-sequence · objective · TP2]` 今天是星期三，前天是 → **星期一**。／今天是星期四，后天是 → **星期六**。 — *Previous/next day reasoning.*
- `[read-instrument · fill-blank · TP3]` 以时刻填写钟面显示的时刻（时针→3，分针→12）→ **三时**。 — *Read a whole-hour clock.*
- `[read-instrument · constructed · TP3]` 图 8 显示妈妈去菜市的时刻，以文字写出（钟面 8:15）→ **八时一刻**。 — *Read & write time in words (quarter past).*
- `[read-instrument · fill-blank · TP3]` （钟面 12→3 的四分之一涂黑）→ **一刻**；（四分之三涂黑）→ **三刻**。 — *Identify quarter / three-quarters on the dial.*
- `[trace-write · activity · TP3]` 看时刻，画出时针和分针：五时；四时半（两个空白钟面）。 — *Draw the hands for a given time.*
- `[read-instrument · constructed · TP3]` 图 3 撕页日历（2018 年 十月 13 日 星期六）：i) 今天星期几？ii) 昨天？iii) 下个月几月？→ 星期六 / 星期五 / 11 月。 — *Read a calendar page.*
- `[word-single · constructed · TP4]` 后天是星期六…今天和明天是星期几？→ 星期四、星期五。／下个月是五月，现在几月？→ 四月。 — *Day/month single-step word problem.*
- `[word-single · constructed · TP4]` 妈妈用了三刻的时间回到家（出门为八时一刻），几时到家？→ **九时**（八时一刻 + 三刻）。 — *Elapsed-time (add three quarters).*
- `[fill-blank · fill-blank · TP4]` 看小敏一星期的活动时间表填一填（每天配钟面+活动）：小敏的小提琴课是在星期__，下午__ → 六，一时一刻。 — *Read a weekly timetable (day + clock).*
- `[order-sequence · constructed · TP5]` A 三月出生；B 比 A 迟五个月；C 比 B 早三个月。B？C？→ 八月（3+5）；五月（8−3）。 — *Month-sequence multi-clue (each part single-step).*

> **Coverage gap:** no standalone 时针/分针 hand-identification item and no pure
> daily-event-ordering item were found in Chinese sources (they exist only as Malay
> DPK *Contoh*) — generate those from the DSKP/DPK standard.

### C.5 度量衡 · Measurement (non-standard units)

From the official AnyFlip 一年级数学下册 活动本 & 课本 (KSSR Semakan). **Strictly
non-standard units** — paper clips, spoons, footprints, grid squares, handspan
(虎口), marbles (via a homemade balance), cups/bowls/ladles. No cm/kg/ℓ, no scales.

- `[count-write · fill-blank · TP2]` 算一算，填一填：胶水瓶大约有 ⬜ 枚回形针长（→5）；桌子大约有 ⬜ 支笔长；秋千大约有 ⬜ 个脚掌。 — *Measure length in non-standard units.*
- `[count-write · activity · TP2]` 在格子里画出梦想的房子，然后量：房子大约有 ⬜ 个格子长／高。 — *Measure in grid squares (draw-then-measure).*
- `[classify-sort · objective · TP3]` 哪种工具适合测量以下物品？画✓（可多选）。工具：回形针、橡皮、虎口；物品：书本长度、杯子高度、黑板长度。 — *Pick the suitable measuring tool (tick table).*
- `[compare · objective · TP2]` 把每一队中比较高的队员圈起来。／谁长得比较矮？在♡画✓。 — *Compare taller/shorter (circle/tick).*
- `[compare · objective · TP2]` 把比较薄的物品圈起来。／把比较重的东西圈起来（锤子 vs 钉子…）。 — *Compare thinner / heavier.*
- `[color-shade · activity · TP2]` 把离小甲虫比较近的动物涂黄色，比较远的涂红色。 — *Colour by distance (near/far).*
- `[compare · activity · TP2]` 把比较轻的动物涂上颜色（鸟 vs 象…）。 — *Colour the lighter one.*
- `[count-write · activity · TP3]` 动手制作天平…用天平测量：剪刀大约有 ⬜ 个玻璃弹子重。 — *Measure mass in marbles (make a balance).*
- `[classify-sort · objective · TP3]` 圈出不适合用来测量质量的工具（香蕉/树叶…）。／哪种工具适合测质量？画✓。 — *Judge suitable/unsuitable mass units.*
- `[compare · objective · TP2]` 比一比，液体比较多的画☺。／哪个容器盛的液体比桌上的瓶子少？圈起来。 — *Compare liquid volume.*
- `[match-connect · activity · TP2]` 连一连：满 / 半满 / 空 ↔ 图。／画一画：把水画到 半满 / 满 / 空。 — *Match/draw full-half-empty.*
- `[count-write · fill-blank · TP2]` 算一算，填一填：瓶子里大约有 ⬜ 杯的牛奶（→4）；大约 ⬜ 舀子的水能盛满一个盆。 — *Measure liquid in cups/bowls/ladles.*
- `[order-sequence · fill-blank · TP4]` 水果杯比牛奶重；沙丁鱼罐头比水果杯重…谁最重？谁最轻？→ 沙丁鱼罐头最重，牛奶最轻。 — *Order 3 items from balance clues.*
- `[picture-sentence · constructed · TP4]` 1 本故事书大约 5 枚回形针长，3 本排一排大约多少？→ 5+5+5 = **15**。 — *Single-step repeated-addition with a non-standard unit.*

> **Note:** measurement is assessed via **PBD activity books**, not the first-term
> number test papers — expect activity/circle/colour shapes, not MCQ drills.

### C.6 空间 · Space & shapes

From the official SJKC 一年级 Buku Teks 华文版 Jilid 2 + DSKP KSSR Semakan 2017.

- `[name-count · constructed · TP1]` 说出以下立体的名称（正方体 / 圆锥体 / 角锥体 / 圆柱体）。 — *Name 3D solids.*
- `[name-count · constructed · TP2]` 说出 W、X、Y、Z 的名称（曲面 / 顶点 / 平面 / 边）。 — *Name labelled parts of a solid.*
- `[name-count · constructed · TP2]` 圆锥体有多少个平面、曲面和顶点？→ 1、1、1。 — *Count faces / curved surfaces / vertices.*
- `[true-false · constructed · TP2]` 圆柱体有没有顶点？→ 没有。 — *Yes/no about a solid's property.*
- `[pattern-continue · fill-blank · TP3]` 接下来是什么？（球体、长方体、圆锥体、…、?）→ 球体。 — *Continue a 3D-solid pattern.*
- `[picture-sentence · activity · TP6]` 你可以用各种立体组成什么模型？（也用再循环物体做一做） — *Combine solids into a model (open-ended).*
- `[name-count · constructed · TP2]` 平面的特征：正方形/三角形的边是直线、有顶点；圆的边是曲线。 — *Label vertices/sides; straight vs curved.*
- `[compare · fill-blank · TP4]` 说出正方形和长方形的相同点和不同点（双气泡图：共有 4 顶点、4 边；正方形所有的边一样长）。 — *Compare square & rectangle (double-bubble map).*
- `[pattern-continue · fill-blank · TP3]` 平面的排列，填一填（○△○△… → ?）。 — *Continue a 2D-shape pattern.*
- `[name-count · constructed · TP5]` 两个平面共有 4 条边和 3 个顶点，各画了什么平面？→ 三角形 + 圆。 — *Name shapes from side/vertex clues.*
- `[word-single · fill-blank · TP5]` 公寓是长方体，每面 10 个窗口，上下无窗，共须清洗多少窗口？→ 10+10+10+10 = **40**。 — *Single-step (repeated addition) using a solid's faces.*
- `[picture-sentence · activity · TP6]` 以平面图形创作图案（DSKP 7.2）。 — *Create a design from 2D shapes.*

### C.7 数据处理 · Data handling

From 30.com.my unit-8 exercises (with answer keys).

- `[read-instrument · objective · TP2]` （散点图：8♥ 3★ 6🌙 2☁）图中有多少个 ♥？→ 8。／哪个形状最多？→ 🌙。／最少？→ ☁。 — *Count / most / least from a scattered picture.*
- `[read-instrument · objective · TP3]` （散点图）☁ 和 ★ 共有多少个？→ 7。／♥ 和 ★ 相差多少？→ 4。 — *Total / difference of two categories.*
- `[read-instrument · objective · TP3]` （象形图 1 图=5 张贴纸，5 周）哪一周最多？→ 第二周。／第一周多少张？→ 30（6×5）。 — *Scaled pictograph (1 icon = 5); note: 1-icon=N is `original_dskp_extra`; core Std 1 keeps 1 icon = 1 value.*
- `[read-instrument · objective · TP2]` （正字 tally 表：1H/1M/1K/1B）最多学生戴手表的是 __ 班 → 1H。 — *Read a tally chart.*
- `[tally · fill-blank · TP3]` 看图，把体育用品填入表格（记数符号 + 数量）：篮球 5，足球 2，排球 5，羽毛球拍 6，乒乓拍 4。 — *Collect data from a picture → build a tally table.*
- `[classify-sort · activity · TP1]` 把 6 张卡片分类（蔬菜 / 水果）：蔬菜 → 包菜、胡萝卜、马铃薯。 — *Classify objects into a table.*

> **Core vs extra:** the DPK Edisi 3 core keeps pictographs at **1 picture = 1
> value**; scaled pictographs (1 icon = 5) and tally marks belong to
> `original_dskp_extra`. Gate them behind the profile flag.

### C.8 Extras (`original_dskp_extra` profile only)

Generate only when the profile is `original_dskp_extra` (in DPK Edisi 3 these move
to Year 2). Fractions are richly attested in the 30.com.my unit-3 PDFs.

- `[compare · objective · TP2]` 一半相等于 → 二分之一。／哪个分数比较大？→ 四分之三。 — *Name / compare simple fractions.*
- `[name-count · objective · TP2]` 涂黑部分所代表的分数是（2 triangles, 1 shaded）→ 二分之一。／以下哪项代表四分之一？ — *Identify the shaded fraction.*
- `[match-connect · activity · TP3]` 连一连：6 个涂色图形 ↔ 四分之三 / 四分之二 / 三分之一 / 四分之一。 — *Match figure ↔ fraction name.*
- `[color-shade · activity · TP2]` 把图形的 1/2（一半）涂上颜色。 — *Shade a fraction of a shape.*
- `[count-write · constructed · TP3]` 红色的海星占了几分之几？（4 starfish, 1 red）→ 四分之一。 — *Fraction of a set.*
- `[estimate · objective · TP2]` 估计上图有多少个番茄 → 大约 40 个。 — *Estimate a quantity.*
- `[round-ten · objective · TP3]` 23 的十位近似值是 → 20。／77 的十位近似值是（70, 80）→ 80。 — *Round to nearest ten.*
- `[pattern-continue · fill-blank · TP2]` 四个四个地数：4, 8, 12, __, __ → 16, 20。 — *Counting in 4s.*
- `[tally · activity · TP2]` 用正字记录数量，然后数一数。 — *Tally marks (正字).*

> **Rounding caveat:** one source matched by tens-digit (18→10, 39→30) rather than
> true nearest-ten — generate genuine nearest-ten (18→20, 23→20) and avoid the
> ambiguous convention.

---

## D. Objective-item distractor patterns (圈出 / choose)

Verified against real answer keys. Distractors should reflect real child errors,
not random numbers.

| Strategy | Mechanism | Example (correct → distractors) |
|---|---|---|
| `off-by-one-count` | Miscount by ±1 (double-count / skip one) | 8 → 7 / 9 |
| `count-all-vs-add` | Counts one group only, or all objects, in a `+` picture | 3 + 2 → 3 / 5 / 2 |
| `wrong-operation` | Add instead of subtract (or vice-versa) | 9 − 4 = 5 → 13 |
| `raw-operand` | An operand from the problem offered as the answer | age 7 − 5 = 2 → distractor 12 (=7+5); 11 − 5 = 6 → 16 (=11+5) |
| `no-carry-concat` | Writes digits side by side instead of carrying | 32 + 7 → 102 |
| `digit-reversal` | Swaps tens/ones | 21 → 12 |
| `place-value-slip` | Digit value vs digit | 4 in 47 → 40 vs 4 vs 7 |
| `more-fewer-flip` | Picks the opposite comparison | "较多" → the smaller group |
| `next-vs-between` | Wrong slot in a sequence | before/after/between confusion |
| `clock-hand-swap` | Reads minute hand as hour (or half vs whole) | 3:30 → 6:00 / 6:30 |
| `word-operator-scramble` | Swaps 多/少/减/等于 in "也可以写成/配合故事" | 五多四是九 → 五减四等于九 |
| `money-denom-miscount` | Miscounts coin/note denominations in a total | 50+20 sen → 60 / 55 sen |

Rules: keep option magnitudes tiny and close; use pictures/quantities the child
can actually recount; 3 options (A/B/C) is common at Standard 1; exactly one
correct.

---

## E. Generator implications (schema note)

```
item := {
  topic:        "4.1".."4.7" | "extra",
  tp_level:     1..6,                     // PBD performance level (no exam)
  item_format:  "objective" | "fill-blank" | "constructed" | "activity",
  format_type:  <one of §A IDs>,
  presentation: "plain"|"picture"|"story"|"figure:ten-frame"|"figure:number-bond"
               |"figure:number-line"|"figure:clock"|"figure:abacus"|"figure:coins"
               |"figure:shapes"|"figure:pictograph"|"figure:objects"
               |"figure:balance"|"figure:calendar"|"figure:grid"|"figure:table",
  answer_form:  "numeral"|"chinese-word"|"number-sentence"|"circle"|"match"
               |"color"|"ordering"|"tick"|"drawing"|"count",
  bilingual:    { numeral: "18", zh_word: "十八" },
  // objective only:
  options:      [...],                    // 3 (A/B/C) common; 4 also seen
  distractor_strategy: <one of §D>,
}
```

Key gaps vs. the current numeric-`answer` + `makeChoices()` engine:
- **Most items are visual.** Counting groups, ten-frames, number bonds, clocks,
  coins, balances, calendars, shapes, pictographs need a small **figure DSL**, not
  prose — this is the dominant mode at Standard 1, not an edge case.
- **Non-numeric answers.** `match`, `color`, `ordering`, `number-sentence`,
  `chinese-word`, `drawing`, `tick` need answer types and graders the numeric
  field can't hold.
- **Constraints are hard limits.** ≤100, `+ −` only, money ≤ RM10, single-step —
  enforce at generation and reject anything over-level (verify dropped several
  real-paper items for being multi-step; the prototype bank violates all limits).
- **Format weighting by topic.** Sample `format_type` from a topic-appropriate
  distribution (§C); e.g. `read-instrument` for Time/Data, `number-bond` for
  Whole numbers/Basic ops, `classify-sort` (choose-the-tool) for Measurement.
- **Profile gating.** Scaled pictographs (1 icon = N), tally, fractions,
  estimation, rounding, counting-in-4s are `original_dskp_extra` — gate them.
- **No exam framing.** `tp_level` is a PBD band, not an exam mark; do not generate
  UASA-style papers for Standard 1.

---

## Sources

Examples are transcribed from real SJKC Year-1 papers/worksheets (scanned images
read page-by-page and text-extractable flipbook/PDF sources — no Chinese OCR was
available). A per-topic **adversarial verify pass** rated each item
`verified` / `plausible` / `unverifiable` / `fabricated` and checked it was
on-level; over-level or multi-step items were dropped. Google-Drive PDFs cannot be
text-extracted via fetch, so items from confirmed-publisher Drive files are rated
`plausible` (real source of the right topic/level) rather than verbatim-verified.

| Tag | Source | Topics |
|---|---|---|
| Sin Min 2016 P1/P2, Han Ming 2016, March-2018 P1 | Real SJKC 一年级 school papers (drive.google.com via 30.com.my / buxi.my); several with answer keys | C.1, C.2 |
| 2017 2nd-term 第二次评审 P1 (40 MCQ) / P2 (15 subj) | Real SJKC school papers with answer keys | C.1, C.2 |
| 30.com.my unit PDFs (单元 1/2/3/8) | 华小网课 / buxi.my KSSR-Semakan practice sets with 答案 | C.1, C.2, C.7, C.8 |
| 30.com.my unit 4 (钱币) & unit 5 (时间) exercises + 2018 Oct year-end P2 | KSSR-Semakan practice + a school year-end paper | C.3, C.4 |
| AnyFlip 一年级数学下册 活动本 & 课本 (KSSR Semakan) | Official SJKC Year-1 activity book & textbook (Vol. 2) | C.5 |
| AnyFlip SJKC 一年级 Buku Teks 华文版 Jilid 2 | Official SJKC Year-1 textbook | C.6 |
| DSKP / DPK Edisi 3 Matematik Tahun 1 SJKC (华文版) | Official curriculum — scope authority & *Contoh* | all (corroboration) |
| MOBIM / Modul Bimbingan Matematik Tahun 1 (AnyFlip) | Official teacher modules | ten-frame, repeated addition, shape patterns (topic corroboration) |

- **Currency note:** Standard 1 is the *first* year on KSSR Semakan 2017 (Year 1,
  2017). 2016 papers are therefore old KSSR (2011); 2017–2018 are Semakan 2017.
  Formats and number ranges are stable, so all are valid for *format* capture —
  scope stays anchored to the Semakan-2017 DSKP/DPK.
- **Coverage gaps** (generate from the standard, not from a captured exemplar):
  time — standalone 时针/分针 hand-ID and pure daily-event ordering (Malay DPK
  only); geometry — plentiful; ten-frame (真十格), pure `2+2+2` repeated addition,
  and shape-pattern ○△ confirmed in MOBIM but not verbatim in Chinese worksheets.
- Scope, curriculum status, profiles, and PBD levels: see
  [standard-1-sjkc-math.md](./standard-1-sjkc-math.md).
