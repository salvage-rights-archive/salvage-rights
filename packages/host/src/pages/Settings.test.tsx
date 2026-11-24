import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, openStore, saveSettings } from "@salvage-rights/shared";
import type { FamilyManifest, Settings } from "@salvage-rights/shared";
import { SettingsProvider, useSettings } from "../settings-context";
import { fixtureFamily, fixtureGame } from "../test-fixtures";
import { SettingsPage } from "./Settings";

const control = vi.hoisted(() => ({ failSaves: false }));

vi.mock("@salvage-rights/shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("@salvage-rights/shared")>();
  return {
    ...original,
    saveSettings: (...args: Parameters<typeof original.saveSettings>) =>
      control.failSaves ? Promise.reject(new Error("disk full")) : original.saveSettings(...args),
  };
});

async function renderSettings(families: FamilyManifest[], settings: Partial<Settings> = {}) {
  const store = await openStore("host");
  await saveSettings(store, { ...DEFAULT_SETTINGS, ...settings });
  render(
    <SettingsProvider>
      <SettingsPage families={families} />
    </SettingsProvider>,
  );
  await screen.findByRole("group", { name: "Theme" });
}

async function storedSettings(): Promise<Settings> {
  return loadSettings(await openStore("host"));
}

const alpha = fixtureFamily("alpha", {
  games: [fixtureGame("one", "Alpha One"), fixtureGame("two", "Alpha Two"), fixtureGame("late", "Alpha Late", { ready: false })],
});
const beta = fixtureFamily("beta");

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  control.failSaves = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("settings page", () => {
  it("chooses the theme", async () => {
    await renderSettings([beta]);
    const theme = screen.getByRole("group", { name: "Theme" });
    expect(within(theme).getAllByRole("radio").map((radio) => radio.parentElement?.textContent)).toEqual([
      "Follow this device",
      "Light",
      "Dark",
    ]);
    await userEvent.click(within(theme).getByRole("radio", { name: "Dark" }));
    await waitFor(async () => {
      expect((await storedSettings()).theme).toBe("dark");
    });
  });

  it("lists a checkbox per family with a ready game, and per ready game when a family has several", async () => {
    const waiting = fixtureFamily("waiting", { games: [fixtureGame("main", "Main", { ready: false })] });
    await renderSettings([alpha, beta, waiting], { hiddenFamilies: ["alpha"], hiddenGames: ["alpha/two"] });
    const games = screen.getByRole("group", { name: "Show these games" });
    expect(within(games).getAllByRole("checkbox").map((box) => box.parentElement?.textContent)).toEqual([
      "Show Family alpha",
      "Alpha One",
      "Alpha Two",
      "Show Family beta",
    ]);
    // Games of a hidden family are unticked and disabled, and their stored state is kept.
    for (const name of ["Alpha One", "Alpha Two"]) {
      const box = within(games).getByRole("checkbox", { name }) as HTMLInputElement;
      expect(box.disabled).toBe(true);
      expect(box.checked).toBe(false);
    }
    expect((await storedSettings()).hiddenGames).toEqual(["alpha/two"]);
  });

  it("hides and shows families and games, leaving ids it does not know alone", async () => {
    await renderSettings([alpha, beta], { hiddenFamilies: ["gone"], hiddenGames: ["gone/game"] });
    const games = screen.getByRole("group", { name: "Show these games" });
    await userEvent.click(within(games).getByRole("checkbox", { name: "Show Family beta" }));
    await userEvent.click(within(games).getByRole("checkbox", { name: "Alpha Two" }));
    await waitFor(async () => {
      expect(await storedSettings()).toMatchObject({
        hiddenFamilies: ["gone", "beta"],
        hiddenGames: ["gone/game", "alpha/two"],
      });
    });
    await userEvent.click(within(games).getByRole("checkbox", { name: "Show Family beta" }));
    await userEvent.click(within(games).getByRole("checkbox", { name: "Alpha Two" }));
    await waitFor(async () => {
      expect(await storedSettings()).toMatchObject({ hiddenFamilies: ["gone"], hiddenGames: ["gone/game"] });
    });
  });

  it("replaces the choices with a line when no family has a ready game", async () => {
    await renderSettings([fixtureFamily("waiting", { games: [fixtureGame("main", "Main", { ready: false })] })]);
    expect(screen.getByText("There are no games to choose from yet.")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Show these games" })).toBeNull();
  });

  it("says so when the browser is not letting us save", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await renderSettings([beta]);
    expect(
      screen.getByText("This browser is not letting us save. Your choices last until you close this tab."),
    ).toBeTruthy();
  });

  it("says so when a change could not be saved", async () => {
    await renderSettings([beta]);
    control.failSaves = true;
    await userEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(await screen.findByText("We could not save that change. It will last until you close this tab.")).toBeTruthy();
  });

  it("explains that hiding deletes nothing", async () => {
    await renderSettings([beta]);
    expect(screen.getByText("Hiding a game hides its tile and its menus. Nothing you built is deleted.")).toBeTruthy();
  });

  it("imports only the settings of a host file and shows them", async () => {
    await renderSettings([alpha, beta]);
    const file = {
      app: "salvage-rights",
      version: 1,
      namespace: "host",
      exportedAt: "",
      entries: { settings: { theme: "dark", hiddenFamilies: ["beta"], hiddenGames: [] }, other: 1 },
    };
    await userEvent.upload(
      screen.getByLabelText("Import settings"),
      new File([JSON.stringify(file)], "settings.json", { type: "application/json" }),
    );
    expect((await screen.findByRole("status", { name: "Import result" })).textContent).toBe("Settings imported.");
    expect((screen.getByRole("radio", { name: "Dark" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Show Family beta" }) as HTMLInputElement).checked).toBe(false);
    await waitFor(async () => {
      expect(await storedSettings()).toMatchObject({ theme: "dark", hiddenFamilies: ["beta"] });
    });
  });

  it("exports the settings even when none were ever changed", async () => {
    let exported: unknown;
    function Probe() {
      const { exportSettings, loaded } = useSettings();
      if (loaded && exported === undefined) void exportSettings().then((file) => (exported = file));
      return null;
    }
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => {
      expect(exported).toMatchObject({ namespace: "host", entries: { settings: DEFAULT_SETTINGS } });
    });
  });

  it("refuses a file for another namespace and changes nothing", async () => {
    await renderSettings([beta], { theme: "light" });
    const other = { app: "salvage-rights", version: 1, namespace: "elsewhere", exportedAt: "", entries: {} };
    await userEvent.upload(
      screen.getByLabelText("Import settings"),
      new File([JSON.stringify(other)], "other.json", { type: "application/json" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain("different namespace");
    expect(screen.getByRole("status", { name: "Import result" }).textContent).toBe("");
    expect((screen.getByRole("radio", { name: "Light" }) as HTMLInputElement).checked).toBe(true);
    expect(await storedSettings()).toMatchObject({ theme: "light" });
  });
});
