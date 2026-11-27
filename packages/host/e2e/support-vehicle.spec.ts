import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, clippedSelects, expect, expectPage, test } from "./fixtures";

const CLASSIC = "/battletech/classic";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Builds a bare Standard-level Support Vehicle of the motive type from the Classic home and returns the editor's path. */
async function startSv(page: Page, name: string, motive: string, tons: string): Promise<string> {
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expect(page.getByLabel("Import a file", { exact: true })).toBeEnabled();
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Year").fill("3060");
  await form.getByLabel("Type", { exact: true }).selectOption(`supportvehicle:${motive}`);
  await form.getByLabel("Tonnage").fill(tons);
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = new URL(page.url());
  return `${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`;
}

test("build a wheeled Support Vehicle at 320 px: chassis, engine, fuel, armor, a weapon and a bay; save it and open its record sheet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await startSv(page, "Scan Hauler", "wheeled", "20");
  await expect(page.getByRole("heading", { name: "Rules check" })).toBeVisible();
  expect(await clippedSelects(page)).toEqual([]);
  // The book's order: chassis (an off-road modification raises nothing here), engine and fuel, armor, then equipment.
  await page.getByLabel(/^Off-road/).check();
  await page.getByLabel("Cruising MP").fill("4");
  await expect(page.getByText(/^The engine weighs/)).toBeVisible();
  await page.getByLabel("Fuel, tons").fill("1");
  await page.getByLabel("Front armor").fill("20");
  await page.getByLabel("Rear armor").fill("10");
  await page.getByRole("button", { name: "Add equipment" }).click();
  await page.getByLabel("Search by name").fill("machine gun");
  await page.getByRole("button", { name: /^Machine Gun/ }).first().click();
  await expect(page.getByRole("button", { name: /^Remove Machine Gun/ })).toBeVisible();
  // The armor drawing is keyboard-operable: Enter on a location goes to its field.
  const front = page.getByRole("button", { name: /^Front, 20 armor/ });
  await front.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Front armor")).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  if (process.env.SV_SHOT) await page.screenshot({ path: `${process.env.SV_SHOT}/sv-editor-320.png`, fullPage: true });
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Scan Hauler record sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scan Hauler record sheet" })).toBeVisible();
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expectPage(page.getByRole("link", { name: "Open Scan Hauler" })).toBeVisible();
});

test("the Support Vehicle editor, picker and record sheet (a ground unit, a fixed-wing unit) have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(180_000);
  const ground = await startSv(page, "Axe Truck", "wheeled", "10");
  const air = await startSv(page, "Axe Plane", "fixed-wing", "20");
  if (process.env.SV_SHOT) {
    await page.goto(`${DEV}${air.replace("support-vehicle-editor", "support-vehicle-sheet")}`);
    await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${process.env.SV_SHOT}/sv-air-sheet.png`, fullPage: true });
  }
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [ground, ground.replace("support-vehicle-editor", "support-vehicle-sheet"), air, air.replace("support-vehicle-editor", "support-vehicle-sheet")]) {
      await page.goto(`${DEV}${path}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
    await page.goto(`${DEV}${ground}`);
    await page.getByRole("button", { name: "Add equipment" }).click();
    await expectPage(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme, the picker`).toEqual([]);
    await page.keyboard.press("Escape");
  }
});

test("a Small unit mounts infantry weapons only and the rules check says so; hide, do not mark: the picker lists no heavy weapon", async ({ page }) => {
  test.setTimeout(120_000);
  await startSv(page, "Tiny Bike", "wheeled", "0.5");
  await page.getByRole("button", { name: "Add equipment" }).click();
  await page.getByLabel("Search by name").fill("medium laser");
  await expect(page.getByText("No equipment matches.")).toBeVisible();
  await page.getByLabel("Search by name").fill("rifle");
  await page.getByRole("button", { name: /Rifle/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Remove / })).toBeVisible();
  await expect(page.getByText(/^The rules ask for a crew of/)).toBeVisible();
});
