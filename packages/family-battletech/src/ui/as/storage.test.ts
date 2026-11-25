import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { openStore } from "@salvage-rights/shared";
import { newAsUnit, parseSpecials } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import { fromUnitFile, isAsUnit, openAsStorage, toUnitFile } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

function full(): AsUnit {
  const unit = newAsUnit("u1");
  unit.name = { chassis: "Test Walker", model: "TW-1" };
  unit.card = { ...unit.card, size: 3, tmm: 1, move: [{ inches: 8, mode: "" }, { inches: 6, mode: "j" }], role: "Brawler", pv: 36, ov: 1, armor: 7, structure: 5, specials: parseSpecials("IF1, TUR(2/2/1, IF1)") };
  unit.card.damage = { s: { value: 3 }, m: { value: 0, minimal: true }, l: null };
  unit.source = { kind: "mul-export", credit: "the player's own export", ref: "1234" };
  return unit;
}

describe("Alpha Strike unit storage", () => {
  it("accepts a full unit of every source kind and one without a source, and rejects each broken part", () => {
    expect(isAsUnit(full())).toBe(true);
    for (const kind of ["manual", "file", "mordel", "mul-export", "scan", "converted"] as const) expect(isAsUnit({ ...full(), source: { kind } })).toBe(true);
    const withoutSource: Partial<AsUnit> = full();
    delete withoutSource.source;
    expect(isAsUnit(withoutSource)).toBe(true);

    const broken: [string, (u: Record<string, unknown>) => void][] = [
      ["wrong kind", (u) => void (u.kind = "mech")],
      ["no id", (u) => void delete u.id],
      ["name not text", (u) => void (u.name = { chassis: 1, model: "" })],
      ["card without armor", (u) => void delete (u.card as Record<string, unknown>).armor],
      ["damage that is text", (u) => void ((u.card as { damage: Record<string, unknown> }).damage.s = "3")],
      ["a special without raw", (u) => void ((u.card as { specials: unknown[] }).specials = [{ code: "IF", values: [] }])],
      ["a skill that is not a number", (u) => void (u.skill = "4")],
      ["a source of an unknown kind", (u) => void (u.source = { kind: "web" })],
      ["a picture that is not an image address", (u) => void (u.picture = { dataUrl: "http://example.invalid/a.png" })],
    ];
    expect(isAsUnit(5)).toBe(false);
    for (const [name, change] of broken) {
      const copy = structuredClone(full()) as unknown as Record<string, unknown>;
      change(copy);
      expect(isAsUnit(copy), name).toBe(false);
    }
  });

  it("saves and lists units, reads one without a source as manual, and lists an unreadable entry instead of dropping it", async () => {
    const storage = await openAsStorage();
    await storage.save(full());
    const old: Partial<AsUnit> = newAsUnit("old");
    delete old.source;
    await (await openStore("battletech")).set("as-unit:old", { unit: old, savedAt: "2020-01-01T00:00:00Z" });
    await (await openStore("battletech")).set("as-unit:bad", { unit: { schema: 1 } });
    const entries = await storage.list();
    expect(entries.map((e) => e.id).sort()).toEqual(["bad", "old", "u1"]);
    expect(entries.find((e) => e.id === "u1")?.unit).toEqual(full());
    expect(entries.find((e) => e.id === "old")?.unit?.source).toEqual({ kind: "manual" });
    expect(entries.find((e) => e.id === "bad")?.unreadable).toMatch(/incomplete/);
    expect(await storage.raw("bad")).toEqual({ unit: { schema: 1 } });
    await storage.remove("u1");
    expect(await storage.get("u1")).toBeUndefined();
    await expect(storage.save({ schema: 1 } as AsUnit)).rejects.toThrow();
  });

  it("round trips a unit file and gives a plain message for each fault", () => {
    expect(fromUnitFile(JSON.parse(JSON.stringify(toUnitFile(full()))))).toEqual({ ok: true, unit: full() });
    const file = toUnitFile(full());
    const cases: [unknown, string][] = [
      [5, "This is not a Salvage Rights file."],
      [{ ...file, app: "other" }, "This file was not made by Salvage Rights."],
      [{ ...file, kind: "mech" }, "This file does not hold an Alpha Strike unit."],
      [{ ...file, version: 2 }, "This file is from a version this app cannot read."],
      [{ ...file, unit: { schema: 1 } }, "The unit in this file is incomplete or damaged."],
    ];
    for (const [input, message] of cases) expect(fromUnitFile(input)).toEqual({ ok: false, message });
  });
});
