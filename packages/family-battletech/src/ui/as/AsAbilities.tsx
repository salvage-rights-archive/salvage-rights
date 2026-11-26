// Pilot and command abilities in a force (ASCE steps 6 and 7, p. 112): SPAs per member against the Skill table, SCAs for the force against
// its average Skill, and the officer count. Names and costs come from data/as-abilities.ts; the limits are advice, never a refusal.
import { useState } from "react";
import { AS_SCAS, AS_SPAS } from "../../data/as-abilities";
import { AS_EDITION } from "../../data/alpha-strike";
import { findSpa, forceScas, forceSpas, memberSpas, spaCost, unitAllowsSpa } from "../../rules/as-force";
import type { AsForce, AsMember, ForceTotals } from "../../rules/as-force";
import { unitTitle } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";

/** One member's pilot abilities: those chosen with their cost and page, the points against the Skill limit, and a pick of the rest. */
export function MemberAbilities({ member, unit, index, setMember }: { member: AsMember; unit: AsUnit; index: number; setMember: (patch: Partial<AsMember>) => void }) {
  const [choice, setChoice] = useState("");
  const check = memberSpas(member, unit);
  const taken = new Set(check.picks.map((p) => p.id));
  const options = AS_SPAS.filter((s) => !taken.has(s.id) && unitAllowsSpa(unit, s));
  const id = String(index);
  const write = (picks: typeof check.picks) => setMember({ spas: picks.length === 0 ? undefined : picks });
  return (
    <div className="as-member__spas">
      <strong>Pilot abilities</strong>
      <p className="bt-hint" aria-live="polite">{`${String(check.count)} of ${String(check.limit.count)} abilities, ${String(check.points)} of ${String(check.limit.points)} points at Skill ${String(member.skill)}.`}</p>
      {check.picks.length > 0 && (
        <ul className="as-spa-list">
          {check.picks.map((pick) => {
            const spa = findSpa(pick.id);
            if (!spa) return <li key={pick.id}>{`${pick.id} (not in our list)`}</li>;
            return (
              <li key={pick.id}>
                <span>{`${spa.name}, ${String(spaCost(spa, pick))} ${spaCost(spa, pick) === 1 ? "point" : "points"}, p. ${String(spa.page)}${spa.cond ? ` (${spa.cond} only: your call)` : ""}`}</span>
                {typeof spa.cost !== "number" && (
                  <span className="bt-field">
                    <label htmlFor={`as-spa-pts-${id}-${spa.id}`}>{`${spa.name} points for ${unitTitle(unit) || "this unit"}`}</label>
                    <input
                      id={`as-spa-pts-${id}-${spa.id}`}
                      type="number"
                      min={spa.cost[0]}
                      max={spa.cost[1]}
                      value={spaCost(spa, pick)}
                      onChange={(e) => { write(check.picks.map((p) => (p.id === pick.id ? { ...p, points: Number(e.target.value) } : p))); }}
                    />
                  </span>
                )}
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${spa.name} from ${unitTitle(unit) || "this unit"}`} onClick={() => { write(check.picks.filter((p) => p.id !== pick.id)); }}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="bt-field">
        <label htmlFor={`as-spa-add-${id}`}>Add a pilot ability</label>
        <select id={`as-spa-add-${id}`} aria-label={`Add a pilot ability for ${unitTitle(unit) || "this unit"}`} value={choice} onChange={(e) => { setChoice(e.target.value); }}>
          <option value="">Choose an ability</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>{`${s.name} (${typeof s.cost === "number" ? String(s.cost) : `${String(s.cost[0])}-${String(s.cost[1])}`})`}</option>
          ))}
        </select>
        <button type="button" className="bt-button" aria-label={`Add ability for ${unitTitle(unit) || "this unit"}`} disabled={choice === ""} onClick={() => { write([...check.picks, { id: choice }]); setChoice(""); }}>
          Add ability
        </button>
      </div>
      {check.problems.map((text) => (
        <p key={text} role="note" className="bt-hint as-advice">{text}</p>
      ))}
    </div>
  );
}

/** Step 6 for the whole force: how many units hold pilot abilities against the one per 12 the book allows (pp. 92 and 112). */
export function PilotAbilitiesNote({ force, totals }: { force: AsForce; totals: ForceTotals }) {
  const check = forceSpas(force, totals);
  return (
    <section className="bt-section" aria-labelledby="as-force-pilot-abilities">
      <h2 id="as-force-pilot-abilities">Pilot abilities in the force</h2>
      <p className="bt-hint">{`Step 6 of force building, ${AS_EDITION.name} pp. 92-101 and p. 112. Give abilities in each unit's row above: the Skill sets how many and how many points, and not more than one unit in 12 should hold any.`}</p>
      <p>{`${String(check.holders)} of ${String(totals.count)} units hold pilot abilities; ${String(check.allowed)} allowed.`}</p>
      {check.problems.map((text) => (
        <p key={text} role="note" className="bt-hint as-advice">{text}</p>
      ))}
    </section>
  );
}

/** The force's command abilities: the average Skill and what it allows, the ones chosen, the officer count, and the list to choose from. */
export function CommandSection({ force, totals, change }: { force: AsForce; totals: ForceTotals; change: (next: AsForce, message?: string) => Promise<void> }) {
  const check = forceScas(force, totals);
  const chosen = new Set(check.chosen.map((s) => s.id));
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...chosen, id] : [...chosen].filter((c) => c !== id);
    void change({ ...force, commands: next });
  };
  return (
    <section className="bt-section" aria-labelledby="as-force-commands">
      <h2 id="as-force-commands">Command abilities</h2>
      <p className="bt-hint">{`Step 7 of force building, ${AS_EDITION.name} pp. 102-109 and p. 112. The average Skill sets how many the force may take; name one officer as the force commander and at most one officer for every 6 units.`}</p>
      <p>
        {check.average === undefined ? "Add units to see the average Skill." : `Average Skill ${String(check.average)}: ${String(check.allowed)} ${check.allowed === 1 ? "ability" : "abilities"} allowed, ${String(check.chosen.length)} chosen. Officers named: ${String(check.officers)} of ${String(check.officersAllowed)} allowed.`}
      </p>
      {check.chosen.length > 0 && <p>{`Chosen: ${check.chosen.map((s) => `${s.name} (p. ${String(s.page)})`).join(", ")}.`}</p>}
      {check.problems.map((text) => (
        <p key={text} role="note" className="bt-hint as-advice">{text}</p>
      ))}
      <details>
        <summary>Choose command abilities</summary>
        <ul className="as-aids__flags">
          {AS_SCAS.map((s) => (
            <li key={s.id}>
              <label className="as-aids__flag" htmlFor={`as-sca-${s.id}`}>
                <input id={`as-sca-${s.id}`} type="checkbox" checked={chosen.has(s.id)} onChange={(e) => { toggle(s.id, e.target.checked); }} />
                {`${s.name}, p. ${String(s.page)}`}
              </label>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
