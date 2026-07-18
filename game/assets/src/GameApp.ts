// GameApp: the shell. Owns the game state, routes input, and swaps screens
// (world / battle / shop) under the single cc.Scene. Screens are plain TS
// classes, not cc.Scene assets — see ROADMAP Phase 1.

import { EventKeyboard, Input, KeyCode, Node, input, view } from "cc";
import { Creature, QuestionBank, SAMPLE_BANK, type SaveState } from "../shared/index";
import { NameScreen } from "./NameScreen";
import { Persistence } from "./persistence";
import { BattleScreen } from "./battle/BattleScreen";
import { ShopScreen } from "./shop/ShopScreen";
import { GameState } from "./state";
import { Direction } from "./world/map-data";
import { WorldScreen } from "./world/WorldScreen";
import { PALETTE, makeButton, makeLabel } from "./ui";

type Screen = "world" | "battle" | "shop";

const KEY_DIRS: Partial<Record<KeyCode, Direction>> = {
  [KeyCode.ARROW_UP]: "up",
  [KeyCode.KEY_W]: "up",
  [KeyCode.ARROW_DOWN]: "down",
  [KeyCode.KEY_S]: "down",
  [KeyCode.ARROW_LEFT]: "left",
  [KeyCode.KEY_A]: "left",
  [KeyCode.ARROW_RIGHT]: "right",
  [KeyCode.KEY_D]: "right",
};

export class GameApp {
  private state: GameState;
  private bank = new QuestionBank(SAMPLE_BANK);
  private screen: Screen = "world";
  private world: WorldScreen;
  private battle: BattleScreen | null = null;
  private shop: ShopScreen | null = null;
  private dpad: Node | null = null;
  private nameLabel: Node | null = null;
  private nameScreen: NameScreen | null = null;

  constructor(
    private canvasNode: Node,
    boot: SaveState,
    private persistence: Persistence,
    private playerName: string,
  ) {
    this.state = new GameState(boot);
    this.world = new WorldScreen(this.state, {
      onShop: () => this.startShop(),
    });
    this.canvasNode.addChild(this.world.root);
  }

  start() {
    this.enableCanvasKeyboardFocus();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    this.buildDpad();
    this.showPlayerName();
  }

  update(dt: number) {
    if (this.screen === "world") this.world.update(dt);
  }

  // Kept ready for Meadow Isle: Harbor Town intentionally has no encounter
  // trigger, so battles are unreachable until the ferry route lands.
  private startBattle(wild: Creature): void {
    this.screen = "battle";
    this.world.root.active = false;
    if (this.dpad) this.dpad.active = false;
    this.battle = new BattleScreen(this.state, wild, this.bank, {
      onExit: () => this.endBattle(false),
      onRespawn: () => this.endBattle(true),
    });
    this.canvasNode.addChild(this.battle.root);
  }

  private endBattle(respawn: boolean): void {
    this.battle?.root.destroy();
    this.battle = null;
    this.returnToWorld(respawn);
    this.persistence.checkpoint(this.state.toSave());
  }

  private startShop(): void {
    this.screen = "shop";
    this.world.root.active = false;
    if (this.dpad) this.dpad.active = false;
    this.shop = new ShopScreen(this.state, () => this.endShop());
    this.canvasNode.addChild(this.shop.root);
  }

  private endShop(): void {
    this.shop?.root.destroy();
    this.shop = null;
    this.returnToWorld(false);
    this.persistence.checkpoint(this.state.toSave());
  }

  private returnToWorld(respawn: boolean): void {
    this.screen = "world";
    this.world.root.active = true;
    if (this.dpad) this.dpad.active = true;
    if (respawn) this.world.respawnHome();
    else this.world.refreshHud();
  }

  // Cocos 3.8's web keyboard source listens on #GameCanvas (not window).
  // Canvas is not keyboard-focusable by default, so physical keys vanish
  // unless we opt it in and focus it. Re-focus after every pointer press;
  // release held directions on blur so a missed keyup cannot cause drift.
  private enableCanvasKeyboardFocus() {
    if (typeof document === "undefined") return;
    const canvas = document.getElementById("GameCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    const focus = () => canvas.focus({ preventScroll: true });
    canvas.addEventListener("pointerdown", focus);
    canvas.addEventListener("blur", () => this.world.releaseAll());
    focus();
  }

  // Player name in the bottom-right corner — whose adventure this is.
  // Tapping it opens the name screen (names are changeable anytime).
  private showPlayerName() {
    this.nameLabel?.destroy();
    const size = view.getDesignResolutionSize();
    const label = makeLabel(
      this.world.root,
      this.playerName,
      size.width / 2 - 24,
      -size.height / 2 + 20,
      { fontSize: 14, align: "right" },
    );
    this.nameLabel = label.node;
    label.node.on(Node.EventType.TOUCH_END, () => this.openNameScreen());
  }

  private openNameScreen() {
    if (this.screen !== "world" || this.nameScreen) return;
    this.world.releaseAll();
    this.nameScreen = new NameScreen(this.persistence, this.playerName, (name) => {
      this.playerName = name;
      this.nameScreen?.root.destroy();
      this.nameScreen = null;
      this.showPlayerName();
    });
    this.canvasNode.addChild(this.nameScreen.root);
  }

  // --- keyboard ---
  private onKeyDown(e: EventKeyboard) {
    if (this.screen === "battle") {
      this.battle?.handleKeyDown(e);
      return;
    }
    if (this.screen === "shop") {
      this.shop?.handleKeyDown(e);
      return;
    }

    const dir = KEY_DIRS[e.keyCode];
    if (dir && this.screen === "world") this.world.pressDir(dir);
    else if ((e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) && this.screen === "world") {
      this.world.tap();
    }
  }

  private onKeyUp(e: EventKeyboard) {
    const dir = KEY_DIRS[e.keyCode];
    if (dir && this.screen === "world") this.world.releaseDir(dir);
  }

  // --- touch d-pad (bottom-left), for iPad play ---
  private buildDpad() {
    this.dpad = new Node("dpad");
    this.canvasNode.addChild(this.dpad);
    const size = view.getDesignResolutionSize();
    const cx = -size.width / 2 + 110;
    const cy = -size.height / 2 + 110;
    const gap = 56;
    const mk = (dir: Direction, x: number, y: number, glyph: string) => {
      const b = makeButton(this.dpad!, {
        x: cx + x,
        y: cy + y,
        w: 52,
        h: 52,
        label: glyph,
        color: PALETTE.actionBlue,
        fontSize: 26,
      });
      b.on(Node.EventType.TOUCH_START, () => this.world.pressDir(dir));
      b.on(Node.EventType.TOUCH_END, () => {
        this.world.releaseDir(dir);
        this.world.tap();
      });
      b.on(Node.EventType.TOUCH_CANCEL, () => this.world.releaseDir(dir));
    };
    mk("up", 0, gap, "▲");
    mk("down", 0, -gap, "▼");
    mk("left", -gap, 0, "◀");
    mk("right", gap, 0, "▶");
  }
}
