import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { openStore, saveSettings, DEFAULT_SETTINGS } from "@salvage-rights/shared";
import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
import { App } from "./App";

function FixturePage() {
  return (
    <main>
      <h1>Fixture page</h1>
    </main>
  );
}

const playRoute: FamilyRoute = {
  path: "play",
  label: "Play",
  section: "play",
  load: () => Promise.resolve({ default: FixturePage }),
};

const testbed: FamilyManifest = {
  id: "testbed",
  name: "Testbed Family",
  blurb: "A made-up family for host tests.",
  accent: "rust",
  games: [
    { id: "ready", shortName: "Ready", fullName: "Testbed Ready", ready: true, routes: [playRoute] },
    { id: "pending", shortName: "Pending", fullName: "Testbed Pending", ready: false, routes: [playRoute] },
  ],
  unitTypes: [],
  eras: [],
  measures: ["inches"],
  routes: [],
  credits: { owner: "Fixture Owner Ltd", license: "Apache-2.0", notes: [] },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App families={[testbed]} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  document.body.className = "";
});

describe("host frame", () => {
  it("shows the site name and the three navigation links in the header", () => {
    renderAt("/");
    const header = screen.getByRole("banner");
    expect(within(header).getByText("SALVAGE RIGHTS")).toBeTruthy();
    const nav = within(header).getByRole("navigation", { name: "Site" });
    for (const name of ["Games", "About", "Settings"]) {
      expect(within(nav).getByRole("link", { name })).toBeTruthy();
    }
  });

  it("lists one credits block per family on the About page", () => {
    renderAt("/about");
    expect(screen.getByRole("heading", { name: "About Salvage Rights" })).toBeTruthy();
    const block = screen.getByRole("region", { name: "Credits: Testbed Family" });
    expect(within(block).getByText(/Fixture Owner Ltd/)).toBeTruthy();
    expect(screen.getAllByRole("region", { name: /^Credits:/ })).toHaveLength(1);
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

  it("puts the chosen theme on the body", async () => {
    const store = await openStore("host");
    await saveSettings(store, { ...DEFAULT_SETTINGS, theme: "dark" });
    renderAt("/");
    await screen.findByRole("heading", { name: "Salvage Rights" });
    await waitFor(() => {
      expect(document.body.classList.contains("dark")).toBe(true);
    });
  });
});
