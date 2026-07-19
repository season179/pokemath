# Agent guide — pokemath

Conventions for every agent working in this repo. Read this before touching
anything. When a handoff or secondhand summary conflicts with this file,
this file wins; when unsure, ask Season.

## Golden rules

- **Merge = approval.** Issues declare a work mode. HITL work ends at
  Season's review gate — his merge IS the approval; note it and move on.
  AFK work carries through to merge/deploy per its acceptance criteria.
- **Commits read like a human wrote them.** No `Co-Authored-By`, no
  AI-flavored trailers. Reference issues with `Closes #N` where relevant.
- **Declare your touch set before starting** and check open PRs
  (`gh pr list`) so parallel agents don't collide. Work in your own
  branch/worktree cut from latest `origin/main`.
- Merge with `gh pr merge --merge`.

## Code rules

- TypeScript everywhere. Node type-stripping is erase-only — no runtime-TS
  features (enums, namespaces, parameter properties).
- Import extensions: explicit `.ts` in `shared/` and `worker/`; omitted in
  `game/`.
- Hand-rolled validators; no runtime dependencies.
- Question banks are immutable, versioned JSON under
  `game/assets/resources/question-banks/`, validated against `schemas/`.
  Never edit a shipped bank in place — add a new version.

## Verify before PR

- `npm test` and `npm run typecheck` must pass.
- After editing `shared/`, run `npm run sync` and commit the synced copies.
- Cocos headless build exits 36 on success (SIGTERM) — normal, not a failure.
- Fresh worktrees show `Cannot find module 'cc'` typecheck errors until the
  Cocos editor generates declarations — environmental, not caused by you.

## Data and identity

- Preview stage: Season accepts data loss. No compat shims — migrate on
  read/write via `normalizeSave`.
- `speciesId`s are permanent save identity. Never rename a shipped id
  (grandfathered: `woolly/*`, `cloudhorn`, `lumentail`, `sproutkit`).
  `nameZh` resolves at render time from the registry; it is never saved.

## Deploy

- `cd worker && npx wrangler deploy` (wrangler is already authed).
- When a change spans worker + client, deploy the worker first.
- Production: <https://game.pokemath.fun>

## Browser and verification

- Browser automation: `agent-browser` only, never Playwright.
- Release-gate smoke check: `docs/preview-smoke-check.md`.

## Where truth lives

- Plan of record: `docs/islands/meadow-isle.md`.
- Work sequence + dependency DAG: tracker issue #27.
- Acceptance criteria live on each issue — read the issue itself first.
