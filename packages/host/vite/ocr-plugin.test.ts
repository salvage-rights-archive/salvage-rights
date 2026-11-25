import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { OCR_ASSETS, filesMissingFromNotice, ocrBundle, ocrNotice } from "./ocr-plugin";
import { precacheFiles, serviceWorkerSource } from "./pwa-plugin";

const NODE_MODULES = join(resolve(import.meta.dirname, "../../.."), "node_modules");

describe("the card reader's build files", () => {
  it("are all named in the third-party notice, with their licenses, and an unnamed file is caught", () => {
    const notice = ocrNotice(NODE_MODULES);
    expect(filesMissingFromNotice(notice, OCR_ASSETS.map((asset) => asset.name))).toEqual([]);
    for (const name of ["tesseract.js ", "tesseract.js-core ", "@tesseract.js-data/eng "]) expect(notice).toContain(name);
    expect(notice).toContain("Apache License");
    expect(filesMissingFromNotice(notice, ["surprise.bin"])).toEqual(["surprise.bin"]);
  });

  it("go in a folder named for their contents, stay out of the precache, and are served by the worker from their own cache", () => {
    const bundle = ocrBundle(NODE_MODULES);
    expect(bundle.hash).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.parse(bundle.manifest)).toMatchObject({ hash: bundle.hash, folder: `ocr/${bundle.hash}/` });
    expect(precacheFiles(["index.html", "ocr.json", `ocr/${bundle.hash}/worker.min.js`])).toEqual(["index.html", "ocr.json"]);
    const source = serviceWorkerSource("v1", "/salvage-rights/", ["/salvage-rights/index.html"]);
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain('"sr-ocr-"');
    expect(source).toContain('BASE + "ocr/"');
  });
});
