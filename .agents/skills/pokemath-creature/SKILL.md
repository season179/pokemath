---
name: pokemath-creature
description: Generates original PokeMath creature evolutionary lines through the Codex subscription and delivers validated normal/alt pixel-art strips. Use when the user asks to create, generate, or design a creature, monster, evolution line, or Pocket Creature Tamer-style sprite pair in the PokeMath project.
---

# PokeMath Creature Factory

## Quick start

The user only needs to provide a natural-language concept and optionally a
stage count, for example:

```text
Use $pokemath-creature to create a mythical unicorn with two evolutions.
```

Interpret `1` as no evolution and `2`, `3`, or `4` as the number of forms in
one creature identity. If omitted, use two stages unless the concept strongly
suggests another count.

## Workflow

1. Inspect `art-samples/PokeMath Original/Creatures/` and `creature-specs/` to
   avoid duplicate names and IDs.
2. Derive a child-friendly original name, lowercase hyphenated ID, coherent
   concept, stage descriptions, palette, avoid list, and alternate-palette
   transform. Do not imitate an existing franchise character.
3. Create `creature-specs/<id>.json` from the schema in [REFERENCE.md](REFERENCE.md).
   Keep every stage recognizably the same creature and body-plan lineage.
4. Preview without generation:

   ```sh
   npm run generate:creature -- --config creature-specs/<id>.json --dry-run
   ```

5. Generate through the Codex subscription:

   ```sh
   npm run generate:creature -- --config creature-specs/<id>.json
   ```

   Allow network escalation when required. Never introduce `OPENAI_API_KEY` or
   call the separately billed Images API.
6. Validate the exact two-file contract:

   ```sh
   node .agents/skills/pokemath-creature/scripts/validate-output.mjs \
     --dir "art-samples/PokeMath Original/Creatures/<id>" \
     --id <id> --stages <count>
   ```

7. Inspect both PNGs with `view_image`. Confirm readable progression, same
   identity and facing direction, clean transparency, and a useful alt palette.
8. Report links to `<id>.png`, `<id>_alt.png`, and the retained JSON spec.

## Hard rules

- Generate all stages together; never make stages independently.
- The production directory must contain exactly `<id>.png` and `<id>_alt.png`.
- Normal and alt must be `48 × stages` by `48`, with identical alpha masks.
- Never overwrite an existing creature directory or silently delete user files.
- Temporary raw images, stages, prompts, manifests, and logs are discarded only
  after successful processing. Failed workspaces are preserved for diagnosis.
- One targeted regeneration is acceptable after failed visual QA. Ask before
  spending subscription allowance on further attempts.
