import { beforeAll, describe, expect, it } from "vitest";
import { levelItems, patchworkOffered } from "../rules/levels";
import { battleValue } from "../rules/bv";
import { loadCatalog } from "../rules/catalog";
import type { Catalog } from "../rules/catalog";
import { runChecks } from "../rules/checks";
import { bipedRecord } from "../rules/fixtures";
import { editRecord, weights } from "../rules/mech";
import type { MechRecord } from "../rules/mech";
import { movementPenalty } from "../rules/walk";
import { setPartType, setPatchwork } from "./EditorPage";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});
const armorTons = (record: MechRecord) => weights(record, catalog.factsOf).lines.find((l) => l.label === "Armor")?.tons;
const ferroArm = (record: MechRecord) => editRecord(record, (d) => setPatchwork(d, "RA", "ferro-fibrous"));

// Patchwork armor, Tactical Operations: AUE p.189 (Patchwork Armor Table), with the book's Griffin worked example: 17 points of Inner
// Sphere ferro-fibrous in an arm weigh 1 ton, and the type takes 2 slots in that location.
describe("patchwork armor", () => {
  it("weighs each location on its own, rounded up to the half ton there: the book's 17 points of ferro-fibrous are 1 ton", () => {
    const plain = bipedRecord({ armor: { RA: { front: 17 } } });
    expect(armorTons(plain)).toBe(1.5); // one type: 17 points of standard armor, rounded once
    const patched = editRecord(plain, (d) => { d.patchwork = { RA: "ferro-fibrous" }; });
    expect(armorTons(patched)).toBe(1);
  });

  it("puts the type's slots in that location, as slot mounts for the location, and reports one that sits elsewhere", () => {
    const patched = ferroArm(bipedRecord());
    const mounts = patched.mounts.filter((m) => m.part === "armor");
    expect(mounts.map((m) => m.armorFor)).toEqual(["RA", "RA"]);
    expect(runChecks(patched, catalog).some((f) => f.check === "slots" && f.message.includes("in the Right Arm"))).toBe(false); // unplaced: the "no location" error covers it
    const placedWrong = editRecord(patched, (d) => { d.mounts.filter((m) => m.part === "armor").forEach((m, i) => { m.location = "LA"; m.slot = 5 + i; }); });
    expect(runChecks(placedWrong, catalog).some((f) => f.check === "slots" && f.message.includes("takes 2 slots in the Right Arm; the record places 0"))).toBe(true);
    expect(editRecord(patched, (d) => setPatchwork(d, "RA", null)).mounts.filter((m) => m.part === "armor")).toHaveLength(0);
  });

  it("works out the armor Battle Value location by location: 16 hardened points count double, +40 at the 2.5 factor", () => {
    const base = bipedRecord();
    const patched = editRecord(base, (d) => { d.patchwork = { LA: "hardened", RA: "hardened" }; });
    expect(battleValue(patched, catalog).defensive.armor - battleValue(base, catalog).defensive.armor).toBe(40);
  });

  it("takes the Running MP hardened armor costs only when a leg wears it", () => {
    const arms = editRecord(bipedRecord(), (d) => { d.patchwork = { LA: "hardened" }; });
    const leg = editRecord(bipedRecord(), (d) => { d.patchwork = { LL: "hardened" }; });
    expect([movementPenalty(arms, catalog).run, movementPenalty(leg, catalog).run]).toEqual([0, 1]);
  });

  it("is offered from Advanced from 3075 and from Experimental before it, never to an OmniMech, and a record that has it keeps it; each type has its own level", () => {
    const offered = (patch: Partial<MechRecord>) => patchworkOffered(bipedRecord(patch));
    expect([offered({ rulesLevel: "standard", year: 3080 }), offered({ rulesLevel: "advanced", year: 3080 }), offered({ rulesLevel: "advanced", year: 3060 }), offered({ rulesLevel: "experimental", year: 3060 })]).toEqual([false, true, false, true]);
    expect(offered({ rulesLevel: "unlimited", year: 3080, unitType: "omnimech" })).toBe(false);
    expect(offered({ rulesLevel: "standard", year: 3080, patchwork: { RA: "ferro-fibrous" } })).toBe(true);
    const items = levelItems(bipedRecord({ rulesLevel: "advanced", year: 3080, patchwork: { RA: "reactive" } }), catalog);
    expect(items.filter((i) => i.what === "option" || i.name === "Reactive").map((i) => [i.name, i.level])).toEqual([["Patchwork armor", "advanced"], ["Reactive", "experimental"]]);
  });
});

describe("setPartType", () => {
  it("clears the structure tech base an import kept when the structure type changes, so it cannot come back stale", () => {
    const mixed = bipedRecord({ techBase: "mixed", chassis: { ...bipedRecord().chassis, structureTech: "clan" } });
    const back = editRecord(editRecord(mixed, (d) => setPartType(d, "structure", "endo-steel")), (d) => setPartType(d, "structure", "standard"));
    expect(back.chassis.structure).toBe("standard");
    expect(back.chassis.structureTech).toBeUndefined();
  });
});
