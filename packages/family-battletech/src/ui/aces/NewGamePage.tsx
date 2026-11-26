// Set up an Aces game (Aces pp. 10, 31, 38-39): two sides from saved Alpha Strike forces or single roster units, a deck for each
// automated unit, the command deck and its start card, objectives, waypoints, support cards, the rules switches, and the difficulty
// aids shown as suggestions. Saving makes the game record; nothing here plays the game.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ACES_LETTERS } from "../../data/aces-vocab";
import type { CommandLetter } from "../../data/aces-vocab";
import type { AcesCard, CommandCard, SupportCard } from "../../rules/aces-card";
import { DEFAULT_RULES, difficultyAids, newAcesGame, recordedDecks, shiftSkill } from "../../rules/aces-game";
import type { AcesRules } from "../../rules/aces-game";
import type { AsForce } from "../../rules/as-force";
import type { AsUnit } from "../../rules/as-unit";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { openAsStorage } from "../as/storage";
import GameSideEditor from "./GameSideEditor";
import type { SideState } from "./GameSideEditor";
import { openGameStorage } from "./game-storage";
import { ACES_CARDS, ACES_HOME, gameHref } from "./routes";
import { openAcesStorage } from "./storage";
import "./styles";

interface Loaded {
  forces: AsForce[];
  roster: Map<string, AsUnit>;
  cards: AcesCard[];
  commands: CommandCard[];
  supports: SupportCard[];
}

interface WaypointRow {
  key: number;
  letter: string;
  turn: string;
}

export default function NewGamePage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>();
  const [problem, setProblem] = useState("");
  const [name, setName] = useState("New game");
  const [player, setPlayer] = useState<SideState>({ rows: [] });
  const [automated, setAutomated] = useState<SideState>({ rows: [] });
  const [commander, setCommander] = useState("");
  const [letter, setLetter] = useState<CommandLetter>("A");
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [movement, setMovement] = useState("");
  const [destroy, setDestroy] = useState("");
  const [waypoints, setWaypoints] = useState<WaypointRow[]>([]);
  const [rules, setRules] = useState<AcesRules>(DEFAULT_RULES);

  useEffect(() => {
    void (async () => {
      try {
        const as = await openAsStorage();
        const aces = await openAcesStorage();
        const records = (await aces.list(["aces-card", "aces-command", "aces-support"])).flatMap((e) => (e.record ? [e.record] : []));
        setLoaded({
          forces: (await as.listForces()).flatMap((e) => (e.force ? [e.force] : [])),
          roster: new Map((await as.list()).flatMap((e) => (e.unit ? [[e.unit.id, e.unit] as const] : []))),
          cards: records.filter((r): r is AcesCard => r.kind === "aces-card"),
          commands: records.filter((r): r is CommandCard => r.kind === "aces-command"),
          supports: records.filter((r): r is SupportCard => r.kind === "aces-support"),
        });
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  if (!loaded) {
    return (
      <div className="sr-page">
        <h1>New Aces game</h1>
        {problem ? <p role="alert" className="bt-problem">{problem}</p> : <p role="status">Loading.</p>}
      </div>
    );
  }

  const recorded = recordedDecks(loaded.cards);
  const commanders = [...new Set(loaded.commands.map((c) => c.commander))].sort((a, b) => a.localeCompare(b));
  const chosenCards = loaded.commands.filter((c) => c.commander === commander);
  const letters = ACES_LETTERS.filter((l) => chosenCards.some((c) => c.letter === l));
  const playerPv = player.rows.reduce((s, r) => s + r.pv, 0);
  const automatedPv = automated.rows.reduce((s, r) => s + r.pv, 0);
  const aids = difficultyAids(playerPv, automatedPv);
  const shift = (change: "easier" | "harder") => { setAutomated({ ...automated, rows: shiftSkill(automated.rows, change) }); };

  const start = async () => {
    const id = crypto.randomUUID();
    const game = newAcesGame({
      id,
      name: name.trim() || "New game",
      seed: crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
      at: new Date().toISOString(),
      player: { ...(player.forceId ? { forceId: player.forceId } : {}), units: player.rows, ...(player.commander === undefined ? {} : { commander: player.commander }) },
      automated: { ...(automated.forceId ? { forceId: automated.forceId } : {}), units: automated.rows, ...(automated.commander === undefined ? {} : { commander: automated.commander }) },
      cards: loaded.cards,
      commandCards: chosenCards,
      startLetter: letters.includes(letter) ? letter : letters[0],
      supportIds,
      objectives: {
        ...(movement.trim() ? { movement: movement.trim() } : {}),
        ...(destroy.trim() ? { destroy: destroy.split(",").map((d) => d.trim()).filter(Boolean) } : {}),
      },
      waypoints: waypoints.filter((w) => w.letter.trim()).map((w) => ({ letter: w.letter.trim(), ...(/^\d+$/.test(w.turn.trim()) ? { turn: Number(w.turn) } : {}) })),
      rules,
    });
    try {
      await (await openGameStorage()).save(game);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    void navigate(gameHref(id));
  };

  const setRule = <K extends keyof AcesRules>(key: K, value: AcesRules[K]) => { setRules({ ...rules, [key]: value }); };
  const ready = player.rows.length > 0 && automated.rows.length > 0;

  return (
    <div className="sr-page">
      <h1>New Aces game</h1>
      <p>
        <Link to={ACES_HOME}>Back to Aces</Link>
      </p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <section className="bt-section" aria-labelledby="ng-name-h">
        <h2 id="ng-name-h">The game</h2>
        <div className="bt-field">
          <label htmlFor="ng-name">Name</label>
          <input id="ng-name" value={name} onChange={(e) => { setName(e.target.value); }} />
        </div>
      </section>

      <GameSideEditor id="ng-player" title="Your force" automated={false} state={player} onChange={setPlayer} forces={loaded.forces} roster={loaded.roster} recorded={recorded} />
      <GameSideEditor id="ng-auto" title="Automated force" automated state={automated} onChange={setAutomated} forces={loaded.forces} roster={loaded.roster} recorded={recorded} />

      <section className="bt-section" aria-labelledby="ng-diff-h">
        <h2 id="ng-diff-h">Difficulty</h2>
        <p role="status">
          {playerPv === 0
            ? "Add units to both sides to see how the forces compare."
            : `Your force is ${String(playerPv)} PV and the automated force ${String(automatedPv)} PV${aids.ratio === null ? "" : `, ${String(aids.ratio)}% of yours`}.`}
        </p>
        <p className="bt-hint">
          {`For a game that is less challenging, build the automated force at about 80% of your PV (${String(aids.easierPv)}) and lower its Skill ratings by 1. For one that is more challenging, about 120% (${String(aids.harderPv)}) and raise them by 1. The PV total is not recalculated after a Skill change (Aces p. 38).`}
        </p>
        <div className="bt-field">
          <button type="button" className="bt-button bt-button--secondary" disabled={automated.rows.length === 0} onClick={() => { shift("easier"); }}>
            Make the automated force easier: Skill 1 worse
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={automated.rows.length === 0} onClick={() => { shift("harder"); }}>
            Make the automated force harder: Skill 1 better
          </button>
        </div>
      </section>

      <section className="bt-section" aria-labelledby="ng-cmd-h">
        <h2 id="ng-cmd-h">Command deck</h2>
        {commanders.length === 0 ? (
          <p>
            You have not recorded any command cards, so the game runs without a command deck. <Link to={ACES_CARDS}>Record them with your cards.</Link>
          </p>
        ) : (
          <>
            <div className="bt-field">
              <label htmlFor="ng-commander">Commander</label>
              <select id="ng-commander" value={commander} onChange={(e) => { setCommander(e.target.value); setLetter("A"); }}>
                <option value="">No command deck</option>
                {commanders.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {letters.length > 0 && (
              <div className="bt-field">
                <label htmlFor="ng-letter">Start on card</label>
                <select id="ng-letter" value={letters.includes(letter) ? letter : letters[0]} onChange={(e) => { setLetter(e.target.value as CommandLetter); }}>
                  {letters.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}
            <p className="bt-hint">Card A is the usual start. Start on another when the sortie says so, or when the automated force begins close to your units (Aces p. 39).</p>
          </>
        )}
      </section>

      <section className="bt-section" aria-labelledby="ng-obj-h">
        <h2 id="ng-obj-h">Objectives and waypoints</h2>
        <div className="bt-field">
          <label htmlFor="ng-move">Movement objective</label>
          <input id="ng-move" value={movement} onChange={(e) => { setMovement(e.target.value); }} />
        </div>
        <div className="bt-field">
          <label htmlFor="ng-destroy">Destroy objectives, separated by commas</label>
          <input id="ng-destroy" value={destroy} onChange={(e) => { setDestroy(e.target.value); }} />
        </div>
        {waypoints.map((w) => (
          <div key={w.key} className="bt-field">
            <label htmlFor={`ng-wp-${String(w.key)}`}>{`Waypoint ${String(w.key)} letter`}</label>
            <input id={`ng-wp-${String(w.key)}`} value={w.letter} onChange={(e) => { setWaypoints(waypoints.map((x) => (x.key === w.key ? { ...x, letter: e.target.value } : x))); }} />
            <label htmlFor={`ng-wpt-${String(w.key)}`}>{`Waypoint ${String(w.key)} turn on the track`}</label>
            <input id={`ng-wpt-${String(w.key)}`} inputMode="numeric" value={w.turn} onChange={(e) => { setWaypoints(waypoints.map((x) => (x.key === w.key ? { ...x, turn: e.target.value } : x))); }} />
            <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove waypoint ${String(w.key)}`} onClick={() => { setWaypoints(waypoints.filter((x) => x.key !== w.key)); }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { setWaypoints([...waypoints, { key: (waypoints.at(-1)?.key ?? 0) + 1, letter: "", turn: "" }]); }}>
          Add a waypoint
        </button>
      </section>

      {loaded.supports.length > 0 && (
        <section className="bt-section" aria-labelledby="ng-sup-h">
          <h2 id="ng-sup-h">Support cards in play</h2>
          {loaded.supports.map((s) => (
            <label key={s.id} className="bt-check" htmlFor={`ng-sup-${s.id}`}>
              <input id={`ng-sup-${s.id}`} type="checkbox" checked={supportIds.includes(s.id)} onChange={(e) => { setSupportIds(e.target.checked ? [...supportIds, s.id] : supportIds.filter((x) => x !== s.id)); }} />
              {`${s.name} (cost ${String(s.cost)})`}
            </label>
          ))}
        </section>
      )}

      <section className="bt-section" aria-labelledby="ng-rules-h">
        <h2 id="ng-rules-h">Rules for this game</h2>
        <label className="bt-check" htmlFor="ng-front">
          <input id="ng-front" type="checkbox" checked={rules.frontLoaded} onChange={(e) => { setRule("frontLoaded", e.target.checked); }} />
          Move unequal numbers of units the Aces way (front loaded, p. 6)
        </label>
        <label className="bt-check" htmlFor="ng-last">
          <input id="ng-last" type="checkbox" checked={rules.lastWinnerPenalty} onChange={(e) => { setRule("lastWinnerPenalty", e.target.checked); }} />
          -2 to Initiative for the winner of the last turn (p. 32)
        </label>
        <label className="bt-check" htmlFor="ng-multi">
          <input id="ng-multi" type="checkbox" checked={rules.multipleAttackRolls} onChange={(e) => { setRule("multipleAttackRolls", e.target.checked); }} />
          Multiple attack rolls
        </label>
        <label className="bt-check" htmlFor="ng-48">
          <input id="ng-48" type="checkbox" checked={rules.bigTable48} onChange={(e) => { setRule("bigTable48", e.target.checked); }} />
          A 48" table for the ideal colours
        </label>
        <div className="bt-field">
          <label htmlFor="ng-withdraw">Forced withdrawal for crippled units</label>
          <select id="ng-withdraw" value={rules.forcedWithdrawal} onChange={(e) => { setRule("forcedWithdrawal", e.target.value as AcesRules["forcedWithdrawal"]); }}>
            <option value="none">Not used</option>
            <option value="automated">Automated force only</option>
            <option value="both">Both sides</option>
          </select>
        </div>
      </section>

      <p>
        <button type="button" className="bt-button" disabled={!ready} onClick={() => void start()}>
          Start the game
        </button>
      </p>
      {!ready && <p className="bt-hint">Each side needs at least one unit.</p>}
    </div>
  );
}
