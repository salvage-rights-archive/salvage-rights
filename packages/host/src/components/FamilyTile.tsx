import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { FamilyManifest, GameManifest } from "@salvage-rights/shared";

function firstPath(family: FamilyManifest, game: GameManifest): string | null {
  const first = game.routes[0];
  return first ? `/${family.id}/${game.id}/${first.path}` : null;
}

/** A decorative square picture beside a game's name; it drops out if it cannot load. */
function GameIcon({ src }: { src: string | undefined }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className="sr-tile__icon"
      src={src}
      alt=""
      width={40}
      height={40}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

/**
 * A game that is not ready yet: a row the same size as a game link, with its icon and its name marked coming soon. Its picture
 * waits for its own home page, so the games you can play stay the biggest things on the tile.
 */
function SoonGame({ game }: { game: GameManifest }) {
  return (
    <li className="sr-tile__soon">
      <GameIcon src={game.icon} />
      <span>
        {game.shortName}
        <span className="sr-tile__soon-mark"> (coming soon)</span>
      </span>
    </li>
  );
}

export function FamilyTile({
  family,
  games,
  soon = [],
  size,
}: {
  family: FamilyManifest;
  games: GameManifest[];
  /** Games that are not ready yet and have an icon: listed after the ready ones, marked coming soon. */
  soon?: GameManifest[];
  size: "grid" | "single";
}) {
  const nameId = useId();
  const [artworkFailed, setArtworkFailed] = useState(false);
  const artwork = size === "single" && !artworkFailed ? family.artwork : undefined;

  const text = (
    <div className="sr-tile__text">
      <h3 id={nameId} className="sr-tile__name">
        {family.name}
      </h3>
      <p className="sr-tile__blurb">{family.blurb}</p>
    </div>
  );
  const picture = artwork && (
    <div className="sr-tile__art">
      <img
        src={artwork.src}
        alt={artwork.alt}
        width={800}
        height={600}
        onError={() => {
          setArtworkFailed(true);
        }}
      />
      <p className="sr-tile__credit">Artwork: {artwork.credit}</p>
    </div>
  );

  const only = games.length === 1 && soon.length === 0 ? games[0] : undefined;
  const onlyPath = only ? firstPath(family, only) : null;
  const common = {
    "data-testid": "family-tile",
    "data-size": size,
    "data-accent": family.accent,
    className: "sr-tile",
  };

  function body(footer: ReactNode) {
    return (
      <>
        <div className="sr-tile__panel">
          {text}
          {footer}
        </div>
        {picture}
      </>
    );
  }

  if (onlyPath !== null) {
    return (
      // No aria-labelledby: the link's name is its own content (WCAG 2.5.3, Label in Name), so every word that is
      // visible on the tile is part of the name.
      <Link {...common} to={onlyPath}>
        {body(
          <span className="sr-tile__open" aria-hidden="true">
            Open &rarr;
          </span>,
        )}
      </Link>
    );
  }

  return (
    <div {...common}>
      {body(
        <ul className="sr-tile__games" aria-labelledby={nameId}>
          {games.map((game) => {
            const path = firstPath(family, game);
            // A listed game always has a route (the manifest check requires one); no route, no entry.
            return path === null ? null : (
              <li key={game.id}>
                <Link className="sr-tile__game" to={path} aria-label={`${game.shortName}, ${family.name}`}>
                  <GameIcon src={game.icon} />
                  {game.shortName}
                </Link>
              </li>
            );
          })}
          {soon.map((game) => (
            <SoonGame key={game.id} game={game} />
          ))}
        </ul>,
      )}
    </div>
  );
}
