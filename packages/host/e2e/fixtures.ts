import { test as base, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { BASE_PATH, DEV_ORIGIN, FREE_ORIGIN } from "./urls";

export const DEV = `${DEV_ORIGIN}${BASE_PATH}`;
export const FREE = `${FREE_ORIGIN}${BASE_PATH}`;

/** Every test fails on a console error or an uncaught page error. */
export const test = base.extend<{ problems: void }>({
  problems: [
    async ({ page }, use) => {
      const found: string[] = [];
      // GitHub Pages answers a deep link with 404.html and status 404, and the browser logs that document
      // response as a console error. It is the intended route into the app, so that one message is expected.
      const notFoundPages = new Set<string>();
      page.on("response", (response) => {
        if (response.status() === 404 && response.request().isNavigationRequest()) notFoundPages.add(response.url());
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const address = message.location().url.split("#")[0] ?? "";
        // Only the console error that names the document answered 404; the wording differs by browser.
        if (notFoundPages.has(address)) return;
        found.push(`console error: ${message.text()}`);
      });
      page.on("pageerror", (error) => {
        found.push(`page error: ${error.message}`);
      });
      await use();
      expect(found).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Moves focus to the next control the way a keyboard does. WebKit's Tab skips links unless the user turns on a
 * browser setting that a test cannot reach, so there the expected control is focused by script instead (the
 * page was never clicked, so :focus-visible still applies). Other browsers press Tab `presses` times.
 */
export async function tabTo(page: Page, browserName: string, expected: Locator, presses = 1): Promise<void> {
  if (browserName === "webkit") {
    await expected.focus();
    return;
  }
  for (let i = 0; i < presses; i += 1) await page.keyboard.press("Tab");
}

export { expect };
