// The equipment picker: an in-page dialog over the catalog, for replacing a mount's equipment or adding a new item. What it offers
// is what rules/availability.ts says the record may use (rules level, tech base, era or year); the items are sorted into groups
// (data/equipment/groups.ts), each a disclosure button over its list, so no one list runs on.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { equipmentAvailable } from "../../rules/availability";
import { groupOf, groupRank } from "../../rules/catalog";
import type { Catalog, EquipmentRow, GroupKey } from "../../rules/catalog";
import { DEFAULT_LEVEL, equipmentLevel, levelRow } from "../../rules/levels";
import type { MechRecord, Mount } from "../../rules/mech";
import { dialogKeyDown } from "./dialog";

const TECH_BASE_NAMES = { "inner-sphere": "Inner Sphere", clan: "Clan" };
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;
const OPEN_AT_FIRST = 2; // how many groups start open when nothing has been searched

interface Group extends GroupKey {
  rows: EquipmentRow[];
}

export default function Picker({
  record,
  catalog,
  title,
  current,
  onChoose,
  onClose,
}: {
  record: MechRecord;
  catalog: Catalog;
  title: string;
  /** The equipment id of the item being replaced: it stays on offer even where the rules would hide it, so the choice is never empty of it. */
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
    const named = (row: EquipmentRow) => needle === "" || [row.name, ...row.aliases].some((name) => name.toLowerCase().includes(needle));
    const byGroup = new Map<string, Group>();
    for (const base of catalog.all()) {
      const row = catalog.rowFor(base.id, record.editionId) ?? base;
      if (!named(row) || !(equipmentAvailable(row, record, catalog, everything) || row.id === current)) continue;
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

  const factsLine = (row: EquipmentRow) => {
    const trial: Mount = { id: "trial", equipmentId: row.id, name: row.name, techBase: row.techBase, location: null, slot: null };
    const facts = catalog.factsOf(trial, record);
    // A heat sink's weight is counted with the chassis heat sinks, so it is not listed as 0 tons.
    const size = facts ? (row.kind === "heat-sink" ? `weight counted with the chassis heat sinks, ${plural(facts.slots, "slot")}` : `${plural(facts.tons, "ton")}, ${plural(facts.slots, "slot")}`) : "weight and slots not known for this 'Mech";
    const parts = [TECH_BASE_NAMES[row.techBase], size];
    const level = equipmentLevel(row);
    if (level !== "introductory" && level !== DEFAULT_LEVEL) parts.push(`${levelRow(level).label} level`);
    if (row.yearsInferred) parts.push("year not printed in the book");
    if (!equipmentAvailable(row, record, catalog)) parts.push("not available to this unit");
    return parts.join(", ");
  };

  return (
    <div className="bt-picker-backdrop">
      <div ref={dialog} className="bt-picker" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => {
          dialogKeyDown(event, dialog.current, onClose);
        }}>
        <h2 id={titleId}>{title}</h2>
        <div className="bt-field">
          <label htmlFor="bt-picker-search">Search by name</label>
          <input
            id="bt-picker-search"
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
            {everything ? "Showing every item, whatever its tech base or era. Items above the unit's rules level stay hidden." : "Showing what this unit's rules level, tech base and era or year allow."}
          </span>
        </div>
        {total === 0 ? (
          <p>No equipment matches.</p>
        ) : (
          <>
            <p role="status">{`${plural(total, "item")} in ${plural(groups.length, "group")}, at ${levelRow(record.rulesLevel ?? DEFAULT_LEVEL).label} level or below`}</p>
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
                      <span aria-hidden="true" className="bt-picker__chevron">{open ? "▾" : "▸"}</span>
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
                            <span className="bt-picker__detail">{factsLine(row)}</span>
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
