// What vehicles and fighters share of the advanced armor rules (TO:AUE pp. 92-94 and 192): modular armor is an item (10 points, its penalties) and vehicular stealth armor
// wants an ECM suite and makes heat. Pure functions over a list of mounts, so both record kinds use them.
import { MODULAR_ARMOR, VEHICULAR_STEALTH } from "../data/chassis";
import { stemOf } from "./walk";

interface Held {
  equipmentId: string | null;
}

export const isModularArmor = (id: string | null): boolean => id !== null && stemOf(id) === MODULAR_ARMOR.stem;

/** The modular armor items on the unit. */
export const modularItems = <T extends Held>(mounts: T[]): T[] => mounts.filter((m) => isModularArmor(m.equipmentId));

/** The armor points the unit's modular armor adds. */
export const modularPoints = (mounts: Held[]): number => modularItems(mounts).length * MODULAR_ARMOR.pointsEach;

/** Whether any mount is an ECM suite that vehicular stealth armor accepts (a Guardian, Angel or Clan ECM, or the Watchdog CEWS). */
export const hasStealthEcm = (mounts: Held[]): boolean => mounts.some((m) => VEHICULAR_STEALTH.ecm.test(m.equipmentId ?? ""));

/** The places holding more than one modular armor item (the book allows one to a location). `place` reads where a mount sits. */
export function crowdedModular<T extends Held>(mounts: T[], place: (m: T) => string): string[] {
  const seen = new Map<string, number>();
  for (const m of modularItems(mounts)) seen.set(place(m), (seen.get(place(m)) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([where]) => where);
}
