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
  correctAnswerDamage,
  isHardOperation,
  prizeMoney,
  rollDamage,
  xpReward,
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

test("rewards scale with the wild creature's max HP", () => {
  assert.equal(xpReward(28), 28);
  assert.equal(prizeMoney(28), 140);
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
