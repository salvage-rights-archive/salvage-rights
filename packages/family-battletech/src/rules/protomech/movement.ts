// A ProtoMech's Running MP (TechManual p. 83, p. 85). Kept apart from build.ts so the option rules (options.ts) and the construction arithmetic (build.ts) can both use it.
import { PROTO_MOVE } from "../../data/protomech";
import { tidy } from "../walk";
import { isGlider } from "./config";
import type { ProtoRecord } from "./record";

/** Running MP without the booster: Walking MP x 1.5, rounded up (p. 83). For a glider the same figure is its WiGE Flanking MP (IO:AE p. 95). */
export const plainRun = (walk: number): number => Math.ceil(tidy(walk * PROTO_MOVE.runFactor));
/** Running MP as the sheet prints it first: with the booster, twice the Walking MP. A glider may have no booster, so its figure is its WiGE Flanking MP. */
export const runMP = (record: Pick<ProtoRecord, "walk" | "booster" | "configuration">): number => (record.booster && !isGlider(record) ? record.walk * PROTO_MOVE.boostedRunFactor : plainRun(record.walk));
