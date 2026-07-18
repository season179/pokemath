// Main: the game's bootstrap component and the only component referenced
// from main.scene. Everything else is constructed at runtime, code-first.
// Boot is async: the Worker only serves this page to a signed-in session,
// so boot loads the player's save (creating a starter save on first login)
// and shows the name screen before the world if no name is set yet.

import { _decorator, Component } from "cc";
import { GameApp } from "./src/GameApp";
import { NameScreen } from "./src/NameScreen";
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
        this.launch(result, persistence, name);
      });
      this.node.addChild(screen.root);
      return;
    }
    this.launch(result, persistence, result.playerName);
  }

  private launch(result: BootResult, persistence: Persistence, playerName: string) {
    if (!this.node.isValid) return;
    this.app = new GameApp(this.node, result.save, persistence, playerName);
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
