import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { DEV, expect, expectPage, test } from "./fixtures";

const HOME = `${DEV}/battletech/classic/home`;

async function chooseTheme(page: Page, theme: "Light" | "Dark") {
  await page.goto(`${DEV}/settings`);
  await page.getByRole("radio", { name: theme }).check();
  await expect(page.locator("body")).toHaveClass(theme.toLowerCase());
}

/** Builds a bare ProtoMech from the Classic home (a Clan year at Standard rules) and returns the editor's path. */
async function startProto(page: Page, name: string): Promise<string> {
  await page.goto(HOME);
  await expectPage(page.getByLabel("Import a file", { exact: true })).toBeEnabled();
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Year").fill("3070");
  const era = form.getByLabel("Era");
  if ((await era.count()) > 0 && (await era.first().evaluate((el) => el.tagName)) === "SELECT") await era.first().selectOption({ index: 1 });
  await form.getByLabel("Type").selectOption({ label: "ProtoMech" });
  await form.getByLabel("Tonnage").selectOption("9");
  await form.getByRole("button", { name: "Start building" }).click();
  await expectPage(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = new URL(page.url());
  return `${url.pathname.replace(/^\/salvage-rights/, "")}${url.search}`;
}

test("build a ProtoMech at 320 px, save it, and open the Point sheet", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await startProto(page, "Delphyne");
  await page.getByLabel("Walking MP", { exact: true }).fill("5");
  await page.getByLabel("Jumping MP", { exact: true }).fill("5");
  await page.getByLabel("Heat sinks", { exact: true }).fill("2");
  await page.getByLabel("Head armor", { exact: true }).fill("6");
  await page.getByLabel("Torso armor", { exact: true }).fill("16");
  await page.getByRole("combobox", { name: "Add to Left Arm" }).selectOption({ label: "ER Micro Laser" });
  await page.getByRole("button", { name: "Add to Left Arm" }).click();
  await expect(page.getByRole("button", { name: "Remove ER Micro Laser from Left Arm" })).toBeVisible();
  await expect(page.getByTestId("pm-bv")).toContainText("Battle Value");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  // Every control is at least 44 px tall (the bare checkbox labels and the diagram's buttons included).
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button, label.pm-check, svg [role=button]").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? (await control.getAttribute("aria-label")) ?? "").toBeGreaterThanOrEqual(43.5);
  }

  await page.getByRole("link", { name: "Record sheet" }).first().click();
  await expectPage(page.getByRole("heading", { level: 1, name: "ProtoMech record sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: /ProtoMech Point record sheet: Delphyne/ })).toBeVisible();
  await page.getByLabel("Add a ProtoMech to the Point").selectOption({ index: 1 });
  await expect(page.getByRole("button", { name: /Remove Delphyne \(2\)/ })).toBeVisible();

  await page.goto(HOME);
  await expectPage(page.getByRole("link", { name: "Open Delphyne" })).toBeVisible();
});

test("the ProtoMech editor and sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await startProto(page, "Scan Proto");
  await page.getByLabel("Walking MP", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const id = new URL(page.url()).searchParams.get("id") ?? "";
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [editor, `/battletech/classic/protomech-sheet?id=${id}`]) {
      await page.goto(`${DEV}${path}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
  }
});

test("the ProtoMech part options appear with the rules level and year, and show on the sheet and the saved list", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 700 });
  const editor = await startProto(page, "Optioned");
  await page.getByLabel("Year", { exact: true }).fill("3080");
  // Standard rules: the extended jump jets are on offer, the Experimental parts are hidden.
  await expect(page.getByLabel("Jump system")).toBeVisible();
  await expect(page.getByLabel("Jump system").locator("option")).toHaveCount(2);
  await expect(page.getByLabel("Cockpit", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Armor type")).toHaveCount(0);
  await page.getByLabel("Rules level").selectOption("experimental");
  await expect(page.getByLabel("Cockpit", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Armor type")).toBeVisible();
  await expect(page.getByLabel("Partial wing")).toBeVisible();
  await page.getByLabel("Cockpit", { exact: true }).selectOption({ label: "Inner Sphere ProtoMech interface cockpit" });
  await page.getByLabel("Armor type").selectOption({ label: "Electric Discharge ProtoMech (EDP) armor" });
  await page.getByLabel("Jump system").selectOption({ label: "Extended jump jets (XJJ)" });
  await page.getByLabel("Walking MP", { exact: true }).fill("4");
  await page.getByLabel("Jumping MP", { exact: true }).fill("6");
  await page.getByLabel("Torso armor", { exact: true }).fill("10");
  await page.getByText("How it adds up").click();
  await expect(page.getByText("Extended jump jets (XJJ): 1200 kg")).toBeVisible();
  await expect(page.getByText("Electric Discharge ProtoMech (EDP) armor: 750 kg")).toBeVisible();
  // Hide, do not mark: back to Standard rules the chosen options stay listed and the rules check reports them.
  await page.getByLabel("Rules level").selectOption("standard");
  await expect(page.getByLabel("Armor type")).toBeVisible();
  await expect(page.getByText(/needs Experimental rules/).first()).toBeVisible();
  await page.getByLabel("Rules level").selectOption("experimental");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button, label.pm-check").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? (await control.getAttribute("aria-label")) ?? "").toBeGreaterThanOrEqual(43.5);
  }
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    await page.goto(`${DEV}${editor}`);
    await expectPage(page.getByRole("heading", { level: 1, name: "Optioned" })).toBeVisible();
    await expect(page.getByLabel("Armor type")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme} theme`).toEqual([]);
  }
  await page.getByRole("link", { name: "Record sheet" }).first().click();
  await expect(page.getByRole("heading", { name: "ProtoMech record sheet" })).toBeVisible();
  await expect(page.getByText("Options", { exact: true }).first()).toBeAttached();
  await expect(page.getByText(/Inner Sphere ProtoMech interface cockpit, Electric Discharge ProtoMech \(EDP\) armor, Extended jump jets \(XJJ\)/).first()).toBeAttached();
  await page.goto(HOME);
  await expectPage(page.getByText(/Extended jump jets \(XJJ\)/).first()).toBeVisible();
});

test("an Ultraheavy glider ProtoMech: offered at Advanced rules in its years, built on WiGE Cruising MP, with no jump jets, by keyboard, at 320 px and in both themes", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 320, height: 700 });
  const editor = await startProto(page, "Soarer");
  await page.getByLabel("Year", { exact: true }).fill("3090");
  // Standard rules: no quad, glider or Ultraheavy weight is on offer (hide, do not mark).
  await expect(page.getByLabel("Chassis")).toHaveCount(0);
  await expect(page.getByLabel("Tons", { exact: true }).locator("option")).toHaveCount(8);
  await page.getByLabel("Rules level").selectOption("advanced");
  await expect(page.getByLabel("Tons", { exact: true }).locator("option")).toHaveCount(14);
  await page.getByLabel("Tons", { exact: true }).selectOption("12");
  await expect(page.getByText(/From 10 tons a ProtoMech is Ultraheavy/)).toBeVisible();
  // The chassis is chosen from the keyboard: Biped, Quad, Glider.
  await page.getByLabel("Chassis").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Chassis")).toHaveValue("glider");
  // A glider is built on WiGE Cruising MP and has no jump jets, wing or booster.
  await expect(page.getByLabel("WiGE Cruising MP", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Jumping MP", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Myomer Booster")).toHaveCount(0);
  await page.getByLabel("WiGE Cruising MP", { exact: true }).fill("4");
  await expect(page.getByText("WiGE Flanking MP 6.")).toBeVisible();
  await expect(page.getByText(/Engine rating 50/)).toBeVisible();
  await expect(page.getByText(/each arm 1 item of 1,000 kg at most/)).toBeVisible();
  await page.getByLabel("Torso armor", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);
  for (const control of await page.locator("button, select, input:not([type=file]):not([type=checkbox]), a.bt-button, label.pm-check, svg [role=button]").all()) {
    const box = await control.boundingBox();
    if (box) expect(box.height, (await control.textContent())?.slice(0, 30) ?? (await control.getAttribute("aria-label")) ?? "").toBeGreaterThanOrEqual(43.5);
  }
  const id = new URL(page.url()).searchParams.get("id") ?? "";
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(page, theme);
    for (const path of [editor, `/battletech/classic/protomech-sheet?id=${id}`]) {
      await page.goto(`${DEV}${path}`);
      await expectPage(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme, ${path}`).toEqual([]);
    }
  }
  await expect(page.getByText("WiGE Flanking MP").first()).toBeAttached();
  await page.goto(HOME);
  await expectPage(page.getByText(/Glider, Ultraheavy ProtoMech/).first()).toBeVisible();
});
