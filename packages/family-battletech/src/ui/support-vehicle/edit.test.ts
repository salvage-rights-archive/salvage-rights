import { expect, it } from "vitest";
import { newSvRecord } from "../../rules/support-vehicle/sv";
import { syncArmorLocations } from "./edit";

it("switching to a VTOL and back keeps the turret setting", () => {
  const r = newSvRecord({ motive: "tracked", tons: 20 });
  r.turret = true;
  r.motive = "vtol";
  syncArmorLocations(r);
  r.motive = "tracked";
  syncArmorLocations(r);
  expect(r.turret).toBe(true);
});
