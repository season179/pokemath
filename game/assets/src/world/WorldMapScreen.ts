// WorldMapScreen: a read-only informational world map (#30). It is NOT fast
// travel — no node teleports the player. Tapping a place only shows a caption.
//
// Nodes, connections, labels, and lock state all derive from the pure
// world-map graph (./world-map), which in turn derives them from the region
// registry and the open/encounter scope helpers — so this screen owns no
// geography of its own. Opening it is the job of GameApp (the M key or a
// mini-map tap); this screen renders itself and signals close via onBack.

import { Color, EventKeyboard, Graphics, KeyCode, Label, Node, UITransform } from "cc";
import { PALETTE, makeButton, makeLabel, makePanel, makeRect } from "../ui";
import { MapNode, worldMapEdges, worldMapNodes } from "./graph/world-map";

const FIELD_W = 660;
const FIELD_H = 286;
// Asymmetric padding: extra bottom room keeps the lowest node's label clear
// of the legend beneath the field.
const FIELD_PAD_X = 34;
const FIELD_PAD_TOP = 30;
const FIELD_PAD_BOTTOM = 64;
const NODE_R = 17;

const COLOR = {
  hub: new Color(255, 183, 77, 255), // gold — peaceful home town
  transit: new Color(77, 182, 172, 255), // teal — open but never a monster area
  monsterOpen: new Color(102, 187, 106, 255), // green — wild creatures here
  monsterLocked: new Color(158, 158, 158, 255), // gray — sealed ordinary area
  guardian: new Color(92, 107, 192, 255), // indigo — boss ground (sealed)
  edgeWalk: new Color(176, 192, 214, 255),
  edgeFerry: new Color(66, 165, 245, 255),
  sub: new Color(102, 102, 119, 255),
} as const;

function nodeFill(node: MapNode): Color {
  if (!node.open) return node.role === "guardian" ? COLOR.guardian : COLOR.monsterLocked;
  switch (node.role) {
    case "hub":
      return COLOR.hub;
    case "transit":
      return COLOR.transit;
    default:
      return COLOR.monsterOpen;
  }
}

/** Bilingual status line for a tapped (or current) node. */
function captionFor(node: MapNode, current: boolean): string {
  if (current) return `${node.title}  ·  You are here!  你在这里！`;
  if (!node.open) {
    return node.role === "guardian"
      ? `${node.title}  ·  Guardian ground — sealed for now.  守护之地——暂未开启。`
      : `${node.title}  ·  Opens in a later update.  稍后开放。`;
  }
  switch (node.role) {
    case "hub":
      return `${node.title}  ·  Home base — heal and shop.  家园——休整与商店。`;
    case "transit":
      return `${node.title}  ·  Open transit — no wild creatures.  通道——没有野生生物。`;
    default:
      return `${node.title}  ·  Open — wild creatures about!  开放——野外出没！`;
  }
}

export class WorldMapScreen {
  readonly root = new Node("world-map");
  private field = new Node("map-field");
  private captionText!: Label;
  private selected: string | null;

  constructor(
    private currentRegionId: string,
    private onBack: () => void,
  ) {
    this.selected = currentRegionId;
    this.render();
  }

  handleKeyDown(e: EventKeyboard): void {
    // M and Escape both close (issue #30). GameApp routes these here while the
    // map screen is active.
    if (e.keyCode === KeyCode.KEY_M || e.keyCode === KeyCode.ESCAPE) this.onBack();
  }

  private render(): void {
    makeRect(this.root, 0, 0, 960, 640, new Color(224, 232, 244, 255));
    const card = makePanel(this.root, 0, 24, 860, 524, {
      fill: PALETTE.panel,
      stroke: PALETTE.panelStroke,
      radius: 18,
      lineWidth: 5,
    });

    makeLabel(card, "World Map  ·  世界地图", 0, 222, { fontSize: 30 });
    makeLabel(
      card,
      "Informational — explore on foot or by ferry.  仅供参考，步行或乘船探索。",
      0,
      190,
      { fontSize: 14, color: COLOR.sub },
    );

    this.field.parent = card;
    this.field.setPosition(0, 36);
    this.field.addComponent(UITransform).setContentSize(FIELD_W, FIELD_H);
    this.drawMap();

    // Legend.
    const legend = makePanel(card, 0, -128, 760, 44, {
      fill: new Color(247, 243, 232, 255),
      radius: 10,
    });
    const items: Array<[Color, string]> = [
      [COLOR.hub, "Home 家园"],
      [COLOR.transit, "Transit 通道"],
      [COLOR.monsterOpen, "Open 开放"],
      [COLOR.monsterLocked, "Locked 锁定"],
      [COLOR.guardian, "Guardian 守护"],
    ];
    const slot = 696 / items.length;
    items.forEach(([color, text], i) => {
      const cx = -348 + slot * (i + 0.5);
      paintDot(legend, cx - 52, 0, 7, color);
      makeLabel(legend, text, cx - 38, 0, { fontSize: 13, align: "left" });
    });
    makeLabel(card, "—— Walk 步行        ┄┄ Ferry 渡船", 0, -164, {
      fontSize: 13,
      color: COLOR.sub,
    });

    // Caption (updates on tap; informational only).
    const caption = makePanel(card, 0, -206, 796, 56, {
      fill: new Color(237, 246, 255, 255),
      stroke: PALETTE.actionBlue,
      radius: 12,
      lineWidth: 3,
    });
    this.captionText = makeLabel(caption, "", 0, 0, { fontSize: 15 });
    this.captionText.horizontalAlign = Label.HorizontalAlign.CENTER;
    this.captionText.overflow = Label.Overflow.SHRINK;
    this.captionText.enableWrapText = true;
    this.captionText.node.getComponent(UITransform)!.setContentSize(762, 40);
    this.applyCaption();

    makeButton(this.root, {
      x: 0,
      y: -276,
      w: 200,
      h: 54,
      label: "Close 关闭  (M / Esc)",
      color: new Color(144, 164, 174, 255),
      fontSize: 18,
      onTap: this.onBack,
    });
  }

  private drawMap() {
    const nodes = worldMapNodes();
    const edges = worldMapEdges();
    const project = this.makeProjector(nodes);

    // Edges first so nodes sit on top.
    const edgeG = this.field.addComponent(Graphics);
    for (const edge of edges) {
      const a = nodes.find((n) => n.id === edge.a);
      const b = nodes.find((n) => n.id === edge.b);
      if (!a || !b) continue;
      const [ax, ay] = project(a.position.x, a.position.y);
      const [bx, by] = project(b.position.x, b.position.y);
      if (edge.kind === "ferry") {
        edgeG.strokeColor = COLOR.edgeFerry;
        edgeG.lineWidth = 3;
        dashedLine(edgeG, ax, ay, bx, by, 9, 7);
      } else {
        edgeG.strokeColor = COLOR.edgeWalk;
        edgeG.lineWidth = 4;
        edgeG.moveTo(ax, ay);
        edgeG.lineTo(bx, by);
        edgeG.stroke();
      }
    }

    for (const node of nodes) {
      this.makeNode(node, project);
    }
  }

  /** Maps abstract map units (x right, y up) into field-local pixels. */
  private makeProjector(nodes: MapNode[]): (x: number, y: number) => [number, number] {
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const left = -FIELD_W / 2 + FIELD_PAD_X;
    const bottom = -FIELD_H / 2 + FIELD_PAD_BOTTOM;
    const innerW = FIELD_W - 2 * FIELD_PAD_X;
    const innerH = FIELD_H - FIELD_PAD_TOP - FIELD_PAD_BOTTOM;
    return (x, y) => [
      left + ((x - minX) / spanX) * innerW,
      bottom + ((y - minY) / spanY) * innerH,
    ];
  }

  private makeNode(node: MapNode, project: (x: number, y: number) => [number, number]) {
    const [px, py] = project(node.position.x, node.position.y);
    const current = node.id === this.currentRegionId;

    // Tappable hit target — the whole node (art + label) lives under it.
    const hit = new Node(`node-${node.id}`);
    hit.parent = this.field;
    hit.setPosition(px, py);
    hit.addComponent(UITransform).setContentSize(NODE_R * 2 + 12, NODE_R * 2 + 12);

    const g = hit.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 38);
    g.ellipse(0, -NODE_R - 1, NODE_R - 2, 5);
    g.fill();
    g.fillColor = nodeFill(node);
    g.strokeColor = current ? PALETTE.actionBlue : new Color(255, 255, 255, 220);
    g.lineWidth = current ? 5 : 3;
    g.circle(0, 0, NODE_R);
    g.fill();
    g.stroke();
    if (current) {
      g.strokeColor = PALETTE.actionBlue;
      g.lineWidth = 2;
      g.circle(0, 0, NODE_R + 7);
      g.stroke();
    }
    if (!node.open) paintLock(g, NODE_R * 0.62);
    else if (node.role === "hub") paintHome(g, NODE_R * 0.6);

    const label = makeLabel(hit, node.title, 0, -NODE_R - 16, { fontSize: 12 });
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.lineHeight = 14;
    label.node.getComponent(UITransform)!.setContentSize(150, 30);

    hit.on(Node.EventType.TOUCH_END, () => {
      this.selected = node.id;
      this.applyCaption();
    });
  }

  private applyCaption() {
    const node = worldMapNodes().find((n) => n.id === this.selected);
    this.captionText.string = node ? captionFor(node, node.id === this.currentRegionId) : "";
  }
}

function paintDot(parent: Node, x: number, y: number, r: number, color: Color): void {
  const node = new Node("dot");
  node.parent = parent;
  node.setPosition(x, y);
  const g = node.addComponent(Graphics);
  g.fillColor = color;
  g.circle(0, 0, r);
  g.fill();
}

function dashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const ux = dx / dist;
  const uy = dy / dist;
  let traveled = 0;
  while (traveled < dist) {
    const sx = x1 + ux * traveled;
    const sy = y1 + uy * traveled;
    const end = Math.min(traveled + dash, dist);
    g.moveTo(sx, sy);
    g.lineTo(x1 + ux * end, y1 + uy * end);
    g.stroke();
    traveled = end + gap;
  }
}

/** A tiny padlock for sealed nodes. */
function paintLock(g: Graphics, size: number): void {
  g.fillColor = new Color(250, 250, 250, 255);
  g.strokeColor = new Color(250, 250, 250, 255);
  g.lineWidth = 2;
  g.roundRect(-size * 0.5, -size * 0.55, size, size * 0.8, size * 0.14);
  g.fill();
  g.arc(0, size * 0.25, size * 0.4, Math.PI, 0, false);
  g.stroke();
  g.fillColor = new Color(102, 102, 119, 255);
  g.circle(0, -size * 0.1, size * 0.12);
  g.fill();
}

/** A little roof mark so the home hub reads as a town at a glance. */
function paintHome(g: Graphics, size: number): void {
  g.fillColor = new Color(255, 255, 255, 235);
  g.moveTo(0, size);
  g.lineTo(size, 0);
  g.lineTo(-size, 0);
  g.close();
  g.fill();
}
