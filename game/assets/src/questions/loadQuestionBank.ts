// Cocos adapter for versioned question-bank JSON assets. Content stays data;
// this module only loads it and applies the shared runtime contract.

import { JsonAsset, resources } from "cc";
import {
  QuestionBank,
  parseQuestionBankData,
  type VersionedQuestionBankData,
} from "../../shared/index";

export function loadQuestionBankData(path: string): Promise<VersionedQuestionBankData> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error) {
        reject(new Error(`Could not load question bank "${path}": ${error.message}`));
        return;
      }
      try {
        resolve(parseQuestionBankData(asset.json));
      } catch (cause) {
        const detail = cause instanceof Error ? `: ${cause.message}` : "";
        reject(new Error(`Invalid question bank "${path}"${detail}`));
      }
    });
  });
}

export async function loadQuestionBank(
  path: string,
  rng: () => number = Math.random,
): Promise<QuestionBank> {
  return new QuestionBank(await loadQuestionBankData(path), rng);
}
