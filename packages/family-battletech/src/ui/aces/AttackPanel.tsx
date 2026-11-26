// The Combat Phase on the activation card: the side that lost Initiative attacks first; the players' units record their attacks, and
// each automated unit is settled by its top Aces card (combat side) in ascending combat priority, through the resolver's questions,
// then its Target Number and what it does with Overheat, then the roll. Damage is staged until the End Phase.
import { useState } from "react";
import { AS_PHYSICAL_TYPES } from "../../data/alpha-strike";
import type { AsAttackFlag } from "../../data/alpha-strike";
import type { ForceName, GameUnit } from "../../rules/aces-game";
import { answer, step } from "../../rules/aces-resolve";
import type { AttackDecision, Reply } from "../../rules/aces-resolve";
import { effectivePriority } from "../../rules/aces-deck";
import { COMBAT_CITE, beginAttack, cannotAttack, combatActivatables, combatContext, combatForce, combatOf, combatSides, manualAttackers, physicalHit, recordAttack, setTerrain, weaponDamage, whoAttacksNext } from "../../rules/aces-combat";
import { forceLabel, fromResolver, unitById } from "../../rules/aces-turn";
import type { PanelProps } from "./ActivationCard";
import { useStepHeading } from "./ActivationCard";
import { ManualAttack, RollBlock, TERRAIN, TargetNumber } from "./AttackForm";
import EdgePanel from "./EdgePanel";
import QuestionView from "./QuestionView";
import SupportPanel from "./SupportPanel";
import { chipOf, unitFacts } from "./UnitsDrawer";

const NO_ATTACK_WORDS: Record<NonNullable<AttackDecision["reason"]>, string> = {
  "no-target": "No enemy is in its attack range, or every one would need 13 or more.",
  shutdown: "It is shut down.",
  stunned: "Its crew is stunned, so it cannot attack.",
  sprinted: "It sprinted, so it cannot attack.",
  heat: "Heat has cut its Move to 0, so it makes no weapon attack and cools in the End Phase.",
  "hold-fire": "Its overheat rows say to hold fire.",
  "indirect-unprepared": "It would fire indirectly, but the Indirect Attacks order has not set a target and spotter.",
  "indirect-destroyed": "The indirect target is already as good as destroyed.",
  "read-card": "Its combat side is not recorded.",
};

/** Reasons that mean the unit truly cannot attack; any other no-attack result can still be recorded by hand. */
const HARD_STOPS: readonly string[] = ["shutdown", "stunned", "sprinted", "heat"];

function AutomatedAttack({ game, records, apply, unit, headingRef }: Pick<PanelProps, "game" | "records" | "apply"> & { unit: GameUnit; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const result = step(combatContext(game, unit, records), game.sight);
  const terrain = combatOf(game).active?.terrain ?? {};
  const decision = "decide" in result ? result.decide : undefined;
  const target = decision?.target ? unitById(game, decision.target) : undefined;
  const [manual, setManual] = useState(false);

  const settle = (): void => {
    if (!decision) return;
    apply((g) => recordAttack(g, { attackerId: unit.id, kind: "none", reason: decision.reason ? NO_ATTACK_WORDS[decision.reason] : "no attack" }));
  };

  let body: React.ReactNode = null;
  if (decision) {
    const how = fromResolver(game, decision.log);
    const distance = target ? (game.sight.inches[target.id] ?? 0) : 0;
    if (decision.attack === "none" || !target || !decision.tn) {
      body = (
        <>
          <p className="aces-pinned" role="status">
            {`${unit.name} makes no attack. ${decision.reason ? NO_ATTACK_WORDS[decision.reason] : ""}`}
          </p>
          {!HARD_STOPS.includes(decision.reason ?? "no-target") && !manual && (
            <p>
              <button type="button" className="bt-button" onClick={() => { setManual(true); }}>
                Record its attack myself
              </button>
            </p>
          )}
          {manual && <ManualAttack game={game} attacker={unit} apply={apply} onCancel={() => { setManual(false); }} />}
          {!manual && (
            <p>
              <button type="button" className="bt-button" onClick={settle}>
                {`Done: ${unit.name} makes no attack`}
              </button>
            </p>
          )}
        </>
      );
    } else {
      const kind = decision.attack;
      const hit = kind === "physical" && decision.physical ? physicalHit(unit, target, decision.physical) : undefined;
      const wd = weaponDamage(unit, distance, decision.ov);
      const minimal = kind === "weapon" ? wd.rollsMinimal : kind === "indirect" && decision.damage === 0.5;
      const damage = kind === "physical" ? (hit?.toTarget ?? 0) : kind === "indirect" ? (decision.damage === 0.5 ? 1 : decision.damage) : wd.total;
      const flags = (terrain[target.id] ?? []) as AsAttackFlag[];
      body = (
        <>
          <p className="aces-pinned" role="status">
            {`${unit.name} attacks ${target.name}: ${kind === "physical" && decision.physical ? AS_PHYSICAL_TYPES[decision.physical].label.toLowerCase() : kind === "indirect" ? "indirect fire" : "weapon attack"}, Target Number ${String(decision.tn.total)}${decision.ov > 0 ? `, Overheat ${String(decision.ov)}` : ""}.`}
          </p>
          <TargetNumber tn={decision.tn.total} parts={decision.tn.parts} />
          <fieldset className="aces-fieldset">
            <legend>{`Terrain for the attack on ${target.name}`}</legend>
            {TERRAIN.map((t) => (
              <label key={t.id} className="bt-check" htmlFor={`auto-terrain-${t.id}`}>
                <input id={`auto-terrain-${t.id}`} type="checkbox" checked={flags.includes(t.id)} onChange={(e) => { apply((g) => setTerrain(g, target.id, e.target.checked ? [...flags, t.id] : flags.filter((x) => x !== t.id)), { undo: false }); }} />
                {t.label}
              </label>
            ))}
          </fieldset>
          <details>
            <summary className="aces-summary">How we decided</summary>
            <ul>
              {how.map((l, i) => (
                <li key={String(i)}>{`${l.text}${l.cite ? ` (${l.cite})` : ""}`}</li>
              ))}
            </ul>
          </details>
          <RollBlock
            key={`${unit.id}:${target.id}:${String(decision.tn.total)}:${String(decision.ov)}`}
            game={game}
            attacker={unit}
            targetId={target.id}
            kind={kind}
            {...(kind === "physical" && decision.physical ? { physical: decision.physical } : {})}
            tn={decision.tn.total}
            damage={damage}
            minimal={minimal}
            ov={decision.ov}
            ovAdds={kind === "weapon" ? wd.ovAdds : 0}
            attackerOnHit={hit?.toAttackerOnHit ?? 0}
            attackerOnMiss={hit?.toAttackerOnMiss ?? 0}
            apply={apply}
          />
        </>
      );
    }
  }

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1}>{`${unit.name} attacks`}</h2>
      <p className="bt-hint">{unitFacts(unit)}</p>
      {"ask" in result && (
        <QuestionView
          key={result.ask.key + result.ask.kind}
          question={result.ask}
          describe={(id) => chipOf(unitById(game, id), id)}
          onReply={(reply: Reply) => { apply((g) => ({ ...g, sight: answer(g.sight, result.ask, reply) }), { undo: false }); }}
        />
      )}
      {body}
      {decision && decision.log.length > 0 && !decision.target && <p className="bt-hint">{fromResolver(game, decision.log).map((l) => l.text).join(" ")}</p>}
      <p>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => beginAttack(g, unit.id)); }}>
          {`Start ${unit.name} over`}
        </button>
      </p>
    </div>
  );
}

const NEXT_REASON = {
  "unknown-priority": "A combat priority is not recorded for at least one of them, so you choose who attacks first (Aces p. 18).",
  tied: "They have the same priority and the same PV, so you choose who attacks first (Aces p. 18).",
} as const;

function ChooseAttacker({ game, records, force, apply }: Pick<PanelProps, "game" | "records" | "apply"> & { force: ForceName }) {
  const pick = whoAttacksNext(game, force, records);
  const rows = new Map(combatActivatables(game, force, records).map((a) => [a.unitId, a]));
  const begin = (id: string): void => { apply((g) => beginAttack(g, id)); };
  if (pick.kind === "none") return null;
  const priority = (id: string): string => {
    const a = rows.get(id);
    const p = a ? effectivePriority(a) : null;
    return p === null ? "priority not recorded" : `priority ${String(p)}`;
  };
  if (pick.kind === "unit") {
    const u = unitById(game, pick.unitId);
    return (
      <>
        <p>{`Next: ${u?.name ?? pick.unitId}, ${priority(pick.unitId)}.`}</p>
        <button type="button" className="bt-button" onClick={() => { begin(pick.unitId); }}>
          {`Attack with ${u?.name ?? pick.unitId}`}
        </button>
      </>
    );
  }
  return (
    <>
      <p>{NEXT_REASON[pick.reason]}</p>
      <ul className="bt-list">
        {pick.unitIds.map((id) => {
          const u = unitById(game, id);
          return (
            <li key={id} className="bt-row">
              <span className="bt-row__text">
                <strong>{u?.name ?? id}</strong>
                <span className="bt-row__credit">{`PV ${String(u?.pv ?? 0)}, ${priority(id)}`}</span>
              </span>
              <button type="button" className="bt-button" aria-label={`Attack with ${u?.name ?? id}`} onClick={() => { begin(id); }}>
                Attack
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function CombatPanel({ game, records, apply, touched }: PanelProps) {
  const sides = combatSides(game);
  const force = combatForce(game);
  const combat = combatOf(game);
  const active = combat.active ? unitById(game, combat.active.unitId) : undefined;
  const [manualFor, setManualFor] = useState<string>();
  const manualUnit = manualFor ? manualAttackers(game, force ?? "player").find((u) => u.id === manualFor) : undefined;
  const heading = useStepHeading(`${force ?? "done"}:${active?.id ?? ""}:${manualUnit?.id ?? ""}:${String(Object.keys(combat.done).length)}`, touched);
  const manual = force ? manualAttackers(game, force) : [];
  const blocked = force ? cannotAttack(game, force) : [];

  return (
    <div className="aces-card">
      {active ? (
        <AutomatedAttack game={game} records={records} apply={apply} unit={active} headingRef={heading} />
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            {`Turn ${String(game.turn)}: Combat. ${force === null ? "Every unit has attacked" : force === "player" ? "You attack" : "The automated force attacks"}`}
          </h2>
          <p className="bt-hint">{`${forceLabel(sides.first)} lost Initiative, so it resolves all its attacks first (${COMBAT_CITE.order.cite}). Damage is staged: nothing on a card changes until the End Phase, so a unit that is about to be destroyed still fires.`}</p>
          {force === "automated" && <p className="bt-hint">{`For each automated unit show the combat side of its top Aces card, and resolve them in ascending priority (${COMBAT_CITE.steps.cite}).`}</p>}
          {force === null && <p>Press Go to the End Phase when you are ready.</p>}
          {force !== null && manualUnit && <ManualAttack key={manualUnit.id} game={game} attacker={manualUnit} apply={apply} onCancel={() => { setManualFor(undefined); }} />}
          {force !== null && !manualUnit && manual.length > 0 && (
            <>
              <h3>{force === "player" ? "Your units" : "Automated units you resolve by hand"}</h3>
              <ul className="bt-list">
                {manual.map((u) => (
                  <li key={u.id} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{u.name}</strong>
                      <span className="bt-row__credit">{unitFacts(u)}</span>
                    </span>
                    <span className="aces-modes">
                      <button type="button" className="bt-button" aria-label={`Attack with ${u.name}`} onClick={() => { setManualFor(u.id); }}>
                        Attack
                      </button>
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`${u.name} makes no attack`} onClick={() => { apply((g) => recordAttack(g, { attackerId: u.id, kind: "none", reason: "the players chose not to" })); }}>
                        No attack
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {force !== null && blocked.length > 0 && (
            <p className="bt-hint">{`Cannot attack this turn: ${blocked.map((b) => `${b.unit.name} (${b.why})`).join(", ")}.`}</p>
          )}
          {force !== null && !manualUnit && (
            <section aria-labelledby="atk-cards-h">
              {combatActivatables(game, force, records).length > 0 && (
                <>
                  <h3 id="atk-cards-h">{force === "player" ? "Automated allies of yours" : "Automated units"}</h3>
                  {force === "player" && <p className="bt-hint">{`You may attack with an ally that has a deck instead of one of your own, the lowest priority first (${COMBAT_CITE.allies.cite}).`}</p>}
                  <ChooseAttacker game={game} records={records} force={force} apply={apply} />
                </>
              )}
            </section>
          )}
          {force === null && <SupportPanel game={game} records={records} apply={apply} />}
        </>
      )}
      <EdgePanel game={game} apply={apply} />
    </div>
  );
}
