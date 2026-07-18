// Shop domain: items for sale and the shopkeeper's change question.
// Ported from the prototype's shop.js.

import type { Question } from "./question-engine.ts";

export interface ShopItem {
  readonly key: "potion" | "ball";
  readonly zh: string;
  readonly en: string;
  readonly price: number;
  readonly note: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  { key: "potion", zh: "药水", en: "Potion", price: 120, note: "heals 10 HP / 恢复 10 点" },
  { key: "ball", zh: "精灵球", en: "Ball", price: 80, note: "catch creatures / 捕捉宝可梦" },
];

// Buying asks a change question: pay with a big note, work out the change.
// The payment is a round amount above the price (the next RM100 up, or RM500).
export function makeChangeQuestion(
  item: ShopItem,
  rng: () => number = Math.random,
): Question {
  const payments = [Math.ceil((item.price + 1) / 100) * 100, 500].filter(
    (p) => p > item.price,
  );
  const paid = payments[Math.floor(rng() * payments.length)];
  return {
    id: 0,
    question_zh: `${item.zh}要 RM${item.price}。你付了 RM${paid}。要找回多少钱？`,
    question_en: `The ${item.en.toLowerCase()} costs RM${item.price}. You pay RM${paid}. How much change do you get?`,
    operation: "subtraction",
    expression: `${paid} - ${item.price}`,
    answer: paid - item.price,
  };
}
