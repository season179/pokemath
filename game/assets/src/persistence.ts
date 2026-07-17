// Persistence adapter: the only place that knows about HTTP and localStorage.
// Identity is a better-auth session cookie (HttpOnly — invisible to this
// code); the Worker gates "/" so reaching the game at all implies a session.
//
// Boot loads the server save (the server creates a starter row on first
// load). If a locally-cached save is marked dirty — a checkpoint that never
// reached the server, e.g. wifi dropped or the session expired mid-play —
// the cache wins and is pushed before play continues.
//
// A 401 at any point means the session died; we send the player back to
// /login. The dirty cache survives in localStorage and reconciles on the
// next boot. A 409 (another device wrote first) retries once with our state.

import { validateSaveState, type SaveState } from "../shared/index";

const KEY_CACHE = "pokemath.save-cache";
const KEY_DIRTY = "pokemath.save-dirty";

export interface BootResult {
  save: SaveState;
  playerName: string | null; // null → GameApp shows the name screen first
}

export class Persistence {
  private version = 0;
  private saving = false;
  private pending: SaveState | null = null;

  /** Load the save, reconciling any dirty local cache. Throws only via redirect. */
  async boot(): Promise<BootResult> {
    const res = await fetch("/api/save", { credentials: "include" });
    if (res.status === 401) {
      this.redirectToLogin();
      return new Promise<never>(() => {}); // page is navigating away
    }
    if (!res.ok) throw new Error(`load failed: ${res.status}`);
    const body = (await res.json()) as {
      save: unknown;
      saveVersion: number;
      playerName: string | null;
    };
    if (!validateSaveState(body.save)) throw new Error("server sent invalid save");
    this.version = body.saveVersion;

    // Un-synced local progress beats the server copy: push it, then play it.
    const dirty = localStorage.getItem(KEY_DIRTY) === "1" ? this.readCache() : null;
    if (dirty) {
      this.checkpoint(dirty);
      return { save: dirty, playerName: body.playerName };
    }

    localStorage.setItem(KEY_CACHE, JSON.stringify(body.save));
    return { save: body.save, playerName: body.playerName };
  }

  /** Set/change the in-game name. Returns an error message or null on success. */
  async setName(name: string): Promise<string | null> {
    const res = await fetch("/api/profile/name", {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.status === 401) {
      this.redirectToLogin();
      return "signed out";
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return body?.error ?? "could not save name";
    }
    return null;
  }

  /**
   * Checkpoint save: cache locally at once (marked dirty), then push.
   * Serialized — if a push is in flight the newest state waits its turn.
   * The dirty flag only clears when the server confirms the write, so a
   * failed push is never silently lost: the next boot reconciles it.
   */
  checkpoint(save: SaveState): void {
    localStorage.setItem(KEY_CACHE, JSON.stringify(save));
    localStorage.setItem(KEY_DIRTY, "1");
    this.pending = save;
    if (!this.saving) void this.flush();
  }

  private async flush(): Promise<void> {
    this.saving = true;
    try {
      while (this.pending) {
        const save = this.pending;
        this.pending = null;
        const res = await fetch("/api/save", {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ save, baseVersion: this.version }),
        });
        if (res.ok) {
          const body = (await res.json()) as { saveVersion: number };
          this.version = body.saveVersion;
          if (!this.pending) localStorage.removeItem(KEY_DIRTY);
        } else if (res.status === 409) {
          // Another device advanced the save. Adopt its version and retry
          // once with our state (this checkpoint is the newest action).
          const body = (await res.json()) as { saveVersion: number | null };
          if (typeof body.saveVersion === "number" && !this.pending) {
            this.version = body.saveVersion;
            this.pending = save;
          }
        } else if (res.status === 401) {
          this.redirectToLogin(); // dirty cache reconciles after re-login
          break;
        } else {
          break; // validation/server failure: dirty cache keeps the progress
        }
      }
    } catch {
      // Network down: dirty cache already holds the state.
    } finally {
      this.saving = false;
    }
  }

  private redirectToLogin(): void {
    if (typeof location !== "undefined") location.href = "/login";
  }

  private readCache(): SaveState | null {
    try {
      const raw = localStorage.getItem(KEY_CACHE);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return validateSaveState(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
