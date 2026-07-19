// Bundler-safety guard: the game ships the same TypeScript two ways — Node
// runs the raw sources (tests) and the Cocos bundler compiles them for the
// web build. The bundler lowers iterable spreads (`[...new Set(x)]`) to
// `[].concat(iterable)`, which wraps a Set/Map as ONE element instead of
// spreading it — a silent corruption that Node tests can never see (it once
// turned Field-Guide variants into [{}] and every checkpoint after a new
// sighting was server-rejected). Spreading ARRAYS is fine (concat iterates
// arrays correctly); spreading Sets/Maps is not. This test scans every
// bundled source tree so the pattern can't sneak back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Iterable spread of a Set/Map literal: [...new Set(...)] / [...new Map(...)].
// (Array spreads like [...xs, y] are safe and stay allowed.)
const FORBIDDEN = /\[\s*\.\.\.\s*new\s+(Set|Map)\b/;

// Every TypeScript tree the Cocos bundler compiles: the shared domain
// library (synced into game/assets/shared) and the game's own sources
// (game/assets/src, plus its game/world region sources).
function collectTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
    const parent = "parentPath" in entry ? (entry.parentPath as string) : (entry as unknown as { path: string }).path ?? dir;
    out.push(join(parent, entry.name));
  }
  return out;
}

test("bundled sources never spread a Set or Map literal (bundler corruption trap)", () => {
  const sources = [
    ...collectTs(join(REPO_ROOT, "shared")),
    ...collectTs(join(REPO_ROOT, "game", "assets", "src")),
    ...collectTs(join(REPO_ROOT, "game", "world")),
  ];
  assert.ok(sources.length > 0, "expected sources to scan");
  for (const file of sources) {
    const text = readFileSync(file, "utf8");
    assert.equal(
      FORBIDDEN.test(text),
      false,
      `${file} spreads a Set/Map literal — the Cocos bundler turns that into [].concat(set), wrapping it as one element. Use array-only dedup instead (see dedupeVariants in save-v2.ts).`,
    );
  }
});
