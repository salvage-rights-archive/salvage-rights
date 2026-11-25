// The 'Mech editor: one saved record, edited in place, with the rules check beside it. The page holds the record's history
// (for Undo and Redo), derives everything else from the current record, and hands each panel what it shows and an
// `onEdit(change)` callback. Every edit goes through `editRecord`.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useBlocker, useLocation, useSearchParams } from "react-router";
import { ARMOR, COCKPITS, ENGINE_TYPES, GYROS, HEAT_SINKS, MYOMER, STRUCTURE_TYPES } from "../data/chassis";
import { loadCatalog } from "../rules/catalog";
import type { Catalog } from "../rules/catalog";
import { runChecks } from "../rules/checks";
import type { Finding } from "../rules/checks";
import { changedSinceImport } from "../rules/mordel";
import { editRecord, layout as buildLayout, weights as buildWeights } from "../rules/mech";
import type { Layout, LocationCode, MechRecord } from "../rules/mech";
import ArmorPanel from "./editor/ArmorPanel";
import { dialogKeyDown } from "./editor/dialog";
import FindingsPanel from "./editor/FindingsPanel";
import SlotsPanel from "./editor/SlotsPanel";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadMech, openFamilyStorage } from "./storage";
import type { FamilyStorage } from "./storage";
import "./classic.scss";

export type Change = (draft: MechRecord) => void;
/** Applies an edit. Edits with the same `field` in a row (one visit to a field) are one Undo step. */
export type OnEdit = (change: Change, field?: string) => void;

const HISTORY_LIMIT = 100;
const HOME = "/battletech/classic/home";

// ---------------------------------------------------------------------------------------------------------------
// Small shared pieces: the ids that findings and change markers point at, and the labelled fields.
// ---------------------------------------------------------------------------------------------------------------

/** The id of the control for a field path such as `chassis.engine` or `armor.LA`. */
export const fieldId = (path: string) => `field-${path.replace(/\./g, "-")}`;
/** The id of a mount's first cell (or its place in the unplaced tray). */
export const mountDomId = (id: string) => `mount-${id}`;

export function Changed({ id }: { id: string }) {
  return (
    <span id={id} className="bt-changed">
      Changed since import
    </span>
  );
}

/** A label, a control, and what goes beside it: the changed marker and a hint. `children` gets the ids to describe itself by. */
function Field({
  id,
  label,
  changed,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  changed?: boolean;
  hint?: string;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const parts = [changed ? `${id}-changed` : "", hint ? `${id}-hint` : ""].filter(Boolean);
  return (
    <div className={className ? `bt-field ${className}` : "bt-field"}>
      <label htmlFor={id}>{label}</label>
      {children(parts.length > 0 ? parts.join(" ") : undefined)}
      {changed && <Changed id={`${id}-changed`} />}
      {hint && (
        <span id={`${id}-hint`} className="bt-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

/** A number typed into a text box. What is typed is shown as typed; only a valid number reaches the record. */
export function NumberField({
  id,
  label,
  value,
  onValid,
  allowEmpty = false,
  changed,
  after,
  onFocus,
  name,
  className,
}: {
  id: string;
  label: string;
  /** The accessible name, when the visible label is a short form of it. */
  name?: string;
  className?: string;
  value: number | null;
  onValid: (value: number | null) => void;
  allowEmpty?: boolean;
  changed?: boolean;
  /** Shown beside the field, such as `of 18`. */
  after?: ReactNode;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = useState<string>();
  const parse = (text: string): number | null | undefined => {
    const trimmed = text.trim();
    if (trimmed === "") return allowEmpty ? null : undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };
  const parsed = draft === undefined ? undefined : parse(draft);
  const invalid = draft !== undefined && parsed === undefined;
  // A draft that no longer matches the record (after Undo, say) gives way to the record's value.
  const showDraft = draft !== undefined && (invalid || parsed === value);
  const shown = showDraft ? draft : value === null ? "" : String(value);
  return (
    <Field id={id} label={label} className={className} changed={changed} hint={invalid ? "Enter a number." : undefined}>
      {(describedBy) => (
        <>
          <input
            id={id}
            aria-label={name}
            type="text"
            inputMode="decimal"
            value={shown}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={onFocus}
            onChange={(event) => {
              const text = event.target.value;
              setDraft(text);
              const next = parse(text);
              if (next !== undefined) onValid(next);
            }}
            onBlur={() => {
              if (!invalid) setDraft(undefined);
            }}
          />
          {after}
        </>
      )}
    </Field>
  );
}

function TextField({ id, label, value, onChange, changed }: { id: string; label: string; value: string; onChange: (v: string) => void; changed?: boolean }) {
  return (
    <Field id={id} label={label} changed={changed}>
      {(describedBy) => (
        <input
          id={id}
          type="text"
          value={value}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

/** A select over a table's own keys; a value the table lacks stays a choice, labelled `(as imported)`. */
function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  changed,
}: {
  id: string;
  label: string;
  value: string;
  options: [value: string, label: string][];
  onChange: (value: string) => void;
  changed?: boolean;
}) {
  const known = options.some(([key]) => key === value);
  // Wide enough for the longest choice, so the current value is never cut off.
  const longest = Math.max(...options.map(([, text]) => text.length), known ? 0 : `${value} (as imported)`.length);
  return (
    <Field id={id} label={label} changed={changed}>
      {(describedBy) => (
        <select
          id={id}
          value={value}
          style={{ "--bt-select-min": `${longest + 4}ch` } as CSSProperties}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          {options.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
          {!known && <option value={value}>{`${value} (as imported)`}</option>}
        </select>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Edits that touch more than one part of the record
// ---------------------------------------------------------------------------------------------------------------

const PART_TABLES = { structure: STRUCTURE_TYPES, armor: ARMOR } as const;

/** Sets the structure or armor type and brings that type's part-slot mounts to the count the type needs: surplus ones go
 * from the unplaced first, then from the highest slot; missing ones are added unplaced. One edit, so Undo is one step. */
export function setPartType(draft: MechRecord, part: "structure" | "armor", type: string): void {
  if (part === "structure") draft.chassis.structure = type;
  else draft.chassis.armorType = type;
  const table = PART_TABLES[part].types;
  const row = Object.hasOwn(table, type) ? table[type] : undefined;
  if (!row) return;
  const mine = draft.mounts.filter((m) => m.part === part);
  for (const m of mine) m.name = row.name;
  if (mine.length > row.slots) {
    // The surplus comes first from the unplaced, then from the highest slot.
    const order = [...mine].sort((a, b) => Number(a.location !== null) - Number(b.location !== null) || (b.slot ?? -1) - (a.slot ?? -1));
    const gone = new Set(order.slice(0, mine.length - row.slots).map((m) => m.id));
    draft.mounts = draft.mounts.filter((m) => !gone.has(m.id));
  }
  let have = Math.min(mine.length, row.slots);
  for (let n = 1; have < row.slots; n++) {
    const id = `${part}-${n}`;
    if (draft.mounts.some((m) => m.id === id)) continue;
    draft.mounts.push({ id, equipmentId: null, part, name: row.name, techBase: draft.techBase === "clan" ? "clan" : "inner-sphere", location: null, slot: null });
    have++;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The fields, as tables
// ---------------------------------------------------------------------------------------------------------------

const names = (types: Record<string, { name: string }>): [string, string][] => Object.entries(types).map(([key, row]) => [key, row.name]);

type ChassisField =
  | { kind: "select"; path: string; label: string; options: [string, string][]; read: (r: MechRecord) => string; write: (d: MechRecord, v: string) => void }
  | { kind: "number"; path: string; label: string; read: (r: MechRecord) => number; write: (d: MechRecord, v: number) => void };

const CHASSIS_FIELDS: ChassisField[] = [
  { kind: "select", path: "chassis.engine", label: "Engine type", options: names(ENGINE_TYPES.types), read: (r) => r.chassis.engine.type, write: (d, v) => void (d.chassis.engine.type = v) },
  { kind: "number", path: "chassis.engine-rating", label: "Engine rating", read: (r) => r.chassis.engine.rating, write: (d, v) => void (d.chassis.engine.rating = v) },
  { kind: "select", path: "chassis.gyro", label: "Gyro", options: names(GYROS.types), read: (r) => r.chassis.gyro, write: (d, v) => void (d.chassis.gyro = v) },
  { kind: "select", path: "chassis.cockpit", label: "Cockpit", options: names(COCKPITS.types), read: (r) => r.chassis.cockpit, write: (d, v) => void (d.chassis.cockpit = v) },
  { kind: "select", path: "chassis.structure", label: "Structure type", options: names(STRUCTURE_TYPES.types), read: (r) => r.chassis.structure, write: (d, v) => { setPartType(d, "structure", v); } },
  { kind: "select", path: "chassis.armorType", label: "Armor type", options: names(ARMOR.types), read: (r) => r.chassis.armorType, write: (d, v) => { setPartType(d, "armor", v); } },
  { kind: "select", path: "chassis.myomer", label: "Myomer", options: names(MYOMER.types), read: (r) => r.chassis.myomer, write: (d, v) => void (d.chassis.myomer = v) },
  { kind: "select", path: "chassis.heatSinks", label: "Heat sink type", options: names(HEAT_SINKS.types), read: (r) => r.chassis.heatSinks.type, write: (d, v) => void (d.chassis.heatSinks.type = v) },
  { kind: "number", path: "chassis.heatSinks-count", label: "Heat sinks", read: (r) => r.chassis.heatSinks.count, write: (d, v) => void (d.chassis.heatSinks.count = v) },
];

const TECH_BASES: [string, string][] = [
  ["inner-sphere", "Inner Sphere"],
  ["clan", "Clan"],
  ["mixed", "Mixed"],
];
const CONFIGURATIONS: [string, string][] = [
  ["biped", "Biped"],
  ["quad", "Quad"],
];

// ---------------------------------------------------------------------------------------------------------------
// What a finding or a changed marker can point at
// ---------------------------------------------------------------------------------------------------------------

const NO_LAYOUT: Layout = { supported: false, locations: [], slots: {}, unplaced: [], conflicts: [], overflow: [], partSlots: [] };
const safeLayout = (record: MechRecord, catalog: Catalog): Layout => {
  try {
    return buildLayout(record, catalog.factsOf);
  } catch {
    return NO_LAYOUT;
  }
};

/** The ids a finding may name a field by: the identity and chassis fields, and the armor fields drawn. */
function fieldTargets(armorLocations: string[]): Set<string> {
  const paths = ["name", "tons", "year", "techBase", "configuration", ...CHASSIS_FIELDS.filter((f) => f.kind === "select").map((f) => f.path), ...armorLocations.map((l) => `armor.${l}`)];
  return new Set(paths);
}

/** Where a finding points: the mount's cell if it names a mount, else the field, else nothing the page can focus. */
export function targetFor(where: Finding["where"], record: MechRecord, fields: Set<string>): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  if (where.field !== undefined && fields.has(where.field)) return fieldId(where.field);
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// The page: loading, then the editor
// ---------------------------------------------------------------------------------------------------------------

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: FamilyStorage; catalog: Catalog; record: MechRecord };

export default function EditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openFamilyStorage(), loadCatalog()]);
        const entry = await storage.get(id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.record) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, catalog, record: entry.record });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <Editor key={loaded.record.id} initial={loaded.record} catalog={loaded.catalog} storage={loaded.storage} />;
  // No heading while loading: the frame names the page after the first heading it finds, which should be the 'Mech's.
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>'Mech editor</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That 'Mech is not saved on this device." : `This saved 'Mech cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}

interface History {
  past: MechRecord[];
  present: MechRecord;
  future: MechRecord[];
  /** The field being typed into: edits to it in a row make one step. */
  group?: string;
}

const sameRecord = (a: MechRecord, b: MechRecord) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** What the weight summary says: the total, or what is known of it and how many items could not be weighed. */
export function weightSummary(weights: { lines: { tons: number | null }[]; total: number | null }, tons: number): string {
  const unknown = weights.lines.filter((l) => l.tons === null).length;
  if (weights.total !== null) return `${weights.total} of ${tons} tons`;
  if (unknown === 0) return "Weight unknown";
  const known = Math.round(weights.lines.reduce((sum, l) => sum + (l.tons ?? 0), 0) * 1000) / 1000;
  return `${known} of ${tons} tons, not counting ${unknown} ${unknown === 1 ? "item" : "items"} of unknown weight`;
}

/** Only a picture on mordel.net is shown; any other address in a file is ignored rather than requested. */
export function mordelPicture(url: string | undefined): url is string {
  if (url === undefined) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (parsed.hostname === "mordel.net" || parsed.hostname === "www.mordel.net");
  } catch {
    return false;
  }
}

/** Mordel's picture of the 'Mech; `onFail` is called when it cannot be loaded, so the page can take its place away. */
function Picture({ url, alt, onFail }: { url: string; alt: string; onFail: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      className="bt-picture"
      src={url}
      alt={alt}
      width={160}
      loading="lazy"
      referrerPolicy="no-referrer"
      data-loaded={loaded}
      onLoad={() => {
        setLoaded(true);
      }}
      onError={onFail}
    />
  );
}

/** The unsaved-changes question, a modal dialog like the picker: focus goes to Stay and comes back there. */
function LeaveConfirm({ proceed, reset }: { proceed: () => void; reset: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);
  const messageId = useId();
  useEffect(() => {
    before.current = document.activeElement;
    stay.current?.focus();
  }, []);
  const keep = () => {
    reset();
    // Back to what had focus; if that is gone, to the page's heading.
    const opener = before.current;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    else document.querySelector<HTMLElement>("h1")?.focus();
  };
  return (
    <div className="bt-picker-backdrop">
      <div
        ref={box}
        className="bt-picker bt-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={messageId}
        onKeyDown={(event) => {
          dialogKeyDown(event, box.current, keep);
        }}
      >
        <p id={messageId}>You have unsaved changes.</p>
        <span className="bt-actions">
          <button type="button" className="bt-button" onClick={proceed}>
            Leave without saving
          </button>
          <button type="button" ref={stay} className="bt-button bt-button--secondary" onClick={keep}>
            Stay
          </button>
        </span>
      </div>
    </div>
  );
}

function Editor({ initial, catalog, storage }: { initial: MechRecord; catalog: Catalog; storage: FamilyStorage }) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const [savedRecord, setSavedRecord] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [selected, setSelected] = useState<LocationCode>();
  /** Changing the key starts the slots panel afresh, which ends move mode and closes whatever is open. */
  const [panelKey, setPanelKey] = useState(0);
  const refocus = useRef<string | undefined>(undefined);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const record = history.present;
  const dirty = !sameRecord(record, savedRecord);

  const edit: OnEdit = (change, field) => {
    setJustSaved(false);
    setStatus("");
    setHistory((h) => {
      const next = editRecord(h.present, change);
      if (sameRecord(next, h.present)) return h; // nothing changed: no step, and no run of edits begins
      const joins = field !== undefined && h.group === field;
      return { past: joins ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], group: field };
    });
  };
  const undo = () => {
    setJustSaved(false);
    setPanelKey((k) => k + 1);
    setHistory((h) => {
      const previous = h.past[h.past.length - 1];
      return previous ? { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] } : h;
    });
  };
  const redo = () => {
    setJustSaved(false);
    setPanelKey((k) => k + 1);
    setHistory((h) => {
      const next = h.future[0];
      return next ? { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: h.future.slice(1) } : h;
    });
  };

  const save = async () => {
    const toSave = record;
    try {
      await storage.save(toSave);
    } catch {
      setJustSaved(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setStatus("");
    setSavedRecord(toSave);
    setJustSaved(true);
  };

  const layout = useMemo(() => safeLayout(record, catalog), [record, catalog]);
  const findings = useMemo(() => runChecks(record, catalog), [record, catalog]);
  const changed = useMemo(() => changedSinceImport(record, catalog), [record, catalog]);
  const weights = useMemo(() => buildWeights(record, catalog.factsOf), [record, catalog]);

  const armorLocations = layout.supported ? layout.locations : Object.keys(record.armor);
  const fields = fieldTargets(armorLocations);
  const targetOf = (where: Finding["where"]) => targetFor(where, record, fields);
  // Choosing a finding first ends move mode (the mounts' own elements are not on the page then), then moves focus.
  const focusTarget = (id: string) => {
    refocus.current = id;
    setPanelKey((k) => k + 1);
  };
  useEffect(() => {
    if (refocus.current === undefined) return;
    document.getElementById(refocus.current)?.focus();
    refocus.current = undefined;
  });

  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  const title = `${record.name.chassis} ${record.name.model}`.trim();
  const source = record.source;
  const figures = source
    ? [
        source.values.battleValue !== undefined && `Battle Value ${source.values.battleValue}`,
        source.values.cost !== undefined && `cost ${source.values.cost} C-bills`,
        source.values.rulesLevel !== undefined && `rules level ${source.values.rulesLevel}`,
        source.values.era !== undefined && `era ${source.values.era}`,
      ].filter(Boolean)
    : [];
  const mark = (path: string) => changed.has(path);
  const notes = importNotes(useLocation().state);
  const notesId = useId();
  const showPicture = !pictureFailed && mordelPicture(record.imageUrl);
  const chassisGroups = CHASSIS_FIELDS.reduce<ChassisField[][]>((groups, field) => {
    if (field.kind === "number") groups[groups.length - 1]?.push(field);
    else groups.push([field]);
    return groups;
  }, []);

  return (
    <div
      className="sr-page bt-editor"
      onBlur={() => {
        // Leaving a field ends the run of edits that make one Undo step.
        setHistory((h) => (h.group === undefined ? h : { ...h, group: undefined }));
      }}
    >
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <h1 tabIndex={-1}>{title || "Unnamed 'Mech"}</h1>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => void save()}>
            Save
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={history.past.length === 0} onClick={undo}>
            Undo
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={history.future.length === 0} onClick={redo}>
            Redo
          </button>
          <button
            type="button"
            className="bt-button bt-button--secondary"
            onClick={() => {
              downloadMech(record);
              setStatus("Export started.");
            }}
          >
            Export
          </button>
          <button
            type="button"
            className="bt-weight__toggle"
            aria-expanded={weightOpen}
            aria-controls="bt-weight-lines"
            onClick={() => {
              setWeightOpen(!weightOpen);
            }}
          >
            {weightSummary(weights, record.tons)}
          </button>
        </div>
      </header>

      <div className="bt-editor__status">
        <div role="status">{justSaved && !dirty ? "Saved." : status}</div>
        <div role="alert" className="bt-problem">
          {problem}
        </div>
      </div>

      <div className="bt-editor__info">
        {source && <p className="bt-credit">Designed by {source.designer || "an unnamed designer"} on mordel.net</p>}
        {weightOpen && (
          <ul id="bt-weight-lines" className="bt-weight">
            {weights.lines.map((line, index) => (
              <li key={index}>{`${line.label}: ${line.tons === null ? "unknown" : `${line.tons} tons`}`}</li>
            ))}
          </ul>
        )}
        {figures.length > 0 && <p className="bt-hint bt-figures">{`Mordel's figures: ${figures.join(", ")}`}</p>}
        {changed.has("source.unreadable") && (
          <p className="bt-hint">The original from mordel.net could not be read, so changes since import are not marked.</p>
        )}
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
        {notes.length > 0 && (
          <details className="bt-notes" aria-labelledby={notesId}>
            <summary id={notesId}>Import notes</summary>
            <ul>
              {notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="bt-editor__side">
        <FindingsPanel findings={findings} targetOf={targetOf} onChoose={focusTarget} />
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields" data-picture={showPicture}>
          {record.imageUrl && showPicture && (
            <Picture
              key={record.imageUrl}
              url={record.imageUrl}
              alt={`${title}, picture from mordel.net`}
              onFail={() => {
                setPictureFailed(true);
              }}
            />
          )}
          <section className="bt-panel" aria-labelledby="bt-identity">
            <h2 id="bt-identity">Identity</h2>
            <div className="bt-grid">
              <TextField id="field-name" label="Chassis name" value={record.name.chassis} changed={mark("name")} onChange={(v) => { edit((d) => void (d.name.chassis = v), "name"); }} />
              <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { edit((d) => void (d.name.model = v), "name-model"); }} />
              <SelectField
                id="field-techBase"
                label="Tech base"
                value={record.techBase}
                options={TECH_BASES}
                changed={mark("techBase")}
                onChange={(v) => { edit((d) => void (d.techBase = v as MechRecord["techBase"])); }}
              />
              <NumberField id="field-year" label="Year" value={record.year} allowEmpty changed={mark("year")} onValid={(v) => { edit((d) => void (d.year = v), "year"); }} />
              <NumberField id="field-tons" label="Tons" value={record.tons} changed={mark("tons")} onValid={(v) => { edit((d) => void (d.tons = v ?? d.tons), "tons"); }} />
              <SelectField
                id="field-configuration"
                label="Configuration"
                value={record.configuration}
                options={CONFIGURATIONS}
                changed={mark("configuration")}
                onChange={(v) => { edit((d) => void (d.configuration = v)); }}
              />
            </div>
          </section>

          <section className="bt-panel" aria-labelledby="bt-chassis">
            <h2 id="bt-chassis">Chassis</h2>
            <div className="bt-grid">
              {chassisGroups.map((group) => (
                <div key={group[0]?.path} className={group.length > 1 ? "bt-pair" : undefined}>
                  {group.map((field) =>
                    field.kind === "select" ? (
                      <SelectField
                        key={field.path}
                        id={fieldId(field.path)}
                        label={field.label}
                        value={field.read(record)}
                        options={field.options}
                        changed={mark(field.path)}
                        onChange={(v) => { edit((d) => { field.write(d, v); }); }}
                      />
                    ) : (
                      <NumberField
                        key={field.path}
                        id={fieldId(field.path)}
                        label={field.label}
                        value={field.read(record)}
                        onValid={(v) => { edit((d) => { field.write(d, v ?? 0); }, field.path); }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <ArmorPanel
          record={record}
          layout={layout}
          armorTons={weights.lines.find((l) => l.label === "Armor")?.tons ?? null}
          changed={changed}
          selected={selected}
          onSelect={setSelected}
          onEdit={edit}
        />

        <SlotsPanel key={panelKey} record={record} layout={layout} catalog={catalog} changed={changed} selected={selected} onSelect={setSelected} onEdit={edit} />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}

function importNotes(state: unknown): string[] {
  const notes = typeof state === "object" && state !== null && "notes" in state ? (state as { notes: unknown }).notes : undefined;
  return Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string") : [];
}
