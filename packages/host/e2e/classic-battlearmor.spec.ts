import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, test } from "./fixtures";

const HOME = "/battletech/classic/home";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Builds a Light Inner Sphere suit with 6 armor points and a small laser from the Classic home, saves it, and returns the editor and sheet paths. */
async function buildSuit(page: Page, name: string): Promise<{ editor: string; sheet: string }> {
  await page.goto(`${DEV}${HOME}`);
  await expect(page.getByLabel("Import a file", { exact: true })).toBeEnabled();
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Year").fill("3070");
  await form.getByLabel("Type", { exact: true }).selectOption({ label: "Battle armor" });
  await form.getByLabel("Weight class").selectOption("light");
  await form.getByRole("button", { name: "Start building" }).click();
  await expectPage(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.getByRole("textbox", { name: "Armor points" }).fill("6");
  await page.getByLabel("Item", { exact: true }).selectOption({ label: "Small Laser (200 kg, 1 slot)" });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Small Laser" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const url = new URL(page.url());
  const editor = `${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`;
  return { editor, sheet: editor.replace("battlearmor-editor", "battlearmor-sheet") };
}

test("build a battle armor suit at 320 px, save it, find it on the home page and open its record sheet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  const { editor } = await buildSuit(page, "Scan Suit");
  // The rules check and the Battle Value are beside the unit.
  await expect(page.getByRole("heading", { name: "Rules check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Battle Value and cost" })).toBeVisible();
  await page.goto(`${DEV}${HOME}`);
  await expectPage(page.getByRole("link", { name: "Open Scan Suit" })).toBeVisible();
  await page.getByRole("link", { name: "Record sheet for Scan Suit" }).click();
  await expectPage(page.getByRole("img", { name: /Scan Suit record sheet/ })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.goto(`${DEV}${editor}`);
  await expectPage(page.getByRole("heading", { level: 1, name: "Scan Suit" })).toBeVisible();
  const editorWidths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(editorWidths.scroll).toBe(editorWidths.client);
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
});

test("the battle armor editor and sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  const { editor, sheet } = await buildSuit(page, "Axe Suit");
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [editor, sheet]) {
      await page.goto(`${DEV}${path}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
  }
});
