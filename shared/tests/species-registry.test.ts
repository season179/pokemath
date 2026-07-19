// Species + habitat registry invariants (issue #4). These tests are the
// permanence guarantee: ids stay opaque and stable, the approved slate's
// families are all registered bilingually, habitat tables resolve through
// the registry, the guardian never enters a wild table, and identity never
// depends on art.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEADOW_HABITATS,
  MEADOW_SPECIES,
  SPECIES_BY_ID,
  STARTERS,
  habitatFor,
} from "../index.ts";

const SLATE_SPECIES: ReadonlyArray<{ id: string; name: string; nameZh: string; stages: number; rarity: string }> = [
  { id: "meadow/mothling", name: "Mothling", nameZh: "毛毛虫", stages: 3, rarity: "common" },
  { id: "woolly/fluffball", name: "Fluffball", nameZh: "毛球", stages: 3, rarity: "common" },
  { id: "meadow/pufftail", name: "Pufftail", nameZh: "团子鼠", stages: 2, rarity: "common" },
  { id: "meadow/plumelet", name: "Plumelet", nameZh: "小羽", stages: 3, rarity: "common" },
  { id: "woolly/hare", name: "Balltail Hare", nameZh: "球尾兔", stages: 3, rarity: "uncommon" },
  { id: "sproutkit", name: "Sproutkit", nameZh: "苗苗", stages: 3, rarity: "starter" },
  { id: "meadow/blossomfox", name: "Blossomfox", nameZh: "花狐", stages: 3, rarity: "uncommon" },
  { id: "meadow/owlet", name: "Owlet", nameZh: "咕咕", stages: 2, rarity: "uncommon" },
  { id: "meadow/barnpup", name: "Barnpup", nameZh: "汪汪", stages: 2, rarity: "uncommon" },
  { id: "woolly/ram", name: "Woolly Ram", nameZh: "卷卷", stages: 2, rarity: "rare" },
  { id: "meadow/petalfae", name: "Petalfae", nameZh: "朵朵", stages: 3, rarity: "rare" },
  { id: "meadow/cloudmane", name: "Cloudmane", nameZh: "天马", stages: 1, rarity: "guardian" },
];

describe("species registry (#4)", () => {
  it("registers every slate row bilingually with stages and rarity", () => {
    for (const row of SLATE_SPECIES) {
      const species = SPECIES_BY_ID[row.id];
      assert.ok(species, `missing slate species ${row.id}`);
      assert.equal(species.name, row.name, `${row.id} EN name`);
      assert.equal(species.nameZh, row.nameZh, `${row.id} ZH name`);
      assert.equal(species.stages, row.stages, `${row.id} stages`);
      assert.equal(species.rarity, row.rarity, `${row.id} rarity`);
    }
  });

  it("keeps the grandfathered ids exactly as shipped in preview saves", () => {
    // Renaming any of these would orphan the kids' Field Guide and
    // collection entries (slate permanence rule 4).
    for (const id of ["woolly/fluffball", "woolly/hare", "woolly/ram", "sproutkit", "cloudhorn", "lumentail"]) {
      assert.ok(SPECIES_BY_ID[id], `grandfathered id missing: ${id}`);
    }
  });

  it("gives every starter a Chinese name (slate appendix)", () => {
    for (const starter of STARTERS) {
      assert.ok(starter.nameZh, `starter ${starter.id} lacks nameZh`);
      assert.equal(starter.rarity, "starter");
    }
  });

  it("keeps ids opaque — never a pack code, file path, or bucket key", () => {
    for (const id of Object.keys(SPECIES_BY_ID)) {
      assert.match(id, /^(woolly|meadow)\/[a-z]+$|^[a-z]+$/, `id carries meaning or a path: ${id}`);
      assert.ok(!id.includes(".png") && !id.includes("evo") && !id.includes("Uniques"), `pack code as id: ${id}`);
    }
  });

  it("resolves identity independently of art", () => {
    // Art is replaceable: a species with no artRef (or a missing sheet) is
    // still itself — id, names, and stats never come from the art binding.
    const legacy = SPECIES_BY_ID["countasaur"];
    assert.ok(legacy);
    assert.equal(legacy.artRef, undefined);
    assert.equal(legacy.name, "Countasaur");
    // Every bound artRef points at a sheet cell, never at an id-bearing path.
    for (const species of Object.values(SPECIES_BY_ID)) {
      if (species.artRef) {
        assert.ok(species.artRef.w > 0 && species.artRef.h > 0, `${species.id} artRef cell`);
        assert.notEqual(species.artRef.sheet, species.id);
      }
    }
  });
});

describe("habitat registry (#4)", () => {
  it("resolves every table entry through SPECIES_BY_ID", () => {
    for (const entry of MEADOW_HABITATS) {
      assert.ok(SPECIES_BY_ID[entry.speciesId], `habitat entry for unknown species ${entry.speciesId}`);
    }
  });

  it("matches each species' registered rarity", () => {
    for (const entry of MEADOW_HABITATS) {
      assert.equal(SPECIES_BY_ID[entry.speciesId].rarity, entry.rarity, `${entry.speciesId} in ${entry.area}`);
    }
  });

  it("excludes the guardian from every wild table — no Unique capture pressure", () => {
    assert.equal(SPECIES_BY_ID["meadow/cloudmane"].rarity, "guardian");
    assert.ok(MEADOW_HABITATS.every((e) => e.speciesId !== "meadow/cloudmane"));
    assert.ok(MEADOW_HABITATS.every((e) => SPECIES_BY_ID[e.speciesId].rarity !== "guardian"));
    // Starters don't spawn wild either.
    assert.ok(MEADOW_HABITATS.every((e) => SPECIES_BY_ID[e.speciesId].rarity !== "starter"));
  });

  it("keeps the live Woolly Meadows table's membership in the registry", () => {
    // The preview ships fluffball 65 / hare 27 / ram 8; the habitat registry
    // must cover exactly that membership and rarity split.
    const woolly = habitatFor("meadow/woolly");
    const bySpecies = new Map(woolly.map((e) => [e.speciesId, e.rarity]));
    assert.equal(bySpecies.get("woolly/fluffball"), "common");
    assert.equal(bySpecies.get("woolly/hare"), "uncommon");
    assert.equal(bySpecies.get("woolly/ram"), "rare");
  });

  it("covers every ordinary slate family in at least one habitat", () => {
    for (const species of MEADOW_SPECIES) {
      if (species.rarity === "guardian") continue;
      assert.ok(
        MEADOW_HABITATS.some((e) => e.speciesId === species.id),
        `${species.id} has no habitat`,
      );
    }
  });
});
