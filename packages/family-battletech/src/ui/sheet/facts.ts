// The words and figures the record sheet prints for a 'Mech, worked out once so the drawing and the screen reader's copy
// of the sheet say the same thing.
import { editionLine } from "../../data/editions";
import { SHEET_HEAT_SINKS, TECH_BASE_NAMES } from "../../data/sheet";
import { inventoryLines, ammoLines } from "../../rules/catalog";
import type { Catalog, InventoryLine } from "../../rules/catalog";
import { levelOfRecord, levelRow } from "../../rules/levels";
import { layout as buildLayout, locationName, structurePoints, walkMP } from "../../rules/mech";
import { movementPenalty } from "../../rules/walk";
import type { Layout, LocationCode, MechRecord } from "../../rules/mech";

export const DASH = "—";

export interface HeatSinkFacts {
  /** `Single Heat Sinks: 10 (10)`. */
  line: string;
  /** `Single, 10 (10)`: for the text copy of the sheet. */
  summary: string;
  /** The circles to draw. */
  count: number;
}

export interface LocationPoints {
  code: LocationCode;
  name: string;
  front: number | undefined;
  rear: number | undefined;
  structure: number | undefined;
}

export interface SheetFacts {
  title: string;
  walk: string;
  run: string;
  jump: string;
  /** What armor or a shield takes off the movement above, in a few words; absent when nothing does. */
  movementNote: string | undefined;
  tons: string;
  techBase: string;
  edition: string;
  level: string;
  year: string | undefined;
  inventory: InventoryLine[];
  /** `(LRM 5) 24, (AC/10) 10`, or "" when there is no ammunition. */
  ammo: string;
  battleValue: string | undefined;
  heatSinks: HeatSinkFacts;
  layout: Layout;
  points: LocationPoints[];
  designer: string | undefined;
}

/** The unit's name as the sheet's title. */
export const sheetTitle = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed 'Mech";

function safeLayout(record: MechRecord, catalog: Catalog): Layout {
  try {
    return buildLayout(record, catalog.factsOf);
  } catch {
    return { supported: false, locations: [], slots: {}, unplaced: [], conflicts: [], overflow: [], partSlots: [] };
  }
}

export function sheetFacts(record: MechRecord, catalog: Catalog): SheetFacts {
  const walk = walkMP(record);
  const jumpJets = record.mounts.filter((m) => m.equipmentId !== null && catalog.byId(m.equipmentId)?.kind === "jump-jet").length;
  const penalty = movementPenalty(record, catalog);
  const taken = (mp: number, by: number) => String(Math.max(0, mp - by));
  const sinks = record.chassis.heatSinks;
  const kind = Object.hasOwn(SHEET_HEAT_SINKS, sinks.type) ? SHEET_HEAT_SINKS[sinks.type] : undefined;
  const dissipation = kind ? String(sinks.count * kind.perSink) : DASH;
  const ammo = ammoLines(record, catalog)
    .map((line) => {
      const name = line.name.replace(/ Ammo\b/, "");
      return line.shots === null ? `(${name})` : `(${name}) ${String(line.shots)}`;
    })
    .join(", ");
  const layout = safeLayout(record, catalog);
  const structure = structurePoints(record);
  const codes = layout.supported ? layout.locations : (Object.keys(record.armor) as LocationCode[]);
  const battleValue = record.source?.values.battleValue;
  return {
    title: sheetTitle(record),
    walk: walk === null ? DASH : taken(walk, penalty.walk),
    run: walk === null ? DASH : taken(Math.ceil(walk * 1.5), penalty.run),
    jump: penalty.noJump ? "0" : taken(jumpJets, jumpJets > 0 ? penalty.jump : 0),
    movementNote: penalty.short.length > 0 ? penalty.short.join("; ") : undefined,
    tons: String(record.tons),
    techBase: Object.hasOwn(TECH_BASE_NAMES, record.techBase) ? (TECH_BASE_NAMES[record.techBase] ?? record.techBase) : record.techBase,
    edition: editionLine(record.editionId),
    level: levelRow(levelOfRecord(record, catalog)).label,
    year: record.year === null ? undefined : String(record.year),
    inventory: inventoryLines(record, catalog),
    ammo,
    battleValue: battleValue === undefined ? undefined : battleValue.toLocaleString("en-US"),
    heatSinks: {
      line: `${kind?.label ?? sinks.type} Heat Sinks: ${String(sinks.count)} (${dissipation})`,
      summary: `${kind?.label ?? sinks.type}, ${String(sinks.count)} (${dissipation})`,
      count: Number.isFinite(sinks.count) ? Math.max(0, Math.floor(sinks.count)) : 0,
    },
    layout,
    points: codes.map((code) => ({
      code,
      name: locationName(code),
      front: record.armor[code]?.front,
      rear: record.armor[code]?.rear,
      structure: structure[code],
    })),
    designer: record.source ? record.source.designer || "an unnamed designer" : undefined,
  };
}
