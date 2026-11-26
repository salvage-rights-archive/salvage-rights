// The battle armor saved on this device, listed on the Classic home beside the 'Mechs and opened in the battle armor editor. Nothing shows while
// there is none. A saved unit that cannot be read is listed with a way to delete it, never dropped.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { weightClassOf } from "../../data/battlearmor";
import { officialLabel } from "../../rules/official";
import { officialState } from "../../rules/battlearmor/checks";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { editorHref, sheetHref } from "./routes";
import { openBaStorage } from "./storage";
import type { BaEntry, BaStorage } from "./storage";

export function SavedBattleArmor() {
  const [storage, setStorage] = useState<BaStorage>();
  const [entries, setEntries] = useState<BaEntry[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const opened = await openBaStorage();
        const list = await opened.list();
        if (!live) return;
        setStorage(opened);
        setEntries(list);
      } catch {
        if (live) setProblem(STORAGE_READ_FAILED);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(id);
      setEntries(await storage.list());
      setProblem("");
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  if (entries.length === 0 && problem === "") return null;
  return (
    <section className="bt-section" aria-labelledby="bt-saved-ba">
      <h2 id="bt-saved-ba">Your battle armor</h2>
      {problem !== "" && <p role="alert" className="bt-problem">{problem}</p>}
      <ul className="bt-list">
        {entries.map((entry) => {
          const record = entry.record;
          if (!record) {
            return (
              <li key={entry.id} className="bt-row">
                <span className="bt-row__text">This saved battle armor cannot be read. {entry.unreadable}</span>
                <span className="bt-row__actions">
                  <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirming({ id: entry.id, name: "this battle armor" }); }}>
                    Delete
                  </button>
                </span>
              </li>
            );
          }
          const name = `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed battle armor";
          const cls = weightClassOf(record.weightClass);
          return (
            <li key={entry.id} className="bt-row">
              <span className="bt-row__text">
                <strong>{name}</strong>
                {` ${cls?.label ?? record.weightClass} ${record.body}, ${String(record.troopers)} troopers`}
                <span className="bt-row__credit">{officialLabel(officialState(record)).badge}</span>
              </span>
              <span className="bt-row__actions">
                <Link className="bt-button" aria-label={`Open ${name}`} to={editorHref(record.id)}>
                  Open
                </Link>
                <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={sheetHref(record.id)}>
                  Record sheet
                </Link>
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={() => { setConfirming({ id: record.id, name }); }}>
                  Delete
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {confirming && (
        <div className="bt-confirm" role="group" aria-label="Confirm delete battle armor" onKeyDown={(event) => { if (event.key === "Escape") setConfirming(undefined); }}>
          <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => { void remove(confirming.id); }}>
              Delete
            </button>
            <button type="button" className="bt-button bt-button--secondary" autoFocus onClick={() => { setConfirming(undefined); }}>
              Keep
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
