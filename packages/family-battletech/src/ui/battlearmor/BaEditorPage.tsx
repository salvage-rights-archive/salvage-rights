// The battle armor editor: one saved suit, edited in place, with the rules check beside it. The page holds the record's history (for Undo and
// Redo), derives everything else from the current record, and hands each panel what it shows and an `onEdit(change)` callback. Same layout,
// controls, findings and leave-confirm as the 'Mech editor.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { checkBa } from "../../rules/battlearmor/checks";
import { build } from "../../rules/battlearmor/construct";
import type { BaRecord } from "../../rules/battlearmor/record";
import LeaveConfirm from "../editor/LeaveConfirm";
import { DraftOffer, useRecordHistory } from "../editor/useRecordHistory";
import { STORAGE_READ_FAILED } from "../storage";
import "../aero/aero.scss";
import "./ba.scss";
import BaBoundary from "./BaBoundary";
import { ArmorPanel, CapabilitiesNote, EquipmentPanel, IdentityPanel, MotivePanel } from "./BaPanels";
import { BaCalc, BaFindings, BaOfficialBadge, BaOfficialPanel } from "./BaSide";
import { targetFor } from "./edit";
import { BA_HOME, sheetHref } from "./routes";
import { downloadBa, openBaStorage } from "./storage";
import type { BaStorage } from "./storage";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: BaStorage; catalog: Catalog; record: BaRecord };

/** The editor for the unit named in the address; whatever goes wrong while showing it is caught and offered a way out. */
export default function BaEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <BaBoundary key={id} id={id}>
      <Loader id={id} />
    </BaBoundary>
  );
}

function Loader({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openBaStorage(), loadCatalog()]);
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
  // No heading while loading: the frame names the page after the first heading it finds, which should be the unit's.
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Battle armor editor</h1>
      {loaded.state === "failed" ? <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p> : <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>}
      <p>
        <Link className="sr-action" to={BA_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}


function Editor({ initial, catalog, storage }: { initial: BaRecord; catalog: Catalog; storage: BaStorage }) {
  const { record, dirty, canUndo, canRedo, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker, draft } = useRecordHistory(initial, (r) => storage.save(r));
  const [weightOpen, setWeightOpen] = useState(false);

  const findings = useMemo(() => checkBa(record, catalog), [record, catalog]);
  const built = useMemo(() => build(record, catalog), [record, catalog]);

  const title = `${record.name.chassis} ${record.name.model}`.trim();
  const weightText = `${String(built.totalKg)} of ${built.maxKg === undefined ? "?" : String(built.maxKg)} kg`;

  return (
    <div className="sr-page bt-editor" onBlur={endGroup}>
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <Link className="bt-back" to={BA_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed battle armor"}</h1>
          <p className="bt-hint">Battle armor, built under TechManual.</p>
          <p>
            <BaOfficialBadge record={record} />
          </p>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>
            Save
          </button>
          <Link className="bt-button bt-button--secondary" to={sheetHref(record.id)}>
            Record sheet
          </Link>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canRedo} onClick={redo}>
            Redo
          </button>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadBa(record); setStatus("Export started."); }}>
            Export
          </button>
          <button type="button" className="bt-weight__toggle" aria-expanded={weightOpen} aria-controls="ba-weight-lines" onClick={() => { setWeightOpen(!weightOpen); }}>
            {weightText}
          </button>
        </div>
      </header>

      <div className="bt-editor__status">
        <DraftOffer draft={draft} />
        <div role="status">{justSaved && !dirty ? "Saved." : status}</div>
        <div role="alert" className="bt-problem">{problem}</div>
      </div>

      <div className="bt-editor__info">
        {weightOpen && (
          <ul id="ba-weight-lines" className="bt-list">
            {built.lines.map((line, index) => (
              <li key={index}>{`${line.label}: ${String(line.kg)} kg`}</li>
            ))}
          </ul>
        )}
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
        <CapabilitiesNote record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__side">
        <BaFindings findings={findings} targetOf={(where) => targetFor(where, record)} onChoose={(id) => { document.getElementById(id)?.focus(); }} />
        <BaCalc record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields" data-picture="false">
          <IdentityPanel record={record} onEdit={edit} />
          <MotivePanel record={record} onEdit={edit} />
          <ArmorPanel record={record} onEdit={edit} />
          <BaOfficialPanel key={record.id} record={record} onEdit={edit} />
        </div>
        <EquipmentPanel record={record} catalog={catalog} onEdit={edit} />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}
