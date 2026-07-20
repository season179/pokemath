// Payoff art (M5 topic arcs, #20): the visible world change an area earns
// when its help quest completes. One painter per payoff region, painted
// into the world's shared payoff Graphics overlay (it zooms with the
// world). The trigger is the area badge in the save — a helped region
// keeps its change across reloads and re-entries.

import { Color, Graphics } from "cc";
import { MEADOW_BARN_ANCHORS } from "./regions/meadow-barn";
import { MEADOW_FESTIVAL_ANCHORS } from "./regions/meadow-festival";
import { TILE, regionH, regionW, tileAt, type RegionDef } from "./regions/index";

const CORAL = new Color(255, 111, 145, 255);
const SUNNY = new Color(255, 199, 95, 255);
const SNOW = new Color(255, 250, 240, 255);
const LEAF = new Color(74, 124, 89, 255);
const WOOD = new Color(141, 110, 99, 255);
const NAVY = new Color(38, 70, 112, 255);
const RED = new Color(214, 69, 65, 255);
const GOLD = new Color(255, 213, 79, 255);
const GLOW = new Color(255, 236, 160, 110);

/** Tile (grid coords, row 0 at top) → the tile center in map-local pixels. */
function tileCenter(def: RegionDef, x: number, y: number): [number, number] {
  return [x * TILE + TILE / 2, (regionH(def) - 1 - y) * TILE + TILE / 2];
}

/** One blossom: a gold heart with five petals. */
function paintBlossom(g: Graphics, x: number, y: number, petal: Color, scale = 1): void {
  const r = 5 * scale;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180 - Math.PI / 2;
    g.fillColor = petal;
    g.circle(x + Math.cos(angle) * r * 1.5, y + Math.sin(angle) * r * 1.5, r);
    g.fill();
  }
  g.fillColor = GOLD;
  g.circle(x, y, r * 0.9);
  g.fill();
}

/** A sagging string between two points; returns the sag depth used. */
function paintString(g: Graphics, x1: number, y1: number, x2: number, y2: number, sag: number): void {
  g.strokeColor = NAVY;
  g.lineWidth = 3;
  g.moveTo(x1, y1);
  g.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - sag, x2, y2);
  g.stroke();
}

/** Point on the sagging quadratic at t ∈ [0, 1]. */
function stringPoint(x1: number, y1: number, x2: number, y2: number, sag: number, t: number): [number, number] {
  const cx = (x1 + x2) / 2;
  const cy = Math.min(y1, y2) - sag;
  const u = 1 - t;
  return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2];
}

/** Pattern Gardens: the rain-flattened beds bloom — a blossom on every
 * flower tile, in a repeating coral/sunny/snow frieze (of course the
 * pattern repeats — it is the Pattern Gardens). */
function paintGardens(g: Graphics, def: RegionDef): void {
  const petals = [CORAL, SUNNY, SNOW];
  let i = 0;
  for (let y = 0; y < regionH(def); y++) {
    for (let x = 0; x < regionW(def); x++) {
      if (tileAt(def, x, y) !== "f") continue;
      const [cx, cy] = tileCenter(def, x, y);
      paintBlossom(g, cx, cy, petals[i % petals.length], 1.35);
      i++;
    }
  }
}

/** Harvest Barn: a pennant garland swags across the barn's front wall, and
 * two blossom pots flank the door. */
function paintBarn(g: Graphics, def: RegionDef): void {
  const [x1, y1] = tileCenter(def, MEADOW_BARN_ANCHORS.garland.from.x, MEADOW_BARN_ANCHORS.garland.from.y);
  const [x2, y2] = tileCenter(def, MEADOW_BARN_ANCHORS.garland.to.x, MEADOW_BARN_ANCHORS.garland.to.y);
  const sag = 46;
  paintString(g, x1, y1, x2, y2, sag);
  const colors = [RED, GOLD, SNOW, CORAL];
  for (let i = 1; i <= 9; i++) {
    const [px, py] = stringPoint(x1, y1, x2, y2, sag, i / 10);
    g.fillColor = colors[i % colors.length];
    g.moveTo(px - 9, py);
    g.lineTo(px + 9, py);
    g.lineTo(px, py - 16);
    g.close();
    g.fill();
  }
  // Blossom pots flank the compact barn's central door.
  for (const anchor of MEADOW_BARN_ANCHORS.flowerPots) {
    const [px, py] = tileCenter(def, anchor.x, anchor.y);
    g.fillColor = WOOD;
    g.roundRect(px - 12, py - 18, 24, 16, 4);
    g.fill();
    g.fillColor = LEAF;
    g.circle(px, py - 2, 9);
    g.fill();
    paintBlossom(g, px - 7, py + 4, CORAL, 0.8);
    paintBlossom(g, px + 7, py + 6, SUNNY, 0.8);
  }
}

/** Harvest Festival: three lantern strings light the plaza — warm gold
 * lanterns with a soft glow, strung across the green. */
function paintFestival(g: Graphics, def: RegionDef): void {
  for (const { row, fromX: xa, toX: xb } of MEADOW_FESTIVAL_ANCHORS.lanternStrings) {
    const [x1, y1] = tileCenter(def, xa, row);
    const [x2, y2] = tileCenter(def, xb, row);
    const sag = 34;
    paintString(g, x1, y1, x2, y2, sag);
    for (let i = 1; i <= 6; i++) {
      const [px, py] = stringPoint(x1, y1, x2, y2, sag, i / 7);
      g.fillColor = GLOW;
      g.circle(px, py - 12, 15);
      g.fill();
      g.fillColor = GOLD;
      g.circle(px, py - 12, 9);
      g.fill();
      g.fillColor = RED;
      g.rect(px - 3, py - 3, 6, 4);
      g.fill();
    }
  }
}

/**
 * Paint the region's earned payoff change into the shared overlay Graphics
 * (WorldScreen.refreshArcPayoff clears it every refresh). No-op for a
 * region without payoff art; the caller gates on the area badge.
 */
export function paintAreaPayoff(g: Graphics, def: RegionDef): void {
  const painters: Record<string, (g: Graphics, def: RegionDef) => void> = {
    "meadow/gardens": paintGardens,
    "meadow/barn": paintBarn,
    "meadow/festival": paintFestival,
  };
  painters[def.id]?.(g, def);
}
