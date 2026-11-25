import { otsuLevel, shrinkGray, toGray } from "./image";
import type { Corners, Gray, Point, Raster } from "./types";

export type FindResult = { ok: true; corners: Corners } | { ok: false; message: string };
export type NormaliseResult =
  | { ok: true; card: Raster; corners: Corners }
  | { ok: false; message: string };

export const NO_CARD_MESSAGE =
  "We could not find a card in this photo. Lay the card flat on a plain surface that is darker or lighter than the card, " +
  "and take the photo from straight above with the whole card in view.";
export const WRONG_SHAPE_MESSAGE =
  "We found something in the photo, but it is not the shape of this card. Turn the photo so the card reads the right way " +
  "up and keep the whole card in view.";

/** The longest side of the working copy used for finding the card. */
const FIND_SIDE = 400;
/** The card must cover at least this share of the photo. */
const MIN_CARD_SHARE = 0.15;
/** How far the found shape may differ from a plain four-cornered card (share of area). */
const SHAPE_TOLERANCE = 0.12;
/** How far the found width to height ratio may differ from the layout. */
const ASPECT_TOLERANCE = 0.25;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * The brightness of the surface the card lies on, taken from the four corner patches of the photo (a card with
 * rounded corners, or one that does not fill the frame, leaves the surface showing there).
 */
function backgroundLevel(image: Gray): number {
  const patch = Math.max(2, Math.round(Math.min(image.width, image.height) * 0.03));
  const values: number[] = [];
  for (const x0 of [0, image.width - patch]) {
    for (const y0 of [0, image.height - patch]) {
      for (let y = y0; y < y0 + patch; y++) {
        for (let x = x0; x < x0 + patch; x++) values.push(image.data[y * image.width + x]!);
      }
    }
  }
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)]!;
}

/**
 * Finds the four corners of the card: the largest blob that differs from the photo edge, which must be close to a
 * plain four-cornered shape and in the proportions of the layout (`aspect` = width / height). Handles any small
 * rotation; the corners are the extreme points along the two diagonals.
 */
export function findCard(photo: Raster, aspect: number): FindResult {
  const full = toGray(photo);
  const factor = Math.max(1, Math.ceil(Math.max(full.width, full.height) / FIND_SIDE));
  const small = shrinkGray(full, factor);
  const { width, height } = small;
  const bg = backgroundLevel(small);

  const diff = new Uint8Array(width * height);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < diff.length; i++) {
    diff[i] = Math.abs(small.data[i]! - bg);
    histogram[diff[i]!]!++;
  }
  const level = otsuLevel(histogram);
  if (level < 12) return { ok: false, message: NO_CARD_MESSAGE };

  // The largest connected blob above the level (4-neighbour flood fill).
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let bestSize = 0;
  let bestStart = -1;
  for (let start = 0; start < diff.length; start++) {
    if (seen[start] || diff[start]! <= level) continue;
    let top = 0;
    let size = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const p = stack[--top]!;
      size++;
      const x = p % width;
      const y = (p - x) / width;
      if (x > 0 && !seen[p - 1] && diff[p - 1]! > level) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < width - 1 && !seen[p + 1] && diff[p + 1]! > level) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (y > 0 && !seen[p - width] && diff[p - width]! > level) { seen[p - width] = 1; stack[top++] = p - width; }
      if (y < height - 1 && !seen[p + width] && diff[p + width]! > level) { seen[p + width] = 1; stack[top++] = p + width; }
    }
    if (size > bestSize) {
      bestSize = size;
      bestStart = start;
    }
  }
  if (bestStart < 0 || bestSize < MIN_CARD_SHARE * width * height) return { ok: false, message: NO_CARD_MESSAGE };

  // Collect the winning blob again: its row spans and its extreme points along both diagonals.
  const inBlob = new Uint8Array(width * height);
  let top = 0;
  stack[top++] = bestStart;
  inBlob[bestStart] = 1;
  const rowMin = new Int32Array(height).fill(width);
  const rowMax = new Int32Array(height).fill(-1);
  let tl = bestStart, br = bestStart, tr = bestStart, bl = bestStart;
  const sum = (p: number) => (p % width) + Math.floor(p / width);
  const dif = (p: number) => (p % width) - Math.floor(p / width);
  while (top > 0) {
    const p = stack[--top]!;
    const x = p % width;
    const y = (p - x) / width;
    if (x < rowMin[y]!) rowMin[y] = x;
    if (x > rowMax[y]!) rowMax[y] = x;
    if (sum(p) < sum(tl)) tl = p;
    if (sum(p) > sum(br)) br = p;
    if (dif(p) > dif(tr)) tr = p;
    if (dif(p) < dif(bl)) bl = p;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
    for (const n of next) {
      if (n >= 0 && !inBlob[n] && diff[n]! > level) {
        inBlob[n] = 1;
        stack[top++] = n;
      }
    }
  }
  let spanArea = 0;
  for (let y = 0; y < height; y++) if (rowMax[y]! >= 0) spanArea += rowMax[y]! - rowMin[y]! + 1;

  // Outer pixel corner of each extreme pixel, scaled back to photo pixels.
  const at = (p: number, dx: number, dy: number): Point => ({ x: ((p % width) + dx) * factor, y: (Math.floor(p / width) + dy) * factor });
  const corners: Corners = [at(tl, 0, 0), at(tr, 1, 0), at(br, 1, 1), at(bl, 0, 1)];

  const quad = polygonArea(corners) / (factor * factor);
  if (quad < MIN_CARD_SHARE * width * height || Math.abs(spanArea / quad - 1) > SHAPE_TOLERANCE) {
    return { ok: false, message: NO_CARD_MESSAGE };
  }
  const across = (distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2;
  const down = (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2;
  if (Math.abs(across / down / aspect - 1) > ASPECT_TOLERANCE) return { ok: false, message: WRONG_SHAPE_MESSAGE };
  return { ok: true, corners };
}

/** Solves the 8 numbers of the map from the card rectangle (0..width, 0..height) to the four photo corners. */
function homography(corners: Corners, width: number, height: number): number[] {
  const from: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  // 8 rows of 9 numbers (the last is the right-hand side), kept flat
  const m = new Float64Array(72);
  const set = (r: number, values: number[]) => values.forEach((value, c) => (m[r * 9 + c] = value));
  from.forEach((f, i) => {
    const { x, y } = corners[i]!;
    set(i * 2, [f.x, f.y, 1, 0, 0, 0, -x * f.x, -x * f.y, x]);
    set(i * 2 + 1, [0, 0, 0, f.x, f.y, 1, -y * f.x, -y * f.y, y]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(m[r * 9 + col]!) > Math.abs(m[pivot * 9 + col]!)) pivot = r;
    for (let c = 0; c < 9; c++) {
      const t = m[col * 9 + c]!;
      m[col * 9 + c] = m[pivot * 9 + c]!;
      m[pivot * 9 + c] = t;
    }
    const lead = m[col * 9 + col]!;
    for (let c = col; c < 9; c++) m[col * 9 + c] = m[col * 9 + c]! / lead;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const k = m[r * 9 + col]!;
      for (let c = col; c < 9; c++) m[r * 9 + c] = m[r * 9 + c]! - k * m[col * 9 + c]!;
    }
  }
  return Array.from({ length: 8 }, (_, r) => m[r * 9 + 8]!);
}

/** Straightens the area inside `corners` into a picture of exactly `width` by `height` pixels (bilinear). */
export function warpCard(photo: Raster, corners: Corners, width: number, height: number): Raster {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = homography(corners, width, height) as [number, number, number, number, number, number, number, number];
  const out = new Uint8ClampedArray(width * height * 4);
  const maxX = photo.width - 1;
  const maxY = photo.height - 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x + 0.5;
      const v = y + 0.5;
      const w = h6 * u + h7 * v + 1;
      const sx = Math.min(maxX, Math.max(0, (h0 * u + h1 * v + h2) / w - 0.5));
      const sy = Math.min(maxY, Math.max(0, (h3 * u + h4 * v + h5) / w - 0.5));
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(maxX, x0 + 1);
      const y1 = Math.min(maxY, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = photo.data[(y0 * photo.width + x0) * 4 + c]!;
        const b = photo.data[(y0 * photo.width + x1) * 4 + c]!;
        const d = photo.data[(y1 * photo.width + x0) * 4 + c]!;
        const e = photo.data[(y1 * photo.width + x1) * 4 + c]!;
        out[o + c] = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + d * (1 - fx) * fy + e * fx * fy;
      }
    }
  }
  return { width, height, data: out };
}

/**
 * Finds the card in a photo and returns it cropped to its edge, straightened (small rotation and skew) and scaled to
 * `width` by `height`. With `wholePhoto` the photo is taken to be the card already (the "use the whole photo" choice).
 */
export function normaliseCard(
  photo: Raster,
  size: { width: number; height: number },
  options: { wholePhoto?: boolean } = {},
): NormaliseResult {
  let corners: Corners;
  if (options.wholePhoto) {
    const { width: w, height: h } = photo;
    corners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  } else {
    const found = findCard(photo, size.width / size.height);
    if (!found.ok) return found;
    corners = found.corners;
  }
  return { ok: true, card: warpCard(photo, corners, size.width, size.height), corners };
}

