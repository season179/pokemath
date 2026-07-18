import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import sharp from "sharp";

import {
  CATALOG_KEY,
  PRODUCTION_BUCKET,
  SOURCE_BUCKET,
  buildCreatureRelease,
  loadLocalCreature,
  publishCreature,
  pullCreature,
  verifyCreature,
} from "./art-registry.mjs";

class MemoryR2 {
  constructor() {
    this.objects = new Map();
    this.operations = [];
  }

  objectKey(bucket, key) {
    return `${bucket}/${key}`;
  }

  async get(bucket, key) {
    this.operations.push({ action: "get", bucket, key });
    const value = this.objects.get(this.objectKey(bucket, key));
    return value ? Buffer.from(value) : null;
  }

  async put(bucket, key, buffer) {
    this.operations.push({ action: "put", bucket, key });
    this.objects.set(this.objectKey(bucket, key), Buffer.from(buffer));
  }
}

async function sprite(width, colour) {
  return sharp({
    create: {
      width,
      height: 48,
      channels: 4,
      background: { ...colour, alpha: 1 },
    },
  }).png().toBuffer();
}

async function fixtureRelease({ completeSource = true } = {}) {
  const normal = await sprite(96, { r: 40, g: 90, b: 180 });
  const alt = await sprite(96, { r: 180, g: 70, b: 120 });
  const spec = Buffer.from(JSON.stringify({ id: "testling", stages: 2 }));
  return buildCreatureRelease({
    id: "testling",
    stages: 2,
    normal,
    alt,
    spec,
    raw: completeSource ? await sprite(128, { r: 20, g: 200, b: 20 }) : null,
    generationManifest: completeSource ? Buffer.from('{"version":4}') : null,
  });
}

test("release keys are immutable, content-addressed, and bucket-scoped", async () => {
  const release = await fixtureRelease();
  assert.match(release.release, /^[0-9a-f]{64}$/);
  assert.equal(
    release.production.normal.key,
    `art/creatures/testling/${release.release}/asset.bin`,
  );
  assert.equal(
    release.production.alt.key,
    `art/creatures/testling/${release.release}/asset2.bin`,
  );
  assert.equal(
    release.sourceFiles.raw.key,
    `creatures/testling/${release.release}/asset.bin`,
  );
  assert.equal(release.completeSource, true);
});

test("publish verifies immutable objects and updates the private catalog last", async () => {
  const client = new MemoryR2();
  const release = await fixtureRelease();
  const result = await publishCreature(release, client, {
    now: new Date("2026-07-18T08:00:00.000Z"),
  });
  assert.equal(result.release, release.release);
  const puts = client.operations.filter((operation) => operation.action === "put");
  assert.deepEqual(puts.at(-1), { action: "put", bucket: SOURCE_BUCKET, key: CATALOG_KEY });
  assert.ok(puts.some((operation) => operation.bucket === PRODUCTION_BUCKET));
  assert.ok(puts.some((operation) => operation.bucket === SOURCE_BUCKET));

  const catalog = JSON.parse(
    client.objects.get(`${SOURCE_BUCKET}/${CATALOG_KEY}`).toString("utf8"),
  );
  assert.equal(catalog.creatures.testling.release, release.release);
  assert.equal(catalog.creatures.testling.source.complete, true);
  assert.equal(catalog.creatures.testling.publishedAt, "2026-07-18T08:00:00.000Z");
  const catalogWrite = client.operations.findLastIndex(
    (operation) => operation.action === "put" && operation.key === CATALOG_KEY,
  );
  assert.deepEqual(client.operations[catalogWrite + 1], {
    action: "get",
    bucket: SOURCE_BUCKET,
    key: CATALOG_KEY,
  });
});

test("legacy publication is explicit and records missing raw provenance", async () => {
  const release = await fixtureRelease({ completeSource: false });
  assert.equal(release.completeSource, false);
  assert.deepEqual(Object.keys(release.sourceFiles).sort(), ["provenance", "spec"]);
  const provenance = JSON.parse(release.sourceFiles.provenance.buffer.toString("utf8"));
  assert.equal(provenance.status, "legacy-source-unavailable");
});

test("verify detects corrupted R2 production objects", async () => {
  const client = new MemoryR2();
  const release = await fixtureRelease();
  await publishCreature(release, client);
  await verifyCreature("testling", client);
  client.objects.set(
    `${PRODUCTION_BUCKET}/${release.production.normal.key}`,
    Buffer.from("corrupt"),
  );
  await assert.rejects(verifyCreature("testling", client), /failed hash verification/);
});

test("pull restores the R2 copy and refuses an unapproved local overwrite", async (context) => {
  const client = new MemoryR2();
  const release = await fixtureRelease();
  await publishCreature(release, client);
  const root = await mkdtemp(join(tmpdir(), "pokemath-art-pull-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  await pullCreature("testling", client, { root });
  const normalPath = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creatures",
    "testling",
    "testling.png",
  );
  assert.deepEqual(await readFile(normalPath), release.production.normal.buffer);
  const rawPath = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creature Sources",
    "testling",
    "raw.png",
  );
  const manifestPath = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creature Sources",
    "testling",
    "manifest.json",
  );
  assert.deepEqual(await readFile(rawPath), release.sourceFiles.raw.buffer);
  assert.deepEqual(await readFile(manifestPath), release.sourceFiles.manifest.buffer);
  await writeFile(normalPath, Buffer.from("different local content"));
  await assert.rejects(pullCreature("testling", client, { root }), /use --force/);
  await pullCreature("testling", client, { root, force: true });
  assert.deepEqual(await readFile(normalPath), release.production.normal.buffer);
});

test("local loading requires an explicit legacy exception when source files are absent", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "pokemath-art-local-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const production = join(
    root,
    "art-samples",
    "PokeMath Original",
    "Creatures",
    "testling",
  );
  await mkdir(production, { recursive: true });
  await mkdir(join(root, "creature-specs"), { recursive: true });
  const normal = await sprite(96, { r: 40, g: 90, b: 180 });
  const alt = await sprite(96, { r: 180, g: 70, b: 120 });
  await Promise.all([
    writeFile(join(root, "creature-specs", "testling.json"), '{"id":"testling","stages":2}'),
    writeFile(join(production, "testling.png"), normal),
    writeFile(join(production, "testling_alt.png"), alt),
  ]);

  await assert.rejects(
    loadLocalCreature("testling", { root, validateOutput: false }),
    /no retained raw source/,
  );
  const release = await loadLocalCreature("testling", {
    root,
    allowMissingSource: true,
    validateOutput: false,
  });
  assert.equal(release.completeSource, false);
});
