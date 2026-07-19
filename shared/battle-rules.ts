// Battle arithmetic and encounter tuning.
// Pure functions with injectable rng so tests are deterministic.
// Ported from the prototype's battle.js / shop.js.

import type { QuestionTurn } from "./question-engine.ts";

// --- Encounter tuning (overworld) ---
export const ENCOUNTER_RATE = 0.2; // chance per step onto tall grass
export const BOSS_CHANCE = 0.15; // of encounters

// --- Battle constants ---
export const POTION_HEAL = 10;
export const PRIZE_MULTIPLIER = 5; // wins pay 5× the wild creature's max HP
export const HARD_OPERATION_BONUS = 3; // × and ÷ hit harder than + and −
export const BOSS_FINAL_BLOW_MULTIPLIER = 2; // finishing a multi-step problem

export function rollDamage(attack: number, rng: () => number = Math.random): number {
  return attack + Math.floor(rng() * 3);
}

// × and ÷ problems are harder, so solving one lands a heavier hit.
export function isHardOperation(operation: string): boolean {
  return /multiplication|division/.test(operation);
}

export function correctAnswerDamage(baseDamage: number, operation: string): number {
  return baseDamage + (isHardOperation(operation) ? HARD_OPERATION_BONUS : 0);
}

// Bigger creatures pay more. (The legacy creature-facing XP reward lived here
// as xpReward(wildMaxHp); since M2A battles award PLAYER XP per answered
// question — see the section below — and creature XP is migration-only.)
export function prizeMoney(wildMaxHp: number): number {
  return wildMaxHp * PRIZE_MULTIPLIER;
}

// --- Player battle XP (M2A, issue #7) ---
//
// The PLAYER, not the creature, earns XP (meadow-isle.md "Progression,
// collection, and reward contract"). XP accrues per correctly answered
// question turn; victory and capture both award exactly the accrued tally,
// so capturing early can never award full defeat XP for unanswered
// questions — and catching is never worse than fainting for the same
// questions (the caught creature itself is the capture reward; prize money
// stays defeat-only).
//
// Deterministic by construction: the award for a turn is a pure function of
// the question (difficulty/effort) and the level gap. There is no rng and no
// clock anywhere in this section — answer speed is NEVER rewarded.

/** Base XP for one correctly answered turn. */
export const PLAYER_XP_BASE_PER_TURN = 5;
/** Extra XP for a ×/÷ turn (mirrors HARD_OPERATION_BONUS on damage). */
export const PLAYER_XP_HARD_OP_BONUS = 2;
/** Extra XP per TP level above 1, capped — TP is curriculum metadata, so a
 *  future bank with high TP values may only nudge the award, never explode it. */
export const PLAYER_XP_TP_BONUS_CAP = 2;
/** XP multiplier lost per level the player is above the wild creature. */
export const PLAYER_XP_GAP_STEP = 0.15;
/** Over-levelled routine encounters diminish toward this nonzero floor
 *  (meadow-isle.md: "A breeze stays a breeze") — never to zero. */
export const PLAYER_XP_GAP_FLOOR = 0.25;
/** A correct answer always teaches something: the nonzero XP floor. */
export const PLAYER_XP_MIN_PER_TURN = 1;

/**
 * The level-gap modifier: 1 when the player is at or below the wild's level
 * (no catch-up bonus — M7 tuning territory), shrinking by GAP_STEP per level
 * above, floored at GAP_FLOOR. Bosses (higher level) shrink the gap and so
 * always pay better than routine encounters.
 */
export function levelGapModifier(playerLevel: number, wildLevel: number): number {
  const gap = Math.max(0, playerLevel - wildLevel);
  return Math.max(PLAYER_XP_GAP_FLOOR, 1 - PLAYER_XP_GAP_STEP * gap);
}

/**
 * Difficulty/effort base for one turn: the flat base, plus the hard-operation
 * bonus, plus a capped bonus from the question's TP level (PBD performance
 * level 1..6 on curriculum-anchored banks; missing/legacy banks get the base).
 * Multi-step problems accrue per step — each step is its own turn with its
 * own base. (A boss's final-blow damage multiplier is combat drama only; it
 * deliberately does NOT multiply XP.)
 */
export function turnXpBase(turn: QuestionTurn): number {
  let xp = PLAYER_XP_BASE_PER_TURN;
  if (isHardOperation(turn.question.operation)) xp += PLAYER_XP_HARD_OP_BONUS;
  const tp = turn.question.tp_level;
  if (typeof tp === "number" && Number.isFinite(tp)) {
    xp += Math.min(Math.max(0, Math.round(tp) - 1), PLAYER_XP_TP_BONUS_CAP);
  }
  return xp;
}

/**
 * XP the player earns for one correctly answered turn: difficulty/effort
 * base scaled by the level-gap modifier, rounded to an integer, never below
 * the nonzero floor.
 */
export function playerXpForTurn(
  turn: QuestionTurn,
  playerLevel: number,
  wildLevel: number,
): number {
  return Math.max(
    PLAYER_XP_MIN_PER_TURN,
    Math.round(turnXpBase(turn) * levelGapModifier(playerLevel, wildLevel)),
  );
}
