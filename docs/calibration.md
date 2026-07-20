# Calibration (#25)

Tune XP, level-gap, question rank, encounter effort, and capture from
**observed play** — never from intuition. This doc is the operator guide for
the report, the evidence gate, and the desktop playtest that feeds both.

## Guardrails (non-negotiable)

- Nonzero XP floor: a correct answer always awards at least 1 XP.
- Calm ordinary capture: no flee clock, no throw pressure for common /
  uncommon / rare creatures.
- Unlimited thinking time: no answer-speed XP and no duration telemetry.
- Aggregate-only: cells with fewer than 5 events are suppressed; user ids,
  event ids, and answers never print.

## Run the report

```sh
# Local or remote D1 — same shape either way.
cd worker
npx wrangler d1 execute pokemath-db --remote --json \
  --command "SELECT name, occurred_at, props_json FROM events" > /tmp/events.json
cd ..
npm run report:calibration -- /tmp/events.json
```

`npm run report:learning` remains the pure learning-quality view. Calibration
extends that with the **configured** side: levels 1–30, weaker / equal-level /
stronger reward displays, live Meadow encounter tables, catch curve, and
question-rank distribution from the active manifest.

## Evidence gate

The report opens with a hard decision:

| status | meaning |
| --- | --- |
| `INSUFFICIENT EVIDENCE — KEEP SHIPPED BASELINE` | At least one signal is below the aggregate threshold. **No constant may change.** |
| `READY FOR STRUCTURED HUMAN REVIEW` | Every signal has n≥5. Season reviews before/after examples; only then may constants change. |

Signals:

| signal | threshold |
| --- | ---: |
| correctness by question rank | ≥2 TP bands with n≥5 |
| battle abandonment | ≥5 outcomes |
| delayed review | ≥5 answers *(mechanic not shipped yet — gate stays closed)* |
| healthy stopping | ≥5 session ends |
| completed captures | ≥5 captures |

Passing a gate permits review only. It never auto-tunes.

## Baseline lock

The shipped baseline is pinned by
[`shared/tests/fixtures/calibration-baseline.v1.json`](../shared/tests/fixtures/calibration-baseline.v1.json)
and `shared/tests/calibration-baseline.test.ts`. Any approved constant change
must update that fixture in the same PR, with before/after examples for
weaker, equal-level, and stronger players printed by the report.

Display strings (`+N XP`, `Lv N`, `into/span`) are pure formatters in
`shared/player-progression.ts`, shared by the HUD, result card, and
calibration fixtures so approved numbers equal on-screen numbers.

## Variants

Wild encounters are **normal** only. Alt encounter rate is not implemented —
there is no variant constant to tune. Collection still records `variants`
when an alt is owned; that is inventory state, not an encounter roll.

## Desktop playtest worksheet (levels 1–30)

Local only (`docs/local-testing.md`). Never mutate production saves for
calibration.

### Seed a level

```sh
# Authenticated local session (cookie jar from local-testing.md).
curl -s -b /tmp/dev-cookies.txt http://localhost:8799/api/save > /tmp/save.json
node tools/prepare-calibration-save.mjs /tmp/save.json 8 > /tmp/put.json
curl -s -b /tmp/dev-cookies.txt -X PUT http://localhost:8799/api/save \
  -H 'content-type: application/json' \
  --data-binary @/tmp/put.json
# Reload the game so the HUD reads the new level.
```

`prepare-calibration-save` sets `player.level` and `player.totalXp` to the
exact curve boundary for levels 1–30 and returns a CAS body (`baseVersion`
from the GET).

### Representative loop (per stratum)

Run at **player levels 1, 8, and 20** (weaker / mid / stronger relative to
level-1 wilds and level-3 bosses):

1. **Dock → Woolly.** Confirm HUD shows `Lv N · into/span` matching the seed.
2. **2–4 ordinary battles.** Answer deliberately slow once — XP must not care.
3. **Capture once at high HP, once at low HP.** Ordinary capture must stay
   calm (no countdown).
4. **Flee once mid-battle.** Abandonment is a healthy-stopping signal.
5. **One boss if available** (level 3 wild). Confirm gap modifier pays better
   than a level-1 wild at the same player level.
6. **Stop outside battle** (sign-out or close tab after a payoff, not mid
   question).

Expected on-screen XP for a correct TP2 +/− turn against a level-1 wild
(from the report's levels table):

| player level | XP / correct turn | correct turns to next level |
| ---: | ---: | ---: |
| 1 | 6 | 4 |
| 8 | 2 | 45 |
| 20 | 2 | 105 |
| 30 | 2 | 155 |

### After the session

```sh
cd worker
npx wrangler d1 execute pokemath-db --local --json \
  --command "SELECT name, occurred_at, props_json FROM events" > /tmp/events.json
cd ..
npm run report:calibration -- /tmp/events.json
```

If the gate still reads insufficient, keep playing. If it reads ready,
Season reviews each proposed constant with the report's before/after
examples — weaker, equal-level, stronger — and only then lands a constants
PR that updates the baseline fixture.
