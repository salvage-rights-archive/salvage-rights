import type { FamilyManifest, GameManifest } from "./family";
import type { Settings } from "./settings";

export type TileLayout = "none-ready" | "all-hidden" | "single" | "grid";

/** Games of a family that are ready and not hidden, in manifest order. */
export function listedGames(family: FamilyManifest, settings: Settings): GameManifest[] {
  return family.games.filter((game) => game.ready && !settings.hiddenGames.includes(`${family.id}/${game.id}`));
}

/** Families that are not hidden and still list at least one game, in input order. */
export function shownFamilies(families: FamilyManifest[], settings: Settings): FamilyManifest[] {
  return families.filter(
    (family) => !settings.hiddenFamilies.includes(family.id) && listedGames(family, settings).length > 0,
  );
}

/** Families with at least one ready game, ignoring settings. */
export function openableFamilies(families: FamilyManifest[]): FamilyManifest[] {
  return families.filter((family) => family.games.some((game) => game.ready));
}

export function tileLayout(families: FamilyManifest[], settings: Settings): TileLayout {
  if (openableFamilies(families).length === 0) return "none-ready";
  const shown = shownFamilies(families, settings).length;
  if (shown === 0) return "all-hidden";
  return shown === 1 ? "single" : "grid";
}
