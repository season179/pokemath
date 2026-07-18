# Art assets (R2)

**TL;DR for agents:** R2 is the source of truth for published art. The private
`pokemath-art` bucket holds immutable game-ready files; the unbound private
`pokemath-art-source` bucket holds provenance and the authoritative catalog.
`art-samples/` is only a gitignored staging/cache directory. Never commit it.

## Why

The art (the "Pocket Creature Tamer" pack and related sprites) is licensed
for use in the game but not for redistribution. This repo is public, so the
files stay out of git entirely:

- `art-samples/` — local generation workspace and disposable cache, gitignored.
- `pokemath-art` — private R2 bucket containing approved production files.
- `pokemath-art-source` — private, unbound R2 bucket containing raw sources,
  manifests, specs, and `catalog/creatures.json`.
- The Worker streams them to the game at runtime (`/art/*` route in
  `worker/src/index.ts`, R2 binding `ART` in `worker/wrangler.jsonc`).

Serving in-game is fine under the license; players can always extract images
from any web game via DevTools. The rule is only: no files in the repo.

## Key schemes

Original creatures use content-addressed immutable keys:

```text
pokemath-art:
  art/creatures/<id>/<release-sha256>/asset.bin   # normal palette
  art/creatures/<id>/<release-sha256>/asset2.bin  # alternate palette

pokemath-art-source:
  creatures/<id>/<release-sha256>/asset.bin  # raw generation bytes
  creatures/<id>/<release-sha256>/manifest.json
  creatures/<id>/<release-sha256>/spec.json
  catalog/creatures.json
```

The private catalog is updated only after every immutable source and production
object has been uploaded and downloaded again for hash verification. The source
bucket is intentionally absent from `worker/wrangler.jsonc`, so the game cannot
read raw generations or provenance.

The existing licensed art pack retains its legacy versioned layout:

R2 keys mirror the `art-samples/` tree, lowercased with spaces → dashes, under
a version prefix:

```
art-samples/Pocket Creature Tamer/UI/Dialog_box/dialog_box.png
  → R2 key:   art/v1/pocket-creature-tamer/ui/dialog_box/dialog_box.png
  → game URL: https://game.pokemath.fun/art/v1/pocket-creature-tamer/ui/dialog_box/dialog_box.png
```

The Worker adds `cache-control: public, max-age=31536000, immutable` when it
serves an object. Because of that, **never overwrite an existing key with
different pixels**. Creature
publication naturally creates a new release hash when approved pixels change.

## Creature registry workflow

```sh
npm run setup-art                         # ensure both private buckets exist
npm run publish-art -- lumentail          # validate, publish, and update catalog
npm run verify-art -- lumentail           # verify remote hashes and dimensions
npm run pull-art -- cloudhorn              # restore sprites and retained source
npm run pull-art -- lumentail --force      # explicitly replace a divergent cache
npm run verify-art -- --all                # verify every catalogued creature
```

Publication is explicit per creature. There is deliberately no command that
recursively uploads `art-samples/`. `publish-art` accepts only the validated
normal/alt pair, the tracked spec, and its source archive. A legacy creature
whose raw generation was lost requires the conspicuous
`--allow-missing-source` flag and receives an honest provenance marker.
The local archive keeps the generator's conventional `raw.png` filename. R2
stores PNG bytes as neutral `.bin` objects after Wrangler read-back checks;
the Worker sets `content-type: image/png` when it serves production creature
objects.

Commands use the pinned Wrangler CLI and its authenticated Cloudflare session.
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
3. **Never bind the source bucket.** Only `pokemath-art` belongs in the Worker
   configuration.
4. **Immutable production keys.** Changed art creates a new content-addressed
   release; never replace bytes at an existing key.
5. **Publish, do not mirror.** Upload only an explicitly selected and validated
   asset. Never recurse over the local staging directory.
6. **Pull from authority.** Restore local production sprites and retained source
   archives with `pull-art`; do not treat a workstation copy as canonical.
