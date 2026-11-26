// Split weapons (TechManual p.57, p.208, p.219). The TechManual's own example, the Barghest BGS-1T (pp.47-58), splits its LB 20-X AC
// 9 slots in the right torso and 2 in the center torso; its figures are the book's, and the import shapes are mordel.net's.
import { describe, expect, it } from "vitest";
import { inventoryLines, loadCatalog } from "./catalog";
import { runChecks } from "./checks";
import { layout, newRecord, weights } from "./mech";
import type { LocationCode, MechRecord, Mount } from "./mech";
import { fromMordel } from "./mordel";
import { fromMtf } from "./mordel-files";

const catalog = await loadCatalog();
const NOW = "2026-11-25T10:00:00.000Z";
const at = (id: string, equipmentId: string, location: LocationCode, slot: number, extra: Partial<Mount> = {}): Mount => ({
  id,
  equipmentId,
  name: catalog.byId(equipmentId)?.name ?? id,
  techBase: "inner-sphere",
  location,
  slot,
  ...extra,
});

function barghest(): MechRecord {
  return {
    schema: 1,
    id: "barghest",
    editionId: "total-warfare",
    name: { chassis: "Barghest", model: "BGS-1T" },
    techBase: "inner-sphere",
    year: 3067,
    tons: 70,
    configuration: "quad",
    chassis: { engine: { type: "xl", rating: 350 }, gyro: "standard", cockpit: "standard", structure: "standard", armorType: "standard", myomer: "standard", heatSinks: { type: "double", count: 10 } },
    armor: { HD: { front: 9 }, CT: { front: 30, rear: 9 }, LT: { front: 21, rear: 6 }, RT: { front: 21, rear: 6 }, FLL: { front: 27 }, FRL: { front: 27 }, RLL: { front: 26 }, RRL: { front: 26 } },
    mounts: [
      at("er-1", "er-large-laser-is", "LT", 3),
      at("er-2", "er-large-laser-is", "LT", 5),
      at("lb", "lb-20-x-ac-is", "RT", 3, { split: { location: "CT", slot: 10, slots: 2 } }),
      at("ammo-1", "ammo-lb-20-x-is", "RLL", 4),
      at("ammo-2", "ammo-lb-20-x-is", "RLL", 5),
      at("ammo-3", "ammo-lb-20-x-is", "RRL", 4),
      at("ammo-4", "ammo-lb-20-x-is", "RRL", 5),
    ],
    notes: {},
  };
}
const errors = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.level === "error");
const withLb = (record: MechRecord, change: Partial<Mount>): MechRecord => ({ ...record, mounts: record.mounts.map((m) => (m.id === "lb" ? { ...m, ...change } : m)) });
const cellsOf = (record: MechRecord, loc: LocationCode, id: string) => (layout(record, catalog.factsOf).slots[loc] ?? []).flatMap((c, i) => (c.mountId === id ? [i] : []));

describe("split weapons", () => {
  it("lays out the Barghest's LB 20-X AC over the right and center torsos, legal, weighed once and listed as CT/RT", () => {
    const record = barghest();
    expect(errors(record)).toEqual([]);
    expect(cellsOf(record, "RT", "lb")).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(cellsOf(record, "CT", "lb")).toEqual([10, 11]);
    const { lines, total } = weights(record, catalog.factsOf);
    expect(total).toBe(70);
    expect(lines.filter((l) => l.label === "LB 20-X AC").map((l) => l.tons)).toEqual([14]);
    expect(inventoryLines(record, catalog).find((l) => l.name === "LB 20-X AC")?.location).toBe("CT/RT");
  });

  it("does not let an AC/10 split (fewer than 8 slots), nor an Arrow IV on an IndustrialMech (p.74 names only four weapons)", () => {
    const splitFindings = (record: MechRecord) => errors(record).filter((f) => f.check === "split").map((f) => f.cite?.page);
    expect(splitFindings(withLb(barghest(), { equipmentId: "ac-10-is", name: "Autocannon/10", slot: 5 }))).toEqual([57]);
    const arrow = withLb(barghest(), { equipmentId: "arrow-iv-is", name: "Arrow IV", slot: 3, split: { location: "CT", slot: 10, slots: 6 } });
    expect(splitFindings(arrow)).toEqual([]);
    expect(splitFindings({ ...arrow, unitType: "industrialmech" })).toEqual([74]);
  });

  it("does not let a split go into a leg", () => {
    const record = barghest();
    record.mounts = record.mounts.filter((m) => m.location !== "RRL").map((m) => (m.id === "lb" ? { ...m, split: { location: "RRL", slot: 4, slots: 2 } } : m));
    expect(errors(record).filter((f) => f.check === "split").map((f) => f.message)).toEqual([expect.stringContaining("may not go in a leg")]);
  });

  it("splits a heavy Gauss rifle only between torsos: an arm and its side torso raises a finding", () => {
    const biped = newRecord({ chassis: "Test", model: "T-1", tons: 70, walk: 4, techBase: "inner-sphere", configuration: "biped", year: 3067 }, "total-warfare", "hg");
    biped.mounts = [at("hg", "heavy-gauss-rifle-is", "LA", 4, { split: { location: "LT", slot: 0, slots: 3 } })];
    const found = errors(biped).filter((f) => f.where?.mountId === "hg");
    expect(found.map((f) => [f.check, f.message])).toEqual([["placement", expect.stringContaining("cannot go in the Left Arm")]]);
  });

  // Mordel's .mtf gives each location's slots; a split weapon is two short runs of one item. Quad sections, as in a quad file.
  const mtf = (lines: Record<string, string[]>) => `chassis:Barghest
model:BGS-1T
Config:Quad
TechBase:Inner Sphere
Era:3067
Rules Level:2
Mass:70
Engine:350 XL Engine(IS)
Structure:Standard
Myomer:Standard
Heat Sinks:10 Double
Armor:Standard(Inner Sphere)
FLL Armor:27
FRL Armor:27
LT Armor:21
RT Armor:21
CT Armor:30
HD Armor:9
RLL Armor:26
RRL Armor:26
RTL Armor:6
RTR Armor:6
RTC Armor:9

${Object.entries(lines)
  .map(([name, list]) => `${name}:\n${[...list, ...Array<string>(Math.max(0, (name.includes("Leg") || name === "Head" ? 6 : 12) - list.length)).fill("-Empty-")].join("\n")}\n`)
  .join("\n")}`;
  const LEG = ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"];
  const ENGINE = ["Fusion Engine", "Fusion Engine", "Fusion Engine"];
  const BARGHEST_MTF = mtf({
    "Front Left Leg": LEG,
    "Front Right Leg": LEG,
    "Left Torso": [...ENGINE, ...Array<string>(4).fill("ER Large Laser")],
    "Right Torso": [...ENGINE, ...Array<string>(9).fill("LB 20-X AC")],
    "Center Torso": [...ENGINE, "Gyro", "Gyro", "Gyro", "Gyro", ...ENGINE, "LB 20-X AC", "LB 20-X AC"],
    Head: ["Life Support", "Sensors", "Cockpit", "-Empty-", "Sensors", "Life Support"],
    "Rear Left Leg": [...LEG, "LB 20-X AC Ammo", "LB 20-X AC Ammo"],
    "Rear Right Leg": [...LEG, "LB 20-X AC Ammo", "LB 20-X AC Ammo"],
  });

  it("imports the Barghest's .mtf with one LB 20-X AC split RT 9 / CT 2, nothing unmatched and 70 tons", () => {
    const result = fromMtf(BARGHEST_MTF, catalog, "total-warfare", NOW, () => "mtf");
    if (!result.ok) throw new Error(result.message);
    const { record, notes } = result;
    expect(record.mounts.filter((m) => m.equipmentId === null)).toEqual([]);
    expect(record.mounts.filter((m) => m.equipmentId === "lb-20-x-ac-is").map((m) => [m.location, m.slot, m.split])).toEqual([["RT", 3, { location: "CT", slot: 10, slots: 2 }]]);
    expect(weights(record, catalog.factsOf).total).toBe(70);
    expect(notes.join(" ")).not.toContain("kept as");
    expect(errors(record).filter((f) => f.check === "split" || f.check === "slots")).toEqual([]);
  });

  it("imports the Barghest from Mordel's API, where the split weapon is two entries sharing one id, the same way", () => {
    const item = (id: number, name: string, location: string, slots: number) => ({ id, name, location, technology: "Inner Sphere", slots, facing: "Front", associated_id: null, stacks: null, fixed: false });
    const tech = { technology: "Inner Sphere" };
    const response = {
      status: "OK",
      unit: {
        unit_type_short: "bm",
        id: 823,
        name: "Barghest BGS-1T",
        name_parts: { name: "Barghest", model: "BGS-1T" },
        tons: 70,
        year: 3067,
        tech_base: "Inner Sphere",
        configuration: "Quad",
        engine: { type: "XL", rating: 350, ...tech },
        gyro: { type: "Standard", ...tech },
        cockpit: { type: "Standard", ...tech },
        structure: { type: "Standard", ...tech },
        armor: { type: "Standard", points: 208, ...tech },
        myomer: { type: "Standard" },
        heat_sinks: { type: "Double", count: 10, ...tech },
        locations: [
          ["H", 9, null],
          ["CT", 30, 9],
          ["LT", 21, 6],
          ["RT", 21, 6],
          ["LFL", 27, null],
          ["RFL", 27, null],
          ["LRL", 26, null],
          ["RRL", 26, null],
        ].map(([code, armor, rear]) => ({ code, armor, rear_armor: rear })),
        equipment: [
          item(5, "ER Large Laser", "LT", 2),
          item(6, "ER Large Laser", "LT", 2),
          item(11, "LB 20-X AC (Ammo 5)", "LRL", 1),
          item(42, "LB 20-X AC (Ammo 5) [Cluster]", "LRL", 1),
          item(10, "LB 20-X AC", "CT", 2),
          item(10, "LB 20-X AC", "RT", 9),
          item(12, "LB 20-X AC (Ammo 5)", "RRL", 1),
          item(41, "LB 20-X AC (Ammo 5) [Cluster]", "RRL", 1),
        ],
      },
    };
    const result = fromMordel(response, catalog, "total-warfare", NOW, () => "api");
    if (!result.ok) throw new Error(result.message);
    const { record } = result;
    expect(record.mounts.filter((m) => m.equipmentId === null)).toEqual([]);
    expect(record.mounts.filter((m) => m.equipmentId === "lb-20-x-ac-is").map((m) => [m.location, m.slot, m.split])).toEqual([["RT", 3, { location: "CT", slot: 10, slots: 2 }]]);
    expect(weights(record, catalog.factsOf).total).toBe(70);
    expect(errors(record).filter((f) => f.check === "split" || f.check === "slots")).toEqual([]);
  });
});
