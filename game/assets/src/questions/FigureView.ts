// Cocos renderer for declarative figure specs (M5, #16). One kit, driven
// entirely by content data (shared/figures.ts) — no question ships custom
// UI code. The view model (figure vs deliberate prose fallback) is resolved
// in the shared domain; this module only paints a spec it is handed.
//
// The paint primitives are the kit's growth point (island plan: the same
// primitives later skin number bonds, grids, tables, balances):
//   paintCellGrid   cells + counters in rows — ten-frame now; grids,
//                   number-bond boxes later
//   paintCoinDiscs  labeled discs — sen coins now; balance weights, table
//                   chips later
//   paintClockDial  ticks, numerals, hands on a circle — the clock
//   paintIconGrid   emoji rows with strike marks — object groups
// The visual-math arcs (#20) add their own painters on the same posture:
//   paintShapeRow   2D shape friezes + a blank pattern slot (Gardens)
//   paintSolidRow   line-drawn 3D solids (Barn scavenger hunt)
//   paintAbacus     the miller's 1:4 abacus, two rods (Barn)
//   paintMeasureRow object + non-standard unit icons end-to-end (Barn)
//   paintPictographRows labeled icon rows, one picture = one value (Festival)

import { Color, Graphics, Node, UITransform } from "cc";
import {
  abacusBeads,
  abacusDigits,
  clockHandAngles,
  tenFrameFrames,
  type AbacusFigure,
  type ClockFigure,
  type CoinDenomination,
  type CoinsFigure,
  type FigureSpec,
  type MeasureFigure,
  type ObjectsFigure,
  type PictographFigure,
  type Shape2D,
  type ShapesFigure,
  type Solid3D,
  type SolidsFigure,
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

// --- 2D shape friezes (Pattern Gardens, #20) ----------------------------------------

/** One 2D shape outline centered at (0, 0) of its node, sized to `size`. */
function paintShape2D(g: Graphics, shape: Shape2D, size: number): void {
  const r = size / 2;
  switch (shape) {
    case "square":
      g.rect(-r, -r, size, size);
      break;
    case "rectangle":
      g.rect(-r * 1.4, -r * 0.8, size * 1.4, size * 0.8);
      break;
    case "triangle":
      g.moveTo(0, r);
      g.lineTo(-r, -r * 0.8);
      g.lineTo(r, -r * 0.8);
      g.close();
      break;
    case "circle":
      g.circle(0, 0, r);
      break;
  }
  g.fill();
  g.stroke();
}

/** A row of the four named 2D shapes; `blank` adds a dashed "?" slot at the
 * end — the pattern-continue prompt (○ △ ○ △ __). */
function paintShapeRow(parent: Node, box: FigureBox, figure: ShapesFigure): void {
  const size = Math.min(64, Math.floor((box.width - 40) / (figure.sequence.length + (figure.blank ? 1 : 0)) - 14));
  const gap = 14;
  const slots = figure.sequence.length + (figure.blank ? 1 : 0);
  const totalW = slots * size + (slots - 1) * gap;
  figure.sequence.forEach((shape, i) => {
    const cx = box.x - totalW / 2 + size / 2 + i * (size + gap);
    const node = paintNode(parent, `shape-${shape}`, cx, box.y);
    const g = graphics(node);
    g.fillColor = CREAM;
    g.strokeColor = STROKE;
    g.lineWidth = 4;
    paintShape2D(g, shape, size);
  });
  if (figure.blank) {
    const cx = box.x + totalW / 2 - size / 2;
    const node = paintNode(parent, "shape-blank", cx, box.y);
    const g = graphics(node);
    g.fillColor = new Color(255, 255, 255, 120);
    g.strokeColor = new Color(144, 164, 174, 255);
    g.lineWidth = 3;
    g.roundRect(-size / 2, -size / 2, size, size, 8);
    g.fill();
    g.stroke();
    makeLabel(node, "?", 0, 0, { fontSize: Math.round(size * 0.55), color: PALETTE.sub });
  }
}

// --- 3D solids (Harvest Barn scavenger hunt, #20) --------------------------------------

/** One line-drawn solid centered at (0, 0) of its node, ~`size` across.
 * Oblique projection: a true front face, a depth offset, connecting edges —
 * the worksheet convention a Standard-1 child reads faces/edges/vertices
 * from. */
function paintSolid3D(g: Graphics, solid: Solid3D, size: number): void {
  const r = size / 2;
  const dx = size * 0.22; // depth offset, right and up
  const dy = size * 0.18;
  switch (solid) {
    case "cube":
    case "cuboid": {
      const w = solid === "cube" ? size * 0.62 : size * 0.86;
      const h = solid === "cube" ? size * 0.62 : size * 0.5;
      // Back face (offset up-right), front face, four depth edges.
      g.rect(-w / 2 + dx, -h / 2 + dy, w, h);
      g.stroke();
      g.rect(-w / 2, -h / 2, w, h);
      g.fill();
      g.stroke();
      for (const [cx, cy] of [
        [-w / 2, h / 2],
        [w / 2, h / 2],
        [w / 2, -h / 2],
        [-w / 2, -h / 2],
      ] as const) {
        g.moveTo(cx, cy);
        g.lineTo(cx + dx, cy + dy);
        g.stroke();
      }
      break;
    }
    case "cylinder": {
      const rx = size * 0.34;
      const ry = size * 0.13;
      const h = size * 0.58;
      // Side walls and the two circular faces as ellipses.
      g.moveTo(-rx, h / 2);
      g.lineTo(-rx, -h / 2);
      g.moveTo(rx, h / 2);
      g.lineTo(rx, -h / 2);
      g.stroke();
      g.ellipse(0, h / 2, rx, ry);
      g.fill();
      g.stroke();
      g.ellipse(0, -h / 2, rx, ry);
      g.stroke();
      break;
    }
    case "cone": {
      const rx = size * 0.36;
      const ry = size * 0.13;
      const apexY = size * 0.42;
      const baseY = -size * 0.3;
      g.moveTo(0, apexY);
      g.lineTo(-rx, baseY);
      g.moveTo(0, apexY);
      g.lineTo(rx, baseY);
      g.stroke();
      g.ellipse(0, baseY, rx, ry);
      g.fill();
      g.stroke();
      break;
    }
    case "pyramid": {
      // Square base as a parallelogram, apex above its center.
      const w = size * 0.4;
      const bx = size * 0.16;
      const by = size * 0.1;
      const apex: [number, number] = [0, size * 0.42];
      const base: [number, number][] = [
        [-w, -by],
        [w, -by],
        [w + bx * 2, by],
        [-w + bx * 2, by],
      ];
      // Base (back edges first), then the four lateral edges from the apex.
      g.moveTo(base[0][0], base[0][1]);
      for (const [x, y] of base.slice(1)) g.lineTo(x, y);
      g.close();
      g.stroke();
      for (const [x, y] of base) {
        g.moveTo(apex[0], apex[1]);
        g.lineTo(x, y);
        g.stroke();
      }
      // Fill the front face so the solid reads as one body.
      g.moveTo(apex[0], apex[1]);
      g.lineTo(base[0][0], base[0][1]);
      g.lineTo(base[1][0], base[1][1]);
      g.close();
      g.fill();
      g.stroke();
      break;
    }
    case "sphere": {
      g.circle(0, 0, r * 0.8);
      g.fill();
      g.stroke();
      // The equator ellipse gives the ball its roundness cue.
      g.ellipse(0, 0, r * 0.8, r * 0.3);
      g.stroke();
      break;
    }
  }
}

/** A small line-up of solids (one for name-count, two or three to compare). */
function paintSolidRow(parent: Node, box: FigureBox, figure: SolidsFigure): void {
  const size = Math.min(120, Math.floor((box.width - 60) / figure.solids.length) - 30, box.height - 30);
  const gap = 30;
  const totalW = figure.solids.length * size + (figure.solids.length - 1) * gap;
  figure.solids.forEach((solid, i) => {
    const cx = box.x - totalW / 2 + size / 2 + i * (size + gap);
    const node = paintNode(parent, `solid-${solid}`, cx, box.y);
    const g = graphics(node);
    g.fillColor = CREAM;
    g.strokeColor = STROKE;
    g.lineWidth = 4;
    paintSolid3D(g, solid, size);
  });
}

// --- the miller's 1:4 abacus (#20) ------------------------------------------------------

const ABACUS_WOOD = new Color(141, 110, 99, 255);
const ABACUS_BEAD = new Color(255, 213, 79, 255);

/** A two-rod 1:4 soroban (十位 / 个位): one heaven bead (worth 5) above the
 * beam, four earth beads below. Engaged beads touch the beam; parked beads
 * rest at the frame edge. Representation only (scope doc §3). */
function paintAbacus(parent: Node, box: FigureBox, figure: AbacusFigure): void {
  const frameW = 220;
  const frameH = Math.min(170, box.height - 12);
  const beamY = -frameH * 0.18; // heaven deck above, earth deck below
  const node = paintNode(parent, "abacus", box.x, box.y);
  const g = graphics(node);

  // Frame and beam.
  g.fillColor = CREAM;
  g.strokeColor = ABACUS_WOOD;
  g.lineWidth = 6;
  g.roundRect(-frameW / 2, -frameH / 2, frameW, frameH, 10);
  g.fill();
  g.stroke();
  g.lineWidth = 5;
  g.moveTo(-frameW / 2, beamY);
  g.lineTo(frameW / 2, beamY);
  g.stroke();

  const beadRX = 17;
  const beadRY = 10;
  const beadGap = 4;
  const [tens, ones] = abacusDigits(figure.value);
  [
    { digit: tens, cx: -frameW / 4, rod: "十" },
    { digit: ones, cx: frameW / 4, rod: "个" },
  ].forEach(({ digit, cx, rod }) => {
    // The rod.
    g.strokeColor = ABACUS_WOOD;
    g.lineWidth = 3;
    g.moveTo(cx, frameH / 2 - 6);
    g.lineTo(cx, -frameH / 2 + 6);
    g.stroke();

    const { heaven, earth } = abacusBeads(digit);
    g.fillColor = ABACUS_BEAD;
    g.strokeColor = STROKE;
    g.lineWidth = 2.5;
    // Heaven bead: engaged slides down to the beam; parked hugs the top.
    const heavenY = heaven ? beamY + beadRY + 4 : frameH / 2 - beadRY - 8;
    g.ellipse(cx, heavenY, beadRX, beadRY);
    g.fill();
    g.stroke();
    // Earth beads: the engaged group rises to the beam (i = 0 hugs it);
    // the rest park up from the bottom edge.
    const pitch = beadRY * 2 + beadGap;
    for (let i = 0; i < 4; i++) {
      const y =
        i < earth
          ? beamY - beadRY - 4 - i * pitch
          : -frameH / 2 + beadRY + 8 + (i - earth) * pitch;
      g.ellipse(cx, y, beadRX, beadRY);
      g.fill();
      g.stroke();
    }
    // Rod label beneath the frame.
    makeLabel(node, rod, cx, -frameH / 2 - 14, { fontSize: 18, color: PALETTE.sub });
  });
}

// --- non-standard measurement (#20) ------------------------------------------------------

/** The measured object above a baseline, with `count` unit icons laid
 * end-to-end beneath it — the worksheet convention for "how many paper
 * clips long?". The child counts the units; the spec carries no standard
 * unit vocabulary at all. */
function paintMeasureRow(parent: Node, box: FigureBox, figure: MeasureFigure): void {
  const cell = Math.min(40, Math.floor((box.width - 80) / figure.count));
  const rowW = figure.count * cell;
  const objectY = box.y + cell * 1.1;
  const baseY = box.y + cell * 0.35;
  const unitY = box.y - cell * 0.55;

  // The object, centered over the unit row.
  makeLabel(parent, figure.object, box.x, objectY, { fontSize: Math.round(cell * 1.3), name: "measure-object" });

  // The baseline the units measure against.
  const line = paintNode(parent, "measure-baseline", box.x, baseY);
  const lg = graphics(line);
  lg.strokeColor = STROKE;
  lg.lineWidth = 3;
  lg.moveTo(-rowW / 2 - 6, 0);
  lg.lineTo(rowW / 2 + 6, 0);
  lg.stroke();

  // Unit icons end-to-end.
  for (let i = 0; i < figure.count; i++) {
    const cx = box.x - rowW / 2 + cell / 2 + i * cell;
    makeLabel(parent, figure.unit, cx, unitY, { fontSize: Math.round(cell * 0.78), name: "measure-unit" });
  }
}

// --- pictograph (Harvest Festival board, #20) --------------------------------------------

/** Labeled category rows of icons, one picture = one value. Icons are
 * left-aligned in a shared column so most/least reads off the row lengths
 * at a glance — the rows ARE the data (there is no scale to learn). */
function paintPictographRows(parent: Node, box: FigureBox, figure: PictographFigure): void {
  const rows = figure.rows.length;
  const rowH = Math.min(48, (box.height - 10) / rows);
  const cell = Math.min(34, Math.floor(rowH * 0.8));
  const labelW = 150;
  const iconsX = box.x - box.width / 2 + labelW + 60;
  figure.rows.forEach((row, i) => {
    const cy = box.y + ((rows - 1) * rowH) / 2 - i * rowH;
    makeLabel(parent, row.label_zh, iconsX - 16, cy + (row.label_en ? 6 : 0), {
      fontSize: 20,
      color: PALETTE.ink,
      name: "pictograph-label",
      align: "right",
    });
    if (row.label_en) {
      makeLabel(parent, row.label_en, iconsX - 16, cy - 14, {
        fontSize: 13,
        color: PALETTE.sub,
        name: "pictograph-gloss",
        align: "right",
      });
    }
    for (let c = 0; c < row.count; c++) {
      makeLabel(parent, row.icon, iconsX + cell / 2 + c * cell, cy, {
        fontSize: Math.round(cell * 0.82),
        name: "pictograph-icon",
      });
    }
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
    case "shapes":
      paintShapeRow(figure, box, spec);
      break;
    case "solids":
      paintSolidRow(figure, box, spec);
      break;
    case "abacus":
      paintAbacus(figure, box, spec);
      break;
    case "measure":
      paintMeasureRow(figure, box, spec);
      break;
    case "pictograph":
      paintPictographRows(figure, box, spec);
      break;
  }
  return figure;
}
