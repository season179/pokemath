# Desktop preview smoke check — Harbor ⇄ Meadow ring route

A repeatable, desktop-only smoke check for the Meadow Isle world route. It
boots the real Cocos web build in a browser at a 1280×720 desktop viewport
and verifies ferry confirmation, region banners, the open ring gates (#9
lifted the #29 preview locks; the expansion pockets stay sealed), a real
wild battle in a newly opened region, the mini-map and world map, keyboard
movement, the return trip, and a clean browser console.

It is a **release gate**: run it (or have a coding agent run it) before
shipping any change that touches the world, regions, art loading, the maps,
or the worker's static/R2 serving. Every step is spelled out so a weaker
agent can execute it without reverse-engineering map coordinates — the
mini-map itself is the navigation aid, and exact tile coordinates are given
only as troubleshooting references.

History: created for the kids-playtest preview (#2); the route was extended
in M2B (#9) when the #29 gates opened — Dock south now walks into Pattern
Gardens and Woolly north into Ticktock Knoll.

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

# 3. Choose a starter (the game shows the starter screen while save is null;
#    this check starts in the world, so mint the save here). Idempotent —
#    an existing save is never overwritten.
curl -b /tmp/dev-cookies.txt -X POST http://localhost:8799/api/save/new \
  -H 'content-type: application/json' -d '{"starter":"cloudhorn"}'

# 4. Confirm the gate: 200 = authed, 302 → /login = cookie missing/invalid.
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

**Cover-scale assertion (issue #38):** Harbor's `map` node must be zoomed so
its scaled size covers the whole 1280×720 canvas — no background margins. The
world root's direct `map` child carries the camera scale; `fallback-tiles`
under it always keeps the region's unscaled pixel size, so the check works
with or without streamed art. Like `ck`/`tp`, the helper aborts on mismatch:
`cov || exit 1`.

```bash
cov() { local got; got=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let wr=null;(function w(n){if(n.name&&n.name.indexOf('world-')===0&&n.name!=='world-map'){wr=n;return;}if(n.children)for(const c of n.children)w(c);})(s);if(!wr)return'FAIL no-world';const m=wr.children.find(function(c){return c.name==='map';});if(!m)return'FAIL no-map';const t=m.children.find(function(c){return c.name==='fallback-tiles';});const ui=t&&t.getComponent('cc.UITransform');if(!ui)return'FAIL no-fallback-tiles';const w=ui.contentSize.width*m.scale.x,h=ui.contentSize.height*m.scale.y;return (w>=1280&&h>=720?'PASS':'FAIL')+' map '+w+'x'+h+' (scale '+m.scale.x+')';})()"); got=${got//\"/}; echo "  COVER $got"; [[ "$got" == PASS* ]]; }
cov || exit 1   # → COVER PASS map 1280x832 (scale 1.3333333333333333)
```

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

# Arrival-banner probe: `tp "<expected title>"` exits 0 only if a label
# containing that title renders anywhere in the scene. Since #42 the area
# plate is persistent and lives under `huds` (not as a direct world-root
# child), and a just-destroyed world node lingers in the graph for a frame
# after travel — so a first-match world-root search false-fails. Search the
# whole scene and pass the expected title; abort on mismatch:   tp "…" || exit 1
tp() { local want="$1" got; got=$(agent-browser --session "$SN" eval "(function(){const want=\"$want\";const s=cc.director.getScene();let found=false;const titles=[];(function w(n){const l=n.getComponent&&n.getComponent('cc.Label');if(l&&l.string){titles.push(l.string);if(l.string.indexOf(want)>=0)found=true;}if(n.children)for(const c of n.children)w(c);})(s);return (found?'PASS ':'FAIL ')+want+' :: '+titles.filter(t=>t.length<40).join(' | ');})()"); got=${got//\"/}; echo "  TOAST $got"; [[ "$got" == PASS* ]]; }

# Click a Cocos canvas element (UI projection: page_x = worldX, page_y = 720 − worldY).
# `read -r px py` (not `set -- $p`) so the split works in bash AND zsh — zsh does
# not word-split unquoted variables, which would pass "x y" as ONE argument and
# then fire the down/up click at a stray position. Both helpers abort with a
# nonzero status when the node/label is not found, instead of clicking blind.
tapnode()  { local p px py; p=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let t=null;(function w(n){if(n.name===\"$1\")t=n;if(n.children)for(const c of n.children)w(c);})(s);if(!t)return'';return Math.round(t.worldPosition.x)+' '+Math.round(720-t.worldPosition.y);})()"); p=${p//\"/}; read -r px py <<<"$p"; if [[ -z "$px" || -z "$py" ]]; then echo "  TAP no node '$1'"; return 1; fi; agent-browser --session "$SN" mouse move "$px" "$py" >/dev/null; agent-browser --session "$SN" mouse down >/dev/null; agent-browser --session "$SN" mouse up >/dev/null; }
taplabel() { local p px py; p=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let t=null;(function w(n){const l=n.getComponent&&n.getComponent('cc.Label');if(l&&l.string&&l.string.indexOf(\"$1\")>=0)t=n;if(n.children)for(const c of n.children)w(c);})(s);if(!t)return'';return Math.round(t.worldPosition.x)+' '+Math.round(720-t.worldPosition.y);})()"); p=${p//\"/}; read -r px py <<<"$p"; if [[ -z "$px" || -z "$py" ]]; then echo "  TAP no label '$1'"; return 1; fi; agent-browser --session "$SN" mouse move "$px" "$py" >/dev/null; agent-browser --session "$SN" mouse down >/dev/null; agent-browser --session "$SN" mouse up >/dev/null; }
```

Movement is one tile per discrete keypress (Arrow keys **or** WASD).
Coordinates are validated `tile (x, y)`, row 0 at the top; the mini-map
(you = white dot, green dot = open exit, grey ring = reserved pocket, blue
dot = ferry captain; amber "sealed" rings return only when a future island
locks a wired gate) is the visual aid.

> **Three operational rules.** (1) **Pocket notices and NPC dialogs pause the
> world** — while a bilingual "opens later"/rustle notice or an NPC chat is
> open, `WorldScreen.update()` ignores all input, so dismiss it (tap the
> notice itself, or `Space`) before the next move. (2) **Arrival banners
> persist**: since #42 the bilingual area plate stays on screen (no fade), so
> `tp` can assert it any time after travel — no rush. (3) **Tall grass can
> start a wild battle** — since #8 stepping onto a `g` tile rolls an
> encounter (~20 % per step), and since #9 every monster region has grass.
> The route below deliberately enters grass exactly once (the §5b Gardens
> battle) and otherwise stays off tall grass; if a battle starts by route
> drift, flee with **Escape**, then resume from the last checkpoint.

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
**transit-only** (no encounters); since #9 its mini-map shows two green
exits — east (→ Woolly) and south (→ Pattern Gardens) — plus grey rings for
the reserved pockets.

### 5b. Dock south gate → Pattern Gardens (open since #9) and a real wild battle

The #29 seal is lifted: the south gate **travels** now. From the ferry
arrival `(2, 12)` walk to the gate tile `(12, 15)`:

```bash
mv ArrowUp 4; mv ArrowRight 10; mv ArrowDown 7; agent-browser --session "$SN" wait 1100   # <1500
ck meadow/gardens || exit 1; tp "PATTERN GARDENS" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/03-gardens.png
```

Assert `region: "meadow/gardens"` and toast `PATTERN GARDENS · 图案花园`,
arrival `(8, 1)`.

**A wild battle in a newly opened region (issue #9).** Every monster region
now hosts its own habitat table — prove it live. The grass patch beside the
arrival (rows 3–5, x9–13) rolls an encounter ~20 % per step. Define the
battle detector, step onto the grass, then pace one grass column until a
battle starts (column pacing keeps the post-flee tile deterministic):

```bash
# Battle detector: PASS when the battle screen node exists and is active.
inbattle() { local got; got=$(agent-browser --session "$SN" eval "(function(){const s=cc.director.getScene();let b=null;(function w(n){if(n.name==='battle')b=n;if(n.children)for(const c of n.children)w(c);})(s);return b&&b.active?'PASS':'FAIL';})()"); got=${got//\"/}; [[ "$got" == PASS ]]; }

mv ArrowDown 1; mv ArrowRight 1; mv ArrowDown 1                          # (8,1) → (9,3): first grass tile
steps=0
until inbattle || (( steps >= 40 )); do
  mv ArrowDown 1; inbattle && break                                      # (9,4) roll
  mv ArrowUp 1                                                           # (9,3) roll
  steps=$((steps+2))
done
inbattle || { echo "FAIL: no wild encounter after ${steps} grass steps in Pattern Gardens"; exit 1; }
agent-browser --session "$SN" wait 600
agent-browser --session "$SN" screenshot /tmp/smoke/04-gardens-battle.png
```

Assert the battle screen is up against a Gardens-table species (Mothling /
Balltail Hare / Pufftail — all ordinary, all calm). Then **flee cleanly**:
Space advances the intro, Escape runs, Space dismisses "Got away safely!":

```bash
agent-browser --session "$SN" press Space;  agent-browser --session "$SN" wait 600   # intro → menu
agent-browser --session "$SN" press Escape; agent-browser --session "$SN" wait 600   # flee
agent-browser --session "$SN" press Space;  agent-browser --session "$SN" wait 900   # "Got away safely!" → world
inbattle && { echo "FAIL: battle did not close after fleeing"; exit 1; }
ck meadow/gardens || exit 1
```

Walk back to the dock through the north gate. The flee tile is `(9, 3)` or
`(9, 4)`; `ArrowUp 3` normalises both to `(9, 1)`:

```bash
mv ArrowUp 3; mv ArrowLeft 1; mv ArrowUp 1; agent-browser --session "$SN" wait 1100   # via gate (8,0)
ck meadow/dock || exit 1; tp "MEADOW DOCK" || exit 1
```

**Pockets stay sealed.** The #9 lift opened only the wired ring gates — the
reserved expansion pockets keep their rustle notice. From the dock arrival
`(12, 14)`, walk to the north pocket `(8, 0)`:

```bash
mv ArrowUp 6; mv ArrowLeft 4; mv ArrowUp 8; agent-browser --session "$SN" wait 400
ck meadow/dock || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/04b-dock-pocket-locked.png
```

Assert the bilingual rustle notice and that you **stay in Dock** (player
lands on `(8, 0)`):

> The bushes rustle… something is in there, but the way isn't open yet.
> 树丛沙沙响……这条路还没开。

Dismiss it, then take the east exit `(23, 8)` to Woolly:

```bash
agent-browser --session "$SN" press Space       # dismiss the notice
mv ArrowDown 8; mv ArrowRight 15; agent-browser --session "$SN" wait 1100   # <1500
ck meadow/woolly || exit 1; tp "WOOLLY MEADOWS" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/05-woolly.png
```

Assert `region: "meadow/woolly"` and toast `WOOLLY MEADOWS · 羊毛草原`,
arrival `(1, 10)`.

### 5c. Woolly north gate → Ticktock Knoll (open since #9), mini-map, and world map

The Woolly north gate **travels** now. From the Woolly arrival `(1, 10)`:

```bash
mv ArrowUp 8; mv ArrowRight 15; mv ArrowUp 2; agent-browser --session "$SN" wait 1100   # via row 2: avoids the row-1 tall grass
ck meadow/ticktock || exit 1; tp "TICKTOCK KNOLL" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/06-ticktock.png
```

Assert `region: "meadow/ticktock"` and toast `TICKTOCK KNOLL · 滴答山丘`,
arrival `(1, 8)`. Then walk back through the west gate to Woolly:

```bash
mv ArrowLeft 1; agent-browser --session "$SN" wait 1100
ck meadow/woolly || exit 1; tp "WOOLLY MEADOWS" || exit 1
```

Arrival `(16, 1)`. Verify the **mini-map tracks the player** (move in a
walkable direction; the white dot moves at the region's mini-scale —
≈ 0.0885 here):

```bash
mv ArrowDown 3                                                            # → (16, 4)
agent-browser --session "$SN" screenshot /tmp/smoke/07-minimap-tracks.png
```

**World map.** Open with M and assert the overlay renders from the region
registry — every area a bilingual node, **all of them open since #9 (no
padlocks anywhere)**, plus a legend and the current-region caption:

```bash
agent-browser --session "$SN" press KeyM; agent-browser --session "$SN" wait 900
ck meadow/woolly || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/08-worldmap-open-M.png   # capture WHILE open
```

Assert `World Map · 世界地图`, the "Informational — explore on foot or by
ferry" subtitle, Harbor shown as home hub, Dock as transit, and Woolly/
Ticktock/Orchard/Festival/Barn/Pattern Gardens + the Hundred Stones guardian
ground all open (no padlock icons), and a caption `… · You are here! 你在这里！`.

Movement **pauses** while open (press arrows — no-op) and there is **no fast
travel** — tapping any node only changes the caption. Exercise every control
(open via **M** and the **HUD Map button**; close via **M**, **Esc**, and the
**Close button**):

```bash
mv ArrowDown 3                                                          # no-op while open
tapnode "node-meadow/gardens"                                          # open node → caption only, no travel
ck meadow/woolly || exit 1                                                       # region unchanged
agent-browser --session "$SN" wait 400
agent-browser --session "$SN" press KeyM; agent-browser --session "$SN" wait 500   # close via M
taplabel "Map";   agent-browser --session "$SN" wait 800               # reopen via the HUD Map button
taplabel "Close"; agent-browser --session "$SN" wait 500               # close via the Close button
agent-browser --session "$SN" press KeyM;   agent-browser --session "$SN" wait 800   # reopen
agent-browser --session "$SN" press Escape; agent-browser --session "$SN" wait 500   # close via Esc
ck meadow/woolly || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/09-worldmap-closed.png
```

Assert the caption after the open-node tap reads `PATTERN GARDENS · 图案花园
· Open — wild creatures about! 开放——野外出没！` and the URL/region never
changed.

### 5d. Return: Woolly → Dock → Harbor

You are near `(16, 4)`. Walk to the west exit `(0, 10)` back to Dock:

```bash
mv ArrowDown 6; mv ArrowLeft 16; agent-browser --session "$SN" wait 1100   # <1500
ck meadow/dock || exit 1; tp "MEADOW DOCK" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/10-back-to-dock.png
```

Assert `region: "meadow/dock"`, toast `MEADOW DOCK · 青草码头`, arrival
`(22, 8)`. Walk to Dock's Captain Ro at `(5, 12)`, bump him, confirm the
return sail:

```bash
mv ArrowLeft 17; mv ArrowDown 5; agent-browser --session "$SN" wait 400    # travel dialog
agent-browser --session "$SN" press Space       # Go → Harbor
agent-browser --session "$SN" wait 1000          # <1500
ck harbor || exit 1; tp "HARBOR TOWN" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/11-back-to-harbor.png
```

Assert `region: "harbor"`, toast `HARBOR TOWN · 港湾镇`, arrival `(9, 10)`.
The loop is complete.

### 5e. Field Guide and Harbor Sanctuary (issue #5)

From the Harbor arrival `(9, 10)`. **Field Guide first** — open with G,
assert the grid renders from save v2 (caught species show portrait + `Caught
收服` + a filled normal-variant dot; seen-only show `Seen 见过`; unmet show a
silhouette + `???` + `Unknown 未知` + hollow dots), arrow-key the cursor, then
close and re-open via the HUD chip (pointer), and close via the Back button:

```bash
agent-browser --session "$SN" press KeyG; agent-browser --session "$SN" wait 800
tp "Field Guide" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/12-guide-open-G.png
mv ArrowRight 2; mv ArrowDown 1                                       # cursor moves; detail strip updates
agent-browser --session "$SN" screenshot /tmp/smoke/13-guide-cursor.png
agent-browser --session "$SN" press Escape; agent-browser --session "$SN" wait 500   # close via Esc
taplabel "Guide"; agent-browser --session "$SN" wait 800                # reopen via the HUD chip (pointer)
taplabel "Back";  agent-browser --session "$SN" wait 500                # close via the Back button (pointer)
ck harbor || exit 1
```

**Sanctuary.** Keeper Flo stands west of the homes at `(3, 5)`; bump her from
`(3, 6)`, then dismiss her greeting — that opens the Sanctuary (the same
banner pattern as the captains):

```bash
mv ArrowUp 1; mv ArrowLeft 6; mv ArrowUp 3                            # stand at (3, 6), below Flo
agent-browser --session "$SN" press ArrowUp; agent-browser --session "$SN" wait 400   # bump → greeting
tp "Keeper Flo" || exit 1                                             # greeting banner
agent-browser --session "$SN" press Space; agent-browser --session "$SN" wait 900   # dismiss → Sanctuary opens
tp "Harbor Sanctuary" || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/14-sanctuary.png
```

Assert the header counts (`Team n/6 · Resting m`), team rows tagged `Team
队伍` with the leader starred `★ Leading 领队`, storage rows tagged `Resting
休息中`. Toggle the last row with the keyboard and confirm the edit
**persists to the server save**; a seventh add on a full team shows the
bilingual "team is full" hint, and removing the last member shows the
"at least one friend" guard — both leave the save untouched. (A fresh
§3 save has only the starter, so the toggle exercises the last-member
guard; a save with storage rows exercises a real swap. Both are valid.)

```bash
for ((i=0;i<9;i++)); do agent-browser --session "$SN" press ArrowDown; done   # cursor → last row (clamps)
agent-browser --session "$SN" press Enter; agent-browser --session "$SN" wait 800   # toggle membership
curl -s -b /tmp/dev-cookies.txt http://localhost:8799/api/save | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const s=JSON.parse(d).save;const ids=new Set(s.ownedCreatures.map(c=>c.creatureId));if(!s.teamIds.every(id=>ids.has(id))||new Set(s.teamIds).size!==s.teamIds.length||!s.teamIds.includes(s.activeTeamId)||!ids.has(s.starterCreatureId))process.exit(1);console.log("save OK: team",s.teamIds.length,"owned",s.ownedCreatures.length)})' || exit 1
agent-browser --session "$SN" press Enter; agent-browser --session "$SN" wait 800   # toggle back
agent-browser --session "$SN" press Escape; agent-browser --session "$SN" wait 500   # close
ck harbor || exit 1
agent-browser --session "$SN" screenshot /tmp/smoke/15-sanctuary-closed.png
```

The save assertion is the criterion: `teamIds[≤6]` all reference owned
creatures with no duplicates, `activeTeamId ∈ teamIds`, and
`starterCreatureId` still references an owned creature.

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
- [ ] **3 — Ferry confirm Harbor→Dock + the open ring gates + bilingual
      banners** — `01..06` show the Go! dialog and the bilingual **arrival
      toasts** for Dock, Pattern Gardens (Dock south gate, open since #9),
      Woolly, and Ticktock Knoll (Woolly north gate, open since #9) — `tp`
      non-empty after a <1500 ms wait, each gate walked **both** ways.
- [ ] **4 — Pockets stay sealed; a real wild battle fires in a newly opened
      region** — `04b` (Dock north pocket `(8,0)`) shows the bilingual
      rustle notice and no travel; `04` shows a live wild battle from the
      Pattern Gardens habitat table, fled cleanly back to the world.
- [ ] **5 — Mini-map tracks player; world map opens/closes; no fast travel** —
      `07` shows the dot moving; `08` captured while open with **every node
      open (no padlocks since #9)**; movement paused while open; an
      open-node tap (`node-meadow/gardens`) gave the `Open — wild creatures
      about!` caption only; opened via **M** and the **HUD Map button**,
      closed via **M**, **Esc**, and the **Close button**.
- [ ] **6 — Return via Dock, sail home** — `10..11` show the Dock then Harbor
      arrival toasts after the return trip.
- [ ] **7 — Console gate + R2 setup documented** — `console.txt`/`errors.txt`
      classified per §6 with zero unexpected errors; §0/§2 cover the local
      R2 setup (the `wrangler.smoke.jsonc` remote-`ART` / local-`DB` binding).
- [ ] **8 — Runnable by a weaker agent** — every step is copy-pasteable and
      mini-map-guided; coordinates are references only.

---

## 8. Recording a successful run

- **Date and commit SHA:** `git rev-parse --short HEAD` at run time.
- **Artifacts:** `/tmp/smoke/00..15` (+ the toast/pocket/map shots), `console.txt`,
  `errors.txt`.
- **Result line**, e.g.
  `PASS 2026-07-19 <sha> — Harbor⇄Meadow ring clean; gardens battle fled; console = LoadScene only; 0 world-art errors.`

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
