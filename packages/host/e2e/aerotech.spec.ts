import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, test } from "./fixtures";

// AeroTech's pages sit under a family route until the game is ready (AERO-9); see ui/aero/routes.ts.
const AERO = "/battletech/aerotech-preview";

/** Builds a bare fighter under an edition (by id) from the home page and returns the editor's path. */
async function startUnit(page: Page, edition: string, name: string): Promise<string> {
  await page.goto(`${DEV}${AERO}/home`);
  // The file input is the last thing storage opens for: waiting for it is waiting for the page to be ready.
  await expect(page.getByLabel("Import a file")).toBeEnabled();
  const form = page.getByRole("form", { name: "Build a new unit" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Edition").selectOption(edition);
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = new URL(page.url());
  return `${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`;
}

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

test("build a fighter in AeroTech (1986) and in the current rules, add a weapon, save and find both on the home page", async ({ page }) => {
  await startUnit(page, "aerotech-1986", "Old Sabre");
  // Nothing of the current rules is on its page.
  await expect(page.getByLabel("Rules level")).toHaveCount(0);
  await expect(page.getByLabel("Type", { exact: true })).toHaveValue("aerospace-fighter");
  await page.getByRole("button", { name: "Add equipment to Nose" }).click();
  await page.getByLabel("Search by name").fill("medium laser");
  await page.getByRole("button", { name: /^Medium Laser/ }).first().click();
  await expect(page.getByRole("button", { name: "Remove Medium Laser" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rules check" })).toBeVisible();

  await startUnit(page, "tw-tm-so", "New Sabre");
  await expect(page.getByLabel("Rules level")).toBeVisible();
  await page.getByRole("link", { name: /Your AeroTech units/ }).click();
  await expect(page.getByRole("link", { name: "Open Old Sabre" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open New Sabre" })).toBeVisible();
});

test("the AeroTech home and editor have no axe violations in either theme and fit 320 px", async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await startUnit(page, "tw-tm-so", "Scan Sabre");
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [`${AERO}/home`, editor]) {
      await page.goto(`${DEV}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
    await page.getByRole("button", { name: "Add equipment to Nose" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme, the picker`).toEqual([]);
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of [`${AERO}/home`, editor]) {
    await page.goto(`${DEV}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, path).toBe(widths.client);
    for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
      const box = await control.boundingBox();
      if (box) expect(box.height, `${path}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
    }
  }
});
