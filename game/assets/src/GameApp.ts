// GameApp: the shell. Owns the game state, routes input, and swaps screens
// (world / overlays / battle / shop) under the single cc.Scene. Screens are plain TS
// classes, not cc.Scene assets — see ROADMAP Phase 1.

import { EventKeyboard, Input, KeyCode, Node, input, view } from "cc";
import { Creature, QuestionBank, type SaveState } from "../shared/index";
import { loadQuestionBank } from "./questions/loadQuestionBank";
import { NameScreen } from "./NameScreen";
import { Persistence } from "./persistence";
import { BattleScreen } from "./battle/BattleScreen";
import { BagScreen } from "./bag/BagScreen";
import { PartyScreen } from "./party/PartyScreen";
import { ShopScreen } from "./shop/ShopScreen";
import { GameState } from "./state";
import { Direction, isEncounterRegion, isOpenRegion } from "./world/regions/index";
import { WorldScreen, WorldActions } from "./world/WorldScreen";
import { WorldMapScreen } from "./world/WorldMapScreen";
import { makeLabel } from "./ui";

type Screen = "world" | "party" | "bag" | "battle" | "shop" | "map";

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
  // The reviewed Standard-1 Woolly bank (#6), loaded async from versioned JSON.
  // Battles stay closed until it loads; we never fall back to the Year-4
  // SAMPLE_BANK (#8 forbids it in Woolly).
  private bank: QuestionBank | null = null;
  private screen: Screen = "world";
  private world: WorldScreen;
  private party: PartyScreen | null = null;
  private bag: BagScreen | null = null;
  private battle: BattleScreen | null = null;
  private shop: ShopScreen | null = null;
  private map: WorldMapScreen | null = null;
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
    onEncounter: (wild) => this.startBattle(wild),
    encounterReady: () => this.bank !== null,
    onMap: () => this.openMap(),
  };

  // Swap the world to another region, arriving through the named gateway.
  // The player name is rebuilt so it stays above the new world.
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
    this.showPlayerName();
    this.screen = "world";
  }

  start() {
    this.enableCanvasKeyboardFocus();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    view.on("canvas-resize", this.onViewResize, this);
    view.on("design-resolution-changed", this.onViewResize, this);
    this.showPlayerName();
    // Load the reviewed Std-1 bank so Woolly encounters can start. If the Cocos
    // resource path isn't resolving yet, encounters stay off (see loadBank).
    void this.loadBank();
  }

  private async loadBank(): Promise<void> {
    try {
      // Cocos resources.load path: relative to assets/resources, no extension.
      // The reviewed bank lives at resources/question-banks/std1/woolly-meadows.v1.json.
      this.bank = await loadQuestionBank("question-banks/std1/woolly-meadows.v1");
    } catch (error) {
      // The reviewed Std-1 bank is required for any Woolly battle; we never
      // fall back to the Year-4 SAMPLE_BANK (#8 forbids it). If this fails,
      // confirm the bank JSON is loadable via Cocos resources (its resource
      // path/bundle), then encounters will enable.
      console.error(
        "[pokemath] Could not load the reviewed Std-1 Woolly bank; encounters stay off.",
        error,
      );
    }
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

  // A wild encounter (started from Woolly Meadows' tall grass) opens the
  // battle screen with a fresh wild creature. Guards: only in a preview
  // encounter region (#29), and only once the reviewed Std-1 bank has loaded.
  private startBattle(wild: Creature): void {
    if (!isEncounterRegion(this.world.regionId)) {
      console.warn(`Refusing battle in non-encounter region: ${this.world.regionId}`);
      return;
    }
    const bank = this.bank;
    if (!bank) {
      console.warn("Ignoring encounter: the reviewed Std-1 bank has not loaded yet.");
      return;
    }
    this.screen = "battle";
    this.hideWorld();
    this.battle = new BattleScreen(this.state, wild, bank, {
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

  // The world map is informational only (#30): opening it pauses world
  // movement (update() skips world.update while the screen is "map"), and the
  // M key / HUD button are blocked while any other overlay (e.g. NameScreen)
  // is active. Closing returns to the world without respawning.
  private openMap(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "map";
    this.hideWorld(); // hides the world and releases held directions
    this.map = new WorldMapScreen(this.world.regionId, () => this.endMap());
    this.canvasNode.addChild(this.map.root);
  }

  private endMap(): void {
    this.map?.root.destroy();
    this.map = null;
    this.returnToWorld(false);
  }

  private hideWorld(): void {
    this.world.releaseAll();
    this.world.root.active = false;
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
    if (respawn) this.world.respawnHome();
    else this.world.refreshHud();
  }

  private onViewResize() {
    this.world.refreshLayout();
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
    if (this.screen === "map") {
      this.map?.handleKeyDown(e);
      return;
    }

    const dir = KEY_DIRS[e.keyCode];
    if (e.keyCode === KeyCode.KEY_P && this.screen === "world") this.startParty();
    else if (e.keyCode === KeyCode.KEY_B && this.screen === "world") this.startBag();
    else if (e.keyCode === KeyCode.KEY_M && this.screen === "world") this.openMap();
    else if (dir && this.screen === "world") this.world.pressDir(dir);
    else if ((e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) && this.screen === "world") {
      this.world.tap();
    }
  }

  private onKeyUp(e: EventKeyboard) {
    const dir = KEY_DIRS[e.keyCode];
    if (dir && this.screen === "world") this.world.releaseDir(dir);
  }
}
