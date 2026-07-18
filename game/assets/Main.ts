// Main: the game's bootstrap component and the only component referenced
// from main.scene. Everything else is constructed at runtime, code-first.
// Boot is async: the Worker only serves this page to a signed-in session,
// so boot loads the player's save and walks a brand-new player through
// name entry, then starter choice, before the world appears.

import { _decorator, Component } from "cc";
import { type SaveState } from "./shared/index";
import { GameApp } from "./src/GameApp";
import { NameScreen } from "./src/NameScreen";
import { StarterScreen } from "./src/StarterScreen";
import { Persistence, type BootResult } from "./src/persistence";
const { ccclass } = _decorator;

@ccclass("Main")
export class Main extends Component {
  private app: GameApp | null = null;

  start() {
    void this.boot();
  }

  private async boot() {
    const persistence = new Persistence();
    let result: BootResult;
    try {
      result = await persistence.boot(); // 401 inside redirects to /login
    } catch {
      return; // transient server failure: a refresh retries
    }
    if (!this.node.isValid) return; // scene tore down while we were fetching

    if (result.playerName === null) {
      const screen = new NameScreen(persistence, null, (name) => {
        screen.root.destroy();
        this.afterName(result, persistence, name);
      });
      this.node.addChild(screen.root);
      return;
    }
    this.afterName(result, persistence, result.playerName);
  }

  // Every returning player has a save; null means the starter was never
  // chosen (brand-new account, or a refresh mid-choice on the last screen).
  private afterName(result: BootResult, persistence: Persistence, playerName: string) {
    if (!this.node.isValid) return;
    if (result.save !== null) {
      this.launch(result.save, persistence, playerName);
      return;
    }
    const screen = new StarterScreen(persistence, (save) => {
      screen.root.destroy();
      this.launch(save, persistence, playerName);
    });
    this.node.addChild(screen.root);
  }

  private launch(save: SaveState, persistence: Persistence, playerName: string) {
    if (!this.node.isValid) return;
    this.app = new GameApp(this.node, save, persistence, playerName);
    this.app.start();
  }

  update(dt: number) {
    this.app?.update(dt);
  }

  onDestroy() {
    this.app?.destroy();
    this.app = null;
  }
}
