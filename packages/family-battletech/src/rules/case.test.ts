import { describe, expect, it } from "vitest";
import { equipmentAvailable } from "./availability";
import { battleValue } from "./bv";
import { loadCatalog } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { bipedRecord, clanMount } from "./fixtures";
import type { LocationCode, MechRecord } from "./mech";

const catalog = await loadCatalog();
const ammoAt = (loc: LocationCode, n = 1) => clanMount(`ammo-${loc}-${n}`, "ammo-lrm-10-clan", loc, null);
const caseAt = (loc: LocationCode) => clanMount(`case-${loc}`, "case-clan", loc, null);
const unit = (patch: Partial<MechRecord> = {}): MechRecord => bipedRecord({ editionId: "classic", year: 3070, ...patch });
const withChassis = (record: MechRecord, change: Partial<MechRecord["chassis"]>): MechRecord => ({ ...record, chassis: { ...record.chassis, ...change } });
const caseLines = (record: MechRecord) => unitCost(record, catalog).lines.filter((l) => l.label.startsWith("CASE")).map((l) => l.cost);

describe("automatic Clan CASE", () => {
  it("is priced 50,000 for each location that holds ammunition, and an explicit Clan CASE mount on a Clan structure adds nothing", () => {
    const clan = unit({ techBase: "clan", mounts: [ammoAt("LT"), ammoAt("LT", 2), ammoAt("RT"), caseAt("RT")] });
    expect(caseLines(clan)).toEqual([50_000, 50_000]);
    expect(caseLines(unit({ techBase: "clan", mounts: [] }))).toEqual([]);
  });

  it("gives no BV protection from a Clan engine alone, and follows the structure on a mixed record", () => {
    const exposure = (record: MechRecord) => battleValue(record, catalog).defensive.explosiveAmmo;
    const mounts = [ammoAt("LT")];
    const clanEngine = withChassis(unit({ techBase: "inner-sphere", mounts }), { engine: { type: "xl-clan", rating: 200 } });
    expect(exposure(clanEngine)).toBe(15);
    expect(exposure(unit({ techBase: "clan", mounts }))).toBe(0);
    expect(exposure(withChassis(unit({ techBase: "mixed", mounts }), { structure: "endo-steel-clan" }))).toBe(0);
    expect(exposure(withChassis(unit({ techBase: "mixed", mounts }), { structure: "endo-steel" }))).toBe(15);
    expect(exposure(withChassis(unit({ techBase: "mixed", mounts }), { structureTech: "clan" }))).toBe(0); // a standard structure the import read as Clan
    expect(exposure(withChassis(unit({ techBase: "mixed", mounts }), { structureTech: "inner-sphere" }))).toBe(15);
  });

  it("is refused as an explicit mount on an Inner Sphere structure, which it protects only in its own location and still prices", () => {
    const mixed = unit({ techBase: "mixed", mounts: [ammoAt("LT"), ammoAt("RT"), caseAt("LT")] });
    const found = runChecks(mixed, catalog).filter((f) => f.check === "clan-case");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ level: "error", where: { mountId: "case-LT" } });
    expect(runChecks({ ...mixed, techBase: "clan" }, catalog).some((f) => f.check === "clan-case")).toBe(false);
    expect(battleValue(mixed, catalog).defensive.explosiveAmmo).toBe(15); // LT protected, RT not
    expect(caseLines(mixed)).toEqual([]);
    expect(unitCost(mixed, catalog).lines.find((l) => l.label === "case-LT")?.cost).toBe(50_000);
  });

  it("is hidden in the picker on an Inner Sphere structure and offered on a Clan one", () => {
    const row = catalog.byId("case-clan")!;
    const offered = (record: MechRecord) => equipmentAvailable(row, record, catalog, true);
    expect(offered(unit({ techBase: "mixed" }))).toBe(false);
    expect(offered(withChassis(unit({ techBase: "mixed" }), { structure: "endo-steel-clan" }))).toBe(true);
    expect(offered(unit({ techBase: "clan" }))).toBe(true);
  });
});
