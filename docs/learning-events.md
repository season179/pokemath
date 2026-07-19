# Learning events (issue #24)

Telemetry that answers one question: **is the game teaching well, and do kids
stop playing of their own accord?** The data feeds M7 calibration (#25): XP,
question-rank, capture, and retention tuning around learning quality — never
around compulsion.

The registry in [`shared/telemetry.ts`](../shared/telemetry.ts) is the single
source of truth. The client validates before queueing, the Worker validates
again on ingest, and the tests in `shared/tests/telemetry.test.ts` pin the
contract. An event that isn't in the registry cannot reach the database.

## Privacy guardrails (locked)

- **No raw answers, no picked choices.** Events carry `correct: boolean`,
  never what the child answered.
- **No answer-speed or timing properties.** Thinking time is unlimited by
  design (meadow-isle.md); duration is never measured.
- **No free text.** Every property is an enum, a bounded integer, or a short
  machine id matched by regex. Unknown keys are rejected. A child cannot leak
  a name, message, or answer through a payload.
- **No compulsion signals.** No answer-speed XP, public leaderboard,
  streak-loss, or idle-punishment data — those mechanics don't exist and
  these events can't feed them.
- **Opaque identity.** Rows key on better-auth's opaque user id, never
  `playerName`/email. On sign-out the client queue is flushed under the
  current account and then closed, so a sibling's session never inherits
  unsent events (the same reason `persistence.signOut` clears the save
  cache).
- **Aggregate-only analysis.** The report suppresses any cell with fewer
  than 5 events and never prints user ids, event ids, or answers.

## Event reference

### Emitted today

| Event | Properties (required · optional) | Emitted when |
| --- | --- | --- |
| `question_answered` | `battle: "wild"\|"boss"`, `operation`, `correct: bool` · `topic`, `tp: 1–6`, `step: 0–7`, `steps: 1–8` | Each answered question turn. Boss multi-step problems emit one event per step (`step`/`steps` set). |
| `battle_outcome` | `battle`, `outcome: "won"\|"captured"\|"fled"\|"defeated"`, `asked: 0–99`, `correct: 0–99` | Battle ends. `fled` is the abandonment signal; `defeated` is the all-fainted loss. Exactly one per battle. |
| `creature_captured` | `speciesId` | A wild creature joins the collection. Distinct `speciesId` over time is the collection-variety signal. Stage/variant omitted: every wild capture is stage 1 / normal today. |
| `session_ended` | `reason: "sign_out"\|"page_unload"`, `duringBattle: bool` | The player stops. `sign_out` is always deliberate. `page_unload` covers tab close/navigation — it also fires on refresh, so treat its absolute count with care and segment on `duringBattle`. |

`operation` matches `/^[a-z0-9][a-z0-9 +\-×÷()/]{0,31}$/` (question-engine
labels like `addition`, `mixed (...)`); `topic` is a curriculum-doc section
id like `4.1`; `tp` is the PBD performance level 1–6. Both are absent from
schema-v1 bank questions — the properties are optional for that reason.

### Defined now, emitted when their mechanics ship

| Event | Properties | Blocked on |
| --- | --- | --- |
| `hint_used` | `battle`, `operation` · `topic`, `tp` | No hint mechanic exists yet. |
| `review_question_answered` | `operation`, `correct` · `topic`, `tp` | Delayed/interleaved review is a later-island feature (meadow-isle.md M7). |

Their schemas are fixed and validated today so the mechanics emit conforming
data the day they land; per the issue thread, events whose mechanics exist
land first.

## Pipeline

1. **Client** (`game/client/telemetry.ts`, mirrored to
   `game/assets/src/client/`): validates → queues in localStorage
   (`pokemath.events`, capped at 500, oldest drops first) → flushes up to
   100 events per batch alongside every save checkpoint and best-effort on
   `pagehide` (`keepalive`). Event ids are client-minted UUIDs.
2. **Worker** (`worker/src/events.ts`): `POST /api/events` (session-gated)
   re-validates every event, drops individually invalid ones
   (`{accepted, dropped}`), and `INSERT OR IGNORE`s on `(user_id, event_id)`
   — retried flushes never double-count. Batches over 16 KB are refused.
3. **Storage** (`worker/migrations/0002_events.sql`): one `events` table;
   `received_at` is the server clock (retention anchor), `occurred_at` the
   client clock (analysis only).
4. **Retention: 90 days.** A daily cron (`triggers.crons` in
   `wrangler.jsonc` → `scheduled()` in `worker/src/index.ts`) deletes rows
   whose `received_at` is older than `TELEMETRY_RETENTION_DAYS` (90). The
   constant is pinned by test; change code, doc, and test together.

## Analysis

```sh
npx wrangler d1 execute pokemath-db --remote --json \
  --command "SELECT name, occurred_at, props_json FROM events" > /tmp/events.json
npm run report:learning -- /tmp/events.json
```

The report compares **predicted difficulty** (TP level ordering) with
**observed outcomes** (correct rates by operation/topic/TP, battle
abandonment, collection variety, voluntary stopping) and flags TP
inversions — where a higher-TP band is answered *more* correctly than a
lower one, the first place #25 calibration should look.

## Deploying the migration

```sh
cd worker
npx wrangler d1 migrations apply pokemath-db --remote   # applies 0002_events.sql
npx wrangler deploy                                      # ships the route + cron
```

The cron trigger only starts purging after the deploy that ships
`triggers.crons` — applying the migration alone does not schedule it.

The Worker accepts events before any client emits them, so deploy the Worker
first; the game build can follow on the normal `npm run deploy` cycle.
