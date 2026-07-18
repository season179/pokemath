#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
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
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PRODUCTION_BUCKET = "pokemath-art";
export const SOURCE_BUCKET = "pokemath-art-source";
export const CATALOG_KEY = "catalog/creatures.json";

function usage() {
  return `Usage:
  node tools/art-registry.mjs setup
  node tools/art-registry.mjs publish <creature-id> [--allow-missing-source]
  node tools/art-registry.mjs pull <creature-id|--all> [--force]
  node tools/art-registry.mjs verify <creature-id|--all>

R2 is authoritative. Publishing uploads only the validated creature pair and
its provenance. Pulling restores the local gitignored cache from the private
R2 catalog. Existing local files are never replaced without --force.`;
}

function validateCreatureId(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? "")) {
    throw new Error("creature id must use lowercase letters, numbers, and single hyphens");
  }
  return id;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function jsonBuffer(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function productionKey(id, release, variant) {
  const filename = variant === "normal" ? "asset.bin" : "asset2.bin";
  return `art/creatures/${id}/${release}/${filename}`;
}

function sourceKey(id, release, name) {
  return `creatures/${id}/${release}/${name}`;
}

function fileDescriptor(key, buffer, contentType) {
  return {
    key,
    sha256: sha256(buffer),
    bytes: buffer.length,
    contentType,
  };
}

export function buildCreatureRelease({
  id,
  stages,
  normal,
  alt,
  spec,
  raw = null,
  generationManifest = null,
}) {
  validateCreatureId(id);
  if (!Number.isInteger(stages) || stages < 1 || stages > 4) {
    throw new Error("stages must be an integer from 1 to 4");
  }
  const normalSha256 = sha256(normal);
  const altSha256 = sha256(alt);
  const specSha256 = sha256(spec);
  const completeSource = raw !== null && generationManifest !== null;
  if ((raw === null) !== (generationManifest === null)) {
    throw new Error("raw.png and manifest.json must either both exist or both be absent");
  }
  const release = sha256(jsonBuffer({ id, stages, normalSha256, altSha256, specSha256 }));
  const production = {
    normal: {
      ...fileDescriptor(
        productionKey(id, release, "normal"),
        normal,
        "application/octet-stream",
      ),
      buffer: normal,
    },
    alt: {
      ...fileDescriptor(
        productionKey(id, release, "alt"),
        alt,
        "application/octet-stream",
      ),
      buffer: alt,
    },
  };
  const sourceFiles = {
    spec: {
      ...fileDescriptor(sourceKey(id, release, "spec.json"), spec, "application/json"),
      buffer: spec,
    },
  };
  if (completeSource) {
    sourceFiles.raw = {
      ...fileDescriptor(
        sourceKey(id, release, "asset.bin"),
        raw,
        "application/octet-stream",
      ),
      buffer: raw,
    };
    sourceFiles.manifest = {
      ...fileDescriptor(
        sourceKey(id, release, "manifest.json"),
        generationManifest,
        "application/json",
      ),
      buffer: generationManifest,
    };
  } else {
    const provenance = jsonBuffer({
      version: 1,
      creatureId: id,
      status: "legacy-source-unavailable",
      note: "The raw generation source was not retained before source archiving was enabled.",
    });
    sourceFiles.provenance = {
      ...fileDescriptor(
        sourceKey(id, release, "provenance.json"),
        provenance,
        "application/json",
      ),
      buffer: provenance,
    };
  }
  return {
    id,
    stages,
    release,
    width: stages * 48,
    height: 48,
    completeSource,
    production,
    sourceFiles,
  };
}

async function runOutputValidator(id, stages, root = projectRoot) {
  const validator = join(
    root,
    ".agents",
    "skills",
    "pokemath-creature",
    "scripts",
    "validate-output.mjs",
  );
  const directory = join(root, "art-samples", "PokeMath Original", "Creatures", id);
  await execFile(process.execPath, [
    validator,
    "--dir",
    directory,
    "--id",
    id,
    "--stages",
    String(stages),
  ], { cwd: root, maxBuffer: 1024 * 1024 });
}

export async function loadLocalCreature(
  id,
  { root = projectRoot, allowMissingSource = false, validateOutput = true } = {},
) {
  validateCreatureId(id);
  const specPath = join(root, "creature-specs", `${id}.json`);
  const spec = await readFile(specPath);
  const parsedSpec = JSON.parse(spec.toString("utf8"));
  if (parsedSpec.id !== id) throw new Error(`spec id must be ${id}`);
  if (validateOutput) await runOutputValidator(id, parsedSpec.stages, root);

  const productionDirectory = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creatures",
    id,
  );
  const [normal, alt] = await Promise.all([
    readFile(join(productionDirectory, `${id}.png`)),
    readFile(join(productionDirectory, `${id}_alt.png`)),
  ]);
  const sourceDirectory = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creature Sources",
    id,
  );
  const rawPath = join(sourceDirectory, "raw.png");
  const manifestPath = join(sourceDirectory, "manifest.json");
  const [hasRaw, hasManifest] = await Promise.all([exists(rawPath), exists(manifestPath)]);
  if (hasRaw !== hasManifest) {
    throw new Error(`${id} source archive must contain both raw.png and manifest.json`);
  }
  if (!hasRaw && !allowMissingSource) {
    throw new Error(
      `${id} has no retained raw source; rerun with --allow-missing-source only for a legacy migration`,
    );
  }
  const [raw, generationManifest] = hasRaw
    ? await Promise.all([readFile(rawPath), readFile(manifestPath)])
    : [null, null];
  return buildCreatureRelease({
    id,
    stages: parsedSpec.stages,
    normal,
    alt,
    spec,
    raw,
    generationManifest,
  });
}

function catalogEntry(release, publishedAt) {
  const describe = ({ buffer: _buffer, ...descriptor }) => descriptor;
  return {
    release: release.release,
    stages: release.stages,
    width: release.width,
    height: release.height,
    publishedAt,
    production: {
      normal: describe(release.production.normal),
      alt: describe(release.production.alt),
    },
    source: {
      complete: release.completeSource,
      files: Object.fromEntries(
        Object.entries(release.sourceFiles).map(([name, file]) => [name, describe(file)]),
      ),
    },
  };
}

function parseCatalog(buffer) {
  if (buffer === null) return { version: 1, updatedAt: null, creatures: {} };
  const catalog = JSON.parse(buffer.toString("utf8"));
  if (catalog?.version !== 1 || !catalog.creatures || typeof catalog.creatures !== "object") {
    throw new Error("unsupported or malformed R2 creature catalog");
  }
  return catalog;
}

async function ensureImmutable(client, bucket, file) {
  const existing = await client.get(bucket, file.key);
  if (existing !== null) {
    if (sha256(existing) !== file.sha256) {
      throw new Error(`immutable R2 object differs from local content: ${bucket}/${file.key}`);
    }
    return "unchanged";
  }
  await client.put(bucket, file.key, file.buffer, {
    contentType: file.contentType,
  });
  const uploaded = await client.get(bucket, file.key);
  if (uploaded === null || sha256(uploaded) !== file.sha256) {
    throw new Error(`R2 verification failed after upload: ${bucket}/${file.key}`);
  }
  return "uploaded";
}

export async function publishCreature(release, client, { now = new Date() } = {}) {
  const operations = [];
  for (const file of Object.values(release.sourceFiles)) {
    const status = await ensureImmutable(client, SOURCE_BUCKET, file);
    operations.push({ bucket: SOURCE_BUCKET, key: file.key, status });
  }
  for (const file of Object.values(release.production)) {
    const status = await ensureImmutable(client, PRODUCTION_BUCKET, file);
    operations.push({ bucket: PRODUCTION_BUCKET, key: file.key, status });
  }

  const currentBuffer = await client.get(SOURCE_BUCKET, CATALOG_KEY);
  const catalog = parseCatalog(currentBuffer);
  const previous = catalog.creatures[release.id];
  const publishedAt = previous?.release === release.release
    ? previous.publishedAt
    : now.toISOString();
  const entry = catalogEntry(release, publishedAt);
  if (JSON.stringify(previous) !== JSON.stringify(entry)) {
    const creatures = { ...catalog.creatures, [release.id]: entry };
    catalog.creatures = Object.fromEntries(
      Object.entries(creatures).sort(([left], [right]) => left.localeCompare(right)),
    );
    catalog.updatedAt = now.toISOString();
    const nextCatalog = jsonBuffer(catalog);
    await client.put(SOURCE_BUCKET, CATALOG_KEY, nextCatalog, {
      contentType: "application/json",
      cacheControl: "no-store",
    });
    const uploadedCatalog = await client.get(SOURCE_BUCKET, CATALOG_KEY);
    if (uploadedCatalog === null || sha256(uploadedCatalog) !== sha256(nextCatalog)) {
      throw new Error("R2 creature catalog failed verification after upload");
    }
    operations.push({ bucket: SOURCE_BUCKET, key: CATALOG_KEY, status: "updated" });
  }
  return { release: release.release, operations };
}

async function readCatalog(client) {
  const buffer = await client.get(SOURCE_BUCKET, CATALOG_KEY);
  if (buffer === null) throw new Error("R2 creature catalog does not exist; publish a creature first");
  return parseCatalog(buffer);
}

async function verifiedRemoteFile(client, bucket, descriptor) {
  const buffer = await client.get(bucket, descriptor.key);
  if (buffer === null) throw new Error(`missing R2 object: ${bucket}/${descriptor.key}`);
  if (buffer.length !== descriptor.bytes || sha256(buffer) !== descriptor.sha256) {
    throw new Error(`R2 object failed hash verification: ${bucket}/${descriptor.key}`);
  }
  return buffer;
}

export async function verifyCreature(id, client) {
  validateCreatureId(id);
  const catalog = await readCatalog(client);
  const entry = catalog.creatures[id];
  if (!entry) throw new Error(`${id} is not published in the R2 creature catalog`);
  const [normal, alt] = await Promise.all([
    verifiedRemoteFile(client, PRODUCTION_BUCKET, entry.production.normal),
    verifiedRemoteFile(client, PRODUCTION_BUCKET, entry.production.alt),
  ]);
  const sourceFiles = Object.fromEntries(await Promise.all(
    Object.entries(entry.source.files).map(async ([name, file]) => [
      name,
      await verifiedRemoteFile(client, SOURCE_BUCKET, file),
    ]),
  ));
  const [normalMetadata, altMetadata] = await Promise.all([
    sharp(normal).metadata(),
    sharp(alt).metadata(),
  ]);
  for (const metadata of [normalMetadata, altMetadata]) {
    if (metadata.width !== entry.width || metadata.height !== entry.height) {
      throw new Error(`${id} R2 sprite dimensions do not match the catalog`);
    }
  }
  return {
    id,
    release: entry.release,
    normalKey: entry.production.normal.key,
    altKey: entry.production.alt.key,
    sourceComplete: entry.source.complete,
    sourceFiles,
    normal,
    alt,
  };
}

async function writeCacheFiles(directory, files, force) {
  await mkdir(directory, { recursive: true });
  const expected = files.map((file) => file.name).sort();
  const entries = await readdir(directory);
  const unexpected = entries.filter((name) => !expected.includes(name));
  if (unexpected.length > 0) {
    throw new Error(`local cache directory has unexpected files: ${unexpected.join(", ")}`);
  }
  for (const file of files) {
    const path = join(directory, file.name);
    if (!await exists(path)) continue;
    const local = await readFile(path);
    if (sha256(local) === sha256(file.buffer)) continue;
    if (!force) throw new Error(`local file differs from R2; use --force to replace ${path}`);
  }
  await Promise.all(files.map((file) => writeFile(join(directory, file.name), file.buffer)));
}

export async function pullCreature(
  id,
  client,
  { root = projectRoot, force = false } = {},
) {
  const verified = await verifyCreature(id, client);
  const directory = join(root, "art-samples", "PokeMath Original", "Creatures", id);
  await writeCacheFiles(directory, [
    { name: `${id}.png`, buffer: verified.normal },
    { name: `${id}_alt.png`, buffer: verified.alt },
  ], force);
  if (verified.sourceComplete) {
    const sourceDirectory = join(
      root,
      "art-samples",
      "PokeMath Original",
      "Creature Sources",
      id,
    );
    await writeCacheFiles(sourceDirectory, [
      { name: "raw.png", buffer: verified.sourceFiles.raw },
      { name: "manifest.json", buffer: verified.sourceFiles.manifest },
    ], force);
  }
  return verified;
}

function wranglerErrorText(error) {
  return `${error?.stdout ?? ""}\n${error?.stderr ?? ""}\n${error?.message ?? ""}`;
}

function isMissingRemote(error) {
  return /not found|does not exist|NoSuchKey|10007/i.test(wranglerErrorText(error));
}

export function createWranglerClient({ root = projectRoot, execute = execFile } = {}) {
  const wrangler = join(root, "node_modules", ".bin", "wrangler");
  const run = (args) => execute(wrangler, args, {
    cwd: root,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    async get(bucket, key) {
      const temporary = await mkdtemp(join(tmpdir(), "pokemath-r2-get-"));
      const output = join(temporary, "object");
      try {
        await run(["r2", "object", "get", `${bucket}/${key}`, "--file", output, "--remote"]);
        return await readFile(output);
      } catch (error) {
        if (isMissingRemote(error)) return null;
        throw new Error(`could not read r2://${bucket}/${key}: ${wranglerErrorText(error).trim()}`);
      } finally {
        await rm(temporary, { recursive: true, force: true });
      }
    },
    async put(bucket, key, buffer, metadata = {}) {
      const temporary = await mkdtemp(join(tmpdir(), "pokemath-r2-put-"));
      const input = join(temporary, "object");
      try {
        await writeFile(input, buffer);
        const args = [
          "r2",
          "object",
          "put",
          `${bucket}/${key}`,
          "--file",
          input,
          "--remote",
          "--force",
        ];
        if (metadata.contentType) args.push("--content-type", metadata.contentType);
        if (metadata.cacheControl) args.push("--cache-control", metadata.cacheControl);
        await run(args);
      } catch (error) {
        throw new Error(`could not write r2://${bucket}/${key}: ${wranglerErrorText(error).trim()}`);
      } finally {
        await rm(temporary, { recursive: true, force: true });
      }
    },
    async bucketExists(bucket) {
      try {
        await run(["r2", "bucket", "info", bucket]);
        return true;
      } catch (error) {
        if (isMissingRemote(error)) return false;
        throw new Error(`could not inspect R2 bucket ${bucket}: ${wranglerErrorText(error).trim()}`);
      }
    },
    async createBucket(bucket) {
      await run(["r2", "bucket", "create", bucket]);
    },
  };
}

async function setupBuckets(client) {
  if (!await client.bucketExists(PRODUCTION_BUCKET)) {
    throw new Error(`production R2 bucket does not exist: ${PRODUCTION_BUCKET}`);
  }
  if (!await client.bucketExists(SOURCE_BUCKET)) {
    await client.createBucket(SOURCE_BUCKET);
    return { created: true };
  }
  return { created: false };
}

async function selectedCreatureIds(argument, client) {
  if (argument !== "--all") return [validateCreatureId(argument)];
  const catalog = await readCatalog(client);
  return Object.keys(catalog.creatures).sort();
}

function validateFlags(flags, allowed) {
  const invalid = flags.filter((flag) => !allowed.includes(flag));
  if (invalid.length > 0) throw new Error(`unsupported option: ${invalid.join(", ")}`);
}

export async function runCli(argv = process.argv.slice(2), options = {}) {
  const [command, selection, ...flags] = argv;
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  const client = options.client ?? createWranglerClient();
  if (command === "setup") {
    if (selection !== undefined || flags.length > 0) throw new Error("setup takes no options");
    const result = await setupBuckets(client);
    console.log(result.created ? `Created ${SOURCE_BUCKET}` : `${SOURCE_BUCKET} already exists`);
    return;
  }
  if (command === "publish") {
    validateFlags(flags, ["--allow-missing-source"]);
    const id = validateCreatureId(selection);
    const allowMissingSource = flags.includes("--allow-missing-source");
    const release = await loadLocalCreature(id, { allowMissingSource });
    const result = await publishCreature(release, client);
    console.log(JSON.stringify({ id, ...result }, null, 2));
    return;
  }
  if (command === "verify") {
    validateFlags(flags, []);
    const ids = await selectedCreatureIds(selection, client);
    const results = [];
    for (const id of ids) {
      const {
        normal: _normal,
        alt: _alt,
        sourceFiles: _sourceFiles,
        ...result
      } = await verifyCreature(id, client);
      results.push(result);
    }
    console.log(JSON.stringify({ verified: results }, null, 2));
    return;
  }
  if (command === "pull") {
    validateFlags(flags, ["--force"]);
    const ids = await selectedCreatureIds(selection, client);
    const force = flags.includes("--force");
    const results = [];
    for (const id of ids) {
      const {
        normal: _normal,
        alt: _alt,
        sourceFiles: _sourceFiles,
        ...result
      } = await pullCreature(id, client, { force });
      results.push(result);
    }
    console.log(JSON.stringify({ pulled: results }, null, 2));
    return;
  }
  throw new Error(`unknown command: ${command}\n\n${usage()}`);
}

const isMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  runCli().catch((error) => {
    console.error(`Art registry failed: ${error.message}`);
    process.exitCode = 1;
  });
}
