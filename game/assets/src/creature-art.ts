// Placeholder creature art shared by world HUDs and battles. Phase 3 swaps
// this Graphics renderer for real sprites without touching game logic.

import { Color, Graphics } from "cc";

export function colorFromHex(s: string): Color {
  return Color.fromHEX(new Color(), s);
}

export function paintCreature(g: Graphics, color: Color, size: number, boss: boolean): void {
  g.fillColor = color;
  g.circle(0, 0, size);
  g.circle(-size * 0.6, size * 0.8, size * 0.35);
  g.circle(size * 0.6, size * 0.8, size * 0.35);
  g.fill();

  g.fillColor = Color.WHITE;
  g.circle(-size * 0.35, size * 0.15, size * 0.22);
  g.circle(size * 0.35, size * 0.15, size * 0.22);
  g.fill();

  g.fillColor = colorFromHex("#333333");
  g.circle(-size * 0.35, size * 0.12, size * 0.1);
  g.circle(size * 0.35, size * 0.12, size * 0.1);
  g.fill();

  g.strokeColor = colorFromHex("#333333");
  g.lineWidth = 3;
  g.arc(0, -size * 0.25, size * 0.3, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.stroke();

  if (boss) {
    const base = size * 1.1;
    g.fillColor = colorFromHex("#ffca28");
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
