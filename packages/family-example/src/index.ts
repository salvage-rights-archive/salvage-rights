import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
import artwork from "./artwork.svg";

const playRoute: FamilyRoute = {
  path: "play",
  label: "Play",
  section: "play",
  load: () => import("./ExamplePage"),
};

const manifest: FamilyManifest = {
  id: "example",
  name: "Example Yard",
  blurb: "A small made-up family that exercises the shell.",
  accent: "hazard",
  artwork: {
    src: artwork,
    alt: "A yard crane lifting a crate beside a stacked crate on the ground.",
    credit: "Salvage Rights Team",
    permission: "Made for this project",
  },
  games: [
    { id: "alpha", shortName: "Alpha", fullName: "Example Yard: Alpha", ready: true, routes: [playRoute] },
    { id: "bravo", shortName: "Bravo", fullName: "Example Yard: Bravo", ready: true, routes: [playRoute] },
  ],
  unitTypes: [{ id: "crate", name: "Crate", ready: true }],
  eras: [
    { id: "early", name: "Early Yard", startYear: 2100, endYear: 2200 },
    {
      id: "late",
      name: "Late Yard",
      startYear: 2201,
      endYear: 2300,
      subEras: [{ id: "late-rust", name: "Rust Years", startYear: 2250, endYear: 2300 }],
    },
  ],
  measures: ["inches"],
  routes: [],
  credits: {
    owner: "Salvage Rights Team",
    license: "Apache-2.0",
    notes: ["Artwork and text made for this project."],
  },
};

export default manifest;
