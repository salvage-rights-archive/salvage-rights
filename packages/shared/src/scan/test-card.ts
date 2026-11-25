// Test helper: draws a made-up card (our own plain boxes, no official art, text or font) and photographs it at a
// slight angle. Used only by the scan tests; it is not part of the engine.
import type { CardLayout, Raster } from "./types";

export const CARD_W = 1050;
export const CARD_H = 750;

/** The one example layout, for tests only. The card layouts of any real game live with that game. */
export const EXAMPLE_LAYOUT: CardLayout = {
  id: "example",
  width: CARD_W,
  height: CARD_H,
  fields: [
    { id: "points", kind: "digits", rect: { x: 0.7, y: 0.05, w: 0.15, h: 0.1 }, maxLength: 3 },
    { id: "title", kind: "text", rect: { x: 0.05, y: 0.2, w: 0.5, h: 0.08 }, allowed: "ABCDEFGHIJKLMNOPQRSTUVWXYZ -" },
    { id: "armor", kind: "bubbles", rect: { x: 0.1, y: 0.8, w: 0.8, h: 0.1 }, max: 10 },
    { id: "structure", kind: "bubbles", rect: { x: 0.1, y: 0.6, w: 0.8, h: 0.1 }, max: 10 },
    { id: "filled", kind: "pip", rect: { x: 0.9, y: 0.05, w: 0.04, h: 0.055 } },
    { id: "empty", kind: "pip", rect: { x: 0.9, y: 0.15, w: 0.04, h: 0.055 } },
  ],
};

const INK = 30;
const PAPER = 235;
const TABLE = 70;

function inRect(u: number, v: number, x: number, y: number, w: number, h: number): boolean {
  return u >= x && u < x + w && v >= y && v < y + h;
}

/** Brightness of the card at a place on it (u, v from 0 to 1). */
function cardGray(u: number, v: number): number {
  const px = u * CARD_W;
  const py = v * CARD_H;
  // a marker block at the top left, to check where the corner lands
  if (inRect(u, v, 0.05, 0.05, 0.06, 0.08)) return INK;
  // stand-in glyph blocks for the digits and text fields
  if (inRect(u, v, 0.72, 0.07, 0.1, 0.06) || inRect(u, v, 0.07, 0.22, 0.4, 0.04)) return INK;
  // seven rings of armor; four rings of structure and one filled disc beside them
  const rings = (y: number, count: number, extra?: { cx: number; filled: true }) => {
    for (let i = 0; i < count; i++) {
      const d = Math.hypot(px - (0.15 + 0.05 * i) * CARD_W, py - y * CARD_H);
      if (d >= 10 && d <= 16) return true;
    }
    if (extra) return Math.hypot(px - extra.cx * CARD_W, py - y * CARD_H) <= 14;
    return false;
  };
  if (rings(0.85, 7) || rings(0.65, 4, { cx: 0.55, filled: true })) return INK;
  // a filled pip and an empty one with an outline just outside its box
  if (inRect(u, v, 0.9, 0.05, 0.04, 0.055)) return INK;
  const outline = inRect(u, v, 0.895, 0.145, 0.05, 0.065) && !inRect(u, v, 0.9, 0.15, 0.04, 0.055);
  return outline ? INK : PAPER;
}

export interface PhotoOptions {
  /** Turn of the card in degrees. */
  angle?: number;
  /** Sideways lean of the card (shear). */
  shear?: number;
  /** Size of the card in the photo, in pixels. */
  cardWidth?: number;
  cardHeight?: number;
}

/** A synthetic photo of the example card on a darker table. */
export function photoOfCard(options: PhotoOptions = {}): Raster {
  const { angle = 4, shear = 0.02, cardWidth = 640, cardHeight = 457 } = options;
  const width = 800;
  const height = 700;
  const t = (angle * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  // forward map: card point (in card fractions, centred) to photo = centre + rotate(shear(size * point))
  const [m00, m01, m10, m11] = [
    cos * cardWidth, cos * shear * cardHeight - sin * cardHeight,
    sin * cardWidth, sin * shear * cardHeight + cos * cardHeight,
  ];
  const det = m00 * m11 - m01 * m10;
  const data = new Uint8ClampedArray(width * height * 4);
  const samples = [-1 / 3, 0, 1 / 3];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (const sy of samples) {
        for (const sx of samples) {
          const dx = x + 0.5 + sx - width / 2;
          const dy = y + 0.5 + sy - height / 2;
          const a = (m11 * dx - m01 * dy) / det + 0.5;
          const b = (-m10 * dx + m00 * dy) / det + 0.5;
          sum += a >= 0 && a < 1 && b >= 0 && b < 1 ? cardGray(a, b) : TABLE;
        }
      }
      const g = sum / 9;
      const o = (y * width + x) * 4;
      data[o] = g;
      data[o + 1] = g;
      data[o + 2] = g;
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

/** A plain picture of one brightness, with an optional disc in the middle. */
export function plainPicture(level: number, disc?: number): Raster {
  const width = 400;
  const height = 300;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = disc && Math.hypot(x - width / 2, y - height / 2) < disc ? 230 : level;
      const o = (y * width + x) * 4;
      data[o] = g;
      data[o + 1] = g;
      data[o + 2] = g;
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}
