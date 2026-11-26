import { CLASSIC, DEV, expect, test } from "./fixtures";

// One test per selector on the Classic pages: change it and see what the player sees change. Then one Omni walk-through.
const HOME = `${DEV}${CLASSIC}/home`;

test("edition: a unit built under the Core Rulebook cites that play book in the editor and on its sheet", async ({ page }) => {
  await page.goto(HOME);
  await page.getByLabel("Edition").selectOption("bcr-tm");
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Edition Walker");
  await form.getByLabel("Year").fill("3060");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByText("Built under: Core Rulebook (BCR) / TechManual")).toBeVisible();
  await expect(page.getByRole("region", { name: "Battle Value and cost" })).toContainText("movement heat p. 102");
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("img", { name: "Edition Walker record sheet" })).toContainText("Rules edition: Core Rulebook (BCR) / TechManual");
});

test("year and era: a year in the new-unit form hides types that did not exist, and the editor's era changes what the picker offers", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Rules level").selectOption("experimental");
  const types = form.getByLabel("Type", { exact: true }).locator("option");
  await form.getByLabel("Year").fill("3070");
  await expect(types.filter({ hasText: "OmniMech" })).toHaveCount(1);
  await form.getByLabel("Year").fill("3025");
  await expect(types.filter({ hasText: "OmniMech" })).toHaveCount(0);
  // The Clan tech base exists from 2800 (IO:AE p. 17): a typed year before that drops it from the list and from a choice already made.
  await form.getByLabel("Tech base").selectOption("clan");
  await form.getByLabel("Year").fill("2700");
  await expect(form.getByLabel("Tech base")).toHaveValue("inner-sphere");
  await expect(form.getByLabel("Tech base").locator("option[value=clan]")).toHaveCount(0);
  await form.getByLabel("Year").fill("3025");
  await form.getByLabel("Name").fill("Era Walker");
  await form.getByLabel("Era").selectOption("late-succession-war-renaissance"); // 3025 is in two eras (an Inner Sphere one and a Clan sub-era): the pick decides the tech base
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByLabel("Year")).toHaveValue("3025");
  await expect(page.getByLabel("Era")).toHaveValue("late-succession-war-renaissance");

  const picker = async () => {
    await page.getByRole("button", { name: "Add equipment" }).click();
    const dialog = page.getByRole("dialog");
    const total = (await dialog.getByRole("status").textContent()) ?? "";
    await dialog.getByRole("button", { name: "Cancel" }).click();
    return total;
  };
  const before = await picker();
  await page.getByLabel("Year").fill(""); // with no year the era is a free choice again
  await page.getByLabel("Era").selectOption("age-of-war");
  expect(await picker()).not.toBe(before);
});

test("tech base: Clan swaps the equipment offered and the parts lists", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Base Walker");
  await form.getByLabel("Rules level").selectOption("advanced");
  await expect(form.getByLabel("Tech base").locator("option")).toHaveText(["Inner Sphere", "Clan", "Mixed"]);
  await form.getByLabel("Year").fill("3060");
  await form.getByRole("button", { name: "Start building" }).click();
  const engines = page.getByLabel("Engine type").locator("option");
  const isEngines = await engines.count();
  await page.getByLabel("Tech base").selectOption("clan");
  expect(await engines.count()).not.toBe(isEngines);
  await page.getByRole("button", { name: "Add equipment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search by name").fill("ER Medium Laser");
  await expect(dialog.getByRole("button", { name: /^ER Medium Laser Clan/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^ER Medium Laser Inner Sphere/ })).toHaveCount(0);
});

test("rules level: Introductory hides Clan and advanced parts, and the check names what a level cannot hold", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Level Walker");
  await form.getByLabel("Rules level").selectOption("experimental");
  await form.getByLabel("Year").fill("3060");
  await form.getByRole("button", { name: "Start building" }).click();
  const armor = page.getByLabel("Armor type").locator("option");
  await expect.poll(() => armor.count()).toBeGreaterThan(1);
  const all = await armor.count();
  await page.getByLabel("Rules level").selectOption("introductory");
  await expect(page.getByLabel("Tech base").locator("option")).toHaveText(["Inner Sphere"]);
  await expect(armor).toHaveCount(1);
  expect(all).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Add equipment" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("at Introductory level or below");
});

test("OmniMech: build one, add A, switch between configurations, print each sheet and find A again from the home page", async ({ page }) => {
  await page.goto(HOME);
  const form = page.getByRole("form", { name: "Build a new one" });
  await form.getByLabel("Name").fill("Hawk");
  await form.getByLabel("Type", { exact: true }).selectOption({ label: "OmniMech" });
  await form.getByLabel("Tech base").selectOption("clan");
  await form.getByLabel("Year").fill("3060");
  await form.getByRole("button", { name: "Start building" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk Prime");
  const tabs = page.getByRole("tablist", { name: "Base and configurations" });
  await expect(tabs.getByRole("tab")).toHaveText(["Base", "Prime (Primary)"]);
  await expect(page.getByText("Pods use 0 of")).toBeVisible();
  await page.getByRole("button", { name: "Add configuration" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk A (copy)");
  await tabs.getByRole("tab", { name: "Prime (Primary)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk Prime");
  await tabs.getByRole("tab", { name: "A (copy)" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.getByRole("link", { name: "Record sheet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk A (copy) record sheet");
  await page.getByRole("link", { name: "Prime", exact: false }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk Prime record sheet");

  await page.goto(HOME);
  await page.getByRole("button", { name: "Configurations of Hawk" }).click();
  await page.getByRole("link", { name: "Open Hawk A (copy)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hawk A (copy)");
});
