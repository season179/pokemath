# Pokemath Roadmap

North star: the math-Pokémon game rebuilt on **Cocos Creator** (TypeScript),
deployed on **Cloudflare Workers**, saves and question bank in **D1**, media
in **R2**. Phased — each phase ends with something playable or usable.

## Guiding decisions

1. **The vanilla JS prototype is frozen.** It's feature-complete and playable;
   it stays as the design reference. No more work on it.
2. **TypeScript everywhere, no new JavaScript.** The domain library, the
   Cocos components, and the Worker are all `.ts`. The only JS left is the
   frozen prototype, which stays unconverted — it's reference material, not
   a product. The domain logic is the only code that
   survives the engine swap, so it's extracted first as a pure TS library.
3. **Code-first Cocos.** Creator 3.8 supports building scenes, nodes, and UI
   entirely from TypeScript at runtime. We lean on that (agent-friendly,
   diffable, reviewable) and keep editor-authored state to a minimum.
   **Pin the editor version** (3.8.x) in the repo.
4. **Right-sized Cloudflare.** Web build → Workers Static Assets (free,
   deploy-time). Saves *and the question bank* → D1 (structured: query by
   operation/difficulty). R2 → media only (audio, sprites) and content that
   should update without a redeploy. Don't put the question bank in R2 as
   JSON blobs — it belongs in a database.
5. **Kid-simple identity.** Server-issued anonymous token in localStorage,
   plus a short human save-code (for siblings / switching devices). No email,
   no PII, no auth surface.

### One honest note on Cocos
Phaser would be lighter and 100% code for a game this size. Cocos is still a
defensible pick: TypeScript-first, free, and a mature 2D engine with a real
asset pipeline. Its weakness — a GUI-editor
workflow — is mitigated by decision 3. Proceeding with Cocos.

## Repo layout

```
pokemath/
├── *.js, *.html          # vanilla prototype — frozen reference
├── shared/               # Phase 0: pure TS domain library + tests
├── game/                 # Phase 1: Cocos Creator project
└── worker/               # Phase 2: Cloudflare Worker API + D1 migrations
```

Sharing constraint: Cocos imports are happiest inside its `assets/` folder.
`shared/` gets synced into `game/assets/shared/` (tiny copy script, run on
build); the worker imports the same files via relative path + `tsc`. No npm
workspace gymnastics for ~500 lines.

## Phase 0 — Extract the domain library ✅ DONE
*No changes to the playable game.* (`npm test` — 30 tests; `npm run demo`)

- `shared/question-engine.ts` — the crown jewel: question types (bilingual,
  tables, multi-step), pick-without-immediate-repeat, `turnsOf()`, near-miss
  distractor generation scaled to answer size, `QuestionRound` (choices + judge).
- `shared/creature.ts` — species data, `Creature` (damage/heal/catch-chance/
  capture/XP+level-ups), boss rules, save/load state round-trip.
- `shared/battle-rules.ts` — damage rolls, hard-operation bonus, XP & prize
  rewards, encounter tuning constants.
- `shared/shop-rules.ts` — shop items + the shopkeeper's change question.
- `shared/save-types.ts` — the shared state types (`SaveState`, team, money,
  bag) consumed by **both** Phase 1 (in-memory game state, save/load) and
  Phase 2 (the API payload that D1 persists); `createNewGame()`.
- Tests: `node --test` with TS type-stripping (unflagged on Node ≥23.6;
  on Node 22 LTS add `--experimental-strip-types`) — no build step.
- Constraint learned: imports must use explicit `.ts` extensions and no
  parameter properties (`constructor(private x)`) — type-stripping is
  erase-only. (Phase 1's Cocos sync may need to strip extensions.)

## Phase 1 — Cocos port (gameplay parity) ✅ DONE
**Completed and verified in browser preview 2026-07-17:** Cocos Creator
3.8.8 project; code-first world, battle, shop, and shared question UI;
keyboard + virtual d-pad; encounters, boss questions, catching, potions,
switching, running, XP/levels/prizes, faint/respawn, and change-question
purchases. User tested the full loop successfully. `npm run typecheck`
passes against Cocos 3.8.8 declarations; all 30 domain tests pass.

`tools/uuid.mjs` implements both Cocos uuid-compression variants (editor
script refs keep 5 hex chars + 18 base64; runtime assets 2 + 20).

- **Kickoff (manual, one-time):** install Cocos Creator 3.8.x via Cocos
  Dashboard (account login required), create an empty 2D project at
  `game/`, commit the generated skeleton. This is the *only* required
  editor interaction: hand-authoring the project skeleton is a trap —
  `.scene` files reference scripts by *compressed UUID* (not class name),
  `.meta` files carry importer `ver` stamps, and the editor silently
  rewrites or rejects hand-authored files. Everything after this is code.
- `npm run sync` (`tools/sync-shared.mjs`) copies `shared/` into
  `game/assets/shared/`, stripping `.ts` import extensions (Cocos's
  bundler rejects them). Tests/examples are excluded.
- Architecture: **one `cc.Scene` + one `Main.ts` bootstrap component**;
  world/battle/shop are plain TS classes driven by our own scene manager
  (`Director.loadScene` is too heavy for fluid screen swaps). Everything
  visual is built at runtime via `Node`/`Graphics`/`Label`/`Sprite`.
- Input: keyboard via `input.on(EventKeyboard)` + touch on UI nodes.
- Scenes rebuilt code-first: World (tile map, keyboard **and touch** —
  iPad matters for the kids), Battle with question bubble, Shop with the
  change question, question UI with near-miss choices.
- Domain comes from `shared/`; Cocos components are thin view/input shells.
- Art placeholder: recreate the current primitive-drawn creatures with
  Cocos `Graphics`; real sprites are Phase 3.
- Done when: feature parity with the prototype, playable in browser preview. ✅

## Phase 2 — Cloudflare deploy + saves
- `worker/` with wrangler; serves the `game/` web build via Workers Static
  Assets, plus a small JSON API. Wrangler sets `run_worker_first: ["/api/*"]`
  so API routes aren't shadowed by static-asset routing.
- D1 schema: `players(id, code, created_at)`, `saves(player_id, payload_json,
  updated_at)`; `POST /api/save`, `GET /api/save?code=…`.
- Client: save on battle end / shop purchase / world exit; resume via token,
  restore-on-another-device via save-code.
- Done when: playable at a `workers.dev` URL and progress survives refresh
  and a device swap.

## Phase 3 — Content & media
- Question bank → D1 with an import script (query by operation, difficulty,
  multi-step); number-variant generation so the bank never runs dry.
- Audio + creature sprites → R2, loaded as remote assets. Art option:
  kid-drawn creatures scanned in — on-theme for this game.
- Difficulty follows creature level; catch streaks.
- Done when: adding questions or sprites needs no redeploy.

## Forks in the road (decide later, don't build for now)
- **Real art pipeline** — how long primitive/kid-drawn art is enough.

## Open questions
- Multi-player/sibling profiles on one shared device.
