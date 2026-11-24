import type { FamilyManifest, GameManifest } from "@salvage-rights/shared";

function comingSoon(id: string, shortName: string, fullName: string): GameManifest {
  return { id, shortName, fullName, ready: false, routes: [] };
}

const manifest: FamilyManifest = {
  id: "battletech",
  name: "BattleTech",
  blurb: "Armored walkers on hex maps.",
  accent: "rust",
  games: [
    comingSoon("classic", "Classic", "Classic BattleTech"),
    comingSoon("alpha-strike", "Alpha Strike", "BattleTech: Alpha Strike"),
    comingSoon("aces", "Aces", "BattleTech: Aces"),
    comingSoon("gothic", "Gothic", "BattleTech: Gothic"),
  ],
  unitTypes: [{ id: "mech", name: "Mech", ready: false }],
  eras: [],
  measures: ["hexes"],
  routes: [],
  credits: {
    owner:
      "BattleTech is a trademark of its owners. Salvage Rights is a fan project and is not affiliated with or endorsed by them.",
    license: "GPL-3.0-or-later",
    notes: [],
  },
};

export default manifest;
