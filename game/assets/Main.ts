// Main: the game's bootstrap component and the only component referenced
// from main.scene. Everything else is constructed at runtime, code-first.
// Boot is async: load-or-create the save (offline falls back to the local
// cache) before any screen exists.

import { _decorator, Component } from "cc";
import { GameApp } from "./src/GameApp";
import { Persistence } from "./src/persistence";
const { ccclass } = _decorator;

@ccclass("Main")
export class Main extends Component {
  private app: GameApp | null = null;

  start() {
    void this.boot();
  }

  private async boot() {
    const persistence = new Persistence();
    const result = (await this.claimFromUrl(persistence)) ?? (await persistence.boot());
    if (!result) return;
    if (!this.node.isValid) return; // scene tore down while we were fetching
    this.app = new GameApp(this.node, result.save, persistence);
    this.app.start();
  }

  // ?code=XXXXXX in the URL claims that save onto this device — the
  // device-transfer path a parent can type. Falls back to normal boot.
  private async claimFromUrl(persistence: Persistence) {
    if (typeof location === "undefined") return null;
    const code = new URLSearchParams(location.search).get("code");
    if (!code) return null;
    try {
      const result = await persistence.claim(code);
      history.replaceState(null, "", location.pathname); // don't re-claim on refresh
      return result;
    } catch {
      return null; // bad/mistyped code: boot normally
    }
  }

  update(dt: number) {
    this.app?.update(dt);
  }
}
