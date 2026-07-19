// Harbor Sanctuary (issue #5): the physical place to inspect the whole
// collection and change the active team. Every owned creature is a row —
// team members first (in team order, the leader starred), then storage.
// A row's action toggles membership: team → storage ("Rest"), storage →
// team ("Join"). Guards are kid-proof: the team never drops below one and
// never grows past six; tapping a guarded button explains why instead of
// failing silently. Every accepted edit flows through GameState.setTeam →
// shared setTeam (which throws on dangling/duplicate references) and is
// checkpointed by the caller via actions.onChanged.

import { Color, EventKeyboard, KeyCode, Label, Node, UITransform } from "cc";
import { MAX_TEAM_SIZE, SPECIES_BY_ID, type OwnedCreatureState } from "../../shared/index";
import { makeCreaturePortrait } from "../creature-portrait";
import { GameState } from "../state";
import { PALETTE, destroyChildren, makeButton, makeLabel, makePanel, makeRect } from "../ui";

const ROWS_PER_PAGE = 4;

export interface SanctuaryActions {
  onBack: () => void;
  /** An edit was accepted — the caller checkpoints and refreshes the HUD. */
  onChanged: () => void;
}

export class SanctuaryScreen {
  readonly root = new Node("sanctuary");
  private cursor = 0;
  private page = 0;
  private hint: string | null = null;

  constructor(private state: GameState, private actions: SanctuaryActions) {
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    const rows = this.orderedRows();
    if (e.keyCode === KeyCode.ESCAPE) {
      this.actions.onBack();
    } else if (e.keyCode === KeyCode.ARROW_UP || e.keyCode === KeyCode.KEY_W) {
      this.moveCursor(Math.max(0, this.cursor - 1));
    } else if (e.keyCode === KeyCode.ARROW_DOWN || e.keyCode === KeyCode.KEY_S) {
      this.moveCursor(Math.min(rows.length - 1, this.cursor + 1));
    } else if (e.keyCode === KeyCode.ARROW_LEFT || e.keyCode === KeyCode.PAGE_UP) {
      this.changePage(-1);
    } else if (e.keyCode === KeyCode.ARROW_RIGHT || e.keyCode === KeyCode.PAGE_DOWN) {
      this.changePage(1);
    } else if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
      const row = rows[this.cursor];
      if (row) this.toggleMembership(row.creatureId);
    }
  }

  // Team members first (in team order), then everyone resting in storage.
  private orderedRows(): OwnedCreatureState[] {
    const teamIds = this.state.teamIdList;
    const owned = this.state.ownedView();
    const byId = new Map(owned.map((c) => [c.creatureId, c]));
    const team = teamIds.map((id) => byId.get(id)!);
    const storage = owned.filter((c) => !teamIds.includes(c.creatureId));
    return [...team, ...storage];
  }

  private moveCursor(index: number): void {
    if (index === this.cursor) return;
    this.cursor = index;
    this.page = Math.floor(index / ROWS_PER_PAGE);
    this.render();
  }

  private changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.orderedRows().length / ROWS_PER_PAGE) - 1);
    const next = Math.max(0, Math.min(lastPage, this.page + delta));
    if (next === this.page) return;
    this.page = next;
    this.cursor = Math.min(next * ROWS_PER_PAGE, this.orderedRows().length - 1);
    this.render();
  }

  private toggleMembership(creatureId: string): void {
    const teamIds = this.state.teamIdList;
    if (this.state.isOnTeam(creatureId)) {
      if (teamIds.length <= 1) {
        this.flash("At least one friend stays on the team! 队伍里至少要留一位伙伴！");
        return;
      }
      this.state.setTeam(teamIds.filter((id) => id !== creatureId));
    } else {
      if (teamIds.length >= MAX_TEAM_SIZE) {
        this.flash("The team is full — six friends max. Move someone to storage first! 队伍满啦（最多六位）——先送一位去休息！");
        return;
      }
      this.state.setTeam([...teamIds, creatureId]);
    }
    this.hint = null;
    this.actions.onChanged();
    // The edited creature changed sections (team ⇄ storage), so the list
    // re-sorted around the cursor — keep it on the moved creature.
    const index = this.orderedRows().findIndex((c) => c.creatureId === creatureId);
    if (index >= 0) {
      this.cursor = index;
      this.page = Math.floor(index / ROWS_PER_PAGE);
    }
    this.render();
  }

  private flash(message: string): void {
    this.hint = message;
    this.render();
  }

  private render(): void {
    destroyChildren(this.root);
    makeRect(this.root, 0, 0, 960, 640, new Color(214, 233, 219, 255));
    const card = makePanel(this.root, 0, 18, 860, 524, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    const rows = this.orderedRows();
    const teamCount = this.state.teamIdList.length;
    const storageCount = rows.length - teamCount;
    makeLabel(card, "Harbor Sanctuary · 港湾保育园", -400, 226, { fontSize: 28, align: "left" });
    makeLabel(card, `Team ${teamCount}/${MAX_TEAM_SIZE} · Resting ${storageCount}`, 400, 228, {
      fontSize: 16,
      color: PALETTE.sub,
      align: "right",
    });

    const first = this.page * ROWS_PER_PAGE;
    rows.slice(first, first + ROWS_PER_PAGE).forEach((creature, offset) => {
      this.renderRow(card, creature, first + offset, 140 - offset * 88);
    });

    const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
    if (this.hint) {
      makeLabel(card, this.hint, 0, -190, { fontSize: 15, color: PALETTE.bad });
    }
    if (pageCount > 1) {
      makeButton(card, {
        x: -105,
        y: -224,
        w: 52,
        h: 36,
        label: "‹",
        color: PALETTE.actionBlue,
        disabled: this.page === 0,
        onTap: () => this.changePage(-1),
      });
      makeLabel(card, `${this.page + 1} / ${pageCount}`, 0, -224, { fontSize: 15 });
      makeButton(card, {
        x: 105,
        y: -224,
        w: 52,
        h: 36,
        label: "›",
        color: PALETTE.actionBlue,
        disabled: this.page === pageCount - 1,
        onTap: () => this.changePage(1),
      });
    } else {
      makeLabel(card, "↑↓ choose · Enter move in/out · Esc back", 0, -224, {
        fontSize: 13,
        color: PALETTE.sub,
      });
    }

    makeButton(this.root, {
      x: 0,
      y: -278,
      w: 180,
      h: 54,
      label: "Back 返回",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: this.actions.onBack,
    });
  }

  private renderRow(card: Node, creature: OwnedCreatureState, index: number, y: number): void {
    const onTeam = this.state.isOnTeam(creature.creatureId);
    const leading = onTeam && this.state.activeTeamId === creature.creatureId;
    const selected = index === this.cursor;
    const row = makePanel(card, 0, y, 812, 72, {
      fill: onTeam ? new Color(227, 242, 253, 255) : new Color(247, 243, 232, 255),
      stroke: selected ? PALETTE.actionBlue : undefined,
      radius: 12,
      lineWidth: selected ? 3 : undefined,
    });
    row.on(Node.EventType.TOUCH_END, () => this.moveCursor(index));

    const portrait = makeCreaturePortrait(row, creature, 15);
    portrait.setPosition(-356, 0);

    const zh = SPECIES_BY_ID[creature.speciesId]?.nameZh;
    const name = makeLabel(row, zh ? `${creature.name} ${zh}` : creature.name, -318, 18, {
      fontSize: 20,
      align: "left",
    });
    name.node.getComponent(UITransform)!.setContentSize(240, 26);
    name.enableWrapText = false;
    name.overflow = Label.Overflow.SHRINK;

    makeLabel(row, `Lv. ${creature.level}`, -318, -14, {
      fontSize: 15,
      color: PALETTE.sub,
      align: "left",
    });

    const hpFraction = Math.max(0, creature.hp / creature.maxHp);
    makeRect(row, -96, -14, 150, 10, new Color(221, 221, 221, 255), 5);
    if (hpFraction > 0) {
      const hpColor = hpFraction > 0.5 ? PALETTE.hpHigh : hpFraction > 0.25 ? PALETTE.hpMid : PALETTE.hpLow;
      const width = 150 * hpFraction;
      makeRect(row, -171 + width / 2, -14, width, 10, hpColor, 5);
    }
    makeLabel(row, `HP ${creature.hp}/${creature.maxHp}`, -96, 12, { fontSize: 13, color: PALETTE.sub });

    const tag = leading ? "★ Leading 领队" : onTeam ? "Team 队伍" : "Resting 休息中";
    makeLabel(row, tag, 120, 0, {
      fontSize: 15,
      color: leading ? new Color(255, 167, 38, 255) : onTeam ? PALETTE.good : PALETTE.sub,
    });

    const teamIds = this.state.teamIdList;
    const wouldEmpty = onTeam && teamIds.length <= 1;
    const wouldOverflow = !onTeam && teamIds.length >= MAX_TEAM_SIZE;
    makeButton(row, {
      x: 300,
      y: 0,
      w: 170,
      h: 44,
      label: onTeam ? "To storage 休息" : "To team 加入",
      color: onTeam ? new Color(144, 164, 174, 255) : PALETTE.actionBlue,
      disabled: wouldEmpty || wouldOverflow,
      fontSize: 16,
      onTap: () => this.toggleMembership(creature.creatureId),
    });
  }
}
