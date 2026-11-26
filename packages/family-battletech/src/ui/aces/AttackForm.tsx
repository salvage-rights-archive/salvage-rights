// One attack the players record: the target and the figures that make the Target Number, the roll (typed or rolled for us, with an
// Edge pip), and the damage, which is staged until the End Phase. The same roll block finishes an automated unit's attack, whose
// target and Target Number the resolver has already worked out.
import { useState } from "react";
import { AS_PHYSICAL_TYPES } from "../../data/alpha-strike";
import type { AsAttackFlag, AsPhysicalType } from "../../data/alpha-strike";
import type { AcesGame, GameUnit } from "../../rules/aces-game";
import {
  attackTn,
  bumpRollCount,
  canAddPip,
  dice1d6,
  dice2d6,
  edgeLeft,
  enemiesOf,
  hasPilotEdge,
  heatAfterAttack,
  indirectDamage,
  minimalDelivers,
  physicalHit,
  recordAttack,
  rollHits,
  weaponDamage,
} from "../../rules/aces-combat";
import type { AttackRecord } from "../../rules/aces-combat";
import { physicalOptions } from "../../rules/aces-resolve";
import { currentOv, tracksHeat } from "../../rules/as-play";
import { resolveMultipleRolls } from "../../rules/as-attack";
import { forceOf, turnStateOf, unitById } from "../../rules/aces-turn";
import type { Apply } from "./ActivationCard";
import { chipOf } from "./UnitsDrawer";

export type AttackKind = "weapon" | "physical" | "indirect";

export const TERRAIN: { id: AsAttackFlag; label: string }[] = [
  { id: "woods", label: "Woods between them or around the target" },
  { id: "partial-cover", label: "The target has partial cover" },
  { id: "target-hull-down", label: "The target is hull-down" },
];

const validRoll = (n: number): boolean => Number.isInteger(n) && n >= 2 && n <= 12;
const validDie = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 6;

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
  /** What a hit deals, after any Overheat; a minimal (0*) hit shows 1, which the 1D6 roll then allows or not. */
  damage: number;
  /** The hit is a minimal (0*) one: it rolls 1D6 and deals 1 only on a 4 or more (ASCE p. 48; Quick-Start p. 21). */
  minimal?: boolean;
  /** The Overheat points used, which heat the unit in the End Phase. */
  ov: number;
  /** The OV points that add damage at this range; a failed 0* roll leaves these standing. */
  ovAdds?: number;
  attackerOnHit?: number;
  attackerOnMiss?: number;
  apply: Apply;
}

/** The roll and its result, then Record: the damage is staged on the target and the attacker is done. */
export function RollBlock({ game, attacker, targetId, kind, physical, tn, damage, minimal = false, ov, ovAdds = 0, attackerOnHit = 0, attackerOnMiss = 0, apply }: RollBlockProps) {
  const multi = game.rules.multipleAttackRolls && kind !== "physical";
  const rolls = Math.max(1, Math.ceil(damage));
  const target = unitById(game, targetId);
  // Infantry have no rear (Aces p. 5); every other target can be struck from behind (Quick-Start p. 21).
  const rearPossible = target !== undefined && target.card.type !== "CI" && target.card.type !== "BA";
  const [rollText, setRollText] = useState("");
  const [pipped, setPipped] = useState(false);
  const [damageText, setDamageText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [zeroHit, setZeroHit] = useState(false);
  const [twelve, setTwelve] = useState(false);
  const [dieText, setDieText] = useState("");
  const [rear, setRear] = useState(false);

  const roll = Number.parseInt(rollText, 10);
  // A 0* hit with OV under Multiple Attack Rolls: the 0* point and each OV point have their own attack roll (ASCE p. 175), so we ask for them apart.
  const split = multi && minimal && ovAdds > 0;
  const typedHits = Number.parseInt(successText, 10);
  const successes = split ? typedHits + (zeroHit ? 1 : 0) : typedHits;
  const die = Number.parseInt(dieText, 10);
  const rollOk = validRoll(roll);
  const successOk = Number.isInteger(typedHits) && typedHits >= 0 && typedHits <= (split ? ovAdds : rolls);
  const hit = multi ? successOk && successes > 0 : rollOk && rollHits(tn, roll, pipped);
  const natural12 = multi ? twelve : roll === 12;
  const needsDie = minimal && hit && (!split || zeroHit);
  const dieOk = validDie(die);
  // A 0* hit that rolls under 4 loses its own point but keeps any OV (ASCE pp. 48, 53, 174). In Multiple Attack Rolls each point, OV included,
  // gets its own attack roll (p. 175): the 0* point and each OV point are rolled apart, and only the OV hits and a 0* hit with a die of 4 or more land. A rear hit adds 1 even when the 0* roll fails (ASCE p. 48, 7th printing).
  const cardDamage = minimal ? (dieOk && !minimalDelivers(die) ? ovAdds : damage) : damage;
  const typed = Number.parseInt(damageText, 10);
  const baseDamage = multi ? (minimal ? (split ? typedHits : 0) + (dieOk && minimalDelivers(die) && needsDie ? 1 : 0) : successes) : damageText === "" ? cardDamage : Number.isFinite(typed) ? typed : cardDamage;
  const dealt = hit ? Math.max(0, baseDamage) + (rear && rearPossible ? 1 : 0) : 0;
  const ready = (multi ? successOk : rollOk) && (!needsDie || dieOk);
  const damageEnded = hit && dealt === 0;

  const rollForMe = (): void => {
    const count = turnStateOf(game).rollCount;
    if (multi) {
      const dice = Array.from({ length: rolls }, (_, i) => dice2d6(game, count + i));
      const r = resolveMultipleRolls(rolls, tn, dice);
      if (split) {
        // The first die is the 0* point's own roll; the rest are the OV points' rolls.
        setZeroHit(resolveMultipleRolls(1, tn, dice.slice(0, 1)).successes > 0);
        setSuccessText(String(resolveMultipleRolls(rolls - 1, tn, dice.slice(1)).successes));
      } else setSuccessText(String(r.successes));
      setTwelve(r.naturalTwelves > 0);
      apply((g) => bumpRollCount(g, rolls), { undo: false });
    } else {
      setRollText(String(dice2d6(game, count)));
      apply((g) => bumpRollCount(g), { undo: false });
    }
  };

  const rollDie = (): void => {
    setDieText(String(dice1d6(game, turnStateOf(game).rollCount)));
    apply((g) => bumpRollCount(g), { undo: false });
  };

  const record = (): void => {
    const base: AttackRecord = {
      attackerId: attacker.id,
      targetId,
      kind,
      ...(physical ? { physical } : {}),
      tn,
      ov,
      hit,
      damage: dealt,
      ...(pipped ? { pip: true } : {}),
      ...(needsDie ? { minimalRoll: die } : {}),
      ...(hit && rear && rearPossible ? { rear: true } : {}),
    };
    const rec: AttackRecord = multi ? { ...base, rolls, successes, natural12 } : { ...base, roll, natural12: natural12 && hit, ...(kind === "physical" ? { attackerDamage: hit ? attackerOnHit : attackerOnMiss } : {}) };
    apply((g) => recordAttack(g, rec));
  };

  return (
    <section className="bt-section" aria-label={`Roll for ${attacker.name}`}>
      {multi ? (
        <>
          <p className="bt-hint">{`Multiple attack rolls: roll 2D6 ${String(rolls)} ${rolls === 1 ? "time" : "times"}; each roll of ${String(tn)} or more succeeds.`}</p>
          <div className="bt-field">
            {split && (
              <label className="bt-check" htmlFor="atk-zero-hit">
                <input id="atk-zero-hit" type="checkbox" checked={zeroHit} onChange={(e) => { setZeroHit(e.target.checked); }} />
                The 0* point&apos;s own attack roll succeeded
              </label>
            )}
            <label htmlFor="atk-successes">{split ? `Overheat rolls that succeeded, 0 to ${String(ovAdds)}` : `Rolls that succeeded, 0 to ${String(rolls)}`}</label>
            <input id="atk-successes" type="number" inputMode="numeric" min={0} max={split ? ovAdds : rolls} value={successText} onChange={(e) => { setSuccessText(e.target.value); }} />
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
      {hasPilotEdge(attacker) && ready && (
        <label className="bt-check" htmlFor="atk-pip">
          <input id="atk-pip" type="checkbox" checked={pipped} disabled={!pipped && !canAddPip(game, attacker)} onChange={(e) => { setPipped(e.target.checked); }} />
          {multi
            ? `Spend 1 Edge to add a pip to one roll (${String(edgeLeft(attacker))} left, once a Combat Phase): change the count above if it now succeeds`
            : `Spend 1 Edge to add a pip to this roll (${String(edgeLeft(attacker))} left, once a Combat Phase)`}
        </label>
      )}
      <div role="status">
        {!multi && rollOk && <p>{hit ? <strong>{`${String(roll)}${pipped ? " plus a pip" : ""}: a hit.`}</strong> : <strong>{`${String(roll)}${pipped ? " plus a pip" : ""}: a miss.`}</strong>}</p>}
        {multi && successOk && <p>{`${String(successes)} of ${String(rolls)} succeeded.`}</p>}
        {hit && natural12 && !damageEnded && <p>A natural 12 calls for a critical hit roll in the End Phase.</p>}
        {kind === "physical" && physical === "anti-mech" && hit && <p>An Anti-&apos;Mech hit calls for a critical hit roll in the End Phase.</p>}
        {damageEnded && <p>The hit delivers no damage, so there is no critical hit check.</p>}
      </div>
      {needsDie && (
        <div className="bt-field">
          <label htmlFor="atk-minimal">Minimal damage (0*): 1D6 roll, 1 to 6 (4 or more deals 1)</label>
          <input id="atk-minimal" type="number" inputMode="numeric" min={1} max={6} value={dieText} onChange={(e) => { setDieText(e.target.value); }} />
          <button type="button" className="bt-button bt-button--secondary" onClick={rollDie}>
            Roll 1D6 for me
          </button>
        </div>
      )}
      {hit && rearPossible && (
        <label className="bt-check" htmlFor="atk-rear">
          <input id="atk-rear" type="checkbox" checked={rear} onChange={(e) => { setRear(e.target.checked); }} />
          The hit struck the target&apos;s rear (1 more damage, even when a 0* roll fails; ASCE p. 48, 7th printing)
        </label>
      )}
      {!multi && hit && (
        <div className="bt-field">
          <label htmlFor="atk-damage">{`Damage dealt, before a rear hit (the card gives ${String(cardDamage)})`}</label>
          <input id="atk-damage" type="number" inputMode="numeric" min={0} value={damageText === "" ? String(cardDamage) : damageText} onChange={(e) => { setDamageText(e.target.value); }} />
        </div>
      )}
      {multi && hit && <p>{`Damage dealt: ${String(dealt)}.`}</p>}
      <button type="button" className="bt-button" disabled={!ready} onClick={record}>
        Record the attack
      </button>
    </section>
  );
}

/** The players' own attack: they choose the target and kind, measure the distance, and set the terrain. */
export function ManualAttack({ game, attacker, apply, onCancel }: { game: AcesGame; attacker: GameUnit; apply: Apply; onCancel: () => void }) {
  const enemies = enemiesOf(game, attacker);
  const physicals = physicalOptions(attacker.card);
  const canIndirect = attacker.card.specials.some((s) => s.code === "IF");
  const side = forceOf(game, attacker.id);
  const spotters = (side ? game.sides[side].units : []).filter((u) => u.id !== attacker.id && !u.play.destroyed && !u.play.escaped);
  const [targetId, setTargetId] = useState(enemies[0]?.id ?? "");
  const [kind, setKind] = useState<"weapon" | "indirect" | AsPhysicalType>("weapon");
  const [distanceText, setDistanceText] = useState("");
  const [terrain, setTerrain] = useState<AsAttackFlag[]>([]);
  const [ov, setOv] = useState(0);
  const [spotterId, setSpotterId] = useState("");
  const [alsoSpotting, setAlsoSpotting] = useState(false);
  const target = enemies.find((e) => e.id === targetId);
  const distance = Number.parseFloat(distanceText);
  const indirect = kind === "indirect";
  const physical = kind !== "weapon" && !indirect;
  const heats = tracksHeat(attacker.card);
  const maxOv = currentOv(attacker.play, attacker.card);
  const usable = target !== undefined && (physical || (Number.isFinite(distance) && distance >= 0));
  const flags: AsAttackFlag[] = indirect && alsoSpotting ? [...terrain, "also-spotting"] : terrain;
  const spotter = spotters.find((u) => u.id === spotterId);
  const tn = usable ? attackTn(attacker, target, indirect ? "indirect" : physical ? "physical" : "weapon", physical ? 0 : distance, flags, physical ? kind : undefined, spotter) : undefined;
  const wd = usable && !physical && !indirect ? weaponDamage(attacker, distance, ov) : undefined;
  const ind = indirect ? indirectDamage(attacker) : undefined;
  const damage = !usable ? 0 : physical ? physicalHit(attacker, target, kind).toTarget : indirect ? (ind?.total ?? 0) : (wd?.total ?? 0);
  const costs = usable && physical ? physicalHit(attacker, target, kind) : undefined;
  const used = indirect || physical ? 0 : ov;

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
            <select id="atk-kind" value={kind} onChange={(e) => { setKind(e.target.value as "weapon" | "indirect" | AsPhysicalType); }}>
              <option value="weapon">Weapon attack</option>
              {canIndirect && <option value="indirect">Indirect fire</option>}
              {physicals.map((k) => (
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
          {indirect && (
            <>
              <div className="bt-field">
                <label htmlFor="atk-spotter">Spotter</label>
                <select id="atk-spotter" value={spotterId} onChange={(e) => { setSpotterId(e.target.value); }}>
                  <option value="">Choose a spotter</option>
                  {spotters.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <label className="bt-check" htmlFor="atk-also-spotting">
                <input id="atk-also-spotting" type="checkbox" checked={alsoSpotting} onChange={(e) => { setAlsoSpotting(e.target.checked); }} />
                The spotter also attacks this turn
              </label>
            </>
          )}
          {heats && !physical && !indirect && maxOv > 0 && (
            <div className="bt-field">
              <label htmlFor="atk-ov">Overheat to use</label>
              <select id="atk-ov" value={String(ov)} onChange={(e) => { setOv(Number.parseInt(e.target.value, 10)); }}>
                {Array.from({ length: maxOv + 1 }, (_, i) => (
                  <option key={i} value={String(i)}>{String(i)}</option>
                ))}
              </select>
              {heatAfterAttack(attacker, ov) >= 4 && <p className="bt-hint">That much heat would shut the unit down at the End Phase.</p>}
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
                key={`${targetId}:${kind}:${String(distance)}:${flags.join(",")}:${String(ov)}:${spotterId}`}
                game={game}
                attacker={attacker}
                targetId={targetId}
                kind={physical ? "physical" : indirect ? "indirect" : "weapon"}
                {...(physical ? { physical: kind } : {})}
                tn={tn.total}
                damage={damage}
                minimal={wd?.rollsMinimal === true || ind?.rollsMinimal === true}
                ov={used}
                ovAdds={wd?.ovAdds ?? 0}
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
