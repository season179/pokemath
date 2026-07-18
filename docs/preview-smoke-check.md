# Desktop preview smoke check — Harbor ⇄ Woolly route

A repeatable, desktop-only smoke check for the reduced kids-playtest preview
route. It boots the real Cocos web build in a browser at a 1280×720 desktop
viewport and verifies ferry confirmation, region banners, the two preview
locks, the mini-map and world map, keyboard movement, the return trip, and a
clean browser console.

It is a **release gate**: run it (or have a coding agent run it) before
shipping any change that touches the world, regions, art loading, the maps,
or the worker's static/R2 serving. Every step is spelled out so a weaker
agent can execute it without reverse-engineering map coordinates — the
mini-map itself is the navigation aid, and exact tile coordinates are given
only as troubleshooting references.

Related: [`docs/local-testing.md`](local-testing.md) (dev auth),
[`docs/art-assets.md`](art-assets.md) (R2), [`README.md`](../README.md)
(build/deploy). This check exists because of issue #2.

---

## 0. Prerequisites

- **Cocos Creator 3.8.8** at `/Applications/Cocos/Creator/3.8.8` (headless
  build). Other versions are unsupported.
- **Node.js 23.6+** (dev machine uses Node 24) and `npm`.
- **`agent-browser`** on `PATH` (`agent-browser --help` works).
- **Cloudflare auth for `wrangler`**, logged in as the `pokemath` account:
  `cd worker && npx wrangler whoami` prints an account + token scopes that
  include `workers` write. Required for the remote `ART` binding in
  `wrangler.smoke.jsonc` (real licensed art).
- The private **`pokemath-art` R2 bucket** must contain the licensed world
  and creature art (it does in the project account). You never touch art
  files directly; the Worker streams them from R2 at `/art/*`.

If any prerequisite is missing, stop — this is an **environment preflight
failure**, not a product failure. Fix the environment, then resume.

---

## 1. Build the Cocos web target (once per code change)

```bash
# From the repo root. Headless build → game/build/web-mobile/.
# Cocos prints benign warnings (trackTimeEnd, merge_dep) and ends with a
# build-script SIGTERM as the editor subprocess shuts down — that is normal.
# Success = game/build/web-mobile/index.html exists and is fresh.
/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator \
  --project "$PWD/game" --build "platform=web-mobile"
ls -la game/build/web-mobile/index.html   # must exist, recent mtime
```

The Worker serves this directory (`worker/wrangler.jsonc` →
`assets.directory = ../game/build/web-mobile`). If you only changed
`shared/` or region data, run `npm run sync` first, then rebuild.

> **Heads-up while the editor runs:** Cocos Creator also serves its *own*
> preview on a different localhost port. That is exactly why every step
> below pins a named browser session to `http://localhost:8799/` and checks
> the URL at each checkpoint.

---

## 2. Serve the game locally with real R2 art

The Worker serves the build, the `/api/*` endpoints, and the `/art/*` R2
route. Create the dev-vars file once (gitignored):

```bash
# worker/.dev.vars — dev-only. Email/password provider turns on via
# ENVIRONMENT=development (see docs/local-testing.md). Google creds are
# unused for this check; placeholders are fine.
cat > worker/.dev.vars <<'EOF'
BETTER_AUTH_SECRET = "dev-only-secret-change-me"
GOOGLE_CLIENT_ID = "placeholder.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "placeholder-secret"
ENVIRONMENT = "development"
EOF
```

> **Never use `wrangler dev --remote` for this check.** The global
> `--remote` flag routes *every* binding — including `DB` (the real
> `pokemath-db` D1) — to remote, so the signup/profile calls below would
> write test users into the **production** database. The committed
> `worker/wrangler.smoke.jsonc` avoids this: it marks **only `ART` remote**
> (real licensed art from the `pokemath-art` bucket) and keeps **`DB`
> local** (a throwaway local D1). Auth writes never leave your machine.

Apply the schema to the local D1 once (and after any new migration):

```bash
cd worker
npx wrangler d1 migrations apply pokemath-db --local
npx wrangler dev -c wrangler.smoke.jsonc --port 8799     # keep running in its own terminal
```

**Binding-verification gate — required before any auth call.** The server log
must show `DB` local and `ART` remote on a *local* server (not a remote
preview). If you see `Starting remote preview`, stop — you ran with `--remote`
or the wrong config, and auth would hit production D1:

```text
env.DB (pokemath-db)   D1 Database   local      ← required
env.ART (pokemath-art) R2 Bucket     remote     ← required (real art)
⎔ Starting local server...                        ← required (NOT "Starting remote preview")
[wrangler:info] Ready on http://localhost:8799
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/login   # → 200
```

---

## 3. Authenticate (dev email/password → browser cookie)

All browser commands use one named session. Define it once, here, so the
cookie you inject is the cookie the route drives:

```bash
SN=smoke
```

The `/login` page is **Google-only** in the UI; the email/password provider
exists only as an API in dev. So sign up via curl, then carry the session
cookie into the named `agent-browser` session. (Sign up once; on later runs
use sign-in — the local D1 persists.)

```bash
# 1. Sign up a throwaway local user (any email; no verification).
curl -c /tmp/dev-cookies.txt \
  -X POST http://localhost:8799/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@pokemath.test","password":"devtest1234","name":"Smoke"}'

# (later runs — sign in instead:)
# curl -c /tmp/dev-cookies.txt -X POST http://localhost:8799/api/auth/sign-in/email \
#   -H 'content-type: application/json' \
#   -d '{"email":"smoke@pokemath.test","password":"devtest1234"}'

# 2. Set the in-game name (the game blocks on playerName being NULL).
curl -b /tmp/dev-cookies.txt -X PUT http://localhost:8799/api/profile/name \
  -H 'content-type: application/json' -d '{"name":"Smoke01"}'

# 3. Confirm the gate: 200 = authed, 302 → /login = cookie missing/invalid.
curl -b /tmp/dev-cookies.txt -o /dev/null -w "%{http_code}\n" http://localhost:8799/
```

Inject better-auth's Secure, HttpOnly session cookie into the named session.
**Two separate arguments** (`<name> <value>`) — a single `"name=value"`
string is rejected by CDP with "Invalid cookie fields":

```bash
SID=$(awk -F'\t' '$6=="__Secure-better-auth.session_token"{print $7}' /tmp/dev-cookies.txt)
agent-browser --session "$SN" cookies set "__Secure-better-auth.session_token" "$SID" \
  --url "http://localhost:8799/" --httpOnly --secure --sameSite Lax
```

(Chrome accepts `Secure` cookies on `http://localhost`. If the name ever
changes, inspect the jar with `awk -F'\t' '{print $6}' /tmp/dev-cookies.txt`.)

---

## 4. Open the game at a 1280×720 desktop viewport

```bash
agent-browser --session "$SN" open http://localhost:8799/
agent-browser --session "$SN" set viewport 1280 720          # criterion 1
agent-browser --session "$SN" wait 3000                       # let Cocos boot
```

**Preflight assertions** (environment, not product — if these fail, stop and
fix the setup before judging the game):

```bash
agent-browser --session "$SN" get url                         # → http://localhost:8799/  (not /login)
agent-browser --session "$SN" screenshot /tmp/smoke/00-boot.png
agent-browser --session "$SN" console --clear                 # start the product run clean
agent-browser --session "$SN" errors  --clear
```

You should land in **Harbor Town** (pixel ground, buildings, the player and
NPCs), with the bilingual `HARBOR TOWN · 港湾镇` toast at the top, the
mini-map bottom-left, and Bag/Map buttons top-right — and **no blue on-screen
directional pad** anywhere (criterion 2; the only lower-left control is the
mini-map).

---

## 5. The route

Define these helpers once; the URL checkpoint (`ck`) is mandatory at every
step (a stray navigation to the Cocos-editor preview would silently
invalidate every assertion):

```bash
# press <key> <n> times — one tile per press (Cocos' buffered input never drops one)
mv() { for ((i=0;i<$2;i++)); do agent-browser --session "$SN" press "$1"; agent-browser --session "$SN" wait 185 >/dev/null; done; }
ck() { # ck <expected-region> — exits 0 only when the URL is exactly the worker
       # root AND the active world-* node is <expected-region>. Catches a drift
       # to the Cocos-editor preview (another port), a 302 to /login, or a
       # wrong/unexpected region. Use:   ck <region> || exit 1
  local want="$1" url region
  url=$(agent-browser --session "$SN" get url)
  region=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let r='';(function w(n){if(n.name&&n.name.indexOf('world-')===0&&n.name!=='world-map')r=n.name.replace('world-','');if(n.children)for(const c of n.children)w(c);})(s);return r;})()")
  region=${region//\"/}
  echo "  CK url=$url region=$region (want $want)"
  [[ "$url" == "http://localhost:8799/" && "$region" == "$want" ]]
}
agent-browser --session "$SN" click canvas                     # focus #GameCanvas for keyboard

# Arrival-toast probe: `tp "<expected title>"` exits 0 only if the transient
# arrival toast currently renders a label containing that title. The toast
# panel is a direct child of the world root (not map/huds), but the player-name
# label sits on the world root too and the mini-map shows the title
# persistently — so a bare "any label" check would false-pass. Pass the
# expected title and abort on mismatch:   tp "…" || exit 1
tp() { local want="$1" got; got=$(agent-browser --session "$SN" eval "(function(){const want=\"$want\";const s=cc.director.getScene();let wr=null;function fr(n){if(n.name&&n.name.indexOf('world-')===0&&n.name!=='world-map'){wr=n;return true;}if(n.children)for(const c of n.children)if(fr(c))return true;return false;}fr(s);if(!wr)return'FAIL no-world';const ex=[];for(const ch of wr.children){if(ch.name==='map'||ch.name==='huds')continue;let t='';(function w(n){const l=n.getComponent&&n.getComponent('cc.Label');if(l&&l.string)t=l.string;if(n.children)for(const c of n.children)w(c);})(ch);if(t)ex.push(t);}const ok=ex.some(function(t){return t.indexOf(want)>=0;});return (ok?'PASS ':'FAIL ')+want+' :: '+ex.join(' | ');})()"); got=${got//\"/}; echo "  TOAST $got"; [[ "$got" == PASS* ]]; }

# Click a Cocos canvas element (UI projection: page_x = worldX, page_y = 720 − worldY).
tapnode()  { local p; p=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let t=null;(function w(n){if(n.name===\"$1\")t=n;if(n.children)for(const c of n.children)w(c);})(s);if(!t)return'';return Math.round(t.worldPosition.x)+' '+Math.round(720-t.worldPosition.y);})()"); p=${p//\"/}; set -- $p; agent-browser --session "$SN" mouse move "$1" "$2" >/dev/null; agent-browser --session "$SN" mouse down >/dev/null; agent-browser --session "$SN" mouse up >/dev/null; }
taplabel() { local p; p=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let t=null;(function w(n){const l=n.getComponent&&n.getComponent('cc.Label');if(l&&l.string&&l.string.indexOf(\"$1\")>=0)t=n;if(n.children)for(const c of n.children)w(c);})(s);if(!t)return'';return Math.round(t.worldPosition.x)+' '+Math.round(720-t.worldPosition.y);})()"); p=${p//\"/}; set -- $p; agent-browser --session "$SN" mouse move "$1" "$2" >/dev/null; agent-browser --session "$SN" mouse down >/dev/null; agent-browser --session "$SN" mouse up >/dev/null; }
```

Movement is one tile per discrete keypress (Arrow keys **or** WASD).
Coordinates are validated `tile (x, y)`, row 0 at the top; the mini-map
(you = white dot, green dot = open exit, amber ring = sealed, blue dot =
ferry captain) is the visual aid.

> **Two operational rules.** (1) **Gate notices pause the world** — while a
> bilingual "opens later" notice is open, `WorldScreen.update()` ignores all
> input, so dismiss it with `Space` before the next move. (2) **Capture
> arrival evidence fast**: the bilingual arrival toast fades at 1750 ms and
> is destroyed at ~2000 ms, so wait **< 1500 ms** after each travel before
> screenshotting, and assert it with `tp`.

### 5a. Harbor → Meadow Dock (explicit ferry confirmation)

Spawn `(10, 7)`; Captain Ro is on the pier at `(9, 11)`.

```bash
mv ArrowDown 4; mv ArrowLeft 1; agent-browser --session "$SN" wait 400
ck harbor || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/01-harbor-ferry-dialog.png
```

Assert the travel dialog `Captain Ro: Ahoy! Hop aboard — next stop, Meadow
Isle! 上船啦，去青草岛！` + a `Go! 走吧` button (it never auto-travels).

```bash
agent-browser --session "$SN" press Space       # explicit confirm → sail
agent-browser --session "$SN" wait 1000          # <1500: catch the arrival toast
ck meadow/dock || exit 1; tp "MEADOW DOCK" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/02-meadow-dock.png
```

Assert `region: "meadow/dock"` and toast `MEADOW DOCK · 青草码头`. Dock is
**transit-only** (no encounters); its mini-map shows a green east exit (open
→ Woolly) and an amber south exit (sealed → Pattern Gardens).

### 5b. Dock south gate (sealed), then east to Woolly

Prove the south gate is locked. From the ferry arrival `(2, 12)`:

```bash
mv ArrowUp 4; mv ArrowRight 10; mv ArrowDown 7; agent-browser --session "$SN" wait 400
ck meadow/dock || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/04b-dock-south-locked.png
```

Assert the bilingual notice and that you **stay in Dock** (player lands on
`(12, 15)`):

> This path opens in a later update — adventure in Woolly Meadows for now!
> 这条路稍后开放，先在羊毛草原冒险吧！

Dismiss it, then take the open east exit at `(23, 8)` to Woolly:

```bash
agent-browser --session "$SN" press Space       # dismiss the notice
mv ArrowUp 7; mv ArrowRight 11; agent-browser --session "$SN" wait 1100   # <1500
ck meadow/woolly || exit 1; tp "WOOLLY MEADOWS" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/03-woolly.png
```

Assert `region: "meadow/woolly"` and toast `WOOLLY MEADOWS · 羊毛草原`.

### 5c. Woolly north gate (sealed), mini-map, and world map

Prove the north gate is locked. From the Woolly arrival `(1, 10)`:

```bash
mv ArrowUp 9; mv ArrowRight 15; mv ArrowUp 1; agent-browser --session "$SN" wait 450
ck meadow/woolly || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/04-woolly-north-locked.png
```

Assert the same bilingual notice, no travel (player lands on `(16, 0)`).
Dismiss, then verify the **mini-map tracks the player** (move in a walkable
direction; the white dot moves at the region's mini-scale — ≈ 0.0885 here):

```bash
agent-browser --session "$SN" press Space       # dismiss notice
mv ArrowDown 3
agent-browser --session "$SN" screenshot /tmp/smoke/05-minimap-tracks.png
```

**World map.** Open with M and assert the overlay renders from the region
registry — every area a bilingual node, open vs locked, plus a legend and the
current-region caption:

```bash
agent-browser --session "$SN" press KeyM; agent-browser --session "$SN" wait 900
ck meadow/woolly || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/06-worldmap-open-M.png   # capture WHILE open
```

Assert `World Map · 世界地图`, the "Informational — explore on foot or by
ferry" subtitle, Harbor/Dock/Woolly open, Ticktock/Orchard/Festival/Barn/
Pattern Gardens locked (padlock) + Hundred Stones guardian, and a caption
`… · You are here! 你在这里！`.

Movement **pauses** while open (press arrows — no-op) and there is **no fast
travel** — tapping any node only changes the caption. Exercise every control
(open via **M** and the **HUD Map button**; close via **M**, **Esc**, and the
**Close button**):

```bash
mv ArrowDown 3                                                          # no-op while open
tapnode "node-meadow/gardens"                                          # locked node → caption only, no travel
ck meadow/woolly || exit 1                                                       # region unchanged
agent-browser --session "$SN" wait 400
agent-browser --session "$SN" press KeyM; agent-browser --session "$SN" wait 500   # close via M
taplabel "Map";   agent-browser --session "$SN" wait 800               # reopen via the HUD Map button
taplabel "Close"; agent-browser --session "$SN" wait 500               # close via the Close button
agent-browser --session "$SN" press KeyM;   agent-browser --session "$SN" wait 800   # reopen
agent-browser --session "$SN" press Escape; agent-browser --session "$SN" wait 500   # close via Esc
ck meadow/woolly || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/07-worldmap-closed.png
```

Assert the caption after the locked-node tap reads `PATTERN GARDENS · 图案花园
· Opens in a later update. 稍后开放。` and the URL/region never changed.

### 5d. Return: Woolly → Dock → Harbor

You are near `(16, 3)`. Walk to the west exit `(0, 10)` back to Dock:

```bash
mv ArrowDown 7; mv ArrowLeft 16; agent-browser --session "$SN" wait 1100   # <1500
ck meadow/dock || exit 1; tp "MEADOW DOCK" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/09-back-to-dock.png
```

Assert `region: "meadow/dock"`, toast `MEADOW DOCK · 青草码头`, arrival
`(22, 8)`. Walk to Dock's Captain Ro at `(5, 12)`, bump him, confirm the
return sail:

```bash
mv ArrowLeft 17; mv ArrowDown 5; agent-browser --session "$SN" wait 400    # travel dialog
agent-browser --session "$SN" press Space       # Go → Harbor
agent-browser --session "$SN" wait 1000          # <1500
ck harbor || exit 1; tp "HARBOR TOWN" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/10-back-to-harbor.png
```

Assert `region: "harbor"`, toast `HARBOR TOWN · 港湾镇`, arrival `(9, 10)`.
The loop is complete.

---

## 6. Console gate (criterion 7)

```bash
agent-browser --session "$SN" console > /tmp/smoke/console.txt
agent-browser --session "$SN" errors  > /tmp/smoke/errors.txt
```

**The check fails on any unexpected console error.** Classify what you see:

| Message | Verdict |
|---|---|
| `…world art failed to load; using fallback graphics` (Harbor or `<region>`) | ❌ **FAIL** — world/terrain/player art must load from R2. Means `ART` isn't remote (env), or the art pipeline broke (product). |
| `NPC sprite for <name> in <region> did not load; using a flat fallback` (warn) | ✅ **Acceptable** — intended per-NPC degrade (issue #1). One NPC drops to a flat actor; terrain/scenery/player are unaffected. |
| `Refusing travel to sealed region…` / `Refusing battle in non-encounter region…` (warn) | ✅ **Acceptable** — defense-in-depth guards; should not appear in a clean run. Investigate if seen. |
| Any other `console.error` or uncaught exception | ❌ **FAIL** — investigate. |

A clean run has **zero** `…world art failed to load` errors and **zero**
uncaught exceptions. (On the validated run the console held only
`[timeEnd] LoadScene …` — no art errors, no NPC fallbacks, no exceptions.)

---

## 7. Requirement → evidence checklist (issue #2)

Every acceptance criterion must map to captured evidence. Do not mark the
check passed with any box unchecked.

- [ ] **1 — Rebuild + 1280×720 desktop viewport** — §1 build output fresh;
      `set viewport 1280 720` in §4; `00-boot.png` shows the desktop layout.
- [ ] **2 — No on-screen d-pad; Arrow + WASD move** — `00-boot.png` has no
      directional pad (only the mini-map lower-left); §5 Arrow-key moves
      changed the player tile, and WASD too (`KeyD`/`KeyW` shifted the dot).
- [ ] **3 — Ferry confirm Harbor→transit Dock→Woolly + bilingual banners** —
      `01..03` show the Go! dialog and the three bilingual **arrival toasts**
      (`tp` non-empty after a <1500 ms wait).
- [ ] **4 — Dock→Gardens and Woolly→Ticktock locked + bilingual notice** —
      `04b` (Dock south `(12,15)`) and `04` (Woolly north `(16,0)`) show the
      bilingual "opens later" notice and no travel.
- [ ] **5 — Mini-map tracks player; world map opens/closes; no fast travel** —
      `05` shows the dot moving; `06` captured while `mapOpen`; movement
      paused while open; locked-node tap (`node-meadow/gardens`) gave a
      caption only; opened via **M** and the **HUD Map button**, closed via
      **M**, **Esc**, and the **Close button**.
- [ ] **6 — Return via Dock, sail home** — `09..10` show the Dock then Harbor
      arrival toasts after the return trip.
- [ ] **7 — Console gate + R2 setup documented** — `console.txt`/`errors.txt`
      classified per §6 with zero unexpected errors; §0/§2 cover the local
      R2 setup (the `wrangler.smoke.jsonc` remote-`ART` / local-`DB` binding).
- [ ] **8 — Runnable by a weaker agent** — every step is copy-pasteable and
      mini-map-guided; coordinates are references only.

---

## 8. Recording a successful run

- **Date and commit SHA:** `git rev-parse --short HEAD` at run time.
- **Artifacts:** `/tmp/smoke/00..10` (+ the toast/lock/map shots), `console.txt`,
  `errors.txt`.
- **Result line**, e.g.
  `PASS 2026-07-18 <sha> — Harbor⇄Woolly loop clean; console = LoadScene only; 0 world-art errors.`

Post the summary (and link the artifacts) in the issue or PR that ships the
change. A run is only valid from a clean build of the commit under test.

---

## Troubleshooting

- **302 → /login in the browser:** the session cookie did not transfer into
  the named session. Re-run §3 (same `SN=smoke`) and confirm the cookie
  name/value; the local D1 persists between `wrangler dev` runs, so sign
  **in** (not up) after the first run.
- **`world art failed to load` for every region:** `ART` isn't reaching the
  game. You ran plain `wrangler dev` (local R2 is empty) instead of
  `wrangler dev -c wrangler.smoke.jsonc`, or the account lacks R2 access.
  Re-check `wrangler whoami`, restart with the smoke config, and re-confirm
  the §2 binding gate reads `env.ART … remote`.
- **Keys do nothing:** the canvas lost focus — `agent-browser --session "$SN"
  click canvas` before movement (Cocos 3.8 listens on `#GameCanvas`).
- **A click misses its Cocos button/node:** re-derive the page coords from the
  node's world position (`page_x = worldX`, `page_y = 720 − worldY`) — the
  `tapnode`/`taplabel` helpers do this live, so they survive layout changes.
- **Movement overshoots/undershoots a gate:** don't count tiles — drive by
  the mini-map exit dots and watch the player marker land on the dot.
