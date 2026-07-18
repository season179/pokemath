# Meadow Isle — Standard 1 Island Design

**Status: DRAFT (2026-07-17).** Companion to
[world-map-design.md](../world-map-design.md). Curriculum authority:
[standard-1-sjkc-math.md](../curriculum/standard-1-sjkc-math.md) (scope) and
[standard-1-question-style.md](../curriculum/standard-1-question-style.md)
(formats). Those two docs are the source of truth; this doc only decides how
the content becomes a place.

## What Meadow Isle is

The first creature island: Standard 1 (一年级) SJKC mathematics as a pastoral
counting country. Every one of the seven DPK Edisi 3 core topics lives here —
whole numbers, `+ −`, money, time, measurement, shapes, and data — wrapped in
sheep pens, orchards, a barn, a clock tower, and a harvest festival.

**Island laws (hard constraints from the scope doc — nothing on this island may
break them):**

- Numbers ≤ 100. `+ − =` only — no `× ÷` symbols anywhere, not even as
  decoration. (× readiness appears only as *repeated addition by 2, 5, 10*,
  e.g. orchard rows: `5 + 5 + 5`; counting in 4s is extra-profile only.)
- Money ≤ RM10, sen ≤ RM1, single-step. Coin/note exchange does not mix
  coins and notes.
- Word problems are single-step.
- Time: whole / half / quarter hours only; no exact-minute reading.
- Measurement: **non-standard units only** (paper clips, handspans,
  footprints, cups, marbles). No cm/kg/ℓ, no scaled instruments.
- Pictographs: **1 picture = 1 value**.
- Bilingual SJKC representation throughout: numerals **and** Chinese number
  words (`18` / `十八`), Mandarin-first wording with Malay/English gloss.
- Fractions, estimation, rounding, tally marks, counting-in-4s, scaled
  pictographs exist **only** behind the `original_dskp_extra` profile (see
  "The Hidden Grove" below).

## Design principles

1. **Landmarks have topic identity; geography is not a syllabus.** Each
   sub-area anchors one topic (its "specialist representation" lives there:
   clocks at the tower, balances at the barn, pictographs at the festival),
   but basic counting and `+ −` questions appear *everywhere*. The island
   must feel like a place, not seven textbook chapters in a trench coat.
2. **Formats are orthogonal to geography.** Any `format_type` (count-write,
   match-connect, fill-blank, colour, …) can appear in any area. What scales
   with distance from the dock is **cognitive demand**, per the TP ladder:
   - smaller → larger number ranges (within 20 → within 100)
   - full picture support → partial scaffolding
   - recognition / naming → application → routine daily-life problems
3. **A breeze stays a breeze.** Per the world-map progression decision, an
   older or stronger player must flow through fast: for an over-levelled
   player, routine wild encounters resolve in a single correct answer,
   shortcuts open early, and no long mandatory activity chains gate the
   route.
4. **Questions are visible in the world.** Std-1 items are overwhelmingly
   *visual* — so the island renders the figure, not just the text: sheep in
   pens, apples on the ground, coins on a counter, a real clock face. The
   `presentation` axis (`figure:ten-frame`, `figure:clock`, `figure:coins`,
   …) is diegetic here.
5. **Gentle tone, real stakes.** Defeat sends you back to the dock with
   everything kept; the guardian is impressive but kind.
6. **A satisfying session before a return mechanic.** A normal visit targets
   10–15 minutes: 2–4 battles plus one chosen payoff such as helping an NPC,
   opening a shortcut, revealing a habitat clue, or changing a landmark.
   End with one visible but non-urgent next possibility. Meadow Isle has no
   hard streak, daily obligation, answer timer, idle-pet punishment, public
   leaderboard, gacha, or extra reward currency.

## Island layout

**Shape decision (Season, 2026-07-17): the map is big — it does not fit one
screen — and its shape must absorb future growth (rest stops, mini-game
areas) without redrawing existing geography.**

The island is a **ring road** (the Meadow Loop) with regions hanging off it
clockwise, and **The Hundred Stones at the island's center** — the heart you
keep glimpsing between the trees on your way around. The camera follows the
player; exploration is the point.

```
                    N
            [Ticktock Knoll]
                    |
   [Woolly Meadows]—+—[Appledore Orchard]
      (NW)                     (NE/E)
    |                             |
  (W)·DOCK      ~~~ring~~~   [Festival Green] (SE)
    |                             |
   [Pattern Gardens]—[Harvest Barn & Mill] (S)
                    |
            THE HUNDRED STONES
            (island center — guardian)
```

- **Ring positions** (clockwise from the west dock): Dockside Path (W) →
  Woolly Meadows (NW) → Ticktock Knoll (N) → Appledore Orchard (NE/E) →
  Harvest Festival Green (SE) → Harvest Barn & Mill (S) → Pattern Gardens
  (SW) → back to the dock. Two inner paths (N and S) lead from the ring to
  the Hundred Stones at the center.
- **TP gradient still works**: demand rises clockwise from the dock; the
  guardian waits at the center.
- **Expansion pockets** (the growth mechanism): between several regions the
  ring passes fenced, wooded gaps — visibly "something is in there…" but
  blocked. Future rest stops, mini-game groves, or seasonal areas open one
  pocket at a time by replacing a fence gate — no existing landmark ever
  moves. Initial reserved pockets: NW-W (between Meadows and Dockside),
  N-NE (between Knoll and Orchard), SE-S (between Festival and Barn).
- The **Hidden Grove** (`original_dskp_extra`) is one such pocket (SW,
  beside the Pattern Gardens) whose gate exists only under the profile flag.
- **Shortcuts**: once a region is visited, its ring signpost offers a
  "run back to the dock" option, so over-levelled players crossing the big
  map are never forced to re-walk the whole loop.

**Implemented as regions, not one rectangle.** The Loop is a *graph* of
region maps — each in the existing `MAP: string[]` format with its own
local coordinates — stitched by named gateways:

- Each region is its own map data (`meadow/dock`, `meadow/loop-west`,
  `meadow/woolly`, `meadow/ticktock`, `meadow/orchard`, `meadow/festival`,
  `meadow/barn`, `meadow/gardens`, `meadow/stones`) and is **never resized
  after it ships**. Regions can still be bigger than one screen; the camera
  follows within the current region.
- **Gateways are named** edge/gate tiles (`loop-west.north → woolly.south`).
  An expansion pocket is a gateway whose target region doesn't exist yet —
  attaching a future rest stop or mini-game area means adding **one new
  region file and enabling one gateway**. No existing map, NPC, encounter,
  or save coordinate ever moves, and growth works on both the inner and
  outer ring.
- Player location persists as `regionId + local x/y` — but that lands with
  **save v2 (the migration PR, before M2)**; M1 keeps today's session-only
  spawn at Harbor Town, so the island work is never blocked on the
  migration. On load, the saved tile is **validated walkable**; if a layout
  edit made it solid, the player spawns at the region's named safe gateway
  instead of stranding the save.
- Crossing a gateway shows the region banner ("Woolly Meadows 羊毛草原") —
  named places as you explore, classic route feel.

---

### 1. Dockside Path — arrival & tutorial (TP1)

The first ten minutes. No failure states.

- **Anchor:** counting small groups (within 10), numeral ↔ Chinese word.
- **In the world:** bilingual signposts (`5 / 五`), gulls on posts to count,
  ferryman NPC who asks you to count your own party before boarding.
- **Typical formats:** `count-write`, `count-circle`, `match-connect`
  (numeral ↔ 中文数字 stones), `true-false` ("4 比 6 大？✓/✗").
- **Creatures:** first guaranteed encounter is a `3EVO/05` stage-1
  (caterpillar) — weak, catchable, teaches the loop.

### 2. Woolly Meadows — counting country (TP1–TP2)

Rolling pasture with the island's signature creature: the woolly `3EVO/06`
line grazing in pens.

- **Anchor:** whole numbers to 100 — counting, comparing, decomposing.
- **In the world:**
  - **Ten-pen fences.** Sheep pens built in frames of ten — a walkable
    `figure:ten-frame`. "7 只羊，再进几只就满 10 只？" (number bond to 10,
    rendered as real sheep and real fence gaps).
  - **Stepping-stone brook.** Stones labelled `2, 4, 6, __, 10`; harder
    crossings use 5s and 10s, forward and backward (`pattern-continue` you
    physically hop across).
  - **More/fewer pastures.** Two adjacent flocks: which has 多 / 少 / 一样多?
  - **Shepherd's word stones.** Match groups of sheep to numerals and to
    Chinese words (`match-connect`).
- **Typical formats:** `count-write`, `compare`, `number-bond`, `ten-frame`,
  `pattern-continue`, `order-sequence` (arrange small→large; ordinal naming
  第几 — explicit before/after/between drills are `original_dskp_extra`,
  see the Hidden Grove).
- **Creatures:** `3EVO/06` (the flock line — wild stage-1 fluffballs are the
  countable "sheep"; the line matures into a winged meadow fae, so evolved
  forms belong to player-owned pets, not the grazing flocks), `2EVO/10`
  (pufftail mouse, common), `3EVO/13` (ball-tail hare, uncommon), `2EVO/03`
  (woolly ram → bull, **rare**, drifts in near the Hundred Stones).

### 3. Appledore Orchard — the `+ −` heartland (TP2–TP3)

The island's arithmetic core, built so that **看图列式** (picture → number
sentence) is something you can see.

- **Anchor:** addition and subtraction within 100; number bonds; repeated
  addition.
- **In the world:**
  - **Fallen apples.** A tree holds 10 apples, 4 lie crossed-out on the
    ground → `10 − 4 = 6` (`picture-sentence` with literal crossing-out).
  - **Baskets & bonds.** Two baskets pour into one crate (part-part-whole):
    `3 和 7 合起来是 10`; reverse for splitting.
  - **Orchard rows.** 3 rows of 5 trees: `5 + 5 + 5 = 15` — repeated
    addition as × readiness, no `×` symbol (2s, 5s, 10s only).
  - **The Fruit Stand.** First money shop: identify Malaysian coins and
    notes (认钱), then prices in sen and small ringgit, totals ≤ RM10,
    single-step (`50 sen + 20 sen`, `RM5 − RM3` change). Equivalent-value
    exchange happens here too — coins for coins within RM1 (`50 sen` ↔ five
    `10 sen` coins), notes for notes within RM10 — never mixed.
- **Typical formats:** `picture-sentence`, `number-bond`, `fill-blank`
  (missing addend), `word-single` (single-step orchard stories),
  `count-write` (count the picked apples).
- **Creatures:** `3EVO/21` (chick → gamefowl → plumed strider — the line
  ends as a riding bird, not a rooster), `3EVO/02` (sprout kitten → leaf
  cat → orchard lynx, uncommon, naps in trees), `3EVO/08` (pink squirrel-fox,
  uncommon).

### 4. Pattern Gardens — shapes & patterns (TP2–TP3)

Manicured flowerbeds where everything is a shape.

- **Anchor:** 2D shapes (square, rectangle, triangle, circle) and patterns.
- **In the world:**
  - **Flowerbed friezes.** Beds planted as `○ △ ○ △ __` — finish the row
    (`pattern-continue`).
  - **Shape beds.** Identify/count sides and corners of bed outlines;
    straight vs curved edges.
  - **Colour quests.** "把最大的花涂成红色" (`color-shade`: colour the
    largest / the N flowers).
- **Typical formats:** `name-count`, `pattern-continue`, `color-shade`,
  `compare` (square vs rectangle, double-bubble style at higher TP).
- **Creatures:** `3EVO/13` (ball-tail hare), `3EVO/05` (larva → cocoon →
  great moth; the garden is the best place to meet all three stages).

### 5. Harvest Barn & Mill — solids & measuring (TP2–TP4)

A working farm: crates, barrels, a cylindrical silo, a conical haystack, a
marble balance, and the miller's abacus.

- **Anchor:** 3D solids (name/count faces, edges, vertices) and non-standard
  measurement.
- **In the world:**
  - **Solid scavenger hunt.** Crate = 正方体/长方体, barrel & silo = 圆柱体,
    haystack = 圆锥体, roof block = 角锥体, pumpkins = 球体 — name them,
    count 面/边/顶点 (`name-count`).
  - **Measure the farm.** How many paper clips long is the hoe? How many
    footprints wide is the barn door? How many cups fill the pail?
    (`count-write` with non-standard units).
  - **The marble balance.** Weigh the pumpkin in glass marbles; which side
    is heavier? (`compare`, `figure:balance`).
  - **Pick the tool.** 哪种工具适合测量？paper clip vs handspan vs cup
    (`classify-sort`).
  - **Miller's abacus.** The miller totals grain on a 1:4 abacus
    (`read-instrument`, `figure:abacus` — representation only, per scope).
- **Creatures:** `2EVO/10` (barn mouse), `2EVO/06` (farm pup → hound —
  stays four-legged both stages, uncommon), `3EVO/21` (gamefowl on the roof).

### 6. Ticktock Knoll — the clock tower (TP1–TP4)

A hilltop tower with a giant working clock face, kept by a night-owl NPC and
his owl creatures.

- **Anchor:** time — whole/half/quarter hours, days, months, event order.
- **In the world:**
  - **The big face.** Name the 时针 / 分针 (hour vs minute hand), then read
    整点 / 半点 / 一刻 / 三刻 off the tower; quests ask you to *set* the
    hands by tapping (an objective interaction — freehand `trace-write` /
    `drawing` answer forms are **cut from Meadow Isle**, per the dev plan).
  - **The keeper's schedule.** Order his day: 起床 → 喂食 → 睡觉
    (`order-sequence`); yesterday/today/tomorrow riddles; a tear-off
    calendar page to read.
  - **Dawn/dusk flavour.** The tower area shifts lighting with quest state —
    the owl keeper only fully wakes at 八时.
- **Typical formats:** `read-instrument` (`figure:clock`,
  `figure:calendar`), `order-sequence`, `fill-blank` (一星期有 __ 天),
  `word-single` (single-step day/month problems).
- **Creatures:** `2EVO/04` (round chick → owl — the tower's mascot line),
  `3EVO/08` (squirrel-fox at the hill base).

### 7. Harvest Festival Green — data & market (TP2–TP3)

A festival ground with stall awnings and a big painted harvest board.

- **Anchor:** data handling — collect, classify, read pictographs.
- **In the world:**
  - **The harvest board.** A pictograph of the island's produce
    (**1 icon = 1 value**): how many apples? which is 最多 / 最少? apples vs
    pumpkins — 多几个? (`read-instrument`, `figure:pictograph`).
  - **Sorting stalls.** Classify baskets: 蔬菜 / 水果 (`classify-sort`).
  - **Festival stalls.** Money recurs here in richer dress: small purchases,
    a 储蓄 (savings) jar quest, stall trades — all still ≤ RM10,
    single-step.
- **Creatures:** `3EVO/01` (pink moth-fairy, **rare**, appears at dusk when
  the lanterns light), plus festival spillover from everywhere.

### 8. The Hundred Stones — guardian ground (TP3–TP4, TP5 sparingly)

A quiet field where one hundred standing stones rise in a 10×10 grid — the
island's thesis statement: everything here was about making 100 feel
countable.

- **In the world:** free-play number field — place value (十位/个位) walked
  as rows and columns; ordering and ordinal paths; the last gentle review
  before the guardian.
- **Guardian: the Cloud-Maned Horse** (`Uniques/03`). It does not roar; it
  paws the ground and stones light up. The battle samples **several topics
  in one fight** (a count, a `+ −` sentence, a clock read, a money change,
  a pictograph read), mostly TP3–TP4 with at most one TP5 twist. Victory
  awards the **Meadow Badge** and (per world-map mechanics) can trigger a
  starter evolution.
- **Creatures:** `2EVO/03` (woolly ram → bull, rare, grazes between the stones).

### The Hidden Grove (`original_dskp_extra` only)

A walled garden that appears on the map only when the save's profile flag
includes `original_dskp_extra`. Content the DPK pushes to Year 2 lives here:

- **Fraction flowerbeds** — shade ½ / ¼ / ¾ of a bed (`color-shade`,
  `name-count` fractions).
- **The scarecrow's estimate** — 估一估 how many crows (`estimate`).
- **Rounding stones** — nearest-ten path (`round-ten`).
- **Tally barn door** — 正字 marks for the day's eggs (`tally`).
- **Before/after/between trails** — explicit 之前/之后/中间 drills along the
  grove's numbered path (`order-sequence`).

This keeps the default island exactly DPK-core while letting a full-DSKP
school's child see *their* classroom content in-world.

## Money is a thread, not a shop

The fruit stand *introduces* money, but it recurs island-wide so the topic
isn't one-and-done: ferry fare at the dock, the savings-jar quest, festival
stalls, NPC trades. Every instance obeys ≤ RM10 / single-step / no mixed
coin+note exchange.

## Encounter → generator contract

Each encounter carries an **area-sampling context** layered onto the
canonical item schema in
[standard-1-question-style.md](../curriculum/standard-1-question-style.md) §E.
The area supplies the sampling weights; the item itself is built with the
full schema (`item_format`, `answer_form`, `bilingual`, and for objective
items `options` + `distractor_strategy`):

```
area_context := {
  profile: "dpk3_2026_core" | "original_dskp_extra",   // save-level flag
  representation: "sjkc_representation",               // always on
  topic_weights:   { "4.1".."4.7" | "extra": weight }, // area-anchored;
                   // counting & +− keep a baseline share everywhere
  tp_range:        1..5,        // distance-from-dock gradient
  format_weights:  { <§A format_type>: weight },        // area's typical formats
  presentation_hint: <figure matching the landmark, when near one>,
}
```

## Creature roster (Meadow Isle)

The table below records current **art candidates**, not save identity. Licensed
Pocket Creature Tamer strips may be streamed from private R2, and original
PokeMath strips may be produced by `tools/generate-creature.mjs`. Every family
receives a permanent semantic `speciesId` after the bilingual naming pass;
its species data points to a replaceable `artRef`. Pack paths, generated
filenames, and bucket keys must never become `speciesId` values.

Each strip contains all evolution stages; alternate palettes are variants,
not a separate species or a separate rarity. Working reads describe the whole
line because a family chosen for its cute stage 1 will be played at every
stage. Meadow wild encounters are mostly stage-1 forms; later forms appear
mainly as evolved player pets.

| Current artRef candidate | Working read (all stages) | Stages | Rarity | Where |
|---|---|---|---|---|
| `3EVO/05` | larva → cocoon → great moth | 3 | common | Dockside, Pattern Gardens |
| `3EVO/06` | fluffball → winged lambkin → meadow fae | 3 | common | Woolly Meadows (the flocks) |
| `2EVO/10` | pufftail mouse → roly-poly mouse | 2 | common | everywhere, Barn |
| `3EVO/21` | chick → gamefowl → plumed strider | 3 | common | Orchard, Barn |
| `3EVO/13` | ball-tail hare (quadruped throughout) | 3 | uncommon | Woolly Meadows, Gardens |
| `3EVO/02` | sprout kitten → leaf cat → orchard lynx | 3 | uncommon | Orchard |
| `3EVO/08` | pink squirrel kit → squirrel-fox → blossom fox | 3 | uncommon | Orchard, Ticktock base |
| `2EVO/04` | round chick → owl | 2 | uncommon | Ticktock Knoll |
| `2EVO/06` | farm pup → hound | 2 | uncommon | Barn |
| `2EVO/03` | woolly ram → bull | 2 | **rare** | Hundred Stones edge |
| `3EVO/01` | petal sprite → blossom fae | 3 | **rare** | Festival Green (dusk) |
| `Uniques/03` | **Cloud-Maned Horse — guardian** | 1 | guardian | The Hundred Stones |

Reserved for later islands (seen in the pack, wrong biome here): the sea
serpents (`3EVO/09`, `3EVO/10`) → Tidepool Coast; the sun-maned lion
(`3EVO/04`) and tan anteater (`2EVO/01`) → Ruined Desert; bats and imps
(`2EVO/05`, `2EVO/08`) → caves/ruins; the humanoid-fighter lines (e.g.
`3EVO/18`) → later, rougher islands; the green kirin (`Uniques/06`) → a
later, more mythical island.

## Progression, collection, and reward contract

These foundations land in **M1.5 before broad encounters**:

- The **player**, not each pet, owns permanent `level` and `totalXp`.
  Migration preserves the highest old creature level plus its fractional
  progress, then uses the approved variable player-level curve.
- `ownedCreatures` is the full collection. `teamIds` references at most six
  active creatures. Capturing a seventh friend sends it safely to storage;
  Meadow never rejects a successful ordinary capture because the team is full.
- Field Guide state records **Unknown → Seen → Caught**, discovered variants,
  habitat clues, and discovery notes. A minimal Harbor Sanctuary provides the
  physical place to inspect storage and change the active team.
- Every ordinary battle shows deterministic player XP and RM in the compact
  victory result. The displayed total and saved total must match exactly.
  Capturing cannot award full kill XP when it bypasses remaining questions.
- Common, uncommon, and rare creatures use the calm ordinary capture flow:
  **no flee clock and no timed mathematics**.
- **Only Unique rarity** may use an authored hunt, telegraphed remaining
  actions, and a larger trust meter. Each question still has unlimited thinking
  time. If the Unique flees, its silhouette, habitat clue, trail progress, and
  second chance remain.
- XP truth and presentation ship with the first satisfying encounter slice;
  M7 tunes observed constants rather than postponing progression itself.

## Revised implementation order (2026-07-18)

1. **M1 — Sail there and walk it.** Finish the region graph without changing
   its current scope.
2. **M1.5 — Save, progression, and collection foundation.** Save v2,
   persistent location, player XP, semantic species identity, owned storage,
   active team, Field Guide state, badges, profile, and migration tests.
3. **M2A — One satisfying encounter loop.** One area, small real roster,
   compliant hand-authored bank, immediate feedback, calm capture, gentle
   defeat, XP bar, and victory result.
4. **M2B — Expand encounters and collection.** All ordinary habitat tables,
   replaceable art references, Field Guide UI, and Harbor Sanctuary.
5. **M3 — Versioned Std-1 question schema.** New answer forms stay additive;
   the legacy path is protected by golden tests.
6. **M4 — Validated offline generator.** Mechanical rejection, adversarial
   verify pass, and human sampling; no generation during a child's battle.
7. **M5 — Landmarks, topic arcs, and session payoffs.** Shared figure kit,
   short goals, shortcuts, visible world changes, and selected mini-guardians.
8. **M6 — Unique hunt and finale.** Unique-only pressure, persistent second
   chances, fixed guardian slate, Meadow Badge, and starter evolution.
9. **M7 — Observed tuning and healthy return.** Tune XP/capture/question rank,
   measure learning-quality retention, then optionally add a non-resetting
   three-day expedition journal and interleaved review.

## Open questions

- **Bilingual creature naming.** Every species needs a Chinese + English
  name and permanent semantic `speciesId`; the working reads above are just
  visual notes.
- Do landmark interactions (moving sheep between pens, setting clock hands)
  become first-class `activity` answer forms, or stay flavour around
  standard answer forms?
- Variant encounter rate and cosmetics. Variants never add capture pressure;
  only Unique rarity can do that.
- **Audio/voice** (read-aloud for pre-readers, creature cries): explicitly
  **deferred by Season (2026-07-17)** — the island takes shape first.
  Design note for later: the zh-first UI must not assume reading fluency.

## Decisions locked with the revised dev plan (2026-07-18)

- **Guardian question slate: fixed authored set** (one hand-checked item per
  topic: count, `+ −` sentence, clock read, money change, pictograph read),
  TP3–4 with one TP5 twist. Mastery-weighted sampling is a later-island
  upgrade, once per-topic mastery tracking exists.
- **Starter evolution at the Meadow Badge: always.** The badge evolves the
  player's starter, located by `starterCreatureId` in save v2 — no FOMO
  rule. The starter evolves whether it is active or in the Harbor Sanctuary.
- **Save v2 creature identity.** Every creature gains `speciesId`, `stage`,
  `variant`, and a stable per-instance `creatureId`; the save gains
  `starterCreatureId`. Species identity is semantic and independent of its
  replaceable `artRef`.
- **Collection storage is part of M1.5.** `ownedCreatures` is separate from
  active `teamIds[≤6]`; a seventh capture goes to storage. Field Guide state
  and a minimal Harbor Sanctuary ship before broad capture.
- **Unique-only capture pressure.** Common, uncommon, and rare captures remain
  calm and untimed. Only Unique rarity can use telegraphed flee actions and a
  larger trust meter; escape preserves hunt progress and a fair second chance.
- **Healthy return, not compulsion.** Short session payoffs land before any
  return feature. A later expedition journal never resets and never punishes a
  missed day.
- **`trace-write` / `drawing` answer forms are cut from this island.**
  Hand-setting (clock) becomes tap-to-set; nothing on Meadow Isle requires
  freehand input.
