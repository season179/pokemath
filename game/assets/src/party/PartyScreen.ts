import { Color, EventKeyboard, KeyCode, Label, Node, UITransform } from "cc";
import { makeCreaturePortrait } from "../creature-portrait";
import { GameState } from "../state";
import {
  PALETTE,
  destroyChildren,
  makeButton,
  makeLabel,
  makePanel,
  makeRect,
} from "../ui";

const ROWS_PER_PAGE = 4;

export interface PartyActions {
  onBack: () => void;
  onSwitch: () => void;
}

export class PartyScreen {
  readonly root = new Node("party");
  private page = 0;

  constructor(private state: GameState, private actions: PartyActions) {
    this.page = Math.floor(this.state.activeIndex / ROWS_PER_PAGE);
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.KEY_P) {
      this.actions.onBack();
    } else if (e.keyCode === KeyCode.ARROW_LEFT || e.keyCode === KeyCode.PAGE_UP) {
      this.changePage(-1);
    } else if (e.keyCode === KeyCode.ARROW_RIGHT || e.keyCode === KeyCode.PAGE_DOWN) {
      this.changePage(1);
    }
  }

  private changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.state.team.length / ROWS_PER_PAGE) - 1);
    const next = Math.max(0, Math.min(lastPage, this.page + delta));
    if (next === this.page) return;
    this.page = next;
    this.render();
  }

  private select(index: number): void {
    const creature = this.state.team[index];
    if (!creature || creature.fainted || index === this.state.activeIndex) return;
    this.state.switchTo(index);
    this.actions.onSwitch();
    this.render();
  }

  private render(): void {
    destroyChildren(this.root);
    makeRect(this.root, 0, 0, 960, 640, new Color(205, 231, 238, 255));
    const card = makePanel(this.root, 0, 18, 840, 524, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    makeLabel(card, "伙伴 · Party", -365, 222, { fontSize: 32, align: "left" });
    makeLabel(card, "Choose a healthy friend to lead.", 365, 222, {
      fontSize: 16,
      color: PALETTE.sub,
      align: "right",
    });

    const first = this.page * ROWS_PER_PAGE;
    const visible = this.state.team.slice(first, first + ROWS_PER_PAGE);
    visible.forEach((creature, offset) => {
      const index = first + offset;
      const active = index === this.state.activeIndex;
      const y = 124 - offset * 88;
      const row = makePanel(card, 0, y, 760, 78, {
        fill: active ? new Color(227, 242, 253, 255) : new Color(247, 243, 232, 255),
        stroke: active ? PALETTE.actionBlue : undefined,
        radius: 12,
        lineWidth: active ? 3 : undefined,
      });

      const portrait = makeCreaturePortrait(
        row,
        { ...creature, stage: this.state.teamStage(index) },
        15,
      );
      portrait.setPosition(-326, -2);

      const name = makeLabel(row, creature.name, -282, 20, { fontSize: 22, align: "left" });
      name.node.getComponent(UITransform)!.setContentSize(300, 28);
      name.enableWrapText = false;
      name.overflow = Label.Overflow.SHRINK;
      // No creature Lv: pet levels are frozen (player-owned progression, M2A).

      const hpFraction = Math.max(0, creature.hp / creature.maxHp);
      makeRect(row, -176, -18, 210, 12, new Color(221, 221, 221, 255), 6);
      if (hpFraction > 0) {
        const hpColor = hpFraction > 0.5
          ? PALETTE.hpHigh
          : hpFraction > 0.25
            ? PALETTE.hpMid
            : PALETTE.hpLow;
        const width = 210 * hpFraction;
        makeRect(row, -281 + width / 2, -18, width, 12, hpColor, 6);
      }
      makeLabel(row, `HP ${creature.hp}/${creature.maxHp}`, -55, -18, {
        fontSize: 15,
        color: creature.fainted ? PALETTE.bad : PALETTE.sub,
        align: "left",
      });

      makeButton(row, {
        x: 294,
        y: 0,
        w: 132,
        h: 44,
        label: active ? "Leading" : creature.fainted ? "Fainted" : "Choose",
        color: active ? PALETTE.good : PALETTE.actionBlue,
        disabled: creature.fainted,
        fontSize: 17,
        onTap: () => this.select(index),
      });
    });

    const pageCount = Math.max(1, Math.ceil(this.state.team.length / ROWS_PER_PAGE));
    if (pageCount > 1) {
      makeButton(card, {
        x: -105,
        y: -226,
        w: 58,
        h: 40,
        label: "‹",
        color: PALETTE.actionBlue,
        disabled: this.page === 0,
        onTap: () => this.changePage(-1),
      });
      makeLabel(card, `${this.page + 1} / ${pageCount}`, 0, -226, { fontSize: 17 });
      makeButton(card, {
        x: 105,
        y: -226,
        w: 58,
        h: 40,
        label: "›",
        color: PALETTE.actionBlue,
        disabled: this.page === pageCount - 1,
        onTap: () => this.changePage(1),
      });
    }

    makeButton(this.root, {
      x: 0,
      y: -278,
      w: 180,
      h: 54,
      label: "Back 返回",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: this.actions.onBack,
    });
  }
}
