// The equipment picker for an aerospace unit: an in-page dialog over the catalog, showing what the unit's edition offers it (ui/aero/edit.ts
// `offeredEquipment`), sorted into the catalog's groups, each a disclosure button over its list. The same dialog manners as the 'Mech
// editor's picker: focus in the search box, Escape closes, Tab stays inside.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DEFAULT_AERO_EDITION } from "../../data/aero";
import { aeroCatalogFigures, aeroWeaponFigures } from "../../data/aero-weapons";
import type { AeroRecord } from "../../rules/aero";
import { groupOf, groupRank } from "../../rules/catalog";
import type { Catalog, EquipmentRow, GroupKey } from "../../rules/catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelRow } from "../../rules/levels";
import { dialogKeyDown } from "../editor/dialog";
import { offeredEquipment } from "./edit";

const TECH_BASE_NAMES = { "inner-sphere": "Inner Sphere", clan: "Clan" };
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;
const OPEN_AT_FIRST = 2;

interface Group extends GroupKey {
  rows: EquipmentRow[];
}

/** One line of figures for an item in the unit's edition: weight, heat and attack where the edition's table has them. */
function factsLine(row: EquipmentRow, record: AeroRecord, catalog: Catalog): string {
  const parts: string[] = [TECH_BASE_NAMES[row.techBase]];
  if (row.kind === "ammunition") parts.push("ammunition, weighed by the ton");
  else {
    const figures = aeroWeaponFigures(catalog, row.id, record.editionId) ?? aeroCatalogFigures(catalog, row.id);
    if (figures?.tons !== undefined) parts.push(plural(figures.tons, "ton"));
    if (figures?.heat !== undefined) parts.push(`heat ${String(figures.heat)}`);
    if (figures?.attack !== undefined) parts.push(`attack ${String(figures.attack)}`);
    if (figures?.tons === undefined) parts.push("weight not known");
  }
  const level = equipmentLevel(row);
  if (record.editionId === DEFAULT_AERO_EDITION && level !== DEFAULT_LEVEL && level !== "introductory") parts.push(`${levelRow(level).label} level`);
  return parts.join(", ");
}

export default function AeroPicker({
  record,
  catalog,
  title,
  current,
  onChoose,
  onClose,
}: {
  record: AeroRecord;
  catalog: Catalog;
  title: string;
  /** The equipment id of an item being replaced: it stays on offer even where the unit's limits would hide it. */
  current?: string;
  onChoose: (row: EquipmentRow) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [everything, setEverything] = useState(false);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const dialog = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const panelId = useId();
  useEffect(() => {
    search.current?.focus();
  }, []);

  const groups = useMemo<Group[]>(() => {
    const needle = query.trim().toLowerCase();
    const byGroup = new Map<string, Group>();
    for (const row of offeredEquipment(record, catalog, everything, current)) {
      if (needle !== "" && ![row.name, ...row.aliases].some((name) => name.toLowerCase().includes(needle))) continue;
      const key = groupOf(row);
      const group = byGroup.get(key.id) ?? { ...key, rows: [] };
      group.rows.push(row);
      byGroup.set(key.id, group);
    }
    for (const group of byGroup.values()) group.rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || a.techBase.localeCompare(b.techBase));
    return [...byGroup.values()].sort((a, b) => groupRank(a.id) - groupRank(b.id));
  }, [catalog, record, everything, query, current]);

  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const isOpen = (group: Group, index: number) => toggled[group.id] ?? (query.trim() !== "" || index < OPEN_AT_FIRST);

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
          <label htmlFor="aero-picker-search">Search by name</label>
          <input
            id="aero-picker-search"
            ref={search}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setToggled({});
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
          <span className="bt-hint">
            {everything ? "Showing every item the edition lists, whatever its tech base, level or era." : "Showing what this edition lists for the unit's tech base, and in the current rules its level and era."}
          </span>
        </div>
        {total === 0 ? (
          <p>No equipment matches.</p>
        ) : (
          <>
            <p role="status">{`${plural(total, "item")} in ${plural(groups.length, "group")}`}</p>
            {groups.map((group, index) => {
              const open = isOpen(group, index);
              const headingId = `${panelId}-${group.id}-h`;
              const listId = `${panelId}-${group.id}`;
              return (
                <section key={group.id} className="bt-picker__group" aria-labelledby={headingId}>
                  <h3 id={headingId} className="bt-picker__heading">
                    <button
                      type="button"
                      className="bt-picker__toggle"
                      aria-expanded={open}
                      aria-controls={listId}
                      onClick={() => {
                        setToggled((now) => ({ ...now, [group.id]: !open }));
                      }}
                    >
                      <span aria-hidden="true" className="bt-picker__chevron">
                        {open ? "▾" : "▸"}
                      </span>
                      {group.label}
                      <span className="bt-picker__count">{` (${String(group.rows.length)})`}</span>
                    </button>
                  </h3>
                  {open && (
                    <ul id={listId} className="bt-list bt-picker__list" aria-label={group.label}>
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
                            <span className="bt-picker__detail">{factsLine(row, record, catalog)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
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
