// What a small craft, DropShip or capital ship record sheet prints, worked out once from the record: the data block, the weapon bays by arc with the
// attack value at each range bracket, the armor of each facing with its Damage Threshold, the heat of each arc, the crew and the transport figures.
// Pure; a figure we cannot work out is an empty string, never a made-up one, and nothing throws on a record it does not understand.
import { aeroLocationName, capitalScale, heatByArc, isCapitalRow, jumpSail, kfDrive, locationsOf, stationKeeping, vessel } from "../../../rules/aero";
import type { AeroMount, AeroRecord } from "../../../rules/aero";
import { aeroCatalogFigures, aeroWeaponFigures } from "../../../data/aero-weapons";
import { VESSEL_LABELS } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import type { Catalog } from "../../../rules/catalog";
import { tidy } from "../../../rules/walk";
import { fighterFacts, lineOf } from "./facts";
import type { ArmorArea, FighterFacts, WeaponLine } from "./facts";

/** Bay lines the sheet's inventory has room for. */
export const MAX_BAY_LINES = 18;

export interface VesselFacts extends FighterFacts {
  /** The unit's shape and use as the sheet says them ("Aerodyne", "Military"); empty where the type has none. */
  shape: string;
  use: string;
  capital: boolean;
  /** A line each: label and value, for the data block. */
  data: [label: string, value: string][];
  /** Heat each arc makes when all its weapons fire. */
  heatByArc: { arc: string; name: string; heat: number }[];
  /** The crew figures: the number on the unit, the least the book asks, and the bays that carry units. */
  crew: { have: string; least: string };
  /** The people the unit carries in quarters, by class. */
  passengers: string;
  /** Escape pods and lifeboats on the unit. */
  pods: string;
  /** The unit moves by a station-keeping drive: its Safe Thrust line reads "Station-keeping only". */
  stationKeeping: boolean;
  /** Whether the diagram is capital scale. */
  scale: "Standard Scale" | "Capital Scale";
}

const text = (n: number | string | undefined | null): string => (n === undefined || n === null ? "" : String(tidy(Number(n))));
const FIGHTER_BAYS = new Set(["fighter", "small-craft"]);

/** The weapon bays as inventory lines: one line for each named bay and, for weapons in no named bay, one for each class in an arc (the book splits an arc's weapons by class). */
export function bayLines(record: AeroRecord, catalog: Catalog): WeaponLine[] {
  const isAmmo = (m: AeroMount) => (m.equipmentId !== null && catalog.byId(m.equipmentId)?.kind === "ammunition") || (m.equipmentId ?? "").startsWith("ammo-");
  const groups = new Map<string, { label: string; arcs: Set<string>; mounts: AeroMount[] }>();
  for (const mount of record.mounts) {
    const row = mount.equipmentId === null ? undefined : catalog.byId(mount.equipmentId);
    if (isAmmo(mount) || (row !== undefined && row.kind !== "weapon")) continue;
    const figures = mount.equipmentId === null ? undefined : (aeroWeaponFigures(catalog, mount.equipmentId, record.editionId) ?? aeroCatalogFigures(catalog, mount.equipmentId));
    const bayClass = figures?.bayClass ?? row?.bayClass ?? "";
    const key = mount.bay !== undefined && mount.bay !== "" ? `bay:${mount.bay}` : `${mount.arc}|${bayClass}`;
    const label = mount.bay !== undefined && mount.bay !== "" ? mount.bay : bayClass === "" ? mount.name : bayClass;
    const group = groups.get(key) ?? { label, arcs: new Set<string>(), mounts: [] };
    group.arcs.add(mount.arc);
    group.mounts.push(mount);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    // Each weapon's own scale decides (the "-C" mark): a figure the catalog prints at capital scale counts tenfold in standard points, a capital missile's
    // (stored at standard scale, "40" for a Killer Whale) as it is. A bay of capital weapons prints in capital points with a C.
    const lines = group.mounts.map((m) => {
      const row = m.equipmentId === null ? undefined : catalog.byId(m.equipmentId);
      return { line: lineOf(m, record, catalog, 1), capitalFigure: capitalScale(row), capitalWeapon: isCapitalRow(row) };
    });
    const capitalBay = lines.every((l) => l.capitalWeapon);
    const totals = [0, 1, 2, 3].map((band) => {
      let standard = 0;
      for (const { line, capitalFigure } of lines) {
        const value = Number(line.av[band]);
        if (Number.isFinite(value) && line.av[band] !== "") standard += capitalFigure ? value * 10 : value;
      }
      return capitalBay ? standard / 10 : standard;
    });
    const shown = totals.map((n, band) => (lines.some((l) => l.line.av[band] !== "") ? `${text(n)}${capitalBay ? "C" : ""}` : "")) as WeaponLine["av"];
    const names = [...new Set(group.mounts.map((m) => m.name))];
    return {
      qty: group.mounts.length,
      name: `${group.label}: ${names.join(", ")}`,
      loc: [...group.arcs].map(aeroLocationName).join(", "),
      heat: text(lines.reduce((sum, l) => sum + (Number(l.line.heat) || 0), 0)),
      av: shown,
      damage: "",
      hexes: "",
    };
  });
}

export function vesselFacts(record: AeroRecord, catalog: Catalog, profile: SheetProfile): VesselFacts {
  const base = fighterFacts(record, catalog, profile);
  const v = vessel(record, catalog);
  const known = locationsOf(record).armor;
  const capital = v?.group === "capital";
  const kept = stationKeeping(record);
  const armor: ArmorArea[] = known.map((code) => {
    const points = record.armor.points[code] ?? 0;
    return { code, name: aeroLocationName(code), points, threshold: Math.ceil(points / 10) };
  });
  const stray = Object.entries(record.armor.points).filter(([code, n]) => !known.includes(code) && n !== 0).map(([code, points]) => ({ code, points }));
  const bays = record.bays ?? [];
  const carried = bays.filter((b) => FIGHTER_BAYS.has(b.kind)).reduce((sum, b) => sum + b.capacity, 0);
  const kf = kfDrive(record);
  const sail = jumpSail(record);
  const collars = record.systems?.["docking-hardpoint"] ?? 0;
  const people = Object.entries(record.quarters ?? {}).reduce((sum, [, n]) => sum + n, 0);
  const pods = record.mounts.filter((m) => /escape-pod|lifeboat/.test(m.equipmentId ?? "")).length;
  const shape = record.unitType === "small-craft" || record.unitType === "dropship" ? (record.shape === "spheroid" ? "Spheroid" : "Aerodyne") : "";
  const use = record.unitType === "dropship" ? (record.use === "military" ? "Military" : "Civilian") : "";
  const data: [string, string][] = [
    ["Structural Integrity", text(v?.si)],
    ["Fuel points", text(v?.fuelPoints)],
    ...(carried > 0 ? ([["Fighters/Small craft", text(carried)]] as [string, string][]) : []),
    ...(v?.doors ? ([["Launch rate", text(v.doors.launchRate)], ["Bay doors", text(v.doors.doors)]] as [string, string][]) : []),
    ...(kf ? ([["K-F Drive Integrity", text(kf.integrity)]] as [string, string][]) : []),
    ...(sail ? ([["Sail Integrity", text(sail.integrity)]] as [string, string][]) : []),
    ...(collars > 0 ? ([["Docking collars", text(collars)]] as [string, string][]) : []),
  ];
  const crew = v?.crew;
  return {
    ...base,
    typeLabel: VESSEL_LABELS[record.unitType] ?? profile.title.replace(" record sheet", ""),
    safe: kept ? "Station-keeping only" : text(record.thrust.safe),
    max: text(v?.maxThrust),
    si: text(v?.si),
    fuel: text(v?.fuelPoints),
    armor,
    strayArmor: stray,
    armorTotal: armor.reduce((sum, a) => sum + a.points, 0) + stray.reduce((sum, a) => sum + a.points, 0),
    weapons: bayLines(record, catalog),
    sinks: (() => {
      const heat = v?.heat;
      const sinkType = base.sinks.type;
      const total = heat?.total ?? 0;
      const capacity = heat?.capacity ?? 0;
      return { count: total, total, capacity, type: sinkType, line: `${sinkType} heat sinks: ${String(total)} (${String(capacity)})` };
    })(),
    shape,
    use,
    capital,
    data,
    heatByArc: heatByArc(record, catalog),
    stationKeeping: kept,
    crew: { have: record.crew === undefined ? "" : text(record.crew), least: crew ? text(crew.minimum) : "" },
    passengers: people > 0 ? text(people) : "",
    pods: pods > 0 ? text(pods) : "",
    scale: capital ? "Capital Scale" : "Standard Scale",
  };
}
