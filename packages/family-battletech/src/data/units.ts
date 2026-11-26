// The unit types an equipment row may name in its `units`. The first five ids are the ones in data/editions.ts; the rest are
// the unit types the books also print equipment for. A row with no `units` is for a BattleMech and an IndustrialMech.
export const UNIT_TYPES = {
  mech: "BattleMech",
  industrialmech: "IndustrialMech",
  vehicle: "Vehicle (combat, support, OmniVehicle)",
  protomech: "ProtoMech",
  infantry: "Infantry",
  battlearmor: "Battle armor",
  aero: "Aerospace fighter and conventional fighter",
  smallcraft: "Small craft",
  dropship: "DropShip",
  ship: "JumpShip, WarShip and space station",
  building: "Building and other fixed structure",
  abomination: "Abomination (BattleTech: Gothic)",
} as const;
export type UnitId = keyof typeof UNIT_TYPES;
/** What a row with no `units` field is for. */
export const DEFAULT_UNITS: readonly UnitId[] = ["mech", "industrialmech"];
