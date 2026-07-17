// Main: the game's bootstrap component and the only component referenced
// from main.scene. Everything else is constructed at runtime, code-first.

import { _decorator, Component } from "cc";
import { GameApp } from "./src/GameApp";
const { ccclass } = _decorator;

@ccclass("Main")
export class Main extends Component {
  private app: GameApp | null = null;

  start() {
    this.app = new GameApp(this.node);
    this.app.start();
  }

  update(dt: number) {
    this.app?.update(dt);
  }
}
