// Field Guide (issue #5): the kid-facing view of save v2's fieldGuide state —
// every Meadow species as Unknown (never met), Seen (met in the wild), or
// Caught (owned now or ever), plus which palette variants have been
// discovered. Unknown is the ABSENT entry; seen/caught come from
// markSeen/markCaught. Pure overlay: opens from the HUD chip or the G key,
// closes with G/Esc; arrows move the cursor, taps select.

import { Color, EventKeyboard, Graphics, KeyCode, Label, Node, UITransform } from "cc";
import {
  MEADOW_SPECIES,
  SPECIES_BY_ID,
  STARTERS,
  type FieldGuideEntryState,
  type Species,
} from "../../shared/index";
import { paintCreature } from "../creature-art";
import { makeCreaturePortrait } from "../creature-portrait";
import { GameState } from "../state";
import { GUARDIAN_SPECIES_ID, trailGuideLine } from "../world/trail";
import { PALETTE, destroyChildren, makeButton, makeLabel, makePanel, makeRect } from "../ui";

const COLS = 5;
const ROWS = 3;
const PER_PAGE = COLS * ROWS;
const CELL_W = 156;
const CELL_H = 120;
const PITCH_X = 162;
const PITCH_Y = 122;

interface GuideCell {
  species: Species;
  entry: FieldGuideEntryState | undefined;
}

export interface FieldGuideActions {
  onBack: () => void;
}

export class FieldGuideScreen {
  readonly root = new Node("field-guide");
  private cells: GuideCell[];
  private cursor = 0;
  private page = 0;

  constructor(private state: GameState, private actions: FieldGuideActions) {
    const entries = new Map(state.fieldGuideEntries.map((e) => [e.speciesId, e]));
    // The Meadow roster: starters + the island's species, in registry order.
    const roster: Species[] = [...STARTERS, ...MEADOW_SPECIES];
    const rosterIds = new Set(roster.map((s) => s.id));
    this.cells = roster.map((species) => ({ species, entry: entries.get(species.id) }));
    // Legacy species (pre-registry Woolly preview pets) still deserve their
    // entries — a migrated save can carry them, so they render after the
    // Meadow roster rather than vanishing.
    for (const entry of state.fieldGuideEntries) {
      if (rosterIds.has(entry.speciesId)) continue;
      const species = SPECIES_BY_ID[entry.speciesId];
      if (species) this.cells.push({ species, entry });
    }
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.KEY_G) {
      this.actions.onBack();
      return;
    }
    const col = this.cursor % COLS;
    if (e.keyCode === KeyCode.ARROW_LEFT || e.keyCode === KeyCode.KEY_A) {
      if (col > 0) this.moveCursor(this.cursor - 1);
      else this.changePage(-1);
    } else if (e.keyCode === KeyCode.ARROW_RIGHT || e.keyCode === KeyCode.KEY_D) {
      if (col < COLS - 1 && this.cursor + 1 < this.cells.length) this.moveCursor(this.cursor + 1);
      else this.changePage(1);
    } else if (e.keyCode === KeyCode.ARROW_UP || e.keyCode === KeyCode.KEY_W) {
      this.moveCursor(Math.max(0, this.cursor - COLS));
    } else if (e.keyCode === KeyCode.ARROW_DOWN || e.keyCode === KeyCode.KEY_S) {
      this.moveCursor(Math.min(this.cells.length - 1, this.cursor + COLS));
    } else if (e.keyCode === KeyCode.PAGE_UP) {
      this.changePage(-1);
    } else if (e.keyCode === KeyCode.PAGE_DOWN) {
      this.changePage(1);
    }
  }

  private moveCursor(index: number): void {
    if (index === this.cursor) return;
    this.cursor = index;
    this.page = Math.floor(index / PER_PAGE);
    this.render();
  }

  private changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.cells.length / PER_PAGE) - 1);
    const next = Math.max(0, Math.min(lastPage, this.page + delta));
    if (next === this.page) return;
    this.page = next;
    this.cursor = Math.min(next * PER_PAGE, this.cells.length - 1);
    this.render();
  }

  private render(): void {
    destroyChildren(this.root);
    makeRect(this.root, 0, 0, 960, 640, new Color(233, 226, 208, 255));
    const card = makePanel(this.root, 0, 14, 860, 540, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    makeLabel(card, "Field Guide · 图鉴", -396, 230, { fontSize: 30, align: "left" });
    const caught = this.cells.filter((c) => c.entry?.status === "caught").length;
    const seen = this.cells.filter((c) => c.entry?.status === "seen").length;
    makeLabel(card, `Caught ${caught} · Seen ${seen} · Total ${this.cells.length}`, 396, 232, {
      fontSize: 16,
      color: PALETTE.sub,
      align: "right",
    });

    const first = this.page * PER_PAGE;
    const visible = this.cells.slice(first, first + PER_PAGE);
    visible.forEach((cell, offset) => {
      const index = first + offset;
      const col = offset % COLS;
      const row = Math.floor(offset / COLS);
      this.renderCell(card, cell, index, (col - 2) * PITCH_X, 134 - row * PITCH_Y);
    });

    // Detail strip: whatever the cursor rests on, spelled out.
    const current = this.cells[this.cursor];
    const strip = makePanel(card, 0, -204, 812, 44, {
      fill: new Color(247, 243, 232, 255),
      radius: 10,
    });
    const detail = makeLabel(strip, this.detailText(current), 0, 0, { fontSize: 16 });
    detail.node.getComponent(UITransform)!.setContentSize(780, 30);
    detail.enableWrapText = false;
    detail.overflow = Label.Overflow.SHRINK;

    const pageCount = Math.max(1, Math.ceil(this.cells.length / PER_PAGE));
    const hint =
      pageCount > 1
        ? `Arrows move 移动 · PgUp/PgDn turn (${this.page + 1}/${pageCount}) · G/Esc back 返回`
        : "Arrows move 移动 · G/Esc back 返回";
    makeLabel(card, hint, 0, -240, { fontSize: 13, color: PALETTE.sub });

    makeButton(this.root, {
      x: 0,
      y: -278,
      w: 180,
      h: 48,
      label: "Back 返回",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: this.actions.onBack,
    });
  }

  private renderCell(card: Node, cell: GuideCell, index: number, x: number, y: number): void {
    const status = cell.entry?.status ?? "unknown";
    const selected = index === this.cursor;
    const fill =
      status === "caught"
        ? new Color(232, 245, 233, 255)
        : status === "seen"
          ? new Color(255, 253, 245, 255)
          : new Color(238, 238, 234, 255);
    const node = makePanel(card, x, y, CELL_W, CELL_H, {
      fill,
      stroke: selected ? PALETTE.actionBlue : undefined,
      radius: 12,
      lineWidth: selected ? 4 : undefined,
    });
    node.on(Node.EventType.TOUCH_END, () => this.moveCursor(index));

    if (status === "unknown") {
      // A blank silhouette: the friend is still hiding.
      const blob = new Node("silhouette");
      blob.parent = node;
      blob.setPosition(0, 26);
      paintCreature(blob.addComponent(Graphics), new Color(176, 176, 170, 255), 16, false);
      makeLabel(node, "?", 0, 26, { fontSize: 26, color: PALETTE.panel });
    } else {
      const portrait = makeCreaturePortrait(
        node,
        { speciesId: cell.species.id, color: cell.species.color, boss: false },
        16,
      );
      portrait.setPosition(0, 26);
    }

    const known = status !== "unknown";
    const name = makeLabel(node, known ? cell.species.name : "???", 0, -12, {
      fontSize: 15,
      color: known ? PALETTE.ink : PALETTE.sub,
    });
    name.node.getComponent(UITransform)!.setContentSize(CELL_W - 16, 20);
    name.enableWrapText = false;
    name.overflow = Label.Overflow.SHRINK;

    const tag =
      status === "caught" ? "Caught 收服" : status === "seen" ? "Seen 见过" : "Unknown 未知";
    makeLabel(node, tag, 0, -34, {
      fontSize: 12,
      color: status === "caught" ? PALETTE.good : status === "seen" ? PALETTE.actionBlue : PALETTE.sub,
    });

    this.renderVariantDots(node, cell.entry);
  }

  // The discovered-variant row: one dot per palette ("normal" · "alt"),
  // filled when discovered. Unknown species show both hollow — nothing found.
  private renderVariantDots(node: Node, entry: FieldGuideEntryState | undefined): void {
    const variants: Array<{ id: string; color: Color }> = [
      { id: "normal", color: new Color(141, 110, 99, 255) },
      { id: "alt", color: new Color(255, 202, 40, 255) },
    ];
    variants.forEach((variant, i) => {
      const dot = new Node(`variant-${variant.id}`);
      dot.parent = node;
      dot.setPosition(-12 + i * 24, -50);
      const g = dot.addComponent(Graphics);
      const discovered = entry?.variants.includes(variant.id) ?? false;
      if (discovered) {
        g.fillColor = variant.color;
        g.circle(0, 0, 6);
        g.fill();
      } else {
        g.strokeColor = new Color(170, 170, 170, 255);
        g.lineWidth = 2;
        g.circle(0, 0, 6);
        g.stroke();
      }
    });
  }

  private detailText(cell: GuideCell): string {
    const status = cell.entry?.status ?? "unknown";
    // The Cloudmane's entry telegraphs the research trail (#21): even as an
    // unknown silhouette the guide names where the hunt stands and the next
    // opportunity — the trail's persistent clues live in save v2 flags.
    if (cell.species.id === GUARDIAN_SPECIES_ID) {
      return trailGuideLine(this.state.arcFlags(), status !== "unknown");
    }
    if (status === "unknown") {
      return "??? — Not met yet. Tall grass hides new friends! 还没遇到——高高的草丛里藏着新朋友！";
    }
    const zh = cell.species.nameZh ? ` ${cell.species.nameZh}` : "";
    const looks = (cell.entry?.variants ?? [])
      .map((v) => (v === "normal" ? "classic" : v === "alt" ? "shiny ★" : v))
      .join(", ");
    const state =
      status === "caught"
        ? "Caught — part of the family! 已经收服"
        : "Seen in the wild — catch it with a ball! 在野外见过";
    return `${cell.species.name}${zh} — ${state} · Looks found 样子: ${looks}`;
  }
}
