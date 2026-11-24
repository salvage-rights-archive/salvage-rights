import { readFile } from "node:fs/promises";
import { DEV, FREE, expect, tabTo, test } from "./fixtures";

test.describe("dev edition", () => {
  test("the landing page shows one tile and its first game link opens that game's page", async ({ page }) => {
    await page.goto(`${DEV}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Archaeology for mecha tabletop games.");
    await expect(page.getByRole("heading", { name: "Your games" })).toBeVisible();
    const tile = page.getByTestId("family-tile");
    await expect(tile).toHaveCount(1);
    await tile.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/salvage-rights\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-/]+$/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(page).toHaveTitle(`${(await heading.textContent()) ?? ""} · Salvage Rights`);
  });

  test("hiding the family shows the all-hidden line and the choice survives a reload", async ({ page }) => {
    await page.goto(`${DEV}/settings`);
    // The first "Show ..." checkbox is the family's own.
    await page.getByRole("checkbox", { name: /^Show / }).first().uncheck();
    await page.getByRole("link", { name: "Games" }).click();
    await expect(page.getByText("You have hidden every game.")).toBeVisible();
    // Reload at once: a change just made must not be lost.
    await page.reload();
    await expect(page.getByText("You have hidden every game.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Choose games in Settings" })).toBeVisible();
  });

  test("a deep link keeps its query and hash", async ({ page }) => {
    await page.goto(`${DEV}/about?x=1#credits`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Salvage Rights");
    expect(new URL(page.url()).search).toBe("?x=1");
    expect(new URL(page.url()).hash).toBe("#credits");
  });

  test("an unknown path shows Nothing here", async ({ page }) => {
    await page.goto(`${DEV}/nope`);
    await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/salvage-rights/nope");
  });

  test("no page scrolls sideways at 320 px wide", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ["/", "/about", "/settings"]) {
      await page.goto(`${DEV}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll, `scroll width on ${path}`).toBe(widths.client);
    }
  });

  test("exported settings download and import back", async ({ page }, testInfo) => {
    await page.goto(`${DEV}/settings`);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export settings" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("salvage-rights-settings.json");
    const file = testInfo.outputPath("salvage-rights-settings.json");
    await download.saveAs(file);
    const parsed = JSON.parse(await readFile(file, "utf8")) as { app: string; namespace: string };
    expect(parsed.app).toBe("salvage-rights");
    expect(parsed.namespace).toBe("host");

    await page.getByLabel("Import settings").setInputFiles(file);
    await expect(page.getByText("Settings imported.")).toBeVisible();
  });

  test("Tab reaches every link in order and each shows a focus outline", async ({ page, browserName }) => {
    await page.goto(`${DEV}/`);
    await expect(page.getByTestId("family-tile")).toBeVisible();
    const gameLinks = page.getByTestId("family-tile").getByRole("link");
    const expected = ["Games", "About", "Settings"].map((name) => ({
      name,
      link: page.getByRole("link", { name, exact: true }),
    }));
    const gameCount = await gameLinks.count();
    expect(gameCount).toBeGreaterThan(0);
    for (let i = 0; i < gameCount; i += 1) expected.push({ name: `game link ${String(i + 1)}`, link: gameLinks.nth(i) });
    for (const { name, link } of expected) {
      await tabTo(page, browserName, link);
      await expect(link).toBeFocused();
      const focused = page.locator(":focus");
      // The header and the single tile's panel are dark, so their links use the header ring colour.
      const ring = await focused.evaluate(
        (element, token) => {
          const probe = document.createElement("span");
          probe.style.color = `var(${token})`;
          document.body.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          const style = getComputedStyle(element);
          return { expected, color: style.outlineColor, style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
        },
        "--sr-header-focus",
      );
      expect(ring.style, `outline style on ${name}`).not.toBe("none");
      expect(ring.width, `outline width on ${name}`).toBeGreaterThan(0);
      expect(ring.color, `outline colour on ${name}`).toBe(ring.expected);
    }
  });

  test("a tile that is one link shows the project's focus ring only while focused", async ({ page, browserName }) => {
    await page.goto(`${DEV}/settings`);
    // The family checkbox comes first, then one per game: hiding the last game leaves a tile with one link.
    await page.getByRole("checkbox").last().uncheck();
    await page.goto(`${DEV}/`);
    const tile = page.getByTestId("family-tile");
    await expect(tile).toBeVisible();
    await expect(tile).toHaveJSProperty("tagName", "A");
    const ringOf = () =>
      tile.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--sr-focus)";
        document.body.append(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        const after = getComputedStyle(element, "::after");
        return { expected, content: after.content, color: after.borderTopColor };
      });

    expect((await ringOf()).content).toBe("none");
    // Three header links come first, then the tile.
    await tabTo(page, browserName, tile, 4);
    await expect(tile).toBeFocused();
    const focused = await ringOf();
    expect(focused.content).not.toBe("none");
    expect(focused.color).toBe(focused.expected);
    await tile.blur();
    expect((await ringOf()).content).toBe("none");
  });
});

test.describe("free edition", () => {
  test("the landing page says nothing is ready and shows no tile", async ({ page }) => {
    await page.goto(`${FREE}/`);
    await expect(page.getByText("The first game is on its way. There is nothing to open yet.")).toBeVisible();
    await expect(page.getByTestId("family-tile")).toHaveCount(0);
  });
});
