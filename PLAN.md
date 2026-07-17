# Pokemon Clone → Math Game

## Goal
Start with a small Pokemon-style game, then gradually swap mechanics for
math-learning components until math *is* the gameplay. Built for a
5-year-old player: simple controls, friendly visuals, no reading-heavy UI.

## Phase 1 — Base game (vertical slices)

Each slice is playable on its own. Finish and test one before starting the next.

### Slice 1: Walkable overworld
- One small tile map (grass, path, trees as obstacles)
- Player character moves on a grid (arrow keys / WASD)
- Done when: you can walk around and bump into obstacles

### Slice 2: Wild encounters
- Stepping on tall grass has a chance to trigger a battle screen
- Battle screen is a placeholder: "A wild ___ appeared!" + a Run button
- Done when: grass → encounter → run → back to map works

### Slice 3: Basic battle
- Turn-based, 1v1: Attack button, HP bars, win/lose, return to map
- Done when: you can defeat a wild creature or faint and respawn

### Slice 4: Catching
- Throw a ball during battle; success chance based on remaining HP
- Caught creature joins your team
- Done when: you can catch a creature and see it in your team list

### Slice 5: Team & switching
- Party of up to N creatures, choose who fights
- Fainted creature forces a switch
- Done when: a 2-creature team can rotate through a battle

### Slice 6: Progression
- XP from battles, level-ups, simple stat growth
- Done when: a creature visibly gets stronger after a few battles

## Phase 2 — Math swaps (start any time after Slice 3)
- Attacks ask a math question; correct = hit, wrong = miss
- Damage or ball count tied to counting/addition
- Shop / healing costs use simple arithmetic
- Difficulty scales with creature level

## Tech
- Plain browser JS (HTML/Canvas), no build step — open index.html and play
