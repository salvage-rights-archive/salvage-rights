// The ProtoMech import from Mordel. The bodies below are saved by hand from the fields mordel.net documents for a unit of type pm (no live call is made, and no key is
// involved): the Delphyne-2 of the TechManual worked example (p. 89), and a glider and a quad built on the same layout. Where the documentation is silent (the glider's movement,
// the words for the jump jets), the fixture says what the importer is expected to do.
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
const entry = (id: number | null, name: string, location: string | null, extra: Record<string, unknown> = {}) => ({ id, name, model: null, location, technology: "Clan", slots: 1, facing: "Front", associated_id: null, stacks: null, ...extra });
const place = (code: string, armor: number) => ({ location: code, code, armor, rear_armor: null, structure: 1, armor_type: "Standard", structure_type: "Standard" });

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
    era: "Clan Invasion",
    year: 3070,
    rules_level: "Standard",
    tons: 9,
    battle_value: 316,
    cost: 895_653,
    sources: [{ title: "TechManual", publisher: "Catalyst Game Labs", year: 2007 }],
    configuration: "Biped",
    movement: { walk: 5, run: 8, jump: 5, mechanical_jump_booster: 0 },
    engine: { type: "Fusion", rating: 75 },
    heat_sinks: { type: "Single", count: 2 },
    jump_jets: { type: "ProtoMech", technology: "Clan", model: null, tons: 0.5 },
    cockpit: { type: "ProtoMech", technology: "Clan" },
    armor: { type: "Standard", technology: "Clan", model: null, points: 40, tons: 2 },
    locations: [place("H", 6), place("T", 16), place("LA", 4), place("RA", 4), place("L", 10)],
    equipment: [
      entry(1, "ER Micro Laser", "LA"),
      entry(2, "ER Micro Laser", "RA"),
      entry(3, "SRM 3", "T"),
      entry(4, "SRM 3", "T"),
      entry(null, "SRM 3 (Ammo 10)", null),
      entry(null, "SRM 3 (Ammo 10)", null),
    ],
    fluff: { overview: "A light fast ProtoMech.", capabilities: null },
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
    const quad = imported({ ...delphyne(), unit: { ...delphyne().unit, configuration: "Quad", tons: 8, movement: { walk: 3, run: 5, jump: 0 }, engine: { type: "Fusion", rating: 24 }, jump_jets: null, locations: [place("H", 6), place("T", 16), place("L", 18), place("RA", 4)], equipment: [entry(1, "Gun of Unknown Make", "T")] } });
    expect(quad.record.configuration).toBe("quad");
    expect(quad.notes).toEqual(expect.arrayContaining([expect.stringContaining("Gun of Unknown Make is not in our equipment table")]));
    expect(checkProto(quad.record, catalog).some((f) => f.check === "armor" && f.level === "error")).toBe(true);
    const glider = imported({ ...delphyne(), unit: { ...delphyne().unit, configuration: "Glider", tons: 6, year: 3090, movement: { walk: 1, run: 1, jump: 0 }, engine: { type: "Fusion", rating: 24 }, jump_jets: null, equipment: [], canon: false } });
    expect([glider.record.configuration, glider.record.walk, glider.record.rulesLevel, glider.record.official]).toEqual(["glider", 4, "advanced", undefined]);
  });

  it("refuses what is not a ProtoMech or not a unit, and never throws", () => {
    expect(run({ status: "Error", message: "Unit not found" })).toEqual({ ok: false, message: 'Mordel answered with the status "Error": Unit not found.' });
    expect(run({ unit: { unit_type_short: "bm" } }).ok).toBe(false);
    expect(run(null).ok).toBe(false);
    expect(run({ unit: { unit_type_short: "pm", name: 5, tons: "heavy", equipment: 7, locations: "all" } }).ok).toBe(true);
  });
});
