// What the infantry pages keep on the device: saved units under `infantry-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/infantry/platoon";
import type { InfantryRecord } from "../../rules/infantry/platoon";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type InfantryEntry = UnitEntry<InfantryRecord>;
export type InfantryStorage = UnitStorage<InfantryRecord>;

export const { download: downloadInfantry, open: openInfantryStorage } = unitStore({ kind: "infantry-unit", withDefaults, aUnit: "a platoon", saved: "platoon", fileName: "infantry", extension: "infantry", pictures: false });
