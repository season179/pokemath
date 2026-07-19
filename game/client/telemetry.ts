// Client telemetry (issue #24): an offline-first event queue with the same
// trust shape as persistence.ts. Events are validated against the shared
// registry BEFORE they queue — an unregistered name or prop is dropped at
// the source with a console warning, so junk never leaves the device.
//
// The queue lives in localStorage and survives crashes/refreshes; it flushes
// alongside save checkpoints (battle exit, shop leave, …) and best-effort on
// pagehide. The server dedupes on event id, so a retried flush never
// double-counts. Nothing here measures time, records answers, or carries
// free text — the registry in shared/telemetry.ts is the whole vocabulary.
//
// Pure TypeScript (no Cocos, no DOM globals at module level) so Node tests
// can drive it with injected storage/fetch; mirrored into
// game/assets/src/client/ by tools/sync-shared.mjs.

import {
  MAX_BATCH_JSON_BYTES,
  MAX_EVENTS_PER_BATCH,
  MAX_QUEUED_EVENTS,
  validateTelemetryEvent,
  type ClientTelemetryEvent,
  type TelemetryEventName,
} from "../../shared/index.ts";

const KEY_QUEUE = "pokemath.events";

/** The slice of Telemetry a screen needs: fire-and-forget emission. */
export interface TelemetrySink {
  emit(name: TelemetryEventName, props: Record<string, unknown>): void;
}

/** No-op sink for screens/tests without telemetry. */
export const NULL_SINK: TelemetrySink = { emit: () => {} };

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface TelemetryOptions {
  storage?: StorageLike;
  fetchFn?: typeof fetch;
  now?: () => Date;
  idgen?: () => string;
}

export class Telemetry implements TelemetrySink {
  private queue: ClientTelemetryEvent[];
  private sending = false;
  private closed = false;
  private readonly storage: StorageLike | null;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => Date;
  private readonly idgen: () => string;

  constructor(opts: TelemetryOptions = {}) {
    this.storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
    this.fetchFn = opts.fetchFn ?? fetch.bind(globalThis);
    this.now = opts.now ?? (() => new Date());
    this.idgen = opts.idgen ?? (() => crypto.randomUUID());
    this.queue = this.readQueue();
  }

  /** Queue an event. Invalid events are dropped at the source, never sent. */
  emit(name: TelemetryEventName, props: Record<string, unknown>): void {
    if (this.closed) return;
    const event: ClientTelemetryEvent = {
      id: this.idgen(),
      name,
      at: this.now().toISOString(),
      props,
    };
    const problem = validateTelemetryEvent(event);
    if (problem !== null) {
      console.warn(`telemetry: dropped ${name}: ${problem}`);
      return;
    }
    this.queue.push(event);
    // Beyond the cap the oldest events drop first — fresh play matters more
    // than ancient history, and an unbounded queue would never catch up.
    if (this.queue.length > MAX_QUEUED_EVENTS) {
      this.queue.splice(0, this.queue.length - MAX_QUEUED_EVENTS);
    }
    this.persist();
  }

  /** Queued count — surfaced for tests and the flush loop. */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Terminal sign-out: drop everything queued and refuse future emissions.
   * Siblings share one computer — player A's unsent events must never ride
   * player B's session after the account switches (persistence.signOut
   * clears the save cache for the same reason). Telemetry is best-effort;
   * privacy beats the lost rows.
   */
  close(): void {
    this.closed = true;
    this.queue = [];
    try {
      this.storage?.removeItem(KEY_QUEUE);
    } catch {
      // Non-fatal: the in-memory queue is already gone.
    }
  }

  /**
   * Send up to one batch. On success (or a whole-batch 400, which means the
   * client produced a bad envelope) the sent events leave the queue; on
   * network/server/auth failure they stay for the next checkpoint.
   */
  async flush(): Promise<void> {
    if (this.sending || this.closed || this.queue.length === 0) return;
    this.sending = true;
    try {
      const batch = this.takeBatch();
      const status = await this.post(batch, false);
      if (status === null) return; // network error — keep queued
      if (status === 200 || status === 400) {
        this.dropSent(batch);
      }
      // 401/5xx: keep queued; the next checkpoint or session retries.
    } finally {
      this.sending = false;
    }
  }

  /** Best-effort flush during pagehide — keepalive, never awaited. */
  flushOnUnload(): void {
    if (this.queue.length === 0) return;
    const batch = this.takeBatch();
    void this.post(batch, true).then((status) => {
      // The page may already be gone; if it isn't, reconcile the queue so a
      // refresh doesn't resend what the server accepted.
      if (status === 200 || status === 400) this.dropSent(batch);
    });
  }

  /**
   * Take the head of the queue, bounded by BOTH the event count and the
   * serialized envelope size. The count cap alone can produce a batch the
   * server 413s (100 events × 512B props ≈ 4× the byte cap), and a 413 is
   * retryable — an over-byte batch would fail forever and starve the queue
   * behind it.
   */
  private takeBatch(): ClientTelemetryEvent[] {
    const envelopeOverhead = '{"events":[]}'.length;
    let bytes = envelopeOverhead;
    const batch: ClientTelemetryEvent[] = [];
    const poisoned: ClientTelemetryEvent[] = [];
    for (const event of this.queue) {
      if (batch.length >= MAX_EVENTS_PER_BATCH) break;
      // +1 for the comma between array elements.
      const size = JSON.stringify(event).length + 1;
      if (size > MAX_BATCH_JSON_BYTES) {
        // A single event that can NEVER fit would 413-retry forever and
        // starve the queue behind it — drop the poison. Impossible while
        // the registry caps props at 512B (pinned by a shared test); this
        // guard keeps a future registry loosening from re-opening the hole.
        poisoned.push(event);
        continue;
      }
      if (batch.length > 0 && bytes + size > MAX_BATCH_JSON_BYTES) break;
      batch.push(event);
      bytes += size;
    }
    if (poisoned.length > 0) {
      console.warn(`telemetry: dropped ${poisoned.length} over-sized event(s)`);
      const dropped = new Set(poisoned.map((e) => e.id));
      this.queue = this.queue.filter((e) => !dropped.has(e.id));
      this.persist();
    }
    return batch;
  }

  private dropSent(batch: ClientTelemetryEvent[]): void {
    const sent = new Set(batch.map((e) => e.id));
    this.queue = this.queue.filter((e) => !sent.has(e.id));
    this.persist();
  }

  /** Returns the HTTP status, or null when the request never completed. */
  private async post(batch: ClientTelemetryEvent[], keepalive: boolean): Promise<number | null> {
    try {
      const res = await this.fetchFn("/api/events", {
        method: "POST",
        credentials: "include",
        keepalive,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
      return res.status;
    } catch {
      return null;
    }
  }

  private readQueue(): ClientTelemetryEvent[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(KEY_QUEUE);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Only well-formed events survive a reload — a hand-edited or stale
      // queue entry is dropped here rather than sent.
      return parsed.filter((e) => validateTelemetryEvent(e) === null);
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(KEY_QUEUE, JSON.stringify(this.queue));
    } catch {
      // Quota errors are non-fatal: the in-memory queue still flushes this
      // session, it just won't survive a crash.
    }
  }
}
