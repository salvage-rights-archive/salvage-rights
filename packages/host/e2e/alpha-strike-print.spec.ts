import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, MECH_NAME, expect, importMech, putAsPrintForce, test } from "./fixtures";

const ALPHA = "/battletech/alpha-strike";

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

test("the print page for a force and for one unit shows every card, fits 320 px, and has no axe violations in either theme", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const id = await putAsPrintForce(page);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const address of [`${DEV}${ALPHA}/print?force=${id}`, `${DEV}${ALPHA}/print?unit=mech`]) {
      await page.goto(address);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Print:");
      await expect(page.locator(".as-cardface").first()).toBeVisible();
      const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(widths.scroll, `${theme} ${address}`).toBe(widths.client);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} ${address}`).toEqual([]);
    }
    await page.goto(`${DEV}${ALPHA}/print?force=${id}`);
    await expect(page.locator(".as-cardface")).toHaveCount(5);
    await expect(page.getByRole("region", { name: "Force roster" })).toContainText("Total, 5 units");
    await page.screenshot({ path: testInfo.outputPath(`print-320-${theme.toLowerCase()}.png`), fullPage: true });
  }
  const button = await page.getByRole("button", { name: "Print", exact: true }).boundingBox();
  expect(button?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("Print is offered for each saved unit and force and for the open ones", async ({ page }) => {
  const id = await putAsPrintForce(page);
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByRole("link", { name: "Print Thunderbolt" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Print: Thunderbolt");
  await expect(page.locator(".as-cardface")).toHaveCount(1);
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByRole("link", { name: "Print Print test lance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Print: Print test lance");
  await page.goto(`${DEV}${ALPHA}/force?id=${id}`);
  await page.getByRole("link", { name: "Print", exact: true }).click();
  await expect(page.locator(".as-cardface")).toHaveCount(5);
  await page.goto(`${DEV}${ALPHA}/unit?id=mech`);
  await page.getByRole("link", { name: "Print", exact: true }).click();
  await expect(page.locator(".as-cardface")).toHaveCount(1);
});

test("on paper only the sheets print: cards 3.5 by 2.5 inches, nine to a sheet, then the roster, on Letter and on A4", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "page.pdf is Chromium only");
  const id = await putAsPrintForce(page, 2);
  await page.goto(`${DEV}${ALPHA}/print?force=${id}`);
  await expect(page.locator(".as-cardface")).toHaveCount(10);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("print-1280.png"), fullPage: true });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".as-print__bar")).toBeHidden();
  const box = await page.locator(".as-cardface").first().boundingBox();
  expect(box?.width).toBeCloseTo(336, 0);
  expect(box?.height).toBeCloseTo(240, 0);
  for (const format of ["Letter", "A4"] as const) {
    const pdf = await page.pdf({ format, preferCSSPageSize: true, printBackground: true });
    await writeFile(testInfo.outputPath(`print-${format}.pdf`), pdf);
    // Nine cards fill a sheet on either paper: ten cards and the roster make three pages.
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length, format).toBe(3);
  }
});

test("no print rule leaks across games: after an Aces print page has loaded, a Classic sheet still prints portrait", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "page.pdf is Chromium only");
  await importMech(page, DEV);
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${MECH_NAME} record sheet`);
  const here = new URL(page.url());
  // Move between pages inside the running app (no reload), so the styles of the Aces chunk stay loaded, as they do for a player.
  const go = async (path: string) => {
    await page.evaluate((to) => {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
  };
  await go(`${here.pathname.replace(/\/battletech\/.*$/, "")}/battletech/aces/print?id=none`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Print campaign sheets");
  await go(`${here.pathname}${here.search}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${MECH_NAME} record sheet`);
  await page.emulateMedia({ media: "print" });
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString("latin1");
  const media = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(pdf);
  expect(Number(media?.[1])).toBeLessThan(Number(media?.[2]));
});
