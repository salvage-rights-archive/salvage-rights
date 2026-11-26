// A ProtoMech's chassis (data/protomech.ts: biped, quad, glider) and weight class (Ultraheavy from 10 tons), read from a record. A chassis this version does not know is read as a biped
// (the rules check reports it), so nothing here throws. Kept apart from build.ts and options.ts so both can use it.
import { PROTO_CONFIGS, PROTO_WEIGHT } from "../../data/protomech";
import type { ProtoConfig, ProtoLimitRows } from "../../data/protomech";
import { PROTO_LIMITS } from "../../data/protomech";
import { own } from "../walk";
import type { ProtoRecord } from "./record";

type Chassis = Pick<ProtoRecord, "configuration">;

/** The chassis the record names, or undefined for a name we do not know. */
export const configOf = (record: Chassis): ProtoConfig | undefined => own(PROTO_CONFIGS, record.configuration ?? "biped");
export const isGlider = (record: Chassis): boolean => record.configuration === "glider";
export const isQuad = (record: Chassis): boolean => record.configuration === "quad";
/** Ultraheavy from 10 tons, on any chassis (IO:AE p. 94). */
export const isUltra = (record: Pick<ProtoRecord, "tons">): boolean => record.tons >= PROTO_WEIGHT.ultraFrom;

/** The columns of the location restrictions tables: the standard biped's (TechManual p. 87) and the expanded ones (IO:AE p. 95). A glider takes the Ultra (Biped) column at any weight. */
export function limitRows(record: Chassis & Pick<ProtoRecord, "tons">): ProtoLimitRows {
  const { kinds } = PROTO_LIMITS.expanded;
  if (isQuad(record)) return isUltra(record) ? kinds.ultraQuad : kinds.quad;
  return isGlider(record) || isUltra(record) ? kinds.ultra : PROTO_LIMITS.rows;
}

/** What the WiGE (glider) or Running MP stands for on the sheet and in the editor. */
export const speedLabels = (record: Chassis): { walk: string; run: string } => (isGlider(record) ? { walk: "WiGE Cruising MP", run: "WiGE Flanking MP" } : { walk: "Walking MP", run: "Running MP" });
