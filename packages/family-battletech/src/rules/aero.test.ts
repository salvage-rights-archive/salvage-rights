import { describe, expect, it } from "vitest";
import { aeroLocationName, locationsOf, newAeroRecord, withDefaults } from "./aero";

const WINGS = ["NO", "LW", "RW", "AF"];
const QUARTERS = ["NO", "FL", "FR", "AL", "AR", "AF"];

describe("aerospace locations", () => {
  it.each([
    ["aerotech-1986", ["CP", "NO", "LW", "RW", "FU", "EN"], WINGS, false],
    ["battlespace", [], [], false],
    ["aerotech2", WINGS, WINGS, false],
    ["aerotech2-revised", WINGS, WINGS, false],
    ["tw-tm-so", WINGS, WINGS, true],
  ])("a new aerospace fighter under %s has that edition's armor locations and arcs", (editionId, armor, arcs, wingsFireAft) => {
    const record = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 5 }, editionId);
    expect(record.armor.points).toEqual(Object.fromEntries(armor.map((loc) => [loc, 0])));
    expect(locationsOf(record)).toEqual({ armor, arcs, wingsFireAft });
  });

  it.each(["aerotech2", "aerotech2-revised", "tw-tm-so"])("a spheroid DropShip under %s has side facings and six quarter arcs", (editionId) => {
    const spheroid = newAeroRecord({ id: "d", unitType: "dropship", shape: "spheroid", tons: 3000 }, editionId);
    expect(locationsOf(spheroid)).toEqual({ armor: ["NO", "LS", "RS", "AF"], arcs: QUARTERS, wingsFireAft: false });
    // Without a shape a DropShip is aerodyne, with wing arcs that may fire aft.
    expect(locationsOf({ ...spheroid, shape: undefined })).toMatchObject({ arcs: WINGS, wingsFireAft: true });
  });

  it.each([
    ["aerotech2", "small-craft", "spheroid", ["NO", "LS", "RS", "AF"]],
    ["aerotech2-revised", "small-craft", "spheroid", WINGS],
    ["aerotech2", "dropship", "aerodyne", WINGS],
    ["aerotech2-revised", "dropship", "aerodyne", WINGS],
    ["battlespace", "dropship", "aerodyne", ["FO", "LS", "RS", "AF"]],
  ] as const)("under %s a %s of the %s shape is armored on the locations its own sheets name", (editionId, unitType, shape, armor) => {
    expect(locationsOf({ editionId, unitType, shape }).armor).toEqual(armor);
  });

  it("keeps a mount on an arc and armor on a location the edition lacks", () => {
    const at1 = newAeroRecord({ id: "v", unitType: "aerospace-fighter", tons: 80 }, "aerotech-1986");
    const stored = JSON.parse(JSON.stringify({ ...at1, armor: { ...at1.armor, points: { ...at1.armor.points, LBS: 12 } }, mounts: [{ id: "m1", equipmentId: "medium-laser", name: "Medium Laser", arc: "FL" }] })) as unknown;
    const read = withDefaults(stored);
    expect(read?.mounts).toEqual([{ id: "m1", equipmentId: "medium-laser", name: "Medium Laser", arc: "FL" }]);
    expect(read?.armor.points.LBS).toBe(12);
    expect(locationsOf(at1).arcs).not.toContain("FL");
    expect([aeroLocationName("FL"), aeroLocationName("ZZ")]).toEqual(["Fore-Left", '"ZZ"']);
  });
});
