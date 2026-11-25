import { readFile } from "node:fs/promises";
import { DEV, FREE, expect, tabTo, test } from "./fixtures";

test.describe("dev edition", () => {
  test("the landing page shows two tiles and the first link of the one with several games opens that game's page", async ({ page }) => {
    await page.goto(`${DEV}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Archaeology for mecha tabletop games.");
    await expect(page.getByRole("heading", { name: "Choose your games" })).toBeVisible();
    const tiles = page.getByTestId("family-tile");
    await expect(tiles).toHaveCount(2);
    for (const tile of await tiles.all()) await expect(tile).toHaveAttribute("data-size", "grid");
    // A tile with several games is a box holding one link per game; a tile with one game is itself the link.
    const several = page.locator("div[data-testid='family-tile']");
    await expect(several).toHaveCount(1);
    expect(await several.getByRole("link").count()).toBeGreaterThan(1);
    await several.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/salvage-rights\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-/]+$/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(page).toHaveTitle(`${(await heading.textContent()) ?? ""} · Salvage Rights`);
  });

  test("hiding the families one at a time reaches the single layout, then the all-hidden line, and survives a reload", async ({ page }) => {
    await page.goto(`${DEV}/settings`);
    // The "Show ..." checkboxes are the families' own, one each.
    const families = page.getByRole("checkbox", { name: /^Show / });
    await expect(families).toHaveCount(2);
    await families.first().uncheck();
    await page.getByRole("link", { name: "Games" }).click();
    await expect(page.getByTestId("family-tile")).toHaveCount(1);
    await expect(page.getByTestId("family-tile")).toHaveAttribute("data-size", "single");
    await page.getByRole("link", { name: "Settings" }).click();
    await families.last().uncheck();
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
    await expect(page.getByTestId("family-tile")).toHaveCount(2);
    // Every link in the page's own content, in document order: a tile that is one link, then the links inside the other.
    const contentLinks = page.getByRole("main").getByRole("link");
    const expected = ["Games", "About", "Settings"].map((name) => ({
      name,
      link: page.getByRole("link", { name, exact: true }),
      token: "--sr-header-focus",
    }));
    const contentCount = await contentLinks.count();
    expect(contentCount).toBeGreaterThan(2);
    for (let i = 0; i < contentCount; i += 1) {
      expected.push({ name: `content link ${String(i + 1)}`, link: contentLinks.nth(i), token: "--sr-focus" });
    }
    for (const { name, link, token } of expected) {
      await tabTo(page, browserName, link);
      await expect(link).toBeFocused();
      const ring = await page.locator(":focus").evaluate(
        (element, ringToken) => {
          const probe = document.createElement("span");
          probe.style.color = `var(${ringToken})`;
          document.body.append(probe);
          const expectedColor = getComputedStyle(probe).color;
          probe.remove();
          const style = getComputedStyle(element);
          // A link that is a whole tile draws its ring as an overlay inside the clipped edge instead of an outline.
          const after = getComputedStyle(element, "::after");
          const overlay = element.getAttribute("data-testid") === "family-tile";
          return {
            expectedColor,
            overlay,
            color: overlay ? after.borderTopColor : style.outlineColor,
            visible: overlay
              ? after.content !== "none" && parseFloat(after.borderTopWidth) > 0
              : style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
          };
        },
        token,
      );
      expect(ring.visible, `focus ring on ${name}`).toBe(true);
      expect(ring.color, `focus ring colour on ${name}`).toBe(ring.expectedColor);
    }
  });

  test("a tile that is one link shows the project's focus ring only while focused", async ({ page, browserName }) => {
    await page.goto(`${DEV}/`);
    // The tile whose family has one ready game is itself the one link.
    const tile = page.locator("a[data-testid='family-tile']");
    await expect(tile).toHaveCount(1);
    await expect(tile).toBeVisible();
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
  test("the landing page shows one tile, large, and its link opens the game's first page", async ({ page }) => {
    await page.goto(`${FREE}/`);
    const tile = page.getByTestId("family-tile");
    await expect(tile).toHaveCount(1);
    await expect(tile).toHaveAttribute("data-size", "single");
    await expect(page.getByText("The first game is on its way. There is nothing to open yet.")).toHaveCount(0);
    await page.getByRole("main").getByRole("link").first().click();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText("Nothing here");
  });
});
