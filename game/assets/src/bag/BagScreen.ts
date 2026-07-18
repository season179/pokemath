import { Color, EventKeyboard, Graphics, KeyCode, Node } from "cc";
import { SHOP_ITEMS } from "../../shared/index";
import { GameState } from "../state";
import { paintBagIcon, paintItemIcon } from "../ui-icons";
import { PALETTE, fmtNum, makeButton, makeLabel, makePanel, makeRect } from "../ui";

export class BagScreen {
  readonly root = new Node("bag");

  constructor(private state: GameState, private onBack: () => void) {
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.KEY_B) this.onBack();
  }

  private render(): void {
    makeRect(this.root, 0, 0, 960, 640, new Color(255, 236, 179, 255));
    const card = makePanel(this.root, 0, 24, 820, 500, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    const bagIcon = new Node("bag-icon");
    bagIcon.parent = card;
    bagIcon.setPosition(-360, 197);
    paintBagIcon(bagIcon.addComponent(Graphics), 30);
    makeLabel(card, "背包 · Bag", -325, 197, { fontSize: 32, align: "left" });
    makeLabel(card, `RM ${fmtNum(this.state.money)}`, 350, 197, {
      fontSize: 26,
      color: PALETTE.good,
      align: "right",
    });

    SHOP_ITEMS.forEach((item, index) => {
      const row = makePanel(card, 0, 88 - index * 132, 730, 108, {
        fill: new Color(247, 243, 232, 255),
        radius: 14,
      });
      const icon = new Node(`${item.key}-icon`);
      icon.parent = row;
      icon.setPosition(-310, 0);
      paintItemIcon(icon.addComponent(Graphics), item.key, 44);

      makeLabel(row, `${item.zh} · ${item.en}`, -260, 24, { fontSize: 23, align: "left" });
      makeLabel(row, item.note, -260, -20, {
        fontSize: 16,
        color: PALETTE.sub,
        align: "left",
      });
      makeLabel(row, `×${this.state.bag[item.key]}`, 315, 0, {
        fontSize: 30,
        color: PALETTE.panelStroke,
        align: "right",
      });
    });

    makeLabel(card, "Items are used during battle.", 0, -192, {
      fontSize: 16,
      color: PALETTE.sub,
    });
    makeButton(this.root, {
      x: 0,
      y: -270,
      w: 180,
      h: 54,
      label: "Back 返回",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: this.onBack,
    });
  }
}
