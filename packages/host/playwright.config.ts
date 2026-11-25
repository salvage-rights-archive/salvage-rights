import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { BASE_PATH, DEV_ORIGIN, FREE_ORIGIN } from "./e2e/urls";

const repoRoot = resolve(import.meta.dirname, "../..");

// One static server per edition, each behaving like GitHub Pages. `npm run test:e2e` builds both editions first.
const DEV_PORT = new URL(DEV_ORIGIN).port;
const FREE_PORT = new URL(FREE_ORIGIN).port;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  outputDir: resolve(repoRoot, "test-results"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // One retry: Firefox now and then crashes its page ("Page crashed") during an axe scan of the editor when all
    // three browsers run at once. A real violation fails both attempts.
    { name: "firefox", retries: 1, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: `node packages/host/e2e/serve-pages.mjs dist/dev ${DEV_PORT}`,
      cwd: repoRoot,
      url: `${DEV_ORIGIN}${BASE_PATH}/`,
      reuseExistingServer: false,
    },
    {
      command: `node packages/host/e2e/serve-pages.mjs dist/free ${FREE_PORT}`,
      cwd: repoRoot,
      url: `${FREE_ORIGIN}${BASE_PATH}/`,
      reuseExistingServer: false,
    },
  ],
});
