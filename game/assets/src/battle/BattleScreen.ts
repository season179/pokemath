// Battle screen and turn-flow state machine. Rendering/input live here;
// creature math and question judgement stay in the pure shared domain.

import { Color, EventKeyboard, Graphics, KeyCode, Label, Node } from "cc";
import {
  BOSS_FINAL_BLOW_MULTIPLIER,
  POTION_HEAL,
  Creature,
  OrderingRound,
  QuestionBank,
  QuestionRound,
  QuestionTurn,
  correctAnswerDamage,
  isOrdering,
  playerXpForTurn,
  prizeMoney,
  resultFeedback,
  rollDamage,
  turnsOf,
  type PlayerXpAward,
} from "../../shared/index";
import { GameState } from "../state";
import { colorFromHex } from "../creature-art";
import { makeCreaturePortrait } from "../creature-portrait";
import { paintItemIcon, type ItemIconKind } from "../ui-icons";
import {
  PALETTE,
  destroyChildren,
  fmtNum,
  makeButton,
  makeLabel,
  makePanel,
  makeRect,
  makeWrappedLabel,
} from "../ui";
import { OrderingView } from "../questions/OrderingView";
import { QuestionView } from "../questions/QuestionView";
import { NULL_SINK, type TelemetrySink } from "../client/telemetry";

type Phase = "message" | "menu" | "question" | "switch" | "result";

// The compact post-battle result (M2A, issue #7): one card shows the earned
// XP, the prize (victory only), the player's level progress, and the level-up
// state. Every number comes from the single awardPlayerXp computation that
// also lands in the save — displayed totals always equal saved totals.
interface BattleResult {
  title: string;
  subtitle?: string;
  xpGain: number;
  prize: number | null;
  award: PlayerXpAward;
}

export interface BattleActions {
  onExit: () => void;
  onRespawn: () => void;
}

export class BattleScreen {
  readonly root = new Node("battle");

  private phase: Phase = "message";
  private messages: string[] = [];
  private afterMessages: () => void = () => {};
  private result: BattleResult | null = null;
  // Player XP accrued per correctly answered question turn this battle
  // (playerXpForTurn). Awarded to the player on victory AND on capture — so
  // capturing early can only ever pay the answered share, never full defeat
  // XP for unanswered questions (issue #7).
  private earnedXp = 0;
  private questionView: QuestionView | null = null;
  private orderingView: OrderingView | null = null;
  private bossTurns: QuestionTurn[] | null = null;
  private bossIndex = 0;
  private switchForced = false;
  // Per-battle question tallies for the battle_outcome event (#24).
  private asked = 0;
  private answeredCorrect = 0;
  private outcomeEmitted = false;

  constructor(
    private state: GameState,
    readonly wild: Creature,
    private bank: QuestionBank,
    private actions: BattleActions,
    private telemetry: TelemetrySink = NULL_SINK,
  ) {
    const intro = [`A wild ${wild.name} appeared!`];
    if (wild.boss) intro.push("It asks tricky problems — solve them step by step!");
    this.say(intro, () => this.showMenu());
  }

  handleKeyDown(e: EventKeyboard): void {
    if (this.phase === "message" && (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER)) {
      this.advanceMessage();
      return;
    }
    if (this.phase === "result" && (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER)) {
      this.advanceResult();
      return;
    }
    if (this.phase === "question") {
      this.questionView?.handleKey(e.keyCode);
      this.orderingView?.handleKey(e.keyCode);
      return;
    }
    if (this.phase === "menu") {
      if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) this.playerAttack();
      else if (e.keyCode === KeyCode.KEY_C) this.throwBall();
      else if (e.keyCode === KeyCode.ESCAPE) this.runAway();
      return;
    }
    if (this.phase === "switch" && e.keyCode === KeyCode.ESCAPE && !this.switchForced) {
      this.showMenu();
    }
  }

  private say(messages: string[], then: () => void): void {
    this.phase = "message";
    this.messages = [...messages];
    this.afterMessages = then;
    this.render();
  }

  private advanceMessage(): void {
    this.messages.shift();
    if (this.messages.length === 0) this.afterMessages();
    else this.render();
  }

  private showMenu(): void {
    this.phase = "menu";
    this.render();
  }

  private playerAttack(): void {
    let turn: QuestionTurn;
    if (this.wild.boss) {
      if (!this.bossTurns || this.bossIndex >= this.bossTurns.length) {
        const question = this.bank.pick((q) => !!q.steps);
        this.bossTurns = turnsOf(question);
        this.bossIndex = 0;
      }
      turn = this.bossTurns[this.bossIndex];
    } else {
      turn = turnsOf(this.bank.pick((q) => !q.steps))[0];
    }

    // Ordering questions (#12) serve their own tray/slot round; every
    // other form shares the numeric QuestionRound contract.
    if (isOrdering(turn.question)) {
      this.phase = "question";
      this.render(undefined, new OrderingRound(turn));
      return;
    }
    const round = new QuestionRound(turn);
    this.phase = "question";
    this.render(round);
  }

  private answerQuestion(turn: QuestionTurn, correct: boolean): void {
    // Learning signal (#24): correctness per operation/topic/TP — never the
    // answer value, the picked choice, or how long the child thought.
    this.asked++;
    if (correct) this.answeredCorrect++;
    this.telemetry.emit("question_answered", {
      battle: this.wild.boss ? "boss" : "wild",
      operation: turn.question.operation,
      correct,
      ...(turn.question.topic !== undefined ? { topic: turn.question.topic } : {}),
      ...(turn.question.tp_level !== undefined ? { tp: turn.question.tp_level } : {}),
      ...(turn.step !== null ? { step: turn.stepIndex, steps: turn.stepCount } : {}),
    });
    if (!correct) {
      this.say([resultFeedback(turn, false)], () => this.wildAttack());
      return;
    }

    // The math is the reward: player XP accrues per correctly answered turn.
    this.earnedXp += playerXpForTurn(turn, this.state.playerLevel, this.wild.level);

    const messages = [resultFeedback(turn, true)];
    const base = rollDamage(this.state.active.attack);
    let damage: number;

    if (this.wild.boss) {
      this.bossIndex++;
      const problemDone = this.bossTurns !== null && this.bossIndex >= this.bossTurns.length;
      damage = problemDone ? base * BOSS_FINAL_BLOW_MULTIPLIER : base;
      if (problemDone) messages.push("Problem solved! A mighty blow!");
    } else {
      damage = correctAnswerDamage(base, turn.question.operation);
    }

    this.wild.takeDamage(damage);
    messages.push(`${this.state.active.name} attacks! ${damage} damage!`);
    this.say(messages, () => {
      if (this.wild.fainted) {
        this.say([`${this.wild.name} fainted!`], () => this.giveRewards());
      } else {
        this.wildAttack();
      }
    });
  }

  private wildAttack(): void {
    const damage = rollDamage(this.wild.attack);
    this.state.active.takeDamage(damage);
    this.say([`${this.wild.name} attacks back! ${damage} damage!`], () => {
      if (!this.state.active.fainted) {
        this.showMenu();
      } else if (this.state.benchedFighters().length > 0) {
        this.say([`${this.state.active.name} fainted…`], () => this.beginSwitch(true));
      } else {
        this.emitOutcome("defeated");
        this.say(
          [`${this.state.active.name} fainted…`, "All your friends are tired!", "You hurry home to rest."],
          this.actions.onRespawn,
        );
      }
    });
  }

  private giveRewards(): void {
    this.emitOutcome("won");
    // One computation feeds both the result card and the save (state
    // .toSave() on battle exit) — the displayed XP total IS the saved total.
    const award = this.state.awardPlayerXp(this.earnedXp);
    const prize = prizeMoney(this.wild.maxHp);
    this.state.money += prize;
    this.showResult(
      { title: "Victory! 胜利啦！", xpGain: this.earnedXp, prize, award },
      this.actions.onExit,
    );
  }

  private showResult(result: BattleResult, then: () => void): void {
    this.phase = "result";
    this.result = result;
    this.afterMessages = then;
    this.render();
  }

  private advanceResult(): void {
    const then = this.afterMessages;
    this.afterMessages = () => {};
    then();
  }

  private throwBall(): void {
    // A catch is never blocked by a full team (issue #3): the creature goes
    // to owned storage instead of being rejected, and a ball is only spent
    // on a real throw.
    if (this.state.bag.ball <= 0) {
      this.say(["No balls left! Buy more at the shop."], () => this.showMenu());
      return;
    }

    this.state.bag.ball--;
    this.say([`You throw a ball at ${this.wild.name}…`], () => {
      if (Math.random() < this.wild.catchChance) {
        const outcome = this.state.capture(this.wild);
        // Collection-variety signal (#24): which species join collections.
        this.telemetry.emit("creature_captured", { speciesId: this.wild.speciesId! });
        this.emitOutcome("captured");
        // Capture pays exactly the answered-question share of the battle's
        // XP (never full defeat XP for unanswered questions) and no prize
        // money — the new friend is the reward.
        const award = this.state.awardPlayerXp(this.earnedXp);
        const subtitle =
          outcome === "joined-team"
            ? `${this.wild.name} joined your team! 加入了队伍！`
            : `${this.wild.name} joined your collection! 加入了收藏！`;
        this.showResult(
          { title: "Gotcha! 收服啦！", subtitle, xpGain: this.earnedXp, prize: null, award },
          this.actions.onExit,
        );
      } else {
        this.say([`Oh no! ${this.wild.name} broke free!`], () => this.wildAttack());
      }
    });
  }

  private usePotion(): void {
    if (this.state.bag.potion <= 0) {
      this.say(["No potions left! Buy more at the shop."], () => this.showMenu());
      return;
    }
    if (this.state.active.hp >= this.state.active.maxHp) {
      this.say([`${this.state.active.name} already has full HP.`], () => this.showMenu());
      return;
    }
    this.state.bag.potion--;
    const healed = this.state.active.heal(POTION_HEAL);
    this.say([`Glug glug! ${this.state.active.name} healed ${healed} HP!`], () => this.wildAttack());
  }

  private runAway(): void {
    // Battle abandonment (#24): the healthy-stopping counterpart to wins.
    this.emitOutcome("fled");
    this.say(["Got away safely!"], this.actions.onExit);
  }

  // One terminal outcome per battle, guaranteed by the guard. The four
  // endings: won (giveRewards), captured (throwBall), fled (runAway),
  // defeated (all-fainted branch of wildAttack above).
  private emitOutcome(outcome: "won" | "captured" | "fled" | "defeated"): void {
    if (this.outcomeEmitted) return;
    this.outcomeEmitted = true;
    this.telemetry.emit("battle_outcome", {
      battle: this.wild.boss ? "boss" : "wild",
      outcome,
      asked: this.asked,
      correct: this.answeredCorrect,
    });
  }

  private beginSwitch(forced: boolean): void {
    this.phase = "switch";
    this.switchForced = forced;
    this.render();
  }

  private switchTo(index: number): void {
    const forced = this.switchForced;
    this.switchForced = false;
    this.state.switchTo(index);
    this.say([`Go, ${this.state.active.name}!`], () => {
      if (forced) this.showMenu();
      else this.wildAttack();
    });
  }

  private render(questionRound?: QuestionRound, orderingRound?: OrderingRound): void {
    destroyChildren(this.root);
    this.questionView = null;
    this.orderingView = null;
    this.drawBase();

    if (this.phase === "question" && orderingRound) {
      this.orderingView = new OrderingView(this.root, orderingRound, (correct) => {
        this.answerQuestion(orderingRound.turn, correct);
      });
      return;
    }

    if (this.phase === "question" && questionRound) {
      this.questionView = new QuestionView(this.root, questionRound, (_picked, correct) => {
        this.answerQuestion(questionRound.turn, correct);
      });
      return;
    }

    if (this.phase === "result") {
      // The result card replaces the message box entirely (M2A).
      this.renderResult();
      return;
    }

    const box = makePanel(this.root, 0, -250, 920, 122, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 14,
      lineWidth: 5,
    });

    if (this.phase === "message") this.renderMessage(box);
    else if (this.phase === "menu") this.renderMenu(box);
    else if (this.phase === "switch") this.renderSwitch(box);
  }

  private drawBase(): void {
    makeRect(this.root, 0, 0, 960, 640, new Color(174, 231, 255, 255));

    const wildPlatform = new Node("wild-platform");
    wildPlatform.parent = this.root;
    wildPlatform.setPosition(220, 20);
    const wg = wildPlatform.addComponent(Graphics);
    wg.fillColor = new Color(156, 204, 101, 255);
    wg.ellipse(0, 0, 130, 34);
    wg.fill();

    const playerPlatform = new Node("player-platform");
    playerPlatform.parent = this.root;
    playerPlatform.setPosition(-240, -105);
    const pg = playerPlatform.addComponent(Graphics);
    pg.fillColor = new Color(139, 195, 74, 255);
    pg.ellipse(0, 0, 150, 38);
    pg.fill();

    this.drawCreature(-240, -20, this.state.active, 65);
    this.drawCreature(220, 115, this.wild, 52);
    this.drawHpPanel(-310, 235, this.wild, false);
    this.drawHpPanel(300, -85, this.state.active, true);
  }

  private drawCreature(x: number, y: number, creature: Creature, size: number): void {
    const node = makeCreaturePortrait(this.root, creature, size);
    node.name = creature.name;
    node.setPosition(x, y);
  }

  private drawHpPanel(x: number, y: number, creature: Creature, showXp: boolean): void {
    const panel = makePanel(this.root, x, y, 270, 82, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      lineWidth: 4,
    });
    // Anchor the name to the panel's left padding and the level to the
    // right padding — center-anchored labels overflow the panel with long
    // names (e.g. "Boss Countasaur").
    makeLabel(panel, creature.name, -113, 23, { fontSize: 18, align: "left" });
    // The wild keeps its Lv tag: it feeds the level-gap XP modifier (and
    // bosses run higher). The player side drops it — owned-pet levels are
    // frozen under player-owned progression (M2A); the XP strip below shows
    // the PLAYER's progress instead.
    if (!showXp) makeLabel(panel, `Lv.${creature.level}`, 113, 23, { fontSize: 16, align: "right" });

    const fraction = Math.max(0, creature.hp / creature.maxHp);
    makeRect(panel, -25, -4, 176, 14, new Color(221, 221, 221, 255), 7);
    if (fraction > 0) {
      const color = fraction > 0.5 ? PALETTE.hpHigh : fraction > 0.25 ? PALETTE.hpMid : PALETTE.hpLow;
      const width = 176 * fraction;
      makeRect(panel, -113 + width / 2, -4, width, 14, color, 7);
    }
    makeLabel(panel, `${creature.hp}/${creature.maxHp}`, 90, -4, { fontSize: 15 });

    if (showXp) {
      // The battler's XP strip shows the PLAYER's progress to the next level
      // (player-owned progression, M2A) — the result card and the world HUD
      // bar read the same truth.
      const info = this.state.playerInfo;
      makeRect(panel, -25, -27, 176, 6, new Color(238, 238, 238, 255), 3);
      if (info.intoLevel > 0) {
        const width = 176 * Math.min(1, info.intoLevel / info.span);
        makeRect(panel, -113 + width / 2, -27, width, 6, PALETTE.xp, 3);
      }
    }
  }

  // The compact result card (M2A): earned XP, prize (victory only), level
  // progress, and the level-up state — one glanceable panel, one advance.
  private renderResult(): void {
    const result = this.result;
    if (!result) return;
    const panel = makePanel(this.root, 0, 30, 440, 236, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 16,
      lineWidth: 5,
    });
    makeLabel(panel, result.title, 0, 92, { fontSize: 26 });

    let rowY = 58;
    if (result.subtitle) {
      makeLabel(panel, result.subtitle, 0, rowY, { fontSize: 15, color: PALETTE.sub });
      rowY -= 26;
    }

    const xpText = makeLabel(panel, `+${result.xpGain} XP`, result.prize === null ? 0 : -70, rowY, {
      fontSize: 21,
    });
    xpText.color = PALETTE.xp;
    if (result.prize !== null) {
      makeLabel(panel, `+RM ${fmtNum(result.prize)}`, 78, rowY, { fontSize: 21 });
    }
    rowY -= 40;

    // Level progress AFTER the award: Lv tag, bar, and into/span numbers —
    // the same truth the world HUD bar shows.
    const { after } = result.award;
    makeLabel(panel, `Lv ${after.level}`, -184, rowY, { fontSize: 15, align: "left" });
    makeRect(panel, -10, rowY, 240, 12, new Color(221, 221, 221, 255), 6);
    if (after.intoLevel > 0) {
      const width = 240 * Math.min(1, after.intoLevel / after.span);
      makeRect(panel, -130 + width / 2, rowY, width, 12, PALETTE.xp, 6);
    }
    makeLabel(panel, `${after.intoLevel}/${after.span}`, 184, rowY, {
      fontSize: 13,
      color: PALETTE.sub,
      align: "right",
    });
    rowY -= 34;

    if (result.award.levelsGained > 0) {
      const levelUp = makeLabel(
        panel,
        `LEVEL UP! 升级啦！ Lv ${result.award.before.level} → ${after.level}`,
        0,
        rowY,
        { fontSize: 18 },
      );
      levelUp.color = new Color(255, 167, 38, 255);
    }

    makeLabel(panel, "▼", 0, -98, { fontSize: 20, color: PALETTE.sub });
    panel.on(Node.EventType.TOUCH_END, () => this.advanceResult());
  }

  private renderMessage(box: Node): void {
    makeWrappedLabel(box, this.messages[0] ?? "", 0, 5, 840, 72, { fontSize: 24, lineHeight: 30 });
    makeLabel(box, "▼", 415, -38, { fontSize: 22, color: PALETTE.sub });
    box.on(Node.EventType.TOUCH_END, () => this.advanceMessage());
  }

  private renderMenu(box: Node): void {
    makeLabel(box, `What will ${this.state.active.name} do?`, 0, 34, { fontSize: 21 });
    const actions: Array<{
      label: string;
      color: Color;
      action: () => void;
      disabled?: boolean;
      item?: ItemIconKind;
    }> = [];
    if (this.state.benchedFighters().length > 0) {
      actions.push({ label: "Switch", color: new Color(141, 110, 99, 255), action: () => this.beginSwitch(false) });
    }
    actions.push({ label: "Attack", color: PALETTE.actionBlue, action: () => this.playerAttack() });
    // Grayed out when out of balls, but still tappable: throwBall()'s own
    // guard explains where to buy more — same message the C key gets.
    actions.push({
      label: `Ball ×${this.state.bag.ball}`,
      color: new Color(171, 71, 188, 255),
      action: () => this.throwBall(),
      disabled: this.state.bag.ball <= 0,
      item: "ball",
    });
    actions.push({
      label: `Potion ×${this.state.bag.potion}`,
      color: new Color(38, 166, 154, 255),
      action: () => this.usePotion(),
      disabled: this.state.bag.potion <= 0 || this.state.active.hp >= this.state.active.maxHp,
      item: "potion",
    });
    actions.push({ label: "Run", color: new Color(255, 138, 101, 255), action: () => this.runAway() });

    const w = 128;
    const gap = 8;
    const total = actions.length * w + (actions.length - 1) * gap;
    actions.forEach((action, i) => {
      const button = makeButton(box, {
        x: -total / 2 + w / 2 + i * (w + gap),
        y: -25,
        w,
        h: 50,
        label: action.label,
        color: action.color,
        fontSize: action.item ? 16 : 19,
        onTap: action.action,
        disabled: action.disabled,
      });
      if (action.item) {
        const label = button.getComponentInChildren(Label);
        label?.node.setPosition(11, 0);
        const icon = new Node(`${action.item}-icon`);
        icon.parent = button;
        icon.setPosition(-48, 0);
        paintItemIcon(icon.addComponent(Graphics), action.item, 22);
      }
    });
  }

  private renderSwitch(box: Node): void {
    makeLabel(box, "Who will fight?", 0, 34, { fontSize: 21 });
    const fighters = this.state.team
      .map((creature, index) => ({ creature, index }))
      .filter(({ creature, index }) => index !== this.state.activeIndex && !creature.fainted);

    const buttons = fighters.map(({ creature, index }) => ({
      label: creature.name.length > 12 ? `${creature.name.slice(0, 11)}…` : creature.name,
      color: colorFromHex(creature.color),
      action: () => this.switchTo(index),
    }));
    if (!this.switchForced) {
      buttons.push({ label: "Back", color: new Color(144, 164, 174, 255), action: () => this.showMenu() });
    }

    const w = 160;
    const gap = 10;
    const total = buttons.length * w + (buttons.length - 1) * gap;
    buttons.forEach((button, i) => {
      makeButton(box, {
        x: -total / 2 + w / 2 + i * (w + gap),
        y: -25,
        w,
        h: 50,
        label: button.label,
        color: button.color,
        fontSize: 17,
        onTap: button.action,
      });
    });
  }
}
