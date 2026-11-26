// A named pilot's Edge tokens (Aces p. 24): what is left for each, and spending some on an ability whose name the player types from
// their own card. The app counts the tokens; the player decides. Names typed before come back as suggestions on this device.
import { useState } from "react";
import type { AcesGame } from "../../rules/aces-game";
import { allUnits } from "../../rules/aces-turn";
import { edgeLeft, hasPilotEdge, spendEdge } from "../../rules/aces-combat";
import type { Apply } from "./ActivationCard";

const NAMES_KEY = "aces-edge-names";

function savedNames(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NAMES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}

function rememberName(name: string): void {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify([name, ...savedNames().filter((n) => n !== name)].slice(0, 30)));
  } catch {
    // The suggestions simply are not kept.
  }
}

export default function EdgePanel({ game, apply }: { game: AcesGame; apply: Apply }) {
  const pilots = allUnits(game).filter((u) => hasPilotEdge(u) && !u.play.destroyed);
  const [unitId, setUnitId] = useState("");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("1");
  const chosen = pilots.find((u) => u.id === unitId) ?? pilots[0];
  const n = Number.parseInt(cost, 10);
  if (pilots.length === 0) return null;
  const ok = chosen !== undefined && name.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= edgeLeft(chosen);

  return (
    <details className="bt-section aces-edge">
      <summary className="aces-summary">Edge tokens</summary>
      <ul className="bt-list">
        {pilots.map((u) => (
          <li key={u.id} className="bt-row">
            <span className="bt-row__text">
              <strong>{u.name}</strong>
              {u.pilot ? <span className="bt-row__credit">{u.pilot}</span> : null}
            </span>
            <span>{`${String(edgeLeft(u))} Edge left`}</span>
          </li>
        ))}
      </ul>
      <p className="bt-hint">Add a pip is on the attack roll, and a reroll is in the End Phase. For an ability, type its name from your own card.</p>
      <div className="bt-field">
        <label htmlFor="edge-unit">Pilot</label>
        <select id="edge-unit" value={chosen?.id ?? ""} onChange={(e) => { setUnitId(e.target.value); }}>
          {pilots.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="bt-field">
        <label htmlFor="edge-name">Edge ability name</label>
        <input id="edge-name" list="edge-names" value={name} onChange={(e) => { setName(e.target.value); }} />
        <datalist id="edge-names">
          {savedNames().map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div className="bt-field">
        <label htmlFor="edge-cost">Edge tokens it costs</label>
        <input id="edge-cost" type="number" inputMode="numeric" min={1} value={cost} onChange={(e) => { setCost(e.target.value); }} />
      </div>
      <button
        type="button"
        className="bt-button"
        disabled={!ok}
        onClick={() => {
          if (!chosen) return;
          rememberName(name.trim());
          apply((g) => spendEdge(g, chosen.id, n, `use the ability ${name.trim()}`));
          setName("");
        }}
      >
        Spend the Edge
      </button>
    </details>
  );
}
