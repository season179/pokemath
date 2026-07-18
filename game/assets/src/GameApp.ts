// GameApp: the shell. Owns the game state, routes input, and swaps screens
// (world / overlays / battle / shop) under the single cc.Scene. Screens are plain TS
// classes, not cc.Scene assets — see ROADMAP Phase 1.

import { EventKeyboard, Input, KeyCode, Node, input, view } from "cc";
import { Creature, QuestionBank, SAMPLE_BANK, type SaveState } from "../shared/index";
import { NameScreen } from "./NameScreen";
import { Persistence } from "./persistence";
import { BattleScreen } from "./battle/BattleScreen";
import { BagScreen } from "./bag/BagScreen";
import { PartyScreen } from "./party/PartyScreen";
import { ShopScreen } from "./shop/ShopScreen";
import { GameState } from "./state";
import { Direction, isEncounterRegion, isOpenRegion } from "./world/regions/index";
import { WorldScreen, WorldActions } from "./world/WorldScreen";
import { PALETTE, makeButton, makeLabel } from "./ui";

type Screen = "world" | "party" | "bag" | "battle" | "shop";

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
  private party: PartyScreen | null = null;
  private bag: BagScreen | null = null;
  private battle: BattleScreen | null = null;
  private shop: ShopScreen | null = null;
  private dpad: Node | null = null;
  private nameLabel: Node | null = null;
  private nameScreen: NameScreen | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasFocusHandler: (() => void) | null = null;
  private canvasBlurHandler: (() => void) | null = null;

  constructor(
    private canvasNode: Node,
    boot: SaveState,
    private persistence: Persistence,
    private playerName: string,
  ) {
    this.state = new GameState(boot);
    this.world = new WorldScreen(this.state, this.worldActions);
    this.canvasNode.addChild(this.world.root);
  }

  private readonly worldActions: WorldActions = {
    onShop: () => this.startShop(),
    onParty: () => this.startParty(),
    onBag: () => this.startBag(),
    onTravel: (regionId, gateway) => this.travel(regionId, gateway),
  };

  // Swap the world to another region, arriving through the named gateway.
  // The d-pad and player name are rebuilt so they stay above the new world.
  private travel(regionId: string, gateway: string | null): void {
    // Defense-in-depth for the preview seal (#29): gateway arrival already
    // refuses sealed targets with a notice (canTraverseGateway), and the
    // region tests prove no NPC offer targets a sealed region either. This
    // guard is the last line at the single region-entry choke point — never
    // enter a region that isn't open yet, no matter which caller gets here.
    if (!isOpenRegion(regionId)) {
      console.warn(`Refusing travel to sealed region: ${regionId}`);
      return;
    }
    this.world.releaseAll();
    this.world.root.destroy();
    this.world = new WorldScreen(this.state, this.worldActions, regionId, gateway);
    this.canvasNode.addChild(this.world.root);
    this.buildDpad();
    this.showPlayerName();
    this.screen = "world";
  }

  start() {
    this.enableCanvasKeyboardFocus();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    view.on("canvas-resize", this.onViewResize, this);
    view.on("design-resolution-changed", this.onViewResize, this);
    this.buildDpad();
    this.showPlayerName();
  }

  destroy() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    view.off("canvas-resize", this.onViewResize, this);
    view.off("design-resolution-changed", this.onViewResize, this);
    if (this.canvasElement && this.canvasFocusHandler) {
      this.canvasElement.removeEventListener("pointerdown", this.canvasFocusHandler);
    }
    if (this.canvasElement && this.canvasBlurHandler) {
      this.canvasElement.removeEventListener("blur", this.canvasBlurHandler);
    }
    this.canvasElement = null;
    this.canvasFocusHandler = null;
    this.canvasBlurHandler = null;
    this.world.releaseAll();
  }

  update(dt: number) {
    if (this.screen === "world") this.world.update(dt);
  }

  // Battles stay unreachable until Meadow Isle's encounter grass lands in
  // #8 — regions have no encounter trigger yet. Until then this guard is pure
  // defense-in-depth: a battle can never start outside a preview encounter
  // region (Woolly), so Meadow Dock stays transit-only and sealed areas stay
  // empty no matter how a future trigger gets wired (issue #29).
  private startBattle(wild: Creature): void {
    if (!isEncounterRegion(this.world.regionId)) {
      console.warn(`Refusing battle in non-encounter region: ${this.world.regionId}`);
      return;
    }
    this.screen = "battle";
    this.hideWorld();
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
    this.hideWorld();
    this.shop = new ShopScreen(this.state, () => this.endShop());
    this.canvasNode.addChild(this.shop.root);
  }

  private startParty(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "party";
    this.hideWorld();
    this.party = new PartyScreen(this.state, {
      onBack: () => this.endParty(),
      onSwitch: () => {
        this.world.refreshHud();
        this.persistence.checkpoint(this.state.toSave());
      },
    });
    this.canvasNode.addChild(this.party.root);
  }

  private endParty(): void {
    this.party?.root.destroy();
    this.party = null;
    this.returnToWorld(false);
  }

  private startBag(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "bag";
    this.hideWorld();
    this.bag = new BagScreen(this.state, () => this.endBag());
    this.canvasNode.addChild(this.bag.root);
  }

  private endBag(): void {
    this.bag?.root.destroy();
    this.bag = null;
    this.returnToWorld(false);
  }

  private hideWorld(): void {
    this.world.releaseAll();
    this.world.root.active = false;
    if (this.dpad) this.dpad.active = false;
  }

  private endShop(): void {
    this.shop?.root.destroy();
    this.shop = null;
    this.returnToWorld(false);
    this.persistence.checkpoint(this.state.toSave());
  }

  private returnToWorld(respawn: boolean): void {
    this.screen = "world";
    if (respawn && this.world.regionId !== "harbor") this.travel("harbor", null);
    this.world.root.active = true;
    if (this.dpad) this.dpad.active = true;
    if (respawn) this.world.respawnHome();
    else this.world.refreshHud();
  }

  private onViewResize() {
    this.world.refreshLayout();
    this.buildDpad();
    this.showPlayerName();
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
    const release = () => this.world.releaseAll();
    this.canvasElement = canvas;
    this.canvasFocusHandler = focus;
    this.canvasBlurHandler = release;
    canvas.addEventListener("pointerdown", focus);
    canvas.addEventListener("blur", release);
    focus();
  }

  // Player name in the bottom-right corner — whose adventure this is.
  // Tapping it opens the name screen (names are changeable anytime).
  private showPlayerName() {
    if (this.nameLabel?.isValid) this.nameLabel.destroy();
    this.nameLabel = null;
    const size = view.getVisibleSize();
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
    if (this.screen === "party") {
      this.party?.handleKeyDown(e);
      return;
    }
    if (this.screen === "bag") {
      this.bag?.handleKeyDown(e);
      return;
    }
    if (this.screen === "battle") {
      this.battle?.handleKeyDown(e);
      return;
    }
    if (this.screen === "shop") {
      this.shop?.handleKeyDown(e);
      return;
    }

    const dir = KEY_DIRS[e.keyCode];
    if (e.keyCode === KeyCode.KEY_P && this.screen === "world") this.startParty();
    else if (e.keyCode === KeyCode.KEY_B && this.screen === "world") this.startBag();
    else if (dir && this.screen === "world") this.world.pressDir(dir);
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
    this.world.releaseAll();
    this.dpad?.destroy();
    this.dpad = new Node("dpad");
    this.canvasNode.addChild(this.dpad);
    this.dpad.active = this.screen === "world";
    const size = view.getVisibleSize();
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
      // Release only stops movement. Dialog dismissal/travel choices live on
      // the banner and its own buttons — a d-pad release must never confirm
      // whatever a bump just opened.
      b.on(Node.EventType.TOUCH_END, () => this.world.releaseDir(dir));
      b.on(Node.EventType.TOUCH_CANCEL, () => this.world.releaseDir(dir));
    };
    mk("up", 0, gap, "▲");
    mk("down", 0, -gap, "▼");
    mk("left", -gap, 0, "◀");
    mk("right", gap, 0, "▶");
  }
}
