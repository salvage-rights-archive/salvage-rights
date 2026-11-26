import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { CLASSIC, DEV, FAKE_KEY, FREE, expect, importMech, saveAsUnit, test } from "./fixtures";

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

// Firefox has crashed its page part way through one long run of scans, so the dev edition is scanned in two tests,
// each with its own browser context: the pages first, then the editor's open states.
async function importForScan(page: Page): Promise<string> {
  // One imported 'Mech, kept for the rest of the test (the browser context's storage lasts as long as the test).
  await importMech(page, DEV);
  const editor = new URL(page.url());
  return `${editor.pathname.replace(/^\/salvage-rights/, "")}${editor.search}`;
}

test("dev edition has no axe violations in either theme", async ({ page }) => {
  // Twelve axe scans, about three seconds each on the editor in Firefox: the default 30 seconds is too short.
  test.setTimeout(150_000);
  const editorPath = await importForScan(page);
  const sheetPath = editorPath.replace("/editor", "/sheet");
  await expectNoViolations(page, DEV, ["/", "/about", "/settings", `${CLASSIC}/home`, `${CLASSIC}/import`, editorPath, sheetPath]);
});

test("the editor's picker and Actions row have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(90_000);
  const editorPath = await importForScan(page);

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

test("an OmniMech editor, base and comparison have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${DEV}${CLASSIC}/home`);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Falcon");
  await form.getByLabel("Type", { exact: true }).selectOption({ label: "OmniMech" });
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("tab", { name: /Prime/ })).toBeVisible();
  const editor = new URL(page.url());
  const path = `${editor.pathname.replace(/^\/salvage-rights/, "")}${editor.search}`;
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${path}`);
    await page.getByRole("button", { name: "Compare configurations" }).click();
    await scan(page, theme, "the OmniMech editor, Prime and comparison");
    await page.getByRole("tab", { name: "Base" }).click();
    await scan(page, theme, "the OmniMech base");
  }
});

test("free edition has no axe violations in either theme", async ({ page }) => {
  await expectNoViolations(page, FREE, ["/", "/about", "/settings"]);
});

test("the Alpha Strike home and unit pages have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(90_000);
  // One saved unit with a finding, so the list, the preview and the findings are all on the page.
  await page.goto(`${DEV}/battletech/alpha-strike/unit`);
  await page.getByLabel("Name").fill("Scan Walker");
  await page.getByLabel("Special abilities").fill("QQ1");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const saved = new URL(page.url());
  await expectNoViolations(page, DEV, ["/battletech/alpha-strike/home", "/battletech/alpha-strike/unit", `${saved.pathname.replace(/^\/salvage-rights/, "")}${saved.search}`]);
});

test("the Alpha Strike home with a Mordel key saved has no axe violations in either theme, and fits 320 px", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${DEV}/battletech/alpha-strike/home`);
  await page.getByLabel("Mordel key").fill(FAKE_KEY);
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByLabel("Unit number or address")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, input:not([type=file])").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expectNoViolations(page, DEV, ["/battletech/alpha-strike/home"]);
});

test("the Alpha Strike force page and the home with forces have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(90_000);
  await saveAsUnit(page, DEV, "Archer", 35);
  await page.goto(`${DEV}/battletech/alpha-strike/home`);
  await page.getByRole("button", { name: "Start a new force" }).click();
  await page.getByLabel("PV limit").fill("20");
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "Archer (PV 35)" });
  await page.getByRole("button", { name: "Add to force" }).click();
  await expect(page.getByRole("region", { name: "Totals" })).toContainText("over the limit");
  const forcePage = new URL(page.url());
  await expectNoViolations(page, DEV, ["/battletech/alpha-strike/home", `${forcePage.pathname.replace(/^\/salvage-rights/, "")}${forcePage.search}`]);
});

test("the Classic home with Export all has no axe violations in either theme, fits 320 px, and its file imports back", async ({ page }) => {
  test.setTimeout(120_000);
  await importMech(page, DEV);
  await page.goto(`${DEV}${CLASSIC}/home`);
  const exportAll = page.getByRole("button", { name: "Export all" });
  await expect(exportAll).toBeVisible();
  const downloading = page.waitForEvent("download");
  await exportAll.click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("salvage-rights-mechs.library.json");
  await expect(page.getByRole("status")).toHaveText("Export started.");
  const file = await download.path();
  await page.getByLabel("Import a file", { exact: true }).setInputFiles(file);
  await expect(page.getByRole("status")).toHaveText("1 design imported.");
  await page.setViewportSize({ width: 320, height: 700 });
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  const box = await exportAll.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoViolations(page, DEV, [`${CLASSIC}/home`]);
});
