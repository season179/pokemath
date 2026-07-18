// Quickstart: the whole domain library exercised in ~25 lines.
// Run it:  node shared/examples/quickstart.ts

import {
  Creature,
  QuestionBank,
  QuestionRound,
  SAMPLE_BANK,
  SPECIES,
  STARTERS,
  correctAnswerDamage,
  createNewGame,
  makeChangeQuestion,
  prizeMoney,
  rollDamage,
  SHOP_ITEMS,
  turnsOf,
  xpReward,
} from "../index.ts";

// A battle round: answer the wild creature's question to hit it.
const save = createNewGame(STARTERS[0]); // the player picked Addlepuff
const me = Creature.fromState(save.team.creatures[0]);
const wild = Creature.fromSpecies(SPECIES[1]); // Digitell
console.log(`A wild ${wild.name} appeared! (HP ${wild.hp}) vs your ${me.name}`);

const bank = new QuestionBank(SAMPLE_BANK);
const question = bank.pick((q) => !q.steps);
const round = new QuestionRound(turnsOf(question)[0]);
console.log(`${wild.name} asks: ${question.question_en}`);
console.log(`Choices: ${round.choices.join(" / ")}`);

const picked = round.turn.answer; // pretend we solved it
const correct = round.judge(picked);
const dmg = correct ? correctAnswerDamage(rollDamage(me.attack), question.operation) : 0;
wild.takeDamage(dmg);
console.log(correct ? `Correct! ${round.turn.expression} = ${picked} → ${dmg} damage (wild HP ${wild.hp})` : "Missed!");

// Win: rewards + shop change question.
console.log(`Victory: +${xpReward(wild.maxHp)} XP, +RM ${prizeMoney(wild.maxHp)}`);
const change = makeChangeQuestion(SHOP_ITEMS[0]);
console.log(`Shop: ${change.question_en} (answer: ${change.answer})`);
