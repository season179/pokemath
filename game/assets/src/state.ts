// Game state: what the player HAS. Built from the shared domain's save
// types so Phase 2's save/load drops straight in.

import { Creature, createNewGame, type BagState, type SaveState } from "../shared/index";

export class GameState {
  team: Creature[];
  activeIndex: number;
  money: number;
  bag: BagState;

  constructor(save: SaveState) {
    this.team = save.team.creatures.map((c) => Creature.fromState(c));
    if (this.team.length === 0) throw new Error("GameState requires at least one creature");
    this.activeIndex = Math.min(Math.max(0, save.team.activeIndex), this.team.length - 1);
    this.money = save.money;
    this.bag = { ...save.bag };
  }

  static newGame(): GameState {
    return new GameState(createNewGame());
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

  toSave(): SaveState {
    return {
      version: 1,
      team: {
        creatures: this.team.map((c) => c.toState()),
        activeIndex: this.activeIndex,
      },
      money: this.money,
      bag: { ...this.bag },
      savedAt: new Date().toISOString(),
    };
  }
}
