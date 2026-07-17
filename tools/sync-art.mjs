#!/usr/bin/env node
// Uploads licensed art from art-samples/ to the private R2 bucket
// `pokemath-art`. The art is licensed for use in the game but NOT for
// redistribution, so it never enters this public repo (art-samples/ is
// gitignored). The Worker serves it at /art/<key>. See docs/art-assets.md.
//
// Keys are versioned (art/v1/...) and served with immutable caching —
// if you change a file, bump ART_VERSION instead of overwriting.
//
// On-disk paths are normalized into clean keys:
//   "Pocket Creature Tamer/UI/Dialog_box/dialog_box.png"
//     → "art/v1/pocket-creature-tamer/ui/dialog_box/dialog_box.png"
//
// Usage: node tools/sync-art.mjs [--dry-run]
// Requires: wrangler login (uses your Cloudflare account; no secrets in repo).

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
import { readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ART_VERSION = "v1";
const BUCKET = "pokemath-art";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "art-samples");
const dryRun = process.argv.includes("--dry-run");

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.isFile() && e.name !== ".DS_Store" ? [p] : [];
  });
}

// "Pocket Creature Tamer/UI/x.png" → "pocket-creature-tamer/ui/x.png"
function toKey(relPath) {
  const normalized = relPath
    .split("/")
    .map((seg) => seg.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
  return `art/${ART_VERSION}/${normalized}`;
}

const files = walk(SRC);
if (files.length === 0) {
  console.error(`no files found in ${SRC}`);
  process.exit(1);
}

console.log(`${dryRun ? "[dry-run] " : ""}syncing ${files.length} files → r2://${BUCKET}\n`);

async function uploadOne(file) {
  const rel = relative(SRC, file);
  const key = toKey(rel);
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  if (dryRun) {
    console.log(`  ${rel}\n    → /${key}`);
    return;
  }

  await execFileP(
    "npx",
    [
      "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
      "--file", file,
      "--content-type", contentType,
      "--remote",
    ],
    { cwd: join(root, "worker") },
  );
  done += 1;
  console.log(`  [${done}/${files.length}] ${key}`);
}

// Each upload spawns a wrangler CLI (~3-5s startup), which dominates the
// runtime for these small files — so run a pool of them in parallel.
const CONCURRENCY = 8;
let done = 0;
const queue = [...files];
const failures = [];

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      try {
        await uploadOne(file);
      } catch (err) {
        failures.push({ file: relative(SRC, file), err });
        console.error(`  FAILED ${relative(SRC, file)}`);
      }
    }
  }),
);

if (failures.length > 0) {
  console.error(`\n${failures.length} upload(s) failed — rerun to retry (uploads are idempotent):`);
  for (const f of failures) console.error(`  ${f.file}: ${f.err.message.split("\n")[0]}`);
  process.exit(1);
}

console.log(`\ndone. Game URLs: https://game.pokemath.fun/art/${ART_VERSION}/...`);
