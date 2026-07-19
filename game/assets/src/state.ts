// Game state: what the player HAS. Built on save v2 (issue #3): player-owned
// progression plus a persistent collection.
//
// `ownedCreatures` is the authoritative collection record. `team` holds
// Creature battle views aligned by index with `teamIds`; their stats are
// merged back into the owned record on toSave(), while creatures in storage
// pass through untouched. Everything else (player seed, Field Guide, badges,
// profile, location) round-trips as-is.

import {
  Creature,
  captureCreature,
  mintCreatureId,
  type BagState,
  type CaptureOutcome,
  type CurriculumProfile,
  type FieldGuideEntryState,
  type LocationState,
  type OwnedCreatureState,
  type PlayerProgress,
  type SaveStateV2,
} from "../shared/index";

export class GameState {
  team: Creature[];
  activeIndex: number;
  money: number;
  bag: BagState;
  /** Last checkpointed region + tile; null until the world first syncs it. */
  location: LocationState | null;

  private teamIds: string[];
  private ownedCreatures: OwnedCreatureState[];
  private starterCreatureId: string;
  private player: PlayerProgress;
  private fieldGuide: FieldGuideEntryState[];
  private badges: readonly string[];
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
    this.profile = save.profile;
    this.location = save.location ? { ...save.location } : null;
    const active = this.teamIds.indexOf(save.activeTeamId);
    this.activeIndex = active >= 0 ? active : 0;
    this.money = save.money;
    this.bag = { ...save.bag };
  }

  get active(): Creature {
    return this.team[this.activeIndex];
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

  /**
   * A successful catch is always kept (meadow-isle.md collection contract,
   * issue #3): it joins the active team while there is room, otherwise it
   * goes to owned storage. Returns the outcome so the battle can say where
   * the new friend went. Storage becomes inspectable at the Harbor
   * Sanctuary (#5); the creature is safe in the save until then.
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
      fieldGuide: this.fieldGuide.map((e) => ({ ...e, variants: [...e.variants] })),
      badges: this.badges,
      profile: this.profile,
      savedAt: new Date().toISOString(),
    };
  }
}
