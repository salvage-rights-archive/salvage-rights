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
];
