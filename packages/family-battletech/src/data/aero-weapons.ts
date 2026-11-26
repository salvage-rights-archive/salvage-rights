// BattleTech: AeroTech weapon tables, per edition, as overlays on the equipment catalog. The catalog (data/equipment) is the one weapon table:
// a figure that is the same in every edition is a field of the catalog row (`bayClass`, `tonsPerShot`, `by.aero`, `by.dropship`, `by.ship`). What an
// edition prints differently is a row here, keyed by catalog id, holding only the fields that differ from what lies beneath it: the catalog for
// AeroTech 2, and for AeroTech 2: Revised the catalog with the AeroTech 2 rows laid over it (Revised is layered on AeroTech 2, so its rows hold only
// what Revised changed, including a change back to the catalog's figure). A test fails if a field repeats the value beneath it. Every row names the
// printed page all its fields were read from (against the page image). Figures and identifiers only; nothing here is book text.
//
// Where a weapon is printed with an Artemis system the key is the weapon's id with "+artemis": the figures are for the pair, and a field it shares
// with the weapon alone is not repeated (the pair's tons are always its own, since they include the system). The current edition has no such pairs:
// its Artemis system is a catalog row of its own.
//
// Books: AeroTech 2 (FASA 1718, the 2000 printing), Inner Sphere and Clan Standard Weapons printed pp. 99-101 and Capital Weapons p. 101 (scan index
// = printed - 1); AeroTech 2: Revised Edition (FanPro 35011, 2004), Inner Sphere pp. 72-73, Clan pp. 74-75, Capital Weapons p. 75 (index = printed);
// AeroTech (FASA 1609, 1986), the Weapons Table printed p. 15 (index = printed). TechManual (corrected sixth printing) supplies the bay classes
// (Aerospace Weapon Classes, printed p. 352; the class names printed p. 194).
//
// The Capital Weapons tables of both AeroTech 2 books print what the catalog's capital rows already hold (heat, attack value at capital scale, range
// class, tons: the same in both books and in Total Warfare, archive note for conflict 151), so those rows have no overlay; only the ammunition per shot
// and the class names are new, and they are catalog fields. The Long Tom artillery piece (AeroTech 2: Revised pp. 72 and 74) has no catalog row: the
// catalog's Long Tom is the cannon, a different weight, and no TechManual or Total Warfare page names the artillery piece to date it.
//
// "attack" is the table's single Attack Value (a missile or autocannon value is for the whole weapon), kept as the book prints it ("25/20/10"
// for the heavy Gauss rifle). "maxRange" is the table's maximum range class. "ammoPerTon" is the Ammo per Ton column (Ammo (tons) in Revised).
import type { Catalog, AeroRange, EquipmentRow } from "../rules/catalog";

export interface AeroWeaponRow {
  /** The printed page of the edition's table that every field here was read from. */
  page: number;
  bayClass?: string;
  heat?: number;
  attack?: number | string;
  maxRange?: AeroRange;
  tons?: number;
  ammoPerTon?: number;
  note?: string;
}

/** The figures one edition uses for one item: the catalog's, with the edition's overlays laid over. */
export interface AeroWeaponFigures {
  id: string;
  bayClass?: string;
  heat?: number;
  attack?: number | string;
  maxRange?: AeroRange;
  /** AeroTech (1986) only: the hex ranges of its table (minimum, short, medium, long). */
  hexRange?: [number, number, number, number];
  tons?: number;
  ammoPerTon?: number;
  tonsPerShot?: number;
  note?: string;
}

export const AERO_WEAPON_EDITIONS = { at1: "aerotech-1986", at2: "aerotech2", at2r: "aerotech2-revised", current: "tw-tm-so" } as const;

/** AeroTech (1986), Weapons Table printed p. 15: the 17 catalog weapons it lists (the table's Particle Cannon is the PPC). Its figures are the catalog's own
 * hex figures, so there are no rows to overlay; the test checks them against the page. */
export const AT1_WEAPONS = {
  page: 15,
  ids: ["small-laser-is", "medium-laser-is", "large-laser-is", "ppc-is", "ac-2-is", "ac-5-is", "ac-10-is", "ac-20-is", "machine-gun-is", "flamer-is", "lrm-5-is", "lrm-10-is", "lrm-15-is", "lrm-20-is", "srm-2-is", "srm-4-is", "srm-6-is"],
};


/** The items AeroTech 2 lists (Inner Sphere, Clan and Capital Weapons tables, printed pp. 99-101), by catalog id. The Clan table prints one Capital table for both powers; the Inner Sphere-only items are the ones the catalog has an Inner Sphere row for. */
export const AT2_OFFERED: string[] = [
  "er-large-laser-is", "er-medium-laser-is", "er-small-laser-is", "flamer-is",
  "large-laser-is", "medium-laser-is", "small-laser-is", "ppc-is",
  "er-ppc-is", "large-pulse-laser-is", "medium-pulse-laser-is", "small-pulse-laser-is",
  "ams-is", "ac-2-is", "ac-5-is", "ac-10-is",
  "ac-20-is", "gauss-rifle-is", "light-gauss-rifle-is", "lb-2-x-ac-is",
  "lb-5-x-ac-is", "lb-10-x-ac-is", "lb-20-x-ac-is", "machine-gun-is",
  "ultra-ac-2-is", "ultra-ac-5-is", "ultra-ac-10-is", "ultra-ac-20-is",
  "lrm-5-is", "lrm-10-is", "lrm-15-is", "lrm-20-is",
  "lrm-5-is+artemis", "lrm-10-is+artemis", "lrm-15-is+artemis", "lrm-20-is+artemis",
  "mrm-10-is", "mrm-20-is", "mrm-30-is", "mrm-40-is",
  "narc-missile-beacon-is", "improved-narc-launcher-is", "srm-2-is", "srm-4-is",
  "srm-6-is", "srm-2-is+artemis", "srm-4-is+artemis", "srm-6-is+artemis",
  "streak-srm-2-is", "streak-srm-4-is", "streak-srm-6-is", "er-large-laser-clan",
  "er-medium-laser-clan", "er-small-laser-clan", "heavy-large-laser-clan", "heavy-medium-laser-clan",
  "heavy-small-laser-clan", "flamer-clan", "er-ppc-clan", "large-pulse-laser-clan",
  "medium-pulse-laser-clan", "small-pulse-laser-clan", "ams-clan", "gauss-rifle-clan",
  "lb-2-x-ac-clan", "lb-5-x-ac-clan", "lb-10-x-ac-clan", "lb-20-x-ac-clan",
  "machine-gun-clan", "ultra-ac-2-clan", "ultra-ac-5-clan", "ultra-ac-10-clan",
  "ultra-ac-20-clan", "atm-3-clan", "atm-6-clan", "atm-9-clan",
  "atm-12-clan", "lrm-5-clan", "lrm-10-clan", "lrm-15-clan",
  "lrm-20-clan", "lrm-5-clan+artemis", "lrm-10-clan+artemis", "lrm-15-clan+artemis",
  "lrm-20-clan+artemis", "narc-missile-beacon-clan", "srm-2-clan", "srm-4-clan",
  "srm-6-clan", "srm-2-clan+artemis", "srm-4-clan+artemis", "srm-6-clan+artemis",
  "streak-srm-2-clan", "streak-srm-4-clan", "streak-srm-6-clan", "nl-35-is",
  "nl-35-clan", "nl-45-is", "nl-45-clan", "nl-55-is",
  "nl-55-clan", "light-n-ppc-is", "light-n-ppc-clan", "medium-n-ppc-is",
  "medium-n-ppc-clan", "heavy-n-ppc-is", "heavy-n-ppc-clan", "nac-10-is",
  "nac-10-clan", "nac-20-is", "nac-20-clan", "nac-25-is",
  "nac-25-clan", "nac-30-is", "nac-30-clan", "nac-35-is",
  "nac-35-clan", "nac-40-is", "nac-40-clan", "light-n-gauss-is",
  "light-n-gauss-clan", "medium-n-gauss-is", "medium-n-gauss-clan", "heavy-n-gauss-is",
  "heavy-n-gauss-clan", "killer-whale-is", "killer-whale-clan", "white-shark-is",
  "white-shark-clan", "barracuda-is", "barracuda-clan", "ar-10-launcher-is",
  "ar-10-launcher-clan", "kraken-t-is", "killer-whale-t-is", "white-shark-t-is",
  "barracuda-t-is", "screen-launcher-is",
];

/** What AeroTech 2: Revised lists that AeroTech 2 does not (printed pp. 72-75). It drops nothing. */
export const AT2R_ADDED: string[] = [
  "arrow-iv-is", "thumper-artillery-is", "sniper-artillery-is", "heavy-gauss-rifle-is",
  "rotary-ac-2-is", "rotary-ac-5-is", "rocket-launcher-10-is", "rocket-launcher-15-is",
  "rocket-launcher-20-is", "tag-is", "beagle-active-probe-is", "guardian-ecm-suite-is",
  "er-micro-laser-clan", "micro-pulse-laser-clan", "light-machine-gun-clan", "heavy-machine-gun-clan",
  "arrow-iv-clan", "thumper-artillery-clan", "sniper-artillery-clan", "tag-clan",
  "light-tag-clan", "active-probe-clan", "light-active-probe-clan", "ecm-suite-clan",
];

/** AeroTech 2, printed pp. 99-101: the rows where it prints something the catalog does not. */
export const AT2_WEAPONS: Record<string, AeroWeaponRow> = {
  "ams-is": { page: 99, bayClass: "AMS", attack: 3, note: "Only against missiles (footnote, p. 99)." },
  "ultra-ac-10-is": { page: 99, maxRange: "Long" },
  "lrm-5-is+artemis": { page: 99, attack: 4, tons: 3 },
  "lrm-10-is+artemis": { page: 99, attack: 8, tons: 6 },
  "lrm-15-is+artemis": { page: 99, attack: 12, tons: 8 },
  "lrm-20-is+artemis": { page: 99, attack: 16, tons: 11 },
  "narc-missile-beacon-is": { page: 99, maxRange: "Short", note: "Works only against ground units (footnote)." },
  "improved-narc-launcher-is": { page: 99, maxRange: "Medium", ammoPerTon: 3 },
  "srm-4-is": { page: 99, attack: 6 },
  "srm-2-is+artemis": { page: 99, attack: 4, tons: 2 },
  "srm-4-is+artemis": { page: 100, attack: 12, tons: 3 },
  "srm-6-is+artemis": { page: 100, attack: 1, tons: 4, note: "Printed 1: an evident misprint (the same row in AeroTech 2 Revised reads 8); kept as printed. Conflict 53." },
  "heavy-large-laser-clan": { page: 100, maxRange: "Long" },
  "heavy-medium-laser-clan": { page: 100, maxRange: "Medium" },
  "flamer-clan": { page: 100, heat: 2 },
  "ams-clan": { page: 100, bayClass: "AMS", attack: 5, note: "Only against missiles (footnote, p. 100)." },
  "lb-2-x-ac-clan": { page: 100, attack: 1 },
  "atm-6-clan": { page: 100, attack: 8 },
  "lrm-5-clan+artemis": { page: 100, attack: 4, tons: 2 },
  "lrm-10-clan+artemis": { page: 100, attack: 8, tons: 3.5 },
  "lrm-15-clan+artemis": { page: 100, attack: 12, tons: 4.5 },
  "lrm-20-clan+artemis": { page: 100, attack: 16, tons: 6 },
  "srm-4-clan": { page: 101, attack: 6 },
  "srm-2-clan+artemis": { page: 101, attack: 4, tons: 1.5 },
  "srm-4-clan+artemis": { page: 101, attack: 6, tons: 2 },
  "srm-6-clan+artemis": { page: 101, attack: 10, tons: 2.5 },
  "ar-10-launcher-is": { page: 101, bayClass: "AR10" },
  "ar-10-launcher-clan": { page: 101, bayClass: "AR10" },
  "screen-launcher-is": { page: 101, bayClass: "Screen" },
};

/** AeroTech 2: Revised Edition, printed pp. 72-75: the rows where it prints something other than the catalog with AeroTech 2 beneath it. */
export const AT2R_WEAPONS: Record<string, AeroWeaponRow> = {
  "arrow-iv-is": { page: 72, bayClass: "Artillery", attack: 20, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "thumper-artillery-is": { page: 72, bayClass: "Artillery", attack: 5, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "sniper-artillery-is": { page: 72, bayClass: "Artillery", attack: 10, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "ultra-ac-10-is": { page: 72, maxRange: "Medium" },
  "rocket-launcher-10-is": { page: 73, heat: 0 },
  "rocket-launcher-15-is": { page: 73, heat: 0 },
  "rocket-launcher-20-is": { page: 73, heat: 0 },
  "srm-2-is+artemis": { page: 73, attack: 2 },
  "srm-4-is+artemis": { page: 73, attack: 6 },
  "srm-6-is+artemis": { page: 73, attack: 8 },
  "tag-is": { page: 73, bayClass: "Point Defense", attack: 0, maxRange: "Medium" },
  "beagle-active-probe-is": { page: 73, bayClass: "Point Defense", attack: 0 },
  "guardian-ecm-suite-is": { page: 73, bayClass: "Point Defense", attack: 0 },
  "arrow-iv-clan": { page: 74, bayClass: "Artillery", attack: 20, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "thumper-artillery-clan": { page: 74, bayClass: "Artillery", attack: 5, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "sniper-artillery-clan": { page: 74, bayClass: "Artillery", attack: 10, maxRange: "Extreme", note: "DropShips only, fired only while grounded against ground targets (footnote)." },
  "srm-2-clan+artemis": { page: 74, attack: 2 },
  "srm-6-clan+artemis": { page: 74, attack: 8, tons: 4, note: "Printed 4 tons; the weapon and the Artemis system come to 2.5, which AeroTech 2 prints. Conflict 54." },
  "tag-clan": { page: 75, bayClass: "Point Defense", attack: 0, maxRange: "Medium" },
  "light-tag-clan": { page: 75, bayClass: "Point Defense", attack: 0, maxRange: "Short" },
  "active-probe-clan": { page: 75, bayClass: "Point Defense", attack: 0 },
  "light-active-probe-clan": { page: 75, bayClass: "Point Defense", attack: 0 },
  "ecm-suite-clan": { page: 75, bayClass: "Point Defense", attack: 0 },
};

/** Fields the overlays may hold (everything but the page and the note). */
export const OVERLAY_FIELDS = ["bayClass", "heat", "attack", "maxRange", "tons", "ammoPerTon"] as const;

const AERO_UNITS = ["aero", "smallcraft", "dropship", "ship"] as const;
const normal = (damage: string | undefined): number | string | undefined => {
  if (damage === undefined) return undefined;
  const text = /^[0-9.]+-C$/.test(damage) ? damage.slice(0, -2) : damage;
  return /^[0-9.]+$/.test(text) ? Number(text) : text;
};

/** The ammunition row of a weapon, by the catalog's naming ("ammo-" and the weapon's id, the LB-X family without its "-ac"). */
export function ammoRowOf(catalog: Catalog, id: string): EquipmentRow | undefined {
  const base = id.replace(/\+artemis$/, "");
  return catalog.byId(`ammo-${base}`) ?? catalog.byId(`ammo-${base.replace(/-ac-(is|clan)$/, "-$1")}`);
}

/** The catalog's own figures for an item, as the current edition uses them: `by.aero`, then `by.dropship` and `by.ship` (the capital rows), then the ground figures. */
export function aeroCatalogFigures(catalog: Catalog, id: string): AeroWeaponFigures | undefined {
  const row = catalog.byId(id);
  if (!row) return undefined;
  const by = row.by?.aero ?? row.by?.dropship ?? row.by?.ship;
  const ammo = ammoRowOf(catalog, id);
  const figures: AeroWeaponFigures = { id };
  if (row.bayClass !== undefined) figures.bayClass = row.bayClass;
  const heat = by?.heat ?? row.heat;
  if (heat !== undefined) figures.heat = heat;
  const attack = normal(by?.damage ?? row.damage);
  if (attack !== undefined) figures.attack = attack;
  if (by?.rangeClass !== undefined) figures.maxRange = by.rangeClass;
  const tons = by?.tons ?? row.tons;
  if (typeof tons === "number") figures.tons = tons;
  const shots = ammo?.shotsPerTon ?? ammo?.shots;
  if (shots !== undefined) figures.ammoPerTon = shots;
  if (row.tonsPerShot !== undefined) figures.tonsPerShot = row.tonsPerShot;
  return figures;
}

const layer = (figures: AeroWeaponFigures, row: AeroWeaponRow | undefined): AeroWeaponFigures => {
  if (!row) return figures;
  const fields: Partial<AeroWeaponRow> = { ...row };
  delete fields.page;
  return { ...figures, ...fields };
};

/** Whether an edition lists the item. AeroTech (1986) lists 17 weapons and BattleSpace (Fire Factors, a later piece) none yet. */
export function aeroWeaponOffered(editionId: string, id: string): boolean {
  switch (editionId) {
    case AERO_WEAPON_EDITIONS.at1:
      return AT1_WEAPONS.ids.includes(id);
    case AERO_WEAPON_EDITIONS.at2:
      return AT2_OFFERED.includes(id);
    case AERO_WEAPON_EDITIONS.at2r:
      return AT2_OFFERED.includes(id) || AT2R_ADDED.includes(id);
    case AERO_WEAPON_EDITIONS.current:
      return !id.includes("+");
    default:
      return false;
  }
}

/** The figures an edition uses for an item: AeroTech 2 Revised is the catalog with the AeroTech 2 rows and then its own laid over; AeroTech 2 the catalog with
 * its rows; the current edition the catalog (`by.aero`, else the capital columns, else the ground figures); AeroTech (1986) the ground figures of its 17
 * weapons (hex ranges, damage, shots a ton). Undefined for an item the edition does not list, an id the catalog lacks, or an edition without a table yet. */
export function aeroWeaponFigures(catalog: Catalog, id: string, editionId: string): AeroWeaponFigures | undefined {
  if (!aeroWeaponOffered(editionId, id)) return undefined;
  const base = aeroCatalogFigures(catalog, id.replace(/\+artemis$/, ""));
  const row = catalog.byId(id.replace(/\+artemis$/, ""));
  if (!base || !row) return undefined;
  const own = { ...base, id };
  if (editionId === AERO_WEAPON_EDITIONS.at1) {
    const figures: AeroWeaponFigures = { id };
    if (row.heat !== undefined) figures.heat = row.heat;
    if (row.damage !== undefined) figures.attack = row.damage;
    if (row.range) figures.hexRange = row.range;
    if (typeof row.tons === "number") figures.tons = row.tons;
    if (own.ammoPerTon !== undefined) figures.ammoPerTon = own.ammoPerTon;
    return figures;
  }
  if (editionId === AERO_WEAPON_EDITIONS.current) return (row.units ?? []).some((u) => (AERO_UNITS as readonly string[]).includes(u)) ? own : undefined;
  const at2 = layer(own, AT2_WEAPONS[id]);
  return editionId === AERO_WEAPON_EDITIONS.at2 ? at2 : layer(at2, AT2R_WEAPONS[id]);
}
