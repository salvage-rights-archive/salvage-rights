// The games in progress on the Aces home, each with Resume and Delete (Delete asks first). A game that cannot be read is listed
// with Delete only.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { openGameStorage } from "./game-storage";
import type { GameEntry, GameStorage } from "./game-storage";
import { gameHref } from "./routes";

export default function GamesInProgress() {
  const [storage, setStorage] = useState<GameStorage>();
  const [entries, setEntries] = useState<GameEntry[]>();
  const [confirming, setConfirming] = useState<GameEntry>();
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await openGameStorage();
        setStorage(s);
        setEntries(await s.list());
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const remove = async (entry: GameEntry) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(entry.id);
      setEntries(await storage.list());
      setProblem("");
      setStatus("Deleted.");
      headingRef.current?.focus();
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
    }
  };

  return (
    <section className="bt-section" aria-labelledby="aces-games-h">
      <h2 id="aces-games-h" ref={headingRef} tabIndex={-1}>
        Games in progress
      </h2>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <div role="status">{status}</div>
      {entries?.length === 0 && <p>No games saved on this device yet.</p>}
      {confirming && (
        <div role="group" aria-label="Confirm delete" className="bt-confirm">
          <p>{`Delete ${confirming.game?.name ?? "this game"}? This cannot be undone.`}</p>
          <button type="button" className="bt-button" onClick={() => void remove(confirming)}>
            Delete
          </button>
          <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={() => { setConfirming(undefined); }}>
            Keep
          </button>
        </div>
      )}
      <ul className="bt-list">
        {entries?.map((e) => (
          <li key={e.id} className="bt-row">
            <span className="bt-row__text">
              <strong>{e.game?.name ?? "A game that cannot be read"}</strong>
              <span className="bt-row__credit">{e.game ? `Turn ${String(e.game.turn)}` : (e.unreadable ?? "")}</span>
            </span>
            {e.game && (
              <Link className="bt-button" to={gameHref(e.id)} aria-label={`Resume ${e.game.name}`}>
                Resume
              </Link>
            )}
            <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${e.game?.name ?? "the game that cannot be read"}`} onClick={() => { setConfirming(e); }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
