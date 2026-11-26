// Short wording the Gothic pages share: a unit's movement as the sheet reads it, and a weapon's play figures.
import type { AbomStats } from "../../data/gothic";
import type { EquipmentRow } from "../../rules/catalog";

export function moveText(stats: Pick<AbomStats, "ground" | "jump" | "vtol">): string {
  return [`Ground ${String(stats.ground)}`, ...(stats.jump === undefined ? [] : [`Jump ${String(stats.jump)}`]), ...(stats.vtol === undefined ? [] : [`VTOL ${String(stats.vtol)}`])].join(", ");
}

/** "Damage 5, range 3/6/9, minimum 2": the catalog row's printed figures; empty when the row prints neither. */
export function weaponFigures(row: Pick<EquipmentRow, "damage" | "range"> | undefined): string {
  if (!row) return "";
  const parts: string[] = [];
  if (row.damage) parts.push(`Damage ${row.damage}`);
  if (row.range) {
    const [min, short, medium, long] = row.range;
    parts.push(`range ${String(short)}/${String(medium)}/${String(long)} hexes (short/medium/long)`);
    if (min > 0) parts.push(`minimum ${String(min)}`);
  }
  return parts.join(", ");
}
