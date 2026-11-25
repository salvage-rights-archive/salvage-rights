import { createServer } from "node:net";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = resolve(import.meta.dirname, "../..");

/** Ask the operating system for a free ephemeral port (listen on 0, read the port, release it). */
function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once("error", fail);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      probe.close(() => done(port));
    });
  });
}

async function differentPort(taken: string | undefined): Promise<number> {
  for (;;) {
    const port = await freePort();
    if (String(port) !== taken) return port;
  }
}

// Each run takes two free ports of its own, so several runs (other worktrees, other sessions) can go at once.
// The workers load this file again and inherit the environment, so they see the same ports; set E2E_DEV_PORT and
// E2E_FREE_PORT yourself to pin them.
process.env["E2E_DEV_PORT"] ??= String(await freePort());
process.env["E2E_FREE_PORT"] ??= String(await differentPort(process.env["E2E_DEV_PORT"]));
const { BASE_PATH, DEV_ORIGIN, FREE_ORIGIN } = await import("./e2e/urls");

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
