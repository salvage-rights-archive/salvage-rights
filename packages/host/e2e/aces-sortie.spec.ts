import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, DEV, expect, test } from "./fixtures";

// The campaign, units and pilots are invented for the test; only the opposing unit names are the book's.

const COLOUR = { value: 1 };
const asUnit = (id: string, chassis: string, model: string, pv: number) => ({
  schema: 1,
  kind: "as-unit",
  id,
  editionId: "classic",
  name: { chassis, model },
  card: { type: "BM", size: 2, tmm: 1, move: [{ inches: 6, mode: "" }], role: "Brawler", pv, damage: { s: COLOUR, m: COLOUR, l: { value: 0 } }, ov: 0, armor: 3, structure: 3, specials: [] },
  skill: 4,
  source: { kind: "manual" },
});

const CAMPAIGN = {
  schema: 1,
  kind: "aces-campaign",
  id: "sortie1",
  name: "Test run",
  book: "scouring-sands",
  difficulty: "standard",
  existingForce: false,
  startWarchest: 400,
  roster: [
    { unitId: "m1", name: "Anvil AV-1", type: "BM", pv: 40, size: 3, status: "active" },
    { unitId: "m2", name: "Bolt BT-2", type: "BM", pv: 30, size: 1, status: "active" },
    { unitId: "m3", name: "Gone GN-3", type: "BM", pv: 30, size: 1, status: "destroyed" },
  ],
  pilots: [
    { id: "p1", callsign: "Ash", type: "BM", totalSp: 150, alloc: { skill: 0, edge: 0, abilities: 0 }, abilities: [], wounded: false, killed: false, mvp: 0, sorties: 0 },
    { id: "p2", callsign: "Birch", type: "BM", totalSp: 150, alloc: { skill: 0, edge: 0, abilities: 0 }, abilities: [], wounded: true, killed: false, mvp: 0, sorties: 0 },
  ],
  ledger: [],
  sorties: [],
};

async function seed(page: Page): Promise<void> {
  await page.goto(`${DEV}${ACES}/home`);
  await page.evaluate(
    async ({ campaign, units }) => {
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
        const at = new Date().toISOString();
        tx.objectStore("kv").put({ campaign, savedAt: at }, "aces-campaign:sortie1");
        for (const unit of units) tx.objectStore("kv").put({ unit, savedAt: at }, `as-unit:${(unit as { id: string }).id}`);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          reject(new Error("write failed"));
        };
      });
    },
    { campaign: CAMPAIGN, units: [asUnit("m1", "Anvil", "AV-1", 40), asUnit("m2", "Bolt", "BT-2", 30), asUnit("t1", "Rifleman", "C 2", 30)] },
  );
}

async function fitsPhone(page: Page, where: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=checkbox]):not([type=radio]), label:has(input[type=checkbox]), label:has(input[type=radio]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
}

async function noViolations(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, where).toEqual([]);
}

test("set up sortie 1 with invented units at 320 px, in both themes without axe violations, and create the game", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await seed(page);
  const url = `${DEV}${ACES}/sortie?campaign=sortie1&n=1`;
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start sortie 01");
  await expect(page.getByText("PV limit 180, adjusted for your difficulty 180. Fielded: 0 units, 0 PV.")).toBeVisible();

  // The destroyed unit is not offered; the two active ones are.
  await expect(page.getByLabel(/Gone GN-3/)).toHaveCount(0);
  await page.getByLabel("Anvil AV-1 (BM, 40 PV)").check();
  await page.getByLabel("Named Pilot of Anvil AV-1").selectOption({ label: "Ash, Skill 4" });
  await expect(page.getByLabel("Named Pilot of Anvil AV-1").locator("option", { hasText: "Birch" })).toHaveCount(0);
  await page.getByLabel("Anvil AV-1 is the force commander").check();
  await page.getByLabel("OMNI variant PV of Anvil AV-1, if reconfigured").fill("45");
  await expect(page.getByText("Reconfiguring Anvil AV-1 costs 200 SP.")).toBeVisible();
  await page.getByLabel("Bolt BT-2 (BM, 30 PV)").check();
  await expect(page.getByText("Fielded: 2 units, 75 PV.")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Add this unit/ })).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("sortie.png"), fullPage: true });
  await fitsPhone(page, "sortie, light");
  await noViolations(page, "sortie, light");

  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: "Dark" }).check();
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noViolations(page, "sortie, dark");

  await page.getByLabel("Bolt BT-2 (BM, 30 PV)").check();
  await page.getByRole("button", { name: "Create the game" }).click();
  await expect(page).toHaveURL(/aces-preview\/game\?id=/);
});
