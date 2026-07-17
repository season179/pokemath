#!/usr/bin/env node
// Syncs the shared domain library into the Cocos project's assets/.
//
// Why: shared/ is written for Node (explicit .ts import specifiers — Node's
// type-stripping requires them). Cocos Creator's bundler chokes on those
// extensions. This script copies the files and rewrites the specifiers.
// Tests and examples are excluded — they're Node-only.
//
// Usage: node tools/sync-shared.mjs [targetDir]
//   default target: game/assets/shared

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "shared");
const DEST = process.argv[2] ?? join(root, "game", "assets", "shared");

// Matches import/export specifiers ending in .ts (static, type-only, and
// side-effect forms) and strips the extension: from "./x.ts" → from "./x"
const TS_SPECIFIER = /((?:from|import)\s*["'][^"']+)\.ts(["'])/g;

const entries = await readdir(SRC, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile() && e.name.endsWith(".ts"))
  .map((e) => e.name);

if (files.length === 0) {
  console.error(`no .ts files found in ${SRC}`);
  process.exit(1);
}

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });

for (const name of files) {
  const src = await readFile(join(SRC, name), "utf8");
  const out = src.replace(TS_SPECIFIER, "$1$2");
  await writeFile(join(DEST, name), out);
  console.log(`synced ${name}`);
}

console.log(`\n${files.length} files → ${DEST}`);
