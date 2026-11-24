import type { FamilyManifest, Settings } from "@salvage-rights/shared";
import { listedGames } from "@salvage-rights/shared";
import { FamilyTile } from "./FamilyTile";

/** One tile per shown family. A lone family gets the large single layout. */
export function TileGrid({ families, settings }: { families: FamilyManifest[]; settings: Settings }) {
  const size = families.length === 1 ? "single" : "grid";
  return (
    <div className="sr-tiles" data-size={size}>
      {families.map((family) => (
        <FamilyTile key={family.id} family={family} games={listedGames(family, settings)} size={size} />
      ))}
    </div>
  );
}
