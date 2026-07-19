// SignOutScreen: confirmation for ending the session so someone else can
// play — siblings share one computer, and switching accounts starts here.
// The actual sign-out (flush, server session end, cache clear, redirect to
// /login) lives in persistence.signOut(); this screen renders the choice
// and signals "keep playing" via onBack. Opening it is GameApp's job (the
// control next to the player name).

import { Color, EventKeyboard, KeyCode, Label, Node, view } from "cc";
import { PALETTE, makeButton, makeLabel, makePanel, makeRect } from "./ui";
import type { Persistence } from "./persistence";
import type { Telemetry } from "./client/telemetry";

export class SignOutScreen {
  readonly root = new Node("signout-screen");
  private error: Label;
  private busy = false;

  constructor(
    private persistence: Persistence,
    private onBack: () => void,
    private telemetry: Telemetry | null = null,
  ) {
    const size = view.getVisibleSize();
    makeRect(this.root, 0, 0, size.width, size.height, new Color(224, 232, 244, 255));
    const card = makePanel(this.root, 0, 20, 560, 320, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
    });
    makeLabel(card, "Sign out?  ·  退出登录？", 0, 104, { fontSize: 28 });
    makeLabel(card, "Your progress is saved.  你的进度已保存。", 0, 58, {
      fontSize: 16,
      color: PALETTE.sub,
    });
    makeLabel(card, "The next player signs in as themselves.  下一位玩家用自己的账号登录。", 0, 30, {
      fontSize: 14,
      color: PALETTE.sub,
    });
    this.error = makeLabel(card, "", 0, -22, { fontSize: 15, color: PALETTE.bad });

    makeButton(card, {
      x: -122,
      y: -92,
      w: 212,
      h: 58,
      label: "Sign out  退出",
      color: PALETTE.bad,
      fontSize: 20,
      onTap: () => void this.confirm(),
    });
    makeButton(card, {
      x: 122,
      y: -92,
      w: 212,
      h: 58,
      label: "Keep playing  继续玩 (Esc)",
      color: PALETTE.actionBlue,
      fontSize: 16,
      onTap: onBack,
    });
  }

  handleKeyDown(e: EventKeyboard): void {
    // Only Escape leaves; there is deliberately no confirm key — signing out
    // should take an aimed click, not a stray Enter.
    if (e.keyCode === KeyCode.ESCAPE) this.onBack();
  }

  private async confirm(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error.string = "";
    // The clearest voluntary-stop signal there is (#24). Sent under THIS
    // account's session, then the queue closes for good: a sibling signing
    // in next must never inherit unsent events (persistence.signOut clears
    // the save cache for the same reason).
    if (this.telemetry) {
      this.telemetry.emit("session_ended", { reason: "sign_out", duringBattle: false });
      await this.telemetry.flush();
      this.telemetry.close();
    }
    const err = await this.persistence.signOut();
    // On success the browser is already navigating to /login.
    if (err) {
      this.busy = false;
      this.error.string = err;
    }
  }
}
