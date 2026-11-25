import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { CLASSIC, DEV, FREE, expect, importMech, test } from "./fixtures";

async function chooseTheme(page: Page, base: string, theme: "Light" | "Dark") {
  await page.goto(`${base}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** The theme must have come back from storage, or the audit would run against the wrong one. Read the class with
 * evaluate: with Playwright's locator assertion here, Firefox crashes the page during the axe run. */
async function scan(page: Page, theme: string, where: string) {
  await expect
    .poll(() => page.evaluate(() => document.body.className), { message: `${theme} theme kept on ${where}` })
    .toBe(theme.toLowerCase());
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, `${theme} theme, ${where}`).toEqual([]);
}

async function expectNoViolations(page: Page, base: string, paths: string[]) {
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, base, theme);
    for (const path of paths) {
      await page.goto(`${base}${path}`);
      await scan(page, theme, path);
    }
  }
}

test("dev edition has no axe violations in either theme", async ({ page }) => {
  // Twenty axe scans, three seconds each on the editor in Firefox: the default 30 seconds is too short for the one test.
  test.setTimeout(150_000);
  // One imported 'Mech, kept for the rest of the test (the browser context's storage lasts as long as the test).
  await importMech(page, DEV);
  const editor = new URL(page.url());
  const editorPath = `${editor.pathname.replace(/^\/salvage-rights/, "")}${editor.search}`;
  const paths = ["/", "/about", "/settings", `${CLASSIC}/home`, `${CLASSIC}/import`, editorPath];
  await expectNoViolations(page, DEV, paths);

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${editorPath}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The picker, open.
    await page.getByRole("button", { name: "Add equipment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page, theme, "the equipment picker");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // A mount's Actions row, open.
    await page.getByRole("button", { name: "Actions for AC/10 Ammo", exact: true }).click();
    await expect(page.getByRole("button", { name: "Move AC/10 Ammo", exact: true })).toBeVisible();
    await scan(page, theme, "an open Actions row");
  }
});

test("free edition has no axe violations in either theme", async ({ page }) => {
  await expectNoViolations(page, FREE, ["/", "/about", "/settings"]);
});
