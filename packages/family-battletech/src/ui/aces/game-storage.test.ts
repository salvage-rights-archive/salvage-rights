import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAcesGame } from "../../rules/aces-game";
import { newAsUnit } from "../../rules/as-unit";
import { openGameStorage } from "./game-storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("Aces game storage", () => {
  it("saves a game under aces-game: and gives it back whole, and lists an unreadable one with its raw value", async () => {
    const unit = { unitId: "u", name: "Invented", card: newAsUnit("u").card, skill: 4 };
    const game = newAcesGame({ id: "g1", name: "Test", seed: 1, at: "2026-01-01T00:00:00Z", player: { units: [unit] }, automated: { units: [unit] }, cards: [] });
    const storage = await openGameStorage();
    await storage.save(game);
    const store = await openStore("battletech");
    await store.set("aces-game:old", { game: { kind: "aces-game", schema: 0 }, savedAt: "2025-01-01T00:00:00Z" });
    expect((await store.keys()).sort()).toEqual(["aces-game:g1", "aces-game:old"]);
    expect((await storage.get("g1"))?.game).toEqual(game);
    const old = (await storage.list()).find((e) => e.id === "old");
    expect(old?.unreadable).toMatch(/different version/);
    expect(await storage.raw("old")).toBeDefined();
    await storage.remove("g1");
    expect(await storage.get("g1")).toBeUndefined();
    await expect(storage.save({ kind: "aces-game" } as never)).rejects.toThrow();
  });
});
