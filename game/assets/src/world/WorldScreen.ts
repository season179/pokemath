// The overworld screen: tile map, smooth grid movement, HUDs, and the
// tall-grass encounter trigger. Ported from the prototype's game.js.
//
// Coordinates: the map node is centered on the canvas. Grid (x, y) with
// row 0 at the TOP maps to local pixels (x*TILE, (MAP_H-1-y)*TILE) —
// Cocos's y-axis points up, the map array's y-axis points down.

import { Color, Graphics, Label, Node, UITransform } from "cc";
import {
  DIR_DELTA,
  Direction,
  MAP,
  MAP_H,
  MAP_W,
  TILE,
  isWalkable,
  tileAt,
} from "./map-data";
import { GameState } from "../state";
import { PALETTE, makeLabel, makePanel } from "../ui";
import { ENCOUNTER_RATE, SPECIES, Creature } from "../../shared/index";

const SPEED = 240; // pixels per second (prototype: 4px/frame at 60fps)
const PLAYER_SPAWN = { x: 2, y: 3 };

function gridToLocal(x: number, y: number): [number, number] {
  return [x * TILE, (MAP_H - 1 - y) * TILE];
}

// --- Tile painting (ported from the prototype's drawTile) ---
function paintTile(g: Graphics, type: string, tx: number, ty: number) {
  const px = tx * TILE;
  const py = (MAP_H - 1 - ty) * TILE;

  // grass base under everything
  g.fillColor = (tx + ty) % 2 === 0 ? hex("#7ec850") : hex("#77c04a");
  g.fillRect(px, py, TILE, TILE);

  if (type === "p") {
    g.fillColor = hex("#e0c084");
    g.fillRect(px, py, TILE, TILE);
    g.fillColor = hex("#d4b070");
    g.fillRect(px + 6, py + 6, 8, 8);
    g.fillRect(px + 30, py + 26, 8, 8);
  } else if (type === "G") {
    g.fillColor = hex("#4ea23a");
    g.fillRect(px, py, TILE, TILE);
    g.fillColor = hex("#3d8a2e");
    for (let i = 0; i < 3; i++) {
      const gx = px + 6 + i * 14;
      g.moveTo(gx, py + 8);
      g.lineTo(gx + 5, py + 34);
      g.lineTo(gx + 10, py + 8);
      g.close();
      g.fill();
    }
  } else if (type === "H") {
    g.fillColor = hex("#fff3e0");
    g.fillRect(px + 10, py + 6, 28, 20);
    g.fillColor = hex("#e53935");
    g.moveTo(px + 6, py + 24);
    g.lineTo(px + 24, py + 40);
    g.lineTo(px + 42, py + 24);
    g.close();
    g.fill();
    g.fillColor = hex("#8a5a2b");
    g.fillRect(px + 20, py + 6, 9, 12);
  } else if (type === "S") {
    g.fillColor = hex("#ffe082");
    g.fillRect(px + 10, py + 6, 28, 22);
    g.fillColor = hex("#e53935");
    for (let i = 0; i < 4; i++) g.fillRect(px + 6 + i * 9, py + 26, 5, 10);
    g.fillColor = hex("#ffffff");
    for (let i = 0; i < 4; i++) g.fillRect(px + 11 + i * 9, py + 26, 4, 10);
    g.fillColor = hex("#5d4037");
    g.fillRect(px + 14, py + 12, 20, 8);
  } else if (type === "T") {
    g.fillColor = hex("#8a5a2b");
    g.fillRect(px + 18, py + 4, 12, 18);
    g.fillColor = hex("#2e7d32");
    g.circle(px + 24, py + 30, 17);
    g.fill();
    g.fillColor = hex("#388e3c");
    g.circle(px + 16, py + 24, 11);
    g.circle(px + 32, py + 24, 11);
    g.fill();
  }
}

function hex(s: string): Color {
  return Color.fromHEX(new Color(), s);
}

// Draws a creature face in a 2r×2r box centered on the node's origin.
export function paintCreature(g: Graphics, color: Color, size: number, boss: boolean) {
  g.fillColor = color;
  g.circle(0, 0, size);
  g.circle(-size * 0.6, size * 0.8, size * 0.35);
  g.circle(size * 0.6, size * 0.8, size * 0.35);
  g.fill();
  g.fillColor = Color.WHITE;
  g.circle(-size * 0.35, size * 0.15, size * 0.22);
  g.circle(size * 0.35, size * 0.15, size * 0.22);
  g.fill();
  g.fillColor = hex("#333333");
  g.circle(-size * 0.35, size * 0.12, size * 0.1);
  g.circle(size * 0.35, size * 0.12, size * 0.1);
  g.fill();
  g.strokeColor = hex("#333333");
  g.lineWidth = 3;
  g.arc(0, -size * 0.25, size * 0.3, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.stroke();
  if (boss) {
    const base = size * 1.1;
    g.fillColor = hex("#ffca28");
    g.moveTo(-size * 0.45, base);
    g.lineTo(-size * 0.45, base + size * 0.4);
    g.lineTo(-size * 0.15, base + size * 0.15);
    g.lineTo(0, base + size * 0.5);
    g.lineTo(size * 0.15, base + size * 0.15);
    g.lineTo(size * 0.45, base + size * 0.4);
    g.lineTo(size * 0.45, base);
    g.close();
    g.fill();
  }
}

export class WorldScreen {
  readonly root = new Node("world");
  private mapNode = new Node("map");
  private playerNode = new Node("player");
  private playerG!: Graphics;
  private hudMoney!: Label;

  // grid state; pixel position is derived for smooth sliding
  private px = PLAYER_SPAWN.x;
  private py = PLAYER_SPAWN.y;
  private dir: Direction = "down";
  private moving = false;
  private held = new Set<Direction>();
  private buffered: Direction | null = null;

  private banner: Node | null = null; // encounter placeholder

  constructor(private state: GameState) {
    this.root.addChild(this.mapNode);
    this.mapNode.setPosition((-MAP_W * TILE) / 2, (-MAP_H * TILE) / 2, 0);

    const tiles = new Node("tiles");
    tiles.parent = this.mapNode;
    tiles.addComponent(UITransform).setContentSize(MAP_W * TILE, MAP_H * TILE);
    const g = tiles.addComponent(Graphics);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) paintTile(g, MAP[y][x], x, y);
    }

    this.playerG = this.playerNode.addComponent(Graphics);
    this.mapNode.addChild(this.playerNode);
    this.snapPlayer();
    this.buildHuds();
  }

  // --- input (routed by GameApp) ---
  pressDir(d: Direction) {
    this.held.add(d);
    this.buffered = d;
  }

  releaseDir(d: Direction) {
    this.held.delete(d);
  }

  releaseAll() {
    this.held.clear();
    this.buffered = null;
  }

  tap() {
    if (this.banner) {
      this.banner.destroy();
      this.banner = null;
    }
  }

  // --- per-frame ---
  update(dt: number) {
    if (this.banner) return; // frozen while the encounter banner is up

    if (!this.moving) {
      const d = this.firstHeld() ?? this.buffered;
      this.buffered = null;
      if (d) {
        this.dir = d;
        const [dx, dy] = DIR_DELTA[d];
        if (isWalkable(this.px + dx, this.py + dy)) {
          this.px += dx;
          this.py += dy;
          this.moving = true;
        } else {
          this.drawPlayer(); // turn to face the wall
        }
      }
    }

    if (this.moving) {
      const [tx, ty] = gridToLocal(this.px, this.py);
      const pos = this.playerNode.position;
      const step = SPEED * dt;
      const nx = approach(pos.x, tx + TILE / 2, step);
      const ny = approach(pos.y, ty + TILE / 2, step);
      this.playerNode.setPosition(nx, ny, 0);
      if (nx === tx + TILE / 2 && ny === ty + TILE / 2) {
        this.moving = false;
        this.onArrive();
      }
    }
  }

  private firstHeld(): Direction | null {
    for (const d of ["up", "down", "left", "right"] as Direction[]) {
      if (this.held.has(d)) return d;
    }
    return null;
  }

  private onArrive() {
    const t = tileAt(this.px, this.py);
    if (t === "H") {
      this.state.healTeam();
      this.refreshHud();
    } else if (t === "S") {
      this.showBanner("Shop! (coming soon)");
    } else if (t === "G" && Math.random() < ENCOUNTER_RATE) {
      const wild = Creature.fromSpecies(SPECIES[Math.floor(Math.random() * SPECIES.length)]);
      this.showBanner(`A wild ${wild.name} appeared! (battle coming soon)`);
    }
  }

  private showBanner(text: string) {
    this.releaseAll();
    const b = makePanel(this.root, 0, -240, 620, 64, { fill: PALETTE.panel, stroke: PALETTE.panelStroke });
    makeLabel(b, text, 0, 0, { fontSize: 22 });
    this.banner = b;
  }

  // --- drawing ---
  private snapPlayer() {
    const [x, y] = gridToLocal(this.px, this.py);
    this.playerNode.setPosition(x + TILE / 2, y + TILE / 2, 0);
    this.drawPlayer();
  }

  private drawPlayer() {
    const g = this.playerG;
    g.clear();
    const dir = this.dir;
    // shadow
    g.fillColor = new Color(0, 0, 0, 64);
    g.ellipse(0, -TILE / 2 + 6, 12, 5);
    g.fill();
    // body
    g.fillColor = hex("#ff6f61");
    g.roundRect(-10, -TILE / 2 + 10, 20, 20, 6);
    g.fill();
    // head
    g.fillColor = hex("#ffd9b3");
    g.circle(0, TILE / 2 - 14, 10);
    g.fill();
    // hair
    g.fillColor = hex("#6b4226");
    g.arc(0, TILE / 2 - 11, 10, Math.PI, 2 * Math.PI, false);
    g.lineTo(-10, TILE / 2 - 11);
    g.close();
    g.fill();
    // eyes (skip when facing away)
    if (dir !== "up") {
      g.fillColor = hex("#333333");
      const off = dir === "left" ? -4 : dir === "right" ? 4 : 0;
      if (dir === "down" || dir === "left") g.circle(-4 + off, TILE / 2 - 14, 1.8);
      if (dir === "down" || dir === "right") g.circle(4 + off, TILE / 2 - 14, 1.8);
      g.fill();
    }
  }

  private buildHuds() {
    // team HUD (top-left)
    const teamW = 20 + this.state.team.length * 40;
    const panel = makePanel(this.root, -460 + teamW / 2, 288, teamW, 66, {
      fill: new Color(255, 253, 245, 230),
      stroke: PALETTE.panelStroke,
      lineWidth: 3,
    });
    this.state.team.forEach((c, i) => {
      const dot = new Node(`team-${i}`);
      dot.parent = panel;
      dot.setPosition(-teamW / 2 + 30 + i * 40, 8, 0);
      const g = dot.addComponent(Graphics);
      paintCreature(g, hex(c.color), 13, c.boss);
      makeLabel(panel, `Lv.${c.level}`, -teamW / 2 + 30 + i * 40, -22, { fontSize: 12 });
    });

    // money HUD (top-right)
    const wallet = makePanel(this.root, 355, 288, 210, 40, {
      fill: new Color(255, 253, 245, 230),
      stroke: PALETTE.panelStroke,
      lineWidth: 3,
    });
    this.hudMoney = makeLabel(wallet, "", 0, 0, { fontSize: 17 });
    this.refreshHud();
  }

  private refreshHud() {
    this.hudMoney.string = `RM ${this.state.money}   🧪${this.state.bag.potion}  ⚪${this.state.bag.ball}`;
  }
}

function approach(value: number, target: number, step: number): number {
  const d = target - value;
  return Math.abs(d) <= step ? target : value + Math.sign(d) * step;
}
