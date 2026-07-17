# Art assets (R2)

**TL;DR for agents:** the game's licensed art is NOT in this repo and never
should be. It lives in the private R2 bucket `pokemath-art` and is served by
the Worker at `/art/<key>`. Never commit anything from `art-samples/`.

## Why

The art (the "Pocket Creature Tamer" pack and related sprites) is licensed
for use in the game but not for redistribution. This repo is public, so the
files stay out of git entirely:

- `art-samples/` — the local source of truth on the dev machine, gitignored.
- `pokemath-art` — private R2 bucket holding the uploaded copies.
- The Worker streams them to the game at runtime (`/art/*` route in
  `worker/src/index.ts`, R2 binding `ART` in `worker/wrangler.jsonc`).

Serving in-game is fine under the license; players can always extract images
from any web game via DevTools. The rule is only: no files in the repo.

## URL / key scheme

R2 keys mirror the `art-samples/` tree, lowercased with spaces → dashes, under
a version prefix:

```
art-samples/Pocket Creature Tamer/UI/Dialog_box/dialog_box.png
  → R2 key:   art/v1/pocket-creature-tamer/ui/dialog_box/dialog_box.png
  → game URL: https://game.pokemath.fun/art/v1/pocket-creature-tamer/ui/dialog_box/dialog_box.png
```

Responses are `cache-control: public, max-age=31536000, immutable`. Because
of that, **never overwrite an existing key with different pixels** — bump
`ART_VERSION` in `tools/sync-art.mjs` (v1 → v2) and update the URLs the game
uses instead.

## Uploading / syncing

```sh
node tools/sync-art.mjs --dry-run   # preview file → key mapping
node tools/sync-art.mjs             # upload everything (idempotent)
```

Requires a wrangler-authenticated Cloudflare account (`npx wrangler login`).
No API tokens or secrets are stored in the repo.

## Using art in the game (Cocos)

Load remotely instead of importing into `game/assets/`:

```ts
import { assetManager, ImageAsset, SpriteFrame, Texture2D } from "cc";

assetManager.loadRemote<ImageAsset>(
  "/art/v1/pocket-creature-tamer/items/items.png",
  { ext: ".png" },
  (err, image) => {
    if (err) return console.error(err);
    const tex = new Texture2D();
    tex.image = image;
    const frame = new SpriteFrame();
    frame.texture = tex;
    sprite.spriteFrame = frame;
  },
);
```

Relative URLs work because the game and the `/art/*` route share the origin
(`game.pokemath.fun`). For local dev against `wrangler dev`, the route serves
from the same origin too (use `--remote` or `wrangler r2 object put` to the
local simulator as needed).

## Rules (engineers and AI agents)

1. **Never commit art.** `art-samples/` is gitignored; keep it that way. Do
   not copy licensed art into `game/assets/`, `docs/`, or anywhere tracked.
2. **Never make the bucket public.** It has no public URL and no custom
   domain; access is only through the Worker.
3. **Immutable keys.** New/changed art ⇒ new version prefix, never overwrite.
4. **New machine setup:** the art must be restored to `art-samples/` from a
   private backup (ask Season); the repo alone cannot rebuild it. The
   deployed game keeps working regardless, since it reads from R2.
