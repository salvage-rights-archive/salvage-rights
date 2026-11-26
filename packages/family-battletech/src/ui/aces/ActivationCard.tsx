// The activation card: the one step the players are on. In the Initiative Phase that is revealing the priorities, the command card's
// orders and the roll; in the Movement Phase it is the schedule, a player's units tapped as moved, or one automated unit's
// activation with the resolver's questions and then its decision pinned over the filter checklist. Focus moves to the card's
// heading whenever the step changes.
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ACES_REMINDERS } from "../../data/aces-vocab";
import type { MoveMode } from "../../data/aces-vocab";
import type { AcesGame, ForceName, GameUnit } from "../../rules/aces-game";
import { answer, emptySheet, step } from "../../rules/aces-resolve";
import type { Reply } from "../../rules/aces-resolve";
import { currentMove } from "../../rules/as-play";
import {
  TURN_CITE,
  activatables,
  addLog,
  applyInitiativeOrders,
  currentStep,
  decidedMode,
  forceLabel,
  fromResolver,
  initiativeSummary,
  logLine,
  modeLabel,
  moveContext,
  moveInstruction,
  ordersDone,
  ordersState,
  otherForce,
  playerMovers,
  recordMoved,
  rerollTie,
  rollFor,
  setRoll,
  turnStateOf,
  unitById,
  validRoll,
  whoMovesNext,
  withTurnState,
} from "../../rules/aces-turn";
import type { TurnRecords } from "../../rules/aces-turn";
import { effectivePriority } from "../../rules/aces-deck";
import QuestionView from "./QuestionView";
import { chipOf, unitFacts } from "./UnitsDrawer";

export type Apply = (change: (game: AcesGame) => AcesGame, options?: { undo?: boolean }) => void;

interface PanelProps {
  game: AcesGame;
  /** The players have acted on this page since it opened. */
  touched: boolean;
  records: TurnRecords;
  apply: Apply;
}

/**
 * A heading the page moves focus to when the step changes. A page just opened (a reload, a resumed game) keeps focus where it is:
 * it moves only once the players have done something (`touched`).
 */
function useStepHeading(key: string, touched: boolean) {
  const ref = useRef<HTMLHeadingElement>(null);
  const last = useRef<string>(undefined);
  useEffect(() => {
    const before = last.current;
    last.current = key;
    if (before === key || (before === undefined && !touched)) return;
    ref.current?.focus();
  }, [key, touched]);
  return ref;
}

const MODE_ORDER: MoveMode[] = ["standstill", "ground", "jump", "sprint"];

/** The modes a unit can choose from now (Standstill always; Jump with jump Move; Ground and Sprint with any other Move). */
function modesOf(u: GameUnit): MoveMode[] {
  const moves = currentMove(u.play, u.card, "aces").filter((m) => m.inches > 0);
  return MODE_ORDER.filter((m) => m === "standstill" || (m === "jump" ? moves.some((x) => x.mode === "j") : moves.some((x) => x.mode !== "j")));
}

// ---- Initiative ----------------------------------------------------------------------------------------------------------------

/** The field keeps what is typed; `again` changes when we roll or clear the dice, which brings the field back in step with the game. */
function RollField({ force, value, again, apply }: { force: ForceName; value: number | undefined; again: number; apply: Apply }) {
  const id = `roll-${force}`;
  return (
    <div className="bt-field">
      <label htmlFor={id}>{`${forceLabel(force)}: 2D6 roll, 2 to 12`}</label>
      <input
        key={again}
        id={id}
        type="number"
        inputMode="numeric"
        min={2}
        max={12}
        defaultValue={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          apply((g) => setRoll(g, force, validRoll(n) ? n : undefined), { undo: false });
        }}
      />
      <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => rollFor(g, force)); }}>
        {`Roll 2D6 for ${forceLabel(force).toLowerCase()}`}
      </button>
    </div>
  );
}

function InitiativePanel({ game, records, apply, touched }: PanelProps) {
  const orders = ordersState(game, records);
  const summary = initiativeSummary(game);
  const ts = turnStateOf(game);
  const ready = ordersDone(orders);
  const heading = useStepHeading(`${orders.state}:${orders.state === "asking" ? orders.question.key : ""}:${String(ready)}`, touched);
  const decked = game.sides.automated.units.filter((u) => game.decks.decks.some((d) => d.unitId === u.id));
  const priorities = new Map(activatables(game, "automated", records).map((a) => [a.unitId, a]));
  const cardWords = records.commands.find((c) => c.id === game.command.current);
  const tokenOf = (id: string): string => (game.tokens.moveFirst === id ? "Move First (000)" : game.tokens.moveLast === id ? "Move Last (1000)" : "");

  return (
    <div className="aces-card">
      <h2 ref={heading} tabIndex={-1}>
        {`Turn ${String(game.turn)}: Initiative`}
      </h2>

      <section className="bt-section" aria-labelledby="init-reveal-h">
        <h3 id="init-reveal-h">1. Reveal the priorities</h3>
        <p className="bt-hint">{`Slide each automated unit's stat card down to show only the priority row of its top Aces card (${TURN_CITE.reveal.cite}).`}</p>
        {decked.length === 0 ? (
          <p>No automated unit has a deck, so there is no priority to reveal.</p>
        ) : (
          <ul className="bt-list">
            {decked.map((u) => {
              const a = priorities.get(u.id);
              const base = a?.priority ?? null;
              const effective = a ? effectivePriority(a) : null;
              return (
                <li key={u.id} className="bt-row">
                  <span className="bt-row__text">
                    <strong>{u.name}</strong>
                    {u.flags.withdrawing || u.flags.fleeing ? <span className="bt-tag">{u.flags.fleeing ? "Fleeing, -500" : "F, -500"}</span> : null}
                    {tokenOf(u.id) ? <span className="bt-tag">{tokenOf(u.id)}</span> : null}
                  </span>
                  <span className="bt-row__credit">
                    {base === null ? "priority not recorded: you will choose its turn" : `priority ${String(base)}${effective !== null && effective !== base ? `, acts on ${String(effective)}` : ""}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bt-section" aria-labelledby="init-orders-h">
        <h3 id="init-orders-h">2. The command card&apos;s orders</h3>
        <p className="bt-hint">{cardWords ? `${cardWords.commander}, card ${cardWords.letter}.` : "No command card is recorded for this game, so no orders apply."} {"Aces pp. 8, 10."}</p>
        {orders.state === "asking" && (
          <QuestionView
            question={orders.question}
            describe={(id) => chipOf(unitById(game, id), id)}
            onReply={(reply: Reply) => { apply((g) => ({ ...g, sight: answer(g.sight, orders.question, reply) }), { undo: false }); }}
          />
        )}
        {orders.state === "ready" && (
          <>
            <ul>
              {fromResolver(game, orders.decision.log).length === 0 ? <li>No order applies to this phase.</li> : fromResolver(game, orders.decision.log).map((l, i) => <li key={String(i)}>{l.text}</li>)}
            </ul>
            {orders.effect && (
              <button type="button" className="bt-button" onClick={() => { apply((g) => applyInitiativeOrders(g, orders.decision)); }}>
                Apply the orders
              </button>
            )}
          </>
        )}
        {orders.state === "applied" && (
          <p role="status">
            {`Orders applied${ts.modifier ? `: Initiative ${ts.modifier > 0 ? "+" : ""}${String(ts.modifier)} for the automated force` : ""}${game.tokens.moveFirst ? `; Move First to ${unitById(game, game.tokens.moveFirst)?.name ?? "a unit"}` : ""}${game.tokens.moveLast ? `; Move Last to ${unitById(game, game.tokens.moveLast)?.name ?? "a unit"}` : ""}.`}
          </p>
        )}
      </section>

      <section className="bt-section" aria-labelledby="init-roll-h">
        <h3 id="init-roll-h">3. Roll Initiative</h3>
        {!ready ? (
          <p>Settle the orders first.</p>
        ) : (
          <>
            <p className="bt-hint">{`Each force rolls 2D6 and adds its modifiers; the higher total wins and a tie is rolled again (${TURN_CITE.roll.cite}). Type the dice or let us roll them.`}</p>
            {(["player", "automated"] as const).map((f) => {
              const side = summary[f];
              return (
                <div key={f}>
                  <RollField force={f} value={ts.rolls[f]} again={ts.rollCount} apply={apply} />
                  {side.roll !== undefined && (
                    <ul className="aces-sum" aria-label={`${forceLabel(f)} total`}>
                      <li>{`Roll ${String(side.roll)}`}</li>
                      {side.parts.map((p) => (
                        <li key={p.label}>{`${p.value > 0 ? "+" : ""}${String(p.value)} ${p.label} (${p.cite})`}</li>
                      ))}
                      <li>
                        <strong>{`Total ${String(side.total)}`}</strong>
                      </li>
                    </ul>
                  )}
                </div>
              );
            })}
            <div role="status">
              {summary.outcome === "waiting" && <p>Waiting for both rolls.</p>}
              {summary.outcome === "tied" && <p>{`Tied at ${String(summary.player.total)}: roll both again.`}</p>}
              {summary.outcome === "decided" && summary.winner && (
                <p>
                  <strong>{`${forceLabel(summary.winner)} wins Initiative.`}</strong>
                  {` ${forceLabel(otherForce(summary.winner))} moves first, and attacks first in the Combat Phase.`}
                </p>
              )}
            </div>
            {summary.outcome === "tied" && (
              <button type="button" className="bt-button" onClick={() => { apply((g) => rerollTie(g)); }}>
                Roll again
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ---- Movement ------------------------------------------------------------------------------------------------------------------

function ModeButtons({ unit, current, onPick }: { unit: GameUnit; current?: MoveMode; onPick: (mode: MoveMode) => void }) {
  return (
    <span className="aces-modes" role="group" aria-label={`How ${unit.name} moved`}>
      {modesOf(unit).map((m) => (
        <button key={m} type="button" className={`bt-button${current === m ? "" : " bt-button--secondary"}`} aria-pressed={current === undefined ? undefined : current === m} aria-label={`${unit.name}: ${modeLabel(m)}`} onClick={() => { onPick(m); }}>
          {modeLabel(m)}
        </button>
      ))}
    </span>
  );
}

function Activation({ game, records, unit, apply, headingRef }: Omit<PanelProps, "touched"> & { unit: GameUnit; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const ts = turnStateOf(game);
  const result = step(moveContext(game, unit, records), game.sight);
  const [choice, setChoice] = useState<{ unitId: string; mode: MoveMode }>();
  const name = (id: string): string => unitById(game, id)?.name ?? id;
  const decision = "decide" in result ? result.decide : undefined;
  const available = modesOf(unit);
  const wanted: MoveMode | undefined = choice?.unitId === unit.id ? choice.mode : decision ? decidedMode(decision) : undefined;
  // A mode the unit cannot use now (Ground for a unit with no Move left) gives way to the first it can.
  const mode: MoveMode | undefined = wanted !== undefined && available.includes(wanted) ? wanted : available[0];
  const ticked = ts.active?.ticked ?? [];

  const finish = (): void => {
    if (!decision || !mode) return;
    const instruction = moveInstruction(decision, unit.name, name);
    apply((g) => {
      const moved = recordMoved(g, unit.id, mode);
      const tmm = unitById(moved, unit.id)?.play.moved?.tmm;
      const lines = [logLine(g, `${unit.name} moved by ${modeLabel(mode)}${tmm === undefined ? "" : `, TMM ${String(tmm)}`}. ${instruction}`, TURN_CITE.activation.cite), ...fromResolver(g, decision.log)];
      return withTurnState({ ...addLog(moved, ...lines), sight: emptySheet() }, (t) => ({ ...t, active: undefined, lastDistances: { ...t.lastDistances, ...g.sight.inches } }));
    });
  };

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1}>{`Moving ${unit.name}`}</h2>
      <p className="bt-hint">{unitFacts(unit)}</p>
      {"ask" in result && (
        <QuestionView
          key={result.ask.key + result.ask.kind}
          question={result.ask}
          describe={(id) => chipOf(unitById(game, id), id)}
          onReply={(reply) => { apply((g) => ({ ...g, sight: answer(g.sight, result.ask, reply) }), { undo: false }); }}
        />
      )}
      {decision && (
        <>
          <p className="aces-pinned" role="status">
            {moveInstruction(decision, unit.name, name)}
          </p>
          {decision.filters.length > 0 && (
            <section aria-labelledby="mv-filters-h">
              <h3 id="mv-filters-h">Movement filters, top first</h3>
              <ol className="aces-filters">
                {decision.filters.map((f) => (
                  <li key={f.number}>
                    <label className="bt-check" htmlFor={`mv-f-${f.number}`}>
                      <input
                        id={`mv-f-${f.number}`}
                        type="checkbox"
                        checked={ticked.includes(f.number)}
                        onChange={(e) => { apply((g) => withTurnState(g, (t) => (t.active ? { ...t, active: { ...t.active, ticked: e.target.checked ? [...t.active.ticked, f.number] : t.active.ticked.filter((x) => x !== f.number) } } : t)), { undo: false }); }}
                      />
                      {`${f.number}. ${f.text}${f.from === "card" ? "" : f.from === "special" ? " (special order)" : " (command card)"}`}
                    </label>
                  </li>
                ))}
              </ol>
              <p className="bt-hint">Ignore a filter no place meets; once one place is left, stop (Aces p. 14).</p>
            </section>
          )}
          <ul className="aces-reminders">
            {decision.reminders.map((r) => (
              <li key={r}>{`${ACES_REMINDERS[r].text} (${ACES_REMINDERS[r].cite})`}</li>
            ))}
          </ul>
          <details>
            <summary className="aces-summary">How we decided</summary>
            <ul>
              {fromResolver(game, decision.log).map((l, i) => (
                <li key={String(i)}>{`${l.text}${l.cite ? ` (${l.cite})` : ""}`}</li>
              ))}
            </ul>
          </details>
          <h3 id="mv-how-h">How did it move?</h3>
          <div role="group" aria-labelledby="mv-how-h" className="aces-modes">
            {available.map((m) => (
              <button key={m} type="button" className={`bt-button${mode === m ? "" : " bt-button--secondary"}`} aria-pressed={mode === m} onClick={() => { setChoice({ unitId: unit.id, mode: m }); }}>
                {modeLabel(m)}
              </button>
            ))}
          </div>
          <p className="aces-question__buttons">
            <button type="button" className="bt-button" onClick={finish}>
              {`Done: ${unit.name} has moved`}
            </button>
          </p>
        </>
      )}
      <p>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { apply((g) => withTurnState({ ...g, sight: emptySheet() }, (t) => (t.active ? { ...t, active: { ...t.active, ticked: [] } } : t))); }}>
          {`Start ${unit.name} over`}
        </button>
      </p>
    </div>
  );
}

const NEXT_REASON = {
  "unknown-priority": "A priority number is not recorded for at least one of them, so you choose who goes first (Aces p. 11).",
  tied: "They have the same priority and the same PV, so you choose who goes first (Aces p. 11).",
} as const;

function Choose({ game, records, force, apply }: Omit<PanelProps, "touched"> & { force: ForceName }) {
  const pick = whoMovesNext(game, force, records);
  const rows = new Map(activatables(game, force, records).map((a) => [a.unitId, a]));
  const begin = (unitId: string): void => {
    apply((g) => withTurnState({ ...g, sight: emptySheet() }, (t) => ({ ...t, active: { unitId, ticked: [] } })));
  };
  if (pick.kind === "none") return <p>No automated unit can move.</p>;
  if (pick.kind === "unit") {
    const u = unitById(game, pick.unitId);
    const a = rows.get(pick.unitId);
    const p = a ? effectivePriority(a) : null;
    return (
      <>
        <p>{`Next: ${u?.name ?? pick.unitId}${p === null ? "" : `, priority ${String(p)}`}${a?.token ? (a.token === "first" ? " (Move First)" : " (Move Last)") : ""}.`}</p>
        <button type="button" className="bt-button" onClick={() => { begin(pick.unitId); }}>
          {`Activate ${u?.name ?? pick.unitId}`}
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
                <span className="bt-row__credit">{u ? `PV ${String(u.pv)}, ${rows.get(id)?.priority === null || rows.get(id)?.priority === undefined ? "priority not recorded" : `priority ${String(effectivePriority(rows.get(id)!))}`}` : ""}</span>
              </span>
              <button type="button" className="bt-button" aria-label={`Activate ${u?.name ?? id}`} onClick={() => { begin(id); }}>
                Activate
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function MovementPanel({ game, records, apply, touched }: PanelProps) {
  const ts = turnStateOf(game);
  const progress = currentStep(game);
  const active = ts.active ? unitById(game, ts.active.unitId) : undefined;
  const result = active ? step(moveContext(game, active, records), game.sight) : undefined;
  const heading = useStepHeading(`${String(progress?.index)}:${String(progress?.remaining)}:${ts.active?.unitId ?? ""}:${result && "ask" in result ? result.ask.key : "x"}`, touched);
  const movers = playerMovers(game);
  const allies = progress?.force === "player" ? activatables(game, "player", records) : [];
  const title = active ? undefined : !progress ? "Every unit has moved" : progress.force === "player" ? `You move ${String(progress.remaining)} ${progress.remaining === 1 ? "unit" : "units"}` : `The automated force moves ${String(progress.remaining)} ${progress.remaining === 1 ? "unit" : "units"}`;
  const schedule = ts.schedule ?? [];

  const mark = (u: GameUnit, mode: MoveMode): void => {
    apply((g) => {
      const next = recordMoved(g, u.id, mode);
      const tmm = unitById(next, u.id)?.play.moved?.tmm;
      return addLog(next, logLine(g, `${u.name} moved by ${modeLabel(mode)}${tmm === undefined ? "" : `, TMM ${String(tmm)}`}.`, TURN_CITE.loserFirst.cite));
    });
  };

  return (
    <div className="aces-card">
      {active ? (
        <Activation game={game} records={records} unit={active} apply={apply} headingRef={heading} />
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            {`Turn ${String(game.turn)}: Movement. ${title ?? ""}`}
          </h2>
          <ol className="aces-schedule" aria-label="Movement order">
            {schedule.map((s, i) => {
              const state = progress === null || i < (progress?.index ?? 0) ? "done" : i === progress.index ? "now" : "later";
              return (
                <li key={String(i)} className={`aces-schedule__step aces-schedule__step--${state}`}>
                  {`${s.side === "player" ? "You" : "Automated"}: move ${String(s.count)}`}
                  <span className="aces-schedule__state">{state === "now" ? " (now)" : state === "done" ? " (done)" : ""}</span>
                </li>
              );
            })}
          </ol>
          {!progress && <p>Press Go to Combat Phase when you are ready.</p>}
          {progress?.force === "player" && (
            <>
              <p className="bt-hint">Tap how each of your units moved. Standing still is TMM 0 and a jump adds 1 to the TMM.</p>
              <ul className="bt-list">
                {movers.map((u) => (
                  <li key={u.id} className="bt-row aces-mover">
                    <span className="bt-row__text">
                      <strong>{u.name}</strong>
                      <span className="bt-row__credit">{unitFacts(u)}</span>
                    </span>
                    <ModeButtons unit={u} onPick={(m) => { mark(u, m); }} />
                  </li>
                ))}
              </ul>
              {movers.length === 0 && allies.length === 0 && <p>None of your units can still move.</p>}
              {allies.length > 0 && (
                <section aria-labelledby="mv-allies-h">
                  <h3 id="mv-allies-h">Automated allies of yours</h3>
                  <p className="bt-hint">{`You may move an ally with a deck instead of one of your own, the lowest priority first (${TURN_CITE.allies.cite}).`}</p>
                  <Choose game={game} records={records} force="player" apply={apply} />
                </section>
              )}
            </>
          )}
          {progress?.force === "automated" && <Choose game={game} records={records} force="automated" apply={apply} />}
        </>
      )}
    </div>
  );
}

// ---- The card ------------------------------------------------------------------------------------------------------------------

export default function ActivationCard(props: PanelProps) {
  const { game } = props;
  if (game.phase === "initiative") return <InitiativePanel {...props} />;
  if (game.phase === "movement") return <MovementPanel {...props} />;
  return (
    <div className="aces-card">
      <h2>{`Turn ${String(game.turn)}: ${game.phase === "combat" ? "Combat" : game.phase === "end" ? "End Phase" : "Game over"}`}</h2>
      <p>This page plays the Initiative and Movement Phases so far. The Combat and End Phases are not on it yet. Undo goes back to the end of Movement.</p>
    </div>
  );
}
