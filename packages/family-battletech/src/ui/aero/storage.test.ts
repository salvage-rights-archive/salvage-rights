import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAeroRecord } from "../../rules/aero";
import { fromAeroFile, openAeroStorage, toAeroFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const fighter = (id: string) => ({ ...newAeroRecord({ id, chassis: "Sabre", model: "SB-27", unitType: "aerospace-fighter", tons: 25, safeThrust: 7 }, "tw-tm-so"), laterField: { kept: true } });

describe("aerospace storage", () => {
  it("saves, lists newest first, gets, round-trips a file and removes, keeping keys it does not know", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const storage = await openAeroStorage();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      await storage.save(fighter("old"));
      vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
      await storage.save(fighter("new"));
      expect((await storage.list()).map((e) => [e.id, e.savedAt])).toEqual([["new", "2026-02-01T00:00:00.000Z"], ["old", "2026-01-01T00:00:00.000Z"]]);
      expect((await storage.get("new"))?.record).toEqual(fighter("new"));
      expect(fromAeroFile(JSON.parse(JSON.stringify(toAeroFile(fighter("new")))))).toEqual({ ok: true, record: fighter("new") });
      await storage.remove("new");
      expect((await storage.list()).map((e) => e.id)).toEqual(["old"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads a unit of an unknown type with unknown arcs without throwing, and reports what is not a record", async () => {
    const raw = await openStore("battletech");
    await raw.set("aero-unit:barge", { record: { schema: 1, editionId: "tw-tm-so", unitType: "lunar-barge", tons: "heavy", armor: { points: { ZZ: 4 } }, mounts: [{ arc: "QQ" }, "junk"] } });
    await raw.set("aero-unit:later", { record: { schema: 2, id: "later" } });
    await raw.set("aero-unit:text", "just a string");
    const list = await (await openAeroStorage()).list();
    const barge = list.find((e) => e.id === "barge")?.record;
    expect(barge).toMatchObject({ id: "barge", unitType: "lunar-barge", tons: 0, armor: { type: "standard", tons: 0, points: { ZZ: 4 } }, mounts: [{ id: "mount-1", equipmentId: null, name: "", arc: "QQ" }] });
    for (const id of ["later", "text"]) expect(list.find((e) => e.id === id)?.unreadable).toMatch(/\S/);
  });

  it.each([
    ["not an object", "text"],
    ["wrong app", { app: "other", kind: "aero-unit", version: 1, record: fighter("a") }],
    ["wrong kind", { app: "salvage-rights", kind: "mech", version: 1, record: fighter("a") }],
    ["wrong version", { app: "salvage-rights", kind: "aero-unit", version: 2, record: fighter("a") }],
    ["no record", { app: "salvage-rights", kind: "aero-unit", version: 1, record: "text" }],
    ["a later schema", { app: "salvage-rights", kind: "aero-unit", version: 1, record: { ...fighter("a"), schema: 2 } }],
  ])("rejects a file with %s, with a message", (_name, file) => {
    const result = fromAeroFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/\S/);
  });
});
