// The vehicles saved on this device, listed on the Classic home beside the 'Mechs: each opens in the vehicle editor or its record sheet.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { vehicleBv } from "../../rules/vehicle/bv";
import { motiveRowOf } from "../../rules/vehicle/vehicle";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { vehicleEditorHref, vehicleSheetHref } from "./routes";
import { openVehicleStorage } from "./storage";
import type { VehicleEntry, VehicleStorage } from "./storage";
import { VehicleOfficialBadge } from "./VehicleOfficial";

export default function VehicleShelf() {
  const [storage, setStorage] = useState<VehicleStorage>();
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [catalog, setCatalog] = useState<Catalog>();
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const s = await openVehicleStorage();
        const list = await s.list();
        if (!live) return;
        setStorage(s);
        setEntries(list);
        if (list.some((e) => e.record)) void loadCatalog().then((c) => { if (live) setCatalog(c); }).catch(() => undefined);
      } catch {
        if (live) setProblem(STORAGE_READ_FAILED);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(id);
      setEntries(await storage.list());
      setStatus("Deleted.");
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  if (entries.length === 0 && problem === "") return null;
  return (
    <section className="bt-section" aria-labelledby="bt-vehicles">
      <h2 id="bt-vehicles">Your vehicles</h2>
      <div role="status">{status}</div>
      {problem !== "" && (
        <p role="alert" className="bt-problem">
          {problem}
        </p>
      )}
      <ul className="bt-list">
        {entries.map((entry) => {
          const record = entry.record;
          const name = record ? `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed vehicle" : entry.id;
          return (
            <li key={entry.id} className="bt-row">
              <span className="bt-row__text">
                <strong>{name}</strong>
                {record ? (
                  <>
                    <span className="bt-row__credit">{`${motiveRowOf(record)?.label ?? record.motive}, ${String(record.tons)} tons${catalog ? `, Battle Value ${vehicleBv(record, catalog).total.toLocaleString("en-US")}` : ""}`}</span>
                    <span className="bt-row__credit">
                      <VehicleOfficialBadge record={record} />
                    </span>
                  </>
                ) : (
                  <span className="bt-row__credit">{entry.unreadable}</span>
                )}
              </span>
              <span className="bt-row__actions">
                {record && (
                  <>
                    <Link className="bt-button" aria-label={`Open ${name}`} to={vehicleEditorHref(entry.id)}>
                      Open
                    </Link>
                    <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={vehicleSheetHref(entry.id)}>
                      Record sheet
                    </Link>
                  </>
                )}
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={() => { setConfirming({ id: entry.id, name }); }}>
                  Delete
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {confirming && (
        <div
          className="bt-confirm"
          role="group"
          aria-label="Confirm delete"
          onKeyDown={(event) => {
            if (event.key === "Escape") setConfirming(undefined);
          }}
        >
          <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => { void remove(confirming.id); }}>
              Delete
            </button>
            <button type="button" ref={keep} className="bt-button bt-button--secondary" onClick={() => { setConfirming(undefined); }}>
              Keep
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
