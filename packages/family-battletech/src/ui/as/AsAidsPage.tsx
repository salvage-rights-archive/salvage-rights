import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AS_ATTACK_FLAGS, AS_PHYSICAL_TYPES, AS_RANGE_BRACKETS, AS_UNIT_TYPES, AS_WEAPON_ONLY_FLAGS } from "../../data/alpha-strike";
import type { AsAttackFlag, AsPhysicalType } from "../../data/alpha-strike";
import { oddsByRange, offersOptional } from "../../rules/as-aids";
import { odds2d6, targetNumber } from "../../rules/as-attack";
import type { AttackerMove, TargetMove } from "../../rules/as-attack";
import { inPlay, playLevel } from "../../rules/as-force";
import { formatDamage, parseDamage, unitTitle } from "../../rules/as-unit";
import type { AsDamage, AsUnit } from "../../rules/as-unit";
import { CriticalsAid, HeatAid, MovementAid, RangesAid, TurnAid } from "./AsAidsTables";
import AsPlayFilter from "./AsPlayFilter";
import { usePlaySettings } from "./playSettings";
import { SpecialsAid } from "./AsSpecials";
import { openAsStorage } from "./storage";

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
/** Terms that belong to optional rules (Multiple Attack Rolls, ASCE p. 174): left out below the level that offers them. */
const OPTIONAL_FLAGS: readonly AsAttackFlag[] = ["secondary"];
const whole = (text: string, min: number, max: number): number => Math.min(max, Math.max(min, Number.parseInt(text, 10) || 0));
const percent = (chance: number) => `${String(Math.round(chance * 100))}% (${String(Math.round(chance * 36))} in 36)`;


/**
 * Play aids for Alpha Strike. The rules level and edition at the top (the one play setting) decide which optional parts show. The
 * to-hit calculator builds the Target Number from the player's answers (each term with its page), the chance of a hit on 2D6 at each
 * range, and, from the damage the player types or takes from a roster unit, the damage to expect. Nothing here is saved.
 */
export default function AsAidsPage() {
  const { filter } = usePlaySettings();
  const level = playLevel(filter);
  const optional = offersOptional(level);
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
  const [picked, setPicked] = useState<AsAttackFlag[]>([]);
  const [extremeOn, setExtremeOn] = useState(false);
  const [damage, setDamage] = useState({ S: "", M: "", L: "" });
  const [roster, setRoster] = useState<AsUnit[]>([]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const entries = await (await openAsStorage()).list();
        if (live) setRoster(entries.flatMap((e) => (e.unit ? [e.unit] : [])));
      } catch {
        // No roster to pick from: the damage can still be typed.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const flags = optional ? picked : picked.filter((f) => !OPTIONAL_FLAGS.includes(f));
  const extreme = extremeOn && optional;
  const base = {
    skill: whole(skill, 0, 7),
    attackerType,
    attackerMove,
    targetType,
    targetTmm: whole(targetTmm, -4, 9),
    targetMove,
    heat: whole(heat, 0, 4),
    fireControlHits: whole(fireControl, 0, 4),
    flags,
    physical: physical === "" ? undefined : physical,
  };
  const result = targetNumber({ ...base, distance: whole(distance, 0, 999), extreme });
  const chance = result.blocked ? 0 : odds2d6(result.total);
  const shown = (physical === "" ? FLAGS : FLAGS.filter((f) => !AS_WEAPON_ONLY_FLAGS.includes(f))).filter((f) => optional || !OPTIONAL_FLAGS.includes(f));
  // A box left empty or not readable gives no damage yet; "-" is a range with no attack, "0*" minimal damage.
  const typed = (text: string): AsDamage | undefined => {
    const parsed = parseDamage(text);
    return text.trim() === "" || !parsed.ok ? undefined : parsed.value;
  };
  const invalid = (text: string): boolean => text.trim() !== "" && !parseDamage(text).ok;
  const ranges = physical === "" ? oddsByRange(base, { S: typed(damage.S), M: typed(damage.M), L: typed(damage.L) }, extreme) : [];
  const toggle = (flag: AsAttackFlag, on: boolean) => { setPicked(on ? [...picked, flag] : picked.filter((f) => f !== flag)); };
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
  const candidates = roster.filter((u) => inPlay(u, filter));
  const fill = (id: string) => {
    const unit = roster.find((u) => u.id === id);
    if (unit) setDamage({ S: formatDamage(unit.card.damage.s), M: formatDamage(unit.card.damage.m), L: formatDamage(unit.card.damage.l) });
  };

  return (
    <div className="sr-page">
      <h1>Alpha Strike play aids</h1>
      <p>
        <Link to="/battletech/alpha-strike/home">Back to the Alpha Strike page</Link>
      </p>

      <section className="bt-section" aria-labelledby="as-aids-rules">
        <h2 id="as-aids-rules">Play setting</h2>
        <p className="bt-hint">
          The same setting as on the Alpha Strike page. Optional rules (Extreme range, a second target) and the optional special abilities show from Advanced up.
        </p>
        <AsPlayFilter rulesOnly />
      </section>

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
                {`. Chance to hit ${percent(chance)}.`}
              </p>
              <ul>
                {result.parts.map((p) => (
                  <li key={p.id}>{`${p.label}: ${p.value >= 0 ? "+" : ""}${String(p.value)} (${p.cite})`}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <fieldset className="as-aids__flags">
          <legend>Terrain and situation</legend>
          {shown.map((flag) => (
            <label key={flag} className="as-aids__flag">
              <input type="checkbox" checked={flags.includes(flag)} onChange={(event) => { toggle(flag, event.target.checked); }} />
              {AS_ATTACK_FLAGS[flag].label}
            </label>
          ))}
          {physical === "" && optional && (
            <label className="as-aids__flag">
              <input type="checkbox" checked={extremeOn} onChange={(event) => { setExtremeOn(event.target.checked); }} />
              Extreme range is in play
            </label>
          )}
        </fieldset>

        {physical === "" && (
          <>
            <h3>Expected damage by range</h3>
            <p className="bt-hint">Type the damage the card gives at each range, or take it from a unit on your roster. We multiply it by the chance to hit; nothing else is counted. A 0* range counts as half a point on a hit (1D6, 1 on a 4 or more); a dash means no attack at that range.</p>
            {candidates.length > 0 && (
              <div className="bt-field">
                <label htmlFor="aid-unit">Take the damage from a unit</label>
                <select id="aid-unit" value="" onChange={(event) => { fill(event.target.value); }}>
                  <option value="">Choose a unit</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>{unitTitle(u) || "Unnamed unit"}</option>
                  ))}
                </select>
              </div>
            )}
            <ul className="as-aids__ranges">
              {ranges.map((r) => (
                <li key={r.id} className="as-aids__range">
                  <strong>{`${r.label}: Target Number ${String(r.tn)}, ${percent(r.chance)}`}</strong>
                  {r.id === "E" ? (
                    <span>{r.none ? "No attack at this range." : r.damage === undefined ? "Takes the Long damage less 1." : `Damage ${String(r.damage)}.`}</span>
                  ) : (
                    <div className="bt-field">
                      <label htmlFor={`aid-dmg-${r.id}`}>{`Damage at ${r.label.toLowerCase()} range (from the card)`}</label>
                      <input
                        id={`aid-dmg-${r.id}`}
                        inputMode="text"
                        aria-invalid={invalid(damage[r.id as "S" | "M" | "L"]) || undefined}
                        value={damage[r.id as "S" | "M" | "L"]}
                        onChange={(event) => { setDamage({ ...damage, [r.id]: event.target.value }); }}
                      />
                    </div>
                  )}
                  {r.id !== "E" && invalid(damage[r.id as "S" | "M" | "L"]) && <span className="bt-problem">Use a whole number, 0* or a dash.</span>}
                  {r.none && r.id !== "E" && <span>No attack at this range.</span>}
                  {r.expected !== undefined && <span>{`Expected damage ${r.expected.toFixed(2)} (the chance to hit times ${r.minimal ? "0.5 for 0*" : String(r.damage)}).`}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RangesAid level={level} />
      <HeatAid />
      <CriticalsAid />
      <TurnAid />
      <MovementAid />
      <SpecialsAid />
    </div>
  );
}
