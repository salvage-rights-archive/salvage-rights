import { readFile, writeFile } from "node:fs/promises";
import { AS_UNIT_ID, DEV, FAKE_KEY, expect, expectPage, saveAsUnit, test } from "./fixtures";

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

test("build a four-unit force, change skills and watch the totals, copy it, and fit 320 px", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const [name, pv] of [["Archer", 35], ["Banshee", 39], ["Cicada", 14], ["Dervish", 29]] as const) await saveAsUnit(page, DEV, name, pv);
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByRole("button", { name: "Start a new force" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Strike lance");
  await page.getByLabel("PV limit").fill("110");
  for (const name of ["Archer", "Banshee", "Cicada", "Dervish"]) {
    await page.getByLabel("Unit", { exact: true }).selectOption({ label: `${name} (PV ${name === "Archer" ? 35 : name === "Banshee" ? 39 : name === "Cicada" ? 14 : 29})` });
    await page.getByRole("button", { name: "Add to force" }).click();
  }
  const totals = page.getByRole("region", { name: "Totals" });
  await expect(totals).toContainText("117 PV of 110 (7 over the limit)");
  await page.getByLabel("Skill").first().selectOption("6");
  await expect(totals).toContainText("109 PV of 110 (1 to spare)");
  await page.screenshot({ path: testInfo.outputPath("force.png"), fullPage: true });

  await page.reload();
  await expect(totals).toContainText("109 PV of 110");
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Strike lance copy");
  await expect(totals).toContainText("109 PV of 110");

  await page.setViewportSize({ width: 320, height: 700 });
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, input, select").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.goto(`${DEV}${ALPHA}/home`);
  await expect(page.getByRole("list").getByText("Strike lance copy")).toBeVisible();
});

test("the play aids and the table work at 320 px: the calculator answers, a staged hit lands at the End Phase", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await saveAsUnit(page, DEV, "Archer", 35);
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByRole("button", { name: "Start a new force" }).click();
  await page.getByLabel("Unit", { exact: true }).selectOption({ label: "Archer (PV 35)" });
  await page.getByRole("button", { name: "Add to force" }).click();
  await page.getByRole("link", { name: "Play at the table" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("turn 1");
  await page.getByLabel("Damage taken", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Stage the hit" }).click();
  await expect(page.getByText("Waiting for the End Phase: 2 = 2.")).toBeVisible();
  await page.getByRole("button", { name: "End the turn" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("turn 2");
  await page.goto(`${DEV}${ALPHA}/aids`);
  await expect(page.getByRole("status").first()).toContainText("Target Number 8");
  for (const address of [`${DEV}${ALPHA}/aids`, `${DEV}${ALPHA}/home`]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, address).toBe(widths.client);
  }
});

test("the rules level and game year narrow the force picker and the aids, and the era shows", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [name, level, year] of [["Archer", "Standard", "3025"], ["Banshee", "Advanced", "3025"], ["Cougar", "Standard", "3060"]] as const) {
    await page.goto(`${DEV}${ALPHA}/unit`);
    await expectPage(page.getByLabel("Rules level")).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Rules level").selectOption({ label: level });
    await page.getByLabel("Year").fill(year);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }
  await page.goto(`${DEV}${ALPHA}/home`);
  await page.getByRole("button", { name: "Start a new force" }).click();
  const picker = async () => (await page.getByLabel("Unit", { exact: true }).locator("option").allTextContents()).filter((t) => t !== "Choose a unit").map((t) => t.replace(/ \(PV \d+\)$/, "")).sort();
  await expectPage(page.getByLabel("Unit", { exact: true })).toBeVisible();
  // Standard is the level until one is chosen: the Advanced unit is left out of the list, not marked.
  await expect.poll(picker).toEqual(["Archer", "Cougar"]);

  await page.goto(`${DEV}${ALPHA}/home`);
  await expectPage(page.getByLabel("Rules level")).toBeEnabled();
  await page.getByLabel("Rules level").selectOption("advanced");
  await page.getByLabel("Game year").fill("3040");
  await expect(page.getByText(/The Late Succession War - Renaissance era/)).toBeVisible();
  await expect(page.getByText(/Units dated after 3040 are left out/)).toBeVisible();
  // The setting is kept on the device: a reload still shows it.
  await page.waitForTimeout(500);
  await page.reload();
  await expectPage(page.getByLabel("Game year")).toHaveValue("3040");
  await expect(page.getByLabel("Rules level")).toHaveValue("advanced");
  // Back to the force page inside the app, which reads the level and year from the device.
  await page.goBack();
  await expectPage(page.getByLabel("Unit", { exact: true })).toBeVisible();
  await expect.poll(picker).toEqual(["Archer", "Banshee"]);

  // The aids follow the same setting: Extreme range is offered at Advanced and not at Standard.
  await page.goto(`${DEV}${ALPHA}/aids`);
  await expectPage(page.getByLabel("Extreme range is in play")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranges" })).toBeVisible();
  await expect(page.getByText(/past 60" to the board edge/)).toBeVisible();
  await page.getByLabel("Rules level").selectOption("standard");
  await expect(page.getByLabel("Extreme range is in play")).toHaveCount(0);
  await expect(page.getByText(/past 60" to the board edge/)).toHaveCount(0);
});

test("the aids page at 320 px: one column, every aid listed, no sideways scroll, expected damage beside the odds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${DEV}${ALPHA}/aids`);
  await expectPage(page.getByRole("heading", { name: "Critical hits" })).toBeVisible();
  for (const name of ["To-hit calculator", "Ranges", "Heat", "Turn sequence", "Movement costs"]) await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByLabel("Damage at medium range (from the card)").fill("3");
  await expect(page.getByText(/Expected damage 1\.25/)).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("#as-tohit input, #as-tohit select, #as-aids-rules select").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
