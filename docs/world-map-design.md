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
| 1 | **Meadow Isle** | Std 1 | Counting country. ≤100, `+ −` only. Sheep to count, orchards, clock tower (time-telling NPC quests). Soft round creatures. |
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
- Early-island XP should stay meaningful enough that review isn't a grind,
  but scaled so that farming Meadow Isle forever can't substitute for
  advancing.

## Map tech

Each island reuses the existing tile-map format
(`game/assets/src/world/map-data.ts` — `MAP: string[]` with tile chars). The
"world map" is a dock-picker screen (or harbor-master dialog) plus 7 instances
of MAP-style data with an exit tile back to Harbor Town.

## Open questions

- Do creatures stay island-native (catch motivation to revisit every island,
  even below your level)?
- Is the world map a separate dock-picker screen, or eventually walkable/
  sailable connections?
- One shared world per save vs. per-kid saves (ties into sibling profiles
  open question in ROADMAP.md).
- Exact stat/XP curves per island — what "breeze" and "one-shot" mean in
  numbers.
- Does the player level (as opposed to pet levels) exist as a visible stat,
  and what exactly feeds it?
