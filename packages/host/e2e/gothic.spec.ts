import { DEV, GOTHIC, buildGothicForce, expect, startGothicBox, test } from "./fixtures";

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

test("add a Werebeast on a phone, save it, open its sheet, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(HOME);
  await page.getByRole("link", { name: "Abomination units" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Abomination units");
  expect(page.url()).toContain(`${GOTHIC}/abominations`);
  await expect(page.getByLabel("Import a file")).toBeEnabled();
  await page.getByRole("button", { name: "Add Werebeast" }).click();
  await page.getByLabel("Label").fill("Pack");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Record sheet for Pack (Werebeast)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pack (Werebeast) record sheet");
  await expect(page.getByRole("img", { name: /Abomination record sheet: WEREBEAST ABOMINATION/ })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  await page.getByRole("button", { name: "Back to the units" }).click();
  for (const control of await page.locator("button, select, input:not([type=file]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
});

test("the Gothic sheet's Dazzle switch adds the Dazzle lines and fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await startGothicBox(page, DEV, "UrbanMech UM-R60B");
  await page.getByRole("link", { name: "Record sheet" }).click();
  const sheet = page.locator("svg.bt-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Dazzle", { exact: true })).toHaveCount(0);
  const dazzle = page.getByLabel("Show Dazzle Mode lines under each laser");
  const box = await dazzle.locator("xpath=..").boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await dazzle.check();
  await expect(sheet.getByText("Dazzle", { exact: true })).not.toHaveCount(0);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
});

test("build a force from two box 'Mechs and three units, print all sheets, on a phone and a desktop", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  const forcePath = await buildGothicForce(page, DEV);
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await sideways()).toBe(0);
  await expect(page.getByTestId("force-bv")).toContainText("'Mech Battle Value");
  await expect(page.getByText("No Initiative modifier applies.")).toBeVisible();
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }

  // Printing: both 'Mech sheets with the pilot filled in, then the three units on one page.
  await page.getByRole("button", { name: "Print all sheets" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Lance record sheets");
  await expect(page.locator("svg.bt-sheet")).toHaveCount(3);
  await expect(page.locator("svg.bt-sheet").first()).toHaveAttribute("aria-label", /UrbanMech UM-R60B record sheet/);
  await expect(page.locator("svg.bt-sheet").nth(1).getByText("Ann", { exact: true })).toBeVisible();
  await expect(page.locator("svg.bt-sheet").nth(1).getByText(/^Handler for: .*Gnat One/)).toBeVisible();
  expect(await sideways()).toBe(0);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeHidden();
  const pdf = await page.pdf({ format: "Letter" });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)?.length ?? 0).toBe(3);
  await page.emulateMedia({ media: "screen" });

  // The same force on a desktop width, back from storage.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${DEV}${forcePath}`);
  await expect(page.getByLabel("Force name")).toHaveValue("Test Lance");
  await expect(page.getByLabel(/^Pilot name for Phoenix Hawk PXH-1T/)).toHaveValue("Ann");
  await page.getByRole("button", { name: "Print all sheets" }).click();
  await expect(page.locator("svg.bt-sheet")).toHaveCount(3);
});