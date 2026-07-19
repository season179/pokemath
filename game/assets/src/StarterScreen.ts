// First-start choice: pick one of the three STARTERS as your first pet.
// Main shows this after the name screen whenever boot returns save: null —
// the server only mints a save via POST /api/save/new, so refreshing
// mid-choice just brings the player back here, and a double tap can never
// overwrite an existing save (the endpoint is idempotent).

import { Color, EventKeyboard, Input, input, KeyCode, Label, Node } from "cc";
import { STARTERS, type SaveStateV2, type Species } from "../shared/index";
import { makeCreaturePortrait } from "./creature-portrait";
import type { Persistence } from "./persistence";
import { PALETTE, destroyChildren, makeButton, makeLabel, makePanel, makeRect } from "./ui";

const TAGLINES: Record<string, string> = {
  cloudhorn: "Soft as a cloud!  像云一样软！",
  lumentail: "Counting lanterns!  灯笼会数数！",
  sproutkit: "Grows as you learn!  越学越茂盛！",
};

export class StarterScreen {
  readonly root = new Node("starter-screen");
  private selected = -1;
  private busy = false;
  private errorText = "";

  constructor(
    private persistence: Persistence,
    private onDone: (save: SaveStateV2) => void,
  ) {
    this.render();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.root.on(Node.EventType.NODE_DESTROYED, () => {
      input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    });
  }

  private onKeyDown(e: EventKeyboard): void {
    if (this.busy) return;
    if (e.keyCode === KeyCode.ARROW_LEFT || e.keyCode === KeyCode.KEY_A) {
      this.select(this.selected < 0 ? 0 : Math.max(0, this.selected - 1));
    } else if (e.keyCode === KeyCode.ARROW_RIGHT || e.keyCode === KeyCode.KEY_D) {
      this.select(this.selected < 0 ? 0 : Math.min(STARTERS.length - 1, this.selected + 1));
    } else if (e.keyCode === KeyCode.DIGIT_1 || e.keyCode === KeyCode.NUM_1) {
      this.select(0);
    } else if (e.keyCode === KeyCode.DIGIT_2 || e.keyCode === KeyCode.NUM_2) {
      this.select(1);
    } else if (e.keyCode === KeyCode.DIGIT_3 || e.keyCode === KeyCode.NUM_3) {
      this.select(2);
    } else if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
      void this.confirm();
    }
  }

  private select(index: number): void {
    if (this.busy || index === this.selected) return;
    this.selected = index;
    this.errorText = "";
    this.render();
  }

  private async confirm(): Promise<void> {
    if (this.busy) return;
    const starter = STARTERS[this.selected];
    if (!starter) {
      this.errorText = "Tap a pet first!  先点一只宠物！";
      this.render();
      return;
    }
    this.busy = true;
    this.errorText = "";
    this.render();
    const result = await this.persistence.chooseStarter(starter.id);
    if ("error" in result) {
      this.busy = false;
      this.errorText = result.error;
      this.render();
      return;
    }
    // The KEY_DOWN listener dies with the root node (see constructor).
    this.onDone(result.save);
  }

  private render(): void {
    destroyChildren(this.root);
    makeRect(this.root, 0, 0, 960, 640, new Color(205, 231, 238, 255));
    const card = makePanel(this.root, 0, 10, 912, 570, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    makeLabel(card, "Choose your first pet!  选择你的第一只宠物！", 0, 244, {
      fontSize: 30,
      color: PALETTE.ink,
    });
    makeLabel(card, "It will walk beside you and solve maths with you.  它会陪你走遍世界，一起做数学。", 0, 204, {
      fontSize: 16,
      color: PALETTE.sub,
    });

    STARTERS.forEach((species, index) => this.renderStarterCard(card, species, index));

    const error = makeLabel(card, this.errorText, 0, -190, { fontSize: 16, color: PALETTE.bad });
    error.node.name = "starter-error";

    const chosen = STARTERS[this.selected];
    makeButton(card, {
      x: 0,
      y: -238,
      w: 340,
      h: 58,
      label: this.busy
        ? "Saving…  保存中…"
        : chosen
          ? `Start with ${chosen.name}!  出发！`
          : "Pick a pet  先选一只",
      color: chosen ? PALETTE.good : PALETTE.actionBlue,
      disabled: this.busy || !chosen,
      fontSize: 20,
      onTap: () => void this.confirm(),
    });
  }

  private renderStarterCard(parent: Node, species: Species, index: number): void {
    const active = index === this.selected;
    const x = (index - 1) * 296;
    const box = makePanel(parent, x, 30, 272, 300, {
      fill: active ? new Color(227, 242, 253, 255) : new Color(247, 243, 232, 255),
      stroke: active ? PALETTE.actionBlue : PALETTE.panelStroke,
      radius: 14,
      lineWidth: active ? 5 : 2,
    });
    box.on(Node.EventType.TOUCH_END, () => this.select(index));

    // 48px sheet cell shown at 120px (size 50 → ×2.4) — big and crisp.
    const portrait = makeCreaturePortrait(box, { speciesId: species.id, color: species.color, boss: false }, 50);
    portrait.setPosition(0, 60);

    makeLabel(box, species.name, 0, -46, { fontSize: 24, color: PALETTE.ink });
    makeLabel(box, TAGLINES[species.id] ?? "", 0, -78, { fontSize: 15, color: PALETTE.sub });
    makeLabel(box, `HP ${species.maxHp}  ·  Attack 攻击 ${species.attack}`, 0, -106, {
      fontSize: 15,
      color: PALETTE.sub,
    });
    makeLabel(box, `${index + 1}`, -114, 128, { fontSize: 14, color: PALETTE.sub });
  }
}
