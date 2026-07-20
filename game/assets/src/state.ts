// Game state: what the player HAS. Built on save v2 (issue #3): player-owned
// progression plus a persistent collection.
//
// `ownedCreatures` is the authoritative collection record. `team` holds
// Creature battle views aligned by index with `teamIds`; their stats are
// merged back into the owned record on toSave(), while creatures in storage
// pass through untouched. The Field Guide advances via markSeenEntry (wild
// battles) and capture; everything else (player seed, badges, profile,
// location) round-trips as-is.

import {
  Creature,
  awardMeadowFinale,
  awardPlayerXp,
  captureCreature,
  levelForTotalXp,
  markSeen,
  mintCreatureId,
  setTeam as setSaveTeam,
  type BagState,
  type CaptureOutcome,
  type CurriculumProfile,
  type FieldGuideEntryState,
  type LocationState,
  type OwnedCreatureState,
  type PlayerLevelInfo,
  type PlayerProgress,
  type PlayerXpAward,
  type SaveStateV2,
} from "../shared/index";

export class GameState {
  team: Creature[];
  activeIndex: number;
  money: number;
  bag: BagState;
  /** Last checkpointed region + tile; null until the world first syncs it. */
  location: LocationState | null;
  /** Authored grid revision that wrote the local location coordinates. */
  worldLayoutRevision: number;

  private teamIds: string[];
  private ownedCreatures: OwnedCreatureState[];
  private starterCreatureId: string;
  private player: PlayerProgress;
  private fieldGuide: FieldGuideEntryState[];
  private badges: readonly string[];
  private flags: Record<string, number>;
  private profile: CurriculumProfile;

  constructor(save: SaveStateV2) {
    const ownedById = new Map(save.ownedCreatures.map((c) => [c.creatureId, c]));
    this.team = save.teamIds.map((id) => {
      const owned = ownedById.get(id);
      if (!owned) throw new Error(`team references unknown creature ${id}`);
      return Creature.fromState(owned);
    });
    if (this.team.length === 0) throw new Error("GameState requires at least one creature");
    this.teamIds = [...save.teamIds];
    this.ownedCreatures = save.ownedCreatures.map((c) => ({ ...c }));
    this.starterCreatureId = save.starterCreatureId;
    this.player = { ...save.player };
    this.fieldGuide = save.fieldGuide.map((e) => ({ ...e, variants: [...e.variants] }));
    this.badges = save.badges;
    this.flags = { ...save.flags };
    this.profile = save.profile;
    this.location = save.location ? { ...save.location } : null;
    this.worldLayoutRevision = save.worldLayoutRevision;
    const active = this.teamIds.indexOf(save.activeTeamId);
    this.activeIndex = active >= 0 ? active : 0;
    this.money = save.money;
    this.bag = { ...save.bag };
  }

  get active(): Creature {
    return this.team[this.activeIndex];
  }

  /** The player's level on the approved curve (derived from totalXp). */
  get playerLevel(): number {
    return this.player.level;
  }

  /** Level + progress into the next level — the HUD/result XP bar truth. */
  get playerInfo(): PlayerLevelInfo {
    return levelForTotalXp(this.player.totalXp);
  }

  /**
   * Award battle XP to the PLAYER (M2A, issue #7). The battle tallies
   * per-question XP as turns are answered, then applies the tally once here
   * on victory/capture — the number shown in the result panel IS the number
   * written to the save. A level-up fully heals the active creature. Returns
   * the award (before/after level info + levelsGained) for the result panel.
   */
  awardPlayerXp(gain: number): PlayerXpAward {
    const award = awardPlayerXp(this.player, gain);
    this.player = { level: award.level, totalXp: award.totalXp };
    if (award.levelsGained > 0) this.active.healFull();
    return award;
  }

  benchedFighters(): Creature[] {
    return this.team.filter((c) => c !== this.active && !c.fainted);
  }

  switchTo(index: number): void {
    const creature = this.team[index];
    if (!creature || creature.fainted) throw new Error(`Cannot switch to team index ${index}`);
    this.activeIndex = index;
  }

  healTeam(): void {
    this.team.forEach((c) => c.healFull());
  }

  // --- Field Guide + Sanctuary views (issue #5) ---

  /** Field Guide entries as of now (defensive copies — mutate via the methods). */
  get fieldGuideEntries(): FieldGuideEntryState[] {
    return this.fieldGuide.map((e) => ({ ...e, variants: [...e.variants] }));
  }

  /** The child's curriculum profile (save v2); gates which questions serve. */
  get curriculumProfile(): CurriculumProfile {
    return this.profile;
  }

  // --- Arc badges (M5 region arcs; save v2 `badges`) ---

  hasBadge(id: string): boolean {
    return this.badges.includes(id);
  }

  /** Award an arc badge; returns true only when it is newly earned. */
  awardBadge(id: string): boolean {
    if (this.badges.includes(id)) return false;
    this.badges = [...this.badges, id];
    return true;
  }

  /**
   * Meadow guardian victory (#23): award the Meadow Badge once and evolve the
   * starter located by `starterCreatureId` whether active or in storage.
   * Idempotent — a second victory is a pure no-op.
   */
  awardMeadowFinale(): { badgeAwarded: boolean; evolvedName: string | null } {
    const result = awardMeadowFinale(this.toSave());
    if (!result.badgeAwarded && result.evolvedName === null) {
      return { badgeAwarded: false, evolvedName: null };
    }
    this.badges = result.save.badges;
    this.ownedCreatures = result.save.ownedCreatures.map((c) => ({ ...c }));
    return { badgeAwarded: result.badgeAwarded, evolvedName: result.evolvedName };
  }

  /** 1-based evolution stage for a team slot (defaults to 1). */
  teamStage(index: number): number {
    const id = this.teamIds[index];
    return this.ownedCreatures.find((c) => c.creatureId === id)?.stage ?? 1;
  }

  /** Evolution stage of the creature currently leading the party. */
  get activeStage(): number {
    return this.teamStage(this.activeIndex);
  }

  /**
   * World/arc flags (save v2, #17): persistent one-time intention state.
   * A copy, so arc logic reads plain data; mutate via setFlag + checkpoint.
   */
  arcFlags(): Record<string, number> {
    return { ...this.flags };
  }

  /** Set one world/arc flag; the caller checkpoints to persist it. */
  setFlag(key: string, value: number): void {
    this.flags[key] = value;
  }

  /** Team roster as creatureIds (aligned with `team`). */
  get teamIdList(): string[] {
    return [...this.teamIds];
  }

  /** The leading creature's id (always a member of the team). */
  get activeTeamId(): string {
    return this.teamIds[this.activeIndex];
  }

  isOnTeam(creatureId: string): boolean {
    return this.teamIds.includes(creatureId);
  }

  /**
   * The whole collection with live stats: team members' battle-view numbers
   * are merged into their owned records, storage passes through. This is the
   * same merge toSave() persists, so what the Sanctuary shows is exactly what
   * the next checkpoint writes.
   */
  ownedView(): OwnedCreatureState[] {
    return this.toSave().ownedCreatures;
  }

  /**
   * A wild battle begins: record the species (and palette) as seen. Running
   * away still counts — you saw it. Returns true when the guide changed, so
   * the caller can skip a checkpoint for an already-recorded sighting.
   */
  markSeenEntry(speciesId: string, variant = "normal"): boolean {
    const next = markSeen(this.fieldGuide, speciesId, variant);
    if (next === this.fieldGuide) return false;
    this.fieldGuide = next;
    return true;
  }

  /**
   * Replace the active team (Harbor Sanctuary). Guards live in the UI and the
   * shared mechanic throws on anything invalid (empty, >6, duplicates, ids
   * not owned) — a throw here means a caller bug. Rebuilds the team's battle
   * views from the merged owned records so live stats survive the swap, and
   * keeps the lead on the same creature while it stays on the team.
   */
  setTeam(teamIds: string[]): void {
    const result = setSaveTeam(this.toSave(), teamIds);
    // Identity (creatureId/speciesId/stage/variant) comes from the owned
    // record; only battle stats come from the Creature view — nothing is
    // lost by round-tripping through toSave() here.
    const ownedById = new Map(result.ownedCreatures.map((c) => [c.creatureId, c]));
    this.teamIds = [...result.teamIds];
    this.team = this.teamIds.map((id) => Creature.fromState(ownedById.get(id)!));
    this.activeIndex = this.teamIds.indexOf(result.activeTeamId);
  }

  /**
   * A successful catch is always kept (meadow-isle.md collection contract,
   * issue #3): it joins the active team while there is room, otherwise it
   * goes to owned storage. Returns the outcome so the battle can say where
   * the new friend went. Storage is inspectable at the Harbor Sanctuary (#5).
   */
  capture(wild: Creature): CaptureOutcome {
    if (wild.speciesId === null) throw new Error("cannot capture a creature without a speciesId");
    wild.capture(); // a caught friend arrives rested, its XP reset
    const owned: OwnedCreatureState = {
      ...wild.toState(),
      creatureId: mintCreatureId(),
      speciesId: wild.speciesId,
      stage: 1,
      variant: "normal",
    };
    // The shared mechanic owns team-vs-storage placement and Field Guide
    // marking (tested in save-v2.test.ts).
    const result = captureCreature(this.toSave(), owned);
    this.ownedCreatures = result.save.ownedCreatures.map((c) => ({ ...c }));
    this.fieldGuide = result.save.fieldGuide.map((e) => ({ ...e, variants: [...e.variants] }));
    if (result.outcome === "joined-team") {
      this.teamIds = [...result.save.teamIds];
      this.team.push(Creature.fromState(owned));
    }
    return result.outcome;
  }

  toSave(): SaveStateV2 {
    // Merge the team's battle-view stats back into the owned record by
    // creatureId; identity fields (stage, variant) stay with the record.
    const ownedCreatures: OwnedCreatureState[] = this.ownedCreatures.map((owned) => {
      const idx = this.teamIds.indexOf(owned.creatureId);
      if (idx === -1) return { ...owned };
      return {
        ...this.team[idx].toState(),
        creatureId: owned.creatureId,
        speciesId: owned.speciesId,
        stage: owned.stage,
        variant: owned.variant,
      };
    });
    return {
      version: 2,
      starterCreatureId: this.starterCreatureId,
      player: { ...this.player },
      ownedCreatures,
      teamIds: [...this.teamIds],
      activeTeamId: this.teamIds[this.activeIndex],
      money: this.money,
      bag: { ...this.bag },
      location: this.location ? { ...this.location } : null,
      worldLayoutRevision: this.worldLayoutRevision,
      fieldGuide: this.fieldGuide.map((e) => ({ ...e, variants: [...e.variants] })),
      badges: this.badges,
      flags: { ...this.flags },
      profile: this.profile,
      savedAt: new Date().toISOString(),
    };
  }
}
