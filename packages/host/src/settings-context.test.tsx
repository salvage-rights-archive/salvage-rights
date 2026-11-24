import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, openStore, saveSettings } from "@salvage-rights/shared";
import type { Settings } from "@salvage-rights/shared";
import { SettingsProvider, useSettings } from "./settings-context";

const NOTE_KEY = "salvage-rights:host:pending-settings";
const control = vi.hoisted(() => ({ failSaves: false }));

vi.mock("@salvage-rights/shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("@salvage-rights/shared")>();
  return {
    ...original,
    saveSettings: (...args: Parameters<typeof original.saveSettings>) =>
      control.failSaves ? Promise.reject(new Error("disk full")) : original.saveSettings(...args),
  };
});

function Probe() {
  const { settings, update, loaded } = useSettings();
  return (
    <div>
      <p>{loaded ? `theme ${settings.theme}` : "loading"}</p>
      <button type="button" onClick={() => update({ ...settings, theme: "light" })}>
        Choose light
      </button>
    </div>
  );
}

async function storedSettings(): Promise<Settings> {
  return loadSettings(await openStore("host"));
}

function readNote(): { settings: Settings; at: number } | null {
  const raw = localStorage.getItem(NOTE_KEY);
  return raw === null ? null : (JSON.parse(raw) as { settings: Settings; at: number });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  control.failSaves = false;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("pending settings note", () => {
  it("applies a note left by a cut-off save over the stored value, saves it and clears the note", async () => {
    await saveSettings(await openStore("host"), { ...DEFAULT_SETTINGS, theme: "dark" });
    localStorage.setItem(NOTE_KEY, JSON.stringify({ settings: { ...DEFAULT_SETTINGS, theme: "light" }, at: 1 }));
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    expect(await screen.findByText("theme light")).toBeTruthy();
    await waitFor(async () => {
      expect((await storedSettings()).theme).toBe("light");
    });
    await waitFor(() => {
      expect(localStorage.getItem(NOTE_KEY)).toBeNull();
    });
  });

  it("stays when the store is only memory, and a fresh start-up applies it", async () => {
    vi.stubGlobal("indexedDB", undefined);
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await screen.findByText("theme device");
    await userEvent.click(screen.getByRole("button", { name: "Choose light" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(readNote()?.settings.theme).toBe("light");

    cleanup();
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    expect(await screen.findByText("theme light")).toBeTruthy();
  });

  it("is gone after a save that succeeds and stays, holding the new settings, after one that fails", async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await screen.findByText("theme device");
    await userEvent.click(screen.getByRole("button", { name: "Choose light" }));
    await waitFor(async () => {
      expect((await storedSettings()).theme).toBe("light");
    });
    await waitFor(() => {
      expect(localStorage.getItem(NOTE_KEY)).toBeNull();
    });

    cleanup();
    localStorage.clear();
    globalThis.indexedDB = new IDBFactory();
    control.failSaves = true;
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await screen.findByText("theme device");
    await userEvent.click(screen.getByRole("button", { name: "Choose light" }));
    await waitFor(() => {
      expect(readNote()?.settings.theme).toBe("light");
    });
    // Give the failed save time to settle; the note must still be there.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(readNote()?.settings.theme).toBe("light");
  });
});
