// One side of the new-game form: pick a saved force or single roster units, set each unit's Skill, and choose the Aces deck of each
// automated unit from the decks the player has recorded. Emplacements get no deck (Aces p. 31).
import { useState } from "react";
import { AS_SKILL_NAMES, SKILLS } from "../../data/alpha-strike";
import { clampSkill, skillAdjustedPv } from "../../rules/as-force";
import type { AsForce } from "../../rules/as-force";
import { isEmplacement, defaultDeck, unitFromRoster, unitsFromForce } from "../../rules/aces-game";
import type { SetupUnit } from "../../rules/aces-game";
import type { AsUnit } from "../../rules/as-unit";

export type Row = SetupUnit & { key: string; pv: number };

let counter = 0;
export const newRow = (unit: SetupUnit): Row => ({ ...unit, key: `row-${String((counter += 1))}`, pv: unit.pv ?? skillAdjustedPv(unit.card.pv, unit.skill) });

export interface SideState {
  forceId?: string;
  rows: Row[];
  commander?: number;
}

interface Props {
  id: string;
  title: string;
  /** The automated force plays by decks; on the player side only units ticked as allies do (p. 38). */
  automated: boolean;
  state: SideState;
  onChange: (next: SideState) => void;
  forces: AsForce[];
  roster: Map<string, AsUnit>;
  recorded: string[];
}

export default function GameSideEditor({ id, title, automated, state, onChange, forces, roster, recorded }: Props) {
  const [forceChoice, setForceChoice] = useState("");
  const [unitChoice, setUnitChoice] = useState("");
  const setRow = (key: string, patch: Partial<Row>) => {
    onChange({ ...state, rows: state.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  };
  const total = state.rows.reduce((sum, r) => sum + r.pv, 0);

  const useForce = () => {
    const force = forces.find((f) => f.id === forceChoice);
    if (!force) return;
    onChange({ forceId: force.id, rows: unitsFromForce(force, roster).map(newRow) });
  };
  const addUnit = () => {
    const unit = roster.get(unitChoice);
    if (!unit) return;
    onChange({ ...state, rows: [...state.rows, newRow(unitFromRoster(unit))] });
    setUnitChoice("");
  };
  const remove = (index: number) => {
    const commander = state.commander === undefined ? undefined : state.commander === index ? undefined : state.commander > index ? state.commander - 1 : state.commander;
    onChange({ ...state, rows: state.rows.filter((_, i) => i !== index), ...(commander === undefined ? { commander: undefined } : { commander }) });
  };

  return (
    <section className="bt-section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {forces.length > 0 && (
        <div className="bt-field">
          <label htmlFor={`${id}-force`}>{`Saved force for ${title.toLowerCase()}`}</label>
          <select id={`${id}-force`} value={forceChoice} onChange={(e) => { setForceChoice(e.target.value); }}>
            <option value="">Choose a force</option>
            {forces.map((f) => (
              <option key={f.id} value={f.id}>{`${f.name} (${String(f.members.length)} units)`}</option>
            ))}
          </select>
          <button type="button" className="bt-button bt-button--secondary" disabled={forceChoice === ""} onClick={useForce}>
            {`Use this force for ${title.toLowerCase()}`}
          </button>
        </div>
      )}
      {roster.size > 0 ? (
        <div className="bt-field">
          <label htmlFor={`${id}-unit`}>{`Add a unit to ${title.toLowerCase()}`}</label>
          <select id={`${id}-unit`} value={unitChoice} onChange={(e) => { setUnitChoice(e.target.value); }}>
            <option value="">Choose a unit</option>
            {[...roster.values()].map((u) => (
              <option key={u.id} value={u.id}>{`${`${u.name.chassis} ${u.name.model}`.trim() || "Unnamed unit"} (PV ${String(u.card.pv)})`}</option>
            ))}
          </select>
          <button type="button" className="bt-button" disabled={unitChoice === ""} onClick={addUnit}>
            {`Add to ${title.toLowerCase()}`}
          </button>
        </div>
      ) : (
        <p>Your roster is empty. Add units on the Alpha Strike page first.</p>
      )}
      {state.rows.length === 0 ? (
        <p>No units yet.</p>
      ) : (
        <>
          <ul className="bt-list">
            {state.rows.map((row, index) => {
              const emplacement = isEmplacement(row.card);
              const decked = automated || row.automated === true;
              const fallback = defaultDeck(row.card, recorded);
              const defaultWords = fallback.key ?? (fallback.status === "none" ? "none" : "choose one");
              return (
                <li key={row.key} className="bt-row aces-unit">
                  <span className="bt-row__text">
                    <strong>{row.name}</strong>
                    {` ${row.card.type}, PV ${String(row.pv)}`}
                  </span>
                  <div className="bt-field">
                    <label htmlFor={`${row.key}-skill`}>{`Skill of ${row.name}`}</label>
                    <select
                      id={`${row.key}-skill`}
                      value={clampSkill(row.skill)}
                      onChange={(e) => { setRow(row.key, { skill: Number(e.target.value), pv: skillAdjustedPv(row.card.pv, Number(e.target.value)) }); }}
                    >
                      {SKILLS.map((s) => (
                        <option key={s} value={s}>{`${String(s)}, ${AS_SKILL_NAMES[s] ?? ""}`}</option>
                      ))}
                    </select>
                  </div>
                  {!automated && !emplacement && (
                    <label className="bt-check" htmlFor={`${row.key}-ally`}>
                      <input id={`${row.key}-ally`} type="checkbox" checked={row.automated === true} onChange={(e) => { setRow(row.key, { automated: e.target.checked }); }} />
                      {`${row.name} is an automated ally`}
                    </label>
                  )}
                  {emplacement ? (
                    <p className="bt-hint">An emplacement does not move, so it gets no deck.</p>
                  ) : (
                    decked && (
                      <div className="bt-field">
                        <label htmlFor={`${row.key}-deck`}>{`Aces deck of ${row.name}`}</label>
                        <select
                          id={`${row.key}-deck`}
                          value={row.deck === undefined ? "" : (row.deck ?? "none")}
                          onChange={(e) => { setRow(row.key, { deck: e.target.value === "" ? undefined : e.target.value === "none" ? null : e.target.value }); }}
                        >
                          <option value="">{`Usual deck (${defaultWords})`}</option>
                          {recorded.map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                          <option value="none">No deck</option>
                        </select>
                      </div>
                    )
                  )}
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${row.name}`} onClick={() => { remove(index); }}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="bt-field">
            <label htmlFor={`${id}-commander`}>{`Force commander of ${title.toLowerCase()}`}</label>
            <select id={`${id}-commander`} value={state.commander === undefined ? "" : String(state.commander)} onChange={(e) => { onChange({ ...state, commander: e.target.value === "" ? undefined : Number(e.target.value) }); }}>
              <option value="">Not chosen</option>
              {state.rows.map((r, i) => (
                <option key={r.key} value={i}>{r.name}</option>
              ))}
            </select>
          </div>
          <p role="status">{`${title}: ${String(state.rows.length)} ${state.rows.length === 1 ? "unit" : "units"}, ${String(total)} PV.`}</p>
        </>
      )}
    </section>
  );
}
