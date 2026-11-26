import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, test } from "./fixtures";

const CLASSIC = "/battletech/classic";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Builds a bare Standard-level tracked vehicle from the Classic home and returns the editor's path. */
async function startVehicle(page: Page, name: string): Promise<string> {
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expect(page.getByLabel("Import a file", { exact: true })).toBeEnabled();
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
  // The armor drawing is keyboard-operable: Enter and Space on a location go to its field.
  const front = page.getByRole("button", { name: /^Front, 30 armor/ });
  await front.focus();
  await page.getByLabel("Left Side armor").focus();
  await front.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Front armor")).toBeFocused();
  await page.getByRole("button", { name: /^Rear, 0 armor/ }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Rear armor")).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Scan Tank record sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scan Tank record sheet" })).toBeVisible();
  await page.goto(`${DEV}${CLASSIC}/home`);
  await expectPage(page.getByRole("link", { name: "Open Scan Tank" })).toBeVisible();
});

test("the vehicle editor, picker and record sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await startVehicle(page, "Axe Tank");
  const sheet = editor.replace("vehicle-editor", "vehicle-sheet");
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [editor, sheet]) {
      await page.goto(`${DEV}${path}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
    await page.goto(`${DEV}${editor}`);
    await page.getByRole("button", { name: "Add equipment" }).click();
    await expectPage(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme, the picker`).toEqual([]);
    await page.keyboard.press("Escape");
  }
});

test("a mine dispenser takes a mine type chosen on its row, names it on the record sheet, and the row has no axe violations", async ({ page }) => {
  test.setTimeout(120_000);
  const editor = await startVehicle(page, "Mine Tank");
  await page.getByLabel("Rules level").selectOption("advanced");
  await page.getByRole("button", { name: "Add equipment" }).click();
  await page.getByLabel("Search by name").fill("mine dispenser");
  await page.getByRole("button", { name: /^Mine Dispenser/ }).first().click();
  const type = page.getByLabel(/^Mine type of Mine Dispenser/);
  await expect(type).toHaveValue("mine-standard-is");
  await type.selectOption({ label: "Active" });
  await expect(page.getByText(/Active: two shots cost 20,000 C-bills to replace/)).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.goto(`${DEV}${editor.replace("vehicle-editor", "vehicle-sheet")}`);
  await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Mine Dispenser (Vehicular), Active").first()).toBeAttached();
});
