// Battle arithmetic and encounter tuning.
// Pure functions with injectable rng so tests are deterministic.
// Ported from the prototype's battle.js / shop.js.

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

// Bigger creatures teach more — and pay more.
export function xpReward(wildMaxHp: number): number {
  return wildMaxHp;
}

export function prizeMoney(wildMaxHp: number): number {
  return wildMaxHp * PRIZE_MULTIPLIER;
}
