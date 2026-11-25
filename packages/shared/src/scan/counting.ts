import { histogramOf, otsuLevel } from "./image";
import type { Gray, PixelRect } from "./types";

export interface Counted {
  value: number;
  confidence: number;
  note?: string;
}

/** Below this spread between the lightest and darkest pixel a box is taken to hold no ink at all. */
const MIN_CONTRAST = 40;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Dark means below this level: Otsu inside the box when it has contrast, else the level for the whole card. */
function darkLevel(card: Gray, box: PixelRect, cardLevel: number): number {
  const histogram = histogramOf(card, box);
  let lo = 0;
  let hi = 255;
  while (lo < 255 && histogram[lo] === 0) lo++;
  while (hi > 0 && histogram[hi] === 0) hi--;
  return hi - lo >= MIN_CONTRAST ? otsuLevel(histogram) : cardLevel;
}

export function cardDarkLevel(card: Gray): number {
  return otsuLevel(histogramOf(card));
}

/**
 * Counts the rings (circles that are open in the middle) in a box, from pixels alone. A ring is a connected dark
 * shape that is about as wide as tall, has a light middle and is about the size of the other rings. Filled discs and
 * stray marks are not counted; they lower the confidence instead. `max` is the most the row can hold.
 */
export function countBubbles(card: Gray, box: PixelRect, cardLevel: number, max?: number): Counted {
  const level = darkLevel(card, box, cardLevel);
  const { w, h } = box;
  const dark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) dark[y * w + x] = card.data[(box.y + y) * card.width + box.x + x]! <= level ? 1 : 0;
  }

  interface Blob {
    area: number;
    width: number;
    height: number;
    ring: boolean;
  }
  const blobs: Blob[] = [];
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  for (let start = 0; start < dark.length; start++) {
    if (!dark[start] || seen[start]) continue;
    let top = 0;
    let area = 0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const p = stack[--top]!;
      const x = p % w;
      const y = (p - x) / w;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && dark[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < w - 1 && dark[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (y > 0 && dark[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[top++] = p - w; }
      if (y < h - 1 && dark[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[top++] = p + w; }
    }
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const aspect = bw / bh;
    const fill = area / (bw * bh);
    const cx = x0 + Math.floor(bw / 2);
    const cy = y0 + Math.floor(bh / 2);
    const lightMiddle = !dark[cy * w + cx];
    // A ring of any thickness fills between a fifth and three quarters of its box (a disc fills about 0.79).
    const ring = bw >= 5 && bh >= 5 && aspect > 0.7 && aspect < 1.43 && fill > 0.2 && fill < 0.75 && lightMiddle;
    blobs.push({ area, width: bw, height: bh, ring });
  }

  const rings = blobs.filter((b) => b.ring);
  if (rings.length === 0) {
    const hasInk = blobs.some((b) => b.area >= 12);
    return hasInk
      ? { value: 0, confidence: 0.2, note: "Marks were found but none looked like a ring." }
      : { value: 0, confidence: 0.4 };
  }
  const size = median(rings.map((b) => Math.max(b.width, b.height)));
  const medianArea = median(rings.map((b) => b.area));
  const kept = rings.filter((b) => Math.max(b.width, b.height) >= size * 0.7 && Math.max(b.width, b.height) <= size * 1.3);
  // Anything else of real size is a sign the box is wrong or a ring is merged or broken.
  const stray = blobs.filter((b) => !kept.includes(b) && b.area >= medianArea * 0.3).length;
  let confidence = 1;
  const note: string[] = [];
  if (stray > 0) {
    confidence *= Math.max(0.2, 1 - 0.3 * stray);
    note.push(`${stray} other mark${stray === 1 ? "" : "s"} in the box.`);
  }
  const sizes = kept.map((b) => Math.max(b.width, b.height));
  if (Math.max(...sizes) / Math.min(...sizes) > 1.2) {
    confidence *= 0.7;
    note.push("The rings differ in size.");
  }
  if (max !== undefined && kept.length > max) {
    confidence = Math.min(confidence, 0.3);
    note.push(`More than the ${max} the row can hold.`);
  }
  return { value: kept.length, confidence: Math.round(confidence * 100) / 100, ...(note.length ? { note: note.join(" ") } : {}) };
}

/** Share of dark pixels at or over which a pip counts as filled in. */
export const PIP_FILLED_SHARE = 0.3;

/** Reads a pip or checkbox: filled when enough of the box is dark. Confidence falls as the share nears the mark. */
export function readPip(card: Gray, box: PixelRect, cardLevel: number): { value: boolean; confidence: number } {
  let darkCount = 0;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) if (card.data[(box.y + y) * card.width + box.x + x]! <= cardLevel) darkCount++;
  }
  const share = darkCount / (box.w * box.h);
  const confidence = Math.min(1, Math.abs(share - PIP_FILLED_SHARE) / (PIP_FILLED_SHARE * 0.7));
  return { value: share >= PIP_FILLED_SHARE, confidence: Math.round(confidence * 100) / 100 };
}
