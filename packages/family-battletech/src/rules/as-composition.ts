// Groups above the first level and the formations built on top of another: the scale of a requirement up the p. 113 table, the Mechanized,
// Nova and Air Lance checks (p. 121), and a group checked against the composition table of p. 124 from the groups inside it. Pure; advice,
// never a refusal. The data is in data/as-formations.ts and data/as-compositions.ts.
import { AS_BASE_UNITS, AS_CLAN_VEHICLE_STAR } from "../data/as-formations";
import type { AsFormationType, AsOrganisation, AsOverlay } from "../data/as-formations";
import { compositionFor } from "../data/as-compositions";
import type { AsComposition, AsCompositionRow } from "../data/as-compositions";
import { checkRequirements } from "./as-force";
import type { ForceLine, GroupTotals } from "./as-force";

/** The units a base formation is checked on: those of the group less the types the overlay leaves out (infantry for a Mechanized or Nova, the fighters of an Air Lance). */
export const baseLines = (overlay: AsOverlay | undefined, lines: readonly ForceLine[]): ForceLine[] =>
  overlay ? lines.filter((l) => !l.unit || !overlay.excludes.includes(l.unit.card.type)) : [...lines];

/**
 * How many lances, Stars or Level IIs a group above the first level holds, by the unit count and the sizes of p. 113 and p. 115: the number
 * a formation's counts are multiplied by. A group at the first level, or of no stated organisation, is 1. The book gives no such rule; it is
 * the owner's, and shares need none because they follow the group's size already.
 */
export function groupScale(org: AsOrganisation | undefined, type: AsFormationType | undefined, lines: readonly ForceLine[]): number {
  if (!org?.higher) return 1;
  const units = lines.flatMap((l) => (l.unit ? [l.unit] : []));
  const vehicles = units.length > 0 && units.every((u) => u.card.type === "CV" || u.card.type === "SV");
  const line = type?.line ?? "ground";
  const base = line === "ground" && org.family === "clan" && vehicles ? AS_CLAN_VEHICLE_STAR : AS_BASE_UNITS[line][org.family];
  return Math.max(1, Math.round(units.length / base));
}

/** The organisations of each family from the lowest level up (a Binary or Trinary, Supernova or not, is one layer): the layers officers are counted by. */
const OFFICER_LAYERS: Record<string, string[][]> = {
  is: [["is-lance"], ["is-company"], ["is-battalion"], ["is-regiment"], ["is-brigade"]],
  clan: [["clan-star"], ["clan-binary", "clan-trinary", "clan-supernova-binary", "clan-supernova-trinary"], ["clan-cluster"], ["clan-galaxy"]],
  comstar: [["cs-level-2"], ["cs-level-3"], ["cs-level-4"], ["cs-level-5"]],
};
/** The smaller groups one group of each layer holds, at most (p. 113): our assumption for the count of a layer when no group of it is set. */
const OFFICER_FAN: Record<string, number[]> = { is: [1, 4, 4, 4, 6], clan: [1, 3, 5, 5], comstar: [1, 6, 6, 6] };

/**
 * The officers a Command formation asks for over the one per lowest-level group (the owner's ruling, built on the one officer of the Command
 * Lance, p. 120): each layer above the lowest has two (a commander and an executive officer), for Inner Sphere, Clan and ComStar alike. So a
 * company needs its lances plus 2, a battalion its lances plus 2 per company plus 2, and so on up. `inside` holds the organisation ids of the
 * groups inside this one; a layer with none set is counted by our assumption, the groups of the layer below split at the most p. 113 gives
 * (the book gives no count for loose units). Returns 0 for the lowest layer, for an organisation outside these chains, and for other formations.
 */
export function commandOfficersOver(org: AsOrganisation | undefined, type: AsFormationType | undefined, scale: number, inside: readonly string[] = []): number {
  if (type?.id !== "command" && type?.id !== "command-vehicle") return 0;
  const family = org?.family;
  const chain = family === undefined ? undefined : OFFICER_LAYERS[family];
  const rank = chain?.findIndex((ids) => org !== undefined && ids.includes(org.id)) ?? -1;
  if (!family || !chain || rank < 1) return 0;
  const fan = OFFICER_FAN[family] ?? [];
  let below = scale;
  let groups = 0;
  for (let k = 1; k < rank; k++) {
    const set = inside.filter((id) => chain[k]?.includes(id)).length;
    below = set > 0 ? set : Math.ceil(below / (fan[k] ?? 1));
    groups += below;
  }
  return 2 * (1 + groups);
}

export interface OverlayCheck {
  overlay: AsOverlay;
  met: boolean;
  missing: string[];
}

/** Whether the group meets an overlay formation. It is a lance-level formation: its counts are not scaled. */
export function checkOverlay(overlay: AsOverlay, lines: readonly ForceLine[]): OverlayCheck {
  if (!lines.some((l) => l.unit)) return { overlay, met: false, missing: ["The group has no units."] };
  const missing = checkRequirements(overlay.requires, lines);
  return { overlay, met: missing.length === 0, missing };
}

export interface RowResult {
  row: AsCompositionRow;
  have: number;
  /** Why the count is out of its range, in our words; empty when it is within it. */
  problem: string;
}

export interface CompositionCheck {
  table: AsComposition;
  rows: RowResult[];
  /** Everything the table finds wrong, in our words with the group's own figures. */
  problems: string[];
  met: boolean;
}

const fits = (child: GroupTotals, row: AsCompositionRow): boolean => {
  const { formations, orgs, types } = row.match;
  if (formations && !(child.group.formation && formations.includes(child.group.formation))) return false;
  if (orgs && !(child.group.org && orgs.includes(child.group.org))) return false;
  if (types) {
    const units = child.lines.flatMap((l) => (l.unit ? [l.unit] : []));
    if (units.length === 0 || !units.every((u) => types.includes(u.card.type))) return false;
  }
  return true;
};

const times = (n: number, noun: string): string => `${String(n)} ${noun}`;

/**
 * A group checked against the composition table of its organisation (p. 124) from the groups inside it. Each inner group fills the first
 * row of the table it fits: by formation type, then by organisation, then by the unit types it holds. Returns nothing when the book gives
 * no table for the organisation or the group holds no other group.
 */
export function checkComposition(children: readonly GroupTotals[], orgId: string | undefined): CompositionCheck | undefined {
  const table = compositionFor(orgId);
  if (!table || children.length === 0) return undefined;
  const first = children.map((child) => ({ child, row: table.rows.find((r) => fits(child, r)) }));
  const units = (c: GroupTotals) => c.lines.flatMap((l) => (l.unit ? [l.unit] : []));
  const allMech = (c: GroupTotals): boolean => units(c).length > 0 && units(c).every((x) => x.card.type === "BM");
  const allVehicle = (c: GroupTotals): boolean => units(c).length > 0 && units(c).every((x) => x.card.type === "CV" || x.card.type === "SV");
  const evaluate = (placed: { child: GroupTotals; row: AsCompositionRow | undefined }[]): CompositionCheck => {
    const filled = new Map<string, number>();
    const unplaced: GroupTotals[] = [];
    for (const { child, row } of placed) {
      if (row) filled.set(row.id, (filled.get(row.id) ?? 0) + 1);
      else unplaced.push(child);
    }
    const core = table.rows.filter((r) => r.section === "core");
    const coreCount = core.reduce((sum, r) => sum + (filled.get(r.id) ?? 0), 0);
    const rows = table.rows.map((row): RowResult => {
      const have = filled.get(row.id) ?? 0;
      const others = core.filter((r) => r.id !== row.id && r.id !== "command" && r.id !== "support").reduce((sum, r) => sum + (filled.get(r.id) ?? 0), 0);
      const problem =
        have < row.min ? `${row.label}: at least ${String(row.min)} (the group has ${String(have)}).`
        : have > row.max ? `${row.label}: at most ${String(row.max)} (the group has ${String(have)}).`
        : row.perCore !== undefined && have > row.perCore * others ? `${row.label}: at most ${String(row.perCore)} for each core group of another kind (the group has ${String(have)} against ${String(others)}).`
        : "";
      return { row, have, problem };
    });
    const problems = rows.flatMap((r) => (r.problem ? [r.problem] : []));
    const total = orgId === undefined ? undefined : table.core[orgId];
    if (total && (coreCount < total[0] || coreCount > total[1])) problems.push(`The core of a ${table.name} is ${total[0] === total[1] ? times(total[0], table.coreName) : `${String(total[0])} to ${times(total[1], table.coreName)}`}; this group has ${String(coreCount)}.`);
    for (const child of unplaced) problems.push(`${child.group.name.trim() || "An unnamed group"} fits no row of the table: give it a formation type, or an organisation or units that fit a detachment row.`);
    return { table, rows, problems, met: problems.length === 0 };
  };
  const plain = evaluate(first);
  // The footnotes of p. 124: where the core is vehicle groups, the vehicle detachment row may be BattleMech groups instead. The table is also
  // read that way (all-BattleMech groups in that row, the all-vehicle groups sitting in it counted as the core) and that reading is kept only
  // when it finds fewer problems, so a BattleMech core with a vehicle detachment is never misread.
  const swapRow = table.rows.find((r) => r.orMechs);
  if (!swapRow || plain.met) return plain;
  const swapped = evaluate(first.map(({ child, row }) => {
    if (allMech(child)) return { child, row: swapRow };
    const core = row === swapRow && allVehicle(child) ? table.rows.find((r) => r.section === "core" && r.match.orgs && child.group.org && r.match.orgs.includes(child.group.org)) : undefined;
    return { child, row: core ?? row };
  }));
  return swapped.problems.length < plain.problems.length ? swapped : plain;
}
