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

## Phase 2 — Math swaps

Question source: JSON banks in the format of
`math-game/math-questions.json` (sample only — more questions will come):
bilingual (zh/en) money word problems, Malaysian upper-primary level.
Schema: `{ id, question_zh, question_en, operation, expression, answer, table?, steps? }`
— single-operation (+ − × ÷, multi-digit) and multi-step `mixed` problems,
some with a small data table. `steps` breaks a mixed problem into bilingual
sub-questions (`{ prompt_zh, prompt_en, expression, answer }`); the engine
turns each step into its own answer turn so kids solve one piece at a time.

### Slice 7: Question engine
- Load a question bank JSON; render a word problem (both languages)
- Multiple choice: the right answer + three near-miss distractors scaled to
  the answer's size, so options can only be told apart by doing the math
- Right/wrong feedback that shows the expression and correct answer
- Standalone module, testable outside battle

### Slice 8: Attack = solve
- The wild creature asks the question in a speech bubble (monster dialogue)
- The answer options are the attack moves: right = hit, wrong = no damage
- Damage scales with operation difficulty (× ÷ hit harder than + −)
- The working is always shown afterwards, then the wild creature strikes back

### Slice 9: Boss battles
- Multi-step `mixed` questions (with tables) power rare, strong wild creatures
- One step per battle turn (engine already provides `questionTurns()`)
- Big XP reward

### Slice 10: Money economy
- Wins pay RM (5× the wild creature's max HP)
- Shop tile on the map sells potions (heal in battle) and balls (now
  consumed by Catch); the shopkeeper asks a change question before selling
- Home tile heals the team (no more free heal after every battle)

### Later ideas
- Difficulty follows creature level; catch chance boosted by streaks
- Generate number variants from each question template so the bank never
  runs dry

## Tech
- Plain browser JS (HTML/Canvas), no build step — open index.html and play
