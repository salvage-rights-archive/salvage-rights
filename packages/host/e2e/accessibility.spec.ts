import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, CLASSIC, DEV, FAKE_KEY, FREE, GOTHIC, expect, importMech, saveAcesCard, saveAcesCommand, saveAsUnit, startGothicBox, test } from "./fixtures";

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

test("the Aces home, library and card editor (each step and the picker) have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await saveAcesCard(page, DEV);
  await expectNoViolations(page, DEV, [`${ACES}/home`, `${ACES}/cards`]);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${editor}`);
    await scan(page, theme, "the card editor, identity");
    await page.getByRole("button", { name: "2. Movement side" }).click();
    await page.getByRole("button", { name: "Aggressive", exact: true }).click();
    await scan(page, theme, "the card editor, Aggressive column");
    await page.getByRole("button", { name: "Add a filter to the Aggressive column" }).click();
    await scan(page, theme, "the card editor, picker open");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "3. Combat side" }).click();
    await scan(page, theme, "the card editor, combat side");
  }
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

test("the Aces command card editor (each step), special order and support card pages have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  const command = await saveAcesCommand(page, DEV);
  await expectNoViolations(page, DEV, [`${ACES}/order`, `${ACES}/support`, `${ACES}/cards`]);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${command}`);
    await scan(page, theme, "the command editor, identity");
    for (const step of ["2. Orders", "3. Colour lists", "4. Support side", "5. Strategy rows"]) {
      await page.getByRole("button", { name: step }).click();
      await scan(page, theme, `the command editor, ${step}`);
    }
    await page.getByRole("button", { name: "Add a test to: Row 1 applies when" }).click();
    await scan(page, theme, "the command editor, strategy picker open");
    await page.goto(`${DEV}${ACES}/order`);
    await page.getByLabel("Special order", { exact: true }).selectOption("fleeing");
    await page.getByRole("button", { name: "Record the column" }).click();
    await scan(page, theme, "the special order, column recorded");
  }
});

test("the Aces game setup, the game page and the home with a game in progress have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  await saveAcesCard(page, DEV);
  for (const name of ["Mine A", "Theirs A"]) await saveAsUnit(page, DEV, name, 20);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${ACES}/new-game`);
    await page.getByLabel("Add a unit to your force").selectOption({ label: "Mine A (PV 20)" });
    await page.getByRole("button", { name: "Add to your force", exact: true }).click();
    await page.getByLabel("Add a unit to automated force").selectOption({ label: "Theirs A (PV 20)" });
    await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
    await scan(page, theme, "the new game form");
    await page.getByRole("button", { name: "Start the game" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
    await scan(page, theme, "the game page at Initiative");
    await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("5");
    await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("9");
    await expect(page.getByText("Automated force wins Initiative.")).toBeVisible();
    await scan(page, theme, "the game page with the roll decided");
    await page.getByRole("button", { name: "Start the Movement Phase" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /You move 1 unit/ })).toBeVisible();
    await scan(page, theme, "the Movement Phase, your move");
    await page.getByRole("button", { name: "Mine A: Standstill" }).click();
    await page.getByRole("button", { name: "Activate Theirs A" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Moving Theirs A" })).toBeVisible();
    await scan(page, theme, "an automated activation with its question or decision open");
    // From about 900 px the drawer is a column that is always open and its button is hidden.
    const toggle = page.getByRole("button", { name: "Show the units" });
    if (await toggle.isVisible()) await toggle.click();
    await scan(page, theme, "the units drawer open");
    await page.getByRole("button", { name: "Log" }).click();
    await scan(page, theme, "the log");
    await page.goto(`${DEV}${ACES}/home`);
    await expect(page.getByText("Turn 1").first()).toBeVisible();
    await scan(page, theme, "the Aces home with games");
  }
});

test("the Gothic home, a box Mech editor and its sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  const editorPath = await startGothicBox(page, DEV, "UrbanMech UM-R60B");
  await expectNoViolations(page, DEV, [`${GOTHIC}/home`, editorPath, editorPath.replace("/editor", "/sheet")]);
});
