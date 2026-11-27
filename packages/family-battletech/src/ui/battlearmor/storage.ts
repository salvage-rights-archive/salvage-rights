// What the battle armor pages keep on the device: saved units under `battlearmor-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/battlearmor/record";
import type { BaRecord } from "../../rules/battlearmor/record";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type BaEntry = UnitEntry<BaRecord>;
export type BaStorage = UnitStorage<BaRecord>;

export const { download: downloadBa, open: openBaStorage } = unitStore({ kind: "battlearmor-unit", withDefaults, aUnit: "a battle armor unit", fileName: "battle-armor", extension: "battlearmor" });
