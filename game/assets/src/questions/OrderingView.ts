// Cocos renderer/controller for one OrderingRound (#12): the child places
// every tray tile into the answer slots, then checks. The pure contract —
// tray/slot moves, the three-valued judge, hints, and feedback strings —
// lives in shared/question-ordering.ts; this view only renders it and maps
// pointer taps and keys onto it. Incomplete checks stay inside the round
// (calm reminder, no battle penalty); correct/incorrect leave the view.

import { Color, KeyCode, Node } from "cc";
import {
  ORDERING_INCOMPLETE_HINT,
  OrderingRound,
  type OrderingTile,
  orderingHint,
  orderingKeyIndex,
} from "../../shared/index";
import { PALETTE, destroyChildren, makeButton, makeLabel, makePanel, makeWrappedLabel } from "../ui";

const TILE_W = 150;
const TILE_GAP = 14;
const TILE_COLOR = new Color(84, 110, 122, 255);
const SLOT_Y = -108;
const TRAY_Y = -196;

export class OrderingView {
  readonly root = new Node("ordering");
  private reminder: string | null = null;

  constructor(
    parent: Node,
    readonly round: OrderingRound,
    private onAnswer: (correct: boolean) => void,
  ) {
    parent.addChild(this.root);
    this.build();
  }

  /** Place tray tile `index` (pointer tap and digit key share this path). */
  place(index: number): void {
    if (this.round.placeFromTray(index)) {
      this.reminder = null;
      this.build();
    }
  }

  /** Check the arrangement. An unfinished order only shows the calm
   * reminder — it is never scored as a wrong answer. */
  submit(): void {
    const outcome = this.round.judge();
    if (outcome === "incomplete") {
      this.reminder = ORDERING_INCOMPLETE_HINT;
      this.build();
      return;
    }
    this.onAnswer(outcome === "correct");
  }

  handleKey(key: KeyCode): boolean {
    const digits: Array<[KeyCode, KeyCode, string]> = [
      [KeyCode.DIGIT_1, KeyCode.NUM_1, "1"],
      [KeyCode.DIGIT_2, KeyCode.NUM_2, "2"],
      [KeyCode.DIGIT_3, KeyCode.NUM_3, "3"],
      [KeyCode.DIGIT_4, KeyCode.NUM_4, "4"],
      [KeyCode.DIGIT_5, KeyCode.NUM_5, "5"],
    ];
    const hit = digits.find(([top, pad]) => key === top || key === pad);
    if (hit) {
      const index = orderingKeyIndex(hit[2]);
      if (index >= 0 && index < this.round.tray.length) this.place(index);
      return true;
    }
    if (key === KeyCode.BACKSPACE) {
      if (this.round.returnLast()) {
        this.reminder = null;
        this.build();
      }
      return true;
    }
    if (key === KeyCode.ENTER) {
      this.submit();
      return true;
    }
    return false;
  }

  private build(): void {
    destroyChildren(this.root);
    const q = this.round.turn.question;

    const card = makePanel(this.root, 0, 92, 820, 330, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 16,
      lineWidth: 5,
    });
    makeWrappedLabel(card, q.question_zh, 0, 55, 760, 100, { fontSize: 22, lineHeight: 28 });
    makeWrappedLabel(card, q.question_en, 0, -25, 760, 60, {
      fontSize: 17,
      color: PALETTE.sub,
      lineHeight: 22,
    });
    makeLabel(card, orderingHint(this.round.direction), 0, -85, {
      fontSize: 19,
      color: new Color(21, 101, 192, 255),
    });

    this.buildSlots();
    this.buildTray();

    makeButton(this.root, {
      x: 0,
      y: -268,
      w: 220,
      h: 56,
      label: "检查 ✓ Check",
      color: PALETTE.actionBlue,
      fontSize: 21,
      onTap: () => this.submit(),
    });

    if (this.reminder) {
      makeLabel(this.root, this.reminder, 0, -306, { fontSize: 15, color: PALETTE.sub });
    }
  }

  private rowX(index: number, count: number): number {
    const total = count * TILE_W + (count - 1) * TILE_GAP;
    return -total / 2 + TILE_W / 2 + index * (TILE_W + TILE_GAP);
  }

  /** One tile's face: labeled tiles (events) render bilingually, numeric
   * tiles show the numeral, as on a worksheet. */
  private paintTile(node: Node, tile: OrderingTile): void {
    if (tile.labelZh === String(tile.value) && tile.labelEn === tile.labelZh) {
      makeLabel(node, tile.labelZh, 0, 0, { fontSize: 24 });
      return;
    }
    makeLabel(node, tile.labelZh, 0, 11, { fontSize: 18 });
    makeLabel(node, tile.labelEn, 0, -15, { fontSize: 12, color: new Color(224, 224, 224, 255) });
  }

  private buildSlots(): void {
    const slots = this.round.slots;
    slots.forEach((tile, i) => {
      const x = this.rowX(i, slots.length);
      if (!tile) {
        const slot = makePanel(this.root, x, SLOT_Y, TILE_W, 66, {
          fill: PALETTE.panel,
          stroke: PALETTE.sub,
          radius: 12,
          lineWidth: 3,
        });
        makeLabel(slot, String(i + 1), 0, 0, {
          fontSize: 20,
          color: new Color(200, 200, 200, 255),
        });
        return;
      }
      const button = makeButton(this.root, {
        x,
        y: SLOT_Y,
        w: TILE_W,
        h: 66,
        label: "",
        color: TILE_COLOR,
        onTap: () => {
          if (this.round.returnToTray(i)) {
            this.reminder = null;
            this.build();
          }
        },
      });
      this.paintTile(button, tile);
    });
  }

  private buildTray(): void {
    const tray = this.round.tray;
    tray.forEach((tile, i) => {
      const button = makeButton(this.root, {
        x: this.rowX(i, tray.length),
        y: TRAY_Y,
        w: TILE_W,
        h: 64,
        label: "",
        color: TILE_COLOR,
        onTap: () => this.place(i),
      });
      // The digit-key hint sits at the tile's corner (desktop discoverability).
      makeLabel(button, String(i + 1), -TILE_W / 2 + 14, 20, {
        fontSize: 12,
        color: new Color(224, 224, 224, 255),
      });
      this.paintTile(button, tile);
    });
  }
}
