// Flock Splits (M8, #88): the pure rule and entry-critter placement are tested
// here — FlockSplitsScreen and GameApp only render and route it. The rule is
// a mini-game-local validator over previously-unrecorded non-empty splits; it
// is deliberately not an answer_form precedent (shared/question-v2.ts frozen).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
	FLOCK_GOAL,
	FLOCK_SPLITS_CRITTER_ID,
	FLOCK_SPLITS_ENTRY,
	FLOCK_TOTAL,
	MAX_SPLITS_OF_TEN,
	MINIGAME_ID,
	applySubmit,
	canonicalKey,
	flockSplitsCrittersFor,
	isComplete,
	minigameSessionEndedProps,
	newFlockSession,
	replay,
	returnToStaging,
	sendToPen,
	submitSplit,
} from "../world/flock-splits.ts";
import { isWalkable, region, tileAt } from "../world/regions/index.ts";

// A helper that places a split into both pens from staging, asserting the
// conservation invariant holds at every step.
function arrange(a: number, b: number) {
	let s = newFlockSession();
	assert.equal(s.staging + s.pens[0] + s.pens[1], FLOCK_TOTAL);
	for (let i = 0; i < a; i++) s = sendToPen(s, 0);
	for (let i = 0; i < b; i++) s = sendToPen(s, 1);
	assert.deepEqual(s.pens, [a, b]);
	assert.equal(s.staging, 0);
	return s;
}

// --- canonicalization -------------------------------------------------------

test("flock-splits: canonical key is unordered (4+6 and 6+4 collide)", () => {
	assert.equal(canonicalKey(4, 6), "4+6");
	assert.equal(canonicalKey(6, 4), "4+6");
	assert.equal(canonicalKey(5, 5), "5+5");
	assert.equal(canonicalKey(0, 10), "0+10");
});

test("flock-splits: there are exactly five distinct unordered non-empty splits of 10", () => {
	const keys = new Set<string>();
	for (let a = 1; a <= 9; a++) keys.add(canonicalKey(a, 10 - a));
	assert.equal(keys.size, MAX_SPLITS_OF_TEN);
	assert.deepEqual([...keys].sort(), ["1+9", "2+8", "3+7", "4+6", "5+5"]);
});

// --- conservation invariant -------------------------------------------------

test("flock-splits: staging + pens is always FLOCK_TOTAL under every move", () => {
	let s = newFlockSession();
	for (let i = 0; i < 50; i++) {
		const pen = (i % 2) as 0 | 1;
		s = sendToPen(s, pen);
		assert.equal(s.staging + s.pens[0] + s.pens[1], FLOCK_TOTAL);
		// Returning from a pen keeps the invariant too.
		if (s.pens[pen] > 0) {
			s = returnToStaging(s, pen);
			assert.equal(s.staging + s.pens[0] + s.pens[1], FLOCK_TOTAL);
		}
	}
});

test("flock-splits: sendToPen / returnToStaging are no-ops at their floors", () => {
	const empty = newFlockSession();
	assert.equal(empty.staging, FLOCK_TOTAL);
	// returnToStaging on empty pens changes nothing.
	assert.deepEqual(returnToStaging(empty, 0), empty);
	assert.deepEqual(returnToStaging(empty, 1), empty);
	// Drain staging fully, then sendToPen is a no-op.
	let s = empty;
	for (let i = 0; i < FLOCK_TOTAL; i++) s = sendToPen(s, 0);
	assert.equal(s.staging, 0);
	assert.equal(s.pens[0], FLOCK_TOTAL);
	const drained = s;
	assert.deepEqual(sendToPen(drained, 1), drained);
});

// --- the four submit paths --------------------------------------------------

test("flock-splits: sheep still in staging is incomplete, never recorded", () => {
	const s = sendToPen(newFlockSession(), 0); // 1 in pen 0, 9 staging
	const result = submitSplit(s);
	assert.equal(result.kind, "incomplete");
	assert.deepEqual(applySubmit(s, result), s);
});

test("flock-splits: a duplicate decomposition is gentle and counts the retry", () => {
	let s = arrange(6, 4);
	const first = submitSplit(s);
	assert.equal(first.kind, "accepted");
	s = applySubmit(s, first); // found: ["4+6"]
	// The mirror (4+6) and the same (6+4) are both duplicates now — arrange
	// rebuilds from scratch, so carry s.found into the test session.
	const mirror = { ...arrange(4, 6), found: s.found };
	assert.equal(submitSplit(mirror).kind, "duplicate");
	const again = { ...arrange(6, 4), found: s.found };
	const dup = submitSplit(again);
	assert.equal(dup.kind, "duplicate");
	s = applySubmit(again, dup);
	assert.equal(s.dupes, 1);
	assert.equal(s.found.length, 1, "a duplicate never extends found");
	// Issue #88 mandates "sheep stay put" on a duplicate: the child sees the
	// rejected arrangement and adjusts it, rather than having it erased.
	assert.equal(s.staging, 0);
	assert.deepEqual(s.pens, [6, 4]);
});

test("flock-splits: a fresh non-empty split is accepted and recorded", () => {
	const s = arrange(3, 7);
	const result = submitSplit(s);
	assert.equal(result.kind, "accepted");
	assert.equal(result.kind === "accepted" && result.key, "3+7");
	assert.equal(result.kind === "accepted" && result.complete, false);
	const next = applySubmit(s, result);
	assert.deepEqual(next.found, ["3+7"]);
	// Pens reset to staging for the next arrangement.
	assert.equal(next.staging, FLOCK_TOTAL);
	assert.deepEqual(next.pens, [0, 0]);
});

test("flock-splits: 10+0 and 0+10 are both empty-pen, never recorded", () => {
	const tenZero = arrange(10, 0);
	assert.equal(submitSplit(tenZero).kind, "empty-pen");
	const zeroTen = arrange(0, 10);
	assert.equal(submitSplit(zeroTen).kind, "empty-pen");
});

// --- the goal ---------------------------------------------------------------

test("flock-splits: the goal completes at exactly FLOCK_GOAL distinct splits", () => {
	let s = newFlockSession();
	// The first two accepted splits do not complete.
	for (const [a, b] of [[6, 4], [3, 7]] as const) {
		const filled = arrange(a, b);
		const res = submitSplit({ ...filled, found: s.found });
		assert.equal(res.kind, "accepted");
		s = applySubmit({ ...filled, found: s.found }, res);
		assert.equal(isComplete(s), false, "two splits is not yet complete");
	}
	// The third accepted split completes.
	const third = arrange(2, 8);
	const res = submitSplit({ ...third, found: s.found });
	assert.equal(res.kind, "accepted");
	assert.equal(res.kind === "accepted" && res.complete, true);
	s = applySubmit({ ...third, found: s.found }, res);
	assert.equal(s.found.length, FLOCK_GOAL);
	assert.ok(isComplete(s));
});

// --- replay -----------------------------------------------------------------

test("flock-splits: replay clears found, bumps rounds, and keeps dupes", () => {
	let s = arrange(6, 4);
	s = applySubmit(s, submitSplit(s)); // found: ["4+6"], rounds: 1
	const dup = arrange(6, 4);
	s = applySubmit({ ...dup, found: s.found }, submitSplit({ ...dup, found: s.found }));
	assert.equal(s.dupes, 1);
	const after = replay(s);
	assert.deepEqual(after.found, []);
	assert.equal(after.staging, FLOCK_TOTAL);
	assert.deepEqual(after.pens, [0, 0]);
	assert.equal(after.rounds, 2, "rounds increments on replay");
	assert.equal(after.dupes, 1, "dupes carry across the visit");
});

// --- the entry critter ------------------------------------------------------

test("flock-splits: the corral entry critter stands on a walkable woolly tile", () => {
	const woolly = region("meadow/woolly");
	const [critter] = flockSplitsCrittersFor("meadow/woolly");
	assert.equal(critter.id, FLOCK_SPLITS_CRITTER_ID);
	assert.equal(critter.speciesId, "woolly/fluffball");
	assert.equal(critter.kind, "minigame");
	assert.deepEqual({ x: critter.x, y: critter.y }, FLOCK_SPLITS_ENTRY);
	assert.ok(
		isWalkable(woolly, FLOCK_SPLITS_ENTRY.x, FLOCK_SPLITS_ENTRY.y),
		`entry tile ${FLOCK_SPLITS_ENTRY.x},${FLOCK_SPLITS_ENTRY.y} must be walkable`,
	);
	assert.notEqual(tileAt(woolly, FLOCK_SPLITS_ENTRY.x, FLOCK_SPLITS_ENTRY.y), "g");
});

test("flock-splits: the entry critter appears only in Woolly Meadows", () => {
	assert.equal(flockSplitsCrittersFor("meadow/woolly").length, 1);
	assert.deepEqual(flockSplitsCrittersFor("meadow/dock"), []);
	assert.deepEqual(flockSplitsCrittersFor("harbor"), []);
});

// --- telemetry payload ------------------------------------------------------

test("flock-splits: telemetry props are metadata-only and well-formed", () => {
	let s = arrange(6, 4);
	s = applySubmit(s, submitSplit(s)); // found: 1
	const props = minigameSessionEndedProps(s, "exited");
	assert.equal(props.minigame, MINIGAME_ID);
	assert.equal(props.reason, "exited");
	assert.equal(props.splitsFound, 1);
	assert.equal(props.duplicateAttempts, 0);
	assert.equal(props.rounds, 1);
	// The registry contract: no free text, no timing — only the five fields.
	assert.deepEqual(Object.keys(props).sort(), [
		"duplicateAttempts",
		"minigame",
		"reason",
		"rounds",
		"splitsFound",
	]);
});

test("flock-splits: a completed session reports the completed reason", () => {
	let s = newFlockSession();
	for (const [a, b] of [[6, 4], [3, 7], [2, 8]] as const) {
		const filled = { ...arrange(a, b), found: s.found };
		s = applySubmit(filled, submitSplit(filled));
	}
	assert.ok(isComplete(s));
	const props = minigameSessionEndedProps(s, "completed");
	assert.equal(props.reason, "completed");
	assert.equal(props.splitsFound, FLOCK_GOAL);
});
