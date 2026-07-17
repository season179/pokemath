// Name entry, shown before the world on first sign-in (playerName is NULL)
// and reachable later for renames. One word, letters/numbers only, 1–10
// chars — mirrored server-side by PUT /api/profile/name.
//
// Uses cc.EditBox: on the web build it overlays a real <input>, so desktop
// keyboards and the iPad on-screen keyboard both work for free.

import { Color, EditBox, Label, Node, UITransform } from "cc";
import { PALETTE, makeButton, makeLabel, makePanel } from "./ui";
import type { Persistence } from "./persistence";

export const PLAYER_NAME_RE = /^[A-Za-z0-9]{1,10}$/;

export class NameScreen {
  readonly root = new Node("name-screen");
  private edit: EditBox;
  private error: Label;
  private busy = false;

  constructor(
    private persistence: Persistence,
    current: string | null,
    private onDone: (name: string) => void,
  ) {
    makePanel(this.root, 0, 20, 460, 300, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
    });
    makeLabel(this.root, current ? "Change your name" : "Choose your name", 0, 120, {
      fontSize: 28,
      color: PALETTE.ink,
    });
    makeLabel(this.root, "1–10 letters or numbers, no spaces", 0, 82, {
      fontSize: 16,
      color: PALETTE.sub,
    });

    this.edit = this.makeEditBox(current ?? "");
    this.error = makeLabel(this.root, "", 0, -34, { fontSize: 16, color: PALETTE.bad });

    makeButton(this.root, {
      x: 0,
      y: -80,
      w: 180,
      h: 56,
      label: "OK",
      color: PALETTE.actionBlue,
      onTap: () => void this.submit(),
    });
  }

  private makeEditBox(initial: string): EditBox {
    const node = new Node("name-input");
    node.parent = this.root;
    node.setPosition(0, 20);
    // The interactive box is narrower than the drawn panel on purpose:
    // EditBox lays labels out from its transform's left edge with only a
    // hard-coded 2px engine padding (it expects the editor's inset sprite),
    // so the transform inset (280→250) is what gives the text its ~17px
    // visual padding inside the 280-wide panel.
    node.addComponent(UITransform).setContentSize(250, 46);
    makePanel(node, 0, 0, 280, 56, { fill: Color.WHITE, stroke: PALETTE.panelStroke, radius: 8 });

    // EditBox repositions assigned labels itself (top-left corner + small
    // padding, full box size) and assumes editor-style label nodes:
    // anchor (0,1), CLAMP overflow, CENTER vertical align. makeLabel's
    // center-anchored defaults render half outside the box, so build these
    // to the engine's contract instead — see docs/cocos-editbox-alignment.md.
    const text = this.makeEditLabel(node, "TEXT_LABEL", PALETTE.ink);
    const placeholder = this.makeEditLabel(node, "PLACEHOLDER_LABEL", PALETTE.sub);
    placeholder.string = "your name";

    const edit = node.addComponent(EditBox);
    edit.textLabel = text;
    edit.placeholderLabel = placeholder;
    edit.maxLength = 10;
    edit.inputMode = EditBox.InputMode.SINGLE_LINE;
    edit.string = initial;
    edit.node.on("editing-return", () => void this.submit());
    return edit;
  }

  private makeEditLabel(parent: Node, name: string, color: Color): Label {
    const node = new Node(name);
    node.parent = parent;
    node.addComponent(UITransform).setAnchorPoint(0, 1);
    const label = node.addComponent(Label);
    label.fontSize = 24;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP; // keep the box EditBox assigns
    label.enableWrapText = false;
    return label;
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    const name = this.edit.string.trim();
    if (!PLAYER_NAME_RE.test(name)) {
      this.error.string = "1–10 letters or numbers only";
      return;
    }
    this.busy = true;
    this.error.string = "";
    const err = await this.persistence.setName(name);
    this.busy = false;
    if (err) {
      this.error.string = err;
      return;
    }
    this.onDone(name);
  }
}
