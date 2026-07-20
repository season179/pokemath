import { test } from "node:test";
import assert from "node:assert/strict";

import { findMissingMetas } from "./check-missing-metas.mjs";

test("a .ts under game/assets without a sibling .meta is flagged", () => {
  const missing = findMissingMetas(["game/assets/src/world/trail.ts"]);
  assert.deepEqual(missing, ["game/assets/src/world/trail.ts"]);
});

test("a .ts with a committed .meta passes", () => {
  const missing = findMissingMetas([
    "game/assets/src/world/trail.ts",
    "game/assets/src/world/trail.ts.meta",
  ]);
  assert.deepEqual(missing, []);
});

test("files outside game/assets and non-.ts files are ignored", () => {
  const missing = findMissingMetas([
    "shared/index.ts",
    "tools/check-missing-metas.mjs",
    "game/assets/resources/question-banks/active-manifest.json",
    "game/tests/regions.test.ts",
  ]);
  assert.deepEqual(missing, []);
});

test("the real repo has no missing metas", async () => {
  const { execSync } = await import("node:child_process");
  const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  assert.deepEqual(findMissingMetas(tracked), []);
});
