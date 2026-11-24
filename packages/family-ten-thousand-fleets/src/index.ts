import type { FamilyManifest } from "@salvage-rights/shared";

const manifest: FamilyManifest = {
  id: "ten-thousand-fleets",
  name: "Ten Thousand Fleets",
  blurb: "Fleet battles across the kilometers.",
  accent: "patina",
  games: [
    {
      id: "ten-thousand-fleets",
      shortName: "Ten Thousand Fleets",
      fullName: "Ten Thousand Fleets",
      ready: false,
      routes: [],
    },
  ],
  unitTypes: [],
  eras: [],
  measures: ["kilometers"],
  routes: [],
  credits: {
    owner:
      "Ten Thousand Fleets is the work of David Niemitz. Setting, art and data are used with his permission. All rights reserved.",
    license: "Apache-2.0 (code)",
    notes: [],
  },
};

export default manifest;
