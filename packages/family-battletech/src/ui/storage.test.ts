import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { bipedRecord } from "../rules/fixtures";
import { fromMechFile, isMechRecord, openFamilyStorage, toMechFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("family storage", () => {
  it("saves, lists newest first with a savedAt, and removes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const storage = await openFamilyStorage();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      await storage.save(bipedRecord({ id: "old" }));
      vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
      await storage.save(bipedRecord({ id: "new" }));
      const list = await storage.list();
      expect(list.map((e) => e.id)).toEqual(["new", "old"]);
      expect(list[0]?.savedAt).toBe("2026-02-01T00:00:00.000Z");
      expect(list[0]?.record?.id).toBe("new");
      await storage.remove("new");
      expect((await storage.list()).map((e) => e.id)).toEqual(["old"]);
      expect(await storage.get("new")).toBeUndefined();
      await storage.save(bipedRecord({ id: "old" }));
      expect((await storage.list()).map((e) => e.id)).toEqual(["old"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists an entry that is not a record as unreadable, and the others still list", async () => {
    const storage = await openFamilyStorage();
    const raw = await openStore("battletech");
    await storage.save(bipedRecord({ id: "good" }));
    await raw.set("mech:bad-schema", { record: { ...bipedRecord(), schema: 2 }, savedAt: "2026-01-01T00:00:00Z" });
    await raw.set("mech:text", "just a string");
    const list = await storage.list();
    expect(list.map((e) => e.id).sort()).toEqual(["bad-schema", "good", "text"]);
    for (const id of ["bad-schema", "text"]) {
      const entry = list.find((e) => e.id === id);
      expect(entry?.record).toBeUndefined();
      expect(entry?.unreadable).toMatch(/\S/);
    }
    expect(list.find((e) => e.id === "good")?.record).toBeDefined();
  });

  it("keeps the key trimmed, refuses an empty one, clears it, and defaults the edition", async () => {
    const storage = await openFamilyStorage();
    expect(await storage.getKey()).toBeUndefined();
    await storage.setKey("  abc  ");
    expect(await storage.getKey()).toBe("abc");
    await expect(storage.setKey("   ")).rejects.toThrow();
    await storage.clearKey();
    expect(await storage.getKey()).toBeUndefined();
    expect(await storage.getEdition()).toBe("core-2026");
    await storage.setEdition("not-an-edition");
    expect(await storage.getEdition()).toBe("core-2026");
  });
});

describe("mech files", () => {
  it("round-trips, and holds no key or setting", async () => {
    const storage = await openFamilyStorage();
    await storage.setKey("secret-key-value");
    const record = bipedRecord({ source: { kind: "mordel", unitType: "bm", id: 1, designer: "d", fetchedAt: "t", original: { a: 1 }, values: {} } });
    const file = toMechFile(record);
    expect(JSON.stringify(file)).not.toContain("secret-key-value");
    expect(Object.keys(file).sort()).toEqual(["app", "kind", "record", "version"]);
    expect(fromMechFile(JSON.parse(JSON.stringify(file)))).toEqual({ ok: true, record });
  });

  it.each([
    ["wrong app", { app: "other", kind: "mech", version: 1 }],
    ["wrong kind", { app: "salvage-rights", kind: "list", version: 1 }],
    ["wrong version", { app: "salvage-rights", kind: "mech", version: 2 }],
    ["bad record", { app: "salvage-rights", kind: "mech", version: 1, record: { schema: 1 } }],
    ["not an object", "text"],
  ])("rejects a file with %s", (_name, file) => {
    const withRecord = typeof file === "object" && !("record" in file) ? { ...file, record: bipedRecord() } : file;
    const result = fromMechFile(withRecord);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/\S/);
  });

  it("checks shape, not legality, and save refuses what fails the check", async () => {
    const source = { kind: "mordel", unitType: "bm", id: 1, designer: "d", fetchedAt: "t", original: null, values: {} } as const;
    const baseline = { ...bipedRecord(), id: undefined, editionId: undefined, schema: undefined };
    const accepted = [bipedRecord({ tons: 9999 }), bipedRecord({ source }), bipedRecord({ source: { ...source, baseline } as never, arms: { RA: { lowerArm: true, hand: false } } }), bipedRecord({ imageUrl: "x", notes: { overview: "o" } })];
    const refused = [
      bipedRecord({ source: { ...source, kind: "other" } as never }),
      bipedRecord({ source: { ...source, id: "1" } as never }),
      bipedRecord({ source: { ...source, designer: 3 } as never }),
      bipedRecord({ source: { ...source, values: undefined } as never }),
      bipedRecord({ source: { ...source, values: { battleValue: "high" } } as never }),
      bipedRecord({ arms: { LA: { lowerArm: true } } as never }),
      bipedRecord({ source: { ...source, baseline: { tons: 50 } } as never }),
      bipedRecord({ notes: { overview: 5 } as never }),
      bipedRecord({ imageUrl: 5 as never }),
    ];
    for (const record of accepted) expect(isMechRecord(record)).toBe(true);
    const storage = await openFamilyStorage();
    for (const record of refused) {
      expect(isMechRecord(record)).toBe(false);
      await expect(storage.save(record)).rejects.toThrow("cannot be saved");
    }
    expect(await storage.list()).toEqual([]);
  });
});
