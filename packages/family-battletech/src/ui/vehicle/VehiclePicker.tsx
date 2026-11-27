// The vehicle's equipment picker: an in-page dialog over the catalog. It offers what rules/vehicle/availability.ts says the unit may use (printed for
// vehicles, at its rules level, tech base and time), sorted into the Classic groups, each a disclosure over its list.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { equipmentLevel, levelRow, DEFAULT_LEVEL } from "../../rules/levels";
import { groupOf, groupRank } from "../../rules/catalog";
import type { Catalog, EquipmentRow, GroupKey } from "../../rules/catalog";
import { datesText } from "../../rules/time";
import { itemFacts } from "../../rules/vehicle/vehicle";
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import { dialogKeyDown } from "../editor/dialog";
import { offeredEquipment } from "./edit";

interface Group extends GroupKey {
  rows: EquipmentRow[];
}
const TECH_BASE_NAMES = { "inner-sphere": "Inner Sphere", clan: "Clan" };
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;

/** What a unit kind passes the picker in place of its record: the rows on offer (`everything` lifts the tech base and time; `keep` stays on offer) and a line about each row. */
export interface PickerSource {
  offered: (everything: boolean, keep?: string) => EquipmentRow[];
  describe: (row: EquipmentRow) => string;
  /** What the "show everything" box says it lists, in the unit kind's own words. */
  everythingHint?: string;
}

export function vehiclePickerSource(record: VehicleRecord, catalog: Catalog): PickerSource {
  return {
    offered: (everything, keep) => offeredEquipment(record, catalog, everything, keep),
    describe: (row) => {
      const facts = itemFacts({ id: "trial", equipmentId: row.id, name: row.name, location: "body" }, record, catalog);
      const size = facts.tons === null ? "weight not known for a vehicle" : row.kind === "ammunition" ? `${plural(1, "slot")}, any weight from ${row.id.includes("machine-gun") || row.id.includes("nail") ? "half a ton" : "a ton"}` : `${plural(facts.tons, "ton")}, ${plural(facts.slots, "slot")}`;
      return describeRow(row, size);
    },
  };
}

/** The picker line: tech base, the size text, a level above Standard and the prototype year. */
export function describeRow(row: EquipmentRow, size: string): string {
  const parts = [TECH_BASE_NAMES[row.techBase], size];
  const level = equipmentLevel(row);
  if (level !== DEFAULT_LEVEL && level !== "introductory") parts.push(`${levelRow(level).label} level`);
  if (row.prototypeYear !== undefined) parts.push(datesText(row.prototypeYear, row.availability[0]?.from).toLowerCase());
  return parts.join(", ");
}

export default function VehiclePicker({ source, title, current, onChoose, onClose }: { source: PickerSource; title: string; current?: string; onChoose: (row: EquipmentRow) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [everything, setEverything] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleId = useId();
  useEffect(() => {
    search.current?.focus();
  }, []);

  const groups = useMemo<Group[]>(() => {
    const needle = query.trim().toLowerCase();
    const byGroup = new Map<string, Group>();
    for (const row of source.offered(everything, current)) {
      if (needle !== "" && ![row.name, ...row.aliases].some((name) => name.toLowerCase().includes(needle))) continue;
      const key = groupOf(row);
      const group = byGroup.get(key.id) ?? { ...key, rows: [] };
      group.rows.push(row);
      byGroup.set(key.id, group);
    }
    for (const group of byGroup.values()) group.rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || a.techBase.localeCompare(b.techBase));
    return [...byGroup.values()].sort((a, b) => groupRank(a.id) - groupRank(b.id));
  }, [source, everything, query, current]);

  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const detail = source.describe;

  return (
    <div className="bt-picker-backdrop">
      <div
        ref={dialog}
        className="bt-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          dialogKeyDown(event, dialog.current, onClose);
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <div className="bt-field">
          <label htmlFor="vehicle-picker-search">Search by name</label>
          <input
            id="vehicle-picker-search"
            ref={search}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        <div className="bt-field">
          <label>
            <input
              type="checkbox"
              checked={everything}
              onChange={(event) => {
                setEverything(event.target.checked);
              }}
            />{" "}
            Show everything
          </label>
          <span className="bt-hint">{everything ? (source.everythingHint ?? "Showing every item printed for vehicles, whatever its tech base or era. Items above the unit's rules level stay hidden.") : "Showing what this unit's rules level, tech base and year allow."}</span>
        </div>
        {total === 0 ? (
          <p>No equipment matches.</p>
        ) : (
          <>
            <p role="status">{`${plural(total, "item")} in ${plural(groups.length, "group")}`}</p>
            {groups.map((group, index) => (
              <details key={group.id} className="bt-picker__group" open={query.trim() !== "" || index < 2 || undefined}>
                <summary className="bt-picker__heading">{`${group.label} (${String(group.rows.length)})`}</summary>
                <ul className="bt-list bt-picker__list" aria-label={group.label}>
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="bt-picker__result"
                        onClick={() => {
                          onChoose(row);
                        }}
                      >
                        <strong>{row.name}</strong>
                        <span className="bt-picker__detail">{detail(row)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </>
        )}
        <p>
          <button type="button" className="bt-button bt-button--secondary" onClick={onClose}>
            Cancel
          </button>
        </p>
      </div>
    </div>
  );
}
