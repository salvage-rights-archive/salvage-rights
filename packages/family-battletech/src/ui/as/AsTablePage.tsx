import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { AS_PLAY_CITES } from "../../data/alpha-strike";
import type { CritKind } from "../../data/alpha-strike";
import { applyCrit, crippled, currentDamage, currentMove, currentTmm, fireControlModifier, recordMove, tracksHeat } from "../../rules/as-play";
import type { MoveMode } from "../../rules/as-play";
import { skillAdjustedPv } from "../../rules/as-force";
import type { AsForce } from "../../rules/as-force";
import { endTurn, fitTable, isTable, newTable, setPlay, setUnit, stageHit, unstageHit } from "../../rules/as-table";
import type { TableState } from "../../rules/as-table";
import { formatDamage, formatMove, newAsUnit, unitTitle } from "../../rules/as-unit";
import type { AsCard, AsUnit } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { openAsStorage } from "./storage";
import "../classic.scss";
import "./alpha-strike.scss";

const HOME = "/battletech/alpha-strike/home";
const KEY = (forceId: string) => `as-table:${forceId}`;
const MAX_UNDO = 20;
const CRITS: [CritKind, string][] = [
  ["weapon", "Weapon hit"],
  ["fire-control", "Fire control hit"],
  ["mp", "Movement hit"],
  ["engine", "Engine hit"],
];
const MOVES: [MoveMode, string][] = [
  ["standstill", "Stood still"],
  ["ground", "Moved"],
  ["jump", "Jumped"],
];
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const roll2d6 = () => rollDie() + rollDie();

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing" }
  | { state: "ready"; store: Store; force: AsForce; units: (AsUnit | undefined)[]; table: TableState };

export default function AsTablePage() {
  const id = useSearchParams()[0].get("force") ?? "";
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const storage = await openAsStorage();
        const store = await openStore("battletech");
        const entry = id ? await storage.getForce(id) : undefined;
        if (!entry?.force) {
          if (live) setLoaded({ state: "missing" });
          return;
        }
        const roster = new Map((await storage.list()).flatMap((e) => (e.unit ? [[e.id, e.unit] as const] : [])));
        const units = entry.force.members.map((m) => roster.get(m.unitId));
        const cards = units.map((u) => u?.card ?? newAsUnit("x").card);
        const saved = await store.get<unknown>(KEY(id));
        const table = isTable(saved) ? fitTable(saved, cards) : newTable(id, cards);
        if (live) setLoaded({ state: "ready", store, force: entry.force, units, table });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loaded.state === "ready") return <Table key={loaded.force.id} {...loaded} />;
  return (
    <div className="sr-page">
      <h1>Table</h1>
      {loaded.state === "loading" ? <p role="status">Loading.</p> : <p role="alert">{loaded.state === "failed" ? STORAGE_READ_FAILED : "That force is not saved on this device."}</p>}
      <p>
        <Link to={HOME}>Back to Alpha Strike</Link>
      </p>
    </div>
  );
}

function Table({ store, force, units, table: initial }: { store: Store; force: AsForce; units: (AsUnit | undefined)[]; table: TableState }) {
  const [table, setTable] = useState(initial);
  const [undo, setUndo] = useState<TableState[]>([]);
  const [problem, setProblem] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const [hitText, setHitText] = useState<Record<number, string>>({});
  const [crit, setCrit] = useState<Record<number, CritKind>>({});

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const cards: AsCard[] = units.map((u) => u?.card ?? newAsUnit("x").card);
  const change = (next: TableState, remember = true) => {
    if (remember) setUndo((past) => [...past.slice(-(MAX_UNDO - 1)), table]);
    setTable(next);
    store.set(KEY(force.id), next).then(
      () => { setProblem(""); },
      () => { setProblem(STORAGE_WRITE_FAILED); },
    );
  };
  const undoLast = () => {
    const previous = undo[undo.length - 1];
    if (!previous) return;
    setUndo(undo.slice(0, -1));
    change(previous, false);
  };

  return (
    <div className="sr-page as-table">
      <header className="as-unit__header">
        <p>
          <Link className="bt-back" to={HOME}>
            Back to Alpha Strike
          </Link>
        </p>
        <h1>{`${force.name.trim() || "Force"}: turn ${String(table.turn)}`}</h1>
      </header>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <p className="bt-hint">{`Damage and heat wait until you end the turn (${AS_PLAY_CITES.critical.book}, p. 49 and pp. 52-53); everything is saved as you go.`}</p>
      <p className="bt-row__actions">
        <button type="button" className="bt-button" onClick={() => { change(endTurn(table, cards, roll2d6)); }}>
          End the turn
        </button>
        <button type="button" className="bt-button bt-button--secondary" disabled={undo.length === 0} onClick={undoLast}>
          Undo
        </button>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirming(true); }}>
          Reset game
        </button>
      </p>
      {confirming && (
        <div className="bt-confirm" role="group" aria-label="Confirm reset" onKeyDown={(event) => { if (event.key === "Escape") setConfirming(false); }}>
          <p>Start the game over from turn 1? Every unit goes back to full armor and structure.</p>
          <span className="bt-row__actions">
            <button type="button" className="bt-button" onClick={() => { setConfirming(false); setUndo([]); change(newTable(force.id, cards), false); }}>
              Reset
            </button>
            <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(false); }}>
              Keep playing
            </button>
          </span>
        </div>
      )}
      {table.last.length > 0 && (
        <section className="bt-section" aria-labelledby="as-table-last">
          <h2 id="as-table-last">What the last End Phase did</h2>
          <ul>
            {table.last.map((l, i) => (
              <li key={i}>{`${units[l.index] ? unitTitle(units[l.index] as AsUnit) : "A unit"}: ${l.event.text} (${l.event.cite})`}</li>
            ))}
          </ul>
        </section>
      )}
      <ul className="as-table__list">
        {force.members.map((member, i) => {
          const unit = units[i];
          const entry = table.units[i];
          if (!unit || !entry) {
            return (
              <li key={i} className="as-table__unit">
                This unit is no longer in your roster.
              </li>
            );
          }
          const play = entry.play;
          const card = unit.card;
          const dmg = currentDamage(play, card);
          const tmm = currentTmm(play, card);
          const status = play.destroyed ? "Destroyed" : play.escaped ? "Left the table" : play.shutdown ? "Shut down" : crippled(play, card, "asce") ? "Crippled" : "";
          const staged = play.staged.map((h) => h.damage);
          const stagedTotal = staged.reduce((a, b) => a + b, 0);
          return (
            <li key={i} className={`as-table__unit${play.destroyed ? " as-table__unit--down" : ""}`}>
              <h2>{`${unitTitle(unit) || "Unnamed unit"}${member.pilot ? `, ${member.pilot}` : ""}`}</h2>
              <p>{`Skill ${String(member.skill)}, PV ${String(skillAdjustedPv(card.pv, member.skill))}${status ? `. ${status}` : ""}`}</p>
              <dl className="as-card__grid">
                {[
                  ["Armor", `${String(play.armor)} of ${String(card.armor)}`],
                  ["Structure", `${String(play.structure)} of ${String(card.structure)}`],
                  ...(tracksHeat(card) ? [["Heat", String(play.heat)]] : []),
                  ["Move", formatMove(currentMove(play, card)) || "-"],
                  ["TMM", tmm === null ? "-" : String(tmm)],
                  ["Damage S/M/L", `${formatDamage(dmg.s)}/${formatDamage(dmg.m)}/${formatDamage(dmg.l)}`],
                  ...(play.crits.fireControl > 0 ? [["Fire control", `+${String(fireControlModifier(play))} to hit`]] : []),
                  ...(play.moved ? [["Target TMM this turn", String(play.moved.tmm)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="as-card__cell">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {!play.destroyed && !play.escaped && (
                <fieldset className="as-table__controls">
                  <legend>{`Orders for ${unitTitle(unit) || "this unit"}`}</legend>
                  <div className="bt-field">
                    <label htmlFor={`hit-${String(i)}`}>Damage taken</label>
                    <input id={`hit-${String(i)}`} type="number" inputMode="numeric" min={1} value={hitText[i] ?? ""} onChange={(event) => { setHitText({ ...hitText, [i]: event.target.value }); }} />
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      disabled={!(Number.parseInt(hitText[i] ?? "", 10) > 0)}
                      onClick={() => {
                        change(stageHit(table, i, { damage: Number.parseInt(hitText[i] ?? "", 10) }));
                        setHitText({ ...hitText, [i]: "" });
                      }}
                    >
                      Stage the hit
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" disabled={staged.length === 0} onClick={() => { change(unstageHit(table, i)); }}>
                      Take back the last hit
                    </button>
                  </div>
                  {staged.length > 0 && <p role="status">{`Waiting for the End Phase: ${staged.join(" + ")} = ${String(stagedTotal)}.`}</p>}
                  <div className="bt-field">
                    <label htmlFor={`move-${String(i)}`}>This turn it</label>
                    <select
                      id={`move-${String(i)}`}
                      value={play.moved?.mode ?? ""}
                      onChange={(event) => { if (event.target.value) change(setPlay(table, i, recordMove(play, card, event.target.value as MoveMode))); }}
                    >
                      <option value="">Has not moved yet</option>
                      {MOVES.map(([v, text]) => (
                        <option key={v} value={v}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </div>
                  {tracksHeat(card) && (
                    <div className="bt-field">
                      <label>
                        <input type="checkbox" checked={entry.attacked} onChange={(event) => { change(setUnit(table, i, { attacked: event.target.checked })); }} /> Made a weapon attack this turn
                      </label>
                      <label htmlFor={`ov-${String(i)}`}>{`Overheat used (up to ${String(card.ov)})`}</label>
                      <input id={`ov-${String(i)}`} type="number" inputMode="numeric" min={0} max={card.ov} value={entry.overheat} onChange={(event) => { change(setUnit(table, i, { overheat: Math.min(card.ov, Math.max(0, Number.parseInt(event.target.value, 10) || 0)) })); }} />
                    </div>
                  )}
                  <div className="bt-field">
                    <label htmlFor={`crit-${String(i)}`}>Critical hit rolled by hand</label>
                    <select id={`crit-${String(i)}`} value={crit[i] ?? "weapon"} onChange={(event) => { setCrit({ ...crit, [i]: event.target.value as CritKind }); }}>
                      {CRITS.map(([v, text]) => (
                        <option key={v} value={v}>
                          {text}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="bt-button bt-button--secondary" onClick={() => { change(setPlay(table, i, applyCrit(play, card, crit[i] ?? "weapon").state)); }}>
                      Apply it
                    </button>
                  </div>
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
