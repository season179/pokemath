import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Creature,
  SPECIES,
  STARTERS,
  XP_PER_LEVEL,
  BOSS_RULES,
} from "../creature.ts";
import {
  BOSS_FINAL_BLOW_MULTIPLIER,
  HARD_OPERATION_BONUS,
  UNIQUE_FLEE_ACTIONS,
  UNIQUE_TRUST_MAX,
  correctAnswerDamage,
  createUniqueHunt,
  isHardOperation,
  prizeMoney,
  rollDamage,
  settleUniqueQuestion,
} from "../battle-rules.ts";
import { makeChangeQuestion, SHOP_ITEMS } from "../shop-rules.ts";

const constRng = (v: number) => () => v;

const digitell = SPECIES.find((s) => s.name === "Digitell")!;

test("fromSpecies: a wild creature starts at full health, level 1", () => {
  const c = Creature.fromSpecies(digitell);
  assert.equal(c.hp, c.maxHp);
  assert.equal(c.level, 1);
  assert.equal(c.xp, 0);
  assert.equal(c.boss, false);
  assert.equal(c.fainted, false);
});

test("boss: double HP, +1 attack, level 3, marked boss", () => {
  const b = Creature.boss(digitell);
  assert.equal(b.name, "Boss Digitell");
  assert.equal(b.maxHp, digitell.maxHp * BOSS_RULES.hpMultiplier);
  assert.equal(b.hp, b.maxHp);
  assert.equal(b.attack, digitell.attack + BOSS_RULES.attackBonus);
  assert.equal(b.level, 3);
  assert.equal(b.boss, true);
});

test("takeDamage: clamps at zero and reports what was dealt", () => {
  const c = Creature.fromSpecies(digitell);
  assert.equal(c.takeDamage(5), 5);
  assert.equal(c.hp, digitell.maxHp - 5);
  assert.equal(c.takeDamage(999), digitell.maxHp - 5);
  assert.equal(c.hp, 0);
  assert.equal(c.fainted, true);
});

test("heal: caps at maxHp and reports what was restored", () => {
  const c = Creature.fromSpecies(digitell);
  c.takeDamage(8);
  assert.equal(c.heal(3), 3);
  assert.equal(c.heal(999), 5);
  assert.equal(c.hp, c.maxHp);
});

test("catchChance: 30% at full HP, ~90% near zero", () => {
  const c = Creature.fromSpecies(digitell);
  assert.equal(c.catchChance, 0.3);
  c.takeDamage(c.maxHp - 1);
  assert.ok(Math.abs(c.catchChance - (0.3 + 0.6 * (1 - 1 / c.maxHp))) < 1e-9);
  assert.ok(c.catchChance > 0.85);
});

test("capture: resets HP and XP, keeps the rest", () => {
  const c = Creature.fromSpecies(digitell);
  c.takeDamage(5);
  c.capture();
  assert.equal(c.hp, c.maxHp);
  assert.equal(c.xp, 0);
  assert.equal(c.name, "Digitell");
});

test("awardXp: levels at the threshold, grows stats, heals fully", () => {
  const c = Creature.fromSpecies(STARTERS[2]);
  const before = { maxHp: c.maxHp, attack: c.attack };
  c.takeDamage(5);
  const r = c.awardXp(XP_PER_LEVEL);
  assert.equal(r.levelsGained, 1);
  assert.equal(c.level, 2);
  assert.equal(c.xp, 0);
  assert.equal(c.maxHp, before.maxHp + 3);
  assert.equal(c.attack, before.attack + 1);
  assert.equal(c.hp, c.maxHp); // level-up heals fully
});

test("awardXp: multiple level-ups in one award, remainder kept", () => {
  const c = Creature.fromSpecies(STARTERS[2]);
  const r = c.awardXp(XP_PER_LEVEL * 2 + 7);
  assert.equal(r.levelsGained, 2);
  assert.equal(c.level, 3);
  assert.equal(c.xp, 7);
});

test("awardXp: below the threshold no level is gained", () => {
  const c = Creature.fromSpecies(STARTERS[2]);
  const r = c.awardXp(XP_PER_LEVEL - 1);
  assert.equal(r.levelsGained, 0);
  assert.equal(c.level, 1);
});

test("state round-trip preserves every field", () => {
  const c = Creature.boss(digitell);
  c.takeDamage(3);
  const back = Creature.fromState(c.toState());
  assert.deepEqual(back.toState(), c.toState());
});

test("rollDamage: attack plus 0..2", () => {
  assert.equal(rollDamage(5, constRng(0)), 5);
  assert.equal(rollDamage(5, constRng(0.999)), 7);
});

test("isHardOperation: × and ÷ (including mixed) are hard", () => {
  assert.ok(isHardOperation("multiplication"));
  assert.ok(isHardOperation("division"));
  assert.ok(isHardOperation("mixed (multiplication, division)"));
  assert.ok(!isHardOperation("addition"));
  assert.ok(!isHardOperation("subtraction"));
  assert.ok(!isHardOperation("mixed (addition, subtraction)"));
});

test("correctAnswerDamage: hard operations hit harder", () => {
  assert.equal(correctAnswerDamage(6, "multiplication"), 6 + HARD_OPERATION_BONUS);
  assert.equal(correctAnswerDamage(6, "addition"), 6);
});

test("boss final blow doubles the roll", () => {
  const base = rollDamage(STARTERS[2].attack, constRng(0.5));
  assert.equal(base * BOSS_FINAL_BLOW_MULTIPLIER, rollDamage(STARTERS[2].attack, constRng(0.5)) * 2);
});

test("prize money scales with the wild creature's max HP", () => {
  assert.equal(prizeMoney(28), 140);
});

// --- Unique-only pressure (#22) ---
//
// The pressure path is gated purely by species rarity. Ordinary encounters
// can never enter it; only the guardian rarity (Meadow's Unique) can. No
// clock, no rng, and thinking time is absent by construction.

test("createUniqueHunt: ordinary rarities never enter the Unique pressure path", () => {
  for (const rarity of ["common", "uncommon", "rare", "starter"] as const) {
    assert.equal(createUniqueHunt(rarity), null, rarity);
  }
});

test("createUniqueHunt: only guardian rarity starts the telegraphed pressure path", () => {
  const hunt = createUniqueHunt("guardian");
  assert.deepEqual(hunt, {
    actionsLeft: UNIQUE_FLEE_ACTIONS,
    trust: 0,
    trustMax: UNIQUE_TRUST_MAX,
  });
});

test("settleUniqueQuestion: correct answers build flat trust and consume one action", () => {
  let hunt = createUniqueHunt("guardian")!;
  const first = settleUniqueQuestion(hunt, true);
  assert.equal(first.outcome, "continue");
  assert.equal(first.state.trust, 1);
  assert.equal(first.state.actionsLeft, UNIQUE_FLEE_ACTIONS - 1);

  hunt = first.state;
  const wrong = settleUniqueQuestion(hunt, false);
  assert.equal(wrong.outcome, "continue");
  assert.equal(wrong.state.trust, 1); // wrong answers never grow trust
  assert.equal(wrong.state.actionsLeft, UNIQUE_FLEE_ACTIONS - 2);
});

test("settleUniqueQuestion: full trust captures before the flee check", () => {
  // Three correct answers fill trustMax=3 even when actions remain.
  let hunt = createUniqueHunt("guardian")!;
  for (let i = 0; i < UNIQUE_TRUST_MAX - 1; i++) {
    const step = settleUniqueQuestion(hunt, true);
    assert.equal(step.outcome, "continue");
    hunt = step.state;
  }
  const last = settleUniqueQuestion(hunt, true);
  assert.equal(last.outcome, "captured");
  assert.equal(last.state.trust, UNIQUE_TRUST_MAX);
  assert.equal(last.state.actionsLeft, UNIQUE_FLEE_ACTIONS - UNIQUE_TRUST_MAX);
});

test("settleUniqueQuestion: actions run out before trust → Unique escapes", () => {
  // 2 correct + 3 wrong = 5 actions, trust 2 < 3 → escape.
  let hunt = createUniqueHunt("guardian")!;
  const answers = [true, true, false, false, false];
  let outcome = "continue" as string;
  for (const correct of answers) {
    const step = settleUniqueQuestion(hunt, correct);
    hunt = step.state;
    outcome = step.outcome;
  }
  assert.equal(outcome, "escaped");
  assert.equal(hunt.trust, 2);
  assert.equal(hunt.actionsLeft, 0);
});

test("settleUniqueQuestion: last-action trust win beats escape", () => {
  // Two correct early, three wrong, then a final correct would overflow the
  // budget — instead pin the race: trust fills on the final action.
  let hunt = createUniqueHunt("guardian")!;
  for (const correct of [true, true, false, false]) {
    hunt = settleUniqueQuestion(hunt, correct).state;
  }
  // actionsLeft=1, trust=2; a correct answer captures on the last action.
  const last = settleUniqueQuestion(hunt, true);
  assert.equal(last.outcome, "captured");
  assert.equal(last.state.actionsLeft, 0);
  assert.equal(last.state.trust, UNIQUE_TRUST_MAX);
});

test("Unique pressure never keys off wall-clock or rng — pure question commits only", () => {
  // The settle function takes only (state, correct). No Date, no rng, no
  // duration. Two identical sequences must produce identical outcomes, so
  // thinking time can never inflate or deny a capture.
  const path = (answers: boolean[]) => {
    let hunt = createUniqueHunt("guardian")!;
    let outcome = "continue" as string;
    for (const correct of answers) {
      const step = settleUniqueQuestion(hunt, correct);
      hunt = step.state;
      outcome = step.outcome;
    }
    return { hunt, outcome };
  };
  const a = path([true, false, true, false, true]);
  const b = path([true, false, true, false, true]);
  assert.deepEqual(a, b);
  assert.equal(a.outcome, "captured");
});

test("change question: pays more than the price, answer is the change", () => {
  for (const item of SHOP_ITEMS) {
    for (const v of [0, 0.999]) {
      const q = makeChangeQuestion(item, constRng(v));
      const paid = Number(q.expression.split(" ")[0]);
      assert.ok(paid > item.price, `${item.key}: paid ${paid} > ${item.price}`);
      assert.equal(q.answer, paid - item.price);
      assert.equal(q.operation, "subtraction");
    }
  }
});
