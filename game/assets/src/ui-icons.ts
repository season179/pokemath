// Sprite-free UI icons. These deterministic Graphics fallbacks keep the HUD,
// Bag, Shop, and Battle consistent even when remote art is unavailable.

import { Color, Graphics } from "cc";

export type ItemIconKind = "potion" | "ball";

const INK = new Color(59, 74, 107, 255);
const LIGHT = new Color(255, 253, 245, 255);
const POTION = new Color(38, 166, 154, 255);
const BALL = new Color(239, 83, 80, 255);

export function paintBagIcon(g: Graphics, size: number): void {
  const half = size / 2;
  const bodyY = -half * 0.5;
  const bodyH = size * 0.72;

  g.fillColor = new Color(255, 183, 77, 255);
  g.strokeColor = INK;
  g.lineWidth = Math.max(2, size * 0.08);
  g.roundRect(-half * 0.72, bodyY, size * 0.72 * 2, bodyH, size * 0.14);
  g.fill();
  g.stroke();

  g.lineWidth = Math.max(2, size * 0.09);
  g.arc(0, half * 0.25, size * 0.24, Math.PI, 0, false);
  g.stroke();

  g.moveTo(-half * 0.58, size * 0.08);
  g.lineTo(half * 0.58, size * 0.08);
  g.stroke();

  g.fillColor = new Color(255, 213, 79, 255);
  g.roundRect(-size * 0.22, -size * 0.24, size * 0.44, size * 0.24, size * 0.05);
  g.fill();
  g.stroke();
}

export function paintItemIcon(g: Graphics, kind: ItemIconKind, size: number): void {
  if (kind === "potion") paintPotion(g, size);
  else paintBall(g, size);
}

function paintPotion(g: Graphics, size: number): void {
  const half = size / 2;
  g.strokeColor = INK;
  g.lineWidth = Math.max(2, size * 0.07);

  g.fillColor = new Color(255, 224, 130, 255);
  g.roundRect(-size * 0.16, half * 0.22, size * 0.32, size * 0.2, size * 0.05);
  g.fill();
  g.stroke();

  g.fillColor = LIGHT;
  g.roundRect(-size * 0.11, size * 0.05, size * 0.22, size * 0.22, size * 0.04);
  g.fill();
  g.stroke();

  g.fillColor = POTION;
  g.moveTo(-size * 0.28, size * 0.03);
  g.lineTo(-size * 0.38, -half * 0.72);
  g.quadraticCurveTo(0, -half, size * 0.38, -half * 0.72);
  g.lineTo(size * 0.28, size * 0.03);
  g.close();
  g.fill();
  g.stroke();

  g.fillColor = LIGHT;
  g.circle(-size * 0.1, -size * 0.18, size * 0.06);
  g.fill();
}

function paintBall(g: Graphics, size: number): void {
  const radius = size * 0.42;
  g.fillColor = LIGHT;
  g.strokeColor = INK;
  g.lineWidth = Math.max(2, size * 0.07);
  g.circle(0, 0, radius);
  g.fill();

  g.fillColor = BALL;
  g.moveTo(-radius, 0);
  g.arc(0, 0, radius, Math.PI, 0, false);
  g.close();
  g.fill();

  g.moveTo(-radius, 0);
  g.lineTo(radius, 0);
  g.stroke();
  g.circle(0, 0, radius);
  g.stroke();

  g.fillColor = LIGHT;
  g.circle(0, 0, size * 0.12);
  g.fill();
  g.circle(0, 0, size * 0.12);
  g.stroke();
}
