// WorldScreen: walks one region of the world (Harbor Town or a Meadow Isle
// area). Regions are pure data (world/regions/); this class is rendering and
// input. Licensed Pocket Creature Tamer art is streamed from R2; simple
// Graphics fallbacks keep every region usable if art cannot load.
//
// The camera follows the player, clamped to the current region's bounds.
// Coordinates: grid (x, y) with row 0 at the TOP maps to map-local pixels
// (x*TILE, (H-1-y)*TILE).

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
  NpcDef,
  RegionDef,
  TILE,
  camOffset,
  canTraverseGateway,
  gatewayAt,
  gatewayNamed,
  gatewayNotice,
  isEncounterRegion,
  isEncounterTile,
  isWalkable,
  npcAt,
  region,
  regionH,
  regionW,
  tileAt,
} from "./regions/index";
import { Creature, pickEncounter, rollEncounter } from "../../shared/index";
import { GameState } from "../state";
import { PALETTE, destroyChildren, makeButton, makeLabel, makePanel, makeRect, makeWrappedLabel } from "../ui";
import { paintBagIcon, paintMapIcon } from "../ui-icons";
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

function hex(value: string): Color {
  return colorFromHex(value);
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
  /** Sail or walk into another region, arriving through the named gateway. */
  onTravel: (regionId: string, gateway: string | null) => void;
  /** A wild encounter started on tall grass; open the battle screen. */
  onEncounter: (wild: Creature) => void;
  /** True once the reviewed question bank has loaded and battles may start. */
  encounterReady: () => boolean;
  /** Open the informational world map overlay (M key / HUD button). */
  onMap: () => void;
}

export class WorldScreen {
  readonly root: Node;
  readonly regionId: string;
  private def: RegionDef;
  private w: number;
  private h: number;

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

  private px: number;
  private py: number;
  private companionX: number;
  private companionY: number;
  private companionTargetX: number;
  private companionTargetY: number;
  private companionMoving = false;
  private dir: Direction = "down";
  private moving = false;
  private held = new Set<Direction>();
  private buffered: Direction | null = null;
  private banner: Node | null = null;
  private pendingSail: { to: string; arrive: string | null } | null = null;

  // Mini-map geometry (#30): the route is drawn once per region; only the
  // player dot moves each frame.
  private miniPlayer: Node | null = null;
  private miniScale = 1;
  private miniHalfW = 0;
  private miniHalfH = 0;

  constructor(
    private state: GameState,
    private actions: WorldActions,
    regionId = "harbor",
    entryGateway: string | null = null,
  ) {
    this.regionId = regionId;
    this.def = region(regionId);
    this.w = regionW(this.def);
    this.h = regionH(this.def);
    this.root = new Node(`world-${regionId}`);

    const arrival = this.def.spawn;
    if (entryGateway) {
      const gateway = gatewayNamed(this.def, entryGateway);
      if (!gateway?.arriveAt) {
        throw new Error(`Region ${regionId} has no arrival gateway named "${entryGateway}"`);
      }
      this.px = gateway.arriveAt.x;
      this.py = gateway.arriveAt.y;
    } else {
      this.px = arrival.x;
      this.py = arrival.y;
    }
    this.companionX = this.px;
    this.companionY = this.py + 1;
    this.companionTargetX = this.companionX;
    this.companionTargetY = this.companionY;

    this.root.addChild(this.mapNode);

    const tiles = new Node("fallback-tiles");
    tiles.parent = this.mapNode;
    tiles.addComponent(UITransform).setContentSize(this.w * TILE, this.h * TILE);
    const g = tiles.addComponent(Graphics);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) this.paintFallbackTile(g, tileAt(this.def, x, y), x, y);
    }

    this.fallbackLandmarks.parent = this.mapNode;
    if (this.def.art === "harbor") this.paintFallbackLandmarks();
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
    this.buildRegionTitle();
    this.applyCamera();
    if (this.def.art === "harbor") void this.loadHarborArt();
    else void this.loadMeadowArt();
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
      if (this.pendingSail) {
        // Keyboard path: Space/Enter confirms the primary action ("Go").
        const sail = this.pendingSail;
        this.pendingSail = null;
        this.actions.onTravel(sail.to, sail.arrive);
      }
      return;
    }
    this.interactAhead();
  }

  update(dt: number) {
    this.updateMiniPlayer();
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
        if (isWalkable(this.def, nextX, nextY)) {
          this.beginCompanionMove(this.px, this.py);
          this.px = nextX;
          this.py = nextY;
          this.moving = true;
        } else {
          const npc = npcAt(this.def, nextX, nextY);
          if (npc) this.showNpcDialog(npc);
          else this.drawPlayer();
        }
      }
    }

    if (this.moving) {
      const [tx, ty] = this.gridToLocal(this.px, this.py);
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
    this.applyCamera();
  }

  private applyCamera() {
    const size = view.getVisibleSize();
    const pos = this.playerNode.position;
    this.mapNode.setPosition(
      camOffset(pos.x, this.w * TILE, size.width),
      camOffset(pos.y, this.h * TILE, size.height),
      0,
    );
  }

  private gridToLocal(x: number, y: number): [number, number] {
    return [x * TILE, (this.h - 1 - y) * TILE];
  }

  private firstHeld(): Direction | null {
    for (const direction of ["up", "down", "left", "right"] as Direction[]) {
      if (this.held.has(direction)) return direction;
    }
    return null;
  }

  private interactAhead() {
    const [dx, dy] = DIR_DELTA[this.dir];
    const npc = npcAt(this.def, this.px + dx, this.py + dy);
    if (npc) this.showNpcDialog(npc);
  }

  private onArrive() {
    const gateway = gatewayAt(this.def, this.px, this.py);
    if (gateway) {
      // Pocket gateways (reserved lots) and preview-sealed gateways both fall
      // through to their notice; only gateways whose target is currently open
      // actually travel. See regions/index.ts canTraverseGateway (issue #29).
      if (canTraverseGateway(gateway)) {
        this.releaseAll();
        this.actions.onTravel(gateway.to!, gateway.toGateway ?? null);
      } else {
        this.showNotice(gatewayNotice(gateway));
      }
      return;
    }

    const handler = this.def.handlers?.[tileAt(this.def, this.px, this.py)];
    if (handler === "heal") {
      this.state.healTeam();
      this.refreshHud();
      this.celebrateCompanion();
      this.showNotice("Home sweet home — your whole team is fully rested.");
    } else if (handler === "shop") {
      this.releaseAll();
      this.actions.onShop();
    } else if (handler === "workshop") {
      this.showNotice("Professor Sum's workshop is still being prepared.");
    }

    // Wild encounters: only in an encounter-capable region (#29 preview gate)
    // and only on tall-grass tiles, and only once the reviewed question bank
    // has loaded. A fresh level-1, non-boss creature of the rarity-weighted
    // species starts the battle.
    if (
      this.def.encounters &&
      isEncounterRegion(this.regionId) &&
      isEncounterTile(this.def, this.px, this.py) &&
      this.actions.encounterReady() &&
      rollEncounter(this.def.encounters.rate)
    ) {
      const species = pickEncounter(this.def.encounters.entries);
      this.releaseAll();
      this.actions.onEncounter(Creature.fromSpecies(species));
    }
  }

  private showNpcDialog(npc: NpcDef) {
    if (npc.sailTo) {
      this.showTravelDialog(npc);
      return;
    }
    this.showNotice(`${npc.name}: ${npc.message}`);
  }

  // Travel NPCs offer an explicit choice: bumping the captain or a guide
  // must never teleport the player by itself.
  private showTravelDialog(npc: NpcDef) {
    this.releaseAll();
    this.pendingSail = null;
    this.banner?.destroy();
    const box = makePanel(this.root, 0, -226, 720, 104, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
    });
    makeWrappedLabel(box, `${npc.name}: ${npc.message}`, -170, 0, 420, 74, {
      fontSize: 18,
      lineHeight: 23,
    });
    const sail = { to: npc.sailTo!, arrive: npc.sailArrive ?? null };
    makeButton(box, {
      x: 218,
      y: 0,
      w: 118,
      h: 50,
      label: "Go! 走吧",
      color: PALETTE.actionBlue,
      fontSize: 19,
      onTap: () => {
        this.banner?.destroy();
        this.banner = null;
        this.pendingSail = null;
        this.actions.onTravel(sail.to, sail.arrive);
      },
    });
    makeButton(box, {
      x: 332,
      y: 0,
      w: 52,
      h: 50,
      label: "✕",
      color: new Color(144, 164, 174, 255),
      fontSize: 19,
      onTap: () => {
        this.banner?.destroy();
        this.banner = null;
        this.pendingSail = null;
      },
    });
    // Space/Enter (tap) confirms "Go"; touch players can always decline.
    this.pendingSail = sail;
    this.banner = box;
  }

  showNotice(text: string) {
    this.releaseAll();
    this.pendingSail = null;
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

  private buildRegionTitle() {
    this.locationToast?.destroy();
    const size = view.getVisibleSize();
    const panel = makePanel(this.root, 0, size.height / 2 - 41, 360, 42, {
      fill: new Color(255, 253, 245, 232),
      stroke: PALETTE.panelStroke,
      lineWidth: 3,
    });
    this.locationToast = panel;
    makeLabel(panel, this.def.title, 0, 0, { fontSize: 16 });

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
    const [x, y] = this.gridToLocal(this.px, this.py);
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
    const tile = candidates.find(({ x, y }) => isWalkable(this.def, x, y)) ?? { x: this.px, y: this.py };
    this.companionX = tile.x;
    this.companionY = tile.y;
    this.companionTargetX = tile.x;
    this.companionTargetY = tile.y;
    this.companionMoving = false;
    const [x, y] = this.gridToLocal(tile.x, tile.y);
    this.companionNode.setPosition(x + TILE / 2, y + TILE / 2, 0);
    this.drawCompanion();
  }

  private beginCompanionMove(targetX: number, targetY: number) {
    this.companionTargetX = targetX;
    this.companionTargetY = targetY;
    this.companionMoving = this.companionX !== targetX || this.companionY !== targetY;
  }

  private updateCompanion(dt: number) {
    const [tx, ty] = this.gridToLocal(this.companionTargetX, this.companionTargetY);
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

  // --- fallback rendering (region-agnostic) ---

  private paintFallbackTile(g: Graphics, type: string, tx: number, ty: number) {
    const px = tx * TILE;
    const py = (this.h - 1 - ty) * TILE;

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
    } else if (type === "X") {
      // Fence / wall block (Meadow pens, barn, stalls).
      g.fillColor = hex("#b08968");
      g.fillRect(px + 4, py + 10, 6, 28);
      g.fillRect(px + 38, py + 10, 6, 28);
      g.fillRect(px, py + 16, TILE, 6);
      g.fillRect(px, py + 30, TILE, 6);
    } else if (type === "o") {
      g.fillColor = hex("#9a9a94");
      g.ellipse(px + 24, py + 22, 16, 12);
      g.fill();
      g.fillColor = hex("#b5b5ad");
      g.ellipse(px + 20, py + 26, 8, 5);
      g.fill();
    } else if (type === "C") {
      g.fillColor = hex("#6b4b3e");
      g.fillRect(px + 21, py + 6, 6, 24);
      g.fillColor = hex("#fffdf5");
      g.circle(px + 24, py + 34, 10);
      g.fill();
      g.strokeColor = hex("#3b4a6b");
      g.lineWidth = 2;
      g.circle(px + 24, py + 34, 10);
      g.stroke();
      g.moveTo(px + 24, py + 34);
      g.lineTo(px + 24, py + 40);
      g.moveTo(px + 24, py + 34);
      g.lineTo(px + 29, py + 34);
      g.stroke();
    } else if (type === "g") {
      // Tall grass (encounter zone): a darker, tufted patch distinct from
      // the short walkable grass so kids can see where monsters hide.
      g.fillColor = (tx + ty) % 2 === 0 ? hex("#5fa676") : hex("#579e6e");
      g.fillRect(px, py, TILE, TILE);
      this.paintGrassBlades(g, px, py);
    } else if (type === "f") {
      g.fillColor = hex("#e989a6");
      g.circle(px + 14, py + 18, 5);
      g.circle(px + 30, py + 30, 5);
      g.fill();
      g.fillColor = hex("#f7d54d");
      g.circle(px + 32, py + 14, 4);
      g.circle(px + 16, py + 32, 4);
      g.fill();
    } else if (type === "N") {
      g.fillColor = hex("#d96b73");
      g.roundRect(px + 16, py + 8, 16, 22, 5);
      g.fill();
      g.fillColor = hex("#f4d6bd");
      g.circle(px + 24, py + 35, 8);
      g.fill();
    }
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

  // --- pixel art ---

  private async loadHarborArt() {
    try {
      const [grass, path, beach, water, interiors, buildings, trees, flowers, player] =
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
        ]);
      if (!this.root.isValid) return;

      this.buildPixelGround({ grass, path, beach, water, interiors });
      this.buildHarborScenery(buildings, trees, flowers);
      this.buildPlayerSprite(player);
      this.fallbackLandmarks.active = false;
      await this.attachNpcSprites();
    } catch (error) {
      console.error("Harbor Town world art failed to load; using fallback graphics", error);
    }
  }

  private async loadMeadowArt() {
    try {
      const [grass, path, beach, water, interiors, trees, flowers, player] =
        await Promise.all([
          loadPixelTexture(ART.grass),
          loadPixelTexture(ART.path),
          loadPixelTexture(ART.beach),
          loadPixelTexture(ART.water),
          loadPixelTexture(ART.interiors),
          loadPixelTexture(ART.trees),
          loadPixelTexture(ART.flowers),
          loadPixelTexture(ART.player),
        ]);
      if (!this.root.isValid) return;

      this.buildPixelGround({ grass, path, beach, water, interiors });
      this.buildMeadowScenery(trees, flowers);
      this.buildPlayerSprite(player);
      await this.attachNpcSprites();
    } catch (error) {
      console.error(`${this.regionId} world art failed to load; using fallback graphics`, error);
    }
  }

  /**
   * Load and attach NPC sprites independently of the core world art. NPC sheets
   * are optional dressing: a single missing sheet must only degrade that one
   * NPC (to a flat fallback actor), never reject the region's whole art load
   * and force terrain, scenery, and the player back to flat fallback graphics.
   *
   * Route travel can destroy this screen while sheets are still loading, so
   * the scene graph is only touched after re-checking this.root.isValid.
   */
  private async attachNpcSprites() {
    const results = await Promise.allSettled(
      this.def.npcs.map((npc) => loadPixelTexture(npc.characterSheet)),
    );
    if (!this.root.isValid) return; // travel may destroy this screen mid-load
    const sheets = results.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const npc = this.def.npcs[index];
      console.warn(
        `NPC sprite for ${npc.name} in ${this.regionId} did not load; using a flat fallback`,
        result.reason,
      );
      return null;
    });
    this.buildNpcSprites(sheets);
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

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const tile = tileAt(this.def, x, y);
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
        const [px, py] = this.gridToLocal(x, y);
        addRawSprite(this.artGround, `ground-${x}-${y}`, frame, px + TILE / 2, py + TILE / 2, PIXEL_SCALE);
      }
    }
  }

  private buildMeadowScenery(trees: Texture2D, flowers: Texture2D) {
    const treeFrames = [16, 48, 80, 112].map((x) => pixelFrame(trees, x, 16, 32, 48));
    const flowerFrames = [
      pixelFrame(flowers, 16, 16, 16, 16),
      pixelFrame(flowers, 32, 16, 16, 16),
      pixelFrame(flowers, 48, 16, 16, 16),
    ];

    let treeIndex = 0;
    let flowerIndex = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const tile = tileAt(this.def, x, y);
        const [px, py] = this.gridToLocal(x, y);
        if (tile === "T") {
          addRawSprite(
            this.artScenery,
            `tree-${x}-${y}`,
            treeFrames[treeIndex++ % treeFrames.length],
            px + TILE / 2,
            py,
            2,
            0.5,
            0,
          );
        } else if (tile === "f") {
          addRawSprite(
            this.artScenery,
            `flowers-${x}-${y}`,
            flowerFrames[flowerIndex++ % flowerFrames.length],
            px + TILE / 2,
            py + TILE / 2,
            PIXEL_SCALE,
          );
        }
      }
    }

    // Fences, stones, and the clock post block movement, so they must stay
    // visible after the opaque pixel ground covers their fallback tiles.
    const props = new Node("meadow-props");
    props.parent = this.artScenery;
    props.addComponent(UITransform).setContentSize(this.w * TILE, this.h * TILE);
    const g = props.addComponent(Graphics);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const tile = tileAt(this.def, x, y);
        if (tile === "X" || tile === "o" || tile === "C" || tile === "g") this.paintProp(g, tile, x, y);
      }
    }
  }

  private paintProp(g: Graphics, type: string, tx: number, ty: number) {
    const px = tx * TILE;
    const py = (this.h - 1 - ty) * TILE;
    if (type === "X") {
      g.fillColor = hex("#b08968");
      g.fillRect(px + 4, py + 10, 6, 28);
      g.fillRect(px + 38, py + 10, 6, 28);
      g.fillRect(px, py + 16, TILE, 6);
      g.fillRect(px, py + 30, TILE, 6);
    } else if (type === "o") {
      g.fillColor = hex("#9a9a94");
      g.ellipse(px + 24, py + 22, 16, 12);
      g.fill();
      g.fillColor = hex("#b5b5ad");
      g.ellipse(px + 20, py + 26, 8, 5);
      g.fill();
    } else if (type === "g") {
      // Over the pixel-textured grass, tall grass is just blade tufts.
      this.paintGrassBlades(g, px, py);
    } else {
      g.fillColor = hex("#6b4b3e");
      g.fillRect(px + 21, py + 6, 6, 24);
      g.fillColor = hex("#fffdf5");
      g.circle(px + 24, py + 34, 10);
      g.fill();
      g.strokeColor = hex("#3b4a6b");
      g.lineWidth = 2;
      g.circle(px + 24, py + 34, 10);
      g.stroke();
      g.moveTo(px + 24, py + 34);
      g.lineTo(px + 24, py + 40);
      g.moveTo(px + 24, py + 34);
      g.lineTo(px + 29, py + 34);
      g.stroke();
    }
  }

  private paintGrassBlades(g: Graphics, px: number, py: number): void {
    g.strokeColor = hex("#3f8a5c");
    g.lineWidth = 2;
    const blades: Array<[number, number]> = [
      [10, 12], [22, 8], [34, 14], [16, 26], [30, 30],
    ];
    for (const [bx, by] of blades) {
      g.moveTo(px + bx, py + by);
      g.lineTo(px + bx + 2, py + by + 10);
      g.stroke();
    }
  }

  private buildHarborScenery(buildings: Texture2D, trees: Texture2D, flowers: Texture2D) {
    // trees.png packs 4 color variants per row in 32px-wide cells (16px of
    // transparent padding on each edge of the 160px sheet). Slicing 40px cells
    // at x=0 sheared each tree across its neighbour; these are the real cells.
    const treeFrames = [16, 48, 80, 112].map((x) => pixelFrame(trees, x, 16, 32, 48));
    const treePositions: Array<[number, number]> = [];
    for (let x = 0; x < this.w; x += 2) treePositions.push([x, 0]);
    treePositions.push(
      [0, 2], [19, 2], [0, 5], [19, 5], [0, 8], [19, 8],
      [6, 2], [1, 5], [18, 5], [2, 8], [7, 8], [13, 8], [17, 8],
    );
    treePositions.forEach(([x, y], index) => {
      const [px, py] = this.gridToLocal(x, y);
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
    const [, buildingBottom] = this.gridToLocal(0, 4);
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
      const [px, py] = this.gridToLocal(x, y);
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

  private buildNpcSprites(sheets: (Texture2D | null)[]) {
    this.def.npcs.forEach((npc, index) => {
      const [px, py] = this.gridToLocal(npc.x, npc.y);
      const texture = sheets[index];
      if (texture) {
        const frame = pixelFrame(texture, 0, 0, 32, 32);
        addRawSprite(this.actors, `npc-${npc.name}`, frame, px + TILE / 2, py, 2, 0.5, 0);
        return;
      }
      this.paintNpcFallback(npc, px, py);
    });
  }

  // A spriteless stand-in for an NPC whose licensed sheet could not load. A
  // single missing texture must degrade only that NPC to a recognisable flat
  // actor — never blank the tile. The opaque pixel ground covers the fallback
  // "N" figure drawn in the constructor, so without this the talk target
  // would vanish even though the dialog still triggers on bump.
  private paintNpcFallback(npc: NpcDef, px: number, py: number) {
    const node = new Node(`npc-fallback-${npc.name}`);
    node.parent = this.actors;
    node.setPosition(px + TILE / 2, py, 0);
    const g = node.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 58);
    g.ellipse(0, 4, 12, 5);
    g.fill();
    g.fillColor = hex("#d96b73");
    g.roundRect(-8, 8, 16, 22, 5);
    g.fill();
    g.fillColor = hex("#f4d6bd");
    g.circle(0, 35, 8);
    g.fill();
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

  // --- HUD ---

  private buildHuds() {
    const size = view.getVisibleSize();
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
    bagIcon.setPosition(0, 4);
    paintBagIcon(bagIcon.addComponent(Graphics), 31);
    makeLabel(bag, "Bag [B]", 0, -17, { fontSize: 9, color: PALETTE.sub });
    bag.on(Node.EventType.TOUCH_END, this.actions.onBag);

    // Visible desktop control that opens the world map (#30). The M key is
    // the keyboard equivalent, routed by GameApp.
    const mapBtn = makePanel(
      this.hudLayer,
      size.width / 2 - 107,
      size.height / 2 - 47,
      54,
      54,
      {
        fill: new Color(255, 253, 245, 230),
        stroke: PALETTE.panelStroke,
        lineWidth: 3,
      },
    );
    const mapIcon = new Node("map-icon");
    mapIcon.parent = mapBtn;
    mapIcon.setPosition(0, 4);
    paintMapIcon(mapIcon.addComponent(Graphics), 30);
    makeLabel(mapBtn, "Map [M]", 0, -17, { fontSize: 9, color: PALETTE.sub });
    mapBtn.on(Node.EventType.TOUCH_END, this.actions.onMap);

    this.buildMiniMap();
  }

  // --- mini-map (#30) ---

  /**
   * Compact local map in the bottom-left HUD corner. Pure view of the current
   * region: walkable route shape, exits (green = open, amber = preview-sealed,
   * grey = reserved pocket), the ferry captain, and a live player dot. It never
   * overlaps the creature card (top-left) or the bag/map buttons (top-right).
   */
  private buildMiniMap() {
    const size = view.getVisibleSize();
    const MW = 176;
    const MH = 152;
    const panel = makePanel(
      this.hudLayer,
      -size.width / 2 + MW / 2 + 14,
      -size.height / 2 + MH / 2 + 14,
      MW,
      MH,
      { fill: new Color(255, 253, 245, 218), stroke: PALETTE.panelStroke, lineWidth: 3 },
    );
    const title = makeLabel(panel, this.def.title, 0, MH / 2 - 12, { fontSize: 11 });
    title.horizontalAlign = Label.HorizontalAlign.CENTER;
    title.overflow = Label.Overflow.SHRINK;
    title.node.getComponent(UITransform)!.setContentSize(MW - 16, 16);

    const innerW = MW - 24;
    const innerH = MH - 50; // leaves room for the title and the legend footer
    const scale = Math.min(innerW / (this.w * TILE), innerH / (this.h * TILE));
    this.miniScale = scale;
    this.miniHalfW = (this.w * TILE) / 2;
    this.miniHalfH = (this.h * TILE) / 2;

    const field = new Node("mini-field");
    field.parent = panel;
    field.setPosition(0, 8);
    field.addComponent(UITransform).setContentSize(innerW, innerH);
    const g = field.addComponent(Graphics);

    const tileMini = (tx: number, ty: number): [number, number] => {
      const mapPxX = tx * TILE + TILE / 2;
      const mapPxY = (this.h - 1 - ty) * TILE + TILE / 2;
      return [(mapPxX - this.miniHalfW) * scale, (mapPxY - this.miniHalfH) * scale];
    };

    const tile = TILE * scale * 0.92;
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        if (!isWalkable(this.def, tx, ty)) continue;
        const ch = tileAt(this.def, tx, ty);
        const [mx, my] = tileMini(tx, ty);
        g.fillColor = "pHPSNdD".includes(ch)
          ? new Color(234, 223, 201, 255)
          : new Color(207, 232, 212, 255);
        g.rect(mx - tile / 2, my - tile / 2, tile, tile);
        g.fill();
      }
    }

    // Exits: filled dots for open routes and the ferry; hollow rings for
    // sealed gateways and reserved pockets, so a glance tells go-vs-locked.
    for (const gateway of this.def.gateways) {
      for (const t of gateway.tiles) {
        const [mx, my] = tileMini(t.x, t.y);
        if (gateway.to === null) this.miniRing(g, mx, my, 3.4, new Color(150, 150, 150, 255));
        else if (canTraverseGateway(gateway)) this.miniDot(g, mx, my, 3.6, PALETTE.good);
        else this.miniRing(g, mx, my, 3.6, new Color(255, 167, 38, 255));
      }
    }
    for (const npc of this.def.npcs) {
      if (npc.sailKind !== "ferry") continue;
      const [mx, my] = tileMini(npc.x, npc.y);
      this.miniDot(g, mx, my, 3.8, PALETTE.actionBlue);
    }

    // Player marker: white core with a dark outline — distinct from every
    // exit (the ferry is a filled blue dot, so this avoids blue-on-blue).
    const player = new Node("mini-player");
    player.parent = field;
    const pg = player.addComponent(Graphics);
    pg.fillColor = new Color(255, 255, 255, 255);
    pg.strokeColor = PALETTE.ink;
    pg.lineWidth = 1.6;
    pg.circle(0, 0, 4.4);
    pg.fill();
    pg.stroke();
    this.miniPlayer = player;
    this.updateMiniPlayer();

    this.buildMiniLegend(panel, MW, MH);
  }

  private miniDot(g: Graphics, x: number, y: number, r: number, color: Color) {
    g.fillColor = new Color(255, 255, 255, 255);
    g.circle(x, y, r + 1.4);
    g.fill();
    g.fillColor = color;
    g.circle(x, y, r);
    g.fill();
  }

  /** A hollow ring — used for sealed/pocket exits so they read as unavailable. */
  private miniRing(g: Graphics, x: number, y: number, r: number, color: Color) {
    g.fillColor = new Color(255, 253, 245, 255);
    g.strokeColor = color;
    g.lineWidth = 1.8;
    g.circle(x, y, r);
    g.fill();
    g.stroke();
  }

  /** Compact footer key so the mini-map dots are self-explanatory. */
  private buildMiniLegend(panel: Node, MW: number, MH: number) {
    const ink = PALETTE.ink;
    const items: Array<{ draw: (g: Graphics) => void; label: string }> = [
      {
        draw: (g) => {
          g.fillColor = new Color(255, 255, 255, 255);
          g.strokeColor = ink;
          g.lineWidth = 1.4;
          g.circle(0, 0, 3.6);
          g.fill();
          g.stroke();
        },
        label: "You",
      },
      { draw: (g) => this.miniDot(g, 0, 0, 3.2, PALETTE.good), label: "Go" },
      { draw: (g) => this.miniRing(g, 0, 0, 3.2, new Color(255, 167, 38, 255)), label: "Lock" },
      { draw: (g) => this.miniDot(g, 0, 0, 3.2, PALETTE.actionBlue), label: "Ferry" },
    ];
    const slot = (MW - 12) / items.length;
    const baseX = -MW / 2 + 6;
    const y = -MH / 2 + 11;
    items.forEach((item, i) => {
      const cx = baseX + slot * (i + 0.5);
      const dot = new Node("legend-dot");
      dot.parent = panel;
      dot.setPosition(cx - 14, y);
      item.draw(dot.addComponent(Graphics));
      makeLabel(panel, item.label, cx - 6, y, { fontSize: 8, color: PALETTE.sub, align: "left" });
    });
  }

  private updateMiniPlayer() {
    if (!this.miniPlayer) return;
    const pos = this.playerNode.position;
    this.miniPlayer.setPosition(
      (pos.x - this.miniHalfW) * this.miniScale,
      (pos.y - this.miniHalfH) * this.miniScale,
      0,
    );
  }

  refreshHud() {
    destroyChildren(this.hudLayer);
    this.buildHuds();
    this.drawCompanion();
  }

  refreshLayout() {
    this.refreshHud();
    this.applyCamera();
    if (this.locationToast?.isValid) {
      const size = view.getVisibleSize();
      this.locationToast.setPosition(0, size.height / 2 - 41);
    }
  }

  respawnHome() {
    const spawn = this.def.spawn;
    this.px = spawn.x;
    this.py = spawn.y;
    this.dir = "down";
    this.moving = false;
    this.releaseAll();
    this.state.activeIndex = 0;
    this.state.healTeam();
    this.snapPlayer();
    this.resetCompanion();
    this.refreshHud();
    this.applyCamera();
  }
}

function approach(value: number, target: number, step: number): number {
  const distance = target - value;
  return Math.abs(distance) <= step ? target : value + Math.sign(distance) * step;
}
