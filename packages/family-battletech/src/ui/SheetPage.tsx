// The record sheet page: one saved 'Mech as the sheet to print at the table, with a short bar above it (not printed).
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { loadCatalog } from "../rules/catalog";
import type { Catalog } from "../rules/catalog";
import { runChecks } from "../rules/checks";
import type { MechRecord } from "../rules/mech";
import { BASE, configurationTitle, primaryOf, resolveBase, resolveConfiguration } from "../rules/omni";
import type { OmniChassis } from "../rules/omni";
import { baseOf, gameBase, gameOfPath, RULESETS, rulesetOf } from "../data/rulesets";
import RecordBoundary from "./RecordBoundary";
import RecordSheet from "./sheet/RecordSheet";
import { sheetTitle } from "./sheet/facts";
import { STORAGE_READ_FAILED, openFamilyStorage } from "./storage";
import { useGothicTheme } from "./gothic/theme";
import "./classic.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; catalog: Catalog; record: MechRecord; chassis?: OmniChassis };

/** The sheet for the 'Mech named in the address; whatever goes wrong while drawing it is caught and offered a way out. */
export default function SheetPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <RecordBoundary key={id} id={id}>
      <SheetLoader />
    </RecordBoundary>
  );
}

function SheetLoader() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const asked = params.get("c") ?? undefined;
  const game = gameOfPath(useLocation().pathname);
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  // Until the record is in hand the address says which game this is; then the record decides (the Sheet itself).
  useGothicTheme(game === "gothic" && loaded.state !== "ready");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openFamilyStorage(), loadCatalog()]);
        const entry = await storage.get(id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (entry.chassis) {
          // An OmniMech prints one configuration at a time: the one named in the address, else the Primary; `c=base` is the unloaded base.

          const primary = primaryOf(entry.chassis);
          const record = asked === BASE ? resolveBase(entry.chassis) : ((asked ? resolveConfiguration(entry.chassis, asked) : undefined) ?? (primary && resolveConfiguration(entry.chassis, primary.id)) ?? resolveBase(entry.chassis));
          setLoaded({ state: "ready", catalog, record, chassis: entry.chassis });
        } else if (!entry.record) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", catalog, record: entry.record });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id, asked]);

  if (loaded.state === "ready") return <Sheet record={loaded.record} catalog={loaded.catalog} chassis={loaded.chassis} />;
  // No heading while loading: the frame names the page after the first heading it finds, which should be the 'Mech's.
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Record sheet</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That 'Mech is not saved on this device." : `This saved 'Mech cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={`${baseOf(game)}/home`}>
          Back to {RULESETS[game].name}
        </Link>
      </p>
    </div>
  );
}

function Sheet({ record, catalog, chassis }: { record: MechRecord; catalog: Catalog; chassis?: OmniChassis }) {
  const base = gameBase(record);
  const gothic = rulesetOf(record.editionId).game === "gothic";
  useGothicTheme(gothic);
  const [dazzle, setDazzle] = useState(false);
  const errors = useMemo(() => runChecks(record, catalog).filter((f) => f.level === "error").length, [record, catalog]);
  return (
    <div className="sr-page bt-sheetpage">
      <div className="bt-sheetpage__bar">
        <h1 tabIndex={-1}>{`${sheetTitle(record)} record sheet`}</h1>
        <div className="bt-actions">
          <Link className="bt-back" to={`${base}/home`}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs
          </Link>
          <Link className="bt-button bt-button--secondary" to={`${base}/editor?id=${encodeURIComponent(chassis ? chassis.id : record.id)}${chassis ? `&c=${encodeURIComponent(record.omni?.configurationId ?? BASE)}` : ""}`}>
            Edit
          </Link>
          <button
            type="button"
            className="bt-button"
            onClick={() => {
              window.print();
            }}
          >
            Print
          </button>
        </div>
        <p className="bt-hint">Prints on one page, Letter or A4. In the print dialog, turn off headers and footers.</p>
        {chassis && (
          <nav aria-label="Configurations" className="bt-actions">
            {[...chassis.configurations.map((c) => ({ id: c.id, label: configurationTitle(c) })), { id: BASE, label: "Base" }].map((c) => (
              <Link
                key={c.id}
                className="bt-button bt-button--secondary"
                aria-current={record.omni?.configurationId === c.id ? "page" : undefined}
                to={`${base}/sheet?id=${encodeURIComponent(chassis.id)}&c=${encodeURIComponent(c.id)}`}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        )}
        {gothic && (
          <label className="bt-check">
            <input
              type="checkbox"
              checked={dazzle}
              onChange={(event) => {
                setDazzle(event.target.checked);
              }}
            />
            Show Dazzle Mode lines under each laser
          </label>
        )}
        {errors > 0 && <p role="status">{`This 'Mech has ${String(errors)} rules ${errors === 1 ? "error" : "errors"}. The sheet shows it as saved.`}</p>}
      </div>
      <RecordSheet record={record} catalog={catalog} dazzle={gothic && dazzle} />
    </div>
  );
}
