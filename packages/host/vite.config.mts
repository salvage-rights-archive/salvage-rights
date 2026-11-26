import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { familiesPlugin, readEdition } from "./vite/families-plugin.ts";
import { ocrNotice, ocrPlugin } from "./vite/ocr-plugin.ts";
import { pwaPlugin } from "./vite/pwa-plugin.ts";

const repoRoot = resolve(import.meta.dirname, "../..");

/** public/ files are copied as they are, so the base path in 404.html is filled in after the build. */
function notFoundPlugin(base: string): Plugin {
  let outDir = "";
  return {
    name: "salvage-rights-404",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = join(outDir, "404.html");
      writeFileSync(file, readFileSync(file, "utf8").replaceAll("%BASE_URL%", base));
    },
  };
}

// The mode names the edition: dev, free or ten-thousand-fleets.
export default defineConfig(({ mode }) => {
  const editionPath = join(repoRoot, "editions", `edition.${mode}.json`);
  const edition = readEdition(editionPath);
  // The card reader's files ship only in the dev edition for now (its scan test page); the Alpha Strike scan page widens this.
  const ocr = edition.id === "dev";
  const nodeModules = join(repoRoot, "node_modules");
  const site = JSON.parse(readFileSync(join(repoRoot, "site.config.json"), "utf8")) as { basePath: string };
  return {
    base: site.basePath,
    plugins: [
      react(),
      // The host's own credits (fonts and pictures) and the two font licenses go into the build's notices file:
      // the Open Font License for Stardos Stencil, the Apache License for Special Elite.
      familiesPlugin(
        editionPath,
        [
          join(import.meta.dirname, "CREDITS.md"),
          join(import.meta.dirname, "src/fonts/OFL.txt"),
          join(import.meta.dirname, "../family-battletech/src/ui/gothic/fonts/OFL.txt"),
          join(import.meta.dirname, "LICENSE"),
        ],
        ocr ? [ocrNotice(nodeModules)] : [],
      ),
      ...(ocr ? [ocrPlugin(nodeModules, site.basePath)] : []),
      notFoundPlugin(site.basePath),
      // The free edition is the published one and has the plain name; the others say which edition they are. Colours
      // come from the site look: the header's dark steel and the dark theme's page colour (tokens.scss).
      pwaPlugin({
        name: edition.id === "free" ? "Salvage Rights" : `Salvage Rights (${edition.id})`,
        shortName: edition.id === "free" ? "Salvage Rights" : `SR ${edition.id}`.slice(0, 12),
        base: site.basePath,
        themeColor: "#171a19",
        backgroundColor: "#1c1f1e",
      }),
    ],
    build: { outDir: join(repoRoot, "dist", edition.id), emptyOutDir: true },
  };
});
