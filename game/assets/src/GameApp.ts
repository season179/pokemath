// GameApp: the shell. Owns the game state, routes input, and swaps screens
// (world / battle / shop) under the single cc.Scene. Screens are plain TS
// classes, not cc.Scene assets — see ROADMAP Phase 1.

import { EventKeyboard, Input, KeyCode, Node, input, view } from "cc";
import { GameState } from "./state";
import { Direction } from "./world/map-data";
import { WorldScreen } from "./world/WorldScreen";
import { PALETTE, makeButton } from "./ui";

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
  private screen: Screen = "world";
  private world: WorldScreen;
  private dpad: Node | null = null;

  constructor(private canvasNode: Node) {
    this.state = GameState.newGame();
    this.world = new WorldScreen(this.state);
    this.canvasNode.addChild(this.world.root);
  }

  start() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    this.buildDpad();
  }

  update(dt: number) {
    if (this.screen === "world") this.world.update(dt);
  }

  // --- keyboard ---
  private onKeyDown(e: EventKeyboard) {
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
