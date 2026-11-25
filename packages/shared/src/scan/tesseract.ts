import { otsuLevel } from "./image";
import type { Recognised, Recogniser } from "./recogniser";
import type { DigitsField, Raster, TextField } from "./types";

/** Where the reader's own files are served from. Always our own address: nothing is fetched from a CDN. */
export interface OcrPaths {
  workerPath: string;
  /** A folder holding the core files (the worker picks the one the device can run). */
  corePath: string;
  /** A folder holding `eng.traineddata.gz`. */
  langPath: string;
}

/** The part of a tesseract.js worker we use. */
export interface OcrWorker {
  setParameters(params: Record<string, string>): Promise<unknown>;
  recognize(image: unknown, options: object, output: { text: boolean; blocks: boolean }): Promise<{ data: OcrPage }>;
  terminate(): Promise<unknown>;
}

/** What we read of a result: the text, the page figure, and the blocks down to each letter's figure (0 to 100). */
export interface OcrPage {
  text: string;
  confidence: number;
  blocks?: { paragraphs?: { lines?: { words?: { symbols?: { confidence: number }[] }[] }[] }[] }[] | null;
}

/** The average of the letters' own confidence figures, or null when the result carries none. */
export function meanSymbolConfidence(blocks: OcrPage["blocks"]): number | null {
  const figures = (blocks ?? []).flatMap((block) =>
    (block.paragraphs ?? []).flatMap((p) => (p.lines ?? []).flatMap((l) => (l.words ?? []).flatMap((w) => (w.symbols ?? []).map((s) => s.confidence)))),
  );
  return figures.length === 0 ? null : figures.reduce((a, b) => a + b, 0) / figures.length;
}

export type OcrWorkerFactory = (paths: OcrPaths, onStatus: (status: string, progress: number) => void) => Promise<OcrWorker>;

/** Starts the real tesseract.js worker. The library is imported here and nowhere else, so it loads only when asked. */
export const startTesseractWorker: OcrWorkerFactory = async (paths, onStatus) => {
  const { createWorker } = await import("tesseract.js");
  // OEM 1 is the neural reader only (the only one our files hold). The language file is read from our folder every
  // time ("none" turns off the library's own IndexedDB copy), so the one cache we manage is the only cache.
  const worker = await createWorker("eng", 1, {
    ...paths,
    workerBlobURL: false,
    cacheMethod: "none",
    gzip: true,
    logger: (message) => {
      onStatus(message.status, message.progress);
    },
  });
  return worker as unknown as OcrWorker;
};

const DIGITS = "0123456789";
/** Tesseract page segmentation mode 7: the crop is one line of text. */
const SINGLE_LINE = "7";

/** The reader's settings for a field: only the characters the field allows, read as one line. */
export function parametersFor(field: DigitsField | TextField): Record<string, string> {
  const whitelist = field.kind === "digits" ? DIGITS + (field.allowed ?? "") : (field.allowed ?? "");
  return { tessedit_char_whitelist: whitelist, tessedit_pageseg_mode: SINGLE_LINE, user_defined_dpi: "300" };
}

const TARGET_HEIGHT = 64;
const MARGIN = 12;

/**
 * Gets a crop ready to read: black ink on white paper whichever way round it was, enlarged so the letters are tall enough, and a
 * plain margin all round (the reader does badly when text touches the edge). Pure; no browser needed.
 */
export function prepareCrop(crop: Raster): Raster {
  const { width, height, data } = crop;
  const grey = new Float32Array(width * height);
  for (let i = 0, p = 0; i < grey.length; i++, p += 4) {
    grey[i] = (data[p]! * 299 + data[p + 1]! * 587 + data[p + 2]! * 114) / 1000;
  }
  // Black and white: the level that best splits ink from paper, and whichever side has fewer pixels is the ink. That
  // handles dark letters on light and light on dark alike, and drops the colour and texture behind coloured type.
  const histogram = new Uint32Array(256);
  for (const value of grey) histogram[Math.round(value)]!++;
  const level = otsuLevel(histogram);
  let dark = 0;
  for (const value of grey) if (value <= level) dark++;
  const inkIsDark = dark <= grey.length - dark;
  for (let i = 0; i < grey.length; i++) grey[i] = (grey[i]! <= level) === inkIsDark ? 0 : 255;
  const scale = Math.max(1, Math.min(6, Math.ceil(TARGET_HEIGHT / height)));
  const outW = width * scale + MARGIN * 2;
  const outH = height * scale + MARGIN * 2;
  const out = new Uint8ClampedArray(outW * outH * 4).fill(255);
  const at = (x: number, y: number) => grey[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]!;
  for (let y = 0; y < height * scale; y++) {
    for (let x = 0; x < width * scale; x++) {
      // bilinear between the source pixels around this output pixel
      const sx = (x + 0.5) / scale - 0.5;
      const sy = (y + 0.5) / scale - 0.5;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const value =
        at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
      const o = ((y + MARGIN) * outW + x + MARGIN) * 4;
      out[o] = value;
      out[o + 1] = value;
      out[o + 2] = value;
    }
  }
  return { width: outW, height: outH, data: out };
}

/** Hands a prepared crop to the worker as a PNG (browser only; tests give their own). */
export async function rasterToBlob(raster: Raster): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare pictures for the card reader.");
  context.putImageData(new ImageData(raster.data as Uint8ClampedArray<ArrayBuffer>, raster.width, raster.height), 0, 0);
  return new Promise((done, fail) => {
    canvas.toBlob((blob) => {
      if (blob) done(blob);
      else fail(new Error("This browser could not prepare a picture for the card reader."));
    }, "image/png");
  });
}

export interface TesseractRecogniserOptions {
  paths: OcrPaths;
  /** Replaced in tests. */
  createWorker?: OcrWorkerFactory;
  toImage?: (raster: Raster) => Promise<unknown>;
  /** Told what the worker is doing while it loads ("loading language traineddata", 0.4). */
  onStatus?: (status: string, progress: number) => void;
}

export interface TesseractRecogniser extends Recogniser {
  /** Stops the worker and frees its memory. A later read starts a new one. */
  close(): Promise<void>;
}

/**
 * The card reader: the `Recogniser` of the scan engine, backed by tesseract.js. Creating it loads nothing. The worker, its
 * core and the English data are fetched from our own files the first time a field is read. Reads go one at a time.
 */
export function tesseractRecogniser(options: TesseractRecogniserOptions): TesseractRecogniser {
  const start = options.createWorker ?? startTesseractWorker;
  const toImage = options.toImage ?? rasterToBlob;
  let worker: Promise<OcrWorker> | undefined;
  let lastParameters = "";
  let queue: Promise<unknown> = Promise.resolve();

  const open = (): Promise<OcrWorker> => {
    worker ??= start(options.paths, options.onStatus ?? (() => undefined)).catch((error: unknown) => {
      worker = undefined; // a failed start can be tried again
      throw error;
    });
    return worker;
  };

  const read = async (field: DigitsField | TextField, crop: Raster): Promise<Recognised> => {
    const reader = await open();
    const parameters = parametersFor(field);
    const key = JSON.stringify(parameters);
    if (key !== lastParameters) {
      await reader.setParameters(parameters);
      lastParameters = key;
    }
    const { data } = await reader.recognize(await toImage(prepareCrop(crop)), {}, { text: true, blocks: true });
    const text = data.text.replace(/\s+/g, " ").trim();
    // The page figure reads 0 for short single-line reads that are right; the letters' own figures are the honest ones.
    const confidence = meanSymbolConfidence(data.blocks) ?? data.confidence;
    return { text, confidence: text === "" ? 0 : Math.min(1, Math.max(0, confidence / 100)) };
  };

  return {
    recognise(field, crop) {
      const result = queue.then(() => read(field, crop));
      queue = result.catch(() => undefined);
      return result;
    },
    async close() {
      const current = worker;
      worker = undefined;
      lastParameters = "";
      if (current) await (await current.catch(() => undefined))?.terminate();
    },
  };
}
