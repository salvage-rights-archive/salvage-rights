// A stacking aid for the Gothic rules reference: the player says which Abomination units share a hex and whether a 'Mech is there, and
// it says whether the stack is legal and how many more of each class still fit. The figures and the rule are `stackCheck`
// (rules/abomination.ts); this component holds none of its own. Text is figures and short words, with the pages.
import { useState } from "react";
import { ABOM_CLASSES, GOTHIC_BOOK, MECH_STACK_REDUCTION } from "../../data/gothic";
import type { AbomClassId, MechInHex } from "../../data/gothic";
import { stackCheck } from "../../rules/abomination";
import type { StackUnit } from "../../rules/abomination";
import { citeText } from "./aidTables";

const MECHS: { id: MechInHex; label: string }[] = [
  { id: "none", label: "No 'Mech" },
  { id: "friendly", label: "A friendly 'Mech" },
  { id: "enemy", label: "An enemy 'Mech" },
];
const label = (id: AbomClassId) => ABOM_CLASSES.find((c) => c.id === id)?.label ?? id;
const whole = (text: string) => Math.max(0, Math.min(9, Math.trunc(Number(text)) || 0));

export default function StackingAid() {
  const [mech, setMech] = useState<MechInHex>("none");
  const [ground, setGround] = useState<Record<AbomClassId, number>>({ swarmer: 0, hulk: 0, giant: 0, titan: 0 });
  const [fliers, setFliers] = useState<{ classId: AbomClassId; height: number }[]>([]);
  const [flier, setFlier] = useState<{ classId: AbomClassId; height: string }>({ classId: "swarmer", height: "1" });

  const units: StackUnit[] = [
    ...ABOM_CLASSES.flatMap((c) => Array.from({ length: ground[c.id] }, () => ({ classId: c.id }))),
    ...fliers.map((f) => ({ classId: f.classId, height: f.height })),
  ];
  const check = stackCheck(units, mech);
  const room = ABOM_CLASSES.filter((c) => (check.room[c.id] ?? 0) > 0).map((c) => `${c.label} ${String(check.room[c.id])}`);
  const over = [...check.overLimit.map((id) => `${label(id)} is over its limit of ${String(check.limits[id])}`), ...(check.overWeight ? [`the units use ${String(check.used)} of ${String(check.capacity)} Swarmer equivalents`] : [])];

  return (
    <section className="bt-section bt-stacking" aria-labelledby="aid-stacking">
      <h2 id="aid-stacking">Stacking aid</h2>
      <p className="bt-hint">Pick the units in one hex and whether a 'Mech is there.</p>
      <fieldset className="bt-field">
        <legend>'Mech in the hex</legend>
        {MECHS.map((m) => (
          <label key={m.id} className="bt-check">
            <input type="radio" name="bt-stack-mech" checked={mech === m.id} onChange={() => { setMech(m.id); }} />{" "}
            {m.id === "none" ? m.label : `${m.label} (${String(MECH_STACK_REDUCTION[m.id])} off)`}
          </label>
        ))}
      </fieldset>
      <div className="bt-grid">
        {ABOM_CLASSES.map((c) => (
          <div key={c.id} className="bt-field">
            <label htmlFor={`bt-stack-${c.id}`}>{`${c.label} units on the ground`}</label>
            <input id={`bt-stack-${c.id}`} type="number" inputMode="numeric" min={0} max={9} value={ground[c.id]} onChange={(event) => { setGround((all) => ({ ...all, [c.id]: whole(event.target.value) })); }} />
          </div>
        ))}
      </div>
      <h3>Flying units</h3>
      <div className="bt-grid">
        <div className="bt-field">
          <label htmlFor="bt-stack-flier-class">Class</label>
          <select id="bt-stack-flier-class" value={flier.classId} onChange={(event) => { setFlier({ ...flier, classId: event.target.value as AbomClassId }); }}>
            {ABOM_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bt-field">
          <label htmlFor="bt-stack-flier-height">Levels above the ground</label>
          <input id="bt-stack-flier-height" type="number" inputMode="numeric" min={1} value={flier.height} onChange={(event) => { setFlier({ ...flier, height: event.target.value }); }} />
        </div>
      </div>
      <p className="bt-actions">
        <button type="button" className="bt-button bt-button--secondary" disabled={!(Number(flier.height) >= 1)} onClick={() => { setFliers((all) => [...all, { classId: flier.classId, height: Math.trunc(Number(flier.height)) }]); }}>
          Add a flying unit
        </button>
      </p>
      {fliers.length > 0 && (
        <ul className="bt-list">
          {fliers.map((f, i) => (
            <li key={i} className="bt-row">
              <span className="bt-row__text">{`${label(f.classId)} flying ${String(f.height)} ${f.height === 1 ? "level" : "levels"} up`}</span>
              <span className="bt-row__actions">
                <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove the ${label(f.classId)} flying ${String(f.height)} up`} onClick={() => { setFliers((all) => all.filter((_, j) => j !== i)); }}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div role="status" className="bt-stacking__result" data-testid="stack-result">
        <p className={check.legal ? undefined : "bt-problem"}>{check.legal ? `Legal: ${String(check.used)} of ${String(check.capacity)} Swarmer equivalents used.` : `Not legal: ${over.join(" and ")}.`}</p>
        <p>{room.length > 0 ? `Room left: ${room.join(", ")}.` : "No room left."}</p>
      </div>
      <p className="bt-hint" data-testid="aid-cite">
        {citeText([
          { book: GOTHIC_BOOK, page: 64 },
          { book: GOTHIC_BOOK, page: 69 },
        ])}
      </p>
    </section>
  );
}
