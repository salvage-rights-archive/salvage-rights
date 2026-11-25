import { cardDarkLevel, countBubbles, readPip } from "./counting";
import { cropRaster, pixelBox, toGray } from "./image";
import { normaliseCard } from "./normalise";
import type { Recogniser } from "./recogniser";
import type { CardLayout, DigitsField, FieldResult, LayoutField, PixelRect, Raster, ScanOutcome, TextField } from "./types";

/** A field under this confidence is marked low for the review form. */
export const LOW_CONFIDENCE = 0.6;

export interface ReadOptions {
  recogniser: Recogniser;
  /** Confidence under which a field is marked low. */
  lowBelow?: number;
  /** Take the photo to be the card already (skips finding it). */
  wholePhoto?: boolean;
}

const DIGITS = "0123456789";

/** Keeps only the allowed characters and the length limit; a trimmed read loses half its confidence. */
function tidy(field: DigitsField | TextField, text: string, confidence: number): { text: string; confidence: number; note?: string } {
  const allowed = field.kind === "digits" ? DIGITS + (field.allowed ?? "") : field.allowed;
  let kept = text.trim();
  if (allowed !== undefined) kept = [...kept].filter((ch) => allowed.includes(ch)).join("");
  if (field.maxLength !== undefined) kept = kept.slice(0, field.maxLength);
  if (kept === text.trim()) return { text: kept, confidence };
  return { text: kept, confidence: confidence * 0.5, note: "Some characters were dropped from the read." };
}

async function readField(
  field: LayoutField,
  card: Raster,
  gray: ReturnType<typeof toGray>,
  cardLevel: number,
  recogniser: Recogniser,
  box: PixelRect,
): Promise<Pick<FieldResult, "value" | "confidence" | "note">> {
  switch (field.kind) {
    case "bubbles":
      return countBubbles(gray, box, cardLevel, field.max);
    case "pip":
      return readPip(gray, box, cardLevel);
    case "digits":
    case "text": {
      try {
        const read = await recogniser.recognise(field, cropRaster(card, box));
        const clean = tidy(field, read.text, read.confidence);
        return { value: clean.text, confidence: clean.confidence, ...(clean.note ? { note: clean.note } : {}) };
      } catch {
        return { value: null, confidence: 0, note: "The reader failed on this field." };
      }
    }
  }
}

/** Reads every field of a straightened card. Digits and text go to the recogniser; bubbles and pips are counted from pixels. */
export async function readFields(card: Raster, layout: CardLayout, options: ReadOptions): Promise<FieldResult[]> {
  const gray = toGray(card);
  const cardLevel = cardDarkLevel(gray);
  const lowBelow = options.lowBelow ?? LOW_CONFIDENCE;
  const results: FieldResult[] = [];
  for (const field of layout.fields) {
    const box = pixelBox(field.rect, card.width, card.height);
    const read = await readField(field, card, gray, cardLevel, options.recogniser, box);
    results.push({
      id: field.id,
      kind: field.kind,
      value: read.value,
      confidence: read.confidence,
      low: read.confidence < lowBelow,
      rect: field.rect,
      box,
      ...(read.note ? { note: read.note } : {}),
    });
  }
  return results;
}

/**
 * The whole engine in one call: find the card in the photo, straighten and scale it to the layout size, then read
 * every field. A photo with no card in it comes back as `{ ok: false, message }` in plain words. Nothing leaves memory.
 */
export async function scanCard(photo: Raster, layout: CardLayout, options: ReadOptions): Promise<ScanOutcome> {
  const found = normaliseCard(photo, layout, { wholePhoto: options.wholePhoto });
  if (!found.ok) return found;
  return { ok: true, card: found.card, corners: found.corners, fields: await readFields(found.card, layout, options) };
}
