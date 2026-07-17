// Persistence adapter: the only place that knows about HTTP and localStorage.
// The domain (shared/) and screens stay network-free; GameApp calls boot()
// once and checkpoint() at safe moments (battle exit, respawn, shop leave).
//
// Offline-first: the last save is cached locally. Boot prefers the server
// copy; on network failure it falls back to the cache (marked dirty) and the
// next successful checkpoint reconciles. A 409 (another device wrote first)
// re-syncs by adopting the server save at the next boot — last writer wins
// per checkpoint, which is fine for a kids' game.

import { createNewGame, validateSaveState, type SaveState } from "../shared/index";

const KEY_TOKEN = "pokemath.token";
const KEY_CODE = "pokemath.code";
const KEY_CACHE = "pokemath.save-cache";

export interface BootResult {
  save: SaveState;
  code: string | null; // shown in the UI so kids can copy it to another device
  online: boolean;
}

interface ServerSave {
  token?: string;
  code?: string;
  save: unknown;
  saveVersion: number;
}

export class Persistence {
  private token: string | null = null;
  private code: string | null = null;
  private version = 0;
  private saving = false;
  private pending: SaveState | null = null;

  /** Load-or-create, before any screen is constructed. Never throws. */
  async boot(): Promise<BootResult> {
    this.token = localStorage.getItem(KEY_TOKEN);
    this.code = localStorage.getItem(KEY_CODE);

    try {
      const res = this.token ? await this.load() : await this.create();
      localStorage.setItem(KEY_CACHE, JSON.stringify(res.save));
      return { save: res.save, code: this.code, online: true };
    } catch {
      const cached = this.readCache();
      if (cached) return { save: cached, code: this.code, online: false };
      // No server, no cache: fresh local game; first checkpoint will sync.
      return { save: createNewGame(), code: null, online: false };
    }
  }

  /** Claim an existing save by code (device transfer). Throws on bad code. */
  async claim(rawCode: string): Promise<BootResult> {
    const body = await this.request("/api/player/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: rawCode }),
    });
    this.adopt(body);
    localStorage.setItem(KEY_CACHE, JSON.stringify(body.save));
    return { save: body.save as SaveState, code: this.code, online: true };
  }

  /**
   * Checkpoint save: cache locally at once, then push to the server.
   * Serialized — if a push is in flight the newest state waits its turn.
   * Failures are silent; the cache preserves progress for the next boot.
   */
  checkpoint(save: SaveState): void {
    localStorage.setItem(KEY_CACHE, JSON.stringify(save));
    this.pending = save;
    if (!this.saving) void this.flush();
  }

  saveCode(): string | null {
    return this.code;
  }

  private async flush(): Promise<void> {
    this.saving = true;
    try {
      while (this.pending) {
        const save = this.pending;
        this.pending = null;
        if (!this.token) {
          // Offline-created game: acquire an identity, then overwrite the
          // starter save the server generated with our real progress.
          const created = await this.create();
          void created;
        }
        const res = await fetch("/api/save", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ save, baseVersion: this.version }),
        });
        if (res.ok) {
          const body = (await res.json()) as { saveVersion: number };
          this.version = body.saveVersion;
        } else if (res.status === 409) {
          // Another device advanced the save. Adopt its version and retry
          // once with our state (this checkpoint is the newest action).
          const body = (await res.json()) as { saveVersion: number | null };
          if (typeof body.saveVersion === "number" && !this.pending) {
            this.version = body.saveVersion;
            this.pending = save;
          }
        } else {
          break; // auth/validation failure: keep cache, stop pushing
        }
      }
    } catch {
      // Network down: cache already holds the state.
    } finally {
      this.saving = false;
    }
  }

  private async create(): Promise<{ save: SaveState }> {
    const body = await this.request("/api/player", { method: "POST" });
    this.adopt(body);
    return { save: body.save as SaveState };
  }

  private async load(): Promise<{ save: SaveState }> {
    const res = await fetch("/api/save", {
      headers: { authorization: `Bearer ${this.token}` },
    });
    if (res.status === 401) {
      // Token revoked/unknown: start a fresh identity. If we have cached
      // progress, prefer it over the server's starter save and push it
      // eagerly — otherwise closing the tab before the next checkpoint
      // would silently lose everything since the last sync.
      const created = await this.create();
      const cached = this.readCache();
      if (cached) {
        this.checkpoint(cached);
        return { save: cached };
      }
      return created;
    }
    if (!res.ok) throw new Error(`load failed: ${res.status}`);
    const body = (await res.json()) as ServerSave;
    if (!validateSaveState(body.save)) throw new Error("server sent invalid save");
    this.version = body.saveVersion;
    return { save: body.save };
  }

  private adopt(body: ServerSave): void {
    if (!validateSaveState(body.save)) throw new Error("server sent invalid save");
    if (body.token) {
      this.token = body.token;
      localStorage.setItem(KEY_TOKEN, body.token);
    }
    if (body.code) {
      this.code = body.code;
      localStorage.setItem(KEY_CODE, body.code);
    }
    this.version = body.saveVersion;
  }

  private async request(path: string, init: RequestInit): Promise<ServerSave> {
    const res = await fetch(path, init);
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    return (await res.json()) as ServerSave;
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
