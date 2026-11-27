// The ProtoMech editor: one saved ProtoMech, edited in place, with the rules check beside it, the same layout and controls as the 'Mech editor. The page holds the
// record's history (for Undo and Redo), derives everything else from the current record, and hands each panel what it shows and an `onEdit(change)` callback.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { tally } from "../../rules/protomech/build";
import { checkProto } from "../../rules/protomech/checks";
import type { ProtoFinding } from "../../rules/protomech/checks";
import type { ProtoRecord } from "../../rules/protomech/record";
import { protoTitle } from "../../rules/protomech/record";
import LeaveConfirm from "../editor/LeaveConfirm";
import { useRecordHistory } from "../editor/useRecordHistory";
import { STORAGE_READ_FAILED } from "../storage";
import UnitBoundary from "../UnitBoundary";
import { fieldId } from "../aero/fields";
import { ArmorPanel, ChassisPanel, FindingsPanel, IdentityPanel, OfficialBadge, OfficialPanel, RatingPanel, WeaponsPanel } from "./ProtoPanels";
import { locationDomId, mountDomId } from "./edit";
import { CLASSIC_HOME, sheetHref } from "./routes";
import { downloadProto, openProtoStorage } from "./storage";
import type { ProtoStorage } from "./storage";
import "./protomech.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: ProtoStorage; catalog: Catalog; record: ProtoRecord };

export default function ProtoEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <UnitBoundary key={id} id={id} unit="unit" home={CLASSIC_HOME} raw={async (key) => (await openProtoStorage()).raw(key)}>
      <Loader id={id} />
    </UnitBoundary>
  );
}

function Loader({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openProtoStorage(), loadCatalog()]);
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
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>ProtoMech editor</h1>
      {loaded.state === "failed" ? <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p> : <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>}
      <p>
        <Link className="sr-action" to={CLASSIC_HOME}>Back to Classic BattleTech</Link>
      </p>
    </div>
  );
}


/** The id of the control a finding points at, when this page has one. */
export function targetFor(where: ProtoFinding["where"], record: ProtoRecord): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  if (where.field !== undefined) {
    if (where.field.startsWith("armor.")) return fieldId(`armor-${where.field.slice(6)}`);
    return fieldId(where.field);
  }
  if (where.location !== undefined) return locationDomId(where.location);
  return undefined;
}

function Editor({ initial, catalog, storage }: { initial: ProtoRecord; catalog: Catalog; storage: ProtoStorage }) {
  const { record, dirty, canUndo, canRedo, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker } = useRecordHistory(initial, (r) => storage.save(r));
  const [weightOpen, setWeightOpen] = useState(false);
  // What an import from Mordel could not match, handed over by the Import page.
  const state: unknown = useLocation().state;
  const stateNotes = typeof state === "object" && state !== null && "notes" in state ? (state as { notes: unknown }).notes : undefined;
  const notes = Array.isArray(stateNotes) ? stateNotes.filter((n): n is string => typeof n === "string") : [];

  const findings = useMemo(() => checkProto(record, catalog), [record, catalog]);
  const weight = useMemo(() => tally(record, catalog), [record, catalog]);
  const errorAt = useMemo(() => findings.filter((f) => f.level === "error" && f.where?.location !== undefined).map((f) => f.where?.location ?? ""), [findings]);

  const title = protoTitle(record);
  const limit = record.tons * 1000;
  const weightText = `${String(weight.total)} of ${String(limit)} kg${weight.unknown.length > 0 ? ", not counting what could not be weighed" : ""}`;

  return (
    <div className="sr-page bt-editor" onBlur={endGroup}>
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <Link className="bt-back" to={CLASSIC_HOME}>
            <span aria-hidden="true">&larr; </span>Your Classic units
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed ProtoMech"}</h1>
          <p className="bt-hint">ProtoMech, built under TechManual construction.</p>
          <p><OfficialBadge record={record} /></p>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>Save</button>
          <Link className="bt-button bt-button--secondary" to={sheetHref([record.id])}>Record sheet</Link>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canUndo} onClick={undo}>Undo</button>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canRedo} onClick={redo}>Redo</button>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadProto(record); setStatus("Export started."); }}>Export</button>
          <button type="button" className="bt-weight__toggle" aria-expanded={weightOpen} aria-controls="pm-weight-lines" onClick={() => { setWeightOpen(!weightOpen); }}>
            {weightText}
          </button>
        </div>
      </header>

      <div className="bt-editor__status">
        <div role="status">{justSaved && !dirty ? "Saved." : status}</div>
        <div role="alert" className="bt-problem">{problem}</div>
      </div>

      <div className="bt-editor__info">
        {weightOpen && (
          <ul id="pm-weight-lines" className="bt-list">
            {weight.lines.map((line) => (
              <li key={line.label} className="bt-hint">{`${line.label}: ${String(line.kg)} kg`}</li>
            ))}
          </ul>
        )}
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
        {notes.length > 0 && (
          <details className="bt-notes">
            <summary>Import notes</summary>
            <ul>
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="bt-editor__side">
        <FindingsPanel findings={findings} targetOf={(where) => targetFor(where, record)} onChoose={(id) => { document.getElementById(id)?.focus(); }} />
        <RatingPanel record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields" data-picture="false">
          <IdentityPanel record={record} catalog={catalog} onEdit={edit} />
          <ChassisPanel record={record} onEdit={edit} />
          <ArmorPanel record={record} onEdit={edit} inError={errorAt} />
          <OfficialPanel key={record.id} record={record} onEdit={edit} />
        </div>
        <WeaponsPanel record={record} catalog={catalog} onEdit={edit} />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}
