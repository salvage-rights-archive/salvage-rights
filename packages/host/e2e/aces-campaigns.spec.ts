import { readFile } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, DEV, expect, test } from "./fixtures";

// Units, campaigns and the backup are invented for the test.

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

async function seedUnits(page: Page): Promise<void> {
  await page.goto(`${DEV}${ACES}/home`);
  await page.evaluate(async (units) => {
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
      for (const unit of units) tx.objectStore("kv").put({ unit, savedAt: new Date().toISOString() }, `as-unit:${(unit as { id: string }).id}`);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        reject(new Error("write failed"));
      };
    });
  }, [asUnit("m1", "Anvil", "AV-1", 40), asUnit("m2", "Bolt", "BT-2", 30)]);
}

async function fitsPhone(page: Page, where: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=checkbox]):not([type=radio]):not([type=file]), label:has(input[type=checkbox]), a.bt-button").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
}

async function noViolations(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, where).toEqual([]);
}

const BACKUP = {
  acesGame: { ignored: true },
  acesCampaigns: [
    {
      version: 1,
      id: "old-1",
      name: "Imported run",
      campaignBook: "",
      difficulty: "elite",
      existingForce: false,
      advancedForceCreation: false,
      startingWarchest: 500,
      roster: [{ id: "a", chassis: "Cairn", variant: "CN-3", name: "Cairn CN-3", type: "BM", size: 1, pv: 20, omni: false, enhancedNoAmmo: false, status: "active", mulID: 0, notes: "" }],
      pilots: [{ id: "p", callsign: "Ash", type: "BM", skillSP: 0, edgeTokenSP: 0, edgeAbilitySP: 0, unallocatedSP: 150, wounded: false, killed: false, mvpCount: 0, edgeAbilities: [], sortiesPlayed: 0, notes: "a note" }],
      sorties: [],
      memorial: [],
      lastUpdated: "2026-01-01T00:00:00Z",
    },
  ],
};

test("create a campaign, export it, delete it, import it back, and read a BattleTech Tools backup", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await seedUnits(page);
  await page.goto(`${DEV}${ACES}/home`);
  await page.getByRole("link", { name: "Open my campaigns" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Aces campaigns");
  await expect(page.getByText("No campaigns yet.")).toBeVisible();

  await page.getByLabel("Campaign name").fill("Test run");
  await page.getByLabel("Anvil AV-1 (BM, 40 PV)").check();
  await page.getByLabel("Pilot 1 call sign").fill("Ash");
  await page.getByLabel("Pilot 2 call sign").fill("Birch");
  await page.getByLabel("Difficulty").selectOption("legendary");
  await page.getByLabel("PV percent (the book number or lower)").fill("-50");
  await page.getByLabel("SP earned percent (the book number or lower)").fill("90");
  await expect(page.getByText("1 unit, 40 PV. Starting warchest 14800 SP.")).toBeVisible();
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test run");
  await expect(page.getByText("Legendary: PV -50%, SP earned 70%")).toBeVisible();
  await expect(page.getByText("14800 SP")).toBeVisible();
  await page.getByRole("button", { name: "Roster" }).click();
  await expect(page.getByText("Anvil AV-1", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Named Pilots" }).click();
  await page.getByLabel("Skill SP", { exact: false }).first().fill("150");
  await expect(page.getByText("You have changes that are not saved.")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Leaving with unsaved edits asks first.
  await page.getByLabel("Skill SP", { exact: false }).first().fill("120");
  await page.locator("a.bt-back").click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Aces campaigns");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Test run" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Test-run.aces-campaigns.json");
  const path = testInfo.outputPath("campaign.json");
  await file.saveAs(path);
  const made = JSON.parse(await readFile(path, "utf8")) as { kind: string; campaigns: { name: string }[]; units: { id: string }[] };
  expect(made.kind).toBe("aces-campaigns");
  expect(made.units.map((u) => u.id)).toEqual(["m1"]);

  await page.getByRole("button", { name: "Delete Test run" }).click();
  await page.getByRole("group", { name: "Confirm delete" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No campaigns yet.")).toBeVisible();
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(path);
  await expect(page.getByText(/Added 1 campaign from the file/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Test run" })).toBeVisible();

  // The same file again: nothing new, nothing lost.
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(path);
  await expect(page.getByText(/1 campaign already here, unchanged/)).toBeVisible();

  // A BattleTech Tools backup comes in through the same control, with what was left behind in plain words.
  const backup = testInfo.outputPath("backup.json");
  await (await import("node:fs/promises")).writeFile(backup, JSON.stringify(BACKUP));
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(backup);
  await expect(page.getByText(/Added 1 campaign from a BattleTech Tools backup/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "What we could not carry over" })).toBeVisible();
  await expect(page.getByText(/card values/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Imported run" })).toBeVisible();

  // The file the old Aces pages download (AcesExport.json) comes in through the same control: campaigns, cards, the game in progress and
  // the units they use. Its other entries (a token-looking one among them) are never stored.
  const exported = join(process.cwd(), "packages/family-battletech/src/rules/testdata/AcesExport.json");
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(exported);
  await expect(page.getByText(/Added 1 campaign, 6 cards, 1 game in progress from a BattleTech Tools Aces export/)).toBeVisible();
  await expect(page.getByText(/other entries \(settings and other saves\) were not read/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "The rest of the export file" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Invented run" })).toBeVisible();
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(exported);
  await expect(page.getByText(/6 cards and 1 game already here, unchanged/)).toBeVisible();
  await page.goto(`${DEV}${ACES}/home`);
  await expect(page.getByText("Invented skirmish").first()).toBeVisible();
  const kept = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("salvage-rights:battletech");
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("open failed"));
      };
    });
    const all = await new Promise<unknown[]>((resolve) => {
      const request = db.transaction("kv").objectStore("kv").getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
    db.close();
    return JSON.stringify([all, Object.entries(localStorage)]);
  });
  expect(kept).toContain("Invented skirmish");
  expect(kept).not.toMatch(/ghp_INVENTED|customMULGithubToken|uiTheme|an unrelated entry/);
  await page.goto(`${DEV}${ACES}/campaigns`);

  // A wrong file is answered, not thrown.
  const wrong = testInfo.outputPath("wrong.json");
  await (await import("node:fs/promises")).writeFile(wrong, "not json");
  await page.getByLabel("Import a campaign file or a BattleTech Tools backup").setInputFiles(wrong);
  await expect(page.getByRole("alert").filter({ hasText: "not a campaign file" })).toBeVisible();
});

/** Hires an invented pilot (once per page) and picks an Edge ability from the table, so the ability list is scanned too. */
async function hireWithEdgeAbility(page: Page): Promise<void> {
  const nimble = page.getByLabel(/Nimble \(Movement\)/);
  if (!(await nimble.first().isVisible())) {
    await page.getByLabel("Call sign").fill("Ash");
    await page.getByRole("button", { name: "Hire", exact: true }).click();
  }
  await nimble.first().check();
  const save = page.getByRole("button", { name: "Save", exact: true });
  if (await save.isEnabled()) await save.click();
  await expect(page.getByText("You have changes that are not saved.")).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Other Edge ability names, separated by commas" }).first()).toBeVisible();
}

test("the campaign pages at 320 px, in both themes, without axe violations", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await seedUnits(page);
  const list = `${DEV}${ACES}/campaigns`;
  await page.goto(list);
  await page.getByLabel("Campaign name").fill("Phone run");
  await page.getByLabel("Anvil AV-1 (BM, 40 PV)").check();
  await fitsPhone(page, "campaigns, light");
  await noViolations(page, "campaigns, light");
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phone run");
  const url = page.url();
  for (const name of ["Overview", "Roster", "Named Pilots", "Sorties", "Keywords", "Memorial"]) {
    await page.getByRole("button", { name, exact: true }).click();
    if (name === "Named Pilots") {
      await hireWithEdgeAbility(page);
      // A link drawn as a button keeps its own text colour on hover (the site's link hover colour once made it 1:1).
      await page.getByRole("link", { name: "Print the sheets" }).hover();
    }
    await fitsPhone(page, `campaign ${name}, light`);
    await noViolations(page, `campaign ${name}, light`);
  }

  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "Print the sheets" }).click();
  await expect(page.getByRole("heading", { name: "Aces: Player Force Roster" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aces: Campaign Log" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aces: Sortie Log" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aces: Named Pilots" })).toBeVisible();
  await fitsPhone(page, "print page, light");
  await noViolations(page, "print page, light");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Aces: Player Force Roster" })).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  const printUrl = page.url();

  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: "Dark" }).check();
  await page.goto(url);
  for (const name of ["Overview", "Roster", "Named Pilots"]) {
    await page.getByRole("button", { name, exact: true }).click();
    if (name === "Named Pilots") {
      await hireWithEdgeAbility(page);
      // A link drawn as a button keeps its own text colour on hover (the site's link hover colour once made it 1:1).
      await page.getByRole("link", { name: "Print the sheets" }).hover();
    }
    await noViolations(page, `campaign ${name}, dark`);
  }
  await page.goto(printUrl);
  await expect(page.getByRole("heading", { name: "Aces: Campaign Log" })).toBeVisible();
  await noViolations(page, "print page, dark");
  await page.goto(list);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await noViolations(page, "campaigns, dark");
});
