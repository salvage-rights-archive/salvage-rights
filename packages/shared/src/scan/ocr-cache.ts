import type { OcrPaths } from "./tesseract";

/** Same value as OCR_CACHE_PREFIX in the host's vite/ocr-plugin.ts, which names the cache the worker reads from. */
export const OCR_CACHE_PREFIX = "sr-ocr-";

/** The build writes this beside the app (`ocr.json`): which reader files this build holds and where. */
export interface OcrManifest {
  version: 1;
  /** Names the folder and the cache; any change to a file changes it. */
  hash: string;
  /** Folder of the reader's files, relative to the site's base. */
  folder: string;
  worker: string;
  lang: string;
  /** One core per kind of device; a device loads only the one it can run. */
  cores: { relaxedsimd: string; simd: string; plain: string };
  /** Size in bytes of each file, for the figure shown beside the button. */
  sizes: Record<string, number>;
}

export type CoreKind = keyof OcrManifest["cores"];

function isManifest(value: unknown): value is OcrManifest {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Partial<OcrManifest>;
  return (
    m.version === 1 &&
    typeof m.hash === "string" &&
    typeof m.folder === "string" &&
    typeof m.worker === "string" &&
    typeof m.lang === "string" &&
    typeof m.cores === "object" &&
    m.cores !== null &&
    typeof m.cores.relaxedsimd === "string" &&
    typeof m.cores.simd === "string" &&
    typeof m.cores.plain === "string" &&
    typeof m.sizes === "object" &&
    m.sizes !== null
  );
}

/** Reads the manifest from the site's base address (a full address ending in a slash). Null when this build has no reader. */
export async function readOcrManifest(base: string, fetcher: typeof fetch = fetch): Promise<OcrManifest | null> {
  try {
    const response = await fetcher(`${base}ocr.json`);
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isManifest(body) ? body : null;
  } catch {
    return null;
  }
}

/** Which core this device runs; the same test tesseract.js makes, so we cache the file it will ask for. */
export async function detectCore(): Promise<CoreKind> {
  const { simd, relaxedSimd } = await import("wasm-feature-detect");
  if (await relaxedSimd()) return "relaxedsimd";
  if (await simd()) return "simd";
  return "plain";
}

/** The three addresses the recogniser needs, as full addresses under the site's base. */
export function ocrPaths(manifest: OcrManifest, base: string): OcrPaths {
  const folder = `${base}${manifest.folder}`;
  return { workerPath: `${folder}${manifest.worker}`, corePath: folder, langPath: folder };
}

/** The files this device loads: the worker, its core and the English data. Full addresses. */
export function filesForDevice(manifest: OcrManifest, base: string, core: CoreKind): string[] {
  const folder = `${base}${manifest.folder}`;
  return [manifest.worker, manifest.cores[core], manifest.lang].map((name) => `${folder}${name}`);
}

/** How many bytes the reader's files for this device come to. */
export function sizeForDevice(manifest: OcrManifest, core: CoreKind): number {
  return [manifest.worker, manifest.cores[core], manifest.lang].reduce((sum, name) => sum + (manifest.sizes[name] ?? 0), 0);
}

export function cacheName(manifest: OcrManifest): string {
  return `${OCR_CACHE_PREFIX}${manifest.hash}`;
}

export type KeepState = "unavailable" | "not-kept" | "keeping" | "kept" | "failed";

/** Just the part of the Cache Storage API we use, so tests can stand in for it. */
export interface CacheStorageLike {
  keys(): Promise<string[]>;
  open(name: string): Promise<{
    match(request: string): Promise<unknown>;
    put(request: string, response: Response): Promise<void>;
  }>;
  delete(name: string): Promise<boolean>;
}

/** Is every file this device needs already in the reader's cache? */
export async function readKeepState(manifest: OcrManifest, files: string[], storage: CacheStorageLike | undefined): Promise<KeepState> {
  if (!storage) return "unavailable";
  try {
    if (!(await storage.keys()).includes(cacheName(manifest))) return "not-kept";
    const cache = await storage.open(cacheName(manifest));
    for (const file of files) if (!(await cache.match(file))) return "not-kept";
    return "kept";
  } catch {
    return "unavailable";
  }
}

/**
 * Downloads this device's reader files into the reader's own cache (the app's worker answers from it, so the reader
 * works offline). Older reader caches are removed only after the new one is complete. Throws when a file fails; what
 * was fetched so far stays, and pressing again continues.
 */
export async function keepReader(
  manifest: OcrManifest,
  files: string[],
  storage: CacheStorageLike,
  onProgress: (done: number, total: number) => void = () => undefined,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const cache = await storage.open(cacheName(manifest));
  let done = 0;
  onProgress(0, files.length);
  for (const file of files) {
    if (!(await cache.match(file))) {
      const response = await fetcher(file, { cache: "reload" });
      if (!response.ok) throw new Error(`The card reader file ${file} could not be fetched (status ${String(response.status)}).`);
      await cache.put(file, response);
    }
    done += 1;
    onProgress(done, files.length);
  }
  for (const name of await storage.keys()) {
    if (name.startsWith(OCR_CACHE_PREFIX) && name !== cacheName(manifest)) await storage.delete(name);
  }
}

/** Megabytes to one decimal place, for the plain line beside the button. */
export function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export interface KeepButton {
  label: string;
  disabled: boolean;
  /** A plain line shown beside the button. */
  note: string;
}

/** What the "Keep the card reader on this device" button and its note say in each state. */
export function keepButton(state: KeepState, size: string, online: boolean): KeepButton {
  switch (state) {
    case "unavailable":
      return { label: "Keep the card reader on this device", disabled: true, note: "This browser cannot keep files for offline use, so the card reader needs a connection each time." };
    case "keeping":
      return { label: "Keeping the card reader…", disabled: true, note: `Downloading about ${size}.` };
    case "kept":
      return { label: "Card reader kept on this device", disabled: true, note: "The card reader works without a connection." };
    case "failed":
      return { label: "Try keeping the card reader again", disabled: !online, note: online ? "The download did not finish. What arrived is kept, so trying again continues." : "You are offline. Try again when you have a connection." };
    case "not-kept":
      return {
        label: "Keep the card reader on this device",
        disabled: !online,
        note: online ? `Downloads about ${size} once, so scanning works offline.` : "You are offline, and the card reader is not on this device yet.",
      };
  }
}
