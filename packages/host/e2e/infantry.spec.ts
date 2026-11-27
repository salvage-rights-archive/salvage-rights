import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, clippedSelects, expect, expectPage, test } from "./fixtures";

const HOME = `${DEV}/battletech/classic/home`;

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

test("build an infantry platoon at 320 px, save it, open its record sheet and find it on the home page; axe is clean in both themes", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Rifle Platoon");
  await form.getByLabel("Type", { exact: true }).selectOption({ label: "Conventional infantry" });
  await form.getByLabel("Year").fill("3050");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rifle Platoon" })).toBeVisible();
  expect(await clippedSelects(page)).toEqual([]);
  await page.getByLabel("Primary weapon").selectOption({ label: "Auto-Rifle: 0.52 damage, range 1, crew 1" });
  await expect(page.getByText(/Damage \d+ at full strength/)).toBeVisible();
  // Hide, do not mark: the Advanced options are not offered at the standard level.
  await expect(page.getByLabel("Condition-trained for")).toHaveCount(0);
  await expect(page.getByLabel("Field gun")).toHaveCount(0);
  await expect(page.getByLabel("Type", { exact: true }).locator("option", { hasText: "Beast-mounted" })).toHaveCount(0);
  // A sneak suit: its one system is chosen from a radio group, reachable by keyboard.
  await page.getByLabel("Rules level").selectOption("advanced");
  await page.getByLabel("Armor kit").selectOption({ label: "Sneak suit (one system) (divisor 1)" });
  await page.getByRole("radio", { name: "camo" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "camo" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "IR" })).not.toBeChecked();
  // Paramedics, condition-trained troops (a sneak suit is no cold-weather kit, so the rules check says so), a beast mount and a field gun.
  await page.getByLabel("Paramedics a squad").fill("1");
  await page.getByLabel("Condition-trained for").selectOption({ label: "Extreme cold" });
  await expect(page.getByText(/XCT troops for extreme cold must wear/)).toBeVisible();
  await page.getByLabel("Type", { exact: true }).selectOption({ label: "Motorized" });
  await page.getByLabel("Field gun", { exact: true }).selectOption({ label: "Autocannon/5" });
  await expect(page.getByText("Each needs 8 troopers.")).toBeVisible();
  // The record ends as a beast-mounted platoon that still holds its gun, so the saved editor shows every new field when axe scans it.
  await page.getByLabel("Type", { exact: true }).selectOption({ label: "Beast-mounted" });
  await page.getByLabel("Creature").selectOption({ label: "Elephant (Very Large, 2 Ground MP, 6 t)" });
  await expect(page.getByLabel("Troopers a squad")).toHaveValue("2");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  const editor = new URL(page.url());
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]):not([type=radio]), label:has(input[type=radio]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rifle Platoon record sheet" })).toBeVisible();
  const sheet = new URL(page.url());
  await page.goto(HOME);
  await expectPage(page.getByRole("link", { name: "Open Rifle Platoon" })).toBeVisible();

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const url of [editor, sheet]) {
      await page.goto(`${DEV}${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (url === editor) for (const label of ["Paramedics a squad", "TAG troops a squad", "Condition-trained for", "Field gun", "Field artillery", "Creature"]) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${url.pathname}`).toEqual([]);
    }
  }
});
