#!/usr/bin/env node
// Syncs the shared domain library into the Cocos project's assets/.
//
// Why: shared/ and game/world/ are written for Node (explicit .ts import
// specifiers — Node's type-stripping requires them). Cocos Creator's bundler
// chokes on those extensions. This script copies the files and rewrites the
// specifiers. Tests and examples are excluded — they're Node-only.
//
// Two mirrors:
//   shared/            → game/assets/shared           (flat)
//   game/world/regions → game/assets/src/world/regions (recursive)
// Both mirrors overwrite .ts files and remove stale .ts files only — Cocos
// .meta files are never deleted.
//
// Usage: node tools/sync-shared.mjs [targetDir]
//   default target: game/assets/shared

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
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

await mkdir(DEST, { recursive: true });

// Never delete Cocos .meta files: they carry the stable UUIDs other assets
// reference. Overwrite .ts files and remove only .ts files that went stale.
for (const name of files) {
  const src = await readFile(join(SRC, name), "utf8");
  const out = src.replace(TS_SPECIFIER, "$1$2");
  await writeFile(join(DEST, name), out);
  console.log(`synced ${name}`);
}
for (const entry of await readdir(DEST, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".ts") && !files.includes(entry.name)) {
    await rm(join(DEST, entry.name));
    console.log(`removed stale ${entry.name}`);
  }
}

console.log(`\n${files.length} files → ${DEST}`);

// --- world regions: recursive mirror that never touches Cocos .meta files ---
const WORLD_SRC = join(root, "game", "world", "regions");
const WORLD_DEST = join(root, "game", "assets", "src", "world", "regions");

async function mirrorRegions(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  const wanted = new Set();
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await mirrorRegions(join(srcDir, entry.name), join(destDir, entry.name));
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;
    wanted.add(entry.name);
    const src = await readFile(join(srcDir, entry.name), "utf8");
    await writeFile(join(destDir, entry.name), src.replace(TS_SPECIFIER, "$1$2"));
    console.log(`synced ${relative(root, join(srcDir, entry.name))}`);
  }
  // Remove stale synced .ts files; .meta files always stay.
  for (const entry of await readdir(destDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".ts") && !wanted.has(entry.name)) {
      await rm(join(destDir, entry.name));
      console.log(`removed stale ${relative(root, join(destDir, entry.name))}`);
    }
  }
}

await mirrorRegions(WORLD_SRC, WORLD_DEST);

// Pure, Node-runnable world modules (no Cocos) live in their own directory so
// the mirror can be deletion-safe just like regions/ — the dest dir holds
// ONLY mirrored files, never Cocos-only code. Add a future pure world module
// by dropping it in game/world/graph/; sync handles the rest.
await mirrorRegions(
  join(root, "game", "world", "graph"),
  join(root, "game", "assets", "src", "world", "graph"),
);
