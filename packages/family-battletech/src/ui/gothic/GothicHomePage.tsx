// The BattleTech: Gothic home: the saved Gothic 'Mechs, a start from one of the box's designs, a build form that offers only Gothic's
// choices, and Gothic files in and out. It lists the Gothic designs only (the Classic home lists the rest) and refuses a Classic file
// with a pointer to the Classic page (gothic-design s.7.1).
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ENGINE_WEIGHTS, INTERNAL_STRUCTURE } from "../../data/chassis";
import { bookName, GOTHIC_EDITIONS } from "../../data/editions";
import { GOTHIC_BOX_SPECS, gothicBoxMechs } from "../../data/gothic-units";
import { GOTHIC, GOTHIC_BASE, baseOf } from "../../data/rulesets";
import { configurationChoices, setEra, setYear } from "../../rules/availability";
import { battleValue } from "../../rules/bv";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { levelRow, withLevel } from "../../rules/levels";
import { mechTypeOf, newRecord } from "../../rules/mech";
import type { MechRecord, NewMechOptions } from "../../rules/mech";
import LevelSelect from "../editor/LevelSelect";
import GamePicture from "../GamePicture";
import { MAX_LIBRARY_BYTES, STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadLibrary, downloadMech, fileGame, fromLibraryFile, fromMechFile, openFamilyStorage, wrongGameMessage } from "../storage";
import type { FamilyStorage, SavedEntry } from "../storage";
import { useGothicTheme } from "./theme";
import "../classic.scss";

const TONNAGES = Object.keys(INTERNAL_STRUCTURE.rows).map(Number);
const MAX_RATING = Math.max(...Object.keys(ENGINE_WEIGHTS.rows).map(Number));
const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();
const gothicOnly = (entries: SavedEntry[]) => entries.filter((entry) => entry.game === "gothic");
const [BOX_BOOK] = GOTHIC_EDITIONS;
const books = (["play", "construction"] as const)
  .flatMap((role) => {
    const book = BOX_BOOK?.books.find((b) => b.role === role);
    return book ? [`${role === "play" ? "Play" : "Construction"}: ${bookName(book.title)}, ${book.printing}.`] : [];
  })
  .join(" ");

/** What the rules check will say about a box design that the sheet itself explains, in our words. */
const BOX_NOTES: Record<string, string> = {
  "KGC-0000": "The sheet splits each AC/20 across a torso and an arm. We place each in its arm, so the rules check shows two slot errors.",
  "PXH-1T": "The sheet leaves half a ton unused, so the rules check shows a weight finding.",
};

/** The box designs grouped by chassis, in the order the sheets list them. */
const BOX_GROUPS = GOTHIC_BOX_SPECS.reduce<{ chassis: string; specs: typeof GOTHIC_BOX_SPECS }[]>((groups, spec) => {
  const group = groups.find((g) => g.chassis === spec.chassis);
  if (group) group.specs.push(spec);
  else groups.push({ chassis: spec.chassis, specs: [spec] });
  return groups;
}, []);

export default function GothicHomePage() {
  useGothicTheme();
  const [storage, setStorage] = useState<FamilyStorage>();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [catalog, setCatalog] = useState<Catalog>();
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  /** True after a Classic file was picked here: the page then links to the Classic home. */
  const [offerClassic, setOfferClassic] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Pick<NewMechOptions, "chassis" | "model" | "tons" | "walk" | "configuration" | "rulesLevel">>({
    chassis: "",
    model: "",
    tons: 50,
    walk: 4,
    configuration: "biped",
    rulesLevel: "standard",
  });
  const [when, setWhen] = useState<{ year: number | null; era?: string }>({ year: GOTHIC.defaultYear ?? null, era: GOTHIC.eras[GOTHIC.eras.length - 1]?.id });

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
        setEntries(gothicOnly(await s.list()));
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
      try {
        setCatalog(await loadCatalog());
      } catch {
        // The figures and the box designs wait; the page still lists what is saved.
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

  const reload = (s: FamilyStorage) => attempt(STORAGE_READ_FAILED, async () => void setEntries(gothicOnly(await s.list())));
  const editorAt = (id: string) => `${GOTHIC_BASE}/editor?id=${encodeURIComponent(id)}`;

  /** Saves a copy of a record under a new id; with `then` the editor opens on it. */
  const saveCopy = async (record: MechRecord, copy: MechRecord, then: "stay" | "open") => {
    if (!storage) return;
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(copy)))) return;
    if (then === "open") void navigate(editorAt(copy.id));
    else if (await reload(storage)) say(`Copy of ${nameOf(record)} saved.`);
  };

  const startFromBox = (model: string) => {
    const box = catalog ? gothicBoxMechs(catalog).find((record) => record.name.model === model) : undefined;
    if (box) void saveCopy(box, { ...structuredClone(box), id: crypto.randomUUID() }, "open");
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

  const askDelete = (target: { id: string; name: string }, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };

  // The build form offers Gothic's choices: its levels, its eras, a BattleMech biped or quad.
  const subject = { techBase: "inner-sphere" as const, year: when.year, era: when.era, rulesLevel: draft.rulesLevel, unitType: "mech" as const, editionId: "gothic" };
  const configurations = configurationChoices(subject, "");
  const configuration = configurations.some(([key]) => key === draft.configuration) ? draft.configuration : ((configurations[0]?.[0] ?? "biped") as NewMechOptions["configuration"]);
  const limits = mechTypeOf({ unitType: "mech" }).tonnage;
  const tonnages = TONNAGES.filter((t) => t >= limits.min && t <= limits.max);
  const tons = tonnages.includes(draft.tons) ? draft.tons : (tonnages.find((t) => t >= draft.tons) ?? tonnages.at(-1) ?? draft.tons);
  const walks = Array.from({ length: Math.floor(MAX_RATING / tons) }, (_, i) => i + 1);

  const build = async () => {
    if (!storage || !draft.chassis.trim()) return;
    const made = newRecord(
      { ...draft, configuration, tons, chassis: draft.chassis.trim(), model: draft.model.trim(), walk: Math.min(draft.walk, walks.at(-1) ?? 1), techBase: "inner-sphere", year: when.year, unitType: "mech" },
      "gothic",
      crypto.randomUUID(),
    );
    if (when.era !== undefined) made.era = when.era;
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(made)))) return;
    void navigate(editorAt(made.id));
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
    setOfferClassic(false);
    let message = "";
    let parsed: unknown;
    if (chosen.size > MAX_LIBRARY_BYTES) message = "That file is too large to be a 'Mech file.";
    else {
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a 'Mech file.";
      }
    }
    if (!message) {
      const wrong = wrongGameMessage("gothic", fileGame(parsed));
      if (wrong) {
        message = wrong;
        setOfferClassic(true);
      }
    }
    if (!message) {
      const kind = typeof parsed === "object" && parsed !== null && "kind" in parsed ? parsed.kind : undefined;
      const result = kind === "library" ? fromLibraryFile(parsed) : fromMechFile(parsed);
      if (!result.ok) message = result.message;
      else {
        const records = "record" in result ? [result.record] : result.mechs;
        const done = await attempt(STORAGE_WRITE_FAILED, async () => {
          const catalog = await loadCatalog();
          const used = new Set((await storage.list()).map((e) => e.id));
          for (const record of records) {
            const id = used.has(record.id) ? crypto.randomUUID() : record.id;
            used.add(id);
            await storage.save({ ...withLevel(record, catalog), id });
          }
        });
        if (done && (await reload(storage))) say(records.length === 1 ? "'Mech imported." : `${String(records.length)} designs imported.`);
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  const rows = entries.filter((entry) => entry.record !== undefined || entry.unreadable !== undefined);
  const exportable = entries.filter((entry) => entry.record !== undefined);

  return (
    <div className="sr-page">
      <h1>BattleTech: Gothic</h1>
      <GamePicture game="gothic" />
      <p>Build Gothic 'Mechs and Abomination units, and print their record sheets.</p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your 'Mechs last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {offerClassic && (
        <p>
          <Link className="sr-action" to={`${baseOf("classic")}/home`}>
            Go to the Classic home
          </Link>
        </p>
      )}

      <section className="bt-section" aria-labelledby="bt-saved">
        <h2 id="bt-saved" ref={headingRef} tabIndex={-1}>
          Your Gothic 'Mechs
        </h2>
        {storage && rows.length === 0 ? (
          <p ref={emptyRef} tabIndex={-1}>
            No Gothic 'Mechs saved yet.
          </p>
        ) : (
          <ul className="bt-list">
            {rows.map((entry) => {
              const record = entry.record;
              if (!record) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved 'Mech cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { askDelete({ id: entry.id, name: "this 'Mech" }, event.currentTarget); }}>
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
                      Rules level: {levelRow(record.rulesLevel ?? "standard", GOTHIC).label}
                      {catalog && `. Battle Value ${battleValue(record, catalog).total.toLocaleString("en-US")}`}
                    </span>
                  </span>
                  <span className="bt-row__actions">
                    <Link className="bt-button" aria-label={`Open ${name}`} to={editorAt(record.id)}>
                      Open
                    </Link>
                    <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={`${GOTHIC_BASE}/sheet?id=${encodeURIComponent(record.id)}`}>
                      Record sheet
                    </Link>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Duplicate ${name}`}
                      onClick={() => {
                        void saveCopy(record, { ...structuredClone(record), id: crypto.randomUUID(), name: { ...record.name, model: `${record.name.model} (copy)` } }, "stay");
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
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { askDelete({ id: entry.id, name }, event.currentTarget); }}>
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {exportable.length > 0 && (
          <p>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                downloadLibrary(exportable);
                say("Export started.");
              }}
            >
              Export all
            </button>
          </p>
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
              <button type="button" className="bt-button" onClick={() => { void remove(confirming.id); }}>
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
                Keep
              </button>
            </span>
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="bt-box">
        <h2 id="bt-box">Start from a box 'Mech</h2>
        <p className="bt-hint">Each one is saved as a copy of your own, and opens in the editor.</p>
        {BOX_GROUPS.map((group) => (
          <div key={group.chassis} role="group" aria-label={group.chassis}>
            <h3>{group.chassis}</h3>
            <ul className="bt-list">
              {group.specs.map((spec) => (
                <li key={spec.model} className="bt-row">
                  <span className="bt-row__text">
                    {spec.tons} tons
                    <span className="bt-row__credit">{`${levelRow(spec.level, GOTHIC).label}, Battle Value ${spec.printedBv.toLocaleString("en-US")} as printed`}</span>
                    {BOX_NOTES[spec.model] !== undefined && <span className="bt-row__credit">{BOX_NOTES[spec.model]}</span>}
                  </span>
                  <span className="bt-row__actions">
                    <button
                      type="button"
                      className="bt-button"
                      disabled={!storage || !catalog}
                      onClick={() => {
                        startFromBox(spec.model);
                      }}
                    >
                      {`Start from ${spec.chassis} ${spec.model}`}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="bt-section" aria-labelledby="bt-add">
        <h2 id="bt-add">Build a new 'Mech</h2>
        <form
          className="bt-new"
          aria-label="Build a new Gothic 'Mech"
          onSubmit={(event) => {
            event.preventDefault();
            void build();
          }}
        >
          <div className="bt-grid">
            <div className="bt-field">
              <label htmlFor="bt-new-chassis">Name</label>
              <input id="bt-new-chassis" required value={draft.chassis} onChange={(e) => setDraft({ ...draft, chassis: e.target.value })} />
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-model">Model</label>
              <input id="bt-new-model" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
            </div>
            <LevelSelect id="bt-new-level" record={draft} ruleset={GOTHIC} onChange={(rulesLevel) => { setDraft({ ...draft, rulesLevel }); }} />
            <div className="bt-field">
              <label htmlFor="bt-new-era">Era</label>
              <select
                id="bt-new-era"
                value={when.era ?? ""}
                onChange={(e) => {
                  const next = { ...when, editionId: "gothic" };
                  setEra(next, e.target.value);
                  setWhen({ year: next.year, era: next.era });
                }}
              >
                {GOTHIC.eras.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-year">Year</label>
              <input
                id="bt-new-year"
                type="number"
                inputMode="numeric"
                value={when.year ?? ""}
                onChange={(e) => {
                  const next = { ...when, editionId: "gothic" };
                  setYear(next, e.target.value === "" ? null : Number(e.target.value));
                  setWhen({ year: next.year, era: next.era });
                }}
              />
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-config">Configuration</label>
              <select id="bt-new-config" value={configuration} onChange={(e) => setDraft({ ...draft, configuration: e.target.value as NewMechOptions["configuration"] })}>
                {configurations.map(([key, label]) => (
                  <option key={key} value={key}>
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
          <p className="bt-hint">You start with standard parts, ten heat sinks, no armor and no equipment. The editor's rules check shows what is left to do.</p>
          <button type="submit" className="bt-button" disabled={!storage}>
            Start building
          </button>
        </form>
        <div className="bt-field">
          <label htmlFor="bt-file">Import a file</label>
          <input
            id="bt-file"
            type="file"
            accept="application/json,.json"
            aria-describedby="bt-file-hint"
            disabled={!storage}
            onChange={(event) => {
              void upload(event);
            }}
          />
          <p id="bt-file-hint" className="bt-hint">
            One Gothic 'Mech, or the file Export all makes here. Designs whose id you already have are added as new ones.
          </p>
        </div>
      </section>

      <section className="bt-section" aria-labelledby="bt-abom">
        <h2 id="bt-abom">Abomination units and forces</h2>
        <p className="bt-actions">
          <Link className="bt-button" to={`${GOTHIC_BASE}/abominations`}>
            Abomination units
          </Link>{" "}
          <Link className="bt-button" to={`${GOTHIC_BASE}/force`}>
            Forces
          </Link>{" "}
          <Link className="bt-button bt-button--secondary" to={`${GOTHIC_BASE}/play`}>
            Abomination tracker
          </Link>
        </p>
      </section>

      <section className="bt-section" aria-labelledby="bt-aids">
        <h2 id="bt-aids">Rules reference</h2>
        <p>
          <Link className="bt-button" to={`${GOTHIC_BASE}/aids`}>
            Rules reference tables
          </Link>
        </p>
      </section>

      <p className="bt-hint">{books}</p>
    </div>
  );
}
