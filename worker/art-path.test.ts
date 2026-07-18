import { test } from "node:test";
import assert from "node:assert/strict";

import { artKeyFromPath } from "./src/art-path.ts";

test("canonical art URL maps to the versioned R2 key", () => {
  assert.equal(
    artKeyFromPath("/art/v1/pocket-creature-tamer/tilesets/grass.png"),
    "art/v1/pocket-creature-tamer/tilesets/grass.png",
  );
});

test("art path rejects unrelated, malformed, and traversal paths", () => {
  assert.equal(artKeyFromPath("/api/v1/file.png"), null);
  assert.equal(artKeyFromPath("/art/%E0%A4%A"), null);
  assert.equal(artKeyFromPath("/art/v1/../secret"), null);
  assert.equal(artKeyFromPath("/art/v1/%2e%2e/secret"), null);
});
