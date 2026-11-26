import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { ACES, DEV, expect, pickToken, saveAcesCard, saveAcesCommand, saveAsUnit, test } from "./fixtures";

// Every card here is invented. No printed card, photo or scan is used.

/** Presses Tab until the focused control is the one with this name (its label, aria-label or text). */
async function tabToControl(page: Page, name: string): Promise<void> {
  for (let i = 0; i < 160; i += 1) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate((wanted) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const labels = "labels" in el ? [...((el as HTMLInputElement).labels ?? [])].map((l) => l.textContent.trim()) : [];
      return [el.getAttribute("aria-label"), el.textContent.trim(), ...labels].includes(wanted);
    }, name);
    if (hit) return;
  }
  throw new Error(`Tab never reached "${name}"`);
}

/** The page does not scroll sideways, and every control is at least 44 px tall (a 320 px viewport is set by the caller). */
async function fitsPhone(page: Page, where: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
  for (const control of await page.locator("button, select, textarea, input:not([type=file]):not([type=checkbox]):not([type=radio]), label:has(input[type=checkbox]), label:has(input[type=radio]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
}

test("enter an invented card, find it after a reload, see it in the library, and export the library without pictures", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto(`${DEV}${ACES}/home`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aces");
  await expect(page.getByText("Record your Aces cards to play against them.")).toBeVisible();
  await page.getByRole("link", { name: "Open my cards" }).click();
  await expect(page.getByText("No behaviour cards recorded yet.")).toBeVisible();
  const editor = await saveAcesCard(page, DEV);
  await page.screenshot({ path: testInfo.outputPath("editor.png"), fullPage: true });

  await page.goto(`${DEV}${editor}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Brawler, card 3 of 6");
  await expect(page.getByRole("region", { name: "Aggressive column" })).toContainText("the ideal RED has moved");
  await page.getByRole("link", { name: "Your cards" }).click();
  await expect(page.getByRole("heading", { name: "Brawler" })).toBeVisible();
  await expect(page.getByText(/Missing cards 1, 2, 4, 5, 6/)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("my-cards.aces-library.json");
  const path = testInfo.outputPath("library.json");
  await file.saveAs(path);
  const library = JSON.parse(await readFile(path, "utf8"));
  expect(library.kind).toBe("aces-library");
  expect(library.cards).toHaveLength(1);
  expect(library.photos).toBeUndefined();

  await page.getByRole("button", { name: "Delete Brawler card 3" }).click();
  await page.getByRole("group", { name: "Confirm delete" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No behaviour cards recorded yet.")).toBeVisible();
  await page.getByLabel("Import a library file").setInputFiles(path);
  await expect(page.getByText("Added 1 card.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brawler" })).toBeVisible();
});

test("a new player is offered our sample cards, can start a game with them, keeps them out of the library file, and can remove them for good", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`${DEV}${ACES}/cards`);
  await expect(page.getByRole("heading", { name: "Try our sample cards" })).toBeVisible();
  await fitsPhone(page, "the sample offer");
  await page.getByRole("button", { name: "Add the sample cards" }).click();
  await expect(page.getByText("Added the sample cards and the sample lance.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try our sample cards" })).toBeHidden();
  await expect(page.getByText("Sample deck. All 6 cards recorded")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Sample Captain" })).toBeVisible();
  await fitsPhone(page, "the library with samples");

  await page.goto(`${DEV}${ACES}/new-game`);
  await page.getByLabel("Add a unit to your force").selectOption({ label: "Sample Hammer SH-1 (PV 30)" });
  await page.getByRole("button", { name: "Add to your force", exact: true }).click();
  await page.getByLabel("Add a unit to automated force").selectOption({ label: "Sample Longbow SL-1 (PV 33)" });
  await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
  await expect(page.getByLabel("Aces deck of Sample Longbow SL-1")).toContainText("Usual deck (Sniper)");
  await page.getByLabel("Commander", { exact: true }).selectOption("Sample Captain");
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();

  await page.goto(`${DEV}${ACES}/cards`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library" }).click();
  const path = testInfo.outputPath("library.json");
  await (await download).saveAs(path);
  const library = JSON.parse(await readFile(path, "utf8"));
  expect([library.cards, library.commands, library.orders, library.supports].map((l: unknown[]) => l.length)).toEqual([0, 0, 0, 0]);

  await page.getByRole("button", { name: "Remove the sample cards" }).click();
  await expect(page.getByText("Removed the sample cards.")).toBeVisible();
  await page.goto(`${DEV}${ACES}/new-game`);
  await expect(page.getByText("Your roster is empty.").first()).toBeVisible();
  await page.goto(`${DEV}${ACES}/cards`);
  await expect(page.getByText("No behaviour cards recorded yet.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No behaviour cards recorded yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try our sample cards" })).toBeHidden();
});

test("a player who has their own cards is not offered the samples", async ({ page }) => {
  test.setTimeout(60_000);
  await saveAcesCard(page, DEV);
  await page.goto(`${DEV}${ACES}/cards`);
  await expect(page.getByRole("heading", { name: "Brawler" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try our sample cards" })).toBeHidden();
});

test("the editor does not scroll sideways at 320 px at any step, and every control is 44 px tall", async ({ page }) => {
  test.setTimeout(60_000);
  const editor = await saveAcesCard(page, DEV);
  await page.setViewportSize({ width: 320, height: 700 });
  const check = (where: string) => fitsPhone(page, where);
  for (const address of [`${DEV}${ACES}/home`, `${DEV}${ACES}/cards`]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await check(address);
  }
  await page.goto(`${DEV}${editor}`);
  await check("identity");
  for (const [step, column] of [["2. Movement side", "Aggressive"], ["2. Movement side", "Cautious"], ["3. Combat side", ""]] as const) {
    await page.getByRole("button", { name: step }).click();
    if (column) await page.getByRole("button", { name: column, exact: true }).click();
    await check(`${step} ${column}`);
  }
  await page.getByRole("button", { name: "Add a way to choose" }).click();
  await check("the picker open");
});

test("a card can be entered with the keyboard alone", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${DEV}${ACES}/card`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New card");
  await tabToControl(page, "Role");
  await page.keyboard.type("Striker");
  await expect(page.getByLabel("Role", { exact: true })).toHaveValue("Striker");
  await tabToControl(page, "2. Movement side");
  await page.keyboard.press("Enter");
  await tabToControl(page, "Record the three columns");
  await page.keyboard.press("Enter");
  await tabToControl(page, "Add a test to: When the Aggressive column applies");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search the list")).toBeFocused();
  await page.keyboard.type("behind the ideal");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Aggressive column" })).toContainText("it can get behind the ideal RED");
  await tabToControl(page, "Save");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Striker, card 1 of 6");
});

test("a picker entry with numbers can be changed with the stepper buttons", async ({ page }) => {
  await page.goto(`${DEV}${ACES}/card`);
  await page.getByRole("button", { name: "2. Movement side" }).click();
  await page.getByRole("button", { name: "Record the three columns" }).click();
  await pickToken(page, "Add a filter to the Aggressive column", "keep", "keep … from …");
  await page.getByRole("button", { name: "More: Inches" }).click();
  await page.getByRole("button", { name: "More: Inches" }).click();
  await expect(page.getByLabel("Inches", { exact: true })).toHaveValue("8");
  await expect(page.getByRole("region", { name: "Aggressive column" })).toContainText('keep 8" from the target');
});

test("an invented commander card A is entered at 320 px, with a special order and a support card", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await saveAcesCommand(page, DEV);
  await fitsPhone(page, "command identity");
  for (const step of ["2. Orders", "3. Colour lists", "4. Support side", "5. Strategy rows"]) {
    await page.getByRole("button", { name: step }).click();
    await fitsPhone(page, step);
  }
  await page.getByRole("button", { name: "Add a test to: Row 1 applies when" }).click();
  await fitsPhone(page, "strategy picker open");

  await page.goto(`${DEV}${ACES}/order`);
  await page.getByLabel("Special order", { exact: true }).selectOption("fleeing");
  await page.getByRole("button", { name: "Record the column" }).click();
  await fitsPhone(page, "special order column");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto(`${DEV}${ACES}/support`);
  await page.getByLabel("Name", { exact: true }).fill("Invented Barrage");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await fitsPhone(page, "support card");

  await page.goto(`${DEV}${ACES}/cards`);
  await expect(page.getByRole("heading", { name: "Invented Marshal (Invented House)" })).toBeVisible();
  await expect(page.getByText("Recorded A. Missing B, C, D, E.")).toBeVisible();
  await expect(page.getByText("1 of 5 recorded. Missing Forced withdrawal, Movement objective, Destroy objective, Indirect attacks.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Invented Barrage support card" })).toBeVisible();
  await fitsPhone(page, "library with every kind");
});

async function addUnits(page: Page, side: string, names: string[], pv: number): Promise<void> {
  for (const name of names) {
    await page.getByLabel(`Add a unit to ${side}`).selectOption({ label: `${name} (PV ${String(pv)})` });
    await page.getByRole("button", { name: `Add to ${side}`, exact: true }).click();
  }
}

test("a three against four game is set up on a 320 px phone, started, listed on the home and resumed", async ({ page }) => {
  test.setTimeout(120_000);
  await saveAcesCard(page, DEV);
  for (const name of ["Mine A", "Mine B", "Mine C", "Theirs A", "Theirs B", "Theirs C", "Theirs D"]) await saveAsUnit(page, DEV, name, 20);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${DEV}${ACES}/home`);
  await page.getByRole("link", { name: "Set up a game" }).click();
  await addUnits(page, "your force", ["Mine A", "Mine B", "Mine C"], 20);
  await addUnits(page, "automated force", ["Theirs A", "Theirs B", "Theirs C", "Theirs D"], 20);
  await expect(page.getByText("Automated force: 4 units, 80 PV.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=checkbox]), label:has(input[type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? "").toBeGreaterThanOrEqual(43.5);
  }
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New game");
  await page.goto(`${DEV}${ACES}/home`);
  await expect(page.getByText("Turn 1")).toBeVisible();
  await page.getByRole("link", { name: "Resume New game" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
});

test("a movement phase is played on a 320 px phone: Initiative, a unit tapped as moved, and an automated activation", async ({ page }) => {
  test.setTimeout(120_000);
  await saveAcesCard(page, DEV);
  for (const name of ["Mine A", "Mine B", "Theirs A", "Theirs B", "Theirs C"]) await saveAsUnit(page, DEV, name, 20);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${DEV}${ACES}/new-game`);
  await addUnits(page, "your force", ["Mine A", "Mine B"], 20);
  await addUnits(page, "automated force", ["Theirs A", "Theirs B", "Theirs C"], 20);
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
  await fitsPhone(page, "Initiative");
  await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("5");
  await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("9");
  await fitsPhone(page, "Initiative decided");
  await page.getByRole("button", { name: "Start the Movement Phase" }).click();
  // Two against three: you move 1, the automated force 2, you 1, the automated force 1.
  await expect(page.getByText("You: move 1").first()).toBeVisible();
  await expect(page.getByText("Automated: move 2")).toBeVisible();
  await fitsPhone(page, "Movement, your move");
  await page.getByRole("button", { name: "Mine A: Standstill" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /The automated force moves 2 units/ })).toBeVisible();
  await fitsPhone(page, "Movement, the automated force");
  await page.getByRole("button", { name: "Activate Theirs A" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Moving Theirs A" })).toBeVisible();
  await fitsPhone(page, "an activation");
  await page.getByRole("button", { name: "Show the units" }).click();
  await fitsPhone(page, "the units drawer");
});

test("an Initiative roll and the first move are made with the keyboard alone", async ({ page }) => {
  test.setTimeout(120_000);
  await saveAcesCard(page, DEV);
  for (const name of ["Mine A", "Theirs A"]) await saveAsUnit(page, DEV, name, 20);
  await page.goto(`${DEV}${ACES}/new-game`);
  await addUnits(page, "your force", ["Mine A"], 20);
  await addUnits(page, "automated force", ["Theirs A"], 20);
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
  await tabToControl(page, "Your force: 2D6 roll, 2 to 12");
  await page.keyboard.type("5");
  await tabToControl(page, "Automated force: 2D6 roll, 2 to 12");
  await page.keyboard.type("9");
  await tabToControl(page, "Start the Movement Phase");
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { level: 2, name: /You move 1 unit/ });
  await expect(heading).toBeFocused();
  await tabToControl(page, "Mine A: Standstill");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: /The automated force moves 1 unit/ })).toBeFocused();
  await tabToControl(page, "Activate Theirs A");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "Moving Theirs A" })).toBeFocused();
});
