// A ProtoMech's Running MP (TechManual p. 83, p. 85). Kept apart from build.ts so the option rules (options.ts) and the construction arithmetic (build.ts) can both use it.
import { PROTO_MOVE } from "../../data/protomech";
import { tidy } from "../walk";
import type { ProtoRecord } from "./record";

/** Running MP without the booster: Walking MP x 1.5, rounded up (p. 83). */
export const plainRun = (walk: number): number => Math.ceil(tidy(walk * PROTO_MOVE.runFactor));
/** Running MP as the sheet prints it first: with the booster, twice the Walking MP. */
export const runMP = (record: Pick<ProtoRecord, "walk" | "booster">): number => (record.booster ? record.walk * PROTO_MOVE.boostedRunFactor : plainRun(record.walk));
