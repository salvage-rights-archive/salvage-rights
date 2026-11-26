import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, test } from "./fixtures";

const ALPHA = "/battletech/alpha-strike";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

async function clean(page: Page, where: string) {
  // A lazily loaded page shows its placeholder first; on a busy machine that outlasts the default wait.
  await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, where).toEqual([]);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `no sideways scroll: ${where}`).toBe(widths.client);
}

test("a unit's specials link to the aids page, the notes switch adds our line, and both pages are clean in both themes at 320 px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`${DEV}${ALPHA}/unit`);
  await page.getByLabel("Name").fill("Special Walker");
  await page.getByLabel("Point Value (PV)").fill("30");
  await page.getByLabel("Special abilities").fill("IF1, HPG, ECM");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  const card = page.locator(".as-card__special");
  await expect(card.getByRole("link")).toHaveCount(3);
  await expect(card).toContainText("p. 78");
  await expect(card).not.toContainText("with a spotter");
  await card.getByLabel("Show our short notes").check();
  await expect(card).toContainText("with a spotter");

  // HPG is an optional ability and the aids page starts at Standard: the link still lands on its entry.
  await card.getByRole("link", { name: /^HPG,/ }).click();
  await expect(page).toHaveURL(/\/aids#special-HPG$/);
  const entry = page.locator("#special-HPG");
  await expect(entry).toBeInViewport();
  await expect(entry).toContainText("HyperPulse Generator");
  await expect(entry).toContainText("p. 85");
  await expect(page.locator("#special-ABA")).toHaveCount(0);
  await page.getByLabel("Rules level").selectOption("advanced");
  await expect(page.locator("#special-ABA")).toHaveCount(1);
  await page.getByLabel("Unit type").selectOption("CI");
  await expect(page.locator("#special-TSM")).toHaveCount(0);
  await expect(page.locator("#special-MTN")).toHaveCount(1);

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(`${DEV}${ALPHA}/aids`);
    await clean(page, `${theme} aids`);
    for (const control of await page.locator("#as-specials ~ div select, #as-specials ~ label").all()) {
      const box = await control.boundingBox();
      if (box) expect(box.height, `${theme} control`).toBeGreaterThanOrEqual(43.5);
    }
    await page.goto(`${DEV}${ALPHA}/home`);
    await page.getByRole("link", { name: /^Open Special Walker/ }).click();
    await clean(page, `${theme} unit`);
  }
});
