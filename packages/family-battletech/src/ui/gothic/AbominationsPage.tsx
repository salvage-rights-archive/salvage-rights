// The Abomination units page (BattleTech: Gothic): pick one of the box's ten types, give the unit a label and skills, save it, open it
// again, export it as a file, or print its sheet. A custom type with free fields is offered only at the Fan-made level or higher (hide,
// do not mark); a saved custom unit stays listed at any level, and the rules check reports it (gothic-design s.7.3, s.8).
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import type { RulesLevel } from "../../data/chassis";
import { ABOM_CLASSES, ABOM_TYPES } from "../../data/gothic";
import type { AbomClassId, AbomStats, AbomWeapon } from "../../data/gothic";
import { GOTHIC, GOTHIC_BASE } from "../../data/rulesets";
import { checkAbomination, launcherTubes, newAbominationUnit, unitStats } from "../../rules/abomination";
import type { AbomCustom, AbominationUnit } from "../../rules/abomination";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelAtLeast, levelRow } from "../../rules/levels";
import LevelSelect from "../editor/LevelSelect";
import { LeaveGuard } from "../editor/LeaveConfirm";
import GamePicture from "../GamePicture";
import { MAX_LIBRARY_BYTES, STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { AbominationSheets } from "./AbominationSheet";
import Silhouette from "./Silhouette";
import { downloadUnits, fromAbomFile, openGothicStorage } from "./storage";
import type { AbomEntry, GothicStorage } from "./storage";
import { useGothicTheme } from "./theme";
import "../classic.scss";

const EDITION = "gothic";
const CUSTOM_LEVEL: RulesLevel = "fan-made";

const weaponName = (catalog: Catalog | undefined, id: string) => catalog?.rowFor(id, EDITION)?.name ?? id;
const shotsText = (shots: number) => (shots === 1 ? "one shot" : `${String(shots)} shots`);

/** "2 Small Laser, 2 SRM 5 (one shot)": the weapons each creature carries, by the catalog's names. */
function weaponsText(weapons: readonly AbomWeapon[], catalog: Catalog | undefined): string {
  if (weapons.length === 0) return "no weapons";
  return weapons
    .map((w) => `${w.count > 1 ? `${String(w.count)} ` : ""}${weaponName(catalog, w.id)}${w.shots === undefined ? "" : ` (${shotsText(w.shots)})`}`)
    .join(", ");
}

function moveText(stats: Pick<AbomStats, "ground" | "jump" | "vtol">): string {
  return [`Ground ${String(stats.ground)}`, ...(stats.jump === undefined ? [] : [`Jump ${String(stats.jump)}`]), ...(stats.vtol === undefined ? [] : [`VTOL ${String(stats.vtol)}`])].join(", ");
}

const typeName = (unit: AbominationUnit): string => {
  const stats = unitStats(unit);
  return stats ? stats.name || "Custom type" : (unit.typeId ?? "Unknown type");
};
const unitName = (unit: AbominationUnit): string => (unit.label.trim() ? `${unit.label.trim()} (${typeName(unit)})` : typeName(unit));

/** The most pips in one row of any box type, the cap on a custom type. */
const MAX_PIPS_PER_ROW = Math.max(...ABOM_TYPES.map((t) => t.pipsPerRow));

const BLANK_CUSTOM: AbomCustom = { name: "", classId: "swarmer", creatures: 1, pipsPerRow: 6, ground: 1, weapons: [], mob: null, hobble: null, melee: null };

/** A whole number from a text field; undefined when the field is empty or not a number. */
const wholeOf = (text: string): number | undefined => {
  const n = Number(text);
  return text.trim() === "" || !Number.isInteger(n) || n < 0 ? undefined : n;
};

function NumberField({ id, label, value, onChange, optional, max }: { id: string; label: string; value: number | null | undefined; onChange: (next: number | undefined) => void; optional?: boolean; max?: number }) {
  return (
    <div className="bt-field">
      <label htmlFor={id}>{optional ? `${label} (blank for none)` : label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value ?? ""}
        onChange={(event) => {
          onChange(wholeOf(event.target.value));
        }}
      />
    </div>
  );
}

export default function AbominationsPage() {
  useGothicTheme();
  const [storage, setStorage] = useState<GothicStorage>();
  const [entries, setEntries] = useState<AbomEntry[]>([]);
  const [catalog, setCatalog] = useState<Catalog>();
  const [level, setLevel] = useState<RulesLevel>(DEFAULT_LEVEL);
  /** The unit in the form: a new one from a type, or a saved one opened. */
  const [draft, setDraft] = useState<AbominationUnit>();
  /** The draft as it was when opened, to tell unsaved work from an untouched form. */
  const [opened, setOpened] = useState<{ id: string; json: string }>();
  const [printing, setPrinting] = useState<AbominationUnit>();
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [weaponPick, setWeaponPick] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLHeadingElement>(null);
  const savedRef = useRef<HTMLHeadingElement>(null);
  const barRef = useRef<HTMLHeadingElement>(null);
  const focusSaved = useRef(false);

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
        const s = await openGothicStorage();
        setStorage(s);
        setEntries(await s.list());
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
      try {
        setCatalog(await loadCatalog());
      } catch {
        // The weapon names wait; the page still lists what is saved.
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (draft) formRef.current?.focus();
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- the form takes focus when another unit opens, not on each keystroke

  useEffect(() => {
    if (printing) barRef.current?.focus();
  }, [printing]);

  useEffect(() => {
    if (!focusSaved.current) return;
    focusSaved.current = false;
    savedRef.current?.focus();
  }, [entries]);

  const reload = (s: GothicStorage) => attempt(STORAGE_READ_FAILED, async () => void setEntries(await s.list()));
  const units = entries.flatMap((entry) => (entry.unit ? [entry.unit] : []));
  const customOffered = levelAtLeast(level, CUSTOM_LEVEL);

  const save = async () => {
    if (!storage || !draft) return;
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save({ ...draft, rulesLevel: level })))) return;
    focusSaved.current = true;
    if (await reload(storage)) say(`${unitName(draft)} saved.`);
    setDraft(undefined);
  };

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.remove(id)))) return;
    if (draft?.id === id) setDraft(undefined);
    focusSaved.current = true;
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
    let parsed: unknown;
    if (chosen.size > MAX_LIBRARY_BYTES) message = "That file is too large to be a unit file.";
    else {
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a unit file.";
      }
    }
    if (!message) {
      const result = fromAbomFile(parsed);
      if (!result.ok) message = result.message;
      else {
        const done = await attempt(STORAGE_WRITE_FAILED, async () => {
          const used = new Set((await storage.list()).map((e) => e.id));
          for (const unit of result.units) {
            const id = unit.id && !used.has(unit.id) ? unit.id : crypto.randomUUID();
            used.add(id);
            await storage.save({ ...unit, id });
          }
        });
        if (done && (await reload(storage))) say(result.units.length === 1 ? "Unit imported." : `${String(result.units.length)} units imported.`);
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  /** Opens a unit in the form and remembers how it started, so only real edits count as unsaved work. */
  const startDraft = (unit: AbominationUnit) => {
    setDraft(unit);
    setOpened({ id: unit.id, json: JSON.stringify(unit) });
  };
  const patch = (change: Partial<AbominationUnit>) => {
    setDraft((d) => (d ? { ...d, ...change } : d));
  };
  const patchCustom = (change: Partial<AbomCustom>) => {
    setDraft((d) => (d?.custom ? { ...d, custom: { ...d.custom, ...change } } : d));
  };

  if (printing && catalog) {
    return (
      <div className="sr-page bt-sheetpage">
        <div className="bt-sheetpage__bar">
          <h1 ref={barRef} tabIndex={-1}>{`${unitName(printing)} record sheet`}</h1>
          <div className="bt-actions">
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                setPrinting(undefined);
              }}
            >
              Back to the units
            </button>
            <button
              type="button"
              className="bt-button"
              onClick={() => {
                window.print();
              }}
            >
              Print
            </button>
          </div>
          <p className="bt-hint">Prints on one page, Letter or A4. In the print dialog, turn off headers and footers.</p>
        </div>
        <AbominationSheets units={[printing]} catalog={catalog} />
      </div>
    );
  }

  const dirty = draft !== undefined && opened?.id === draft.id && JSON.stringify(draft) !== opened.json;
  const stats = draft ? unitStats(draft) : undefined;
  const custom = draft?.custom;
  const weaponCount = custom?.weapons.length ?? 0;
  const maxCreatures = ABOM_CLASSES.find((c) => c.id === custom?.classId)?.maxCreatures ?? 1;
  const weaponChoices = catalog ? catalog.all().filter((row) => (row.units ?? []).includes("abomination")) : [];

  return (
    <div className="sr-page">
      <LeaveGuard dirty={dirty} />
      <h1>Abomination units</h1>
      <GamePicture game="gothic" />
      <p>
        <Link className="bt-back" to={`${GOTHIC_BASE}/home`}>
          <span aria-hidden="true">&larr; </span>BattleTech: Gothic
        </Link>
      </p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your units last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <section className="bt-section" aria-labelledby="bt-abom-saved">
        <h2 id="bt-abom-saved" ref={savedRef} tabIndex={-1}>
          Your Abomination units
        </h2>
        {storage && entries.length === 0 ? (
          <p>No units saved yet.</p>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const unit = entry.unit;
              if (!unit) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved unit cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name: "this unit" }); }}>
                        Delete
                      </button>
                    </span>
                  </li>
                );
              }
              const name = unitName(unit);
              const found = checkAbomination(unit, unit.rulesLevel ?? DEFAULT_LEVEL, catalog).filter((f) => f.level !== "note");
              const s = unitStats(unit);
              return (
                <li key={entry.id} className="bt-row">
                  <span className="bt-row__text bt-silhouetted">
                    {s && <Silhouette typeId={unit.typeId} classId={s.classId} size={40} />}
                    <span>
                      <strong>{name}</strong>
                      {s && <span className="bt-row__credit">{`${s.size?.label ?? s.classId}, ${String(s.creatures)} ${s.creatures === 1 ? "creature" : "creatures"} of ${String(s.pipsEach)} pips. Gunnery ${String(unit.gunnery)}, AniMelee ${String(unit.animelee)}.`}</span>}
                      {found.map((f) => (
                        <span key={f.check + f.message} className="bt-row__credit bt-problem">
                          {f.message}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="bt-row__actions">
                    <button type="button" className="bt-button" aria-label={`Open ${name}`} onClick={() => { setLevel(unit.rulesLevel ?? DEFAULT_LEVEL); startDraft(structuredClone(unit)); }}>
                      Open
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} disabled={!catalog} onClick={() => { setPrinting(unit); }}>
                      Record sheet
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Export ${name}`} onClick={() => { downloadUnits([unit]); say("Export started."); }}>
                      Export
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name }); }}>
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {units.length > 1 && (
          <p>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadUnits(units); say("Export started."); }}>
              Export all
            </button>
          </p>
        )}
        {confirming && (
          <div className="bt-confirm" role="group" aria-label="Confirm delete" onKeyDown={(event) => { if (event.key === "Escape") cancel(); }}>
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

      {draft && (
        <section className="bt-section" aria-labelledby="bt-abom-form">
          <h2 id="bt-abom-form" ref={formRef} tabIndex={-1}>
            {custom ? "Custom unit" : `${typeName(draft)} unit`}
          </h2>
          <form
            aria-label="Abomination unit"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {stats && !custom && (
              <p className="bt-hint">{`${stats.size?.label ?? stats.classId}: ${String(stats.creatures)} creatures of ${String(stats.pipsEach)} pips. ${moveText(stats)}. Each creature carries ${weaponsText(stats.weapons, catalog)}.`}</p>
            )}
            <div className="bt-grid">
              <div className="bt-field">
                <label htmlFor="bt-abom-label">Label</label>
                <input id="bt-abom-label" value={draft.label} onChange={(event) => { patch({ label: event.target.value }); }} />
              </div>
              <NumberField id="bt-abom-gunnery" label="Gunnery" value={draft.gunnery} onChange={(n) => { if (n !== undefined) patch({ gunnery: n }); }} />
              <NumberField id="bt-abom-animelee" label="AniMelee" value={draft.animelee} onChange={(n) => { if (n !== undefined) patch({ animelee: n }); }} />
            </div>
            {custom && (
              <fieldset className="bt-section">
                <legend>Type figures</legend>
                <div className="bt-grid">
                  <div className="bt-field">
                    <label htmlFor="bt-abom-cname">Type name</label>
                    <input id="bt-abom-cname" value={custom.name} onChange={(event) => { patchCustom({ name: event.target.value }); }} />
                  </div>
                  <div className="bt-field">
                    <label htmlFor="bt-abom-class">Size class</label>
                    <select id="bt-abom-class" value={custom.classId} onChange={(event) => { const classId = event.target.value as AbomClassId; patchCustom({ classId, creatures: Math.min(custom.creatures, ABOM_CLASSES.find((c) => c.id === classId)?.maxCreatures ?? custom.creatures) }); }}>
                      {ABOM_CLASSES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <NumberField id="bt-abom-creatures" label="Creatures" max={maxCreatures} value={custom.creatures} onChange={(n) => { patchCustom({ creatures: Math.min(Math.max(n ?? 1, 1), maxCreatures) }); }} />
                  <NumberField id="bt-abom-pips" label="Pips in each row" max={MAX_PIPS_PER_ROW} value={custom.pipsPerRow} onChange={(n) => { patchCustom({ pipsPerRow: Math.min(n ?? 0, MAX_PIPS_PER_ROW) }); }} />
                  <NumberField id="bt-abom-ground" label="Ground MP" value={custom.ground} onChange={(n) => { patchCustom({ ground: n ?? 0 }); }} />
                  <NumberField id="bt-abom-jump" label="Jump MP" optional value={custom.jump} onChange={(n) => { const { jump: _drop, ...rest } = custom; void _drop; setDraft({ ...draft, custom: n === undefined ? rest : { ...rest, jump: n } }); }} />
                  <NumberField id="bt-abom-vtol" label="VTOL MP" optional value={custom.vtol} onChange={(n) => { const { vtol: _drop, ...rest } = custom; void _drop; setDraft({ ...draft, custom: n === undefined ? rest : { ...rest, vtol: n } }); }} />
                  <NumberField id="bt-abom-mob" label="Mob damage" optional value={custom.mob} onChange={(n) => { patchCustom({ mob: n ?? null }); }} />
                  <NumberField id="bt-abom-hobble" label="Hobble damage" optional value={custom.hobble} onChange={(n) => { patchCustom({ hobble: n ?? null }); }} />
                  <NumberField id="bt-abom-melee" label="Melee damage" optional value={custom.melee} onChange={(n) => { patchCustom({ melee: n ?? null }); }} />
                </div>
                <h3>Weapons each creature carries</h3>
                {weaponCount === 0 ? (
                  <p className="bt-hint">None yet.</p>
                ) : (
                  <ul className="bt-list">
                    {custom.weapons.map((w, i) => {
                      const row = catalog?.rowFor(w.id, EDITION);
                      return (
                        <li key={`${w.id}-${String(i)}`} className="bt-row">
                          <span className="bt-row__text">{`${String(w.count)} ${weaponName(catalog, w.id)}${w.shots === undefined ? "" : ` (${shotsText(w.shots)})`}`}</span>
                          <span className="bt-row__actions">
                            <NumberField id={`bt-abom-wcount-${String(i)}`} label="Count" value={w.count} onChange={(n) => { patchCustom({ weapons: custom.weapons.map((x, j) => (j === i ? { ...x, count: n ?? 1 } : x)) }); }} />
                            {row && launcherTubes(row) !== undefined && (
                              <NumberField id={`bt-abom-wshots-${String(i)}`} label="Shots" value={w.shots} onChange={(n) => { patchCustom({ weapons: custom.weapons.map((x, j) => (j === i ? { ...x, shots: n } : x)) }); }} />
                            )}
                            <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${weaponName(catalog, w.id)}`} onClick={() => { patchCustom({ weapons: custom.weapons.filter((_, j) => j !== i) }); }}>
                              Remove
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="bt-field">
                  <label htmlFor="bt-abom-weapon">Add a weapon</label>
                  <select id="bt-abom-weapon" value={weaponPick} onChange={(event) => { setWeaponPick(event.target.value); }}>
                    <option value="">Choose a weapon</option>
                    {weaponChoices.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="bt-button bt-button--secondary"
                  disabled={!weaponPick}
                  onClick={() => {
                    const row = catalog?.byId(weaponPick);
                    patchCustom({ weapons: [...custom.weapons, { id: weaponPick, count: 1, ...(row && launcherTubes(row) !== undefined ? { shots: 1 } : {}) }] });
                    setWeaponPick("");
                  }}
                >
                  Add weapon
                </button>
              </fieldset>
            )}
            <p className="bt-actions">
              <button type="submit" className="bt-button" disabled={!storage}>
                Save
              </button>
              <button type="button" className="bt-button bt-button--secondary" onClick={() => { setDraft(undefined); }}>
                Close without saving
              </button>
            </p>
          </form>
        </section>
      )}

      <section className="bt-section" aria-labelledby="bt-abom-add">
        <h2 id="bt-abom-add">Add a unit</h2>
        <LevelSelect id="bt-abom-level" record={{ rulesLevel: level }} ruleset={GOTHIC} onChange={setLevel} />
        {ABOM_CLASSES.map((size) => (
          <div key={size.id} role="group" aria-label={size.label}>
            <h3>{size.label}</h3>
            <ul className="bt-list">
              {ABOM_TYPES.filter((t) => t.classId === size.id).map((type) => (
                <li key={type.id} className="bt-row">
                  <span className="bt-row__text bt-silhouetted">
                    <Silhouette typeId={type.id} classId={type.classId} size={40} />
                    <span>
                      <strong>{type.name}</strong>
                      <span className="bt-row__credit">{`${String(type.creatures)} creatures of ${String(size.rows * type.pipsPerRow)} pips. ${moveText(type)}. ${weaponsText(type.weapons, catalog)}.`}</span>
                    </span>
                  </span>
                  <span className="bt-row__actions">
                    <button type="button" className="bt-button" aria-label={`Add ${type.name}`} onClick={() => { startDraft(newAbominationUnit(type.id)); }}>
                      Add
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {customOffered && (
          <p>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                const { typeId: _none, ...blank } = newAbominationUnit("");
                void _none;
                startDraft({ ...blank, custom: structuredClone(BLANK_CUSTOM) });
              }}
            >
              Start a custom type
            </button>
            <span className="bt-hint">{` Offered at ${levelRow(CUSTOM_LEVEL, GOTHIC).label} and above.`}</span>
          </p>
        )}
        <div className="bt-field">
          <label htmlFor="bt-abom-file">Import a file</label>
          <input id="bt-abom-file" type="file" accept="application/json,.json" aria-describedby="bt-abom-file-hint" disabled={!storage} onChange={(event) => { void upload(event); }} />
          <p id="bt-abom-file-hint" className="bt-hint">
            One unit, or the file Export all makes here. Units whose id you already have are added as new ones.
          </p>
        </div>
      </section>
    </div>
  );
}
