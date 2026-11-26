import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, CLASSIC, DEV, FAKE_KEY, FREE, GOTHIC, answerQuestions, buildGothicForce, expect, expectPage, importMech, putAsUnits, saveAcesCard, saveAcesCommand, saveAsUnit, startGothicBox, test } from "./fixtures";

async function chooseTheme(page: Page, base: string, theme: "Light" | "Dark") {
  await page.goto(`${base}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** The theme must have come back from storage, or the audit would run against the wrong one. Read the class with
 * evaluate: with Playwright's locator assertion here, Firefox crashes the page during the axe run. */
async function scan(page: Page, theme: string, where: string) {
  await expectPage
    .poll(() => page.evaluate(() => document.body.className.split(" ").filter((c) => c !== "bt-gothic").join(" ")), { message: `${theme} theme kept on ${where}` })
    .toBe(theme.toLowerCase());
  await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();

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
  await form.getByLabel("Year").fill("3060");
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
  await expectPage(page.getByText("Saved.")).toBeVisible();
  const saved = new URL(page.url());
  await expectNoViolations(page, DEV, ["/battletech/alpha-strike/home", "/battletech/alpha-strike/unit", `${saved.pathname.replace(/^\/salvage-rights/, "")}${saved.search}`]);
});

test("the Alpha Strike home with a Mordel key saved has no axe violations in either theme, and fits 320 px", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${DEV}/battletech/alpha-strike/home`);
  await page.getByLabel("Mordel key").fill(FAKE_KEY);
  await page.getByRole("button", { name: "Save key" }).click();
  await expectPage(page.getByLabel("Unit number or address")).toBeVisible();
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
  const tablePage = `/battletech/alpha-strike/table?force=${new URLSearchParams(forcePage.search).get("id") ?? ""}`;
  await expectNoViolations(page, DEV, ["/battletech/alpha-strike/home", `${forcePage.pathname.replace(/^\/salvage-rights/, "")}${forcePage.search}`, "/battletech/alpha-strike/aids", tablePage]);
});

test("the Aces home, library and card editor (each step and the picker) have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  // Nothing saved yet: the quartermaster picture shows, fits 320 px, and is clean in both themes.
  await page.setViewportSize({ width: 320, height: 700 });
  await expectNoViolations(page, DEV, [`${ACES}/home`]);
  await expect(page.getByRole("img", { name: /quartermaster/ })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.setViewportSize({ width: 1280, height: 720 });
  const editor = await saveAcesCard(page, DEV);
  await page.goto(`${DEV}${ACES}/home`);
  await expectPage(page.getByText("1 behaviour card recorded.")).toBeVisible();
  await expect(page.getByRole("img", { name: /quartermaster/ })).toHaveCount(0);
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

test("the Aces library with the sample offer and with the sample cards added has no axe violations in either theme at 320 px", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await expectNoViolations(page, DEV, [`${ACES}/cards`]);
  await page.goto(`${DEV}${ACES}/cards`);
  await page.getByRole("button", { name: "Add the sample cards" }).click();
  await expectPage(page.getByText("Added the sample cards and the sample lance.")).toBeVisible();
  await expectNoViolations(page, DEV, [`${ACES}/cards`]);
});

test("the Classic home with Export all has no axe violations in either theme, fits 320 px, and its file imports back", async ({ page }) => {
  test.setTimeout(120_000);
  await importMech(page, DEV);
  await page.goto(`${DEV}${CLASSIC}/home`);
  const exportAll = page.getByRole("button", { name: "Export all" });
  await expectPage(exportAll).toBeVisible();
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

test("the Aces game setup, every phase of the game page and the home with a game in progress have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  await saveAcesCard(page, DEV);
  await putAsUnits(page, ["Mine A", "Theirs A"]);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${ACES}/new-game`);
    await page.getByLabel("Add a unit to your force").selectOption({ label: "Mine A (PV 20)" });
    await page.getByRole("button", { name: "Add to your force", exact: true }).click();
    await page.getByLabel("Add a unit to automated force").selectOption({ label: "Theirs A (PV 20)" });
    await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
    await scan(page, theme, "the new game form");
    await page.getByRole("button", { name: "Start the game" }).click();
    await expectPage(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
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
    await page.getByRole("button", { name: "This step" }).click();
    await answerQuestions(page, /^Move Theirs A/);
    await page.getByRole("button", { name: "Done: Theirs A has moved" }).click();
    await page.getByRole("button", { name: "Go to the Combat Phase" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Turn 1: Combat. You attack/ })).toBeVisible();
    await scan(page, theme, "the Combat Phase, your units");
    await page.getByRole("button", { name: "Attack with Mine A" }).click();
    await page.getByLabel("Distance to the target, in inches (base to base)").fill("10");
    await page.getByLabel(/^2D6 attack roll/).fill("8");
    await scan(page, theme, "an attack being recorded");
    await page.getByRole("button", { name: "Record the attack" }).click();
    await page.getByRole("button", { name: "Attack with Theirs A" }).click();
    await answerQuestions(page, /^Theirs A (attacks Mine A|makes no attack)/);
    await scan(page, theme, "an automated attack decided");
    const record = page.getByRole("button", { name: "Record the attack" });
    if (await record.isVisible()) {
      await page.getByLabel(/^2D6 attack roll/).fill("3");
      await record.click();
    } else await page.getByRole("button", { name: /^Done: Theirs A makes no attack/ }).click();
    await page.getByRole("button", { name: "Go to the End Phase" }).click();
    await scan(page, theme, "End Phase, step 1");
    await page.getByRole("button", { name: "Done with the sortie rules" }).click();
    await scan(page, theme, "End Phase, damage");
    await page.getByRole("button", { name: "Apply the damage and critical hits" }).click();
    await scan(page, theme, "End Phase, heat");
    await page.getByRole("button", { name: "Done with heat" }).click();
    await scan(page, theme, "End Phase, objectives");
    await page.getByRole("button", { name: "Go on" }).click();
    await scan(page, theme, "End Phase, strategy");
    await page.goto(`${DEV}${ACES}/home`);
    await expectPage(page.getByText("Turn 1").first()).toBeVisible();
    await scan(page, theme, "the Aces home with games");
  }
});

test("the Gothic home, a box Mech editor and its sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  const editorPath = await startGothicBox(page, DEV, "UrbanMech UM-R60B");
  await expectNoViolations(page, DEV, [`${GOTHIC}/home`, editorPath, editorPath.replace("/editor", "/sheet")]);
});

test("the Gothic rules reference has no axe violations in either theme and fits 320 px", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await expectNoViolations(page, DEV, [`${GOTHIC}/aids`]);
  await expectPage(page.getByRole("table", { name: "Abomination-mounted weapons" }).getByRole("row")).not.toHaveCount(1);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expectPage(widths.scroll).toBe(widths.client);
});

test("the Gothic Abomination units page, its form, a custom form and a unit sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${GOTHIC}/abominations`);
    await expectPage(page.getByLabel("Import a file")).toBeEnabled();
    await scan(page, theme, "the units page");
    await page.getByRole("button", { name: "Add Werebeast" }).click();
    await page.getByLabel("Label").fill("Pack");
    await scan(page, theme, "the unit form");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expectPage(page.getByText("Pack (Werebeast) saved.")).toBeVisible();
    await page.getByLabel("Rules level").selectOption("fan-made");
    await page.getByRole("button", { name: "Start a custom type" }).click();
    await page.getByLabel("Add a weapon").selectOption({ label: "SRM 5" });
    await page.getByRole("button", { name: "Add weapon" }).click();
    await scan(page, theme, "the custom form");
    await page.getByRole("button", { name: "Record sheet for Pack (Werebeast)" }).first().click();
    await expectPage(page.getByRole("heading", { level: 1 })).toHaveText("Pack (Werebeast) record sheet");
    await scan(page, theme, "the unit sheet");
  }
});

// The print view holds three sheets of about 4,600 elements (the armor pips alone are 1,500); axe takes about ten seconds over it
// (the region and color-contrast rules walk every one), so each theme's scan of it is its own test and none runs long enough to
// time out on a busy machine. Every scan is the full one.
test("the Gothic forces list and a force have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  const forcePath = await buildGothicForce(page, DEV);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${GOTHIC}/force`);
    await scan(page, theme, "the forces list");
    await page.goto(`${DEV}${forcePath}`);
    await expectPage(page.getByLabel("Force name")).toHaveValue("Test Lance");
    await scan(page, theme, "the force");
  }
});

for (const theme of ["Light", "Dark"] as const) {
  test(`the Gothic force print view has no axe violations in the ${theme.toLowerCase()} theme`, async ({ page }) => {
    test.setTimeout(120_000);
    const forcePath = await buildGothicForce(page, DEV);
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${forcePath}`);
    await expectPage(page.getByLabel("Force name")).toHaveValue("Test Lance");
    await page.getByRole("button", { name: "Print all sheets" }).click();
    await expectPage(page.locator("svg.bt-sheet")).toHaveCount(3);
    await scan(page, theme, "the force print view");
  });
}
test("the Gothic Abomination tracker, empty and with a unit on the table, has no axe violations in either theme", async ({ page }) => {
  test.setTimeout(120_000);
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${GOTHIC}/abominations`);
    await expectPage(page.getByLabel("Import a file")).toBeEnabled();
    if (theme === "Light") {
      await page.getByRole("button", { name: "Add Tyrant" }).click();
      await page.getByLabel("Label").fill("Claws");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expectPage(page.getByText("Claws (Tyrant) saved.")).toBeVisible();
    }
    await page.goto(`${DEV}${GOTHIC}/play`);
    await expectPage(page.getByRole("heading", { level: 2, name: "Put a unit on the table" })).toBeVisible();
    await scan(page, theme, "the tracker, nothing on the table");
    if (theme === "Light") await page.getByRole("button", { name: "Put on the table: Claws (Tyrant)" }).click();
    await page.getByRole("button", { name: "Creature 1 pip 3" }).click();
    await scan(page, theme, "the tracker with a unit");
  }
});

test("patchwork armor in the editor and on the record sheet: axe clean in both themes, no sideways scroll at 320 px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${DEV}${CLASSIC}/home`);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Patch");
  await form.getByLabel("Rules level").selectOption("advanced");
  await form.getByLabel("Year").fill("3080");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Patch");
  const editor = new URL(page.url());
  const path = `${editor.pathname.replace(/^\/salvage-rights/, "")}${editor.search}`;
  // Offered at Advanced from 3075; choosing a type for one location takes its slots there.
  await page.getByText("Patchwork armor", { exact: true }).click();
  await page.getByLabel("Right Arm armor type").selectOption("ferro-fibrous");
  await expect(page.getByText("Armor of the Right Arm").first()).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.locator("[data-diagram=armor-types]")).toContainText("Ferro-Fibrous: RA");
  const sheet = new URL(page.url());
  const sheetPath = `${sheet.pathname.replace(/^\/salvage-rights/, "")}${sheet.search}`;
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, DEV, theme);
    await page.goto(`${DEV}${path}`);
    await page.getByText("Patchwork armor", { exact: true }).click();
    await scan(page, theme, "the editor with patchwork armor");
    await page.goto(`${DEV}${sheetPath}`);
    await scan(page, theme, "the record sheet with patchwork armor");
  }
  await page.setViewportSize({ width: 320, height: 700 });
  for (const address of [path, sheetPath]) {
    await page.goto(`${DEV}${address}`);
    await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, `scroll width on ${address}`).toBe(widths.client);
  }
});
