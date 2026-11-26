import { describe, expect, it } from "vitest";
import { duplicateForce, newAbominationUnit, newForce, newForceMech, newForceUnit } from "../../rules/abomination";
import { newRecord } from "../../rules/mech";
import { bundleForce, fromForceFile, importConflicts, planForceImport, toForceFile } from "./storage";

const mech = newRecord({ chassis: "Test", model: "T-1", tons: 50, walk: 4, configuration: "biped", rulesLevel: "standard", techBase: "inner-sphere", year: 3039, unitType: "mech" }, "gothic", "rec-1");
const unit = newAbominationUnit("gnat", "unit-1");
const force = (() => {
  const f = newForce("force-1");
  const m = newForceMech("rec-1", "e-m");
  f.mechs.push({ ...m, handler: true });
  f.units.push({ ...newForceUnit("unit-1", "e-u"), handlerOf: "e-m", handlerBonus: true });
  f.units.push(newForceUnit("gone", "e-gone"));
  return f;
})();
const none = { forces: new Set<string>(), units: new Set<string>(), mechs: new Set<string>() };
const saved = { forces: new Set(["force-1"]), units: new Set(["unit-1"]), mechs: new Set(["rec-1"]) };

describe("the force file", () => {
  it("carries the force with its units and 'Mechs, says what is missing, and reads back", () => {
    const { bundle, missing } = bundleForce(force, { units: [unit], mechs: [mech] });
    expect(missing).toBe(1);
    const read = fromForceFile(JSON.parse(JSON.stringify(toForceFile([bundle]))));
    expect(read.ok && read.bundles[0]?.units.map((u) => u.id)).toEqual(["unit-1"]);
    expect(read.ok && read.bundles[0]?.mechs.map((m) => m.id)).toEqual(["rec-1"]);
  });

  it("refuses what is not a force file, a damaged force and a file over the limits, without throwing", () => {
    expect(fromForceFile(null).ok).toBe(false);
    expect(fromForceFile({ app: "salvage-rights", kind: "gothic-abom", version: 1 }).ok).toBe(false);
    expect(fromForceFile({ app: "salvage-rights", kind: "gothic-force", version: 1, bundles: [{ force: 3, units: [], mechs: [] }] }).ok).toBe(false);
    expect(fromForceFile({ app: "salvage-rights", kind: "gothic-force", version: 1, bundles: Array.from({ length: 101 }, () => ({})) }).ok).toBe(false);
  });

  it("plans the import: replace keeps the ids, keep both gives saved ones new ids and points the force at them", () => {
    const { bundle } = bundleForce(force, { units: [unit], mechs: [mech] });
    expect(importConflicts([bundle], none)).toEqual({ forces: 0, units: 0, mechs: 0 });
    expect(importConflicts([bundle], saved)).toEqual({ forces: 1, units: 1, mechs: 1 });
    const replace = planForceImport([bundle], saved, "replace");
    expect([replace.forces[0]?.id, replace.units[0]?.id, replace.mechs[0]?.id]).toEqual(["force-1", "unit-1", "rec-1"]);
    const both = planForceImport([bundle], saved, "both");
    expect(both.forces[0]?.id).not.toBe("force-1");
    expect(both.units[0]?.id).not.toBe("unit-1");
    expect(both.forces[0]?.units[0]?.unitId).toBe(both.units[0]?.id);
    expect(both.forces[0]?.mechs[0]?.recordId).toBe(both.mechs[0]?.id);
  });
});

describe("duplicateForce", () => {
  it("copies the force with new ids everywhere and the Handler link on the copied entry", () => {
    const copy = duplicateForce(force);
    expect(copy.id).not.toBe(force.id);
    expect(copy.name).toBe("Unnamed force (copy)");
    expect(copy.mechs[0]?.id).not.toBe("e-m");
    expect(copy.units[0]?.handlerOf).toBe(copy.mechs[0]?.id);
    expect(copy.units[0]?.unitId).toBe("unit-1");
  });
});
