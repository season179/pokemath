// Creatures: species data and the Creature domain class.
// Pure domain — ported from the prototype's battle.js.

// Serializable shape of a creature — the save/load seam (see save-types.ts).
export interface CreatureState {
  name: string;
  color: string;
  maxHp: number;
  hp: number;
  attack: number;
  level: number;
  xp: number;
  boss: boolean;
  // Species identity, present on creatures created since starter selection.
  // Older saves lack it; renderers must fall back to the color blob.
  speciesId?: string;
}

// A replaceable reference to licensed sprite art: sheet path plus the
// creature's cell rect in top-left-origin pixels. This is NEVER identity —
// a missing, moved, or swapped sheet falls back to the placeholder blob
// while the species id, names, stats, and every save record stay untouched
// (issue #4 permanence rules). Paths starting with "art/" are absolute R2
// keys (original creatures use content-addressed art/creatures/<id>/<release>/
// keys — see docs/art-assets.md); anything else is relative to the Worker's
// pack route (art/v1/pocket-creature-tamer/).
export interface SpeciesArt {
  readonly sheet: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

// Species-level rarity. Encounter tables use the encounters.ts Rarity subset
// (common/uncommon/rare); "starter" and "guardian" never appear in a wild
// table — starters come from the first-start choice, and the guardian is a
// fixed authored battle, not a wild roll (issue #4: no Unique capture
// pressure by construction). The naming slate's "guardian (Unique)" means
// `guardian` is the one Unique pressure path; it is not a second saved rarity.
export type SpeciesRarity = "common" | "uncommon" | "rare" | "starter" | "guardian";

export interface Species {
  // Stable semantic identity for encounter rosters and the creature record.
  // Permanent once shipped in a save; independent of name/art, which can
  // both change. Opaque by convention — its spelling carries no meaning.
  readonly id: string;
  readonly name: string;
  // Chinese display name, resolved from this registry at render time — never
  // snapshotted into save records, so a rename touches this one row. Absent
  // for pre-registry legacy species; renderers fall back to `name`.
  readonly nameZh?: string;
  // Evolution stages in the family; wild encounters are stage-1 forms.
  readonly stages: number;
  readonly rarity: SpeciesRarity;
  readonly color: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly artRef?: SpeciesArt;
}

// The first-start choice: exactly one of these becomes the player's first
// pet (StarterScreen → POST /api/save/new). Peer stats — no trap picks for
// a seven-year-old: totals stay comparable, flavors differ. Trio locked
// 2026-07-18: two PokeMath originals (4-stage strips, published via
// tools/art-registry.mjs — the release hash pins immutable pixels) plus the
// pack's 3EVO/02 line. Art cells are stage-1 48×48 frames; see
// docs/art-assets.md.
export const STARTERS: readonly Species[] = [
  {
    id: "cloudhorn",
    name: "Cloudhorn",
    nameZh: "云角",
    stages: 4,
    rarity: "starter",
    color: "#aec6e8",
    maxHp: 22,
    attack: 4,
    artRef: {
      sheet: "art/creatures/cloudhorn/9d52f2fdd3d0b112247963565e5dbc6a823d2915e885f191f1e50c9c94be3bf2/asset.bin",
      x: 0,
      y: 0,
      w: 48,
      h: 48,
    },
  },
  {
    id: "lumentail",
    name: "Lumentail",
    nameZh: "灯尾",
    stages: 4,
    rarity: "starter",
    color: "#8a7fd0",
    maxHp: 17,
    attack: 5,
    artRef: {
      sheet: "art/creatures/lumentail/b59aaa9b65fd4ca5ec5e2d3f843dbeb6d4f5bd2d06ddc2cac2c2c88e1f56dee9/asset.bin",
      x: 0,
      y: 0,
      w: 48,
      h: 48,
    },
  },
  {
    // Pack family 3EVO/02: sprout kitten → leaf cat → orchard lynx.
    // Name ratified in the Meadow naming slate (docs/islands/meadow-naming-slate.md).
    id: "sproutkit",
    name: "Sproutkit",
    nameZh: "苗苗",
    stages: 3,
    rarity: "starter",
    color: "#81c784",
    maxHp: 20,
    attack: 4,
    artRef: { sheet: "creatures/3evo/02/02.png", x: 0, y: 0, w: 48, h: 48 },
  },
];

export function isStarterId(value: unknown): value is string {
  return typeof value === "string" && STARTERS.some((s) => s.id === value);
}

/**
 * The art cell for a 1-based evolution stage. Stage-1 art is the species'
 * registered `artRef` (which may already offset past an empty leading pack
 * cell); later stages step right by one cell width. Clamps to [1, stages].
 * Missing art stays undefined so portraits fall back to the blob.
 */
export function artRefForStage(species: Species, stage: number): SpeciesArt | undefined {
  const art = species.artRef;
  if (!art) return undefined;
  const clamped = Math.max(1, Math.min(Math.floor(stage) || 1, species.stages));
  if (clamped === 1) return art;
  return { ...art, x: art.x + (clamped - 1) * art.w };
}

// Legacy prototype species (pre-registry). Kept registered so old save
// records that reference them still resolve; they have no Chinese name and
// no habitat — the Meadow slate below is the roster that matters.
export const SPECIES: readonly Species[] = [
  { id: "countasaur", name: "Countasaur", stages: 1, rarity: "common", color: "#4db6ac", maxHp: 16, attack: 3 },
  { id: "digitell", name: "Digitell", stages: 1, rarity: "common", color: "#ffb74d", maxHp: 14, attack: 4 },
];

// Meadow Isle species registry (issue #4). Ids, names, stages, and rarity are
// ratified by the approved bilingual naming slate
// (docs/islands/meadow-naming-slate.md) — the slate is the naming authority,
// this module is the code authority. The three `woolly/*` ids are
// grandfathered: the preview already shipped them into real saves, so they
// stay exactly as-is (slate permanence rule 4); new families get `meadow/*`.
//
// The preview trio's stats are the shipped ones (kids' first team can win and
// catch). The remaining families carry PRE-BALANCE PLACEHOLDER stats tiered
// by rarity (matching the preview trio's template) — inert until a live
// encounter table references the id; the area's encounter slice owns the real
// numbers. artRef sheets were verified against the R2 pack routes
// (2026-07-19); a sheet that later goes missing falls back to the blob.
export const WOOLLY_FLUFFBALL: Species = {
  id: "woolly/fluffball",
  name: "Fluffball",
  nameZh: "毛球",
  stages: 3,
  rarity: "common",
  color: "#ede0c8",
  maxHp: 13,
  attack: 2,
  // Pack family 3EVO/06: fluffball → winged lambkin → meadow fae.
  artRef: { sheet: "creatures/3evo/06/06.png", x: 0, y: 0, w: 48, h: 48 },
};

export const WOOLLY_HARE: Species = {
  id: "woolly/hare",
  name: "Balltail Hare",
  nameZh: "球尾兔",
  stages: 3,
  rarity: "uncommon",
  color: "#c19a6b",
  maxHp: 15,
  attack: 3,
  // Pack family 3EVO/13: ball-tail hare (quadruped throughout).
  artRef: { sheet: "creatures/3evo/13/13.png", x: 0, y: 0, w: 48, h: 48 },
};

export const WOOLLY_RAM: Species = {
  id: "woolly/ram",
  name: "Woolly Ram",
  nameZh: "卷卷",
  stages: 2,
  rarity: "rare",
  color: "#7d8fa9",
  maxHp: 18,
  attack: 4,
  // Pack family 2EVO/03: woolly ram → bull. 2EVO strips are 144×48 with an
  // empty leading cell — the two stages sit in the trailing 48px cells, so
  // stage 1 is the middle cell, not x:0.
  artRef: { sheet: "creatures/2evo/03_2/03.png", x: 48, y: 0, w: 48, h: 48 },
};

export const MEADOW_SPECIES: readonly Species[] = [
  WOOLLY_FLUFFBALL,
  WOOLLY_HARE,
  WOOLLY_RAM,
  {
    // Pack family 3EVO/05: larva → cocoon → great moth.
    id: "meadow/mothling",
    name: "Mothling",
    nameZh: "毛毛虫",
    stages: 3,
    rarity: "common",
    color: "#cdb4db",
    maxHp: 13,
    attack: 2,
    artRef: { sheet: "creatures/3evo/05/05.png", x: 0, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 2EVO/10: pufftail mouse → roly-poly mouse (stage 1 is the
    // middle cell, like the ram's strip).
    id: "meadow/pufftail",
    name: "Pufftail",
    nameZh: "团子鼠",
    stages: 2,
    rarity: "common",
    color: "#a8a29e",
    maxHp: 13,
    attack: 2,
    artRef: { sheet: "creatures/2evo/10_2/10.png", x: 48, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 3EVO/21: chick → gamefowl → plumed strider.
    id: "meadow/plumelet",
    name: "Plumelet",
    nameZh: "小羽",
    stages: 3,
    rarity: "common",
    color: "#f28482",
    maxHp: 13,
    attack: 2,
    artRef: { sheet: "creatures/3evo/21/21.png", x: 0, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 3EVO/08: pink squirrel kit → squirrel-fox → blossom fox.
    id: "meadow/blossomfox",
    name: "Blossomfox",
    nameZh: "花狐",
    stages: 3,
    rarity: "uncommon",
    color: "#f8ad9d",
    maxHp: 15,
    attack: 3,
    artRef: { sheet: "creatures/3evo/08/08.png", x: 0, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 2EVO/04: round chick → owl (stage 1 middle cell).
    id: "meadow/owlet",
    name: "Owlet",
    nameZh: "咕咕",
    stages: 2,
    rarity: "uncommon",
    color: "#8ec07c",
    maxHp: 15,
    attack: 3,
    artRef: { sheet: "creatures/2evo/04_2/04.png", x: 48, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 2EVO/06: farm pup → hound (stage 1 middle cell).
    id: "meadow/barnpup",
    name: "Barnpup",
    nameZh: "汪汪",
    stages: 2,
    rarity: "uncommon",
    color: "#c68b59",
    maxHp: 15,
    attack: 3,
    artRef: { sheet: "creatures/2evo/06_2/06.png", x: 48, y: 0, w: 48, h: 48 },
  },
  {
    // Pack family 3EVO/01: petal sprite → blossom fae.
    id: "meadow/petalfae",
    name: "Petalfae",
    nameZh: "朵朵",
    stages: 3,
    rarity: "rare",
    color: "#ff8fab",
    maxHp: 18,
    attack: 4,
    artRef: { sheet: "creatures/3evo/01/01.png", x: 0, y: 0, w: 48, h: 48 },
  },
  {
    // The Cloud-Maned Horse, Hundred Stones guardian. Guardian rarity means
    // it appears in NO wild table — it is a fixed authored battle (slate
    // habitat check). Stats are a placeholder until that battle is authored.
    id: "meadow/cloudmane",
    name: "Cloudmane",
    nameZh: "天马",
    stages: 1,
    rarity: "guardian",
    color: "#caf0f8",
    maxHp: 30,
    attack: 6,
    artRef: { sheet: "creatures/uniques/03/03.png", x: 0, y: 0, w: 48, h: 48 },
  },
];

// Every species by semantic id — the registry lookup. The encounter engine
// resolves wild picks through this rather than threading Species objects
// through region data.
export const SPECIES_BY_ID: Readonly<Record<string, Species>> = Object.fromEntries(
  [...STARTERS, ...SPECIES, ...MEADOW_SPECIES].map((s) => [s.id, s]),
);

// Every XP_PER_LEVEL points is a level: stat growth plus a full heal.
export const XP_PER_LEVEL = 20;
export const LEVEL_UP_GROWTH = { maxHp: 3, attack: 1 } as const;

// Bosses are rare, strong variants: double HP, +1 attack, level 3, and they
// ask multi-step problems (the battle layer handles that part).
export const BOSS_RULES = { hpMultiplier: 2, attackBonus: 1, level: 3 } as const;

export class Creature {
  name: string;
  color: string;
  maxHp: number;
  hp: number;
  attack: number;
  level: number;
  xp: number;
  boss: boolean;
  speciesId: string | null;

  constructor(init: CreatureState) {
    this.name = init.name;
    this.color = init.color;
    this.maxHp = init.maxHp;
    this.hp = init.hp;
    this.attack = init.attack;
    this.level = init.level;
    this.xp = init.xp;
    this.boss = init.boss;
    this.speciesId = init.speciesId ?? null;
  }

  // A wild level-1 creature of the given species.
  static fromSpecies(s: Species): Creature {
    return new Creature({
      name: s.name,
      color: s.color,
      maxHp: s.maxHp,
      hp: s.maxHp,
      attack: s.attack,
      level: 1,
      xp: 0,
      boss: false,
      speciesId: s.id,
    });
  }

  static boss(s: Species): Creature {
    return new Creature({
      name: `Boss ${s.name}`,
      color: s.color,
      maxHp: s.maxHp * BOSS_RULES.hpMultiplier,
      hp: s.maxHp * BOSS_RULES.hpMultiplier,
      attack: s.attack + BOSS_RULES.attackBonus,
      level: BOSS_RULES.level,
      xp: 0,
      boss: true,
      speciesId: s.id,
    });
  }

  get fainted(): boolean {
    return this.hp === 0;
  }

  // The weaker the wild creature, the easier the catch:
  // 30% at full HP, approaching 90% near zero.
  get catchChance(): number {
    return 0.3 + 0.6 * (1 - this.hp / this.maxHp);
  }

  // Returns the damage actually dealt (clamped at remaining HP).
  takeDamage(n: number): number {
    const dealt = Math.min(this.hp, n);
    this.hp -= dealt;
    return dealt;
  }

  // Returns the HP actually restored (clamped at maxHp).
  heal(n: number): number {
    const restored = Math.min(this.maxHp - this.hp, n);
    this.hp += restored;
    return restored;
  }

  healFull(): void {
    this.hp = this.maxHp;
  }

  // A caught creature joins the team fully rested, its XP reset. (It keeps
  // everything else — including, yes, a boss crown if you caught a boss.)
  capture(): void {
    this.healFull();
    this.xp = 0;
  }

  // Legacy CREATURE XP: live battles stopped awarding it in M2A (the player
  // owns XP now — battle-rules.ts playerXpForTurn + awardPlayerXp). Kept for
  // the migration and its v1 fixtures (save-migrate).
  // Adds XP and applies any level-ups earned. Returns how many levels were
  // gained so the scene can celebrate them.
  awardXp(gain: number): { levelsGained: number; level: number } {
    this.xp += gain;
    let levelsGained = 0;
    while (this.xp >= XP_PER_LEVEL) {
      this.xp -= XP_PER_LEVEL;
      this.level++;
      levelsGained++;
      this.maxHp += LEVEL_UP_GROWTH.maxHp;
      this.attack += LEVEL_UP_GROWTH.attack;
      this.hp = this.maxHp;
    }
    return { levelsGained, level: this.level };
  }

  toState(): CreatureState {
    return {
      name: this.name,
      color: this.color,
      maxHp: this.maxHp,
      hp: this.hp,
      attack: this.attack,
      level: this.level,
      xp: this.xp,
      boss: this.boss,
      // Kept absent (not null) for pre-speciesId creatures so their saved
      // JSON round-trips byte-identical.
      ...(this.speciesId !== null ? { speciesId: this.speciesId } : {}),
    };
  }

  static fromState(state: CreatureState): Creature {
    return new Creature(state);
  }
}
