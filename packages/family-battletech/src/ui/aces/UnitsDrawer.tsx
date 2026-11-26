// Every unit in the game with the figures a player looks for at the table: Armor and Structure left, heat, critical hits, how it moved
// this turn, and an F for forced withdrawal. On a phone it opens and closes; from about 900 px wide it is the left column and always open.
import { useState } from "react";
import type { AcesGame, ForceName, GameUnit } from "../../rules/aces-game";
import { isEmplacement } from "../../rules/aces-game";
import { damageByHand, leaveTable } from "../../rules/aces-combat";
import { crippled, currentTmm } from "../../rules/as-play";
import { modeLabel } from "../../rules/aces-turn";
import type { Apply } from "./ActivationCard";
import type { UnitChip } from "./QuestionView";

const MOVE_WORDS = { standstill: "Standstill", ground: "Ground", jump: "Jump", sprint: "Sprint" } as const;

/** How a unit stands: gone, or Armor and Structure left, then how it moved this turn (a target reads TMM from it). */
export function unitFacts(u: GameUnit): string {
  if (u.play.destroyed) return "destroyed";
  if (u.play.escaped) return "escaped";
  const moved = u.play.moved ? `moved: ${modeLabel(u.play.moved.mode)}, TMM ${String(u.play.moved.tmm)}` : "not moved";
  return `Armor ${String(u.play.armor)}/${String(u.card.armor)}, Structure ${String(u.play.structure)}/${String(u.card.structure)}, ${moved}`;
}

export const chipOf = (u: GameUnit | undefined, id: string): UnitChip => (u ? { name: u.name, facts: unitFacts(u) } : { name: id, facts: "" });

function critWords(u: GameUnit): string[] {
  const { engine, fireControl, weapon } = u.play.crits;
  return [
    ...(engine ? [`Engine ${String(engine)}`] : []),
    ...(fireControl ? [`Fire Control ${String(fireControl)}`] : []),
    ...(weapon ? [`Weapon ${String(weapon)}`] : []),
    ...(u.play.moveHits.length ? [`Move hits ${String(u.play.moveHits.length)}`] : []),
  ];
}

/** Damage the page does not work out (an emplacement, a support card, indirect fire) and a unit leaving by an escape edge. */
function HandActions({ u, apply }: { u: GameUnit; apply: Apply }) {
  const [amount, setAmount] = useState("");
  const [crit, setCrit] = useState(false);
  const points = Number.parseInt(amount, 10);
  const ok = Number.isInteger(points) && points >= 1;
  return (
    <details className="aces-hand">
      <summary className="aces-summary">{`Damage by hand or left the table: ${u.name}`}</summary>
      <div className="bt-field">
        <label htmlFor={`hand-${u.id}`}>{`Damage to ${u.name}, staged until the End Phase`}</label>
        <input id={`hand-${u.id}`} type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => { setAmount(e.target.value); }} />
      </div>
      <label className="bt-check" htmlFor={`hand-crit-${u.id}`}>
        <input id={`hand-crit-${u.id}`} type="checkbox" checked={crit} onChange={(e) => { setCrit(e.target.checked); }} />
        It calls for a critical hit check
      </label>
      <p>
        <button type="button" className="bt-button bt-button--secondary" disabled={!ok} aria-label={`Stage damage on ${u.name}`} onClick={() => { apply((g) => damageByHand(g, u.id, points, crit)); setAmount(""); setCrit(false); }}>
          Stage the damage
        </button>
        {!isEmplacement(u.card) && (
          <button type="button" className="bt-button bt-button--secondary" aria-label={`${u.name} left the table`} onClick={() => { apply((g) => leaveTable(g, u.id)); }}>
            Left the table
          </button>
        )}
      </p>
    </details>
  );
}

function Row({ u, force, apply }: { u: GameUnit; force: ForceName; apply: Apply | undefined }) {
  const gone = u.play.destroyed || u.play.escaped;
  const crits = critWords(u);
  const tmm = currentTmm(u.play, u.card, "aces");
  return (
    <li className="bt-row aces-drawer__row">
      <span className="bt-row__text">
        <strong>{u.name}</strong>
        <span className="bt-tag">{force === "player" ? (u.flags.automated ? "Yours, automated" : "Yours") : "Automated"}</span>
        {u.flags.withdrawing && <span className="bt-tag">F, withdrawing</span>}
        {u.flags.fleeing && <span className="bt-tag">Fleeing</span>}
        {u.play.shutdown && <span className="bt-tag">Shut down</span>}
        {!gone && crippled(u.play, u.card, "aces") && <span className="bt-tag">Crippled</span>}
        {gone && <span className="bt-tag">{u.play.destroyed ? "Destroyed" : "Escaped"}</span>}
      </span>
      {!gone && (
        <span className="bt-row__credit">
          {`Armor ${String(u.play.armor)}/${String(u.card.armor)}, Structure ${String(u.play.structure)}/${String(u.card.structure)}`}
          {u.play.staged.length ? `, ${String(u.play.staged.reduce((s, h) => s + h.damage, 0))} staged` : ""}
          {`, heat ${String(u.play.heat)}`}
          {crits.length ? `, ${crits.join(", ")}` : ""}
          {u.edge === undefined ? "" : `, Edge ${String(u.edge)}`}
          {u.play.moved ? `, moved ${MOVE_WORDS[u.play.moved.mode]} (TMM ${String(u.play.moved.tmm)})` : tmm === null ? "" : `, not moved (TMM ${String(tmm)})`}
        </span>
      )}
      {!gone && apply && <HandActions u={u} apply={apply} />}
    </li>
  );
}

export default function UnitsDrawer({ units, phase, apply }: { units: { force: ForceName; unit: GameUnit }[]; phase?: AcesGame["phase"]; apply?: Apply }) {
  // Damage and leaving the table are for the turn's play: not before the Movement Phase and not once the game is over.
  const hands = phase === "movement" || phase === "combat" || phase === "end" ? apply : undefined;
  const [open, setOpen] = useState(false);
  return (
    <section className="aces-drawer" aria-labelledby="aces-drawer-h">
      <h2 id="aces-drawer-h" className="aces-drawer__title">
        {`Units (${String(units.length)})`}
      </h2>
      <button type="button" className="bt-button bt-button--secondary aces-drawer__toggle" aria-expanded={open} aria-controls="aces-drawer-body" onClick={() => { setOpen(!open); }}>
        {open ? "Hide the units" : "Show the units"}
      </button>
      <div id="aces-drawer-body" className={`aces-drawer__body${open ? " aces-drawer__body--open" : ""}`}>
        <ul className="bt-list">
          {units.map(({ force, unit }) => (
            <Row key={unit.id} u={unit} force={force} apply={hands} />
          ))}
        </ul>
      </div>
    </section>
  );
}
