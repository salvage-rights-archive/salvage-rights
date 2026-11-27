// What the vehicle pages keep on the device: saved units under `vehicle-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/vehicle/vehicle";
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type VehicleEntry = UnitEntry<VehicleRecord>;
export type VehicleStorage = UnitStorage<VehicleRecord>;

export const { download: downloadVehicle, open: openVehicleStorage } = unitStore({ kind: "vehicle-unit", withDefaults, aUnit: "a vehicle", fileName: "vehicle", extension: "vehicle" });
