import type { FamilyManifest, FamilyRoute, GameManifest } from "@salvage-rights/shared";
import { EDITIONS, ERAS } from "./data/editions";
import { FAMILY_ART, GAME_ART } from "./artwork/games";

const classicRoutes: FamilyRoute[] = [
  { path: "home", label: "Classic BattleTech", section: "workshop", load: () => import("./ui/HomePage") },
  { path: "import", label: "Import from Mordel", section: "workshop", load: () => import("./ui/ImportPage") },
  { path: "editor", label: "'Mech editor", section: "workshop", load: () => import("./ui/EditorPage") },
  { path: "sheet", label: "Record sheet", section: "workshop", load: () => import("./ui/SheetPage") },
];

const alphaStrikeRoutes: FamilyRoute[] = [
  { path: "home", label: "Alpha Strike", section: "workshop", load: () => import("./ui/as/AsHomePage") },
  { path: "unit", label: "Alpha Strike unit", section: "workshop", load: () => import("./ui/as/AsUnitPage") },
  { path: "force", label: "Alpha Strike force", section: "workshop", load: () => import("./ui/as/AsForcePage") },
];

// Aces is not ready, and the host serves only a ready game's own routes, so its pages sit under family routes of their own until
// ACES-9 (see ui/aces/routes.ts). They are reachable by address and from the Alpha Strike home.
const acesPreviewRoutes: FamilyRoute[] = [
  { path: "aces-preview/home", label: "Aces", section: "workshop", load: () => import("./ui/aces/AcesHomePage") },
  { path: "aces-preview/cards", label: "Aces cards", section: "workshop", load: () => import("./ui/aces/CardLibraryPage") },
  { path: "aces-preview/card", label: "Aces card", section: "workshop", load: () => import("./ui/aces/CardEditorPage") },
  { path: "aces-preview/command", label: "Aces command card", section: "workshop", load: () => import("./ui/aces/CommandEditorPage") },
  { path: "aces-preview/order", label: "Aces special order", section: "workshop", load: () => import("./ui/aces/OrderEditor") },
  { path: "aces-preview/support", label: "Aces support card", section: "workshop", load: () => import("./ui/aces/SupportEditor") },
  { path: "aces-preview/new-game", label: "New Aces game", section: "workshop", load: () => import("./ui/aces/NewGamePage") },
  { path: "aces-preview/game", label: "Aces game", section: "workshop", load: () => import("./ui/aces/GamePage") },
  { path: "aces-preview/after", label: "Aces after-sortie steps", section: "workshop", load: () => import("./ui/aces/AfterSortiePage") },
  { path: "aces-preview/sortie", label: "Aces sortie", section: "workshop", load: () => import("./ui/aces/SortiePage") },
];

// Gothic's pages are written as the game's own routes. The host serves them only once the game is ready (G-9), so until then they are
// also reachable as family routes under gothic-preview, where `gameBase` (data/rulesets.ts) sends every link.
const gothicRoutes: FamilyRoute[] = [
  { path: "home", label: "BattleTech: Gothic", section: "workshop", load: () => import("./ui/gothic/GothicHomePage") },
  { path: "editor", label: "Gothic 'Mech editor", section: "workshop", load: () => import("./ui/EditorPage") },
  { path: "sheet", label: "Gothic record sheet", section: "workshop", load: () => import("./ui/SheetPage") },
];
const gothicPreviewRoutes: FamilyRoute[] = gothicRoutes.map((route) => ({ ...route, path: `gothic-preview/${route.path}` }));

function comingSoon(id: string, shortName: string, fullName: string): GameManifest {
  return { id, shortName, fullName, ready: false, routes: [], ...GAME_ART[id] };
}

const manifest: FamilyManifest = {
  id: "battletech",
  name: "BattleTech",
  blurb: "Armored walkers on hex maps.",
  accent: "rust",
  // Terms and source: ./artwork/NOTICE.md.
  artwork: FAMILY_ART,
  games: [
    { id: "classic", shortName: "Classic", fullName: "Classic BattleTech", ready: true, routes: classicRoutes, ...GAME_ART["classic"] },
    { id: "alpha-strike", shortName: "Alpha Strike", fullName: "BattleTech: Alpha Strike", ready: true, routes: alphaStrikeRoutes, ...GAME_ART["alpha-strike"] },
    comingSoon("aces", "Aces", "BattleTech: Aces"),
    comingSoon("aerotech", "AeroTech", "BattleTech: AeroTech"),
    { id: "gothic", shortName: "Gothic", fullName: "BattleTech: Gothic", ready: false, routes: gothicRoutes, ...GAME_ART["gothic"] },
  ],
  unitTypes: (EDITIONS[0]?.unitTypes ?? []).filter((unit) => unit.ready), // the types the edition can build (data/editions.ts)
  eras: ERAS, // the Master Unit List's twelve (data/editions.ts)
  measures: ["hexes"],
  routes: [...acesPreviewRoutes, ...gothicPreviewRoutes],
  credits: {
    owner:
      // The non-affiliation notice fan projects for this game commonly carry, word for word, then two lines of our own.
      "BattleTech, 'Mech, BattleMech, and MechWarrior are registered trademarks and/or trademarks of The Topps Company, Inc. " +
      "in the United States and/or other countries. " +
      "Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of InMediaRes Productions, LLC. " +
      "This is an unofficial, non-commercial fan project and is not affiliated with or endorsed by Topps or Catalyst Game Labs. " +
      "The BattleTech name for electronic games is a trademark of Microsoft Corporation, which has not endorsed this project either. " +
      "BattleTech game material is copyright The Topps Company, Inc. All rights reserved.",
    license: "GPL-3.0-or-later",
    notes: [
      "The import from mordel.net uses the API built by MordelBlacknight.",
      "Each imported design is credited to the mordel.net member who created it. The Alpha Strike values we read from mordel.net are shown as Mordel gives them, with the same credit.",
      "The Classic BattleTech section (the import, the editor and the rules checks) was made by the Salvage Rights team.",
      "The Alpha Strike roster (unit entry, saving and unit files) was made by the Salvage Rights team.",
      "\"Verified Standard Rules Compliant\" means only that our own rules check, against the rulebooks we cite, found nothing wrong with a Standard-level 'Mech; tournament organisers have the final word. \"OFFICIAL\" is what the player states about a Classic design, and it turns off when the design is changed. For Alpha Strike it depends only on the Master Unit List: a unit imported from the list and not changed is OFFICIAL, and every other unit is NOT OFFICIAL.",
      "The pictures on the BattleTech tile and for each game were generated with an AI image tool (DeviantArt DreamUp); the picture shown on the Classic BattleTech page when no 'Mech is saved was generated with another (Nano Banana 2). We would rather show work made by a person. If you are an artist, or hold the rights to a piece, and can let us use it legally, we will gladly replace any AI-generated art here and credit you. To offer a piece, start a thread in Discussions on our GitHub repository (https://github.com/salvage-rights-archive/salvage-rights/discussions), or open an issue there.",
    ],
  },
};

export default manifest;
