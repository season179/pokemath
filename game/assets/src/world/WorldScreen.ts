// Harbor Town: a peaceful pixel-art hub with homes, NPCs, a shop, and the
// island ferry dock. Licensed Pocket Creature Tamer art is streamed from R2;
// simple Graphics fallbacks keep the town usable if art cannot load.
//
// Coordinates: the map node is centered on the canvas. Grid (x, y) with
// row 0 at the TOP maps to local pixels (x*TILE, (MAP_H-1-y)*TILE).

import {
  Color,
  Graphics,
  Label,
  Node,
  Sprite,
  SpriteFrame,
  Texture2D,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view,
} from "cc";
import {
  DIR_DELTA,
  Direction,
  HARBOR_NPCS,
  MAP,
  MAP_H,
  MAP_W,
  PLAYER_SPAWN,
  TILE,
  isWalkable,
  npcAt,
  tileAt,
} from "./map-data";
import { GameState } from "../state";
import { PALETTE, destroyChildren, makeLabel, makePanel, makeRect } from "../ui";
import { paintBagIcon } from "../ui-icons";
import { colorFromHex, paintCreature } from "../creature-art";
import { loadPixelTexture, pixelFrame } from "../remote-art";

const SPEED = 240;
const PIXEL_SCALE = 3;

const ART = {
  grass: "tilesets/grass_mix.png",
  path: "tilesets/path_01.png",
  beach: "tilesets/beach.png",
  water: "tilesets/water_anim.png",
  interiors: "enviroment/interiors/interiors.png",
  buildings: "enviroment/buildings/premade_builds.png",
  trees: "enviroment/vegetation/trees/trees.png",
  flowers: "enviroment/vegetation/flowers/flowers.png",
  player: "characters/character_01/character01-sheet.png",
} as const;

function gridToLocal(x: number, y: number): [number, number] {
  return [x * TILE, (MAP_H - 1 - y) * TILE];
}

function hex(value: string): Color {
  return colorFromHex(value);
}

function paintFallbackTile(g: Graphics, type: string, tx: number, ty: number) {
  const px = tx * TILE;
  const py = (MAP_H - 1 - ty) * TILE;

  if (type === "w") {
    g.fillColor = (tx + ty) % 2 === 0 ? hex("#7ea9d6") : hex("#749dcc");
  } else if (type === "b") {
    g.fillColor = hex("#eadca8");
  } else if (type === "d" || type === "D") {
    g.fillColor = (tx + ty) % 2 === 0 ? hex("#a66f55") : hex("#97634c");
  } else if (type === "p" || type === "H" || type === "P" || type === "S" || type === "N") {
    g.fillColor = hex("#eadfc9");
  } else {
    g.fillColor = (tx + ty) % 2 === 0 ? hex("#9fd3ae") : hex("#96cba6");
  }
  g.fillRect(px, py, TILE, TILE);

  if (type === "w") {
    g.strokeColor = new Color(220, 238, 250, 150);
    g.lineWidth = 2;
    g.moveTo(px + 6, py + 14);
    g.bezierCurveTo(px + 15, py + 19, px + 28, py + 9, px + 42, py + 15);
    g.stroke();
  } else if (type === "T") {
    g.fillColor = hex("#38785f");
    g.circle(px + 24, py + 28, 18);
    g.fill();
    g.fillColor = hex("#6b4b3e");
    g.fillRect(px + 20, py + 5, 8, 18);
  } else if (type === "N") {
    g.fillColor = hex("#d96b73");
    g.roundRect(px + 16, py + 8, 16, 22, 5);
    g.fill();
    g.fillColor = hex("#f4d6bd");
    g.circle(px + 24, py + 35, 8);
    g.fill();
  }
}

function addRawSprite(
  parent: Node,
  name: string,
  frame: SpriteFrame,
  x: number,
  y: number,
  scale: number,
  anchorX = 0.5,
  anchorY = 0.5,
): Sprite {
  const node = new Node(name);
  node.parent = parent;
  node.setPosition(x, y);
  node.setScale(scale, scale, 1);
  const transform = node.addComponent(UITransform);
  transform.setContentSize(frame.width, frame.height);
  transform.setAnchorPoint(anchorX, anchorY);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.RAW;
  sprite.spriteFrame = frame;
  return sprite;
}

export interface WorldActions {
  onShop: () => void;
  onParty: () => void;
  onBag: () => void;
}

export class WorldScreen {
  readonly root = new Node("harbor-town");
  private mapNode = new Node("map");
  private artGround = new Node("pixel-ground");
  private artScenery = new Node("pixel-scenery");
  private actors = new Node("actors");
  private companionNode = new Node("active-pet-follower");
  private companionG!: Graphics;
  private playerNode = new Node("player");
  private playerG!: Graphics;
  private playerSprite: Sprite | null = null;
  private playerFrames: Partial<Record<Direction, SpriteFrame>> = {};
  private fallbackLandmarks = new Node("fallback-landmarks");
  private hudLayer = new Node("huds");
  private locationToast: Node | null = null;

  private px: number = PLAYER_SPAWN.x;
  private py: number = PLAYER_SPAWN.y;
  private companionX: number = PLAYER_SPAWN.x;
  private companionY: number = PLAYER_SPAWN.y - 1;
  private companionTargetX: number = PLAYER_SPAWN.x;
  private companionTargetY: number = PLAYER_SPAWN.y - 1;
  private companionMoving = false;
  private dir: Direction = "down";
  private moving = false;
  private held = new Set<Direction>();
  private buffered: Direction | null = null;
  private banner: Node | null = null;

  constructor(private state: GameState, private actions: WorldActions) {
    this.root.addChild(this.mapNode);
    this.mapNode.setPosition((-MAP_W * TILE) / 2, (-MAP_H * TILE) / 2, 0);

    const tiles = new Node("fallback-tiles");
    tiles.parent = this.mapNode;
    tiles.addComponent(UITransform).setContentSize(MAP_W * TILE, MAP_H * TILE);
    const g = tiles.addComponent(Graphics);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) paintFallbackTile(g, MAP[y][x], x, y);
    }

    this.fallbackLandmarks.parent = this.mapNode;
    this.paintFallbackLandmarks();
    this.artGround.parent = this.mapNode;
    this.artScenery.parent = this.mapNode;
    this.actors.parent = this.mapNode;

    this.companionG = this.companionNode.addComponent(Graphics);
    this.actors.addChild(this.companionNode);
    this.playerG = this.playerNode.addComponent(Graphics);
    this.actors.addChild(this.playerNode);
    this.root.addChild(this.hudLayer);

    this.snapPlayer();
    this.resetCompanion();
    this.refreshHud();
    this.buildTownTitle();
    void this.loadTownArt();
  }

  pressDir(direction: Direction) {
    this.held.add(direction);
    this.buffered = direction;
  }

  releaseDir(direction: Direction) {
    this.held.delete(direction);
  }

  releaseAll() {
    this.held.clear();
    this.buffered = null;
  }

  tap() {
    if (this.banner) {
      this.banner.destroy();
      this.banner = null;
      return;
    }
    this.interactAhead();
  }

  update(dt: number) {
    if (this.banner) return;

    if (!this.moving) {
      const direction = this.firstHeld() ?? this.buffered;
      this.buffered = null;
      if (direction) {
        this.dir = direction;
        this.updatePlayerFrame();
        const [dx, dy] = DIR_DELTA[direction];
        const nextX = this.px + dx;
        const nextY = this.py + dy;
        if (isWalkable(nextX, nextY)) {
          this.beginCompanionMove(this.px, this.py);
          this.px = nextX;
          this.py = nextY;
          this.moving = true;
        } else {
          const npc = npcAt(nextX, nextY);
          if (npc) this.showNpcDialog(npc.name, npc.message);
          else this.drawPlayer();
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

    if (this.companionMoving) this.updateCompanion(dt);
  }

  private firstHeld(): Direction | null {
    for (const direction of ["up", "down", "left", "right"] as Direction[]) {
      if (this.held.has(direction)) return direction;
    }
    return null;
  }

  private interactAhead() {
    const [dx, dy] = DIR_DELTA[this.dir];
    const npc = npcAt(this.px + dx, this.py + dy);
    if (npc) this.showNpcDialog(npc.name, npc.message);
  }

  private onArrive() {
    const tile = tileAt(this.px, this.py);
    if (tile === "H") {
      this.state.healTeam();
      this.refreshHud();
      this.celebrateCompanion();
      this.showNotice("Home sweet home — your whole team is fully rested.");
    } else if (tile === "S") {
      this.releaseAll();
      this.actions.onShop();
    } else if (tile === "P") {
      this.showNotice("Professor Sum's workshop is still being prepared.");
    } else if (tile === "D") {
      this.showNotice("Next stop: Meadow Isle. The ferry route is coming soon!");
    }
  }

  private showNpcDialog(name: string, message: string) {
    this.showNotice(`${name}: ${message}`);
  }

  showNotice(text: string) {
    this.releaseAll();
    this.banner?.destroy();
    const box = makePanel(this.root, 0, -238, 720, 78, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
    });
    const label = makeLabel(box, text, 0, 0, { fontSize: 20 });
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = false;
    label.node.getComponent(UITransform)!.setContentSize(670, 54);
    box.on(Node.EventType.TOUCH_END, () => this.tap());
    this.banner = box;
  }

  private buildTownTitle() {
    this.locationToast?.destroy();
    const size = view.getDesignResolutionSize();
    const panel = makePanel(this.root, 0, size.height / 2 - 41, 220, 42, {
      fill: new Color(255, 253, 245, 232),
      stroke: PALETTE.panelStroke,
      lineWidth: 3,
    });
    this.locationToast = panel;
    makeLabel(panel, "HARBOR TOWN  ·  港湾镇", 0, 0, { fontSize: 16 });

    setTimeout(() => {
      if (!panel.isValid) return;
      const reducedMotion = typeof window !== "undefined"
        && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        panel.destroy();
        if (this.locationToast === panel) this.locationToast = null;
        return;
      }
      const opacity = panel.addComponent(UIOpacity);
      tween(opacity)
        .to(0.25, { opacity: 0 })
        .call(() => {
          if (panel.isValid) panel.destroy();
          if (this.locationToast === panel) this.locationToast = null;
        })
        .start();
    }, 1750);
  }

  private snapPlayer() {
    const [x, y] = gridToLocal(this.px, this.py);
    this.playerNode.setPosition(x + TILE / 2, y + TILE / 2, 0);
    this.drawPlayer();
  }

  private resetCompanion() {
    const [dx, dy] = DIR_DELTA[this.dir];
    const preferred = { x: this.px - dx, y: this.py - dy };
    const candidates = [
      preferred,
      { x: this.px, y: this.py + 1 },
      { x: this.px - 1, y: this.py },
      { x: this.px + 1, y: this.py },
      { x: this.px, y: this.py - 1 },
    ];
    const tile = candidates.find(({ x, y }) => isWalkable(x, y)) ?? { x: this.px, y: this.py };
    this.companionX = tile.x;
    this.companionY = tile.y;
    this.companionTargetX = tile.x;
    this.companionTargetY = tile.y;
    this.companionMoving = false;
    const [x, y] = gridToLocal(tile.x, tile.y);
    this.companionNode.setPosition(x + TILE / 2, y + TILE / 2, 0);
    this.drawCompanion();
  }

  private beginCompanionMove(targetX: number, targetY: number) {
    this.companionTargetX = targetX;
    this.companionTargetY = targetY;
    this.companionMoving = this.companionX !== targetX || this.companionY !== targetY;
  }

  private updateCompanion(dt: number) {
    const [tx, ty] = gridToLocal(this.companionTargetX, this.companionTargetY);
    const pos = this.companionNode.position;
    const step = SPEED * dt;
    const nx = approach(pos.x, tx + TILE / 2, step);
    const ny = approach(pos.y, ty + TILE / 2, step);
    this.companionNode.setPosition(nx, ny, 0);
    if (nx === tx + TILE / 2 && ny === ty + TILE / 2) {
      this.companionX = this.companionTargetX;
      this.companionY = this.companionTargetY;
      this.companionMoving = false;
    }
  }

  private drawCompanion() {
    if (!this.companionG) return;
    this.companionG.clear();
    this.companionG.fillColor = new Color(0, 0, 0, 58);
    this.companionG.ellipse(0, -15, 13, 5);
    this.companionG.fill();
    const creature = this.state.active;
    paintCreature(this.companionG, hex(creature.color), 14, creature.boss);
  }

  private celebrateCompanion() {
    this.companionNode.setScale(Vec3.ONE);
    tween(this.companionNode)
      .to(0.12, { scale: new Vec3(1.16, 1.16, 1) })
      .to(0.16, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private drawPlayer() {
    if (this.playerSprite) {
      this.updatePlayerFrame();
      return;
    }

    const g = this.playerG;
    g.clear();
    g.fillColor = new Color(0, 0, 0, 64);
    g.ellipse(0, -TILE / 2 + 6, 12, 5);
    g.fill();
    g.fillColor = hex("#d95f68");
    g.roundRect(-10, -TILE / 2 + 10, 20, 20, 6);
    g.fill();
    g.fillColor = hex("#f4d6bd");
    g.circle(0, TILE / 2 - 14, 10);
    g.fill();
    g.fillColor = hex("#553b39");
    g.arc(0, TILE / 2 - 11, 10, Math.PI, 2 * Math.PI, false);
    g.lineTo(-10, TILE / 2 - 11);
    g.close();
    g.fill();
  }

  private updatePlayerFrame() {
    if (!this.playerSprite) return;
    const frame = this.playerFrames[this.dir];
    if (frame) this.playerSprite.spriteFrame = frame;
  }

  private paintFallbackLandmarks() {
    const g = this.fallbackLandmarks.addComponent(Graphics);
    const house = (x: number, y: number, w: number, h: number, roof: string) => {
      g.fillColor = hex("#f7eee2");
      g.fillRect(x, y, w, h - 42);
      g.fillColor = hex(roof);
      g.moveTo(x - 12, y + h - 44);
      g.lineTo(x + w / 2, y + h);
      g.lineTo(x + w + 12, y + h - 44);
      g.close();
      g.fill();
      g.fillColor = hex("#8b624f");
      g.fillRect(x + w / 2 - 14, y, 28, 42);
    };
    house(38, 384, 250, 190, "#86aab0");
    house(346, 384, 300, 220, "#7987b3");
    house(662, 384, 250, 190, "#b96d78");
  }

  private async loadTownArt() {
    try {
      const [grass, path, beach, water, interiors, buildings, trees, flowers, player, ...npcSheets] =
        await Promise.all([
          loadPixelTexture(ART.grass),
          loadPixelTexture(ART.path),
          loadPixelTexture(ART.beach),
          loadPixelTexture(ART.water),
          loadPixelTexture(ART.interiors),
          loadPixelTexture(ART.buildings),
          loadPixelTexture(ART.trees),
          loadPixelTexture(ART.flowers),
          loadPixelTexture(ART.player),
          ...HARBOR_NPCS.map((npc) => loadPixelTexture(npc.characterSheet)),
        ]);
      if (!this.root.isValid) return;

      this.buildPixelGround({ grass, path, beach, water, interiors });
      this.buildPixelScenery(buildings, trees, flowers);
      this.buildNpcSprites(npcSheets);
      this.buildPlayerSprite(player);
      this.fallbackLandmarks.active = false;
    } catch (error) {
      console.error("Harbor Town art failed to load; using fallback graphics", error);
    }
  }

  private buildPixelGround(textures: {
    grass: Texture2D;
    path: Texture2D;
    beach: Texture2D;
    water: Texture2D;
    interiors: Texture2D;
  }) {
    const grass = Array.from({ length: 4 }, (_, i) => pixelFrame(textures.grass, (4 + i) * 16, 16, 16, 16));
    const path = Array.from({ length: 4 }, (_, i) => pixelFrame(textures.path, (4 + i) * 16, 16, 16, 16));
    const beach = Array.from({ length: 4 }, (_, i) => pixelFrame(textures.beach, (4 + i) * 16, 16, 16, 16));
    const water = Array.from({ length: 4 }, (_, i) => pixelFrame(textures.water, i * 16, 0, 16, 16));
    const dock = [
      pixelFrame(textures.interiors, 0, 32, 16, 16),
      pixelFrame(textures.interiors, 16, 32, 16, 16),
    ];

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = MAP[y][x];
        const variations = tile === "w"
          ? water
          : tile === "b"
            ? beach
            : tile === "d" || tile === "D"
              ? dock
              : tile === "p" || tile === "H" || tile === "P" || tile === "S" || tile === "N"
                ? path
                : grass;
        const frame = variations[(x * 7 + y * 11) % variations.length];
        const [px, py] = gridToLocal(x, y);
        addRawSprite(this.artGround, `ground-${x}-${y}`, frame, px + TILE / 2, py + TILE / 2, PIXEL_SCALE);
      }
    }
  }

  private buildPixelScenery(buildings: Texture2D, trees: Texture2D, flowers: Texture2D) {
    // trees.png packs 4 color variants per row in 32px-wide cells (16px of
    // transparent padding on each edge of the 160px sheet). Slicing 40px cells
    // at x=0 sheared each tree across its neighbour; these are the real cells.
    const treeFrames = [16, 48, 80, 112].map((x) => pixelFrame(trees, x, 16, 32, 48));
    const treePositions: Array<[number, number]> = [];
    for (let x = 0; x < MAP_W; x += 2) treePositions.push([x, 0]);
    treePositions.push(
      [0, 2], [19, 2], [0, 5], [19, 5], [0, 8], [19, 8],
      [6, 2], [1, 5], [18, 5], [2, 8], [7, 8], [13, 8], [17, 8],
    );
    treePositions.forEach(([x, y], index) => {
      const [px, py] = gridToLocal(x, y);
      addRawSprite(
        this.artScenery,
        `tree-${x}-${y}`,
        treeFrames[index % treeFrames.length],
        px + TILE / 2,
        py,
        2,
        0.5,
        0,
      );
    });

    // Buildings stay at a crisp 2× native scale. At 3× their larger atlas
    // footprints overlap, while 2× lines up with the logical collision blocks.
    const buildingSpecs = [
      { name: "home", frame: pixelFrame(buildings, 16, 32, 96, 80), x: 192 },
      { name: "workshop", frame: pixelFrame(buildings, 224, 16, 128, 112), x: 552 },
      { name: "shop", frame: pixelFrame(buildings, 16, 128, 96, 96), x: 760 },
    ];
    const [, buildingBottom] = gridToLocal(0, 4);
    for (const spec of buildingSpecs) {
      addRawSprite(this.artScenery, spec.name, spec.frame, spec.x, buildingBottom, 2, 0.5, 0);
    }

    const flowerFrames = [
      pixelFrame(flowers, 16, 16, 16, 16),
      pixelFrame(flowers, 32, 16, 16, 16),
      pixelFrame(flowers, 48, 16, 16, 16),
    ];
    const flowerPositions: Array<[number, number]> = [
      [1, 7], [2, 7], [7, 5], [8, 5], [13, 5], [14, 7], [17, 7], [18, 7],
    ];
    flowerPositions.forEach(([x, y], index) => {
      const [px, py] = gridToLocal(x, y);
      addRawSprite(
        this.artScenery,
        `flowers-${x}-${y}`,
        flowerFrames[index % flowerFrames.length],
        px + TILE / 2,
        py + TILE / 2,
        PIXEL_SCALE,
      );
    });
  }

  private buildNpcSprites(sheets: Texture2D[]) {
    HARBOR_NPCS.forEach((npc, index) => {
      const texture = sheets[index];
      if (!texture) return;
      const frame = pixelFrame(texture, 0, 0, 32, 32);
      const [px, py] = gridToLocal(npc.x, npc.y);
      addRawSprite(this.actors, `npc-${npc.name}`, frame, px + TILE / 2, py, 2, 0.5, 0);
    });
  }

  private buildPlayerSprite(texture: Texture2D) {
    // The sheet only has one horizontal-facing row (y=32) and it faces right;
    // the left frame is that same frame mirrored, not a different column (all
    // columns in the row face the same way, which left the player facing right
    // while walking left).
    const right = pixelFrame(texture, 64, 32, 32, 32);
    const left = pixelFrame(texture, 64, 32, 32, 32);
    left.flipUVX = true;
    this.playerFrames = {
      down: pixelFrame(texture, 0, 0, 32, 32),
      left,
      right,
      up: pixelFrame(texture, 0, 64, 32, 32),
    };
    const frame = this.playerFrames.down!;
    this.playerSprite = addRawSprite(this.playerNode, "player-sprite", frame, 0, -TILE / 2, 2, 0.5, 0);
    this.playerG.enabled = false;
    this.updatePlayerFrame();
  }

  private buildHuds() {
    const size = view.getDesignResolutionSize();
    const creature = this.state.active;
    const card = makePanel(
      this.hudLayer,
      -size.width / 2 + 118,
      size.height / 2 - 50,
      196,
      60,
      {
        fill: new Color(255, 253, 245, 230),
        stroke: PALETTE.actionBlue,
        lineWidth: 3,
      },
    );
    const portrait = new Node("active-pet-portrait");
    portrait.parent = card;
    portrait.setPosition(-69, -1);
    paintCreature(portrait.addComponent(Graphics), hex(creature.color), 16, creature.boss);

    const name = makeLabel(card, creature.name, -43, 15, { fontSize: 17, align: "left" });
    name.node.getComponent(UITransform)!.setContentSize(103, 22);
    name.enableWrapText = false;
    name.overflow = Label.Overflow.SHRINK;
    makeLabel(card, `Lv.${creature.level}`, 81, 15, {
      fontSize: 13,
      color: PALETTE.sub,
      align: "right",
    });

    const fraction = Math.max(0, creature.hp / creature.maxHp);
    makeLabel(card, `HP ${creature.hp}/${creature.maxHp}`, -43, -14, {
      fontSize: 11,
      color: PALETTE.sub,
      align: "left",
    });
    makeRect(card, 48, -14, 60, 9, new Color(221, 221, 221, 255), 5);
    if (fraction > 0) {
      const color = fraction > 0.5 ? PALETTE.hpHigh : fraction > 0.25 ? PALETTE.hpMid : PALETTE.hpLow;
      const width = 60 * fraction;
      makeRect(card, 18 + width / 2, -14, width, 9, color, 5);
    }
    card.on(Node.EventType.TOUCH_END, this.actions.onParty);

    const bag = makePanel(this.hudLayer, size.width / 2 - 47, size.height / 2 - 47, 54, 54, {
      fill: new Color(255, 253, 245, 230),
      stroke: PALETTE.panelStroke,
      lineWidth: 3,
    });
    const bagIcon = new Node("bag-icon");
    bagIcon.parent = bag;
    paintBagIcon(bagIcon.addComponent(Graphics), 31);
    bag.on(Node.EventType.TOUCH_END, this.actions.onBag);
  }

  refreshHud() {
    destroyChildren(this.hudLayer);
    this.buildHuds();
    this.drawCompanion();
  }

  respawnHome() {
    this.px = PLAYER_SPAWN.x;
    this.py = PLAYER_SPAWN.y;
    this.dir = "down";
    this.moving = false;
    this.releaseAll();
    this.state.activeIndex = 0;
    this.state.healTeam();
    this.snapPlayer();
    this.resetCompanion();
    this.refreshHud();
  }
}

function approach(value: number, target: number, step: number): number {
  const distance = target - value;
  return Math.abs(distance) <= step ? target : value + Math.sign(distance) * step;
}
