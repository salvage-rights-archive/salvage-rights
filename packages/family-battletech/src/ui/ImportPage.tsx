import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { loadCatalog } from "../rules/catalog";
import { fromMordel, parseMordelRef } from "../rules/mordel";
import { createMordelClient } from "./mordel-client";
import type { MordelClient, MordelListRow } from "./mordel-client";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, openFamilyStorage } from "./storage";
import type { FamilyStorage } from "./storage";
import "./classic.scss";

export interface ImportPageProps {
  /** How a client is made from a key. Tests pass their own; the page uses the real one. */
  makeClient?: (key: string) => MordelClient;
}

const defaultMakeClient = (key: string) => createMordelClient({ key });

export default function ImportPage({ makeClient = defaultMakeClient }: ImportPageProps) {
  const navigate = useNavigate();
  const [storage, setStorage] = useState<FamilyStorage>();
  const [storedKey, setStoredKey] = useState<string>();
  const [typedKey, setTypedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [designs, setDesigns] = useState<{ rows: MordelListRow[]; truncated: boolean }>();

  /** Runs a storage action; when it rejects, shows the fixed message and returns false. */
  const attempt = useCallback(async (message: string, action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch {
      setStatus("");
      setProblem(message);
      return false;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const s = await openFamilyStorage();
        setStorage(s);
        setStoredKey(await s.getKey());
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (!storedKey) return;
    let current = true;
    void makeClient(storedKey)
      .myUnits()
      .then((result) => {
        if (!current) return;
        if (result.ok) setDesigns(result.value);
        else setProblem(result.message);
      });
    return () => {
      current = false;
    };
  }, [storedKey, makeClient]);

  const testKey = async () => {
    const key = (storedKey ?? typedKey).trim();
    setStatus("");
    setProblem("");
    if (!key) {
      setProblem("Type your key first.");
      return;
    }
    setTesting(true);
    try {
      const result = await makeClient(key).testKey();
      if (result.ok) setStatus("That key works.");
      else setProblem(result.message);
    } finally {
      setTesting(false);
    }
  };

  const saveKey = async () => {
    setStatus("");
    setProblem("");
    const key = typedKey.trim();
    if (!key || !storage) {
      setProblem("Type your key first.");
      return;
    }
    const saved = await attempt(STORAGE_WRITE_FAILED, () => storage.setKey(key));
    if (!saved) return;
    setStoredKey(key);
    setTypedKey("");
    setShowKey(false);
  };

  const removeKey = async () => {
    if (!storage) return;
    setStatus("");
    setProblem("");
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.clearKey()))) return;
    setStoredKey(undefined);
    setDesigns(undefined);
  };

  const importUnit = useCallback(
    async (unitType: string, id: number) => {
      if (!storage || !storedKey) return;
      setProblem("");
      setStatus("");
      if (unitType !== "bm") {
        setProblem("Only BattleMechs can be imported so far.");
        return;
      }
      setBusy(true);
      try {
        setStatus("Loading the equipment table…");
        const catalog = await loadCatalog();
        setStatus("");
        const fetched = await makeClient(storedKey).unit(unitType, id);
        if (!fetched.ok) {
          setProblem(fetched.message);
          return;
        }
        const result = fromMordel(fetched.value, catalog, await storage.getEdition(), new Date().toISOString(), () =>
          crypto.randomUUID(),
        );
        if (!result.ok) {
          setProblem(result.message);
          return;
        }
        const record = result.record;
        if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(record)))) return;
        void navigate(`/battletech/classic/editor?id=${encodeURIComponent(result.record.id)}`, {
          state: result.notes.length > 0 ? { notes: result.notes } : undefined,
        });
      } catch {
        setStatus("");
        setProblem("We could not import that 'Mech. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [storage, storedKey, makeClient, navigate, attempt],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const ref = parseMordelRef(reference);
    if (!ref) {
      setProblem("Enter a unit number such as 474, or a mordel.net address.");
      setStatus("");
      return;
    }
    void importUnit(ref.unitType, ref.id);
  };

  return (
    <div className="sr-page">
      <h1>Import from Mordel</h1>
      <p>
        Uses the mordel.net API built by MordelBlacknight.{" "}
        <a href="https://www.mordel.net/" target="_blank" rel="noreferrer">
          mordel.net
        </a>
      </p>

      <section className="bt-section" aria-labelledby="bt-key">
        <h2 id="bt-key">Your key</h2>
        {storedKey ? (
          <>
            <p>A key is saved on this device.</p>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button bt-button--secondary"
                disabled={testing}
                onClick={() => {
                  void testKey();
                }}
              >
                Test key
              </button>
              <button
                type="button"
                className="bt-button bt-button--secondary"
                onClick={() => {
                  void removeKey();
                }}
              >
                Remove key
              </button>
            </span>
          </>
        ) : (
          <>
            <div className="bt-field">
              <label htmlFor="bt-key-field">Mordel key</label>
              <input
                id="bt-key-field"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={typedKey}
                onChange={(event) => {
                  setTypedKey(event.target.value);
                }}
              />
              <button
                type="button"
                className="bt-button bt-button--secondary"
                aria-pressed={showKey}
                onClick={() => {
                  setShowKey(!showKey);
                }}
              >
                {showKey ? "Hide key" : "Show key"}
              </button>
            </div>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button bt-button--secondary"
                disabled={testing}
                onClick={() => {
                  void testKey();
                }}
              >
                Test key
              </button>
              <button
                type="button"
                className="bt-button"
                disabled={!storage}
                onClick={() => {
                  void saveKey();
                }}
              >
                Save key
              </button>
            </span>
          </>
        )}
        <p className="bt-hint">Your key is kept on this device and is sent only to mordel.net.</p>
      </section>

      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      {storedKey && (
        <>
          <section className="bt-section" aria-labelledby="bt-unit">
            <h2 id="bt-unit">Import a 'Mech</h2>
            <form onSubmit={submit}>
              <div className="bt-field">
                <label htmlFor="bt-ref">Unit number or address</label>
                <input
                  id="bt-ref"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={reference}
                  onChange={(event) => {
                    setReference(event.target.value);
                  }}
                />
                <button type="submit" className="bt-button" disabled={busy}>
                  Import
                </button>
              </div>
            </form>
          </section>

          <section className="bt-section" aria-labelledby="bt-designs">
            <h2 id="bt-designs">My designs</h2>
            {designs && designs.rows.length === 0 && <p>You have no designs on mordel.net yet.</p>}
            {designs && designs.rows.length > 0 && (
              <ul className="bt-list">
                {designs.rows.map((row) => (
                  <li key={`${row.unitType}-${row.id}`} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{row.name}</strong> {row.tons} tons, designed by {row.designer || "an unnamed designer"}
                    </span>
                    <button
                      type="button"
                      className="bt-button"
                      disabled={busy}
                      aria-label={`Import ${row.name}`}
                      onClick={() => {
                        void importUnit(row.unitType, row.id);
                      }}
                    >
                      Import
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {designs?.truncated && (
              <p className="bt-hint">This list is cut short. mordel.net has more of your designs than we can show here.</p>
            )}
          </section>
        </>
      )}
      <p>
        <Link className="sr-action" to="/battletech/classic/home">
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}
