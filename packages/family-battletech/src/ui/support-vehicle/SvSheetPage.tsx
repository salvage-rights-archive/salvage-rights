// The Support Vehicle record sheet page: one saved Support Vehicle as the sheet to print at the table, with a short bar above it (not printed).
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { checkSv } from "../../rules/support-vehicle/checks";
import SvBoundary from "./SvBoundary";
import SvSheet, { sheetTitle } from "./SvSheet";
import { SV_HOME, svEditorHref } from "./routes";
import { openSvStorage } from "./storage";
import { STORAGE_READ_FAILED } from "../storage";
import "../vehicle/vehicle.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; catalog: Catalog; record: SupportVehicleRecord };

/** The sheet for the unit named in the address; whatever goes wrong while drawing it is caught and offered a way out. */
export default function SvSheetPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <SvBoundary key={id} id={id}>
      <SheetLoader id={id} />
    </SvBoundary>
  );
}

function SheetLoader({ id }: { id: string }) {
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
        else setLoaded({ state: "ready", catalog, record: entry.record });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <Sheet record={loaded.record} catalog={loaded.catalog} />;
  // No heading while loading: the frame names the page after the first heading it finds, which should be the unit's.
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Record sheet</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={SV_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}

function Sheet({ record, catalog }: { record: SupportVehicleRecord; catalog: Catalog }) {
  const errors = useMemo(() => checkSv(record, catalog).filter((f) => f.level === "error").length, [record, catalog]);
  return (
    <div className="sr-page bt-sheetpage">
      <div className="bt-sheetpage__bar">
        <h1 tabIndex={-1}>{`${sheetTitle(record)} record sheet`}</h1>
        <div className="bt-actions">
          <Link className="bt-back" to={SV_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs and vehicles
          </Link>
          <Link className="bt-button bt-button--secondary" to={svEditorHref(record.id)}>
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
        {errors > 0 && <p role="status">{`This Support Vehicle has ${String(errors)} rules ${errors === 1 ? "error" : "errors"}. The sheet shows it as saved.`}</p>}
      </div>
      <SvSheet record={record} catalog={catalog} />
    </div>
  );
}
