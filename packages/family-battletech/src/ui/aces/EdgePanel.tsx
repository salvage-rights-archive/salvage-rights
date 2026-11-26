// A named pilot's Edge tokens (Aces p. 24): what is left for each, and spending some on an ability from the Edge cards (data/aces-edge.ts),
// offered for the unit's type and the phase at hand with its cost worked out, or on one the player types as "other". The app counts the
// tokens and applies what the tracker holds; where it cannot know the condition, the player confirms. Names typed before come back as
// suggestions on this device.
import { useState } from "react";
import { ACES_EDGE, edgeCite } from "../../data/aces-edge";
import type { AcesGame } from "../../rules/aces-game";
import { allUnits } from "../../rules/aces-turn";
import { edgeLeft, hasPilotEdge, spendEdge } from "../../rules/aces-combat";
import { edgeAbilitiesFor, edgeBlocked, edgeCostOf, edgeNotes, protectable, spendEdgeAbility } from "../../rules/aces-edge";
import { GlossSwitch } from "../as/AsSpecials";
import { useSpecialSettings } from "../as/specialSettings";
import type { Apply } from "./ActivationCard";

const NAMES_KEY = "aces-edge-names";
const OTHER = "other";

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
  const { glosses } = useSpecialSettings();
  const [unitId, setUnitId] = useState("");
  const [pick, setPick] = useState("");
  const [everyPhase, setEveryPhase] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("1");
  const [amount, setAmount] = useState("1");
  const [targetId, setTargetId] = useState("");
  const chosen = pilots.find((u) => u.id === unitId) ?? pilots[0];
  if (pilots.length === 0 || !chosen) return null;

  const offered = edgeAbilitiesFor(chosen.card.type, game.phase, everyPhase);
  const ability = pick === OTHER ? undefined : (offered.find((a) => a.id === pick) ?? offered[0]);
  const isOther = ability === undefined;
  const choiceAmount = Number.parseInt(amount, 10);
  const shield = ability?.id === "protector" ? protectable(game, chosen) : [];
  const choice = { amount: Number.isInteger(choiceAmount) ? choiceAmount : 1, targetId: shield.some((u) => u.id === targetId) ? targetId : shield[0]?.id };
  const n = Number.parseInt(cost, 10);
  const price = ability ? edgeCostOf(ability, chosen.card, choice.amount) : n;
  const blocked = ability ? edgeBlocked(game, chosen, ability, choice) : undefined;
  const otherOk = name.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= edgeLeft(chosen);
  const ok = isOther ? otherOk : blocked === undefined;

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
      <p className="bt-hint">Add a pip is on the attack roll, and a reroll is in the End Phase. Pick an ability from your Edge cards below, or choose Other and type its name.</p>
      <div className="bt-field">
        <label htmlFor="edge-unit">Pilot</label>
        <select id="edge-unit" value={chosen.id} onChange={(e) => { setUnitId(e.target.value); }}>
          {pilots.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="bt-field">
        <label htmlFor="edge-ability">Edge ability</label>
        <select id="edge-ability" value={ability?.id ?? OTHER} onChange={(e) => { setPick(e.target.value); }}>
          {offered.map((a) => (
            <option key={a.id} value={a.id}>{`${a.name} (${a.category})`}</option>
          ))}
          <option value={OTHER}>Other (type the name)</option>
        </select>
      </div>
      <label className="as-aids__flag" htmlFor="edge-every-phase">
        <input id="edge-every-phase" type="checkbox" checked={everyPhase} onChange={(e) => { setEveryPhase(e.target.checked); }} />
        Show abilities for every phase
      </label>
      <GlossSwitch id="edge-glosses" />
      {ability ? (
        <section aria-label={`${ability.name} details`}>
          <p>
            <strong>{ability.name}</strong>
            {` costs ${String(price)} Edge${ability.cost.upTo ? ` (up to ${String(ability.cost.edge)})` : ""}. ${ability.when}.`}
            <span className="bt-hint">{` (${edgeCite(ability)})`}</span>
          </p>
          {glosses ? <p className="bt-hint">{ability.note}</p> : null}
          {ability.cost.upTo ? (
            <div className="bt-field">
              <label htmlFor="edge-amount">Edge to spend</label>
              <input id="edge-amount" type="number" inputMode="numeric" min={1} max={ability.cost.edge} value={amount} onChange={(e) => { setAmount(e.target.value); }} />
            </div>
          ) : null}
          {ability.id === "protector" ? (
            <div className="bt-field">
              <label htmlFor="edge-shield">Friendly unit shielded</label>
              <select id="edge-shield" value={choice.targetId ?? ""} onChange={(e) => { setTargetId(e.target.value); }}>
                {shield.length === 0 ? <option value="">No smaller friendly unit</option> : null}
                {shield.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          <ul className="bt-list">
            {edgeNotes(game, chosen, ability, choice).map((line) => (
              <li key={line} className="bt-hint">{line}</li>
            ))}
          </ul>
          <p className="bt-hint">You confirm the condition on the card; the tracker only checks what it holds.</p>
          {blocked ? <p role="status" className="bt-hint">{blocked}</p> : null}
        </section>
      ) : (
        <>
          <div className="bt-field">
            <label htmlFor="edge-name">Edge ability name</label>
            <input id="edge-name" list="edge-names" value={name} onChange={(e) => { setName(e.target.value); }} />
            <datalist id="edge-names">
              {[...savedNames(), ...ACES_EDGE.map((a) => a.name)].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="bt-field">
            <label htmlFor="edge-cost">Edge tokens it costs</label>
            <input id="edge-cost" type="number" inputMode="numeric" min={1} value={cost} onChange={(e) => { setCost(e.target.value); }} />
          </div>
        </>
      )}
      <button
        type="button"
        className="bt-button"
        disabled={!ok}
        onClick={() => {
          if (ability) {
            apply((g) => spendEdgeAbility(g, chosen.id, ability.id, choice));
            return;
          }
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
