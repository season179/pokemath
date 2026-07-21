// Learning-quality telemetry (issue #24, M7): a closed registry of events
// that measure whether the game is teaching well — question correctness,
// topic/TP outcomes, battle abandonment, captures, and voluntary stopping —
// and nothing else. The registry is the single source of truth shared by the
// Cocos client (emit + offline queue), the Worker (ingest validation), and
// the analysis report, so an event that isn't registered here can never
// reach D1.
//
// Privacy contract (locked by the issue and meadow-isle.md "no compulsion"):
//   - NO raw answers or picked-choice values — only correct/incorrect.
//   - NO answer-speed or timing properties — thinking time is unlimited by
//     design, so duration is never measured.
//   - NO free text of any kind. Every property is an enum, a bounded
//     integer, or a short machine id matched by regex; unknown keys are
//     rejected. A child cannot leak a name, message, or answer through a
//     telemetry payload.
//   - NO streak, leaderboard, or idle-punishment signals — none of those
//     mechanics exist and none of these events can feed one.
//   - Server-side rows key on better-auth's opaque user id, never on
//     playerName/email, and expire after TELEMETRY_RETENTION_DAYS.
//
// Events marked `emitted: false` (hint_used, review_question_answered) are
// RESERVED: their schemas are fixed and validated now so the mechanics that
// produce them (hints; delayed/interleaved review — M5/M7 follow-ups) emit
// conforming data the day they ship, but no current code path emits them.
// See docs/learning-events.md for the full contract.

export const TELEMETRY_RETENTION_DAYS = 90;
/** Batch envelope caps — the Worker rejects anything larger before parsing. */
export const MAX_EVENTS_PER_BATCH = 100;
export const MAX_BATCH_JSON_BYTES = 16 * 1024;
/** Per-event props cap; every registered schema today is far under this. */
export const MAX_PROPS_JSON_BYTES = 512;
/** Client-side offline queue cap; oldest events drop first beyond it. */
export const MAX_QUEUED_EVENTS = 500;

// --- property checkers -----------------------------------------------------

type PropCheck = (value: unknown) => boolean;

const isBool: PropCheck = (v) => typeof v === "boolean";

const intIn =
  (min: number, max: number): PropCheck =>
  (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const oneOf =
  (...values: readonly string[]): PropCheck =>
  (v) =>
    typeof v === "string" && (values as string[]).includes(v);

const matches =
  (re: RegExp): PropCheck =>
  (v) =>
    typeof v === "string" && re.test(v);

// "addition" | "subtraction" | ... | "mixed (...)" — question-engine's
// operation labels are short lowercase machine strings, never prose.
const isOperation = matches(/^[a-z0-9][a-z0-9 +\-×÷()/]{0,31}$/);
// Curriculum-doc section ids like "4.1" (question-engine `topic`).
const isTopic = matches(/^[0-9]+(\.[0-9]+){0,2}$/);
// Semantic species ids from the creature registry ("woolbright", …).
const isSpeciesId = matches(/^[a-z0-9][a-z0-9-]{0,31}$/);
// PBD performance level 1..6 (question-engine `tp_level`).
const isTpLevel = intIn(1, 6);

// --- the registry ----------------------------------------------------------

export interface TelemetryEventSpec {
  /** One line on what learning question this event answers. */
  readonly summary: string;
  /** False while the producing mechanic hasn't shipped (see header). */
  readonly emitted: boolean;
  readonly required: Record<string, PropCheck>;
  readonly optional?: Record<string, PropCheck>;
}

const BATTLE_KIND = ["wild", "boss"] as const;

export const TELEMETRY_EVENTS: Record<string, TelemetryEventSpec> = {
  // One answered question turn. Boss multi-step problems emit one event per
  // step with step/steps set, so difficulty can be compared per step depth.
  question_answered: {
    summary: "Is a question of this operation/topic/TP answered correctly?",
    emitted: true,
    required: {
      battle: oneOf(...BATTLE_KIND),
      operation: isOperation,
      correct: isBool,
    },
    optional: {
      topic: isTopic,
      tp: isTpLevel,
      step: intIn(0, 7),
      steps: intIn(1, 8),
    },
  },
  // One finished battle. `fled` is player abandonment; `escaped` is a Unique
  // flying off with trust unfinished (#22); `defeated` is the all-fainted
  // loss. asked/correct give the battle's question context without timing.
  battle_outcome: {
    summary: "How often are battles finished, fled, escaped, or lost?",
    emitted: true,
    required: {
      battle: oneOf(...BATTLE_KIND),
      outcome: oneOf("won", "captured", "fled", "escaped", "defeated"),
      asked: intIn(0, 99),
      correct: intIn(0, 99),
    },
  },
  // A wild creature joined the collection. Distinct speciesId over time is
  // the collection-variety signal. Stage/variant are omitted: every wild
  // capture today is stage 1 / normal (state.ts mints them so).
  creature_captured: {
    summary: "How varied is the collection the player is building?",
    emitted: true,
    required: { speciesId: isSpeciesId },
  },
  // The player chose to stop. `sign_out` is always deliberate; `page_unload`
  // covers tab close / navigating away (it also fires on refresh, which the
  // report treats as a caveat, not a stop). duringBattle separates
  // mid-battle quitting from stopping at a natural payoff point.
  session_ended: {
    summary: "Do players stop voluntarily at healthy points?",
    emitted: true,
    required: {
      reason: oneOf("sign_out", "page_unload"),
      duringBattle: isBool,
    },
  },
  // One mini-game visit ended (M8, #88). The first non-battle mechanic: the
  // learning question is whether kids voluntarily replay an open-ended loop,
  // so `rounds` (playthroughs in one visit) and `reason` carry that signal.
  // `splitsFound` is the distinct decompositions found in the final round;
  // `duplicateAttempts` is session-total. No timing props (registry
  // convention) and no per-tap events — one row per orderly screen exit.
  minigame_session_ended: {
    summary: "Do kids voluntarily replay a non-battle mechanic?",
    emitted: true,
    required: {
      minigame: oneOf("flock-splits"),
      reason: oneOf("completed", "exited"),
      splitsFound: intIn(0, 5),
      duplicateAttempts: intIn(0, 99),
      rounds: intIn(1, 99),
    },
  },
  // RESERVED — no hint mechanic exists yet. Emitted once hints ship.
  hint_used: {
    summary: "Which operations/topics need scaffolding?",
    emitted: false,
    required: {
      battle: oneOf(...BATTLE_KIND),
      operation: isOperation,
    },
    optional: { topic: isTopic, tp: isTpLevel },
  },
  // RESERVED — delayed/interleaved review is a later-island feature
  // (meadow-isle.md M7). Emitted once review questions ship.
  review_question_answered: {
    summary: "Does a topic survive a delay, not just the moment?",
    emitted: false,
    required: { operation: isOperation, correct: isBool },
    optional: { topic: isTopic, tp: isTpLevel },
  },
};

export type TelemetryEventName = keyof typeof TELEMETRY_EVENTS;

/** An event as it crosses the wire: client-minted, server-deduped. */
export interface ClientTelemetryEvent {
  /** Client-minted unique id; the server dedupes on (user_id, id). */
  id: string;
  name: TelemetryEventName;
  /** Client-clock ISO timestamp. Analysis-only; retention keys on server time. */
  at: string;
  props: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Client-minted ids are UUIDs in practice; any short unique token is fine.
const EVENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Validate one raw client event against the registry. Returns an error
 * string describing the first problem, or null when the event is clean.
 * Reserved (not-yet-emitted) events DO validate: the schema is live, only
 * the producing mechanic is pending.
 */
export function validateTelemetryEvent(raw: unknown): string | null {
  if (!isRecord(raw)) return "event is not an object";
  const { id, name, at, props } = raw as Record<string, unknown>;
  if (typeof id !== "string" || !EVENT_ID_RE.test(id)) return "bad event id";
  if (typeof name !== "string" || !(name in TELEMETRY_EVENTS)) return "unknown event name";
  const spec = TELEMETRY_EVENTS[name];
  if (typeof at !== "string" || Number.isNaN(Date.parse(at))) return "bad timestamp";
  if (!isRecord(props)) return "props is not an object";
  if (JSON.stringify(props).length > MAX_PROPS_JSON_BYTES) return "props too large";

  const allowed = { ...spec.required, ...spec.optional };
  for (const key of Object.keys(props)) {
    if (!(key in allowed)) return `unknown prop "${key}"`;
  }
  for (const [key, check] of Object.entries(spec.required)) {
    if (!(key in props)) return `missing prop "${key}"`;
    if (!check(props[key])) return `bad prop "${key}"`;
  }
  for (const [key, check] of Object.entries(spec.optional ?? {})) {
    if (key in props && !check(props[key])) return `bad prop "${key}"`;
  }
  return null;
}

export interface ParsedEventBatch {
  events: ClientTelemetryEvent[];
  /** Count of individually invalid events dropped from the batch. */
  dropped: number;
}

/**
 * Parse and validate a POST /api/events body. Malformed envelopes return
 * null (whole-request 400); individually invalid events are dropped and
 * counted so one bad event never poisons the batch.
 */
export function parseEventBatch(body: unknown): ParsedEventBatch | null {
  if (!isRecord(body) || !Array.isArray(body.events)) return null;
  if (body.events.length > MAX_EVENTS_PER_BATCH) return null;
  const events: ClientTelemetryEvent[] = [];
  let dropped = 0;
  for (const raw of body.events) {
    if (validateTelemetryEvent(raw) === null) {
      events.push(raw as ClientTelemetryEvent);
    } else {
      dropped++;
    }
  }
  return { events, dropped };
}
