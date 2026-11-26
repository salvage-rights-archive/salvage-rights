import { useState } from "react";
import { Link } from "react-router";
import { AS_ATTACK_FLAGS, AS_PHYSICAL_TYPES, AS_RANGE_BRACKETS, AS_UNIT_TYPES, AS_WEAPON_ONLY_FLAGS } from "../../data/alpha-strike";
import type { AsAttackFlag, AsPhysicalType } from "../../data/alpha-strike";
import { odds2d6, targetNumber } from "../../rules/as-attack";
import type { AttackerMove, TargetMove } from "../../rules/as-attack";
import "../classic.scss";
import "./alpha-strike.scss";

const ATTACKER_MOVES: [AttackerMove, string][] = [
  ["standstill", "Stood still"],
  ["ground", "Moved"],
  ["jump", "Jumped"],
  ["immobile", "Immobile"],
  ["sprint", "Sprinted"],
];
const TARGET_MOVES: [TargetMove, string][] = [
  ["ground", "Moved"],
  ["standstill", "Stood still"],
  ["jump", "Jumped"],
  ["immobile", "Immobile"],
];
const FLAGS = Object.keys(AS_ATTACK_FLAGS) as AsAttackFlag[];
const whole = (text: string, min: number, max: number): number => Math.min(max, Math.max(min, Number.parseInt(text, 10) || 0));

/**
 * Play aids for Alpha Strike: the to-hit calculator. It builds the Target Number from the player's answers (each term with its page),
 * the chance of a hit on 2D6, and, from the damage the player types for that range, the damage to expect. Nothing is saved.
 */
export default function AsAidsPage() {
  const [skill, setSkill] = useState("4");
  const [attackerType, setAttackerType] = useState("BM");
  const [attackerMove, setAttackerMove] = useState<AttackerMove>("ground");
  const [distance, setDistance] = useState("8");
  const [targetType, setTargetType] = useState("BM");
  const [targetTmm, setTargetTmm] = useState("2");
  const [targetMove, setTargetMove] = useState<TargetMove>("ground");
  const [heat, setHeat] = useState("0");
  const [fireControl, setFireControl] = useState("0");
  const [physical, setPhysical] = useState<AsPhysicalType | "">("");
  const [flags, setFlags] = useState<AsAttackFlag[]>([]);
  const [extreme, setExtreme] = useState(false);
  const [damage, setDamage] = useState("");

  const result = targetNumber({
    skill: whole(skill, 0, 7),
    attackerType,
    attackerMove,
    distance: whole(distance, 0, 999),
    targetType,
    targetTmm: whole(targetTmm, -4, 9),
    targetMove,
    heat: whole(heat, 0, 4),
    fireControlHits: whole(fireControl, 0, 4),
    flags,
    physical: physical === "" ? undefined : physical,
    extreme,
  });
  const chance = result.blocked ? 0 : odds2d6(result.total);
  const shown = (physical === "" ? FLAGS : FLAGS.filter((f) => !AS_WEAPON_ONLY_FLAGS.includes(f)));
  const damageValue = damage.trim() === "" ? undefined : Number.parseFloat(damage);
  const toggle = (flag: AsAttackFlag, on: boolean) => { setFlags(on ? [...flags, flag] : flags.filter((f) => f !== flag)); };
  const select = (id: string, label: string, value: string, set: (v: string) => void, options: [string, string][]) => (
    <div className="bt-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => { set(event.target.value); }}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
  const number = (id: string, label: string, value: string, set: (v: string) => void, min: number, max: number) => (
    <div className="bt-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(event) => { set(event.target.value); }} />
    </div>
  );
  const types: [string, string][] = AS_UNIT_TYPES.map((t) => [t.code, `${t.name} (${t.code})`]);

  return (
    <div className="sr-page">
      <h1>Alpha Strike play aids</h1>
      <p>
        <Link to="/battletech/alpha-strike/home">Back to the Alpha Strike page</Link>
      </p>

      <section className="bt-section" aria-labelledby="as-tohit">
        <h2 id="as-tohit">To-hit calculator</h2>
        <p className="bt-hint">The Target Number is built from the attacker's Skill and the terms below; each term names its page. Nothing here is saved.</p>
        <div className="as-aids__grid">
          {number("aid-skill", "Attacker Skill (0 to 7)", skill, setSkill, 0, 7)}
          {select("aid-atype", "Attacker type", attackerType, setAttackerType, types)}
          {select("aid-amove", "Attacker movement", attackerMove, (v) => { setAttackerMove(v as AttackerMove); }, ATTACKER_MOVES)}
          {select("aid-phys", "Attack", physical, (v) => { setPhysical(v as AsPhysicalType | ""); }, [["", "Weapon attack"], ...Object.entries(AS_PHYSICAL_TYPES).map(([id, row]): [string, string] => [id, row.label])])}
          {physical === "" && number("aid-dist", "Distance in inches", distance, setDistance, 0, 999)}
          {select("aid-ttype", "Target type", targetType, setTargetType, types)}
          {number("aid-ttmm", "Target TMM now", targetTmm, setTargetTmm, -4, 9)}
          {select("aid-tmove", "Target movement", targetMove, (v) => { setTargetMove(v as TargetMove); }, TARGET_MOVES)}
          {physical === "" && number("aid-heat", "Attacker heat (0 to 4)", heat, setHeat, 0, 4)}
          {physical === "" && number("aid-fc", "Fire control hits", fireControl, setFireControl, 0, 4)}
        </div>
        <fieldset className="as-aids__flags">
          <legend>Terrain and situation</legend>
          {shown.map((flag) => (
            <label key={flag} className="as-aids__flag">
              <input type="checkbox" checked={flags.includes(flag)} onChange={(event) => { toggle(flag, event.target.checked); }} />
              {AS_ATTACK_FLAGS[flag].label}
            </label>
          ))}
          {physical === "" && (
            <label className="as-aids__flag">
              <input type="checkbox" checked={extreme} onChange={(event) => { setExtreme(event.target.checked); }} />
              Extreme range is in play
            </label>
          )}
        </fieldset>

        <div role="status" aria-live="polite" className="as-aids__result">
          {result.blocked ? (
            <p>
              <strong>{result.blocked.id === "sprint" ? "A unit that sprinted cannot attack." : "That distance is out of range."}</strong> {`(${result.blocked.cite})`}
            </p>
          ) : (
            <>
              <p>
                <strong>{`Target Number ${String(result.total)}`}</strong>
                {result.range ? `, ${AS_RANGE_BRACKETS.find((b) => b.id === result.range)?.label.toLowerCase() ?? ""}` : ""}
                {`. Chance to hit ${String(Math.round(chance * 100))}% (${String(Math.round(chance * 36))} in 36).`}
              </p>
              <ul>
                {result.parts.map((p) => (
                  <li key={p.id}>{`${p.label}: ${p.value >= 0 ? "+" : ""}${String(p.value)} (${p.cite})`}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="bt-field">
          <label htmlFor="aid-damage">Damage at this range (from the card)</label>
          <input id="aid-damage" type="number" inputMode="decimal" min={0} step="any" value={damage} onChange={(event) => { setDamage(event.target.value); }} />
        </div>
        {damageValue !== undefined && Number.isFinite(damageValue) && !result.blocked && (
          <p role="status">{`Expected damage ${(chance * damageValue).toFixed(2)} (the chance to hit times ${String(damageValue)}).`}</p>
        )}
      </section>
    </div>
  );
}
