#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import sharp from "sharp";

const execFile = promisify(execFileCallback);

export const IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_FRAME_SIZE = 48;
export const DEFAULT_CHROMA_KEY = "#00ff00";
export const DEFAULT_ALT_VARIANT = Object.freeze({
  hue: 180,
  saturation: 1.25,
  brightness: 0.9,
});

const QUALITY_VALUES = new Set(["low", "medium", "high"]);

// These are preferred composition canvases. Codex's image tool may return a
// different pixel size, so normalization divides the actual canvas by ratio.
export const STAGE_LAYOUTS = Object.freeze({
  1: Object.freeze({ width: 1024, height: 1024, columns: 1, rows: 1 }),
  2: Object.freeze({ width: 1536, height: 768, columns: 2, rows: 1 }),
  3: Object.freeze({ width: 2304, height: 768, columns: 3, rows: 1 }),
  4: Object.freeze({ width: 1536, height: 1536, columns: 2, rows: 2 }),
});

function usage() {
  return `Usage:
  node tools/generate-creature.mjs --config <file.json> [--out-dir <directory>] [--archive-dir <directory>]
  node tools/generate-creature.mjs --config <file.json> --dry-run
  node tools/generate-creature.mjs --config <file.json> --source-dir <run-directory> --out-dir <directory> [--archive-dir <directory>] --process-only

The config field "stages" accepts 1, 2, 3, or 4. A value of 1 means the
creature has no evolution. Successful generation leaves exactly two files in
the output directory: <id>.png and <id>_alt.png. It also retains raw.png and
manifest.json in a separate source archive directory.`;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalStringArray(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return value.map((item) => item.trim());
}

function numberInRange(value, field, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${field} must be a number from ${minimum} to ${maximum}`);
  }
  return value;
}

function normalizeAltVariant(value) {
  if (value === undefined) return { ...DEFAULT_ALT_VARIANT };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("alt must be an object");
  }
  return {
    hue: numberInRange(value.hue ?? DEFAULT_ALT_VARIANT.hue, "alt.hue", 0, 360),
    saturation: numberInRange(
      value.saturation ?? DEFAULT_ALT_VARIANT.saturation,
      "alt.saturation",
      0,
      3,
    ),
    brightness: numberInRange(
      value.brightness ?? DEFAULT_ALT_VARIANT.brightness,
      "alt.brightness",
      0.25,
      2,
    ),
  };
}

function parseHexColor(value, field = "chromaKey") {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${field} must be a six-digit hex colour such as #00ff00`);
  }
  return {
    hex: value.toLowerCase(),
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}

export function normalizeCreatureConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("config must be a JSON object");
  }

  const id = requireString(raw.id, "id");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("id must use lowercase letters, numbers, and single hyphens");
  }

  const name = requireString(raw.name, "name");
  const concept = requireString(raw.concept, "concept");
  const stages = raw.stages;
  if (!Number.isInteger(stages) || stages < 1 || stages > 4) {
    throw new Error("stages must be one of 1, 2, 3, or 4; use 1 for no evolution");
  }

  if (!Array.isArray(raw.stageDescriptions) || raw.stageDescriptions.length !== stages) {
    throw new Error(`stageDescriptions must contain exactly ${stages} entries`);
  }
  const stageDescriptions = raw.stageDescriptions.map((value, index) =>
    requireString(value, `stageDescriptions[${index}]`),
  );

  const palette = optionalStringArray(raw.palette, "palette");
  const avoid = optionalStringArray(raw.avoid, "avoid");
  const habitat = raw.habitat === undefined ? "" : requireString(raw.habitat, "habitat");
  const quality = raw.quality ?? "medium";
  if (!QUALITY_VALUES.has(quality)) {
    throw new Error("quality must be low, medium, or high");
  }

  const chromaKey = parseHexColor(raw.chromaKey ?? DEFAULT_CHROMA_KEY).hex;
  const chromaTolerance = raw.chromaTolerance ?? 64;
  if (!Number.isInteger(chromaTolerance) || chromaTolerance < 1 || chromaTolerance > 255) {
    throw new Error("chromaTolerance must be an integer from 1 to 255");
  }

  return {
    id,
    name,
    concept,
    stages,
    stageDescriptions,
    palette,
    avoid,
    habitat,
    quality,
    chromaKey,
    chromaTolerance,
    alt: normalizeAltVariant(raw.alt),
  };
}

export function stageSlots(stages, sourceWidth, sourceHeight) {
  const layout = STAGE_LAYOUTS[stages];
  if (!layout) throw new Error(`unsupported stage count: ${stages}`);
  const width = sourceWidth ?? layout.width;
  const height = sourceHeight ?? layout.height;
  const slots = [];
  for (let index = 0; index < stages; index += 1) {
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const left = Math.round((column * width) / layout.columns);
    const right = Math.round(((column + 1) * width) / layout.columns);
    const top = Math.round((row * height) / layout.rows);
    const bottom = Math.round(((row + 1) * height) / layout.rows);
    slots.push({
      left,
      top,
      width: right - left,
      height: bottom - top,
    });
  }
  return slots;
}

function slotLabel(index, stages) {
  if (stages !== 4) return `slot ${index + 1}, from left to right`;
  return ["top-left", "top-right", "bottom-left", "bottom-right"][index];
}

export function buildCreaturePrompt(config) {
  const layout = STAGE_LAYOUTS[config.stages];
  const stageLines = config.stageDescriptions
    .map((description, index) => `- Stage ${index + 1} (${slotLabel(index, config.stages)}): ${description}`)
    .join("\n");
  const layoutDescription = config.stages === 4
    ? "an exact 2 by 2 grid in reading order"
    : `one horizontal row of exactly ${config.stages} equal slot${config.stages === 1 ? "" : "s"}`;
  const evolutionInstruction = config.stages === 1
    ? "This creature has no evolution. Show exactly one complete creature."
    : `Show one creature identity evolving through exactly ${config.stages} stages.`;

  return `Use case: production sprite source for a children's 2D creature game.
Primary request: Create ${config.name}, ${config.concept}
${evolutionInstruction}
${config.habitat ? `Habitat influence: ${config.habitat}\n` : ""}Canvas and layout:
- exact ${layout.width}x${layout.height} image
- ${layoutDescription}
- every stage gets one equal slot and stays fully inside its slot
- stages use consistent three-quarter side view, facing right
- bottom-centre each stage on the same baseline

Evolution continuity:
- same creature identity, face, motif, palette family, and body-plan lineage throughout
- each later stage clearly grows from the previous stage
- increase complexity gradually; do not replace the creature with an unrelated species

Stage specification:
${stageLines}

Pixel-art requirements:
- authentic game-ready pixel art designed for reduction to 48x48 pixels per stage
- requested generation quality: ${config.quality}
- bold readable silhouette, crisp hard pixel clusters, restrained palette, strong outline
- no anti-aliasing, gradients, blur, soft painting, or photorealistic texture
${config.palette.length ? `- palette direction: ${config.palette.join(", ")}\n` : ""}
Background removal requirements:
- perfectly flat solid ${config.chromaKey} background across the entire image
- no shadows, floor, glow, scenery, borders, dividers, labels, or text
- never use ${config.chromaKey} anywhere in the creature
${config.avoid.length ? `Avoid: ${config.avoid.join(", ")}\n` : ""}`;
}

export function buildCodexWorkerPrompt(config, rawPath) {
  return `Act only as an image-generation worker. Use Codex's built-in image generation tool and request the ${IMAGE_MODEL} image model.

Generate exactly one image from the visual specification below. Save or copy the final PNG to this exact absolute path:
${rawPath}

Do not create, edit, or delete project files. Apart from Codex's own final-message log, raw.png must be the only generated asset in the output directory. Before finishing, verify that the PNG exists at that path. Do not substitute an SVG, HTML file, or programmatically drawn image.

VISUAL SPECIFICATION
${buildCreaturePrompt(config)}`;
}

export function buildCodexArguments(config, outputDirectory) {
  const rawPath = join(outputDirectory, "raw.png");
  return [
    "exec",
    "--ignore-user-config",
    "--enable",
    "image_generation",
    "--ephemeral",
    "--skip-git-repo-check",
    "--color",
    "never",
    "--sandbox",
    "workspace-write",
    "--cd",
    outputDirectory,
    "--output-last-message",
    join(outputDirectory, "codex-last-message.txt"),
    buildCodexWorkerPrompt(config, rawPath),
  ];
}

export function codexSubscriptionEnvironment(environment = process.env) {
  const sanitized = { ...environment };
  for (const name of [
    "OPENAI_API_KEY",
    "OPENAI_ORG_ID",
    "OPENAI_PROJECT_ID",
    "AZURE_OPENAI_API_KEY",
  ]) {
    delete sanitized[name];
  }
  return sanitized;
}

export async function verifyCodexSubscription(options = {}) {
  const execute = options.execute ?? execFile;
  let result;
  try {
    result = await execute("codex", ["login", "status"], {
      env: codexSubscriptionEnvironment(options.environment),
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`could not check Codex login: ${error.message}`);
  }
  const status = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!/Logged in using ChatGPT/i.test(status)) {
    throw new Error(
      "Codex must be logged in using ChatGPT so generation uses the Codex subscription",
    );
  }
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      // Codex reads optional prompt additions from stdin. An inherited pipe
      // never reaches EOF and leaves non-interactive workers waiting forever.
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", rejectPromise);
    child.on("close", (code, signal) => {
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        resolvePromise(result);
        return;
      }
      const detail = result.stderr.trim() || `exit ${code}${signal ? ` (${signal})` : ""}`;
      rejectPromise(Object.assign(new Error(detail), result));
    });
  });
}

export async function runCodexGeneration({
  config,
  outputDirectory,
  execute = execFile,
  runWorker = runProcess,
}) {
  await verifyCodexSubscription({ execute });
  const args = buildCodexArguments(config, outputDirectory);
  try {
    await runWorker("codex", args, {
      cwd: outputDirectory,
      env: codexSubscriptionEnvironment(),
    });
  } catch (error) {
    throw new Error(`Codex image worker failed: ${error.stderr || error.message}`);
  }
}

function colourDistanceSquared(red, green, blue, key) {
  return (
    (red - key.red) ** 2
    + (green - key.green) ** 2
    + (blue - key.blue) ** 2
  );
}

function retainLargestOpaqueComponent(data, info) {
  const { width, height, channels } = info;
  assert.equal(channels, 4);
  const pixelCount = width * height;
  const labels = new Int32Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const components = [];

  for (let start = 0; start < pixelCount; start += 1) {
    if (data[start * channels + 3] === 0 || labels[start] !== 0) continue;
    const label = components.length + 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    const bounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
    labels[start] = label;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
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
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (data[next * channels + 3] === 0 || labels[next] !== 0) continue;
          labels[next] = label;
          queue[tail] = next;
          tail += 1;
        }
      }
    }
    components.push({ label, size, bounds });
  }

  if (components.length === 0) {
    throw new Error("no sprite content remained after chroma-key removal");
  }

  const main = components.reduce((largest, component) => (
    component.size > largest.size ? component : largest
  ));
  for (let index = 0; index < pixelCount; index += 1) {
    if (labels[index] !== 0 && labels[index] !== main.label) {
      data[index * channels + 3] = 0;
    }
  }
  return {
    left: main.bounds.minX,
    top: main.bounds.minY,
    width: main.bounds.maxX - main.bounds.minX + 1,
    height: main.bounds.maxY - main.bounds.minY + 1,
  };
}

async function removeConnectedChroma(input, chromaKey, tolerance) {
  const key = parseHexColor(chromaKey);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  assert.equal(channels, 4);
  const pixelCount = width * height;
  const candidate = new Uint8Array(pixelCount);
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const toleranceSquared = tolerance ** 2;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    candidate[index] = colourDistanceSquared(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      key,
    ) <= toleranceSquared ? 1 : 0;
  }

  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (!candidate[index] || visited[index]) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }
  const bounds = retainLargestOpaqueComponent(data, info);

  return {
    image: await sharp(data, { raw: info }).png().toBuffer(),
    bounds,
  };
}

async function normalizeStage(cleaned, bounds, scale, frameSize) {
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const content = await sharp(cleaned)
    .extract(bounds)
    .resize(width, height, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
  const left = Math.floor((frameSize - width) / 2);
  const top = frameSize - height - 1;
  return sharp({
    create: {
      width: frameSize,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left, top }])
    .png()
    .toBuffer();
}

export async function normalizeCreatureImage(rawImage, config, options = {}) {
  const frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
  const metadata = await sharp(rawImage).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("generated image has no readable dimensions");
  }

  const cleanedStages = [];
  for (const slot of stageSlots(config.stages, metadata.width, metadata.height)) {
    const extracted = await sharp(rawImage).extract(slot).png().toBuffer();
    cleanedStages.push(await removeConnectedChroma(
      extracted,
      config.chromaKey,
      config.chromaTolerance,
    ));
  }

  const maxWidth = Math.max(...cleanedStages.map((stage) => stage.bounds.width));
  const maxHeight = Math.max(...cleanedStages.map((stage) => stage.bounds.height));
  const usableSize = frameSize - 2;
  const scale = Math.min(usableSize / maxWidth, usableSize / maxHeight);
  const frames = [];
  for (const stage of cleanedStages) {
    frames.push(await normalizeStage(stage.image, stage.bounds, scale, frameSize));
  }

  const strip = await sharp({
    create: {
      width: frameSize * config.stages,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png()
    .toBuffer();

  return {
    strip,
    frames,
    scale,
    sourceSize: { width: metadata.width, height: metadata.height },
    sourceBounds: cleanedStages.map((stage) => stage.bounds),
  };
}

export async function createAltVariant(normalStrip, alt) {
  return sharp(normalStrip)
    .modulate({
      hue: alt.hue,
      saturation: alt.saturation,
      brightness: alt.brightness,
    })
    .png()
    .toBuffer();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function ensureEmptyDirectory(directory, label = "output directory") {
  try {
    await access(directory);
    const entries = await readdir(directory);
    if (entries.length > 0) {
      throw new Error(`${label} is not empty: ${directory}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(directory, { recursive: true });
}

export async function generateCreature(config, options = {}) {
  const outputDirectory = resolve(options.outputDirectory);
  const sourceArchiveDirectory = resolve(
    options.sourceArchiveDirectory ?? `${outputDirectory}-source`,
  );
  if (sourceArchiveDirectory === outputDirectory) {
    throw new Error("output and source archive directories must be different");
  }
  // Fail before starting a subscription-backed generation if files could be overwritten.
  await ensureEmptyDirectory(outputDirectory);
  await ensureEmptyDirectory(sourceArchiveDirectory, "source archive directory");
  const runGeneration = options.runGeneration ?? runCodexGeneration;
  const workingDirectory = await mkdtemp(join(tmpdir(), `pokemath-${config.id}-`));
  let completed = false;
  try {
    await runGeneration({ config, outputDirectory: workingDirectory });
    const result = await processCreatureOutput(config, {
      sourceDirectory: workingDirectory,
      outputDirectory,
      sourceArchiveDirectory,
      now: options.now,
    });
    completed = true;
    return result;
  } catch (error) {
    error.message = `${error.message}; generation workspace kept at ${workingDirectory}`;
    throw error;
  } finally {
    if (completed) await rm(workingDirectory, { recursive: true, force: true });
  }
}

export async function processCreatureOutput(config, options = {}) {
  const outputDirectory = resolve(options.outputDirectory);
  const sourceDirectory = resolve(options.sourceDirectory);
  const sourceArchiveDirectory = resolve(
    options.sourceArchiveDirectory ?? `${outputDirectory}-source`,
  );
  if (sourceDirectory === outputDirectory) {
    throw new Error("source and output directories must be different");
  }
  if (sourceArchiveDirectory === outputDirectory || sourceArchiveDirectory === sourceDirectory) {
    throw new Error("source archive, source, and output directories must be different");
  }
  await ensureEmptyDirectory(outputDirectory);
  await ensureEmptyDirectory(sourceArchiveDirectory, "source archive directory");
  const rawPath = join(sourceDirectory, "raw.png");
  let rawImage;
  try {
    rawImage = await readFile(rawPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    throw new Error("Codex finished without saving raw.png");
  }
  const normalized = await normalizeCreatureImage(rawImage, config);
  const altStrip = await createAltVariant(normalized.strip, config.alt);

  const manifest = {
    version: 3,
    createdAt: (options.now ?? new Date()).toISOString(),
    transport: "codex-subscription",
    model: IMAGE_MODEL,
    modelSelection: "requested through Codex image generation tool",
    config,
    generation: {
      preferredSize: `${STAGE_LAYOUTS[config.stages].width}x${STAGE_LAYOUTS[config.stages].height}`,
      quality: config.quality,
      prompt: buildCreaturePrompt(config),
    },
    output: {
      frameSize: DEFAULT_FRAME_SIZE,
      stripWidth: DEFAULT_FRAME_SIZE * config.stages,
      stripHeight: DEFAULT_FRAME_SIZE,
      scale: normalized.scale,
      sourceSize: normalized.sourceSize,
      sourceBounds: normalized.sourceBounds,
      rawSha256: sha256(rawImage),
      stripSha256: sha256(normalized.strip),
      normalSha256: sha256(normalized.strip),
      altSha256: sha256(altStrip),
    },
  };
  await Promise.all([
    writeFile(join(outputDirectory, `${config.id}.png`), normalized.strip),
    writeFile(join(outputDirectory, `${config.id}_alt.png`), altStrip),
    writeFile(join(sourceArchiveDirectory, "raw.png"), rawImage),
    writeFile(
      join(sourceArchiveDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
  return { outputDirectory, sourceArchiveDirectory, manifest };
}

function parseArguments(argv) {
  const parsed = {
    configPath: "",
    outputDirectory: "",
    sourceArchiveDirectory: "",
    sourceDirectory: "",
    dryRun: false,
    processOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--config") parsed.configPath = argv[++index] ?? "";
    else if (argument === "--out-dir") parsed.outputDirectory = argv[++index] ?? "";
    else if (argument === "--archive-dir") parsed.sourceArchiveDirectory = argv[++index] ?? "";
    else if (argument === "--source-dir") parsed.sourceDirectory = argv[++index] ?? "";
    else if (argument === "--dry-run") parsed.dryRun = true;
    else if (argument === "--process-only") parsed.processOnly = true;
    else if (argument === "--help" || argument === "-h") parsed.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return parsed;
}

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.configPath) throw new Error(`--config is required\n\n${usage()}`);

  const configPath = resolve(args.configPath);
  const config = normalizeCreatureConfig(JSON.parse(await readFile(configPath, "utf8")));
  const root = dirname(fileURLToPath(import.meta.url));
  const outputDirectory = args.outputDirectory
    ? resolve(args.outputDirectory)
    : resolve(root, "..", "art-samples", "PokeMath Original", "Creatures", config.id);
  const sourceArchiveDirectory = args.sourceArchiveDirectory
    ? resolve(args.sourceArchiveDirectory)
    : args.outputDirectory
      ? resolve(`${outputDirectory}-source`)
      : resolve(
        root,
        "..",
        "art-samples",
        "PokeMath Original",
        "Creature Sources",
        config.id,
      );
  if (args.dryRun) {
    console.log(JSON.stringify({
      transport: "codex-subscription",
      model: IMAGE_MODEL,
      config,
      outputDirectory,
      sourceArchiveDirectory,
      codexArguments: buildCodexArguments(
        config,
        resolve("<temporary-generation-workspace>"),
      ),
    }, null, 2));
    return;
  }
  if (args.processOnly && (!args.sourceDirectory || !args.outputDirectory)) {
    throw new Error("--process-only requires both --source-dir and --out-dir");
  }

  const now = new Date();
  const result = args.processOnly
    ? await processCreatureOutput(config, {
      sourceDirectory: resolve(args.sourceDirectory),
      outputDirectory,
      sourceArchiveDirectory,
      now,
    })
    : await generateCreature(config, { outputDirectory, sourceArchiveDirectory, now });
  console.log(`${args.processOnly ? "Processed" : "Generated"} ${config.stages}-stage creature line with ${IMAGE_MODEL}`);
  console.log(`Saved to ${result.outputDirectory}`);
  console.log(`Sources saved to ${result.sourceArchiveDirectory}`);
}

const isMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  runCli().catch((error) => {
    console.error(`Creature generation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
