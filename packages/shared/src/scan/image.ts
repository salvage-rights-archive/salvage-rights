import type { Gray, PixelRect, Raster, Rect } from "./types";

/** The longest side a loaded photo keeps; larger photos are scaled down. */
export const MAX_PHOTO_SIDE = 2000;

/**
 * Reads a picture from a file or blob into memory (browser only), scaled down to at most `MAX_PHOTO_SIDE`
 * on its long side. Nothing is uploaded or stored.
 */
export async function loadImage(source: Blob): Promise<Raster> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error("We could not open that file as a picture. Try a photo in JPEG or PNG form.");
  }
  try {
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot read pictures into memory.");
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    return { width, height, data: pixels.data };
  } finally {
    bitmap.close();
  }
}

export function toGray(image: Raster): Gray {
  const out = new Uint8Array(image.width * image.height);
  const d = image.data;
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (d[p]! * 299 + d[p + 1]! * 587 + d[p + 2]! * 114) / 1000;
  }
  return { width: image.width, height: image.height, data: out };
}

/** Shrinks by a whole factor, averaging each block. */
export function shrinkGray(image: Gray, factor: number): Gray {
  if (factor <= 1) return image;
  const width = Math.max(1, Math.floor(image.width / factor));
  const height = Math.max(1, Math.floor(image.height / factor));
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          sum += image.data[(y * factor + dy) * image.width + x * factor + dx]!;
        }
      }
      out[y * width + x] = sum / (factor * factor);
    }
  }
  return { width, height, data: out };
}

/** The pixel box of a card-coordinate rectangle, kept inside the image and at least one pixel wide. */
export function pixelBox(rect: Rect, width: number, height: number): PixelRect {
  const x = Math.min(width - 1, Math.max(0, Math.floor(rect.x * width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(rect.y * height)));
  const right = Math.min(width, Math.max(x + 1, Math.ceil((rect.x + rect.w) * width)));
  const bottom = Math.min(height, Math.max(y + 1, Math.ceil((rect.y + rect.h) * height)));
  return { x, y, w: right - x, h: bottom - y };
}

/** A copy of one rectangle of a picture; the review form shows it beside the value read from it. */
export function cropRaster(image: Raster, box: PixelRect): Raster {
  const data = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * image.width + box.x) * 4;
    data.set(image.data.subarray(from, from + box.w * 4), y * box.w * 4);
  }
  return { width: box.w, height: box.h, data };
}

/** Otsu method over a 256 bin histogram: the level that best splits dark from light. */
export function otsuLevel(histogram: ArrayLike<number>): number {
  let total = 0;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) {
    total += histogram[i]!;
    sumAll += i * histogram[i]!;
  }
  let weightBack = 0;
  let sumBack = 0;
  let best = 0;
  let bestVariance = -1;
  for (let level = 0; level < 256; level++) {
    weightBack += histogram[level]!;
    if (weightBack === 0) continue;
    const weightFront = total - weightBack;
    if (weightFront === 0) break;
    sumBack += level * histogram[level]!;
    const meanBack = sumBack / weightBack;
    const meanFront = (sumAll - sumBack) / weightFront;
    const variance = weightBack * weightFront * (meanBack - meanFront) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = level;
    }
  }
  return best;
}

export function histogramOf(image: Gray, box?: PixelRect): Uint32Array {
  const histogram = new Uint32Array(256);
  const b = box ?? { x: 0, y: 0, w: image.width, h: image.height };
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) histogram[image.data[y * image.width + x]!]!++;
  }
  return histogram;
}
