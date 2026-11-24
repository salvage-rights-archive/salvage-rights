import { test as base, expect } from "@playwright/test";

export const DEV = "http://localhost:4173/salvage-rights";
export const FREE = "http://localhost:4174/salvage-rights";

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
        if (message.text().includes("status of 404") && notFoundPages.has(address)) return;
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

export { expect };
