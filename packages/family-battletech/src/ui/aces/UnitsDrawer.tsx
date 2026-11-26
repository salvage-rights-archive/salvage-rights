// Every unit in the game with the figures a player looks for at the table: Armor and Structure left, heat, critical hits, how it moved
// this turn, and an F for forced withdrawal. On a phone it opens and closes; from about 900 px wide it is the left column and always open.
import { useState } from "react";
import type { ForceName, GameUnit } from "../../rules/aces-game";
import { crippled, currentTmm } from "../../rules/as-play";
import { modeLabel } from "../../rules/aces-turn";
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

function Row({ u, force }: { u: GameUnit; force: ForceName }) {
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
    </li>
  );
}

export default function UnitsDrawer({ units }: { units: { force: ForceName; unit: GameUnit }[] }) {
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
            <Row key={unit.id} u={unit} force={force} />
          ))}
        </ul>
      </div>
    </section>
  );
}
