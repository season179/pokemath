// Cocos renderer for declarative figure specs (M5, #16). One kit, driven
// entirely by content data (shared/figures.ts) — no question ships custom
// UI code. The view model (figure vs deliberate prose fallback) is resolved
// in the shared domain; this module only paints a spec it is handed.
//
// The paint primitives are the kit's growth point (island plan: the same
// primitives later skin pictographs, number bonds, shapes, grids, tables):
//   paintCellGrid   cells + counters in rows — ten-frame now; grids,
//                   pictograph rows, number-bond boxes later
//   paintCoinDiscs  labeled discs — sen coins now; balance weights, table
//                   chips later
//   paintClockDial  ticks, numerals, hands on a circle — the clock
//   paintIconGrid   emoji rows with strike marks — object groups now;
//                   pictograph icons later

import { Color, Graphics, Node, UITransform } from "cc";
import {
  clockHandAngles,
  tenFrameFrames,
  type ClockFigure,
  type CoinDenomination,
  type CoinsFigure,
  type FigureSpec,
  type ObjectsFigure,
  type TenFrameFigure,
} from "../../shared/index";
import { PALETTE, makeLabel } from "../ui";

const STROKE = PALETTE.panelStroke;
const CREAM = PALETTE.panel;
const COUNTER = PALETTE.actionBlue;
const STRIKE = PALETTE.bad;
const SILVER_FILL = new Color(230, 233, 236, 255);
const SILVER_STROKE = new Color(144, 153, 163, 255);
const GOLD_FILL = new Color(255, 213, 79, 255);
const GOLD_STROKE = new Color(255, 167, 38, 255);

export interface FigureBox {
  x: number; // center of the figure band, parent coordinates
  y: number;
  width: number;
  height: number;
}

/** One Graphics-bearing node centered at (x, y) in the parent. */
function paintNode(parent: Node, name: string, x = 0, y = 0): Node {
  const node = new Node(name);
  node.parent = parent;
  node.addComponent(UITransform);
  node.setPosition(x, y);
  node.addComponent(Graphics);
  return node;
}

function graphics(node: Node): Graphics {
  return node.getComponent(Graphics)!;
}

// --- cell grid (ten-frame now; grids, pictographs, number bonds later) --------

export interface CellGridOpts {
  cols: number;
  rows: number;
  cell: number; // cell edge in px
  gap: number;
  filled: number; // counters placed in reading order (left→right, top→bottom)
  counterColor?: Color;
}

/** A framed grid of cells with solid counters filling the first `filled`
 * cells in reading order; empty cells stay visibly empty (the gaps carry
 * the number-bond reading). Returns the grid's total width. */
export function paintCellGrid(parent: Node, x: number, y: number, opts: CellGridOpts): number {
  const { cols, rows, cell, gap, filled, counterColor = COUNTER } = opts;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  const node = paintNode(parent, "cell-grid", x, y);
  const g = graphics(node);

  // Frame and cells.
  g.fillColor = CREAM;
  g.strokeColor = STROKE;
  g.lineWidth = 4;
  g.roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 10);
  g.fill();
  g.stroke();
  g.lineWidth = 2.5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = -w / 2 + cell / 2 + col * (cell + gap);
      const cy = h / 2 - cell / 2 - row * (cell + gap);
      g.rect(cx - cell / 2, cy - cell / 2, cell, cell);
      g.stroke();
    }
  }

  // Counters in reading order.
  g.fillColor = counterColor;
  for (let i = 0; i < filled; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = -w / 2 + cell / 2 + col * (cell + gap);
    const cy = h / 2 - cell / 2 - row * (cell + gap);
    g.circle(cx, cy, cell * 0.32);
    g.fill();
  }
  return w;
}

// --- coin discs (sen coins now; balance weights, table chips later) ------------

/** Coin diameter grows with value, like the real Malaysian series. */
function coinRadius(denomination: CoinDenomination): number {
  switch (denomination) {
    case 5: return 25;
    case 10: return 28;
    case 20: return 32;
    case 50: return 36;
  }
}

/** A row of Malaysian sen coins: silver for 5/10/20, gold for 50, each
 * labeled with its value and "sen". Authored order is display order.
 * Returns the row's total width. */
export function paintCoinDiscs(parent: Node, x: number, y: number, coins: readonly CoinDenomination[]): number {
  const gap = 16;
  const radii = coins.map(coinRadius);
  const w = radii.reduce((total, r) => total + r * 2, 0) + gap * (coins.length - 1);
  let cursor = x - w / 2;
  coins.forEach((denomination, i) => {
    const r = radii[i];
    const cx = cursor + r;
    cursor += r * 2 + gap;

    const node = paintNode(parent, `coin-${denomination}`, cx, y);
    const g = graphics(node);
    const gold = denomination === 50;
    g.fillColor = gold ? GOLD_FILL : SILVER_FILL;
    g.strokeColor = gold ? GOLD_STROKE : SILVER_STROKE;
    g.lineWidth = 4;
    g.circle(0, 0, r);
    g.fill();
    g.stroke();
    g.lineWidth = 2;
    g.circle(0, 0, r - 6);
    g.stroke();

    makeLabel(node, String(denomination), 0, 4, {
      fontSize: Math.round(r * 0.72),
      color: PALETTE.ink,
    });
    makeLabel(node, "sen", 0, -Math.round(r * 0.42), {
      fontSize: Math.max(10, Math.round(r * 0.34)),
      color: PALETTE.sub,
    });
  });
  return w;
}

// --- clock dial -----------------------------------------------------------------

/** An analog clock face: cream dial, navy rim, all twelve numerals (the
 * Standard-1 face), hour ticks, and the two hands — the hour hand travels
 * with the minutes (3:30 points halfway between 3 and 4), which is exactly
 * what the clock-hand-swap distractor probes. */
export function paintClockDial(parent: Node, x: number, y: number, radius: number, figure: ClockFigure): void {
  const node = paintNode(parent, "clock-dial", x, y);
  const g = graphics(node);

  g.fillColor = CREAM;
  g.strokeColor = STROKE;
  g.lineWidth = 6;
  g.circle(0, 0, radius);
  g.fill();
  g.stroke();

  // Hour ticks and numerals.
  g.lineWidth = 3;
  for (let h = 1; h <= 12; h++) {
    const angle = (h * 30 * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    g.moveTo(sin * radius * 0.86, cos * radius * 0.86);
    g.lineTo(sin * radius * 0.95, cos * radius * 0.95);
    g.stroke();
    makeLabel(node, String(h), sin * radius * 0.72, cos * radius * 0.72, {
      fontSize: Math.round(radius * 0.19),
      color: PALETTE.ink,
    });
  }

  // Hands: short thick hour, long thin minute. 0° = twelve o'clock.
  const { hourDeg, minuteDeg } = clockHandAngles(figure.hour, figure.minute);
  const hourAngle = (hourDeg * Math.PI) / 180;
  const minuteAngle = (minuteDeg * Math.PI) / 180;
  g.strokeColor = PALETTE.ink;
  g.lineWidth = 7;
  g.moveTo(0, 0);
  g.lineTo(Math.sin(hourAngle) * radius * 0.5, Math.cos(hourAngle) * radius * 0.5);
  g.stroke();
  g.lineWidth = 4.5;
  g.moveTo(0, 0);
  g.lineTo(Math.sin(minuteAngle) * radius * 0.74, Math.cos(minuteAngle) * radius * 0.74);
  g.stroke();
  g.fillColor = STROKE;
  g.circle(0, 0, 5);
  g.fill();
}

// --- icon grid (object groups now; pictograph icons later) ------------------------

const ICONS_PER_ROW = 10;

/** Rows of one emoji (10 to a row) for counting. The trailing `crossedOut`
 * icons are dimmed and struck with a red slash — the picture-sentence
 * (看图列式) convention for subtraction. */
export function paintIconGrid(parent: Node, x: number, y: number, figure: ObjectsFigure, maxWidth: number): void {
  const { icon, count, crossedOut = 0 } = figure;
  const cell = Math.min(46, Math.floor(maxWidth / ICONS_PER_ROW));
  const perRow = count > ICONS_PER_ROW ? ICONS_PER_ROW : count;
  const rows = Math.ceil(count / perRow);
  const fontSize = Math.round(cell * 0.78);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const col = i % perRow;
    const rowWidth = inRow * cell;
    const cx = x - rowWidth / 2 + cell / 2 + col * cell;
    const cy = y + ((rows - 1) * cell) / 2 - row * cell;
    const struck = i >= count - crossedOut;

    const label = makeLabel(parent, icon, cx, cy, { fontSize, name: struck ? "icon-struck" : "icon" });
    if (struck) {
      label.color = new Color(120, 120, 120, 160);
      const slash = paintNode(parent, "strike", cx, cy);
      const g = graphics(slash);
      g.strokeColor = STRIKE;
      g.lineWidth = 4;
      g.moveTo(-cell * 0.38, -cell * 0.38);
      g.lineTo(cell * 0.38, cell * 0.38);
      g.stroke();
    }
  }
}

// --- ten-frame --------------------------------------------------------------------

function paintTenFrame(parent: Node, box: FigureBox, figure: TenFrameFigure): void {
  const frames = tenFrameFrames(figure.filled);
  const cell = Math.min(58, Math.floor((box.height - 30) / 2));
  const gap = 6;
  const frameGap = 26;
  const frameW = 5 * cell + 4 * gap;
  const totalW = frames.length * frameW + (frames.length - 1) * frameGap;
  frames.forEach((filled, i) => {
    const cx = box.x - totalW / 2 + frameW / 2 + i * (frameW + frameGap);
    paintCellGrid(parent, cx, box.y, { cols: 5, rows: 2, cell, gap, filled });
  });
}

// --- the kit entry point ------------------------------------------------------------

/**
 * Paint a declarative figure spec centered in `box`. Every spec kind has a
 * renderer — the fallback decision (figure vs prose) is made earlier, in
 * shared/figures.ts resolveFigureView.
 */
export function renderFigure(parent: Node, spec: FigureSpec, box: FigureBox): Node {
  const figure = new Node(`figure-${spec.kind}`);
  figure.parent = parent;
  switch (spec.kind) {
    case "ten-frame":
      paintTenFrame(figure, box, spec);
      break;
    case "clock":
      paintClockDial(figure, box.x, box.y, Math.min(box.width, box.height) / 2 - 8, spec);
      break;
    case "coins":
      paintCoinDiscs(figure, box.x, box.y, spec.coins);
      break;
    case "objects":
      paintIconGrid(figure, box.x, box.y, spec, box.width);
      break;
  }
  return figure;
}
