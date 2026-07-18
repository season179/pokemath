# HUD UI implementation plan

**Status:** Approved by Season on 2026-07-18

**Design reference:** `.lavish/hud-ui-research.html`

**Implementation target:** Cocos Creator 3.8.8, 960×640 design resolution

## Goal

Make Harbor Town feel like a creature adventure rather than a status
dashboard:

- show one meaningful active-pet cue in the overworld;
- replace the persistent wallet string with one Bag affordance;
- show money and item counts only where they affect a decision;
- keep the top edge inside a consistent safe area;
- eventually embody the active pet in the world as a follower.

This plan is split into an implementation-ready HUD pass and a follow-up
companion pass. Complete and visually verify the HUD pass before starting the
follower.

## Locked product decisions

1. **World, top left:** one active-pet card. Do not show the whole party as
   tiny dots.
2. **World, top right:** one Bag button. Do not show RM, potion, or ball counts
   while walking.
3. **Bag:** show RM in the header and show each item with a consistent game
   icon, bilingual name/description, and count.
4. **Shop:** keep RM visible next to prices and keep the owned count on each
   item row because both values affect purchase decisions.
5. **Battle:** show the active pet's full combat status. Reveal item counts in
   the battle action area, not in the overworld.
6. **Location title:** show on arrival, hold briefly, then disappear.
7. **Visual language:** do not use platform emoji for the Bag, potion, ball,
   or pet icons. Use Cocos `Graphics` icons or verified licensed sprites loaded
   through the existing R2 art path.
8. **Long-term Pokémon-like payoff:** the active pet follows the player in the
   world. This is Phase 2, after the HUD pass is accepted.

## Current problems to remove

`WorldScreen.buildHuds()` currently creates:

- a party panel centered at `y=288` with height `66`; its top reaches `y=321`
  on a canvas whose top bound is `y=320`, so it is clipped;
- a wallet line containing RM and two emoji item counts;
- a permanent location panel using the same visual weight as both status
  panels.

The team panel also grows without a width limit as the team grows, and its
icons do not communicate name, HP, or active state.

## Target world layout

All coordinates below use centered Cocos coordinates for the 960×640 design
resolution.

| Element | Size | Center | Behaviour |
|---|---:|---:|---|
| Active-pet card | `196×60` | `(-362, 270)` | 20px from top and left; tap opens Party |
| Bag button | `54×54` | `(433, 273)` | 20px from top and right; tap opens Bag |
| Location toast | about `220×42` | `(0, 279)` | hold 1.5–2.0s, fade for about 250ms, destroy |

The active-pet card contains:

- a 44×44 portrait rendered with the existing creature visual language;
- full name, shrinking or truncating only when necessary;
- `Lv. N`;
- a compact HP bar using the existing high/mid/low HP colours;
- a clear active-state treatment without adding a second nested card.

Do not add reserve-party dots to this card. The Party screen owns the roster.

Respect `prefers-reduced-motion`: the location toast may disappear without a
fade when reduced motion is requested.

## Screen and input model

Extend the `GameApp` screen union from:

```ts
type Screen = "world" | "battle" | "shop";
```

to:

```ts
type Screen = "world" | "party" | "bag" | "battle" | "shop";
```

Add two small screens:

### Party screen

- Open from the active-pet card or `P` while in the world.
- Show every owned pet with portrait, name, level, HP, and active state.
- Allow a healthy pet to become active using `GameState.switchTo(index)`.
- Keep fainted pets visible but disabled.
- Paginate rather than assume a six-pet domain limit; the current save model
  does not enforce a maximum team size.
- Close with the on-screen Back button or `Escape`.
- Checkpoint after changing the active pet.

### Bag screen

- Open from the Bag button or `B` while in the world.
- Header: `背包 · Bag` and `RM <amount>`.
- Rows: potion and ball icon, bilingual label, description, and owned count.
- The first version is informational. Do not introduce new out-of-battle item
  rules as part of this visual change.
- Close with the on-screen Back button or `Escape`.

When Party or Bag is open:

- hide `world.root` and the touch d-pad;
- restore both on close;
- preserve the world position and current town state;
- do not replay the location toast when returning from an overlay screen.

## Item icon strategy

The current `ShopItem.icon` values are emoji. Remove emoji from rendered game
UI.

Preferred implementation:

1. Inspect the licensed `Pocket Creature Tamer` UI/item sheets locally under
   the gitignored `art-samples/` directory.
2. If appropriate item and Bag sprites exist, load them with the existing R2
   pipeline documented in `docs/art-assets.md`.
3. Keep a deterministic `Graphics` fallback in a new UI-icon helper so local
   development still works when remote art is unavailable.

Do not commit licensed art. Do not make the R2 bucket public. If no suitable
sprite exists, ship the `Graphics` icons rather than keeping emoji.

Use the same item icon helper in Bag, Shop, and Battle. Avoid carrying an icon
glyph in the pure shared-domain `ShopItem` model when `item.key` already
identifies the item.

## Phase 1: HUD and overlay screens

### 1. Add reusable UI icon renderers

Create `game/assets/src/ui-icons.ts` and its Cocos `.meta` file.

Responsibilities:

- `paintBagIcon(...)`;
- `paintItemIcon(..., "potion" | "ball", ...)`;
- optional remote-sprite loading only if the licensed asset and crop are
  verified;
- deterministic `Graphics` fallbacks;
- no gameplay state.

### 2. Replace the world HUD

Update `game/assets/src/world/WorldScreen.ts`:

- replace `hudMoney` and the growing party panel with the active-pet card and
  Bag button;
- extend `WorldActions` with `onParty` and `onBag`;
- keep `refreshHud()` able to reflect active-pet, HP, or level changes;
- make the active-pet card and Bag button proper touch targets;
- keep all world HUD bounds inside the 20px safe area;
- turn `buildTownTitle()` into a one-shot toast.

### 3. Add Party and Bag screens

Create:

- `game/assets/src/party/PartyScreen.ts` plus required `.meta` files;
- `game/assets/src/bag/BagScreen.ts` plus required `.meta` files.

Use the existing code-built Cocos UI helpers. Do not introduce editor-authored
prefabs for only these screens.

### 4. Wire navigation and persistence

Update `game/assets/src/GameApp.ts`:

- add Party and Bag screen instances and transitions;
- map `P` and `B` in the world;
- route `Escape` through each overlay screen;
- hide/show the d-pad with the world;
- checkpoint only when Party changes `activeIndex`; Bag v1 is read-only.

### 5. Unify inventory rendering

Update:

- `game/assets/src/shop/ShopScreen.ts` to use the item icon helper instead of
  `item.icon`;
- `game/assets/src/battle/BattleScreen.ts` so item actions show owned counts,
  for example `Ball ×3` and `Potion ×1`;
- `shared/shop-rules.ts` to remove the emoji field if it is no longer used;
- generated `game/assets/shared/` files via `npm run sync` after shared-domain
  changes.

Do not redesign the rest of Shop or Battle in this pass.

## Phase 2: active-pet follower

Start only after Phase 1 passes visual QA.

Update `WorldScreen` with a companion actor that:

- renders the current active pet using `paintCreature` initially;
- occupies the player's previous walkable tile and follows one step behind;
- animates between tile centres using the existing movement timing;
- never blocks collision or interaction checks;
- refreshes immediately after the active pet changes;
- hides automatically when the world root is inactive;
- has a small home/heal reaction without gating input.

After the follower reads clearly at game scale, evaluate whether the active-pet
card can shrink to a portrait-only button in safe towns. Do not remove the card
in the same change that introduces the follower; compare screenshots first.

## Files expected to change

| File | Purpose |
|---|---|
| `game/assets/src/world/WorldScreen.ts` | New active-pet HUD, Bag button, location toast, later follower |
| `game/assets/src/GameApp.ts` | Party/Bag routing, keyboard input, screen lifecycle |
| `game/assets/src/ui-icons.ts` | Consistent Bag and item icons |
| `game/assets/src/party/PartyScreen.ts` | Roster and active-pet selection |
| `game/assets/src/bag/BagScreen.ts` | Wallet and inventory display |
| `game/assets/src/shop/ShopScreen.ts` | Shared item icons, no emoji rendering |
| `game/assets/src/battle/BattleScreen.ts` | Contextual item counts |
| `shared/shop-rules.ts` | Remove the presentation-only emoji field if unused |
| `game/assets/shared/shop-rules.ts` | Generated by `npm run sync` |

Commit all new Cocos `.meta` files. Do not commit anything under
`art-samples/`, `game/build/`, `game/library/`, `game/temp/`, or local Wrangler
state.

## Acceptance criteria

### World

- No HUD pixel crosses the 20px top/side safe area at 960×640.
- The active pet's portrait, full starter name, level, and HP are readable.
- No whole-party dot strip is visible.
- No RM, potion count, or ball count is visible while walking.
- The Bag target is at least 54×54 and works with touch.
- The location toast disappears and does not replay after closing Party/Bag.
- The existing d-pad, player-name control, NPC interaction, Shop entrance, and
  Home healing continue to work.

### Party and Bag

- Touch and keyboard can open and close both screens.
- Party handles more rows than fit on one page without clipping.
- Selecting a healthy pet updates the active pet in world and persists it.
- Bag shows the current RM, potion count, and ball count.
- Bag v1 does not mutate inventory.

### Shop and Battle

- Shop still shows current money, price, and owned count before purchase.
- Purchases and change questions behave exactly as before.
- Battle item actions show current counts and decrement correctly.
- No platform emoji is used for Bag, potion, or ball in rendered game UI.

### Companion follow-up

- The follower remains one step behind through turns and blocked movement.
- It never changes collision, encounters, or interaction targeting.
- Switching the active pet refreshes its appearance.

## Verification

Run:

```sh
npm run sync       # only when shared/ changes
npm test
npm run typecheck
```

Then build or preview through Cocos Creator 3.8.8 and verify with
`agent-browser`:

1. Capture Harbor Town at 960×640 with one pet and with a larger saved team.
2. Open/close Party using touch, `P`, and `Escape`.
3. Change the active pet and confirm the card and save state update.
4. Open/close Bag using touch, `B`, and `Escape`.
5. Enter Shop and confirm RM, owned counts, buying, and the change question.
6. Exercise Battle with zero and non-zero balls/potions.
7. Check a tablet-landscape viewport and confirm no clipping or overlap.
8. Check browser console errors and failed art requests.

Keep before/after screenshots with the implementation handoff. The approved
research report is the visual baseline, not a requirement to reproduce its
wireframe pixel-for-pixel.

## Non-goals

- No persistence schema change.
- No change to battle damage, capture odds, prices, or item effects.
- No full Shop or Battle redesign.
- No new team-size rule.
- No committed licensed art.
- No world-map or island-content changes.

## Research references

- Pokémon: Let's Go overworld, menu, and Bag references:
  - <https://interfaceingame.com/screenshots/pokemon-lets-go-pikachu-location/>
  - <https://interfaceingame.com/screenshots/pokemon-lets-go-pikachu-menu/>
  - <https://interfaceingame.com/screenshots/pokemon-lets-go-pikachu-bag/>
- Pokémon Mystery Dungeon action HUD:
  <https://interfaceingame.com/screenshots/pokemon-mystery-dungeon-rescue-team-dx-attack/>
- Temtem official gallery: <https://crema.gg/games/temtem/>
