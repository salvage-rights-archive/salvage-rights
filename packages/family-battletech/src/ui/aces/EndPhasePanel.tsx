// The End Phase as the six steps of Aces p. 32, one open at a time: the sortie's own End Phase rules, damage and critical hits applied,
// heat, objectives and the end of the game, the commander's strategy decision, and the next turn with its waypoints. The game over
// summary closes a finished game.
import { useState } from "react";
import { Link } from "react-router";
import type { AcesGame } from "../../rules/aces-game";
import { answer, step } from "../../rules/aces-resolve";
import type { Reply } from "../../rules/aces-resolve";
import { crippled } from "../../rules/as-play";
import {
  COMBAT_CITE,
  END_STEPS,
  applyEnd,
  applyStrategy,
  edgeLeft,
  endCheck,
  endOf,
  finishGame,
  hasPilotEdge,
  markWaypoint,
  nextTurn,
  previewEnd,
  rerollWithEdge,
  setEndRoll,
  setEndStep,
  setObjectivesComplete,
  setTurnLimit,
  strategyContext,
  summarize,
  waypointsOn,
} from "../../rules/aces-combat";
import type { EndRoll, EndUnitReport } from "../../rules/aces-combat";
import { forceLabel, fromResolver, unitById } from "../../rules/aces-turn";
import type { PanelProps } from "./ActivationCard";
import { useStepHeading } from "./ActivationCard";
import EdgePanel from "./EdgePanel";
import QuestionView from "./QuestionView";
import { afterHref, ACES_HOME } from "./routes";
import { chipOf } from "./UnitsDrawer";

const ROLL_WORDS = { crit: "critical hit roll", motive: "motive systems damage roll" } as const;

function RollRow({ game, report, roll, slot, apply }: Pick<PanelProps, "game" | "apply"> & { report: EndUnitReport; roll: EndRoll; slot: number }) {
  const what = roll.kind ? ROLL_WORDS[roll.kind] : "roll";
  const unit = unitById(game, report.id);
  const used = (endOf(game).rerolled[report.id] ?? []).includes(slot);
  const canReroll = roll.kind !== undefined && unit !== undefined && hasPilotEdge(unit) && edgeLeft(unit) >= 1 && !used;
  return (
    <div className="bt-field">
      <label htmlFor={`end-roll-${report.id}-${String(slot)}`}>{`${report.name}: ${what}, 2D6 (we rolled ${String(roll.value)} unless you type one)`}</label>
      <input
        key={`${String(roll.value)}:${String(roll.set)}`}
        id={`end-roll-${report.id}-${String(slot)}`}
        type="number"
        inputMode="numeric"
        min={2}
        max={12}
        defaultValue={roll.set ? roll.value : undefined}
        placeholder={String(roll.value)}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          apply((g) => setEndRoll(g, report.id, slot, Number.isNaN(n) ? undefined : n), { undo: false });
        }}
      />
      {canReroll && (
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => rerollWithEdge(g, report.id, slot, roll.kind === "motive" ? "motive systems damage" : "critical hit")); }}>
          {`Spend 1 Edge to reroll (${String(edgeLeft(unit))} left)`}
        </button>
      )}
      {used && <p className="bt-hint">Rerolled with Edge: the new result stands.</p>}
    </div>
  );
}

function DamageStep({ game, apply }: Pick<PanelProps, "game" | "apply">) {
  const reports = previewEnd(game);
  const shown = reports.filter((r) => r.staged > 0 || r.events.length > 0);
  return (
    <>
      <p className="bt-hint">{`Apply the damage dealt in the Combat Phase, armor first, with any critical hits (${COMBAT_CITE.staged.cite}). We rolled the critical hit and motive checks from the game's seed; type your own dice over any of them.`}</p>
      {shown.length === 0 ? (
        <p>No damage was dealt this turn.</p>
      ) : (
        <ul className="bt-list">
          {shown.map((r) => (
            <li key={r.id} className="aces-end__unit">
              <strong>{r.name}</strong>
              <span className="bt-row__credit">{`${String(r.staged)} damage: Armor ${String(r.before.armor)} to ${String(r.after.armor)}, Structure ${String(r.before.structure)} to ${String(r.after.structure)}`}</span>
              {r.rolls.map((roll, i) => (
                <RollRow key={`${r.id}:${String(i)}`} game={game} report={r} roll={roll} slot={i} apply={apply} />
              ))}
              {r.events.length > 0 && (
                <ul>
                  {r.events.map((e) => (
                    <li key={e.id}>{`${e.text} (${e.cite})`}</li>
                  ))}
                </ul>
              )}
              {r.after.destroyed && <strong>It is destroyed.</strong>}
              {r.newlyCrippled && <strong>It is crippled.</strong>}
              {r.withdraws && <strong>It is crippled and the game uses forced withdrawal: it withdraws.</strong>}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="bt-button" onClick={() => { apply((g) => applyEnd(g)); }}>
        Apply the damage and critical hits
      </button>
    </>
  );
}

function HeatStep({ game, apply }: Pick<PanelProps, "game" | "apply">) {
  const heat = (endOf(game).heat ?? []).filter((h) => h.from !== h.to || h.to > 0 || h.shutdown || h.restarted);
  const hurt = (["player", "automated"] as const).flatMap((f) => game.sides[f].units.filter((u) => !u.play.destroyed && !u.play.escaped && crippled(u.play, u.card, "aces")));
  return (
    <>
      <p className="bt-hint">Heat and cooling are worked out with the damage. A unit that did not fire cools to 0; one that overheated keeps the heat.</p>
      {heat.length === 0 ? (
        <p>No unit has any heat.</p>
      ) : (
        <ul className="bt-list">
          {heat.map((h) => (
            <li key={h.id}>{`${h.name}: heat ${String(h.from)} to ${String(h.to)}${h.shutdown ? ", it shuts down" : ""}${h.restarted ? ", it starts up again" : ""}.`}</li>
          ))}
        </ul>
      )}
      {hurt.length > 0 && (
        <p>
          <strong>Crippled: </strong>
          {hurt.map((u) => `${u.name}${u.flags.withdrawing ? " (withdrawing)" : ""}`).join(", ")}
        </p>
      )}
      <button type="button" className="bt-button" onClick={() => { apply((g) => setEndStep(g, 4)); }}>
        Done with heat
      </button>
    </>
  );
}

function CheckStep({ game, apply }: Pick<PanelProps, "game" | "apply">) {
  const check = endCheck(game);
  const [limitText, setLimitText] = useState("");
  const limit = Number.parseInt(limitText, 10);
  return (
    <>
      <p className="bt-hint">{`The sortie ends when its objectives are complete or the last turn has ended; most sorties also end when a side has no units on the board (${COMBAT_CITE.end.cite}).`}</p>
      <label className="bt-check" htmlFor="end-objectives">
        <input id="end-objectives" type="checkbox" checked={endOf(game).objectivesComplete === true} onChange={(e) => { apply((g) => setObjectivesComplete(g, e.target.checked), { undo: false }); }} />
        The objectives are complete and the sortie ends now
      </label>
      <div className="bt-field">
        <label htmlFor="end-limit">{game.turnLimit === undefined ? "Last turn of the sortie (leave empty for no limit)" : `Last turn of the sortie (now ${String(game.turnLimit)})`}</label>
        <input id="end-limit" type="number" inputMode="numeric" min={game.turn} value={limitText} onChange={(e) => { setLimitText(e.target.value); }} />
        <button type="button" className="bt-button bt-button--secondary" disabled={limitText !== "" && !(Number.isInteger(limit) && limit >= game.turn)} onClick={() => { apply((g) => setTurnLimit(g, limitText === "" ? undefined : limit), { undo: false }); setLimitText(""); }}>
          Set the last turn
        </button>
      </div>
      <div role="status">
        {check.ended ? (
          <ul>
            {check.reasons.map((r) => (
              <li key={r.id}>
                <strong>{r.text}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>{game.turnLimit === undefined ? "Nothing says the sortie has ended." : `Turn ${String(game.turn)} of ${String(game.turnLimit)}: nothing says the sortie has ended.`}</p>
        )}
      </div>
      <p className="aces-modes">
        {check.ended ? (
          <>
            <button type="button" className="bt-button" onClick={() => { apply((g) => finishGame(g, endCheck(g).reasons[0]?.id ?? "ended")); }}>
              End the game
            </button>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => setEndStep(g, 5)); }}>
              Keep playing
            </button>
          </>
        ) : (
          <>
            <button type="button" className="bt-button" onClick={() => { apply((g) => setEndStep(g, 5)); }}>
              Go on
            </button>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => finishGame(g, "ended")); }}>
              End the game here
            </button>
          </>
        )}
      </p>
    </>
  );
}

function StrategyStep({ game, records, apply }: Pick<PanelProps, "game" | "records" | "apply">) {
  const result = step(strategyContext(game, records), game.sight);
  const skip = (): void => { apply((g) => setEndStep(g, 6)); };
  const command = game.command.current;
  if (!command || !records.commands.some((c) => c.id === command)) {
    return (
      <>
        <p>No command card is recorded for this game, so there is no strategy decision to read.</p>
        <button type="button" className="bt-button" onClick={skip}>
          Go on
        </button>
      </>
    );
  }
  return (
    <>
      <p className="bt-hint">{`Read the rows one at a time; the first that is true gives the command card to put on top, and if none is true the card stays (${COMBAT_CITE.strategy.cite}).`}</p>
      {"ask" in result && (
        <QuestionView
          key={result.ask.key + result.ask.kind}
          question={result.ask}
          describe={(id) => chipOf(unitById(game, id), id)}
          onReply={(reply: Reply) => { apply((g) => ({ ...g, sight: answer(g.sight, result.ask, reply) }), { undo: false }); }}
        />
      )}
      {"decide" in result && (
        <>
          <p className="aces-pinned" role="status">
            {result.decide.letter === null ? "No row holds: the command card stays for another turn." : `Row ${String((result.decide.row ?? 0) + 1)} holds: put command card ${result.decide.letter} on top.`}
          </p>
          <details>
            <summary className="aces-summary">How we decided</summary>
            <ul>
              {fromResolver(game, result.decide.log).map((l, i) => (
                <li key={String(i)}>{`${l.text}${l.cite ? ` (${l.cite})` : ""}`}</li>
              ))}
            </ul>
          </details>
          <button
            type="button"
            className="bt-button"
            onClick={() => {
              const decision = result.decide;
              apply((g) => applyStrategy(g, records, decision).game);
            }}
          >
            {result.decide.letter === null ? "Keep the card" : `Take command card ${result.decide.letter}`}
          </button>
        </>
      )}
    </>
  );
}

function NextStep({ game, apply }: Pick<PanelProps, "game" | "apply">) {
  const next = game.turn + 1;
  const marks = waypointsOn(game, next);
  return (
    <>
      <p>{`Move the Initiative token forward one space, to turn ${String(next)}.`}</p>
      {marks.length === 0 ? (
        <p>No waypoint is on that space.</p>
      ) : (
        <>
          <p className="bt-hint">{`Waypoints on that space, oldest first: read each in your book and apply it (${COMBAT_CITE.end.cite}).`}</p>
          <ul className="bt-list">
            {marks.map((w) => (
              <li key={w.letter}>
                <label className="bt-check" htmlFor={`wp-${w.letter}`}>
                  <input id={`wp-${w.letter}`} type="checkbox" checked={w.done} onChange={(e) => { apply((g) => markWaypoint(g, w.letter, e.target.checked), { undo: false }); }} />
                  {`Waypoint ${w.letter}: resolved`}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="bt-button" onClick={() => { apply((g) => nextTurn(g)); }}>
        {`Start turn ${String(next)}`}
      </button>
    </>
  );
}

export default function EndPhasePanel({ game, records, apply, touched }: PanelProps) {
  const end = endOf(game);
  const heading = useStepHeading(`${String(end.step)}`, touched);
  const current = END_STEPS.find((s) => s.n === end.step) ?? END_STEPS[0];
  return (
    <div className="aces-card">
      <h2 ref={heading} tabIndex={-1}>{`Turn ${String(game.turn)}: End Phase, step ${String(current.n)} of 6, ${current.title}`}</h2>
      <ol className="aces-schedule" aria-label="End Phase steps">
        {END_STEPS.map((s) => {
          const state = s.n < end.step ? "done" : s.n === end.step ? "now" : "later";
          return (
            <li key={s.n} className={`aces-schedule__step aces-schedule__step--${state}`}>
              {`${String(s.n)}. ${s.title}`}
              <span className="aces-schedule__state">{state === "now" ? " (now)" : state === "done" ? " (done)" : ""}</span>
            </li>
          );
        })}
      </ol>
      {end.step === 1 && (
        <>
          <p className="bt-hint">{`If the sortie's special rules have any that begin "End Phase -", resolve them now in the order listed (${COMBAT_CITE.end.cite}).`}</p>
          <button type="button" className="bt-button" onClick={() => { apply((g) => setEndStep(g, 2)); }}>
            Done with the sortie rules
          </button>
        </>
      )}
      {end.step === 2 && <DamageStep game={game} apply={apply} />}
      {end.step === 3 && <HeatStep game={game} apply={apply} />}
      {end.step === 4 && <CheckStep game={game} apply={apply} />}
      {end.step === 5 && <StrategyStep game={game} records={records} apply={apply} />}
      {end.step === 6 && <NextStep game={game} apply={apply} />}
      <EdgePanel game={game} apply={apply} />
    </div>
  );
}

/** The summary of a finished game: why it ended, and how each force stands. */
export function GameOverPanel({ game }: { game: AcesGame }) {
  const s = summarize(game);
  const sides = [
    { force: "player" as const, side: s.player },
    { force: "automated" as const, side: s.automated },
  ];
  return (
    <div className="aces-card">
      <h2 tabIndex={-1}>{`Game over after turn ${String(s.turns)}`}</h2>
      <p>{s.reason}</p>
      <ul className="bt-list">
        {sides.map(({ force, side }) => (
          <li key={force} className="aces-end__unit">
            <strong>{forceLabel(force)}</strong>
            <span>{`${String(side.units)} units: ${String(side.inPlay)} on the table, ${String(side.destroyed)} destroyed, ${String(side.escaped)} escaped, ${String(side.crippled)} crippled.`}</span>
            <span>{`PV ${String(side.pvStarted)} at the start, ${String(side.pvLost)} lost to destruction, ${String(side.pvLeft)} still on the table.`}</span>
          </li>
        ))}
      </ul>
      <p className="bt-hint">The damage on every unit stays in this game for the after-sortie steps.</p>
      <p className="aces-modes">
        {game.campaign && (
          <Link className="bt-button" to={afterHref(game.campaign.campaignId, Number.parseInt(game.campaign.sortie, 10) || 0)}>
            Go to the after-sortie steps
          </Link>
        )}
        <Link className="bt-button bt-button--secondary" to={ACES_HOME}>
          Back to Aces
        </Link>
      </p>
    </div>
  );
}
