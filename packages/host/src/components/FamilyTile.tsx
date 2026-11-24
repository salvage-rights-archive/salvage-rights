import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { FamilyManifest, GameManifest } from "@salvage-rights/shared";

function firstPath(family: FamilyManifest, game: GameManifest): string | null {
  const first = game.routes[0];
  return first ? `/${family.id}/${game.id}/${first.path}` : null;
}

export function FamilyTile({
  family,
  games,
  size,
}: {
  family: FamilyManifest;
  games: GameManifest[];
  size: "grid" | "single";
}) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const artwork = size === "single" && !artworkFailed ? family.artwork : undefined;

  const text = (
    <div className="sr-tile__text">
      <h3 className="sr-tile__name">{family.name}</h3>
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

  const only = games.length === 1 ? games[0] : undefined;
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
        {picture}
        <div className="sr-tile__panel">
          {text}
          {footer}
        </div>
      </>
    );
  }

  if (onlyPath !== null) {
    return (
      <Link {...common} to={onlyPath}>
        {body(<span className="sr-tile__open">Open &rarr;</span>)}
      </Link>
    );
  }

  return (
    <div {...common}>
      {body(
        <ul className="sr-tile__games">
          {games.map((game) => {
            const path = firstPath(family, game);
            return (
              <li key={game.id}>
                {path === null ? (
                  <span className="sr-tile__game">{game.shortName}</span>
                ) : (
                  <Link className="sr-tile__game" to={path}>
                    {game.shortName}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>,
      )}
    </div>
  );
}
