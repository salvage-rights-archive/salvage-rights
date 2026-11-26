import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, CLASSIC, FREE, expect, test } from "./fixtures";

// Service workers and offline emulation behave the same way in Chromium only, so the other browsers skip these.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "the offline worker is checked in Chromium");
});

/** Opens the built site and waits until its worker controls the page (the first install is complete). */
async function openInstalled(page: Page, path = "/"): Promise<void> {
  await page.goto(`${FREE}${path}`);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

test("a deep link reloads with no connection, and the offline notices show", async ({ page, context }) => {
  await openInstalled(page);
  await expect(page.getByText("Offline ready: the app is saved on this device")).toBeVisible();

  await context.setOffline(true);
  await page.goto(`${FREE}${CLASSIC}/home`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("You are offline.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Nothing here");

  await page.goto(`${FREE}${CLASSIC}/import`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test("the Aces pages, the game page among them, open with no connection once the app is installed", async ({ page, context }) => {
  await openInstalled(page);
  await expect(page.getByText("Offline ready: the app is saved on this device")).toBeVisible();
  await context.setOffline(true);
  for (const path of ["home", "new-game", "game?id=none"]) {
    await page.goto(`${FREE}${ACES}/${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await expect(page.getByText("That game is not saved on this device.")).toBeVisible();
  await context.setOffline(false);
});

test("a new version waits, asks before it reloads, and passes the axe scan in both themes", async ({ page, context }) => {
  // Every request for the worker's file answers with a changed copy, so the browser finds an update.
  await context.route("**/sw.js", async (route) => {
    const original = await route.fetch();
    await route.fulfill({ response: original, body: `${await original.text()}\n// a newer version\n` });
  });
  await openInstalled(page, "/settings");
  await page.getByRole("radio", { name: "Dark" }).check();
  await page.evaluate(async () => {
    // The page already asked at load; ask again so the test does not depend on that timing.
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  const bar = page.getByText("A new version is ready.");
  await expect(bar).toBeVisible();

  for (const theme of ["Dark", "Light"]) {
    await page.getByRole("radio", { name: theme }).check();
    await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme with the update bar`).toEqual([]);
  }

  // Unsaved changes: the page says so and stays where it is.
  await page.evaluate(() => {
    window.addEventListener("beforeunload", (event) => {
      event.preventDefault();
    });
  });
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByText("You have changes that are not saved: save them, then reload.")).toBeVisible();
});

test("a new version applies on request", async ({ page, context }) => {
  await context.route("**/sw.js", async (route) => {
    const original = await route.fetch();
    await route.fulfill({ response: original, body: `${await original.text()}\n// a newer version\n` });
  });
  await openInstalled(page);
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update();
  });
  await expect(page.getByText("A new version is ready.")).toBeVisible();
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByText("A new version is ready.")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("resetting the app cache clears this app's caches and keeps the saved data", async ({ page }) => {
  await openInstalled(page, "/about");
  await page.evaluate(() => caches.open("sr-shell-stale"));
  // The settings store is IndexedDB; it must survive the reset. Ask for its name before and after.
  const databases = () => page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name));
  await page.goto(`${FREE}/settings`);
  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("body")).toHaveClass("dark");
  await expect.poll(databases).toContain("salvage-rights:host");

  await page.goto(`${FREE}/about`);
  await expect(page.getByText(/Offline copy version: [0-9a-f]{12}\./)).toBeVisible();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Reset the app cache" }).click(),
  ]);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes("sr-shell-stale"))).toBe(false);
  await expect.poll(databases).toContain("salvage-rights:host");
  await expect(page.locator("body")).toHaveClass("dark");
});
