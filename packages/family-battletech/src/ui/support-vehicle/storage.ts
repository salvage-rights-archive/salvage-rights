// What the Support Vehicle pages keep on the device: saved units under `support-vehicle-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type SvEntry = UnitEntry<SupportVehicleRecord>;
export type SvStorage = UnitStorage<SupportVehicleRecord>;

export const { download: downloadSv, open: openSvStorage } = unitStore({ kind: "support-vehicle-unit", withDefaults, aUnit: "a Support Vehicle", fileName: "support-vehicle", extension: "support-vehicle" });
