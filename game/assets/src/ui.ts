// Runtime UI kit: panels, labels, and buttons built from plain nodes.
// All screens are constructed with these — no editor-authored prefabs.

import { Color, EventTouch, Graphics, Label, Node, UITransform } from "cc";

export interface ButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: Color;
  fontSize?: number;
  onTap?: () => void; // omitted by callers that install their own touch handlers
}

function roundRectPath(g: Graphics, x: number, y: number, w: number, h: number, r: number) {
  g.roundRect(x, y, w, h, r);
}

export function makePanel(
  parent: Node,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: Color; stroke?: Color; radius?: number; lineWidth?: number } = {},
): Node {
  const node = new Node("panel");
  node.parent = parent;
  node.addComponent(UITransform).setContentSize(w, h);
  node.setPosition(x, y);
  const g = node.addComponent(Graphics);
  const r = opts.radius ?? 12;
  g.fillColor = opts.fill ?? new Color(255, 253, 245, 255);
  if (opts.stroke) {
    g.strokeColor = opts.stroke;
    g.lineWidth = opts.lineWidth ?? 4;
  }
  roundRectPath(g, -w / 2, -h / 2, w, h, r);
  g.fill();
  if (opts.stroke) g.stroke();
  return node;
}

export function makeLabel(
  parent: Node,
  text: string,
  x: number,
  y: number,
  opts: { fontSize?: number; color?: Color; name?: string; align?: "left" | "center" | "right" } = {},
): Label {
  const node = new Node(opts.name ?? "label");
  node.parent = parent;
  const transform = node.addComponent(UITransform);
  node.setPosition(x, y);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = opts.fontSize ?? 20;
  label.color = opts.color ?? new Color(51, 51, 51, 255);
  // With overflow NONE the content box hugs the text, so alignment comes
  // from the node anchor: "left" hangs text rightward from (x, y), "right"
  // hangs it leftward. Label.horizontalAlign alone does nothing here.
  if (opts.align === "left") {
    transform.setAnchorPoint(0, 0.5);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
  } else if (opts.align === "right") {
    transform.setAnchorPoint(1, 0.5);
    label.horizontalAlign = Label.HorizontalAlign.RIGHT;
  }
  return label;
}

export function makeWrappedLabel(
  parent: Node,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fontSize?: number; color?: Color; lineHeight?: number; name?: string } = {},
): Label {
  const label = makeLabel(parent, text, x, y, opts);
  label.node.getComponent(UITransform)!.setContentSize(w, h);
  label.overflow = Label.Overflow.SHRINK;
  label.enableWrapText = true;
  label.horizontalAlign = Label.HorizontalAlign.LEFT;
  label.verticalAlign = Label.VerticalAlign.TOP;
  label.lineHeight = opts.lineHeight ?? Math.round((opts.fontSize ?? 20) * 1.25);
  return label;
}

// A button is a panel plus a label; taps fire onTap. Touch coordinates are
// checked against the button's own box (nodes are center-anchored).
export function makeButton(parent: Node, opts: ButtonOpts): Node {
  const node = makePanel(parent, opts.x, opts.y, opts.w, opts.h, {
    fill: opts.color,
    radius: Math.min(12, opts.h / 4),
  });
  const label = makeLabel(node, opts.label, 0, 0, {
    fontSize: opts.fontSize ?? 22,
    color: Color.WHITE,
  });
  label.horizontalAlign = Label.HorizontalAlign.CENTER;
  label.overflow = Label.Overflow.SHRINK;

  if (opts.onTap) {
    const onTap = opts.onTap;
    node.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
      e.propagationStopped = true;
      onTap();
    });
  }
  return node;
}

// Solid-color sprite-free rectangle (backgrounds, HP bars).
export function makeRect(
  parent: Node,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
  radius = 0,
): Graphics {
  const node = new Node("rect");
  node.parent = parent;
  node.addComponent(UITransform).setContentSize(w, h);
  node.setPosition(x, y);
  const g = node.addComponent(Graphics);
  g.fillColor = color;
  if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius);
  else g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  return g;
}

export function destroyChildren(node: Node): void {
  for (const child of [...node.children]) child.destroy();
}

export function fmtNum(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const PALETTE = {
  ink: new Color(51, 51, 51, 255),
  panel: new Color(255, 253, 245, 255),
  panelStroke: new Color(59, 74, 107, 255),
  sub: new Color(102, 102, 119, 255),
  good: new Color(46, 125, 50, 255),
  bad: new Color(198, 40, 40, 255),
  hpHigh: new Color(102, 187, 106, 255),
  hpMid: new Color(255, 167, 38, 255),
  hpLow: new Color(239, 83, 80, 255),
  xp: new Color(66, 165, 245, 255),
  actionBlue: new Color(66, 165, 245, 255),
};
