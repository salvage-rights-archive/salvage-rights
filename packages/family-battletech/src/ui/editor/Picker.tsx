// The equipment picker: an in-page dialog over the catalog, for replacing a mount's equipment or adding a new item.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Catalog, EquipmentKind, EquipmentRow } from "../../rules/catalog";
import type { MechRecord, Mount } from "../../rules/mech";
import { dialogKeyDown } from "./dialog";

const CAP = 100;
const KINDS: [EquipmentKind | "all", string][] = [
  ["all", "All"],
  ["weapon", "Weapons"],
  ["ammunition", "Ammunition"],
  ["heat-sink", "Heat sinks"],
  ["jump-jet", "Jump jets"],
  ["other", "Other"],
];
const TECH_BASE_NAMES = { "inner-sphere": "Inner Sphere", clan: "Clan" };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Picker({
  record,
  catalog,
  title,
  onChoose,
  onClose,
}: {
  record: MechRecord;
  catalog: Catalog;
  title: string;
  onChoose: (row: EquipmentRow) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<EquipmentKind | "all">("all");
  const [everything, setEverything] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    search.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const rows = everything
      ? catalog.all().map((row) => catalog.rowFor(row.id, record.editionId) ?? row)
      : catalog.offered(record.editionId, { techBase: record.techBase, year: record.year });
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) => (kind === "all" || row.kind === kind) && (needle === "" || [row.name, ...row.aliases].some((name) => name.toLowerCase().includes(needle))),
    );
  }, [catalog, record.editionId, record.techBase, record.year, everything, kind, query]);

  const factsLine = (row: EquipmentRow) => {
    const trial: Mount = { id: "trial", equipmentId: row.id, name: row.name, techBase: row.techBase, location: null, slot: null };
    const facts = catalog.factsOf(trial, record);
    const parts = [TECH_BASE_NAMES[row.techBase], facts ? `${plural(facts.tons, "ton")}, ${plural(facts.slots, "slot")}` : "weight and slots not known for this 'Mech"];
    if (row.yearsInferred) parts.push("year not printed in the book");
    return parts.join(", ");
  };

  const shown = matches.slice(0, CAP);
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
            }}
          />
        </div>
        <div className="bt-field">
          <label htmlFor="bt-picker-kind">Kind</label>
          <select
            id="bt-picker-kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as EquipmentKind | "all");
            }}
          >
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
            {everything ? "Showing every item, whatever its tech base or year." : "Showing what this edition offers for this tech base and year."}
          </span>
        </div>
        {matches.length === 0 ? (
          <p>No equipment matches.</p>
        ) : (
          <>
            {matches.length > CAP && <p role="status">{`Showing ${CAP} of ${matches.length}`}</p>}
            <ul className="bt-list" aria-label="Equipment">
              {shown.map((row) => (
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
