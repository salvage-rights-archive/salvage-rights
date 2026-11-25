// Heat sinks, jump jets and other mounted equipment, from TechManual (corrected sixth printing, errata v8.0). Years and
// `yearsInferred` follow the conventions in weapons.ts.
//
// Heat sinks carry tons: 0 because weights() in rules/mech.ts already counts heat sink weight from the chassis heat sink
// count; counting it again per mount would double it. Slots are the Heat Sinks table (printed p. 54). Dates are the item
// entries on pp. 220-221 (single: circa 2022; double: introduced 2567, extinct 2865 for the Inner Sphere, recovered 3040).
// Those entries give one date for both tech bases, so the Clan rows use it and are marked inferred; the extinction is the
// Inner Sphere's only.
//
// Jump jets: weight depends on the 'Mech's tonnage (Jump Jets table, printed p. 51); the "jump-jet" and "improved-jump-jet"
// formulas in rules/catalog.ts are that table. Standard jump jets: introduced 2471 (p. 225), printed for the Inner Sphere,
// so the Clan row is marked. Improved jump jets: introduced 3069 (p. 225), printed for Clan Wolf, so the Inner Sphere row is
// marked.
//
// MASC: a percentage of the 'Mech's tonnage, rounded normally, for both weight and slots (printed p. 52, with the errata
// to the rounding); dates from p. 232, the Clan row marked.
//
// Triple-Strength Myomer (p. 52 table, date p. 240; Inner Sphere only): 0 tons and six slots that may be spread over the
// 'Mech, so it is one one-slot row with `perMech: 6`. Its date is from the text extract only (checked "text").
//
// Targeting Computer (pp. 238, 292): weight is the total of the 'Mech's `directFire` weapons over 4 (Inner Sphere) or 5
// (Clan), rounded up; slots equal tons, contiguous, not splittable.
//
// Artemis IV: the book lists launchers with Artemis built in. Every one of the 22 pairs (launcher, launcher + Artemis IV)
// on pp. 341-343 differs by exactly 1 ton and 1 critical slot, which is what a BattleMech installs separately (p. 207), so
// that is the row's weight and slots; the row is checked "text" because the figures are derived, not printed. It needs its
// launcher in the same location. Dates are the Artemis IV line of the table on p. 291.
//
// Clan CASE: 0 tons, 0 slots, so a Clan design's CASE matches a row. Printed p. 58 (the Gladiator Prime example) says
// Clan CASE comes free in tonnage and critical space and p. 210 says it is weightless; the year is the p. 291 table's.
//
// Industrial equipment: the items of the Industrial Equipment table (pp. 344-345, years pp. 292-293) whose entries
// (pp. 241-249) allow a BattleMech and give a fixed weight and slot count. The book's dates are printed for the Inner
// Sphere only (the Clan column is a dash), so the Clan rows are marked. Placement: an asterisk on the slot count means the
// entry's special construction rule; for the backhoe, chainsaw, combine, dual saw, pile driver, mining drill, rock cutter
// and spot welder that rule is arms on a humanoid 'Mech (the hand actuator removed) or side torsos on a quad:
// `locations` holds the biped rule and `locationsQuad` the quad rule. The wrecking ball and salvage arm are humanoid arms
// only (`locationsQuad: []`, none); the bridgelayer is quad torsos only (`locations: []`); the lift hoist is arms and
// torsos for both. The sprayer and light fluid suction system `need` liquid cargo space (their entries).
// Not tabulated: the mounted searchlight (a BattleMech's first one is free, so a mount has no fixed weight), tracks (weight is a tenth of the 'Mech split
// over its legs), ladders, cargo bays and communications equipment (variable), and the items the entries bar from
// BattleMechs (manipulators, fluid suction systems, paramedic equipment, MASH, dumpers, quarters and the like).
//
// Play figures: heat, and range where the table prints numbers, are the Heat and Range columns of the Weapons and Equipment
// tables (Inner Sphere p. 342, Clan p. 343) and the Industrial Equipment table (pp. 344-345), read against the page images.
// A probe's or ECM suite's range is its radius, stored as the long band ([0, 0, 0, r], as the table prints 0/0/0/r). Damage
// is the Damage column where it prints a number: the industrial melee items (the combine's 3 carries a ** rule note in the
// table), the nail/rivet gun's 0; a dash or NA prints nothing. The Machine Gun Array's heat is NA in the table, so it has
// none. Type "E" (electronic) is from the Core Rulebook's Weapons and Equipment Tables (printed pp. 250 and 252, read against
// the page images); the industrial items have no Type there.
// Left out, as variable or barred from a BattleMech: communications equipment, environmental sealing, extended fuel tanks, ladders,
// tracks, cargo, ejection seat and mounted searchlight (IndustrialMech only, or a first one free; roadmap piece 3),
// bulldozers, bay doors and dumpers (no BattleMech space), standard fluid suction systems and paramedic equipment.

import type { EquipmentGroup } from "../../rules/catalog";

const IO = "Interstellar Operations: Alternate Eras";
const TO = "Tactical Operations: Advanced Units and Equipment";

export const OTHER: EquipmentGroup[] = [
  {
    defaults: { kind: "heat-sink", techBase: "inner-sphere", cite: { book: "TechManual", page: 54 }, checked: "page", tons: 0 },
    items: [
      // Heat sinks (Inner Sphere)
      { id: "heat-sink-is", name: "Heat Sink", aliases: ["Single Heat Sink", "Standard Heat Sink"], slots: 1, availability: [{ from: 2022 }] },
      { id: "double-heat-sink-is", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], slots: 3, availability: [{ from: 2567, to: 2865 }, { from: 3040 }] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: { book: "TechManual", page: 51 }, checked: "page" },
    items: [
      // Jump jets (Inner Sphere)
      { id: "jump-jet-is", name: "Jump Jet", aliases: ["Jump Jets"], tons: "jump-jet", slots: 1, availability: [{ from: 2471 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: { book: "TechManual", page: 51 }, checked: "page", yearsInferred: true },
    items: [
      // Jump jets (Inner Sphere)
      { id: "improved-jump-jet-is", name: "Improved Jump Jet", aliases: ["Improved Jump Jets"], tons: "improved-jump-jet", slots: 2, availability: [{ from: 3069 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 342 }, checked: "page" },
    items: [
      // Electronics, CASE and fire control (Inner Sphere)
      { id: "beagle-active-probe-is", name: "Beagle Active Probe", aliases: ["Active Probe (Beagle)"], tons: 1.5, slots: 2, type: "E", heat: 0, range: [0, 0, 0, 4], availability: [{ from: 2576, to: 2835 }, { from: 3045 }] },
      { id: "case-is", name: "CASE", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 2476, to: 2840 }, { from: 3036 }], locations: ["CT", "LT", "RT"] },
      { id: "c3-computer-master-is", name: "C3 Computer (Master)", tons: 5, slots: 5, heat: 0, availability: [{ from: 3050 }] },
      { id: "c3-computer-slave-is", name: "C3 Computer (Slave)", tons: 1, slots: 1, heat: 0, availability: [{ from: 3050 }] },
      { id: "improved-c3-computer-is", name: "Improved C3 Computer", aliases: ["C3i"], tons: 2.5, slots: 2, heat: 0, availability: [{ from: 3062 }] },
      { id: "guardian-ecm-suite-is", name: "Guardian ECM Suite", aliases: ["ECM Suite (Guardian)"], tons: 1.5, slots: 2, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2597, to: 2845 }, { from: 3045 }] },
      { id: "machine-gun-array-is", name: "Machine Gun Array", aliases: ["Machine Gun Array Module", "Light Machine Gun Array Module", "Heavy Machine Gun Array Module"], tons: 0.5, slots: 1, availability: [{ from: 3068 }], needs: "machine-gun" },
      { id: "tag-is", name: "TAG", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2600, to: 2835 }, { from: 3044 }] },
      // Artemis IV (Inner Sphere); weight and slots are derived, see the file header
      { id: "artemis-iv-is", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2598, to: 2855 }, { from: 3035 }], needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 52 }, checked: "page" },
    items: [
      // MASC (Inner Sphere); weight and slots are a share of the 'Mech's tonnage
      { id: "masc-is", name: "MASC", aliases: ["Myomer Accelerator Signal Circuitry"], tons: "masc-is", slots: "masc-is", availability: [{ from: 2740, to: 2795 }, { from: 3035 }] },
      // Triple-Strength Myomer: six one-slot items, 0 tons, placed anywhere
      { id: "tsm-is", name: "Triple-Strength Myomer", aliases: ["TSM"], tons: 0, slots: 1, availability: [{ from: 3050 }], perMech: 6, checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 238 }, checked: "page" },
    items: [
      // Targeting Computer (Inner Sphere): weight and slots from the direct-fire weapons mounted
      { id: "targeting-computer-is", name: "Targeting Computer", tons: "targeting-computer-is", slots: "targeting-computer-is", heat: 0, availability: [{ from: 3062 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "Interstellar Operations: Alternate Eras", page: 108 }, checked: "page" },
    items: [
      // Fuel for a Land-Air 'Mech beyond the free ton in its engine: whole tons of one slot each, 80 fuel points a ton. The
      // year is the Land-Air 'Mech's first (p.100, bimodal 2680), so it is inferred for this item.
      { id: "lam-fuel-is", name: "LAM Fuel", tons: 1, slots: 1, availability: [{ from: 2680 }], yearsInferred: true },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "backhoe-is", name: "Backhoe", tons: 5, slots: 6, heat: 0, damage: "6", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "chainsaw-is", name: "Chainsaw", tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "combine-is", name: "Combine", tons: 2.5, slots: 4, heat: 0, damage: "3", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "dual-saw-is", name: "Dual Saw", tons: 7, slots: 7, heat: 0, damage: "7", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "heavy-duty-pile-driver-is", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, heat: 0, damage: "9", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "mining-drill-is", name: "Mining Drill", tons: 3, slots: 4, heat: 0, damage: "4", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "rock-cutter-is", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "spot-welder-is", name: "Spot Welder", tons: 2, slots: 1, heat: 2, damage: "5", availability: [{ from: 2320 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "nail-rivet-gun-is", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, heat: 0, damage: "0", range: [0, 1, 0, 0], availability: [{ from: 2310 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 345 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "wrecking-ball-is", name: "Wrecking Ball", tons: 4, slots: 5, heat: 0, damage: "8", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: [] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "salvage-arm-is", name: "Salvage Arm", tons: 3, slots: 2, heat: 0, availability: [{ from: 2415 }], locations: ["LA", "RA"], locationsQuad: [] },
      { id: "sprayer-is", name: "Sprayer", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 1], availability: [{ from: 2300 }], needs: "liquid-cargo" },
      { id: "light-fluid-suction-system-is", name: "Light Fluid Suction System", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 1950 }], needs: "liquid-cargo" },
      { id: "remote-sensor-dispenser-is", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2200 }] },
      { id: "lift-hoist-is", name: "Lift Hoist", tons: 3, slots: 3, heat: 0, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"] },
      { id: "bridgelayer-light-is", name: "Bridgelayer (Light)", aliases: ["Light Bridgelayer"], tons: 1, slots: 2, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-medium-is", name: "Bridgelayer (Medium)", aliases: ["Medium Bridgelayer"], tons: 2, slots: 4, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-heavy-is", name: "Bridgelayer (Heavy)", aliases: ["Heavy Bridgelayer"], tons: 6, slots: 12, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
    ],
  },
  {
    defaults: { kind: "heat-sink", techBase: "clan", cite: { book: "TechManual", page: 54 }, checked: "page", tons: 0, yearsInferred: true },
    items: [
      // Heat sinks (Clan)
      { id: "heat-sink-clan", name: "Heat Sink", aliases: ["Single Heat Sink", "Standard Heat Sink"], slots: 1, availability: [{ from: 2022 }] },
      { id: "double-heat-sink-clan", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], slots: 2, availability: [{ from: 2567 }] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "clan", cite: { book: "TechManual", page: 51 }, checked: "page", yearsInferred: true },
    items: [
      // Jump jets (Clan)
      { id: "jump-jet-clan", name: "Jump Jet", aliases: ["Jump Jets"], tons: "jump-jet", slots: 1, availability: [{ from: 2471 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "clan", cite: { book: "TechManual", page: 51 }, checked: "page" },
    items: [
      // Jump jets (Clan)
      { id: "improved-jump-jet-clan", name: "Improved Jump Jet", aliases: ["Improved Jump Jets"], tons: "improved-jump-jet", slots: 2, availability: [{ from: 3069 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page" },
    items: [
      // Electronics, CASE and fire control (Clan)
      { id: "active-probe-clan", name: "Active Probe", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 5], availability: [{ from: 2832 }] },
      { id: "light-active-probe-clan", name: "Light Active Probe", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 3], availability: [{ from: 2900 }] },
      { id: "ecm-suite-clan", name: "ECM Suite", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2832 }] },
      { id: "machine-gun-array-clan", name: "Machine Gun Array", aliases: ["Machine Gun Array Module", "Light Machine Gun Array Module", "Heavy Machine Gun Array Module"], tons: 0.25, slots: 1, availability: [{ from: 3069 }], needs: "machine-gun" },
      { id: "light-tag-clan", name: "Light TAG", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 3, 6, 9], availability: [{ from: 3054 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page", yearsInferred: true },
    items: [
      // Electronics, CASE and fire control (Clan)
      { id: "tag-clan", name: "TAG", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2600 }] },
      // Artemis IV (Clan); weight and slots are derived, see the file header
      { id: "artemis-iv-clan", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2598 }], needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 58 }, checked: "page" },
    items: [
      // Clan CASE: comes free in tonnage and critical space (p. 58, the Gladiator Prime example; p. 210 says weightless); the Clan table lists none
      { id: "case-clan", name: "CASE", tons: 0, slots: 0, availability: [{ from: 2825 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 52 }, checked: "page", yearsInferred: true },
    items: [
      // MASC (Clan); weight and slots are a share of the 'Mech's tonnage
      { id: "masc-clan", name: "MASC", aliases: ["Myomer Accelerator Signal Circuitry"], tons: "masc-clan", slots: "masc-clan", availability: [{ from: 2740 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 238 }, checked: "page" },
    items: [
      // Targeting Computer (Clan): weight and slots from the direct-fire weapons mounted
      { id: "targeting-computer-clan", name: "Targeting Computer", tons: "targeting-computer-clan", slots: "targeting-computer-clan", heat: 0, availability: [{ from: 2860 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "backhoe-clan", name: "Backhoe", tons: 5, slots: 6, heat: 0, damage: "6", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "chainsaw-clan", name: "Chainsaw", tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "combine-clan", name: "Combine", tons: 2.5, slots: 4, heat: 0, damage: "3", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "dual-saw-clan", name: "Dual Saw", tons: 7, slots: 7, heat: 0, damage: "7", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "heavy-duty-pile-driver-clan", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, heat: 0, damage: "9", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "mining-drill-clan", name: "Mining Drill", tons: 3, slots: 4, heat: 0, damage: "4", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "rock-cutter-clan", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "spot-welder-clan", name: "Spot Welder", tons: 2, slots: 1, heat: 2, damage: "5", availability: [{ from: 2320 }], locations: ["LA", "RA"], locationsQuad: ["LT", "RT"] },
      { id: "nail-rivet-gun-clan", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, heat: 0, damage: "0", range: [0, 1, 0, 0], availability: [{ from: 2310 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 345 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "wrecking-ball-clan", name: "Wrecking Ball", tons: 4, slots: 5, heat: 0, damage: "8", availability: [{ from: 1950 }], locations: ["LA", "RA"], locationsQuad: [] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "salvage-arm-clan", name: "Salvage Arm", tons: 3, slots: 2, heat: 0, availability: [{ from: 2415 }], locations: ["LA", "RA"], locationsQuad: [] },
      { id: "sprayer-clan", name: "Sprayer", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 1], availability: [{ from: 2300 }], needs: "liquid-cargo" },
      { id: "light-fluid-suction-system-clan", name: "Light Fluid Suction System", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 1950 }], needs: "liquid-cargo" },
      { id: "remote-sensor-dispenser-clan", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2200 }] },
      { id: "lift-hoist-clan", name: "Lift Hoist", tons: 3, slots: 3, heat: 0, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"] },
      { id: "bridgelayer-light-clan", name: "Bridgelayer (Light)", aliases: ["Light Bridgelayer"], tons: 1, slots: 2, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-medium-clan", name: "Bridgelayer (Medium)", aliases: ["Medium Bridgelayer"], tons: 2, slots: 4, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-heavy-clan", name: "Bridgelayer (Heavy)", aliases: ["Heavy Bridgelayer"], tons: 6, slots: 12, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Age of War prototype electronics and equipment (Inner Sphere), the book prints a P on each year
      { id: "prototype-artemis-iv-is", name: "Prototype Artemis IV FCS", tons: 1, slots: 1, availability: [{ from: 2592 }], needs: "launcher" },
      { id: "prototype-beagle-active-probe-is", name: "Prototype Beagle Active Probe", tons: 2, slots: 3, type: "E", heat: 0, range: [0, 0, 0, 4], availability: [{ from: 2560 }] },
      { id: "prototype-case-is", name: "Prototype CASE", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 2452 }] },
      { id: "prototype-guardian-ecm-suite-is", name: "Prototype Guardian ECM Suite", tons: 2, slots: 3, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2595 }] },
      { id: "prototype-remote-sensors-is", name: "Prototype Remote Sensors", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2586 }] },
      { id: "prototype-tag-is", name: "Prototype TAG", tons: 1.5, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2593 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Late Succession Wars prototype: six one-slot items, 0 tons, placed anywhere (as the standard Triple-Strength Myomer)
      { id: "prototype-triple-strength-myomer-is", name: "Prototype Triple-Strength Myomer", tons: 0, slots: 1, availability: [{ from: 3028 }], perMech: 6 },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: IO, page: 213 }, playCite: { book: IO, page: 212 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Wars of Reaving equipment
      { id: "nova-cews-clan", name: "Nova CEWS", tons: 1.5, slots: 1, type: "E", heat: 2, damage: "0", range: [0, 0, 0, 3], availability: [{ from: 3065 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // RISC and Dark Age electronics and equipment
      { id: "risc-emergency-coolant-system-is", name: "RISC Emergency Coolant System", tons: 2, slots: 1, type: "PE, X", availability: [{ from: 3136 }] },
      { id: "risc-viral-jammer-decoy-is", name: "RISC Viral Jammer (Decoy)", tons: 2.5, slots: 1, type: "E", heat: 12, range: [0, 0, 0, 17], availability: [{ from: 3135 }] },
      { id: "risc-viral-jammer-homing-is", name: "RISC Viral Jammer (Homing)", tons: 2.5, slots: 1, type: "E", heat: 12, range: [0, 0, 0, 17], availability: [{ from: 3135 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 215 }, checked: "page", rulesLevel: "standard" },
    items: [
      // Land-Air BattleMech equipment (Tournament Legal); LAMs only, which the catalog does not check. LAM Fuel Tanks print ES, written as 2200
      { id: "lam-bomb-bay-is", name: "LAM Bomb Bay", tons: 1, slots: 1, availability: [{ from: 2680 }] },
      { id: "lam-fuel-tanks-is", name: "LAM Fuel Tanks", tons: 1, slots: 1, availability: [{ from: 2200 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 216-217
      { id: "bloodhound-active-probe-is", name: "Bloodhound Active Probe", aliases: ["Bloodhound AP"], tons: 2, slots: 3, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 8], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "angel-ecm-is", name: "Angel ECM", tons: 2, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 6], availability: [{ from: 3057 }], rulesLevel: "experimental" },
      { id: "c3-boosted-master-is", name: "C3 Boosted Master", aliases: ["C3BS Master"], tons: 6, slots: 6, type: "E, CE, T", heat: 0, availability: [{ from: 3073 }], rulesLevel: "experimental" },
      { id: "c3-boosted-slave-is", name: "C3 Boosted Slave", aliases: ["C3BS Slave"], tons: 3, slots: 2, type: "E, CE, T", heat: 0, availability: [{ from: 3073 }], rulesLevel: "experimental" },
      { id: "c3-emergency-master-is", name: "C3 Emergency Master", tons: 2, slots: 2, type: "E, T", heat: 0, availability: [{ from: 3071 }], rulesLevel: "experimental" },
      { id: "case-ii-is", name: "CASE II", tons: 1, slots: 1, type: "PE", availability: [{ from: 3064 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 216-217
      { id: "watchdog-cews-clan", name: "Watchdog CEWS", tons: 1.5, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 3], availability: [{ from: 3059 }], rulesLevel: "experimental" },
      { id: "angel-ecm-clan", name: "Angel ECM", tons: 2, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 6], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "artemis-v-clan", name: "Artemis V FCS", aliases: ["Artemis V"], tons: 1.5, slots: 2, type: "T", heat: 0, damage: "0", availability: [{ from: 3061 }], rulesLevel: "experimental", needs: "launcher" },
      { id: "case-ii-clan", name: "CASE II", tons: 0.5, slots: 1, type: "PE", availability: [{ from: 3062 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 218-219
      { id: "chaff-pod-is", name: "Chaff Pod", tons: 1, slots: 1, type: "PB, E, OS, X", heat: 0, availability: [{ from: 3069 }], rulesLevel: "experimental" },
      { id: "coolant-pod-is", name: "Coolant Pod", tons: 1, slots: 1, type: "PE, OS, X", availability: [{ from: 3049 }], rulesLevel: "experimental" },
      { id: "electronic-warfare-equipment-is", name: "Electronic Warfare Equipment", aliases: ["EW Equipment"], tons: 7.5, slots: 4, type: "E", range: [0, 0, 0, 3], availability: [{ from: 3025 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 218-219
      { id: "coolant-pod-clan", name: "Coolant Pod", tons: 1, slots: 1, type: "PE, OS, X", availability: [{ from: 3056 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 220-221
      { id: "laser-insulator-is", name: "Laser Insulator", tons: 0.5, slots: 1, type: "PE", availability: [{ from: 2575 }], rulesLevel: "experimental", needs: "laser" },
      { id: "mrm-apollo-fcs-is", name: "MRM Apollo FCS", aliases: ["Apollo FCS","MRM \"Apollo\" FCS"], tons: 1, slots: 1, type: "E", heat: 0, availability: [{ from: 3071 }], rulesLevel: "advanced", needs: "mrm" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 220-221
      { id: "laser-insulator-clan", name: "Laser Insulator", tons: 0.5, slots: 1, type: "PE", availability: [{ from: 2575 }], rulesLevel: "experimental", needs: "laser" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 223 }, playCite: { book: TO, page: 222 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 222-223
      { id: "ppc-capacitor-is", name: "PPC Capacitor", tons: 1, slots: 1, type: "X", availability: [{ from: 3060 }], rulesLevel: "experimental", needs: "ppc" },
      { id: "recon-camera-is", name: "Recon Camera", tons: 0.5, slots: 1, type: "E", availability: [{ from: 1950 }], rulesLevel: "advanced" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 223 }, playCite: { book: TO, page: 222 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 222-223
      { id: "recon-camera-clan", name: "Recon Camera", tons: 0.5, slots: 1, type: "E", availability: [{ from: 1950 }], rulesLevel: "advanced" },
    ],
  },
  // -------------------------------------------------------------------------------------------------------------
  // Tactical Operations: Advanced Units and Equipment, the items whose weight or slots the table leaves to a rule (an asterisk
  // or a formula), added with the formulas of rules/formulas.ts. Dates, cost and tech rating are the Heavy Weapons and Equipment
  // Construction Data table (printed pp. 217-223, read against the page images); the rules level and the weight, slot and
  // placement rules are the item entries (pp. 87-162), which `cite` names. "IS/Clan" in the table is a row for each tech base. A
  // table date marked P (prototype) or X (extinct) is written as the year, and the span stays open (as the rows above).
  // Fixed-count items (`perMech`) are the book's "one in each of" placements: the weight is the whole item's, shared between the
  // mounts (`splitWeight`). Not added: turrets (weight is a tenth of what sits in the turret; no link from an item to its turret
  // exists yet), handheld weapons (a composite carried, no slots or weight of their own), vehicle-only and other-unit equipment
  // (next stage).
  // -------------------------------------------------------------------------------------------------------------
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 217 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Actuator Enhancement System (rules p. 90): weight and slots by the 'Mech, an arm or all legs
      { id: "aes-arm-is", name: "Actuator Enhancement System (Arm)", aliases: ["AES", "Actuator Enhancement System", "AES (Arm)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3070 }], locations: ["LA", "RA"], locationsQuad: [], cite: { book: TO, page: 217 } },
      { id: "aes-leg-is", name: "Actuator Enhancement System (Leg)", aliases: ["AES (Leg)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3070 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4 },
      // Blue Shield (p. 108): 3 tons in all, one slot in every location but the head
      { id: "blue-shield-is", name: "Blue Shield Particle Field Damper", aliases: ["Blue Shield", "Blue Shield PFD"], tons: 3, slots: 1, availability: [{ from: 3053 }], perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], units: ["mech", "industrialmech", "vehicle", "aero"] },
      // Booby Trap (p. 109): a tenth of the unit, in the engine's location
      { id: "booby-trap-is", name: "Booby Trap", tons: "booby-trap", slots: 1, availability: [{ from: 1950 }], locations: ["CT"], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"] },
      // Claws, lance, mace (pp. 99-102): a ton and a slot for every 15, 20 or 10 tons of the 'Mech
      { id: "claws-is", name: "Claws", aliases: ["Claw"], tons: "ceil-tons-15", slots: "ceil-tons-15", availability: [{ from: 3060 }], locations: ["LA", "RA"], locationsQuad: [], rulesLevel: "advanced" },
      { id: "lance-is", name: "Lance", tons: "ceil-tons-20", slots: "ceil-tons-20", availability: [{ from: 3064 }], locations: ["LA", "RA"], locationsQuad: [] },
      { id: "mace-is", name: "Mace", tons: "ceil-tons-10", slots: "ceil-tons-10", availability: [{ from: 3061 }], locations: ["LA", "RA"], locationsQuad: [], rulesLevel: "advanced" },
      // Mechanical jump boosters (p. 104): 5 percent of the 'Mech for each Jumping MP chosen, two slots in each leg
      { id: "mechanical-jump-booster-is", name: "Mechanical Jump Booster", aliases: ["Mechanical Jump Boosters", "Jump Booster"], tons: "jump-booster", slots: 2, availability: [{ from: 3060 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, amount: { unit: "Jumping MP", min: 1, step: 1 } },
      // Partial wing (p. 104): 7 percent of the 'Mech, four slots in each side torso
      { id: "partial-wing-is", name: "Partial Wing", aliases: ["Partial Wing (IS)", "Partial Wing ('Mech)"], tons: "partial-wing-is", slots: 4, availability: [{ from: 3074 }], locations: ["LT", "RT"], perMech: 2, splitWeight: true },
      // UMU (p. 107): placed and weighed as jump jets
      { id: "umu-is", name: "UMU", aliases: ["UMUs", "Underwater Maneuvering Unit"], tons: "jump-jet", slots: 1, availability: [{ from: 3066 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"], checked: "page" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "aes-arm-clan", name: "Actuator Enhancement System (Arm)", aliases: ["AES", "Actuator Enhancement System", "AES (Arm)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3070 }], locations: ["LA", "RA"], locationsQuad: [] },
      { id: "aes-leg-clan", name: "Actuator Enhancement System (Leg)", aliases: ["AES (Leg)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3070 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4 },
      // Talons (p. 102): a ton for every 15 tons of the 'Mech in all, two slots in each leg
      { id: "talons-clan", name: "Talons", aliases: ["Talons [Clan]"], tons: "ceil-tons-15", slots: 2, availability: [{ from: 3072 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true },
      { id: "partial-wing-clan", name: "Partial Wing", aliases: ["Partial Wing (C)", "Partial Wing [Clan]", "Partial Wing (Clan)"], tons: "partial-wing-clan", slots: 3, availability: [{ from: 3067 }], locations: ["LT", "RT"], perMech: 2, splitWeight: true },
      { id: "umu-clan", name: "UMU", aliases: ["UMUs", "Underwater Maneuvering Unit"], tons: "jump-jet", slots: 1, availability: [{ from: 3061 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 219 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Chameleon Light Polarization Shield (p. 112): six slots, one in each limb and each side torso, no weight
      { id: "chameleon-lps-is", name: "Chameleon Light Polarization Shield", aliases: ["Chameleon LPS", "Chameleon Light Polarization", "Chameleon Light Polarization Shield (LPS)"], tons: 0, slots: 1, availability: [{ from: 2630 }], perMech: 6, splitWeight: true, locations: ["LA", "RA", "LL", "RL", "LT", "RT"], locationsQuad: ["FLL", "FRL", "RLL", "RRL", "LT", "RT"] },
      // Null-Signature System (p. 148): seven slots, one in each location but the head
      { id: "null-signature-system-is", name: "Null-Signature System", aliases: ["Null Signature System"], tons: 0, slots: 1, availability: [{ from: 2630 }], perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], cite: { book: TO, page: 221 } },
      // Void-Signature System (p. 161)
      { id: "void-signature-system-is", name: "Void-Signature System", aliases: ["Void Signature System", "Void Signature"], tons: 0, slots: 1, availability: [{ from: 3070 }], perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], cite: { book: TO, page: 223 } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 217 }, checked: "page" },
    items: [
      // BattleMech HarJel (p. 100): a ton and a slot in any location but the cockpit's; the table's 1* for both is read as per mount
      { id: "harjel-is", name: "BattleMech HarJel", aliases: ["HarJel", "HarJel Repair", "HarJel Repair System", "HarJel Repair Systems", "BattleMech HarJel System"], tons: 1, slots: 1, availability: [{ from: 3067 }], rulesLevel: "experimental", checked: "text", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
      // Cockpit Command Console (p. 112), Collapsible Command Module (p. 114), Full-Head Ejection System (p. 122), Aquatic Survival System (p. 137)
      { id: "cockpit-command-console-is", name: "Cockpit Command Console", aliases: ["Command Console"], tons: 3, slots: 1, availability: [{ from: 3030 }], rulesLevel: "advanced", locations: ["HD"], cite: { book: TO, page: 219 } },
      { id: "collapsible-command-module-is", name: "Collapsible Command Module", aliases: ["Collapsible Command Module (CCM)", "CCM"], tons: 16, slots: 12, availability: [{ from: 2710 }], rulesLevel: "experimental", cite: { book: TO, page: 219 } },
      { id: "full-head-ejection-system-is", name: "Full-Head Ejection System", aliases: ["Full Head Ejection System", "Full-Head Ejection"], tons: 0, slots: 0, availability: [{ from: 3023 }], rulesLevel: "advanced", locations: ["HD"], perMech: 1, cite: { book: TO, page: 219 } },
      { id: "aquatic-survival-system-is", name: "MechWarrior Aquatic Survival System", aliases: ["MASS", "Aquatic Survival System"], tons: 1.5, slots: 1, availability: [{ from: 3048 }], rulesLevel: "experimental", locations: ["HD"], cite: { book: TO, page: 221 } },
      // Supercharger (p. 156): a tenth of the engine's weight, in a location with engine slots
      { id: "supercharger-is", name: "Supercharger", tons: "supercharger", slots: 1, availability: [{ from: 2200 }], rulesLevel: "experimental", locations: ["CT", "LT", "RT"], cite: { book: TO, page: 223 } },
      // Jump pack (p. 104): carried as cargo, of any weight to 20 tons
      { id: "jump-pack-is", name: "Jump Pack", aliases: ["Drop Pack", "Jump Pack / Drop Pack", "Jump/Drop Pack"], tons: "chosen-tons", slots: 0, availability: [{ from: 2457 }], rulesLevel: "advanced", amount: { unit: "tons", min: 0.5, max: 20, step: 0.5 } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, checked: "page" },
    items: [
      { id: "harjel-clan", name: "BattleMech HarJel", aliases: ["HarJel", "HarJel Repair", "HarJel Repair System", "HarJel Repair Systems", "BattleMech HarJel System"], tons: 1, slots: 1, availability: [{ from: 3059 }], rulesLevel: "experimental", checked: "text", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
      { id: "cockpit-command-console-clan", name: "Cockpit Command Console", aliases: ["Command Console"], tons: 3, slots: 1, availability: [{ from: 2631 }], rulesLevel: "advanced", locations: ["HD"], cite: { book: TO, page: 219 } },
      { id: "collapsible-command-module-clan", name: "Collapsible Command Module", aliases: ["Collapsible Command Module (CCM)", "CCM"], tons: 16, slots: 12, availability: [{ from: 2710 }], rulesLevel: "experimental", cite: { book: TO, page: 219 } },
      { id: "full-head-ejection-system-clan", name: "Full-Head Ejection System", aliases: ["Full Head Ejection System", "Full-Head Ejection"], tons: 0, slots: 0, availability: [{ from: 3052 }], rulesLevel: "advanced", locations: ["HD"], perMech: 1, cite: { book: TO, page: 219 } },
      { id: "aquatic-survival-system-clan", name: "MechWarrior Aquatic Survival System", aliases: ["MASS", "Aquatic Survival System"], tons: 1.5, slots: 1, availability: [{ from: 3062 }], rulesLevel: "experimental", locations: ["HD"], cite: { book: TO, page: 221 } },
      { id: "supercharger-clan", name: "Supercharger", tons: "supercharger", slots: 1, availability: [{ from: 2200 }], rulesLevel: "experimental", locations: ["CT", "LT", "RT"], cite: { book: TO, page: 223 } },
      { id: "jump-pack-clan", name: "Jump Pack", aliases: ["Drop Pack", "Jump Pack / Drop Pack", "Jump/Drop Pack"], tons: "chosen-tons", slots: 0, availability: [{ from: 2457 }], rulesLevel: "advanced", amount: { unit: "tons", min: 0.5, max: 20, step: 0.5 } },
    ],
  },
  {
    // Heat sinks of the advanced types (TO:AUE pp.128-129, table p.217). Weight is counted with the chassis heat sinks, as for the rows above.
    defaults: { kind: "heat-sink", cite: { book: TO, page: 217 }, checked: "page", tons: 0 },
    items: [
      { id: "compact-heat-sink-is", name: "Compact Heat Sink", aliases: ["Compact Heat Sinks", "2 Compact Heat Sinks"], techBase: "inner-sphere", slots: 1, availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "laser-heat-sink-clan", name: "Laser Heat Sink", aliases: ["Laser Heat Sinks"], techBase: "clan", slots: 2, availability: [{ from: 3051 }], rulesLevel: "advanced" },
    ],
  },
  // -------------------------------------------------------------------------------------------------------------
  // TechManual industrial equipment the earlier pass left out: items sold by size or placed by a rule. Weight, slots and range are
  // the Industrial Equipment table (printed pp. 344-345), dates and cost the Industrial Equipment tables (pp. 292-293), all read
  // against the page images; the rules are the item entries (pp. 212, 239, 243-245). The books print one date for both tech bases
  // (the Clan column is a dash), so the Clan rows are marked inferred, as for the rows above. `units` is the table's Space columns
  // that are not NA; `by` is where a column differs from the BattleMech or IndustrialMech's.
  // Cargo and communications equipment take one slot per ton or fraction of a ton on a 'Mech (pp. 212, 239); the extended fuel tank
  // is a tenth of the engine's weight up to the half ton, with a slot for each ton of that, torso locations only (p. 244). Left out of this table: the dumper (weight is a share of the cargo it empties), tracks,
  // environmental sealing and ladders (weight by a rule on the unit), the bulldozer, field kitchen, MASH, quarters and the other
  // vehicle-only equipment (next pass).
  // -------------------------------------------------------------------------------------------------------------
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      { id: "searchlight-is", name: "Searchlight", aliases: ["Searchlight (Mounted)", "Mounted Searchlight"], tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 170], availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "ejection-seat-is", name: "Ejection Seat", tons: 0.5, slots: 1, availability: [{ from: 2445 }], locations: ["HD"], units: ["industrialmech", "vehicle"], by: { vehicle: { tons: 0.1, slots: 0, note: "Support vehicle" } } },
      { id: "extended-fuel-tank-is", name: "Extended Fuel Tank", aliases: ["Fuel Tank", "Extended Fuel Tanks"], tons: "fuel-tank-tons", slots: "fuel-tank-slots", availability: [{ from: 2300 }], locations: ["CT", "LT", "RT"], units: ["industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "communications-equipment-is", name: "Communications Equipment", aliases: ["CommsGear", "Comm. Equipment"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 1, max: 15, step: 1 }, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { vehicle: { slots: 1 }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "cargo-standard-is", name: "Cargo, Standard", aliases: ["Cargo", "Cargo Bay"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-liquid-is", name: "Cargo, Liquid", aliases: ["Liquid Storage", "Liquid Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-insulated-is", name: "Cargo, Insulated", aliases: ["Insulated Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      { id: "searchlight-clan", name: "Searchlight", aliases: ["Searchlight (Mounted)", "Mounted Searchlight"], tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 170], availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "ejection-seat-clan", name: "Ejection Seat", tons: 0.5, slots: 1, availability: [{ from: 2445 }], locations: ["HD"], units: ["industrialmech", "vehicle"], by: { vehicle: { tons: 0.1, slots: 0, note: "Support vehicle" } } },
      { id: "extended-fuel-tank-clan", name: "Extended Fuel Tank", aliases: ["Fuel Tank", "Extended Fuel Tanks"], tons: "fuel-tank-tons", slots: "fuel-tank-slots", availability: [{ from: 2300 }], locations: ["CT", "LT", "RT"], units: ["industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "communications-equipment-clan", name: "Communications Equipment", aliases: ["CommsGear", "Comm. Equipment"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 1, max: 15, step: 1 }, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { vehicle: { slots: 1 }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "cargo-standard-clan", name: "Cargo, Standard", aliases: ["Cargo", "Cargo Bay"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-liquid-clan", name: "Cargo, Liquid", aliases: ["Liquid Storage", "Liquid Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-insulated-clan", name: "Cargo, Insulated", aliases: ["Insulated Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
    ],
  },
  {
    // Interstellar Operations: Alternate Eras, Dark Age Equipment (Construction Data table, printed p. 215, read against the page
    // image; rules pp. 83, 87-88): the items the earlier pass left out for an asterisk. Radical heat sink: the table's 4 tons and 3
    // slots, in a torso (p. 83; the rules text adds no other weight). RISC laser pulse module: 1 ton and 1 slot in the laser's location
    // (p. 87). Heat sink override kit: no weight or space. Super-cooled myomer: 6 slots, one in each arm, leg and side torso (p. 88),
    // so on a quad each leg and side torso; it is a myomer (data/chassis.ts) as well as these mounts. Remote drone command console:
    // the table's 2 tons and one slot.
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 215 }, checked: "page" },
    items: [
      { id: "radical-heat-sink-is", name: "Radical Heat Sink System", aliases: ["Radical Heat Sink"], tons: 4, slots: 3, availability: [{ from: 3122 }], rulesLevel: "advanced", locations: ["CT", "LT", "RT"], units: ["mech", "industrialmech", "aero"] },
      { id: "super-cooled-myomer-is", name: "Super-Cooled Myomer", aliases: ["RISC Super-Cooled Myomer"], tons: 0, slots: 1, availability: [{ from: 3132 }], rulesLevel: "experimental", perMech: 6, splitWeight: true, locations: ["LA", "RA", "LL", "RL", "LT", "RT"], locationsQuad: ["FLL", "FRL", "RLL", "RRL", "LT", "RT"] },
      { id: "risc-heat-sink-override-kit-is", name: "RISC Heat Sink Override Kit", aliases: ["Heat Sink Override Kit"], tons: 0, slots: 0, availability: [{ from: 3134 }], rulesLevel: "experimental" },
      { id: "risc-laser-pulse-module-is", name: "RISC Laser Pulse Module", aliases: ["RISC Laser Module", "Laser Pulse Module"], tons: 1, slots: 1, availability: [{ from: 3137 }], rulesLevel: "experimental", needs: "laser" },
      { id: "remote-drone-command-console-is", name: "Remote Drone Command Console", aliases: ["Remote Drone"], tons: 2, slots: 1, availability: [{ from: 3140 }], rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      { id: "bulldozer-is", name: "Bulldozer", aliases: [], tons: 2, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "field-kitchen-is", name: "Field Kitchen", aliases: [], tons: 3, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "mash-core-unit-is", name: "MASH (Core Unit)", aliases: ["MASH"], tons: 3.5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "mash-added-theater-is", name: "MASH (Added Theater)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-steerage-is", name: "Quarters (Steerage)", aliases: ["Steerage"], tons: 5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-second-class-is", name: "Quarters (Crew/2nd Class)", aliases: ["Crew/2nd Class"], tons: 7, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-first-class-is", name: "Quarters (Officer/1st Class)", aliases: ["Officer/1st Class"], tons: 10, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-combat-crew-is", name: "Seating (Combat Crew)", aliases: [], tons: 0.5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-standard-is", name: "Seating (Standard)", aliases: [], tons: 0.075, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-pillion-is", name: "Seating (Pillion)", aliases: [], tons: 0.025, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "lifeboat-aerospace-is", name: "Lifeboat (Aerospace)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["smallcraft", "dropship"] },
      { id: "lifeboat-atmospheric-is", name: "Lifeboat (Atmospheric)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "lifeboat-maritime-is", name: "Lifeboat (Maritime)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "escape-pod-aerospace-is", name: "Escape Pod (Aerospace)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["smallcraft", "dropship"] },
      { id: "escape-pod-maritime-is", name: "Escape Pod (Maritime)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["vehicle"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      { id: "bulldozer-clan", name: "Bulldozer", aliases: [], tons: 2, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "field-kitchen-clan", name: "Field Kitchen", aliases: [], tons: 3, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "mash-core-unit-clan", name: "MASH (Core Unit)", aliases: ["MASH"], tons: 3.5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "mash-added-theater-clan", name: "MASH (Added Theater)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-steerage-clan", name: "Quarters (Steerage)", aliases: ["Steerage"], tons: 5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-second-class-clan", name: "Quarters (Crew/2nd Class)", aliases: ["Crew/2nd Class"], tons: 7, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "quarters-first-class-clan", name: "Quarters (Officer/1st Class)", aliases: ["Officer/1st Class"], tons: 10, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-combat-crew-clan", name: "Seating (Combat Crew)", aliases: [], tons: 0.5, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-standard-clan", name: "Seating (Standard)", aliases: [], tons: 0.075, slots: 1, availability: [{ from: 1950 }], units: ["vehicle", "smallcraft", "dropship"] },
      { id: "seating-pillion-clan", name: "Seating (Pillion)", aliases: [], tons: 0.025, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "lifeboat-aerospace-clan", name: "Lifeboat (Aerospace)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["smallcraft", "dropship"] },
      { id: "lifeboat-atmospheric-clan", name: "Lifeboat (Atmospheric)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "lifeboat-maritime-clan", name: "Lifeboat (Maritime)", aliases: [], tons: 1, slots: 1, availability: [{ from: 1950 }], units: ["vehicle"] },
      { id: "escape-pod-aerospace-clan", name: "Escape Pod (Aerospace)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["smallcraft", "dropship"] },
      { id: "escape-pod-maritime-clan", name: "Escape Pod (Maritime)", aliases: [], tons: 7, slots: 1, availability: [{ from: 2200 }], units: ["vehicle"] },
    ],
  },
  {
    // Weight and slots by a rule (TechManual pp. 213 and 249, tables pp. 344-345; dates pp. 213 and 249): tracks weigh a tenth of the 'Mech, one slot in
    // each leg; environmental sealing is a tenth of the IndustrialMech, one slot in each body location. The cost tables print no price for either.
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      { id: "tracks-is", name: "Tracks", aliases: ["Track"], tons: "tenth-tons", slots: 1, availability: [{ from: 2440 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, units: ["mech", "industrialmech"] },
      { id: "environmental-sealing-is", name: "Environmental Sealing", aliases: ["Environmental Sealing (IndustrialMech)"], tons: "tenth-tons", slots: 1, availability: [{ from: 1950 }], perMech: 8, splitWeight: true, units: ["industrialmech"] },
    ],
  },
  {
    // Weight and slots by a rule (TechManual pp. 213 and 249, tables pp. 344-345; dates pp. 213 and 249): tracks weigh a tenth of the 'Mech, one slot in
    // each leg; environmental sealing is a tenth of the IndustrialMech, one slot in each body location. The cost tables print no price for either.
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      { id: "tracks-clan", name: "Tracks", aliases: ["Track"], tons: "tenth-tons", slots: 1, availability: [{ from: 2440 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, units: ["mech", "industrialmech"] },
      { id: "environmental-sealing-clan", name: "Environmental Sealing", aliases: ["Environmental Sealing (IndustrialMech)"], tons: "tenth-tons", slots: 1, availability: [{ from: 1950 }], perMech: 8, splitWeight: true, units: ["industrialmech"] },
    ],
  },
  {
    // HarJel II and III (Interstellar Operations: Alternate Eras, Dark Age Equipment table printed p. 215, tech base and date read on the
    // page image at higher resolution; rules pp. 82-83, Advanced): one in a location, the same type throughout the unit, BattleMechs only.
    // The table's weights (2 and 3 tons) carry an asterisk; each mount is read as that weight and the slots the table prints.
    defaults: { kind: "other", techBase: "clan", cite: { book: IO, page: 215 }, checked: "page", rulesLevel: "advanced", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
    items: [
      { id: "harjel-ii-clan", name: "HarJel II Self-Repair System", aliases: ["HarJel II"], tons: 2, slots: 1, availability: [{ from: 3136 }] },
      { id: "harjel-iii-clan", name: "HarJel III Self-Repair System", aliases: ["HarJel III", "HarJel Repair Systems (HarJel III)"], tons: 3, slots: 2, availability: [{ from: 3139 }] },
    ],
  },
  {
    // Inner Sphere battle armor weapons and equipment (TechManual, Inner Sphere Battle Armor Equipment Table printed pp. 346-347: weight in
    // kilograms written as tons, space slots, damage, range; dates and cost from the Additional Battle Armor tables printed pp. 296-297; all read
    // against the page images). Years are the Inner Sphere's; the Clan column belongs to the Clan rows. Missile launchers are one row per tube
    // count, priced per tube; the bracketed [slot] and [weight] figures of one-shot launchers are not kept. Damage that the table marks ** (a
    // special weapon rule) is the number printed. Rows are named with "(Battle Armor)" where a 'Mech item has the same name. Not added: ammunition
    // per shot, modular mounts, mission equipment, parafoil, partial wing, power pack, remote sensor dispenser, searchlight, shotgun microphone, space
    // operations adaptation, squad support weapon mount and light TAG (variable or on pp. 298), and the detachable missile pack (a modifier).
    defaults: { techBase: "inner-sphere", checked: "page", units: ["battlearmor"] },
    items: [
      { id: "ba-david-light-gauss-rifle-is", name: "David Light Gauss Rifle (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 3063 }], kind: "weapon", damage: "1", range: [0, 3, 5, 8], cite: { book: "TechManual", page: 346 } },
      { id: "ba-king-david-light-gauss-rifle-is", name: "King David Light Gauss Rifle (Battle Armor)", tons: 0.275, slots: 2, availability: [{ from: 3063 }], kind: "weapon", damage: "1", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-magshot-gauss-rifle-is", name: "Magshot Gauss Rifle (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 3059 }], kind: "weapon", damage: "2", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-grand-mauler-gauss-rifle-is", name: "Grand Mauler Gauss Rifle (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3059 }], kind: "weapon", damage: "Special", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-tsunami-gauss-rifle-is", name: "Tsunami Gauss Rifle (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3056 }], kind: "weapon", damage: "1", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-micro-grenade-launcher-is", name: "Micro Grenade Launcher (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 2200 }], kind: "weapon", damage: "1", range: [0, 1, 2, 0], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-grenade-launcher-is", name: "Heavy Grenade Launcher (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "1", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-machine-gun-is", name: "Light Machine Gun (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 3068 }], kind: "weapon", damage: "1", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-machine-gun-is", name: "Machine Gun (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-machine-gun-is", name: "Heavy Machine Gun (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3068 }], kind: "weapon", damage: "3", range: [0, 1, 2, 0], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-mortar-is", name: "Light Mortar (Battle Armor)", tons: 0.3, slots: 2, availability: [{ from: 3057 }], kind: "weapon", damage: "3", range: [1, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-mortar-is", name: "Heavy Mortar (Battle Armor)", tons: 0.4, slots: 2, availability: [{ from: 3057 }], kind: "weapon", damage: "3", range: [2, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-recoilless-rifle-is", name: "Light Recoilless Rifle (Battle Armor)", tons: 0.175, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-recoilless-rifle-is", name: "Medium Recoilless Rifle (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-recoilless-rifle-is", name: "Heavy Recoilless Rifle (Battle Armor)", tons: 0.325, slots: 3, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 3, 5, 7], cite: { book: "TechManual", page: 346 } },
      { id: "ba-flamer-is", name: "Flamer (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-er-small-laser-is", name: "ER Small Laser (Battle Armor)", tons: 0.35, slots: 2, availability: [{ from: 3058 }], kind: "weapon", damage: "3", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-er-medium-laser-is", name: "ER Medium Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 3058 }], kind: "weapon", damage: "5", range: [0, 4, 8, 12], cite: { book: "TechManual", page: 346 } },
      { id: "ba-small-laser-is", name: "Small Laser (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 2300 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-laser-is", name: "Medium Laser (Battle Armor)", tons: 0.5, slots: 3, availability: [{ from: 2300 }], kind: "weapon", damage: "5", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-small-pulse-laser-is", name: "Small Pulse Laser (Battle Armor)", tons: 0.4, slots: 1, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-pulse-laser-is", name: "Medium Pulse Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "6", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 347 } },
      { id: "ba-support-ppc-is", name: "Support PPC (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 2436 }], kind: "weapon", damage: "2", range: [0, 2, 5, 7], cite: { book: "TechManual", page: 347 } },
      { id: "ba-man-portable-plasma-rifle-is", name: "Man-Portable Plasma Rifle (Battle Armor)", tons: 0.3, slots: 2, availability: [{ from: 3065 }], kind: "weapon", damage: "2", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 347 } },
      { id: "ba-firedrake-support-needler-is", name: "Firedrake Support Needler (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 3061 }], kind: "weapon", damage: "1", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 347 } },
      { id: "ba-compact-narc-is", name: "Compact Narc (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3060 }], kind: "weapon", damage: "0", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 347 } },
      { id: "ba-pop-up-mine-is", name: "Pop-Up Mine (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "4", range: [0, 0, 0, 0], cite: { book: "TechManual", page: 347 } },
      { id: "ba-active-probe-is", name: "Active Probe (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 3050 }], kind: "other", range: [0, 0, 0, 4], cite: { book: "TechManual", page: 347 } },
      { id: "ba-camo-system-is", name: "Camo System (Battle Armor)", tons: 0.2, slots: 2, availability: [{ from: 2800 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-cutting-torch-is", name: "Cutting Torch (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 1950 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-ecm-suite-is", name: "ECM Suite (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 2720, to: 2788 }, { from: 3057 }], kind: "other", range: [0, 0, 0, 0], cite: { book: "TechManual", page: 347 } },
      { id: "ba-extended-life-support-is", name: "Extended Life Support (Battle Armor)", tons: 0.025, slots: 1, availability: [{ from: 2715 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-fuel-tank-is", name: "Fuel Tank (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 2744, to: 2781 }, { from: 3051 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-heat-sensor-is", name: "Heat Sensor (Battle Armor)", tons: 0.02, slots: 1, availability: [{ from: 3050 }], kind: "other", range: [0, 9, 18, 27], cite: { book: "TechManual", page: 347 } },
      { id: "ba-improved-sensors-is", name: "Improved Sensors (Battle Armor)", tons: 0.065, slots: 1, availability: [{ from: 3051 }], kind: "other", range: [0, 0, 0, 2], cite: { book: "TechManual", page: 347 } },
      { id: "ba-jump-booster-is", name: "Jump Booster (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3051 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-laser-microphone-is", name: "Laser Microphone (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 2200 }], kind: "other", range: [0, 0, 0, 34], cite: { book: "TechManual", page: 347 } },
      { id: "ba-magnetic-clamps-is", name: "Magnetic Clamps (Battle Armor)", tons: 0.03, slots: 2, availability: [{ from: 3062 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-1-is", name: "LRM 1 (Battle Armor)", tons: 0.06, slots: 2, availability: [{ from: 3057 }], kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-2-is", name: "LRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3057 }], kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-3-is", name: "LRM 3 (Battle Armor)", tons: 0.18, slots: 3, availability: [{ from: 3057 }], kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-4-is", name: "LRM 4 (Battle Armor)", tons: 0.24, slots: 3, availability: [{ from: 3057 }], kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-5-is", name: "LRM 5 (Battle Armor)", tons: 0.3, slots: 4, availability: [{ from: 3057 }], kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-1-is", name: "SRM 1 (Battle Armor)", tons: 0.06, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-2-is", name: "SRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-3-is", name: "SRM 3 (Battle Armor)", tons: 0.18, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-4-is", name: "SRM 4 (Battle Armor)", tons: 0.24, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-5-is", name: "SRM 5 (Battle Armor)", tons: 0.3, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-6-is", name: "SRM 6 (Battle Armor)", tons: 0.36, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-1-is", name: "MRM 1 (Battle Armor)", tons: 0.06, slots: 1, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-2-is", name: "MRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-3-is", name: "MRM 3 (Battle Armor)", tons: 0.18, slots: 2, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-4-is", name: "MRM 4 (Battle Armor)", tons: 0.24, slots: 3, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-5-is", name: "MRM 5 (Battle Armor)", tons: 0.3, slots: 3, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-rocket-launcher-1-is", name: "Rocket Launcher 1 (Battle Armor)", tons: 0.025, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 7, 12], cite: { book: "TechManual", page: 347 } },
      { id: "ba-rocket-launcher-2-is", name: "Rocket Launcher 2 (Battle Armor)", tons: 0.05, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 7, 12], cite: { book: "TechManual", page: 347 } },
      { id: "ba-rocket-launcher-3-is", name: "Rocket Launcher 3 (Battle Armor)", tons: 0.075, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 7, 12], cite: { book: "TechManual", page: 347 } },
      { id: "ba-rocket-launcher-4-is", name: "Rocket Launcher 4 (Battle Armor)", tons: 0.1, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 7, 12], cite: { book: "TechManual", page: 347 } },
      { id: "ba-rocket-launcher-5-is", name: "Rocket Launcher 5 (Battle Armor)", tons: 0.125, slots: 4, availability: [{ from: 3050 }], kind: "weapon", damage: "1/Msl", range: [0, 3, 7, 12], cite: { book: "TechManual", page: 347 } },
    ],
  },
  {
    // Clan battle armor weapons and equipment (TechManual, Clan Battle Armor Equipment Table printed p. 348, read against the page image; dates
    // pp. 296-298). Where the Clan introduction column prints a dash the item pre-existed and the row takes the Inner Sphere year, marked
    // inferred (the convention of weapons.ts). Costs are the Inner Sphere rows' (one price for both tech bases) or listed with them. The
    // Bearhunter's range band prints "0/1/2" after the dash and is kept as 0, 0, 1, 2. Not added: HarJel (0 kg, 0 slots, no price in the
    // tables), modular mounts, mission equipment and the items on p. 298 (as for the Inner Sphere rows), and the detachable missile pack.
    defaults: { techBase: "clan", cite: { book: "TechManual", page: 348 }, checked: "page", units: ["battlearmor"] },
    items: [
      { id: "ba-ap-gauss-rifle-clan", name: "AP Gauss Rifle (Battle Armor)", tons: 0.2, slots: 2, availability: [{ from: 3069 }], kind: "weapon", damage: "3", range: [0, 3, 6, 9] },
      { id: "ba-heavy-grenade-launcher-clan", name: "Heavy Grenade Launcher (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 2900 }], kind: "weapon", damage: "1", range: [0, 1, 2, 3] },
      { id: "ba-light-machine-gun-clan", name: "Light Machine Gun (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 3060 }], kind: "weapon", damage: "1", range: [0, 2, 4, 6] },
      { id: "ba-machine-gun-clan", name: "Machine Gun (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], yearsInferred: true },
      { id: "ba-heavy-machine-gun-clan", name: "Heavy Machine Gun (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3059 }], kind: "weapon", damage: "3", range: [0, 1, 2, 0] },
      { id: "ba-bearhunter-superheavy-ac-clan", name: "Bearhunter Superheavy AC (Battle Armor)", tons: 0.15, slots: 2, availability: [{ from: 3062 }], kind: "weapon", damage: "3", range: [0, 0, 1, 2] },
      { id: "ba-light-recoilless-rifle-clan", name: "Light Recoilless Rifle (Battle Armor)", tons: 0.175, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 2, 4, 6], yearsInferred: true },
      { id: "ba-medium-recoilless-rifle-clan", name: "Medium Recoilless Rifle (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 2, 4, 6], yearsInferred: true },
      { id: "ba-heavy-recoilless-rifle-clan", name: "Heavy Recoilless Rifle (Battle Armor)", tons: 0.325, slots: 3, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 3, 5, 7], yearsInferred: true },
      { id: "ba-flamer-clan", name: "Flamer (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 2868 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3] },
      { id: "ba-er-micro-laser-clan", name: "ER Micro Laser (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3059 }], kind: "weapon", damage: "2", range: [0, 1, 2, 4] },
      { id: "ba-er-small-laser-clan", name: "ER Small Laser (Battle Armor)", tons: 0.35, slots: 2, availability: [{ from: 2825 }], kind: "weapon", damage: "5", range: [0, 2, 4, 6] },
      { id: "ba-er-medium-laser-clan", name: "ER Medium Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2824 }], kind: "weapon", damage: "7", range: [0, 5, 10, 15] },
      { id: "ba-small-laser-clan", name: "Small Laser (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 2300 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3], yearsInferred: true },
      { id: "ba-micro-pulse-laser-clan", name: "Micro Pulse Laser (Battle Armor)", tons: 0.16, slots: 1, availability: [{ from: 3060 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3] },
      { id: "ba-small-pulse-laser-clan", name: "Small Pulse Laser (Battle Armor)", tons: 0.4, slots: 1, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "3", range: [0, 2, 4, 6], yearsInferred: true },
      { id: "ba-medium-pulse-laser-clan", name: "Medium Pulse Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "7", range: [0, 4, 8, 12], yearsInferred: true },
      { id: "ba-heavy-small-laser-clan", name: "Heavy Small Laser (Battle Armor)", tons: 0.5, slots: 3, availability: [{ from: 3059 }], kind: "weapon", damage: "6", range: [0, 1, 2, 3] },
      { id: "ba-heavy-medium-laser-clan", name: "Heavy Medium Laser (Battle Armor)", tons: 1.0, slots: 4, availability: [{ from: 3059 }], kind: "weapon", damage: "10", range: [0, 3, 6, 9] },
      { id: "ba-support-ppc-clan", name: "Support PPC (Battle Armor)", tons: 0.24, slots: 2, availability: [{ from: 2436 }], kind: "weapon", damage: "2", range: [0, 2, 5, 7], yearsInferred: true },
      { id: "ba-compact-narc-clan", name: "Compact Narc (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 2875 }], kind: "weapon", damage: "0", range: [0, 2, 4, 5] },
      { id: "ba-bomb-rack-clan", name: "Bomb Rack (Battle Armor)", tons: 0.1, slots: 2, availability: [{ from: 3060 }], kind: "weapon", damage: "2", range: [0, 0, 0, 0] },
      { id: "ba-active-probe-clan", name: "Active Probe (Battle Armor)", tons: 0.15, slots: 2, availability: [{ from: 2900 }], kind: "other", range: [0, 0, 0, 5] },
      { id: "ba-cutting-torch-clan", name: "Cutting Torch (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 1950 }], kind: "other", yearsInferred: true },
      { id: "ba-ecm-suite-clan", name: "ECM Suite (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 2720, to: 2788 }, { from: 3057 }], kind: "other", range: [0, 0, 0, 0], yearsInferred: true },
      { id: "ba-extended-life-support-clan", name: "Extended Life Support (Battle Armor)", tons: 0.025, slots: 1, availability: [{ from: 2715 }], kind: "other", yearsInferred: true },
      { id: "ba-fuel-tank-clan", name: "Fuel Tank (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 2744, to: 2781 }, { from: 3051 }], kind: "other", yearsInferred: true },
      { id: "ba-heat-sensor-clan", name: "Heat Sensor (Battle Armor)", tons: 0.02, slots: 1, availability: [{ from: 2880 }], kind: "other", range: [0, 11, 23, 34] },
      { id: "ba-improved-sensors-clan", name: "Improved Sensors (Battle Armor)", tons: 0.045, slots: 1, availability: [{ from: 2890 }], kind: "other", range: [0, 0, 0, 3] },
      { id: "ba-jump-booster-clan", name: "Jump Booster (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3062 }], kind: "other" },
      { id: "ba-laser-microphone-clan", name: "Laser Microphone (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 2200 }], kind: "other", range: [0, 0, 0, 34], yearsInferred: true },
      { id: "ba-lrm-1-clan", name: "LRM 1 (Battle Armor)", tons: 0.035, slots: 2, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-2-clan", name: "LRM 2 (Battle Armor)", tons: 0.07, slots: 2, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-3-clan", name: "LRM 3 (Battle Armor)", tons: 0.105, slots: 3, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-4-clan", name: "LRM 4 (Battle Armor)", tons: 0.14, slots: 3, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-5-clan", name: "LRM 5 (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 3060 }], kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-srm-1-clan", name: "SRM 1 (Battle Armor)", tons: 0.035, slots: 1, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-2-clan", name: "SRM 2 (Battle Armor)", tons: 0.07, slots: 2, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-3-clan", name: "SRM 3 (Battle Armor)", tons: 0.105, slots: 2, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-4-clan", name: "SRM 4 (Battle Armor)", tons: 0.14, slots: 2, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-5-clan", name: "SRM 5 (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-6-clan", name: "SRM 6 (Battle Armor)", tons: 0.21, slots: 3, availability: [{ from: 2868 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-advanced-srm-1-clan", name: "Advanced SRM 1 (Battle Armor)", tons: 0.06, slots: 2, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-2-clan", name: "Advanced SRM 2 (Battle Armor)", tons: 0.09, slots: 2, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-3-clan", name: "Advanced SRM 3 (Battle Armor)", tons: 0.12, slots: 3, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-4-clan", name: "Advanced SRM 4 (Battle Armor)", tons: 0.15, slots: 3, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-5-clan", name: "Advanced SRM 5 (Battle Armor)", tons: 0.18, slots: 4, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-6-clan", name: "Advanced SRM 6 (Battle Armor)", tons: 0.21, slots: 4, availability: [{ from: 3056 }], kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
    ],
  },
];
