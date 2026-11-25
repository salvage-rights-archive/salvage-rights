import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Plugin } from "vite";

/** The files of the service worker and of the manifest, both at the root of the build. */
export const SERVICE_WORKER_FILE = "sw.js";
export const MANIFEST_FILE = "manifest.webmanifest";
/** Every cache this app makes starts with this, so "reset" can clear ours and nobody else's. */
export const CACHE_PREFIX = "sr-shell-";

/** Files that are never precached: the worker itself, source maps, and the Pages fallback (the worker replaces it). */
const NOT_PRECACHED = [SERVICE_WORKER_FILE, "404.html", ".nojekyll"];

export interface PwaOptions {
  /** Name shown under the icon. The free edition is "Salvage Rights"; others add their edition id. */
  name: string;
  shortName: string;
  base: string;
  themeColor: string;
  backgroundColor: string;
}

/** Build files to precache: everything except the worker, maps and the 404 page. Sorted, with `/` separators. */
export function precacheFiles(files: string[]): string[] {
  return files
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => !file.endsWith(".map") && !NOT_PRECACHED.includes(file))
    .sort();
}

/** The cache's version: the same files with the same bytes always give the same one; any change gives a new one. */
export function cacheVersion(entries: { file: string; content: Uint8Array | string }[]): string {
  const hash = createHash("sha256");
  for (const { file, content } of [...entries].sort((a, b) => a.file.localeCompare(b.file))) {
    hash.update(`${file}\0`).update(content).update("\0");
  }
  return hash.digest("hex").slice(0, 12);
}

export function manifestJson(options: PwaOptions): string {
  const icon = (file: string, size: number, purpose: "any" | "maskable") => ({
    src: `${options.base}${file}`,
    sizes: `${String(size)}x${String(size)}`,
    type: "image/png",
    purpose,
  });
  return `${JSON.stringify(
    {
      name: options.name,
      short_name: options.shortName,
      description: "Battlefield recovery and salvage for mecha tabletop games. Works offline once installed.",
      id: options.base,
      start_url: options.base,
      scope: options.base,
      display: "standalone",
      theme_color: options.themeColor,
      background_color: options.backgroundColor,
      icons: [
        icon("icon-192.png", 192, "any"),
        icon("icon-512.png", 512, "any"),
        icon("icon-maskable-512.png", 512, "maskable"),
      ],
    },
    null,
    2,
  )}\n`;
}

/**
 * The service worker, written out by hand (no library). The page URLs are absolute paths under the base. Behaviour:
 * install fetches every file fresh into a cache named for the version; the new worker then waits until the page asks
 * it to take over; activation deletes the older caches; same-origin GETs come from the cache; a page navigation is
 * answered with the app shell (the SPA decides what to show), so deep links work offline. Everything else, including
 * every request to mordel.net, is left to the network untouched.
 */
export function serviceWorkerSource(version: string, base: string, urls: string[]): string {
  const cacheName = `${CACHE_PREFIX}${version}`;
  return `// Salvage Rights service worker, written by the build (vite/pwa-plugin.ts). Do not edit.
const VERSION = ${JSON.stringify(version)};
const CACHE = ${JSON.stringify(cacheName)};
const PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const BASE = ${JSON.stringify(base)};
const SHELL = BASE + "index.html";
const URLS = ${JSON.stringify(urls)};

self.addEventListener("install", (event) => {
  // "reload" skips the browser's own HTTP cache, so a half-finished deploy cannot fill the cache with old files.
  // If any file fails, the install fails and the old worker stays in charge.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS.map((url) => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
  if (event.data === "GET_VERSION" && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const exact = await cache.match(url.pathname === BASE ? SHELL : url.pathname);
      if (exact) return exact;
      if (request.mode === "navigate") return (await cache.match(SHELL)) || fetch(request);
      return fetch(request);
    }),
  );
});
`;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Writes the manifest and the service worker for the edition being built. The manifest is a normal build asset; the
 * worker is written last, after every other file (including the public ones) is in the build folder, so its list and
 * version cover the whole edition. In the dev server only the manifest is served; no worker runs there.
 */
export function pwaPlugin(options: PwaOptions): Plugin {
  let outDir = "";
  return {
    name: "salvage-rights-pwa",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(`${options.base}${MANIFEST_FILE}`, (_request, response) => {
        response.setHeader("content-type", "application/manifest+json");
        response.end(manifestJson(options));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: MANIFEST_FILE, source: manifestJson(options) });
    },
    closeBundle: {
      order: "post",
      handler() {
        if (outDir === "") return;
        const files = precacheFiles(listFiles(outDir).map((file) => relative(outDir, file)));
        const version = cacheVersion(files.map((file) => ({ file, content: readFileSync(join(outDir, file)) })));
        const urls = files.map((file) => `${options.base}${file}`);
        writeFileSync(join(outDir, SERVICE_WORKER_FILE), serviceWorkerSource(version, options.base, urls));
      },
    },
  };
}
