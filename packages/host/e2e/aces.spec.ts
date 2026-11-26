import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { ACES, DEV, expect, pickToken, saveAcesCard, test } from "./fixtures";

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

test("the editor does not scroll sideways at 320 px at any step, and every control is 44 px tall", async ({ page }) => {
  test.setTimeout(60_000);
  const editor = await saveAcesCard(page, DEV);
  await page.setViewportSize({ width: 320, height: 700 });
  const check = async (where: string) => {
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
    for (const control of await page.locator("button, select, textarea, input:not([type=file]):not([type=checkbox]):not([type=radio]), label:has(input[type=checkbox]), label:has(input[type=radio]), a.bt-button").all()) {
      const box = await control.boundingBox();
      if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
    }
  };
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
