import { test } from "node:test";
import assert from "node:assert/strict";

import { prepareCalibrationSave } from "./prepare-calibration-save.mjs";

const envelope = {
  saveVersion: 7,
  save: {
    schemaVersion: 2,
    player: { level: 2, totalXp: 20 },
    money: 200,
  },
};

test("prepares a CAS body at the exact level-curve boundary", () => {
  const body = prepareCalibrationSave(envelope, 30);
  assert.equal(body.baseVersion, 7);
  assert.deepEqual(body.save.player, { level: 30, totalXp: 4640 });
  assert.equal(body.save.money, 200);
  assert.deepEqual(envelope.save.player, { level: 2, totalXp: 20 }, "input stays untouched");
});

test("rejects invalid levels and malformed API responses", () => {
  for (const level of [0, 31, 1.5, NaN]) {
    assert.throws(() => prepareCalibrationSave(envelope, level), /\[1, 30\]/);
  }
  assert.throws(() => prepareCalibrationSave({}, 1), /GET \/api\/save/);
});
