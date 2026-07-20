import { test } from "node:test";
import assert from "node:assert/strict";

import { STARTERS, WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM, Creature } from "../creature.ts";
import {
  MAX_SAVE_JSON_BYTES_V2,
  MAX_TEAM_SIZE,
  STARTING_BAG,
  STARTING_MONEY,
  SAVE_VERSION,
  WORLD_LAYOUT_REVISION,
  captureCreature,
  createNewGameV2,
  markCaught,
  markSeen,
  setTeam,
  type OwnedCreatureState,
  type SaveStateV2,
} from "../save-v2.ts";
import { mintCreatureId } from "../player-progression.ts";
import { validateSaveV2 } from "../save-v2-validate.ts";

function caughtCreature(speciesId: string, creatureId = mintCreatureId()): OwnedCreatureState {
  return {
    creatureId,
    speciesId,
    stage: 1,
    variant: "normal",
    name: speciesId,
    color: "#aaaaaa",
    maxHp: 10,
    hp: 10,
    attack: 2,
    level: 1,
    xp: 0,
    boss: false,
  };
}

test("createNewGameV2: starter is the only owned creature, party of one, validated", () => {
  const save = createNewGameV2(STARTERS[0], new Date("2026-01-01T00:00:00Z"));
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.money, STARTING_MONEY);
  assert.deepEqual(save.bag, STARTING_BAG);
  assert.equal(save.ownedCreatures.length, 1);
  assert.equal(save.teamIds.length, 1);
  assert.equal(save.activeTeamId, save.ownedCreatures[0].creatureId);
  assert.equal(save.starterCreatureId, save.ownedCreatures[0].creatureId);

  const starter = save.ownedCreatures[0];
  assert.equal(starter.speciesId, STARTERS[0].id);
  assert.equal(starter.stage, 1);
  assert.equal(starter.variant, "normal");
  assert.equal(starter.boss, false);
  assert.equal(save.location, null);
  assert.equal(save.worldLayoutRevision, WORLD_LAYOUT_REVISION);
  assert.equal(save.savedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(save.profile, "dpk3_2026_core");
  assert.deepEqual(save.badges, []);
  assert.deepEqual(save.fieldGuide, [{ speciesId: STARTERS[0].id, status: "caught", variants: ["normal"] }]);
  assert.ok(validateSaveV2(save));
});

test("createNewGameV2: mutating the fresh bag doesn't touch the constant", () => {
  const save = createNewGameV2(STARTERS[1]);
  save.bag.ball = 99;
  assert.equal(STARTING_BAG.ball, 3);
});

test("createNewGameV2: every starter mints a valid v2 save", () => {
  for (const species of STARTERS) {
    const save = createNewGameV2(species);
    assert.equal(save.ownedCreatures[0].speciesId, species.id);
    assert.ok(validateSaveV2(save));
  }
});

test("captureCreature: a seventh catch goes to storage, not rejected", () => {
  let save = createNewGameV2(STARTERS[0]);
  // Fill the party to the six-member cap.
  for (const species of [WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM, WOOLLY_FLUFFBALL, WOOLLY_HARE]) {
    const res = captureCreature(save, caughtCreature(species.id));
    assert.equal(res.outcome, "joined-team");
    save = res.save;
  }
  assert.equal(save.teamIds.length, MAX_TEAM_SIZE);
  assert.equal(save.ownedCreatures.length, MAX_TEAM_SIZE);

  // The seventh catch is KEPT — it enters owned storage, party stays at six.
  const seventh = caughtCreature(WOOLLY_RAM.id, "ram-7");
  const res = captureCreature(save, seventh);
  assert.equal(res.outcome, "sent-to-storage");
  save = res.save;
  assert.equal(save.teamIds.length, MAX_TEAM_SIZE, "party must not exceed six");
  assert.equal(save.ownedCreatures.length, MAX_TEAM_SIZE + 1, "storage grew");
  assert.ok(save.ownedCreatures.some((c) => c.creatureId === "ram-7"));
  assert.ok(!save.teamIds.includes("ram-7"));
  assert.ok(validateSaveV2(save));
});

test("captureCreature: a normal catch joins the party and the Field Guide", () => {
  const base = createNewGameV2(STARTERS[0]);
  const res = captureCreature(base, caughtCreature(WOOLLY_FLUFFBALL.id, "fb-1"));
  assert.equal(res.outcome, "joined-team");
  assert.equal(res.save.teamIds.length, 2);
  assert.equal(res.save.teamIds[1], "fb-1");
  assert.ok(res.save.fieldGuide.some((e) => e.speciesId === WOOLLY_FLUFFBALL.id && e.status === "caught"));
});

test("captureCreature rejects a duplicate creatureId", () => {
  const save = createNewGameV2(STARTERS[0]);
  const dup = caughtCreature(WOOLLY_FLUFFBALL.id, "dup");
  assert.throws(() => captureCreature(captureCreature(save, dup).save, dup));
});

test("a client-style capture produces a save the server validator accepts", () => {
  // The exact path GameState.capture() takes (M2A e2e, issue #7): a wild
  // Creature is captured, spread into an owned record, and run through
  // captureCreature — the result must validate AND survive the JSON wire
  // round-trip. (The Cocos bundler once miscompiled dedupeVariants'
  // [...new Set] into [].concat(set), yielding variants:[{}] on the wire —
  // every client capture 400'd. This pins the domain contract it broke.)
  const wild = Creature.fromSpecies(WOOLLY_FLUFFBALL);
  wild.takeDamage(4);
  wild.capture();
  const owned: OwnedCreatureState = {
    ...wild.toState(),
    creatureId: "fb-client-1",
    speciesId: wild.speciesId!,
    stage: 1,
    variant: "normal",
  };
  const res = captureCreature(createNewGameV2(STARTERS[0]), owned);
  assert.ok(validateSaveV2(res.save), "capture result must validate");
  const wire = JSON.parse(JSON.stringify(res.save)) as unknown;
  assert.ok(validateSaveV2(wire), "capture result must validate after the JSON round-trip");
  const entry = res.save.fieldGuide.find((e) => e.speciesId === WOOLLY_FLUFFBALL.id);
  assert.deepEqual(entry?.variants, ["normal"]);
});

test("markCaught is idempotent and dedups variants", () => {
  const a = markCaught([], "woolly/fluffball", "normal");
  const b = markCaught(a, "woolly/fluffball", "normal");
  assert.equal(b, a, "re-marking the same variant returns the same array");
  const c = markCaught(b, "woolly/fluffball", "alt");
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].variants, ["normal", "alt"]);
  const d = markCaught(c, "woolly/fluffball", "alt");
  assert.equal(d, c, "re-marking alt is a no-op");
});

test("a v2 save round-trips through JSON without losing integrity", () => {
  const save = createNewGameV2(STARTERS[0]);
  const roundTripped = JSON.parse(JSON.stringify(save)) as unknown;
  assert.ok(validateSaveV2(roundTripped));
  assert.deepEqual(roundTripped, save);
});

test("validateSaveV2: a typical save stays well under the byte cap", () => {
  let save = createNewGameV2(STARTERS[0]);
  for (let i = 0; i < 8; i++) {
    save = captureCreature(save, caughtCreature(WOOLLY_FLUFFBALL.id)).save;
  }
  assert.ok(JSON.stringify(save).length < MAX_SAVE_JSON_BYTES_V2);
});

// --- validateSaveV2: rejection coverage (trust-boundary guard) ---
//
// validateSaveV2 is the only thing standing between untrusted client JSON and
// the D1 row, so every invariant it enforces needs a pinning negative test.
// Each case starts from a known-valid save and mutates exactly one thing.

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Apply `mutate` to a fresh valid save and assert it no longer validates. */
function rejects(name: string, mutate: (save: SaveStateV2 & Record<string, unknown>) => void): void {
  test(`validateSaveV2 rejects: ${name}`, () => {
    const save = clone(createNewGameV2(STARTERS[0])) as SaveStateV2 & Record<string, unknown>;
    mutate(save);
    assert.equal(validateSaveV2(save), false, name);
  });
}

rejects("version !== 2", (s) => {
  s.version = 1;
});
rejects("version missing", (s) => {
  delete s.version;
});
rejects("starterCreatureId not in owned", (s) => {
  s.starterCreatureId = "does-not-exist";
});
rejects("starterCreatureId empty", (s) => {
  s.starterCreatureId = "";
});
rejects("player.level missing", (s) => {
  delete (s.player as Record<string, unknown>).level;
});
rejects("player.level non-integer", (s) => {
  s.player.level = 1.5;
});
rejects("player.level vs totalXp disagree", (s) => {
  // totalXp 50 reaches level 3, but level claims 1.
  s.player = { level: 1, totalXp: 50 };
});
rejects("player.totalXp beyond level", (s) => {
  // level 1 but totalXp past the L1→L2 boundary (20).
  s.player = { level: 1, totalXp: 99 };
});
rejects("ownedCreatures empty", (s) => {
  s.ownedCreatures = [];
  s.teamIds = [];
});
rejects("owned creature hp > maxHp", (s) => {
  s.ownedCreatures[0].hp = s.ownedCreatures[0].maxHp + 1;
});
rejects("owned creature missing creatureId", (s) => {
  delete (s.ownedCreatures[0] as Record<string, unknown>).creatureId;
});
rejects("duplicate creatureId in owned", (s) => {
  s.ownedCreatures.push(clone(s.ownedCreatures[0]));
  s.teamIds = [s.ownedCreatures[0].creatureId];
});
rejects("teamIds empty", (s) => {
  s.teamIds = [];
});
rejects("teamIds longer than six", (s) => {
  // Stuff six extra DISTINCT owned creatures so the only failure is length.
  for (let i = 0; i < 6; i++) {
    const c = clone(s.ownedCreatures[0]);
    c.creatureId = `dup-${i}`;
    s.ownedCreatures.push(c);
    s.teamIds.push(c.creatureId);
  }
});
rejects("duplicate teamIds", (s) => {
  s.teamIds.push(s.teamIds[0]);
});
rejects("teamIds referencing non-owned id", (s) => {
  s.teamIds = ["ghost"];
  s.activeTeamId = "ghost";
});
rejects("activeTeamId not in teamIds", (s) => {
  // Add a second owned creature so "not in teamIds" is meaningful.
  const c = clone(s.ownedCreatures[0]);
  c.creatureId = "bench-1";
  s.ownedCreatures.push(c);
  s.activeTeamId = "bench-1"; // owned, but not on the team
});
rejects("activeTeamId empty", (s) => {
  s.activeTeamId = "";
});
rejects("money negative", (s) => {
  s.money = -1;
});
rejects("money non-integer", (s) => {
  s.money = 1.5;
});
rejects("bag with negative potion", (s) => {
  s.bag = { potion: -1, ball: 0 };
});
rejects("bag missing ball", (s) => {
  s.bag = { potion: 0 } as unknown as SaveStateV2["bag"];
});
rejects("location with negative coord", (s) => {
  s.location = { regionId: "harbor", x: -1, y: 0 };
});
rejects("location with empty regionId", (s) => {
  s.location = { regionId: "", x: 0, y: 0 };
});
rejects("world layout revision missing", (s) => {
  delete s.worldLayoutRevision;
});
rejects("world layout revision beyond the client", (s) => {
  s.worldLayoutRevision = WORLD_LAYOUT_REVISION + 1;
});
rejects("fieldGuide with duplicate species", (s) => {
  s.fieldGuide = [
    { speciesId: "dup", status: "caught", variants: ["normal"] },
    { speciesId: "dup", status: "seen", variants: ["normal"] },
  ];
});
rejects("fieldGuide with bad status", (s) => {
  s.fieldGuide = [{ speciesId: "x", status: "unknown", variants: ["normal"] }];
});
rejects("fieldGuide with duplicate variant", (s) => {
  s.fieldGuide = [{ speciesId: "x", status: "caught", variants: ["normal", "normal"] }];
});
rejects("badges with a duplicate", (s) => {
  s.badges = ["meadow", "meadow"];
});
rejects("badges with an empty string", (s) => {
  s.badges = [""];
});
rejects("profile with an unknown value", (s) => {
  s.profile = "secret";
});
rejects("savedAt not a date", (s) => {
  s.savedAt = "not-a-date";
});

test("validateSaveV2 rejects null and non-object top-level", () => {
  assert.equal(validateSaveV2(null), false);
  assert.equal(validateSaveV2(undefined), false);
  assert.equal(validateSaveV2("not a save"), false);
  assert.equal(validateSaveV2(42), false);
});

test("validateSaveV2 accepts a save after a realistic capture-and-storage sequence", () => {
  let save = createNewGameV2(STARTERS[0]);
  for (const species of [WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM, WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM]) {
    save = captureCreature(save, caughtCreature(species.id)).save;
  }
  assert.equal(save.teamIds.length, MAX_TEAM_SIZE);
  assert.ok(validateSaveV2(save));
});

// --- Field Guide seen state + team edits (issue #5) ---

test("markSeen: unknown → seen, and the save still validates", () => {
  const guide = markSeen([], WOOLLY_FLUFFBALL.id, "normal");
  assert.deepEqual(guide, [{ speciesId: WOOLLY_FLUFFBALL.id, status: "seen", variants: ["normal"] }]);
  const save = createNewGameV2(STARTERS[0]);
  save.fieldGuide = markSeen(save.fieldGuide, WOOLLY_RAM.id, "normal");
  assert.ok(validateSaveV2(save));
});

test("markSeen never downgrades caught, and never upgrades seen to caught", () => {
  const caught = markCaught([], WOOLLY_HARE.id, "normal");
  assert.equal(markSeen(caught, WOOLLY_HARE.id, "normal"), caught, "same state → same reference");
  const caughtAlt = markSeen(caught, WOOLLY_HARE.id, "alt");
  assert.equal(caughtAlt[0].status, "caught", "a wild sighting can't un-catch");
  assert.deepEqual(caughtAlt[0].variants, ["normal", "alt"], "the sighted variant is still discovered");

  const seen = markSeen([], WOOLLY_RAM.id, "normal");
  assert.equal(markSeen(seen, WOOLLY_RAM.id, "normal"), seen, "idempotent — same reference");
  assert.equal(markSeen(seen, WOOLLY_RAM.id, "alt")[0].status, "seen", "alt sighting stays seen");
});

test("markSeen → markCaught upgrades seen to caught, keeping variants", () => {
  const seen = markSeen([], WOOLLY_FLUFFBALL.id, "alt");
  const caught = markCaught(seen, WOOLLY_FLUFFBALL.id, "normal");
  assert.deepEqual(caught, [
    { speciesId: WOOLLY_FLUFFBALL.id, status: "caught", variants: ["alt", "normal"] },
  ]);
});

test("setTeam: swaps and reorders members, keeps the lead when possible", () => {
  let save = createNewGameV2(STARTERS[0]);
  for (const id of ["a", "b", "c", "d", "e", "f", "g"]) {
    save = captureCreature(save, caughtCreature(WOOLLY_FLUFFBALL.id, id)).save;
  }
  // Full team [starter,a,b,c,d,e] with f,g in storage; starter leads.
  assert.equal(save.ownedCreatures.length, 8);
  assert.equal(save.teamIds.length, MAX_TEAM_SIZE);

  // Swap e→g and reorder; the starter still leads.
  const swapped = setTeam(save, ["g", save.starterCreatureId, "a", "f"]);
  assert.deepEqual(swapped.teamIds, ["g", save.starterCreatureId, "a", "f"]);
  assert.equal(swapped.activeTeamId, save.starterCreatureId);
  assert.equal(swapped.starterCreatureId, save.starterCreatureId, "starter identity never moves");
  assert.equal(save.teamIds.length, MAX_TEAM_SIZE, "input save untouched");
  assert.ok(validateSaveV2(swapped));
});

test("setTeam: removing the leader moves the lead to the first member", () => {
  let save = createNewGameV2(STARTERS[0]);
  save = captureCreature(save, caughtCreature(WOOLLY_HARE.id, "hare-1")).save;
  assert.equal(save.activeTeamId, save.starterCreatureId);
  const edited = setTeam(save, ["hare-1"]);
  assert.equal(edited.activeTeamId, "hare-1");
  assert.ok(validateSaveV2(edited));
});

test("setTeam rejects invalid rosters (callers guard before calling)", () => {
  let save = createNewGameV2(STARTERS[0]);
  save = captureCreature(save, caughtCreature(WOOLLY_HARE.id, "hare-1")).save;
  const starter = save.starterCreatureId;
  assert.throws(() => setTeam(save, []), /at least one/);
  assert.throws(
    () => setTeam(save, [starter, "hare-1", "a", "b", "c", "d", "e"]),
    /at most/,
    "seven ids exceed the cap — the UI offers storage instead",
  );
  assert.throws(() => setTeam(save, [starter, starter]), /duplicate/);
  assert.throws(() => setTeam(save, [starter, "ghost"]), /not owned/);
});
