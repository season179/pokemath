# Cocos EditBox label misalignment — troubleshooting guide

A worked example of diagnosing "the text/placeholder of a code-built
`cc.EditBox` renders outside its box", written so a coding agent (or human)
can reproduce the method on similar Cocos UI bugs.

## Symptom

The name-entry screen showed the placeholder ("your name") floating up-left,
half **outside** the white input panel, instead of inside it. Screenshot
symptom class: a Label positioned relative to the wrong corner — an
anchor/parenting problem, not a font or z-order problem.

## Why it happens (root cause)

`EditBox` does **not** leave assigned `textLabel`/`placeholderLabel` nodes
where you put them. Every `_syncSize()` it calls `_updateLabelPosition()`,
which (engine source, `cocos/ui/editbox/edit-box.ts`):

- resizes each label node to the EditBox's own content size
  (`size.width - LEFT_PADDING, size.height`), and
- **moves** each label node to the EditBox's **top-left corner**:
  `setPosition(offX + LEFT_PADDING, offY + size.height)`.

That placement assumes labels shaped like the ones the editor generates when
you create an EditBox in the scene editor:

- node anchor `(0, 1)` — top-left, **not** the Cocos default `(0.5, 0.5)`
- `horizontalAlign LEFT`, `verticalAlign CENTER`
- overflow that respects the assigned content box (e.g. `CLAMP`)

Our `makeLabel()` helper (ui.ts) builds center-anchored labels with overflow
`NONE` (content box hugs the text). Feed one of those to an EditBox and the
engine still moves it to the top-left corner — but with a centered anchor the
text's *center* lands on that corner, so it draws half outside the box, up
and to the left. Exactly what the screenshot showed.

## How to diagnose this class of bug

1. **Classify from the screenshot first.** "Everything shifted by half a
   widget" ⇒ anchor mismatch. "Text at wrong edge" ⇒ alignment/anchor.
   "Clipped" ⇒ content-size/overflow. "Overlapping siblings" ⇒ positions
   computed from stale sizes.
2. **Suspect the component, not your layout code, when a component *owns*
   its children.** If a widget takes child references (EditBox's
   `textLabel`, ScrollView's `content`, …), assume it repositions them.
   Your own `setPosition` calls on those children are dead code.
3. **Read the engine source — it ships with the editor.** No repo download
   needed:
   `/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/resources/3d/engine/cocos/`
   Grep for the component, then for methods touching geometry:
   `grep -n "anchorPoint\|setPosition\|contentSize" .../ui/editbox/edit-box.ts`
   The five relevant methods here: `_syncSize`, `_updateLabelPosition`,
   `_resizeChildNodes`, `_updateTextLabel`, `_updatePlaceholderLabel`.
4. **Compare against the engine's assumptions.** The engine's own positioning
   math tells you the node shape it expects (anchor, alignment, overflow).
   Make your runtime-built nodes match that contract.

## The fix (NameScreen.ts)

Don't pass `makeLabel()` output to an EditBox. Build labels to the engine's
contract instead — see `makeEditLabel()`:

```ts
const node = new Node(name);            // "TEXT_LABEL" / "PLACEHOLDER_LABEL"
node.parent = parent;                   // child of the EditBox node
node.addComponent(UITransform).setAnchorPoint(0, 1);  // top-left anchor
const label = node.addComponent(Label);
label.horizontalAlign = Label.HorizontalAlign.LEFT;
label.verticalAlign = Label.VerticalAlign.CENTER;
label.overflow = Label.Overflow.CLAMP;  // keep the box EditBox assigns
label.enableWrapText = false;
```

Positions and content sizes are left alone — `EditBox._updateLabelPosition`
overwrites them anyway. Setting them is misleading noise.

## Follow-up: text padding and the transform-inset trick

After the anchor fix, the text sat flush against the panel's left border.
Cause: `_updateLabelPosition` indents labels by a hard-coded
`LEFT_PADDING = 2` px from the EditBox transform's left edge — the engine
expects the *editor's* background sprite, whose visual border sits inside
the transform. When you draw your own panel exactly the size of the
transform, 2px reads as "touching the box".

Fix: make the EditBox **transform** smaller than the drawn panel, so the
inset comes from geometry instead of the (unreachable) padding constant:

```ts
node.addComponent(UITransform).setContentSize(250, 46); // interactive box
makePanel(node, 0, 0, 280, 56, {...});                  // drawn 280×56
```

Labels (and the web `<input>` overlay) lay out inside the 250×46 transform,
centered in the 280×56 visual panel → ~17px effective side padding. The same
trick applies to any component with hard-coded internal padding.

## Rules of thumb this generalizes to

- Any label handed to `EditBox` must be anchored `(0, 1)` with LEFT/CENTER
  alignment and a box-respecting overflow. Never reuse center-anchored
  helpers for them.
- If a Cocos component exposes a child-node property, the component probably
  manages that child's transform. Check the source before fighting it.
- After fixing, verify in the built game (`CocosCreator --build`), not just
  by typecheck — geometry bugs are invisible to the compiler.
