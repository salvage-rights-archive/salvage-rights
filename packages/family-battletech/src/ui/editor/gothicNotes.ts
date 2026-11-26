// What the editor says of an item whose Gothic figures are not printed: the weight or level we worked out, with the page it comes from.
// In our own words; the figures themselves live in the catalog (data/equipment/gothic.ts). A row that no box 'Mech's sheet carries has
// its level from Classic or from the rulebook's list alone, and the screen says so from that absence (gothic-design s.4).
import { bookName } from "../../data/editions";
import { GOTHIC_BOX_SPECS } from "../../data/gothic-units";
import { GOTHIC } from "../../data/rulesets";
import type { EquipmentRow } from "../../rules/catalog";

const page = (cite: { book: string; page: number } | undefined) => (cite ? ` (${bookName(cite.book)}, p. ${String(cite.page)})` : "");

let onSheets: Set<string> | undefined;
/** Whether any of the box 'Mechs' sheets carries the item. */
const printedOnSheet = (row: EquipmentRow): boolean => {
  onSheets ??= new Set(GOTHIC_BOX_SPECS.flatMap((spec) => Object.values(spec.mounts).flatMap((places) => places.map((place) => place[0]))));
  return onSheets.has(row.id);
};

/** The weight of a row we inferred, for the weight line and the picker. */
export const inferredWeight = (row: Pick<EquipmentRow, "tonsInferred" | "levelCite">): string | undefined =>
  row.tonsInferred ? `weight not printed; inferred from the designs that carry it${page(row.levelCite)}` : undefined;

/** Every "not printed; inferred" note a row carries in Gothic. */
export function gothicNotes(row: EquipmentRow): string[] {
  const notes: string[] = [];
  const weight = inferredWeight(row);
  if (weight) notes.push(weight);
  if (row.bvInferred) notes.push("Battle Value not printed; inferred");
  if (row.levelInferred) notes.push(`level not printed; inferred${page(row.levelCite)}`);
  else if (!row.levelCite && !printedOnSheet(row)) notes.push(`level not printed for Gothic; the Classic level${page(GOTHIC.listCite)}`);
  return notes;
}
