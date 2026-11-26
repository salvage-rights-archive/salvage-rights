// The saved ProtoMechs, listed on the Classic home beside the 'Mechs and opened in the ProtoMech editor. Nothing shows until one is saved.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { optionSummary } from "../../rules/protomech/options";
import { protoTitle } from "../../rules/protomech/record";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { OfficialBadge } from "./ProtoPanels";
import { editorHref, sheetHref } from "./routes";
import { downloadProto, openProtoStorage } from "./storage";
import type { ProtoEntry, ProtoStorage } from "./storage";

export default function ProtoSavedUnits() {
  const [storage, setStorage] = useState<ProtoStorage>();
  const [entries, setEntries] = useState<ProtoEntry[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [message, setMessage] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    void openProtoStorage()
      .then(async (s) => {
        setStorage(s);
        setEntries(await s.list());
      })
      .catch(() => { setMessage(STORAGE_READ_FAILED); });
  }, []);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  if (entries.length === 0 && message === "") return null;
  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(id);
      setEntries(await storage.list());
      setMessage("Deleted.");
    } catch {
      setMessage(STORAGE_WRITE_FAILED);
    }
  };
  return (
    <section className="bt-section" aria-labelledby="pm-saved">
      <h2 id="pm-saved">Your ProtoMechs</h2>
      <ul className="bt-list">
        {entries.map((entry) => {
          const record = entry.record;
          const name = record ? protoTitle(record) || "Unnamed ProtoMech" : "Unreadable unit";
          return (
            <li key={entry.id} className="bt-row">
              <span className="bt-row__text">
                <strong>{name}</strong>
                {record ? ` ProtoMech, ${String(record.tons)} tons${optionSummary(record).map((o) => `, ${o}`).join("")}` : ""}
                {record && <span className="bt-row__credit"><OfficialBadge record={record} /></span>}
                {!record && <span className="bt-row__credit">{entry.unreadable}</span>}
              </span>
              <span className="bt-row__actions">
                {record && <Link className="bt-button" aria-label={`Open ${name}`} to={editorHref(entry.id)}>Open</Link>}
                {record && <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={sheetHref([entry.id])}>Record sheet</Link>}
                {record && <button type="button" className="bt-button bt-button--secondary" aria-label={`Export ${name}`} onClick={() => { downloadProto(record); setMessage("Export started."); }}>Export</button>}
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={() => { setConfirming({ id: entry.id, name }); }}>Delete</button>
              </span>
            </li>
          );
        })}
      </ul>
      {confirming && (
        <div className="bt-confirm" role="group" aria-label="Confirm delete" onKeyDown={(event) => { if (event.key === "Escape") setConfirming(undefined); }}>
          <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => { void remove(confirming.id); }}>Delete</button>
            <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(undefined); }}>Keep</button>
          </span>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
