// Routed question-bank loading (M3, #13): the battle never names a bank file
// directly. It asks for a curriculum slice (grade, topic, profile), and the
// active manifest decides which approved bank version serves it. Every trust
// boundary is crossed here, before any battle starts:
//   pointer  — active-manifest.json: which manifest is live (rollback lever)
//   manifest — immutable approval record: which bank version serves the slice
//   bank     — the versioned content JSON (parseQuestionBankData rejects
//              unknown bank schema versions)
//   verify   — the loaded bank must be exactly the (bank_id, version) the
//              route approves, with questions tagged inside the route's slice
// Any failure rejects the whole load and encounters stay off (GameApp keeps
// the Year-4 SAMPLE_BANK ban — no fallback content in Woolly).

import {
  QuestionBank,
  parseActiveManifestPointer,
  parseQuestionBankManifest,
  resolveManifestEntry,
  verifyManifestEntryAgainstBank,
  type BankRouteRequest,
} from "../../shared/index";
import { loadJsonAsset, loadQuestionBankData } from "./loadQuestionBank";

/** Cocos resources path of the active-manifest pointer (no extension). */
export const ACTIVE_MANIFEST_POINTER_PATH = "question-banks/active-manifest";

export async function loadRoutedQuestionBank(
  request: BankRouteRequest,
  rng: () => number = Math.random,
): Promise<QuestionBank> {
  let pointerJson: unknown;
  try {
    pointerJson = await loadJsonAsset(ACTIVE_MANIFEST_POINTER_PATH);
  } catch (cause) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    throw new Error(`Active question-bank manifest is unavailable${detail}`);
  }
  const pointer = parseActiveManifestPointer(pointerJson);

  let manifestJson: unknown;
  try {
    manifestJson = await loadJsonAsset(pointer.manifest);
  } catch (cause) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    throw new Error(
      `Active manifest points at "${pointer.manifest}", which is unavailable${detail}`,
    );
  }
  const manifest = parseQuestionBankManifest(manifestJson);

  const entry = resolveManifestEntry(manifest, request);
  const bankData = await loadQuestionBankData(entry.path);
  verifyManifestEntryAgainstBank(entry, bankData);
  return new QuestionBank(bankData, rng);
}
