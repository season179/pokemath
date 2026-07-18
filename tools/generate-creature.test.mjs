import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import sharp from "sharp";

import {
  IMAGE_MODEL,
  STAGE_LAYOUTS,
  buildCodexArguments,
  buildCodexWorkerPrompt,
  buildCreaturePrompt,
  codexSubscriptionEnvironment,
  createAltVariant,
  generateCreature,
  normalizeCreatureConfig,
  normalizeCreatureImage,
  runProcess,
  stageSlots,
  verifyCodexSubscription,
} from "./generate-creature.mjs";

function validConfig(overrides = {}) {
  const stages = overrides.stages ?? 3;
  return {
    id: "mossback",
    name: "Mossback",
    concept: "a moss-backed pond turtle",
    stages,
    stageDescriptions: Array.from({ length: stages }, (_, index) => `stage ${index + 1}`),
    ...overrides,
  };
}

function makeRawCanvas(
  stages,
  chromaKey = { red: 0, green: 255, blue: 0, alpha: 1 },
  sourceSize = STAGE_LAYOUTS[stages],
) {
  const { width, height } = sourceSize;
  const canvas = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < canvas.length; offset += 4) {
    canvas[offset] = chromaKey.red;
    canvas[offset + 1] = chromaKey.green;
    canvas[offset + 2] = chromaKey.blue;
    canvas[offset + 3] = 255;
  }

  for (const [index, slot] of stageSlots(stages, width, height).entries()) {
    const creatureWidth = Math.min(180 + index * 20, Math.floor(slot.width * 0.6));
    const creatureHeight = Math.min(240 + index * 30, Math.floor(slot.height * 0.6));
    const left = slot.left + Math.floor((slot.width - creatureWidth) / 2);
    const top = slot.top + slot.height - creatureHeight - 40;
    for (let y = top; y < top + creatureHeight; y += 1) {
      for (let x = left; x < left + creatureWidth; x += 1) {
        const offset = (y * width + x) * 4;
        canvas[offset] = 120 + index * 20;
        canvas[offset + 1] = 70;
        canvas[offset + 2] = 40;
        canvas[offset + 3] = 255;
      }
    }
  }

  return sharp(canvas, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
}

async function addDetachedArtifact(input, sourceSize) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const left = Math.floor(sourceSize.width / 2) - 10;
  for (let y = sourceSize.height - 12; y < sourceSize.height - 8; y += 1) {
    for (let x = left; x < left + 20; x += 1) {
      const offset = (y * sourceSize.width + x) * 4;
      data[offset] = 90;
      data[offset + 1] = 70;
      data[offset + 2] = 50;
      data[offset + 3] = 255;
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function opaqueComponents(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const occupied = new Uint8Array(info.width * info.height);
  const visited = new Uint8Array(occupied.length);
  for (let index = 0; index < occupied.length; index += 1) {
    occupied[index] = data[index * 4 + 3] > 0 ? 1 : 0;
  }
  const components = [];
  for (let start = 0; start < occupied.length; start += 1) {
    if (!occupied[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    const bounds = { minX: info.width, minY: info.height, maxX: -1, maxY: -1 };
    let size = 0;
    while (queue.length > 0) {
      const index = queue.pop();
      const x = index % info.width;
      const y = Math.floor(index / info.width);
      size += 1;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
      for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
        for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
          if (deltaX === 0 && deltaY === 0) continue;
          const nextX = x + deltaX;
          const nextY = y + deltaY;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          const next = nextY * info.width + nextX;
          if (occupied[next] && !visited[next]) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
    }
    components.push({ size, bounds });
  }
  return components.sort((left, right) => right.size - left.size);
}

test("configuration accepts one through four stages", () => {
  for (const stages of [1, 2, 3, 4]) {
    const config = normalizeCreatureConfig(validConfig({ stages }));
    assert.equal(config.stages, stages);
    assert.equal(config.stageDescriptions.length, stages);
  }
});

test("configuration rejects unsupported stage counts and mismatched descriptions", () => {
  assert.throws(
    () => normalizeCreatureConfig(validConfig({ stages: 0, stageDescriptions: [] })),
    /stages must be one of 1, 2, 3, or 4/,
  );
  assert.throws(
    () => normalizeCreatureConfig(validConfig({ stages: 4, stageDescriptions: ["one"] })),
    /exactly 4 entries/,
  );
  assert.throws(
    () => normalizeCreatureConfig(validConfig({ alt: { hue: 361 } })),
    /alt.hue must be a number from 0 to 360/,
  );
});

test("gpt-image-2 is fixed in each Codex worker prompt", () => {
  for (const stages of [1, 2, 3, 4]) {
    const config = normalizeCreatureConfig(validConfig({ stages }));
    const layout = STAGE_LAYOUTS[stages];
    const prompt = buildCodexWorkerPrompt(config, "/tmp/raw.png");
    assert.equal(IMAGE_MODEL, "gpt-image-2");
    assert.match(prompt, /request the gpt-image-2 image model/);
    assert.match(prompt, new RegExp(`exact ${layout.width}x${layout.height} image`));
    assert.equal(layout.width % 16, 0);
    assert.equal(layout.height % 16, 0);
    assert.ok(layout.width * layout.height >= 655_360);
    assert.ok(Math.max(layout.width, layout.height) / Math.min(layout.width, layout.height) <= 3);
  }
});

test("Codex invocation uses image generation in an isolated subscription worker", () => {
  const config = normalizeCreatureConfig(validConfig({ stages: 2 }));
  const args = buildCodexArguments(config, "/tmp/creature-run");
  assert.deepEqual(args.slice(0, 6), [
    "exec",
    "--ignore-user-config",
    "--enable",
    "image_generation",
    "--ephemeral",
    "--skip-git-repo-check",
  ]);
  assert.ok(args.includes("workspace-write"));
  assert.ok(args.includes("/tmp/creature-run"));
  assert.match(args.at(-1), /\/tmp\/creature-run\/raw\.png/);
});

test("subscription environment removes API billing credentials", () => {
  const environment = codexSubscriptionEnvironment({
    PATH: "/bin",
    CODEX_HOME: "/codex-home",
    OPENAI_API_KEY: "api-key",
    OPENAI_ORG_ID: "org",
    OPENAI_PROJECT_ID: "project",
    AZURE_OPENAI_API_KEY: "azure-key",
  });
  assert.deepEqual(environment, { PATH: "/bin", CODEX_HOME: "/codex-home" });
});

test("subscription preflight requires a ChatGPT login", async () => {
  await verifyCodexSubscription({
    execute: async () => ({ stdout: "Logged in using ChatGPT", stderr: "" }),
  });
  await assert.rejects(
    verifyCodexSubscription({
      execute: async () => ({ stdout: "Logged in using an API key", stderr: "" }),
    }),
    /must be logged in using ChatGPT/,
  );
});

test("Codex worker process receives immediate stdin EOF", async () => {
  const result = await runProcess(process.execPath, [
    "-e",
    'process.stdin.resume(); process.stdin.on("end", () => process.stdout.write("EOF"));',
  ]);
  assert.equal(result.stdout, "EOF");
});

test("four stages use a 2x2 generation layout in reading order", () => {
  assert.deepEqual(stageSlots(4), [
    { left: 0, top: 0, width: 768, height: 768 },
    { left: 768, top: 0, width: 768, height: 768 },
    { left: 0, top: 768, width: 768, height: 768 },
    { left: 768, top: 768, width: 768, height: 768 },
  ]);
  const prompt = buildCreaturePrompt(normalizeCreatureConfig(validConfig({ stages: 4 })));
  assert.match(prompt, /exact 2 by 2 grid/);
  assert.match(prompt, /Stage 4 \(bottom-right\)/);
});

test("one stage is explicitly prompted as no evolution", () => {
  const prompt = buildCreaturePrompt(normalizeCreatureConfig(validConfig({ stages: 1 })));
  assert.match(prompt, /has no evolution/);
  assert.match(prompt, /exactly one complete creature/);
});

test("normalization removes connected chroma and creates a horizontal 48px strip", async () => {
  for (const stages of [1, 2, 3, 4]) {
    const config = normalizeCreatureConfig(validConfig({ stages }));
    const raw = await makeRawCanvas(stages);
    const normalized = await normalizeCreatureImage(raw, config);
    const stripMetadata = await sharp(normalized.strip).metadata();
    assert.equal(stripMetadata.width, stages * 48);
    assert.equal(stripMetadata.height, 48);
    assert.equal(normalized.frames.length, stages);

    for (const frame of normalized.frames) {
      const { data, info } = await sharp(frame)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let transparentPixels = 0;
      let opaquePixels = 0;
      for (let offset = 3; offset < data.length; offset += info.channels) {
        if (data[offset] === 0) transparentPixels += 1;
        if (data[offset] === 255) opaquePixels += 1;
      }
      assert.ok(transparentPixels > 0);
      assert.ok(opaquePixels > 0);
    }
  }
});

test("normalization discards detached debris before baseline alignment", async () => {
  const config = normalizeCreatureConfig(validConfig({ stages: 1 }));
  const sourceSize = STAGE_LAYOUTS[1];
  const raw = await addDetachedArtifact(await makeRawCanvas(1), sourceSize);
  const normalized = await normalizeCreatureImage(raw, config);
  const components = await opaqueComponents(normalized.frames[0]);
  assert.equal(components.length, 1);
  assert.equal(components[0].bounds.maxY, 46);
});

test("normalization accepts the canvas size returned by Codex", async () => {
  const config = normalizeCreatureConfig(validConfig({ stages: 3 }));
  const raw = await makeRawCanvas(3, undefined, { width: 1792, height: 1024 });
  const normalized = await normalizeCreatureImage(raw, config);
  assert.deepEqual(normalized.sourceSize, { width: 1792, height: 1024 });
  const metadata = await sharp(normalized.strip).metadata();
  assert.equal(metadata.width, 144);
  assert.equal(metadata.height, 48);
});

test("alternate palette changes colour while preserving dimensions and alpha exactly", async () => {
  const config = normalizeCreatureConfig(validConfig({ stages: 3 }));
  const raw = await makeRawCanvas(3);
  const normal = (await normalizeCreatureImage(raw, config)).strip;
  const alt = await createAltVariant(normal, config.alt);
  const [normalPixels, altPixels] = await Promise.all([
    sharp(normal).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(alt).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.equal(altPixels.info.width, normalPixels.info.width);
  assert.equal(altPixels.info.height, normalPixels.info.height);
  let changedRgb = 0;
  for (let offset = 0; offset < normalPixels.data.length; offset += 4) {
    assert.equal(altPixels.data[offset + 3], normalPixels.data[offset + 3]);
    if (
      altPixels.data[offset] !== normalPixels.data[offset]
      || altPixels.data[offset + 1] !== normalPixels.data[offset + 1]
      || altPixels.data[offset + 2] !== normalPixels.data[offset + 2]
    ) changedRgb += 1;
  }
  assert.ok(changedRgb > 0);
});

test("generation retains the raw source and a reproducible manifest", async (context) => {
  const config = normalizeCreatureConfig(validConfig({ stages: 2 }));
  const raw = await makeRawCanvas(2);
  const outputDirectory = await mkdtemp(join(tmpdir(), "pokemath-creature-"));
  const sourceArchiveDirectory = await mkdtemp(join(tmpdir(), "pokemath-creature-source-"));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));
  context.after(() => rm(sourceArchiveDirectory, { recursive: true, force: true }));
  let calls = 0;
  let workingDirectory;
  const runGeneration = async ({ config: receivedConfig, outputDirectory: receivedDirectory }) => {
    calls += 1;
    assert.equal(receivedConfig, config);
    assert.notEqual(receivedDirectory, outputDirectory);
    workingDirectory = receivedDirectory;
    await writeFile(join(receivedDirectory, "raw.png"), raw);
  };

  const result = await generateCreature(config, {
    runGeneration,
    outputDirectory,
    sourceArchiveDirectory,
    now: new Date("2026-07-18T00:00:00.000Z"),
  });
  assert.equal(calls, 1);
  assert.equal(result.manifest.transport, "codex-subscription");
  assert.equal(result.manifest.model, "gpt-image-2");
  assert.equal(result.manifest.output.stripWidth, 96);
  assert.equal(result.sourceArchiveDirectory, sourceArchiveDirectory);
  await assert.rejects(access(workingDirectory), /ENOENT/);

  assert.equal(result.manifest.createdAt, "2026-07-18T00:00:00.000Z");
  assert.deepEqual((await readdir(outputDirectory)).sort(), ["mossback.png", "mossback_alt.png"]);
  assert.deepEqual((await readdir(sourceArchiveDirectory)).sort(), ["manifest.json", "raw.png"]);
  assert.deepEqual(await readFile(join(sourceArchiveDirectory, "raw.png")), raw);
  assert.deepEqual(
    JSON.parse(await readFile(join(sourceArchiveDirectory, "manifest.json"), "utf8")),
    result.manifest,
  );
  const outputMetadata = await sharp(join(outputDirectory, "mossback.png")).metadata();
  const altMetadata = await sharp(join(outputDirectory, "mossback_alt.png")).metadata();
  assert.equal(outputMetadata.width, 96);
  assert.equal(outputMetadata.height, 48);
  assert.equal(altMetadata.width, 96);
  assert.equal(altMetadata.height, 48);
  assert.match(result.manifest.output.altSha256, /^[0-9a-f]{64}$/);
});

test("a non-empty output directory fails before starting Codex generation", async (context) => {
  const config = normalizeCreatureConfig(validConfig({ stages: 1 }));
  const outputDirectory = await mkdtemp(join(tmpdir(), "pokemath-creature-nonempty-"));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));
  await writeFile(join(outputDirectory, "keep.txt"), "do not overwrite");
  let generationCalls = 0;
  const runGeneration = async () => {
    generationCalls += 1;
    throw new Error("should not be called");
  };

  await assert.rejects(
    generateCreature(config, { runGeneration, outputDirectory }),
    /output directory is not empty/,
  );
  assert.equal(generationCalls, 0);
});

test("a non-empty source archive fails before starting Codex generation", async (context) => {
  const config = normalizeCreatureConfig(validConfig({ stages: 1 }));
  const outputDirectory = await mkdtemp(join(tmpdir(), "pokemath-creature-output-"));
  const sourceArchiveDirectory = await mkdtemp(join(tmpdir(), "pokemath-creature-source-"));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));
  context.after(() => rm(sourceArchiveDirectory, { recursive: true, force: true }));
  await writeFile(join(sourceArchiveDirectory, "keep.txt"), "do not overwrite");
  let generationCalls = 0;
  const runGeneration = async () => {
    generationCalls += 1;
    throw new Error("should not be called");
  };

  await assert.rejects(
    generateCreature(config, {
      runGeneration,
      outputDirectory,
      sourceArchiveDirectory,
    }),
    /source archive directory is not empty/,
  );
  assert.equal(generationCalls, 0);
});
