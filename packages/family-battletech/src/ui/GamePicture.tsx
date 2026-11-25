import { useState } from "react";
import { AI_LABEL, GAME_ART } from "../artwork/games";

/** A game's picture for the top of its home page, with the AI label. It drops out if it cannot load. */
export default function GamePicture({ game }: { game: string }) {
  const [failed, setFailed] = useState(false);
  const art = GAME_ART[game]?.artwork;
  if (!art || failed) return null;
  return (
    <figure className="bt-game-art">
      <img
        src={art.src}
        alt={art.alt}
        width={800}
        height={600}
        onError={() => {
          setFailed(true);
        }}
      />
      <figcaption className="bt-hint">{AI_LABEL}</figcaption>
    </figure>
  );
}
