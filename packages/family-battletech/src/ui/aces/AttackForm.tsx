// One attack the players record: the target and the figures that make the Target Number, the roll (typed or rolled for us, with an
// Edge pip), and the damage, which is staged until the End Phase. The same roll block finishes an automated unit's attack, whose
// target and Target Number the resolver has already worked out.
import { useState } from "react";
import { AS_PHYSICAL_TYPES } from "../../data/alpha-strike";
import type { AsAttackFlag, AsPhysicalType } from "../../data/alpha-strike";
import type { AcesGame, GameUnit } from "../../rules/aces-game";
import {
  addPip,
  attackTn,
  bumpRollCount,
  canAddPip,
  dice2d6,
  edgeLeft,
  enemiesOf,
  hasPilotEdge,
  physicalHit,
  recordAttack,
  rollHits,
  weaponDamage,
} from "../../rules/aces-combat";
import type { AttackRecord } from "../../rules/aces-combat";
import { currentOv, tracksHeat } from "../../rules/as-play";
import { resolveMultipleRolls } from "../../rules/as-attack";
import { turnStateOf } from "../../rules/aces-turn";
import type { Apply } from "./ActivationCard";
import { chipOf } from "./UnitsDrawer";

export type AttackKind = "weapon" | "physical" | "indirect";

export const TERRAIN: { id: AsAttackFlag; label: string }[] = [
  { id: "woods", label: "Woods between them or around the target" },
  { id: "partial-cover", label: "The target has partial cover" },
  { id: "target-hull-down", label: "The target is hull-down" },
];

const validRoll = (n: number): boolean => Number.isInteger(n) && n >= 2 && n <= 12;

export function TargetNumber({ tn, parts }: { tn: number; parts: { label: string; value: number; cite: string }[] }) {
  return (
    <>
      <ul className="aces-sum" aria-label="Target Number parts">
        {parts.map((p) => (
          <li key={`${p.label}:${p.cite}`}>{`${p.value > 0 ? "+" : ""}${String(p.value)} ${p.label} (${p.cite})`}</li>
        ))}
        <li>
          <strong>{`Target Number ${String(tn)}`}</strong>
        </li>
      </ul>
    </>
  );
}

interface RollBlockProps {
  game: AcesGame;
  attacker: GameUnit;
  targetId: string;
  kind: AttackKind;
  physical?: AsPhysicalType;
  tn: number;
  /** What a hit deals, after any Overheat. */
  damage: number;
  /** The Overheat points used, which heat the unit in the End Phase. */
  ov: number;
  attackerOnHit?: number;
  attackerOnMiss?: number;
  apply: Apply;
}

/** The roll and its result, then Record: the damage is staged on the target and the attacker is done. */
export function RollBlock({ game, attacker, targetId, kind, physical, tn, damage, ov, attackerOnHit = 0, attackerOnMiss = 0, apply }: RollBlockProps) {
  const multi = game.rules.multipleAttackRolls && kind !== "physical";
  const rolls = Math.max(1, Math.ceil(damage));
  const [rollText, setRollText] = useState("");
  const [pipped, setPipped] = useState(false);
  const [damageText, setDamageText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [twelve, setTwelve] = useState(false);

  const roll = Number.parseInt(rollText, 10);
  const successes = Number.parseInt(successText, 10);
  const rollOk = validRoll(roll);
  const successOk = Number.isInteger(successes) && successes >= 0 && successes <= rolls;
  const hit = multi ? successOk && successes > 0 : rollOk && rollHits(tn, roll, pipped);
  const natural12 = multi ? twelve : roll === 12;
  const dealt = multi ? successes : damageText === "" ? damage : Number.parseInt(damageText, 10);
  const ready = multi ? successOk : rollOk;

  const rollForMe = (): void => {
    const count = turnStateOf(game).rollCount;
    if (multi) {
      const dice = Array.from({ length: rolls }, (_, i) => dice2d6(game, count + i));
      const r = resolveMultipleRolls(rolls, tn, dice);
      setSuccessText(String(r.successes));
      setTwelve(r.naturalTwelves > 0);
      apply((g) => bumpRollCount(g, rolls), { undo: false });
    } else {
      setRollText(String(dice2d6(game, count)));
      apply((g) => bumpRollCount(g), { undo: false });
    }
  };

  const record = (): void => {
    const base: AttackRecord = { attackerId: attacker.id, targetId, kind, ...(physical ? { physical } : {}), tn, ov, hit, damage: Number.isFinite(dealt) ? dealt : damage };
    const rec: AttackRecord = multi
      ? { ...base, rolls, successes, natural12, damage: successes }
      : { ...base, roll, pip: pipped, natural12: natural12 && hit, ...(kind === "physical" ? { attackerDamage: hit ? attackerOnHit : attackerOnMiss } : {}) };
    apply((g) => recordAttack(g, rec));
  };

  return (
    <section className="bt-section" aria-label={`Roll for ${attacker.name}`}>
      {multi ? (
        <>
          <p className="bt-hint">{`Multiple attack rolls: roll 2D6 ${String(rolls)} ${rolls === 1 ? "time" : "times"}; each roll of ${String(tn)} or more succeeds.`}</p>
          <div className="bt-field">
            <label htmlFor="atk-successes">{`Rolls that succeeded, 0 to ${String(rolls)}`}</label>
            <input id="atk-successes" type="number" inputMode="numeric" min={0} max={rolls} value={successText} onChange={(e) => { setSuccessText(e.target.value); }} />
            <button type="button" className="bt-button bt-button--secondary" onClick={rollForMe}>
              Roll the dice for me
            </button>
          </div>
          <label className="bt-check" htmlFor="atk-twelve">
            <input id="atk-twelve" type="checkbox" checked={twelve} onChange={(e) => { setTwelve(e.target.checked); }} />
            A natural 12 was among the rolls that succeeded
          </label>
        </>
      ) : (
        <div className="bt-field">
          <label htmlFor="atk-roll">{`2D6 attack roll, 2 to 12 (hits on ${String(tn)} or more)`}</label>
          <input id="atk-roll" type="number" inputMode="numeric" min={2} max={12} value={rollText} onChange={(e) => { setRollText(e.target.value); }} />
          <button type="button" className="bt-button bt-button--secondary" onClick={rollForMe}>
            Roll 2D6 for me
          </button>
        </div>
      )}
      {hasPilotEdge(attacker) && (
        <p>
          {pipped ? (
            <span role="status">{multi ? "Edge pip spent: add 1 to one roll yourself and change the count above if it now succeeds." : "Edge pip added: 1 more on the roll."}</span>
          ) : (
            <button type="button" className="bt-button bt-button--secondary" disabled={!canAddPip(game, attacker)} onClick={() => { apply((g) => addPip(g, attacker.id)); setPipped(true); }}>
              {`Spend 1 Edge to add a pip (${String(edgeLeft(attacker))} left, once a Combat Phase)`}
            </button>
          )}
        </p>
      )}
      <div role="status">
        {!multi && rollOk && <p>{hit ? <strong>{`${String(roll)}${pipped ? " plus a pip" : ""}: a hit.`}</strong> : <strong>{`${String(roll)}${pipped ? " plus a pip" : ""}: a miss.`}</strong>}</p>}
        {multi && successOk && <p>{`${String(successes)} of ${String(rolls)} succeeded.`}</p>}
        {!multi && hit && natural12 && <p>A natural 12 calls for a critical hit roll in the End Phase.</p>}
        {kind === "physical" && physical === "anti-mech" && hit && <p>An Anti-&apos;Mech hit calls for a critical hit roll in the End Phase.</p>}
      </div>
      {!multi && hit && (
        <div className="bt-field">
          <label htmlFor="atk-damage">{`Damage dealt (the card gives ${String(damage)})`}</label>
          <input id="atk-damage" type="number" inputMode="numeric" min={0} value={damageText === "" ? String(damage) : damageText} onChange={(e) => { setDamageText(e.target.value); }} />
        </div>
      )}
      <button type="button" className="bt-button" disabled={!ready} onClick={record}>
        Record the attack
      </button>
    </section>
  );
}

/** The players' own attack: they choose the target and kind, measure the distance, and set the terrain. */
export function ManualAttack({ game, attacker, apply, onCancel }: { game: AcesGame; attacker: GameUnit; apply: Apply; onCancel: () => void }) {
  const enemies = enemiesOf(game, attacker);
  const [targetId, setTargetId] = useState(enemies[0]?.id ?? "");
  const [kind, setKind] = useState<"weapon" | AsPhysicalType>("weapon");
  const [distanceText, setDistanceText] = useState("");
  const [terrain, setTerrain] = useState<AsAttackFlag[]>([]);
  const [ov, setOv] = useState(0);
  const target = enemies.find((e) => e.id === targetId);
  const distance = Number.parseFloat(distanceText);
  const physical = kind !== "weapon";
  const heats = tracksHeat(attacker.card);
  const maxOv = currentOv(attacker.play, attacker.card);
  const usable = target !== undefined && (physical || (Number.isFinite(distance) && distance >= 0));
  const tn = usable ? attackTn(attacker, target, physical ? "physical" : "weapon", physical ? 0 : distance, terrain, physical ? kind : undefined) : undefined;
  const damage = !usable ? 0 : physical ? physicalHit(attacker, target, kind).toTarget : weaponDamage(attacker, distance, ov).total;
  const costs = usable && physical ? physicalHit(attacker, target, kind) : undefined;

  return (
    <section className="aces-card" aria-label={`${attacker.name} attacks`}>
      <h3>{`${attacker.name} attacks`}</h3>
      {enemies.length === 0 ? (
        <p>There is no enemy left to attack.</p>
      ) : (
        <>
          <div className="bt-field">
            <label htmlFor="atk-target">Target</label>
            <select id="atk-target" value={targetId} onChange={(e) => { setTargetId(e.target.value); }}>
              {enemies.map((e) => (
                <option key={e.id} value={e.id}>{`${e.name} (${chipOf(e, e.id).facts})`}</option>
              ))}
            </select>
          </div>
          <div className="bt-field">
            <label htmlFor="atk-kind">Kind of attack</label>
            <select id="atk-kind" value={kind} onChange={(e) => { setKind(e.target.value as "weapon" | AsPhysicalType); }}>
              <option value="weapon">Weapon attack</option>
              {(Object.keys(AS_PHYSICAL_TYPES) as AsPhysicalType[]).map((k) => (
                <option key={k} value={k}>{AS_PHYSICAL_TYPES[k].label}</option>
              ))}
            </select>
          </div>
          {!physical && (
            <div className="bt-field">
              <label htmlFor="atk-distance">Distance to the target, in inches (base to base)</label>
              <input id="atk-distance" type="number" inputMode="decimal" min={0} step="any" value={distanceText} onChange={(e) => { setDistanceText(e.target.value); }} />
            </div>
          )}
          {heats && !physical && maxOv > 0 && (
            <div className="bt-field">
              <label htmlFor="atk-ov">Overheat to use</label>
              <select id="atk-ov" value={String(ov)} onChange={(e) => { setOv(Number.parseInt(e.target.value, 10)); }}>
                {Array.from({ length: maxOv + 1 }, (_, i) => (
                  <option key={i} value={String(i)}>{String(i)}</option>
                ))}
              </select>
              {attacker.play.heat + ov >= 4 && <p className="bt-hint">That much heat would shut the unit down at the End Phase.</p>}
            </div>
          )}
          <fieldset className="aces-fieldset">
            <legend>Terrain</legend>
            {TERRAIN.map((t) => (
              <label key={t.id} className="bt-check" htmlFor={`atk-terrain-${t.id}`}>
                <input id={`atk-terrain-${t.id}`} type="checkbox" checked={terrain.includes(t.id)} onChange={(e) => { setTerrain(e.target.checked ? [...terrain, t.id] : terrain.filter((x) => x !== t.id)); }} />
                {t.label}
              </label>
            ))}
          </fieldset>
          {tn && tn.blocked && <p role="alert">{tn.blocked.id === "out-of-range" ? "That is beyond Long range, so this unit cannot attack it with weapons." : "A unit that sprinted cannot attack."}</p>}
          {tn && !tn.blocked && (
            <>
              <TargetNumber tn={tn.total} parts={tn.parts} />
              {tn.total >= 13 && <p className="bt-hint">A Target Number of 13 or more cannot hit.</p>}
              <RollBlock
                key={`${targetId}:${kind}:${String(distance)}:${terrain.join(",")}:${String(ov)}`}
                game={game}
                attacker={attacker}
                targetId={targetId}
                kind={physical ? "physical" : "weapon"}
                {...(physical ? { physical: kind } : {})}
                tn={tn.total}
                damage={damage}
                ov={physical ? 0 : ov}
                attackerOnHit={costs?.toAttackerOnHit ?? 0}
                attackerOnMiss={costs?.toAttackerOnMiss ?? 0}
                apply={apply}
              />
            </>
          )}
        </>
      )}
      <p>
        <button type="button" className="bt-button bt-button--secondary" onClick={onCancel}>
          Back to the list
        </button>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => recordAttack(g, { attackerId: attacker.id, kind: "none", reason: "the players chose not to" })); }}>
          {`${attacker.name} makes no attack`}
        </button>
      </p>
    </section>
  );
}
