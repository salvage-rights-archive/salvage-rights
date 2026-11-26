import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, DEV, expect, expectPage, test } from "./fixtures";

// The campaign is invented for the test: three units and three pilots, no printed card.

const CAMPAIGN = {
  schema: 1,
  kind: "aces-campaign",
  id: "after1",
  name: "Test run",
  book: "own",
  difficulty: "standard",
  existingForce: false,
  startWarchest: 400,
  roster: [
    { unitId: "u1", name: "Anvil AV-1", type: "BM", pv: 30, size: 3, status: "active" },
    { unitId: "u2", name: "Bolt BT-2", type: "BM", pv: 20, size: 1, status: "active" },
    { unitId: "u3", name: "Carrier CR-3", type: "CV", pv: 25, size: 2, status: "active" },
  ],
  pilots: [
    { id: "p1", callsign: "Ash", type: "BM", totalSp: 150, alloc: { skill: 0, edge: 0, abilities: 0 }, abilities: [], wounded: false, killed: false, mvp: 0, sorties: 0 },
    { id: "p2", callsign: "Birch", type: "BM", totalSp: 150, alloc: { skill: 0, edge: 0, abilities: 0 }, abilities: [], wounded: false, killed: false, mvp: 0, sorties: 0 },
  ],
  ledger: [],
  sorties: [],
};

async function seed(page: Page): Promise<string> {
  await page.goto(`${DEV}${ACES}/home`);
  await page.evaluate(async (campaign) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("salvage-rights:battletech", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("kv");
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("open failed"));
      };
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put({ campaign, savedAt: new Date().toISOString() }, "aces-campaign:after1");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        reject(new Error("write failed"));
      };
    });
  }, CAMPAIGN);
  return `${DEV}${ACES}/after?campaign=after1&n=1`;
}

async function fitsPhone(page: Page, where: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=checkbox]):not([type=radio]), label:has(input[type=checkbox])").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
}

async function noViolations(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, where).toEqual([]);
}

test("run the after-sortie steps for an invented sortie at 320 px, in both themes without axe violations", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 800 });
  const url = await seed(page);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("After sortie 1");

  // Casualties: the 'Mech with a pilot is destroyed and salvaged, its crew wounded; the vehicle is crippled.
  await page.getByLabel("Named Pilot of Anvil AV-1").selectOption({ label: "Ash" });
  await page.getByLabel("Anvil AV-1 was destroyed in the game").check();
  await page.getByLabel(/Salvage Check roll, 4 or more passes/).first().fill("7");
  await page.getByLabel("Crew roll").first().fill("5");
  await expect(page.getByText("The crew is wounded.")).toBeVisible();
  await page.getByLabel("Named Pilot of Bolt BT-2").selectOption({ label: "Birch" });
  await page.getByLabel("How Carrier CR-3 ended the game").selectOption({ label: "Crippled" });
  await page.screenshot({ path: testInfo.outputPath("casualties.png"), fullPage: true });
  await fitsPhone(page, "casualties");
  await noViolations(page, "casualties, light");

  await page.getByRole("button", { name: "2. Income" }).click();
  await page.getByLabel("Primary objective SP").fill("1200");
  await page.getByLabel("Other objectives SP").fill("600");
  await expect(page.getByText("1200 + 600 = 1800, times 100% = 1800 SP income.")).toBeVisible();
  await fitsPhone(page, "income");

  await page.getByRole("button", { name: "3. Expenses" }).click();
  await page.getByLabel(/^Reconnaissance SP/).fill("100");
  // Rearming 3 x 20, personnel 1 x 100, repairs: Anvil 3 x 100 + Carrier 1 x 60.
  await expect(page.getByText("Total expenses 620 SP.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("expenses.png"), fullPage: true });
  await fitsPhone(page, "expenses");

  await page.getByRole("button", { name: "4. Earnings" }).click();
  await expect(page.getByText("1800 income - 620 expenses = 1180 SP earned.")).toBeVisible();

  await page.getByRole("button", { name: "5. Named Pilots" }).click();
  await page.getByLabel(/The most SP each Named Pilot may take/).fill("80");
  await page.getByLabel("Most Valuable Pilot").selectOption({ label: "Birch" });
  await expect(page.getByText("Shares 160 SP, leaving 1420 SP in the warchest.")).toBeVisible();
  await fitsPhone(page, "pilots");
  await page.getByRole("button", { name: "Record the sortie" }).click();
  await expect(page.getByText("Sortie 1 recorded.").first()).toBeVisible();
  await page.getByLabel("Skill SP for Ash").fill("100");
  await page.getByLabel(/^Edge tokens SP for Ash/).fill("130");
  await expect(page.getByText(/Total SP earned 230.*0 still to allocate/)).toBeVisible();
  await page.getByRole("button", { name: "Save the allocation" }).click();
  await expect(page.getByText("Allocation saved.")).toBeVisible();
  await fitsPhone(page, "allocation");
  await noViolations(page, "pilots, light");

  await page.getByRole("button", { name: "6. Buy and sell" }).click();
  await page.getByLabel("Name of the unit").fill("Dart DT-4");
  await page.getByLabel("Skill 4 PV").fill("10");
  await page.getByRole("button", { name: "Buy the unit" }).click();
  await expect(page.getByText("Bought this sortie 400, sold 0.")).toBeVisible();
  await page.getByRole("button", { name: "Sell Bolt BT-2 for 400 SP" }).click();
  await expect(page.getByText("Bought this sortie 400, sold 400.")).toBeVisible();
  await fitsPhone(page, "trades");

  await page.getByRole("button", { name: "7. Keywords and next sortie" }).click();
  await page.getByLabel(/^Keywords gained/).fill("progress-1, EXAMPLE");
  await page.getByLabel("Number of the sortie to play next").fill("5");
  await page.getByRole("button", { name: "Save keywords and next sortie" }).click();
  await expect(page.getByRole("list", { name: "Keyword totals" })).toContainText("PROGRESS 1");
  await fitsPhone(page, "keywords");

  // The sortie stays recorded after a reload.
  await page.reload();
  await expectPage(page.getByText("Sortie 1 is recorded.").first()).toBeVisible();

  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: "Dark" }).check();
  await page.goto(url);
  await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noViolations(page, "recorded, dark");
  await page.getByRole("button", { name: "5. Named Pilots" }).click();
  await noViolations(page, "pilots, dark");
});
