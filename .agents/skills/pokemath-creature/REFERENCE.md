# Creature specification reference

## JSON schema

```json
{
  "id": "lowercase-hyphenated-id",
  "name": "Display Name",
  "concept": "one coherent creature identity",
  "stages": 2,
  "stageDescriptions": [
    "small first form with persistent identity markers",
    "mature form with the same markers and body-plan lineage"
  ],
  "habitat": "environmental influence",
  "palette": ["primary", "secondary", "accent", "outline"],
  "avoid": ["unwanted traits", "recognisable existing franchise characters"],
  "quality": "high",
  "chromaKey": "#ff00ff",
  "chromaTolerance": 64,
  "alt": {
    "hue": 180,
    "saturation": 1.25,
    "brightness": 0.9
  }
}
```

## Constraints

- `stages`: integer 1–4; `1` means no evolution.
- `stageDescriptions`: exactly one non-empty entry per stage.
- `quality`: `low`, `medium`, or `high`.
- `chromaKey`: six-digit hex absent from the creature palette. Prefer
  `#00ff00`; use `#ff00ff` for green creatures.
- `chromaTolerance`: integer 1–255.
- `alt.hue`: 0–360; `alt.saturation`: 0–3; `alt.brightness`: 0.25–2.

## Production contract

```text
art-samples/PokeMath Original/Creatures/<id>/
├── <id>.png
└── <id>_alt.png
```

Both files are transparent horizontal strips with one 48×48 slot per stage.
The alt is a deterministic palette transform, so geometry and alpha remain
pixel-identical. The JSON spec remains under `creature-specs/` as the editable
source of truth; it is not a production sprite artifact.

## Source archive contract

```text
art-samples/PokeMath Original/Creature Sources/<id>/
├── raw.png
└── manifest.json
```

The raw model output and reproducibility manifest are retained outside the
production directory so the two-file sprite contract stays exact. Both the
production directory and source archive must be empty before generation.

## Published R2 contract

```text
pokemath-art/art/creatures/<id>/<release-sha256>/asset.bin
pokemath-art/art/creatures/<id>/<release-sha256>/asset2.bin
pokemath-art-source/creatures/<id>/<release-sha256>/asset.bin
pokemath-art-source/creatures/<id>/<release-sha256>/manifest.json
pokemath-art-source/creatures/<id>/<release-sha256>/spec.json
pokemath-art-source/catalog/creatures.json
```

The production bucket is bound read-only by convention to the game Worker. The
source bucket is never bound or publicly routed. Publication writes and verifies
all immutable objects before updating the private catalog last.

## Quality gates

- Exact requested stage count and reading order.
- Same creature identity, face, motif, palette family, and facing direction.
- Gradual complexity increase without species replacement.
- Shared scale and bottom-center anchor.
- No detached debris influencing bounds or baseline alignment.
- No scenery, labels, shadows, borders, or chroma-key remnants.
- Normal and alt are visibly different but structurally identical.
