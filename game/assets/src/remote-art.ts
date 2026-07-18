// Runtime loader for licensed pixel art kept in private R2. No licensed files
// belong in this repo; see docs/art-assets.md.

import {
  ImageAsset,
  Rect,
  Size,
  SpriteFrame,
  Texture2D,
  assetManager,
} from "cc";

const ART_PATH = "/art/v1/pocket-creature-tamer";
const textureCache = new Map<string, Promise<Texture2D>>();

export function artUrl(relativePath: string): string {
  // The deployed game and `wrangler dev --remote` serve art on the same
  // origin, avoiding credential and CORS differences between environments.
  return `${ART_PATH}/${relativePath}`;
}

export function loadPixelTexture(relativePath: string): Promise<Texture2D> {
  const cached = textureCache.get(relativePath);
  if (cached) return cached;

  const pending = new Promise<Texture2D>((resolve, reject) => {
    assetManager.loadRemote<ImageAsset>(
      artUrl(relativePath),
      { ext: ".png" },
      (error, image) => {
        if (error || !image) {
          reject(error ?? new Error(`No image returned for ${relativePath}`));
          return;
        }

        const texture = new Texture2D(relativePath);
        texture.image = image;
        texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        resolve(texture);
      },
    );
  });

  textureCache.set(relativePath, pending);
  pending.catch(() => textureCache.delete(relativePath));
  return pending;
}

// Sheet coordinates use the source image's top-left origin, matching Cocos's
// SpriteFrame atlas rect convention.
export function pixelFrame(
  texture: Texture2D,
  x: number,
  y: number,
  width: number,
  height: number,
): SpriteFrame {
  const frame = new SpriteFrame();
  frame.reset({
    texture,
    rect: new Rect(x, y, width, height),
    originalSize: new Size(width, height),
  });
  frame.packable = false;
  return frame;
}
