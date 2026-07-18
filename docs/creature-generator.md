# Creature generator

`tools/generate-creature.mjs` starts an isolated Codex worker using your
ChatGPT/Codex subscription. The worker requests `gpt-image-2` to generate one
complete creature line. The script then removes the chroma-key background,
normalizes every stage to a shared scale, and writes a horizontal strip of
48×48 frames. Every run produces a normal/alternate palette pair matching the
Pocket Creature Tamer naming convention.

## Configuration

Start from `creature-specs/example-mossback.json`. The `stages` field accepts:

- `1` — no evolution;
- `2` — two-stage line;
- `3` — three-stage line;
- `4` — four-stage line.

`stageDescriptions` must contain exactly one description per stage. The model
is intentionally fixed to `gpt-image-2`; configuration cannot replace it.
The optional `alt` object controls a deterministic palette variant with
`hue` (0–360), `saturation` (0–3), and `brightness` (0.25–2). It changes only
colour; dimensions, transparency, silhouettes, and frame alignment remain
identical.

## Preview without spending credits

```sh
npm run generate:creature -- \
  --config creature-specs/example-mossback.json \
  --dry-run
```

This validates the configuration and prints the exact `codex exec` invocation
and worker prompt. It does not generate an image.

## Generate

First confirm that the installed Codex CLI is using your ChatGPT login:

```sh
codex login status
```

It must report `Logged in using ChatGPT`. Then run:

```sh
npm run generate:creature -- \
  --config creature-specs/example-mossback.json
```

By default, the production pair goes to the gitignored directory:

```text
art-samples/PokeMath Original/Creatures/<creature-id>/
```

Each successful run leaves exactly two files there:

- `<creature-id>.png` — normalized normal-palette game strip;
- `<creature-id>_alt.png` — identical strip with the alternate palette;

Use `--out-dir <directory>` to choose another empty output directory.
The raw image, prompt, individual stages, manifest, and Codex log live only in
a temporary generation workspace and are discarded after successful
normalization. If generation fails, the error reports the preserved workspace
path for diagnosis.

If a failed Codex image worker saved `raw.png`, process that preserved workspace
into a separate empty production directory without generating another image:

```sh
npm run generate:creature -- \
  --config creature-specs/cloudhorn.json \
  --source-dir <preserved-run-directory> \
  --out-dir <empty-production-directory> \
  --process-only
```

## Canvas layouts

The script generates an entire evolutionary line in one image to reduce
identity drift. One to three stages use a row. Four stages use a 2×2 generation
canvas; the normalized result is still a horizontal 192×48 strip. If Codex
returns a different pixel size from the preferred canvas, the post-processor
divides the actual canvas proportionally.

`gpt-image-2` does not output transparent backgrounds, so the prompt requests a
flat chroma-key colour. The post-processor flood-fills matching pixels from the
canvas edges, preserving isolated same-coloured details inside a creature.

## Subscription and model selection

The generator removes API-key environment variables, ignores custom Codex
providers, and refuses to run unless `codex login status` confirms a ChatGPT
login. This keeps the generation on the Codex subscription route.

Codex's built-in image tool currently does not expose a CLI model parameter.
The worker therefore explicitly requests `gpt-image-2`, and the manifest records
that request, but Codex owns the final subscription-backed image-tool dispatch.
