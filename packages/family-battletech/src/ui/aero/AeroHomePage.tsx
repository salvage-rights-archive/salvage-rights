// The AeroTech home: the five editions as cards (oldest first, the current rules marked as the default), the saved units under their
// editions, a build form that offers only what the chosen edition builds, and unit files in and out.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AERO_EDITION_ART, aiLabel } from "../../artwork/games";
import { AERO_EDITIONS, DEFAULT_AERO_EDITION, aeroEditionName } from "../../data/aero";
import { bookName, eraLabel } from "../../data/editions";
import LevelSelect from "../editor/LevelSelect";
import GamePicture from "../GamePicture";
import { MAX_LIBRARY_BYTES, STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { draftMissing, newDraft, recordFromDraft, settle, techBasesFor, typeReady, typesAt, weightHint, yearErasOf } from "./edit";
import type { AeroDraft } from "./edit";
import { NumberField, SelectField, TextField } from "./fields";
import { sheetProfileFor } from "../../data/aero-sheet";
import { editorHref, sheetHref } from "./routes";
import { downloadAero, fromAeroFile, openAeroStorage } from "./storage";
import type { AeroEntry, AeroStorage } from "./storage";
import "./aero.scss";

const nameOf = (entry: AeroEntry): string => `${entry.record?.name.chassis ?? ""} ${entry.record?.name.model ?? ""}`.trim() || "Unnamed unit";
const TECH_BASE_LABELS: Record<string, string> = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" };
const withoutEra = (draft: AeroDraft): AeroDraft => {
  const copy = { ...draft };
  delete copy.era;
  return copy;
};
const typeLabel = (editionId: string, unitType: string): string => AERO_EDITIONS.find((e) => e.id === editionId)?.types.find((t) => t.type === unitType)?.label ?? unitType;
const bookLines = (edition: (typeof AERO_EDITIONS)[number]): string[] =>
  [...new Set(edition.books.map((b) => `${bookName(b.title)}, ${b.printing}${b.errata === undefined ? "" : `, errata ${b.errata}`}`))];

export default function AeroHomePage() {
  const [storage, setStorage] = useState<AeroStorage>();
  const [entries, setEntries] = useState<AeroEntry[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [draft, setDraft] = useState<AeroDraft>(() => newDraft());
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);
  const navigate = useNavigate();

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
        const s = await openAeroStorage();
        setStorage(s);
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

  const reload = (s: AeroStorage) => attempt(STORAGE_READ_FAILED, async () => void setEntries(await s.list()));

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
  const duplicate = async (entry: AeroEntry) => {
    const record = entry.record;
    if (!storage || !record) return;
    const copy = { ...structuredClone(record), id: crypto.randomUUID(), name: { ...record.name, model: `${record.name.model} (copy)` } };
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(copy)))) return;
    if (await reload(storage)) say(`Copy of ${nameOf(entry)} saved.`);
  };

  const ready = typeReady(draft.editionId, draft.unitType);
  const missing = draftMissing(draft);
  const canBuild = storage !== undefined && draft.chassis.trim() !== "" && draft.tons > 0 && ready && missing === "";
  const build = async () => {
    if (!storage || !canBuild) return;
    const made = recordFromDraft(draft);
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(made)))) return;
    void navigate(editorHref(made.id));
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
    let message = "";
    let parsed: unknown;
    if (chosen.size > MAX_LIBRARY_BYTES) message = "That file is too large to be a unit file.";
    else {
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not an AeroTech unit file.";
      }
    }
    if (!message) {
      const result = fromAeroFile(parsed);
      if (!result.ok) message = result.message;
      else {
        const used = new Set((await storage.list()).map((e) => e.id));
        const record = used.has(result.record.id) ? { ...result.record, id: crypto.randomUUID() } : result.record;
        if ((await attempt(STORAGE_WRITE_FAILED, () => storage.save(record))) && (await reload(storage))) say("Unit imported.");
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  const readable = entries.filter((entry) => entry.record !== undefined);
  const broken = entries.filter((entry) => entry.record === undefined);
  // Saved units under their editions, in the editions' order; an edition the app does not know comes last under its own id.
  const editionIds = [...AERO_EDITIONS.map((e) => e.id), ...new Set(readable.map((e) => e.record?.editionId ?? "").filter((id) => !AERO_EDITIONS.some((e) => e.id === id)))];
  const types = AERO_EDITIONS.find((e) => e.id === draft.editionId)?.types ?? [];
  const row = types.find((t) => t.type === draft.unitType);
  const yearEras = yearErasOf(draft);

  return (
    <div className="sr-page">
      <h1>BattleTech: AeroTech</h1>
      <GamePicture game="aerotech" />
      <p>Build aerospace and conventional fighters under the edition of the rules you play. Each unit is built under one edition and keeps its own figures.</p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your units last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <section className="bt-section" aria-labelledby="aero-editions">
        <h2 id="aero-editions">Editions</h2>
        <ul className="aero-editions">
          {AERO_EDITIONS.map((edition) => {
            const art = AERO_EDITION_ART[edition.id]?.artwork;
            const count = readable.filter((e) => e.record?.editionId === edition.id).length;
            return (
              <li key={edition.id}>
                {art && <img src={art.src} alt={art.alt} width={800} height={600} loading="lazy" />}
                {art && <p className="bt-hint">{aiLabel(art)}</p>}
                <h3>{edition.name}</h3>
                {edition.id === DEFAULT_AERO_EDITION && (
                  <p>
                    <strong>Default edition</strong>
                  </p>
                )}
                <p className="bt-hint">{bookLines(edition).join("; ")}</p>
                <p>{`Builds: ${edition.types.filter((t) => typeReady(edition.id, t.type)).map((t) => t.label).join(", ")}.`}</p>
                <p className="bt-hint">{count === 0 ? "No units saved." : `${String(count)} ${count === 1 ? "unit" : "units"} saved.`}</p>
                <button
                  type="button"
                  className="bt-button bt-button--secondary"
                  onClick={() => {
                    setDraft((d) => settle({ ...d, editionId: edition.id }));
                    document.getElementById("bt-new-chassis")?.focus();
                  }}
                >
                  {`Build a unit under ${edition.name}`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bt-section" aria-labelledby="aero-saved">
        <h2 id="aero-saved" ref={headingRef} tabIndex={-1}>
          Your AeroTech units
        </h2>
        {storage && entries.length === 0 && (
          <p ref={emptyRef} tabIndex={-1}>
            No units saved yet.
          </p>
        )}
        {editionIds.map((editionId) => {
          const here = readable.filter((e) => e.record?.editionId === editionId);
          if (here.length === 0) return null;
          return (
            <div key={editionId} role="group" aria-label={aeroEditionName(editionId)}>
              <h3>{aeroEditionName(editionId)}</h3>
              <ul className="bt-list">
                {here.map((entry) => {
                  const record = entry.record;
                  if (!record) return null;
                  const name = nameOf(entry);
                  return (
                    <li key={entry.id} className="bt-row">
                      <span className="bt-row__text">
                        <strong>{name}</strong> {record.tons} tons
                        <span className="bt-row__credit">{typeLabel(record.editionId, record.unitType)}</span>
                      </span>
                      <span className="bt-row__actions">
                        <Link className="bt-button" aria-label={`Open ${name}`} to={editorHref(record.id)}>
                          Open
                        </Link>
                        {sheetProfileFor(record.editionId, record.unitType) && (
                          <Link className="bt-button bt-button--secondary" aria-label={`Record sheet of ${name}`} to={sheetHref(record.id)}>
                            Sheet
                          </Link>
                        )}
                        <button
                          type="button"
                          className="bt-button bt-button--secondary"
                          aria-label={`Duplicate ${name}`}
                          onClick={() => {
                            void duplicate(entry);
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="bt-button bt-button--secondary"
                          aria-label={`Export ${name}`}
                          onClick={() => {
                            downloadAero(record);
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
                            openerRef.current = event.currentTarget;
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
            </div>
          );
        })}
        {broken.length > 0 && (
          <ul className="bt-list">
            {broken.map((entry) => (
              <li key={entry.id} className="bt-row">
                <span className="bt-row__text">This saved unit cannot be read. {entry.unreadable}</span>
                <span className="bt-row__actions">
                  <button
                    type="button"
                    className="bt-button bt-button--secondary"
                    onClick={(event) => {
                      openerRef.current = event.currentTarget;
                      setConfirming({ id: entry.id, name: "this unit" });
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
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

      <section className="bt-section" aria-labelledby="aero-add">
        <h2 id="aero-add">Build a new unit</h2>
        <form
          className="bt-new"
          aria-label="Build a new unit"
          onSubmit={(event) => {
            event.preventDefault();
            void build();
          }}
        >
          <div className="bt-grid">
            <div className="bt-field">
              <label htmlFor="bt-new-chassis">Name</label>
              <input
                id="bt-new-chassis"
                required
                value={draft.chassis}
                onChange={(e) => {
                  setDraft({ ...draft, chassis: e.target.value });
                }}
              />
            </div>
            <TextField id="bt-new-model" label="Model" value={draft.model} onChange={(model) => { setDraft({ ...draft, model }); }} />
            <SelectField
              id="bt-new-edition"
              label="Edition"
              value={draft.editionId}
              options={AERO_EDITIONS.map((e) => ({ value: e.id, label: e.id === DEFAULT_AERO_EDITION ? `${e.name} (default)` : e.name }))}
              onChange={(editionId) => {
                setDraft(settle({ ...draft, editionId }));
              }}
            />
            <SelectField
              id="bt-new-type"
              label="Type"
              value={draft.unitType}
              options={typesAt(draft).map((t) => ({ value: t.type, label: t.label }))}
              hint={row?.cite}
              onChange={(unitType) => {
                setDraft(settle({ ...draft, unitType }));
              }}
            />
            {draft.editionId === DEFAULT_AERO_EDITION && (
              <LevelSelect
                id="bt-new-level"
                record={draft}
                onChange={(rulesLevel) => {
                  setDraft(settle({ ...draft, rulesLevel }));
                }}
              />
            )}
            <NumberField
              id="bt-new-year"
              label="Year"
              value={draft.year}
              allowEmpty
              hint={missing.startsWith("A year") ? missing : draft.editionId === DEFAULT_AERO_EDITION ? "The year sets the era and hides the tech bases and equipment that did not exist yet." : "Optional: these books print no dates, but a year still sets the era and the tech bases that existed."}
              onValid={(year) => {
                setDraft(settle({ ...draft, year }));
              }}
            />
            {yearEras.length === 1 && (
              <div className="bt-field">
                <span id="bt-new-era-label" className="bt-label">Era</span>
                <span id="bt-new-era" aria-labelledby="bt-new-era-label">{yearEras[0] ? eraLabel(yearEras[0]) : ""}</span>
              </div>
            )}
            {yearEras.length > 1 && (
              <SelectField
                id="bt-new-era-pick"
                label="Era"
                value={draft.era ?? ""}
                options={[{ value: "", label: "Choose an era" }, ...yearEras.map((era) => ({ value: era.id, label: eraLabel(era) }))]}
                hint={missing.startsWith("The year") ? missing : undefined}
                onChange={(era) => {
                  setDraft(settle(era === "" ? withoutEra(draft) : { ...draft, era }));
                }}
              />
            )}
            <SelectField
              id="bt-new-tech"
              label="Tech base"
              value={draft.techBase}
              options={techBasesFor(draft).map((id) => ({ value: id, label: TECH_BASE_LABELS[id] ?? id }))}
              onChange={(techBase) => {
                setDraft({ ...draft, techBase: techBase === "clan" || techBase === "mixed" ? techBase : "inner-sphere" });
              }}
            />
            <NumberField id="bt-new-tons" label="Tons" value={draft.tons} min={0} hint={weightHint(row?.weight)} onValid={(tons) => { setDraft({ ...draft, tons: tons ?? 0 }); }} />
            <NumberField id="bt-new-thrust" label="Safe Thrust" value={draft.safeThrust} min={0} onValid={(safeThrust) => { setDraft({ ...draft, safeThrust: safeThrust ?? 0 }); }} />
          </div>
          <p className="bt-hint">
            {ready
              ? "You start with a standard engine, no fuel, no armor, no heat sinks and no equipment. The editor's rules check shows what is left to do."
              : `${aeroEditionName(draft.editionId)} lists no unit type we can build yet. Its construction steps are not in the app.`}
          </p>
          <button type="submit" className="bt-button" disabled={!canBuild}>
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
            One AeroTech unit file, as Export makes it. A unit whose id you already have is added as a new one.
          </p>
        </div>
      </section>
    </div>
  );
}
