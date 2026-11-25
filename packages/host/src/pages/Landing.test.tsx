import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, openStore, saveSettings } from "@salvage-rights/shared";
import type { FamilyManifest, Settings } from "@salvage-rights/shared";
import { SettingsProvider } from "../settings-context";
import { FIXTURE_ARTWORK, fixtureFamily, fixtureGame } from "../test-fixtures";
import { Landing } from "./Landing";

async function renderLanding(families: FamilyManifest[], settings: Partial<Settings> = {}) {
  const store = await openStore("host");
  await saveSettings(store, { ...DEFAULT_SETTINGS, ...settings });
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <Landing families={families} />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(cleanup);

describe("landing page", () => {
  it("with no ready game shows the options and the waiting line, and no tile", async () => {
    const waiting = fixtureFamily("waiting", { games: [fixtureGame("main", "Main", { ready: false })] });
    await renderLanding([waiting]);
    for (const name of ["Workshop", "Play", "Archive"]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
    expect(await screen.findByText("The first game is on its way. There is nothing to open yet.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Games" })).toBeTruthy();
    expect(screen.queryAllByTestId("family-tile")).toHaveLength(0);
  });

  it("lists a tile per shown family with its name, blurb and one link per ready game", async () => {
    const alpha = fixtureFamily("alpha", {
      games: [fixtureGame("one", "Alpha One"), fixtureGame("two", "Alpha Two"), fixtureGame("late", "Alpha Late", { ready: false })],
    });
    const beta = fixtureFamily("beta");
    await renderLanding([alpha, beta]);
    const tiles = await screen.findAllByTestId("family-tile");
    expect(tiles).toHaveLength(2);
    const tile = tiles[0] as HTMLElement;
    expect(within(tile).getByRole("heading", { name: "Family alpha" })).toBeTruthy();
    expect(within(tile).getByText("Blurb of alpha.")).toBeTruthy();
    const list = within(tile).getByRole("list", { name: "Family alpha" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Alpha One", "Alpha Two"]);
    expect(within(list).getByRole("link", { name: "Alpha One, Family alpha" })).toBe(links[0]);
    expect(links[0]?.getAttribute("href")).toBe("/alpha/one/play");
    expect(within(tile).queryByText("Alpha Late")).toBeNull();
    expect(screen.getByRole("heading", { name: "Choose your games" })).toBeTruthy();
  });

  it("makes the whole tile the link when a family lists one game", async () => {
    await renderLanding([fixtureFamily("alpha"), fixtureFamily("beta")]);
    const tiles = await screen.findAllByTestId("family-tile");
    const tile = tiles[0] as HTMLElement;
    expect(tile.tagName).toBe("A");
    expect(tile.getAttribute("href")).toBe("/alpha/main/play");
    expect(within(tile).getByRole("heading", { name: "Family alpha" })).toBeTruthy();
    // The name is the tile's own content, so it holds everything visible on it.
    expect(screen.getByRole("link", { name: /^Family alpha Blurb of alpha\./ })).toBe(tile);
  });

  it("shows a single tile large, with its artwork and credit", async () => {
    await renderLanding([fixtureFamily("alpha", { artwork: FIXTURE_ARTWORK })]);
    const tile = await screen.findByTestId("family-tile");
    expect(tile.getAttribute("data-size")).toBe("single");
    expect(within(tile).getByRole("img", { name: "A fixture picture" })).toBeTruthy();
    expect(within(tile).getByText(/Fixture Artist/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Your game" })).toBeTruthy();
    // The name starts with the family name, not the picture's text.
    expect(screen.getByRole("link", { name: /^Family alpha / })).toBe(tile);
  });

  it("drops the artwork and its credit when the picture fails to load", async () => {
    await renderLanding([fixtureFamily("alpha", { artwork: FIXTURE_ARTWORK })]);
    const tile = await screen.findByTestId("family-tile");
    fireEvent.error(within(tile).getByRole("img"));
    expect(within(tile).queryByRole("img")).toBeNull();
    expect(within(tile).queryByText(/Fixture Artist/)).toBeNull();
    expect(within(tile).getByRole("heading", { name: "Family alpha" })).toBeTruthy();
    expect(within(tile).getByText("Blurb of alpha.")).toBeTruthy();
    expect(tile.getAttribute("href")).toBe("/alpha/main/play");
  });

  it("shows a single tile without an img when the family has no artwork", async () => {
    await renderLanding([fixtureFamily("alpha")]);
    const tile = await screen.findByTestId("family-tile");
    expect(tile.getAttribute("data-size")).toBe("single");
    expect(tile.querySelector("img")).toBeNull();
  });

  it("points to Settings when every family is hidden", async () => {
    await renderLanding([fixtureFamily("alpha"), fixtureFamily("beta")], { hiddenFamilies: ["alpha", "beta"] });
    expect(await screen.findByText(/You have hidden every game\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Choose games in Settings" }).getAttribute("href")).toBe("/settings");
    expect(screen.queryAllByTestId("family-tile")).toHaveLength(0);
  });

  it("falls to the single layout when one of two families is hidden", async () => {
    await renderLanding([fixtureFamily("alpha"), fixtureFamily("beta")], { hiddenFamilies: ["alpha"] });
    expect(screen.queryAllByTestId("family-tile")).toHaveLength(0); // nothing flashes before the settings load
    await waitFor(() => {
      expect(screen.getAllByTestId("family-tile")).toHaveLength(1);
    });
    expect(screen.getByTestId("family-tile").getAttribute("data-size")).toBe("single");
  });
});
