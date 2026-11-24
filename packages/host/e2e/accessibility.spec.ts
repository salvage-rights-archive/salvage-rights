import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, FREE, expect, test } from "./fixtures";

const PAGES = ["/", "/about", "/settings"];

async function chooseTheme(page: Page, base: string, theme: "Light" | "Dark") {
  await page.goto(`${base}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

async function expectNoViolations(page: Page, base: string) {
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, base, theme);
    for (const path of PAGES) {
      await page.goto(`${base}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
  }
}

test("dev edition has no axe violations in either theme", async ({ page }) => {
  await expectNoViolations(page, DEV);
});

test("free edition has no axe violations in either theme", async ({ page }) => {
  await expectNoViolations(page, FREE);
});
