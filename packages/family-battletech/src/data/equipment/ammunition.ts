// Ammunition for the weapons in weapons.ts. A bin is one ton in one critical slot (printed p. 57); machine guns may also
// carry a half-ton bin, which still takes one slot. Years are the Heavy Weapon Ammunition table, printed pp. 294-296
// (read against the page image); the cite names p. 57, where the weight and slots come from. Where that table prints a
// dash for the Clan introduction the Clan row takes the introduction year of its Clan weapon and is marked
// `yearsInferred` (one convention, applied everywhere; see weapons.ts). The Narc and iNarc rows use the launcher lines of
// the p. 291-292 table, which carry the same Inner Sphere years as the p. 296 ammunition lines.
// Special munitions are one row per munition and launcher family, as the table lists them (Artemis-capable and the others
// for LRM, SRM or MML; Inferno, Harpoon and Tear Gas for SRM; Swarm and the Thunder variants for LRM). Not tabulated:
// torpedoes (the book calls them maritime-only, almost never seen on BattleMechs), multi-purpose missiles (Clan battle
// armor suits) and remote sensor dispenser ammunition (p. 296 gives a date but the Heavy Weapon Ammunition table has no
// tech base line for it). The Narc and iNarc pods are lines of the p. 346 table (Inner Sphere), dated on p. 296; nail and
// rivet gun ammunition is that table's Inner Sphere / Clan line, p. 296 giving pre-spaceflight.
// `shots` is the shots one ton carries, from the Ammo column of the weapons tables (printed pp. 341, 343, 344: 200 for the light
// and standard machine gun, 100 for the heavy, 300 for the nail/rivet gun); a half-ton row carries half as many. Only the
// families that come in two bin sizes have it; the importer uses it to tell the bins apart.

import type { EquipmentGroup } from "../../rules/catalog";

const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";

export const AMMUNITION: EquipmentGroup[] = [
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1 },
    items: [
      // Autocannon ammunition (Inner Sphere)
      { id: "ammo-ac-2-is", games: ["classic", "gothic"], name: "Autocannon/2 Ammo", aliases: ["AC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 2300 }], prototypeYear: 2290, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ac-5-is", games: ["classic", "gothic"], name: "Autocannon/5 Ammo", aliases: ["AC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2250 }], prototypeYear: 2240, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ac-10-is", games: ["classic", "gothic"], name: "Autocannon/10 Ammo", aliases: ["AC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 2460 }], prototypeYear: 2443, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ac-20-is", games: ["classic", "gothic"], name: "Autocannon/20 Ammo", aliases: ["AC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 2500 }], prototypeYear: 2488, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-2-x-is", name: "LB 2-X AC Ammo", aliases: ["LB 2-X Ammo"], shotsPerTon: 45, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-2-x-cluster-is", name: "LB 2-X AC Cluster Ammo", aliases: ["LB 2-X Cluster Ammo"], shotsPerTon: 45, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-5-x-is", name: "LB 5-X AC Ammo", aliases: ["LB 5-X Ammo"], shotsPerTon: 20, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-5-x-cluster-is", name: "LB 5-X AC Cluster Ammo", aliases: ["LB 5-X Cluster Ammo"], shotsPerTon: 20, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-10-x-is", name: "LB 10-X AC Ammo", aliases: ["LB 10-X Ammo"], shotsPerTon: 10, availability: [{ from: 2595, to: 2840 }, { from: 3035 }], prototypeYear: 2590, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-10-x-cluster-is", name: "LB 10-X AC Cluster Ammo", aliases: ["LB 10-X Cluster Ammo"], shotsPerTon: 10, availability: [{ from: 2595, to: 2840 }, { from: 3035 }], prototypeYear: 2590, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-20-x-is", name: "LB 20-X AC Ammo", aliases: ["LB 20-X Ammo"], shotsPerTon: 5, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-20-x-cluster-is", name: "LB 20-X AC Cluster Ammo", aliases: ["LB 20-X Cluster Ammo"], shotsPerTon: 5, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-ac-2-is", name: "Light AC/2 Ammo", aliases: ["LAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3068 }], prototypeYear: 3062, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-ac-5-is", name: "Light AC/5 Ammo", aliases: ["LAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 3068 }], prototypeYear: 3062, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-rotary-ac-2-is", name: "Rotary AC/2 Ammo", aliases: ["RAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3062 }], prototypeYear: 3060, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-rotary-ac-5-is", name: "Rotary AC/5 Ammo", aliases: ["RAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 3062 }], prototypeYear: 3060, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-2-is", name: "Ultra AC/2 Ammo", aliases: ["UAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3057 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-5-is", name: "Ultra AC/5 Ammo", aliases: ["UAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2640, to: 2915 }, { from: 3035 }], prototypeYear: 2635, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-10-is", name: "Ultra AC/10 Ammo", aliases: ["UAC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 3057 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-20-is", name: "Ultra AC/20 Ammo", aliases: ["UAC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 3060 }], prototypeYear: 3057, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-armor-piercing-is", name: "Armor-Piercing Autocannon Ammo", availability: [{ from: 3059 }] },
      { id: "ammo-flechette-is", name: "Flechette Autocannon Ammo", availability: [{ from: 3055 }] },
      { id: "ammo-precision-is", name: "Precision Autocannon Ammo", availability: [{ from: 3062 }] },
      // Gauss, machine gun, flamer and plasma ammunition (Inner Sphere)
      { id: "ammo-light-gauss-rifle-is", name: "Light Gauss Rifle Ammo", shotsPerTon: 16, availability: [{ from: 3056 }], prototypeYear: 3049, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-gauss-rifle-is", name: "Gauss Rifle Ammo", shotsPerTon: 8, availability: [{ from: 2590, to: 2865 }, { from: 3040 }], prototypeYear: 2587, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-heavy-gauss-rifle-is", name: "Heavy Gauss Rifle Ammo", shotsPerTon: 4, availability: [{ from: 3061 }], prototypeYear: 3051, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-machine-gun-is", games: ["classic", "gothic"], shots: 200, name: "Light Machine Gun Ammo", availability: [{ from: 3068 }], prototypeYear: 3064, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-machine-gun-half-is", shots: 100, name: "Light Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3068 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-machine-gun-is", games: ["classic", "gothic"], shots: 200, name: "Machine Gun Ammo", availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-machine-gun-half-is", shots: 100, name: "Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-heavy-machine-gun-is", games: ["classic", "gothic"], shots: 100, name: "Heavy Machine Gun Ammo", availability: [{ from: 3068 }], prototypeYear: 3063, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-heavy-machine-gun-half-is", shots: 50, name: "Heavy Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3068 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-vehicle-flamer-is", name: "Flamer (Vehicle) Ammo", aliases: ["Vehicle Flamer Ammo"], shotsPerTon: 20, availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-plasma-rifle-is", name: "Plasma Rifle Ammo", shotsPerTon: 10, availability: [{ from: 3068 }], prototypeYear: 3061, units: ["mech", "industrialmech", "vehicle"] },
      // Missile ammunition (Inner Sphere)
      { id: "ammo-lrm-5-is", games: ["classic", "gothic"], name: "LRM 5 Ammo", shotsPerTon: 24, availability: [{ from: 2300 }], prototypeYear: 2295, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-10-is", games: ["classic", "gothic"], name: "LRM 10 Ammo", shotsPerTon: 12, availability: [{ from: 2300 }], prototypeYear: 2295, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-15-is", games: ["classic", "gothic"], name: "LRM 15 Ammo", shotsPerTon: 8, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-20-is", games: ["classic", "gothic"], name: "LRM 20 Ammo", shotsPerTon: 6, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-3-lrm-is", name: "MML 3 LRM Ammo", shotsPerTon: 40, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-3-srm-is", name: "MML 3 SRM Ammo", shotsPerTon: 33, availability: [{ from: 2370 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-5-lrm-is", name: "MML 5 LRM Ammo", shotsPerTon: 24, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-5-srm-is", name: "MML 5 SRM Ammo", shotsPerTon: 20, availability: [{ from: 2370 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-7-lrm-is", name: "MML 7 LRM Ammo", shotsPerTon: 17, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-7-srm-is", name: "MML 7 SRM Ammo", shotsPerTon: 14, availability: [{ from: 2370 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-9-lrm-is", name: "MML 9 LRM Ammo", shotsPerTon: 13, availability: [{ from: 2300 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mml-9-srm-is", name: "MML 9 SRM Ammo", shotsPerTon: 11, availability: [{ from: 2370 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-2-is", games: ["classic", "gothic"], name: "SRM 2 Ammo", shotsPerTon: 50, availability: [{ from: 2370 }], prototypeYear: 2365, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-4-is", games: ["classic", "gothic"], name: "SRM 4 Ammo", shotsPerTon: 25, availability: [{ from: 2370 }], prototypeYear: 2365, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-6-is", games: ["classic", "gothic"], name: "SRM 6 Ammo", shotsPerTon: 15, availability: [{ from: 2370 }], prototypeYear: 2365, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mrm-10-is", name: "MRM 10 Ammo", shotsPerTon: 24, availability: [{ from: 3058 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mrm-20-is", name: "MRM 20 Ammo", shotsPerTon: 12, availability: [{ from: 3058 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mrm-30-is", name: "MRM 30 Ammo", shotsPerTon: 8, availability: [{ from: 3058 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-mrm-40-is", name: "MRM 40 Ammo", shotsPerTon: 6, availability: [{ from: 3058 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-2-is", name: "Streak SRM 2 Ammo", aliases: ["Streak-2 Ammo"], shotsPerTon: 50, availability: [{ from: 2647, to: 2845 }, { from: 3035 }], prototypeYear: 2645, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-4-is", name: "Streak SRM 4 Ammo", aliases: ["Streak-4 Ammo"], shotsPerTon: 25, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-6-is", name: "Streak SRM 6 Ammo", aliases: ["Streak-6 Ammo"], shotsPerTon: 15, availability: [{ from: 3058 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      // Anti-missile and Narc ammunition (Inner Sphere); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-ams-is", name: "Anti-Missile System Ammo", aliases: ["AMS Ammo"], shotsPerTon: 12, availability: [{ from: 2617, to: 2796 }, { from: 3040 }], prototypeYear: 2613, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-narc-missile-beacon-is", name: "Narc Missile Beacon Ammo", aliases: ["Narc Ammo"], shotsPerTon: 6, availability: [{ from: 2587, to: 2795 }, { from: 3035 }], prototypeYear: 2580, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-narc-launcher-is", name: "Improved Narc Launcher Ammo", aliases: ["iNarc Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }], prototypeYear: 3054, units: ["mech", "industrialmech", "vehicle"] },
      // Special munitions (Inner Sphere)
      { id: "ammo-artemis-capable-is", feeds: ["lrm", "srm", "mml"], name: "Artemis-Capable Missile Ammo", availability: [{ from: 2598, to: 2855 }, { from: 3035 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-narc-capable-is", feeds: ["lrm", "srm", "mml"], name: "Narc-Capable Missile Ammo", availability: [{ from: 2597, to: 2795 }, { from: 3035 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-fragmentation-is", feeds: ["lrm", "srm", "mml"], name: "Fragmentation Missile Ammo", availability: [{ from: 2385, to: 2810 }, { from: 3050 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-harpoon-is", feeds: ["srm"], name: "Harpoon SRM Ammo", availability: [{ from: 2400 }], prototypeYear: 2395, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-inferno-is", feeds: ["srm"], name: "Inferno SRM Ammo", availability: [{ from: 2380 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-tear-gas-is", feeds: ["srm"], name: "Tear Gas SRM Ammo", availability: [{ from: 2375 }], prototypeYear: 2370, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-semi-guided-is", feeds: ["lrm"], name: "Semi-Guided LRM Ammo", availability: [{ from: 3057 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-swarm-is", feeds: ["lrm"], name: "Swarm LRM Ammo", availability: [{ from: 2621, to: 2833 }, { from: 3053 }], prototypeYear: 2615, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-swarm-i-is", feeds: ["lrm"], name: "Swarm-I LRM Ammo", availability: [{ from: 3057 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-is", feeds: ["lrm"], name: "Thunder LRM Ammo", availability: [{ from: 2620, to: 2840 }, { from: 3052 }], prototypeYear: 2618, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-augmented-is", feeds: ["lrm"], shotsFactor: 0.5, name: "Thunder-Augmented LRM Ammo", availability: [{ from: 3057 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-inferno-is", feeds: ["lrm"], shotsFactor: 0.5, name: "Thunder-Inferno LRM Ammo", availability: [{ from: 3056 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-vibrabomb-is", feeds: ["lrm"], shotsFactor: 0.5, name: "Thunder-Vibrabomb LRM Ammo", availability: [{ from: 3057 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-active-is", feeds: ["lrm"], shotsFactor: 0.5, name: "Thunder-Active LRM Ammo", availability: [{ from: 3058 }], units: ["mech", "industrialmech", "vehicle"] },
      // Narc and iNarc pods (Inner Sphere)
      { id: "ammo-narc-explosive-is", name: "Narc Missile Beacon (Explosive) Ammo", aliases: ["Narc Explosive Ammo"], shotsPerTon: 6, availability: [{ from: 3060 }] },
      { id: "ammo-improved-narc-ecm-is", name: "Improved Narc Launcher (ECM) Ammo", aliases: ["iNarc ECM Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-explosive-is", name: "Improved Narc Launcher (Explosive) Ammo", aliases: ["iNarc Explosive Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-haywire-is", name: "Improved Narc Launcher (Haywire) Ammo", aliases: ["iNarc Haywire Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-nemesis-is", name: "Improved Narc Launcher (Nemesis) Ammo", aliases: ["iNarc Nemesis Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      // Nail and rivet gun ammunition (Inner Sphere); the Clan year is the Clan weapon's, the table prints a dash
      { id: "ammo-nail-rivet-gun-is", shots: 300, name: "Nail/Rivet Gun Ammo", availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-nail-rivet-gun-half-is", shots: 150, name: "Nail/Rivet Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1 },
    items: [
      // Autocannon ammunition (Clan)
      { id: "ammo-lb-2-x-clan", name: "LB 2-X AC Ammo", aliases: ["LB 2-X Ammo"], shotsPerTon: 45, availability: [{ from: 2826 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-2-x-cluster-clan", name: "LB 2-X AC Cluster Ammo", aliases: ["LB 2-X Cluster Ammo"], shotsPerTon: 45, availability: [{ from: 2826 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-5-x-clan", name: "LB 5-X AC Ammo", aliases: ["LB 5-X Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-5-x-cluster-clan", name: "LB 5-X AC Cluster Ammo", aliases: ["LB 5-X Cluster Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-20-x-clan", name: "LB 20-X AC Ammo", aliases: ["LB 20-X Ammo"], shotsPerTon: 5, availability: [{ from: 2826 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-20-x-cluster-clan", name: "LB 20-X AC Cluster Ammo", aliases: ["LB 20-X Cluster Ammo"], shotsPerTon: 5, availability: [{ from: 2826 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-2-clan", name: "Ultra AC/2 Ammo", aliases: ["UAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 2827 }], prototypeYear: 2825, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-10-clan", name: "Ultra AC/10 Ammo", aliases: ["UAC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 2825 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-20-clan", name: "Ultra AC/20 Ammo", aliases: ["UAC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 2825 }], units: ["mech", "industrialmech", "vehicle"] },
      // Gauss, machine gun, flamer and plasma ammunition (Clan)
      { id: "ammo-ap-gauss-rifle-clan", name: "AP Gauss Rifle Ammo", shotsPerTon: 40, availability: [{ from: 3069 }], prototypeYear: 3065, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-hyper-assault-gauss-20-clan", name: "Hyper-Assault Gauss 20 Ammo", aliases: ["HAG/20 Ammo"], shotsPerTon: 6, availability: [{ from: 3068 }], prototypeYear: 3062, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-hyper-assault-gauss-30-clan", name: "Hyper-Assault Gauss 30 Ammo", aliases: ["HAG/30 Ammo"], shotsPerTon: 4, availability: [{ from: 3068 }], prototypeYear: 3062, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-hyper-assault-gauss-40-clan", name: "Hyper-Assault Gauss 40 Ammo", aliases: ["HAG/40 Ammo"], shotsPerTon: 3, availability: [{ from: 3069 }], prototypeYear: 3062, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-machine-gun-clan", shots: 200, name: "Light Machine Gun Ammo", availability: [{ from: 3060 }], prototypeYear: 3055, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-light-machine-gun-half-clan", shots: 100, name: "Light Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3060 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-heavy-machine-gun-clan", shots: 100, name: "Heavy Machine Gun Ammo", availability: [{ from: 3059 }], prototypeYear: 3054, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-heavy-machine-gun-half-clan", shots: 50, name: "Heavy Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3059 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-plasma-cannon-clan", name: "Plasma Cannon Ammo", shotsPerTon: 10, availability: [{ from: 3069 }], prototypeYear: 3068, units: ["mech", "industrialmech", "vehicle"] },
      // Missile ammunition (Clan)
      { id: "ammo-atm-3-clan", name: "ATM 3 Ammo", shotsPerTon: 20, availability: [{ from: 3054 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-atm-6-clan", name: "ATM 6 Ammo", shotsPerTon: 10, availability: [{ from: 3054 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-atm-9-clan", name: "ATM 9 Ammo", shotsPerTon: 7, availability: [{ from: 3054 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-atm-12-clan", name: "ATM 12 Ammo", shotsPerTon: 5, availability: [{ from: 3055 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-4-clan", name: "Streak SRM 4 Ammo", aliases: ["Streak-4 Ammo"], shotsPerTon: 25, availability: [{ from: 2826 }], prototypeYear: 2819, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-6-clan", name: "Streak SRM 6 Ammo", aliases: ["Streak-6 Ammo"], shotsPerTon: 15, availability: [{ from: 2826 }], prototypeYear: 2819, units: ["mech", "industrialmech", "vehicle"] },
      // Anti-missile and Narc ammunition (Clan); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-ams-clan", name: "Anti-Missile System Ammo", aliases: ["AMS Ammo"], shotsPerTon: 24, availability: [{ from: 2831 }], prototypeYear: 2824, units: ["mech", "industrialmech", "vehicle"] },
      // Special munitions (Clan)
      { id: "ammo-er-atm-clan", feeds: ["atm"], name: "ER ATM Ammo", availability: [{ from: 3054 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-he-atm-clan", feeds: ["atm"], name: "HE ATM Ammo", availability: [{ from: 3054 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1, yearsInferred: true },
    items: [
      // Autocannon ammunition (Clan)
      { id: "ammo-lb-10-x-clan", name: "LB 10-X AC Ammo", aliases: ["LB 10-X Ammo"], shotsPerTon: 10, availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lb-10-x-cluster-clan", name: "LB 10-X AC Cluster Ammo", aliases: ["LB 10-X Cluster Ammo"], shotsPerTon: 10, availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-ultra-ac-5-clan", name: "Ultra AC/5 Ammo", aliases: ["UAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }], units: ["mech", "industrialmech", "vehicle"] },
      // Gauss, machine gun, flamer and plasma ammunition (Clan)
      { id: "ammo-gauss-rifle-clan", name: "Gauss Rifle Ammo", shotsPerTon: 8, availability: [{ from: 2828 }], prototypeYear: 2822, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-machine-gun-clan", shots: 200, name: "Machine Gun Ammo", availability: [{ from: 2825 }], prototypeYear: 2821, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-machine-gun-half-clan", shots: 100, name: "Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 2825 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-vehicle-flamer-clan", name: "Flamer (Vehicle) Ammo", aliases: ["Vehicle Flamer Ammo"], shotsPerTon: 20, availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      // Missile ammunition (Clan)
      { id: "ammo-lrm-5-clan", name: "LRM 5 Ammo", shotsPerTon: 24, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-10-clan", name: "LRM 10 Ammo", shotsPerTon: 12, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-15-clan", name: "LRM 15 Ammo", shotsPerTon: 8, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-lrm-20-clan", name: "LRM 20 Ammo", shotsPerTon: 6, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-2-clan", name: "SRM 2 Ammo", shotsPerTon: 50, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-4-clan", name: "SRM 4 Ammo", shotsPerTon: 25, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-srm-6-clan", name: "SRM 6 Ammo", shotsPerTon: 15, availability: [{ from: 2824 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-streak-srm-2-clan", name: "Streak SRM 2 Ammo", aliases: ["Streak-2 Ammo"], shotsPerTon: 50, availability: [{ from: 2822 }], prototypeYear: 2819, units: ["mech", "industrialmech", "vehicle"] },
      // Anti-missile and Narc ammunition (Clan); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-narc-missile-beacon-clan", name: "Narc Missile Beacon Ammo", aliases: ["Narc Ammo"], shotsPerTon: 6, availability: [{ from: 2828 }], prototypeYear: 2820, units: ["mech", "industrialmech", "vehicle"] },
      // Special munitions (Clan)
      { id: "ammo-artemis-capable-clan", feeds: ["lrm", "srm", "mml"], name: "Artemis-Capable Missile Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-narc-capable-clan", name: "Narc-Capable Missile Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-fragmentation-clan", name: "Fragmentation Missile Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-harpoon-clan", name: "Harpoon SRM Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-inferno-clan", name: "Inferno SRM Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-tear-gas-clan", name: "Tear Gas SRM Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-swarm-clan", name: "Swarm LRM Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-thunder-clan", name: "Thunder LRM Ammo", availability: [{ from: 2824 }], units: ["mech", "industrialmech", "vehicle"] },
      // Nail and rivet gun ammunition (Clan); the Clan year is the Clan weapon's, the table prints a dash
      { id: "ammo-nail-rivet-gun-clan", shots: 300, name: "Nail/Rivet Gun Ammo", availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-nail-rivet-gun-half-clan", shots: 150, name: "Nail/Rivet Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the Age of War prototypes (Inner Sphere): the Ammo column of the table; the bin is one ton in one slot (TechManual p. 57)
      { id: "ammo-primitive-prototype-ac-2-is", name: "Primitive Prototype Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 34, availability: [{ from: 2290 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-ac-5-is", name: "Primitive Prototype Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2240 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-ac-10-is", name: "Primitive Prototype Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2450 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-ac-20-is", name: "Primitive Prototype Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 2488 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-lrm-5-is", name: "Primitive Prototype LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 2295 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-lrm-10-is", name: "Primitive Prototype LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 9, availability: [{ from: 2295 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-lrm-15-is", name: "Primitive Prototype LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 2295 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-lrm-20-is", name: "Primitive Prototype LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 2295 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-srm-2-is", name: "Primitive Prototype SRM 2 Ammo", tons: 1, slots: 1, shotsPerTon: 37, availability: [{ from: 2365 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-srm-4-is", name: "Primitive Prototype SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 2365 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-primitive-prototype-srm-6-is", name: "Primitive Prototype SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 11, availability: [{ from: 2365 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-arrow-iv-is", name: "Prototype Arrow IV Ammo", tons: 1, slots: 1, shotsPerTon: 3, availability: [{ from: 2593 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-lb-10-x-ac-is", name: "Prototype LB 10-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2590 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-narc-missile-beacon-is", name: "Prototype Narc Missile Beacon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2580 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-remote-sensors-is", name: "Prototype Remote Sensors Ammo", tons: 1, slots: 1, shotsPerTon: 60, availability: [{ from: 2586 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the early Clan weapons
      { id: "ammo-improved-ac-2-clan", name: "Improved Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2818 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-ac-5-clan", name: "Improved Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 2818 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-ac-10-clan", name: "Improved Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2818 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-ac-20-clan", name: "Improved Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2818 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-gauss-rifle-clan", name: "Improved Gauss Rifle Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2822 }], prototypeYear: 2818, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-lrm-5-clan", name: "Improved LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 2818 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-lrm-10-clan", name: "Improved LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 2818 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-lrm-15-clan", name: "Improved LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2818 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "ammo-improved-lrm-20-clan", name: "Improved LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 2818 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-srm-2-clan", name: "Improved SRM 2 Ammo", tons: 1, slots: 1, shotsPerTon: 50, availability: [{ from: 2817 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-srm-4-clan", name: "Improved SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 25, availability: [{ from: 2817 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-srm-6-clan", name: "Improved SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2817 }], prototypeYear: 2815, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-lb-2-x-ac-clan", name: "Prototype LB 2-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-lb-5-x-ac-clan", name: "Prototype LB 5-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-lb-20-x-ac-clan", name: "Prototype LB 20-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-streak-srm-4-clan", name: "Prototype Streak SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 25, availability: [{ from: 2819 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-streak-srm-6-clan", name: "Prototype Streak SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2819 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-ultra-ac-2-clan", name: "Prototype Ultra Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-ultra-ac-10-clan", name: "Prototype Ultra Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-prototype-ultra-ac-20-clan", name: "Prototype Ultra Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2820 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the Late Succession Wars prototype Ultra AC/5
      { id: "ammo-prototype-ultra-ac-5-is", name: "Prototype Ultra Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3029 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Ammunition for the improved ATMs
      { id: "ammo-improved-atm-3-clan", name: "Improved ATM 3 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3070 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-atm-6-clan", name: "Improved ATM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3070 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-atm-9-clan", name: "Improved ATM 9 Ammo", tons: 1, slots: 1, shotsPerTon: 7, availability: [{ from: 3070 }], units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-improved-atm-12-clan", name: "Improved ATM 12 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3070 }], units: ["mech", "industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Ammunition for the RISC Advanced PDS
      { id: "ammo-risc-advanced-pds-is", name: "RISC Advanced PDS Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 3137 }], prototypeYear: 3134 },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 216-217
      { id: "ammo-arrow-iv-is", name: "Arrow IV Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3044 }], rulesLevel: "advanced" },
      { id: "ammo-thumper-artillery-is", name: "Thumper Artillery Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-sniper-artillery-is", name: "Sniper Artillery Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-thumper-cannon-is", name: "Thumper Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3079 }], prototypeYear: 3012, rulesLevel: "experimental" },
      { id: "ammo-sniper-cannon-is", name: "Sniper Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3079 }], prototypeYear: 3012, rulesLevel: "experimental" },
      { id: "ammo-long-tom-cannon-is", name: "Long Tom Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3079 }], prototypeYear: 3012, rulesLevel: "experimental" },
      { id: "ammo-hyper-velocity-ac-2-is", name: "Hyper-Velocity AC/2 Ammo", tons: 1, slots: 1, shotsPerTon: 30, availability: [{ from: 3079 }], prototypeYear: 3059, rulesLevel: "experimental" },
      { id: "ammo-hyper-velocity-ac-5-is", name: "Hyper-Velocity AC/5 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 3079 }], prototypeYear: 3059, rulesLevel: "experimental" },
      { id: "ammo-hyper-velocity-ac-10-is", name: "Hyper-Velocity AC/10 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 3079 }], prototypeYear: 3060, rulesLevel: "experimental" },
      { id: "ammo-c3-remote-sensor-launcher-is", name: "C3 Remote Sensor Launcher Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 3093 }], prototypeYear: 3072, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 216-217
      { id: "ammo-arrow-iv-clan", name: "Arrow IV Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2850 }], rulesLevel: "advanced" },
      { id: "ammo-thumper-artillery-clan", name: "Thumper Artillery Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-sniper-artillery-clan", name: "Sniper Artillery Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-thumper-cannon-clan", name: "Thumper Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3032 }], rulesLevel: "experimental" },
      { id: "ammo-sniper-cannon-clan", name: "Sniper Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3032 }], rulesLevel: "experimental" },
      { id: "ammo-long-tom-cannon-clan", name: "Long Tom Cannon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3032 }], rulesLevel: "experimental" },
      { id: "ammo-protomech-ac-2-clan", name: "ProtoMech AC/2 Ammo", tons: 1, slots: 1, shotsPerTon: 40, availability: [{ from: 3073 }], prototypeYear: 3070, rulesLevel: "advanced" },
      { id: "ammo-protomech-ac-4-clan", name: "ProtoMech AC/4 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3073 }], prototypeYear: 3070, rulesLevel: "advanced" },
      { id: "ammo-protomech-ac-8-clan", name: "ProtoMech AC/8 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3073 }], prototypeYear: 3070, rulesLevel: "advanced" },
      { id: "ammo-rotary-ac-2-clan", name: "Rotary AC/2 Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 3104 }], prototypeYear: 3073, rulesLevel: "experimental" },
      { id: "ammo-rotary-ac-5-clan", name: "Rotary AC/5 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3104 }], prototypeYear: 3073, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 218-219
      { id: "ammo-heavy-flamer-is", name: "Heavy Flamer Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3068 }], rulesLevel: "advanced" },
      { id: "ammo-fluid-gun-is", name: "Fluid Gun Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-improved-heavy-gauss-is", name: "Improved Heavy Gauss Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 3081 }], prototypeYear: 3065, rulesLevel: "experimental" },
      { id: "ammo-magshot-is", name: "MagShot Ammo", tons: 1, slots: 1, shotsPerTon: 50, availability: [{ from: 3072 }], prototypeYear: 3059, rulesLevel: "advanced" },
      { id: "ammo-silver-bullet-gauss-is", name: "Silver Bullet Gauss Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 3080 }], prototypeYear: 3051, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 218-219
      { id: "ammo-heavy-flamer-clan", name: "Heavy Flamer Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3067 }], prototypeYear: 3065, rulesLevel: "advanced" },
      { id: "ammo-fluid-gun-clan", name: "Fluid Gun Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-chemical-laser-small-clan", name: "Chemical Laser, Small Ammo", tons: 1, slots: 1, shotsPerTon: 60, availability: [{ from: 3083 }], prototypeYear: 3059, rulesLevel: "experimental" },
      { id: "ammo-chemical-laser-medium-clan", name: "Chemical Laser, Medium Ammo", tons: 1, slots: 1, shotsPerTon: 30, availability: [{ from: 3083 }], prototypeYear: 3059, rulesLevel: "experimental" },
      { id: "ammo-chemical-laser-large-clan", name: "Chemical Laser, Large Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3083 }], prototypeYear: 3059, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 220-221
      { id: "ammo-mech-mortar-1-is", name: "'Mech Mortar/1 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-2-is", name: "'Mech Mortar/2 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-4-is", name: "'Mech Mortar/4 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-8-is", name: "'Mech Mortar/8 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-enhanced-lrm-5-is", name: "Enhanced LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "ammo-enhanced-lrm-10-is", name: "Enhanced LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "ammo-enhanced-lrm-15-is", name: "Enhanced LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "ammo-enhanced-lrm-20-is", name: "Enhanced LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "ammo-extended-lrm-5-is", name: "Extended LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "ammo-extended-lrm-10-is", name: "Extended LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 9, availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "ammo-extended-lrm-15-is", name: "Extended LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "ammo-extended-lrm-20-is", name: "Extended LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 3054 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 220-221
      { id: "ammo-mech-mortar-1-clan", name: "'Mech Mortar/1 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-2-clan", name: "'Mech Mortar/2 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-4-clan", name: "'Mech Mortar/4 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-mech-mortar-8-clan", name: "'Mech Mortar/8 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "ammo-streak-lrm-5-clan", name: "Streak LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 3079 }], prototypeYear: 3057, rulesLevel: "experimental" },
      { id: "ammo-streak-lrm-10-clan", name: "Streak LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 3079 }], prototypeYear: 3057, rulesLevel: "experimental" },
      { id: "ammo-streak-lrm-15-clan", name: "Streak LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 3079 }], prototypeYear: 3057, rulesLevel: "experimental" },
      { id: "ammo-streak-lrm-20-clan", name: "Streak LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 3079 }], prototypeYear: 3057, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 223 }, playCite: { book: TO, page: 222 }, checked: "page" },
    items: [
      // Ammunition for the weapons above (the Ammo column; the bin is one ton in one slot, TechManual p. 57), pp. 222-223
      { id: "ammo-light-rifle-is", name: "Light Rifle Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 1950 }], rulesLevel: "experimental" },
      { id: "ammo-medium-rifle-is", name: "Medium Rifle Ammo", tons: 1, slots: 1, shotsPerTon: 9, availability: [{ from: 1950 }], rulesLevel: "experimental" },
      { id: "ammo-heavy-rifle-is", name: "Heavy Rifle Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 1950 }], rulesLevel: "experimental" },
      { id: "ammo-taser-is", name: "Taser (BattleMech) Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3084 }], prototypeYear: 3067, rulesLevel: "experimental" },
      { id: "ammo-thunderbolt-5-is", name: "Thunderbolt 5 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 3072 }], prototypeYear: 3052, rulesLevel: "advanced" },
      { id: "ammo-thunderbolt-10-is", name: "Thunderbolt 10 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 3072 }], prototypeYear: 3052, rulesLevel: "advanced" },
      { id: "ammo-thunderbolt-15-is", name: "Thunderbolt 15 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 3072 }], prototypeYear: 3052, rulesLevel: "advanced" },
      { id: "ammo-thunderbolt-20-is", name: "Thunderbolt 20 Ammo", tons: 1, slots: 1, shotsPerTon: 3, availability: [{ from: 3072 }], prototypeYear: 3052, rulesLevel: "advanced" },
    ],
  },
  // Alternative munitions from the Heavy Weapons Ammunition Construction Data table (Tactical Operations: Advanced Units and Equipment, printed
  // p. 229, read against the page image; the rules level and rules pages are the Alternative Munitions play table, p. 228): the mortar munitions,
  // the remote sensor dispenser sensors and the Copperhead artillery rounds. Like the other special munitions here they carry no shots per ton:
  // the table gives them "x1" of the standard munition of the weapon, and the bin is a ton in a slot. Not added: the mine types (the table leaves
  // their shots and weight to the special rules, "**"), the other artillery, missile and bomb munitions, and "HPC" ammunition, which none of the
  // rulebook extracts in the archive names.
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 229 }, checked: "page", tons: 1, slots: 1, rulesLevel: "advanced" },
    items: [
      { id: "ammo-mortar-airburst-is", name: "Mortar Airburst Ammo", availability: [{ from: 2544 }], prototypeYear: 2540, playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-anti-personnel-is", name: "Mortar Anti-Personnel Ammo", availability: [{ from: 2531 }], prototypeYear: 2526, playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-armor-piercing-shaped-charge-is", name: "Mortar Armor-Piercing (Shaped-Charge) Ammo", availability: [{ from: 2531, to: 2819 }, { from: 3043 }], prototypeYear: 2526, playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-flare-is", name: "Mortar Flare Ammo", availability: [{ from: 2536 }], prototypeYear: 2533, playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-semi-guided-is", name: "Mortar Semi-Guided Ammo", availability: [{ from: 3064 }], prototypeYear: 3055, playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-smoke-is", name: "Mortar Smoke Ammo", availability: [{ from: 2531 }], prototypeYear: 2526, playCite: { book: TO, page: 228 } },
      { id: "ammo-remote-sensor-dispenser-is", name: "Remote Sensor Dispenser Ammo", availability: [{ from: 2590 }], playCite: { book: TO, page: 228 }, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-copperhead-long-tom-is", name: "Copperhead (Long Tom) Ammo", availability: [{ from: 3051 }], cite: { book: TO, page: 226 }, checked: "text" },
      { id: "ammo-copperhead-sniper-is", name: "Copperhead (Sniper) Ammo", availability: [{ from: 3051 }], cite: { book: TO, page: 226 }, checked: "text" },
      { id: "ammo-copperhead-thumper-is", name: "Copperhead (Thumper) Ammo", availability: [{ from: 3051 }], cite: { book: TO, page: 227 } },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: TO, page: 229 }, checked: "page", tons: 1, slots: 1, rulesLevel: "advanced" },
    items: [
      { id: "ammo-mortar-airburst-clan", name: "Mortar Airburst Ammo", availability: [{ from: 2544 }], playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-anti-personnel-clan", name: "Mortar Anti-Personnel Ammo", availability: [{ from: 2531 }], playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-armor-piercing-shaped-charge-clan", name: "Mortar Armor-Piercing (Shaped-Charge) Ammo", availability: [{ from: 2531 }], playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-flare-clan", name: "Mortar Flare Ammo", availability: [{ from: 2536 }], playCite: { book: TO, page: 228 } },
      { id: "ammo-mortar-smoke-clan", name: "Mortar Smoke Ammo", availability: [{ from: 2531 }], playCite: { book: TO, page: 228 } },
      { id: "ammo-remote-sensor-dispenser-clan", name: "Remote Sensor Dispenser Ammo", availability: [{ from: 2590 }], playCite: { book: TO, page: 228 }, units: ["mech", "industrialmech", "vehicle"] },
      { id: "ammo-copperhead-long-tom-clan", name: "Copperhead (Long Tom) Ammo", availability: [{ from: 2645 }], cite: { book: TO, page: 226 }, checked: "text" },
      { id: "ammo-copperhead-sniper-clan", name: "Copperhead (Sniper) Ammo", availability: [{ from: 2645 }], cite: { book: TO, page: 226 }, checked: "text" },
      { id: "ammo-copperhead-thumper-clan", name: "Copperhead (Thumper) Ammo", availability: [{ from: 2645 }], cite: { book: TO, page: 227 } },
    ],
  },
  // Missile munitions from the same tables (TO:AUE printed pp. 226-229, read against the page images; construction data pp. 227 and 229,
  // play figures and rules level pp. 226 and 228). Dates are the Latest Intro Date column; a "P" date (prototype only, nothing later printed)
  // is the first year with no second one, and an item the Universal Technology Advancement Table (IO:AE printed pp. 55-56) marks extinct ends
  // there. Where that table's older dates differ from this newer printing, this printing's are used (conflict 90 in the archive).
  // Magnetic-Pulse SRM and LRM: TO:AUE prints "3057X" (extinct and not recovered); the span 3057 to 3065 and the 3055 prototype year are the Universal Technology
  // Advancement Table (IO:AE printed p. 56: prototype 3055, production 3057, "Ext: 3065").
  // Book panel ruling on conflict 90: the TO:AUE item entries (pp. 180-184) give per-launcher, per-stage years that the table merges, so the SRM rows (Heat-Seeking
  // 2370, Smoke 2370), Incendiary, Tandem-Charge (prototype 2757, production 3062 from IO:AE p. 55) and Follow-the-Leader follow the entries, and IO:AE (pp. 55-56) fills
  // the stages TO:AUE leaves silent (prototype years of Heat-Seeking SRM, Incendiary, Mine-Clearance, Harpoon, Tear Gas, Swarm, Thunder and the mortar rounds;
  // the Armor-Piercing mortar's 2819 extinction and 3043 return). Follow-the-Leader (IS) is prototype-only throughout: 2755 to about 2770, then from 3053.
  // Three rows stay on TO:AUE's later printing while the owner decides whether "later" means printing or compilation: Heat-Seeking LRM 2340 (the alternative is IO:AE's
  // 2430, prototype 2390), Smoke LRM 2333 (2342, prototype 2341) and Follow-the-Leader's modern year 3053 (3046).
  // The Swarm LRM (IS) extinction is 2833 (TO:AUE p. 183, IO:AE p. 55); the 2840 the row had came from the TechManual prose (p. 231: factories gone "by 2840"), an older book.
  // A ton carries the launcher's standard shots times `shotsFactor` (the Ammo column: x0.5 or x1). The tables give weight x1: the bin is a
  // ton in a slot. Not added here: Anti-Ship and other bomb and artillery munitions, the grenade-launcher, flamer and mine munitions.
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: TO, page: 227 }, playCite: { book: TO, page: 226 }, checked: "page", tons: 1, slots: 1, rulesLevel: "advanced", units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-acid-srm-is", feeds: ["srm", "mml"], shotsFactor: 0.5, name: "Acid SRM Ammo", availability: [{ from: 3053 }], rulesLevel: "experimental" },
      { id: "ammo-anti-radiation-srm-is", feeds: ["srm", "mml"], name: "Anti-Radiation SRM Ammo", availability: [{ from: 3066 }], rulesLevel: "experimental" },
      { id: "ammo-anti-radiation-lrm-is", feeds: ["lrm", "mml"], name: "Anti-Radiation LRM Ammo", availability: [{ from: 3066 }], rulesLevel: "experimental" },
      { id: "ammo-bola-narc-pods-is", name: "Bola Narc Pod Ammo", availability: [{ from: 3056 }], rulesLevel: "experimental" },
      { id: "ammo-follow-the-leader-lrm-is", feeds: ["lrm", "mml"], shotsFactor: 0.5, name: "Follow-the-Leader LRM Ammo", availability: [{ from: 2755, to: 2770 }, { from: 3053 }], rulesLevel: "experimental" },
      { id: "ammo-heat-seeking-srm-is", feeds: ["srm", "mml"], shotsFactor: 0.5, name: "Heat-Seeking SRM Ammo", availability: [{ from: 2370 }], prototypeYear: 2365 },
      { id: "ammo-heat-seeking-lrm-is", feeds: ["lrm", "mml"], shotsFactor: 0.5, name: "Heat-Seeking LRM Ammo", availability: [{ from: 2340 }] },
      { id: "ammo-incendiary-lrm-is", feeds: ["lrm", "mml"], name: "Incendiary LRM Ammo", availability: [{ from: 2342 }], prototypeYear: 2341 },
      { id: "ammo-magnetic-pulse-srm-is", feeds: ["srm", "mml"], name: "Magnetic-Pulse SRM Ammo", availability: [{ from: 3057, to: 3065 }], prototypeYear: 3055, rulesLevel: "experimental" },
      { id: "ammo-magnetic-pulse-lrm-is", feeds: ["lrm", "mml"], name: "Magnetic-Pulse LRM Ammo", availability: [{ from: 3057, to: 3065 }], prototypeYear: 3055, rulesLevel: "experimental" },
      { id: "ammo-mine-clearance-srm-is", feeds: ["srm", "mml"], name: "Mine-Clearance SRM Ammo", availability: [{ from: 3069 }], prototypeYear: 3065 },
      { id: "ammo-mine-clearance-lrm-is", feeds: ["lrm", "mml"], name: "Mine-Clearance LRM Ammo", availability: [{ from: 3069 }], prototypeYear: 3065, cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
      { id: "ammo-smoke-srm-is", feeds: ["srm", "mml"], name: "Smoke SRM Ammo", availability: [{ from: 2370 }], cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
      { id: "ammo-smoke-lrm-is", feeds: ["lrm", "mml"], name: "Smoke LRM Ammo", availability: [{ from: 2333 }], cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
      { id: "ammo-tandem-charge-srm-is", feeds: ["srm", "mml"], shotsFactor: 0.5, name: "Tandem-Charge SRM Ammo", availability: [{ from: 3062 }], prototypeYear: 2757, rulesLevel: "experimental", cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: TO, page: 227 }, playCite: { book: TO, page: 226 }, checked: "page", tons: 1, slots: 1, rulesLevel: "advanced", units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-anti-radiation-srm-clan", feeds: ["srm", "mml"], name: "Anti-Radiation SRM Ammo", availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "ammo-anti-radiation-lrm-clan", feeds: ["lrm", "mml"], name: "Anti-Radiation LRM Ammo", availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "ammo-follow-the-leader-lrm-clan", feeds: ["lrm", "mml"], shotsFactor: 0.5, name: "Follow-the-Leader LRM Ammo", availability: [{ from: 2755 }], rulesLevel: "experimental" },
      { id: "ammo-heat-seeking-srm-clan", feeds: ["srm", "mml"], shotsFactor: 0.5, name: "Heat-Seeking SRM Ammo", availability: [{ from: 2370 }] },
      { id: "ammo-heat-seeking-lrm-clan", feeds: ["lrm", "mml"], shotsFactor: 0.5, name: "Heat-Seeking LRM Ammo", availability: [{ from: 2340 }] },
      { id: "ammo-incendiary-lrm-clan", feeds: ["lrm", "mml"], name: "Incendiary LRM Ammo", availability: [{ from: 2825 }] },
      { id: "ammo-smoke-srm-clan", feeds: ["srm", "mml"], name: "Smoke SRM Ammo", availability: [{ from: 2370 }], cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
      { id: "ammo-smoke-lrm-clan", feeds: ["lrm", "mml"], name: "Smoke LRM Ammo", availability: [{ from: 2825 }], cite: { book: TO, page: 229 }, playCite: { book: TO, page: 228 } },
    ],
  },
  // Special munitions of the Additional Alternate Era table (IO:AE printed pp. 212-213; the item entries are on pp. 61-62, 98-99, 125-127). Dates
  // are those p. 213 prints, "P" being a prototype year, except Retro-Streak and Shoot-and-Sit, where the Universal Technology Advancement Table
  // (pp. 55-56) prints a different year and the extinction (conflict 91 in the archive). A ton carries the launcher's standard shots where the
  // The dates not on p. 213 come from the same table (printed pp. 55-56): Anti-TSM prototype 3026 and production 3027 (p. 213 prints 3027 only); Listen-Kill
  // prototype about 3037 and "Ext: 3040" (p. 213 prints 3037P and no end); Improved Magnetic Pulse ATM "Ext: 3080"; Retro-Streak and Shoot-and-Sit as above.
  // launcher is one the catalog can follow (LRM, SRM, MML, ATM); Retro-Streak, Shoot-and-Sit and the improved ATM munitions name none.
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", tons: 1, slots: 1, rulesLevel: "experimental", units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-anti-tsm-lrm-is", feeds: ["lrm", "mml"], name: "Anti-TSM LRM Ammo", availability: [{ from: 3027 }], prototypeYear: 3026 },
      { id: "ammo-anti-tsm-srm-is", feeds: ["srm", "mml"], name: "Anti-TSM SRM Ammo", availability: [{ from: 3027 }], prototypeYear: 3026 },
      { id: "ammo-listen-kill-lrm-is", feeds: ["lrm", "mml"], name: "Listen-Kill LRM Ammo", availability: [{ from: 3037, to: 3040 }] },
      { id: "ammo-listen-kill-srm-is", feeds: ["srm", "mml"], name: "Listen-Kill SRM Ammo", availability: [{ from: 3037, to: 3040 }] },
      { id: "ammo-dead-fire-lrm-is", feeds: ["lrm", "mml"], name: "Dead-Fire LRM Ammo", availability: [{ from: 3052 }] },
      { id: "ammo-dead-fire-srm-is", feeds: ["srm", "mml"], name: "Dead-Fire SRM Ammo", availability: [{ from: 3052 }] },
      { id: "ammo-retro-streak-srm-is", name: "Retro-Streak SSRM Ammo", availability: [{ from: 3048, to: 3057 }] },
      { id: "ammo-shoot-and-sit-narc-is", name: "Shoot-and-Sit Narc Ammo", availability: [{ from: 3049, to: 3059 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", tons: 1, slots: 1, rulesLevel: "experimental", units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-improved-magnetic-pulse-atm-clan", name: "Improved Magnetic Pulse ATM Ammo", availability: [{ from: 3070, to: 3080 }] },
      { id: "ammo-improved-inferno-atm-clan", name: "Improved Inferno ATM Ammo", availability: [{ from: 3070 }] },
    ],
  },
  // Torpedo ammunition (TechManual printed p. 346, Heavy Weapon Ammunition, x1 shots and weight of the launcher's standard ammunition; dated as the launcher, p. 291).
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: "TechManual", page: 230 }, playCite: { book: "TechManual", page: 346 }, checked: "page", tons: 1, slots: 1, units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-srt-2-is", name: "SRT 2 Ammo", shotsPerTon: 50, availability: [{ from: 2380 }] },
      { id: "ammo-srt-4-is", name: "SRT 4 Ammo", shotsPerTon: 25, availability: [{ from: 2380 }] },
      { id: "ammo-srt-6-is", name: "SRT 6 Ammo", shotsPerTon: 15, availability: [{ from: 2380 }] },
      { id: "ammo-lrt-5-is", name: "LRT 5 Ammo", shotsPerTon: 24, availability: [{ from: 2380 }] },
      { id: "ammo-lrt-10-is", name: "LRT 10 Ammo", shotsPerTon: 12, availability: [{ from: 2380 }] },
      { id: "ammo-lrt-15-is", name: "LRT 15 Ammo", shotsPerTon: 8, availability: [{ from: 2380 }] },
      { id: "ammo-lrt-20-is", name: "LRT 20 Ammo", shotsPerTon: 6, availability: [{ from: 2380 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: "TechManual", page: 230 }, playCite: { book: "TechManual", page: 346 }, checked: "page", tons: 1, slots: 1, units: ["mech", "industrialmech", "vehicle"] },
    items: [
      { id: "ammo-srt-2-clan", name: "SRT 2 Ammo", shotsPerTon: 50, availability: [{ from: 2824 }] },
      { id: "ammo-srt-4-clan", name: "SRT 4 Ammo", shotsPerTon: 25, availability: [{ from: 2824 }] },
      { id: "ammo-srt-6-clan", name: "SRT 6 Ammo", shotsPerTon: 15, availability: [{ from: 2824 }] },
      { id: "ammo-lrt-5-clan", name: "LRT 5 Ammo", shotsPerTon: 24, availability: [{ from: 2824 }] },
      { id: "ammo-lrt-10-clan", name: "LRT 10 Ammo", shotsPerTon: 12, availability: [{ from: 2824 }] },
      { id: "ammo-lrt-15-clan", name: "LRT 15 Ammo", shotsPerTon: 8, availability: [{ from: 2824 }] },
      { id: "ammo-lrt-20-clan", name: "LRT 20 Ammo", shotsPerTon: 6, availability: [{ from: 2824 }] },
    ],
  },
];
