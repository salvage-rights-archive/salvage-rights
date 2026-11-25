import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { DEFAULT_EDITION, EDITIONS } from "../data/editions";
import type { MechRecord } from "../rules/mech";
import { fromMechFile, openFamilyStorage, toMechFile } from "./storage";
import type { FamilyStorage, SavedEntry } from "./storage";
import "./classic.scss";

const MAX_IMPORT_BYTES = 1024 * 1024;

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();

function download(record: MechRecord) {
  const base = `${record.name.chassis}-${record.name.model}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const url = URL.createObjectURL(new Blob([JSON.stringify(toMechFile(record), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${base || "mech"}.mech.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function HomePage() {
  const [storage, setStorage] = useState<FamilyStorage>();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [edition, setEdition] = useState(DEFAULT_EDITION);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [problem, setProblem] = useState("");
  const [imported, setImported] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  const reload = useCallback(async (s: FamilyStorage) => {
    setEntries(await s.list());
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await openFamilyStorage();
      setStorage(s);
      setEdition(await s.getEdition());
      await reload(s);
    })();
  }, [reload]);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const current = EDITIONS.find((e) => e.id === edition) ?? EDITIONS[0];
  const book = (role: "play" | "construction") => current?.books.find((b) => b.role === role);
  const bookLine = `Play: ${book("play")?.title ?? ""}, ${book("play")?.printing ?? ""}. Construction: ${book("construction")?.title ?? ""}, ${book("construction")?.printing ?? ""}.`;

  const chooseEdition = async (id: string) => {
    setEdition(id);
    await storage?.setEdition(id);
  };

  const duplicate = async (record: MechRecord) => {
    if (!storage) return;
    await storage.save({
      ...structuredClone(record),
      id: crypto.randomUUID(),
      name: { ...record.name, model: `${record.name.model} (copy)` },
    });
    await reload(storage);
  };

  const remove = async (id: string) => {
    if (!storage) return;
    await storage.remove(id);
    setConfirming(undefined);
    await reload(storage);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    setProblem("");
    setImported(false);
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) {
      message = "That file is too large to be a 'Mech file.";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a 'Mech file.";
      }
      if (!message) {
        const result = fromMechFile(parsed);
        if (!result.ok) {
          message = result.message;
        } else {
          const taken = (await storage.list()).some((e) => e.id === result.record.id);
          await storage.save(taken ? { ...result.record, id: crypto.randomUUID() } : result.record);
          await reload(storage);
          setImported(true);
        }
      }
    }
    setProblem(message);
    input.value = "";
  };

  return (
    <div className="sr-page">
      <h1>Classic BattleTech</h1>
      {storage && !storage.persistent && (
        <p className="bt-warning">This browser is not letting us save. Your 'Mechs last until you close this tab.</p>
      )}

      <section className="bt-section" aria-labelledby="bt-edition">
        <h2 id="bt-edition">Rules edition</h2>
        <div className="bt-field">
          <label htmlFor="bt-edition-select">Edition</label>
          <select
            id="bt-edition-select"
            value={edition}
            onChange={(event) => {
              void chooseEdition(event.target.value);
            }}
          >
            {EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <p className="bt-hint">{bookLine}</p>
      </section>

      <section className="bt-section" aria-labelledby="bt-saved">
        <h2 id="bt-saved">Your 'Mechs</h2>
        {storage && entries.length === 0 ? (
          <p>No 'Mechs saved yet.</p>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const record = entry.record;
              if (!record) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span>This saved 'Mech cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        onClick={() => {
                          setConfirming({ id: entry.id, name: "this 'Mech" });
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                );
              }
              const name = nameOf(record);
              return (
                <li key={entry.id} className="bt-row">
                  <span>
                    <strong>{name}</strong> {record.tons} tons
                  </span>
                  <span className="bt-row__actions">
                    <Link
                      className="bt-button"
                      aria-label={`Open ${name}`}
                      to={`/battletech/classic/editor?id=${encodeURIComponent(record.id)}`}
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Duplicate ${name}`}
                      onClick={() => {
                        void duplicate(record);
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Export ${name}`}
                      onClick={() => {
                        download(record);
                      }}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Delete ${name}`}
                      onClick={() => {
                        setConfirming({ id: entry.id, name });
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {confirming && (
          <div className="bt-confirm" role="group" aria-label="Confirm delete">
            <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button"
                onClick={() => {
                  void remove(confirming.id);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                ref={keepRef}
                className="bt-button bt-button--secondary"
                onClick={() => {
                  setConfirming(undefined);
                }}
              >
                Keep
              </button>
            </span>
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="bt-add">
        <h2 id="bt-add">Add a 'Mech</h2>
        <p>
          <Link className="sr-action" to="/battletech/classic/import">
            Import from Mordel
          </Link>
        </p>
        <div className="bt-field">
          <label htmlFor="bt-file">Import a file</label>
          <input
            id="bt-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void upload(event);
            }}
          />
        </div>
        <div role="status" aria-label="Import result">
          {imported && "'Mech imported."}
        </div>
        {problem && (
          <p role="alert" className="bt-problem">
            {problem}
          </p>
        )}
      </section>
    </div>
  );
}
