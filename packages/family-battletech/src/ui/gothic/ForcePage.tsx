// The Gothic forces page (BattleTech: Gothic): a force is a name, 'Mechs with their pilots and Abomination units with their Handlers. The
// page shows the 'Mech Battle Value total, the Initiative modifiers that apply and the force's own checks, and prints every sheet in one
// go: each 'Mech's sheet with its pilot filled in, then the Abomination sheets five to a page (gothic-design s.7.4, s.8).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { HANDLER } from "../../data/gothic";
import { GOTHIC_BASE } from "../../data/rulesets";
import { checkForce, initiativeModifiers, newForce, newForceMech, newForceUnit, unitStats } from "../../rules/abomination";
import type { AbominationUnit, ForceMech, ForceUnit, GothicForce } from "../../rules/abomination";
import { battleValue } from "../../rules/bv";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import type { MechRecord } from "../../rules/mech";
import { LeaveGuard } from "../editor/LeaveConfirm";
import GamePicture from "../GamePicture";
import RecordSheet from "../sheet/RecordSheet";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, openFamilyStorage } from "../storage";
import { AbominationSheets } from "./AbominationSheet";
import { openGothicStorage } from "./storage";
import type { ForceEntry, GothicStorage } from "./storage";
import "../classic.scss";

const FORCES = `${GOTHIC_BASE}/force`;
const mechName = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();
const unitTitle = (unit: AbominationUnit): string => {
  const type = unitStats(unit)?.name || "Custom type";
  return unit.label.trim() ? `${unit.label.trim()} (${type})` : type;
};
/** The entry without its Handler link. */
const unlink = (unit: ForceUnit): ForceUnit => {
  const { handlerOf: _link, ...rest } = unit;
  void _link;
  return rest;
};
const signed = (n: number) => (n < 0 ? `−${String(-n)}` : `+${String(n)}`);

interface Roster {
  mechs: MechRecord[];
  units: AbominationUnit[];
}

/** A whole number from a skill field; undefined when empty or not a number. */
const skillOf = (text: string): number | undefined => {
  const n = Number(text);
  return text.trim() === "" || !Number.isInteger(n) || n < 0 ? undefined : n;
};

export default function ForcePage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  return id ? <ForceEditor key={id} id={id} /> : <ForceList />;
}

// ---- The list of saved forces ------------------------------------------------------------------------------------------------------

function ForceList() {
  const [storage, setStorage] = useState<GothicStorage>();
  const [entries, setEntries] = useState<ForceEntry[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      try {
        const s = await openGothicStorage();
        setStorage(s);
        setEntries(await s.listForces());
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const create = async () => {
    if (!storage) return;
    const force = newForce();
    try {
      await storage.saveForce(force);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    void navigate(`${FORCES}?id=${encodeURIComponent(force.id)}`);
  };

  const remove = async (target: string) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.removeForce(target);
      setEntries(await storage.listForces());
      setProblem("");
      setStatus("Deleted.");
      headingRef.current?.focus();
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  return (
    <div className="sr-page">
      <h1>Gothic forces</h1>
      <GamePicture game="gothic" />
      <p>
        <Link className="bt-back" to={`${GOTHIC_BASE}/home`}>
          <span aria-hidden="true">&larr; </span>BattleTech: Gothic
        </Link>
      </p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your forces last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <section className="bt-section" aria-labelledby="bt-forces-saved">
        <h2 id="bt-forces-saved" ref={headingRef} tabIndex={-1}>
          Your forces
        </h2>
        {storage && entries.length === 0 ? (
          <p>No forces saved yet.</p>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const force = entry.force;
              if (!force) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved force cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name: "this force" }); }}>
                        Delete
                      </button>
                    </span>
                  </li>
                );
              }
              const name = force.name.trim() || "Unnamed force";
              return (
                <li key={entry.id} className="bt-row">
                  <span className="bt-row__text">
                    <strong>{name}</strong>
                    <span className="bt-row__credit">{`${String(force.mechs.length)} ${force.mechs.length === 1 ? "'Mech" : "'Mechs"}, ${String(force.units.length)} ${force.units.length === 1 ? "unit" : "units"}`}</span>
                  </span>
                  <span className="bt-row__actions">
                    <Link className="bt-button" aria-label={`Open ${name}`} to={`${FORCES}?id=${encodeURIComponent(force.id)}`}>
                      Open
                    </Link>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { openerRef.current = event.currentTarget; setConfirming({ id: entry.id, name }); }}>
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
              if (event.key === "Escape") {
                setConfirming(undefined);
                openerRef.current?.focus();
              }
            }}
          >
            <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
            <span className="bt-row__actions">
              <button type="button" className="bt-button" onClick={() => { void remove(confirming.id); }}>
                Delete
              </button>
              <button
                type="button"
                ref={keepRef}
                className="bt-button bt-button--secondary"
                onClick={() => {
                  setConfirming(undefined);
                  openerRef.current?.focus();
                }}
              >
                Keep
              </button>
            </span>
          </div>
        )}
        <p>
          <button type="button" className="bt-button" disabled={!storage} onClick={() => { void create(); }}>
            Start a new force
          </button>
        </p>
      </section>
    </div>
  );
}

// ---- One force ---------------------------------------------------------------------------------------------------------------------

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "ready"; storage: GothicStorage; force: GothicForce; roster: Roster; catalog: Catalog };

function ForceEditor({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, family, catalog] = await Promise.all([openGothicStorage(), openFamilyStorage(), loadCatalog()]);
        const entry = await storage.getForce(id);
        const mechs = (await family.list()).flatMap((e) => (e.game === "gothic" && e.record ? [e.record] : []));
        const units = (await storage.list()).flatMap((e) => (e.unit ? [e.unit] : []));
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.force) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, force: entry.force, roster: { mechs, units }, catalog });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <ForceBuilder initial={loaded.force} roster={loaded.roster} storage={loaded.storage} catalog={loaded.catalog} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Gothic force</h1>
      {loaded.state === "failed" ? (
        <p role="alert" className="bt-problem">
          {STORAGE_READ_FAILED}
        </p>
      ) : (
        <p>{loaded.state === "missing" ? "That force is not saved on this device." : `This saved force cannot be read. ${loaded.message}`}</p>
      )}
      <p>
        <Link className="sr-action" to={FORCES}>
          Back to your forces
        </Link>
      </p>
    </div>
  );
}

function ForceBuilder({ initial, roster, storage, catalog }: { initial: GothicForce; roster: Roster; storage: GothicStorage; catalog: Catalog }) {
  const [force, setForce] = useState<GothicForce>(initial);
  const [dirty, setDirty] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [mechPick, setMechPick] = useState("");
  const [unitPick, setUnitPick] = useState("");
  const barRef = useRef<HTMLHeadingElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const recordOf = useCallback((recordId: string) => roster.mechs.find((r) => r.id === recordId), [roster]);
  const unitOf = useCallback((unitId: string) => roster.units.find((u) => u.id === unitId), [roster]);

  useEffect(() => {
    if (printing) barRef.current?.focus();
  }, [printing]);

  const change = (next: (draft: GothicForce) => GothicForce) => {
    setForce(next);
    setDirty(true);
    setStatus("");
  };
  const patchMech = (entryId: string, patch: Partial<ForceMech>) => {
    change((f) => ({ ...f, mechs: f.mechs.map((m) => (m.id === entryId ? { ...m, ...patch } : m)) }));
  };
  const patchUnit = (entryId: string, patch: Partial<ForceUnit>) => {
    change((f) => ({ ...f, units: f.units.map((u) => (u.id === entryId ? { ...u, ...patch } : u)) }));
  };
  const move = (index: number, by: -1 | 1) => {
    change((f) => {
      const mechs = [...f.mechs];
      const [taken] = mechs.splice(index, 1);
      if (taken) mechs.splice(index + by, 0, taken);
      return { ...f, mechs };
    });
  };
  const removeMech = (entryId: string) => {
    change((f) => ({
      ...f,
      mechs: f.mechs.filter((m) => m.id !== entryId),
      // A unit linked to the 'Mech keeps its bonus box but loses the link; the check then reports it.
      units: f.units.map((u) => (u.handlerOf === entryId ? unlink(u) : u)),
    }));
  };

  const save = async () => {
    try {
      await storage.saveForce(force);
      setDirty(false);
      setProblem("");
      setStatus("Saved.");
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  const mechLabel = (m: ForceMech): string => {
    const record = recordOf(m.recordId);
    const name = record ? mechName(record) : "A 'Mech that is no longer saved";
    return m.pilot.trim() ? `${name} (${m.pilot.trim()})` : name;
  };

  const bv = useMemo(
    () => force.mechs.reduce((sum, m) => { const record = recordOf(m.recordId); return record ? sum + battleValue(record, catalog, { gunnery: m.gunnery, piloting: m.piloting }).total : sum; }, 0),
    [force.mechs, recordOf, catalog],
  );
  // A 'Mech carrying an item with no printed Battle Value (the Light Blazer) has an inferred figure; the editor says so and so do we.
  const inferredBv = force.mechs.some((m) => recordOf(m.recordId)?.mounts.some((mount) => (mount.equipmentId ? catalog.byId(mount.equipmentId)?.bvInferred : false)));
  const initiative = initiativeModifiers(force);
  const findings = checkForce(force, {
    mech: (recordId) => { const r = recordOf(recordId); return r ? { name: mechName(r), tons: r.tons } : undefined; },
    unit: (unitId) => { const u = unitOf(unitId); return u ? unitTitle(u) : undefined; },
  });
  const missing = [
    ...force.mechs.filter((m) => !recordOf(m.recordId)).map(() => "A 'Mech in this force is no longer saved on this device, so its sheet and Battle Value are left out."),
    ...force.units.filter((u) => !unitOf(u.unitId)).map(() => "An Abomination unit in this force is no longer saved on this device, so its sheet is left out."),
  ];

  if (printing) {
    const title = force.name.trim() || "Unnamed force";
    // Each entry prints under its own id, so one saved 'Mech or unit can stand in a force twice without a repeated id.
    const units = force.units.flatMap((u) => { const unit = unitOf(u.unitId); return unit ? [{ entry: u, unit: { ...structuredClone(unit), id: u.id, handlerBonus: u.handlerBonus, ...(u.handlerOf ? { handlerOf: u.handlerOf } : {}) } }] : []; });
    const handlers: Record<string, string> = {};
    for (const { entry } of units) {
      const mech = force.mechs.find((m) => m.id === entry.handlerOf);
      if (mech?.handler) handlers[entry.id] = mechLabel(mech);
    }
    return (
      <div className="sr-page bt-sheetpage">
        <LeaveGuard dirty={dirty} />
        <div className="bt-sheetpage__bar">
          <h1 ref={barRef} tabIndex={-1}>{`${title} record sheets`}</h1>
          <div className="bt-actions">
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { setPrinting(false); }}>
              Back to the force
            </button>
            <button type="button" className="bt-button" onClick={() => { window.print(); }}>
              Print
            </button>
          </div>
          <p className="bt-hint">{`${String(force.mechs.length)} ${force.mechs.length === 1 ? "'Mech sheet" : "'Mech sheets"}, then the Abomination sheets, five units to a page. In the print dialog, turn off headers and footers.`}</p>
        </div>
        {force.mechs.map((m, index) => {
          const record = recordOf(m.recordId);
          if (!record) return null;
          const carries = units.filter(({ entry }) => entry.handlerOf === m.id).map(({ unit }) => unitTitle(unit)).join(", ");
          return (
            <div key={m.id} className="bt-force-sheet">
              <RecordSheet
                record={{ ...record, id: m.id }}
                catalog={catalog}
                textHeading={`The record sheet as text, ${String(index + 1)} of ${String(force.mechs.length)}`}
                pilot={{ name: m.pilot, gunnery: m.gunnery, piloting: m.piloting, frayed: m.frayed, handler: m.handler, ...(carries ? { carries } : {}) }}
              />
            </div>
          );
        })}
        <AbominationSheets units={units.map(({ unit }) => unit)} catalog={catalog} handlers={handlers} />
      </div>
    );
  }

  const handlerMechs = (current: string | undefined) => force.mechs.filter((m) => m.handler || m.id === current);

  return (
    <div className="sr-page">
      <LeaveGuard dirty={dirty} />
      <h1 ref={headingRef} tabIndex={-1}>{force.name.trim() || "Unnamed force"}</h1>
      <p>
        <Link className="bt-back" to={FORCES}>
          <span aria-hidden="true">&larr; </span>Your forces
        </Link>
      </p>
      {!storage.persistent && <p className="bt-warning">This browser is not letting us save. Your forces last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <div className="bt-field">
        <label htmlFor="bt-force-name">Force name</label>
        <input id="bt-force-name" value={force.name} onChange={(event) => { change((f) => ({ ...f, name: event.target.value })); }} />
      </div>
      <p className="bt-actions">
        <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>
          Save
        </button>
        <button type="button" className="bt-button bt-button--secondary" disabled={force.mechs.length + force.units.length === 0} onClick={() => { setPrinting(true); }}>
          Print all sheets
        </button>
        {!dirty && force.units.length > 0 && (
          <Link className="bt-button bt-button--secondary" to={`${GOTHIC_BASE}/play?force=${encodeURIComponent(force.id)}`}>
            Play this force
          </Link>
        )}
      </p>

      <section className="bt-section" aria-labelledby="bt-force-summary">
        <h2 id="bt-force-summary">The force at a glance</h2>
        <p data-testid="force-bv">{`'Mech Battle Value: ${bv.toLocaleString("en-US")}`}</p>
        <p className="bt-hint">Abomination units have no Battle Value in the book, so they add nothing to it. Each 'Mech counts at its pilot's skills.{inferredBv ? " A 'Mech here carries an item with no printed Battle Value, so the total includes an inferred figure." : ""}</p>
        {initiative.length === 0 ? (
          <p>No Initiative modifier applies.</p>
        ) : (
          <ul className="bt-list" aria-label="Initiative modifiers">
            {initiative.map((m) => (
              <li key={m.why}>{`Initiative ${signed(m.value)}: ${m.why}`}</li>
            ))}
          </ul>
        )}
        {findings.length + missing.length > 0 && (
          <ul className="bt-list" aria-label="Force findings">
            {[...findings.map((f) => f.message), ...missing].map((message, i) => (
              <li key={`${String(i)}-${message}`} className="bt-problem">
                {message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bt-section" aria-labelledby="bt-force-mechs">
        <h2 id="bt-force-mechs">'Mechs</h2>
        <p className="bt-hint">The first 'Mech listed leads the force.</p>
        {force.mechs.map((m, index) => {
          const label = mechLabel(m);
          return (
            <fieldset key={m.id} className="bt-section">
              <legend>{label}</legend>
              <div className="bt-grid">
                <div className="bt-field">
                  <label htmlFor={`bt-pilot-${m.id}`}>{`Pilot name for ${label}`}</label>
                  <input id={`bt-pilot-${m.id}`} value={m.pilot} onChange={(event) => { patchMech(m.id, { pilot: event.target.value }); }} />
                </div>
                <div className="bt-field">
                  <label htmlFor={`bt-gunnery-${m.id}`}>{`Gunnery for ${label}`}</label>
                  <input id={`bt-gunnery-${m.id}`} type="number" inputMode="numeric" min={0} value={m.gunnery} onChange={(event) => { const n = skillOf(event.target.value); if (n !== undefined) patchMech(m.id, { gunnery: n }); }} />
                </div>
                <div className="bt-field">
                  <label htmlFor={`bt-piloting-${m.id}`}>{`Piloting for ${label}`}</label>
                  <input id={`bt-piloting-${m.id}`} type="number" inputMode="numeric" min={0} value={m.piloting} onChange={(event) => { const n = skillOf(event.target.value); if (n !== undefined) patchMech(m.id, { piloting: n }); }} />
                </div>
              </div>
              <label className="bt-check">
                <input type="checkbox" checked={m.frayed} onChange={(event) => { patchMech(m.id, { frayed: event.target.checked }); }} />
                {`Frayed MechWarrior in ${label}`}
              </label>
              {m.frayed && <p className="bt-hint">Enter the skills as the pilot card prints them: the card already counts the Frayed bonus (p. 78).</p>}
              {(m.handler || (recordOf(m.recordId)?.tons ?? HANDLER.minMechTons) >= HANDLER.minMechTons) && (
              <label className="bt-check">
                <input type="checkbox" checked={m.handler} onChange={(event) => { patchMech(m.id, { handler: event.target.checked }); }} />
                {`Handler aboard ${label}`}
              </label>
              )}
              <p className="bt-actions">
                <button type="button" className="bt-button bt-button--secondary" disabled={index === 0} aria-label={`Move up ${label}`} onClick={() => { move(index, -1); }}>
                  Move up
                </button>
                <button type="button" className="bt-button bt-button--secondary" disabled={index === force.mechs.length - 1} aria-label={`Move down ${label}`} onClick={() => { move(index, 1); }}>
                  Move down
                </button>
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${label}`} onClick={() => { removeMech(m.id); }}>
                  Remove
                </button>
              </p>
            </fieldset>
          );
        })}
        {roster.mechs.length === 0 ? (
          <p>
            No Gothic 'Mechs saved yet. <Link to={`${GOTHIC_BASE}/home`}>Start one on the Gothic home.</Link>
          </p>
        ) : (
          <div className="bt-field">
            <label htmlFor="bt-force-mech-pick">Add a 'Mech</label>
            <select id="bt-force-mech-pick" value={mechPick} onChange={(event) => { setMechPick(event.target.value); }}>
              <option value="">Choose a 'Mech</option>
              {roster.mechs.map((r) => (
                <option key={r.id} value={r.id}>{`${mechName(r)}, ${String(r.tons)} tons`}</option>
              ))}
            </select>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={!mechPick}
              onClick={() => {
                change((f) => ({ ...f, mechs: [...f.mechs, newForceMech(mechPick)] }));
                setMechPick("");
              }}
            >
              Add 'Mech
            </button>
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="bt-force-units">
        <h2 id="bt-force-units">Abomination units</h2>
        {force.units.map((u) => {
          const unit = unitOf(u.unitId);
          const name = unit ? unitTitle(unit) : "A unit that is no longer saved";
          const options = handlerMechs(u.handlerOf);
          return (
            <fieldset key={u.id} className="bt-section">
              <legend>{name}</legend>
              <div className="bt-field">
                <label htmlFor={`bt-handler-${u.id}`}>{`Handler for ${name}`}</label>
                <select
                  id={`bt-handler-${u.id}`}
                  value={u.handlerOf ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    change((f) => ({ ...f, units: f.units.map((x) => (x.id === u.id ? { ...unlink(x), ...(next ? { handlerOf: next } : {}) } : x)) }));
                  }}
                >
                  <option value="">No Handler</option>
                  {options.map((m) => (
                    <option key={m.id} value={m.id}>
                      {mechLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="bt-check">
                <input type="checkbox" checked={u.handlerBonus} onChange={(event) => { patchUnit(u.id, { handlerBonus: event.target.checked }); }} />
                {`Handler bonus for ${name}`}
              </label>
              <p className="bt-actions">
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${name}`} onClick={() => { change((f) => ({ ...f, units: f.units.filter((x) => x.id !== u.id) })); }}>
                  Remove
                </button>
              </p>
            </fieldset>
          );
        })}
        {roster.units.length === 0 ? (
          <p>
            No Abomination units saved yet. <Link to={`${GOTHIC_BASE}/abominations`}>Add some on the units page.</Link>
          </p>
        ) : (
          <div className="bt-field">
            <label htmlFor="bt-force-unit-pick">Add a unit</label>
            <select id="bt-force-unit-pick" value={unitPick} onChange={(event) => { setUnitPick(event.target.value); }}>
              <option value="">Choose a unit</option>
              {roster.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitTitle(u)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              disabled={!unitPick}
              onClick={() => {
                change((f) => ({ ...f, units: [...f.units, newForceUnit(unitPick)] }));
                setUnitPick("");
              }}
            >
              Add unit
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
