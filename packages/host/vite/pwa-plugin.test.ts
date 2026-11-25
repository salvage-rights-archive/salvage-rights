import { describe, expect, it } from "vitest";
import { cacheVersion, manifestJson, precacheFiles, serviceWorkerSource } from "./pwa-plugin";

describe("precacheFiles", () => {
  it("keeps the app's files, in order with forward slashes, and leaves out the worker, maps and the 404 page", () => {
    const files = precacheFiles([
      "sw.js",
      "404.html",
      "index.html",
      "assets\\app-1.js",
      "assets/app-1.js.map",
      "assets/font.woff2",
      "icon-512.png",
    ]);
    expect(files).toEqual(["assets/app-1.js", "assets/font.woff2", "icon-512.png", "index.html"]);
  });
});

describe("cacheVersion", () => {
  const first = { file: "index.html", content: "a" };
  const second = { file: "assets/x.js", content: "b" };
  it("is the same for the same files in any order, and changes when a file's bytes or name change", () => {
    const same = cacheVersion([first, second]);
    expect(cacheVersion([second, first])).toBe(same);
    expect(same).toMatch(/^[0-9a-f]{12}$/);
    expect(cacheVersion([first, { file: "assets/x.js", content: "c" }])).not.toBe(same);
    expect(cacheVersion([first, { file: "assets/y.js", content: "b" }])).not.toBe(same);
  });
});

describe("serviceWorkerSource", () => {
  it("is valid script that names the versioned cache and lists every url under the base", () => {
    const source = serviceWorkerSource("abc123", "/salvage-rights/", [
      "/salvage-rights/index.html",
      "/salvage-rights/assets/x.js",
    ]);
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain('"sr-shell-abc123"');
    expect(source).toContain('"/salvage-rights/assets/x.js"');
    // mordel.net is another origin and is never answered by the worker.
    expect(source).toContain("url.origin !== self.location.origin");
  });
});

describe("manifestJson", () => {
  it("puts the start page, scope and icons under the base path and has a maskable icon", () => {
    const manifest = JSON.parse(
      manifestJson({
        name: "Salvage Rights",
        shortName: "Salvage Rights",
        base: "/salvage-rights/",
        themeColor: "#171a19",
        backgroundColor: "#1c1f1e",
      }),
    ) as { start_url: string; scope: string; display: string; icons: { src: string; purpose: string }[] };
    expect(manifest.start_url).toBe("/salvage-rights/");
    expect(manifest.scope).toBe("/salvage-rights/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.every((icon) => icon.src.startsWith("/salvage-rights/"))).toBe(true);
    expect(manifest.icons.map((icon) => icon.purpose)).toContain("maskable");
  });
});
