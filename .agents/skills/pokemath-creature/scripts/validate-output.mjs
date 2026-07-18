#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

function parseArguments(argv) {
  const result = { directory: "", id: "", stages: 0 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dir") result.directory = argv[++index] ?? "";
    else if (argument === "--id") result.id = argv[++index] ?? "";
    else if (argument === "--stages") result.stages = Number(argv[++index]);
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (!result.directory || !result.id || !Number.isInteger(result.stages)) {
    throw new Error("usage: validate-output.mjs --dir <directory> --id <id> --stages <1-4>");
  }
  if (result.stages < 1 || result.stages > 4) throw new Error("stages must be 1-4");
  return result;
}

async function decode(path) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function countStageComponents(image, stage, frameSize = 48) {
  const occupied = new Uint8Array(frameSize * frameSize);
  const visited = new Uint8Array(occupied.length);
  for (let y = 0; y < frameSize; y += 1) {
    for (let x = 0; x < frameSize; x += 1) {
      const imageOffset = (y * image.info.width + stage * frameSize + x) * 4;
      occupied[y * frameSize + x] = image.data[imageOffset + 3] > 0 ? 1 : 0;
    }
  }

  let components = 0;
  for (let start = 0; start < occupied.length; start += 1) {
    if (!occupied[start] || visited[start]) continue;
    components += 1;
    const queue = [start];
    visited[start] = 1;
    while (queue.length > 0) {
      const index = queue.pop();
      const x = index % frameSize;
      const y = Math.floor(index / frameSize);
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const nextX = x + deltaX;
          const nextY = y + deltaY;
          if (nextX < 0 || nextX >= frameSize || nextY < 0 || nextY >= frameSize) continue;
          const next = nextY * frameSize + nextX;
          if (occupied[next] && !visited[next]) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
    }
  }
  return components;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const directory = resolve(args.directory);
  const expected = [`${args.id}.png`, `${args.id}_alt.png`].sort();
  const entries = await readdir(directory, { withFileTypes: true });
  assert.deepEqual(
    entries.map((entry) => entry.name).sort(),
    expected,
    `production directory must contain exactly ${expected.join(" and ")}`,
  );
  assert.ok(entries.every((entry) => entry.isFile()), "production entries must be files");

  const [normal, alt] = await Promise.all(expected.map((name) => decode(join(directory, name))));
  const expectedWidth = args.stages * 48;
  for (const image of [normal, alt]) {
    assert.equal(image.info.width, expectedWidth, `strip width must be ${expectedWidth}`);
    assert.equal(image.info.height, 48, "strip height must be 48");
    assert.equal(image.info.channels, 4, "strip must decode as RGBA");
  }

  let changedRgb = 0;
  const opaquePerStage = Array(args.stages).fill(0);
  for (let offset = 0; offset < normal.data.length; offset += 4) {
    assert.equal(alt.data[offset + 3], normal.data[offset + 3], "normal/alt alpha mismatch");
    if (normal.data[offset + 3] > 0) {
      const pixel = offset / 4;
      opaquePerStage[Math.floor((pixel % expectedWidth) / 48)] += 1;
    }
    if (
      normal.data[offset] !== alt.data[offset]
      || normal.data[offset + 1] !== alt.data[offset + 1]
      || normal.data[offset + 2] !== alt.data[offset + 2]
    ) changedRgb += 1;
  }
  assert.ok(opaquePerStage.every((count) => count > 0), "every stage must contain visible pixels");
  const componentsPerStage = Array.from(
    { length: args.stages },
    (_, stage) => countStageComponents(normal, stage),
  );
  assert.ok(
    componentsPerStage.every((count) => count === 1),
    `every stage must contain one connected creature component; got ${componentsPerStage.join(", ")}`,
  );
  assert.ok(changedRgb > 0, "alternate palette must differ from normal");

  console.log(JSON.stringify({
    valid: true,
    files: expected,
    dimensions: `${expectedWidth}x48`,
    opaquePerStage,
    componentsPerStage,
    changedRgb,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Creature validation failed: ${error.message}`);
  process.exitCode = 1;
});
