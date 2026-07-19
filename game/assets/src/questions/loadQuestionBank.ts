// Cocos adapter for versioned question-bank JSON assets. Content stays data;
// this module only loads it and applies the shared runtime contract.

import { JsonAsset, resources } from "cc";
import {
  parseQuestionBankData,
  type AnyVersionedQuestionBankData,
} from "../../shared/index";

/**
 * Load any JSON asset under assets/resources by its extension-less path.
 * Shared by bank and manifest loading so every content load fails the same
 * way (reject with the resource path in the message).
 */
export function loadJsonAsset(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error) {
        reject(new Error(`Could not load "${path}": ${error.message}`));
        return;
      }
      resolve(asset.json);
    });
  });
}

export function loadQuestionBankData(path: string): Promise<AnyVersionedQuestionBankData> {
  return loadJsonAsset(path).then((json) => {
    try {
      return parseQuestionBankData(json);
    } catch (cause) {
      const detail = cause instanceof Error ? `: ${cause.message}` : "";
      throw new Error(`Invalid question bank "${path}"${detail}`);
    }
  });
}
