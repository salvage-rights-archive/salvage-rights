// The Aces home: four doors. Only the cards door opens so far; games in progress will be listed here when play arrives.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import GamePicture from "../GamePicture";
import { STORAGE_READ_FAILED } from "../storage";
import GamesInProgress from "./GamesInProgress";
import { ACES_CARDS, ACES_NEW_GAME } from "./routes";
import { openAcesStorage } from "./storage";
import "./styles";

export default function AcesHomePage() {
  const [cards, setCards] = useState<number>();
  const [problem, setProblem] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAcesStorage();
        setCards((await s.list(["aces-card"])).length);
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  return (
    <div className="sr-page">
      <h1>Aces</h1>
      <GamePicture game="aces" />
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {cards === 0 && (
        <p>
          Record your Aces cards to play against them. <Link to={ACES_CARDS}>Start with your cards.</Link>
        </p>
      )}
      <ul className="bt-list aces-doors">
        <li className="bt-row">
          <span className="bt-row__text">
            <strong>My cards</strong>
            <span className="bt-row__credit">{cards === undefined || cards === 0 ? "Record the cards you own, in our words." : `${String(cards)} behaviour ${cards === 1 ? "card" : "cards"} recorded.`}</span>
          </span>
          <Link className="bt-button" to={ACES_CARDS}>
            Open my cards
          </Link>
        </li>
        <li className="bt-row">
          <span className="bt-row__text">
            <strong>Play a game</strong>
            <span className="bt-row__credit">Set up a game from two Alpha Strike forces.</span>
          </span>
          <Link className="bt-button" to={ACES_NEW_GAME}>
            Set up a game
          </Link>
        </li>
        <li className="bt-row">
          <span className="bt-row__text">
            <strong>Campaigns</strong>
            <span className="bt-row__credit">Not ready yet.</span>
          </span>
        </li>
        <li className="bt-row">
          <span className="bt-row__text">
            <strong>Rules reference</strong>
            <span className="bt-row__credit">Not ready yet.</span>
          </span>
        </li>
      </ul>
      <GamesInProgress />
    </div>
  );
}
