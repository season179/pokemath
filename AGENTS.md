# pokemath — agent guide

## Working style

- Don't over-think: pick the obvious approach and act. Skip extended deliberation, deep tradeoff analysis, and exploring alternatives you won't take.
- Don't over-engineer: smallest change that satisfies the issue's acceptance criteria. No speculative abstractions, no unrequested hardening, no scope creep.
- Work fast: batch independent tool calls, prefer quick checks over exhaustive verification, don't re-read files you already know.

## Never

- No `Co-Authored-By` or AI attribution in commits — write messages like a human.
- Never rename a shipped `speciesId` (grandfathered: `woolly/*`, `cloudhorn`, `lumentail`, `sproutkit`). `nameZh` resolves from the registry at render time; it is never saved.
- Never edit a shipped question bank in place — banks are immutable versioned JSON under `game/assets/resources/question-banks/`; add a new version.
- No compat shims. Season accepts data loss at this stage; migrate on read/write via `normalizeSave`.
- No runtime dependencies; validators are hand-rolled.
- Browser automation: `agent-browser` only, never Playwright.

## Process

- Issues carry a work mode. HITL ends at Season's review — his merge IS the approval. AFK carries through to merge/deploy per its acceptance criteria. Merge with `gh pr merge --merge`.
- Declare your touch set and check `gh pr list` before starting; parallel agents work in separate worktrees.
- Plan of record: `docs/islands/meadow-isle.md`. Work sequence + DAG: issue #27. Acceptance criteria live on each issue — read the issue itself.

## Gotchas

- Import extensions: explicit `.ts` in `shared/` and `worker/`, omitted in `game/`. Type-stripping is erase-only — no enums or namespaces.
- After editing `shared/`, run `npm run sync` and commit the synced copies.
- Gates before PR: `npm test` and `npm run typecheck` pass.
- Cocos headless build exits 36 on success.
- Rebasing onto `origin/main`: never run a bare `git rebase --continue` — it opens an editor and hangs the non-interactive shell. Resolve conflicts, `git add`, then `GIT_EDITOR=true git rebase --continue` (keeps the original messages), and finish with `git push --force-with-lease`. GitHub may report `CONFLICTING` right after a force-push; its mergeability check is async — re-query after a few seconds.
- Fresh worktrees show `Cannot find module 'cc'` typecheck errors until the editor generates declarations — environmental, not yours.
- Deploy: `cd worker && npx wrangler deploy`; when worker and client both change, deploy the worker first. Prod: <https://game.pokemath.fun>.
- Release-gate smoke check: `docs/preview-smoke-check.md`.
