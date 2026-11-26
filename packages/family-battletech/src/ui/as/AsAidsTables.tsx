// The reference sections of the Alpha Strike aids page: turn sequence, ranges, heat, criticals and movement. Each shows our own short
// words and figures with the page they were read from; the rules level decides whether the optional rules appear.
import {
  AS_CRIT_COLUMNS, AS_CRIT_EFFECTS, AS_CRIT_TRIGGERS, AS_HEAT, AS_HEAT_NOTES, AS_HEAT_SCALE_CITE, AS_HEAT_STEPS, AS_LEVEL_CHANGES, AS_LEVEL_LIMITS, AS_MOTIVE_CITE,
  AS_MOTIVE_MODIFIER, AS_MOTIVE_RESULTS, AS_MOVE_CITE, AS_MOVE_COSTS, AS_MOVE_TYPES, AS_RANGE_ROWS, AS_TURN_STEPS, AS_CRIT_TABLES, asceCite,
} from "../../data/alpha-strike";
import type { RulesLevel } from "../../data/chassis";
import { heatEffect, offersOptional } from "../../rules/as-aids";

const sign = (n: number) => (n >= 0 ? `+${String(n)}` : String(n));

export function TurnAid() {
  return (
    <section className="bt-section" aria-labelledby="as-turn">
      <h2 id="as-turn">Turn sequence</h2>
      <p className="bt-hint">A turn has four phases, taken in this order and repeated until a side meets its victory conditions.</p>
      <ol className="bt-list as-aids__steps">
        {AS_TURN_STEPS.map((step) => (
          <li key={step.id}>
            <strong>{step.name}</strong>
            <span className="as-specials__page">{` ${step.cite}`}</span>
            <ul>
              {step.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RangesAid({ level }: { level: RulesLevel }) {
  const rows = AS_RANGE_ROWS.filter((r) => !r.optional || offersOptional(level));
  return (
    <section className="bt-section" aria-labelledby="as-ranges">
      <h2 id="as-ranges">Ranges</h2>
      <p className="bt-hint">{`Measure from base edge to base edge. A dash on the card at a range means no weapon attack there. Underwater, halve every distance (${asceCite(43)}). Non-infantry units make no weapon attacks in base contact.`}</p>
      <ul className="bt-list as-aids__rows">
        {rows.map((r) => (
          <li key={r.id}>
            <strong>{r.label}</strong>
            {r.to === undefined ? `, past ${String(r.from)}" to the board edge` : `, ${r.from === 0 ? "up to" : `past ${String(r.from)}" to`} ${String(r.to)}"`}
            {`: ${sign(r.modifier)} to the Target Number.`}
            {r.damage ? ` Damage is ${r.damage}.` : ""}
            <span className="as-specials__page">{` ${r.cite}`}</span>
          </li>
        ))}
      </ul>
      {offersOptional(level) && <p className="bt-hint">Extreme and Horizon are optional ranges: only a unit with Long damage may use them, and no Overheat unless it has OVL.</p>}
    </section>
  );
}

export function HeatAid() {
  return (
    <section className="bt-section" aria-labelledby="as-heat">
      <h2 id="as-heat">Heat</h2>
      <p className="bt-hint">{`The scale runs 0 to ${String(AS_HEAT.max)}, and a unit that is jumping loses no Move or TMM. ${AS_HEAT_SCALE_CITE}.`}</p>
      <ul className="bt-list as-aids__rows">
        {[0, 1, 2, 3, 4].map((n) => {
          const e = heatEffect(n);
          return (
            <li key={n}>
              <strong>{e.shutdown ? "Level 4 (S)" : `Level ${String(n)}`}</strong>
              {e.shutdown ? ": shut down." : `: ${sign(e.attack)} to weapon attacks, -${String(e.moveLoss)}" Move${e.tmmLoss ? `, -${String(e.tmmLoss)} TMM` : ""}.`}
            </li>
          );
        })}
      </ul>
      <h3>End Phase order</h3>
      <ol className="as-aids__steps">
        {AS_HEAT_STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <ul className="bt-list as-aids__rows">
        {AS_HEAT_NOTES.map((n) => (
          <li key={n.text}>
            {n.text}
            <span className="as-specials__page">{` ${n.cite}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CriticalsAid() {
  const result = (table: (typeof AS_CRIT_COLUMNS)[number]["id"], index: number) => AS_CRIT_EFFECTS[AS_CRIT_TABLES[table][index] ?? "none"].label;
  const kinds = Object.entries(AS_CRIT_EFFECTS).filter(([kind]) => kind !== "none");
  return (
    <section className="bt-section" aria-labelledby="as-crits">
      <h2 id="as-crits">Critical hits</h2>
      <p className="bt-hint">{`Roll 2D6 on the column for the unit's type. An IndustrialMech rolls twice and takes both. ${asceCite("49-50")}.`}</p>
      <table className="as-aids__table">
        <caption className="as-aids__caption">Critical result by 2D6</caption>
        <thead>
          <tr>
            <th scope="col">2D6</th>
            {AS_CRIT_COLUMNS.map((c) => (
              <th key={c.id} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 11 }, (_, i) => (
            <tr key={i}>
              <th scope="row">{i + 2}</th>
              {AS_CRIT_COLUMNS.map((c) => (
                <td key={c.id}>{result(c.id, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h3>When to roll</h3>
      <ul className="as-aids__steps">
        {AS_CRIT_TRIGGERS.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3>What each result does</h3>
      <ul className="bt-list as-aids__rows">
        {kinds.map(([kind, e]) => (
          <li key={kind}>
            <strong>{e.label}</strong>
            {`: ${e.effect}`}
            <span className="as-specials__page">{` ${e.cite}`}</span>
          </li>
        ))}
      </ul>
      <h3>Vehicle motive damage</h3>
      <p className="bt-hint">{`Roll 2D6 each time a vehicle is damaged, adding: ${Object.entries(AS_MOTIVE_MODIFIER).filter(([, m]) => m > 0).map(([code, m]) => `${code} +${String(m)}`).join(", ")} (others +0). ${AS_MOTIVE_CITE}.`}</p>
      <ul className="as-aids__steps">
        {AS_MOTIVE_RESULTS.map((r) => (
          <li key={r.rolls}>{`${r.rolls}: ${r.effect}`}</li>
        ))}
      </ul>
    </section>
  );
}

export function MovementAid() {
  return (
    <section className="bt-section" aria-labelledby="as-move">
      <h2 id="as-move">Movement costs</h2>
      <p className="bt-hint">{`Extra Move per inch of the terrain, and the movement letters or unit types that may not enter it. A unit pays for a full inch to enter a new terrain type. ${AS_MOVE_CITE}.`}</p>
      <ul className="bt-list as-aids__rows">
        {AS_MOVE_COSTS.map((r) => (
          <li key={r.terrain}>
            <strong>{r.terrain}</strong>
            {`: ${r.cost}. Not for: ${r.barred}.`}
            {r.note ? ` ${r.note}` : ""}
          </li>
        ))}
      </ul>
      <h3>Level changes</h3>
      <ul className="as-aids__steps">
        {AS_LEVEL_CHANGES.map((c) => (
          <li key={c.who}>{`${c.who}: ${c.cost} per 1" up or down`}</li>
        ))}
        <li>{`Largest step: ${String(AS_LEVEL_LIMITS.mech)}" for 'Mechs, ${String(AS_LEVEL_LIMITS.others)}" for infantry, ground vehicles, ProtoMechs and WiGEs (${AS_LEVEL_LIMITS.cite}).`}</li>
      </ul>
      <h3>Movement letters</h3>
      <p className="as-aids__codes">{AS_MOVE_TYPES.map(([code, name]) => `${code} ${name}`).join("; ")}</p>
    </section>
  );
}
