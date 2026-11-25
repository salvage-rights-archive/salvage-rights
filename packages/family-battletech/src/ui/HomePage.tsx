import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { DEFAULT_EDITION, EDITIONS } from "../data/editions";
import type { MechRecord } from "../rules/mech";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, fromMechFile, openFamilyStorage, toMechFile } from "./storage";
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
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);

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

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openFamilyStorage();
        setStorage(s);
        setEdition(await s.getEdition());
        setEntries(await s.list());
      } catch {
        setProblem(STORAGE_READ_FAILED);
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

  const reload = (s: FamilyStorage) => attempt(STORAGE_READ_FAILED, async () => void setEntries(await s.list()));

  const current = EDITIONS.find((e) => e.id === edition);
  const bookLine = (["play", "construction"] as const)
    .flatMap((role) => {
      const book = current?.books.find((b) => b.role === role);
      return book ? [`${role === "play" ? "Play" : "Construction"}: ${book.title}, ${book.printing}.`] : [];
    })
    .join(" ");

  const chooseEdition = async (id: string) => {
    setEdition(id);
    if (storage) await attempt(STORAGE_WRITE_FAILED, () => storage.setEdition(id));
  };

  const duplicate = async (record: MechRecord) => {
    if (!storage) return;
    const saved = await attempt(STORAGE_WRITE_FAILED, () =>
      storage.save({
        ...structuredClone(record),
        id: crypto.randomUUID(),
        name: { ...record.name, model: `${record.name.model} (copy)` },
      }),
    );
    if (saved && (await reload(storage))) say("Copy saved.");
  };

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.remove(id)))) return;
    focusList.current = true;
    if (await reload(storage)) say("Deleted.");
  };

  const cancel = () => {
    setConfirming(undefined);
    openerRef.current?.focus();
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
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
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const taken = (await storage.list()).some((e) => e.id === result.record.id);
            await storage.save(taken ? { ...result.record, id: crypto.randomUUID() } : result.record);
          });
          if (done && (await reload(storage))) say("'Mech imported.");
        }
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  const askDelete = (target: { id: string; name: string }, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };

  return (
    <div className="sr-page">
      <h1>Classic BattleTech</h1>
      {storage && !storage.persistent && (
        <p className="bt-warning">This browser is not letting us save. Your 'Mechs last until you close this tab.</p>
      )}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

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
        {bookLine && <p className="bt-hint">{bookLine}</p>}
      </section>

      <section className="bt-section" aria-labelledby="bt-saved">
        <h2 id="bt-saved" ref={headingRef} tabIndex={-1}>
          Your 'Mechs
        </h2>
        {storage && entries.length === 0 ? (
          <p ref={emptyRef} tabIndex={-1}>
            No 'Mechs saved yet.
          </p>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const record = entry.record;
              if (!record) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved 'Mech cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        onClick={(event) => {
                          askDelete({ id: entry.id, name: "this 'Mech" }, event.currentTarget);
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
                  <span className="bt-row__text">
                    <strong>{name}</strong> {record.tons} tons
                    {record.source && (
                      <span className="bt-row__credit">
                        Designed by {record.source.designer || "an unnamed designer"} on mordel.net
                      </span>
                    )}
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
                        say("Export started.");
                      }}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Delete ${name}`}
                      onClick={(event) => {
                        askDelete({ id: entry.id, name }, event.currentTarget);
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
              <button
                type="button"
                className="bt-button"
                onClick={() => {
                  void remove(confirming.id);
                }}
              >
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
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
      </section>
    </div>
  );
}
