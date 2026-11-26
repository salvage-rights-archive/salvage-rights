import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, test } from "./fixtures";

const CLASSIC = "/battletech/classic";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Builds a bare Standard-level tracked vehicle from the Classic home and returns the editor's path. */
async function startVehicle(page: Page, name: string): Promise<string> {
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expect(page.getByLabel("Import a file")).toBeEnabled();
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Year").fill("3060");
  await form.getByLabel("Type", { exact: true }).selectOption("vehicle:tracked");
  await form.getByLabel("Tonnage").fill("40");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = new URL(page.url());
  return `${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`;
}

test("build a tracked vehicle at 320 px, give it armor and a weapon, save it and open its record sheet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await startVehicle(page, "Scan Tank");
  await expect(page.getByRole("heading", { name: "Rules check" })).toBeVisible();
  await page.getByLabel("Armor tons").fill("5");
  await page.getByLabel("Front armor").fill("30");
  await page.getByRole("button", { name: "Add equipment" }).click();
  await page.getByLabel("Search by name").fill("machine gun");
  await page.getByRole("button", { name: /^Machine Gun/ }).first().click();
  await expect(page.getByRole("button", { name: /^Remove Machine Gun/ })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Scan Tank record sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scan Tank record sheet" })).toBeVisible();
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expect(page.getByRole("link", { name: "Open Scan Tank" })).toBeVisible();
});

test("the vehicle editor, picker and record sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(180_000);
  const editor = await startVehicle(page, "Axe Tank");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const sheet = editor.replace("vehicle-editor", "vehicle-sheet");
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [editor, sheet]) {
      await page.goto(`${DEV}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
    await page.goto(`${DEV}${editor}`);
    await page.getByRole("button", { name: "Add equipment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme, the picker`).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
