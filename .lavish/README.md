# PokeMath design archive

This directory contains research, approved product plans, visual references,
and review artifacts used to guide implementation. It is intentionally tracked
in Git so future work can refer back to the decisions and mockups.

## Approved implementation references

- `xp-progression-research.html` — player-owned XP economy, level curve,
  difficulty rewards, and anti-farming rules.
- `progression-ux-integration.html` — world XP bar, post-battle reward drawer,
  level-up sequence, save migration, and implementation slices.
- `hud-ui-research.html` — HUD research and the approved world, battle, party,
  Bag, shop, and tablet layouts.
- `meadow-isle-plan.html` — Meadow Isle world and content plan.

## Supporting references

- `creatures-all-labeled.html` and `creature-assets/` provide the labelled
  creature catalog.
- `pokemath-*.png` files are current-state and approved visual references used
  by the HTML artifacts.

## Workflow

Open an artifact directly in a browser or with Lavish Editor:

```sh
lavish-axi .lavish/progression-ux-integration.html
```

Add new artifacts after they become useful project references. Exploratory or
temporary exports should be removed before committing.
