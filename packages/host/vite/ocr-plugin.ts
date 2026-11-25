import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/** Every cache the card reader makes starts with this. The service worker serves the reader's files from it. */
export const OCR_CACHE_PREFIX = "sr-ocr-";
/** The reader's files are served under `<base>ocr/<hash>/`; the hash changes whenever any file does. */
export const OCR_DIR = "ocr";
export const OCR_MANIFEST_FILE = "ocr.json";

export type OcrPackage = "tesseract.js" | "tesseract.js-core" | "tessdata";

export interface OcrAsset {
  /** The name it is served under. The reader asks for these exact names. */
  name: string;
  /** Path under node_modules. */
  from: string;
  /** Who made it; the notices must name every one of these. */
  pkg: OcrPackage;
}

/** The files of the card reader. The only files under `ocr/`; the build stops if one is not covered by the notice. */
export const OCR_ASSETS: OcrAsset[] = [
  { name: "worker.min.js", from: "tesseract.js/dist/worker.min.js", pkg: "tesseract.js" },
  { name: "tesseract-core-relaxedsimd-lstm.wasm.js", from: "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", pkg: "tesseract.js-core" },
  { name: "tesseract-core-simd-lstm.wasm.js", from: "tesseract.js-core/tesseract-core-simd-lstm.wasm.js", pkg: "tesseract.js-core" },
  { name: "tesseract-core-lstm.wasm.js", from: "tesseract.js-core/tesseract-core-lstm.wasm.js", pkg: "tesseract.js-core" },
  { name: "eng.traineddata.gz", from: "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", pkg: "tessdata" },
];

interface PackageFacts {
  pkg: OcrPackage;
  npmName: string;
  what: string;
  /** The license the files are under, as the project that made them states it. */
  license: string;
  licenseFile: string;
  note?: string;
}

const PACKAGES: PackageFacts[] = [
  {
    pkg: "tesseract.js",
    npmName: "tesseract.js",
    what: "the card reader's worker script (worker.min.js) and the library that runs it",
    license: "Apache-2.0",
    licenseFile: "tesseract.js/LICENSE.md",
  },
  {
    pkg: "tesseract.js-core",
    npmName: "tesseract.js-core",
    what: "Tesseract OCR compiled to WebAssembly (the tesseract-core files)",
    license: "Apache-2.0",
    licenseFile: "tesseract.js-core/LICENSE",
  },
  {
    pkg: "tessdata",
    npmName: "@tesseract.js-data/eng",
    what: "the English reading model (eng.traineddata.gz), the integer form of the Tesseract project's tessdata_best model",
    license: "Apache-2.0",
    licenseFile: "tesseract.js-core/LICENSE",
    note:
      "The model is the Tesseract OCR project's, under the Apache License 2.0 (the text above). The npm package that carries it, " +
      "@tesseract.js-data/eng, states MIT for its own packaging and ships no license file; its repository, github.com/naptha/tessdata, is marked Apache-2.0.",
  },
];

function versionOf(nodeModules: string, npmName: string): string {
  const info = JSON.parse(readFileSync(join(nodeModules, npmName, "package.json"), "utf8")) as { version?: string };
  return info.version ?? "unknown version";
}

/** The notice for the card reader's files, for the end of the build's third-party notices. Names every file in OCR_ASSETS. */
export function ocrNotice(nodeModules: string, assets: OcrAsset[] = OCR_ASSETS): string {
  const parts = ["The card reader (files served under ocr/)", ""];
  parts.push("These files are not part of the app's own code. They are loaded only when a player first scans a card, and they run on the device.");
  for (const facts of PACKAGES) {
    const files = assets.filter((asset) => asset.pkg === facts.pkg).map((asset) => asset.name);
    if (files.length === 0) continue;
    parts.push("", `${facts.npmName} ${versionOf(nodeModules, facts.npmName)}: ${facts.what}`);
    parts.push(`License: ${facts.license}`, `Files: ${files.join(", ")}`);
    if (facts.note) parts.push(facts.note);
    parts.push("", readFileSync(join(nodeModules, facts.licenseFile), "utf8").trim());
  }
  return parts.join("\n");
}

/** Names of the files that the notice text does not mention. The build fails when this is not empty. */
export function filesMissingFromNotice(notice: string, files: string[]): string[] {
  return files.filter((file) => !notice.includes(file));
}

export interface OcrBundle {
  hash: string;
  files: { name: string; content: Buffer }[];
  manifest: string;
}

/** Reads the files and works out the hash and the manifest the page reads (`ocr.json`). */
export function ocrBundle(nodeModules: string, assets: OcrAsset[] = OCR_ASSETS): OcrBundle {
  const files = assets.map((asset) => ({ name: asset.name, content: readFileSync(join(nodeModules, asset.from)) }));
  const hash = createHash("sha256");
  for (const file of files) hash.update(`${file.name}\0`).update(file.content).update("\0");
  const id = hash.digest("hex").slice(0, 12);
  const sizes = Object.fromEntries(files.map((file) => [file.name, file.content.length]));
  const manifest = `${JSON.stringify(
    {
      version: 1,
      hash: id,
      folder: `${OCR_DIR}/${id}/`,
      worker: "worker.min.js",
      lang: "eng.traineddata.gz",
      cores: {
        relaxedsimd: "tesseract-core-relaxedsimd-lstm.wasm.js",
        simd: "tesseract-core-simd-lstm.wasm.js",
        plain: "tesseract-core-lstm.wasm.js",
      },
      sizes,
    },
    null,
    2,
  )}\n`;
  return { hash: id, files, manifest };
}

/** Adds the card reader's files to a build and to the dev server. Not in any edition that does not use them. */
export function ocrPlugin(nodeModules: string, base: string): Plugin {
  let bundle: OcrBundle | undefined;
  const load = () => (bundle ??= ocrBundle(nodeModules));
  return {
    name: "salvage-rights-ocr",
    configureServer(server) {
      server.middlewares.use(base, (request, response, next) => {
        const path = (request.url ?? "").split("?")[0] ?? "";
        const found = load();
        if (path === `/${OCR_MANIFEST_FILE}`) {
          response.setHeader("content-type", "application/json");
          response.end(found.manifest);
          return;
        }
        const file = path.startsWith(`/${OCR_DIR}/${found.hash}/`) ? found.files.find((f) => path.endsWith(`/${f.name}`)) : undefined;
        if (!file) return next();
        response.setHeader("content-type", file.name.endsWith(".gz") ? "application/gzip" : "text/javascript");
        response.end(file.content);
      });
    },
    generateBundle() {
      const found = load();
      const missing = filesMissingFromNotice(ocrNotice(nodeModules), found.files.map((file) => file.name));
      if (missing.length > 0) this.error(`The card reader's notice does not name: ${missing.join(", ")}`);
      for (const file of found.files) {
        this.emitFile({ type: "asset", fileName: `${OCR_DIR}/${found.hash}/${file.name}`, source: file.content });
      }
      this.emitFile({ type: "asset", fileName: OCR_MANIFEST_FILE, source: found.manifest });
    },
  };
}
