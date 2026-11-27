// Automatic Clan CASE (TechManual printed p.210: "units built with a Clan internal structure ... are presumed to incorporate CASE
// automatically in all locations that store ammunition or explosive equipment"; priced 50,000 on p.292; the Battle Value footnote
// on p.303 assumes it for a Clan 'Mech). Owner ruling 2026-11-25: Clan CASE belongs only to a Clan internal structure, where it is
// automatic, or to a FrankenMech on Clan parts. An engine alone grants nothing. Pure functions over the record; they never throw.
import { STRUCTURE_TYPES } from "../data/chassis";
import { COOLANT_POD_IDS, EQUIPMENT_BV, WEAPON_BV } from "../data/bv";
import type { Item } from "./walk";
import { own } from "./walk";
import type { LocationCode, MechRecord } from "./mech";

/** The explicit Clan CASE row. (CASE II is a different piece of equipment and is not meant here.) */
export const CLAN_CASE_IDS = ["case-clan"];
const FUEL_TANK_IDS = ["extended-fuel-tank-is", "extended-fuel-tank-clan"];
const GAUSS_IDS = new Set([...WEAPON_BV, ...EQUIPMENT_BV].flatMap((g) => g.rows.filter((r) => r[3]?.gauss || r[3]?.gaussSlots).map((r) => r[0])));

/** True when the record's internal structure is Clan: every part of a Clan record, and on a mixed record a structure type printed for the Clan
 * only (Clan endo steel). A standard structure on a mixed record is read as Inner Sphere unless the record says otherwise
 * (`chassis.structureTech`, kept by the Mordel import; owner ruling 2026-11-26). */
export function clanStructure(record: Pick<MechRecord, "techBase"> & { chassis?: Pick<MechRecord["chassis"], "structure" | "structureTech"> }): boolean {
  if (record.techBase === "clan") return true;
  if (record.techBase !== "mixed") return false;
  const printed = own(STRUCTURE_TYPES.types, record.chassis?.structure ?? "")?.techBase;
  if (printed !== undefined) return printed === "clan"; // a type printed for one base (endo steel) keeps it; a stale structureTech is ignored
  return record.chassis?.structureTech === "clan"; // a standard structure: the base the import read for it
}

/** True when a Clan CASE mount may be on this record. FrankenMech hook: a FrankenMech may carry it only where the CASE sits on Clan parts,
 * but FrankenMech parts have no tech base of their own yet (CO p.213; `record.frankenmech` holds donors by tonnage only). Until they do, a
 * FrankenMech is not refused here, so no false finding is raised; replace this line with the per-location test when the donors carry a base. */
export function clanCaseAllowed(record: Pick<MechRecord, "techBase" | "frankenmech"> & { chassis?: Pick<MechRecord["chassis"], "structure" | "structureTech"> }): boolean {
  return clanStructure(record) || record.frankenmech !== undefined;
}

/** The locations that hold ammunition or explosive equipment (Gauss weapons, fuel tanks, coolant pods). */
export function explosiveLocations(items: Item[]): LocationCode[] {
  const found = new Set<LocationCode>();
  for (const { mount, row } of items) {
    if (mount.location === null) continue;
    if (row.kind === "ammunition" || GAUSS_IDS.has(row.id) || FUEL_TANK_IDS.includes(row.id) || COOLANT_POD_IDS.includes(row.id)) found.add(mount.location);
  }
  return [...found];
}
