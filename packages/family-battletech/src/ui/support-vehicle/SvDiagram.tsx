// The armor and structure diagram of a Support Vehicle: the ground, naval and VTOL units use the combat vehicle's paper doll (a hull from above, the sides split on a
// Large ground unit); an airship or a fixed-wing unit is drawn as the aerospace fighter's sheet draws one (nose, wings and aft, with the structural integrity boxes).
// With `onSelect` each location of a ground unit is a button; an air unit's drawing is one labelled image.
import type { SheetProfile } from "../../data/aero-sheet";
import { armorLocations, isAir, structuralIntegrity, structurePoints, svLocationName } from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import ArmorDiagram from "../aero/sheet/Diagram";
import VehicleDiagram from "../vehicle/VehicleDiagram";

/** The doll's hull for the unit: the motive type, a hydrofoil or submersible naval chassis its own. */
export function hullOf(record: Pick<SupportVehicleRecord, "motive" | "structure">): string {
  if (record.motive !== "naval") return record.motive;
  return record.structure.mods.includes("submersible") ? "submarine" : record.structure.mods.includes("hydrofoil") ? "hydrofoil" : "naval";
}

/** The fighter diagram reads only the layout and whether thresholds are printed (not for a Support Vehicle). */
const AIR_PROFILE = { layout: "current", thresholds: false } as unknown as SheetProfile;
const AIR_CODES: Record<string, string> = { f: "NO", l: "LW", r: "RW", b: "AF" };

export interface SvDiagramProps {
  record: SupportVehicleRecord;
  use: "armor" | "structure";
  onSelect?: (code: string) => void;
  selected?: string;
  label?: string;
  ink?: string;
  /** Where to draw it inside a larger drawing (the sheet). */
  rect?: { x: number; y: number; w: number; h: number };
}

export default function SvDiagram({ record, use, onSelect, selected, label, ink, rect }: SvDiagramProps) {
  const locations = armorLocations(record).map((code) => ({ code, name: svLocationName(code, record), armor: record.armor.points[code] ?? 0, structure: structurePoints(record) }));
  if (isAir(record)) {
    const areas = locations.map((l) => ({ code: AIR_CODES[l.code] ?? l.code, name: l.name, points: l.armor, threshold: 0 }));
    const drawing = <ArmorDiagram rect={rect ?? { x: 0, y: 0, w: 640, h: 1000 }} profile={AIR_PROFILE} armor={areas} si={{ label: "STRUCTURAL INTEGRITY", value: String(structuralIntegrity(record) ?? 0) }} />;
    if (rect) return <g role="group" aria-label={label}>{drawing}</g>;
    return (
      <svg className="bt-vehicle-diagram" viewBox="0 0 640 1000" role="img" aria-label={label ?? `${record.name.chassis} armor and structural integrity`}>
        {drawing}
      </svg>
    );
  }
  return <VehicleDiagram locations={locations} use={use} motive={hullOf(record)} {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} {...(label ? { label } : {})} {...(ink ? { ink } : {})} {...(rect ? { rect } : {})} />;
}
