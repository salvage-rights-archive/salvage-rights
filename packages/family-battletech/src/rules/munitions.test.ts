import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { checkBa } from "./battlearmor/checks";
import { battleValue as baBattleValue, unitCost as baCost } from "./battlearmor/bv";
import { build as baBuild } from "./battlearmor/construct";
import { newBaRecord, withDefaults as baWithDefaults } from "./battlearmor/record";
import type { BaMount, BaRecord } from "./battlearmor/record";
import { bvWithMunition, chosenMunition, choicesFor, dispenserBv, offeredChoices, reloadCost } from "./munitions";
import { vehicleBv } from "./vehicle/bv";
import { checkVehicle } from "./vehicle/checks";
import { equipmentOffered } from "./vehicle/availability";
import { newVehicleRecord, withDefaults } from "./vehicle/vehicle";
import type { VehicleMount, VehicleRecord } from "./vehicle/vehicle";

const catalog = await loadCatalog();
const row = (id: string) => {
  const found = catalog.byId(id);
  if (!found) throw new Error(`no row ${id}`);
  return found;
};

// Mines and vehicular grenade launcher munitions: TO:AUE pp. 137, 175-179 (entries), 195 and 197 (Battle Value), 198 (grenade modifier), 227 (dates and prices).
describe("mine types and grenade munitions chosen for a dispenser or launcher", () => {
  it.each([
    ["mine-active-is", [{ from: 2200 }], "advanced"],
    ["mine-emp-command-detonated-clan", [{ from: 3074 }], "experimental"],
    ["mine-emp-vibrabomb-is", [{ from: 2680, to: 2825 }, { from: 3058 }], "experimental"],
    ["mine-inferno-clan", [{ from: 3065 }], "advanced"],
    ["mine-vibrabomb-is", [{ from: 2445 }], "advanced"],
    ["grenade-chaff-clan", [{ from: 3065 }], "advanced"],
  ])("%s has the table's dates and rules level, and is never offered as equipment", (id, availability, rulesLevel) => {
    expect(row(id)).toMatchObject({ availability, rulesLevel, tons: 0, slots: 0 });
    expect(catalog.offered("total-warfare", { techBase: "mixed", year: 3100, unit: "vehicle", level: "experimental" }).some((r) => r.id === id)).toBe(false);
  });

  it("a dispenser takes the seven land mine types of its tech base, a space dispenser only the space mine, a grenade launcher its four grenades", () => {
    const ids = (host: string) => choicesFor(row(host), catalog, "total-warfare").map((r) => r.id);
    expect(ids("vehicular-mine-dispenser-is")).toEqual(["mine-active-is", "mine-command-detonated-is", "mine-emp-command-detonated-is", "mine-emp-vibrabomb-is", "mine-inferno-is", "mine-standard-is", "mine-vibrabomb-is"]);
    expect(ids("ba-mine-dispenser-clan")).toHaveLength(7);
    expect(ids("space-mine-dispenser-is")).toEqual(["mine-space-is"]);
    expect(ids("vehicular-grenade-launcher-clan")).toEqual(["grenade-chaff-clan", "grenade-fragmentation-clan", "grenade-incendiary-clan", "grenade-smoke-clan"]);
    expect(ids("medium-laser-is")).toEqual([]);
  });

  it("the dispenser's BV is a 10-point minefield of the type, and its reload is two 10-point shots at the type's price for 5 points", () => {
    const bv = (id: string) => dispenserBv(row(id));
    expect([bv("mine-standard-is"), bv("mine-active-is"), bv("mine-command-detonated-is"), bv("mine-inferno-is"), bv("mine-vibrabomb-is"), bv("mine-emp-vibrabomb-is")]).toEqual([8, 12, 12, 10, 10, 45]);
    expect([reloadCost(row("mine-standard-is")), reloadCost(row("mine-active-is")), reloadCost(row("mine-emp-vibrabomb-clan"))]).toEqual([5_000, 20_000, 100_000]);
  });

  it("an incendiary grenade adds half the launcher's BV; the other grenades add nothing", () => {
    const launcher = row("vehicular-grenade-launcher-is");
    expect(bvWithMunition(launcher, row("grenade-incendiary-is"), 15)).toBe(22.5);
    expect(bvWithMunition(launcher, row("grenade-smoke-is"), 15)).toBe(15);
  });

  it("with no type named a dispenser is a standard-mine one and a launcher fires fragmentation; a type it does not take is kept but read as the default", () => {
    expect(chosenMunition(row("vehicular-mine-dispenser-clan"), undefined, catalog, "total-warfare")?.id).toBe("mine-standard-clan");
    expect(chosenMunition(row("vehicular-grenade-launcher-is"), "grenade-smoke-is", catalog, "total-warfare")?.id).toBe("grenade-smoke-is");
    expect(chosenMunition(row("vehicular-grenade-launcher-is"), "mine-active-is", catalog, "total-warfare")?.id).toBe("grenade-fragmentation-is");
  });
});

describe("a vehicle with a mine dispenser", () => {
  const vehicle = (munition?: string, year = 3060, rulesLevel: VehicleRecord["rulesLevel"] = "advanced"): VehicleRecord => {
    const mount: VehicleMount = { id: "d", equipmentId: "vehicular-mine-dispenser-is", name: "Mine Dispenser (Vehicular)", location: "b", ...(munition === undefined ? {} : { munition }) };
    return { ...newVehicleRecord({ id: "v", year, motive: "tracked", tons: 50, rulesLevel }), cruise: 4, mounts: [mount] };
  };

  it("is worth a minefield of its type, so the type changes the Battle Value, and none is left unvalued", () => {
    const standard = vehicleBv(vehicle("mine-standard-is"), catalog);
    const active = vehicleBv(vehicle("mine-active-is"), catalog);
    expect(standard.unvalued).toEqual([]);
    expect(active.total).toBeGreaterThan(standard.total);
    expect(vehicleBv(vehicle(), catalog).total).toBe(standard.total);
  });

  it("keeps the chosen type through a save and a load, and hides a type the rules level does not reach unless the unit holds it", () => {
    const saved = JSON.parse(JSON.stringify(vehicle("mine-inferno-is"))) as unknown;
    expect(withDefaults(saved)?.mounts[0]?.munition).toBe("mine-inferno-is");
    const standardLevel = vehicle("mine-standard-is", 3100, "standard");
    const offered = (current?: string) => offeredChoices(row("vehicular-mine-dispenser-is"), catalog, "total-warfare", current, (c) => equipmentOffered({ ...c, units: ["vehicle"], choiceFor: undefined }, standardLevel, catalog)).map((c) => c.id);
    expect(offered()).not.toContain("mine-emp-command-detonated-is");
    expect(offered("mine-emp-command-detonated-is")).toContain("mine-emp-command-detonated-is");
  });

  it("is advised about a type the unit may not have and a type the dispenser does not take", () => {
    const messages = (r: VehicleRecord) => checkVehicle(r, catalog).filter((f) => f.check === "equipment").map((f) => f.message);
    expect(messages(vehicle("mine-emp-command-detonated-is", 3060))).toEqual([expect.stringContaining("EMP Mine (Command-Detonated)")]);
    expect(messages(vehicle("grenade-smoke-is"))).toEqual([expect.stringContaining("does not take")]);
  });
});

describe("a battle armor suit with a mine dispenser and the new battle armor items (TO:AUE pp. 96-99, 137, 161, 224-225)", () => {
  const mount = (id: string, extra: Partial<BaMount> = {}, location = "body"): BaMount => ({ id: `m-${id}`, equipmentId: id, name: id, location, ...extra });
  const suit = (mounts: BaMount[], patch: Partial<BaRecord> = {}): BaRecord => ({ ...newBaRecord({ id: "s", weightClass: "medium", year: 3075, rulesLevel: "experimental" }), ground: 2, armor: { type: "standard", points: 4 }, mounts, ...patch });

  it("is worth a minefield of its mine type and weighs 50 kg in 2 slots", () => {
    const standard = suit([mount("ba-mine-dispenser-is", { munition: "mine-standard-is" })]);
    const emp = suit([mount("ba-mine-dispenser-is", { munition: "mine-emp-vibrabomb-is" })]);
    expect(baBuild(standard, catalog).slots.body?.items).toBe(2);
    expect(baBattleValue(emp, catalog).offensive).toBeGreaterThan(baBattleValue(standard, catalog).offensive);
    expect(baWithDefaults(JSON.parse(JSON.stringify(emp)))?.mounts[0]?.munition).toBe("mine-emp-vibrabomb-is");
  });

  it("weighs the mechanical jump booster as twice a jump jet of its class and prices it as one; the myomer booster is 75,000 for each Ground MP the class gets", () => {
    const mechanical = suit([mount("ba-mechanical-jump-booster-is")]);
    expect(baBuild(mechanical, catalog).lines.find((l) => l.label.startsWith("Mechanical Jump Booster"))?.kg).toBe(100);
    expect(baBuild(mechanical, catalog).moves.jump).toBe(1);
    expect(baCost(mechanical, catalog).lines.find((l) => l.label === "Weapons and equipment")?.cost).toBe(75_000);
    const myomer = (weightClass: string) => baCost(suit([mount("ba-myomer-booster-clan")], { techBase: "clan", weightClass }), catalog).lines.find((l) => l.label === "Weapons and equipment")?.cost;
    expect([myomer("medium"), myomer("heavy")]).toEqual([150_000, 75_000]);
  });

  it("is advised when the boosters clash, a myomer booster meets stealth armor, tube artillery is outside the body, and a myomer booster lifts the Ground MP limit", () => {
    const messages = (r: BaRecord) => checkBa(r, catalog).map((f) => f.message);
    const both = suit([mount("ba-mechanical-jump-booster-is"), mount("ba-myomer-booster-clan")], { techBase: "clan" });
    expect(messages(both)).toContain("A mechanical jump booster and a myomer booster cannot be combined.");
    expect(messages(suit([mount("ba-myomer-booster-clan")], { techBase: "clan", armor: { type: "stealth-standard", points: 4 } }))).toContain("A suit with a myomer booster may not wear stealth or mimetic armor.");
    expect(messages(suit([mount("ba-tube-artillery-is", { shots: 4 }, "ra")]))).toContain("Tube artillery can only be mounted in the Body.");
    const fast = (booster: boolean) => messages(suit(booster ? [mount("ba-myomer-booster-clan")] : [], { techBase: "clan", ground: 5 })).some((m) => m.startsWith("Ground MP is 5"));
    expect([fast(false), fast(true)]).toEqual([true, false]);
  });

  it("prices a reusable drop chute as twice the chute it is fitted to", () => {
    const cost = (extra: string[]) => baCost(suit([mount("ba-drop-chute-stealth-is"), ...extra.map((id) => mount(id))]), catalog).lines.find((l) => l.label === "Weapons and equipment")?.cost;
    expect([cost([]), cost(["ba-drop-chute-reusable-is"])]).toEqual([5_000, 15_000]);
  });
});
