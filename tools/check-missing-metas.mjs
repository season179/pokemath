// CI gate: every tracked .ts under game/assets/ needs its Cocos .meta
// companion committed. Agents work headless, so the editor never generates
// metas in their worktrees — this fails the PR instead of drifting main.
// A missing meta is fixable headless: copy a sibling's shape with a fresh uuid.

import { execSync } from "node:child_process";

export function findMissingMetas(trackedFiles) {
  const tracked = new Set(trackedFiles);
  return [...tracked].filter(
    (f) => f.startsWith("game/assets/") && f.endsWith(".ts") && !tracked.has(`${f}.meta`),
  );
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-missing-metas.mjs");
if (isMain) {
  const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  const missing = findMissingMetas(tracked);
  if (missing.length > 0) {
    console.error("Committed .ts files missing their Cocos .meta companion:");
    for (const f of missing) console.error(`  ${f}`);
    console.error("Commit the .meta (copy a sibling's shape with a fresh uuid).");
    process.exit(1);
  }
  console.log("check-metas: all game/assets .ts files have committed .meta companions");
}
