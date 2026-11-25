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

export const AMMUNITION: EquipmentGroup[] = [
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1 },
    items: [
      // Autocannon ammunition (Inner Sphere)
      { id: "ammo-ac-2-is", name: "Autocannon/2 Ammo", aliases: ["AC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 2300 }] },
      { id: "ammo-ac-5-is", name: "Autocannon/5 Ammo", aliases: ["AC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2250 }] },
      { id: "ammo-ac-10-is", name: "Autocannon/10 Ammo", aliases: ["AC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 2460 }] },
      { id: "ammo-ac-20-is", name: "Autocannon/20 Ammo", aliases: ["AC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 2500 }] },
      { id: "ammo-lb-2-x-is", name: "LB 2-X AC Ammo", aliases: ["LB 2-X Ammo"], shotsPerTon: 45, availability: [{ from: 3058 }] },
      { id: "ammo-lb-2-x-cluster-is", name: "LB 2-X AC Cluster Ammo", aliases: ["LB 2-X Cluster Ammo"], shotsPerTon: 45, availability: [{ from: 3058 }] },
      { id: "ammo-lb-5-x-is", name: "LB 5-X AC Ammo", aliases: ["LB 5-X Ammo"], shotsPerTon: 20, availability: [{ from: 3058 }] },
      { id: "ammo-lb-5-x-cluster-is", name: "LB 5-X AC Cluster Ammo", aliases: ["LB 5-X Cluster Ammo"], shotsPerTon: 20, availability: [{ from: 3058 }] },
      { id: "ammo-lb-10-x-is", name: "LB 10-X AC Ammo", aliases: ["LB 10-X Ammo"], shotsPerTon: 10, availability: [{ from: 2595, to: 2840 }, { from: 3035 }] },
      { id: "ammo-lb-10-x-cluster-is", name: "LB 10-X AC Cluster Ammo", aliases: ["LB 10-X Cluster Ammo"], shotsPerTon: 10, availability: [{ from: 2595, to: 2840 }, { from: 3035 }] },
      { id: "ammo-lb-20-x-is", name: "LB 20-X AC Ammo", aliases: ["LB 20-X Ammo"], shotsPerTon: 5, availability: [{ from: 3058 }] },
      { id: "ammo-lb-20-x-cluster-is", name: "LB 20-X AC Cluster Ammo", aliases: ["LB 20-X Cluster Ammo"], shotsPerTon: 5, availability: [{ from: 3058 }] },
      { id: "ammo-light-ac-2-is", name: "Light AC/2 Ammo", aliases: ["LAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3068 }] },
      { id: "ammo-light-ac-5-is", name: "Light AC/5 Ammo", aliases: ["LAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 3068 }] },
      { id: "ammo-rotary-ac-2-is", name: "Rotary AC/2 Ammo", aliases: ["RAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3062 }] },
      { id: "ammo-rotary-ac-5-is", name: "Rotary AC/5 Ammo", aliases: ["RAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 3062 }] },
      { id: "ammo-ultra-ac-2-is", name: "Ultra AC/2 Ammo", aliases: ["UAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 3057 }] },
      { id: "ammo-ultra-ac-5-is", name: "Ultra AC/5 Ammo", aliases: ["UAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2640, to: 2915 }, { from: 3035 }] },
      { id: "ammo-ultra-ac-10-is", name: "Ultra AC/10 Ammo", aliases: ["UAC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 3057 }] },
      { id: "ammo-ultra-ac-20-is", name: "Ultra AC/20 Ammo", aliases: ["UAC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 3060 }] },
      { id: "ammo-armor-piercing-is", name: "Armor-Piercing Autocannon Ammo", availability: [{ from: 3059 }] },
      { id: "ammo-flechette-is", name: "Flechette Autocannon Ammo", availability: [{ from: 3055 }] },
      { id: "ammo-precision-is", name: "Precision Autocannon Ammo", availability: [{ from: 3062 }] },
      // Gauss, machine gun, flamer and plasma ammunition (Inner Sphere)
      { id: "ammo-light-gauss-rifle-is", name: "Light Gauss Rifle Ammo", shotsPerTon: 16, availability: [{ from: 3056 }] },
      { id: "ammo-gauss-rifle-is", name: "Gauss Rifle Ammo", shotsPerTon: 8, availability: [{ from: 2590, to: 2865 }, { from: 3040 }] },
      { id: "ammo-heavy-gauss-rifle-is", name: "Heavy Gauss Rifle Ammo", shotsPerTon: 4, availability: [{ from: 3061 }] },
      { id: "ammo-light-machine-gun-is", shots: 200, name: "Light Machine Gun Ammo", availability: [{ from: 3068 }] },
      { id: "ammo-light-machine-gun-half-is", shots: 100, name: "Light Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3068 }] },
      { id: "ammo-machine-gun-is", shots: 200, name: "Machine Gun Ammo", availability: [{ from: 1950 }] },
      { id: "ammo-machine-gun-half-is", shots: 100, name: "Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }] },
      { id: "ammo-heavy-machine-gun-is", shots: 100, name: "Heavy Machine Gun Ammo", availability: [{ from: 3068 }] },
      { id: "ammo-heavy-machine-gun-half-is", shots: 50, name: "Heavy Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3068 }] },
      { id: "ammo-vehicle-flamer-is", name: "Flamer (Vehicle) Ammo", aliases: ["Vehicle Flamer Ammo"], shotsPerTon: 20, availability: [{ from: 1950 }] },
      { id: "ammo-plasma-rifle-is", name: "Plasma Rifle Ammo", shotsPerTon: 10, availability: [{ from: 3068 }] },
      // Missile ammunition (Inner Sphere)
      { id: "ammo-lrm-5-is", name: "LRM 5 Ammo", shotsPerTon: 24, availability: [{ from: 2300 }] },
      { id: "ammo-lrm-10-is", name: "LRM 10 Ammo", shotsPerTon: 12, availability: [{ from: 2300 }] },
      { id: "ammo-lrm-15-is", name: "LRM 15 Ammo", shotsPerTon: 8, availability: [{ from: 2300 }] },
      { id: "ammo-lrm-20-is", name: "LRM 20 Ammo", shotsPerTon: 6, availability: [{ from: 2300 }] },
      { id: "ammo-mml-3-lrm-is", name: "MML 3 LRM Ammo", shotsPerTon: 40, availability: [{ from: 2300 }] },
      { id: "ammo-mml-3-srm-is", name: "MML 3 SRM Ammo", shotsPerTon: 33, availability: [{ from: 2370 }] },
      { id: "ammo-mml-5-lrm-is", name: "MML 5 LRM Ammo", shotsPerTon: 24, availability: [{ from: 2300 }] },
      { id: "ammo-mml-5-srm-is", name: "MML 5 SRM Ammo", shotsPerTon: 20, availability: [{ from: 2370 }] },
      { id: "ammo-mml-7-lrm-is", name: "MML 7 LRM Ammo", shotsPerTon: 17, availability: [{ from: 2300 }] },
      { id: "ammo-mml-7-srm-is", name: "MML 7 SRM Ammo", shotsPerTon: 14, availability: [{ from: 2370 }] },
      { id: "ammo-mml-9-lrm-is", name: "MML 9 LRM Ammo", shotsPerTon: 13, availability: [{ from: 2300 }] },
      { id: "ammo-mml-9-srm-is", name: "MML 9 SRM Ammo", shotsPerTon: 11, availability: [{ from: 2370 }] },
      { id: "ammo-srm-2-is", name: "SRM 2 Ammo", shotsPerTon: 50, availability: [{ from: 2370 }] },
      { id: "ammo-srm-4-is", name: "SRM 4 Ammo", shotsPerTon: 25, availability: [{ from: 2370 }] },
      { id: "ammo-srm-6-is", name: "SRM 6 Ammo", shotsPerTon: 15, availability: [{ from: 2370 }] },
      { id: "ammo-mrm-10-is", name: "MRM 10 Ammo", shotsPerTon: 24, availability: [{ from: 3058 }] },
      { id: "ammo-mrm-20-is", name: "MRM 20 Ammo", shotsPerTon: 12, availability: [{ from: 3058 }] },
      { id: "ammo-mrm-30-is", name: "MRM 30 Ammo", shotsPerTon: 8, availability: [{ from: 3058 }] },
      { id: "ammo-mrm-40-is", name: "MRM 40 Ammo", shotsPerTon: 6, availability: [{ from: 3058 }] },
      { id: "ammo-streak-srm-2-is", name: "Streak SRM 2 Ammo", aliases: ["Streak-2 Ammo"], shotsPerTon: 50, availability: [{ from: 2647, to: 2845 }, { from: 3035 }] },
      { id: "ammo-streak-srm-4-is", name: "Streak SRM 4 Ammo", aliases: ["Streak-4 Ammo"], shotsPerTon: 25, availability: [{ from: 3058 }] },
      { id: "ammo-streak-srm-6-is", name: "Streak SRM 6 Ammo", aliases: ["Streak-6 Ammo"], shotsPerTon: 15, availability: [{ from: 3058 }] },
      // Anti-missile and Narc ammunition (Inner Sphere); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-ams-is", name: "Anti-Missile System Ammo", aliases: ["AMS Ammo"], shotsPerTon: 12, availability: [{ from: 2617, to: 2796 }, { from: 3040 }] },
      { id: "ammo-narc-missile-beacon-is", name: "Narc Missile Beacon Ammo", aliases: ["Narc Ammo"], shotsPerTon: 6, availability: [{ from: 2587, to: 2795 }, { from: 3035 }] },
      { id: "ammo-improved-narc-launcher-is", name: "Improved Narc Launcher Ammo", aliases: ["iNarc Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      // Special munitions (Inner Sphere)
      { id: "ammo-artemis-capable-is", name: "Artemis-Capable Missile Ammo", availability: [{ from: 2598, to: 2855 }, { from: 3035 }] },
      { id: "ammo-narc-capable-is", name: "Narc-Capable Missile Ammo", availability: [{ from: 2597, to: 2795 }, { from: 3035 }] },
      { id: "ammo-fragmentation-is", name: "Fragmentation Missile Ammo", availability: [{ from: 2385, to: 2810 }, { from: 3050 }] },
      { id: "ammo-harpoon-is", name: "Harpoon SRM Ammo", availability: [{ from: 2400 }] },
      { id: "ammo-inferno-is", name: "Inferno SRM Ammo", availability: [{ from: 2380 }] },
      { id: "ammo-tear-gas-is", name: "Tear Gas SRM Ammo", availability: [{ from: 2375 }] },
      { id: "ammo-semi-guided-is", name: "Semi-Guided LRM Ammo", availability: [{ from: 3057 }] },
      { id: "ammo-swarm-is", name: "Swarm LRM Ammo", availability: [{ from: 2621, to: 2840 }, { from: 3053 }] },
      { id: "ammo-swarm-i-is", name: "Swarm-I LRM Ammo", availability: [{ from: 3057 }] },
      { id: "ammo-thunder-is", name: "Thunder LRM Ammo", availability: [{ from: 2620, to: 2840 }, { from: 3052 }] },
      { id: "ammo-thunder-augmented-is", name: "Thunder-Augmented LRM Ammo", availability: [{ from: 3057 }] },
      { id: "ammo-thunder-inferno-is", name: "Thunder-Inferno LRM Ammo", availability: [{ from: 3056 }] },
      { id: "ammo-thunder-vibrabomb-is", name: "Thunder-Vibrabomb LRM Ammo", availability: [{ from: 3057 }] },
      { id: "ammo-thunder-active-is", name: "Thunder-Active LRM Ammo", availability: [{ from: 3058 }] },
      // Narc and iNarc pods (Inner Sphere)
      { id: "ammo-narc-explosive-is", name: "Narc Missile Beacon (Explosive) Ammo", aliases: ["Narc Explosive Ammo"], shotsPerTon: 6, availability: [{ from: 3060 }] },
      { id: "ammo-improved-narc-ecm-is", name: "Improved Narc Launcher (ECM) Ammo", aliases: ["iNarc ECM Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-explosive-is", name: "Improved Narc Launcher (Explosive) Ammo", aliases: ["iNarc Explosive Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-haywire-is", name: "Improved Narc Launcher (Haywire) Ammo", aliases: ["iNarc Haywire Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      { id: "ammo-improved-narc-nemesis-is", name: "Improved Narc Launcher (Nemesis) Ammo", aliases: ["iNarc Nemesis Ammo"], shotsPerTon: 4, availability: [{ from: 3062 }] },
      // Nail and rivet gun ammunition (Inner Sphere); the Clan year is the Clan weapon's, the table prints a dash
      { id: "ammo-nail-rivet-gun-is", shots: 300, name: "Nail/Rivet Gun Ammo", availability: [{ from: 1950 }] },
      { id: "ammo-nail-rivet-gun-half-is", shots: 150, name: "Nail/Rivet Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1 },
    items: [
      // Autocannon ammunition (Clan)
      { id: "ammo-lb-2-x-clan", name: "LB 2-X AC Ammo", aliases: ["LB 2-X Ammo"], shotsPerTon: 45, availability: [{ from: 2826 }] },
      { id: "ammo-lb-2-x-cluster-clan", name: "LB 2-X AC Cluster Ammo", aliases: ["LB 2-X Cluster Ammo"], shotsPerTon: 45, availability: [{ from: 2826 }] },
      { id: "ammo-lb-5-x-clan", name: "LB 5-X AC Ammo", aliases: ["LB 5-X Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }] },
      { id: "ammo-lb-5-x-cluster-clan", name: "LB 5-X AC Cluster Ammo", aliases: ["LB 5-X Cluster Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }] },
      { id: "ammo-lb-20-x-clan", name: "LB 20-X AC Ammo", aliases: ["LB 20-X Ammo"], shotsPerTon: 5, availability: [{ from: 2826 }] },
      { id: "ammo-lb-20-x-cluster-clan", name: "LB 20-X AC Cluster Ammo", aliases: ["LB 20-X Cluster Ammo"], shotsPerTon: 5, availability: [{ from: 2826 }] },
      { id: "ammo-ultra-ac-2-clan", name: "Ultra AC/2 Ammo", aliases: ["UAC/2 Ammo"], shotsPerTon: 45, availability: [{ from: 2827 }] },
      { id: "ammo-ultra-ac-10-clan", name: "Ultra AC/10 Ammo", aliases: ["UAC/10 Ammo"], shotsPerTon: 10, availability: [{ from: 2825 }] },
      { id: "ammo-ultra-ac-20-clan", name: "Ultra AC/20 Ammo", aliases: ["UAC/20 Ammo"], shotsPerTon: 5, availability: [{ from: 2825 }] },
      // Gauss, machine gun, flamer and plasma ammunition (Clan)
      { id: "ammo-ap-gauss-rifle-clan", name: "AP Gauss Rifle Ammo", shotsPerTon: 40, availability: [{ from: 3069 }] },
      { id: "ammo-hyper-assault-gauss-20-clan", name: "Hyper-Assault Gauss 20 Ammo", aliases: ["HAG/20 Ammo"], shotsPerTon: 6, availability: [{ from: 3068 }] },
      { id: "ammo-hyper-assault-gauss-30-clan", name: "Hyper-Assault Gauss 30 Ammo", aliases: ["HAG/30 Ammo"], shotsPerTon: 4, availability: [{ from: 3068 }] },
      { id: "ammo-hyper-assault-gauss-40-clan", name: "Hyper-Assault Gauss 40 Ammo", aliases: ["HAG/40 Ammo"], shotsPerTon: 3, availability: [{ from: 3069 }] },
      { id: "ammo-light-machine-gun-clan", shots: 200, name: "Light Machine Gun Ammo", availability: [{ from: 3060 }] },
      { id: "ammo-light-machine-gun-half-clan", shots: 100, name: "Light Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3060 }] },
      { id: "ammo-heavy-machine-gun-clan", shots: 100, name: "Heavy Machine Gun Ammo", availability: [{ from: 3059 }] },
      { id: "ammo-heavy-machine-gun-half-clan", shots: 50, name: "Heavy Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 3059 }] },
      { id: "ammo-plasma-cannon-clan", name: "Plasma Cannon Ammo", shotsPerTon: 10, availability: [{ from: 3069 }] },
      // Missile ammunition (Clan)
      { id: "ammo-atm-3-clan", name: "ATM 3 Ammo", shotsPerTon: 20, availability: [{ from: 3054 }] },
      { id: "ammo-atm-6-clan", name: "ATM 6 Ammo", shotsPerTon: 10, availability: [{ from: 3054 }] },
      { id: "ammo-atm-9-clan", name: "ATM 9 Ammo", shotsPerTon: 7, availability: [{ from: 3054 }] },
      { id: "ammo-atm-12-clan", name: "ATM 12 Ammo", shotsPerTon: 5, availability: [{ from: 3055 }] },
      { id: "ammo-streak-srm-4-clan", name: "Streak SRM 4 Ammo", aliases: ["Streak-4 Ammo"], shotsPerTon: 25, availability: [{ from: 2826 }] },
      { id: "ammo-streak-srm-6-clan", name: "Streak SRM 6 Ammo", aliases: ["Streak-6 Ammo"], shotsPerTon: 15, availability: [{ from: 2826 }] },
      // Anti-missile and Narc ammunition (Clan); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-ams-clan", name: "Anti-Missile System Ammo", aliases: ["AMS Ammo"], shotsPerTon: 24, availability: [{ from: 2831 }] },
      // Special munitions (Clan)
      { id: "ammo-er-atm-clan", name: "ER ATM Ammo", availability: [{ from: 3054 }] },
      { id: "ammo-he-atm-clan", name: "HE ATM Ammo", availability: [{ from: 3054 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: "TechManual", page: 57 }, checked: "page", tons: 1, slots: 1, yearsInferred: true },
    items: [
      // Autocannon ammunition (Clan)
      { id: "ammo-lb-10-x-clan", name: "LB 10-X AC Ammo", aliases: ["LB 10-X Ammo"], shotsPerTon: 10, availability: [{ from: 2824 }] },
      { id: "ammo-lb-10-x-cluster-clan", name: "LB 10-X AC Cluster Ammo", aliases: ["LB 10-X Cluster Ammo"], shotsPerTon: 10, availability: [{ from: 2824 }] },
      { id: "ammo-ultra-ac-5-clan", name: "Ultra AC/5 Ammo", aliases: ["UAC/5 Ammo"], shotsPerTon: 20, availability: [{ from: 2825 }] },
      // Gauss, machine gun, flamer and plasma ammunition (Clan)
      { id: "ammo-gauss-rifle-clan", name: "Gauss Rifle Ammo", shotsPerTon: 8, availability: [{ from: 2828 }] },
      { id: "ammo-machine-gun-clan", shots: 200, name: "Machine Gun Ammo", availability: [{ from: 2825 }] },
      { id: "ammo-machine-gun-half-clan", shots: 100, name: "Machine Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 2825 }] },
      { id: "ammo-vehicle-flamer-clan", name: "Flamer (Vehicle) Ammo", aliases: ["Vehicle Flamer Ammo"], shotsPerTon: 20, availability: [{ from: 1950 }] },
      // Missile ammunition (Clan)
      { id: "ammo-lrm-5-clan", name: "LRM 5 Ammo", shotsPerTon: 24, availability: [{ from: 2824 }] },
      { id: "ammo-lrm-10-clan", name: "LRM 10 Ammo", shotsPerTon: 12, availability: [{ from: 2824 }] },
      { id: "ammo-lrm-15-clan", name: "LRM 15 Ammo", shotsPerTon: 8, availability: [{ from: 2824 }] },
      { id: "ammo-lrm-20-clan", name: "LRM 20 Ammo", shotsPerTon: 6, availability: [{ from: 2824 }] },
      { id: "ammo-srm-2-clan", name: "SRM 2 Ammo", shotsPerTon: 50, availability: [{ from: 2824 }] },
      { id: "ammo-srm-4-clan", name: "SRM 4 Ammo", shotsPerTon: 25, availability: [{ from: 2824 }] },
      { id: "ammo-srm-6-clan", name: "SRM 6 Ammo", shotsPerTon: 15, availability: [{ from: 2824 }] },
      { id: "ammo-streak-srm-2-clan", name: "Streak SRM 2 Ammo", aliases: ["Streak-2 Ammo"], shotsPerTon: 50, availability: [{ from: 2822 }] },
      // Anti-missile and Narc ammunition (Clan); the Narc rows use the launcher lines of the p. 291-292 table, which match the p. 296 ammunition lines
      { id: "ammo-narc-missile-beacon-clan", name: "Narc Missile Beacon Ammo", aliases: ["Narc Ammo"], shotsPerTon: 6, availability: [{ from: 2828 }] },
      // Special munitions (Clan)
      { id: "ammo-artemis-capable-clan", name: "Artemis-Capable Missile Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-narc-capable-clan", name: "Narc-Capable Missile Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-fragmentation-clan", name: "Fragmentation Missile Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-harpoon-clan", name: "Harpoon SRM Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-inferno-clan", name: "Inferno SRM Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-tear-gas-clan", name: "Tear Gas SRM Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-swarm-clan", name: "Swarm LRM Ammo", availability: [{ from: 2824 }] },
      { id: "ammo-thunder-clan", name: "Thunder LRM Ammo", availability: [{ from: 2824 }] },
      // Nail and rivet gun ammunition (Clan); the Clan year is the Clan weapon's, the table prints a dash
      { id: "ammo-nail-rivet-gun-clan", shots: 300, name: "Nail/Rivet Gun Ammo", availability: [{ from: 1950 }] },
      { id: "ammo-nail-rivet-gun-half-clan", shots: 150, name: "Nail/Rivet Gun Ammo (Half Ton)", tons: 0.5, availability: [{ from: 1950 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the Age of War prototypes (Inner Sphere): the Ammo column of the table; the bin is one ton in one slot (TechManual p. 57)
      { id: "ammo-primitive-prototype-ac-2-is", name: "Primitive Prototype Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 34, availability: [{ from: 2290 }] },
      { id: "ammo-primitive-prototype-ac-5-is", name: "Primitive Prototype Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2240 }] },
      { id: "ammo-primitive-prototype-ac-10-is", name: "Primitive Prototype Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2450 }] },
      { id: "ammo-primitive-prototype-ac-20-is", name: "Primitive Prototype Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 2488 }] },
      { id: "ammo-primitive-prototype-lrm-5-is", name: "Primitive Prototype LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 2295 }] },
      { id: "ammo-primitive-prototype-lrm-10-is", name: "Primitive Prototype LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 9, availability: [{ from: 2295 }] },
      { id: "ammo-primitive-prototype-lrm-15-is", name: "Primitive Prototype LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 2295 }] },
      { id: "ammo-primitive-prototype-lrm-20-is", name: "Primitive Prototype LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 4, availability: [{ from: 2295 }] },
      { id: "ammo-primitive-prototype-srm-2-is", name: "Primitive Prototype SRM 2 Ammo", tons: 1, slots: 1, shotsPerTon: 37, availability: [{ from: 2365 }] },
      { id: "ammo-primitive-prototype-srm-4-is", name: "Primitive Prototype SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 18, availability: [{ from: 2365 }] },
      { id: "ammo-primitive-prototype-srm-6-is", name: "Primitive Prototype SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 11, availability: [{ from: 2365 }] },
      { id: "ammo-prototype-arrow-iv-is", name: "Prototype Arrow IV Ammo", tons: 1, slots: 1, shotsPerTon: 3, availability: [{ from: 2593 }] },
      { id: "ammo-prototype-lb-10-x-ac-is", name: "Prototype LB 10-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2590 }] },
      { id: "ammo-prototype-narc-missile-beacon-is", name: "Prototype Narc Missile Beacon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2580 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the early Clan weapons
      { id: "ammo-improved-ac-2-clan", name: "Improved Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2818 }] },
      { id: "ammo-improved-ac-5-clan", name: "Improved Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 2818 }] },
      { id: "ammo-improved-ac-10-clan", name: "Improved Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2818 }] },
      { id: "ammo-improved-ac-20-clan", name: "Improved Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2818 }] },
      { id: "ammo-improved-gauss-rifle-clan", name: "Improved Gauss Rifle Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2822 }] },
      { id: "ammo-improved-lrm-5-clan", name: "Improved LRM 5 Ammo", tons: 1, slots: 1, shotsPerTon: 24, availability: [{ from: 2818 }] },
      { id: "ammo-improved-lrm-10-clan", name: "Improved LRM 10 Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 2818 }] },
      { id: "ammo-improved-lrm-15-clan", name: "Improved LRM 15 Ammo", tons: 1, slots: 1, shotsPerTon: 8, availability: [{ from: 2818 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "ammo-improved-lrm-20-clan", name: "Improved LRM 20 Ammo", tons: 1, slots: 1, shotsPerTon: 6, availability: [{ from: 2818 }] },
      { id: "ammo-improved-srm-2-clan", name: "Improved SRM 2 Ammo", tons: 1, slots: 1, shotsPerTon: 50, availability: [{ from: 2817 }] },
      { id: "ammo-improved-srm-4-clan", name: "Improved SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 25, availability: [{ from: 2817 }] },
      { id: "ammo-improved-srm-6-clan", name: "Improved SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2817 }] },
      { id: "ammo-prototype-lb-2-x-ac-clan", name: "Prototype LB 2-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2820 }] },
      { id: "ammo-prototype-lb-5-x-ac-clan", name: "Prototype LB 5-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 2820 }] },
      { id: "ammo-prototype-lb-20-x-ac-clan", name: "Prototype LB 20-X Autocannon Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2820 }] },
      { id: "ammo-prototype-streak-srm-4-clan", name: "Prototype Streak SRM 4 Ammo", tons: 1, slots: 1, shotsPerTon: 25, availability: [{ from: 2819 }] },
      { id: "ammo-prototype-streak-srm-6-clan", name: "Prototype Streak SRM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 15, availability: [{ from: 2819 }] },
      { id: "ammo-prototype-ultra-ac-2-clan", name: "Prototype Ultra Autocannon/2 Ammo", tons: 1, slots: 1, shotsPerTon: 45, availability: [{ from: 2820 }] },
      { id: "ammo-prototype-ultra-ac-10-clan", name: "Prototype Ultra Autocannon/10 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 2820 }] },
      { id: "ammo-prototype-ultra-ac-20-clan", name: "Prototype Ultra Autocannon/20 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 2820 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Ammunition for the Late Succession Wars prototype Ultra AC/5
      { id: "ammo-prototype-ultra-ac-5-is", name: "Prototype Ultra Autocannon/5 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3029 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Ammunition for the improved ATMs
      { id: "ammo-improved-atm-3-clan", name: "Improved ATM 3 Ammo", tons: 1, slots: 1, shotsPerTon: 20, availability: [{ from: 3070 }] },
      { id: "ammo-improved-atm-6-clan", name: "Improved ATM 6 Ammo", tons: 1, slots: 1, shotsPerTon: 10, availability: [{ from: 3070 }] },
      { id: "ammo-improved-atm-9-clan", name: "Improved ATM 9 Ammo", tons: 1, slots: 1, shotsPerTon: 7, availability: [{ from: 3070 }] },
      { id: "ammo-improved-atm-12-clan", name: "Improved ATM 12 Ammo", tons: 1, slots: 1, shotsPerTon: 5, availability: [{ from: 3070 }] },
    ],
  },
  {
    defaults: { kind: "ammunition", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Ammunition for the RISC Advanced PDS
      { id: "ammo-risc-advanced-pds-is", name: "RISC Advanced PDS Ammo", tons: 1, slots: 1, shotsPerTon: 12, availability: [{ from: 3137 }] },
    ],
  },
];
