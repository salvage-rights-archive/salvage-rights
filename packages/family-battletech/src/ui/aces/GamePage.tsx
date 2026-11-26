// A saved game's setup as it stands. The table screen (Initiative, Movement, Combat, End Phase) is built next and replaces this page.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { AcesGame } from "../../rules/aces-game";
import { STORAGE_READ_FAILED } from "../storage";
import { openGameStorage } from "./game-storage";
import { ACES_HOME } from "./routes";
import "./styles";

type Loaded = { state: "loading" } | { state: "failed" } | { state: "missing" } | { state: "unreadable"; message: string } | { state: "ready"; game: AcesGame };

export default function GamePage() {
  const id = useSearchParams()[0].get("id");
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const entry = id ? await (await openGameStorage()).get(id) : undefined;
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.game) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", game: entry.game });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

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
  return (
    <div className="sr-page">
      <h1>{game.name}</h1>
      <p>
        <Link to={ACES_HOME}>Back to Aces</Link>
      </p>
      <p role="status">{`Turn ${String(game.turn)}, set up and waiting to start. Playing the turns is not ready yet.`}</p>
      {(["player", "automated"] as const).map((side) => (
        <section key={side} className="bt-section" aria-labelledby={`g-${side}`}>
          <h2 id={`g-${side}`}>{side === "player" ? "Your force" : "Automated force"}</h2>
          <ul className="bt-list">
            {game.sides[side].units.map((u) => (
              <li key={u.id} className="bt-row">
                <span className="bt-row__text">
                  <strong>{u.name}</strong>
                  {` Skill ${String(u.skill)}, PV ${String(u.pv)}`}
                  {game.sides[side].commanderUnitId === u.id ? ", force commander" : ""}
                </span>
                <span className="bt-row__credit">{u.deck ? `Deck: ${u.deck}` : "No deck"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
