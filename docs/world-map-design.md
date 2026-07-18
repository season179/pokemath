# World Map Design — 7 Islands

**Status: DRAFT — brainstorm capture, by no means final.** (2026-07-17)

## Core idea

The world is **1 peaceful hub + 6 creature islands = one island per Standard
(Std 1–6)**. The difficulty curve is made physical: a kid can *see* their math
level on the world map. Each island's questions are pinned to that Standard's
curriculum scope (`docs/curriculum/standard-N-sjkc-math.md`).

## The areas

### Area 0 — Harbor Town (peaceful hub)
- **No wild encounters. NPCs only.**
- Home (heal), shop, a "Professor" who gives the starter creature, a harbor
  master who sails the player to islands.
- Tutorial, save-code / device transfer, and (future) sibling profile
  switching live here *diegetically* — talk to an NPC instead of a menu.
- The harbor is the world-map mechanic: each dock = one island.

### Islands 1–6 (one per Standard, themed by the actual math)

| # | Island | Standard | Math skin |
|---|---|---|---|
| 1 | **Meadow Isle** | Std 1 | Counting country. ≤100, `+ −` only. Sheep pens as ten-frames, orchards, clock tower, harvest festival. Soft round creatures. **Full design: [islands/meadow-isle.md](islands/meadow-isle.md).** |
| 2 | **Tallgrass Forest** | Std 2 | First `× ÷`. Creatures appear in *groups* (3 packs of 4!) so multiplication is visible in encounters. Fraction items (half potions). |
| 3 | **Tidepool Coast** | Std 3 | First multi-step. Pirate treasure maps = coordinates on a grid; symmetry in crab shells; pie-chart shells; "20% off" beach shop. |
| 4 | **Ruined Desert** | Std 4 | Pre-algebra & geometry. Temple door puzzles (area/perimeter), solve-the-unknown glyphs, ratio potion mixing. First UASA-tier island — noticeably more serious. |
| 5 | **Merchant City** | Std 5 | Finance. Bustling market: interest, discounts, mean/median/mode from price stalls, primes as vault-lock numbers. |
| 6 | **Skyreach Volcano** | Std 6 | Endgame. Airship travel between peaks = time zones; circles/angles for navigation; airship guild = commerce/insurance; numbers to 10 million. Final boss. |

## Progression: stats are the gate (no placement tests, no locks)

**Decision direction (Season, 2026-07-17):**

- **Every player starts at level 1**, regardless of age or real-world Standard.
- Pet stats (HP, ATK, …) are influenced by the **player's** stats/level.
- There are **no artificial gates**. All docks are open. But if an
  under-leveled player steps onto a high island, the monsters there simply
  one-shot the team. The stat curve *is* the gate.
- An older kid (e.g. a 10-year-old whose real level is Ruined Desert) starts
  in Harbor Town like everyone else and levels through Meadow Isle →
  Tallgrass Forest → … For them the early islands should be **a breeze** —
  fast wins, quick leveling.
- **And if the early islands are *not* a breeze, that's the feature**: it's
  exactly the foundation practice they need before the island that matches
  their school grade. Weak Std-2 multiplication gets strengthened *before*
  Std-4 pre-algebra depends on it.

Implications to design around:

- Leveling speed is driven by answering math correctly, so a kid who's
  genuinely mastered a Standard's material moves through its island quickly —
  natural pacing without any placement quiz.
- Encounter/boss stat curves per island must be tuned so "one island below
  your ability" feels breezy and "one island above" feels lethal — that
  contrast is what communicates readiness.
- XP uses strong level-relative scaling. As the player outlevels an island,
  its enemies award less and less XP. A player ready for Skyreach Volcano
  earns only **0–1 XP per Meadow Isle kill**. This prevents low-island farming
  from substituting for advancement.
- Do **not** use answer speed or elapsed play time to accelerate progression.
  This is turn-based, and children may leave the game mid-turn when distracted.
  The loop itself — battles, collecting, discovery, and visible progress — has
  to make the repetition enjoyable.

## Player and pet combat model

**Current direction, not final:**

- The **player** owns progression and combat power: level, XP, HP, attack, and
  any other eventual stats.
- Pets perform the battle visually, but do not independently own level, XP,
  attack, or permanent stat growth.
- Damage is calculated from the player's stats. This avoids having to level
  every newly caught pet separately and keeps island readiness attached to the
  child's overall progress.
- Still unresolved: whether a pet may have temporary per-battle state (such as
  current HP), species-specific moves/passives, or purely visual differences.
  That choice determines whether catching and switching pets has strategic
  value or is primarily collection/cosmetic play.

> Implementation note: the current prototype/domain model stores HP, attack,
> level, and XP on each `Creature` (`shared/creature.ts`). The direction above
> intentionally differs and would require a later design and migration; no
> implementation decision has been made here.

## Pokémon-inspired mechanics to preserve

**Promising direction, still subject to playtesting:** grinding is not the fun
by itself. Repetition works when each battle can advance several desires at
once: gain XP, catch something new, evolve a favourite, discover a place, or
reach the next guardian.

### 1. Level-relative XP

- Enemies near the player's level award normal XP.
- Stronger enemies offer high XP at high risk.
- Enemies far below the player's level award only 0–1 XP.
- This pushes players toward the right island without an artificial lock.

### 2. Global progression and instantly usable pets

- The player owns permanent numerical progression: level, XP, attack, defence,
  and related stats.
- A pet owns the tactical and expressive identity: moves, passive ability,
  appearance, and evolution.
- Newly caught pets inherit the player's combat power immediately rather than
  beginning another independent leveling grind.

In short: **player stats determine how strong you are; the active pet
determines what you can do.** Pets should not be purely cosmetic, or catching
risks becoming only a sticker collection.

### 3. Small tactical move sets

A pet can have a compact Pokémon-like move set, for example:

- **Quick move:** reliable, modest damage.
- **Power move:** stronger; may require a harder or multi-step question.
- **Defensive move:** a correct answer creates a shield.
- **Special move:** healing, a status effect, improved catch chance, etc.

There is no answer timer. The player chooses calmly, answers the question, and
then watches the pet execute the selected move.

### 4. Catching makes repetition unpredictable

Wild creatures can be common, uncommon, or rare; native to particular islands
or landmarks; occasionally special-coloured; and easier to catch once
weakened. A battle then offers discovery and collection alongside XP.

### 5. Evolution makes learning progress visible

Pets can evolve when the **player** reaches milestones or completes islands.
This turns otherwise invisible practice into a dramatic visual reward without
requiring separate pet levels or answer-speed targets.

### 6. Island guardians and badges

Each creature island can culminate in a guardian battle. Victory awards an
island badge and can unlock a pet evolution, move, or convenience. The badge
shows readiness, but need not physically lock the next island: an unprepared
player remains free to sail ahead and encounter the natural stat wall.

### 7. Routes, landmarks, and secrets

Each island should feel like a journey rather than one grinding field. It can
alternate between arrival/safety points, routes, caves or ruins, NPCs, rare
creature habitats, the guardian destination, and shortcuts opened afterward.

### 8. Gentle defeat

Defeat returns the player to Harbor Town or the island entrance without losing
earned XP or captured pets. An NPC can gently suggest that the enemies may be
too strong. Mathematical weakness should never be framed as shame or permanent
loss.

### Mechanics not to copy

- Independent levels for every pet, which discourage trying new captures.
- A large elemental/type chart competing with math for attention.
- Excessive random encounters.
- Harsh money or progress loss after defeat.
- Repetition that rewards nothing except XP.

### Recommended party model (not settled)

Use separate **temporary, player-derived HP** for each pet. When one pet
faints, another can enter with its own derived HP pool. Pets still have no
independent permanent stat progression, but team-building and switching remain
meaningful. The simpler alternative is one player HP bar shared by the whole
team, with switching changing only available moves.

## Map tech

Each island reuses the existing tile-map format
(`game/assets/src/world/map-data.ts` — `MAP: string[]` with tile chars). The
"world map" is a dock-picker screen (or harbor-master dialog) plus 7 islands
built from MAP-style data, each with an exit back to Harbor Town.

**Refinement (2026-07-17, Meadow Isle planning):** an island is a **graph of
region maps**, each its own `MAP: string[]` chunk with stable local
coordinates, connected by named gateways — never resized after shipping.
Future areas (rest stops, mini-games) attach as new chunks at reserved
gateway pockets without moving existing geography. Player location persists
as `regionId + local x/y`.

## Open questions

- Do creatures stay island-native (catch motivation to revisit every island,
  even below your level)?
- Is the world map a separate dock-picker screen, or eventually walkable/
  sailable connections?
- One shared world per save vs. per-kid saves (ties into sibling profiles
  open question in ROADMAP.md).
- Exact stat/XP curves per island — what "breeze," "one-shot," and the
  level-relative XP falloff mean in numbers.
- When one pet faints, can the player send out another pet with a fresh,
  player-derived HP pool, or does the whole team share one player HP bar?
- What gives different pets strategic identity if they have no independent
  stats: moves, passive abilities, types, evolutions, or some subset?
- Is player level visible, and exactly which correct answers/battle outcomes
  feed it?
