import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACES, DEV, answerQuestions, expect, expectPage, putAsUnits, saveAcesCard, saveAcesCommand, test } from "./fixtures";

// A whole invented two-turn game on a phone-sized screen: two invented units, one invented behaviour card and one invented command card.
// No printed card, photo or scan is used.

/** Gives the first unit on the players' side a pilot with 2 Edge, as a campaign game does. */
async function givePilotEdge(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("salvage-rights:battletech", 1);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("open failed"));
      };
    });
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const request = db.transaction("kv").objectStore("kv").getAllKeys();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
    const key = keys.find((k) => String(k).startsWith("aces-game:"));
    const stored = await new Promise<{ game: { sides: { player: { units: { edge?: number }[] } } } }>((resolve) => {
      const request = db.transaction("kv").objectStore("kv").get(key as IDBValidKey);
      request.onsuccess = () => {
        resolve(request.result as { game: { sides: { player: { units: { edge?: number }[] } } } });
      };
    });
    const first = stored.game.sides.player.units[0];
    if (first) first.edge = 2;
    await new Promise<void>((resolve) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(stored, key as IDBValidKey);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  });
}

async function fitsPhone(page: Page, where: string): Promise<void> {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll, `scroll width: ${where}`).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=checkbox]):not([type=radio]), label:has(input[type=checkbox])").all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box) expect(box.height, `${where}: ${(await control.textContent())?.slice(0, 30) ?? ""}`).toBeGreaterThanOrEqual(43.5);
  }
}

async function noViolations(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, where).toEqual([]);
}

async function playMovement(page: Page): Promise<void> {
  const mine = page.getByRole("button", { name: "Mine A: Ground" });
  const theirs = page.getByRole("button", { name: "Activate Theirs A" });
  const toCombat = page.getByRole("button", { name: "Go to the Combat Phase" });
  // The forces take turns, the one that lost Initiative first: tap whichever step is open until the phase can end.
  for (let i = 0; i < 6 && !(await toCombat.isEnabled()); i += 1) {
    if (await mine.isVisible()) await mine.click();
    else if (await theirs.isVisible()) {
      await theirs.click();
      await answerQuestions(page, /^Move Theirs A/);
      await page.getByRole("button", { name: "Done: Theirs A has moved" }).click();
    } else await page.waitForTimeout(200);
  }
  await expect(toCombat).toBeEnabled();
}

test("play an invented two-turn game at 320 px: Initiative, Movement, Combat and End Phase, a pilot's Edge, the turn limit and the summary", async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await saveAcesCard(page, DEV);
  await saveAcesCommand(page, DEV);
  await putAsUnits(page, ["Mine A", "Theirs A"]);

  await page.goto(`${DEV}${ACES}/new-game`);
  await page.getByLabel("Add a unit to your force").selectOption({ label: "Mine A (PV 20)" });
  await page.getByRole("button", { name: "Add to your force", exact: true }).click();
  await page.getByLabel("Add a unit to automated force").selectOption({ label: "Theirs A (PV 20)" });
  await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
  await page.getByLabel("Last turn of the sortie (leave empty for no limit)").fill("2");
  await page.getByRole("button", { name: "Start the game" }).click();
  await expectPage(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
  await givePilotEdge(page);
  await page.reload();

  // Turn 1. The automated force wins Initiative, so you move and attack first.
  const orders = page.getByRole("button", { name: "Apply the orders" });
  await expectPage(page.getByRole("heading", { level: 2, name: "Turn 1: Initiative" })).toBeVisible();
  await answerQuestions(page, /^Orders applied|No order applies|Apply the orders/);
  if (await orders.isVisible()) await orders.click();
  await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("2");
  await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("12");
  await page.getByRole("button", { name: "Start the Movement Phase" }).click();
  await playMovement(page);
  await fitsPhone(page, "movement done");
  await page.getByRole("button", { name: "Go to the Combat Phase" }).click();

  // Combat: you attack first, with a pip from your pilot's Edge.
  await expect(page.getByRole("heading", { level: 2, name: /Turn 1: Combat. You attack/ })).toBeVisible();
  await fitsPhone(page, "combat, your attacks");
  await page.screenshot({ path: testInfo.outputPath("combat.png"), fullPage: true });
  // The Edge panel lists the abilities for this phase and unit type.
  await page.getByText("Edge tokens", { exact: true }).click();
  await expect(page.getByLabel("Edge ability")).toContainText("Marksman");
  await fitsPhone(page, "the Edge panel open");
  await noViolations(page, "the Edge panel open");
  await page.getByRole("button", { name: "Attack with Mine A" }).click();
  await page.getByLabel("Distance to the target, in inches (base to base)").fill("10");
  await expect(page.getByText(/^Target Number \d+$/)).toBeVisible();
  await page.getByLabel(/^2D6 attack roll/).fill("8");
  // The pip is ticked after the roll and spent when the attack is recorded.
  await page.getByLabel(/^Spend 1 Edge to add a pip/).check();
  await expect(page.getByText(/^8 plus a pip: a (hit|miss)\.$/)).toBeVisible();
  await fitsPhone(page, "an attack being recorded");
  await page.screenshot({ path: testInfo.outputPath("attack.png"), fullPage: true });
  await page.getByRole("button", { name: "Record the attack" }).click();

  // The automated unit attacks by its card.
  await expect(page.getByRole("heading", { level: 2, name: /The automated force attacks/ })).toBeVisible();
  await page.getByRole("button", { name: "Attack with Theirs A" }).click();
  await answerQuestions(page, /^Theirs A (attacks Mine A|makes no attack)/);
  await fitsPhone(page, "an automated attack");
  await page.screenshot({ path: testInfo.outputPath("automated.png"), fullPage: true });
  await noViolations(page, "an automated attack open");
  const record = page.getByRole("button", { name: "Record the attack" });
  if (await record.isVisible()) {
    await page.getByLabel(/^2D6 attack roll/).fill("3");
    await record.click();
  } else {
    await page.getByRole("button", { name: /^Done: Theirs A makes no attack/ }).click();
  }
  await expect(page.getByText("Every unit has attacked", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Go to the End Phase" }).click();

  // End Phase: the six steps.
  await expect(page.getByRole("heading", { level: 2, name: /End Phase, step 1 of 6/ })).toBeVisible();
  await noViolations(page, "End Phase step 1");
  await page.getByRole("button", { name: "Done with the sortie rules" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /step 2 of 6/ })).toBeVisible();
  await fitsPhone(page, "End Phase step 2");
  await page.screenshot({ path: testInfo.outputPath("step2.png"), fullPage: true });
  await page.getByRole("button", { name: "Apply the damage and critical hits" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /step 3 of 6/ })).toBeVisible();
  await page.getByRole("button", { name: "Done with heat" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /step 4 of 6/ })).toBeVisible();
  await page.getByRole("button", { name: "Go on" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /step 5 of 6/ })).toBeVisible();
  await answerQuestions(page, /^(No row holds|Row \d+ holds|No command card)/);
  const take = page.getByRole("button", { name: /^(Keep the card|Take command card .)$/ });
  if (await take.isVisible()) await take.click();
  else await page.getByRole("button", { name: "Go on" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /step 6 of 6/ })).toBeVisible();
  await fitsPhone(page, "End Phase step 6");
  await page.screenshot({ path: testInfo.outputPath("step6.png"), fullPage: true });
  await page.getByRole("button", { name: "Start turn 2" }).click();

  // Turn 2 plays through to the turn limit.
  await expect(page.getByRole("heading", { level: 2, name: "Turn 2: Initiative" })).toBeVisible();
  await answerQuestions(page, /^Orders applied|No order applies|Apply the orders/);
  if (await orders.isVisible()) await orders.click();
  await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("12");
  await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("2");
  await page.getByRole("button", { name: "Start the Movement Phase" }).click();
  await playMovement(page);
  await page.getByRole("button", { name: "Go to the Combat Phase" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /Turn 2: Combat/ })).toBeVisible();
  // The automated force lost this time and attacks first.
  await page.getByRole("button", { name: "Attack with Theirs A" }).click();
  await answerQuestions(page, /^Theirs A (attacks Mine A|makes no attack)/);
  if (await record.isVisible()) {
    await page.getByLabel(/^2D6 attack roll/).fill("2");
    await record.click();
  } else {
    await page.getByRole("button", { name: /^Done: Theirs A makes no attack/ }).click();
  }
  await page.getByRole("button", { name: "Attack with Mine A" }).click();
  await page.getByRole("button", { name: "Mine A makes no attack" }).click();
  await page.getByRole("button", { name: "Go to the End Phase" }).click();
  await page.getByRole("button", { name: "Done with the sortie rules" }).click();
  await page.getByRole("button", { name: "Apply the damage and critical hits" }).click();
  await page.getByRole("button", { name: "Done with heat" }).click();
  await expect(page.getByText("Turn 2 was the last turn.")).toBeVisible();
  await fitsPhone(page, "End Phase step 4 at the turn limit");
  await page.getByRole("button", { name: "End the game" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Game over after turn 2" })).toBeVisible();
  await fitsPhone(page, "game over");
  await noViolations(page, "game over");
  await page.screenshot({ path: testInfo.outputPath("game-over.png"), fullPage: true });

  // A reload comes back to the summary, and the log keeps the whole game.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Game over after turn 2" })).toBeVisible();
  await page.getByRole("button", { name: "Log" }).click();
  await expect(page.getByText("The sortie ends: the last turn ended.")).toBeVisible();
});

test("the units list: damage entered by hand is staged, and a unit that left the table is out of play", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await saveAcesCard(page, DEV);
  await saveAcesCommand(page, DEV);
  await putAsUnits(page, ["Mine A", "Theirs A"]);
  await page.goto(`${DEV}${ACES}/new-game`);
  await page.getByLabel("Add a unit to your force").selectOption({ label: "Mine A (PV 20)" });
  await page.getByRole("button", { name: "Add to your force", exact: true }).click();
  await page.getByLabel("Add a unit to automated force").selectOption({ label: "Theirs A (PV 20)" });
  await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
  await page.getByRole("button", { name: "Start the game" }).click();
  const orders = page.getByRole("button", { name: "Apply the orders" });
  await answerQuestions(page, /^Orders applied|No order applies|Apply the orders/);
  if (await orders.isVisible()) await orders.click();
  await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("2");
  await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("12");
  await page.getByRole("button", { name: "Start the Movement Phase" }).click();

  await page.getByRole("button", { name: "Show the units" }).click();
  await page.getByText("Damage by hand or left the table: Mine A").click();
  await page.getByLabel("Damage to Mine A, staged until the End Phase").fill("1");
  await page.getByRole("button", { name: "Stage the damage on Mine A" }).click();
  await expect(page.getByText(/1 staged/)).toBeVisible();
  await fitsPhone(page, "the units list with a hand entry open");
  await noViolations(page, "the units list with a hand entry open");

  await page.getByText("Objectives and transports").click();
  await page.getByRole("group", { name: "Pursues the movement objective" }).getByLabel("Theirs A").check();
  await page.getByRole("group", { name: "Is the destroy objective" }).getByLabel("Mine A").check();
  await expect(page.getByRole("group", { name: "Is the destroy objective" }).getByLabel("Mine A")).toBeChecked();
  await fitsPhone(page, "the objectives panel open");
  await noViolations(page, "the objectives panel open");

  await page.getByText("Damage by hand or left the table: Theirs A").click();
  await page.getByRole("button", { name: "Theirs A left the table" }).click();
  await expect(page.getByText("Escaped")).toBeVisible();
  await expect(page.getByRole("button", { name: "Theirs A left the table" })).toHaveCount(0);
});

test("the support step: the End Phase waits until the players close it", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 320, height: 800 });
  await saveAcesCard(page, DEV);
  await saveAcesCommand(page, DEV);
  await page.goto(`${DEV}${ACES}/support`);
  await page.getByLabel("Name", { exact: true }).fill("Invented Barrage");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await putAsUnits(page, ["Mine A", "Theirs A"]);
  await page.goto(`${DEV}${ACES}/new-game`);
  await page.getByLabel("Add a unit to your force").selectOption({ label: "Mine A (PV 20)" });
  await page.getByRole("button", { name: "Add to your force", exact: true }).click();
  await page.getByLabel("Add a unit to automated force").selectOption({ label: "Theirs A (PV 20)" });
  await page.getByRole("button", { name: "Add to automated force", exact: true }).click();
  await page.getByLabel(/Invented Barrage/).check();
  await page.getByRole("button", { name: "Start the game" }).click();
  const orders = page.getByRole("button", { name: "Apply the orders" });
  await answerQuestions(page, /^Orders applied|No order applies|Apply the orders/);
  if (await orders.isVisible()) await orders.click();
  await page.getByLabel("Your force: 2D6 roll, 2 to 12").fill("2");
  await page.getByLabel("Automated force: 2D6 roll, 2 to 12").fill("12");
  await page.getByRole("button", { name: "Start the Movement Phase" }).click();
  await playMovement(page);
  await page.getByRole("button", { name: "Go to the Combat Phase" }).click();
  await page.getByRole("button", { name: "Attack with Mine A" }).click();
  await page.getByRole("button", { name: "Mine A makes no attack" }).click();
  await page.getByRole("button", { name: "Attack with Theirs A" }).click();
  await answerQuestions(page, /^Theirs A (attacks Mine A|makes no attack)/);
  const record = page.getByRole("button", { name: "Record the attack" });
  if (await record.isVisible()) {
    await page.getByLabel(/^2D6 attack roll/).fill("2");
    await record.click();
  } else {
    await page.getByRole("button", { name: /^Done: Theirs A makes no attack/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Emplacements, artillery and support cards" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to the End Phase" })).toBeDisabled();
  await fitsPhone(page, "the support step");
  await noViolations(page, "the support step");
  // With no command deck recorded the page says to read the card, and the players close the step.
  await expect(page.getByText(/No command card is recorded/).first()).toBeVisible();
  await page.getByRole("button", { name: "Done with the support step" }).click();
  await expect(page.getByRole("button", { name: "Go to the End Phase" })).toBeEnabled();
});
