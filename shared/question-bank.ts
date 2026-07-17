// The sample question bank, typed. Placeholder content until Phase 3+
// replaces it with AI-generated questions (see ROADMAP.md).

import type { QuestionBankData } from "./question-engine.ts";

export const SAMPLE_BANK: QuestionBankData = {
  source:
    "math-scan.pdf (workbook pages 42-43, 解决问题 / Problem Solving, textbook pages 109-115)",
  currency: "RM",
  questions: [
    {
      id: 1,
      question_zh:
        "有 40 个学生参加一项训练，每人付了 RM320 训练费。全部学生付了多少训练费？",
      question_en:
        "40 students joined a training programme. Each paid RM320 as the training fee. How much did all the students pay in total?",
      operation: "multiplication",
      expression: "40 × 320",
      answer: 12800,
    },
    {
      id: 2,
      question_zh:
        "吴校长准备了 RM55 000 要维修学校礼堂。维修后，他剩下 RM8 610。吴校长用了多少钱维修学校礼堂？",
      question_en:
        "Principal Wu prepared RM55,000 to repair the school hall. After the repairs, he had RM8,610 left. How much did he spend on repairing the hall?",
      operation: "subtraction",
      expression: "55000 - 8610",
      answer: 46390,
    },
    {
      id: 3,
      question_zh: "嘉嘉在 12 个月里存了 RM9 480。嘉嘉在每个月平均存多少钱？",
      question_en:
        "Jiajia saved RM9,480 over 12 months. On average, how much did she save each month?",
      operation: "division",
      expression: "9480 ÷ 12",
      answer: 790,
    },
    {
      id: 4,
      question_zh:
        "S 汽车的价格是 RM85 400。T 汽车比 S 汽车贵 RM7 900。计算 T 汽车的价格。",
      question_en:
        "Car S costs RM85,400. Car T is RM7,900 more expensive than car S. Calculate the price of car T.",
      operation: "addition",
      expression: "85400 + 7900",
      answer: 93300,
    },
    {
      id: 5,
      question_zh:
        "下表显示月琴在两家银行的存款。银行 P：RM8 655，银行 Q：RM40 256。月琴取出存款的 RM14 500 为住家进行装修。月琴剩下多少存款？",
      question_en:
        "The table shows Yueqin's savings in two banks: Bank P has RM8,655 and Bank Q has RM40,256. She withdrew RM14,500 for home renovation. How much savings does she have left?",
      operation: "mixed (addition, subtraction)",
      expression: "(8655 + 40256) - 14500",
      answer: 34411,
      table: { P: 8655, Q: 40256 },
      steps: [
        {
          prompt_zh: "月琴在两家银行一共有多少存款？",
          prompt_en: "How much savings does Yueqin have in total?",
          expression: "8655 + 40256",
          answer: 48911,
        },
        {
          prompt_zh: "取出 RM14 500 后，月琴剩下多少存款？",
          prompt_en: "After withdrawing RM14,500, how much is left?",
          expression: "48911 - 14500",
          answer: 34411,
        },
      ],
    },
    {
      id: 6,
      question_zh:
        "精明小学赢得一项比赛的冠军和亚军。亚军将获得 RM7 800 奖金。冠军的奖金比亚军多 RM4 500。精明小学一共获得多少奖金？",
      question_en:
        "Jingming Primary School won both first and second place in a competition. The second-place prize is RM7,800. The first-place prize is RM4,500 more than the second-place prize. How much prize money did the school win in total?",
      operation: "mixed (addition)",
      expression: "7800 + (7800 + 4500)",
      answer: 20100,
      steps: [
        {
          prompt_zh: "冠军的奖金是多少？",
          prompt_en: "How much is the first-place prize?",
          expression: "7800 + 4500",
          answer: 12300,
        },
        {
          prompt_zh: "两份奖金一共是多少？",
          prompt_en: "How much prize money in total?",
          expression: "7800 + 12300",
          answer: 20100,
        },
      ],
    },
    {
      id: 7,
      question_zh:
        "一套沙发的价格是 RM8 530。一个按摩椅的价格比沙发多一倍。静深平分 10 次付清买按摩椅的钱。他每次付多少钱？",
      question_en:
        "A sofa set costs RM8,530. A massage chair costs twice as much as the sofa. Jingshen pays for the massage chair in 10 equal instalments. How much does he pay each time?",
      operation: "mixed (multiplication, division)",
      expression: "(8530 × 2) ÷ 10",
      answer: 1706,
      steps: [
        {
          prompt_zh: "按摩椅的价格是多少？",
          prompt_en: "How much does the massage chair cost?",
          expression: "8530 × 2",
          answer: 17060,
        },
        {
          prompt_zh: "每次要付多少钱？",
          prompt_en: "How much is each instalment?",
          expression: "17060 ÷ 10",
          answer: 1706,
        },
      ],
    },
  ],
};
