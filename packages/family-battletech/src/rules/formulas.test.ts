import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { SHEET_ALIASES } from "../data/equipment/names";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand, mountableOn } from "./catalog";
import { mount, bipedRecord, quadRecord } from "./fixtures";
import type { Mount } from "./mech";
import { runChecks } from "./checks";
import { unitCost } from "./cost";

const rows = expand([...WEAPONS, ...AMMUNITION, ...OTHER]);
const catalog = createCatalog(rows);

/** The weight and slots of one mount of the row on a record of the tonnage, through the catalog the editor uses. */
function facts(id: string, tons: number, options: { quad?: boolean; amount?: number; engine?: number } = {}) {
  const base = options.quad ? quadRecord() : bipedRecord();
  const record = { ...base, tons, chassis: { ...base.chassis, engine: { type: "standard", rating: options.engine ?? 200 } } };
  const m: Mount = { ...mount("m", id, "LA", null), ...(options.amount === undefined ? {} : { amount: options.amount }) };
  return catalog.factsOf(m, { ...record, mounts: [m] });
}

describe("formula rows", () => {
  // [row, tons of the 'Mech, options, expected weight of one mount, expected slots of one mount, why]
  const cases: [string, number, { quad?: boolean; amount?: number; engine?: number }, number, number][] = [
    ["claws-is", 55, {}, 4, 4], //  55 / 15 = 3.67, up to 4 tons and 4 slots
    ["lance-is", 60, {}, 3, 3], // 60 / 20
    ["mace-is", 55, {}, 6, 6], // 55 / 10 = 5.5, up to 6
    ["aes-arm-is", 60, {}, 2, 3], // 60 / 35 = 1.71, up to 2 tons; a heavy 'Mech's 3 slots
    ["aes-leg-is", 40, { quad: true }, 1, 2], // a quad divides by 50: 0.8, up to 1 ton; a medium 'Mech's 2 slots
    ["talons-clan", 75, {}, 2.5, 2], // 75 / 15 = 5 tons in all, shared by two legs
    ["partial-wing-is", 100, {}, 3.5, 4], // 7 percent of 100 = 7 tons in all, shared by two side torsos
    ["partial-wing-clan", 100, {}, 2.5, 3], // 5 percent = 5 tons in all
    ["mechanical-jump-booster-is", 50, { amount: 3 }, 3.75, 2], // 5 percent of 50 x 3 MP = 7.5 tons in all, shared by two legs
    ["supercharger-is", 50, { engine: 200 }, 1, 1], // a tenth of a 200 engine's 8.5 tons, up to 1
    ["jump-pack-is", 50, { amount: 4.5 }, 4.5, 0], // the tons chosen
    ["booby-trap-is", 55, {}, 5.5, 1], // a tenth of 55 = 5.5, already a half ton
    ["umu-is", 70, {}, 1, 1], // as a jump jet of 60-85 tons
    ["cargo-liquid-is", 50, { amount: 2.5 }, 2.5, 3], // a slot for each ton or part of one
    ["communications-equipment-is", 50, { amount: 3 }, 3, 3],
    ["extended-fuel-tank-is", 50, { engine: 400 }, 5.5, 6], // a tenth of a 400 engine (52.5 tons), up to 5.5, and a slot for each ton or part of one
    ["ladder-is", 50, { amount: 30 }, 0.2, 1], // 100 kg for each 20 meters or part of 20; one slot whatever the length
  ];
  it.each(cases)("%s on a %d-ton 'Mech", (id, tons, options, expectedTons, expectedSlots) => {
    expect(facts(id, tons, options)).toEqual({ tons: expectedTons, slots: expectedSlots });
  });
});

describe("fixed-count items", () => {
  it("must be mounted once in each of their locations, and are priced once", () => {
    const base = bipedRecord();
    const wing = (location: "LT" | "RT" | "CT"): Mount => ({ ...mount(`w-${location}`, "partial-wing-is", location, null) });
    const record = { ...base, tons: 60, mounts: [wing("LT"), wing("CT")] };
    const findings = runChecks(record, catalog).map((f) => f.message);
    expect(findings.some((f) => f.includes("once in each of Left Torso, Right Torso"))).toBe(true);
    const good = { ...record, mounts: [wing("LT"), wing("RT")] };
    // 7 percent of 60 = 4.2, up to 4.5 tons in all, at 50,000 for each ton of its own weight (the table's xIT, not rounded up): 4.5 x 50,000 once, not once for each mount
    expect(unitCost(good, catalog).equipment).toBe(225_000);
  });
});

describe("a turret holding other mounts", () => {
  // TechManual p.98: the turret weighs a tenth of what is mounted in it, up to the half ton; p.279 prices it at 5,000 per ton of its own weight.
  const held = (linked: string | undefined, id = "ac-10-is") => ({ ...mount("w", id, "LA", null), ...(linked === undefined ? {} : { linkedTo: linked }) });
  const record = (...mounts: Mount[]) => ({ ...bipedRecord(), mounts: [mount("t", "turret-is", "CT", null), ...mounts] });
  it("weighs a tenth of the mounts linked to it, up to the half ton, and ignores unlinked ones", () => {
    const turret = (r: ReturnType<typeof record>) => catalog.factsOf(r.mounts[0] as Mount, r);
    expect(turret(record())).toEqual({ tons: 0, slots: 0 });
    expect(turret(record(held("t", "medium-laser-is")))).toEqual({ tons: 0.5, slots: 0 }); // 1 ton: 0.1, up to 0.5
    expect(turret(record(held("t"), held("t", "ac-5-is"), held(undefined, "ppc-is")))).toEqual({ tons: 2, slots: 0 }); // AC/10 12 tons + AC/5 8 tons = 20, a tenth is 2
  });
  it("is priced at 5,000 per ton of its own weight", () => {
    const r = record(held("t", "ac-5-is"), held("t", "ac-5-is"), held("t", "ac-5-is"), held("t", "ac-5-is")); // 32 tons: a 3.5-ton turret
    expect(unitCost(r, catalog).equipment).toBe(4 * 125_000 + 5_000 * 3.5);
  });
});

describe("TO:AUE turrets and armored components (pp. 95, 159, 217, 223)", () => {
  it("a BattleMech shoulder turret weighs a tenth of what is linked to it and takes its one mechanism slot; priced 10,000 a ton", () => {
    const r = { ...bipedRecord(), mounts: [mount("t", "battlemech-turret-shoulder-is", "RT", null), { ...mount("w", "ac-10-is", "RT", null), linkedTo: "t" }, { ...mount("x", "ac-5-is", "RT", null), linkedTo: "t" }] };
    expect(catalog.factsOf(r.mounts[0] as Mount, r)).toEqual({ tons: 2, slots: 1 });
    expect(unitCost(r, catalog).equipment).toBe(200_000 + 125_000 + 10_000 * 2);
  });
  it("an armored component weighs half a ton a slot of the item it armors, 150,000 a slot", () => {
    const r = { ...bipedRecord(), mounts: [mount("w", "ac-10-is", "RT", null), { ...mount("a", "armored-component-is", "RT", null), linkedTo: "w" }] };
    expect(catalog.factsOf(r.mounts[1] as Mount, r)).toEqual({ tons: 3.5, slots: 0 }); // an AC/10 takes 7 slots
    expect(unitCost(r, catalog).equipment).toBe(200_000 + 7 * 150_000);
  });
});

describe("sheet names", () => {
  const names: [string, string, string][] = [
    ["Imp. Heavy Medium Laser [Clan]", "clan", "improved-heavy-laser-medium-clan"],
    ["Medium X-Pulse Laser LT 6 6 [P]", "inner-sphere", "x-pulse-laser-medium-is"],
    ["Medium VSP Laser", "inner-sphere", "variable-speed-laser-medium-is"],
    ["ER Large Pulse Laser", "clan", "er-pulse-laser-large-clan"],
    ["Ammo (ATM 6 ER) 10", "clan", "ammo-er-atm-clan"],
    ["Ammo (LRM 20 Artemis-capable) 6", "inner-sphere", "ammo-artemis-capable-is"],
    ["Laser AMS (C)", "clan", "laser-anti-missile-system-clan"],
    ["Partial Wing (C)", "clan", "partial-wing-clan"],
    ["Chameleon LPS", "inner-sphere", "chameleon-lps-is"],
    ["Liquid Storage:1t", "inner-sphere", "cargo-liquid-is"],
    ["Cargo (11 tons)", "clan", "cargo-standard-clan"],
    ["Radical Heat Sink", "inner-sphere", "radical-heat-sink-is"],
  ];
  it.each(names)("%s", (sheet, techBase, id) => {
    expect(catalog.match(sheet, techBase as "inner-sphere" | "clan")?.id).toBe(id);
  });
  it("every alias table entry names a row", () => {
    expect(Object.keys(SHEET_ALIASES).filter((id) => !catalog.byId(id))).toEqual([]);
  });
});

describe("the table", () => {
  it("gives every row a page citation and says whether it was read on the page or in the text", () => {
    expect(rows.filter((r) => !r.cite.book || !(r.cite.page > 0) || (r.checked !== "page" && r.checked !== "text"))).toEqual([]);
  });
  it("offers a BattleMech only the rows that unit type may mount", () => {
    const only = rows.find((r) => r.units !== undefined && !r.units.includes("mech"));
    expect(only === undefined || !mountableOn(only, "mech")).toBe(true);
    expect(catalog.offered("total-warfare", { techBase: "mixed", year: null }).every((r) => mountableOn(r, "mech"))).toBe(true);
  });
});
