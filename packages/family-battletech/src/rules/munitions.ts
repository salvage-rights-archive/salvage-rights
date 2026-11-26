// The munition a player chooses for a mine dispenser or a vehicular grenade launcher (Tactical Operations: Advanced Units and Equipment printed pp. 137 and 175-179). The book
// treats a mine as an ammunition type, not an item: a dispenser holds two shots of one type and takes no mine ammunition bins (p. 137), and a vehicular grenade launcher fires
// the type named before play, fragmentation if none is named (p. 175). So the choice is stored on the mount (`munition`, a catalog row id) and the catalog rows that name it
// (`choiceFor`) are never mounted. Nothing here throws: an id the catalog does not know reads as the default choice, and the mount keeps it as it was.
import { MINEFIELD_BV } from "../data/bv";
import { MINE_PRICE } from "../data/cost";
import type { UnitId } from "../data/units";
import type { Catalog, EquipmentRow } from "./catalog";

/** A choice row as the availability functions read an item of the unit type: they take only rows an item may be mounted as, and a choice is not one. */
export function asEquipment(row: EquipmentRow, unit: UnitId): EquipmentRow {
  const copy: EquipmentRow = { ...row, units: [unit] };
  delete copy.choiceFor;
  return copy;
}

/** The id of a row without its tech base suffix. */
export const stemOf = (id: string): string => id.replace(/-(is|clan)$/, "");

/** What a dispenser or launcher fires when no type is named: a standard mine, a space mine for the space dispenser (the only type it takes), a fragmentation grenade (TO:AUE p. 175). */
const DEFAULT_CHOICE: Record<string, string> = {
  "ba-heavy-grenade-launcher": "",
  "ba-micro-grenade-launcher": "",
  "vehicular-mine-dispenser": "mine-standard",
  "ba-mine-dispenser": "mine-standard",
  "space-mine-dispenser": "mine-space",
  "vehicular-grenade-launcher": "grenade-fragmentation",
};

/** The munitions that may be chosen for an item, in the catalog's order: the rows of the item's tech base that name its stem. Empty for an item with no choice. */
export function choicesFor(host: EquipmentRow | undefined, catalog: Catalog, editionId: string): EquipmentRow[] {
  if (host === undefined) return [];
  const stem = stemOf(host.id);
  return catalog
    .all()
    .filter((r) => r.choiceFor?.includes(stem) === true && r.techBase === host.techBase)
    .map((r) => catalog.rowFor(r.id, editionId) ?? r);
}

/** The munition in force on a mount: the one it names, or the default when it names none or one the catalog does not offer for the item. Undefined for an item with no choice. */
export function chosenMunition(host: EquipmentRow | undefined, id: string | undefined, catalog: Catalog, editionId: string): EquipmentRow | undefined {
  const choices = choicesFor(host, catalog, editionId);
  const stem = host === undefined ? undefined : DEFAULT_CHOICE[stemOf(host.id)];
  const side = host?.techBase === "clan" ? "clan" : "is";
  // A battle armor grenade launcher fires its ordinary load unless a type is named, so it has no default type.
  if (stem === "") return choices.find((c) => c.id === id);
  return choices.find((c) => c.id === id) ?? choices.find((c) => c.id === `${stem ?? ""}-${side}`) ?? choices[0];
}

/** The id a new mount of the item starts with, or undefined when the item has no choice. */
export const defaultMunitionId = (host: EquipmentRow | undefined, catalog: Catalog, editionId: string): string | undefined => chosenMunition(host, undefined, catalog, editionId)?.id;

/** The choices a unit is offered: those `offered` accepts, and the one in force so a selector never blanks (hide, do not mark). */
export function offeredChoices(host: EquipmentRow | undefined, catalog: Catalog, editionId: string, current: string | undefined, offered: (row: EquipmentRow) => boolean): EquipmentRow[] {
  const keep = chosenMunition(host, current, catalog, editionId)?.id;
  return choicesFor(host, catalog, editionId).filter((c) => c.id === keep || offered(c));
}

/** A munition's name for the sheet and the lists: without "Mine" or "Grenade", `EMP (Vibrabomb)`, `Active`, `Smoke`. */
export const munitionShort = (row: EquipmentRow): string => row.name.replace(/ (Mine|Grenade)\b/, "");

/** An item's name with the type chosen for it: `Mine Dispenser (Vehicular), Active`. The item's own name where it has no choice. */
export function nameWithMunition(name: string, host: EquipmentRow | undefined, id: string | undefined, catalog: Catalog, editionId: string): string {
  const chosen = chosenMunition(host, id, catalog, editionId);
  return chosen === undefined ? name : `${name}, ${munitionShort(chosen)}`;
}

/** A mine dispenser's Battle Value for the mine type: that of a 10-point minefield of it (TO:AUE p. 195, note P), from the Minefield BV Table (p. 197): per 5 points, or per hex for
 * an EMP mine. Undefined for a munition that is not a mine. */
export function dispenserBv(choice: EquipmentRow | undefined): number | undefined {
  if (choice === undefined) return undefined;
  const stem = stemOf(choice.id);
  const perHex = Object.hasOwn(MINEFIELD_BV.perHex, stem) ? MINEFIELD_BV.perHex[stem] : undefined;
  if (perHex !== undefined) return perHex;
  const perFive = Object.hasOwn(MINEFIELD_BV.perFivePoints, stem) ? MINEFIELD_BV.perFivePoints[stem] : undefined;
  return perFive === undefined ? undefined : (perFive * MINEFIELD_BV.dispenser.pointsPerShot) / 5;
}

/** What a grenade type adds to its launcher's Battle Value: the type's modifier times the launcher's own (TO:AUE p. 198), 0 for a type that prints none. */
export function grenadeExtraBv(choice: EquipmentRow | undefined, launcherBv: number): number {
  const stem = choice === undefined ? undefined : stemOf(choice.id);
  const modifier = stem !== undefined && Object.hasOwn(MINEFIELD_BV.grenadeModifier, stem) ? MINEFIELD_BV.grenadeModifier[stem] : undefined;
  return modifier === undefined ? 0 : modifier * launcherBv;
}

/** The Battle Value of an item once its munition is known: the dispenser's by mine type; `base` for any other item. A grenade's addition is not the launcher's: it is added to the unit's base
 * BV at the Alternative Munitions step (TO:AUE p. 198, book panel), so `grenadeExtraBv` is summed by the unit. */
export function bvWithMunition(choice: EquipmentRow | undefined, base: number | undefined): number | undefined {
  return dispenserBv(choice) ?? base;
}

/** What the dispenser's two shots of the mine cost to replace: the type's price for each 5 points, for the shots at 10 points each. Not part of the unit's cost (TechManual p. 282). */
export function reloadCost(choice: EquipmentRow | undefined): number | undefined {
  if (choice === undefined) return undefined;
  const stem = stemOf(choice.id);
  const per5 = Object.hasOwn(MINE_PRICE.per5Points, stem) ? MINE_PRICE.per5Points[stem] : undefined;
  return per5 === undefined ? undefined : (per5 * MINEFIELD_BV.dispenser.shots * MINEFIELD_BV.dispenser.pointsPerShot) / 5;
}
