// The ProtoMech import from Mordel. The bodies below have the field names and value forms of real pm units read from mordel.net (2026-11-27), trimmed to the fields the import reads and
// with the figures of the TechManual Delphyne-2 worked example (p. 89): no design text, and no live call in the tests. A glider and a quad are built on the same layout.
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import type { Catalog } from "../catalog";
import { checkProto } from "./checks";
import { fromMordelProto } from "./mordel";
import type { ProtoMordelImport } from "./mordel";
import { protoBattleValue, protoCost } from "./rating";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});

let counter = 0;
const run = (response: unknown): ProtoMordelImport => fromMordelProto(response, catalog, "total-warfare", "2026-11-27T10:00:00.000Z", () => `rec-${String(++counter)}`);
const entry = (id: number | null, name: string, location: string | null) => ({ id, name, location, technology: "Clan", slots: location === null ? 0 : 1, facing: "Front" });
const shots = (name: string, count: number) => Array.from({ length: count }, () => entry(null, `${name} (Ammo 1)`, null));
const place = (code: string, armor: number) => ({ code, armor, rear_armor: null, armor_type: null });

/** The Delphyne-2: 9 tons, walk 5, jump 5, 2 heat sinks, 40 armor, 2 ER micro lasers in the arms, 2 SRM 3 in the torso with 10 shots each. */
const delphyne = () => ({
  status: "OK",
  unit: {
    unit_type: "ProtoMech",
    unit_type_short: "pm",
    id: 4242,
    name: "Delphyne 2",
    name_parts: { name: "Delphyne", alternate_name: null, model: "2" },
    designer: "Catalyst Game Labs",
    canon: true,
    tech_base: "Clan",
    mixed_tech: false,
    year: 3070,
    rules_level: "Standard",
    tons: 9,
    battle_value: 316,
    cost: 895_653,
    sources: [{ title: "TechManual", publisher: "Catalyst Game Labs", year: 2007 }],
    configuration: "Biped",
    movement: { walk: 5, run: 8, jump: 5, mechanical_jump_booster: 0 },
    engine: { type: "ProtoMech Fusion", technology: "Clan", rating: 75 },
    heat_sinks: { count: 2, type: "ProtoMech" },
    jump_jets: { type: "ProtoMech", technology: "Clan" },
    cockpit: { type: "ProtoMech", technology: "Clan" },
    armor: { type: "ProtoMech", technology: "Clan", points: 40 },
    locations: [place("H", 6), place("T", 16), place("LA", 4), place("RA", 4), place("L", 10)],
    equipment: [
      entry(1, "ER Micro Laser", "LA"),
      entry(2, "ER Micro Laser", "RA"),
      entry(3, "SRM 3", "T"),
      entry(4, "SRM 3", "T"),
      ...shots("SRM 3", 20),
    ],
  },
});

const imported = (response: unknown) => {
  const result = run(response);
  if (!result.ok) throw new Error(result.message);
  return result;
};

describe("fromMordelProto", () => {
  it("imports the Delphyne-2 with Mordel's values: the same Battle Value and cost, nothing to report, marked OFFICIAL by Mordel's canon flag", () => {
    const { record, notes } = imported(delphyne());
    expect(record).toMatchObject({ tons: 9, walk: 5, jump: 5, heatSinks: 2, techBase: "clan", year: 3070, name: { chassis: "Delphyne", model: "2" }, armor: { hd: 6, t: 16, la: 4, ra: 4, lg: 10, mg: 0 } });
    expect(record.mounts.map((m) => [m.equipmentId, m.location, m.tubes, m.shots])).toEqual([
      ["er-micro-laser-clan", "la", undefined, undefined],
      ["er-micro-laser-clan", "ra", undefined, undefined],
      ["srm-2-clan", "t", 3, 10],
      ["srm-2-clan", "t", 3, 10],
    ]);
    expect([protoBattleValue(record, catalog).total, protoCost(record, catalog).total]).toEqual([316, 895_653]);
    expect(checkProto(record, catalog).filter((f) => f.level !== "note")).toEqual([]);
    expect(notes.filter((n) => !n.startsWith("Mordel lists ammunition"))).toEqual([]);
    expect(record).toMatchObject({ rulesLevel: "standard", official: { status: "official", book: "TechManual" }, source: { kind: "mordel", unitType: "pm", id: 4242, values: { battleValue: 316, cost: 895_653 } } });
  });

  it("reads a quad's configuration and location codes, a glider's WiGE Cruising MP from its engine rating, and says what it could not match", () => {
    const quad = imported({ ...delphyne(), unit: { ...delphyne().unit, configuration: "Quad", tons: 8, movement: { walk: 3, run: 5, jump: 0 }, engine: { type: "ProtoMech Fusion", rating: 24 }, jump_jets: null, locations: [place("H", 6), place("T", 16), place("L", 18), place("RA", 4)], equipment: [entry(1, "Gun of Unknown Make", "T")] } });
    expect(quad.record.configuration).toBe("quad");
    expect(quad.notes).toEqual(expect.arrayContaining([expect.stringContaining("Gun of Unknown Make is not in our equipment table")]));
    expect(checkProto(quad.record, catalog).some((f) => f.check === "armor" && f.level === "error")).toBe(true);
    const glider = imported({ ...delphyne(), unit: { ...delphyne().unit, configuration: "Glider", tons: 12, year: 3090, movement: { walk: 4, run: 6, jump: 0 }, engine: { type: "ProtoMech Fusion", rating: 50 }, jump_jets: null, equipment: [], canon: false } });
    expect([glider.record.configuration, glider.record.walk, glider.record.rulesLevel, glider.record.official]).toEqual(["glider", 4, "advanced", undefined]);
  });

  it("carries a chemical laser's ammunition by the shot, 1,000 kg over the shots a ton holds rounded up, and counts its Battle Value (TO:AUE p. 131)", () => {
    const base = delphyne();
    const { record } = imported({ ...base, unit: { ...base.unit, equipment: [entry(1, "Medium Chemical Laser", "T"), ...shots("Medium Chemical Laser", 12)] } });
    expect(record.mounts.map((m) => [m.equipmentId, m.shots])).toEqual([["chemical-laser-medium-clan", 12]]);
    // 12 shots at 34 kg is 408 kg, a 0.408 ton share of the 5 a ton the table prints.
    expect(protoBattleValue(record, catalog).offensive.ammunition).toBeCloseTo(2.04, 2);
  });

  it("refuses what is not a ProtoMech or not a unit, and never throws", () => {
    expect(run({ status: "Error", message: "Unit not found" })).toEqual({ ok: false, message: 'Mordel answered with the status "Error": Unit not found.' });
    expect(run({ unit: { unit_type_short: "bm" } }).ok).toBe(false);
    expect(run(null).ok).toBe(false);
    expect(run({ unit: { unit_type_short: "pm", name: 5, tons: "heavy", equipment: 7, locations: "all" } }).ok).toBe(true);
  });
});
