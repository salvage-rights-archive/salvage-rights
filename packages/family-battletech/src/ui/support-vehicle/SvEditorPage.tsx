// The Support Vehicle editor: one saved Support Vehicle, edited in place, with the rules check beside it. Laid out as the 'Mech editor is: the record's history
// (for Undo and Redo) lives here, everything else is derived from the current record, and each panel gets what it shows and an `onEdit(change)` callback.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import type { Finding } from "../../rules/checks";
import { checkSv } from "../../rules/support-vehicle/checks";
import { svBv } from "../../rules/support-vehicle/bv";
import { svCost } from "../../rules/support-vehicle/cost";
import { svTally } from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import FindingsPanel from "../editor/FindingsPanel";
import LeaveConfirm from "../editor/LeaveConfirm";
import { useRecordHistory } from "../editor/useRecordHistory";
import { STORAGE_READ_FAILED } from "../storage";
import SvBoundary from "./SvBoundary";
import SvOfficialPanel, { SvOfficialBadge } from "./SvOfficial";
import { ArmorPanel, ChassisPanel, CrewPanel, EnginePanel, EquipmentPanel, HeatPanel, IdentityPanel, locationFieldId, mountDomId } from "./SvParts";
import { SV_HOME, svSheetHref } from "./routes";
import { downloadSv, openSvStorage } from "./storage";
import type { SvStorage } from "./storage";
import "../vehicle/vehicle.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: SvStorage; catalog: Catalog; record: SupportVehicleRecord };

/** The editor for the Support Vehicle named in the address; whatever goes wrong while showing it is caught and offered a way out. */
export default function SvEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <SvBoundary key={id} id={id}>
      <Loader id={id} />
    </SvBoundary>
  );
}

function Loader({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openSvStorage(), loadCatalog()]);
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
  // No heading while loading: the frame names the page after the first heading it finds, which should be the vehicle's.
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Support Vehicle editor</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That Support Vehicle is not saved on this device." : `This saved Support Vehicle cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={SV_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}


/** The id of the control a finding points at, when this vehicle's page has one. */
export function targetFor(where: Finding["where"], record: SupportVehicleRecord): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  const field = where.field;
  if (field === undefined) return undefined;
  if (field === "motive") return "field-motive";
  if (["tons", "year", "techBase", "cruise", "engine", "heatSinks", "turret", "rulesLevel", "era", "fuelTons", "extraCrew", "fireControl"].includes(field)) return `field-${field}`;
  if (field === "structure.rating") return "field-structure-rating";
  if (field === "structure.mods") return "sv-chassis";
  if (field === "engine.rating") return "field-engine-rating";
  if (field === "armor.bar") return "field-armor-bar";
  if (field === "armor.points") return "field-armor-bar";
  if (field.startsWith("armor.points.")) return locationFieldId(field.slice("armor.points.".length));
  if (field === "mounts") return "sv-equipment";
  return undefined;
}

function Editor({ initial, catalog, storage }: { initial: SupportVehicleRecord; catalog: Catalog; storage: SvStorage }) {
  const { record, dirty, canUndo, canRedo, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker } = useRecordHistory(initial, (r) => storage.save(r));
  const [weightOpen, setWeightOpen] = useState(false);
  const [selected, setSelected] = useState<string>();

  const findings = useMemo(() => checkSv(record, catalog), [record, catalog]);
  const tally = useMemo(() => svTally(record, catalog), [record, catalog]);

  const title = `${record.name.chassis} ${record.name.model}`.trim();
  const weightText = `${String(tally.total)} of ${String(record.tons)} tons${tally.unknown.length === 0 ? "" : ", not counting what could not be weighed"}`;

  return (
    <div
      className="sr-page bt-editor"
      onBlur={endGroup}
    >
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <Link className="bt-back" to={SV_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs and vehicles
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed Support Vehicle"}</h1>
          <p>
            <SvOfficialBadge record={record} />
          </p>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>
            Save
          </button>
          <Link className="bt-button bt-button--secondary" to={svSheetHref(record.id)}>
            Record sheet
          </Link>
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
              downloadSv(record);
              setStatus("Export started.");
            }}
          >
            Export
          </button>
          <button type="button" className="bt-weight__toggle" aria-expanded={weightOpen} aria-controls="sv-weight-lines" onClick={() => { setWeightOpen(!weightOpen); }}>
            {weightText}
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
        {weightOpen && (
          <ul id="sv-weight-lines" className="bt-list bt-readout">
            {tally.lines.map((line) => (
              <li key={line.label} className="bt-hint">{`${line.label}: ${String(line.tons)} ${line.tons === 1 ? "ton" : "tons"}`}</li>
            ))}
          </ul>
        )}
        {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
      </div>

      <div className="bt-editor__side">
        <FindingsPanel
          findings={findings}
          targetOf={(where) => targetFor(where, record)}
          onChoose={(id) => {
            document.getElementById(id)?.focus();
          }}
        />
        <FiguresPanel record={record} catalog={catalog} />
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields" data-picture="false">
          <IdentityPanel record={record} onEdit={edit} />
          <ChassisPanel record={record} onEdit={edit} />
          <EnginePanel record={record} onEdit={edit} />
          <CrewPanel record={record} catalog={catalog} onEdit={edit} />
          <HeatPanel record={record} catalog={catalog} onEdit={edit} />
          <SvOfficialPanel key={record.id} record={record} onEdit={edit} />
        </div>
        <ArmorPanel
          record={record}
          onEdit={edit}
          selected={selected}
          onSelect={(code) => {
            setSelected(code);
            document.getElementById(locationFieldId(code))?.focus();
          }}
        />
        <EquipmentPanel record={record} catalog={catalog} onEdit={edit} />
      </div>

      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}

/** Battle Value and cost, with the steps. */
function FiguresPanel({ record, catalog }: { record: SupportVehicleRecord; catalog: Catalog }) {
  const bv = useMemo(() => svBv(record, catalog), [record, catalog]);
  const cost = useMemo(() => svCost(record, catalog), [record, catalog]);
  const [open, setOpen] = useState(false);
  return (
    <section className="bt-panel" aria-labelledby="sv-figures">
      <h2 id="sv-figures">Battle Value and cost</h2>
      <p>
        <strong>{`Battle Value ${bv.total.toLocaleString("en-US")}`}</strong>
        {`, ${cost.total.toLocaleString("en-US")} C-bills`}
      </p>
      {!bv.complete && <p className="bt-hint">{`Not counted, no printed Battle Value: ${bv.unvalued.join(", ")}.`}</p>}
      {cost.unpriced.length > 0 && <p className="bt-hint">{`Not priced: ${cost.unpriced.map((u) => `${u.name} (${u.why})`).join("; ")}.`}</p>}
      <button type="button" className="bt-weight__toggle" aria-expanded={open} aria-controls="sv-figure-lines" onClick={() => { setOpen(!open); }}>
        {open ? "Hide the steps" : "Show the steps"}
      </button>
      {open && (
        <ul id="sv-figure-lines" className="bt-list bt-readout">
          {bv.lines.map((line, i) => (
            <li key={`bv-${String(i)}`} className="bt-hint">{`${line.label}: ${String(line.value)}${line.note ? ` (${line.note})` : ""}`}</li>
          ))}
          {cost.lines.map((line, i) => (
            <li key={`c-${String(i)}`} className="bt-hint">{`${line.label}: ${line.cost === 0 ? "" : `${Math.round(line.cost).toLocaleString("en-US")} = `}${line.how}`}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
