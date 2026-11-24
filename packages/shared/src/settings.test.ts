import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, readSettings, saveSettings } from "./settings";
import { openStore } from "./store";

describe("readSettings", () => {
  it("gives defaults for junk", () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings("x")).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back on an unknown theme", () => {
    expect(readSettings({ theme: "retro" }).theme).toBe("device");
    expect(readSettings({ theme: "dark" }).theme).toBe("dark");
  });

  it("gives an empty list for non-array hidden lists", () => {
    const s = readSettings({ hiddenFamilies: "x", hiddenGames: 3 });
    expect(s.hiddenFamilies).toEqual([]);
    expect(s.hiddenGames).toEqual([]);
  });

  it("drops non-strings and duplicates, keeps unknown ids", () => {
    const s = readSettings({
      hiddenFamilies: ["a", 1, "a", null, "zzz"],
      hiddenGames: ["a/b", "a/b", {}],
    });
    expect(s.hiddenFamilies).toEqual(["a", "zzz"]);
    expect(s.hiddenGames).toEqual(["a/b"]);
  });

  it("does not share default arrays", () => {
    expect(readSettings({}).hiddenFamilies).not.toBe(DEFAULT_SETTINGS.hiddenFamilies);
  });
});

describe("settings storage", () => {
  it("round-trips", async () => {
    const store = await openStore("settings-test");
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    const next = { theme: "dark" as const, hiddenFamilies: ["f"], hiddenGames: ["f/g"] };
    await saveSettings(store, next);
    expect(await loadSettings(store)).toEqual(next);
  });
});
