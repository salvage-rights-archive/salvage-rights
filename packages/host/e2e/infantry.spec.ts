import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, test } from "./fixtures";

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
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rifle Platoon" })).toBeVisible();
  await page.getByLabel("Primary weapon").selectOption({ label: /^Auto-Rifle/ });
  await expect(page.getByText(/Damage \d+ at full strength/)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  const editor = new URL(page.url());
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rifle Platoon record sheet" })).toBeVisible();
  const sheet = new URL(page.url());
  await page.goto(HOME);
  await expect(page.getByRole("link", { name: "Open Rifle Platoon" })).toBeVisible();

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const url of [editor, sheet]) {
      await page.goto(`${DEV}${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${url.pathname}`).toEqual([]);
    }
  }
});
