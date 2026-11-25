import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { mordelBiped, mordelOdd, mordelQuad, mordelWith } from "./fixtures";
import { editRecord, type MechRecord } from "./mech";
import { changedSinceImport, fromMordel, parseMordelRef } from "./mordel";

const catalog = await loadCatalog();
let counter = 0;
const NOW = "2026-11-24T10:00:00.000Z";
const run = (response: unknown) => fromMordel(response, catalog, "core-2026", NOW, () => `rec-${++counter}`);
function imported(response: unknown): { record: MechRecord; notes: string[] } {
  const result = run(response);
  if (!result.ok) throw new Error(result.message);
  return result;
}
const mountOf = (record: MechRecord, name: string, nth = 0) => record.mounts.filter((m) => m.name === name)[nth];

describe("parseMordelRef", () => {
  it.each<[string, { unitType: string; id: number } | null]>([
    ["474", { unitType: "bm", id: 474 }],
    ["bm 474", { unitType: "bm", id: 474 }],
    [" BM/474 ", { unitType: "bm", id: 474 }],
    ["https://mordel.net/unit.php?ut=bm&id=474", { unitType: "bm", id: 474 }],
    ["mordel.net/unit.php?id=77&ut=cv", { unitType: "cv", id: 77 }],
    ["", null],
    ["Atlas", null],
    ["bm 0", null],
    ["https://example.com/unit?ut=bm&id=474", null],
    ["https://mordel.net/unit.php?id=474", null],
  ])("reads %j", (text, want) => {
    expect(parseMordelRef(text)).toEqual(want);
  });
});

describe("fromMordel", () => {
  it("maps identity, tonnage, year, chassis keys, armor and Mordel's own values", () => {
    const { record, notes } = imported(mordelBiped());
    expect(record).toMatchObject({
      schema: 1,
      id: expect.stringMatching(/^rec-/) as unknown,
      editionId: "core-2026",
      name: { chassis: "Test Walker", model: "TW-1" },
      techBase: "inner-sphere",
      year: 3025,
      tons: 50,
      configuration: "biped",
      chassis: {
        engine: { type: "standard", rating: 200 },
        gyro: "standard",
        cockpit: "standard",
        structure: "standard",
        armorType: "standard",
        myomer: "standard",
        heatSinks: { type: "single", count: 10 },
      },
      notes: { overview: "A made-up walker." },
      source: {
        kind: "mordel",
        unitType: "bm",
        id: 900001,
        designer: "Nobody In Particular",
        fetchedAt: NOW,
        values: { battleValue: 1000, cost: 2000000, rulesLevel: "Introductory", era: "Succession Wars" },
      },
    });
    expect(record.armor).toEqual({
      HD: { front: 9 },
      CT: { front: 14, rear: 4 },
      LT: { front: 10, rear: 3 },
      RT: { front: 10, rear: 3 },
      LA: { front: 8 },
      RA: { front: 8 },
      LL: { front: 6 },
      RL: { front: 5 },
    });
    expect(notes).toEqual([]);
  });

  it("makes a mount of each equipment entry and places them in list order after the fixed slots", () => {
    const { record } = imported(mordelBiped());
    expect(record.mounts.map((m) => [m.name, m.equipmentId, m.location, m.slot])).toEqual([
      ["AC/10", "ac-10-is", "RT", 0],
      ["AC/10 Ammo", "ammo-ac-10-is", "LT", 0],
      ["Medium Laser", "medium-laser-is", "LA", 4],
      ["Medium Laser", "medium-laser-is", "RA", 4],
      ["Jump Jet", "jump-jet-is", "CT", 10],
      ["Jump Jet", "jump-jet-is", "LL", 4],
      ["Jump Jet", "jump-jet-is", "RL", 4],
      ["Heat Sink", "heat-sink-is", "LL", 5],
      ["Heat Sink", "heat-sink-is", "RL", 5],
    ]);
    // A third item in a leg has no room left and stays unplaced.
    const crowded = mordelWith(mordelBiped(), {
      equipment: [...((mordelBiped()["unit"] as { equipment: unknown[] }).equipment), { id: 20, name: "Jump Jet", location: "LL", technology: "Inner Sphere", slots: 1, associated_id: null }],
    });
    const last = imported(crowded).record.mounts.at(-1);
    expect(last).toMatchObject({ location: "LL", slot: null });
  });

  it("gives a slot-taking structure type that many unplaced structure mounts", () => {
    const { record } = imported(mordelWith(mordelBiped(), { structure: { type: "Endo Steel", technology: "Inner Sphere" } }));
    const parts = record.mounts.filter((m) => m.part === "structure");
    expect(record.chassis.structure).toBe("endo-steel");
    expect(parts).toHaveLength(14);
    expect(parts.every((m) => m.equipmentId === null && m.location === null && m.slot === null && m.name === "Endo Steel")).toBe(true);
    expect(new Set(record.mounts.map((m) => m.id)).size).toBe(record.mounts.length);
    const clan = imported(mordelWith(mordelBiped(), { tech_base: "Clan", structure: { type: "Endo Steel", technology: "Clan" } })).record;
    expect(clan.chassis.structure).toBe("endo-steel-clan");
    expect(clan.mounts.filter((m) => m.part === "structure")).toHaveLength(7);
  });

  it("keeps an item that is not in the catalog as a mount with no equipment id, and says so", () => {
    const { record, notes } = imported(mordelOdd());
    expect(mountOf(record, "Frobnicator 9000")).toMatchObject({ equipmentId: null, location: "CT" });
    expect(notes).toContain("Frobnicator 9000 is not in our equipment table.");
    // Mordel's "(Ammo 12)" bin name finds our ammunition row.
    expect(mountOf(record, "LRM 10 (Ammo 12)")?.equipmentId).toBe("ammo-lrm-10-is");
    // An item that takes no slot has no location and no slot.
    expect(mountOf(record, "Mystery Box")).toMatchObject({ location: null, slot: null });
  });

  it("links an item to the one it is associated with", () => {
    const { record } = imported(mordelOdd());
    expect(mountOf(record, "Artemis IV")?.linkedTo).toBe(mountOf(record, "LRM 10")?.id);
    expect(mountOf(record, "LRM 10")?.linkedTo).toBeUndefined();
  });

  it("maps Mordel's quad location codes to ours", () => {
    const { record } = imported(mordelQuad());
    expect(record.configuration).toBe("quad");
    expect(Object.keys(record.armor)).toEqual(["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"]);
    expect(mountOf(record, "Heat Sink")).toMatchObject({ location: "RRL", slot: 4 });
  });

  it("stores an unknown configuration and a missing part as given, with notes, and never throws", () => {
    const { record, notes } = imported(mordelOdd());
    expect(record).toMatchObject({ configuration: "tripod", year: null, chassis: { myomer: "" } });
    expect(notes.join("\n")).toMatch(/tripod/);
    expect(notes.join("\n")).toMatch(/myomer/);
    const bad = mordelWith(mordelBiped(), { engine: { type: "Plasma Drive", rating: "fast" } });
    expect(imported(bad).record.chassis.engine).toEqual({ type: "Plasma Drive", rating: 0 });
  });

  it.each<[string, unknown, RegExp | null]>([
    ["null", null, /not an object/],
    ["an empty object", {}, /no unit/],
    ["a combat vehicle", mordelWith(mordelBiped(), { unit_type_short: "cv" }), /cv/],
    ["an error status", { status: "Error", message: "No such unit" }, /Error.*No such unit/],
    ["a list", [], /not an object/],
    ["the odd unit", mordelOdd(), null],
  ])("answers %s without throwing", (_name, response, message) => {
    const result = run(response);
    if (message === null) expect(result.ok).toBe(true);
    else expect(result).toMatchObject({ ok: false, message: expect.stringMatching(message) as unknown });
  });
});

describe("changedSinceImport", () => {
  it("is empty after an import and names the field and the mount after an edit", () => {
    const { record } = imported(mordelBiped());
    expect(changedSinceImport(record, catalog)).toEqual(new Set());
    expect(changedSinceImport({ ...record, source: undefined }, catalog)).toEqual(new Set());

    const ac = mountOf(record, "AC/10");
    const edited = editRecord(record, (draft) => {
      draft.armor.LA = { front: 20 };
      draft.tons = 55;
      const found = draft.mounts.find((m) => m.id === ac?.id);
      if (found) found.slot = 3;
      draft.mounts.push({ id: "mine", equipmentId: null, name: "Mine", techBase: "inner-sphere", location: null, slot: null });
    });
    expect(changedSinceImport(edited, catalog)).toEqual(new Set(["armor.LA", "tons", ac?.id, "mine"]));

    const fewer = editRecord(record, (draft) => {
      draft.mounts.pop();
    });
    expect(changedSinceImport(fewer, catalog)).toEqual(new Set(["mounts.removed"]));
  });
});
