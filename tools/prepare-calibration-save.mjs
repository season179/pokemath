#!/usr/bin/env node
// Prepare an authenticated GET /api/save response for a local calibration
// PUT. This never talks to production and only changes player progression.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { totalXpForLevel } from "../shared/player-progression.ts";

export function prepareCalibrationSave(envelope, level) {
  if (!Number.isInteger(level) || level < 1 || level > 30) {
    throw new Error(`level must be an integer in [1, 30], got ${level}`);
  }
  if (!envelope || typeof envelope !== "object" || !envelope.save || !Number.isInteger(envelope.saveVersion)) {
    throw new Error("input must be a GET /api/save response with save and saveVersion");
  }
  return {
    save: {
      ...envelope.save,
      player: { level, totalXp: totalXpForLevel(level) },
    },
    baseVersion: envelope.saveVersion,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [file, rawLevel] = process.argv.slice(2);
  if (!file || rawLevel === undefined) {
    console.error("usage: node tools/prepare-calibration-save.mjs <save-envelope.json> <level 1-30>");
    process.exit(1);
  }
  const body = prepareCalibrationSave(JSON.parse(await readFile(file, "utf8")), Number(rawLevel));
  console.log(JSON.stringify(body));
}
