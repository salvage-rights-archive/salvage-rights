// What the ProtoMech pages keep on the device: saved units under `protomech-unit:` in the family store, and the unit file (see ../unitStorage.ts).
import { withDefaults } from "../../rules/protomech/record";
import type { ProtoRecord } from "../../rules/protomech/record";
import { unitStore } from "../unitStorage";
import type { UnitEntry, UnitStorage } from "../unitStorage";

export type ProtoEntry = UnitEntry<ProtoRecord>;
export type ProtoStorage = UnitStorage<ProtoRecord>;

export const { download: downloadProto, open: openProtoStorage } = unitStore({ kind: "protomech-unit", withDefaults, aUnit: "a ProtoMech", fileName: "protomech", extension: "protomech" });
