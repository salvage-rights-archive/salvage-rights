import type { FamilyManifest, Settings } from "@salvage-rights/shared";
import { listedGames } from "@salvage-rights/shared";
import { FamilyTile } from "./FamilyTile";

/** One tile per shown family, in the layout that `tileLayout` chose. */
export function TileGrid({
  families,
  settings,
  layout,
}: {
  families: FamilyManifest[];
  settings: Settings;
  layout: "single" | "grid";
}) {
  return (
    <div className="sr-tiles" data-size={layout}>
      {families.map((family) => (
        <FamilyTile
          key={family.id}
          family={family}
          games={listedGames(family, settings)}
          soon={family.games.filter((game) => !game.ready && game.icon !== undefined)}
          size={layout}
        />
      ))}
    </div>
  );
}
