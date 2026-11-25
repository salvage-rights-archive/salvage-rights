import { describe, expect, it, vi } from "vitest";
import { OCR_CACHE_PREFIX, filesForDevice, keepButton, keepReader, ocrPaths, readKeepState } from "./ocr-cache";
import type { CacheStorageLike, OcrManifest } from "./ocr-cache";

const MANIFEST: OcrManifest = {
  version: 1,
  hash: "aaaaaaaaaaaa",
  folder: "ocr/aaaaaaaaaaaa/",
  worker: "worker.min.js",
  lang: "eng.traineddata.gz",
  cores: { relaxedsimd: "core-r.wasm.js", simd: "core-s.wasm.js", plain: "core-p.wasm.js" },
  sizes: { "worker.min.js": 100_000, "core-s.wasm.js": 3_900_000, "eng.traineddata.gz": 2_900_000 },
};
const BASE = "https://example.test/salvage-rights/";

function fakeStorage(existing: Record<string, string[]> = {}) {
  const stores = new Map(Object.entries(existing).map(([name, urls]) => [name, new Set(urls)]));
  const storage: CacheStorageLike = {
    keys: () => Promise.resolve([...stores.keys()]),
    open: (name) => {
      const store = stores.get(name) ?? new Set<string>();
      stores.set(name, store);
      return Promise.resolve({
        match: (request: string) => Promise.resolve(store.has(request) ? {} : undefined),
        put: (request: string) => {
          store.add(request);
          return Promise.resolve();
        },
      });
    },
    delete: (name) => Promise.resolve(stores.delete(name)),
  };
  return { storage, stores };
}

describe("keeping the card reader", () => {
  it("finds the files for this device under our own address and nowhere else", () => {
    expect(filesForDevice(MANIFEST, BASE, "simd")).toEqual([
      `${BASE}ocr/aaaaaaaaaaaa/worker.min.js`,
      `${BASE}ocr/aaaaaaaaaaaa/core-s.wasm.js`,
      `${BASE}ocr/aaaaaaaaaaaa/eng.traineddata.gz`,
    ]);
    expect(Object.values(ocrPaths(MANIFEST, BASE)).every((path) => path.startsWith(BASE))).toBe(true);
  });

  it("fetches each file into the reader's cache, then drops older reader caches, and reads as kept", async () => {
    const files = filesForDevice(MANIFEST, BASE, "simd");
    const { storage, stores } = fakeStorage({ [`${OCR_CACHE_PREFIX}old`]: ["x"], "sr-shell-1": ["y"] });
    expect(await readKeepState(MANIFEST, files, storage)).toBe("not-kept");
    const fetcher = vi.fn(() => Promise.resolve(new Response("data")));
    const progress = vi.fn();
    await keepReader(MANIFEST, files, storage, progress, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(progress).toHaveBeenLastCalledWith(3, 3);
    expect([...stores.keys()].sort()).toEqual([`${OCR_CACHE_PREFIX}aaaaaaaaaaaa`, "sr-shell-1"]);
    expect(await readKeepState(MANIFEST, files, storage)).toBe("kept");
    expect(await readKeepState(MANIFEST, files, undefined)).toBe("unavailable");
  });

  it("says in each state what the button does and why", () => {
    expect(keepButton("not-kept", "6.8 MB", true)).toMatchObject({ label: "Keep the card reader on this device", disabled: false });
    expect(keepButton("not-kept", "6.8 MB", false)).toMatchObject({ disabled: true, note: expect.stringContaining("offline") as string });
    expect(keepButton("keeping", "6.8 MB", true).disabled).toBe(true);
    expect(keepButton("kept", "6.8 MB", false)).toMatchObject({ label: "Card reader kept on this device", disabled: true });
    expect(keepButton("failed", "6.8 MB", true)).toMatchObject({ disabled: false });
    expect(keepButton("unavailable", "6.8 MB", true).disabled).toBe(true);
  });
});
