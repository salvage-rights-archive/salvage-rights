// What the AeroTech pages keep on the device: saved units under `aero-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type AeroEntry = UnitEntry<AeroRecord>;
export type AeroStorage = UnitStorage<AeroRecord>;

export const { toFile: toAeroFile, fromFile: fromAeroFile, download: downloadAero, open: openAeroStorage } = unitStore({ kind: "aero-unit", withDefaults, aUnit: "an aerospace unit", fileName: "aerospace-unit", extension: "aero" });
