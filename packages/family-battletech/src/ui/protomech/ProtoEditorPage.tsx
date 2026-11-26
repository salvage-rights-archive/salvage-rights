// The ProtoMech editor: one saved ProtoMech, edited in place, with the rules check beside it, the same layout and controls as the 'Mech editor. The page holds the
// record's history (for Undo and Redo), derives everything else from the current record, and hands each panel what it shows and an `onEdit(change)` callback.
import { Component, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link, useBlocker, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { tally } from "../../rules/protomech/build";
import { checkProto } from "../../rules/protomech/checks";
import type { ProtoFinding } from "../../rules/protomech/checks";
import type { ProtoRecord } from "../../rules/protomech/record";
import { protoTitle } from "../../rules/protomech/record";
import LeaveConfirm from "../editor/LeaveConfirm";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import { fieldId } from "../aero/fields";
import { ArmorPanel, ChassisPanel, FindingsPanel, IdentityPanel, OfficialBadge, OfficialPanel, RatingPanel, WeaponsPanel } from "./ProtoPanels";
import { locationDomId, mountDomId } from "./edit";
import type { ProtoOnEdit } from "./edit";
import { CLASSIC_HOME, sheetHref } from "./routes";
import { downloadProto, openProtoStorage } from "./storage";
import type { ProtoStorage } from "./storage";
import "./protomech.scss";

const HISTORY_LIMIT = 100;

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: ProtoStorage; catalog: Catalog; record: ProtoRecord };

/** A saved unit the editor cannot show must never blank the page: it says which record it is, offers a copy of what is stored, and a way back. */
class Boundary extends Component<{ id: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  override render() {
    if (!this.state.error) return this.props.children;
    const { id } = this.props;
    return (
      <div className="sr-page">
        <h1>This unit could not be shown</h1>
        <p>Something in the saved unit stopped this page from drawing. Nothing has been changed or lost. You can keep a copy of exactly what is saved.</p>
        <p>
          Record id: <code>{id || "(none)"}</code>
        </p>
        <p className="bt-hint">{this.state.error.message}</p>
        <p className="bt-actions">
          <button
            type="button"
            className="bt-button"
            onClick={() => {
              void openProtoStorage().then((s) => s.raw(id)).then((stored) => { downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "unit"}.raw.json`, stored ?? null); });
            }}
          >
            Export raw record
          </button>
          <Link className="bt-button bt-button--secondary" to={CLASSIC_HOME}>
            Back to Classic BattleTech
          </Link>
        </p>
      </div>
    );
  }
}

export default function ProtoEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <Boundary key={id} id={id}>
      <Loader id={id} />
    </Boundary>
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

interface History {
  past: ProtoRecord[];
  present: ProtoRecord;
  future: ProtoRecord[];
  group?: string;
}
const same = (a: ProtoRecord, b: ProtoRecord) => a === b || JSON.stringify(a) === JSON.stringify(b);

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
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const [saved, setSaved] = useState<ProtoRecord>(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [weightOpen, setWeightOpen] = useState(false);
  const record = history.present;
  const dirty = !same(record, saved);

  const edit: ProtoOnEdit = (change, field) => {
    setJustSaved(false);
    setStatus("");
    setHistory((h) => {
      const next = structuredClone(h.present);
      change(next);
      if (same(next, h.present)) return h;
      const joins = field !== undefined && h.group === field;
      return { past: joins ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], group: field };
    });
  };
  const undo = () => {
    setJustSaved(false);
    setHistory((h) => {
      const previous = h.past[h.past.length - 1];
      return previous ? { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] } : h;
    });
  };
  const redo = () => {
    setJustSaved(false);
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
    setSaved(toSave);
    setJustSaved(true);
  };

  const findings = useMemo(() => checkProto(record, catalog), [record, catalog]);
  const weight = useMemo(() => tally(record, catalog), [record, catalog]);
  const errorAt = useMemo(() => findings.filter((f) => f.level === "error" && f.where?.location !== undefined).map((f) => f.where?.location ?? ""), [findings]);
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

  const title = protoTitle(record);
  const limit = record.tons * 1000;
  const weightText = `${String(weight.total)} of ${String(limit)} kg${weight.unknown.length > 0 ? ", not counting what could not be weighed" : ""}`;

  return (
    <div className="sr-page bt-editor" onBlur={() => { setHistory((h) => (h.group === undefined ? h : { ...h, group: undefined })); }}>
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
          <button type="button" className="bt-button bt-button--secondary" disabled={history.past.length === 0} onClick={undo}>Undo</button>
          <button type="button" className="bt-button bt-button--secondary" disabled={history.future.length === 0} onClick={redo}>Redo</button>
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
