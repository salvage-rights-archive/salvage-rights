import type { FamilyManifest, FamilyRoute, GameManifest } from "@salvage-rights/shared";

const classicRoutes: FamilyRoute[] = [
  { path: "home", label: "Classic BattleTech", section: "workshop", load: () => import("./ui/HomePage") },
  { path: "import", label: "Import from Mordel", section: "workshop", load: () => import("./ui/ImportPage") },
  { path: "editor", label: "'Mech editor", section: "workshop", load: () => import("./ui/EditorPage") },
];

function comingSoon(id: string, shortName: string, fullName: string): GameManifest {
  return { id, shortName, fullName, ready: false, routes: [] };
}

const manifest: FamilyManifest = {
  id: "battletech",
  name: "BattleTech",
  blurb: "Armored walkers on hex maps.",
  accent: "rust",
  games: [
    { id: "classic", shortName: "Classic", fullName: "Classic BattleTech", ready: true, routes: classicRoutes },
    comingSoon("alpha-strike", "Alpha Strike", "BattleTech: Alpha Strike"),
    comingSoon("aces", "Aces", "BattleTech: Aces"),
    comingSoon("gothic", "Gothic", "BattleTech: Gothic"),
  ],
  unitTypes: [{ id: "mech", name: "BattleMech", ready: true }],
  // Left empty: the Master Unit List era list (masterunitlist.info) could not be read on 2026-11-24.
  eras: [],
  measures: ["hexes"],
  routes: [],
  credits: {
    owner:
      "BattleTech is a trademark of its owners. Salvage Rights is a fan project and is not affiliated with or endorsed by them.",
    license: "GPL-3.0-or-later",
    notes: [
      "The import from mordel.net uses the API built by MordelBlacknight.",
      "Each imported design is credited to the mordel.net member who created it.",
    ],
  },
};

export default manifest;
