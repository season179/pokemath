// Shop screen: inventory, money, and the shopkeeper's change question.
// Purchase arithmetic is pure shared domain; this class is view/input only.

import { Color, EventKeyboard, KeyCode, Label, Node } from "cc";
import {
  QuestionRound,
  SHOP_ITEMS,
  ShopItem,
  makeChangeQuestion,
  turnsOf,
} from "../../shared/index";
import { GameState } from "../state";
import { QuestionView } from "../questions/QuestionView";
import {
  PALETTE,
  destroyChildren,
  fmtNum,
  makeButton,
  makeLabel,
  makePanel,
  makeRect,
} from "../ui";

type Phase = "shop" | "question";

export class ShopScreen {
  readonly root = new Node("shop");

  private phase: Phase = "shop";
  private questionView: QuestionView | null = null;
  private notice: { text: string; color: Color } | null = null;

  constructor(
    private state: GameState,
    private onLeave: () => void,
  ) {
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    if (this.phase === "question") {
      this.questionView?.handleKey(e.keyCode);
      return;
    }
    if (e.keyCode === KeyCode.ESCAPE) this.onLeave();
  }

  private buyItem(item: ShopItem): void {
    if (this.state.money < item.price) {
      this.notice = { text: "Not enough money! 钱不够!", color: PALETTE.bad };
      this.render();
      return;
    }

    const question = makeChangeQuestion(item);
    const round = new QuestionRound(turnsOf(question)[0]);
    this.phase = "question";
    this.render(round, item);
  }

  private answer(item: ShopItem, correct: boolean): void {
    if (correct) {
      this.state.money -= item.price;
      this.state.bag[item.key]++;
      this.notice = {
        text: `You bought a ${item.en.toLowerCase()}! 买到了!`,
        color: PALETTE.good,
      };
    } else {
      this.notice = {
        text: "The shopkeeper shakes their head… 再算算!",
        color: PALETTE.bad,
      };
    }
    this.phase = "shop";
    this.render();
  }

  private render(round?: QuestionRound, pendingItem?: ShopItem): void {
    destroyChildren(this.root);
    this.questionView = null;
    this.drawShop();

    if (this.phase === "question" && round && pendingItem) {
      this.questionView = new QuestionView(this.root, round, (_picked, correct) => {
        this.answer(pendingItem, correct);
      });
    }
  }

  private drawShop(): void {
    makeRect(this.root, 0, 0, 960, 640, new Color(255, 224, 178, 255));
    const card = makePanel(this.root, 0, 25, 820, 490, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 16,
      lineWidth: 5,
    });

    makeLabel(card, "商店 · Shop", -360, 195, { fontSize: 32, align: "left" });
    makeLabel(card, `RM ${fmtNum(this.state.money)}`, 360, 195, {
      fontSize: 26,
      color: PALETTE.good,
      align: "right",
    });

    SHOP_ITEMS.forEach((item, i) => {
      const y = 85 - i * 120;
      const row = makePanel(card, 0, y, 750, 96, {
        fill: new Color(247, 243, 232, 255),
        radius: 12,
      });
      makeLabel(row, item.icon, -330, 5, { fontSize: 38 });
      makeLabel(row, `${item.en} ${item.zh} — RM ${fmtNum(item.price)}`, -265, 20, {
        fontSize: 21,
      });
      makeLabel(row, `${item.note}   ·   you have ${this.state.bag[item.key]}`, -265, -18, {
        fontSize: 14,
        color: PALETTE.sub,
      });
      makeButton(row, {
        x: 305,
        y: 0,
        w: 110,
        h: 50,
        label: "Buy",
        color: PALETTE.actionBlue,
        fontSize: 21,
        onTap: () => this.buyItem(item),
      });
    });

    if (this.notice) {
      makeLabel(card, this.notice.text, -350, -150, {
        fontSize: 20,
        color: this.notice.color,
      });
    }

    makeButton(this.root, {
      x: 0,
      y: -270,
      w: 180,
      h: 54,
      label: "Leave 离开",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: this.onLeave,
    });
  }
}
