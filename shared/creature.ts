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
}

export interface Species {
  // Stable semantic identity for encounter rosters and (in save v2) the
  // creature record. Independent of name/art, which can both change.
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly maxHp: number;
  readonly attack: number;
}

export const SPECIES: readonly Species[] = [
  { id: "addlepuff", name: "Addlepuff", color: "#f48fb1", maxHp: 15, attack: 3 },
  { id: "subtractopus", name: "Subtractopus", color: "#9575cd", maxHp: 17, attack: 4 },
  { id: "countasaur", name: "Countasaur", color: "#4db6ac", maxHp: 16, attack: 3 },
  { id: "digitell", name: "Digitell", color: "#ffb74d", maxHp: 14, attack: 4 },
];

export const STARTER: Species = {
  id: "multiplybara",
  name: "Multiplybara",
  color: "#81c784",
  maxHp: 22,
  attack: 5,
};

// Woolly Meadows preview roster (M2A / #8). Ordinary, catchable, stage-1 forms —
// no boss, no Unique. Names are PROVISIONAL bilingual placeholders pending the
// dedicated naming pass (see docs/islands/meadow-isle.md open question). Stats
// sit below the starter so a child's first team can win and catch.
//   common    → Fluffball:    the signature woolly grazer, appears most.
//   uncommon  → Balltail Hare: a sturdier meadow hare.
//   rare      → Woolly Ram:    the strongest of the three, appears least.
export const WOOLLY_FLUFFBALL: Species = {
  id: "woolly/fluffball",
  name: "Fluffball",
  color: "#ede0c8",
  maxHp: 13,
  attack: 2,
};

export const WOOLLY_HARE: Species = {
  id: "woolly/hare",
  name: "Balltail Hare",
  color: "#c19a6b",
  maxHp: 15,
  attack: 3,
};

export const WOOLLY_RAM: Species = {
  id: "woolly/ram",
  name: "Woolly Ram",
  color: "#7d8fa9",
  maxHp: 18,
  attack: 4,
};

// Every species by semantic id — the encounter engine resolves wild picks
// through this rather than threading Species objects through region data.
export const SPECIES_BY_ID: Readonly<Record<string, Species>> = Object.fromEntries(
  [STARTER, ...SPECIES, WOOLLY_FLUFFBALL, WOOLLY_HARE, WOOLLY_RAM].map((s) => [s.id, s]),
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

  constructor(init: CreatureState) {
    this.name = init.name;
    this.color = init.color;
    this.maxHp = init.maxHp;
    this.hp = init.hp;
    this.attack = init.attack;
    this.level = init.level;
    this.xp = init.xp;
    this.boss = init.boss;
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
    };
  }

  static fromState(state: CreatureState): Creature {
    return new Creature(state);
  }
}
