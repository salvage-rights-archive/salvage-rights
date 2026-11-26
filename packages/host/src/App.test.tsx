import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openStore, saveSettings, DEFAULT_SETTINGS } from "@salvage-rights/shared";
import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
import { App } from "./App";
import { loadPage } from "./pages/FamilyRoutePage";

function FixturePage() {
  return <h1>Fixture page</h1>;
}

function BrokenPage(): never {
  throw new Error("fixture failure");
}

const playRoute: FamilyRoute = {
  path: "play",
  label: "Play",
  section: "play",
  load: () => Promise.resolve({ default: FixturePage }),
};

const brokenRoute: FamilyRoute = { ...playRoute, path: "broken", load: () => Promise.resolve({ default: BrokenPage }) };

const slowRoute: FamilyRoute = { ...playRoute, path: "slow", load: () => new Promise(() => undefined) };

const testbed: FamilyManifest = {
  id: "testbed",
  name: "Testbed Family",
  blurb: "A made-up family for host tests.",
  accent: "rust",
  games: [
    { id: "ready", shortName: "Ready", fullName: "Testbed Ready", ready: true, routes: [playRoute, brokenRoute, slowRoute] },
    { id: "pending", shortName: "Pending", fullName: "Testbed Pending", ready: false, routes: [playRoute] },
  ],
  unitTypes: [],
  eras: [],
  measures: ["inches"],
  routes: [],
  credits: { owner: "Fixture Owner Ltd", license: "Apache-2.0", notes: [] },
};

function renderAt(path: string) {
  // The same shape main.tsx runs: a data router with one catch-all route holding the app.
  const router = createMemoryRouter([{ path: "*", element: <App families={[testbed]} editionId="testbed-edition" /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  cleanup();
  document.title = "";
  document.body.className = "";
});

describe("host frame", () => {
  it("shows the site name as a link back to the games, and the three navigation links in the header", () => {
    renderAt("/about");
    const header = screen.getByRole("banner");
    const name = within(header).getByRole("link", { name: "Salvage Rights, back to Games" });
    expect(name.textContent).toBe("SALVAGE RIGHTS");
    expect(name.getAttribute("href")).toBe("/");
    const nav = within(header).getByRole("navigation", { name: "Site" });
    for (const name of ["Games", "About", "Settings"]) {
      expect(within(nav).getByRole("link", { name })).toBeTruthy();
    }
  });

  it("lists one credits block per family on the About page", () => {
    renderAt("/about");
    expect(screen.getByRole("heading", { name: "About Salvage Rights" })).toBeTruthy();
    const block = screen.getByRole("region", { name: "Testbed Family" });
    expect(within(block).getByText(/Fixture Owner Ltd/)).toBeTruthy();
    const credits = screen.getByRole("region", { name: "Credits" });
    expect(credits.id).toBe("credits");
    expect(within(credits).getAllByRole("region")).toHaveLength(1);
  });

  it("shows the edition id on the About page", () => {
    renderAt("/about");
    expect(screen.getByText("Edition: testbed-edition")).toBeTruthy();
    const source = screen.getByRole("region", { name: "Source code and licenses" });
    expect(within(source).getByRole("link", { name: /github\.com\/salvage-rights-archive\/salvage-rights/ })).toBeTruthy();
    expect(within(source).getByRole("link", { name: "Third-party notices" }).getAttribute("href")).toMatch(
      /third-party-notices\.txt$/,
    );
  });

  it("shows the not-found page with a link to the landing page for an unknown path", () => {
    renderAt("/no/such/page");
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the landing page" }).getAttribute("href")).toBe("/");
  });

  it("renders the page of a ready game's route", async () => {
    renderAt("/testbed/ready/play");
    expect(await screen.findByRole("heading", { name: "Fixture page" })).toBeTruthy();
  });

  it("shows the not-found page for a game that is not ready", () => {
    renderAt("/testbed/pending/play");
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
  });

  it("shows the not-found page for a family that is not in the edition", () => {
    renderAt("/elsewhere/ready/play");
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
  });

  it("reloads the tab once when a page's code cannot be fetched, and lets a second failure show", async () => {
    sessionStorage.clear();
    const gone = () => Promise.reject(new Error("Failed to fetch dynamically imported module"));
    const reload = vi.fn();
    void loadPage(gone, reload);
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });
    await expect(loadPage(gone, reload)).rejects.toThrow("Failed to fetch");
    expect(reload).toHaveBeenCalledTimes(1);
    // A load that works clears the mark, so a later update gets its one reload again.
    const page = { default: () => null };
    await expect(loadPage(() => Promise.resolve(page), reload)).resolves.toBe(page);
    void loadPage(gone, reload);
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(2);
    });
  });

  it("shows a way back when a family page throws", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderAt("/testbed/ready/broken");
    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the landing page" }).getAttribute("href")).toBe("/");
    quiet.mockRestore();
  });

  it("announces a page that is still loading as a status", () => {
    renderAt("/testbed/ready/slow");
    expect(screen.getByRole("status").textContent).toBe("Loading…");
  });

  it("moves focus to the heading and sets the title when navigating", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("link", { name: "About" }));
    const heading = await screen.findByRole("heading", { name: "About Salvage Rights" });
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
    expect(document.title).toBe("About Salvage Rights · Salvage Rights");
  });

  it("puts the chosen theme on the body", async () => {
    const store = await openStore("host");
    await saveSettings(store, { ...DEFAULT_SETTINGS, theme: "dark" });
    renderAt("/");
    await screen.findByRole("heading", { name: "Battlefield recovery and salvage for mecha tabletop games." });
    await waitFor(() => {
      expect(document.body.classList.contains("dark")).toBe(true);
    });
  });
});
