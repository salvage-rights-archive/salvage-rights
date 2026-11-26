// The Aces home: four doors. The cards, games and campaigns doors open; the rules reference is not ready yet.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import quartermaster from "../../artwork/aces-empty-quartermaster.jpg";
import GamePicture from "../GamePicture";
import { STORAGE_READ_FAILED } from "../storage";
import GamesInProgress from "./GamesInProgress";
import { ACES_CAMPAIGNS, ACES_CARDS, ACES_NEW_GAME } from "./routes";
import { openCampaignStorage } from "./campaign-storage";
import { openAcesStorage } from "./storage";
import "./aces.scss";

export default function AcesHomePage() {
  const [cards, setCards] = useState<number>();
  const [campaigns, setCampaigns] = useState<number>();
  const [problem, setProblem] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAcesStorage();
        setCards((await s.list(["aces-card"])).length);
        setCampaigns((await (await openCampaignStorage()).list()).length);
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
      {cards === 0 && campaigns === 0 && (
        <div className="bt-empty">
          {/* Terms: ../../artwork/NOTICE.md. */}
          <img
            src={quartermaster}
            alt="A weary quartermaster in grease-stained coveralls checking a lit clipboard beside a workbench of tagged salvaged parts, while mechanics with torches strip a battered walking war machine next to a round dropship in a dusty hangar."
            width={1200}
            height={670}
          />
          <p className="bt-hint">Picture: AI-generated image (creen.ai), made by the Salvage Rights team.</p>
        </div>
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
            <span className="bt-row__credit">Start, open, export and import your campaigns.</span>
          </span>
          <Link className="bt-button" to={ACES_CAMPAIGNS}>
            Open my campaigns
          </Link>
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
