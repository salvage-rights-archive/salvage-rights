// The vehicle editor: one saved Combat Vehicle, edited in place, with the rules check beside it. Laid out as the 'Mech editor is: the record's history
// (for Undo and Redo) lives here, everything else is derived from the current record, and each panel gets what it shows and an `onEdit(change)` callback.
import { useEffect, useMemo, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import type { Finding } from "../../rules/checks";
import { checkVehicle } from "../../rules/vehicle/checks";
import { vehicleBv } from "../../rules/vehicle/bv";
import { vehicleCost } from "../../rules/vehicle/cost";
import { vehicleTally } from "../../rules/vehicle/vehicle";
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import FindingsPanel from "../editor/FindingsPanel";
import LeaveConfirm from "../editor/LeaveConfirm";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import VehicleBoundary from "./VehicleBoundary";
import VehicleOfficialPanel, { VehicleOfficialBadge } from "./VehicleOfficial";
import { ArmorPanel, EnginePanel, EquipmentPanel, HeatPanel, IdentityPanel, locationFieldId, mountDomId } from "./VehicleParts";
import type { VehicleOnEdit } from "./edit";
import { VEHICLE_HOME, vehicleSheetHref } from "./routes";
import { downloadVehicle, openVehicleStorage } from "./storage";
import type { VehicleStorage } from "./storage";
import "./vehicle.scss";

const HISTORY_LIMIT = 100;

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: VehicleStorage; catalog: Catalog; record: VehicleRecord };

/** The editor for the vehicle named in the address; whatever goes wrong while showing it is caught and offered a way out. */
export default function VehicleEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <VehicleBoundary key={id} id={id}>
      <Loader id={id} />
    </VehicleBoundary>
  );
}

function Loader({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openVehicleStorage(), loadCatalog()]);
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
      <h1>Vehicle editor</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That vehicle is not saved on this device." : `This saved vehicle cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={VEHICLE_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}

interface History {
  past: VehicleRecord[];
  present: VehicleRecord;
  future: VehicleRecord[];
  /** The field being typed into: edits to it in a row make one step. */
  group?: string;
}

const same = (a: VehicleRecord, b: VehicleRecord) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** The id of the control a finding points at, when this vehicle's page has one. */
export function targetFor(where: Finding["where"], record: VehicleRecord): string | undefined {
  if (!where) return undefined;
  if (where.mountId !== undefined && record.mounts.some((m) => m.id === where.mountId)) return mountDomId(where.mountId);
  const field = where.field;
  if (field === undefined) return undefined;
  if (field === "motive") return "field-motive";
  if (["tons", "year", "techBase", "cruise", "engine", "heatSinks", "turret", "rulesLevel", "era"].includes(field)) return field === "engine" ? "field-engine" : field === "rulesLevel" ? "field-rulesLevel" : `field-${field}`;
  if (field === "armor.type") return "field-armor-type";
  if (field === "armor.tons" || field === "armor.points") return "field-armor-tons";
  if (field.startsWith("armor.points.")) return locationFieldId(field.slice("armor.points.".length));
  if (field === "mounts") return "vehicle-equipment";
  return undefined;
}

function Editor({ initial, catalog, storage }: { initial: VehicleRecord; catalog: Catalog; storage: VehicleStorage }) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const [saved, setSaved] = useState<VehicleRecord>(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [weightOpen, setWeightOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const record = history.present;
  const dirty = !same(record, saved);

  const edit: VehicleOnEdit = (change, field) => {
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

  const findings = useMemo(() => checkVehicle(record, catalog), [record, catalog]);
  const tally = useMemo(() => vehicleTally(record, catalog), [record, catalog]);
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
  const weightText = `${String(tally.total)} of ${String(record.tons)} tons${tally.unknown.length === 0 ? "" : ", not counting what could not be weighed"}`;

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
          <Link className="bt-back" to={VEHICLE_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs and vehicles
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed vehicle"}</h1>
          <p>
            <VehicleOfficialBadge record={record} />
          </p>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>
            Save
          </button>
          <Link className="bt-button bt-button--secondary" to={vehicleSheetHref(record.id)}>
            Record sheet
          </Link>
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
              downloadVehicle(record);
              setStatus("Export started.");
            }}
          >
            Export
          </button>
          <button type="button" className="bt-weight__toggle" aria-expanded={weightOpen} aria-controls="vehicle-weight-lines" onClick={() => { setWeightOpen(!weightOpen); }}>
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
          <ul id="vehicle-weight-lines" className="bt-list bt-readout">
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
          <EnginePanel record={record} onEdit={edit} />
          <HeatPanel record={record} catalog={catalog} onEdit={edit} />
          <VehicleOfficialPanel key={record.id} record={record} onEdit={edit} />
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
function FiguresPanel({ record, catalog }: { record: VehicleRecord; catalog: Catalog }) {
  const bv = useMemo(() => vehicleBv(record, catalog), [record, catalog]);
  const cost = useMemo(() => vehicleCost(record, catalog), [record, catalog]);
  const [open, setOpen] = useState(false);
  return (
    <section className="bt-panel" aria-labelledby="vehicle-figures">
      <h2 id="vehicle-figures">Battle Value and cost</h2>
      <p>
        <strong>{`Battle Value ${bv.total.toLocaleString("en-US")}`}</strong>
        {`, ${cost.total.toLocaleString("en-US")} C-bills`}
      </p>
      {!bv.complete && <p className="bt-hint">{`Not counted, no printed Battle Value: ${bv.unvalued.join(", ")}.`}</p>}
      {cost.unpriced.length > 0 && <p className="bt-hint">{`Not priced: ${cost.unpriced.map((u) => `${u.name} (${u.why})`).join("; ")}.`}</p>}
      <button type="button" className="bt-weight__toggle" aria-expanded={open} aria-controls="vehicle-figure-lines" onClick={() => { setOpen(!open); }}>
        {open ? "Hide the steps" : "Show the steps"}
      </button>
      {open && (
        <ul id="vehicle-figure-lines" className="bt-list bt-readout">
          {bv.lines.map((line) => (
            <li key={`bv-${line.label}`} className="bt-hint">{`${line.label}: ${String(line.value)}${line.note ? ` (${line.note})` : ""}`}</li>
          ))}
          {cost.lines.map((line) => (
            <li key={`c-${line.label}`} className="bt-hint">{`${line.label}: ${line.cost === 0 ? "" : `${Math.round(line.cost).toLocaleString("en-US")} = `}${line.how}`}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
