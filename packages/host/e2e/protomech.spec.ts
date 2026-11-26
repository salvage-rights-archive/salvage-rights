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
  await expectPage(page.getByLabel("Import a file")).toBeEnabled();
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
  await page.getByLabel("Walking MP").fill("5");
  await page.getByLabel("Jumping MP").fill("5");
  await page.getByLabel("Heat sinks").fill("2");
  await page.getByLabel("Head armor").fill("6");
  await page.getByLabel("Torso armor").fill("16");
  await page.getByRole("combobox", { name: "Add to Left Arm" }).selectOption({ label: "ER Micro Laser" });
  await page.getByRole("button", { name: "Add to Left Arm" }).click();
  await expect(page.getByRole("button", { name: "Remove ER Micro Laser from Left Arm" })).toBeVisible();
  await expect(page.getByTestId("pm-bv")).toContainText("Battle Value");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBe(widths.client);

  await page.getByRole("link", { name: "Record sheet" }).first().click();
  await expectPage(page.getByRole("heading", { level: 1, name: "ProtoMech record sheet" })).toBeVisible();
  await expect(page.getByRole("img", { name: /ProtoMech Point record sheet: Delphyne/ })).toBeVisible();
  await page.getByLabel("Add a ProtoMech to the Point").selectOption({ index: 1 });
  await expect(page.getByText("2. Delphyne")).toBeVisible();

  await page.goto(HOME);
  await expect(page.getByRole("link", { name: "Open Delphyne" })).toBeVisible();
});

test("the ProtoMech editor and sheet have no axe violations in either theme", async ({ page }) => {
  test.setTimeout(150_000);
  const editor = await startProto(page, "Scan Proto");
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
