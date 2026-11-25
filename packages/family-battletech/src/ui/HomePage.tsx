import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ENGINE_WEIGHTS, INTERNAL_STRUCTURE, MECH_TYPES } from "../data/chassis";
import type { MechType } from "../data/chassis";
import { DEFAULT_EDITION, EDITIONS, bookName, editionName } from "../data/editions";
import { configurationAvailable, configurationChoices, typeAvailable } from "../rules/availability";
import { techBaseChoices, withLevel } from "../rules/levels";
import { loadCatalog } from "../rules/catalog";
import { mechTypeOf, newRecord } from "../rules/mech";
import { fileKind, fromMtf, wrongFileMessage } from "../rules/mordel-files";
import { configurationTitle, newOmniChassis, resolveAll, resolveBase } from "../rules/omni";
import { battleValue } from "../rules/bv";
import { unitCost } from "../rules/cost";
import type { Catalog } from "../rules/catalog";
import type { OmniChassis } from "../rules/omni";
import LevelSelect from "./editor/LevelSelect";
import { OfficialBadge } from "./editor/Marks";
import TypeSelect from "./editor/TypeSelect";
import type { MechRecord, NewMechOptions } from "../rules/mech";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadMech, downloadOmni, fromMechFile, fromOmniFile, openFamilyStorage } from "./storage";
import type { FamilyStorage, SavedEntry } from "./storage";
import emptyBay from "../artwork/empty-bay.jpg";
import GamePicture from "./GamePicture";
import "./classic.scss";

const MAX_IMPORT_BYTES = 1024 * 1024;
// The choices a new 'Mech starts from, read from the book's own tables.
const TONNAGES = Object.keys(INTERNAL_STRUCTURE.rows).map(Number);
const MAX_RATING = Math.max(...Object.keys(ENGINE_WEIGHTS.rows).map(Number));
/** The build form has no year or era yet, so a tech base is offered by the level alone. */
const NO_TIME = { year: null } as const;

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;

/** The configurations of one saved chassis, each with its Battle Value and cost, Primary first. */
function Configurations({ chassis, catalog }: { chassis: OmniChassis; catalog: Catalog | undefined }) {
  return (
    <ul className="bt-list bt-row__configs" aria-label={`Configurations of ${chassis.name.chassis}`}>
      {resolveAll(chassis).map((record) => {
        const id = record.omni?.configurationId ?? "";
        const config = chassis.configurations.find((c) => c.id === id);
        const title = config ? configurationTitle(config) : id;
        const figures = catalog ? `Battle Value ${battleValue(record, catalog).total.toLocaleString("en-US")}, ${unitCost(record, catalog).total.toLocaleString("en-US")} C-bills` : "Working out the figures.";
        return (
          <li key={id} className="bt-row">
            <span className="bt-row__text">
              <strong>{`${chassis.name.chassis} ${title}`}</strong>
              {id === chassis.primaryId && " (Primary)"}
              <span className="bt-row__credit">
                <OfficialBadge record={record} />
              </span>
              <span className="bt-row__credit">{figures}</span>
            </span>
            <span className="bt-row__actions">
              <Link className="bt-button" aria-label={`Open ${chassis.name.chassis} ${title}`} to={`/battletech/classic/editor?id=${encodeURIComponent(chassis.id)}&c=${encodeURIComponent(id)}`}>
                Open
              </Link>
              <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${chassis.name.chassis} ${title}`} to={`/battletech/classic/sheet?id=${encodeURIComponent(chassis.id)}&c=${encodeURIComponent(id)}`}>
                Record sheet
              </Link>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomePage() {
  const [storage, setStorage] = useState<FamilyStorage>();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [edition, setEdition] = useState(DEFAULT_EDITION);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  /** The chassis rows opened to show their configurations; the catalog they are valued with loads when the first one opens. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<Catalog>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  /** True after a vehicle file or an Alpha Strike text was picked here: the page then links to the Alpha Strike home. */
  const [offerAs, setOfferAs] = useState(false);
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
    unitType: "mech",
    rulesLevel: "standard",
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
      return book ? [`${role === "play" ? "Play" : "Construction"}: ${bookName(book.title)}, ${book.printing}${book.errata ? `, errata ${book.errata}` : ""}.`] : [];
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

  const duplicateOmni = async (chassis: OmniChassis) => {
    if (!storage) return;
    const saved = await attempt(STORAGE_WRITE_FAILED, () => storage.saveOmni({ ...structuredClone(chassis), id: crypto.randomUUID(), name: { ...chassis.name, chassis: `${chassis.name.chassis} (copy)` } }));
    if (saved && (await reload(storage))) say("Copy saved.");
  };

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.remove(id)))) return;
    focusList.current = true;
    if (await reload(storage)) say("Deleted.");
  };

  // What the form offers follows the rules level and tech base: a choice that no longer fits gives way to the first that does, so the Type
  // and Configuration lists re-filter as those fields change and nothing offered is out of the rules.
  const subject = { techBase: draft.techBase, year: null, rulesLevel: draft.rulesLevel };
  const usable = (id: MechType) => MECH_TYPES.find((t) => t.id === id)?.ready === true && typeAvailable(id, subject);
  const unitType: MechType = draft.unitType !== undefined && usable(draft.unitType) ? draft.unitType : (MECH_TYPES.find((t) => usable(t.id))?.id ?? "mech");
  const typed = { ...subject, unitType };
  const configurations = configurationChoices(typed, "");
  const configuration = configurationAvailable(draft.configuration, typed) ? draft.configuration : ((configurations[0]?.[0] ?? "biped") as NewMechOptions["configuration"]);
  const limits = mechTypeOf({ unitType }).tonnage;
  const tonnages = TONNAGES.filter((t) => t >= limits.min && t <= limits.max);
  const tons = tonnages.includes(draft.tons) ? draft.tons : (tonnages.find((t) => t >= draft.tons) ?? tonnages.at(-1) ?? draft.tons);

  // The walking speeds the largest engine in the table allows at this tonnage.
  const walks = Array.from({ length: Math.floor(MAX_RATING / tons) }, (_, i) => i + 1);

  const build = async () => {
    if (!storage || !draft.chassis.trim()) return;
    const options = { ...draft, configuration, tons, chassis: draft.chassis.trim(), model: draft.model.trim(), walk: Math.min(draft.walk, walks.at(-1) ?? 1), year: null };
    // An OmniMech is a chassis (its fixed base and a Prime to start) and is saved as one.
    const made = unitType === "omnimech" ? newOmniChassis(options, edition, crypto.randomUUID()) : newRecord({ ...options, unitType }, edition, crypto.randomUUID());
    if (!(await attempt(STORAGE_WRITE_FAILED, () => ("base" in made ? storage.saveOmni(made) : storage.save(made))))) return;
    void navigate(`/battletech/classic/editor?id=${encodeURIComponent(made.id)}`);
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
        const omni = typeof parsed === "object" && parsed !== null && "kind" in parsed && parsed.kind === "omni";
        const result = omni ? fromOmniFile(parsed) : fromMechFile(parsed);
        if (!result.ok) {
          message = result.message;
        } else if ("chassis" in result) {
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const taken = (await storage.list()).some((e) => e.id === result.chassis.id);
            await storage.saveOmni(taken ? { ...result.chassis, id: crypto.randomUUID() } : result.chassis);
          });
          if (done && (await reload(storage))) say("OmniMech imported.");
        } else {
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const taken = (await storage.list()).some((e) => e.id === result.record.id);
            const record = withLevel(result.record, await loadCatalog());
            await storage.save(taken ? { ...record, id: crypto.randomUUID() } : record);
          });
          if (done && (await reload(storage))) say("'Mech imported.");
        }
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  /** A file downloaded from a Mordel unit page: a 'Mech file opens in the editor, unsaved, for the player to review. */
  const uploadMordel = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    say("");
    setOfferAs(false);
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) message = "That file is too large to be a Mordel file.";
    else if (/\.pdf$/i.test(chosen.name)) message = wrongFileMessage("pdf", "mtf");
    else {
      try {
        const text = await chosen.text();
        const kind = fileKind(text, chosen.name);
        if (kind !== "mtf") {
          message = wrongFileMessage(kind, "mtf");
          setOfferAs(kind === "blk" || kind === "as-conversion");
        } else {
          const result = fromMtf(text, await loadCatalog(), edition, new Date().toISOString(), () => crypto.randomUUID());
          if (!result.ok) message = result.message;
          else void navigate("/battletech/classic/editor", { state: { draft: result.record, notes: result.notes } });
        }
      } catch {
        message = "We could not read that file.";
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
      <GamePicture game="classic" />
      {storage && !storage.persistent && (
        <p className="bt-warning">This browser is not letting us save. Your 'Mechs last until you close this tab.</p>
      )}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {offerAs && (
        <p>
          <Link className="sr-action" to="/battletech/alpha-strike/home">
            Go to the Alpha Strike home
          </Link>
        </p>
      )}

      <section className="bt-section" aria-labelledby="bt-edition">
        <h2 id="bt-edition">Built under</h2>
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
        <p className="bt-hint">
          Both editions build from the TechManual; the Core Rulebook publishes no construction rules. They differ in the play
          book the sheet and the rules check cite.
        </p>
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
              const chassis = entry.chassis;
              if (chassis) {
                const name = chassis.name.chassis.trim() || "Unnamed OmniMech";
                return (
                  <li key={`omni-${entry.id}`} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{name}</strong> OmniMech, {chassis.tons} tons, {plural(chassis.configurations.length, "configuration")}
                      <span className="bt-row__credit">
                        Base chassis: <OfficialBadge record={resolveBase(chassis)} />
                      </span>
                      <span className="bt-row__credit">Built under {EDITIONS.find((e) => e.id === chassis.editionId)?.name ?? chassis.editionId}</span>
                    </span>
                    <span className="bt-row__actions">
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        aria-expanded={open.has(entry.id)}
                        aria-controls={`omni-configs-${entry.id}`}
                        aria-label={`Configurations of ${name}`}
                        onClick={() => {
                          const next = new Set(open);
                          if (next.has(entry.id)) next.delete(entry.id);
                          else next.add(entry.id);
                          setOpen(next);
                          if (!catalog) void loadCatalog().then(setCatalog);
                        }}
                      >
                        Configurations
                      </button>
                      <Link className="bt-button" aria-label={`Open ${name}`} to={`/battletech/classic/editor?id=${encodeURIComponent(chassis.id)}`}>
                        Open
                      </Link>
                      <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={`/battletech/classic/sheet?id=${encodeURIComponent(chassis.id)}`}>
                        Record sheet
                      </Link>
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`Duplicate ${name}`} onClick={() => { void duplicateOmni(chassis); }}>
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        aria-label={`Export ${name}`}
                        onClick={() => {
                          downloadOmni(chassis);
                          say("Export started.");
                        }}
                      >
                        Export
                      </button>
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { askDelete({ id: entry.id, name }, event.currentTarget); }}>
                        Delete
                      </button>
                    </span>
                    <div id={`omni-configs-${entry.id}`} className="bt-row__configs" hidden={!open.has(entry.id)}>
                      {open.has(entry.id) && <Configurations chassis={chassis} catalog={catalog} />}
                    </div>
                  </li>
                );
              }
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
                    <span className="bt-row__credit">
                      <OfficialBadge record={record} />
                    </span>
                    <span className="bt-row__credit">
                      Built under {editionName(record.editionId)}
                    </span>
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
            <TypeSelect id="bt-new-type" record={typed} onChange={(next) => { setDraft({ ...draft, unitType: next }); }} />
            <div className="bt-field">
              <label htmlFor="bt-new-config">Configuration</label>
              <select
                id="bt-new-config"
                value={configuration}
                onChange={(e) => setDraft({ ...draft, configuration: e.target.value as NewMechOptions["configuration"] })}
              >
                {configurations.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <LevelSelect
              id="bt-new-level"
              record={draft}
              onChange={(rulesLevel) => {
                // A tech base the new level does not offer gives way to Inner Sphere (Clan below Standard, Mixed below Advanced).
                const fits = techBaseChoices(rulesLevel, "inner-sphere", NO_TIME).some(([value]) => value === draft.techBase);
                setDraft({ ...draft, rulesLevel, techBase: fits ? draft.techBase : "inner-sphere" });
              }}
            />
            <div className="bt-field">
              <label htmlFor="bt-new-tech">Tech base</label>
              <select id="bt-new-tech" value={draft.techBase} onChange={(e) => setDraft({ ...draft, techBase: e.target.value as NewMechOptions["techBase"] })}>
                {techBaseChoices(draft.rulesLevel, draft.techBase, NO_TIME).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-tons">Tonnage</label>
              <select id="bt-new-tons" value={tons} onChange={(e) => setDraft({ ...draft, tons: Number(e.target.value) })}>
                {tonnages.map((each) => (
                  <option key={each} value={each}>
                    {each} tons
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-walk">Walking MP</label>
              <select id="bt-new-walk" value={Math.min(draft.walk, walks.at(-1) ?? 1)} onChange={(e) => setDraft({ ...draft, walk: Number(e.target.value) })}>
                {walks.map((walk) => (
                  <option key={walk} value={walk}>
                    {walk} (engine rating {walk * tons})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="bt-hint">
            {unitType === "industrialmech" ? "You start with an industrial frame and cockpit, a standard fusion engine" : "You start with standard parts"}, ten
            heat sinks, no armor and no equipment. {unitType === "omnimech" && "An OmniMech starts as a base chassis with an empty Prime configuration. "}The editor's rules check shows what is left to do.
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
          <label htmlFor="bt-mordel-file">Import a file from Mordel</label>
          <input
            id="bt-mordel-file"
            type="file"
            accept=".mtf,.blk,.txt,text/plain"
            aria-describedby="bt-mordel-file-hint"
            onChange={(event) => {
              void uploadMordel(event);
            }}
          />
          <p id="bt-mordel-file-hint" className="bt-hint">
            The 'Mech file (.mtf) from a mordel.net unit page. It opens in the editor for you to review and is saved only when you save it. No key is needed.
          </p>
        </div>
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
