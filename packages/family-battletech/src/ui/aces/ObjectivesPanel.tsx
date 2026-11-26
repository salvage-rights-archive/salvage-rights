// The sortie's objectives and transports, kept beside the table (Aces pp. 5, 16-17). The players say which automated units pursue the
// movement objective, which unit or building is the destroy objective, and which infantry ride in which transport. The record keeps
// each as a flag on the unit; the resolver reads them (rules/aces-special.ts).
import type { AcesGame, GameUnit } from "../../rules/aces-game";
import { isEmplacement } from "../../rules/aces-game";
import { mountUnit, setObjective, transportsFor } from "../../rules/aces-special";
import type { Apply } from "./ActivationCard";

const gone = (u: GameUnit): boolean => u.play.destroyed || u.play.escaped;

export default function ObjectivesPanel({ game, apply }: { game: AcesGame; apply: Apply }) {
  const movers = game.sides.automated.units.filter((u) => !gone(u) && !isEmplacement(u.card));
  // The players' own units and buildings are the enemies of the automated force; an automated ally is not.
  const targets = game.sides.player.units.filter((u) => !gone(u) && !u.flags.automated);
  const all = [...game.sides.player.units, ...game.sides.automated.units];
  const riders = all.filter((u) => !gone(u) && (u.flags.mountedIn !== undefined || transportsFor(game, u).length > 0));
  const named = [game.objectives.movement ? `Movement: ${game.objectives.movement}` : "", game.objectives.destroy?.length ? `Destroy: ${game.objectives.destroy.join(", ")}` : ""].filter(Boolean);
  if (movers.length === 0 && targets.length === 0 && riders.length === 0) return null;
  return (
    <details className="aces-card aces-hand">
      <summary className="aces-summary">Objectives and transports</summary>
      {named.length > 0 && <p className="bt-hint">{`The sortie names: ${named.join(". ")}.`}</p>}
      <fieldset className="aces-fieldset">
        <legend>Pursues the movement objective</legend>
        {movers.map((u) => (
          <label key={u.id} className="bt-check" htmlFor={`obj-move-${u.id}`}>
            <input id={`obj-move-${u.id}`} type="checkbox" checked={u.flags.moveObjective === true} onChange={(e) => { apply((g) => setObjective(g, u.id, "moveObjective", e.target.checked)); }} />
            {u.name}
          </label>
        ))}
        {movers.length === 0 && <p className="bt-hint">No automated unit can move.</p>}
        <p className="bt-hint">A unit under forced withdrawal or fleeing ignores it (Aces p. 16).</p>
      </fieldset>
      <fieldset className="aces-fieldset">
        <legend>Is the destroy objective</legend>
        {targets.map((u) => (
          <label key={u.id} className="bt-check" htmlFor={`obj-destroy-${u.id}`}>
            <input id={`obj-destroy-${u.id}`} type="checkbox" checked={u.flags.destroyObjective === true} onChange={(e) => { apply((g) => setObjective(g, u.id, "destroyObjective", e.target.checked)); }} />
            {u.card.type === "BD" ? `${u.name} (a building: default stats, p. 17)` : u.name}
          </label>
        ))}
      </fieldset>
      {riders.length > 0 && (
        <fieldset className="aces-fieldset">
          <legend>Riding in a transport</legend>
          {riders.map((u) => {
            const options = transportsFor(game, u);
            const current = u.flags.mountedIn !== undefined ? all.find((t) => t.id === u.flags.mountedIn) : undefined;
            return (
              <div key={u.id} className="bt-field">
                <label htmlFor={`obj-ride-${u.id}`}>{`${u.name} is mounted in`}</label>
                <select
                  id={`obj-ride-${u.id}`}
                  value={u.flags.mountedIn ?? ""}
                  onChange={(e) => { apply((g) => mountUnit(g, u.id, e.target.value === "" ? null : e.target.value)); }}
                >
                  <option value="">Not mounted</option>
                  {current && !options.some((t) => t.id === current.id) && <option value={current.id}>{current.name}</option>}
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
          <p className="bt-hint">A mounted unit cannot move, attack or spot, has no part in Initiative, and cannot be attacked (Aces p. 5).</p>
        </fieldset>
      )}
    </details>
  );
}
