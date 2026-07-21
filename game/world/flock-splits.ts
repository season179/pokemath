// Flock Splits 分羊群 (M8, #88): the first open-ended mini-game. A corral in
// Woolly Meadows where the child partitions ten fluffballs between two pens
// however they like; every non-empty split is accepted, and the delight is
// discovering distinct decompositions (6 + 4 = 10), not being judged.
//
// This module is deliberately NOT an answer_form precedent. It is a
// mini-game-local pure rule over previously-unrecorded non-empty splits;
// shared/question-v2.ts and the routed banks stay frozen, and meadow-isle.md's
// open "first-class activity answer form" question remains open.
//
// Pure only — no `cc` imports — so the rule and entry placement are tested in
// node like arc.ts (game/tests/flock-splits.test.ts). The Cocos screen holds a
// FlockSession but mutates it only through these functions; it never edits
// state by hand. This source mirrors to game/assets/src/world/ via sync.

import type { ArcCritter } from "./arc.ts";

// --- the game ---------------------------------------------------------------

/** The fixed flock size. Numbers ≤ 100 and +/− only is a Meadow law. */
export const FLOCK_TOTAL = 10;
/** Distinct unordered non-empty splits needed to complete a session. */
export const FLOCK_GOAL = 3;
/** Closed minigame id (telemetry `minigame` prop). */
export const MINIGAME_ID = "flock-splits";

/** The total number of distinct unordered non-empty splits of 10: {1+9..5+5}. */
export const MAX_SPLITS_OF_TEN = 5;

/**
 * One screen visit. `found` is the current round's discovered decompositions
 * and resets on replay; `dupes` and `rounds` are session-total so a replay
 * decision is visible in telemetry. `staging + pens[0] + pens[1]` is always
 * FLOCK_TOTAL — the conservation invariant is tested.
 */
export interface FlockSession {
	readonly staging: number;
	readonly pens: readonly [number, number];
	readonly found: readonly string[];
	readonly rounds: number;
	readonly dupes: number;
}

/** A fresh visit: all ten fluffballs in staging, nothing found, round one. */
export function newFlockSession(): FlockSession {
	return { staging: FLOCK_TOTAL, pens: [0, 0], found: [], rounds: 1, dupes: 0 };
}

/**
 * Move one fluffball from staging into pen `pen`. A no-op when staging is
 * empty so an over-eager tap never breaks the conservation invariant.
 */
export function sendToPen(s: FlockSession, pen: 0 | 1): FlockSession {
	if (s.staging <= 0) return s;
	const pens = [...s.pens] as [number, number];
	pens[pen] += 1;
	return { ...s, staging: s.staging - 1, pens };
}

/** Return one fluffball from pen `pen` to staging; a no-op when it is empty. */
export function returnToStaging(s: FlockSession, pen: 0 | 1): FlockSession {
	if (s.pens[pen] <= 0) return s;
	const pens = [...s.pens] as [number, number];
	pens[pen] -= 1;
	return { ...s, staging: s.staging + 1, pens };
}

/**
 * The unordered decomposition key, smaller count first: canonicalKey(6,4) and
 * canonicalKey(4,6) both yield "4+6", so a split and its mirror count once.
 */
export function canonicalKey(a: number, b: number): string {
	return a <= b ? `${a}+${b}` : `${b}+${a}`;
}

export type SplitSubmit =
	| { readonly kind: "accepted"; readonly key: string; readonly complete: boolean }
	| { readonly kind: "duplicate" }
	| { readonly kind: "empty-pen" }
	| { readonly kind: "incomplete" };

/**
 * Decide a submit's outcome WITHOUT mutating — the screen renders the verdict,
 * then applySubmit carries the state forward. Order matters: a half-placed
 * corral is "incomplete" (sheep still outside) regardless of pen contents, so
 * the gentle nudge always points at the right thing to do next.
 */
export function submitSplit(s: FlockSession): SplitSubmit {
	if (s.staging > 0) return { kind: "incomplete" };
	if (s.pens[0] === 0 || s.pens[1] === 0) return { kind: "empty-pen" };
	const key = canonicalKey(s.pens[0], s.pens[1]);
	if (s.found.includes(key)) return { kind: "duplicate" };
	return { kind: "accepted", key, complete: s.found.length + 1 >= FLOCK_GOAL };
}

/**
 * Carry a submit's verdict into the next session. An accepted split records
 * the key and returns every fluffball to staging for the next arrangement;
 * a duplicate just counts the retry; empty-pen and incomplete change nothing.
 */
export function applySubmit(s: FlockSession, result: SplitSubmit): FlockSession {
	switch (result.kind) {
		case "accepted":
			return {
				...newFlockSession(),
				found: [...s.found, result.key],
				rounds: s.rounds,
				dupes: s.dupes,
			};
		case "duplicate":
			return { ...s, dupes: s.dupes + 1 };
		default:
			return s;
	}
}

/** True once FLOCK_GOAL distinct splits are found this round. */
export function isComplete(s: FlockSession): boolean {
	return s.found.length >= FLOCK_GOAL;
}

/**
 * Replay after completion: a fresh round (found cleared, pens emptied) but
 * `rounds` increments so telemetry can see the voluntary replay, and `dupes`
 * carries across the whole visit.
 */
export function replay(s: FlockSession): FlockSession {
	return { ...newFlockSession(), rounds: s.rounds + 1, dupes: s.dupes };
}

/**
 * The metadata-only `minigame_session_ended` props for one visit. Pure so the
 * payload is testable and the screen never hand-builds telemetry. No timing
 * props — the registry forbids them by convention (thinking time is unlimited).
 */
export function minigameSessionEndedProps(
	s: FlockSession,
	reason: "completed" | "exited",
): {
	minigame: string;
	reason: "completed" | "exited";
	splitsFound: number;
	duplicateAttempts: number;
	rounds: number;
} {
	return {
		minigame: MINIGAME_ID,
		reason,
		splitsFound: s.found.length,
		duplicateAttempts: s.dupes,
		rounds: s.rounds,
	};
}

// --- the entry critter ------------------------------------------------------

export const FLOCK_SPLITS_CRITTER_ID = "flock-splits-corral";

/**
 * The corral fluffball stands on this walkable meadow/woolly tile — one step
 * below the row-7 path the child walks from the dock, so it is found without
 * blocking the ring route. A test pins the tile as walkable; if the map is
 * ever re-authored, the test fails loudly instead of stranding the critter.
 */
export const FLOCK_SPLITS_ENTRY = { x: 6, y: 8 } as const;

/**
 * The corral entry critter for a region: one placeholder fluffball in Woolly
 * Meadows, none elsewhere. `kind: "minigame"` so WorldScreen routes a bump to
 * the mini-game instead of a scripted battle. The `topic` field is required by
 * ArcCritter but never read for a non-battle kind, so it loads no bank.
 */
export function flockSplitsCrittersFor(regionId: string): ArcCritter[] {
	if (regionId !== "meadow/woolly") return [];
	return [
		{
			id: FLOCK_SPLITS_CRITTER_ID,
			x: FLOCK_SPLITS_ENTRY.x,
			y: FLOCK_SPLITS_ENTRY.y,
			speciesId: "woolly/fluffball",
			topic: "4.1",
			kind: "minigame",
		},
	];
}
