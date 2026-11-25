import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { bipedRecord, gladiator } from "../rules/fixtures";
import { resolveConfiguration } from "../rules/omni";
import { fromMechFile, fromOmniFile, isMechRecord, openFamilyStorage, toMechFile, toOmniFile } from "./storage";

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
    expect(await storage.getEdition()).toBe("total-warfare");
    await storage.setEdition("not-an-edition");
    expect(await storage.getEdition()).toBe("total-warfare");
  });
});

describe("an edition id from an earlier version", () => {
  it("reads as Core Rulebook (BCR) / TechManual in the setting, a saved 'Mech and a file, and never throws", async () => {
    const storage = await openFamilyStorage();
    await (await openStore("battletech")).set("edition", "core-2026");
    expect(await storage.getEdition()).toBe("bcr-tm");
    const old = bipedRecord({ editionId: "core-2026" });
    await storage.save(old);
    expect((await storage.get(old.id))?.record?.editionId).toBe("bcr-tm");
    const file = fromMechFile(JSON.parse(JSON.stringify(toMechFile(old))));
    expect(file.ok && file.record.editionId).toBe("bcr-tm");
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

  it("reads a record with no extra heat sink groups as before and round-trips one with them", () => {
    const old = bipedRecord();
    expect(fromMechFile(JSON.parse(JSON.stringify(toMechFile(old))))).toEqual({ ok: true, record: old });
    const mixed = bipedRecord({ techBase: "mixed", chassis: { ...old.chassis, heatSinks: { type: "double", count: 10, extra: [{ type: "double-clan", count: 4 }] } } });
    expect(fromMechFile(JSON.parse(JSON.stringify(toMechFile(mixed))))).toEqual({ ok: true, record: mixed });
    expect(isMechRecord({ ...mixed, chassis: { ...mixed.chassis, heatSinks: { type: "double", count: 10, extra: { type: "double-clan", count: 4 } } } })).toBe(false);
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
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const accepted = [bipedRecord({ picture: { dataUrl: png } }), bipedRecord({ picture: { dataUrl: "data:image/jpeg;base64,/9j/4AAQ" } }), bipedRecord({ tons: 9999 }), bipedRecord({ source }), bipedRecord({ source: { ...source, baseline } as never, arms: { RA: { lowerArm: true, hand: false } } }), bipedRecord({ imageUrl: "x", notes: { overview: "o" } })];
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
      bipedRecord({ picture: { dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" } }),
      bipedRecord({ picture: { dataUrl: "https://mordel.net/a.png" } }),
      bipedRecord({ picture: { dataUrl: png + "A".repeat(1_500_000) } }),
      bipedRecord({ picture: {} as never }),
    ];
    for (const record of accepted) expect(isMechRecord(record)).toBe(true);
    const storage = await openFamilyStorage();
    for (const record of refused) {
      expect(isMechRecord(record)).toBe(false);
      await expect(storage.save(record)).rejects.toThrow("cannot be saved");
    }
    expect(await storage.list()).toEqual([]);
  });

  it("keeps a whole chassis under omni:<id> beside the plain 'Mechs, round-trips its file, and reports one it cannot read", async () => {
    const storage = await openFamilyStorage();
    const raw = await openStore("battletech");
    await storage.save(bipedRecord({ id: "plain" }));
    await storage.saveOmni(gladiator());
    await raw.set("omni:broken", { chassis: { ...gladiator(), configurations: [] }, savedAt: "2026-01-01T00:00:00Z" });
    const list = await storage.list();
    expect(list.map((e) => `${e.kind}:${e.id}`).sort()).toEqual(["mech:plain", "omni:broken", "omni:gladiator"]);
    expect(list.find((e) => e.id === "broken")?.unreadable).toMatch(/OmniMech/);
    expect((await storage.get("gladiator"))?.chassis).toEqual(gladiator());
    expect(fromOmniFile(JSON.parse(JSON.stringify(toOmniFile(gladiator()))))).toEqual({ ok: true, chassis: gladiator() });
    expect(fromOmniFile({ ...toOmniFile(gladiator()), kind: "mech" }).ok).toBe(false);
    expect(fromOmniFile({ ...toOmniFile(gladiator()), chassis: { ...gladiator(), tons: "95" } }).ok).toBe(false);
    // A plain record kept with an omni link (a detached configuration) is still a plain record; a malformed link is refused.
    const detached = resolveConfiguration(gladiator(), "prime");
    expect(isMechRecord(detached)).toBe(true);
    expect(isMechRecord({ ...detached, omni: { chassisId: 1 } })).toBe(false);
    await storage.convertToOmni({ ...gladiator(), id: "plain" });
    expect((await storage.get("plain"))?.kind).toBe("omni");
    await storage.remove("plain");
    expect(await storage.get("plain")).toBeUndefined();
  });
});
