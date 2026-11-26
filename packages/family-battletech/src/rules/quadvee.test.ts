import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { configurationAvailable } from "./availability";
import { createCatalog, expand } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { editRecord, layout, newRecord, weights } from "./mech";
import type { LocationCode, MechRecord } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));
const LEGS: LocationCode[] = ["FLL", "FRL", "RLL", "RRL"];

/** A 50-ton Clan QuadVee, walking 4, with tracks placed in the sixth slot of each leg as the record sheet prints it (IO:AE printed p.226). */
const quadvee = (kind: "tracks" | "wheels" = "tracks"): MechRecord =>
  editRecord(newRecord({ chassis: "Horse", model: "QV-1", tons: 50, walk: 4, techBase: "clan", configuration: "quadvee", year: 3140, rulesLevel: "advanced" }, "classic", "qv"), (d) => {
    d.mounts = d.mounts.filter((m) => m.equipmentId !== "tracks-clan");
    d.mounts.forEach((m, i) => {
      if (m.location === null) Object.assign(m, { location: "LT", slot: 6 + i });
    });
    LEGS.forEach((leg, i) => d.mounts.push({ id: `mover-${i}`, equipmentId: `${kind}-clan`, name: kind, techBase: "clan", location: leg, slot: 5 }));
  });
const errors = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.level === "error").map((f) => f.message);

describe("a QuadVee", () => {
  it("has the 4-ton cockpit with pilot and gunner slots, conversion gear in each leg, and weighs conversion equipment at a tenth", () => {
    const record = quadvee();
    const laid = layout(record, catalog.factsOf);
    expect(laid.slots.HD?.map((c) => c.label)).toEqual(["Life Support", "Sensors", "Cockpit (Pilot)", "Cockpit (Gunner)", "Sensors", "Life Support"]);
    expect(laid.slots.RRL?.[4]?.label).toBe("Conversion Gear");
    expect(laid.slots.RRL?.[5]?.label).toBe("tracks");
    const lines = Object.fromEntries(weights(record, catalog.factsOf).lines.map((l) => [l.label, l.tons]));
    expect(lines).toMatchObject({ "Conversion equipment": 5, Cockpit: 4 });
    expect(errors(record)).toEqual([]);
  });

  it("weighs tracks at a tenth and wheels at 15 percent of the unit, and needs one kind in all four legs", () => {
    const sum = (record: MechRecord, name: string) => weights(record, catalog.factsOf).lines.filter((l) => l.label === name).reduce((s, l) => s + (l.tons ?? 0), 0);
    expect(sum(quadvee("tracks"), "tracks")).toBe(5);
    expect(sum(quadvee("wheels"), "wheels")).toBe(7.5);
    expect(errors(editRecord(quadvee(), (d) => void d.mounts.pop())).some((m) => m.includes("needs tracks or wheels in each of its four legs"))).toBe(true);
    expect(errors(editRecord(quadvee(), (d) => void d.mounts.push({ id: "w", equipmentId: "wheels-clan", name: "wheels", techBase: "clan", location: "FLL", slot: 5 }))).some((m) => m.includes("tracks or wheels, not both"))).toBe(true);
  });

  it("is Clan only, Advanced, from 3135, and its conversion costs half the structure, weapon and equipment cost", () => {
    expect(errors(editRecord(quadvee(), (d) => void (d.techBase = "inner-sphere"))).some((m) => m.includes("Clan technology only"))).toBe(true);
    const subject = (patch: object) => ({ techBase: "clan" as const, year: 3140, era: undefined, rulesLevel: "advanced" as const, ...patch });
    expect([configurationAvailable("quadvee", subject({})), configurationAvailable("quadvee", subject({ year: 3134 })), configurationAvailable("quadvee", subject({ rulesLevel: "standard" })), configurationAvailable("quadvee", subject({ techBase: "inner-sphere" }))]).toEqual([true, false, false, false]);
    const cost = unitCost(quadvee(), catalog);
    expect(cost.conversion).toBeCloseTo(0.5 * (cost.structural + cost.equipment), 3);
    expect(cost.lines.find((l) => l.label.startsWith("Cockpit"))?.cost).toBe(375_000);
  });
});
