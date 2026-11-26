import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { DEV, expect, expectPage, putAsTableForce, test } from "./fixtures";

const TABLE = `${DEV}/battletech/alpha-strike/table?force=table-force`;

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Presses a button the way a keyboard does: focus, then Enter. */
async function press(page: Page, button: Locator) {
  await button.focus();
  await page.keyboard.press("Enter");
}

test("a four-unit game at 320 px by keyboard: staged hits, crits, crippled and destroyed, axe in both themes, then two columns on a desktop", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => {
    Math.random = () => 0.5; // every 2D6 is an 8: a Weapon Hit on a 'Mech
  });
  await putAsTableForce(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(TABLE);
  await expectPage(page.getByRole("heading", { level: 1 })).toHaveText("Table lance: turn 1");
  const unit = (name: string) => page.locator("li.as-table__unit").filter({ has: page.getByRole("heading", { name }) });
  const alpha = unit("Alpha Mech");

  // A phone shows one column, nothing scrolls sideways and every control is 44 px.
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  const wide = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 6).map((e) => `${e.tagName}.${e.className}:${e.textContent?.slice(0, 30) ?? ""}`));
  expect(widths.scroll, wide.join(" | ")).toBe(widths.client);
  for (const control of await page.locator("button, input:not([type=checkbox]), select").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }

  // Turn 1: six points staged on the first 'Mech; its armor and structure are untouched until the End Phase.
  await alpha.getByLabel("Damage taken", { exact: true }).focus();
  await page.keyboard.type("6");
  await press(page, alpha.getByRole("button", { name: "Stage the hit" }));
  await expect(alpha.getByText("Waiting for the End Phase: 6 = 6.")).toBeVisible();
  await expect(alpha.getByText("Armor 4 of 4")).toBeVisible();
  await press(page, unit("Bravo Mech").getByRole("button", { name: "One more: Overheat used (up to 2)" }));
  await press(page, unit("Charlie Tank").getByRole("button", { name: "Roll motive damage for me" }));
  await expect(unit("Charlie Tank").getByText(/Motive roll 8 \+ 1 = 9/)).toBeVisible();
  await press(page, page.getByRole("button", { name: "End the turn" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Table lance: turn 2");
  await expect(alpha.getByText("Armor 0 of 4")).toBeVisible();
  await expect(alpha.getByText("Structure 2 of 4")).toBeVisible();
  await expect(alpha.getByText("Crippled: yes")).toBeVisible();
  await expect(unit("Bravo Mech").getByText("1 of 4, S at 4")).toBeVisible();
  await expect(page.getByText(/Alpha Mech: Critical roll 8: Weapon hit/)).toBeVisible();

  // Mid-game, in both themes, the table has no axe violations.
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(TABLE);
    await expectPage(page.getByRole("heading", { level: 1 })).toHaveText("Table lance: turn 2");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }

  // The state came back from storage; roll a critical for the second 'Mech, then finish the first.
  await press(page, unit("Bravo Mech").getByRole("button", { name: "Roll a critical for me" }));
  await expect(unit("Bravo Mech").getByText(/Critical roll 8: Weapon hit \(row 8 of the 'Mech table, p. 50\)/)).toBeVisible();
  await alpha.getByLabel("Damage taken", { exact: true }).focus();
  await page.keyboard.type("5");
  await press(page, alpha.getByRole("button", { name: "Stage the hit" }));
  await press(page, page.getByRole("button", { name: "End the turn" }));
  await expect(alpha.getByText(/Destroyed/).first()).toBeVisible();
  await expect(alpha.getByRole("group", { name: /Orders for/ })).toHaveCount(0);
  await expect(unit("Bravo Mech").getByRole("group", { name: /Orders for/ })).toBeVisible();

  // Undo is by keyboard too, and a desktop shows two columns.
  await press(page, page.getByRole("button", { name: "Undo" }));
  await expect(alpha.getByText("Crippled: yes")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  const [first, second] = await Promise.all([page.locator("li.as-table__unit").nth(0).boundingBox(), page.locator("li.as-table__unit").nth(1).boundingBox()]);
  expect(second?.y).toBe(first?.y);
});
