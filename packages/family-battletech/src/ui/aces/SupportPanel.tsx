// The support step after the units have attacked (Aces pp. 20-21): the automated force's emplacements attack, its artillery names a
// target, and its Battlefield Support cards are played one at a time as the command card says. The page asks what the resolver asks,
// shows what it decided, and takes the roll.
import { useState } from "react";
import { beginAttack } from "../../rules/aces-combat";
import type { AcesGame } from "../../rules/aces-game";
import { answer } from "../../rules/aces-resolve";
import type { Reply } from "../../rules/aces-resolve";
import { SUPPORT_CITE, artilleryUnits, closeSupport, emplacementAttackers, playSupport, supportRoll, supportStep, unspentSupports } from "../../rules/aces-support";
import { fromResolver, unitById } from "../../rules/aces-turn";
import type { PanelProps } from "./ActivationCard";
import QuestionView from "./QuestionView";
import { chipOf } from "./UnitsDrawer";

function CardRoll({ game, records, apply, cardId, targetId }: Pick<PanelProps, "game" | "records" | "apply"> & { cardId: string; targetId: string }) {
  const card = records.supports?.find((c) => c.id === cardId);
  const [text, setText] = useState("");
  const roll = Number.parseInt(text, 10);
  const ok = Number.isInteger(roll) && roll >= 2 && roll <= 12;
  if (!card) return null;
  return (
    <div className="bt-field">
      <label htmlFor="sup-roll">{`2D6 roll for ${card.name} (hits on ${String(card.tn)} or more)`}</label>
      <input id="sup-roll" type="number" inputMode="numeric" min={2} max={12} value={text} onChange={(e) => { setText(e.target.value); }} />
      <button type="button" className="bt-button bt-button--secondary" onClick={() => { setText(String(supportRoll(game, cardId))); }}>
        Roll for me
      </button>
      <button type="button" className="bt-button" disabled={!ok} onClick={() => { apply((g) => playSupport(g, records, cardId, targetId, roll)); setText(""); }}>
        {`Record ${card.name}`}
      </button>
    </div>
  );
}

export default function SupportPanel({ game, records, apply }: Pick<PanelProps, "game" | "records" | "apply">) {
  const emplacements = emplacementAttackers(game);
  const artillery = artilleryUnits(game);
  const open = game.supports.some((s) => !s.used);
  const closed = game.turnState?.combat?.support?.closed === true;
  const result = emplacements.length === 0 && !closed && (open || artillery.length > 0) ? supportStep(game, records) : undefined;
  const decision = result && "decide" in result ? result.decide : undefined;
  const spent = game.turnState?.combat?.support?.resolved ?? [];
  const missing = open && unspentSupports(game, records).length === 0;
  if (emplacements.length === 0 && !open && artillery.length === 0) return null;

  return (
    <section className="aces-card" aria-labelledby="sup-h">
      <h3 id="sup-h">Emplacements, artillery and support cards</h3>
      <p className="bt-hint">{`They act after every unit has attacked (${SUPPORT_CITE.cite}).`}</p>
      {emplacements.length > 0 && (
        <>
          <p>The emplacements attack first, by the command card&apos;s emplacement rule.</p>
          <ul className="bt-list">
            {emplacements.map((u) => (
              <li key={u.id} className="bt-row">
                <span className="bt-row__text">{u.name}</span>
                <button type="button" className="bt-button" aria-label={`Attack with ${u.name}`} onClick={() => { apply((g) => beginAttack(g, u.id)); }}>
                  Attack
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {result && "ask" in result && (
        <QuestionView
          key={result.ask.key + result.ask.kind}
          question={result.ask}
          describe={(id) => chipOf(unitById(game, id), id)}
          onReply={(reply: Reply) => { apply((g) => ({ ...g, sight: answer(g.sight, result.ask, reply) }), { undo: false }); }}
        />
      )}
      {decision && (
        <>
          {decision.artillery && <p role="status">{`The artillery fires at ${unitById(game, decision.artillery)?.name ?? decision.artillery}. Resolve the shot by its own rules and enter the damage with Damage by hand in the units list.`}</p>}
          {decision.next ? (
            <>
              <p role="status">{`Next card: ${records.supports?.find((c) => c.id === decision.next?.card)?.name ?? decision.next.card}, on ${unitById(game, decision.next.target)?.name ?? decision.next.target}.`}</p>
              <CardRoll key={`${decision.next.card}:${decision.next.target}`} game={game} records={records} apply={apply} cardId={decision.next.card} targetId={decision.next.target} />
            </>
          ) : (
            <p role="status">No card is played now.</p>
          )}
          {decision.saved.length > 0 && <p className="bt-hint">{`Kept for later: ${decision.saved.map((s) => `${records.supports?.find((c) => c.id === s.card)?.name ?? s.card} (${s.why})`).join("; ")}.`}</p>}
          <details>
            <summary className="aces-summary">How we decided</summary>
            <ul>
              {fromResolver(game, decision.log).map((l, i) => (
                <li key={String(i)}>{`${l.text}${l.cite ? ` (${l.cite})` : ""}`}</li>
              ))}
            </ul>
          </details>
        </>
      )}
      {missing && <p className="bt-hint">A support card this game uses is not in your library on this device, so we cannot play it. Close the step and play it by hand.</p>}
      {spent.length > 0 && <p className="bt-hint">{`Played this turn: ${String(spent.length)}.`}</p>}
      {emplacements.length === 0 && !closed && (
        <p>
          <button type="button" className="bt-button" onClick={() => { apply((g: AcesGame) => closeSupport(g)); }}>
            Done with the support step
          </button>
        </p>
      )}
    </section>
  );
}
