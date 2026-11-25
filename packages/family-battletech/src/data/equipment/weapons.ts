// Weapons a standard BattleMech can mount, Inner Sphere and Clan as separate rows, from TechManual (corrected sixth
// printing, errata v8.0). Plain data in groups: a group's `defaults` carry what its items share, an item states only what
// differs. No Battle Value or cost: those are other tables.
//
// Play statistics (heat, damage, range) are the same Weapons and Equipment tables, printed pp. 341-343 (Inner Sphere pp.
// 341-342, Clan p. 343), read against the page images; `playCite` is set where the row's `cite` names an item page instead.
// Heat is the figure per firing (per shot for the rotary and ultra autocannons, whose damage reads "2/Shot"); damage is
// the book's text, with "Special" for the items whose damage the table leaves to the item rules (**). `range` is minimum,
// short, medium and long: the table's Min/Sht/Med/Lng, so a minimum of 0 is the book's dash. The Heavy Machine Gun's
// long range prints a dash too: a band the book prints as a dash is stored as 0. A multi-mode launcher (MML) has heat
// and damage text but no range, since the book gives one range per mode. Items with no printed figures (the retractable blade) carry none. The Type
// column is not in TechManual: it comes from the Core Rulebook's Weapons and Equipment Tables (printed pp. 248-252, read
// against the page images), as printed; a row the Core table lists without a Type (the Inner Sphere anti-missile system)
// or does not list (the vehicle flamer, hatchet, sword) has none.
//
// Where each value came from. Tons and slots (the M column, critical slots) are the Weapons and Equipment tables,
// printed pp. 341-343; the group's cite names that page. Years are the Heavy Weapons and Equipment cost and availability
// table, printed pp. 290-292, whose Introduced, Extinction and Reintroduced columns give an Inner Sphere and a Clan year.
// Every page named here was read against the page image, so the rows are checked "page". Conventions for the years:
//  - A span runs from the introduction year to the extinction year inclusive, as the book prints them; a reintroduction
//    year starts a second span. No extinction means the span is open.
//  - "PS" (pre-spaceflight, 1950 or sooner) is written as 1950 and "ES" (early spaceflight, 1951 to 2200) as 2200, the
//    latest year the book allows each to mean; circa years are written as printed.
//  - `yearsInferred: true` marks a row whose years are not printed for its tech base. Where the Clan introduction column
//    prints a dash the book means the item pre-existed, not that the Clan year equals the Inner Sphere one; the row then
//    takes the Inner Sphere year (weapons) or its Clan weapon's year (Clan ammunition), and is marked. Clan items the
//    table lists with a year are not marked. A marked row keeps checked "page" for its tons and slots; only its years
//    carry the caveat. Items the Clan table does not list (standard ACs, PPCs, medium and large lasers) have no Clan row.
//  - Where errata v8.0 differs from the printing the erratum wins, except the Large Laser: the erratum's p. 291 entry
//    says 2300 and its p. 227 entry says 2316, so the printed 2316 stands (see the row). The Snub-Nose PPC follows the
//    p. 234 text as amended by the errata (introduced 2784, extinct 2790, recovered 3067); the p. 291 table lists only 3067.
// Placement limits (`locations`) and splitting follow the item entries on pp. 204-238 and the ranged-weapon rule on p. 57:
// a ranged weapon of 8 or more slots may be split between two adjacent locations other than the legs.
// `directFire` marks the weapons whose weight counts toward a targeting computer (p. 238): non-missile pulse and
// direct-fire heavy weapons, not machine guns, flamers or TAG. TechManual's own tables have no Type column; the Type
// comes from Total Warfare's weapons tables, which print the plasma rifle and plasma cannon as DE (direct-fire energy,
// with heat effect) and the AP Gauss rifle as DB (direct-fire ballistic), so all three count.
// A formula name (a string in `tons` or `slots`) is defined in rules/catalog.ts.
//
// Interstellar Operations: Alternate Eras (corrected second printing): the Additional Alternate Era Weapons and Equipment
// table, printed pp. 210-215, read against the page images. Its play figures are pp. 210, 212 and 214 (Type, Heat, Damage,
// Range, Ammo, Rules Level) and its tons, slots and Latest Intro Date are the facing pp. 211, 213 and 215: `cite` is the
// second, `playCite` the first. The table prints one date per tech base and no extinction, so each row has one open span;
// a P on a year means the item existed only as a prototype, and a ~ is a circa year, both written as the year. Rules level
// is the table's Rules Level column ("Exp" experimental, "Adv" advanced, "TL" tournament legal, written standard). Items the
// book prints for both tech bases with one date (the prototype rocket launchers) are a row for each. `directFire` is the
// table's TC Comp column (Y). The damage column's cluster size (C5/10 and the like) is not kept, as for the TechManual rows;
// "Special" stands for the table's asterisk. Types are as printed, including the ultra autocannon prototypes' "M, C" and
// the improved ATMs' "S*". The Late Succession Wars repeats of a prototype already listed (Gauss rifle, LB 10-X, medium pulse
// laser) carry the era in the name. Heat that the table prints as a base plus a die roll (the prototype pulse lasers and
// ER large laser) is left out rather than stored as the base. The table's To-Hit Modifier column has no field and is not kept.
// Not added: items whose weight, slots or both carry an asterisk (prototype double heat sink, radical heat sink, HarJel II
// and III, laser pulse module, remote drone command console, super-cooled myomer, and the special munitions: anti-TSM,
// Listen-Kill, Dead-Fire, RS Streak SRM, SS Narc, IMP and IIW ATM), items with no BattleMech space (Fusillade launcher,
// magnetic clamp, ProtoMech quad melee system), conversion and structure items (LAM and QuadVee conversion equipment and
// wheels, tripod and superheavy structure, cockpits, primitive musculature, extended jump jet system, primitive
// prototype jump jets), armor types, the Heat Sink Override Kit (0 tons, 0 slots), implants, interface and drone systems,
// thermobaric ordnance, weapons of mass destruction and nuclear weapons.
//
// Tactical Operations: Advanced Units and Equipment (the 2021-2022 printing in the library): the Heavy Weapons and
// Equipment Combat Data and Construction Data tables, printed pp. 216-223, read against the page images. Same layout as the
// Alternate Eras table: the Combat Data page (pp. 216, 218, 220, 222) is `playCite`, the Construction Data page facing it
// (pp. 217, 219, 221, 223) is `cite`; each row has its table's rules level (Exp, Adv). The conventions above apply, with
// these differences. The date column is the Latest Intro Date for each tech base, so an item that was lost and found again
// (the Terran Hegemony cockpit command console, say) shows the later date; an X after a date means the item has since
// become extinct and not recovered, and the table gives no year for that, so the span stays open. Rows the table prints for
// both tech bases are a row for each, with each tech base's own weight and slots where they differ (Arrow IV, mortars,
// CASE II, laser anti-missile system). Artillery cannons are "Cannon" rows and the artillery pieces "Artillery" rows, where
// the table lists both under one name; the Clan rotary autocannons print "/Sht" for "/Shot" and are written "/Shot", as the
// Inner Sphere ones are. The streak LRMs print only their cluster damage (C5/5 and so on) and are written so. An asterisk
// beside a number sends the reader to the item's rules (p. 86 and following); where the number is the item's whole weight
// or slot count it is used as printed (as the TechManual's C3 computer slots are), and the asterisk is not kept. Add-ons
// that the table prints as +weight and +slots (Artemis V, Apollo, PPC Capacitor, Laser Insulator) are rows that `need` the
// host they attach to; only the Artemis host is checked (rules/checks.ts), the others are not yet. Items that print a heat
// of +5 or -1 (the capacitor, the insulator) or a heat of * (the Bombast laser, the coolant pod) carry none.
// Not added from this table: items with a formula or asterisked weight or slots that the catalog has no pattern for (claws,
// lance, mace and talons by tonnage, handheld weapons, jump packs, mechanical jump boosters, partial wings, UMUs, the
// supercharger, turrets, vehicular jump jets, compact and laser heat sinks, the Blue Shield, Chameleon LPS, null-signature and
// void-signature systems, the booby trap, aquatic survival system, collapsible command module, HarJel), cockpit, structure,
// engine and armor systems, items for other unit types only (vehicle, aerospace, battle armor, ProtoMech, naval, drone,
// space station and DropShip equipment, the Long Tom, cruise missiles, satellite imagers and the sub-capital weapons), and the
// improved one-shot launcher, a modifier.

import type { EquipmentGroup } from "../../rules/catalog";

const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";

export const WEAPONS: EquipmentGroup[] = [
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 341 }, checked: "page", directFire: true },
    items: [
      // Autocannons (Inner Sphere)
      { id: "ac-2-is", name: "Autocannon/2", aliases: ["AC/2"], tons: 6, slots: 1, type: "DB, S", heat: 1, damage: "2", range: [4, 8, 16, 24], availability: [{ from: 2300 }] },
      { id: "ac-5-is", name: "Autocannon/5", aliases: ["AC/5"], tons: 8, slots: 4, type: "DB, S", heat: 1, damage: "5", range: [3, 6, 12, 18], availability: [{ from: 2250 }] },
      { id: "ac-10-is", name: "Autocannon/10", aliases: ["AC/10"], tons: 12, slots: 7, type: "DB, S", heat: 3, damage: "10", range: [0, 5, 10, 15], availability: [{ from: 2460 }] },
      { id: "ac-20-is", name: "Autocannon/20", aliases: ["AC/20"], tons: 14, slots: 10, type: "DB, S", heat: 7, damage: "20", range: [0, 3, 6, 9], availability: [{ from: 2500 }], splittable: true },
      { id: "lb-2-x-ac-is", name: "LB 2-X AC", aliases: ["LB 2-X"], tons: 6, slots: 4, type: "DB, S", heat: 1, damage: "2", range: [4, 9, 18, 27], availability: [{ from: 3058 }] },
      { id: "lb-5-x-ac-is", name: "LB 5-X AC", aliases: ["LB 5-X"], tons: 8, slots: 5, type: "DB, S", heat: 1, damage: "5", range: [3, 7, 14, 21], availability: [{ from: 3058 }] },
      { id: "lb-10-x-ac-is", name: "LB 10-X AC", aliases: ["LB 10-X"], tons: 11, slots: 6, type: "DB, S", heat: 2, damage: "10", range: [0, 6, 12, 18], availability: [{ from: 2595, to: 2840 }, { from: 3035 }] },
      { id: "lb-20-x-ac-is", name: "LB 20-X AC", aliases: ["LB 20-X"], tons: 14, slots: 11, type: "DB, S", heat: 6, damage: "20", range: [0, 4, 8, 12], availability: [{ from: 3058 }], splittable: true },
      { id: "light-ac-2-is", name: "Light AC/2", aliases: ["LAC/2"], tons: 4, slots: 1, type: "DB, S", heat: 1, damage: "2", range: [0, 6, 12, 18], availability: [{ from: 3068 }] },
      { id: "light-ac-5-is", name: "Light AC/5", aliases: ["LAC/5"], tons: 5, slots: 2, type: "DB, S", heat: 1, damage: "5", range: [0, 5, 10, 15], availability: [{ from: 3068 }] },
      { id: "rotary-ac-2-is", name: "Rotary AC/2", aliases: ["RAC/2"], tons: 8, slots: 3, type: "DB, R, S", heat: 1, damage: "2/Shot", range: [0, 6, 12, 18], availability: [{ from: 3062 }] },
      { id: "rotary-ac-5-is", name: "Rotary AC/5", aliases: ["RAC/5"], tons: 10, slots: 6, type: "DB, R, S", heat: 1, damage: "5/Shot", range: [0, 5, 10, 15], availability: [{ from: 3062 }] },
      { id: "ultra-ac-2-is", name: "Ultra AC/2", aliases: ["UAC/2"], tons: 7, slots: 3, type: "DB, R", heat: 1, damage: "2/Shot", range: [3, 8, 17, 25], availability: [{ from: 3057 }] },
      { id: "ultra-ac-5-is", name: "Ultra AC/5", aliases: ["UAC/5"], tons: 9, slots: 5, type: "DB, R", heat: 1, damage: "5/Shot", range: [2, 6, 13, 20], availability: [{ from: 2640, to: 2915 }, { from: 3035 }] },
      { id: "ultra-ac-10-is", name: "Ultra AC/10", aliases: ["UAC/10"], tons: 13, slots: 7, type: "DB, R", heat: 4, damage: "10/Shot", range: [0, 6, 12, 18], availability: [{ from: 3057 }] },
      { id: "ultra-ac-20-is", name: "Ultra AC/20", aliases: ["UAC/20"], tons: 15, slots: 10, type: "DB, R", heat: 8, damage: "20/Shot", range: [0, 3, 7, 10], availability: [{ from: 3060 }], splittable: true },
      // Gauss rifles (Inner Sphere)
      { id: "light-gauss-rifle-is", name: "Light Gauss Rifle", tons: 12, slots: 5, type: "DB, X", heat: 1, damage: "8", range: [3, 8, 17, 25], availability: [{ from: 3056 }] },
      { id: "gauss-rifle-is", name: "Gauss Rifle", tons: 15, slots: 7, type: "DB, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 2590, to: 2865 }, { from: 3040 }] },
      { id: "heavy-gauss-rifle-is", name: "Heavy Gauss Rifle", tons: 18, slots: 11, type: "DB, V, X", heat: 2, damage: "25/20/10", range: [4, 6, 13, 20], availability: [{ from: 3061 }], locations: ["CT", "LT", "RT"], splittable: true },
      // Lasers (Inner Sphere)
      { id: "er-small-laser-is", name: "ER Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 2, damage: "3", range: [0, 2, 4, 5], availability: [{ from: 3058 }] },
      { id: "er-medium-laser-is", name: "ER Medium Laser", tons: 1, slots: 1, type: "DE", heat: 5, damage: "5", range: [0, 4, 8, 12], availability: [{ from: 3058 }] },
      { id: "er-large-laser-is", name: "ER Large Laser", tons: 5, slots: 2, type: "DE", heat: 12, damage: "8", range: [0, 7, 14, 19], availability: [{ from: 2620, to: 2950 }, { from: 3037 }] },
      { id: "small-laser-is", name: "Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 1, damage: "3", range: [0, 1, 2, 3], availability: [{ from: 2300 }] },
      { id: "medium-laser-is", name: "Medium Laser", tons: 1, slots: 1, type: "DE", heat: 3, damage: "5", range: [0, 3, 6, 9], availability: [{ from: 2300 }] },
      // Errata v8.0 contradicts itself on this year (2300 in its p. 291 entry, 2316 in its p. 227 entry); the printed table and text both say 2316.
      { id: "large-laser-is", name: "Large Laser", tons: 5, slots: 2, type: "DE", heat: 8, damage: "8", range: [0, 5, 10, 15], playCite: { book: "TechManual", page: 341 }, availability: [{ from: 2316 }], cite: { book: "TechManual", page: 227 } },
      { id: "small-pulse-laser-is", name: "Small Pulse Laser", tons: 1, slots: 1, type: "AI, P", heat: 2, damage: "3", range: [0, 1, 2, 3], availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      { id: "medium-pulse-laser-is", name: "Medium Pulse Laser", tons: 2, slots: 1, type: "P", heat: 4, damage: "6", range: [0, 2, 4, 6], availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      { id: "large-pulse-laser-is", name: "Large Pulse Laser", tons: 7, slots: 2, type: "P", heat: 10, damage: "9", range: [0, 3, 7, 10], availability: [{ from: 2609, to: 2950 }, { from: 3037 }] },
      // Plasma weapons and PPCs (Inner Sphere)
      { id: "plasma-rifle-is", name: "Plasma Rifle", tons: 6, slots: 2, type: "AI, DE, H", heat: 10, damage: "10", range: [0, 5, 10, 15], availability: [{ from: 3068 }] },
      { id: "light-ppc-is", name: "Light PPC", tons: 3, slots: 2, type: "DE", heat: 5, damage: "5", range: [3, 6, 12, 18], availability: [{ from: 3067 }] },
      { id: "ppc-is", name: "PPC", tons: 7, slots: 3, type: "DE", heat: 10, damage: "10", range: [3, 6, 12, 18], availability: [{ from: 2460 }] },
      { id: "heavy-ppc-is", name: "Heavy PPC", tons: 10, slots: 4, type: "DE", heat: 15, damage: "15", range: [3, 6, 12, 18], availability: [{ from: 3067 }] },
      { id: "er-ppc-is", name: "ER PPC", tons: 7, slots: 3, type: "DE", heat: 15, damage: "10", range: [0, 7, 14, 23], availability: [{ from: 2751, to: 2860 }, { from: 3037 }] },
      { id: "snub-nose-ppc-is", name: "Snub-Nose PPC", aliases: ["Snub-Nosed PPC"], tons: 6, slots: 2, type: "DE, V", heat: 10, damage: "10/8/5", range: [0, 9, 13, 15], playCite: { book: "TechManual", page: 341 }, availability: [{ from: 2784, to: 2790 }, { from: 3067 }], cite: { book: "TechManual", page: 234 } },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 341 }, checked: "page" },
    items: [
      // Machine guns and flamers (Inner Sphere)
      { id: "light-machine-gun-is", name: "Light Machine Gun", tons: 0.5, slots: 1, type: "AI, DB", heat: 0, damage: "1", range: [0, 2, 4, 6], availability: [{ from: 3068 }] },
      { id: "machine-gun-is", name: "Machine Gun", aliases: ["MG"], tons: 0.5, slots: 1, type: "AI, DB", heat: 0, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 1950 }] },
      { id: "heavy-machine-gun-is", name: "Heavy Machine Gun", tons: 1, slots: 1, type: "AI, DB", heat: 0, damage: "3", range: [0, 1, 2, 0], availability: [{ from: 3068 }] },
      { id: "flamer-is", name: "Flamer", tons: 1, slots: 1, type: "AI, DE, H", heat: 3, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 2025 }] },
      { id: "vehicle-flamer-is", name: "Flamer (Vehicle)", aliases: ["Vehicle Flamer"], tons: 0.5, slots: 1, heat: 3, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 1950 }] },
      // Missile launchers (Inner Sphere)
      { id: "lrm-5-is", name: "LRM 5", tons: 2, slots: 1, type: "C, M, S", heat: 2, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2300 }] },
      { id: "lrm-10-is", name: "LRM 10", tons: 5, slots: 2, type: "C, M, S", heat: 4, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2300 }] },
      { id: "lrm-15-is", name: "LRM 15", tons: 7, slots: 3, type: "C, M, S", heat: 5, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2315 }] },
      { id: "lrm-20-is", name: "LRM 20", tons: 10, slots: 5, type: "C, M, S", heat: 6, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2315 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 342 }, checked: "page" },
    items: [
      // Missile launchers (Inner Sphere)
      { id: "mml-3-is", name: "MML 3", tons: 1.5, slots: 2, type: "C, M, S", heat: 2, damage: "1/Msl, 2/Msl", availability: [{ from: 3068 }] },
      { id: "mml-5-is", name: "MML 5", tons: 3, slots: 3, type: "C, M, S", heat: 3, damage: "1/Msl, 2/Msl", availability: [{ from: 3068 }] },
      { id: "mml-7-is", name: "MML 7", tons: 4.5, slots: 4, type: "C, M, S", heat: 4, damage: "1/Msl, 2/Msl", availability: [{ from: 3068 }] },
      { id: "mml-9-is", name: "MML 9", tons: 6, slots: 5, type: "C, M, S", heat: 5, damage: "1/Msl, 2/Msl", availability: [{ from: 3068 }] },
      { id: "srm-2-is", name: "SRM 2", tons: 1, slots: 1, type: "C, M, S", heat: 2, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2370 }] },
      { id: "srm-4-is", name: "SRM 4", tons: 2, slots: 1, type: "C, M, S", heat: 3, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2370 }] },
      { id: "srm-6-is", name: "SRM 6", tons: 3, slots: 2, type: "C, M, S", heat: 4, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2370 }] },
      { id: "mrm-10-is", name: "MRM 10", tons: 3, slots: 2, type: "C, M", heat: 4, damage: "1/Msl", range: [0, 3, 8, 15], availability: [{ from: 3058 }] },
      { id: "mrm-20-is", name: "MRM 20", tons: 7, slots: 3, type: "C, M", heat: 6, damage: "1/Msl", range: [0, 3, 8, 15], availability: [{ from: 3058 }] },
      { id: "mrm-30-is", name: "MRM 30", tons: 10, slots: 5, type: "C, M", heat: 10, damage: "1/Msl", range: [0, 3, 8, 15], availability: [{ from: 3058 }] },
      { id: "mrm-40-is", name: "MRM 40", tons: 12, slots: 7, type: "C, M", heat: 12, damage: "1/Msl", range: [0, 3, 8, 15], availability: [{ from: 3058 }] },
      { id: "rocket-launcher-10-is", name: "Rocket Launcher 10", tons: 0.5, slots: 1, type: "C, M, OS", heat: 3, damage: "1/Msl", range: [0, 5, 11, 18], availability: [{ from: 3064 }] },
      { id: "rocket-launcher-15-is", name: "Rocket Launcher 15", tons: 1, slots: 2, type: "C, M, OS", heat: 4, damage: "1/Msl", range: [0, 4, 9, 15], availability: [{ from: 3064 }] },
      { id: "rocket-launcher-20-is", name: "Rocket Launcher 20", tons: 1.5, slots: 3, type: "C, M, OS", heat: 5, damage: "1/Msl", range: [0, 3, 7, 12], availability: [{ from: 3064 }] },
      { id: "streak-srm-2-is", name: "Streak SRM 2", aliases: ["Streak-2"], tons: 1.5, slots: 1, type: "C, M", heat: 2, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2647, to: 2845 }, { from: 3035 }] },
      { id: "streak-srm-4-is", name: "Streak SRM 4", aliases: ["Streak-4"], tons: 3, slots: 1, type: "C, M", heat: 3, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 3058 }] },
      { id: "streak-srm-6-is", name: "Streak SRM 6", aliases: ["Streak-6"], tons: 4.5, slots: 2, type: "C, M", heat: 4, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 3058 }] },
      // Anti-missile systems, pods and Narc (Inner Sphere)
      { id: "ams-is", name: "Anti-Missile System", aliases: ["AMS"], tons: 0.5, slots: 1, heat: 1, damage: "Special", availability: [{ from: 2617, to: 2796 }, { from: 3040 }] },
      { id: "a-pods-is", name: "A-Pods", aliases: ["A-Pod", "Anti-Personnel Pod"], tons: 0.5, slots: 1, type: "AI, OS, PB", heat: 0, damage: "Special", availability: [{ from: 3055 }], locations: ["LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
      { id: "b-pods-is", name: "B-Pods", aliases: ["B-Pod"], tons: 1, slots: 1, type: "OS, PB", heat: 0, damage: "Special", availability: [{ from: 3069 }] },
      { id: "narc-missile-beacon-is", name: "Narc Missile Beacon", aliases: ["Narc"], tons: 3, slots: 2, type: "M, S", heat: 0, damage: "Special", range: [0, 3, 6, 9], availability: [{ from: 2587, to: 2795 }, { from: 3035 }] },
      { id: "improved-narc-launcher-is", name: "Improved Narc Launcher", aliases: ["Imp. Narc Launcher", "iNarc"], tons: 5, slots: 3, type: "M, S", heat: 0, damage: "Special", range: [0, 4, 9, 15], availability: [{ from: 3062 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page", directFire: true },
    items: [
      // Autocannons (Clan)
      { id: "lb-2-x-ac-clan", name: "LB 2-X AC", aliases: ["LB 2-X"], tons: 5, slots: 3, type: "DB, S", heat: 1, damage: "2", range: [4, 10, 20, 30], availability: [{ from: 2826 }] },
      { id: "lb-5-x-ac-clan", name: "LB 5-X AC", aliases: ["LB 5-X"], tons: 7, slots: 4, type: "DB, S", heat: 1, damage: "5", range: [3, 8, 15, 24], availability: [{ from: 2825 }] },
      { id: "lb-10-x-ac-clan", name: "LB 10-X AC", aliases: ["LB 10-X"], tons: 10, slots: 5, type: "DB, S", heat: 2, damage: "10", range: [0, 6, 12, 18], availability: [{ from: 2824 }] },
      { id: "lb-20-x-ac-clan", name: "LB 20-X AC", aliases: ["LB 20-X"], tons: 12, slots: 9, type: "DB, S", heat: 6, damage: "20", range: [0, 4, 8, 12], availability: [{ from: 2826 }], splittable: true },
      { id: "ultra-ac-2-clan", name: "Ultra AC/2", aliases: ["UAC/2"], tons: 5, slots: 2, type: "DB, R", heat: 1, damage: "2/Shot", range: [2, 9, 18, 27], availability: [{ from: 2827 }] },
      { id: "ultra-ac-5-clan", name: "Ultra AC/5", aliases: ["UAC/5"], tons: 7, slots: 3, type: "DB, R", heat: 1, damage: "5/Shot", range: [0, 7, 14, 21], availability: [{ from: 2825 }] },
      { id: "ultra-ac-10-clan", name: "Ultra AC/10", aliases: ["UAC/10"], tons: 10, slots: 4, type: "DB, R", heat: 3, damage: "10/Shot", range: [0, 6, 12, 18], availability: [{ from: 2825 }] },
      { id: "ultra-ac-20-clan", name: "Ultra AC/20", aliases: ["UAC/20"], tons: 12, slots: 8, type: "DB, R", heat: 7, damage: "20/Shot", range: [0, 4, 8, 12], availability: [{ from: 2825 }], splittable: true },
      // Gauss rifles (Clan)
      { id: "ap-gauss-rifle-clan", name: "AP Gauss Rifle", tons: 0.5, slots: 1, type: "AI, DB, X", heat: 1, damage: "3", range: [0, 3, 6, 9], availability: [{ from: 3069 }] },
      { id: "gauss-rifle-clan", name: "Gauss Rifle", tons: 12, slots: 6, type: "DB, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 2828 }] },
      { id: "hyper-assault-gauss-20-clan", name: "Hyper-Assault Gauss 20", aliases: ["Hyper Assault Gauss 20", "HAG/20"], tons: 10, slots: 6, type: "C, DB, X", heat: 4, damage: "20", range: [2, 8, 16, 24], availability: [{ from: 3068 }] },
      { id: "hyper-assault-gauss-30-clan", name: "Hyper-Assault Gauss 30", aliases: ["Hyper Assault Gauss 30", "HAG/30"], tons: 13, slots: 8, type: "C, DB, X", heat: 6, damage: "30", range: [2, 8, 16, 24], availability: [{ from: 3068 }], splittable: true },
      { id: "hyper-assault-gauss-40-clan", name: "Hyper-Assault Gauss 40", aliases: ["Hyper Assault Gauss 40", "HAG/40"], tons: 16, slots: 10, type: "C, DB, X", heat: 8, damage: "40", range: [2, 8, 16, 24], availability: [{ from: 3069 }], splittable: true },
      // Lasers (Clan)
      { id: "er-micro-laser-clan", name: "ER Micro Laser", tons: 0.25, slots: 1, type: "DE", heat: 1, damage: "2", range: [0, 1, 2, 4], availability: [{ from: 3060 }] },
      { id: "er-small-laser-clan", name: "ER Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 2, damage: "5", range: [0, 2, 4, 6], availability: [{ from: 2825 }] },
      { id: "er-medium-laser-clan", name: "ER Medium Laser", tons: 1, slots: 1, type: "DE", heat: 5, damage: "7", range: [0, 5, 10, 15], availability: [{ from: 2824 }] },
      { id: "er-large-laser-clan", name: "ER Large Laser", tons: 4, slots: 1, type: "DE", heat: 12, damage: "10", range: [0, 8, 15, 25], availability: [{ from: 2823 }] },
      { id: "micro-pulse-laser-clan", name: "Micro Pulse Laser", tons: 0.5, slots: 1, type: "AI, P", heat: 1, damage: "3", range: [0, 1, 2, 3], availability: [{ from: 3060 }] },
      { id: "small-pulse-laser-clan", name: "Small Pulse Laser", tons: 1, slots: 1, type: "AI, P", heat: 2, damage: "3", range: [0, 2, 4, 6], availability: [{ from: 2829 }] },
      { id: "medium-pulse-laser-clan", name: "Medium Pulse Laser", tons: 2, slots: 1, type: "P", heat: 4, damage: "7", range: [0, 4, 8, 12], availability: [{ from: 2827 }] },
      { id: "large-pulse-laser-clan", name: "Large Pulse Laser", tons: 6, slots: 2, type: "P", heat: 10, damage: "10", range: [0, 6, 14, 20], availability: [{ from: 2824 }] },
      { id: "heavy-small-laser-clan", name: "Heavy Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 3, damage: "6", range: [0, 1, 2, 3], availability: [{ from: 3059 }] },
      { id: "heavy-medium-laser-clan", name: "Heavy Medium Laser", tons: 1, slots: 2, type: "DE", heat: 7, damage: "10", range: [0, 3, 6, 9], availability: [{ from: 3059 }] },
      { id: "heavy-large-laser-clan", name: "Heavy Large Laser", tons: 4, slots: 3, type: "DE", heat: 18, damage: "16", range: [0, 5, 10, 15], availability: [{ from: 3059 }] },
      // Plasma weapons and PPCs (Clan)
      { id: "plasma-cannon-clan", name: "Plasma Cannon", tons: 3, slots: 1, type: "AI, DE, H", heat: 7, damage: "Special", range: [0, 6, 12, 18], availability: [{ from: 3069 }] },
      { id: "er-ppc-clan", name: "ER PPC", tons: 6, slots: 2, type: "DE", heat: 15, damage: "15", range: [0, 7, 14, 23], availability: [{ from: 2826 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page" },
    items: [
      // Machine guns and flamers (Clan)
      { id: "light-machine-gun-clan", name: "Light Machine Gun", tons: 0.25, slots: 1, type: "AI, DB", heat: 0, damage: "1", range: [0, 2, 4, 6], availability: [{ from: 3060 }] },
      { id: "machine-gun-clan", name: "Machine Gun", aliases: ["MG"], tons: 0.25, slots: 1, type: "AI, DB", heat: 0, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 2825 }] },
      { id: "heavy-machine-gun-clan", name: "Heavy Machine Gun", tons: 0.5, slots: 1, type: "AI, DB", heat: 0, damage: "3", range: [0, 1, 2, 0], availability: [{ from: 3059 }] },
      { id: "flamer-clan", name: "Flamer", tons: 0.5, slots: 1, type: "AI, DE, H", heat: 3, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 2827 }] },
      // Missile launchers (Clan)
      { id: "atm-3-clan", name: "ATM 3", tons: 1.5, slots: 2, type: "C, M, S", heat: 2, damage: "2/Msl", range: [4, 5, 10, 15], availability: [{ from: 3054 }] },
      { id: "atm-6-clan", name: "ATM 6", tons: 3.5, slots: 3, type: "C, M, S", heat: 4, damage: "2/Msl", range: [4, 5, 10, 15], availability: [{ from: 3054 }] },
      { id: "atm-9-clan", name: "ATM 9", tons: 5, slots: 4, type: "C, M, S", heat: 6, damage: "2/Msl", range: [4, 5, 10, 15], availability: [{ from: 3054 }] },
      { id: "atm-12-clan", name: "ATM 12", tons: 7, slots: 5, type: "C, M, S", heat: 8, damage: "2/Msl", range: [4, 5, 10, 15], availability: [{ from: 3055 }] },
      { id: "lrm-5-clan", name: "LRM 5", tons: 1, slots: 1, type: "C, M, S", heat: 2, damage: "1/Msl", range: [0, 7, 14, 21], availability: [{ from: 2824 }] },
      { id: "lrm-10-clan", name: "LRM 10", tons: 2.5, slots: 1, type: "C, M, S", heat: 4, damage: "1/Msl", range: [0, 7, 14, 21], availability: [{ from: 2824 }] },
      { id: "lrm-15-clan", name: "LRM 15", tons: 3.5, slots: 2, type: "C, M, S", heat: 5, damage: "1/Msl", range: [0, 7, 14, 21], availability: [{ from: 2824 }] },
      { id: "lrm-20-clan", name: "LRM 20", tons: 5, slots: 4, type: "C, M, S", heat: 6, damage: "1/Msl", range: [0, 7, 14, 21], availability: [{ from: 2824 }] },
      { id: "srm-2-clan", name: "SRM 2", tons: 0.5, slots: 1, type: "C, M, S", heat: 2, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2824 }] },
      { id: "srm-4-clan", name: "SRM 4", tons: 1, slots: 1, type: "C, M, S", heat: 3, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2824 }] },
      { id: "srm-6-clan", name: "SRM 6", tons: 1.5, slots: 1, type: "C, M, S", heat: 4, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2824 }] },
      { id: "streak-srm-2-clan", name: "Streak SRM 2", aliases: ["Streak-2"], tons: 1, slots: 1, type: "C, M", heat: 2, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2822 }] },
      { id: "streak-srm-4-clan", name: "Streak SRM 4", aliases: ["Streak-4"], tons: 2, slots: 1, type: "C, M", heat: 3, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2826 }] },
      { id: "streak-srm-6-clan", name: "Streak SRM 6", aliases: ["Streak-6"], tons: 3, slots: 2, type: "C, M", heat: 4, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2826 }] },
      // Anti-missile systems, pods and Narc (Clan)
      { id: "ams-clan", name: "Anti-Missile System", aliases: ["AMS"], tons: 0.5, slots: 1, type: "PB", heat: 1, damage: "Special", availability: [{ from: 2831 }] },
      { id: "a-pods-clan", name: "A-Pods", aliases: ["A-Pod", "Anti-Personnel Pod"], tons: 0.5, slots: 1, type: "AI, OS, PB", heat: 0, damage: "Special", availability: [{ from: 2850 }], locations: ["LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
      { id: "b-pods-clan", name: "B-Pods", aliases: ["B-Pod"], tons: 1, slots: 1, type: "OS, PB", heat: 0, damage: "Special", availability: [{ from: 3068 }] },
      { id: "narc-missile-beacon-clan", name: "Narc Missile Beacon", aliases: ["Narc"], tons: 2, slots: 1, type: "M, S", heat: 0, damage: "Special", range: [0, 4, 8, 12], availability: [{ from: 2828 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page", yearsInferred: true },
    items: [
      // Machine guns and flamers (Clan)
      { id: "vehicle-flamer-clan", name: "Flamer (Vehicle)", aliases: ["Vehicle Flamer"], tons: 0.5, slots: 1, heat: 3, damage: "2", range: [0, 1, 2, 3], availability: [{ from: 1950 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 237 }, checked: "page" },
    items: [
      // Physical weapons (Inner Sphere); weight and slots follow the 'Mech's tonnage (formulas in rules/catalog.ts)
      { id: "hatchet-is", name: "Hatchet", tons: "ceil-tons-15", slots: "ceil-tons-15", heat: 0, damage: "Special", playCite: { book: "TechManual", page: 342 }, availability: [{ from: 3022 }], locations: ["LA", "RA"], cite: { book: "TechManual", page: 220 } },
      { id: "sword-is", name: "Sword", tons: "sword-tons", slots: "ceil-tons-15", heat: 0, damage: "Special", playCite: { book: "TechManual", page: 342 }, availability: [{ from: 3058 }], locations: ["LA", "RA"] },
      { id: "retractable-blade-is", name: "Retractable Blade", tons: "blade-tons", slots: "blade-slots", heat: 0, damage: "Special", playCite: { book: "TechManual", page: 344 }, availability: [{ from: 2420 }], locations: ["LA", "RA"], cite: { book: "TechManual", page: 236 } },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 237 }, checked: "page", yearsInferred: true },
    items: [
      // Physical weapons (Clan); weight and slots follow the 'Mech's tonnage (formulas in rules/catalog.ts)
      { id: "retractable-blade-clan", name: "Retractable Blade", tons: "blade-tons", slots: "blade-slots", heat: 0, damage: "Special", playCite: { book: "TechManual", page: 344 }, availability: [{ from: 2420 }], locations: ["LA", "RA"], cite: { book: "TechManual", page: 236 } },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Primitive prototype weapons (Age of War); the Latest Intro Date column prints a P, the item existed only as a prototype
      { id: "primitive-prototype-ac-2-is", name: "Primitive Prototype Autocannon/2", tons: 6, slots: 1, type: "DB, S", heat: 1, damage: "2", range: [4, 8, 16, 24], availability: [{ from: 2290 }], directFire: true },
      { id: "primitive-prototype-ac-5-is", name: "Primitive Prototype Autocannon/5", tons: 8, slots: 4, type: "DB, S", heat: 1, damage: "5", range: [3, 6, 12, 18], availability: [{ from: 2240 }], directFire: true },
      { id: "primitive-prototype-ac-10-is", name: "Primitive Prototype Autocannon/10", tons: 12, slots: 7, type: "DB, S", heat: 3, damage: "10", range: [0, 5, 10, 15], availability: [{ from: 2450 }], directFire: true },
      { id: "primitive-prototype-ac-20-is", name: "Primitive Prototype Autocannon/20", tons: 14, slots: 10, type: "DB, S", heat: 7, damage: "20", range: [0, 3, 6, 9], availability: [{ from: 2488 }], directFire: true, splittable: true },
      { id: "primitive-prototype-small-laser-is", name: "Primitive Prototype Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 2, damage: "3", range: [0, 1, 2, 3], availability: [{ from: 2290 }], directFire: true },
      { id: "primitive-prototype-medium-laser-is", name: "Primitive Prototype Medium Laser", tons: 1, slots: 1, type: "DE", heat: 5, damage: "5", range: [0, 3, 6, 9], availability: [{ from: 2290 }], directFire: true },
      { id: "primitive-prototype-large-laser-is", name: "Primitive Prototype Large Laser", tons: 5, slots: 2, type: "DE", heat: 12, damage: "8", range: [0, 5, 10, 15], availability: [{ from: 2306 }], directFire: true },
      { id: "primitive-prototype-lrm-5-is", name: "Primitive Prototype LRM 5", tons: 2, slots: 1, type: "M, C, S", heat: 2, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2295 }] },
      { id: "primitive-prototype-lrm-10-is", name: "Primitive Prototype LRM 10", tons: 5, slots: 2, type: "M, C, S", heat: 4, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2295 }] },
      { id: "primitive-prototype-lrm-15-is", name: "Primitive Prototype LRM 15", tons: 7, slots: 3, type: "M, C, S", heat: 5, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2295 }] },
      { id: "primitive-prototype-lrm-20-is", name: "Primitive Prototype LRM 20", tons: 10, slots: 5, type: "M, C, S", heat: 6, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2295 }] },
      { id: "primitive-prototype-srm-2-is", name: "Primitive Prototype SRM 2", tons: 1, slots: 1, type: "M, C, S", heat: 2, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2365 }] },
      { id: "primitive-prototype-srm-4-is", name: "Primitive Prototype SRM 4", tons: 2, slots: 1, type: "M, C, S", heat: 3, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2365 }] },
      { id: "primitive-prototype-srm-6-is", name: "Primitive Prototype SRM 6", tons: 3, slots: 2, type: "M, C, S", heat: 4, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2365 }] },
      { id: "primitive-prototype-ppc-is", name: "Primitive Prototype PPC", tons: 7, slots: 3, type: "DE", heat: 15, damage: "10", range: [3, 6, 12, 18], availability: [{ from: 2439 }], directFire: true },
      { id: "prototype-arrow-iv-is", name: "Prototype Arrow IV", tons: 16, slots: 16, type: "AE, S, F", heat: 10, damage: "20A", availability: [{ from: 2593 }], splittable: true },
      { id: "prototype-gauss-rifle-is", name: "Prototype Gauss Rifle", tons: 15, slots: 8, type: "DB, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 2587 }], splittable: true },
      { id: "prototype-lb-10-x-ac-is", name: "Prototype LB 10-X Autocannon", tons: 11, slots: 7, type: "DB, C, F, S", heat: 2, damage: "10", range: [0, 6, 12, 18], availability: [{ from: 2590 }] },
      { id: "prototype-narc-missile-beacon-is", name: "Prototype Narc Missile Beacon", tons: 3, slots: 2, type: "M, E, S", heat: 0, damage: "Special", range: [0, 3, 6, 9], availability: [{ from: 2580 }] },
      { id: "prototype-small-pulse-laser-is", name: "Prototype Small Pulse Laser", tons: 1, slots: 1, type: "P", damage: "3", range: [0, 1, 2, 3], availability: [{ from: 2595 }], directFire: true },
      { id: "prototype-medium-pulse-laser-is", name: "Prototype Medium Pulse Laser", tons: 2, slots: 1, type: "P", damage: "6", range: [0, 2, 4, 6], availability: [{ from: 2595 }], directFire: true },
      { id: "prototype-large-pulse-laser-is", name: "Prototype Large Pulse Laser", tons: 7, slots: 2, type: "P", damage: "9", range: [0, 3, 7, 10], availability: [{ from: 2595 }], directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Prototype rocket launchers (Inner Sphere and Clan, one-shot); the book prints ~2320P for both
      { id: "prototype-rocket-launcher-10-is", name: "Prototype Rocket Launcher 10", tons: 0.5, slots: 1, type: "M, C, OS", heat: 3, damage: "1/Msl", range: [0, 5, 11, 18], availability: [{ from: 2320 }] },
      { id: "prototype-rocket-launcher-15-is", name: "Prototype Rocket Launcher 15", tons: 1, slots: 2, type: "M, C, OS", heat: 4, damage: "1/Msl", range: [0, 4, 9, 15], availability: [{ from: 2320 }] },
      { id: "prototype-rocket-launcher-20-is", name: "Prototype Rocket Launcher 20", tons: 1.5, slots: 3, type: "M, C, OS", heat: 5, damage: "1/Msl", range: [0, 3, 7, 12], availability: [{ from: 2320 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "prototype-rocket-launcher-10-clan", name: "Prototype Rocket Launcher 10", tons: 0.5, slots: 1, type: "M, C, OS", heat: 3, damage: "1/Msl", range: [0, 5, 11, 18], availability: [{ from: 2320 }] },
      { id: "prototype-rocket-launcher-15-clan", name: "Prototype Rocket Launcher 15", tons: 1, slots: 2, type: "M, C, OS", heat: 4, damage: "1/Msl", range: [0, 4, 9, 15], availability: [{ from: 2320 }] },
      { id: "prototype-rocket-launcher-20-clan", name: "Prototype Rocket Launcher 20", tons: 1.5, slots: 3, type: "M, C, OS", heat: 5, damage: "1/Msl", range: [0, 3, 7, 12], availability: [{ from: 2320 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Star League equipment
      { id: "centurion-weapon-system-is", name: "Centurion Weapon System", tons: 5, slots: 2, type: "DE, E", heat: 4, damage: "Special", range: [0, 6, 12, 18], availability: [{ from: 2762 }], directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Early Clan equipment (improved and prototype Clan weapons)
      { id: "improved-ac-2-clan", name: "Improved Autocannon/2", tons: 5, slots: 1, type: "DB, S", heat: 1, damage: "2", range: [4, 8, 16, 24], availability: [{ from: 2818 }], directFire: true },
      { id: "improved-ac-5-clan", name: "Improved Autocannon/5", tons: 7, slots: 2, type: "DB, S", heat: 1, damage: "5", range: [3, 6, 12, 18], availability: [{ from: 2818 }], directFire: true },
      { id: "improved-ac-10-clan", name: "Improved Autocannon/10", tons: 11, slots: 6, type: "DB, S", heat: 3, damage: "10", range: [0, 5, 10, 15], availability: [{ from: 2818 }], directFire: true },
      { id: "improved-ac-20-clan", name: "Improved Autocannon/20", tons: 13, slots: 9, type: "DB, S", heat: 7, damage: "20", range: [0, 3, 6, 9], availability: [{ from: 2818 }], directFire: true, splittable: true },
      { id: "improved-gauss-rifle-clan", name: "Improved Gauss Rifle", tons: 13, slots: 6, type: "DB, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 2822 }], directFire: true },
      { id: "improved-large-laser-clan", name: "Improved Large Laser", tons: 4, slots: 1, type: "DE", heat: 8, damage: "8", range: [0, 5, 10, 15], availability: [{ from: 2818 }], directFire: true },
      { id: "improved-large-pulse-laser-clan", name: "Improved Large Pulse Laser", tons: 6, slots: 2, type: "P", heat: 10, damage: "9", range: [0, 3, 7, 10], availability: [{ from: 2820 }], directFire: true },
      { id: "improved-ppc-clan", name: "Improved PPC", tons: 6, slots: 2, type: "DE", heat: 10, damage: "10", range: [3, 6, 12, 18], availability: [{ from: 2820 }], directFire: true },
      { id: "enhanced-ppc-clan", name: "Enhanced PPC", tons: 7, slots: 3, type: "DE", heat: 15, damage: "12", range: [0, 7, 14, 23], availability: [{ from: 2823 }], directFire: true },
      { id: "improved-lrm-5-clan", name: "Improved LRM 5", tons: 1, slots: 1, type: "M, C, S", heat: 2, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2818 }] },
      { id: "improved-lrm-10-clan", name: "Improved LRM 10", tons: 2.5, slots: 1, type: "M, C, S", heat: 4, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2818 }] },
      { id: "improved-lrm-15-clan", name: "Improved LRM 15", tons: 3.5, slots: 2, type: "M, C, S", heat: 5, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2818 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "improved-lrm-20-clan", name: "Improved LRM 20", tons: 5, slots: 4, type: "M, C, S", heat: 6, damage: "1/Msl", range: [6, 7, 14, 21], availability: [{ from: 2818 }] },
      { id: "improved-srm-2-clan", name: "Improved SRM 2", tons: 1, slots: 1, type: "M, C, S", heat: 2, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2817 }] },
      { id: "improved-srm-4-clan", name: "Improved SRM 4", tons: 2, slots: 1, type: "M, C, S", heat: 3, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2817 }] },
      { id: "improved-srm-6-clan", name: "Improved SRM 6", tons: 3, slots: 2, type: "M, C, S", heat: 4, damage: "2/Msl", range: [0, 4, 8, 12], availability: [{ from: 2817 }] },
      { id: "prototype-er-small-laser-clan", name: "Prototype ER Small Laser", tons: 0.5, slots: 1, type: "DE", heat: 2, damage: "3", range: [0, 2, 4, 5], availability: [{ from: 2819 }], directFire: true },
      { id: "prototype-er-medium-laser-clan", name: "Prototype ER Medium Laser", tons: 1.5, slots: 1, type: "DE", heat: 5, damage: "5", range: [0, 4, 8, 12], availability: [{ from: 2819 }], directFire: true },
      { id: "prototype-lb-2-x-ac-clan", name: "Prototype LB 2-X Autocannon", tons: 6, slots: 5, type: "DB, C, S, F", heat: 1, damage: "2", range: [4, 9, 18, 27], availability: [{ from: 2820 }], directFire: true },
      { id: "prototype-lb-5-x-ac-clan", name: "Prototype LB 5-X Autocannon", tons: 8, slots: 6, type: "DB, C, S, F", heat: 1, damage: "5", range: [3, 7, 14, 21], availability: [{ from: 2820 }], directFire: true },
      { id: "prototype-lb-20-x-ac-clan", name: "Prototype LB 20-X Autocannon", tons: 14, slots: 12, type: "DB, C, S, F", heat: 6, damage: "20", range: [0, 4, 8, 12], availability: [{ from: 2820 }], directFire: true, splittable: true },
      { id: "prototype-streak-srm-4-clan", name: "Prototype Streak SRM 4", tons: 3, slots: 2, type: "M, C", heat: 3, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2819 }] },
      { id: "prototype-streak-srm-6-clan", name: "Prototype Streak SRM 6", tons: 4.5, slots: 2, type: "M, C", heat: 4, damage: "2/Msl", range: [0, 3, 6, 9], availability: [{ from: 2819 }] },
      { id: "prototype-ultra-ac-2-clan", name: "Prototype Ultra Autocannon/2", tons: 7, slots: 4, type: "M, C", heat: 1, damage: "2/Shot", range: [3, 8, 17, 25], availability: [{ from: 2820 }], directFire: true },
      { id: "prototype-ultra-ac-10-clan", name: "Prototype Ultra Autocannon/10", tons: 13, slots: 8, type: "M, C", heat: 4, damage: "10/Shot", range: [0, 6, 12, 18], availability: [{ from: 2820 }], directFire: true, splittable: true },
      { id: "prototype-ultra-ac-20-clan", name: "Prototype Ultra Autocannon/20", tons: 15, slots: 11, type: "M, C", heat: 8, damage: "20/Shot", range: [0, 3, 7, 10], availability: [{ from: 2820 }], directFire: true, splittable: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Late Succession Wars prototypes; the book prints a P on each year. Heat for the pulse and ER large lasers is printed as a base plus a die roll, so it is left out
      { id: "prototype-er-large-laser-is", name: "Prototype ER Large Laser", tons: 5, slots: 2, type: "DE", damage: "8", range: [0, 7, 14, 19], availability: [{ from: 3030 }], directFire: true },
      { id: "prototype-medium-pulse-laser-lsw-is", name: "Prototype Medium Pulse Laser (Late Succession Wars)", tons: 2, slots: 1, type: "P", damage: "6", range: [0, 2, 4, 6], availability: [{ from: 3031 }], directFire: true },
      { id: "prototype-gauss-rifle-lsw-is", name: "Prototype Gauss Rifle (Late Succession Wars)", tons: 15, slots: 8, type: "DB, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 3038 }], splittable: true },
      { id: "prototype-lb-10-x-ac-lsw-is", name: "Prototype LB 10-X Autocannon (Late Succession Wars)", tons: 11, slots: 7, type: "DB, C, F, S", heat: 2, damage: "10", range: [0, 6, 12, 18], availability: [{ from: 3030 }] },
      { id: "prototype-ultra-ac-5-is", name: "Prototype Ultra Autocannon/5", tons: 9, slots: 6, type: "M, C", heat: 1, damage: "5/Shot", range: [2, 6, 13, 20], availability: [{ from: 3029 }], directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Wars of Reaving equipment: improved ATMs (every size prints heat 2)
      { id: "improved-atm-3-clan", name: "Improved ATM 3", tons: 1.5, slots: 2, type: "M, C, S*", heat: 2, damage: "6", range: [4, 5, 10, 15], availability: [{ from: 3070 }] },
      { id: "improved-atm-6-clan", name: "Improved ATM 6", tons: 3.5, slots: 3, type: "M, C, S*", heat: 2, damage: "12", range: [4, 5, 10, 15], availability: [{ from: 3070 }] },
      { id: "improved-atm-9-clan", name: "Improved ATM 9", tons: 5, slots: 4, type: "M, C, S*", heat: 2, damage: "18", range: [4, 5, 10, 15], availability: [{ from: 3070 }] },
      { id: "improved-atm-12-clan", name: "Improved ATM 12", tons: 7, slots: 5, type: "M, C, S*", heat: 2, damage: "24", range: [4, 5, 10, 15], availability: [{ from: 3070 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "advanced" },
    items: [
      // Dark Age equipment
      { id: "small-re-engineered-laser-is", name: "Small Re-Engineered Laser", tons: 1.5, slots: 1, type: "P", heat: 4, damage: "4", range: [0, 1, 2, 3], availability: [{ from: 3130 }], directFire: true },
      { id: "medium-re-engineered-laser-is", name: "Medium Re-Engineered Laser", tons: 2.5, slots: 2, type: "P", heat: 6, damage: "6", range: [0, 3, 6, 9], availability: [{ from: 3130 }], directFire: true },
      { id: "large-re-engineered-laser-is", name: "Large Re-Engineered Laser", tons: 8, slots: 5, type: "P", heat: 9, damage: "9", range: [0, 5, 10, 15], availability: [{ from: 3130 }], directFire: true },
      { id: "tsemp-cannon-is", name: "TSEMP Cannon", tons: 6, slots: 5, type: "DE, X", heat: 10, damage: "Special", range: [0, 5, 10, 15], availability: [{ from: 3109 }], directFire: true },
      { id: "tsemp-one-shot-is", name: "TSEMP One-Shot", tons: 4, slots: 3, type: "DE, X, OS", heat: 10, damage: "Special", range: [0, 5, 10, 15], availability: [{ from: 3095 }], directFire: true },
      { id: "risc-advanced-pds-is", name: "RISC Advanced PDS", tons: 3, slots: 2, type: "PD", heat: 2, damage: "0", range: [0, 0, 0, 3], shotsPerTon: 12, availability: [{ from: 3137 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // RISC equipment
      { id: "risc-hyper-laser-is", name: "RISC Hyper Laser", tons: 8, slots: 6, type: "DE, X", heat: 24, damage: "20", range: [0, 8, 15, 25], availability: [{ from: 3134 }], directFire: true },
      { id: "risc-repeating-tsemp-cannon-is", name: "RISC Repeating TSEMP Cannon", tons: 8, slots: 7, type: "DE, X", heat: 10, damage: "Special", range: [0, 5, 10, 15], availability: [{ from: 3133 }], directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 216-217
      { id: "arrow-iv-is", name: "Arrow IV", aliases: ["Arrow IV Missile"], tons: 15, slots: 15, type: "AE, S, F", heat: 10, damage: "20A", availability: [{ from: 3044 }], rulesLevel: "advanced", splittable: true },
      { id: "thumper-artillery-is", name: "Thumper Artillery", tons: 15, slots: 15, type: "AE, S, F", heat: 6, damage: "15A", availability: [{ from: 1950 }], rulesLevel: "advanced", splittable: true },
      { id: "sniper-artillery-is", name: "Sniper Artillery", tons: 20, slots: 20, type: "AE, S, F", heat: 10, damage: "20A", availability: [{ from: 1950 }], rulesLevel: "advanced", splittable: true },
      { id: "thumper-cannon-is", name: "Thumper Cannon", tons: 10, slots: 7, type: "DB, AE, F", heat: 5, damage: "5A", range: [3, 4, 9, 14], availability: [{ from: 3012 }], rulesLevel: "experimental" },
      { id: "sniper-cannon-is", name: "Sniper Cannon", tons: 15, slots: 10, type: "DB, AE, F", heat: 10, damage: "10A", range: [2, 4, 8, 12], availability: [{ from: 3012 }], rulesLevel: "experimental", splittable: true },
      { id: "long-tom-cannon-is", name: "Long Tom Cannon", tons: 20, slots: 15, type: "DB, AE, F", heat: 20, damage: "20A", range: [4, 6, 13, 20], availability: [{ from: 3012 }], rulesLevel: "experimental", splittable: true },
      { id: "hyper-velocity-ac-2-is", name: "Hyper-Velocity AC/2", tons: 8, slots: 2, type: "DB, X*", heat: 1, damage: "2", range: [3, 10, 20, 35], availability: [{ from: 3059 }], rulesLevel: "experimental", directFire: true },
      { id: "hyper-velocity-ac-5-is", name: "Hyper-Velocity AC/5", tons: 12, slots: 4, type: "DB, X*", heat: 3, damage: "5", range: [0, 8, 16, 28], availability: [{ from: 3059 }], rulesLevel: "experimental", directFire: true },
      { id: "hyper-velocity-ac-10-is", name: "Hyper-Velocity AC/10", tons: 14, slots: 6, type: "DB, X*", heat: 7, damage: "10", range: [0, 6, 12, 20], availability: [{ from: 3060 }], rulesLevel: "experimental", directFire: true },
      { id: "chain-whip-is", name: "Chain Whip", tons: 3, slots: 2, type: "ME", heat: 0, damage: "3", availability: [{ from: 3071 }], rulesLevel: "experimental" },
      { id: "flail-is", name: "Flail", tons: 5, slots: 4, type: "ME", heat: 0, damage: "9", availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "shield-small-is", name: "Shield, Small", aliases: ["Small Shield"], tons: 2, slots: 3, type: "ME, PB", heat: 0, damage: "Special", availability: [{ from: 3067 }], rulesLevel: "experimental" },
      { id: "shield-medium-is", name: "Shield, Medium", aliases: ["Medium Shield"], tons: 4, slots: 5, type: "ME, PB", heat: 0, damage: "Special", availability: [{ from: 3067 }], rulesLevel: "experimental" },
      { id: "shield-large-is", name: "Shield, Large", aliases: ["Large Shield"], tons: 6, slots: 7, type: "ME, PB", heat: 0, damage: "Special", availability: [{ from: 3067 }], rulesLevel: "experimental" },
      { id: "spikes-is", name: "Spikes", tons: 0.5, slots: 1, type: "ME, PB", heat: 0, damage: "Special", availability: [{ from: 3051 }], rulesLevel: "experimental" },
      { id: "vibroblade-small-is", name: "Vibroblade, Small", aliases: ["Small Vibroblade"], tons: 3, slots: 1, type: "ME, V", heat: 3, damage: "7", availability: [{ from: 3065 }], rulesLevel: "experimental" },
      { id: "vibroblade-medium-is", name: "Vibroblade, Medium", aliases: ["Medium Vibroblade"], tons: 5, slots: 2, type: "ME, V", heat: 5, damage: "10", availability: [{ from: 3065 }], rulesLevel: "experimental" },
      { id: "vibroblade-large-is", name: "Vibroblade, Large", aliases: ["Large Vibroblade"], tons: 7, slots: 4, type: "ME, V", heat: 7, damage: "14", availability: [{ from: 3066 }], rulesLevel: "experimental" },
      { id: "c3-remote-sensor-launcher-is", name: "C3 Remote Sensor Launcher", tons: 4, slots: 3, type: "M, E", heat: 0, range: [0, 3, 6, 9], availability: [{ from: 3072 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 216-217
      { id: "arrow-iv-clan", name: "Arrow IV", aliases: ["Arrow IV Missile"], tons: 12, slots: 12, type: "AE, S, F", heat: 10, damage: "20A", availability: [{ from: 2850 }], rulesLevel: "advanced", splittable: true },
      { id: "thumper-artillery-clan", name: "Thumper Artillery", tons: 15, slots: 15, type: "AE, S, F", heat: 6, damage: "15A", availability: [{ from: 1950 }], rulesLevel: "advanced", splittable: true },
      { id: "sniper-artillery-clan", name: "Sniper Artillery", tons: 20, slots: 20, type: "AE, S, F", heat: 10, damage: "20A", availability: [{ from: 1950 }], rulesLevel: "advanced", splittable: true },
      { id: "thumper-cannon-clan", name: "Thumper Cannon", tons: 10, slots: 7, type: "DB, AE, F", heat: 5, damage: "5A", range: [3, 4, 9, 14], availability: [{ from: 3032 }], rulesLevel: "experimental" },
      { id: "sniper-cannon-clan", name: "Sniper Cannon", tons: 15, slots: 10, type: "DB, AE, F", heat: 10, damage: "10A", range: [2, 4, 8, 12], availability: [{ from: 3032 }], rulesLevel: "experimental", splittable: true },
      { id: "long-tom-cannon-clan", name: "Long Tom Cannon", tons: 20, slots: 15, type: "DB, AE, F", heat: 20, damage: "20A", range: [4, 6, 13, 20], availability: [{ from: 3032 }], rulesLevel: "experimental", splittable: true },
      { id: "protomech-ac-2-clan", name: "ProtoMech AC/2", tons: 3.5, slots: 2, type: "DB, S", heat: 1, damage: "2", range: [0, 7, 14, 20], availability: [{ from: 3073 }], rulesLevel: "advanced", directFire: true },
      { id: "protomech-ac-4-clan", name: "ProtoMech AC/4", tons: 4.5, slots: 3, type: "DB, S", heat: 1, damage: "4", range: [0, 5, 10, 15], availability: [{ from: 3073 }], rulesLevel: "advanced", directFire: true },
      { id: "protomech-ac-8-clan", name: "ProtoMech AC/8", tons: 5.5, slots: 4, type: "DB, S", heat: 2, damage: "8", range: [0, 3, 7, 10], availability: [{ from: 3073 }], rulesLevel: "advanced", directFire: true },
      { id: "rotary-ac-2-clan", name: "Rotary AC/2", aliases: ["RAC/2"], tons: 8, slots: 4, type: "DB, R/C", heat: 1, damage: "2/Shot", range: [0, 8, 17, 25], availability: [{ from: 3073 }], rulesLevel: "experimental", directFire: true },
      { id: "rotary-ac-5-clan", name: "Rotary AC/5", aliases: ["RAC/5"], tons: 10, slots: 8, type: "DB, R/C", heat: 1, damage: "5/Shot", range: [0, 7, 14, 21], availability: [{ from: 3073 }], rulesLevel: "experimental", directFire: true, splittable: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 218-219
      { id: "er-flamer-is", name: "ER Flamer", tons: 1, slots: 1, type: "DE, H, AI", heat: 4, damage: "2", range: [0, 3, 5, 7], availability: [{ from: 3070 }], rulesLevel: "advanced" },
      { id: "heavy-flamer-is", name: "Heavy Flamer", tons: 1.5, slots: 1, type: "DE, H, AI", heat: 5, damage: "4", range: [0, 2, 3, 4], availability: [{ from: 3068 }], rulesLevel: "advanced" },
      { id: "fluid-gun-is", name: "Fluid Gun", tons: 2, slots: 2, type: "DB, S", heat: 0, damage: "Special", range: [0, 1, 2, 3], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "improved-heavy-gauss-is", name: "Improved Heavy Gauss", tons: 20, slots: 11, type: "DB, X", heat: 2, damage: "22", range: [3, 6, 12, 19], availability: [{ from: 3065 }], rulesLevel: "experimental", directFire: true, splittable: true },
      { id: "magshot-is", name: "MagShot", aliases: ["Magshot Gauss Rifle"], tons: 0.5, slots: 2, type: "DB, X", heat: 1, damage: "2", range: [0, 3, 6, 9], availability: [{ from: 3072 }], rulesLevel: "advanced", directFire: true },
      { id: "silver-bullet-gauss-is", name: "Silver Bullet Gauss", tons: 15, slots: 7, type: "DB, C, F, X", heat: 1, damage: "15", range: [2, 7, 15, 22], availability: [{ from: 3051 }], rulesLevel: "experimental" },
      { id: "vehicular-grenade-launcher-is", name: "Grenade Launcher, Vehicular", tons: 0.5, slots: 1, type: "AE, OS", heat: 1, damage: "Special", range: [0, 0, 0, 1], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "binary-laser-is", name: "Binary Laser (Blazer) Cannon", aliases: ["Binary Laser","Blazer Cannon"], tons: 9, slots: 4, type: "DE", heat: 16, damage: "12", range: [0, 5, 10, 15], availability: [{ from: 2812 }], rulesLevel: "experimental", directFire: true },
      { id: "bombast-laser-is", name: "Bombast Laser", tons: 7, slots: 3, type: "DE, V", range: [0, 5, 10, 15], availability: [{ from: 3064 }], rulesLevel: "experimental", directFire: true },
      { id: "variable-speed-laser-small-is", name: "Variable Speed Laser, Small", tons: 2, slots: 1, type: "P, V, AI", heat: 3, damage: "5/4/3", range: [0, 2, 4, 6], availability: [{ from: 3070 }], rulesLevel: "advanced", directFire: true },
      { id: "variable-speed-laser-medium-is", name: "Variable Speed Laser, Medium", tons: 4, slots: 2, type: "P, V, AI", heat: 7, damage: "9/7/5", range: [0, 2, 5, 9], availability: [{ from: 3070 }], rulesLevel: "advanced", directFire: true },
      { id: "variable-speed-laser-large-is", name: "Variable Speed Laser, Large", tons: 9, slots: 4, type: "P, V, AI", heat: 10, damage: "11/9/7", range: [0, 4, 8, 15], availability: [{ from: 3070 }], rulesLevel: "advanced", directFire: true },
      { id: "x-pulse-laser-small-is", name: "X-Pulse Laser, Small", tons: 1, slots: 1, type: "P, AI", heat: 3, damage: "3", range: [0, 2, 4, 5], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 218-219
      { id: "er-flamer-clan", name: "ER Flamer", tons: 1, slots: 1, type: "DE, H, AI", heat: 4, damage: "2", range: [0, 3, 5, 7], availability: [{ from: 3067 }], rulesLevel: "advanced" },
      { id: "heavy-flamer-clan", name: "Heavy Flamer", tons: 1.5, slots: 1, type: "DE, H, AI", heat: 5, damage: "4", range: [0, 2, 3, 4], availability: [{ from: 3067 }], rulesLevel: "advanced" },
      { id: "fluid-gun-clan", name: "Fluid Gun", tons: 2, slots: 2, type: "DB, S", heat: 0, damage: "Special", range: [0, 1, 2, 3], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "vehicular-grenade-launcher-clan", name: "Grenade Launcher, Vehicular", tons: 0.5, slots: 1, type: "AE, OS", heat: 1, damage: "Special", range: [0, 0, 0, 1], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "chemical-laser-small-clan", name: "Chemical Laser, Small", tons: 0.5, slots: 1, type: "DE", heat: 1, damage: "3", range: [0, 1, 2, 3], availability: [{ from: 3059 }], rulesLevel: "experimental", directFire: true },
      { id: "chemical-laser-medium-clan", name: "Chemical Laser, Medium", tons: 1, slots: 1, type: "DE", heat: 2, damage: "5", range: [0, 3, 6, 9], availability: [{ from: 3059 }], rulesLevel: "experimental", directFire: true },
      { id: "chemical-laser-large-clan", name: "Chemical Laser, Large", tons: 5, slots: 2, type: "DE", heat: 6, damage: "8", range: [0, 5, 10, 15], availability: [{ from: 3059 }], rulesLevel: "experimental", directFire: true },
      { id: "er-pulse-laser-small-clan", name: "ER Pulse Laser, Small", tons: 1.5, slots: 1, type: "P, AI", heat: 3, damage: "5", range: [0, 2, 4, 6], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
      { id: "er-pulse-laser-medium-clan", name: "ER Pulse Laser, Medium", tons: 2, slots: 2, type: "P", heat: 6, damage: "7", range: [0, 5, 9, 14], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
      { id: "er-pulse-laser-large-clan", name: "ER Pulse Laser, Large", tons: 6, slots: 3, type: "P", heat: 13, damage: "10", range: [0, 7, 15, 23], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
      { id: "improved-heavy-laser-small-clan", name: "Improved Heavy Laser, Small", tons: 0.5, slots: 1, type: "DE, X", heat: 3, damage: "6", range: [0, 1, 2, 3], availability: [{ from: 3069 }], rulesLevel: "experimental", directFire: true },
      { id: "improved-heavy-laser-medium-clan", name: "Improved Heavy Laser, Medium", tons: 1, slots: 2, type: "DE, X", heat: 7, damage: "10", range: [0, 3, 6, 9], availability: [{ from: 3069 }], rulesLevel: "experimental", directFire: true },
      { id: "improved-heavy-laser-large-clan", name: "Improved Heavy Laser, Large", tons: 4, slots: 3, type: "DE, X", heat: 18, damage: "16", range: [0, 5, 10, 15], availability: [{ from: 3069 }], rulesLevel: "experimental", directFire: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 220-221
      { id: "x-pulse-laser-medium-is", name: "X-Pulse Laser, Medium", tons: 2, slots: 1, type: "P", heat: 6, damage: "6", range: [0, 3, 6, 9], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
      { id: "x-pulse-laser-large-is", name: "X-Pulse Laser, Large", tons: 7, slots: 2, type: "P", heat: 14, damage: "9", range: [0, 5, 10, 15], availability: [{ from: 3057 }], rulesLevel: "experimental", directFire: true },
      { id: "laser-anti-missile-system-is", name: "Laser Anti-Missile System", tons: 1.5, slots: 2, type: "PB", heat: 7, availability: [{ from: 3059 }], rulesLevel: "experimental" },
      { id: "mech-mortar-1-is", name: "'Mech Mortar/1", aliases: ["Mech Mortar/1"], tons: 2, slots: 1, type: "M, C, S", heat: 1, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-2-is", name: "'Mech Mortar/2", aliases: ["Mech Mortar/2"], tons: 5, slots: 2, type: "M, C, S", heat: 2, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-4-is", name: "'Mech Mortar/4", aliases: ["Mech Mortar/4"], tons: 7, slots: 3, type: "M, C, S", heat: 5, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-8-is", name: "'Mech Mortar/8", aliases: ["Mech Mortar/8"], tons: 10, slots: 5, type: "M, C, S", heat: 10, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "vehicular-mine-dispenser-is", name: "Mine Dispenser (Vehicular)", tons: 0.5, slots: 1, type: "PE", heat: 0, damage: "Special", range: [0, 0, 0, 0], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "enhanced-lrm-5-is", name: "Enhanced LRM 5", aliases: ["NLRM 5","Enhanced LRM-5"], tons: 3, slots: 2, type: "M, C, S", heat: 2, damage: "1/Msl", range: [3, 7, 14, 21], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "enhanced-lrm-10-is", name: "Enhanced LRM 10", aliases: ["NLRM 10","Enhanced LRM-10"], tons: 6, slots: 4, type: "M, C, S", heat: 4, damage: "1/Msl", range: [3, 7, 14, 21], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "enhanced-lrm-15-is", name: "Enhanced LRM 15", aliases: ["NLRM 15","Enhanced LRM-15"], tons: 9, slots: 6, type: "M, C, S", heat: 5, damage: "1/Msl", range: [3, 7, 14, 21], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "enhanced-lrm-20-is", name: "Enhanced LRM 20", aliases: ["NLRM 20","Enhanced LRM-20"], tons: 12, slots: 9, type: "M, C, S", heat: 6, damage: "1/Msl", range: [3, 7, 14, 21], availability: [{ from: 3058 }], rulesLevel: "experimental", splittable: true },
      { id: "extended-lrm-5-is", name: "Extended LRM 5", aliases: ["ELRM 5","Extended LRM-5"], tons: 6, slots: 1, type: "M, C", heat: 3, damage: "1/Msl", range: [10, 12, 22, 38], availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "extended-lrm-10-is", name: "Extended LRM 10", aliases: ["ELRM 10","Extended LRM-10"], tons: 8, slots: 4, type: "M, C", heat: 6, damage: "1/Msl", range: [10, 12, 22, 38], availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "extended-lrm-15-is", name: "Extended LRM 15", aliases: ["ELRM 15","Extended LRM-15"], tons: 12, slots: 6, type: "M, C", heat: 8, damage: "1/Msl", range: [10, 12, 22, 38], availability: [{ from: 3054 }], rulesLevel: "experimental" },
      { id: "extended-lrm-20-is", name: "Extended LRM 20", aliases: ["ELRM 20","Extended LRM-20"], tons: 18, slots: 8, type: "M, C", heat: 10, damage: "1/Msl", range: [10, 12, 22, 38], availability: [{ from: 3054 }], rulesLevel: "experimental", splittable: true },
      { id: "m-pod-is", name: "M-Pod", tons: 1, slots: 1, type: "OS, C, V, X", heat: 0, damage: "15/10/5", range: [0, 1, 2, 3], availability: [{ from: 3064 }], rulesLevel: "advanced" },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 220-221
      { id: "laser-anti-missile-system-clan", name: "Laser Anti-Missile System", tons: 1, slots: 1, type: "PB", heat: 5, availability: [{ from: 3048 }], rulesLevel: "experimental" },
      { id: "mech-mortar-1-clan", name: "'Mech Mortar/1", aliases: ["Mech Mortar/1"], tons: 1, slots: 1, type: "M, C, S", heat: 1, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-2-clan", name: "'Mech Mortar/2", aliases: ["Mech Mortar/2"], tons: 2.5, slots: 1, type: "M, C, S", heat: 2, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-4-clan", name: "'Mech Mortar/4", aliases: ["Mech Mortar/4"], tons: 3.5, slots: 2, type: "M, C, S", heat: 5, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "mech-mortar-8-clan", name: "'Mech Mortar/8", aliases: ["Mech Mortar/8"], tons: 5, slots: 3, type: "M, C, S", heat: 10, damage: "Special", range: [6, 7, 14, 21], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "vehicular-mine-dispenser-clan", name: "Mine Dispenser (Vehicular)", tons: 0.5, slots: 1, type: "PE", heat: 0, damage: "Special", range: [0, 0, 0, 0], availability: [{ from: 1950 }], rulesLevel: "advanced" },
      { id: "streak-lrm-5-clan", name: "Streak LRM 5", aliases: ["Streak LRM-5"], tons: 2, slots: 1, type: "M, C*", heat: 2, damage: "C5/5", range: [0, 7, 14, 21], availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "streak-lrm-10-clan", name: "Streak LRM 10", aliases: ["Streak LRM-10"], tons: 5, slots: 2, type: "M, C*", heat: 4, damage: "C5/10", range: [0, 7, 14, 21], availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "streak-lrm-15-clan", name: "Streak LRM 15", aliases: ["Streak LRM-15"], tons: 7, slots: 3, type: "M, C*", heat: 5, damage: "C5/15", range: [0, 7, 14, 21], availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "streak-lrm-20-clan", name: "Streak LRM 20", aliases: ["Streak LRM-20"], tons: 10, slots: 5, type: "M, C*", heat: 6, damage: "C5/20", range: [0, 7, 14, 21], availability: [{ from: 3057 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: TO, page: 223 }, playCite: { book: TO, page: 222 }, checked: "page" },
    items: [
      // Heavy weapons and equipment, pp. 222-223
      { id: "light-rifle-is", name: "Light Rifle", tons: 3, slots: 1, type: "DB*", heat: 1, damage: "3", range: [0, 4, 8, 12], availability: [{ from: 1950 }], rulesLevel: "experimental", directFire: true },
      { id: "medium-rifle-is", name: "Medium Rifle", tons: 5, slots: 2, type: "DB*", heat: 2, damage: "6", range: [1, 5, 10, 15], availability: [{ from: 1950 }], rulesLevel: "experimental", directFire: true },
      { id: "heavy-rifle-is", name: "Heavy Rifle", tons: 8, slots: 3, type: "DB*", heat: 4, damage: "9", range: [2, 6, 12, 18], availability: [{ from: 1950 }], rulesLevel: "experimental", directFire: true },
      { id: "taser-is", name: "Taser (BattleMech)", aliases: ["Taser"], tons: 4, slots: 3, type: "DB, X", heat: 6, damage: "Special", range: [0, 1, 2, 4], availability: [{ from: 3067 }], rulesLevel: "experimental" },
      { id: "thunderbolt-5-is", name: "Thunderbolt 5", aliases: ["Thunderbolt-5"], tons: 3, slots: 1, type: "M", heat: 3, damage: "5", range: [5, 6, 12, 18], availability: [{ from: 3072 }], rulesLevel: "advanced" },
      { id: "thunderbolt-10-is", name: "Thunderbolt 10", aliases: ["Thunderbolt-10"], tons: 7, slots: 2, type: "M", heat: 5, damage: "10", range: [5, 6, 12, 18], availability: [{ from: 3072 }], rulesLevel: "advanced" },
      { id: "thunderbolt-15-is", name: "Thunderbolt 15", aliases: ["Thunderbolt-15"], tons: 11, slots: 3, type: "M", heat: 7, damage: "15", range: [5, 6, 12, 18], availability: [{ from: 3072 }], rulesLevel: "advanced" },
      { id: "thunderbolt-20-is", name: "Thunderbolt 20", aliases: ["Thunderbolt-20"], tons: 15, slots: 5, type: "M", heat: 8, damage: "20", range: [5, 6, 12, 18], availability: [{ from: 3072 }], rulesLevel: "advanced" },
    ],
  },
];
