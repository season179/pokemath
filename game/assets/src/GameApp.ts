// GameApp: the shell. Owns the game state, routes input, and swaps screens
// (world / overlays / battle / shop) under the single cc.Scene. Screens are plain TS
// classes, not cc.Scene assets — see ROADMAP Phase 1.

import { Color, EventKeyboard, Input, KeyCode, Label, Node, UITransform, input, view } from "cc";
import { Creature, QuestionBank, type SaveStateV2 } from "../shared/index";
import { loadQuestionBank } from "./questions/loadQuestionBank";
import { NameScreen } from "./NameScreen";
import { Persistence } from "./persistence";
import { SignOutScreen } from "./SignOutScreen";
import { BattleScreen } from "./battle/BattleScreen";
import { BagScreen } from "./bag/BagScreen";
import { PartyScreen } from "./party/PartyScreen";
import { ShopScreen } from "./shop/ShopScreen";
import { FieldGuideScreen } from "./guide/FieldGuideScreen";
import { SanctuaryScreen } from "./sanctuary/SanctuaryScreen";
import { GameState } from "./state";
import { Telemetry } from "./client/telemetry";
import { Direction, isEncounterRegion, isOpenRegion } from "./world/regions/index";
import { WorldScreen, WorldActions } from "./world/WorldScreen";
import { WorldMapScreen } from "./world/WorldMapScreen";
import { PALETTE, makeLabel, makePanel } from "./ui";

type Screen =
  | "world"
  | "party"
  | "bag"
  | "battle"
  | "shop"
  | "map"
  | "signout"
  | "guide"
  | "sanctuary";

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
  private guide: FieldGuideScreen | null = null;
  private sanctuary: SanctuaryScreen | null = null;
  private nameChip: Node | null = null;
  private nameScreen: NameScreen | null = null;
  private signOutScreen: SignOutScreen | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasFocusHandler: (() => void) | null = null;
  private canvasBlurHandler: (() => void) | null = null;
  // Learning-quality events (#24): queued offline, flushed on checkpoints.
  private telemetry = new Telemetry();
  private pageHideHandler: (() => void) | null = null;

  constructor(
    private canvasNode: Node,
    boot: SaveStateV2,
    private persistence: Persistence,
    private playerName: string,
  ) {
    this.state = new GameState(boot);
    // Resume where the save left off (#3): the saved region when it is still
    // open, on the exact saved tile when it is still walkable — WorldScreen
    // validates the tile and falls back to the region's safe spawn. A saved
    // region that is no longer open falls back to the harbor spawn entirely.
    const startAt = boot.location && isOpenRegion(boot.location.regionId) ? boot.location : null;
    this.world = new WorldScreen(this.state, this.worldActions, startAt?.regionId ?? "harbor", null, startAt);
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
    onGuide: () => this.startGuide(),
    onSanctuary: () => this.startSanctuary(),
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
    this.watchPageHide();
    // Events left over from a crashed/offline session upload right away
    // instead of waiting for the first battle exit.
    void this.telemetry.flush();
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
    if (this.pageHideHandler && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.pageHideHandler);
    }
    this.canvasElement = null;
    this.canvasFocusHandler = null;
    this.canvasBlurHandler = null;
    this.pageHideHandler = null;
    this.world.releaseAll();
  }

  // Every save checkpoint doubles as a telemetry flush point (#24). Flushes
  // are fire-and-forget — a failed send stays queued for the next checkpoint.
  private checkpoint(): void {
    this.persistence.checkpoint(this.state.toSave());
    void this.telemetry.flush();
  }

  // Voluntary stopping (#24): closing/navigating away is a session end. The
  // event fires whether or not a battle is mid-flow — duringBattle is what
  // the report segments on. Best-effort: keepalive, never awaited.
  private watchPageHide(): void {
    if (typeof window === "undefined" || this.pageHideHandler) return;
    this.pageHideHandler = () => {
      this.telemetry.emit("session_ended", {
        reason: "page_unload",
        duringBattle: this.screen === "battle",
      });
      this.telemetry.flushOnUnload();
    };
    window.addEventListener("pagehide", this.pageHideHandler);
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
    // Meeting a wild friend counts as "seen" in the Field Guide (#5) — even
    // when the player runs. Checkpoint only when the guide actually changed:
    // a repeat sighting must not churn a save version per battle.
    if (wild.speciesId && this.state.markSeenEntry(wild.speciesId)) {
      this.checkpoint();
    }
    this.screen = "battle";
    this.hideWorld();
    this.battle = new BattleScreen(this.state, wild, bank, {
      onExit: () => this.endBattle(false),
      onRespawn: () => this.endBattle(true),
    }, this.telemetry);
    this.canvasNode.addChild(this.battle.root);
  }

  private endBattle(respawn: boolean): void {
    this.battle?.root.destroy();
    this.battle = null;
    this.returnToWorld(respawn);
    this.checkpoint();
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
        this.checkpoint();
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

  // Field Guide (#5): a read-only overlay like the world map — opening it
  // pauses world movement; closing returns without respawning.
  private startGuide(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "guide";
    this.hideWorld();
    this.guide = new FieldGuideScreen(this.state, { onBack: () => this.endGuide() });
    this.canvasNode.addChild(this.guide.root);
  }

  private endGuide(): void {
    this.guide?.root.destroy();
    this.guide = null;
    this.returnToWorld(false);
  }

  // Harbor Sanctuary (#5): opened by Keeper Flo in Harbor Town. Every
  // accepted team edit checkpoints immediately and refreshes the world HUD
  // (the lead companion may have changed).
  private startSanctuary(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "sanctuary";
    this.hideWorld();
    this.sanctuary = new SanctuaryScreen(this.state, {
      onBack: () => this.endSanctuary(),
      onChanged: () => {
        this.checkpoint();
      },
    });
    this.canvasNode.addChild(this.sanctuary.root);
  }

  private endSanctuary(): void {
    this.sanctuary?.root.destroy();
    this.sanctuary = null;
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
    this.checkpoint();
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

  // Exact text width via canvas measureText with the same font web Labels
  // render with (Arial + system CJK fallback) — estimates left the chip
  // with fat empty margins. Falls back to a rough guess without a DOM.
  private static textWidth(text: string, fontSize: number): number {
    const ctx =
      typeof document !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;
    if (!ctx) return text.length * fontSize * 0.6;
    ctx.font = `${fontSize}px Arial`;
    return ctx.measureText(text).width;
  }

  // Player name + sign-out in the bottom-right corner — whose adventure this
  // is. A HUD chip (same cream panel as the Bag/Map buttons) so it stays
  // readable over any world art; bare labels vanished against dark water.
  // The chip hugs its text — short names get a small chip, not a wide slab.
  // Tapping the name opens the name screen (names are changeable anytime).
  private showPlayerName() {
    if (this.nameChip?.isValid) this.nameChip.destroy();
    this.nameChip = null;
    const size = view.getVisibleSize();
    const NAME_FS = 16;
    const OUT_FS = 16;
    const signOutText = "Sign out · 退出";
    // The chip hugs the widest line: 9px side padding, no fat margins.
    const chipW = Math.min(
      260,
      Math.max(
        GameApp.textWidth(this.playerName, NAME_FS),
        GameApp.textWidth(signOutText, OUT_FS),
      ) + 18,
    );
    const chipH = 60;
    const chip = makePanel(
      this.world.root,
      size.width / 2 - chipW / 2 - 14,
      -size.height / 2 + chipH / 2 + 14,
      chipW,
      chipH,
      { fill: new Color(255, 253, 245, 230), stroke: PALETTE.panelStroke, lineWidth: 3 },
    );
    this.nameChip = chip;

    const name = makeLabel(chip, this.playerName, 0, 13, { fontSize: NAME_FS });
    name.node.getComponent(UITransform)!.setContentSize(chipW - 12, 24);
    name.enableWrapText = false;
    name.overflow = Label.Overflow.SHRINK;
    name.node.on(Node.EventType.TOUCH_END, () => this.openNameScreen());

    // Sign-out lives with the name — siblings taking turns on one computer
    // switch accounts here. It only opens the confirmation screen, so a
    // stray tap can never end the session by itself.
    const signOut = makeLabel(chip, signOutText, 0, -15, {
      fontSize: OUT_FS,
      color: PALETTE.sub,
    });
    signOut.node.getComponent(UITransform)!.setContentSize(chipW - 12, 24);
    signOut.enableWrapText = false;
    signOut.overflow = Label.Overflow.SHRINK;
    signOut.node.on(Node.EventType.TOUCH_END, () => this.openSignOut());
  }

  // Deliberate session end so someone else can play (shared computer). A
  // checkpoint is pushed on open, so "your progress is saved" is already
  // true while the player decides; the screen itself drives the sign-out.
  private openSignOut(): void {
    if (this.screen !== "world" || this.nameScreen) return;
    this.screen = "signout";
    this.hideWorld();
    this.checkpoint();
    this.signOutScreen = new SignOutScreen(this.persistence, () => this.endSignOut(), this.telemetry);
    this.canvasNode.addChild(this.signOutScreen.root);
  }

  private endSignOut(): void {
    this.signOutScreen?.root.destroy();
    this.signOutScreen = null;
    this.returnToWorld(false);
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
    if (this.screen === "guide") {
      this.guide?.handleKeyDown(e);
      return;
    }
    if (this.screen === "sanctuary") {
      this.sanctuary?.handleKeyDown(e);
      return;
    }
    if (this.screen === "signout") {
      this.signOutScreen?.handleKeyDown(e);
      return;
    }

    const dir = KEY_DIRS[e.keyCode];
    if (e.keyCode === KeyCode.KEY_P && this.screen === "world") this.startParty();
    else if (e.keyCode === KeyCode.KEY_B && this.screen === "world") this.startBag();
    else if (e.keyCode === KeyCode.KEY_M && this.screen === "world") this.openMap();
    else if (e.keyCode === KeyCode.KEY_G && this.screen === "world") this.startGuide();
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
