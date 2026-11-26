// The AeroTech record sheet page: one saved fighter as the sheet to print at the table, with a short bar above it (not printed). A unit type or
// edition without a sheet yet gets a plain note and the way back, never an empty page.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { aeroEditionName } from "../../data/aero";
import { sheetProfileFor } from "../../data/aero-sheet";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import type { AeroRecord } from "../../rules/aero";
import { checkAero } from "../../rules/aero-checks";
import AeroBoundary from "./AeroBoundary";
import FighterSheet from "./sheet/FighterSheet";
import { AERO_HOME, editorHref } from "./routes";
import { openAeroStorage } from "./storage";
import { STORAGE_READ_FAILED } from "../storage";
import "./aero.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; catalog: Catalog; record: AeroRecord };

/** The sheet for the unit named in the address; whatever goes wrong while drawing it is caught and offered a way out. */
export default function AeroSheetPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <AeroBoundary key={id} id={id}>
      <SheetLoader id={id} />
    </AeroBoundary>
  );
}

function SheetLoader({ id }: { id: string }) {
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
        <Link className="sr-action" to={AERO_HOME}>
          Back to AeroTech
        </Link>
      </p>
    </div>
  );
}

function Sheet({ record, catalog }: { record: AeroRecord; catalog: Catalog }) {
  const profile = sheetProfileFor(record.editionId, record.unitType);
  const errors = useMemo(() => checkAero(record, catalog).filter((f) => f.level === "error").length, [record, catalog]);
  const title = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed unit";
  return (
    <div className="sr-page bt-sheetpage">
      <div className="bt-sheetpage__bar">
        <h1 tabIndex={-1}>{`${title} record sheet`}</h1>
        <div className="bt-actions">
          <Link className="bt-back" to={AERO_HOME}>
            <span aria-hidden="true">&larr; </span>Your AeroTech units
          </Link>
          <Link className="bt-button bt-button--secondary" to={editorHref(record.id)}>
            Edit
          </Link>
          {profile && (
            <button
              type="button"
              className="bt-button"
              onClick={() => {
                window.print();
              }}
            >
              Print
            </button>
          )}
        </div>
        {profile ? (
          <p className="bt-hint">Prints on one page, Letter or A4. In the print dialog, turn off headers and footers.</p>
        ) : (
          <p role="status">{`We have no record sheet yet for this unit type under ${aeroEditionName(record.editionId)}. The sheets for fighters are ready; small craft, DropShips and the large craft are still to come.`}</p>
        )}
        {profile && errors > 0 && <p role="status">{`This unit has ${String(errors)} rules ${errors === 1 ? "error" : "errors"}. The sheet shows it as saved.`}</p>}
      </div>
      {profile && <FighterSheet record={record} catalog={catalog} profile={profile} />}
    </div>
  );
}
