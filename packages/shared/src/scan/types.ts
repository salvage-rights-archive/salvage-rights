/** A picture held in memory as RGBA bytes, the same shape as the browser ImageData. */
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** One brightness byte per pixel. */
export interface Gray {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface Point {
  x: number;
  y: number;
}

/** Card corners in photo pixels: top left, top right, bottom right, bottom left. */
export type Corners = [Point, Point, Point, Point];

/** A rectangle in card coordinates: 0 to 1 across and down the straightened card. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle in whole pixels of the straightened card. */
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FieldBase {
  id: string;
  rect: Rect;
}

export interface DigitsField extends FieldBase {
  kind: "digits";
  /** Characters allowed besides 0 to 9 (for example a star). */
  allowed?: string;
  maxLength?: number;
}

export interface TextField extends FieldBase {
  kind: "text";
  /** The only characters allowed. Anything else is dropped from the read. Omit to allow any. */
  allowed?: string;
  maxLength?: number;
}

/** A row of circles to count; the value is how many rings the row holds. */
export interface BubblesField extends FieldBase {
  kind: "bubbles";
  /** The most circles the row can hold; a count above it is marked unsure. */
  max?: number;
  /** Circles are open rings (the default) or filled discs. */
  shape?: "ring" | "disc";
}

/** A pip or checkbox: the value is true when it is filled in. */
export interface PipField extends FieldBase {
  kind: "pip";
}

export type LayoutField = DigitsField | TextField | BubblesField | PipField;

/** Named fields at fixed places on a card of one style. */
export interface CardLayout {
  id: string;
  /** The size the card is scaled to before anything is read. */
  width: number;
  height: number;
  fields: LayoutField[];
}

export type FieldValue = string | number | boolean | null;

/** What was read from one field, with what the review form needs to show it. */
export interface FieldResult {
  id: string;
  kind: LayoutField["kind"];
  value: FieldValue;
  /** 0 (a guess) to 1 (sure). */
  confidence: number;
  /** True when confidence is under the low mark; the form shows these for checking. */
  low: boolean;
  /** Where the field sits on the card, as given by the layout. */
  rect: Rect;
  /** The same place in pixels of the straightened card. */
  box: PixelRect;
  /** A plain note when something looked wrong. */
  note?: string;
}

export type ScanOutcome =
  | { ok: true; card: Raster; corners: Corners; fields: FieldResult[] }
  | { ok: false; message: string };
