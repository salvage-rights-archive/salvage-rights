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

test("build a Land-Air 'Mech through the form and see its rules level, conversion parts and weight in the editor", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Hawk");
  await form.getByLabel("Rules level").selectOption("experimental");
  await form.getByLabel("Configuration").selectOption({ label: "Land-Air 'Mech" });
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk");
  await page.getByLabel("Rules level").selectOption("standard");
  const rules = page.getByRole("region", { name: "Rules check" });
  await expect(rules.getByText("Land-Air 'Mech (configuration) is Experimental level; this unit is built at Standard level. It needs Experimental or higher.")).toBeVisible();
  await expect(rules.getByText("Interstellar Operations: Alternate Eras (Catalyst Game Labs), p. 100")).toBeVisible();
  await expect(page.getByRole("list", { name: "Center Torso slots" }).getByText("Landing Gear")).toBeVisible();
  await expect(page.getByRole("list", { name: "Head slots" }).getByText("Avionics")).toBeVisible();
  // No armor yet: 5 structure, 5 conversion equipment, 8.5 engine, 2 gyro, 3 cockpit, 1.5 for three jump jets and 2 heat sinks.
  await expect(page.getByText("25 of 50 tons")).toBeVisible();
});

test("build an IndustrialMech through the form, set its configuration to a quad and reach its record sheet", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Hauler");
  await form.getByLabel("Type", { exact: true }).selectOption({ label: "IndustrialMech" });
  await expect(form.getByLabel("Configuration").locator("option")).toHaveText(["Biped", "Quad"]);
  await form.getByLabel("Configuration").selectOption({ label: "Quad" });
  await form.getByLabel("Tonnage").selectOption("10");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hauler");
  await expect(page.getByLabel("Type", { exact: true })).toHaveValue("industrialmech");
  await expect(page.getByLabel("Configuration")).toHaveValue("quad");
  // Built on its own frame and cockpit, so no part is reported; the weight is its own: 2 structure, 1 engine, 1 gyro and 3 cockpit.
  const rules = page.getByRole("region", { name: "Rules check" });
  await expect(rules.getByText(/is not allowed on an IndustrialMech/)).toHaveCount(0);
  await expect(rules.getByText("The parts weigh 7 tons of 10 tons; 3 tons is unused.")).toBeVisible();
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hauler record sheet");
  const sheet = page.getByRole("img", { name: "Hauler record sheet" });
  await expect(sheet.locator("text", { hasText: /^IndustrialMech record sheet$/ })).toBeVisible();
  await expect(sheet.locator("[data-diagram]")).toHaveCount(3);
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
  await form.getByLabel("Rules level").selectOption("advanced");
  await form.getByLabel("Configuration").selectOption({ label: "Tripod" });
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("list", { name: "Center Leg slots" })).toBeVisible();
  await page.getByLabel("Rules level").selectOption("standard");
  await expect(page.getByRole("region", { name: "Rules check" }).getByText("Interstellar Operations: Alternate Eras (Catalyst Game Labs), p. 158")).toBeVisible();
  await page.getByLabel("Rules level").selectOption("advanced");
  await page.getByRole("link", { name: "Record sheet" }).click();
  const sheet = page.getByRole("img", { name: /record sheet$/ });
  await expect(sheet.locator("[data-location='CL']")).toBeVisible();
  await expect(sheet.locator("[data-diagram]")).toHaveCount(3);
});

test("change the rules level in the editor and see the picker and the rules check change", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Strider");
  await form.getByLabel("Tonnage").selectOption("55");
  // The build form offers only the body types the level allows: no tripod at Standard.
  await expect(form.getByLabel("Configuration").getByRole("option", { name: "Tripod" })).toHaveCount(0);
  await form.getByLabel("Rules level").selectOption("advanced");
  await form.getByLabel("Configuration").selectOption({ label: "Tripod" });
  await form.getByRole("button", { name: "Start building" }).click();
  // The home page stays on screen until the editor has loaded: wait for the editor, or the level choice would go to the form.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Strider");
  const level = page.getByLabel("Rules level");
  await level.selectOption("introductory");
  await expect(level).toHaveValue("introductory");
  await expect(page.getByText("3025 technology only", { exact: false })).toBeVisible();
  const rules = page.getByRole("region", { name: "Rules check" });
  await expect(rules.getByText("Tripod (configuration) is Advanced level; this unit is built at Introductory level.", { exact: false })).toBeVisible();

  const items = async () => {
    await page.getByRole("button", { name: "Add equipment" }).click();
    const dialog = page.getByRole("dialog");
    const text = (await dialog.getByRole("status").textContent()) ?? "";
    await dialog.getByRole("button", { name: "Cancel" }).click();
    return Number(text.split(" ")[0]);
  };
  const introductory = await items();
  await level.selectOption("unlimited");
  await expect(page.getByText("Anything goes", { exact: false })).toBeVisible();
  expect(await items()).toBeGreaterThan(introductory);
  await expect(rules.getByText("Tripod (configuration) is Advanced level", { exact: false })).toHaveCount(0);

  // The selector is reachable and changes by keyboard.
  await level.focus();
  await page.keyboard.press("ArrowUp");
  await expect(level).toHaveValue("fan-made");
});

test("build a 50-ton biped, place a medium laser and see Battle Value and cost under the rules check change with the pilot", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Hammer");
  await form.getByLabel("Tonnage").selectOption("50");
  await form.getByRole("button", { name: "Start building" }).click();
  const rules = page.getByRole("region", { name: "Rules check" });
  const calc = page.getByRole("region", { name: "Battle Value and cost" });
  // The calculator sits directly beneath the rules check.
  const above = await rules.boundingBox();
  const below = await calc.boundingBox();
  expect(below?.y ?? 0).toBeGreaterThan((above?.y ?? 0) + (above?.height ?? 0) - 1);
  const bv = () => calc.getByTestId("bv-total");
  await expect(calc.getByTestId("cost-total")).toContainText("C-bills");
  const bare = await bv().innerText();

  await page.getByRole("button", { name: "Add equipment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search by name").fill("medium laser");
  await dialog.getByRole("button", { name: /^Medium Laser/ }).first().click();
  const tray = page.locator(".bt-tray");
  await tray.getByRole("button", { name: "Actions for Medium Laser" }).click();
  await tray.getByRole("button", { name: "Place Medium Laser", exact: true }).click();
  // By keyboard, as the first test does: in placing mode the long slot labels can run under the side column in Firefox.
  await page.getByRole("button", { name: "Place Medium Laser in Right Arm slot 5", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(bv()).not.toHaveText(bare);
  const armed = await bv().innerText();

  await calc.getByLabel("Gunnery").selectOption("2");
  await expect(bv()).not.toHaveText(armed);
  await calc.getByRole("button", { name: "Show Battle Value breakdown" }).click();
  await expect(calc.getByText("Defensive battle rating")).toBeVisible();
});

test("pick an era and a tech base in the editor and see the picker's groups and counts change and an item disappear", async ({ page }) => {
  // The findings panel beside the page grows with the errors a Clan unit of Inner Sphere parts has; a tall window keeps it clear of the buttons.
  await page.setViewportSize({ width: 1400, height: 1400 });
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Sorter");
  await form.getByLabel("Rules level").selectOption("experimental");
  await form.getByRole("button", { name: "Start building" }).click();
  await page.getByLabel("Year").fill("3067");
  await expect(page.getByLabel("Era")).toHaveValue("civil-war");

  const dialog = page.getByRole("dialog");
  const open = async (search = "") => {
    await page.getByRole("button", { name: "Add equipment" }).click();
    if (search !== "") await dialog.getByLabel("Search by name").fill(search);
  };
  const groups = async () => (await dialog.getByRole("heading", { level: 3 }).allTextContents()).map((t) => t.trim());
  const total = async () => Number(((await dialog.getByRole("status").textContent()) ?? "").split(" ")[0]);

  // Inner Sphere, Civil War: a Clan ER large laser is not offered, an Inner Sphere one is.
  await open("ER Large Laser");
  await expect(dialog.getByRole("button", { name: /^ER Large Laser Inner Sphere/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^ER Large Laser Clan/ })).toHaveCount(0);
  await dialog.getByLabel("Search by name").fill("");
  const isGroups = await groups();
  const isTotal = await total();
  expect(isGroups.some((g) => g.includes("Energy weapons"))).toBe(true);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);

  // Clan, same era: the Inner Sphere laser goes and the Clan one comes; the counts differ.
  await page.getByLabel("Tech base").selectOption("clan");
  await open("ER Large Laser");
  await expect(dialog.getByRole("button", { name: /^ER Large Laser Clan/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^ER Large Laser Inner Sphere/ })).toHaveCount(0);
  await dialog.getByLabel("Search by name").fill("");
  expect(await total()).not.toBe(isTotal);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);

  // An early era leaves out the groups that did not exist yet, and a closed group opens and closes by keyboard.
  await page.getByLabel("Tech base").selectOption("inner-sphere");
  await page.getByLabel("Era").selectOption("age-of-war");
  await expect(page.getByLabel("Year")).toHaveValue("");
  await open();
  const early = await total();
  expect(early).toBeLessThan(isTotal);
  const toggle = dialog.getByRole("button", { name: /^Energy weapons/ });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});
