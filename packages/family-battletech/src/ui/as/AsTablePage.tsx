import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { AS_PLAY_CITES } from "../../data/alpha-strike";
import type { AsForce } from "../../rules/as-force";
import { endTurn, fitTable, isTable, newTable } from "../../rules/as-table";
import type { TableState } from "../../rules/as-table";
import { newAsUnit, unitTitle } from "../../rules/as-unit";
import type { AsCard, AsUnit } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import AsTableUnit from "./AsTableUnit";
import { openAsStorage } from "./storage";
import { useWakeLock } from "./useWakeLock";

const HOME = "/battletech/alpha-strike/home";
const KEY = (forceId: string) => `as-table:${forceId}`;
const MAX_UNDO = 20;
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
  const awake = useWakeLock();

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
      <p>
        <label className="bt-check" htmlFor="as-table-awake">
          <input id="as-table-awake" type="checkbox" checked={awake.on} onChange={(event) => { awake.set(event.target.checked); }} /> Keep the screen on
        </label>
      </p>
      {awake.on && !awake.supported && <p className="bt-hint">This browser cannot keep the screen on for us.</p>}
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
              <li key={i}>{`${units[l.index] ? unitTitle(units[l.index] as AsUnit) : "A unit"}: ${l.event.text}${l.event.cite ? ` (${l.event.cite})` : ""}`}</li>
            ))}
          </ul>
        </section>
      )}
      <ul className="as-table__list">
        {force.members.map((member, i) => {
          const unit = units[i];
          return unit ? (
            <AsTableUnit key={i} index={i} unit={unit} member={member} table={table} change={change} />
          ) : (
            <li key={i} className="as-table__unit">
              This unit is no longer in your roster.
            </li>
          );
        })}
      </ul>
    </div>
  );
}
