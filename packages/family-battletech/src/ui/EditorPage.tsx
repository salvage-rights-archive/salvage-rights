// The 'Mech editor: one saved record, edited in place, with the rules check beside it. The page holds the record's history
// (for Undo and Redo), derives everything else from the current record, and hands each panel what it shows and an
// `onEdit(change)` callback. Every edit goes through `editRecord`.
import { editionName } from "../data/editions";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { Link, useBlocker, useLocation, useSearchParams } from "react-router";
import { ARMOR, STRUCTURE_TYPES } from "../data/chassis";
import { loadCatalog } from "../rules/catalog";
import type { Catalog } from "../rules/catalog";
import { runChecks } from "../rules/checks";
import type { Finding } from "../rules/checks";
import { changedSinceImport } from "../rules/mordel";
import { ARM_FULL, bodyOf, configurationOf, editRecord, layout as buildLayout, locationName, mechTypeOf, partMountBase, setConfiguration, weights as buildWeights } from "../rules/mech";
import type { Layout, LocationCode, MechRecord } from "../rules/mech";
import { configurationChoices, eraOfRecord, partChoices, setEra, setYear } from "../rules/availability";
import type { PartKind } from "../rules/availability";
import { heatSinkMixAllowed, heatSinkMixPossible, techBaseChoices, withLevel } from "../rules/levels";
import {
  BASE,
  applyBaseEdit,
  applyConfigurationEdit,
  defaultFixedMounts,
  omniChassisFindings,
  primaryOf,
  resolveBase,
  resolveConfiguration,
  splitRecord,
} from "../rules/omni";
import type { OmniChassis } from "../rules/omni";
import { BaseBreaks, CompareView, ConfigurationBar, OMNI_PANEL_ID, PodSpacePanel, omniTabId } from "./editor/OmniBar";
import type { OnChassis } from "./editor/OmniBar";
import { ERAS } from "../data/editions";
import LevelSelect from "./editor/LevelSelect";
import TypeSelect from "./editor/TypeSelect";
import ArmorPanel from "./editor/ArmorPanel";
import { dialogKeyDown } from "./editor/dialog";
import CalculatorPanel from "./editor/CalculatorPanel";
import FindingsPanel from "./editor/FindingsPanel";
import SlotsPanel from "./editor/SlotsPanel";
import { mordelPicture, readPicture } from "./picture";
import RecordBoundary from "./RecordBoundary";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadMech, downloadOmni, openFamilyStorage } from "./storage";
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
  disabled,
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
  /** Read-only: a part fixed in an OmniMech base, seen from a configuration. */
  disabled?: boolean;
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
            disabled={disabled}
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

export function TextField({ id, label, value, onChange, changed, disabled }: { id: string; label: string; value: string; onChange: (v: string) => void; changed?: boolean; disabled?: boolean }) {
  return (
    <Field id={id} label={label} changed={changed}>
      {(describedBy) => (
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
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
function AreaField({ id, label, value, onChange, changed }: { id: string; label: string; value: string; onChange: (v: string) => void; changed?: boolean }) {
  return (
    <Field id={id} label={label} changed={changed}>
      {(describedBy) => (
        <textarea
          id={id}
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

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  changed,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  options: [value: string, label: string][];
  onChange: (value: string) => void;
  changed?: boolean;
  disabled?: boolean;
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
          disabled={disabled}
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
    draft.mounts.push({ id, equipmentId: null, part, name: row.name, techBase: partMountBase(row, draft.techBase), location: null, slot: null });
    have++;
  }
}

/** Turns one arm actuator on or off. Without the lower arm there is no hand; an arm with both is not stored at all. */
export function setArmPart(draft: MechRecord, arm: "LA" | "RA", part: "lowerArm" | "hand", on: boolean): void {
  const next = { ...ARM_FULL, ...draft.arms?.[arm], [part]: on };
  if (!next.lowerArm) next.hand = false;
  const arms = { ...draft.arms };
  if (next.lowerArm && next.hand) delete arms[arm];
  else arms[arm] = next;
  if (Object.keys(arms).length === 0) delete draft.arms;
  else draft.arms = arms;
}

const ARM_CHOICES = [
  { part: "lowerArm", label: "Lower arm actuator" },
  { part: "hand", label: "Hand actuator" },
] as const;
const NOTE_FIELDS = [
  { key: "overview", label: "Overview" },
  { key: "capabilities", label: "Capabilities" },
  { key: "deployment", label: "Deployment" },
  { key: "variants", label: "Variants" },
  { key: "notables", label: "Notables" },
] as const;

// ---------------------------------------------------------------------------------------------------------------
// The fields, as tables
// ---------------------------------------------------------------------------------------------------------------

/** `choices` replaces the part table's list of options. */
type ChassisField =
  | { kind: "select"; path: string; label: string; part: PartKind; read: (r: MechRecord) => string; write: (d: MechRecord, v: string) => void; choices?: (r: MechRecord) => [string, string][] }
  | { kind: "number"; path: string; label: string; read: (r: MechRecord) => number; write: (d: MechRecord, v: number) => void };

/** The extra heat sink groups' controls: one pair for each stored group and one to add another, offered only where some pairing could be
 * allowed (heatSinkMixPossible; hide, do not mark). A group's choices are the kinds that may share the 'Mech with the main one (heatSinkMixAllowed)
 * and are not already used, plus what it already stores, so a stored group stays visible. */
function extraSinkFields(record: MechRecord): ChassisField[] {
  if (!heatSinkMixPossible(record)) return [];
  const { type, extra = [] } = record.chassis.heatSinks;
  const fields: ChassisField[] = [];
  for (let i = 0; i <= extra.length; i += 1) {
    const here = extra[i];
    const taken = extra.filter((_, j) => j !== i).map((g) => g.type);
    const choices = (r: MechRecord): [string, string][] => {
      const offered = partChoices("heatSink", r, here?.type ?? "").filter(([key]) => heatSinkMixAllowed(r, type, key) && !taken.includes(key));
      if (here && !offered.some(([key]) => key === here.type)) offered.push([here.type, here.type]);
      return [["", "None"], ...offered];
    };
    fields.push({
      kind: "select",
      path: `chassis.heatSinks-extra-${i}`,
      label: extra.length === 0 && i === 0 ? "Second heat sink type" : `Extra heat sink type ${i + 1}`,
      part: "heatSink",
      choices,
      read: (r) => r.chassis.heatSinks.extra?.[i]?.type ?? "",
      write: (d, v) => {
        const groups = d.chassis.heatSinks.extra ?? [];
        if (v === "") groups.splice(i, 1);
        else groups[i] = { type: v, count: groups[i]?.count ?? 0 };
        if (groups.length === 0) delete d.chassis.heatSinks.extra;
        else d.chassis.heatSinks.extra = groups;
      },
    });
    if (here) {
      fields.push({
        kind: "number",
        path: `chassis.heatSinks-extra-${i}-count`,
        label: `Extra heat sinks ${i + 1}`,
        read: (r) => r.chassis.heatSinks.extra?.[i]?.count ?? 0,
        write: (d, v) => {
          const group = d.chassis.heatSinks.extra?.[i];
          if (group) group.count = v;
        },
      });
    }
  }
  return fields;
}

const CHASSIS_FIELDS: ChassisField[] = [
  { kind: "select", path: "chassis.engine", label: "Engine type", part: "engine", read: (r) => r.chassis.engine.type, write: (d, v) => void (d.chassis.engine.type = v) },
  { kind: "number", path: "chassis.engine-rating", label: "Engine rating", read: (r) => r.chassis.engine.rating, write: (d, v) => void (d.chassis.engine.rating = v) },
  { kind: "select", path: "chassis.gyro", label: "Gyro", part: "gyro", read: (r) => r.chassis.gyro, write: (d, v) => void (d.chassis.gyro = v) },
  { kind: "select", path: "chassis.cockpit", label: "Cockpit", part: "cockpit", read: (r) => r.chassis.cockpit, write: (d, v) => void (d.chassis.cockpit = v) },
  { kind: "select", path: "chassis.structure", label: "Structure type", part: "structure", read: (r) => r.chassis.structure, write: (d, v) => { setPartType(d, "structure", v); } },
  { kind: "select", path: "chassis.armorType", label: "Armor type", part: "armor", read: (r) => r.chassis.armorType, write: (d, v) => { setPartType(d, "armor", v); } },
  { kind: "select", path: "chassis.myomer", label: "Myomer", part: "myomer", read: (r) => r.chassis.myomer, write: (d, v) => void (d.chassis.myomer = v) },
  { kind: "select", path: "chassis.heatSinks", label: "Heat sink type", part: "heatSink", read: (r) => r.chassis.heatSinks.type, write: (d, v) => void (d.chassis.heatSinks.type = v) },
  { kind: "number", path: "chassis.heatSinks-count", label: "Heat sinks", read: (r) => r.chassis.heatSinks.count, write: (d, v) => void (d.chassis.heatSinks.count = v) },
];

const ERA_CHOICES: [string, string][] = [["", "Any era"], ...ERAS.map((era): [string, string] => [era.id, `${era.name} (${String(era.startYear)}${era.endYear === undefined ? " on" : `-${String(era.endYear)}`})`])];

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
  const paths = ["name", "unitType", "rulesLevel", "tons", "year", "era", "techBase", "configuration", ...CHASSIS_FIELDS.filter((f) => f.kind === "select").map((f) => f.path), ...armorLocations.map((l) => `armor.${l}`)];
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
  | { state: "ready"; storage: FamilyStorage; catalog: Catalog; doc: Doc };

/** What the editor holds: a plain 'Mech, or an OmniMech chassis whose selected configuration is shown as a record. */
type Doc = MechRecord | OmniChassis;
const isChassis = (doc: Doc): doc is OmniChassis => "base" in doc;

/** The editor for the 'Mech named in the address; whatever goes wrong while showing it is caught and offered a way out. */
export default function EditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <RecordBoundary key={id} id={id}>
      <EditorLoader />
    </RecordBoundary>
  );
}

function EditorLoader() {
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
        else if (entry.chassis) setLoaded({ state: "ready", storage, catalog, doc: entry.chassis });
        else if (!entry.record) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, catalog, doc: withLevel(entry.record, catalog) });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <Editor key={loaded.doc.id} initial={loaded.doc} startAt={params.get("c") ?? undefined} catalog={loaded.catalog} storage={loaded.storage} />;
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
  past: Doc[];
  present: Doc;
  future: Doc[];
  /** The field being typed into: edits to it in a row make one step. */
  group?: string;
}

const sameRecord = (a: Doc, b: Doc) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** What the weight summary says: the total, or what is known of it and how many items could not be weighed. */
export function weightSummary(weights: { lines: { tons: number | null }[]; total: number | null }, tons: number): string {
  const unknown = weights.lines.filter((l) => l.tons === null).length;
  if (weights.total !== null) return `${weights.total} of ${tons} tons`;
  if (unknown === 0) return "Weight unknown";
  const known = Math.round(weights.lines.reduce((sum, l) => sum + (l.tons ?? 0), 0) * 1000) / 1000;
  return `${known} of ${tons} tons, not counting ${unknown} ${unknown === 1 ? "item" : "items"} of unknown weight`;
}

/** A picture of the 'Mech: Mordel's, or the player's own; `onFail` is called when it cannot be loaded, so the page can take its place away. */
function Picture({ url, alt, onFail }: { url: string; alt: string; onFail?: () => void }) {
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

function Editor({ initial, startAt, catalog, storage }: { initial: Doc; startAt?: string; catalog: Catalog; storage: FamilyStorage }) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const [savedDoc, setSavedDoc] = useState<Doc>(initial);
  /** An OmniMech chassis shows one of its configurations, or the base, as a record; this is which. */
  const [selected, setSelected] = useState<string>(() =>
    isChassis(initial) ? (startAt === BASE || initial.configurations.some((c) => c.id === startAt) ? (startAt ?? BASE) : (primaryOf(initial)?.id ?? BASE)) : "",
  );
  const [comparing, setComparing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [location, setLocation] = useState<LocationCode>();
  /** Changing the key starts the slots panel afresh, which ends move mode and closes whatever is open. */
  const [panelKey, setPanelKey] = useState(0);
  const refocus = useRef<string | undefined>(undefined);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const doc = history.present;
  const chassis = isChassis(doc) ? doc : undefined;
  // The record the page shows: the plain 'Mech, or the selected configuration (or the base) resolved from the chassis.
  const record = useMemo((): MechRecord => {
    if (!chassis) return doc as MechRecord;
    const primary = primaryOf(chassis);
    return resolveConfiguration(chassis, selected) ?? (primary && resolveConfiguration(chassis, primary.id)) ?? resolveBase(chassis);
  }, [doc, chassis, selected]);
  const activeId = chassis ? (record.omni?.configurationId ?? BASE) : "";
  const inBase = record.omni?.isBase === true;
  /** Seen from a configuration, the base's parts are shown but not edited. */
  const fixedHere = chassis !== undefined && !inBase;
  const dirty = !sameRecord(doc, savedDoc);

  /** Applies a change to what is shown: to the plain record, or written back into the base or the selected configuration. */
  const applyTo = (d: Doc, change: Change): Doc => {
    if (!isChassis(d)) return editRecord(d, change);
    const edited = editRecord(resolveConfiguration(d, activeId) ?? resolveBase(d), change);
    return activeId === BASE ? applyBaseEdit(d, edited) : applyConfigurationEdit(d, activeId, edited);
  };
  const push = (h: History, next: Doc, field?: string): History => {
    if (sameRecord(next, h.present)) return h; // nothing changed: no step, and no run of edits begins
    const joins = field !== undefined && h.group === field;
    return { past: joins ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], group: field };
  };
  const edit: OnEdit = (change, field) => {
    setJustSaved(false);
    setStatus("");
    setHistory((h) => push(h, applyTo(h.present, change), field));
  };
  /** Changes to the chassis itself: adding, renaming, reordering and deleting configurations. */
  const editChassis: OnChassis = (change, field) => {
    setJustSaved(false);
    setStatus("");
    setHistory((h) => (isChassis(h.present) ? push(h, change(h.present), field) : h));
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
    const toSave = doc;
    try {
      if (isChassis(toSave)) await storage.saveOmni(toSave);
      else await storage.save(toSave);
    } catch {
      setJustSaved(false);
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setStatus("");
    setSavedDoc(toSave);
    setJustSaved(true);
  };

  /** "Make Omni": the plain 'Mech becomes a chassis. What stays in every configuration (structure and armor slots, heat sinks, jump jets, MASC and
   * the like) goes to the base; the weapons, ammunition and other equipment are the Prime's pods. Saved at once, under the same id. */
  const makeOmni = async () => {
    if (isChassis(doc)) return;
    const rules = mechTypeOf({ unitType: "omnimech" }).omni;
    const body = configurationOf(doc.configuration);
    if (mechTypeOf(doc).industrial) {
      setProblem("An IndustrialMech cannot be built as an OmniMech (TechManual p. 64).");
      return;
    }
    if (rules && !rules.bodies.includes(doc.configuration)) {
      setProblem(`${body ? `A ${body.name}` : `A ${doc.configuration} 'Mech`} cannot be built as an OmniMech.`);
      return;
    }
    const next = splitRecord({ ...doc, unitType: "omnimech" }, defaultFixedMounts(doc, catalog));
    try {
      await storage.convertToOmni(next);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setProblem("");
    setHistory({ past: [], present: next, future: [] });
    setSavedDoc(next);
    setSelected(next.primaryId);
    setStatus("Made an OmniMech: the parts that stay in every configuration are the base, and the weapons and other equipment are the Prime's pods.");
  };

  const layout = useMemo(() => safeLayout(record, catalog), [record, catalog]);
  const findings = useMemo(() => [...runChecks(record, catalog), ...(chassis ? omniChassisFindings(chassis, catalog) : [])], [record, chassis, catalog]);
  const armorErrors = useMemo(
    () => new Set(findings.flatMap((f) => (f.check === "armor" && f.level === "error" && f.where?.location ? [f.where.location] : []))),
    [findings],
  );
  const changed = useMemo(() => changedSinceImport(record), [record]);
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
  const showMordel = !pictureFailed && mordelPicture(record.imageUrl);
  const showPicture = record.picture !== undefined || showMordel;
  const choosePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    const result = await readPicture(chosen);
    input.value = "";
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setProblem("");
    edit((d) => void (d.picture = { dataUrl: result.dataUrl }));
  };
  const chassisGroups = [...CHASSIS_FIELDS, ...extraSinkFields(record)].reduce<ChassisField[][]>((groups, field) => {
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
          {/* Leaving with unsaved changes asks first (the blocker below). */}
          <Link className="bt-back" to={HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed 'Mech"}</h1>
          <p className="bt-hint">Built under: {editionName(record.editionId)}</p>
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
              if (chassis) downloadOmni(chassis);
              else downloadMech(record);
              setStatus("Export started.");
            }}
          >
            {chassis ? "Export chassis" : "Export"}
          </button>
          {chassis && !inBase && (
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                downloadMech(record);
                setStatus("Export started.");
              }}
            >
              Export this configuration
            </button>
          )}
          {/* A navigation: leaving with unsaved changes asks first, and the sheet shows what is saved. */}
          <Link className="bt-button bt-button--secondary" to={`/battletech/classic/sheet?id=${encodeURIComponent(chassis ? chassis.id : record.id)}${chassis ? `&c=${encodeURIComponent(activeId)}` : ""}`}>
            Record sheet
          </Link>
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

      {chassis && (
        <div className="bt-editor__omni">
          <ConfigurationBar chassis={chassis} selected={activeId} onSelect={setSelected} onChassis={editChassis} comparing={comparing} onCompare={setComparing} />
          {isChassis(savedDoc) && <BaseBreaks saved={savedDoc} chassis={chassis} catalog={catalog} />}
          {comparing && <CompareView chassis={chassis} catalog={catalog} />}
          <PodSpacePanel chassis={chassis} record={record} catalog={catalog} onEditBase={() => { setSelected(BASE); }} />
        </div>
      )}

      <div className="bt-editor__side">
        <FindingsPanel findings={findings} targetOf={targetOf} onChoose={focusTarget} />
        <CalculatorPanel record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__body" {...(chassis ? { role: "tabpanel", id: OMNI_PANEL_ID, "aria-labelledby": omniTabId(activeId) } : {})}>
        <div className="bt-editor__fields" data-picture={showPicture}>
          <div className="bt-picturebox" role="group" aria-label="Picture">
            {record.picture ? (
              <Picture key={record.picture.dataUrl.length} url={record.picture.dataUrl} alt={`${title}, your picture`} />
            ) : (
              record.imageUrl &&
              showMordel && (
                <Picture
                  key={record.imageUrl}
                  url={record.imageUrl}
                  alt={`${title}, picture from mordel.net`}
                  onFail={() => {
                    setPictureFailed(true);
                  }}
                />
              )
            )}
            <div className="bt-field">
              <label htmlFor="field-picture">Upload a picture</label>
              <input
                id="field-picture"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void choosePicture(event);
                }}
              />
            </div>
            {record.picture && (
              <button
                type="button"
                className="bt-button bt-button--secondary"
                onClick={() => {
                  edit((d) => void delete d.picture);
                }}
              >
                Remove picture
              </button>
            )}
          </div>
          <section className="bt-panel" aria-labelledby="bt-identity">
            <h2 id="bt-identity">Identity</h2>
            <div className="bt-grid">
              <TextField id="field-name" label="Name" value={record.name.chassis} changed={mark("name")} disabled={fixedHere} onChange={(v) => { edit((d) => void (d.name.chassis = v), "name"); }} />
              <TextField id="field-name-model" label={chassis ? "Configuration name" : "Model"} value={record.name.model} disabled={chassis !== undefined} onChange={(v) => { edit((d) => void (d.name.model = v), "name-model"); }} />
              {chassis ? (
                <div className="bt-field">
                  <span id="field-unitType-label" className="bt-label">
                    Type
                  </span>
                  <span id="field-unitType" tabIndex={-1} aria-labelledby="field-unitType-label">
                    OmniMech
                  </span>
                </div>
              ) : (
                <TypeSelect
                  record={record}
                  onChange={(type) => {
                    if (type === "omnimech") void makeOmni();
                    else edit((d) => void (d.unitType = type));
                  }}
                />
              )}
              <SelectField
                id="field-configuration"
                label="Configuration"
                value={record.configuration}
                options={configurationChoices(record, record.configuration)}
                changed={mark("configuration")}
                disabled={fixedHere}
                onChange={(v) => { edit((d) => { setConfiguration(d, v); }); }}
              />
              <LevelSelect record={record} onChange={(level) => { edit((d) => void (d.rulesLevel = level)); }} />
              <SelectField
                id="field-techBase"
                label="Tech base"
                value={record.techBase}
                options={techBaseChoices(record.rulesLevel, record.techBase, record)}
                changed={mark("techBase")}
                disabled={fixedHere}
                onChange={(v) => { edit((d) => void (d.techBase = v as MechRecord["techBase"])); }}
              />
              <NumberField id="field-year" label="Year" value={record.year} allowEmpty changed={mark("year")} onValid={(v) => { edit((d) => { setYear(d, v); }, "year"); }} />
              <div className="bt-grid__wide">
              <SelectField
                id="field-era"
                label="Era"
                value={eraOfRecord(record)?.id ?? ""}
                options={ERA_CHOICES}
                changed={mark("era")}
                disabled={fixedHere}
                onChange={(v) => { edit((d) => { setEra(d, v); }, "era"); }}
              />
              </div>
              <NumberField id="field-tons" label="Tons" value={record.tons} changed={mark("tons")} disabled={fixedHere} onValid={(v) => { edit((d) => void (d.tons = v ?? d.tons), "tons"); }} />
            </div>
          </section>

          <section className="bt-panel" aria-labelledby="bt-chassis">
            <h2 id="bt-chassis">Chassis</h2>
            {fixedHere && (
              <p className="bt-hint">
                The identity, the chassis parts and the armor are fixed in the base.{" "}
                <button type="button" className="bt-link" onClick={() => { setSelected(BASE); }}>
                  Edit base
                </button>
              </p>
            )}
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
                        options={field.choices ? field.choices(record) : partChoices(field.part, record, field.read(record))}
                        changed={mark(field.path)}
                        disabled={fixedHere}
                        onChange={(v) => { edit((d) => { field.write(d, v); }); }}
                      />
                    ) : (
                      <NumberField
                        key={field.path}
                        id={fieldId(field.path)}
                        label={field.label}
                        value={field.read(record)}
                        disabled={fixedHere || (chassis !== undefined && field.path.startsWith("chassis.heatSinks-") && field.path.endsWith("count") && !inBase)}
                        onValid={(v) => { edit((d) => { field.write(d, v ?? 0); }, field.path); }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
            {!inBase && (bodyOf(record.configuration) === "biped" || bodyOf(record.configuration) === "tripod") &&
              (["LA", "RA"] as const).map((arm) => {
                const has = { ...ARM_FULL, ...record.arms?.[arm] };
                const arms = locationName(arm);
                return (
                  <fieldset key={arm} className="bt-arm">
                    <legend>{`${arms} actuators`}</legend>
                    {ARM_CHOICES.map(({ part, label }) => (
                      <label key={part} className="bt-check">
                        <input
                          type="checkbox"
                          aria-label={`${arms} ${label.toLowerCase()}`}
                          checked={part === "hand" ? has.lowerArm && has.hand : has.lowerArm}
                          disabled={part === "hand" && !has.lowerArm}
                          onChange={(event) => {
                            edit((d) => { setArmPart(d, arm, part, event.target.checked); });
                          }}
                        />
                        {label}
                      </label>
                    ))}
                    {mark(`arms.${arm}`) && <Changed id={`arms-${arm}-changed`} />}
                  </fieldset>
                );
              })}
          </section>

          <section className="bt-panel">
            <details className="bt-notes">
              <summary>Readout</summary>
              {NOTE_FIELDS.map(({ key, label }) => (
                <AreaField
                  key={key}
                  id={`field-notes-${key}`}
                  label={label}
                  value={record.notes[key] ?? ""}
                  changed={mark(`notes.${key}`)}
                  onChange={(v) => {
                    edit((d) => {
                      if (v === "") delete d.notes[key];
                      else d.notes[key] = v;
                    }, `notes-${key}`);
                  }}
                />
              ))}
            </details>
          </section>
        </div>

        <ArmorPanel
          record={record}
          catalog={catalog}
          layout={layout}
          armorTons={weights.lines.find((l) => l.label === "Armor")?.tons ?? null}
          changed={changed}
          selected={location}
          errorLocations={armorErrors}
          onSelect={setLocation}
          onEdit={edit}
          readOnly={fixedHere}
        />

        <SlotsPanel
          key={panelKey}
          record={record}
          layout={layout}
          catalog={catalog}
          changed={changed}
          selected={location}
          onSelect={setLocation}
          onEdit={edit}
          lockedIds={fixedHere ? new Set(record.omni?.baseMountIds) : undefined}
        />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}

function importNotes(state: unknown): string[] {
  const notes = typeof state === "object" && state !== null && "notes" in state ? (state as { notes: unknown }).notes : undefined;
  return Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string") : [];
}
