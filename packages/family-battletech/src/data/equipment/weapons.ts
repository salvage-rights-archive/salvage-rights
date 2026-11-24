// Weapons a standard BattleMech can mount, Inner Sphere and Clan as separate rows, from TechManual (corrected sixth
// printing, errata v8.0). Plain data in groups: a group's `defaults` carry what its items share, an item states only what
// differs. No play statistics (damage, heat, range), Battle Value or cost: those are other tables.
//
// Where each value came from. Tons and slots (the M column, critical slots) are the Weapons and Equipment tables,
// printed pp. 341-343; the group's cite names that page. Years are the Heavy Weapons and Equipment cost and availability
// table, printed pp. 290-292, whose Introduced, Extinction and Reintroduced columns give an Inner Sphere and a Clan year.
// Every page named here was read against the page image, so these rows are checked "page", except the retractable blade
// (its dates are on p. 293 and were read from the text extract only). Conventions for the years:
//  - A span runs from the introduction year to the extinction year inclusive, as the book prints them; a reintroduction
//    year starts a second span. No extinction means the span is open.
//  - "PS" (pre-spaceflight, 1950 or sooner) is written as 1950, the latest year the book allows it to mean.
//  - A Clan introduction of "—" means the item pre-existed and was never introduced separately; the Clan row then starts
//    at the Inner Sphere introduction year. Items the Clan table does not list (standard ACs, PPCs, medium and large
//    lasers, CASE) have no Clan row.
//  - Where errata v8.0 differs from the printing, the erratum wins: the Large Laser's introduction is 2300 (erratum to
//    the p. 291 table; the printing, like the p. 227 text, says 2316), so its cite is p. 291. The Snub-Nose PPC follows the
//    p. 234 text as amended by the errata (introduced 2784, extinct 2790, recovered 3067); the p. 291 table only lists 3067.
// Placement limits (`locations`) and splitting follow the item entries on pp. 204-238 and the ranged-weapon rule on p. 57:
// a ranged weapon of 8 or more slots may be split between two adjacent locations other than the legs.
// A formula name (a string in `tons` or `slots`) is defined in rules/catalog.ts.

import type { EquipmentGroup } from "../../rules/catalog";

export const WEAPONS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 341 }, checked: "page" },
    items: [
      // Autocannons (Inner Sphere)
      { id: "ac-2-is", name: "Autocannon/2", aliases: ["AC/2"], tons: 6, slots: 1, availability: [{ from: 2300 }] },
      { id: "ac-5-is", name: "Autocannon/5", aliases: ["AC/5"], tons: 8, slots: 4, availability: [{ from: 2250 }] },
      { id: "ac-10-is", name: "Autocannon/10", aliases: ["AC/10"], tons: 12, slots: 7, availability: [{ from: 2460 }] },
      { id: "ac-20-is", name: "Autocannon/20", aliases: ["AC/20"], tons: 14, slots: 10, availability: [{ from: 2500 }], splittable: true },
      { id: "lb-2-x-ac-is", name: "LB 2-X AC", aliases: ["LB 2-X"], tons: 6, slots: 4, availability: [{ from: 3058 }] },
      { id: "lb-5-x-ac-is", name: "LB 5-X AC", aliases: ["LB 5-X"], tons: 8, slots: 5, availability: [{ from: 3058 }] },
      { id: "lb-10-x-ac-is", name: "LB 10-X AC", aliases: ["LB 10-X"], tons: 11, slots: 6, availability: [{ from: 2595, to: 2840 }, { from: 3035 }] },
      { id: "lb-20-x-ac-is", name: "LB 20-X AC", aliases: ["LB 20-X"], tons: 14, slots: 11, availability: [{ from: 3058 }], splittable: true },
      { id: "light-ac-2-is", name: "Light AC/2", aliases: ["LAC/2"], tons: 4, slots: 1, availability: [{ from: 3068 }] },
      { id: "light-ac-5-is", name: "Light AC/5", aliases: ["LAC/5"], tons: 5, slots: 2, availability: [{ from: 3068 }] },
      { id: "rotary-ac-2-is", name: "Rotary AC/2", aliases: ["RAC/2"], tons: 8, slots: 3, availability: [{ from: 3062 }] },
      { id: "rotary-ac-5-is", name: "Rotary AC/5", aliases: ["RAC/5"], tons: 10, slots: 6, availability: [{ from: 3062 }] },
      { id: "ultra-ac-2-is", name: "Ultra AC/2", aliases: ["UAC/2"], tons: 7, slots: 3, availability: [{ from: 3057 }] },
      { id: "ultra-ac-5-is", name: "Ultra AC/5", aliases: ["UAC/5"], tons: 9, slots: 5, availability: [{ from: 2640, to: 2915 }, { from: 3035 }] },
      { id: "ultra-ac-10-is", name: "Ultra AC/10", aliases: ["UAC/10"], tons: 13, slots: 7, availability: [{ from: 3057 }] },
      { id: "ultra-ac-20-is", name: "Ultra AC/20", aliases: ["UAC/20"], tons: 15, slots: 10, availability: [{ from: 3060 }], splittable: true },
      // Gauss rifles (Inner Sphere)
      { id: "light-gauss-rifle-is", name: "Light Gauss Rifle", tons: 12, slots: 5, availability: [{ from: 3056 }] },
      { id: "gauss-rifle-is", name: "Gauss Rifle", tons: 15, slots: 7, availability: [{ from: 2590, to: 2865 }, { from: 3040 }] },
      { id: "heavy-gauss-rifle-is", name: "Heavy Gauss Rifle", tons: 18, slots: 11, availability: [{ from: 3061 }], locations: ["CT", "LT", "RT"], splittable: true },
      // Machine guns and flamers (Inner Sphere)
      { id: "light-machine-gun-is", name: "Light Machine Gun", tons: 0.5, slots: 1, availability: [{ from: 3068 }] },
      { id: "machine-gun-is", name: "Machine Gun", aliases: ["MG"], tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
      { id: "heavy-machine-gun-is", name: "Heavy Machine Gun", tons: 1, slots: 1, availability: [{ from: 3068 }] },
      { id: "flamer-is", name: "Flamer", tons: 1, slots: 1, availability: [{ from: 2025 }] },
      { id: "vehicle-flamer-is", name: "Flamer (Vehicle)", aliases: ["Vehicle Flamer"], tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
      // Lasers (Inner Sphere)
      { id: "er-small-laser-is", name: "ER Small Laser", tons: 0.5, slots: 1, availability: [{ from: 3058 }] },
      { id: "er-medium-laser-is", name: "ER Medium Laser", tons: 1, slots: 1, availability: [{ from: 3058 }] },
      { id: "er-large-laser-is", name: "ER Large Laser", tons: 5, slots: 2, availability: [{ from: 2620, to: 2950 }, { from: 3037 }] },
      { id: "small-laser-is", name: "Small Laser", tons: 0.5, slots: 1, availability: [{ from: 2300 }] },
      { id: "medium-laser-is", name: "Medium Laser", tons: 1, slots: 1, availability: [{ from: 2300 }] },
      { id: "large-laser-is", name: "Large Laser", tons: 5, slots: 2, availability: [{ from: 2300 }], cite: { book: "TechManual", page: 291 } },
      { id: "small-pulse-laser-is", name: "Small Pulse Laser", tons: 1, slots: 1, availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      { id: "medium-pulse-laser-is", name: "Medium Pulse Laser", tons: 2, slots: 1, availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      { id: "large-pulse-laser-is", name: "Large Pulse Laser", tons: 7, slots: 2, availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      // Plasma weapons and PPCs (Inner Sphere)
      { id: "plasma-rifle-is", name: "Plasma Rifle", tons: 6, slots: 2, availability: [{ from: 3068 }] },
      { id: "light-ppc-is", name: "Light PPC", tons: 3, slots: 2, availability: [{ from: 3067 }] },
      { id: "ppc-is", name: "PPC", tons: 7, slots: 3, availability: [{ from: 2460 }] },
      { id: "heavy-ppc-is", name: "Heavy PPC", tons: 10, slots: 4, availability: [{ from: 3067 }] },
      { id: "er-ppc-is", name: "ER PPC", tons: 7, slots: 3, availability: [{ from: 2751, to: 2860 }, { from: 3037 }] },
      { id: "snub-nose-ppc-is", name: "Snub-Nose PPC", aliases: ["Snub-Nosed PPC"], tons: 6, slots: 2, availability: [{ from: 2784, to: 2790 }, { from: 3067 }], cite: { book: "TechManual", page: 234 } },
      // Missile launchers (Inner Sphere)
      { id: "lrm-5-is", name: "LRM 5", tons: 2, slots: 1, availability: [{ from: 2300 }] },
      { id: "lrm-10-is", name: "LRM 10", tons: 5, slots: 2, availability: [{ from: 2300 }] },
      { id: "lrm-15-is", name: "LRM 15", tons: 7, slots: 3, availability: [{ from: 2315 }] },
      { id: "lrm-20-is", name: "LRM 20", tons: 10, slots: 5, availability: [{ from: 2315 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 342 }, checked: "page" },
    items: [
      // Missile launchers (Inner Sphere)
      { id: "mml-3-is", name: "MML 3", tons: 1.5, slots: 2, availability: [{ from: 3068 }] },
      { id: "mml-5-is", name: "MML 5", tons: 3, slots: 3, availability: [{ from: 3068 }] },
      { id: "mml-7-is", name: "MML 7", tons: 4.5, slots: 4, availability: [{ from: 3068 }] },
      { id: "mml-9-is", name: "MML 9", tons: 6, slots: 5, availability: [{ from: 3068 }] },
      { id: "srm-2-is", name: "SRM 2", tons: 1, slots: 1, availability: [{ from: 2370 }] },
      { id: "srm-4-is", name: "SRM 4", tons: 2, slots: 1, availability: [{ from: 2370 }] },
      { id: "srm-6-is", name: "SRM 6", tons: 3, slots: 2, availability: [{ from: 2370 }] },
      { id: "mrm-10-is", name: "MRM 10", tons: 3, slots: 2, availability: [{ from: 3058 }] },
      { id: "mrm-20-is", name: "MRM 20", tons: 7, slots: 3, availability: [{ from: 3058 }] },
      { id: "mrm-30-is", name: "MRM 30", tons: 10, slots: 5, availability: [{ from: 3058 }] },
      { id: "mrm-40-is", name: "MRM 40", tons: 12, slots: 7, availability: [{ from: 3058 }] },
      { id: "rocket-launcher-10-is", name: "Rocket Launcher 10", tons: 0.5, slots: 1, availability: [{ from: 3064 }] },
      { id: "rocket-launcher-15-is", name: "Rocket Launcher 15", tons: 1, slots: 2, availability: [{ from: 3064 }] },
      { id: "rocket-launcher-20-is", name: "Rocket Launcher 20", tons: 1.5, slots: 3, availability: [{ from: 3064 }] },
      { id: "streak-srm-2-is", name: "Streak SRM 2", aliases: ["Streak-2"], tons: 1.5, slots: 1, availability: [{ from: 2647, to: 2845 }, { from: 3035 }] },
      { id: "streak-srm-4-is", name: "Streak SRM 4", aliases: ["Streak-4"], tons: 3, slots: 1, availability: [{ from: 3058 }] },
      { id: "streak-srm-6-is", name: "Streak SRM 6", aliases: ["Streak-6"], tons: 4.5, slots: 2, availability: [{ from: 3058 }] },
      // Anti-missile systems, pods and Narc (Inner Sphere)
      { id: "ams-is", name: "Anti-Missile System", aliases: ["AMS"], tons: 0.5, slots: 1, availability: [{ from: 2617, to: 2796 }, { from: 3040 }] },
      { id: "a-pods-is", name: "A-Pods", aliases: ["A-Pod"], tons: 0.5, slots: 1, availability: [{ from: 3055 }], locations: ["LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
      { id: "b-pods-is", name: "B-Pods", aliases: ["B-Pod"], tons: 1, slots: 1, availability: [{ from: 3069 }] },
      { id: "narc-missile-beacon-is", name: "Narc Missile Beacon", aliases: ["Narc"], tons: 3, slots: 2, availability: [{ from: 2587, to: 2795 }, { from: 3035 }] },
      { id: "improved-narc-launcher-is", name: "Improved Narc Launcher", aliases: ["Imp. Narc Launcher", "iNarc"], tons: 5, slots: 3, availability: [{ from: 3062 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page" },
    items: [
      // Autocannons (Clan)
      { id: "lb-2-x-ac-clan", name: "LB 2-X AC", aliases: ["LB 2-X"], tons: 5, slots: 3, availability: [{ from: 2826 }] },
      { id: "lb-5-x-ac-clan", name: "LB 5-X AC", aliases: ["LB 5-X"], tons: 7, slots: 4, availability: [{ from: 2825 }] },
      { id: "lb-10-x-ac-clan", name: "LB 10-X AC", aliases: ["LB 10-X"], tons: 10, slots: 5, availability: [{ from: 2824 }] },
      { id: "lb-20-x-ac-clan", name: "LB 20-X AC", aliases: ["LB 20-X"], tons: 12, slots: 9, availability: [{ from: 2826 }], splittable: true },
      { id: "ultra-ac-2-clan", name: "Ultra AC/2", aliases: ["UAC/2"], tons: 5, slots: 2, availability: [{ from: 2827 }] },
      { id: "ultra-ac-5-clan", name: "Ultra AC/5", aliases: ["UAC/5"], tons: 7, slots: 3, availability: [{ from: 2825 }] },
      { id: "ultra-ac-10-clan", name: "Ultra AC/10", aliases: ["UAC/10"], tons: 10, slots: 4, availability: [{ from: 2825 }] },
      { id: "ultra-ac-20-clan", name: "Ultra AC/20", aliases: ["UAC/20"], tons: 12, slots: 8, availability: [{ from: 2825 }], splittable: true },
      // Gauss rifles (Clan)
      { id: "ap-gauss-rifle-clan", name: "AP Gauss Rifle", tons: 0.5, slots: 1, availability: [{ from: 3069 }] },
      { id: "gauss-rifle-clan", name: "Gauss Rifle", tons: 12, slots: 6, availability: [{ from: 2828 }] },
      { id: "hyper-assault-gauss-20-clan", name: "Hyper-Assault Gauss 20", aliases: ["Hyper Assault Gauss 20", "HAG/20"], tons: 10, slots: 6, availability: [{ from: 3068 }] },
      { id: "hyper-assault-gauss-30-clan", name: "Hyper-Assault Gauss 30", aliases: ["Hyper Assault Gauss 30", "HAG/30"], tons: 13, slots: 8, availability: [{ from: 3068 }], splittable: true },
      { id: "hyper-assault-gauss-40-clan", name: "Hyper-Assault Gauss 40", aliases: ["Hyper Assault Gauss 40", "HAG/40"], tons: 16, slots: 10, availability: [{ from: 3069 }], splittable: true },
      // Machine guns and flamers (Clan)
      { id: "light-machine-gun-clan", name: "Light Machine Gun", tons: 0.25, slots: 1, availability: [{ from: 3060 }] },
      { id: "machine-gun-clan", name: "Machine Gun", aliases: ["MG"], tons: 0.25, slots: 1, availability: [{ from: 2825 }] },
      { id: "heavy-machine-gun-clan", name: "Heavy Machine Gun", tons: 0.5, slots: 1, availability: [{ from: 3059 }] },
      { id: "flamer-clan", name: "Flamer", tons: 0.5, slots: 1, availability: [{ from: 2827 }] },
      { id: "vehicle-flamer-clan", name: "Flamer (Vehicle)", aliases: ["Vehicle Flamer"], tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
      // Lasers (Clan)
      { id: "er-micro-laser-clan", name: "ER Micro Laser", tons: 0.25, slots: 1, availability: [{ from: 3060 }] },
      { id: "er-small-laser-clan", name: "ER Small Laser", tons: 0.5, slots: 1, availability: [{ from: 2825 }] },
      { id: "er-medium-laser-clan", name: "ER Medium Laser", tons: 1, slots: 1, availability: [{ from: 2824 }] },
      { id: "er-large-laser-clan", name: "ER Large Laser", tons: 4, slots: 1, availability: [{ from: 2823 }] },
      { id: "micro-pulse-laser-clan", name: "Micro Pulse Laser", tons: 0.5, slots: 1, availability: [{ from: 3060 }] },
      { id: "small-pulse-laser-clan", name: "Small Pulse Laser", tons: 1, slots: 1, availability: [{ from: 2829 }] },
      { id: "medium-pulse-laser-clan", name: "Medium Pulse Laser", tons: 2, slots: 1, availability: [{ from: 2827 }] },
      { id: "large-pulse-laser-clan", name: "Large Pulse Laser", tons: 6, slots: 2, availability: [{ from: 2824 }] },
      { id: "heavy-small-laser-clan", name: "Heavy Small Laser", tons: 0.5, slots: 1, availability: [{ from: 3059 }] },
      { id: "heavy-medium-laser-clan", name: "Heavy Medium Laser", tons: 1, slots: 2, availability: [{ from: 3059 }] },
      { id: "heavy-large-laser-clan", name: "Heavy Large Laser", tons: 4, slots: 3, availability: [{ from: 3059 }] },
      // Plasma weapons and PPCs (Clan)
      { id: "plasma-cannon-clan", name: "Plasma Cannon", tons: 3, slots: 1, availability: [{ from: 3069 }] },
      { id: "er-ppc-clan", name: "ER PPC", tons: 6, slots: 2, availability: [{ from: 2826 }] },
      // Missile launchers (Clan)
      { id: "atm-3-clan", name: "ATM 3", tons: 1.5, slots: 2, availability: [{ from: 3054 }] },
      { id: "atm-6-clan", name: "ATM 6", tons: 3.5, slots: 3, availability: [{ from: 3054 }] },
      { id: "atm-9-clan", name: "ATM 9", tons: 5, slots: 4, availability: [{ from: 3054 }] },
      { id: "atm-12-clan", name: "ATM 12", tons: 7, slots: 5, availability: [{ from: 3055 }] },
      { id: "lrm-5-clan", name: "LRM 5", tons: 1, slots: 1, availability: [{ from: 2824 }] },
      { id: "lrm-10-clan", name: "LRM 10", tons: 2.5, slots: 1, availability: [{ from: 2824 }] },
      { id: "lrm-15-clan", name: "LRM 15", tons: 3.5, slots: 2, availability: [{ from: 2824 }] },
      { id: "lrm-20-clan", name: "LRM 20", tons: 5, slots: 4, availability: [{ from: 2824 }] },
      { id: "srm-2-clan", name: "SRM 2", tons: 0.5, slots: 1, availability: [{ from: 2824 }] },
      { id: "srm-4-clan", name: "SRM 4", tons: 1, slots: 1, availability: [{ from: 2824 }] },
      { id: "srm-6-clan", name: "SRM 6", tons: 1.5, slots: 1, availability: [{ from: 2824 }] },
      { id: "streak-srm-2-clan", name: "Streak SRM 2", aliases: ["Streak-2"], tons: 1, slots: 1, availability: [{ from: 2822 }] },
      { id: "streak-srm-4-clan", name: "Streak SRM 4", aliases: ["Streak-4"], tons: 2, slots: 1, availability: [{ from: 2826 }] },
      { id: "streak-srm-6-clan", name: "Streak SRM 6", aliases: ["Streak-6"], tons: 3, slots: 2, availability: [{ from: 2826 }] },
      // Anti-missile systems, pods and Narc (Clan)
      { id: "ams-clan", name: "Anti-Missile System", aliases: ["AMS"], tons: 0.5, slots: 1, availability: [{ from: 2831 }] },
      { id: "a-pods-clan", name: "A-Pods", aliases: ["A-Pod"], tons: 0.5, slots: 1, availability: [{ from: 2850 }], locations: ["LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
      { id: "b-pods-clan", name: "B-Pods", aliases: ["B-Pod"], tons: 1, slots: 1, availability: [{ from: 3068 }] },
      { id: "narc-missile-beacon-clan", name: "Narc Missile Beacon", aliases: ["Narc"], tons: 2, slots: 1, availability: [{ from: 2828 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 237 }, checked: "page" },
    items: [
      // Physical weapons (Inner Sphere); weight and slots follow the 'Mech's tonnage (formulas in rules/catalog.ts)
      { id: "hatchet-is", name: "Hatchet", tons: "ceil-tons-15", slots: "ceil-tons-15", availability: [{ from: 3022 }], locations: ["LA", "RA"], cite: { book: "TechManual", page: 220 } },
      { id: "sword-is", name: "Sword", tons: "sword-tons", slots: "ceil-tons-15", availability: [{ from: 3058 }], locations: ["LA", "RA"] },
      { id: "retractable-blade-is", name: "Retractable Blade", tons: "blade-tons", slots: "blade-slots", availability: [{ from: 2420 }], locations: ["LA", "RA"], checked: "text" },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 237 }, checked: "page" },
    items: [
      // Physical weapons (Clan); weight and slots follow the 'Mech's tonnage (formulas in rules/catalog.ts)
      { id: "retractable-blade-clan", name: "Retractable Blade", tons: "blade-tons", slots: "blade-slots", availability: [{ from: 2420 }], locations: ["LA", "RA"], checked: "text" },
    ],
  },
];
