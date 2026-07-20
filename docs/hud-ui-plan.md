# HUD UI decisions

**Status:** Shipped and verified 2026-07-18. This file preserves the durable
product and layout decisions; the implementation in `game/assets/src/` is the
source of truth.

## Product decisions

1. **World, top left:** show one active-pet card, not the whole party as dots.
2. **World, top right:** show one Bag button. Do not show RM, potion, or ball
   counts while walking.
3. **Party:** show every owned pet with portrait, name, level, HP, and active
   state. Healthy pets may become active; fainted pets remain visible but
   disabled.
4. **Bag:** show RM in the header and each item with a consistent icon,
   bilingual name/description, and count. The Bag is informational unless an
   explicit out-of-battle item rule is added later.
5. **Shop and battle:** show money, prices, owned counts, and combat status
   where they affect a decision.
6. **Location title:** show it briefly on arrival, then remove it. Do not replay
   it after closing Party or Bag.
7. **Visual language:** use Cocos `Graphics` icons or verified licensed sprites,
   never platform emoji. `ShopItem.key` identifies the item; do not restore a
   presentation-only icon glyph to the shared model. Licensed art stays out of
   git and uses the existing R2 path documented in [`art-assets.md`](art-assets.md).
8. **Follower:** the active pet uses the player's previous walkable tile and the
   existing movement timing. It never changes collision, encounters,
   interaction targeting, or input availability; home/heal reactions stay
   non-blocking.

## Responsive layout invariants

- The shipped design resolution is 1280×720; 960×640 remains the compact
  baseline.
- Edge controls derive their positions from
  `view.getDesignResolutionSize()` and keep a 20-design-unit top/side inset.
- The Bag touch target is at least 54×54 design units.
- The active-pet card keeps portrait, full name, level, and HP readable without
  adding a reserve-party strip.
- Party pagination must not depend on the current team-size validation limit.
- Party/Bag overlays preserve world position, hide the d-pad while open, and
  restore it when closed.
- Location-toast motion respects reduced-motion preferences.

## Regression guardrails

- No persistence-schema, battle-balance, capture, price, or item-effect changes
  belong in a HUD-only change.
- Party selection checkpoints only when the active pet changes; the Bag remains
  read-only unless its product scope changes explicitly.
- Shop purchases/change questions and battle item accounting keep their current
  behavior.
- Use the release gate in [`preview-smoke-check.md`](preview-smoke-check.md) and
  keep `npm test` plus `npm run typecheck` green.
