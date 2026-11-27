// The AeroTech editor: one saved aerospace unit, edited in place, with the rules check beside it. The page holds the record's history
// (for Undo and Redo), derives everything else from the current record, and hands each panel what it shows and an `onEdit(change)`
// callback. The unit is built under one edition and the panels show only what that edition builds; the check beside it speaks for that
// edition and can also speak for another ("Check under") without touching the unit.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { aeroEditionName } from "../../data/aero";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { fighterKind, fighterTally, locationsOf, vessel, vesselGroup } from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import { checkAero } from "../../rules/aero-checks";
import type { AeroFinding } from "../../rules/aero-checks";
import LeaveConfirm from "../editor/LeaveConfirm";
import { useRecordHistory } from "../editor/useRecordHistory";
import AeroBoundary from "./AeroBoundary";
import AeroOfficialPanel, { AeroOfficialBadge } from "./AeroOfficial";
import { STORAGE_READ_FAILED } from "../storage";
import { CraftPanel, WeaponsPanel, arcDomId, mountDomId } from "./AeroArcs";
import AeroFindings from "./AeroFindings";
import AeroBvPanel from "./AeroBvPanel";
import { ArmorPanel, EnginePanel, HeatPanel, IdentityPanel, WeightLines } from "./AeroParts";
import { fieldId } from "./fields";
import { sheetProfileFor } from "../../data/aero-sheet";
import { AERO_HOME, sheetHref } from "./routes";
import { downloadAero, openAeroStorage } from "./storage";
import type { AeroStorage } from "./storage";
import "./aero.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: AeroStorage; catalog: Catalog; record: AeroRecord };

/** The editor for the unit named in the address; whatever goes wrong while showing it is caught and offered a way out. */
export default function AeroEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <AeroBoundary key={id} id={id}>
      <Loader id={id} />
    </AeroBoundary>
  );
}

function Loader({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openAeroStorage(), loadCatalog()]);
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
      <h1>AeroTech editor</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={AERO_HOME}>
          Back to AeroTech
        </Link>
      </p>
    </div>
  );
}


/** The id of the control a finding points at, when this unit's page has one. */
export function targetFor(where: AeroFinding["where"], record: AeroRecord): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  if (where.arc !== undefined && (locationsOf(record).arcs.includes(where.arc) || record.mounts.some((m) => m.arc === where.arc))) return arcDomId(where.arc);
  const built = fighterKind(record) !== undefined || vesselGroup(record) !== undefined;
  const field = where.field;
  if (field === undefined) return undefined;
  if (["unitType", "tons", "year", "techBase"].includes(field)) return fieldId(field);
  if (!built) return undefined;
  if (field === "engine") return fighterKind(record) === undefined && record.unitType !== "warship" ? undefined : fieldId(field);
  if (field === "thrust" || field === "fuelTons" || field === "si" || field === "crew") return fieldId(field);
  if (field === "heatSinks") return fieldId("heatSinks");
  if (field === "armor.type") return fieldId("armor-type");
  if (field === "armor.patchwork") return fieldId(`patchwork-${locationsOf(record).armor[0] ?? "NO"}`);
  if (field.startsWith("armor.patchwork.")) return fieldId(`patchwork-${field.slice("armor.patchwork.".length)}`);
  if (field === "armor.tons" || field === "armor.points") return fieldId("armor-tons");
  if (field.startsWith("armor.points.")) return fieldId(`armor-${field.slice("armor.points.".length)}`);
  return undefined;
}

function Editor({ initial, catalog, storage }: { initial: AeroRecord; catalog: Catalog; storage: AeroStorage }) {
  const { record, dirty, canUndo, canRedo, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker } = useRecordHistory(initial, (r) => storage.save(r));
  const [weightOpen, setWeightOpen] = useState(false);

  const findings = useMemo(() => checkAero(record, catalog), [record, catalog]);
  const tally = useMemo(() => (fighterKind(record) !== undefined ? fighterTally(record, catalog) : vessel(record, catalog)?.tally), [record, catalog]);

  const title = `${record.name.chassis} ${record.name.model}`.trim();
  const weightText =
    tally === undefined ? undefined : tally.unknown.length === 0 ? `${String(tally.total)} of ${String(record.tons)} tons` : `${String(tally.total)} of ${String(record.tons)} tons, not counting what could not be weighed`;

  return (
    <div
      className="sr-page bt-editor"
      onBlur={endGroup}
    >
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <Link className="bt-back" to={AERO_HOME}>
            <span aria-hidden="true">&larr; </span>Your AeroTech units
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed unit"}</h1>
          <p className="bt-hint">Built under: {aeroEditionName(record.editionId)}</p>
          <p>
            <AeroOfficialBadge record={record} />
          </p>
        </div>
        <div className="bt-actions">
          <button
            type="button"
            className="bt-button"
            disabled={!dirty}
            onClick={() => {
              void save();
            }}
          >
            Save
          </button>
          {sheetProfileFor(record.editionId, record.unitType) && (
            <Link className="bt-button bt-button--secondary" to={sheetHref(record.id)}>
              Record sheet
            </Link>
          )}
          <button type="button" className="bt-button bt-button--secondary" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canRedo} onClick={redo}>
            Redo
          </button>
          <button
            type="button"
            className="bt-button bt-button--secondary"
            onClick={() => {
              downloadAero(record);
              setStatus("Export started.");
            }}
          >
            Export
          </button>
          {weightText !== undefined && (
            <button
              type="button"
              className="bt-weight__toggle"
              aria-expanded={weightOpen}
              aria-controls="aero-weight-lines"
              onClick={() => {
                setWeightOpen(!weightOpen);
              }}
            >
              {weightText}
            </button>
          )}
        </div>
      </header>

      <div className="bt-editor__status">
        <div role="status">{justSaved && !dirty ? "Saved." : status}</div>
        <div role="alert" className="bt-problem">
          {problem}
        </div>
      </div>

      <div className="bt-editor__info">
        {weightOpen && tally && <WeightLines lines={tally.lines} />}
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
      </div>

      <div className="bt-editor__side">
        <AeroFindings
          record={record}
          catalog={catalog}
          findings={findings}
          targetOf={(where) => targetFor(where, record)}
          onChoose={(id) => {
            document.getElementById(id)?.focus();
          }}
        />
        <AeroBvPanel record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields" data-picture="false">
          <IdentityPanel record={record} catalog={catalog} onEdit={edit} />
          <EnginePanel record={record} onEdit={edit} />
          <ArmorPanel record={record} onEdit={edit} />
          <HeatPanel record={record} onEdit={edit} />
          <AeroOfficialPanel key={record.id} record={record} onEdit={edit} />
        </div>
        <WeaponsPanel record={record} catalog={catalog} onEdit={edit} />
        <CraftPanel record={record} catalog={catalog} onEdit={edit} />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}
