// Large craft: what they cost (Strategic Operations: Advanced Aerospace Rules pp. 146-148; AeroTech 2 p. 51; AeroTech 2: Revised Edition pp. 77-80; TechManual
// pp. 277-278, 283, 293), the ship systems TO:AUE and IO:AE add (Naval C3, repair facilities, sub-compact K-F drive, the K-F adapter and modular station), and the checks
// that go with them. The books print a worked cost for a WarShip (the Mjolnir) and a DropShip (the Nekohono'o); JumpShips and stations have none, so theirs are the
// table's arithmetic worked by hand.
import { describe, expect, it } from "vitest";
import { aeroLevelItems, aeroSystemOffered, checkAero } from "./aero-checks";
import { capitalSystems, capitalTally, collarTotal, craftTally, kfDrive, newAeroRecord, vessel } from "./aero";
import type { AeroRecord } from "./aero";
import { aeroCost } from "./aero-bv";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();

type Mount = [arc: string, id: string];
const mountsOf = (list: Mount[]) => list.map(([arc, equipmentId], i) => ({ id: `m${String(i)}`, equipmentId, name: equipmentId, arc }));
const times = <T>(n: number, item: T): T[] => Array.from({ length: n }, () => item);

function ship(editionId: string, f: { unitType: "dropship" | "jumpship" | "warship" | "space-station"; tons: number; safe?: number; year?: number; shape?: "aerodyne" | "spheroid" }, build: Partial<AeroRecord> = {}, mounts: Mount[] = []): AeroRecord {
  const base = newAeroRecord({ id: "x", unitType: f.unitType, tons: f.tons, safeThrust: f.safe ?? 0, year: f.year ?? 3067, ...(f.shape === undefined ? {} : { shape: f.shape }), use: "military" }, editionId);
  return { ...base, ...build, mounts: mountsOf(mounts) };
}
const kinds2 = (record: AeroRecord) => checkAero(record, catalog).map((f) => `${f.check}:${f.level}`);
const line = (record: AeroRecord, label: string) => aeroCost(record, catalog)?.lines.find((l) => l.label === label)?.cost;

describe("docking collar price (owner ruling, 2026-11-27)", () => {
  it("a DropShip's collar is 100,000 in the current rules and 10,000 in the AeroTech 2 books", () => {
    const collar = (editionId: string) => line(ship(editionId, { unitType: "dropship", tons: 3000, safe: 5, shape: "spheroid" }), "Docking collar");
    expect([collar("tw-tm-so"), collar("aerotech2-revised"), collar("aerotech2")]).toEqual([100_000, 10_000, 10_000]);
  });

  it("a current DropShip's collar follows its year: the pre-boom collar before 2458, the prototype boom in 2458-2469, 100,000 from 2470 and with no year (IO:AE p. 113)", () => {
    const collar = (year: number | null) => {
      const record = ship("tw-tm-so", { unitType: "dropship", tons: 3000, safe: 5, shape: "spheroid" });
      return aeroCost({ ...record, year }, catalog)?.lines.find((l) => l.label.startsWith("Docking collar"))?.cost;
    };
    expect([collar(2400), collar(2457), collar(2458), collar(2469), collar(2470), collar(null)]).toEqual([500_000, 500_000, 1_010_000, 1_010_000, 100_000, 100_000]);
  });
});

describe("large craft cost", () => {
  it("AeroTech 2: Revised Edition, the Mjolnir (pp. 79-80): every item and the ER large lasers agree with the book; the rest of its weapons load is not priced here", () => {
    const base = ship("aerotech2-revised", { unitType: "warship", tons: 1_350_000, safe: 4 });
    const free = vessel({ ...base, si: 140, fuelTons: 2376 }, catalog)?.heat?.free ?? 0;
    const record: AeroRecord = {
      ...base,
      si: 140,
      fuelTons: 2376,
      crew: 382,
      quarters: { steerage: 112 },
      armor: { type: "ferro-carbide", tons: 3500, points: {} },
      heatSinks: { type: "double", count: 1319 - free },
      systems: { "docking-hardpoint": 4, "grav-deck-medium": 1 },
      bays: [{ kind: "fighter", capacity: 36, doors: 0 }],
      // The book's ER large lasers (four in each of the eight arcs, 200,000 each), ten lifeboats and 35 escape pods. Its other weapons (LRM-20 and SRM-6 with Artemis, NAC/30, /35 and /40, naval PPCs, Heavy N-Gauss
      // and AR10 launchers with their ammunition, 709,264,000 of the printed 715,664,000) are not in this record: the book prices their ammunition from rounds, which the catalog holds as tons.
      mounts: mountsOf([...["NO", "FL", "FR", "AL", "AR", "AF", "LB", "RB"].flatMap((arc) => times(4, [arc, "er-large-laser-is"] as Mount)), ...times(10, ["NO", "lifeboat-aerospace-is"] as Mount), ...times(35, ["NO", "escape-pod-aerospace-is"] as Mount)]),
    };
    const cost = aeroCost(record, catalog);
    const kf = ["K-F drive coil", "K-F initiator", "K-F controller", "K-F tankage", "Jump sail", "K-F charging system", "K-F drive core (compact core)"].map((label) => line(record, label));
    expect(kf).toEqual([360_000_000, 45_000_000, 50_000_000, 1_300_000, 4_900_000, 1_300_000, 1_850_000_000]);
    expect(cost?.unpriced).toEqual([]);
    // Everything printed but those weapons is 3,692,054,200 - 709,264,000 = 2,982,790,200.
    expect(cost?.subtotal).toBe(3_692_054_200 - 709_264_000);
    expect([cost?.multiplier, cost?.multiplierFor, cost?.total]).toEqual([2, "WarShip", 5_966_000_000]);
  });

  it("TechManual, the Nekohono'o (pp. 277-278): structure 12,491,600 and the other equipment 338,000, with the current collar of 100,000, times 28", () => {
    const record = ship(
      "tw-tm-so",
      { unitType: "dropship", tons: 16_000, safe: 5, shape: "spheroid" },
      {
        si: 16,
        fuelTons: 400,
        crew: 42,
        quarters: { steerage: 219 },
        armor: { type: "ferro-aluminum", tons: 57, points: {} },
        heatSinks: { type: "double", count: 295 - (vessel(ship("tw-tm-so", { unitType: "dropship", tons: 16_000, safe: 5, shape: "spheroid" }), catalog)?.heat?.free ?? 0) },
        bays: [{ kind: "fighter", capacity: 6, doors: 3 }, { kind: "small-craft", capacity: 9, doors: 3 }, { kind: "battle-armor-clan", capacity: 27, doors: 2 }],
      },
      [...["NO", "FL", "FR", "AL", "AR", "AF"].map((arc): Mount => [arc, "medium-laser-is"]), ...times(6, ["NO", "escape-pod-aerospace-is"] as Mount)],
    );
    const cost = aeroCost(record, catalog);
    // The book's example prices the collar at 10,000 (TechManual p. 283); the owner's ruling is 100,000, 90,000 more.
    expect(cost?.subtotal).toBe(12_491_600 + 338_000 + 6 * 40_000 + 90_000);
    expect([cost?.unpriced, cost?.multiplier, cost?.total]).toEqual([[], 28, 28 * (12_491_600 + 338_000 + 240_000 + 90_000)]);
  });

  it("a JumpShip's K-F drive is priced by its collars, integrity and sail, with the support systems and the x1.25 multiplier (SO:AA p. 146)", () => {
    const record = ship("tw-tm-so", { unitType: "jumpship", tons: 345_000 }, { fuelTons: 1000, crew: 100, systems: { "docking-hardpoint": 7 } });
    expect(kfDrive(record)).toEqual({ tons: 327_750, integrity: 7 });
    const lines = ["K-F drive coil", "K-F initiator", "K-F controller", "K-F tankage", "Jump sail", "K-F charging system", "K-F drive support systems", "Docking collars", "Drive unit"].map((label) => line(record, label));
    expect(lines).toEqual([585_000_000, 60_000_000, 50_000_000, 350_000, 3_800_000, 1_900_000, 345_000_000, 700_000, 345_000]);
    expect(line(record, "K-F drive core (standard core)")).toBeUndefined();
    const cost = aeroCost(record, catalog);
    expect([cost?.multiplier, cost?.multiplierFor, cost?.total]).toEqual([1.25, "JumpShip", Math.round((cost?.subtotal ?? 0) * 1.25)]);
  });

  it("a station: x5, x20 with a K-F adapter, x50 as a modular station (IO:AE p. 180), and no K-F drive of its own", () => {
    const station = (tons: number, systems: Record<string, number>) => aeroCost(ship("tw-tm-so", { unitType: "space-station", tons }, { systems }), catalog);
    expect([station(50_000, {})?.multiplier, station(50_000, { "space-station-kf-adapter": 1 })?.multiplier, station(200_000, { "modular-space-station": 1 })?.multiplier]).toEqual([5, 20, 50]);
    expect(station(50_000, {})?.lines.some((l) => l.label.startsWith("K-F"))).toBe(false);
    expect(station(50_000, { "space-station-kf-adapter": 1 })?.multiplierFor).toBe("space station with space station k-f adapter");
  });

  it("a WarShip's drive is x5 on a compact core, x15 with a lithium-fusion battery and x16 with the sub-compact drive (x48 with the battery too), which takes half the tons (TO:AUE p. 156)", () => {
    const core = (systems: Record<string, number>, tons = 20_000) => {
      const record = ship("tw-tm-so", { unitType: "warship", tons, safe: 1 }, { systems });
      const lines = aeroCost(record, catalog)?.lines ?? [];
      const parts = lines.filter((l) => /^(K-F (drive coil|initiator|controller|tankage|charging system)|Jump sail)$/.test(l.label)).reduce((sum, l) => sum + l.cost, 0);
      const extra = lines.find((l) => l.label.startsWith("K-F drive core"))?.cost ?? 0;
      return { factor: (parts + extra) / parts, drive: kfDrive(record)?.tons };
    };
    expect([core({}).factor, core({ "lithium-fusion-battery": 1 }).factor, core({ "sub-compact-kf-drive": 1 }).factor, core({ "sub-compact-kf-drive": 1, "lithium-fusion-battery": 1 }).factor]).toEqual([5, 15, 16, 48]);
    expect([core({}).drive, core({ "sub-compact-kf-drive": 1 }).drive]).toEqual([9050, 10_000]);
  });

  it("a ship system with a price is charged, and a ship with a battery, repair facilities and a Naval C3 weighs them", () => {
    const record = ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1 }, { systems: { "repair-pressurized": 10_000, "naval-c3": 1, "pcmt-low-density": 0 } });
    const priced = aeroCost(record, catalog);
    expect([line(record, "Naval repair facilities, pressurized (tons of capacity)"), line(record, "Naval C3")]).toEqual([100_000_000, 100_000 * 1000]);
    expect(priced?.unpriced).toEqual([]);
    expect(capitalSystems(record).lines.map((l) => [l.kind, l.tons])).toEqual([["repair-pressurized", 750], ["naval-c3", 1000], ["pcmt-low-density", 0]]);
  });

  it("a repair facility weighs a whole ton (reinforced 10 percent) and brings two docking collars, which count for the K-F prices and the hardpoint limit (TO:AUE p. 146)", () => {
    const weights = capitalSystems(ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1 }, { systems: { "repair-unpressurized": 101, "repair-reinforced": 55 } })).lines.map((l) => l.tons);
    expect(weights).toEqual([3, 6]);
    const record = ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1 }, { systems: { "docking-hardpoint": 1, "repair-pressurized": 1000 } });
    expect(collarTotal(record)).toBe(3);
    expect(line(record, "K-F drive coil")).toBe(60_000_000 + 75_000_000 * 3);
    const over = ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1 }, { systems: { "docking-hardpoint": 2, "repair-pressurized": 1000 } });
    expect(kinds2(over)).toContain("systems:error");
    // With no hardpoint at all, a ship under 50,000 tons that mounts a repair facility is still over its limit of none.
    expect(kinds2(ship("tw-tm-so", { unitType: "warship", tons: 20_000, safe: 1 }, { systems: { "repair-pressurized": 1000 } }))).toContain("systems:error");
  });

  it("a DropShip may carry a Naval C3: it weighs a hundredth of the ship and doubles its fire control, and is priced", () => {
    const weapons = times(30, ["NO", "medium-laser-is"] as Mount);
    const dropship = (systems: Record<string, number>) => ship("tw-tm-so", { unitType: "dropship", tons: 10_000, safe: 3 }, { systems }, weapons);
    const tally = (systems: Record<string, number>) => craftTally(dropship(systems), catalog).lines;
    const fire = (systems: Record<string, number>) => tally(systems).find((l) => l.label === "Fire control")?.tons ?? 0;
    expect(fire({})).toBeGreaterThan(0);
    expect([fire({ "naval-c3": 1 }), tally({ "naval-c3": 1 }).find((l) => l.label === "Ship systems")?.tons]).toEqual([fire({}) * 2, 100]);
    expect(line(dropship({ "naval-c3": 1 }), "Naval C3")).toBe(100_000 * 100);
    expect(kinds2(dropship({ "naval-c3": 1, "docking-hardpoint": 1 }))).toContain("systems:error");
    // A system the type may not carry is reported, not weighed.
    expect(craftTally(dropship({ "docking-hardpoint": 1 }), catalog).lines.some((l) => l.label === "Ship systems")).toBe(false);
  });

  it("AeroTech 2: Revised Edition prices no infantry bay, so one is listed as unpriced, while the current rules count it free", () => {
    const bays = [{ kind: "infantry-foot", capacity: 4, doors: 0 }];
    expect(aeroCost(ship("aerotech2-revised", { unitType: "dropship", tons: 3000, safe: 5 }, { bays }), catalog)?.unpriced.map((u) => u.name)).toEqual(["Infantry bay, foot"]);
    expect(aeroCost(ship("tw-tm-so", { unitType: "dropship", tons: 3000, safe: 5 }, { bays }), catalog)?.unpriced).toEqual([]);
  });

  it("a Naval C3 doubles the fire control weight, and a unit of an edition that prints no cost has none", () => {
    const weapons = times(40, ["NO", "medium-laser-is"] as Mount);
    const fireControl = (systems: Record<string, number>) => capitalTally(ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1 }, { systems }, weapons), catalog).lines.find((l) => l.label === "Fire control")?.tons;
    const plain = fireControl({});
    expect(plain).toBeGreaterThan(0);
    expect(fireControl({ "naval-c3": 1 })).toBe((plain ?? 0) * 2);
    expect(aeroCost(newAeroRecord({ id: "b", unitType: "warship", tons: 100_000, safeThrust: 1 }, "battlespace"), catalog)).toBeNull();
  });
});

describe("large craft systems: checks and levels", () => {
  const kinds = (record: AeroRecord) => checkAero(record, catalog).filter((f) => f.check === "systems" || f.check === "type").map((f) => `${f.check}:${f.level}`);

  it("the sub-compact drive is for 5,000 to 25,000 tons without docking collars; a station adapter for 100,000 tons or less; a modular station for more", () => {
    const warship = (tons: number, systems: Record<string, number>) => kinds(ship("tw-tm-so", { unitType: "warship", tons, safe: 1 }, { systems }));
    expect(warship(20_000, { "sub-compact-kf-drive": 1 })).not.toContain("type:error");
    expect(warship(20_000, { "sub-compact-kf-drive": 1 })).not.toContain("systems:error");
    expect(warship(100_000, { "sub-compact-kf-drive": 1 })).toEqual(expect.arrayContaining(["type:error", "systems:error"]));
    expect(warship(20_000, { "sub-compact-kf-drive": 1, "docking-hardpoint": 1 })).toContain("systems:error");
    const station = (tons: number, system: string) => kinds(ship("tw-tm-so", { unitType: "space-station", tons }, { systems: { [system]: 1 } })).filter((k) => k === "systems:error");
    expect([station(100_000, "space-station-kf-adapter"), station(150_000, "space-station-kf-adapter"), station(100_000, "modular-space-station"), station(150_000, "modular-space-station")]).toEqual([[], ["systems:error"], ["systems:error"], []]);
  });

  it("a system is an error before its prototype year, and a warning to an Inner Sphere unit in the years the Inner Sphere lacked it; Naval C3 is for the Inner Sphere", () => {
    const station = (year: number, techBase: "inner-sphere" | "clan") => kinds({ ...ship("tw-tm-so", { unitType: "space-station", tons: 50_000, year }, { systems: { "space-station-kf-adapter": 1 } }), techBase });
    expect([station(2340, "inner-sphere"), station(2900, "inner-sphere"), station(2900, "clan"), station(3050, "inner-sphere")]).toEqual([["systems:error"], ["systems:warning"], [], []]);
    const c3 = ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1, year: 3070 }, { systems: { "naval-c3": 1 }, techBase: "clan" });
    expect(kinds(c3)).toContain("systems:warning");
  });

  it("the editor offers a system only when the unit's tech base, year and level allow it, and keeps one the record already holds", () => {
    const warship = (extra: Partial<AeroRecord>) => ({ ...ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1, year: 3070 }), ...extra });
    expect([aeroSystemOffered(warship({}), "naval-c3"), aeroSystemOffered(warship({ techBase: "clan" }), "naval-c3"), aeroSystemOffered(warship({ year: 3060 }), "naval-c3")]).toEqual([true, false, false]);
    expect([aeroSystemOffered(warship({ rulesLevel: "standard" }), "naval-c3"), aeroSystemOffered(warship({ rulesLevel: "advanced" }), "naval-c3"), aeroSystemOffered(warship({ rulesLevel: "advanced" }), "repair-pressurized")]).toEqual([false, false, true]);
    expect(aeroSystemOffered(warship({ rulesLevel: "experimental" }), "naval-c3")).toBe(true);
  });

  it("the rules level of each system comes from its book: repair facilities Advanced, Naval C3 Experimental, the K-F adapter Experimental in its prototype years", () => {
    const level = (record: AeroRecord, name: string) => aeroLevelItems(record, catalog).find((i) => i.name === name)?.level;
    const warship = ship("tw-tm-so", { unitType: "warship", tons: 100_000, safe: 1, year: 3070 }, { systems: { "repair-unpressurized": 100, "naval-c3": 1, "repair-reinforced": 100 } });
    expect([level(warship, "Naval repair facilities, unpressurized (tons of capacity)"), level(warship, "Naval C3"), level(warship, "Naval repair facilities, reinforced (tons of capacity)")]).toEqual(["advanced", "experimental", "experimental"]);
    const station = (year: number) => level(ship("tw-tm-so", { unitType: "space-station", tons: 50_000, year }, { systems: { "space-station-kf-adapter": 1 } }), "Space station K-F adapter");
    expect([station(2360), station(2400)]).toEqual(["experimental", "advanced"]);
  });
});
