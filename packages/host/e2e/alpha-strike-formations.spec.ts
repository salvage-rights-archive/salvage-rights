import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, putAsCompositionForce, putAsFormationForce, test } from "./fixtures";

const FORCE = `${DEV}/battletech/alpha-strike/force?id=formation-force`;

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

test("build a Battle Lance and a Recon Lance from groups at 320 px, by keyboard where it counts, axe in both themes", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await putAsFormationForce(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(FORCE);
  await expectPage(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();

  await page.getByRole("button", { name: "Add a group" }).click();
  await page.getByRole("button", { name: "Add a group" }).click();
  const names = page.getByLabel("Group name");
  await names.nth(0).fill("Alpha");
  await names.nth(1).fill("Bravo");
  await page.getByLabel("Organisation").nth(0).selectOption({ label: "Lance, 4 ground units" });
  await page.getByLabel("Formation type").nth(0).selectOption({ label: "Battle Lance" });
  await page.getByLabel("Formation type").nth(1).selectOption({ label: "Recon Lance" });
  for (let i = 0; i < 8; i += 1) {
    await page.locator(`#as-group-${String(i)}`).selectOption({ label: i < 4 ? "Alpha" : "Bravo" });
  }
  await expect(page.getByRole("group", { name: "Battle Lance check for Alpha" })).toContainText("Meets the Battle Lance requirements");
  await expect(page.getByRole("group", { name: "Battle Lance check for Alpha" })).toContainText("Lucky, 6 points");
  await expect(page.getByRole("group", { name: "Recon Lance check for Bravo" })).toContainText("Meets the Recon Lance requirements");

  // Moving a unit out of Alpha leaves it short of a lance and the totals follow.
  await page.locator("#as-group-0").selectOption({ label: "No group" });
  await expect(page.getByRole("group", { name: "Battle Lance check for Alpha" })).toContainText("Does not yet meet");
  await expect(page.getByText("A Lance is 4 ground units", { exact: false })).toBeVisible();
  await page.locator("#as-group-0").selectOption({ label: "Alpha" });

  // The choice is kept across a reload.
  await page.reload();
  await expect(page.getByLabel("Formation type").nth(0)).toHaveValue("battle");
  await page.getByLabel("Formation type").nth(1).selectOption({ label: "Assault Lance" });
  await page.getByLabel("Bonus ability chosen").selectOption("Multi-Tasker");
  await page.getByLabel("Formation type").nth(1).selectOption({ label: "Recon Lance" });

  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("select, input:not([type=checkbox]), button, label:has(input[type=checkbox])").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("formations-320.png"), fullPage: true });

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(FORCE);
    await expectPage(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();
    // The list of formation types a group meets is a closed details element until opened; scan it open.
    for (const summary of await page.locator(".as-group summary").all()) await summary.click();
    await expect(page.locator(".as-group details[open]")).toHaveCount(2);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }
});

test("give two pilots abilities and the force command abilities, see them on the printed roster, and see them hidden at Introductory", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const id = await putAsFormationForce(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(FORCE);
  await expectPage(page.getByRole("heading", { name: "Command abilities" })).toBeVisible();

  for (const [index, ability] of [[0, "Sniper (3)"], [1, "Lucky (1-4)"]] as const) {
    await page.locator(`#as-spa-add-${String(index)}`).selectOption({ label: ability });
    await page.getByRole("button", { name: "Add ability" }).nth(index).click();
  }
  await expect(page.getByText("1 of 1 abilities, 3 of 2 points at Skill 4.")).toBeVisible();
  await expect(page.getByText("Skill 4 allows 2 points of abilities; this unit has 3")).toBeVisible();
  await page.getByLabel("Officer").nth(0).selectOption("commander");
  await page.getByText("Choose command abilities").click();
  await page.getByLabel("Flankers, p. 105").check();
  await expect(page.getByText("Chosen: Flankers (p. 105).")).toBeVisible();
  await expect(page.getByText("2 of 8 units hold pilot abilities; 1 allowed.")).toBeVisible();
  // Every control of the ability steps, and the opened list of command abilities, is a 44 px target.
  for (const control of await page.locator(".as-member__spas, #as-force-commands").locator("select, input:not([type=checkbox]), button, label:has(input[type=checkbox])").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await page.goto(`${DEV}/battletech/alpha-strike/print?force=${id}`);
  await expect(page.getByRole("region", { name: "Force roster" })).toContainText("Sniper 3");

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(FORCE);
    await expectPage(page.getByRole("heading", { name: "Command abilities" })).toBeVisible();
    await page.getByText("Choose command abilities").click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.screenshot({ path: testInfo.outputPath("abilities-320.png"), fullPage: true });

  // At Introductory the ability steps are not offered, but what the force already holds stays in view.
  await page.goto(`${DEV}/battletech/alpha-strike/home`);
  await expectPage(page.getByLabel("Rules level")).toBeEnabled();
  await page.getByLabel("Rules level").selectOption("introductory");
  // Open the force from the home list, inside the app, so the setting just made is the one the force page reads.
  await page.getByRole("link", { name: "Open Formation test" }).click();
  await expectPage(page.getByRole("heading", { name: "Command abilities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Groups and formations" })).toHaveCount(0);
  await expect(page.locator("#as-spa-add-2")).toHaveCount(0);
  await expect(page.locator("#as-spa-add-0")).toBeVisible();
});

test("the printed roster with pilot, group and pilot ability columns still fits its page for a twelve-unit force", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "page.pdf is Chromium only");
  const id = await putAsFormationForce(page, true);
  await page.goto(`${DEV}/battletech/alpha-strike/print?force=${id}`);
  const roster = page.getByRole("region", { name: "Force roster" });
  await expectPage(roster).toContainText("Total, 12 units");
  for (const heading of ["Pilot", "Group", "Pilot abilities"]) await expect(roster.getByRole("columnheader", { name: heading, exact: true })).toBeVisible();
  await expect(roster).toContainText("Alpha, Battle Lance");
  await expect(roster).toContainText("Sniper 3");
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true, printBackground: true });
  // Twelve cards are two sheets and the roster is one more page, with every column on it.
  expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(3);
  const widths = await roster.locator(".as-sheet__scroll").evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("put lances in a company and check it against its composition table, then build a Mechanized formation on top, at 320 px with axe in both themes", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await putAsCompositionForce(page);
  const url = `${DEV}/battletech/alpha-strike/force?id=composition-force`;
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(url);
  await expectPage(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();

  const company = page.getByRole("group", { name: "Composition check for Company" });
  await expect(company).toContainText("Fits the Company composition table");
  await expect(company).toContainText("2 Battle, Assault, Striker, Fire, Recon or Pursuit Lance");
  // Taking the Second lance out of the company leaves it one lance short, and the unit totals stay.
  await page.getByLabel("Part of group").nth(3).selectOption({ label: "Stands alone" });
  await expect(company).toContainText("Does not yet fit the Company composition table");
  await expect(company).toContainText("The core of a Company is 2 to 4 lances; this group has 1.");
  await page.getByLabel("Part of group").nth(3).selectOption({ label: "Company" });
  await expect(company).toContainText("Fits the Company composition table");

  // A Mechanized formation on top of a Battle Lance: the base formation is checked on the four non-infantry units, the infantry is carried by an OMNI.
  await page.getByLabel("Formation type").nth(0).selectOption({ label: "Battle Lance" });
  await page.getByLabel("Built on top as").nth(0).selectOption({ label: "Mechanized" });
  await expect(page.getByRole("group", { name: "Mechanized check for Carriers" })).toContainText("Meets the Mechanized requirements");
  await expect(page.getByRole("group", { name: "Battle Lance check for Carriers" })).toContainText("Meets the Battle Lance requirements");
  await page.getByLabel("Built on top as").nth(0).selectOption({ label: "Air Lance" });
  await expect(page.getByRole("group", { name: "Air Lance check for Carriers" })).toContainText("Does not yet meet the Air Lance requirements");
  await page.getByLabel("Built on top as").nth(0).selectOption({ label: "Mechanized" });
  await page.reload();
  await expect(page.getByLabel("Built on top as").nth(0)).toHaveValue("mechanized");
  await expect(page.getByLabel("Part of group").nth(3)).toHaveValue("co");

  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator(".as-group select, .as-group input, .as-group button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("compositions-320.png"), fullPage: true });

  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(url);
    await expectPage(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }
});
