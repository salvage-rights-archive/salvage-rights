import { DEV, GOTHIC, expect, startGothicBox, test } from "./fixtures";

const HOME = `${DEV}${GOTHIC}/home`;
const BOX = "UrbanMech UM-R60B";

test("start from a box 'Mech, reach its sheet and come back to a Gothic list that Classic does not show", async ({ page }) => {
  await startGothicBox(page, DEV, BOX);
  expect(page.url()).toContain(`${GOTHIC}/editor`);
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${BOX} record sheet`);
  expect(page.url()).toContain(`${GOTHIC}/sheet`);
  await page.getByRole("link", { name: /Your 'Mechs/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BattleTech: Gothic");
  await expect(page.getByRole("link", { name: `Open ${BOX}` })).toBeVisible();

  // The Classic home shows its edition picker and none of the Gothic 'Mechs.
  await page.goto(`${DEV}/battletech/classic/home`);
  await expect(page.getByLabel("Edition")).toBeVisible();
  await expect(page.getByText("No 'Mechs saved yet.")).toBeVisible();
});

test("the Gothic home fits a phone: nothing scrolls sideways and every control is at least 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await startGothicBox(page, DEV, BOX);
  await page.goto(HOME);
  await expect(page.getByRole("link", { name: `Open ${BOX}` })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=file]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
});

test("the Gothic editor on a phone: Gothic's choices, the printed Battle Value, no cost, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await startGothicBox(page, DEV, "Firestarter FS9-HB");
  await expect(page.getByLabel("Rules level")).toBeVisible();
  await expect(page.getByLabel("Tech base")).toHaveCount(0);
  await expect(page.getByLabel("Type", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("bv-printed")).toContainText("As printed on the sheet");
  await expect(page.getByTestId("cost-total")).toHaveCount(0);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
});
