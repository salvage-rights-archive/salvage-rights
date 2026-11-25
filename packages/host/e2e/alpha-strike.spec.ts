import { readFile, writeFile } from "node:fs/promises";
import { AS_UNIT_ID, DEV, FAKE_KEY, expect, test } from "./fixtures";

const ALPHA = "/battletech/alpha-strike";

test("add a unit by hand, save it, find it again after a reload, export it and import the file", async ({ page }, testInfo) => {
  await page.goto(`${DEV}${ALPHA}/home`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alpha Strike");
  await expect(page.getByText("No units saved yet.")).toBeVisible();
  await page.getByRole("link", { name: "Add by hand" }).click();
  const form = page.getByRole("form", { name: "Unit card values" });
  await form.getByLabel("Name").fill("Thunderbolt");
  await form.getByLabel("Model").fill("TDR-5S");
  await form.getByLabel("Size").fill("3");
  await form.getByLabel("TMM").fill("1");
  await form.getByLabel("Move").fill('8"');
  await form.getByLabel("Role").selectOption("Brawler");
  await form.getByLabel("Point Value (PV)").fill("36");
  await form.getByLabel("Damage S (+0)").fill("3");
  await form.getByLabel("Damage M (+2)").fill("3");
  await form.getByLabel("Damage L (+4)").fill("1");
  await form.getByLabel("Overheat Value (OV)").fill("1");
  await form.getByLabel("Armor").fill("7");
  await form.getByLabel("Structure").fill("5");
  await form.getByLabel("Special abilities").fill("QQ1");
  await expect(page.getByText('We do not know the special ability "QQ".')).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("unit.png") });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thunderbolt TDR-5S");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Thunderbolt-TDR-5S.as-unit.json");
  const path = testInfo.outputPath("exported.as-unit.json");
  await file.saveAs(path);
  expect(JSON.parse(await readFile(path, "utf8")).unit.card.pv).toBe(36);

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("group", { name: "Confirm delete" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No units saved yet.")).toBeVisible();
  await page.getByLabel("Import a unit file").setInputFiles(path);
  await expect(page.getByText("Unit imported.")).toBeVisible();
  await expect(page.getByRole("list").getByText("Thunderbolt TDR-5S")).toBeVisible();
});

test("the home and unit pages do not scroll sideways at 320 px, and their buttons are 44 px tall", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const address of [`${DEV}${ALPHA}/home`, `${DEV}${ALPHA}/unit`]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, `scroll width on ${address}`).toBe(widths.client);
    for (const control of await page.locator("button, a.bt-button, input:not([type=file]), select").all()) {
      const box = await control.boundingBox();
      if (box) expect(box.height, address).toBeGreaterThanOrEqual(44);
    }
  }
});

test("import a unit from Mordel, review it with its credit, save it, and find it in the roster", async ({ page }, testInfo) => {
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByLabel("Mordel key").fill(FAKE_KEY);
  await page.getByRole("button", { name: "Save key" }).click();
  await page.getByLabel("Unit number or address").fill(String(AS_UNIT_ID));
  await page.getByRole("button", { name: "Import from Mordel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Walker TW-1");
  await expect(page.getByText("Designed by Test Designer on mordel.net; API by MordelBlacknight")).toBeVisible();
  await expect(page.getByLabel("Point Value (PV)")).toHaveValue("30");
  await expect(page.getByLabel("Special abilities")).toHaveValue("ECM, IF1");
  expect(page.url()).not.toContain(FAKE_KEY);
  await page.screenshot({ path: testInfo.outputPath("review.png") });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.goto(`${DEV}${ALPHA}/home`);
  await expect(page.getByRole("list").getByText("Test Walker TW-1")).toBeVisible();
});

test("import a saved Master Unit List page, see it marked OFFICIAL, and see the mark go when the card is changed", async ({ page }, testInfo) => {
  const html = `<html><head><title>Test Hornet THR-1</title></head><body><h1 class="ba-title">Test Hornet THR-1</h1><span class="ba-crumb">Search / Test Hornet</span>
<div class="u-kv"><span class="k">Type</span><span class="v">BattleMech</span><span class="k">Intro Year</span><span class="v">3058 (Clan Invasion)</span><span class="k">Tech Base</span><span class="v">Clan</span><span class="k">Role</span><span class="v">Striker</span></div>
<span data-sheet-uid="9TESTUID99"></span><div class="u-statgrid"><div><div class="k">PV</div><div class="v">28</div></div><div><div class="k">Size</div><div class="v">2</div></div><div><div class="k">Move</div><div class="v">10"/8"j</div></div><div><div class="k">TMM</div><div class="v">2</div></div>
<div><div class="k">Armor</div><div class="v">4</div></div><div><div class="k">Struct</div><div class="v">3</div></div></div>
<div class="u-abilrow"><span class="aschip">DMG 2/2/1/0</span><span class="aschip">ECM <span class="an">made-up words</span></span></div></body></html>`;
  const path = testInfo.outputPath("test-hornet.html");
  await writeFile(path, html);
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByLabel("Saved Master Unit List page").setInputFiles(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Hornet THR-1");
  await expect(page.getByText("OFFICIAL, Master Unit List")).toBeVisible();
  await expect(page.getByText("Master Unit List page you saved")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mul-review.png") });
  await page.getByLabel("Point Value (PV)").fill("29");
  await expect(page.getByText("NOT OFFICIAL: changed from the published design")).toBeVisible();
});
