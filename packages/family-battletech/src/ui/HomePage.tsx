import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ENGINE_WEIGHTS, INTERNAL_STRUCTURE } from "../data/chassis";
import { DEFAULT_EDITION, EDITIONS, bookName } from "../data/editions";
import { newRecord } from "../rules/mech";
import type { MechRecord, NewMechOptions, TechBase } from "../rules/mech";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadMech, fromMechFile, openFamilyStorage } from "./storage";
import type { FamilyStorage, SavedEntry } from "./storage";
import emptyBay from "../artwork/empty-bay.jpg";
import "./classic.scss";

const MAX_IMPORT_BYTES = 1024 * 1024;
// The choices a new 'Mech starts from, read from the book's own tables.
const TONNAGES = Object.keys(INTERNAL_STRUCTURE.rows).map(Number);
const MAX_RATING = Math.max(...Object.keys(ENGINE_WEIGHTS.rows).map(Number));

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();

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
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Omit<NewMechOptions, "year">>({
    chassis: "",
    model: "",
    tons: 50,
    walk: 4,
    techBase: "inner-sphere",
    configuration: "biped",
  });

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
      return book ? [`${role === "play" ? "Play" : "Construction"}: ${bookName(book.title)}, ${book.printing}.`] : [];
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

  // The walking speeds the largest engine in the table allows at this tonnage.
  const walks = Array.from({ length: Math.floor(MAX_RATING / draft.tons) }, (_, i) => i + 1);

  const build = async () => {
    if (!storage || !draft.chassis.trim()) return;
    const record = newRecord(
      { ...draft, chassis: draft.chassis.trim(), model: draft.model.trim(), walk: Math.min(draft.walk, walks.at(-1) ?? 1), year: null },
      edition,
      crypto.randomUUID(),
    );
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(record)))) return;
    void navigate(`/battletech/classic/editor?id=${encodeURIComponent(record.id)}`);
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
          <div className="bt-empty">
            {/* Decorative: the line below says what the empty bay means. Terms: ../artwork/NOTICE.md. */}
            <img src={emptyBay} alt="" width={1200} height={670} />
            <p ref={emptyRef} tabIndex={-1}>
              No 'Mechs saved yet.
            </p>
            <p className="bt-hint">Picture: AI-generated image (Nano Banana 2).</p>
          </div>
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
                    <Link
                      className="bt-button bt-button--secondary"
                      aria-label={`Record sheet for ${name}`}
                      to={`/battletech/classic/sheet?id=${encodeURIComponent(record.id)}`}
                    >
                      Record sheet
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
                        downloadMech(record);
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
        <form
          className="bt-new"
          aria-labelledby="bt-new-heading"
          onSubmit={(event) => {
            event.preventDefault();
            void build();
          }}
        >
          <h3 id="bt-new-heading">Build a new one</h3>
          <div className="bt-grid">
            <div className="bt-field">
              <label htmlFor="bt-new-chassis">Name</label>
              <input id="bt-new-chassis" required value={draft.chassis} onChange={(e) => setDraft({ ...draft, chassis: e.target.value })} />
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-model">Model</label>
              <input id="bt-new-model" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-tons">Tonnage</label>
              <select id="bt-new-tons" value={draft.tons} onChange={(e) => setDraft({ ...draft, tons: Number(e.target.value) })}>
                {TONNAGES.map((tons) => (
                  <option key={tons} value={tons}>
                    {tons} tons
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-walk">Walking MP</label>
              <select id="bt-new-walk" value={Math.min(draft.walk, walks.at(-1) ?? 1)} onChange={(e) => setDraft({ ...draft, walk: Number(e.target.value) })}>
                {walks.map((walk) => (
                  <option key={walk} value={walk}>
                    {walk} (engine rating {walk * draft.tons})
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-tech">Tech base</label>
              <select id="bt-new-tech" value={draft.techBase} onChange={(e) => setDraft({ ...draft, techBase: e.target.value as TechBase })}>
                <option value="inner-sphere">Inner Sphere</option>
                <option value="clan">Clan</option>
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-config">Configuration</label>
              <select
                id="bt-new-config"
                value={draft.configuration}
                onChange={(e) => setDraft({ ...draft, configuration: e.target.value as NewMechOptions["configuration"] })}
              >
                <option value="biped">Biped</option>
                <option value="quad">Quad</option>
              </select>
            </div>
          </div>
          <p className="bt-hint">
            You start with standard parts, ten heat sinks, no armor and no equipment. The editor's rules check shows
            what is left to do.
          </p>
          <button type="submit" className="bt-button" disabled={!storage}>
            Start building
          </button>
        </form>
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
