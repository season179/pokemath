// Battle screen and turn-flow state machine. Rendering/input live here;
// creature math and question judgement stay in the pure shared domain.

import { Color, EventKeyboard, Graphics, KeyCode, Label, Node, Sprite, Vec3, tween } from "cc";
import {
  BOSS_FINAL_BLOW_MULTIPLIER,
  POTION_HEAL,
  Creature,
  OrderingRound,
  QuestionBank,
  QuestionRound,
  QuestionTurn,
  correctAnswerDamage,
  createUniqueHunt,
  formatPlayerLevel,
  formatPlayerProgress,
  formatPlayerXpGain,
  isOrdering,
  playerXpForTurn,
  prizeMoney,
  resultFeedback,
  rollDamage,
  settleUniqueQuestion,
  turnsOf,
  type PlayerXpAward,
  type SpeciesRarity,
  type UniqueHuntState,
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

type Phase = "message" | "menu" | "question" | "switch" | "result" | "fx";

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

export type BattleOutcome = "won" | "captured" | "fled" | "escaped" | "defeated";

export interface BattleActions {
  onExit: () => void;
  onRespawn: () => void;
  // Region arcs (M5): the single terminal outcome, reported once per battle
  // so the shell can count arc progress (e.g. Ticktock wins, #19).
  onOutcome?: (outcome: BattleOutcome) => void;
}

/** Species rules for this battle (resolved by GameApp's registry lookup). */
export interface BattleOptions {
  /** `guardian` is Meadow's authored Unique; every other rarity stays calm. */
  rarity?: SpeciesRarity;
  /**
   * Serve the bank in authored id order, never random (#23 guardian slate).
   * Each Attack advance consumes the next question; after the last item the
   * slate wraps so a long Unique hunt never runs dry.
   */
  fixedOrder?: boolean;
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
  /** Next index into a fixedOrder bank (guardian slate, #23). */
  private slateIndex = 0;
  private switchForced = false;
  // Null for every ordinary rarity. Unique pressure is battle-local: time
  // never changes it, only a submitted question does.
  private uniqueHunt: UniqueHuntState | null = null;
  // Per-battle question tallies for the battle_outcome event (#24).
  private asked = 0;
  private answeredCorrect = 0;
  private outcomeEmitted = false;
  // Stable only until the next render. FX hide these freshly drawn portraits
  // while matching transient overlays move above them.
  private playerPortrait: Node | null = null;
  private wildPortrait: Node | null = null;

  constructor(
    private state: GameState,
    readonly wild: Creature,
    private bank: QuestionBank,
    private actions: BattleActions,
    private telemetry: TelemetrySink = NULL_SINK,
    private options: BattleOptions = {},
  ) {
    this.uniqueHunt = createUniqueHunt(options.rarity ?? "common");
    const intro = this.uniqueHunt
      ? [
          `${wild.name} is curious, but may fly away after ${this.uniqueHunt.actionsLeft} questions. Earn ${this.uniqueHunt.trustMax} trust to befriend it! 天马很好奇，但答完 ${this.uniqueHunt.actionsLeft} 题后可能飞走。获得 ${this.uniqueHunt.trustMax} 点信任吧！`,
        ]
      : [`A wild ${wild.name} appeared!`];
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
    if (this.options.fixedOrder) {
      // Fixed guardian slate (#23): authored order, one item per Attack.
      const questions = this.bank.questions;
      if (questions.length === 0) throw new Error("BattleScreen: fixedOrder bank is empty");
      const question = questions[this.slateIndex % questions.length];
      this.slateIndex += 1;
      turn = turnsOf(question)[0];
    } else if (this.wild.boss) {
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

    // Unique pressure (#22): only a submitted answer spends a flee action,
    // never wall-clock thinking. Trust is flat friendship, not mastery.
    if (this.uniqueHunt) {
      const settled = settleUniqueQuestion(this.uniqueHunt, correct);
      this.uniqueHunt = settled.state;
      if (correct) {
        this.earnedXp += playerXpForTurn(turn, this.state.playerLevel, this.wild.level);
      }
      const messages = [resultFeedback(turn, correct)];
      if (correct) {
        messages.push(
          `Trust ${this.uniqueHunt.trust}/${this.uniqueHunt.trustMax} · ${this.uniqueHunt.actionsLeft} questions left. 信任 ${this.uniqueHunt.trust}/${this.uniqueHunt.trustMax} · 还剩 ${this.uniqueHunt.actionsLeft} 题。`,
        );
      } else {
        messages.push(
          `Still shy… ${this.uniqueHunt.actionsLeft} questions left. 还在害羞……还剩 ${this.uniqueHunt.actionsLeft} 题。`,
        );
      }
      this.say(messages, () => {
        if (settled.outcome === "captured") this.finishTrustCapture();
        else if (settled.outcome === "escaped") this.uniqueEscapes();
        else this.showMenu();
      });
      return;
    }

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

    messages.push(`${this.state.active.name} attacks! ${damage} damage!`);
    this.playAttackFx(this.state.active, this.wild, damage, () => {
      this.say(messages, () => {
        if (this.wild.fainted) {
          this.playFaintFx(this.wild, () => {
            this.say([`${this.wild.name} fainted!`], () => this.giveRewards());
          });
        } else {
          this.wildAttack();
        }
      });
    });
  }

  private wildAttack(): void {
    const damage = rollDamage(this.wild.attack);
    this.playAttackFx(this.wild, this.state.active, damage, () => {
      this.say([`${this.wild.name} attacks back! ${damage} damage!`], () => {
        if (!this.state.active.fainted) {
          this.showMenu();
        } else {
          this.playFaintFx(this.state.active, () => {
            if (this.state.benchedFighters().length > 0) {
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
      });
    });
  }

  private beginFx(): void {
    this.phase = "fx";
    // Clear the question/dialog controls and redraw a quiet arena. The stage
    // remains disposable: the next say()/showMenu() still rebuilds it.
    this.render();
  }

  private makeCreatureFx(creature: Creature): { node: Node; base: Node | null } {
    const playerSide = creature === this.state.active;
    const x = playerSide ? -240 : 220;
    const y = playerSide ? -20 : 115;
    const size = playerSide ? 65 : 52;
    const stage = playerSide ? this.state.activeStage : 1;
    const base = playerSide ? this.playerPortrait : this.wildPortrait;
    const node = makeCreaturePortrait(this.root, { ...creature, stage }, size);
    node.name = `${creature.name}-fx`;
    node.setPosition(x, y);
    if (base?.isValid) base.active = false;
    return { node, base };
  }

  private finishCreatureFx(fx: { node: Node; base: Node | null }): void {
    if (fx.base?.isValid) fx.base.active = true;
    if (fx.node.isValid) fx.node.destroy();
  }

  /** Lunge home first, apply model damage, then play the defender feedback. */
  private playAttackFx(attacker: Creature, defender: Creature, damage: number, onDone: () => void): void {
    this.beginFx();
    const fx = this.makeCreatureFx(attacker);
    const home = fx.node.position.clone();
    const playerSide = attacker === this.state.active;
    const reach = new Vec3(playerSide ? 70 : -70, playerSide ? 20 : -20, 0);

    tween(fx.node)
      .to(0.1, { position: home.clone().add(reach) }, { easing: "quadOut" })
      .to(0.13, { position: home }, { easing: "quadIn" })
      .call(() => {
        this.finishCreatureFx(fx);
        defender.takeDamage(damage);
        this.playHitFx(defender, damage, onDone);
      })
      .start();
  }

  /** Small shake + warm flash + floating damage number on transient nodes. */
  private playHitFx(defender: Creature, damage: number, onDone: () => void): void {
    const fx = this.makeCreatureFx(defender);
    const playerSide = defender === this.state.active;
    const popup = makeLabel(
      this.root,
      `-${damage}`,
      playerSide ? -240 : 220,
      playerSide ? 58 : 185,
      { fontSize: 28, color: PALETTE.hpMid, name: "damage-popup" },
    );
    const popupColor = popup.color;

    // A cream flash reads as impact without the alarm of a red-screen hit.
    const flash = new Color(255, 244, 179, 255);
    const sprite = fx.node.getComponent(Sprite);
    if (sprite) {
      const original = new Color(sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a);
      tween(sprite)
        .to(0.06, { color: flash })
        .to(0.06, { color: original })
        .union()
        .repeat(2)
        .start();
    } else if (fx.node.getComponent(Graphics)) {
      // Graphics bakes fill colors into its mesh, and paintCreature finishes
      // on the pupil color. A tiny pulse is the reliable blob-art fallback.
      tween(fx.node)
        .to(0.06, { scale: new Vec3(1.06, 1.06, 1) })
        .to(0.06, { scale: new Vec3(1, 1, 1) })
        .union()
        .repeat(2)
        .start();
    }

    tween(popup.node)
      .by(0.3, { position: new Vec3(0, 42, 0) }, { easing: "quadOut" })
      .call(() => popup.node.destroy())
      .start();
    tween(popup)
      .delay(0.12)
      .to(0.18, { color: new Color(popupColor.r, popupColor.g, popupColor.b, 0) })
      .start();

    tween(fx.node)
      .by(0.04, { position: new Vec3(5, 0, 0) })
      .by(0.04, { position: new Vec3(-5, 0, 0) })
      .union()
      .repeat(3)
      .delay(0.1)
      .call(() => {
        this.finishCreatureFx(fx);
        onDone();
      })
      .start();
  }

  private playFaintFx(creature: Creature, onDone: () => void): void {
    this.beginFx();
    const fx = this.makeCreatureFx(creature);
    const sprite = fx.node.getComponent(Sprite);
    if (sprite) {
      const color = sprite.color;
      tween(sprite)
        .to(0.55, { color: new Color(color.r, color.g, color.b, 0) })
        .start();
    }

    tween(fx.node)
      .by(0.3, { position: new Vec3(0, -40, 0) }, { easing: "quadIn" })
      .to(0.3, { scale: new Vec3(0.6, 0.6, 1) }, { easing: "quadIn" })
      .call(() => {
        this.finishCreatureFx(fx);
        onDone();
      })
      .start();
  }

  private playCaptureBallFx(onDone: () => void): void {
    this.beginFx();
    const ball = new Node("capture-ball-fx");
    ball.parent = this.root;
    ball.setPosition(-210, 5);
    paintItemIcon(ball.addComponent(Graphics), "ball", 30);

    tween(ball)
      .to(0.18, { position: new Vec3(0, 210, 0) }, { easing: "quadOut" })
      .to(0.18, { position: new Vec3(220, 115, 0) }, { easing: "quadIn" })
      .call(() => this.playCaptureContactShake())
      .delay(0.12)
      .to(0.18, { scale: new Vec3(0, 0, 1) }, { easing: "quadIn" })
      .call(() => {
        ball.destroy();
        onDone();
      })
      .start();
  }

  private playCaptureContactShake(): void {
    const fx = this.makeCreatureFx(this.wild);
    tween(fx.node)
      .by(0.04, { position: new Vec3(4, 0, 0) })
      .by(0.04, { position: new Vec3(-4, 0, 0) })
      .union()
      .repeat(3)
      .call(() => this.finishCreatureFx(fx))
      .start();
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
    // Unique hunt (#22): ordinary balls never hold a Unique. The refusal
    // spends neither a ball nor a flee action — trust is the only path.
    if (this.uniqueHunt) {
      this.say(
        [
          `The ball melts into mist — ${this.wild.name} only follows a friend it trusts. 精灵球化成了雾——天马只跟随信任的朋友。`,
        ],
        () => this.showMenu(),
      );
      return;
    }
    // A catch is never blocked by a full team (issue #3): the creature goes
    // to owned storage instead of being rejected, and a ball is only spent
    // on a real throw.
    if (this.state.bag.ball <= 0) {
      this.say(["No balls left! Buy more at the shop."], () => this.showMenu());
      return;
    }

    this.state.bag.ball--;
    this.say([`You throw a ball at ${this.wild.name}…`], () => {
      this.playCaptureBallFx(() => {
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
    // Unique hunts have no combat math: only a submitted answer moves the
    // pressure state. Healing is free bookkeeping, never a counter-attack.
    this.say([`Glug glug! ${this.state.active.name} healed ${healed} HP!`], () => {
      if (this.uniqueHunt) this.showMenu();
      else this.wildAttack();
    });
  }

  private runAway(): void {
    // Battle abandonment (#24): the healthy-stopping counterpart to wins.
    // On a Unique hunt this is the player's choice; the guardian's own
    // departure uses uniqueEscapes() → "escaped".
    this.emitOutcome("fled");
    this.say(["Got away safely!"], this.actions.onExit);
  }

  /** Full trust: the Unique joins without a ball, for the answered XP only. */
  private finishTrustCapture(): void {
    const outcome = this.state.capture(this.wild);
    this.telemetry.emit("creature_captured", { speciesId: this.wild.speciesId! });
    this.emitOutcome("captured");
    const award = this.state.awardPlayerXp(this.earnedXp);
    const subtitle =
      outcome === "joined-team"
        ? `${this.wild.name} trusts you and joined your team! 信任你了，加入了队伍！`
        : `${this.wild.name} trusts you and joined your collection! 信任你了，加入了收藏！`;
    this.showResult(
      { title: "A new friend! 新朋友！", subtitle, xpGain: this.earnedXp, prize: null, award },
      this.actions.onExit,
    );
  }

  /**
   * The Unique flies off with trust unfinished. XP for the questions already
   * answered still lands — the child is never punished for a fair escape —
   * and trail progress is preserved by the waiting second-chance critter.
   */
  private uniqueEscapes(): void {
    this.emitOutcome("escaped");
    const award = this.state.awardPlayerXp(this.earnedXp);
    this.showResult(
      {
        title: `${this.wild.name} flew away! 飞走了！`,
        subtitle: "It will wait among the stones. 它会在石阵等你。",
        xpGain: this.earnedXp,
        prize: null,
        award,
      },
      this.actions.onExit,
    );
  }

  // One terminal outcome per battle, guaranteed by the guard. The five
  // endings: won (giveRewards), captured (throwBall / trust), fled (runAway),
  // escaped (Unique flew off), defeated (all-fainted branch of wildAttack).
  private emitOutcome(outcome: BattleOutcome): void {
    if (this.outcomeEmitted) return;
    this.outcomeEmitted = true;
    this.telemetry.emit("battle_outcome", {
      battle: this.wild.boss ? "boss" : "wild",
      outcome,
      asked: this.asked,
      correct: this.answeredCorrect,
    });
    this.actions.onOutcome?.(outcome);
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
      // Unique hunts never counter-attack; forced ordinary switches also skip
      // the free hit so a fainted-lead swap isn't punished twice.
      if (forced || this.uniqueHunt) this.showMenu();
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

    // FX own the disposable arena until their .call() resumes the turn.
    if (this.phase === "fx") return;

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

    this.playerPortrait = this.drawCreature(-240, -20, this.state.active, 65);
    this.wildPortrait = this.drawCreature(220, 115, this.wild, 52);
    this.drawHpPanel(-310, 235, this.wild, false);
    this.drawHpPanel(300, -85, this.state.active, true);
    if (this.uniqueHunt) this.drawUniquePressure();
  }

  /**
   * Telegraphed Unique pressure (#22): remaining questions and trust, always
   * visible before the next commitment. No wall-clock is involved.
   */
  private drawUniquePressure(): void {
    const hunt = this.uniqueHunt;
    if (!hunt) return;
    const panel = makePanel(this.root, 0, 250, 360, 54, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 12,
      lineWidth: 3,
    });
    makeLabel(panel, `Questions left ${hunt.actionsLeft} · 还剩 ${hunt.actionsLeft} 题`, 0, 12, {
      fontSize: 15,
    });
    makeLabel(panel, `Trust ${hunt.trust}/${hunt.trustMax} · 信任`, -120, -10, {
      fontSize: 14,
      color: PALETTE.sub,
      align: "left",
    });
    makeRect(panel, 20, -10, 180, 10, new Color(221, 221, 221, 255), 5);
    if (hunt.trust > 0) {
      const width = 180 * (hunt.trust / hunt.trustMax);
      makeRect(panel, -70 + width / 2, -10, width, 10, new Color(129, 199, 132, 255), 5);
    }
  }

  private drawCreature(x: number, y: number, creature: Creature, size: number): Node {
    const stage = creature === this.state.active ? this.state.activeStage : 1;
    const node = makeCreaturePortrait(this.root, { ...creature, stage }, size);
    node.name = creature.name;
    node.setPosition(x, y);
    return node;
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

    const xpText = makeLabel(panel, formatPlayerXpGain(result.xpGain), result.prize === null ? 0 : -70, rowY, {
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
    makeLabel(panel, formatPlayerLevel(after), -184, rowY, { fontSize: 15, align: "left" });
    makeRect(panel, -10, rowY, 240, 12, new Color(221, 221, 221, 255), 6);
    if (after.intoLevel > 0) {
      const width = 240 * Math.min(1, after.intoLevel / after.span);
      makeRect(panel, -130 + width / 2, rowY, width, 12, PALETTE.xp, 6);
    }
    makeLabel(panel, formatPlayerProgress(after), 184, rowY, {
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
