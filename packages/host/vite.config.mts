import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { familiesPlugin, readEdition } from "./vite/families-plugin.ts";

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
  const site = JSON.parse(readFileSync(join(repoRoot, "site.config.json"), "utf8")) as { basePath: string };
  return {
    base: site.basePath,
    plugins: [react(), familiesPlugin(editionPath), notFoundPlugin(site.basePath)],
    build: { outDir: join(repoRoot, "dist", edition.id), emptyOutDir: true },
  };
});
