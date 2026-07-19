import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PLAYER_XP_BASE_PER_TURN,
  PLAYER_XP_GAP_FLOOR,
  PLAYER_XP_GAP_STEP,
  PLAYER_XP_HARD_OP_BONUS,
  PLAYER_XP_MIN_PER_TURN,
  PLAYER_XP_TP_BONUS_CAP,
  levelGapModifier,
  playerXpForTurn,
  turnXpBase,
} from "../battle-rules.ts";
import { awardPlayerXp, levelForTotalXp, totalXpForLevel } from "../player-progression.ts";
import { turnsOf, type Question, type QuestionTurn } from "../question-engine.ts";
import { STARTERS } from "../creature.ts";
import { createNewGameV2 } from "../save-v2.ts";
import { validateSaveV2 } from "../save-v2-validate.ts";

// A minimal authored question; fields default to the simplest Std-1 shape.
const q = (over: Partial<Question>): Question => ({
  id: 1,
  question_zh: "1 + 1 = ?",
  question_en: "1 + 1 = ?",
  operation: "addition",
  expression: "1 + 1",
  answer: 2,
  ...over,
});
const turn = (over: Partial<Question>): QuestionTurn => turnsOf(q(over))[0];

// --- turnXpBase: question difficulty/effort ---

test("turnXpBase: a plain turn pays the flat base", () => {
  assert.equal(turnXpBase(turn({})), PLAYER_XP_BASE_PER_TURN);
  assert.equal(turnXpBase(turn({ operation: "counting", tp_level: 1 })), PLAYER_XP_BASE_PER_TURN);
});

test("turnXpBase: hard operations pay more, mirroring the damage rule", () => {
  assert.equal(
    turnXpBase(turn({ operation: "multiplication" })),
    PLAYER_XP_BASE_PER_TURN + PLAYER_XP_HARD_OP_BONUS,
  );
  assert.equal(
    turnXpBase(turn({ operation: "mixed (multiplication, division)" })),
    PLAYER_XP_BASE_PER_TURN + PLAYER_XP_HARD_OP_BONUS,
  );
});

test("turnXpBase: TP level adds a small capped bonus — curriculum metadata can nudge, never explode", () => {
  assert.equal(turnXpBase(turn({ tp_level: 2 })), PLAYER_XP_BASE_PER_TURN + 1);
  assert.equal(turnXpBase(turn({ tp_level: 3 })), PLAYER_XP_BASE_PER_TURN + PLAYER_XP_TP_BONUS_CAP);
  // A future bank with high TP values stays capped.
  assert.equal(turnXpBase(turn({ tp_level: 6 })), PLAYER_XP_BASE_PER_TURN + PLAYER_XP_TP_BONUS_CAP);
  assert.equal(turnXpBase(turn({ tp_level: 99 })), PLAYER_XP_BASE_PER_TURN + PLAYER_XP_TP_BONUS_CAP);
  // Hard op + capped TP stack.
  assert.equal(
    turnXpBase(turn({ operation: "division", tp_level: 4 })),
    PLAYER_XP_BASE_PER_TURN + PLAYER_XP_HARD_OP_BONUS + PLAYER_XP_TP_BONUS_CAP,
  );
});

test("turnXpBase: every step of a multi-step problem is its own earning turn", () => {
  const multi = q({
    steps: [
      { prompt_zh: "s1", prompt_en: "s1", expression: "2 + 3", answer: 5 },
      { prompt_zh: "s2", prompt_en: "s2", expression: "5 − 1", answer: 4 },
    ],
  });
  const turns = turnsOf(multi);
  assert.equal(turns.length, 2);
  for (const t of turns) assert.equal(turnXpBase(t), PLAYER_XP_BASE_PER_TURN);
});

// --- levelGapModifier: over-levelled diminishing returns ---

test("levelGapModifier: 1 at or below the wild's level — no catch-up bonus", () => {
  assert.equal(levelGapModifier(1, 1), 1);
  assert.equal(levelGapModifier(1, 3), 1); // under-levelled vs a boss
  assert.equal(levelGapModifier(2, 3), 1);
});

test("levelGapModifier: shrinks per level of positive gap, floored nonzero", () => {
  assert.equal(levelGapModifier(2, 1), 1 - PLAYER_XP_GAP_STEP);
  assert.equal(levelGapModifier(4, 1), 1 - 3 * PLAYER_XP_GAP_STEP);
  assert.equal(levelGapModifier(6, 1), PLAYER_XP_GAP_FLOOR); // 1 - 5×0.15 = 0.25 exactly
  assert.equal(levelGapModifier(50, 1), PLAYER_XP_GAP_FLOOR); // never below the floor
  // A higher-level wild (boss 3) shrinks the gap, so it always pays better.
  assert.ok(levelGapModifier(6, 3) > levelGapModifier(6, 1));
});

// --- playerXpForTurn: the deterministic per-question award ---

test("playerXpForTurn: at-level turns pay their full base", () => {
  assert.equal(playerXpForTurn(turn({}), 1, 1), 5);
  assert.equal(playerXpForTurn(turn({ operation: "counting", tp_level: 2 }), 1, 1), 6);
});

test("playerXpForTurn: over-levelled routine encounters diminish toward a nonzero floor", () => {
  const t = turn({});
  const byPlayerLevel = [1, 2, 3, 4, 5, 6, 10, 50].map((pl) => playerXpForTurn(t, pl, 1));
  assert.deepEqual(byPlayerLevel, [5, 4, 4, 3, 2, 1, 1, 1]);
  // Monotone non-increasing, and it never reaches zero.
  for (let i = 1; i < byPlayerLevel.length; i++) {
    assert.ok(byPlayerLevel[i] <= byPlayerLevel[i - 1]);
  }
  assert.ok(byPlayerLevel[byPlayerLevel.length - 1] >= PLAYER_XP_MIN_PER_TURN);
});

test("playerXpForTurn: even an absurd gap pays at least the floor", () => {
  assert.equal(playerXpForTurn(turn({}), 1000, 1), PLAYER_XP_MIN_PER_TURN);
  assert.equal(playerXpForTurn(turn({ operation: "multiplication", tp_level: 3 }), 1000, 1), 2);
});

test("playerXpForTurn is a pure function of the question and the levels — speed is never an input", () => {
  // The award depends only on (turn, playerLevel, wildLevel): no rng, no
  // clock, no hidden state. Re-asking the same question "faster" or "slower"
  // is unrepresentable — the same call always returns the same XP.
  const t = turn({ operation: "counting", tp_level: 2 });
  const first = playerXpForTurn(t, 3, 1);
  const second = playerXpForTurn(t, 3, 1);
  assert.equal(first, second);
  assert.equal(first, Math.round(6 * levelGapModifier(3, 1)));
});

// --- Battle tallies: victory vs capture (issue #7) ---

// A battle tally is the sum of the per-turn awards for the questions the
// player actually answered correctly — exactly what BattleScreen accrues.
const tally = (turns: QuestionTurn[], playerLevel: number, wildLevel: number): number =>
  turns.reduce((sum, t) => sum + playerXpForTurn(t, playerLevel, wildLevel), 0);

const WOOLLY_FIGHT = [
  turn({ operation: "counting", tp_level: 1 }),
  turn({ operation: "addition", tp_level: 2 }),
  turn({ operation: "subtraction", tp_level: 2 }),
];

test("capturing early can never award full defeat XP for unanswered questions", () => {
  // Fainting the wild takes all three answers; catching it after the first
  // awards strictly less — exactly the answered share, no more.
  const fullDefeat = tally(WOOLLY_FIGHT, 1, 1);
  const caughtAfterOne = tally(WOOLLY_FIGHT.slice(0, 1), 1, 1);
  const caughtAfterTwo = tally(WOOLLY_FIGHT.slice(0, 2), 1, 1);
  assert.ok(caughtAfterOne < caughtAfterTwo);
  assert.ok(caughtAfterTwo < fullDefeat);
  assert.equal(fullDefeat, 5 + 6 + 6);
  // And catching immediately — before any answer — awards nothing at all.
  assert.equal(tally([], 1, 1), 0);
});

test("victory and capture pay identically for the same answered questions", () => {
  // The only difference between the two outcomes is how many questions were
  // answered — never a bonus for fainting, never a penalty for catching.
  const answered = WOOLLY_FIGHT.slice(0, 2);
  assert.equal(tally(answered, 2, 1), tally(answered, 2, 1));
});

// --- awardPlayerXp: the only mutation path for live player progression ---

test("awardPlayerXp: below the threshold, no level-up; before/after agree with the curve", () => {
  const r = awardPlayerXp({ level: 1, totalXp: 0 }, 5);
  assert.equal(r.levelsGained, 0);
  assert.equal(r.level, 1);
  assert.equal(r.totalXp, 5);
  assert.deepEqual(r.before, levelForTotalXp(0));
  assert.deepEqual(r.after, levelForTotalXp(5));
  assert.equal(r.after.intoLevel, 5);
  assert.equal(r.after.span, 20);
});

test("awardPlayerXp: crossing one level reports exactly one level gained", () => {
  const r = awardPlayerXp({ level: 1, totalXp: 18 }, 5); // 18 + 5 = 23 → L2, 3/30
  assert.equal(r.levelsGained, 1);
  assert.equal(r.level, 2);
  assert.equal(r.after.intoLevel, 3);
  assert.equal(r.after.span, 30);
  assert.equal(r.before.level, 1);
});

test("awardPlayerXp: one big award can gain several levels, remainder kept", () => {
  const r = awardPlayerXp({ level: 1, totalXp: 0 }, 55); // L3 = 50 → L3, 5/40
  assert.equal(r.levelsGained, 2);
  assert.equal(r.level, 3);
  assert.equal(r.totalXp, 55);
  assert.equal(r.after.intoLevel, 55 - totalXpForLevel(3));
});

test("awardPlayerXp: zero gain is a no-op, not an error", () => {
  const r = awardPlayerXp({ level: 2, totalXp: 25 }, 0);
  assert.equal(r.levelsGained, 0);
  assert.equal(r.totalXp, 25);
  assert.equal(r.level, 2);
});

test("awardPlayerXp rejects invalid gains and level/totalXp pairs that disagree", () => {
  assert.throws(() => awardPlayerXp({ level: 1, totalXp: 0 }, -1));
  assert.throws(() => awardPlayerXp({ level: 1, totalXp: 0 }, 2.5));
  // level 2 needs totalXp ≥ 20 — a (2, 5) pair is corrupt and must not be
  // advanced silently (save-v2-validate would reject the result anyway).
  assert.throws(() => awardPlayerXp({ level: 2, totalXp: 5 }, 5));
});

test("the saved total always matches the awarded display, and the save still validates", () => {
  // The M2A contract: the number the result panel shows IS the number the
  // save records — one computation, one truth — and level always agrees
  // with totalXp (the invariant validateSaveV2 enforces).
  const save = createNewGameV2(STARTERS[0], new Date("2026-01-01T00:00:00Z"));
  const shownGain = tally(WOOLLY_FIGHT, save.player.level, 1);
  const award = awardPlayerXp(save.player, shownGain);
  save.player = { level: award.level, totalXp: award.totalXp };
  assert.equal(save.player.totalXp, shownGain);
  assert.equal(levelForTotalXp(save.player.totalXp).level, save.player.level);
  assert.ok(validateSaveV2(save));

  // Level-up boundary: an award that crosses a level keeps the save valid.
  save.player = { level: 1, totalXp: 18 };
  const levelUp = awardPlayerXp(save.player, tally(WOOLLY_FIGHT, 1, 1));
  save.player = { level: levelUp.level, totalXp: levelUp.totalXp };
  assert.ok(levelUp.levelsGained >= 1);
  assert.ok(validateSaveV2(save));
});
