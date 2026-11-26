import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
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
  { path: "aids", label: "Alpha Strike play aids", section: "workshop", load: () => import("./ui/as/AsAidsPage") },
];

// Aces's own routes, under /battletech/aces (ui/aces/routes.ts builds every link from the same base).
const acesRoutes: FamilyRoute[] = [
  { path: "home", label: "Aces", section: "workshop", load: () => import("./ui/aces/AcesHomePage") },
  { path: "cards", label: "Aces cards", section: "workshop", load: () => import("./ui/aces/CardLibraryPage") },
  { path: "card", label: "Aces card", section: "workshop", load: () => import("./ui/aces/CardEditorPage") },
  { path: "command", label: "Aces command card", section: "workshop", load: () => import("./ui/aces/CommandEditorPage") },
  { path: "order", label: "Aces special order", section: "workshop", load: () => import("./ui/aces/OrderEditor") },
  { path: "support", label: "Aces support card", section: "workshop", load: () => import("./ui/aces/SupportEditor") },
  { path: "new-game", label: "New Aces game", section: "workshop", load: () => import("./ui/aces/NewGamePage") },
  { path: "game", label: "Aces game", section: "workshop", load: () => import("./ui/aces/GamePage") },
  { path: "after", label: "Aces after-sortie steps", section: "workshop", load: () => import("./ui/aces/AfterSortiePage") },
  { path: "sortie", label: "Aces sortie", section: "workshop", load: () => import("./ui/aces/SortiePage") },
  { path: "campaigns", label: "Aces campaigns", section: "workshop", load: () => import("./ui/aces/CampaignsPage") },
  { path: "campaign", label: "Aces campaign", section: "workshop", load: () => import("./ui/aces/CampaignPage") },
];

// Gothic's pages are the game's own routes (every link is built from `GOTHIC_BASE`, data/rulesets.ts). One route to a line, so a later
// piece adds its own line without touching its neighbours.
const gothicRoutes: FamilyRoute[] = [
  { path: "home", label: "BattleTech: Gothic", section: "workshop", load: () => import("./ui/gothic/GothicHomePage") },
  { path: "editor", label: "Gothic 'Mech editor", section: "workshop", load: () => import("./ui/EditorPage") },
  { path: "sheet", label: "Gothic record sheet", section: "workshop", load: () => import("./ui/SheetPage") },
  { path: "abominations", label: "Gothic Abomination units", section: "workshop", load: () => import("./ui/gothic/AbominationsPage") },
  { path: "force", label: "Gothic forces", section: "workshop", load: () => import("./ui/gothic/ForcePage") },
  { path: "play", label: "Gothic Abomination tracker", section: "play", load: () => import("./ui/gothic/TrackerPage") },
  { path: "aids", label: "Gothic rules reference", section: "workshop", load: () => import("./ui/gothic/AidsPage") },
];

// AeroTech's pages are the game's own routes (the game is ready).
const aeroRoutes: FamilyRoute[] = [
  { path: "home", label: "BattleTech: AeroTech", section: "workshop", load: () => import("./ui/aero/AeroHomePage") },
  { path: "editor", label: "AeroTech unit editor", section: "workshop", load: () => import("./ui/aero/AeroEditorPage") },
  { path: "sheet", label: "AeroTech record sheet", section: "workshop", load: () => import("./ui/aero/AeroSheetPage") },
];

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
    { id: "aces", shortName: "Aces", fullName: "BattleTech: Aces", ready: true, routes: acesRoutes, ...GAME_ART["aces"] },
    { id: "aerotech", shortName: "AeroTech", fullName: "BattleTech: AeroTech", ready: true, routes: aeroRoutes, ...GAME_ART["aerotech"] },
    { id: "gothic", shortName: "Gothic", fullName: "BattleTech: Gothic", ready: true, routes: gothicRoutes, ...GAME_ART["gothic"] },
  ],
  unitTypes: (EDITIONS[0]?.unitTypes ?? []).filter((unit) => unit.ready), // the types the edition can build (data/editions.ts)
  eras: ERAS, // the Master Unit List's twelve (data/editions.ts)
  measures: ["hexes"],
  routes: [],
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
      "The BattleTech: Gothic section (the editor and rules check, Abomination units, forces, the Abomination tracker, the rules reference and record sheets) was made by the Salvage Rights team.",
      "The Alpha Strike roster (unit entry, saving and unit files) was made by the Salvage Rights team.",
      "The AeroTech section (the editor, the rules check and the fighter record sheets) was made by the Salvage Rights team. Its record sheets are drawn by us, with no logos or art, following the blank sheets the publishers mark for personal reproduction: AeroTech 2, AeroTech 2: Revised Edition and the Catalyst blank record sheets. The AeroTech (1986) sheet is our own layout. \"OFFICIAL\" on an AeroTech unit is what the player states, and it turns off when the design is changed.",
      "The Aces section (unit cards, command cards, automated units, games and campaigns) was made by the Salvage Rights team.",
      "\"Verified Standard Rules Compliant\" means only that our own rules check, against the rulebooks we cite, found nothing wrong with a Standard-level 'Mech; tournament organisers have the final word. \"OFFICIAL\" is what the player states about a Classic design, and it turns off when the design is changed. For Alpha Strike it depends only on the Master Unit List: a unit imported from the list and not changed is OFFICIAL, and every other unit is NOT OFFICIAL.",
      "The pictures on the BattleTech tile and for each game were generated with an AI image tool (DeviantArt DreamUp); the picture shown on the Classic BattleTech page when no 'Mech is saved was generated with another (Nano Banana 2). We would rather show work made by a person. If you are an artist, or hold the rights to a piece, and can let us use it legally, we will gladly replace any AI-generated art here and credit you. To offer a piece, start a thread in Discussions on our GitHub repository (https://github.com/salvage-rights-archive/salvage-rights/discussions), or open an issue there.",
    ],
  },
};

export default manifest;
