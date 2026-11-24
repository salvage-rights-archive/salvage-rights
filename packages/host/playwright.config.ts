import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = resolve(import.meta.dirname, "../..");

// One static server per edition, each behaving like GitHub Pages. `npm run test:e2e` builds both editions first.
export const DEV_URL = "http://localhost:4173";
export const FREE_URL = "http://localhost:4174";

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  outputDir: resolve(repoRoot, "test-results"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "node packages/host/e2e/serve-pages.mjs dist/dev 4173",
      cwd: repoRoot,
      url: `${DEV_URL}/salvage-rights/`,
      reuseExistingServer: false,
    },
    {
      command: "node packages/host/e2e/serve-pages.mjs dist/free 4174",
      cwd: repoRoot,
      url: `${FREE_URL}/salvage-rights/`,
      reuseExistingServer: false,
    },
  ],
});
