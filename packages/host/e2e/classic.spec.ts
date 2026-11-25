import { readFile } from "node:fs/promises";
import { CLASSIC, DEV, FAKE_KEY, MECH_NAME, expect, importMech, test } from "./fixtures";

const HOME = `${DEV}${CLASSIC}/home`;

test("import a 'Mech by number, move an item by keyboard, save, and find it again", async ({ page }) => {
  await importMech(page, DEV);
  await expect(page.getByText("Designed by Test Designer on mordel.net")).toBeVisible();
  // A finding of this unit: its parts weigh less than its tonnage, with the printed page it rests on.
  const rules = page.getByRole("region", { name: "Rules check" });
  await expect(rules.getByText("The parts weigh 40 tons of 50 tons; 10 tons is unused.")).toBeVisible();
  await expect(rules.getByText("TechManual (Catalyst Game Labs), p. 46")).toBeVisible();

  // The key is kept on the device and shown nowhere.
  expect(page.url()).not.toContain(FAKE_KEY);
  expect(await page.locator("body").innerText()).not.toContain(FAKE_KEY);

  const leftArm = page.getByRole("list", { name: "Left Arm slots" });
  const ammoActions = page.getByRole("button", { name: "Actions for AC/10 Ammo", exact: true });
  await expect(leftArm.getByRole("button", { name: "Actions for AC/10 Ammo", exact: true })).toHaveCount(0);

  // Reach the button and the next controls with the keyboard.
  await ammoActions.focus();
  await page.keyboard.press("Enter");
  await expect(ammoActions).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Move AC/10 Ammo", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Choose a slot for AC/10 Ammo. Press Escape to cancel.")).toBeVisible();
  const target = page.getByRole("button", { name: "Place AC/10 Ammo in Left Arm slot 10", exact: true });
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(leftArm.getByRole("button", { name: "Actions for AC/10 Ammo", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MECH_NAME);

  await page.goto(HOME);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classic BattleTech");
  await expect(page.getByRole("list").getByText(MECH_NAME)).toBeVisible();
  await page.getByRole("link", { name: `Open ${MECH_NAME}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MECH_NAME);
  await expect(page.getByRole("list", { name: "Left Arm slots" }).getByRole("button", { name: "Actions for AC/10 Ammo", exact: true })).toBeVisible();
});

// A 1 by 1 PNG, the smallest picture a player could upload.
const PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("open a 'Mech's record sheet, give it a picture, and print only the sheet", async ({ page }) => {
  await importMech(page, DEV);
  await page.getByLabel("Upload a picture").setInputFiles({ name: "unit.png", mimeType: "image/png", buffer: PIXEL_PNG });
  await expect(page.getByRole("img", { name: `${MECH_NAME}, your picture` })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${MECH_NAME} record sheet`);
  const sheet = page.getByRole("img", { name: `${MECH_NAME} record sheet` });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("text", { hasText: /^Autocannon\/10$/ })).toBeVisible();
  await expect(sheet.locator("[data-diagram='armor']")).toBeVisible();
  await expect(sheet.locator("[data-picture='image'] image")).toHaveAttribute("href", /^data:image\/png;base64,/);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sr-header")).toBeHidden();
  await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
  await expect(sheet).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  // The home page's list has its own way in, and the sheet's own way back to the list.
  await page.goto(HOME);
  await page.getByRole("link", { name: `Record sheet for ${MECH_NAME}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${MECH_NAME} record sheet`);
  await page.getByRole("link", { name: /Your 'Mechs/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classic BattleTech");
});

test("export a 'Mech to a file, delete it and import the file back", async ({ page }, testInfo) => {
  await importMech(page, DEV);
  await page.goto(HOME);

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: `Export ${MECH_NAME}` }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.mech\.json$/);
  const file = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  const text = await readFile(file, "utf8");
  const parsed = JSON.parse(text) as { app: string; kind: string };
  expect(parsed.app).toBe("salvage-rights");
  expect(parsed.kind).toBe("mech");
  expect(text).not.toContain(FAKE_KEY);

  await page.getByRole("button", { name: `Delete ${MECH_NAME}` }).click();
  await page.getByRole("group", { name: "Confirm delete" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No 'Mechs saved yet.")).toBeVisible();

  await page.getByLabel("Import a file").setInputFiles(file);
  await expect(page.getByText("'Mech imported.")).toBeVisible();
  await page.getByRole("link", { name: `Open ${MECH_NAME}` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MECH_NAME);
});

test("the home, import and editor pages do not scroll sideways at 320 px wide", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await importMech(page, DEV);
  const editor = page.url();
  for (const address of [HOME, `${DEV}${CLASSIC}/import`, editor]) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Leaving the import page while its designs request is in flight shows up as a page error in WebKit.
    if (address.endsWith("/import")) await expect(page.getByText("You have no designs on mordel.net yet.")).toBeVisible();
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll, `scroll width on ${address}`).toBe(widths.client);
  }
});

test("build a tripod through the form and reach its record sheet", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Strider");
  await form.getByLabel("Tonnage").selectOption("55");
  await form.getByLabel("Configuration").selectOption({ label: "Tripod (advanced rules)" });
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("list", { name: "Center Leg slots" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rules check" }).getByText("Interstellar Operations: Alternate Eras, p. 158")).toBeVisible();
  await page.getByRole("link", { name: "Record sheet" }).click();
  const sheet = page.getByRole("img", { name: /record sheet$/ });
  await expect(sheet.locator("[data-location='CL']")).toBeVisible();
  await expect(sheet.locator("[data-diagram]")).toHaveCount(3);
});
