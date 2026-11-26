// The Abomination tracker for the table (BattleTech: Gothic, gothic-design s.7.5): tap pips to mark damage, and the unit shows its
// active creatures, attack modifier, each weapon's cluster column, launcher shots, stumble target, Mob and Hobble modifiers and a
// creature roll helper. Every figure comes from `rules/abomination.ts`; the page holds no rules of its own. State is kept on the
// device per unit (`gothic-play:<unit id>`), so a reload or a closed tab loses nothing.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { HANDLER } from "../../data/gothic";
import type { AbomWeapon } from "../../data/gothic";
import { GOTHIC_BASE } from "../../data/rulesets";
import {
  activeCreatures,
  addOverflow,
  applyDamage,
  clusterColumn,
  creatureFor,
  damageModifier,
  damageThisPhase,
  eliminatedCreatures,
  endPhase,
  launcherSlots,
  launcherTubes,
  markCreature,
  mobHobbleModifier,
  newTracker,
  onlyCreatureLeft,
  spendShot,
  stumbleTarget,
  trackerWithDefaults,
  unitStats,
} from "../../rules/abomination";
import type { AbominationUnit, GothicForce, TrackerState, UnitStats } from "../../rules/abomination";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import GamePicture from "../GamePicture";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import Silhouette from "./Silhouette";
import { copyKey, openGothicStorage } from "./storage";
import type { AbomEntry, GothicStorage } from "./storage";
import { moveText, weaponFigures } from "./text";
import { useGothicTheme } from "./theme";
import "./tracker.scss";

const EDITION = "gothic";

const typeName = (unit: AbominationUnit, stats: UnitStats | undefined): string => (stats ? stats.name || "Custom type" : (unit.typeId ?? "Unknown type"));
const unitName = (unit: AbominationUnit, stats: UnitStats | undefined): string => (unit.label.trim() ? `${unit.label.trim()} (${typeName(unit, stats)})` : typeName(unit, stats));
const signed = (n: number): string => (n > 0 ? `+${String(n)}` : String(n));

/** The units the player can put on the table when no force is open: every saved unit. */
export function unitsToChoose(entries: readonly AbomEntry[]): AbominationUnit[] {
  return entries.flatMap((entry) => (entry.unit ? [entry.unit] : []));
}

/**
 * The units a force puts on the table, one per force entry (a saved unit entered twice is two units, each tracked on its own, under
 * the entry's id). The entry's Handler bonus counts only while the 'Mech it names has a Handler aboard (p. 80).
 */
export function forceUnits(force: GothicForce, entries: readonly AbomEntry[]): AbominationUnit[] {
  return force.units.flatMap((entry) => {
    const saved = entries.find((e) => e.unit?.id === entry.unitId)?.unit;
    if (!saved) return [];
    const handled = entry.handlerBonus && force.mechs.some((m) => m.id === entry.handlerOf && m.handler);
    return [{ ...structuredClone(saved), id: entry.id, handlerBonus: handled }];
  });
}

/**
 * The units on the table when no force is open: every saved unit, each followed by the extra copies of it fielded (`<id>~2` and up, in
 * `copies`, the keys that hold state). A copy is a unit under its own key, named with its number.
 */
export function withCopies(saved: readonly AbominationUnit[], copies: Iterable<string>): AbominationUnit[] {
  const keys = [...copies];
  return saved.flatMap((unit) => {
    const mine = keys
      .flatMap((key) => (key.startsWith(`${unit.id}~`) ? [Number(key.slice(unit.id.length + 1))] : []))
      .filter((n) => Number.isInteger(n) && n >= 2)
      .sort((a, b) => a - b);
    const base = unit.label.trim() || (unitStats(unit)?.name ?? unit.typeId ?? "Unit");
    return [unit, ...mine.map((n) => ({ ...structuredClone(unit), id: copyKey(unit.id, n), label: `${base} ${String(n)}` }))];
  });
}

/** The tracker key for the next extra copy of a unit: the smallest number from 2 not already on the table. */
export const nextCopyKey = (unitId: string, onTable: Iterable<string>): string => {
  const have = new Set(onTable);
  let n = 2;
  while (have.has(copyKey(unitId, n))) n += 1;
  return copyKey(unitId, n);
};

interface UnitTrackerProps {
  unit: AbominationUnit;
  stats: UnitStats;
  state: TrackerState;
  catalog: Catalog | undefined;
  onChange: (next: TrackerState) => void;
  onRemove: () => void;
  /** Outside a force: put another of this saved unit on the table. */
  onAnother?: () => void;
}

/** A whole number of damage from the text field; undefined when empty or not a positive whole number. */
const damageOf = (text: string): number | undefined => {
  const n = Number(text);
  return text.trim() === "" || !Number.isInteger(n) || n < 1 ? undefined : n;
};

function weaponLabel(weapon: AbomWeapon, catalog: Catalog | undefined): string {
  return catalog?.rowFor(weapon.id, EDITION)?.name ?? weapon.id;
}

function UnitTracker({ unit, stats, state, catalog, onChange: keepState, onRemove, onAnother }: UnitTrackerProps) {
  const name = unitName(unit, stats);
  /** The state before the last change, for Undo; kept on the page only, so a reload starts without one. */
  const [previous, setPrevious] = useState<TrackerState>();
  const [marks, setMarks] = useState<Record<number, string>>({});
  const onChange = (next: TrackerState) => {
    setPrevious(state);
    keepState(next);
  };
  const active = activeCreatures(state, stats.pipsEach);
  const out = eliminatedCreatures(state, stats.pipsEach);
  const killed = out.length;
  const phaseDamage = damageThisPhase(state);
  const slots = launcherSlots(stats);
  const left = onlyCreatureLeft(stats.creatures, out);
  const [roll, setRoll] = useState<number>();
  const result = roll === undefined ? undefined : left !== undefined ? left : creatureFor(roll, stats.creatures, out);
  const hasPhysical = stats.mob !== null || stats.hobble !== null;
  const slotOf = (weapon: AbomWeapon, number: number) => slots.findIndex((s) => s.weaponId === weapon.id && s.number === number);

  const tapPip = (creature: number, pip: number) => {
    const now = state.marked[creature - 1] ?? 0;
    onChange(markCreature(state, creature, pip <= now ? pip - 1 : pip, stats.pipsEach));
  };

  return (
    <section className="bt-section bt-track" aria-labelledby={`bt-track-${unit.id}`}>
      <h2 id={`bt-track-${unit.id}`}>
        <span className="bt-silhouetted">
          <Silhouette typeId={unit.typeId} classId={stats.classId} size={48} />
          <span>{name}</span>
        </span>
      </h2>
      {active === 0 && <p className="bt-problem">All creatures are out: the unit is destroyed.</p>}
      <dl className="bt-track__facts bt-track__facts--text">
        <div>
          <dt>Skills</dt>
          <dd>{`Gunnery ${String(stats.gunneryEffective)}, AniMelee ${String(stats.animeleeEffective)}`}</dd>
          {unit.handlerBonus && <dd className="bt-track__cite">{`Handler bonus ${String(HANDLER.skillBonus)} applied (p. ${String(HANDLER.cite.page)})`}</dd>}
        </div>
        <div>
          <dt>Movement</dt>
          <dd>{moveText(stats)}</dd>
        </div>
        {stats.size && (
          <div>
            <dt>Class target movement modifier</dt>
            <dd>{`${signed(stats.size.bonusTmm)} (p. ${String(stats.size.cite.page)})`}</dd>
          </div>
        )}
        <div>
          <dt>Physical damage</dt>
          <dd>{[stats.melee !== null && `Melee ${String(stats.melee)}`, stats.mob !== null && `Mob ${String(stats.mob)}`, stats.hobble !== null && `Hobble ${String(stats.hobble)}`].filter(Boolean).join(", ") || "none"}</dd>
        </div></dl>
      <dl className="bt-track__facts">
        <div>
          <dt>Active creatures</dt>
          <dd>{`${String(active)} of ${String(stats.creatures)}`}</dd>
        </div>
        <div>
          <dt>Attack modifier</dt>
          <dd>{signed(damageModifier(killed))}</dd>
        </div>
        <div>
          <dt>Damage this phase</dt>
          <dd>{phaseDamage}</dd>
        </div>
        <div>
          <dt>Extra damage past the last pip</dt>
          <dd>
            <span aria-live="polite">{state.overflow ?? 0}</span>{" "}
            <button type="button" className="bt-button bt-button--secondary" aria-label={`Add 1 extra damage: ${name}`} onClick={() => { onChange(addOverflow(state, 1)); }}>
              Add 1
            </button>{" "}
            <button type="button" className="bt-button bt-button--secondary" disabled={(state.overflow ?? 0) === 0} aria-label={`Take back 1 extra damage: ${name}`} onClick={() => { onChange(addOverflow(state, -1)); }}>
              Take back 1
            </button>
          </dd>
        </div>
        <div>
          <dt>Stumble target</dt>
          <dd>{stumbleTarget(stats.animeleeEffective, phaseDamage, killed)}</dd>
        </div>
        {hasPhysical && (
          <div>
            <dt>Mob modifier</dt>
            <dd>{stats.mob === null ? "none" : signed(mobHobbleModifier("mob", active))}</dd>
          </div>
        )}
        {hasPhysical && (
          <div>
            <dt>Hobble modifier</dt>
            <dd>{stats.hobble === null ? "none" : signed(mobHobbleModifier("hobble", active))}</dd>
          </div>
        )}
      </dl>

      <h3>Weapons</h3>
      {stats.weapons.length === 0 ? (
        <p className="bt-hint">No weapons.</p>
      ) : (
        <ul className="bt-list">
          {stats.weapons.map((weapon) => {
            const row = catalog?.rowFor(weapon.id, EDITION);
            const tubes = row ? launcherTubes(row) : undefined;
            const column = clusterColumn(tubes, active);
            const wname = weaponLabel(weapon, catalog);
            return (
              <li key={weapon.id} className="bt-row">
                <span className="bt-row__text">
                  <strong>{`${weapon.count > 1 ? `${String(weapon.count)} ` : ""}${wname}`}</strong>
                  <span className="bt-row__credit">{row ? `Cluster column ${String(column)}${active === 1 && tubes === undefined ? " (no roll)" : ""}` : "Cluster column loading"}</span>
                  {row && weaponFigures(row) && <span className="bt-row__credit">{`${weaponFigures(row)}${tubes === undefined ? "" : ` (damage per missile, ${String(tubes)} tubes)`}`}</span>}
                </span>
                {weapon.shots !== undefined && (
                  <span className="bt-row__actions">
                    {Array.from({ length: weapon.count }, (_, i) => {
                      const slot = slotOf(weapon, i + 1);
                      const shots = state.shotsLeft[slot] ?? 0;
                      const label = `${wname}${weapon.count > 1 ? ` ${String(i + 1)}` : ""}`;
                      return (
                        <span key={i} className="bt-track__shots">
                          <span aria-live="polite">{`${label}: ${String(shots)} ${shots === 1 ? "shot" : "shots"} left`}</span>
                          <button type="button" className="bt-button" disabled={shots === 0} aria-label={`Spend a shot: ${label}`} onClick={() => { onChange(spendShot(state, slot, 1, weapon.shots ?? 0)); }}>
                            Spend a shot
                          </button>
                          <button type="button" className="bt-button bt-button--secondary" disabled={shots >= (weapon.shots ?? 0)} aria-label={`Give back a shot: ${label}`} onClick={() => { onChange(spendShot(state, slot, -1, weapon.shots ?? 0)); }}>
                            Give back
                          </button>
                        </span>
                      );
                    })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3>Creatures</h3>
      <p className="bt-hint">Tap a pip to mark damage up to it. Tap the last marked pip to take one back. Or enter the damage a hit does and press Mark: it fills the creature's pips and any damage past the last one counts toward the phase.</p>
      <p className="bt-actions">
        <button type="button" className="bt-button bt-button--secondary" disabled={!previous} aria-label={`Undo the last change: ${name}`} onClick={() => { if (previous) { keepState(previous); setPrevious(undefined); } }}>
          Undo the last change
        </button>
      </p>
      {state.marked.map((marked, c) => {
        const creature = c + 1;
        const gone = marked >= stats.pipsEach;
        return (
          <div key={creature} role="group" aria-label={`Creature ${String(creature)}, ${String(marked)} of ${String(stats.pipsEach)} pips marked${gone ? ", out" : ""}`} className={`bt-track__creature${gone ? " bt-track__creature--out" : ""}`}>
            <h4>{`Creature ${String(creature)}`}<span className="bt-track__count">{` ${String(stats.pipsEach - marked)} left`}</span></h4>
            <form
              className="bt-track__mark"
              onSubmit={(event) => {
                event.preventDefault();
                const hit = damageOf(marks[creature] ?? "");
                if (hit === undefined) return;
                onChange(applyDamage(state, creature, hit, stats.pipsEach));
                setMarks((all) => ({ ...all, [creature]: "" }));
              }}
            >
              <label htmlFor={`bt-mark-${unit.id}-${String(creature)}`}>{`Damage to mark on creature ${String(creature)}`}</label>
              <input
                id={`bt-mark-${unit.id}-${String(creature)}`}
                type="number"
                inputMode="numeric"
                min={1}
                value={marks[creature] ?? ""}
                onChange={(event) => { setMarks((all) => ({ ...all, [creature]: event.target.value })); }}
              />
              <button type="submit" className="bt-button bt-button--secondary" aria-label={`Mark damage on creature ${String(creature)}: ${name}`} disabled={damageOf(marks[creature] ?? "") === undefined}>
                Mark
              </button>
            </form>
            <div className="bt-track__pips">
              {Array.from({ length: stats.pipsEach }, (_, p) => (
                <button
                  key={p}
                  type="button"
                  className="bt-track__pip"
                  aria-pressed={p < marked}
                  aria-label={`Creature ${String(creature)} pip ${String(p + 1)}`}
                  onClick={() => { tapPip(creature, p + 1); }}
                />
              ))}
            </div>
          </div>
        );
      })}

      <h3>Creature roll</h3>
      <p className="bt-hint">Enter the 1D6 result for a hit on this unit.</p>
      <div className="bt-track__dice" role="group" aria-label="Creature roll">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} type="button" className="bt-button bt-button--secondary" aria-pressed={roll === n} aria-label={`Rolled ${String(n)}`} onClick={() => { setRoll(n); }}>
            {n}
          </button>
        ))}
      </div>
      <div role="status" className="bt-track__result">
        {result === undefined ? "" : result === "reroll" ? "Roll again." : left !== undefined ? `Creature ${String(result)} (the only one left, no roll needed).` : `Creature ${String(result)}.`}
      </div>

      {hasPhysical && (
        <div className="bt-grid">
          <div className="bt-field">
            <label htmlFor={`bt-mounted-${unit.id}`}>Mounted</label>
            <select id={`bt-mounted-${unit.id}`} value={state.mounted} onChange={(event) => { keepState({ ...state, mounted: event.target.value as TrackerState["mounted"] }); }}>
              <option value="none">Not mounted</option>
              {stats.mob !== null && <option value="mob">Mob</option>}
              {stats.hobble !== null && <option value="hobble">Hobble</option>}
            </select>
          </div>
          <div className="bt-field">
            <label htmlFor={`bt-mounted-on-${unit.id}`}>Mounted on</label>
            <input id={`bt-mounted-on-${unit.id}`} value={state.mountedOn} onChange={(event) => { keepState({ ...state, mountedOn: event.target.value }); }} />
          </div>
        </div>
      )}
      {state.mounted !== "none" && (
        <p className="bt-hint">
          <Link to={`${GOTHIC_BASE}/aids#aid-${state.mounted === "mob" ? "mob-locations" : "hobble-locations"}`}>{`The ${state.mounted === "mob" ? "Mob" : "Hobble"} hit locations`}</Link>
        </p>
      )}

      <p className="bt-actions">
        <button type="button" className="bt-button" aria-label={`End phase: ${name}`} onClick={() => { onChange(endPhase(state)); }}>
          End phase
        </button>
        <button type="button" className="bt-button bt-button--secondary" aria-label={`Start over: ${name}`} onClick={() => { onChange(newTracker(stats)); }}>
          Start over
        </button>
        {onAnother && (
          <button type="button" className="bt-button bt-button--secondary" aria-label={`Put another on the table: ${name}`} onClick={onAnother}>
            Put another on the table
          </button>
        )}
        <button type="button" className="bt-button bt-button--secondary" aria-label={`Take off the table: ${name}`} onClick={onRemove}>
          Take off the table
        </button>
      </p>
    </section>
  );
}

export default function TrackerPage() {
  useGothicTheme();
  const [storage, setStorage] = useState<GothicStorage>();
  const [entries, setEntries] = useState<AbomEntry[]>([]);
  const [states, setStates] = useState<Record<string, TrackerState>>({});
  const [catalog, setCatalog] = useState<Catalog>();
  const [loaded, setLoaded] = useState(false);
  const forceId = useSearchParams()[0].get("force");
  /** The force the page was opened from: its name and the saved-unit ids it lists. */
  const [force, setForce] = useState<{ name: string; units: AbominationUnit[] }>();
  const [problem, setProblem] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const savedRef = useRef<HTMLHeadingElement>(null);
  const keepClearRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmingClear) keepClearRef.current?.focus();
  }, [confirmingClear]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await openGothicStorage();
        const list = await s.list();
        const stored = await s.playStates();
        const asked = forceId ? (await s.getForce(forceId))?.force : undefined;
        const onForce = asked ? forceUnits(asked, list) : undefined;
        const next: Record<string, TrackerState> = {};
        for (const unit of onForce ?? withCopies(unitsToChoose(list), Object.keys(stored))) {
          const stats = unitStats(unit);
          if (stats && unit.id in stored) next[unit.id] = trackerWithDefaults(stored[unit.id], stats);
        }
        setStorage(s);
        setForce(asked && onForce ? { name: asked.name.trim() || "Unnamed force", units: onForce } : undefined);
        setEntries(list);
        setStates(next);
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
      setLoaded(true);
      try {
        setCatalog(await loadCatalog());
      } catch {
        // The weapon names wait; the tracker still works from the ids.
      }
    })();
  }, [forceId]);

  const keep = useCallback(
    async (unitId: string, next: TrackerState | undefined) => {
      setStates((all) => {
        const { [unitId]: _old, ...rest } = all;
        void _old;
        return next ? { ...rest, [unitId]: next } : rest;
      });
      if (!storage) return;
      try {
        if (next) await storage.savePlay(unitId, next);
        else await storage.removePlay(unitId);
        setProblem("");
      } catch {
        setProblem(STORAGE_WRITE_FAILED);
      }
    },
    [storage],
  );

  const units = force ? force.units : withCopies(unitsToChoose(entries), Object.keys(states));
  const onTable = units.filter((u) => u.id in states);
  const waiting = units.filter((u) => !(u.id in states));

  /** Puts another of the saved unit on the table (outside a force), under its next copy key. */
  const another = (shown: AbominationUnit) => {
    const baseId = shown.id.replace(/~\d+$/, "");
    const stats = unitStats(shown);
    if (stats) void keep(nextCopyKey(baseId, Object.keys(states)), newTracker(stats));
  };

  const clearTable = async () => {
    setConfirmingClear(false);
    for (const unit of onTable) await keep(unit.id, undefined);
    savedRef.current?.focus();
  };

  return (
    <div className="sr-page">
      <h1>Abomination tracker</h1>
      <GamePicture game="gothic" />
      <p>
        <Link className="bt-back" to={`${GOTHIC_BASE}/home`}>
          <span aria-hidden="true">&larr; </span>BattleTech: Gothic
        </Link>
      </p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. The table lasts until you close this tab.</p>}
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      {loaded && (
        <p className="bt-hint">
          {force ? `Showing the units of ${force.name}, with the table that force keeps. ` : "Showing every saved unit, with the table kept outside any force. A force keeps its own table, so the same unit tracked there starts fresh. "}
          {force && <Link to={`${GOTHIC_BASE}/play`}>Show every saved unit</Link>}
        </p>
      )}
      {onTable.length > 0 && (
        <p>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirmingClear(true); }}>
            Clear the table
          </button>
        </p>
      )}
      {confirmingClear && (
        <div className="bt-confirm" role="group" aria-label="Confirm clear the table" onKeyDown={(event) => { if (event.key === "Escape") setConfirmingClear(false); }}>
          <p>{`Take ${String(onTable.length)} ${onTable.length === 1 ? "unit" : "units"} off the table? Their damage and shots are lost.`}</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => { void clearTable(); }}>
              Clear the table
            </button>
            <button type="button" ref={keepClearRef} className="bt-button bt-button--secondary" onClick={() => { setConfirmingClear(false); }}>
              Keep it
            </button>
          </span>
        </div>
      )}

      <section className="bt-section" aria-labelledby="bt-play-choose">
        <h2 id="bt-play-choose" ref={savedRef} tabIndex={-1}>
          Put a unit on the table
        </h2>
        {!loaded ? (
          <p>Loading your units.</p>
        ) : units.length === 0 ? (
          <p>
            No units saved yet. <Link to={`${GOTHIC_BASE}/abominations`}>Make an Abomination unit</Link> first.
          </p>
        ) : waiting.length === 0 ? (
          <p>Every saved unit is on the table.</p>
        ) : (
          <ul className="bt-list">
            {waiting.map((unit) => {
              const stats = unitStats(unit);
              const name = unitName(unit, stats);
              return (
                <li key={unit.id} className="bt-row">
                  <span className="bt-row__text">
                    <strong>{name}</strong>
                    {stats ? (
                      <span className="bt-row__credit">{`${stats.size?.label ?? stats.classId}, ${String(stats.creatures)} ${stats.creatures === 1 ? "creature" : "creatures"} of ${String(stats.pipsEach)} pips.`}</span>
                    ) : (
                      <span className="bt-row__credit bt-problem">This unit names a type this version does not know, so it cannot be tracked.</span>
                    )}
                  </span>
                  <span className="bt-row__actions">
                    <button type="button" className="bt-button" disabled={!stats || !storage} aria-label={`Put on the table: ${name}`} onClick={() => { if (stats) void keep(unit.id, newTracker(stats)); }}>
                      Put on the table
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {onTable.map((unit) => {
        const stats = unitStats(unit);
        const state = states[unit.id];
        if (!stats || !state) return null;
        return (
          <UnitTracker
            key={unit.id}
            unit={unit}
            stats={stats}
            state={state}
            catalog={catalog}
            onChange={(next) => { void keep(unit.id, next); }}
            {...(force ? {} : { onAnother: () => { another(unit); } })}
            onRemove={() => {
              void keep(unit.id, undefined);
              savedRef.current?.focus();
            }}
          />
        );
      })}
    </div>
  );
}
