import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { exportStore, openStore } from "@salvage-rights/shared";
import { isSample, newAcesCard } from "../../rules/aces-card";
import type { AcesCard, SupportCard } from "../../rules/aces-card";
import { acesSamples } from "../../rules/aces-samples";
import { emptyLibrary, fromLibraryFile, libraryOf, openAcesStorage, planLibraryImport, toLibraryFile } from "./storage";

// Cards invented for the tests; no printed card.

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const AT = "2026-01-01T00:00:00Z";
const card = (id: string, priority: number): AcesCard => ({ ...newAcesCard(id, AT), position: 2, movement: { priority }, combat: { priority: priority + 1 }, note: "my own words" });
const support: SupportCard = { schema: 1, kind: "aces-support", id: "s1", name: "Test Barrage", cost: 2, tn: 7, damage: 3, area: true, source: { kind: "entered", at: AT } };
const PNG = "data:image/png;base64,AAAA";

describe("Aces card storage", () => {
  it("saves each kind under its own prefix and lists an unreadable entry with its raw value instead of dropping it", async () => {
    const storage = await openAcesStorage();
    await storage.save(card("c1", 123));
    await storage.save(support);
    const store = await openStore("battletech");
    await store.set("aces-card:old", { record: { schema: 0, kind: "aces-card" }, savedAt: AT });
    expect((await store.keys()).sort()).toEqual(["aces-card:c1", "aces-card:old", "aces-support:s1"]);
    const entries = await storage.list();
    expect(entries.map((e) => `${e.kind}:${e.id}`).sort()).toEqual(["aces-card:c1", "aces-card:old", "aces-support:s1"]);
    expect(entries.find((e) => e.id === "old")?.unreadable).toMatch(/different version/);
    expect(await storage.raw("aces-card", "old")).toEqual({ record: { schema: 0, kind: "aces-card" }, savedAt: AT });
    expect((await storage.list(["aces-support"])).map((e) => e.record)).toEqual([support]);
    await expect(storage.save({ schema: 1 } as AcesCard)).rejects.toThrow();
  });

  it("round trips the library file, carries photos only when asked, and gives a plain message for a fault", () => {
    const lib = libraryOf([card("c1", 123), support]);
    const plain = toLibraryFile(lib);
    expect(plain.photos).toBeUndefined();
    expect(fromLibraryFile(JSON.parse(JSON.stringify(plain)))).toEqual({ ok: true, library: lib, photos: [] });
    const withPhoto = toLibraryFile(lib, [{ cardId: "c1", dataUrl: PNG }]);
    expect(fromLibraryFile(JSON.parse(JSON.stringify(withPhoto)))).toEqual({ ok: true, library: lib, photos: [{ cardId: "c1", dataUrl: PNG }] });
    const cases: [unknown, string][] = [
      [{ ...plain, kind: "as-force" }, "This file does not hold an Aces card library."],
      [{ ...plain, version: 2 }, "This file is from a version this app cannot read."],
      [{ ...plain, supports: [card("c9", 1)] }, "A card in this file is incomplete or damaged."],
      [{ ...plain, photos: [{ cardId: "c1", dataUrl: "http://example.invalid/a.png" }] }, "A picture in this file is damaged."],
    ];
    for (const [input, message] of cases) expect(fromLibraryFile(input)).toEqual({ ok: false, message });
  });

  it("adds the samples once, keeps them out of the library file and the backup, and removes them for good when asked", async () => {
    const storage = await openAcesStorage();
    await storage.save(card("c1", 123));
    await storage.addSamples();
    await storage.addSamples();
    const entries = await storage.list();
    const records = entries.flatMap((e) => (e.record ? [e.record] : []));
    expect(records.filter(isSample)).toHaveLength(acesSamples(AT).length);
    expect(records.filter((r) => !isSample(r)).map((r) => r.id)).toEqual(["c1"]);
    const file = toLibraryFile(libraryOf(records));
    expect([...file.cards, ...file.commands, ...file.orders, ...file.supports].map((r) => r.id)).toEqual(["c1"]);
    expect(Object.keys((await exportStore(await openStore("battletech"))).entries)).toEqual(["aces-card:c1"]);

    expect(await storage.samplesDeclined()).toBe(false);
    await storage.removeSamples();
    expect((await storage.list()).map((e) => e.id)).toEqual(["c1"]);
    expect(await storage.samplesDeclined()).toBe(true);
  });

  it("plans an import: new ids are added, the same card is left, and a changed card under the same id is asked about", () => {
    const have = { ...emptyLibrary(), cards: [card("c1", 123), card("c2", 200)], supports: [support] };
    const incoming = { ...emptyLibrary(), cards: [card("c1", 123), card("c2", 201), card("c3", 300)], supports: [{ ...support, id: "c1" }] };
    const plan = planLibraryImport(incoming, have);
    expect(plan.add.map((r) => `${r.kind}:${r.id}`)).toEqual(["aces-card:c3", "aces-support:c1"]);
    expect(plan.conflicts.map((r) => `${r.kind}:${r.id}`)).toEqual(["aces-card:c2"]);
  });
});
