# Local testing without a Google account

The production game requires Google sign-in. Locally, the Worker also accepts
email/password so coding agents (and humans without a Google account handy)
can reach the game UI, verify screenshots, and exercise the full flow.

## How it works

- `worker/wrangler.jsonc` declares `ENVIRONMENT: "production"` (default).
- `worker/.dev.vars` (gitignored, created from `.dev.vars.example`) sets
  `ENVIRONMENT = "development"` — this overrides `vars` **only under
  `wrangler dev`**.
- `worker/src/auth.ts` enables better-auth's email/password provider **only**
  when `ENVIRONMENT === "development"`. In production the `/api/auth/sign-in/email`
  and `/api/auth/sign-up/email` routes simply don't exist.

There is no production backdoor: no secret token, no special endpoint, no
way to enable this by guessing. The toggle is a build-time binding value that
production never sets.

## Steps for an agent

```bash
cd worker
npx wrangler dev --port 8799

# 1. Sign up a throwaway local user (any email; no verification needed).
curl -c /tmp/dev-cookies.txt \
  -X POST http://localhost:8799/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"agent@pokemath.test","password":"devtest1234","name":"Agent"}'

# 2. Reuse the cookie jar on subsequent runs (sign-in instead of sign-up):
curl -c /tmp/dev-cookies.txt \
  -X POST http://localhost:8799/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"agent@pokemath.test","password":"devtest1234"}'

# 3. Set the in-game name (the game blocks on playerName being NULL).
curl -b /tmp/dev-cookies.txt \
  -X PUT http://localhost:8799/api/profile/name \
  -H 'content-type: application/json' \
  -d '{"name":"Agent01"}'

# 4. Verify the gate is satisfied.
curl -b /tmp/dev-cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:8799/
# → 200 (was 302 → /login without the cookie)
```

With the cookie jar in place, open `http://localhost:8799/` in a
Chromium-based browser (or drive it with `agent-browser`) and the full game
loads — name screen, world, battles, saves.

## Gotchas

- **Safari won't keep the cookie.** better-auth sets `Secure` cookies;
  Chrome accepts `Secure` on `http://localhost`, Safari doesn't. Use a
  Chromium browser for local testing.
- **Sign-up once, sign-in after.** The local D1 (`worker/.wrangler/state`)
  persists between `wrangler dev` runs, so re-running sign-up returns
  "user already exists". Use sign-in, or delete `worker/.wrangler/state`
  to start fresh.
- **The first-login name screen still shows.** That's intentional — it
  exercises the real production flow. Set the name via the API (step 3) or
  by playing through the UI.
- **Don't commit `.dev.vars`.** It's gitignored; the example file
  (`worker/.dev.vars.example`) documents the required variables.
