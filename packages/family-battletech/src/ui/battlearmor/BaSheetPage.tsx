// The battle armor record sheet page: one saved suit as the sheet to print at the table, with a short bar above it (not printed).
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { checkBa } from "../../rules/battlearmor/checks";
import type { BaRecord } from "../../rules/battlearmor/record";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { STORAGE_READ_FAILED } from "../storage";
import "../aero/aero.scss";
import "./ba.scss";
import BaBoundary from "./BaBoundary";
import BaSheet from "./BaSheet";
import { BA_HOME, editorHref } from "./routes";
import { openBaStorage } from "./storage";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; catalog: Catalog; record: BaRecord };

/** The sheet for the unit named in the address; whatever goes wrong while drawing it is caught and offered a way out. */
export default function BaSheetPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <BaBoundary key={id} id={id}>
      <SheetLoader id={id} />
    </BaBoundary>
  );
}

function SheetLoader({ id }: { id: string }) {
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
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Record sheet</h1>
      {loaded.state === "failed" ? <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p> : <p>{loaded.state === "missing" ? "That unit is not saved on this device." : `This saved unit cannot be read. ${loaded.message}`}</p>}
      <p>
        <Link className="sr-action" to={BA_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}

function Sheet({ record, catalog }: { record: BaRecord; catalog: Catalog }) {
  const errors = useMemo(() => checkBa(record, catalog).filter((f) => f.level === "error").length, [record, catalog]);
  const title = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed battle armor";
  return (
    <div className="sr-page bt-sheetpage">
      <div className="bt-sheetpage__bar">
        <h1 tabIndex={-1}>{`${title} record sheet`}</h1>
        <div className="bt-actions">
          <Link className="bt-back" to={BA_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs
          </Link>
          <Link className="bt-button bt-button--secondary" to={editorHref(record.id)}>
            Edit
          </Link>
          <button type="button" className="bt-button" onClick={() => { window.print(); }}>
            Print
          </button>
        </div>
        <p className="bt-hint">Prints on one page, Letter or A4. In the print dialog, turn off headers and footers.</p>
        {errors > 0 && <p role="status">{`This unit has ${String(errors)} rules ${errors === 1 ? "error" : "errors"}. The sheet shows it as saved.`}</p>}
      </div>
      <BaSheet record={record} catalog={catalog} />
    </div>
  );
}
