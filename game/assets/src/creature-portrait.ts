// Creature portraits: species with licensed sheet art render as pixel
// sprites; everything else keeps the placeholder Graphics blob from
// creature-art.ts. One helper so battle, party, and world stay in sync.

import { Graphics, Node, Sprite, UITransform } from "cc";
import { SPECIES_BY_ID } from "../shared/index";
import { colorFromHex, paintCreature } from "./creature-art";
import { loadPixelTexture, pixelFrame } from "./remote-art";

export interface PortraitSubject {
  speciesId?: string | null;
  color: string;
  boss: boolean;
}

// `size` keeps paintCreature's meaning (body-circle radius); with ears the
// blob stands ~2.3× that, so sprites take the same visual mass and existing
// layouts keep their proportions. The node is centered like the blob was.
export function makeCreaturePortrait(parent: Node, subject: PortraitSubject, size: number): Node {
  const node = new Node("creature-portrait");
  node.parent = parent;
  const art = subject.speciesId ? SPECIES_BY_ID[subject.speciesId]?.art : undefined;
  if (!art) {
    paintCreature(node.addComponent(Graphics), colorFromHex(subject.color), size, subject.boss);
    return node;
  }

  const display = size * 2.4;
  node.addComponent(UITransform).setContentSize(display, display * (art.h / art.w));
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  loadPixelTexture(art.sheet)
    .then((texture) => {
      if (!node.isValid) return;
      sprite.spriteFrame = pixelFrame(texture, art.x, art.y, art.w, art.h);
    })
    .catch(() => {
      // Art unreachable (offline?): show the blob rather than a hole.
      if (!node.isValid) return;
      sprite.destroy();
      paintCreature(node.addComponent(Graphics), colorFromHex(subject.color), size, subject.boss);
    });
  return node;
}
