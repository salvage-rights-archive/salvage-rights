import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { AS_EDITION } from "../../data/alpha-strike";
import { unitTitle } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import { downloadUnit, fromUnitFile, openAsStorage } from "./storage";
import type { AsEntry, AsStorage } from "./storage";
import AsMordelImport from "./AsMordelImport";
import AsMulImport from "./AsMulImport";
import AsMordelFile from "./AsMordelFile";
import GamePicture from "../GamePicture";
import "../classic.scss";
import "./alpha-strike.scss";

const MAX_IMPORT_BYTES = 1024 * 1024 * 4;
const unitHref = (id: string) => `/battletech/alpha-strike/unit?id=${encodeURIComponent(id)}`;

export default function AsHomePage() {
  const [storage, setStorage] = useState<AsStorage>();
  const [entries, setEntries] = useState<AsEntry[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };
  const fail = (text: string) => {
    setStatus("");
    setProblem(text);
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAsStorage();
        setStorage(s);
        setEntries(await s.list());
      } catch {
        fail(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!focusList.current) return;
    focusList.current = false;
    (entries.length === 0 ? emptyRef.current : headingRef.current)?.focus();
  }, [entries]);

  const reload = async (s: AsStorage): Promise<boolean> => {
    try {
      setEntries(await s.list());
      return true;
    } catch {
      fail(STORAGE_READ_FAILED);
      return false;
    }
  };

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(id);
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    focusList.current = true;
    if (await reload(storage)) say("Deleted.");
  };

  const exportRaw = async (id: string) => {
    if (!storage) return;
    try {
      downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "unit"}.raw.json`, (await storage.raw(id)) ?? null);
      say("Export started.");
    } catch {
      fail("We could not read that unit to export it.");
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) {
      message = "That file is too large to be a unit file.";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a unit file.";
      }
      if (!message) {
        const result = fromUnitFile(parsed);
        if (!result.ok) {
          message = result.message;
        } else {
          try {
            const taken = (await storage.list()).some((e) => e.id === result.unit.id);
            await storage.save(taken ? { ...result.unit, id: crypto.randomUUID() } : result.unit);
            if (await reload(storage)) say("Unit imported.");
          } catch {
            message = STORAGE_WRITE_FAILED;
          }
        }
      }
    }
    if (message) fail(message);
    input.value = "";
  };

  const askDelete = (target: { id: string; name: string }, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };
  const cancel = () => {
    setConfirming(undefined);
    openerRef.current?.focus();
  };

  return (
    <div className="sr-page">
      <h1>Alpha Strike</h1>
      <GamePicture game="alpha-strike" />
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your units last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <section className="bt-section" aria-labelledby="as-rules">
        <h2 id="as-rules">Played under</h2>
        <p>{`${AS_EDITION.name} (${AS_EDITION.publisher}).`}</p>
        <p className="bt-hint">It is the only edition for now. The rules level and the errata we follow come with a later step.</p>
      </section>

      <section className="bt-section" aria-labelledby="as-saved">
        <h2 id="as-saved" ref={headingRef} tabIndex={-1}>
          Your units
        </h2>
        {storage && entries.length === 0 ? (
          <p ref={emptyRef} tabIndex={-1}>
            No units saved yet.
          </p>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const unit = entry.unit;
              if (!unit) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved unit cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button type="button" className="bt-button bt-button--secondary" onClick={() => void exportRaw(entry.id)}>
                        Export raw
                      </button>
                      <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { askDelete({ id: entry.id, name: "this unit" }, event.currentTarget); }}>
                        Delete
                      </button>
                    </span>
                  </li>
                );
              }
              const name = unitTitle(unit) || "Unnamed unit";
              return (
                <li key={entry.id} className="bt-row">
                  <span className="bt-row__text">
                    <strong>{name}</strong>
                    {` ${unit.card.type}, size ${String(unit.card.size)}, PV ${String(unit.card.pv)}`}
                    {unit.source.kind !== "manual" && unit.source.credit && <span className="bt-row__credit">{unit.source.credit}</span>}
                  </span>
                  <span className="bt-row__actions">
                    <Link className="bt-button" aria-label={`Open ${name}`} to={unitHref(unit.id)}>
                      Open
                    </Link>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Export ${name}`} onClick={() => { downloadUnit(unit); say("Export started."); }}>
                      Export
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { askDelete({ id: entry.id, name }, event.currentTarget); }}>
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {confirming && (
          <div
            className="bt-confirm"
            role="group"
            aria-label="Confirm delete"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          >
            <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
            <span className="bt-row__actions">
              <button type="button" className="bt-button" onClick={() => void remove(confirming.id)}>
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
                Keep
              </button>
            </span>
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="as-add">
        <h2 id="as-add">Add a unit</h2>
        <p>
          <Link className="bt-button" to="/battletech/alpha-strike/unit">
            Add by hand
          </Link>
        </p>
        <div className="bt-field">
          <label htmlFor="as-file">Import a unit file</label>
          <input id="as-file" type="file" accept="application/json,.json" onChange={(event) => void upload(event)} />
        </div>
      </section>

      <AsMordelImport />
      <AsMulImport />
      <AsMordelFile />
    </div>
  );
}
