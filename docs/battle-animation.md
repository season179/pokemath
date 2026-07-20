# Battle animation — research

**Overlay effects shipped 2026-07-20 (#50); HP-bar drain and authored pose frames remain follow-ups, as scoped below.**

How to bring juice (HP drain, damage shake, hit flash, attack lunge, faint,
damage-number popups, capture-ball arc) into the existing Woolly battle loop.
This is a **research note**, not an implementation plan — it scopes what the
engine gives us, what the current code blocks, and the lowest-risk order to
land each effect.

Every Cocos API snippet below was checked against `cocos-engine` `master`
source (`cocos/tween/tween.ts`, `cocos/tween/export-api.ts`,
`cocos/animation/animation-clip.ts`), not against docs prose.

## What the engine gives us

From `game/settings/v2/packages/engine.json` (enabled modules):

| Module | On | Useful for |
|---|---|---|
| `tween` | ✅ | all code-driven motion (shake, lunge, HP drain, popups) |
| `animation` | ✅ | timeline `AnimationClip` + `Animation` component |
| `particle-2d` | ✅ | hit sparks, dust, catch sparkles (optional juice) |
| `spine-3.8`, `dragon-bones` | ✅ | skeletal animation (only if sheet art adds rigs) |
| `2d`, `affine-transform`, `graphics`, `ui`, `mask` | ✅ | the existing UI kit |
| `3d`, `skeletal-animation`, `particle` (3D) | ❌ | n/a |

**Takeaway:** we do not need to enable anything. Pure code `tween()` covers
every effect in scope today. `AnimationClip`/spine only matter once we have
authored frame art or rigs, which the current single-frame creature sheets do
not provide.

## The binding constraint: `render()` rebuilds the whole scene

`game/assets/src/battle/BattleScreen.ts`:

```ts
private render(questionRound?: QuestionRound): void {
  destroyChildren(this.root);   // <-- kills every node
  this.drawBase();              // <-- recreates platforms, creatures, HP bars
  // ... message/menu box
}
```

Every state change — `say()`, `advanceMessage()`, `showMenu()`, question open
— calls `render()`, which destroys and rebuilds **creatures, HP bars, and
platforms** from scratch. Damage is applied to the data model
(`creature.takeDamage(n)`) and then a text message is shown; the rebuild makes
the HP bar *snap* to the new value with no room to tween.

This is the one fact that shapes every decision below. Two viable answers:

- **A. Sequence-first (low risk).** Keep the rebuild. Run each effect on
  *transient overlay nodes* between `takeDamage()` and the next `say()`,
  using `tween(...).start()` + an `onComplete` to resume the turn flow. The
  rebuilt scene stays untouched; overlays are spawned and destroyed per
  effect. This delivers ~6 of 7 effects with almost no regression surface on
  a loop the kids have already playtested (#8 is closed).
- **B. Minimal stage split (only if HP drain matters enough).** Hoist the
  creatures, platforms, and HP-bar fill nodes into a `stage` node that
  `render()` does **not** `destroyChildren`, so they persist across turns and
  can hold stable references for tweens. Only the dialog/menu box rebuilds
  per phase.

**Recommendation:** ship A first. Add B only as a focused follow-up for the
HP-drain tween, because that is the one effect A cannot do well (the bar is a
fresh `Graphics` node each render, so there is nothing persistent to tween).

## Verified tween cheat-sheet (CC 3.x, source-checked)

Signatures from `cocos/tween/tween.ts`:

```ts
to(duration, props, opts?)   // absolute
by(duration, props, opts?)   // relative
call(callback, thisArg?, data?)        // line 566 — mid/end callback
then(other: Tween)                     // line 162 — append another tween
union(fromId?: number)                 // line 434 — collapse prior actions
                                       //   into ONE sequence. Takes a numeric
                                       //   action id, NOT a tween.
repeat(repeatTimes, embedTween?)       // line 652 — with no embedTween, pops
                                       //   ONLY the last action. Union first
                                       //   if you want to repeat a group.
repeatForever(embedTween?)
delay(duration)
start(time = 0)                        // hands off to global ActionManager;
                                       //   no Component update() loop needed.
```

`ITweenOption` (`cocos/tween/export-api.ts:51`):

```ts
{ easing?, progress?, onStart?, onUpdate?(target, ratio), onComplete?(target) }
```

> ⚠️ Common trap: `.to().to().repeat(n)` repeats **only the last** `.to`,
> because `repeat` pops a single action. Always `.union()` before `.repeat()`
> when you want to repeat a group of two or more actions.

## Per-effect techniques

Conventions: durations are seconds; Vec3 for `position`/`scale`; tween a
`Sprite` directly to animate its `color`; tween a `Graphics`/`Label` directly
to animate its `fillColor`/`color`.

### 1. HP bar drain (the one that needs the stage split)

The fill is `makeRect(...)` → a `Graphics` drawing a rounded rect once
(`game/assets/src/ui.ts`, "Solid-color sprite-free rectangle"). Two ways to
animate it once the fill node is persistent:

**(a) Tween a left-anchored fill node's `scale.x`** — cheapest, recommended.
Anchor the fill node left (`setAnchorPoint(0, 0.5)`), keep its drawn width at
full, and tween `scale` from `1` to the target fraction:

```ts
// fillNode is left-anchored, drawn at full HP-bar width
tween(fillNode)
  .to(0.35, { scale: new Vec3(targetFraction, 1, 1) }, { easing: 'quadOut' })
  .start();
```

Caveat: scaling distorts the rounded corners. If the bar radius is small
(currently 7px on a 14px-tall bar) the distortion is barely visible; if it
bugs you, use (b).

**(b) Redraw the Graphics each tick** via `onUpdate` — undistorted, slightly
more allocation:

```ts
const g = fillNode.getComponent(Graphics)!;
const startX = -barWidth / 2;
tween({ frac: startFraction })
  .to(0.35, { frac: targetFraction }, {
    easing: 'quadOut',
    onUpdate: (o) => {
      g.clear();
      const w = barWidth * Math.max(0, o!.frac);
      g.roundRect(startX, -barHeight / 2, w, barHeight, 7);
      g.fill();
    },
  })
  .start();
```

Color crossfade (green→amber→red at thresholds) can ride the same tween via a
second `tween(g).to(0.35, { fillColor: PALETTE.hpLow }).start()` fired in
parallel, or just snap the color by fraction as today.

### 2. Damage shake (corrected — union before repeat)

```ts
import { tween, Vec3 } from 'cc';

function shake(node: Node, strength = 6, cycles = 4, cycleSec = 0.05): void {
  tween(node)
    .by(cycleSec, { position: new Vec3(strength, 0, 0) })
    .by(cycleSec, { position: new Vec3(-strength, 0, 0) })
    .union()        // <-- group the two .by into one sequence
    .repeat(cycles) // <-- now repeats the whole pair
    .start();
}
```

Because the node's base position is unchanged by `.by` pairs that net to zero,
it returns to origin automatically. Stash the node's home position if you also
tween position elsewhere.

### 3. Hit flash (corrected — union before repeat)

For a `Sprite` creature (sheet art), tween `Sprite.color` to white and back:

```ts
tween(sprite)
  .to(0.06, { color: new Color(255, 255, 255, 255) })
  .to(0.06, { color: new Color(255, 255, 255, 255) }) // hold white
  .union()
  .repeat(2)
  .call(() => { sprite.color = originalColor; })
  .start();
```

For `Graphics`-blob creatures (placeholder art), tween `Graphics.fillColor`
the same way. A full-white flash needs the blob drawn in a flashable color;
simplest is a quick scale pulse instead (see lunge) if flash reads poorly on
flat shapes.

### 4. Attack lunge

```ts
const home = lungeNode.position.clone();
tween(lungeNode)
  .to(0.10, { position: new Vec3(home.x + dx, home.y + dy, 0) }, { easing: 'quadOut' })
  .to(0.14, { position: home }, { easing: 'quadIn' })
  .call(onLand)   // deal damage, shake target, show message
  .start();
```

`dx`/`dy` point from attacker toward defender (~+60px for player→wild,
~-60px for wild→player given the current layout in `drawBase()`).

### 5. Faint

```ts
tween(node)
  .by(0.30, { position: new Vec3(0, -40, 0) })   // drop down
  .to(0.30, { scale: new Vec3(0.6, 0.6, 1) })
  .call(() => { /* optionally fade a Sprite.color alpha to 0 */ })
  .call(onDone)
  .start();
```

Pair with an opacity fade via `tween(sprite).to(0.3, { color: new Color(r,g,b,0) })`
run in parallel (separate `tween(...).start()`).

### 6. Damage-number popup

Spawn a transient `Label` over the target, float it up, fade out, destroy:

```ts
const popup = makeLabel(this.root, `-${damage}`, x, y, {
  fontSize: 30, color: PALETTE.bad,
});
tween(popup.node)
  .by(0.5, { position: new Vec3(0, 60, 0) })
  .call(() => popup.node.destroy())
  .start();
tween(popup)
  .delay(0.25)
  .to(0.25, { color: new Color(198, 40, 40, 0) })
  .start();
```

### 7. Capture-ball arc

Approximate an arc with a short waypoint sequence; shake the target on
contact, then fade:

```ts
tween(ballNode)
  .to(0.18, { position: midPoint }, { easing: 'quadOut' })   // up
  .to(0.18, { position: targetPoint }, { easing: 'quadIn' }) // down onto wild
  .call(() => shake(wildNode, 5, 3, 0.04))
  .delay(0.1)
  .to(0.2, { scale: new Vec3(0, 0, 1) })
  .call(onResolve)   // caught vs broke-free branch
  .start();
```

For a true curve, drive `position` with a custom `progress` interpolator in
`ITweenOption` that blends x linearly and y along a parabola.

## Sprite-frame attack poses (future, gated on art)

If creature sheets ever carry multiple frames per pose (idle / attack /
hurt), use a runtime-built clip — no editor `.anim` asset required
(`cocos/animation/animation-clip.ts:115`):

```ts
import { Animation, AnimationClip, SpriteFrame } from 'cc';
const clip = AnimationClip.createWithSpriteFrames(frames, 10); // 10 fps
const anim = spriteNode.addComponent(Animation);
anim.defaultClip = clip;
anim.play();
```

This is **not** actionable today: current sheet art is one frame per creature
(see `creature-portrait.ts` and `SPECIES_BY_ID[...].art`). It becomes useful
only after the art pipeline produces pose sheets. Note this as a dependency,
not a near-term task.

## Recommended phasing

1. **FX sequencing layer (A).** Add a small `playHitFx(attacker, defender,
   damage, onDone)` and friends that spawn transient overlay nodes, run the
   tween chain, and call `onDone` on completion. Wire each turn branch in
   `BattleScreen` to `await` (callback style) the fx before calling `say()`.
   Delivers: shake, flash, lunge, popup, faint, ball arc. Touches no render
   architecture.
2. **HP-drain split (B, conditional).** Only if drain matters to the feel:
   hoist creatures + HP fill into a `stage` node exempt from
   `destroyChildren`, keep references, and apply effect #1. Small, isolated
   change.
3. **Author attack-pose art** only if #1–#2 leave the battles feeling static.
   Unblocks `AnimationClip.createWithSpriteFrames`.

## Constraints to carry forward (from #8)

- No timer pressure, no shame language, no scary damage feedback — effects
  must read as *calm and playful*. Keep shake amplitudes small and durations
  short; avoid red-screen flashes.
- Must not regress the save-v1 reload semantics or the "calm wrong-answer"
  path. Animations are visual only; the data model in `shared/battle-rules.ts`
  stays authoritative.
- Desktop-first; effects must read clearly at 1280×720 (the playtest
  resolution from #35).
