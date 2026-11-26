import { describe, expect, it } from "vitest";
import { AMMUNITION } from "../data/equipment/ammunition";
import { OTHER } from "../data/equipment/other";
import { WEAPONS } from "../data/equipment/weapons";
import { createCatalog, expand } from "./catalog";
import { runChecks } from "./checks";
import { unitCost } from "./cost";
import { levelItems } from "./levels";
import { equipmentAvailable, partAvailable, typeAvailable } from "./availability";
import { editRecord, engineRatingOf, newRecord, weights } from "./mech";
import type { MechRecord, Mount } from "./mech";

const catalog = createCatalog(expand([...WEAPONS, ...AMMUNITION, ...OTHER]));

// The worked example of IO:AE printed pp.117-118: Charles' 100-ton Mackie, walking 3, a 300-rated engine built as a 360, 20 tons of primitive armor (214 points).
const mackie = (patch: Partial<MechRecord> = {}): MechRecord => {
  const record = newRecord({ chassis: "Mackie", model: "MSK-5S", tons: 100, walk: 3, techBase: "inner-sphere", configuration: "biped", year: 2445, rulesLevel: "advanced", unitType: "primitive-mech" }, "classic", "mackie");
  record.armor = { HD: { front: 9 }, CT: { front: 31, rear: 10 }, LT: { front: 20, rear: 10 }, RT: { front: 20, rear: 10 }, LA: { front: 24 }, RA: { front: 24 }, LL: { front: 28 }, RL: { front: 28 } };
  return { ...record, ...patch };
};
const messages = (record: MechRecord) => runChecks(record, catalog).filter((f) => f.level === "error").map((f) => f.message);
const mountAt = (id: string, equipmentId: string, location: Mount["location"], slot: number): Mount => ({ id, equipmentId, name: id, techBase: "inner-sphere", location, slot });

describe("a Primitive 'Mech", () => {
  it("builds its engine as the rating times 1.2 and weighs the Mackie as the book does: engine 33, gyro 4, cockpit 5, structure 10, armor 20", () => {
    expect(engineRatingOf(mackie())).toBe(360);
    const lines = Object.fromEntries(weights(mackie(), catalog.factsOf).lines.map((l) => [l.label, l.tons]));
    expect(lines).toMatchObject({ Engine: 33, Gyro: 4, Cockpit: 5, Structure: 10, Armor: 20 });
    expect(mackie().chassis).toMatchObject({ cockpit: "primitive", armorType: "primitive", structure: "standard" });
  });

  it("starts an IndustrialMech's primitive version with its own cockpit and commercial armor, and costs the musculature at 1,000 a ton", () => {
    const record = newRecord({ chassis: "Digger", model: "D-1", tons: 40, walk: 2, techBase: "inner-sphere", configuration: "biped", year: 2360, rulesLevel: "advanced", unitType: "primitive-industrialmech" }, "classic", "digger");
    expect(record.chassis).toMatchObject({ cockpit: "primitive-industrial", armorType: "commercial", structure: "industrial" });
    expect(unitCost(record, catalog).lines.find((l) => l.label === "Musculature")?.cost).toBe(40_000);
  });

  it("is checked: Inner Sphere, a biped or quad, no modern parts, no jumping before 2464, nothing introduced after 2500", () => {
    expect(messages(mackie())).toEqual([]);
    expect(messages(editRecord(mackie(), (d) => void (d.techBase = "clan"))).some((m) => m.includes("is Inner Sphere"))).toBe(true);
    expect(messages(editRecord(mackie(), (d) => void (d.configuration = "tripod"))).some((m) => m.includes("biped or a quad"))).toBe(true);
    expect(messages(editRecord(mackie(), (d) => void (d.chassis.structure = "endo-steel"))).some((m) => m.includes("Endo Steel structure is not allowed"))).toBe(true);
    expect(messages(editRecord(mackie(), (d) => void (d.chassis.cockpit = "standard"))).some((m) => m.includes("Standard cockpit is not allowed"))).toBe(true);
    expect(messages(editRecord(mackie(), (d) => void d.mounts.push(mountAt("jj", "jump-jet-is", "LL", 4)))).some((m) => m.includes("cannot jump before 2464"))).toBe(true);
    expect(messages(editRecord(mackie({ year: 2480 }), (d) => void d.mounts.push(mountAt("er", "er-large-laser-is", "RA", 4)))).some((m) => m.includes("introduced by 2500"))).toBe(true);
  });

  it("needs Advanced rules and its years: a BattleMech from 2443 (prototype 2439), an IndustrialMech from 2350, both gone after 2520", () => {
    expect(levelItems(mackie(), catalog).find((i) => i.what === "type")?.level).toBe("advanced");
    const subject = (unitType: "primitive-mech" | "primitive-industrialmech", year: number) => ({ techBase: "inner-sphere" as const, year, rulesLevel: "advanced" as const, era: undefined, unitType });
    expect([2438, 2439, 2443, 2521].map((year) => typeAvailable("primitive-mech", subject("primitive-mech", year)))).toEqual([false, false, true, false]);
    expect(typeAvailable("primitive-industrialmech", subject("primitive-industrialmech", 2351))).toBe(true);
    expect(typeAvailable("primitive-mech", { ...subject("primitive-mech", 2445), rulesLevel: "standard" })).toBe(false);
  });

  it("offers a primitive part to a primitive 'Mech only, and only its own list", () => {
    const subject = { ...mackie(), tons: 100 };
    expect(partAvailable("armor", "primitive", subject)).toBe(true);
    expect(partAvailable("armor", "ferro-fibrous", subject)).toBe(false);
    expect(partAvailable("armor", "primitive", { ...subject, unitType: "mech" })).toBe(false);
    expect(partAvailable("engine", "ice", subject)).toBe(true);
  });
  it("hides from the picker equipment introduced after 2500 and the improved jump jets", () => {
    const subject = { ...mackie({ year: 2480 }), tons: 100 };
    const row = (id: string) => catalog.byId(id)!;
    expect([equipmentAvailable(row("medium-laser-is"), subject, catalog), equipmentAvailable(row("er-large-laser-is"), subject, catalog), equipmentAvailable(row("improved-jump-jet-is"), subject, catalog)]).toEqual([true, false, false]);
  });
});
