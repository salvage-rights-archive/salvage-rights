import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, putAsFormationForce, test } from "./fixtures";

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
  await expect(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: "Groups and formations" })).toBeVisible();
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
  await page.waitForTimeout(500);
  await page.goto(FORCE);
  await expectPage(page.getByRole("heading", { name: "Groups and formations" })).toHaveCount(0);
  await expect(page.locator("#as-spa-add-2")).toHaveCount(0);
  await expect(page.locator("#as-spa-add-0")).toBeVisible();
  await expectPage(page.getByRole("heading", { name: "Command abilities" })).toBeVisible();
});
