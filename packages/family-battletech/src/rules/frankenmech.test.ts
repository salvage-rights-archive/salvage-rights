import { describe, expect, it } from "vitest";
import { INTERNAL_STRUCTURE } from "../data/chassis";
import { loadCatalog } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord, gladiator, mount } from "./fixtures";
import { frankenMechOffered, heatSinkMixAllowed, lowestLevelFor } from "./levels";
import { structurePoints, walkMP, weights, type MechRecord } from "./mech";
import { resolveConfiguration } from "./omni";

const catalog = await loadCatalog();

/** The worked example of Campaign Operations p.213: a 60-ton FrankenMech, Rifleman center torso, right torso and legs, a Warhammer right arm,
 * an Archer left torso and arm and a Phoenix Hawk head, with a 240 engine; its structure weighs 6.5 tons. Its figures only, not the page's text. */
const sneede = (patch: Partial<MechRecord> = {}): MechRecord => ({
  ...bipedRecord(),
  tons: 60,
  rulesLevel: "advanced",
  chassis: { ...bipedRecord().chassis, engine: { type: "standard", rating: 240 } },
  frankenmech: { donors: { RA: 70, LT: 70, LA: 70, HD: 45 } },
  ...patch,
});
const messages = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.check === "frankenmech" || f.check === "engine").map((f) => `${f.level}: ${f.message}`);

describe("FrankenMech", () => {
  it("is an Advanced option, offered only from that level and never to an OmniMech, and a stored flag is reported below it", () => {
    const plain = bipedRecord();
    expect(frankenMechOffered({ ...plain, rulesLevel: "standard" })).toBe(false);
    expect(frankenMechOffered({ ...plain, rulesLevel: "advanced" })).toBe(true);
    expect(frankenMechOffered({ ...plain, rulesLevel: "advanced", unitType: "omnimech" })).toBe(false);
    const stored = sneede({ rulesLevel: "standard" });
    expect(frankenMechOffered(stored)).toBe(true);
    expect(lowestLevelFor(sneede(), catalog)).toBe("advanced");
    expect(runChecks(stored, catalog).filter((f) => f.check === "level" && /FrankenMech/.test(f.message))).toEqual([expect.objectContaining({ level: "error", cite: { book: "Campaign Operations", page: 7 } })]);
  });

  it("weighs the hybrid structure by donor, limits armor by donor and rounds the walking speed down", () => {
    const record = sneede();
    expect(weights(record, catalog.factsOf).lines[0]).toEqual({ label: "Structure", tons: 6.5 });
    expect(structurePoints(record).RA).toBe(INTERNAL_STRUCTURE.rows[70]?.arm);
    expect(walkMP(record)).toBe(4);
    expect(walkMP({ ...record, chassis: { ...record.chassis, engine: { type: "standard", rating: 250 } } })).toBe(4); // 250 / 60 rounds down
    expect(walkMP({ ...record, frankenmech: undefined, chassis: { ...record.chassis, engine: { type: "standard", rating: 250 } } })).toBeNull();
  });

  it.each<[string, Partial<MechRecord>, RegExp | null]>([
    ["the worked example", {}, null],
    ["a leg from a lighter donor", { frankenmech: { donors: { LL: 55 } } }, /Left Leg comes from a 55-ton donor.*60 tons or more/],
    ["legs of different tonnages", { frankenmech: { donors: { LL: 60, RL: 70 } } }, /different tonnages: \+2/],
    ["a donor that is no 'Mech tonnage", { frankenmech: { donors: { RA: 72 } } }, /72 tons, which is not a 'Mech tonnage/],
    ["MASC with another myomer", { chassis: { ...bipedRecord().chassis, engine: { type: "standard", rating: 240 }, myomer: "tsm" }, mounts: [mount("masc", "masc-is", "RT", 0)] }, /MASC installed may use only standard myomer/],
    ["an engine below one walking MP", { chassis: { ...bipedRecord().chassis, engine: { type: "standard", rating: 55 } } }, /under 1 walking MP/],
    ["a tripod", { configuration: "tripod" }, /written for 8 body locations/],
  ])("%s", (_name, patch, message) => {
    const found = messages(sneede(patch));
    if (message === null) expect(found.filter((m) => m.startsWith("error"))).toEqual([]);
    else expect(found).toEqual(expect.arrayContaining([expect.stringMatching(message)]));
  });

  it("refuses an OmniMech", () => {
    const chassis = gladiator();
    const omni = resolveConfiguration(chassis, chassis.primaryId) as MechRecord;
    expect(messages({ ...omni, frankenmech: {} })).toEqual(expect.arrayContaining([expect.stringMatching(/OmniMech cannot be a FrankenMech/)]));
  });

  it("lets heat sink kinds mix, which a plain 'Mech at the same level may not", () => {
    const record = sneede();
    expect(heatSinkMixAllowed(record, "single", "double")).toBe(true);
    expect(heatSinkMixAllowed({ ...record, frankenmech: undefined }, "single", "double")).toBe(false);
  });
});
