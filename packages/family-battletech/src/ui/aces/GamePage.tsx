// The Aces table screen: a sticky bar with the turn, phase, Initiative winner, Undo and Next; the activation card with the one step
// the players are on; a units drawer; and the log. The game saves on every change, so a reload comes back to the same step. Screen
// Wake Lock keeps the display on while the page is open, with an off switch.
// Combat and the End Phase have their own panels (AttackPanel, EndPhasePanel); a finished game shows its summary.
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Link, useSearchParams } from "react-router";
import { withoutShadowedSamples } from "../../rules/aces-samples";
import type { AcesGame } from "../../rules/aces-game";
import { undoLast, withSnapshot } from "../../rules/aces-game";
import { emptySheet } from "../../rules/aces-resolve";
import { PHASE_WORDS, addLog, currentStep, forceLabel, initiativeSummary, logLine, ordersDone, ordersState, startMovement, turnStateOf, TURN_CITE } from "../../rules/aces-turn";
import type { TurnRecords } from "../../rules/aces-turn";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { useWakeLock } from "../useWakeLock";
import { combatForce, startEnd } from "../../rules/aces-combat";
import { supportPending } from "../../rules/aces-support";
import ActivationCard from "./ActivationCard";
import type { Apply } from "./ActivationCard";
import CombatPanel from "./AttackPanel";
import EdgePanel from "./EdgePanel";
import EndPhasePanel, { GameOverPanel } from "./EndPhasePanel";
import ObjectivesPanel from "./ObjectivesPanel";
import UnitsDrawer from "./UnitsDrawer";
import { openGameStorage } from "./game-storage";
import type { GameStorage } from "./game-storage";
import { ACES_HOME } from "./routes";
import { libraryOf, openAcesStorage } from "./storage";
import "./aces.scss";

type Loaded = { state: "loading" } | { state: "failed" } | { state: "missing" } | { state: "unreadable"; message: string } | { state: "ready"; game: AcesGame };


function Log({ game, headingRef }: { game: AcesGame; headingRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <section className="aces-card" aria-labelledby="aces-log-h">
      <h2 id="aces-log-h" ref={headingRef} tabIndex={-1}>
        Log
      </h2>
      <ol className="aces-log" reversed>
        {[...game.log].reverse().map((l, i) => (
          <li key={String(game.log.length - i)}>
            <span className="aces-log__turn">{l.turn === 0 ? "Setup: " : `Turn ${String(l.turn)}: `}</span>
            {l.text}
            {l.cite ? <span className="bt-hint">{` (${l.cite})`}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Phase(props: { game: AcesGame; records: TurnRecords; apply: Apply; touched: boolean }) {
  switch (props.game.phase) {
    case "combat":
      return <CombatPanel {...props} />;
    case "end":
      return <EndPhasePanel {...props} />;
    case "over":
      return <GameOverPanel game={props.game} />;
    case "movement":
      return (
        <>
          <ActivationCard {...props} />
          <EdgePanel game={props.game} apply={props.apply} />
        </>
      );
    default:
      return <ActivationCard {...props} />;
  }
}

export default function GamePage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [records, setRecords] = useState<TurnRecords>({ cards: [], commands: [], orders: [] });
  const [problem, setProblem] = useState("");
  const [view, setView] = useState<"now" | "log">("now");
  const [touched, setTouched] = useState(false);
  const storage = useRef<GameStorage>(undefined);
  const gameRef = useRef<AcesGame>(undefined);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const logHeading = useRef<HTMLHeadingElement>(null);
  const { on: keepAwake, supported, set: setAwake } = useWakeLock("aces-keep-awake");

  const persist = useCallback((game: AcesGame) => {
    const s = storage.current;
    if (!s) return;
    saving.current = saving.current
      .then(() => s.save(game))
      .then(() => { setProblem(""); })
      .catch(() => { setProblem(STORAGE_WRITE_FAILED); });
  }, []);

  const show = useCallback((game: AcesGame) => {
    gameRef.current = game;
    setLoaded({ state: "ready", game });
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const s = await openGameStorage();
        storage.current = s;
        const [entry, entries] = await Promise.all([s.get(id), openAcesStorage().then((a) => a.list())]);
        if (!live) return;
        const lib = libraryOf(entries.flatMap((e) => (e.record ? [e.record] : [])));
        lib.orders = withoutShadowedSamples(lib.orders);
        setRecords({ cards: lib.cards, commands: lib.commands, orders: lib.orders, supports: lib.supports });
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.game) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else {
          // A game fresh from setup starts at the Initiative Phase.
          const game: AcesGame = entry.game.phase === "setup" ? { ...entry.game, phase: "initiative" } : entry.game;
          show(game);
          if (game !== entry.game) persist(game);
        }
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id, persist, show]);

  /** Every change goes through here: Undo's snapshot first (unless the change is only an answer or a tick), then the save. */
  const apply: Apply = useCallback(
    (change, options) => {
      const base = gameRef.current;
      if (!base) return;
      const next = change(options?.undo === false ? base : withSnapshot(base));
      setTouched(true);
      show(next);
      persist(next);
    },
    [persist, show],
  );

  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  if (loaded.state !== "ready") {
    return (
      <div className="sr-page">
        <h1>Aces game</h1>
        <p>{loaded.state === "failed" ? STORAGE_READ_FAILED : loaded.state === "missing" ? "That game is not saved on this device." : `This saved game cannot be read. ${loaded.message}`}</p>
        <p>
          <Link to={ACES_HOME}>Back to Aces</Link>
        </p>
      </div>
    );
  }

  const { game } = loaded;
  const ts = turnStateOf(game);
  const summary = initiativeSummary(game);
  const winner = game.initiative?.turn === game.turn ? game.initiative.winner : undefined;
  const units = [
    ...game.sides.player.units.map((unit) => ({ force: "player" as const, unit })),
    ...game.sides.automated.units.map((unit) => ({ force: "automated" as const, unit })),
  ];

  const nextLabel = game.phase === "initiative" ? "Start the Movement Phase" : game.phase === "movement" ? "Go to the Combat Phase" : game.phase === "combat" ? "Go to the End Phase" : "";
  const nextReady =
    game.phase === "initiative"
      ? summary.outcome === "decided" && ordersDone(ordersState(game, records))
      : game.phase === "movement"
        ? currentStep(game) === null && !ts.active
        : game.phase === "combat"
          ? combatForce(game) === null && !ts.combat?.active && !supportPending(game)
          : false;
  const nextWhy = game.phase === "initiative" ? "Settle the orders and the roll first." : game.phase === "movement" ? "Every unit has to move first." : "Every unit, emplacement and support card has to be settled first.";
  const advance = (): void => {
    if (game.phase === "initiative") apply((g) => startMovement(g, initiativeSummary(g)));
    else if (game.phase === "movement") apply((g) => addLog({ ...g, phase: "combat", sight: emptySheet() }, logLine(g, "Movement Phase ends.", TURN_CITE.loserFirst.cite)));
    else apply((g) => startEnd(g));
  };

  const undo = (): void => {
    const before = undoLast(game);
    if (!before) return;
    show(before);
    persist(before);
  };

  return (
    <div className="sr-page aces-game">
      <h1>{game.name}</h1>
      <p className="aces-game__top">
        <Link className="bt-back" to={ACES_HOME}>
          Back to Aces
        </Link>
        <label className="bt-check" htmlFor="aces-awake">
          <input id="aces-awake" type="checkbox" checked={keepAwake} onChange={(e) => { setAwake(e.target.checked); }} />
          Keep the screen on
        </label>
      </p>
      {keepAwake && !supported && <p className="bt-hint">This browser cannot keep the screen on for us.</p>}
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <div className="aces-game__columns">
        <div className="aces-game__main">
          <div className="aces-tabs" role="group" aria-label="Show">
            <button type="button" className="bt-button aces-step" aria-pressed={view === "now"} onClick={() => { setView("now"); }}>
              This step
            </button>
            <button type="button" className="bt-button aces-step" aria-pressed={view === "log"} onClick={() => { setView("log"); }}>
              Log
            </button>
          </div>
          {view === "now" ? <Phase game={game} records={records} apply={apply} touched={touched} /> : <Log game={game} headingRef={logHeading} />}
          {view === "now" && game.phase !== "over" && <ObjectivesPanel game={game} apply={apply} />}
        </div>
        <UnitsDrawer units={units} phase={game.phase} apply={apply} />
      </div>

      <div className="aces-bar" role="region" aria-label="Turn bar">
        <p className="aces-bar__status" role="status">
          {`Turn ${String(game.turn)}, ${PHASE_WORDS[game.phase]}`}
          {winner ? `. ${forceLabel(winner)} won Initiative.` : ""}
        </p>
        <div className="aces-bar__buttons">
          <button type="button" className="bt-button bt-button--secondary" disabled={game.undo.length === 0} onClick={undo}>
            Undo
          </button>
          {nextLabel && (
            <button type="button" className="bt-button" disabled={!nextReady} aria-describedby={nextReady ? undefined : "aces-next-why"} onClick={advance}>
              {nextLabel}
            </button>
          )}
        </div>
        {nextLabel && !nextReady && (
          <p id="aces-next-why" className="bt-hint aces-bar__why">
            {nextWhy}
          </p>
        )}
      </div>
    </div>
  );
}
