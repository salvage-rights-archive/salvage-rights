// The ProtoMech record sheet page: a Point of one to five saved ProtoMechs as the sheet to print at the table, with a short bar above it (not printed). The Point
// is the list of ids in the address (a design may be listed more than once, for five of a kind); the bar adds and removes members.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { checkProto } from "../../rules/protomech/checks";
import { protoTitle } from "../../rules/protomech/record";
import type { ProtoRecord } from "../../rules/protomech/record";
import { STORAGE_READ_FAILED } from "../storage";
import ProtoSheet, { POINT_SIZE } from "./ProtoSheet";
import { CLASSIC_HOME, editorHref, sheetHref } from "./routes";
import { openProtoStorage } from "./storage";
import "./protomech.scss";

type Loaded = { state: "loading" } | { state: "failed" } | { state: "ready"; catalog: Catalog; saved: ProtoRecord[]; missing: string[] };

export default function ProtoSheetPage() {
  const [params] = useSearchParams();
  const ids = params.getAll("id").filter((id) => id !== "").slice(0, POINT_SIZE);
  const key = ids.join("|");
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openProtoStorage(), loadCatalog()]);
        const entries = await storage.list();
        if (!live) return;
        const saved = entries.flatMap((e) => (e.record ? [e.record] : []));
        setLoaded({ state: "ready", catalog, saved, missing: key.split("|").filter((id) => id !== "" && !saved.some((r) => r.id === id)) });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);

  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  if (loaded.state === "failed") {
    return (
      <div className="sr-page">
        <h1>Record sheet</h1>
        <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p>
        <p><Link className="sr-action" to={CLASSIC_HOME}>Back to Classic BattleTech</Link></p>
      </div>
    );
  }
  const { catalog, saved, missing } = loaded;
  const point = ids.flatMap((id) => saved.filter((r) => r.id === id));
  const errors = point.reduce((sum, r) => sum + checkProto(r, catalog).filter((f) => f.level === "error").length, 0);
  const go = (next: string[]) => { void navigate(sheetHref(next), { replace: true }); };
  const addable = saved.filter(() => ids.length < POINT_SIZE);
  return (
    <div className="sr-page bt-sheetpage">
      <div className="bt-sheetpage__bar">
        <h1 tabIndex={-1}>ProtoMech record sheet</h1>
        <div className="bt-actions">
          <Link className="bt-back" to={CLASSIC_HOME}><span aria-hidden="true">&larr; </span>Your Classic units</Link>
          {point[0] && <Link className="bt-button bt-button--secondary" to={editorHref(point[0].id)}>Edit</Link>}
          {point.length > 0 && <button type="button" className="bt-button" onClick={() => { window.print(); }}>Print</button>}
        </div>
        <p className="bt-hint">Prints on one page, Letter or A4. In the print dialog, turn off headers and footers. A Point holds up to five ProtoMechs.</p>
        {missing.length > 0 && <p role="status">{`${String(missing.length)} saved ${missing.length === 1 ? "unit" : "units"} named in the address could not be found on this device.`}</p>}
        {errors > 0 && <p role="status">{`The Point has ${String(errors)} rules ${errors === 1 ? "error" : "errors"}. The sheet shows the units as saved.`}</p>}
        <h2>The Point</h2>
        <ul className="pm-point">
          {point.map((record, i) => (
            <li key={`${record.id}-${String(i)}`}>
              <span>{`${String(i + 1)}. ${protoTitle(record) || "Unnamed ProtoMech"}`}</span>
              <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${protoTitle(record) || "ProtoMech"} (${String(i + 1)}) from the Point`} onClick={() => { go(ids.filter((_, at) => at !== i)); }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {ids.length < POINT_SIZE && (
          <div className="bt-field">
            <label htmlFor="pm-add-to-point">Add a ProtoMech to the Point</label>
            <select id="pm-add-to-point" value="" onChange={(e) => { if (e.target.value !== "") go([...ids, e.target.value]); }}>
              <option value="">{saved.length === 0 ? "No saved ProtoMechs" : "Choose a design"}</option>
              {addable.map((r) => (
                <option key={r.id} value={r.id}>{protoTitle(r) || "Unnamed ProtoMech"}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {point.length === 0 ? <p>Choose a ProtoMech to put on the sheet.</p> : <ProtoSheet records={point} catalog={catalog} />}
    </div>
  );
}
