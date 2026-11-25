// The words and figures the record sheet prints for a 'Mech, worked out once so the drawing and the screen reader's copy
// of the sheet say the same thing.
import { editionName } from "../../data/editions";
import { SHEET_HEAT_SINKS, TECH_BASE_NAMES } from "../../data/sheet";
import { inventoryLines, ammoLines } from "../../rules/catalog";
import type { Catalog, InventoryLine } from "../../rules/catalog";
import { battleValue as battleValueOf } from "../../rules/bv";
import { levelOfRecord, levelRow } from "../../rules/levels";
import { layout as buildLayout, locationName, structurePoints, totalHeatSinks, walkMP, weights } from "../../rules/mech";
import { configurationLevel } from "../../rules/omni";
import { heatSinkCapacity, movementPenalty, penalisedMovement } from "../../rules/walk";
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
  battleValue: string;
  /** Where the Battle Value came from: Mordel gave it, or we worked it out with the default pilot (Gunnery 4, Piloting 5). */
  battleValueFrom: string;
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
  const moved = walk === null ? null : penalisedMovement(walk, penalty);
  const taken = (mp: number, by: number) => String(Math.max(0, mp - by));
  const sinks = record.chassis.heatSinks;
  const more = sinks.extra ?? [];
  const capacity = heatSinkCapacity(record);
  const dissipation = capacity === null ? DASH : String(capacity);
  // A mixed record prints each kind with its count, `Double Heat Sinks: 10 IS + 4 Clan (28)`; the two doubles are told apart by their tech base.
  const labelOf = (type: string) => (Object.hasOwn(SHEET_HEAT_SINKS, type) ? SHEET_HEAT_SINKS[type]?.label : undefined) ?? type;
  const origin = (type: string) => (type === "double" ? "IS" : type === "double-clan" ? "Clan" : labelOf(type));
  const counts = more.length > 0 ? [sinks, ...more].map((g) => `${String(g.count)} ${origin(g.type)}`).join(" + ") : String(sinks.count);
  const label = [...new Set([sinks, ...more].map((g) => labelOf(g.type)))].join(" and ");
  const sinkTotal = totalHeatSinks(sinks);
  const ammo = ammoLines(record, catalog)
    .map((line) => {
      const name = line.name.replace(/ Ammo\b/, "");
      if (line.choices) return `(${name}) ${line.choices.map((c) => `${String(c.shots)} for ${c.launcher}`).join(" or ")}`;
      return line.shots === null ? `(${name})` : `(${name}) ${String(line.shots)}`;
    })
    .join(", ");
  const layout = safeLayout(record, catalog);
  const structure = structurePoints(record);
  const codes = layout.supported ? layout.locations : (Object.keys(record.armor) as LocationCode[]);
  const imported = record.source?.values.battleValue;
  const isBase = record.omni?.isBase === true;
  const computed = imported === undefined && !isBase ? battleValueOf(record, catalog) : undefined;
  // An OmniMech configuration prints the level of its contents, never below Standard; the base prints its pod space where a Battle Value would go.
  const total = isBase ? weights(record, catalog.factsOf).total : null;
  return {
    title: sheetTitle(record),
    walk: moved === null ? DASH : String(moved.walk),
    run: moved === null ? DASH : String(moved.run),
    jump: penalty.noJump ? "0" : taken(jumpJets, jumpJets > 0 ? penalty.jump : 0),
    movementNote: penalty.short.length > 0 ? penalty.short.join("; ") : undefined,
    tons: String(record.tons),
    techBase: Object.hasOwn(TECH_BASE_NAMES, record.techBase) ? (TECH_BASE_NAMES[record.techBase] ?? record.techBase) : record.techBase,
    edition: editionName(record.editionId),
    level: levelRow(record.omni ? configurationLevel(record, catalog) : levelOfRecord(record, catalog)).label,
    year: record.year === null ? undefined : String(record.year),
    inventory: inventoryLines(record, catalog),
    ammo,
    battleValue: isBase ? DASH : imported !== undefined ? imported.toLocaleString("en-US") : `${computed?.complete === false ? "at least " : ""}${(computed?.total ?? 0).toLocaleString("en-US")}`,
    battleValueFrom: isBase ? (total === null ? "the base has none" : `the base has none; pod space ${String(Math.round((record.tons - total) * 1000) / 1000)} tons`) : imported !== undefined ? "mordel.net" : "calculated, pilot 4/5",
    heatSinks: {
      line: `${label} Heat Sinks: ${counts} (${dissipation})`,
      summary: `${label}, ${counts} (${dissipation})`,
      count: Number.isFinite(sinkTotal) ? Math.max(0, Math.floor(sinkTotal)) : 0,
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
