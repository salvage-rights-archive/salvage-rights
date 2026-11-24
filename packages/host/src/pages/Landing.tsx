import { Link } from "react-router";
import type { FamilyManifest } from "@salvage-rights/shared";
import { listedGames, shownFamilies, tileLayout } from "@salvage-rights/shared";
import { TileGrid } from "../components/TileGrid";
import { useSettings } from "../settings-context";

const OPTIONS = [
  { name: "Workshop", text: "Build units under each game's own construction rules, with every step shown and cited." },
  {
    name: "Play",
    text: "Run a game at the table with two or more players, or play solo with the app running the other side.",
  },
  {
    name: "Archive",
    text: "Read the catalogs: units, equipment and rules by era and edition, with canon and homebrew kept apart.",
  },
];

export function Landing({ families }: { families: FamilyManifest[] }) {
  const { settings, loaded } = useSettings();
  const layout = tileLayout(families, settings);
  const shown = shownFamilies(families, settings);
  const only = shown.length === 1 ? shown[0] : undefined;
  let gamesHeading = "Games";
  if (layout === "grid") gamesHeading = "Choose your games";
  if (layout === "single") gamesHeading = only && listedGames(only, settings).length === 1 ? "Your game" : "Your games";

  return (
    <div className="sr-landing">
      <section className="sr-landing__who">
        <p className="sr-landing__tag">WHO WE ARE</p>
        <h1>Archaeology for mecha tabletop games.</h1>
        <p className="sr-landing__lead">
          We dig up the units, equipment and rules of mecha games, edition by edition, so they are not lost. Then we
          give you the tools to build with them and play them, on whatever you have in your hand.
        </p>
        <p className="sr-landing__note">
          Free and open source. Your data stays on your device. These tools are built with AI assistance.
        </p>
      </section>

      <section className="sr-landing__section" aria-labelledby="options-heading">
        <h2 id="options-heading">What you can do here</h2>
        <div className="sr-options">
          {OPTIONS.map((option) => (
            <div key={option.name} className="sr-option">
              <h3>{option.name}</h3>
              <p>{option.text}</p>
            </div>
          ))}
        </div>
      </section>

      {loaded && (
        <section className="sr-landing__section" aria-labelledby="games-heading">
          <h2 id="games-heading">{gamesHeading}</h2>
          {layout === "none-ready" && <p>The first game is on its way. There is nothing to open yet.</p>}
          {layout === "all-hidden" && (
            <p>
              You have hidden every game. <Link to="/settings">Choose games in Settings</Link>
            </p>
          )}
          {(layout === "single" || layout === "grid") && (
            <TileGrid families={shown} settings={settings} layout={layout} />
          )}
        </section>
      )}
    </div>
  );
}
