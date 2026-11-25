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
      { id: "double-heat-sink-is", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], slots: 3, availability: [{ from: 2567, to: 2865 }, { from: 3040 }], prototypeYear: 2559 },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: { book: "TechManual", page: 51 }, checked: "page" },
    items: [
      // Jump jets (Inner Sphere)
      { id: "jump-jet-is", name: "Jump Jet", aliases: ["Jump Jets"], tons: "jump-jet", slots: 1, availability: [{ from: 2471 }], prototypeYear: 2464, locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "inner-sphere", cite: { book: "TechManual", page: 51 }, checked: "page", yearsInferred: true },
    items: [
      // Jump jets (Inner Sphere)
      { id: "improved-jump-jet-is", name: "Improved Jump Jet", aliases: ["Improved Jump Jets"], tons: "improved-jump-jet", slots: 2, availability: [{ from: 3070 }], yearsInferred: false, locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 342 }, checked: "page" },
    items: [
      // Electronics, CASE and fire control (Inner Sphere)
      { id: "beagle-active-probe-is", name: "Beagle Active Probe", aliases: ["Active Probe (Beagle)"], tons: 1.5, slots: 2, type: "E", heat: 0, range: [0, 0, 0, 4], availability: [{ from: 2576, to: 2835 }, { from: 3045 }], prototypeYear: 2560, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft"], by: { vehicle: { slots: 1, note: "Support vehicle: 2 slots" }, aero: { slots: 1 }, smallcraft: { slots: 1 } } },
      { id: "case-is", name: "CASE", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 2476, to: 2840 }, { from: 3036 }], prototypeYear: 2452, locations: ["CT", "LT", "RT"], units: ["mech", "industrialmech", "vehicle", "aero"], by: { aero: { slots: 0 } } },
      { id: "c3-computer-master-is", name: "C3 Computer (Master)", tons: 5, slots: 5, heat: 0, availability: [{ from: 3050 }], prototypeYear: 3039, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1, note: "Support vehicle: 1* slots" } } },
      { id: "c3-computer-slave-is", name: "C3 Computer (Slave)", tons: 1, slots: 1, heat: 0, availability: [{ from: 3050 }], prototypeYear: 3039, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { note: "Support vehicle: 1* slots" } } },
      { id: "improved-c3-computer-is", name: "Improved C3 Computer", aliases: ["C3i"], tons: 2.5, slots: 2, heat: 0, availability: [{ from: 3062 }], prototypeYear: 3052, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1, note: "Support vehicle: 1* slots" } } },
      { id: "guardian-ecm-suite-is", name: "Guardian ECM Suite", aliases: ["ECM Suite (Guardian)"], tons: 1.5, slots: 2, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2597, to: 2845 }, { from: 3045 }], prototypeYear: 2595, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft"], by: { vehicle: { slots: 1, note: "Support vehicle: 2 slots" }, aero: { slots: 1 }, smallcraft: { slots: 1 } } },
      { id: "machine-gun-array-is", name: "Machine Gun Array", aliases: ["Machine Gun Array Module", "Light Machine Gun Array Module", "Heavy Machine Gun Array Module"], tons: 0.5, slots: 1, availability: [{ from: 3068 }], prototypeYear: 3066, needs: "machine-gun" },
      { id: "tag-is", name: "TAG", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2600, to: 2835 }, { from: 3044 }], prototypeYear: 2593, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"] },
      // Artemis IV (Inner Sphere); weight and slots are derived, see the file header
      { id: "artemis-iv-is", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2598, to: 2855 }, { from: 3035 }], prototypeYear: 2592, needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 52 }, checked: "page" },
    items: [
      // MASC (Inner Sphere); weight and slots are a share of the 'Mech's tonnage
      { id: "masc-is", name: "MASC", aliases: ["Myomer Accelerator Signal Circuitry"], tons: "masc-is", slots: "masc-is", availability: [{ from: 2740, to: 2795 }, { from: 3035 }], prototypeYear: 2730 },
      // Triple-Strength Myomer: six one-slot items, 0 tons, placed anywhere
      { id: "tsm-is", name: "Triple-Strength Myomer", aliases: ["TSM"], tons: 0, slots: 1, availability: [{ from: 3050 }], prototypeYear: 3028, perMech: 6, checked: "text" },
      // Industrial Triple-Strength Myomer (IndustrialMech construction, printed p.70, table and text read against the page image):
      // twelve one-slot items, 0 tons, placed anywhere and not contiguous; Inner Sphere IndustrialMechs only. Production 3045 (IO:AE printed p.42).
      { id: "industrial-tsm-is", name: "Industrial Triple-Strength Myomer", aliases: ["Industrial TSM"], tons: 0, slots: 1, availability: [{ from: 3045 }], prototypeYear: 3035, perMech: 12, units: ["industrialmech"], cite: { book: "TechManual", page: 70 } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 238 }, checked: "page" },
    items: [
      // Targeting Computer (Inner Sphere): weight and slots from the direct-fire weapons mounted
      { id: "targeting-computer-is", name: "Targeting Computer", tons: "targeting-computer-is", slots: "targeting-computer-is", heat: 0, availability: [{ from: 3062 }], prototypeYear: 3052 },
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
      { id: "backhoe-is", name: "Backhoe", tons: 5, slots: 6, heat: 0, damage: "6", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "chainsaw-is", name: "Chainsaw", tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "combine-is", name: "Combine", tons: 2.5, slots: 4, heat: 0, damage: "3", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "dual-saw-is", name: "Dual Saw", tons: 7, slots: 7, heat: 0, damage: "7", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "heavy-duty-pile-driver-is", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, heat: 0, damage: "9", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "lower-arm", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1, note: "Support vehicle: 1* slots" } } },
      { id: "mining-drill-is", name: "Mining Drill", tons: 3, slots: 4, heat: 0, damage: "4", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "rock-cutter-is", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "spot-welder-is", name: "Spot Welder", tons: 2, slots: 1, heat: 2, damage: "5", availability: [{ from: 2320 }], prototypeYear: 2312, locations: ["LA", "RA"], armRemoves: "hand", heavyEnergy: true, locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"] },
      { id: "nail-rivet-gun-is", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, heat: 0, damage: "0", range: [0, 1, 0, 0], availability: [{ from: 2310 }], prototypeYear: 2309, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { note: "Support vehicle: 1** slots" } } },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 345 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "wrecking-ball-is", name: "Wrecking Ball", tons: 4, slots: 5, heat: 0, damage: "8", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: [], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "salvage-arm-is", name: "Salvage Arm", tons: 3, slots: 2, heat: 0, availability: [{ from: 2415 }], prototypeYear: 2400, locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: [] },
      { id: "sprayer-is", name: "Sprayer", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 1], availability: [{ from: 2300 }], needs: "liquid-cargo" },
      { id: "light-fluid-suction-system-is", name: "Light Fluid Suction System", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 1950 }], needs: "liquid-cargo" },
      { id: "remote-sensor-dispenser-is", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2200 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { dropship: { slots: 0 } } },
      { id: "lift-hoist-is", name: "Lift Hoist", tons: 3, slots: 3, heat: 0, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
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
      { id: "double-heat-sink-clan", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], slots: 2, availability: [{ from: 2827 }], prototypeYear: 2825, yearsInferred: false },
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
      { id: "improved-jump-jet-clan", name: "Improved Jump Jet", aliases: ["Improved Jump Jets"], tons: "improved-jump-jet", slots: 2, availability: [{ from: 3069 }], prototypeYear: 3060, locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page" },
    items: [
      // Electronics, CASE and fire control (Clan)
      { id: "active-probe-clan", name: "Active Probe", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 5], availability: [{ from: 2832 }], prototypeYear: 2830, units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft"] },
      { id: "light-active-probe-clan", name: "Light Active Probe", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 3], availability: [{ from: 2900 }], prototypeYear: 2890, units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft", "dropship"], by: { dropship: { slots: 0 } } },
      { id: "ecm-suite-clan", name: "ECM Suite", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2832 }], prototypeYear: 2830, units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft"] },
      { id: "machine-gun-array-clan", name: "Machine Gun Array", aliases: ["Machine Gun Array Module", "Light Machine Gun Array Module", "Heavy Machine Gun Array Module"], tons: 0.25, slots: 1, availability: [{ from: 3069 }], needs: "machine-gun" },
      { id: "light-tag-clan", name: "Light TAG", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 3, 6, 9], availability: [{ from: 3054 }], prototypeYear: 3051, units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft", "dropship"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page", yearsInferred: true },
    items: [
      // Electronics, CASE and fire control (Clan)
      { id: "tag-clan", name: "TAG", tons: 1, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2830 }], prototypeYear: 2828, yearsInferred: false, units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft", "dropship"] },
      // Artemis IV (Clan); weight and slots are derived, see the file header
      { id: "artemis-iv-clan", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2818 }], prototypeYear: 2816, yearsInferred: false, needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 58 }, checked: "page" },
    items: [
      // Clan CASE: comes free in tonnage and critical space (p. 58, the Gladiator Prime example; p. 210 says weightless); the Clan table lists none
      { id: "case-clan", name: "CASE", tons: 0, slots: 0, availability: [{ from: 2825 }], prototypeYear: 2824 },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 52 }, checked: "page", yearsInferred: true },
    items: [
      // MASC (Clan); weight and slots are a share of the 'Mech's tonnage
      { id: "masc-clan", name: "MASC", aliases: ["Myomer Accelerator Signal Circuitry"], tons: "masc-clan", slots: "masc-clan", availability: [{ from: 2827 }], prototypeYear: 2820, yearsInferred: false },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 238 }, checked: "page" },
    items: [
      // Targeting Computer (Clan): weight and slots from the direct-fire weapons mounted
      { id: "targeting-computer-clan", name: "Targeting Computer", tons: "targeting-computer-clan", slots: "targeting-computer-clan", heat: 0, availability: [{ from: 2860 }], prototypeYear: 2850 },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "backhoe-clan", name: "Backhoe", tons: 5, slots: 6, heat: 0, damage: "6", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "chainsaw-clan", name: "Chainsaw", tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "combine-clan", name: "Combine", tons: 2.5, slots: 4, heat: 0, damage: "3", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "dual-saw-clan", name: "Dual Saw", tons: 7, slots: 7, heat: 0, damage: "7", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "heavy-duty-pile-driver-clan", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, heat: 0, damage: "9", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "lower-arm", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1, note: "Support vehicle: 1* slots" } } },
      { id: "mining-drill-clan", name: "Mining Drill", tons: 3, slots: 4, heat: 0, damage: "4", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "rock-cutter-clan", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, heat: 0, damage: "5", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "spot-welder-clan", name: "Spot Welder", tons: 2, slots: 1, heat: 2, damage: "5", availability: [{ from: 2320 }], locations: ["LA", "RA"], armRemoves: "hand", heavyEnergy: true, locationsQuad: ["LT", "RT"], units: ["mech", "industrialmech", "vehicle"] },
      { id: "nail-rivet-gun-clan", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, heat: 0, damage: "0", range: [0, 1, 0, 0], availability: [{ from: 2310 }], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { note: "Support vehicle: 1** slots" } } },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 345 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "wrecking-ball-clan", name: "Wrecking Ball", tons: 4, slots: 5, heat: 0, damage: "8", availability: [{ from: 1950 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: [], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "salvage-arm-clan", name: "Salvage Arm", tons: 3, slots: 2, heat: 0, availability: [{ from: 2415 }], locations: ["LA", "RA"], armRemoves: "hand", locationsQuad: [] },
      { id: "sprayer-clan", name: "Sprayer", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 1], availability: [{ from: 2300 }], needs: "liquid-cargo" },
      { id: "light-fluid-suction-system-clan", name: "Light Fluid Suction System", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 1950 }], needs: "liquid-cargo" },
      { id: "remote-sensor-dispenser-clan", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2200 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { dropship: { slots: 0 } } },
      { id: "lift-hoist-clan", name: "Lift Hoist", tons: 3, slots: 3, heat: 0, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"], units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "bridgelayer-light-clan", name: "Bridgelayer (Light)", aliases: ["Light Bridgelayer"], tons: 1, slots: 2, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-medium-clan", name: "Bridgelayer (Medium)", aliases: ["Medium Bridgelayer"], tons: 2, slots: 4, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
      { id: "bridgelayer-heavy-clan", name: "Bridgelayer (Heavy)", aliases: ["Heavy Bridgelayer"], tons: 6, slots: 12, heat: 0, availability: [{ from: 1950 }], locations: [], locationsQuad: ["CT", "LT", "RT"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 211 }, playCite: { book: IO, page: 210 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Age of War prototype electronics and equipment (Inner Sphere), the book prints a P on each year
      { id: "prototype-artemis-iv-is", name: "Prototype Artemis IV FCS", tons: 1, slots: 1, availability: [{ from: 2592 }], needs: "launcher", units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"], by: { vehicle: { slots: 0, note: "Support vehicle: +1 slots" }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 }, ship: { slots: 0 }, building: { slots: 0 } } },
      { id: "prototype-beagle-active-probe-is", name: "Prototype Beagle Active Probe", tons: 2, slots: 3, type: "E", heat: 0, range: [0, 0, 0, 4], availability: [{ from: 2560 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"], by: { vehicle: { slots: 1, note: "Support vehicle: 3 slots" }, aero: { slots: 1 }, smallcraft: { slots: 1 }, dropship: { slots: 1 }, ship: { slots: 1 }, building: { slots: 1 } } },
      { id: "prototype-case-is", name: "Prototype CASE", tons: 0.5, slots: 1, heat: 0, availability: [{ from: 2452 }], units: ["mech", "industrialmech", "vehicle", "aero"], by: { aero: { slots: 0 } } },
      { id: "prototype-guardian-ecm-suite-is", name: "Prototype Guardian ECM Suite", tons: 2, slots: 3, type: "E", heat: 0, range: [0, 0, 0, 6], availability: [{ from: 2595 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "building"], by: { vehicle: { slots: 1, note: "Support vehicle: 3 slots" }, aero: { slots: 1 }, smallcraft: { slots: 1 }, dropship: { slots: 1 }, building: { slots: 1 } } },
      { id: "prototype-remote-sensors-is", name: "Prototype Remote Sensors", tons: 0.5, slots: 1, type: "E", heat: 0, range: [0, 0, 0, 0], availability: [{ from: 2586 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"] },
      { id: "prototype-tag-is", name: "Prototype TAG", tons: 1.5, slots: 1, type: "E", heat: 0, range: [0, 5, 9, 15], availability: [{ from: 2593 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"] },
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
      { id: "nova-cews-clan", name: "Nova CEWS", tons: 1.5, slots: 1, type: "E", heat: 2, damage: "0", range: [0, 0, 0, 3], availability: [{ from: 3065 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: IO, page: 215 }, playCite: { book: IO, page: 214 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // RISC and Dark Age electronics and equipment
      { id: "risc-emergency-coolant-system-is", name: "RISC Emergency Coolant System", tons: 2, slots: 1, type: "PE, X", availability: [{ from: 3136 }] },
      { id: "risc-viral-jammer-decoy-is", name: "RISC Viral Jammer (Decoy)", tons: 2.5, slots: 1, type: "E", heat: 12, range: [0, 0, 0, 17], availability: [{ from: 3135 }], units: ["mech", "industrialmech", "vehicle", "protomech", "building"] },
      { id: "risc-viral-jammer-homing-is", name: "RISC Viral Jammer (Homing)", tons: 2.5, slots: 1, type: "E", heat: 12, range: [0, 0, 0, 17], availability: [{ from: 3135 }], units: ["mech", "industrialmech", "vehicle", "protomech", "building"] },
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
      { id: "bloodhound-active-probe-is", name: "Bloodhound Active Probe", aliases: ["Bloodhound AP"], tons: 2, slots: 3, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 8], availability: [{ from: 3082 }], prototypeYear: 3058, rulesLevel: "experimental" },
      { id: "angel-ecm-is", name: "Angel ECM", tons: 2, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 6], availability: [{ from: 3080 }], prototypeYear: 3057, rulesLevel: "experimental" },
      { id: "c3-boosted-master-is", name: "C3 Boosted Master", aliases: ["C3BS Master"], tons: 6, slots: 6, type: "E, CE, T", heat: 0, availability: [{ from: 3100 }], prototypeYear: 3073, rulesLevel: "experimental" },
      { id: "c3-boosted-slave-is", name: "C3 Boosted Slave", aliases: ["C3BS Slave"], tons: 3, slots: 2, type: "E, CE, T", heat: 0, availability: [{ from: 3100 }], prototypeYear: 3073, rulesLevel: "experimental" },
      { id: "c3-emergency-master-is", name: "C3 Emergency Master", tons: 2, slots: 2, type: "E, T", heat: 0, availability: [{ from: 3099 }], prototypeYear: 3071, rulesLevel: "experimental" },
      { id: "case-ii-is", name: "CASE II", tons: 1, slots: 1, type: "PE", availability: [{ from: 3082 }], prototypeYear: 3064, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, playCite: { book: TO, page: 216 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 216-217
      { id: "watchdog-cews-clan", name: "Watchdog CEWS", tons: 1.5, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 3], availability: [{ from: 3080 }], prototypeYear: 3059, rulesLevel: "experimental" },
      { id: "angel-ecm-clan", name: "Angel ECM", tons: 2, slots: 2, type: "E", heat: 0, damage: "0", range: [0, 0, 0, 6], availability: [{ from: 3058 }], rulesLevel: "experimental" },
      { id: "artemis-v-clan", name: "Artemis V FCS", aliases: ["Artemis V"], tons: 1.5, slots: 2, type: "T", heat: 0, damage: "0", availability: [{ from: 3085 }], prototypeYear: 3061, rulesLevel: "experimental", needs: "launcher" },
      { id: "case-ii-clan", name: "CASE II", tons: 0.5, slots: 1, type: "PE", availability: [{ from: 3082 }], prototypeYear: 3062, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 218-219
      { id: "chaff-pod-is", name: "Chaff Pod", tons: 1, slots: 1, type: "PB, E, OS, X", heat: 0, availability: [{ from: 3079 }], prototypeYear: 3069, rulesLevel: "experimental" },
      { id: "coolant-pod-is", name: "Coolant Pod", tons: 1, slots: 1, type: "PE, OS, X", availability: [{ from: 3079 }], prototypeYear: 3049, rulesLevel: "experimental" },
      // Drone Operating System (table p. 219, rules p. 118): a tenth of the drone unit's weight plus the half-ton sensor system the rules require with it (one item here), one slot, "ES" in both columns (written as 2200). Price: 5,000 plus 10,000 for each ton of the item.
      { id: "drone-operating-system-is", name: "Drone Operating System", aliases: ["Drone OS"], tons: "drone-os-tons", slots: 1, type: "E", availability: [{ from: 2200 }], rulesLevel: "advanced", units: ["mech", "industrialmech", "vehicle", "aero"] },
      { id: "electronic-warfare-equipment-is", name: "Electronic Warfare Equipment", aliases: ["EW Equipment"], tons: 7.5, slots: 4, type: "E", range: [0, 0, 0, 3], availability: [{ from: 3025 }], prototypeYear: 3020, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 219 }, playCite: { book: TO, page: 218 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 218-219
      // Drone Operating System (table p. 219, rules p. 118): a tenth of the drone unit's weight plus the half-ton sensor system the rules require with it (one item here), one slot, "ES" in both columns (written as 2200). Price: 5,000 plus 10,000 for each ton of the item.
      { id: "drone-operating-system-clan", name: "Drone Operating System", aliases: ["Drone OS"], tons: "drone-os-tons", slots: 1, type: "E", availability: [{ from: 2200 }], rulesLevel: "advanced", units: ["mech", "industrialmech", "vehicle", "aero"] },
      { id: "coolant-pod-clan", name: "Coolant Pod", tons: 1, slots: 1, type: "PE, OS, X", availability: [{ from: 3079 }], prototypeYear: 3056, rulesLevel: "experimental" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 221 }, playCite: { book: TO, page: 220 }, checked: "page" },
    items: [
      // Electronics and other equipment, pp. 220-221
      { id: "laser-insulator-is", name: "Laser Insulator", tons: 0.5, slots: 1, type: "PE", availability: [{ from: 2575 }], rulesLevel: "experimental", needs: "laser" },
      { id: "mrm-apollo-fcs-is", name: "MRM Apollo FCS", aliases: ["Apollo FCS","MRM \"Apollo\" FCS"], tons: 1, slots: 1, type: "E", heat: 0, availability: [{ from: 3071 }], prototypeYear: 3065, rulesLevel: "advanced", needs: "mrm" },
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
      { id: "ppc-capacitor-is", name: "PPC Capacitor", tons: 1, slots: 1, type: "X", availability: [{ from: 3081 }], prototypeYear: 3060, rulesLevel: "experimental", needs: "ppc" },
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
      { id: "aes-arm-is", name: "Actuator Enhancement System (Arm)", aliases: ["AES", "Actuator Enhancement System", "AES (Arm)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3108 }], prototypeYear: 3070, locations: ["LA", "RA"], locationsQuad: [], cite: { book: TO, page: 217 } },
      { id: "aes-leg-is", name: "Actuator Enhancement System (Leg)", aliases: ["AES (Leg)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3108 }], prototypeYear: 3070, locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4 },
      // Blue Shield (p. 108): 3 tons in all, one slot in every location but the head
      { id: "blue-shield-is", name: "Blue Shield Particle Field Damper", aliases: ["Blue Shield", "Blue Shield PFD"], tons: 3, slots: 1, availability: [{ from: 3053 }], perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], units: ["mech", "industrialmech", "vehicle", "aero"] },
      // Booby Trap (p. 109): a tenth of the unit, in the engine's location
      { id: "booby-trap-is", name: "Booby Trap", tons: "booby-trap", slots: 1, availability: [{ from: 1950 }], locations: ["CT"], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship", "ship", "building"] },
      // Claws, lance, mace (pp. 99-102): a ton and a slot for every 15, 20 or 10 tons of the 'Mech
      { id: "claws-is", name: "Claws", aliases: ["Claw"], tons: "ceil-tons-15", slots: "ceil-tons-15", availability: [{ from: 3060 }], prototypeYear: 3050, locations: ["LA", "RA"], locationsQuad: [], rulesLevel: "advanced" },
      { id: "lance-is", name: "Lance", tons: "ceil-tons-20", slots: "ceil-tons-20", availability: [{ from: 3083 }], prototypeYear: 3064, locations: ["LA", "RA"], locationsQuad: [] },
      { id: "mace-is", name: "Mace", tons: "ceil-tons-10", slots: "ceil-tons-10", availability: [{ from: 3079 }], prototypeYear: 3061, prototypeLevel: "advanced", locations: ["LA", "RA"], locationsQuad: [], rulesLevel: "advanced" },
      // Mechanical jump boosters (p. 104): 5 percent of the 'Mech for each Jumping MP chosen, two slots in each leg
      { id: "mechanical-jump-booster-is", name: "Mechanical Jump Booster", aliases: ["Mechanical Jump Boosters", "Jump Booster"], tons: "jump-booster", slots: 2, availability: [{ from: 3083 }], prototypeYear: 3060, locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, amount: { unit: "Jumping MP", min: 1, step: 1 } },
      // Partial wing (p. 104): 7 percent of the 'Mech, four slots in each side torso
      { id: "partial-wing-is", name: "Partial Wing", aliases: ["Partial Wing (IS)", "Partial Wing ('Mech)"], tons: "partial-wing-is", slots: 4, availability: [{ from: 3074 }], locations: ["LT", "RT"], perMech: 2, splitWeight: true },
      // UMU (p. 107): placed and weighed as jump jets
      { id: "umu-is", name: "UMU", aliases: ["UMUs", "Underwater Maneuvering Unit"], tons: "jump-jet", slots: 1, availability: [{ from: 3066 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"], checked: "page" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, checked: "page", rulesLevel: "experimental" },
    items: [
      { id: "aes-arm-clan", name: "Actuator Enhancement System (Arm)", aliases: ["AES", "Actuator Enhancement System", "AES (Arm)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3108 }], prototypeYear: 3070, locations: ["LA", "RA"], locationsQuad: [] },
      { id: "aes-leg-clan", name: "Actuator Enhancement System (Leg)", aliases: ["AES (Leg)"], tons: "aes-tons", slots: "aes-slots", availability: [{ from: 3108 }], prototypeYear: 3070, locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4 },
      // Talons (p. 102): a ton for every 15 tons of the 'Mech in all, two slots in each leg
      { id: "talons-clan", name: "Talons", aliases: ["Talons [Clan]"], tons: "ceil-tons-15", slots: 2, availability: [{ from: 3087 }], prototypeYear: 3072, locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true },
      { id: "partial-wing-clan", name: "Partial Wing", aliases: ["Partial Wing (C)", "Partial Wing [Clan]", "Partial Wing (Clan)"], tons: "partial-wing-clan", slots: 3, availability: [{ from: 3085 }], prototypeYear: 3067, locations: ["LT", "RT"], perMech: 2, splitWeight: true },
      { id: "umu-clan", name: "UMU", aliases: ["UMUs", "Underwater Maneuvering Unit"], tons: "jump-jet", slots: 1, availability: [{ from: 3072 }], prototypeYear: 3061, locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 219 }, checked: "page", rulesLevel: "experimental" },
    items: [
      // Chameleon Light Polarization Shield (p. 112): six slots, one in each limb and each side torso, no weight
      { id: "chameleon-lps-is", name: "Chameleon Light Polarization Shield", aliases: ["Chameleon LPS", "Chameleon Light Polarization", "Chameleon Light Polarization Shield (LPS)"], tons: 0, slots: 1, availability: [{ from: 2630 }], perMech: 6, splitWeight: true, locations: ["LA", "RA", "LL", "RL", "LT", "RT"], locationsQuad: ["FLL", "FRL", "RLL", "RRL", "LT", "RT"] },
      // Null-Signature System (p. 148): seven slots, one in each location but the head
      { id: "null-signature-system-is", name: "Null-Signature System", aliases: ["Null Signature System"], tons: 0, slots: 1, availability: [{ from: 2630 }], prototypeYear: 2615, perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], cite: { book: TO, page: 221 } },
      // Void-Signature System (p. 161)
      { id: "void-signature-system-is", name: "Void-Signature System", aliases: ["Void Signature System", "Void Signature"], tons: 0, slots: 1, availability: [{ from: 3085 }], prototypeYear: 3070, perMech: 7, splitWeight: true, locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"], cite: { book: TO, page: 223 } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: TO, page: 217 }, checked: "page" },
    items: [
      // BattleMech HarJel (p. 100): a ton and a slot in any location but the cockpit's; the table's 1* for both is read as per mount
      { id: "harjel-is", name: "BattleMech HarJel", aliases: ["HarJel", "HarJel Repair", "HarJel Repair System", "HarJel Repair Systems", "BattleMech HarJel System"], tons: 1, slots: 1, availability: [{ from: 3115 }], prototypeYear: 3067, rulesLevel: "experimental", checked: "text", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
      // Cockpit Command Console (p. 112), Collapsible Command Module (p. 114), Full-Head Ejection System (p. 122), Aquatic Survival System (p. 137)
      { id: "cockpit-command-console-is", name: "Cockpit Command Console", aliases: ["Command Console"], tons: 3, slots: 1, availability: [{ from: 3030 }], rulesLevel: "advanced", locations: ["HD"], cite: { book: TO, page: 219 } },
      { id: "collapsible-command-module-is", name: "Collapsible Command Module", aliases: ["Collapsible Command Module (CCM)", "CCM"], tons: 16, slots: 12, availability: [{ from: 2710 }], prototypeYear: 2700, rulesLevel: "experimental", cite: { book: TO, page: 219 } },
      { id: "full-head-ejection-system-is", name: "Full-Head Ejection System", aliases: ["Full Head Ejection System", "Full-Head Ejection"], tons: 0, slots: 0, availability: [{ from: 3023 }], prototypeYear: 3020, rulesLevel: "advanced", locations: ["HD"], perMech: 1, cite: { book: TO, page: 219 } },
      { id: "aquatic-survival-system-is", name: "MechWarrior Aquatic Survival System", aliases: ["MASS", "Aquatic Survival System"], tons: 1.5, slots: 1, availability: [{ from: 3083 }], prototypeYear: 3048, rulesLevel: "experimental", locations: ["HD"], cite: { book: TO, page: 221 } },
      // Supercharger (p. 156): a tenth of the engine's weight, in a location with engine slots
      { id: "supercharger-is", name: "Supercharger", tons: "supercharger", slots: 1, availability: [{ from: 2200 }], rulesLevel: "experimental", locations: ["CT", "LT", "RT"], cite: { book: TO, page: 223 } },
      // Jump pack (p. 104): carried as cargo, of any weight to 20 tons
      { id: "jump-pack-is", name: "Jump Pack", aliases: ["Drop Pack", "Jump Pack / Drop Pack", "Jump/Drop Pack"], tons: "chosen-tons", slots: 0, availability: [{ from: 2457 }], prototypeYear: 2430, rulesLevel: "advanced", amount: { unit: "tons", min: 0.5, max: 20, step: 0.5 } },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: TO, page: 217 }, checked: "page" },
    items: [
      { id: "harjel-clan", name: "BattleMech HarJel", aliases: ["HarJel", "HarJel Repair", "HarJel Repair System", "HarJel Repair Systems", "BattleMech HarJel System"], tons: 1, slots: 1, availability: [{ from: 3115 }], prototypeYear: 3059, rulesLevel: "experimental", checked: "text", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
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
      { id: "compact-heat-sink-is", name: "Compact Heat Sink", aliases: ["Compact Heat Sinks", "2 Compact Heat Sinks"], techBase: "inner-sphere", slots: 1, availability: [{ from: 3079 }], prototypeYear: 3058, rulesLevel: "experimental" },
      { id: "laser-heat-sink-clan", name: "Laser Heat Sink", aliases: ["Laser Heat Sinks"], techBase: "clan", slots: 2, availability: [{ from: 3051 }], prototypeYear: 3040, rulesLevel: "advanced" },
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
      { id: "searchlight-is", name: "Searchlight", aliases: ["Searchlight (Mounted)", "Searchlight, Mounted", "Mounted Searchlight"], tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 170], availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "ejection-seat-is", name: "Ejection Seat", tons: 0.5, slots: 1, availability: [{ from: 2445 }], prototypeYear: 2430, locations: ["HD"], units: ["industrialmech", "vehicle"], by: { vehicle: { tons: 0.1, slots: 0, note: "Support vehicle" } } },
      { id: "extended-fuel-tank-is", name: "Extended Fuel Tank", aliases: ["Fuel Tank", "Extended Fuel Tanks"], tons: "fuel-tank-tons", slots: "fuel-tank-slots", availability: [{ from: 2300 }], locations: ["CT", "LT", "RT"], units: ["industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "communications-equipment-is", name: "Communications Equipment", aliases: ["CommsGear", "Comm. Equipment"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 1, max: 15, step: 1 }, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { vehicle: { slots: 1 }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "cargo-standard-is", name: "Cargo, Standard", aliases: ["Cargo", "Cargo Bay"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-liquid-is", name: "Cargo, Liquid", aliases: ["Liquid Storage", "Liquid Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-insulated-is", name: "Cargo, Insulated", aliases: ["Insulated Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      // Dumper (p. 243): 5 percent of the cargo it empties, so a formula that reads the cargo mount it is linked to; paramedic equipment (p. 233): a quarter ton; container bay (p. 239): one 10-ton container to a slot, IndustrialMechs only.
      { id: "dumper-is", name: "Dumper", tons: "dumper-tons", slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
      { id: "paramedic-equipment-is", name: "Paramedic Equipment", tons: 0.25, slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
      { id: "cargo-container-is", name: "Cargo Container", aliases: ["Cargo, Container"], tons: 10, slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      { id: "searchlight-clan", name: "Searchlight", aliases: ["Searchlight (Mounted)", "Searchlight, Mounted", "Mounted Searchlight"], tons: 0.5, slots: 1, heat: 0, range: [0, 0, 0, 170], availability: [{ from: 1950 }], units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "ejection-seat-clan", name: "Ejection Seat", tons: 0.5, slots: 1, availability: [{ from: 2445 }], locations: ["HD"], units: ["industrialmech", "vehicle"], by: { vehicle: { tons: 0.1, slots: 0, note: "Support vehicle" } } },
      { id: "extended-fuel-tank-clan", name: "Extended Fuel Tank", aliases: ["Fuel Tank", "Extended Fuel Tanks"], tons: "fuel-tank-tons", slots: "fuel-tank-slots", availability: [{ from: 2300 }], locations: ["CT", "LT", "RT"], units: ["industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "communications-equipment-clan", name: "Communications Equipment", aliases: ["CommsGear", "Comm. Equipment"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 1, max: 15, step: 1 }, units: ["mech", "industrialmech", "vehicle", "aero", "smallcraft", "dropship"], by: { vehicle: { slots: 1 }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 } } },
      { id: "cargo-standard-clan", name: "Cargo, Standard", aliases: ["Cargo", "Cargo Bay"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-liquid-clan", name: "Cargo, Liquid", aliases: ["Liquid Storage", "Liquid Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      { id: "cargo-insulated-clan", name: "Cargo, Insulated", aliases: ["Insulated Cargo"], tons: "chosen-tons", slots: "ceil-amount", availability: [{ from: 1950 }], amount: { unit: "tons", min: 0.5, step: 0.5 }, units: ["mech", "industrialmech", "vehicle"], by: { vehicle: { slots: 1 } } },
      // Dumper (p. 243): 5 percent of the cargo it empties, so a formula that reads the cargo mount it is linked to; paramedic equipment (p. 233): a quarter ton; container bay (p. 239): one 10-ton container to a slot, IndustrialMechs only.
      { id: "dumper-clan", name: "Dumper", tons: "dumper-tons", slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
      { id: "paramedic-equipment-clan", name: "Paramedic Equipment", tons: 0.25, slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
      { id: "cargo-container-clan", name: "Cargo Container", aliases: ["Cargo, Container"], tons: 10, slots: 1, availability: [{ from: 1950 }], units: ["industrialmech", "vehicle"] },
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
      { id: "radical-heat-sink-is", name: "Radical Heat Sink System", aliases: ["Radical Heat Sink"], tons: 4, slots: 3, availability: [{ from: 3122 }], prototypeYear: 3115, rulesLevel: "advanced", locations: ["CT", "LT", "RT"], units: ["mech", "industrialmech", "aero"] },
      { id: "super-cooled-myomer-is", name: "Super-Cooled Myomer", aliases: ["RISC Super-Cooled Myomer"], tons: 0, slots: 1, availability: [{ from: 3132 }], rulesLevel: "experimental", perMech: 6, splitWeight: true, locations: ["LA", "RA", "LL", "RL", "LT", "RT"], locationsQuad: ["FLL", "FRL", "RLL", "RRL", "LT", "RT"] },
      { id: "risc-heat-sink-override-kit-is", name: "RISC Heat Sink Override Kit", aliases: ["Heat Sink Override Kit"], tons: 0, slots: 0, availability: [{ from: 3134 }], rulesLevel: "experimental" },
      { id: "risc-laser-pulse-module-is", name: "RISC Laser Pulse Module", aliases: ["RISC Laser Module", "Laser Pulse Module"], tons: 1, slots: 1, availability: [{ from: 3137 }], rulesLevel: "experimental", needs: "laser", units: ["mech", "industrialmech", "vehicle", "protomech", "aero", "smallcraft", "dropship", "ship", "building"], by: { vehicle: { slots: 0, note: "Support vehicle: +1* slots" }, protomech: { slots: 0 }, aero: { slots: 0 }, smallcraft: { slots: 0 }, dropship: { slots: 0 }, ship: { slots: 0 }, building: { slots: 0 } } },
      { id: "remote-drone-command-console-is", name: "Remote Drone Command Console", aliases: ["Remote Drone"], tons: 2, slots: 1, availability: [{ from: 3140 }], prototypeYear: 3125, rulesLevel: "experimental", units: ["mech", "industrialmech", "aero"] },
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
      { id: "tracks-is", name: "Tracks", aliases: ["Track"], tons: "tenth-tons", slots: 1, availability: [{ from: 2440 }], prototypeYear: 2430, locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, units: ["mech", "industrialmech"] },
      { id: "environmental-sealing-is", name: "Environmental Sealing", aliases: ["Environmental Sealing (IndustrialMech)"], tons: "ceil-tenth-tons", slots: 1, availability: [{ from: 1950 }], perMech: 8, splitWeight: true, units: ["industrialmech"] },
    ],
  },
  {
    // Weight and slots by a rule (TechManual pp. 213 and 249, tables pp. 344-345; dates pp. 213 and 249): tracks weigh a tenth of the 'Mech, one slot in
    // each leg; environmental sealing is a tenth of the IndustrialMech, one slot in each body location. The cost tables print no price for either.
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      { id: "tracks-clan", name: "Tracks", aliases: ["Track"], tons: "tenth-tons", slots: 1, availability: [{ from: 2440 }], locations: ["LL", "RL"], locationsQuad: ["FLL", "FRL", "RLL", "RRL"], perMech: 2, perMechQuad: 4, splitWeight: true, units: ["mech", "industrialmech"] },
      { id: "environmental-sealing-clan", name: "Environmental Sealing", aliases: ["Environmental Sealing (IndustrialMech)"], tons: "ceil-tenth-tons", slots: 1, availability: [{ from: 1950 }], perMech: 8, splitWeight: true, units: ["industrialmech"] },
    ],
  },
  {
    // HarJel II and III (Interstellar Operations: Alternate Eras, Dark Age Equipment table printed p. 215, tech base and date read on the
    // page image at higher resolution; rules pp. 82-83, Advanced): one in a location, the same type throughout the unit, BattleMechs only.
    // The table's weights (2 and 3 tons) carry an asterisk; each mount is read as that weight and the slots the table prints.
    defaults: { kind: "other", techBase: "clan", cite: { book: IO, page: 215 }, checked: "page", rulesLevel: "advanced", locations: ["CT", "LT", "RT", "LA", "RA", "LL", "RL"], locationsQuad: ["CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"] },
    items: [
      { id: "harjel-ii-clan", name: "HarJel II Self-Repair System", aliases: ["HarJel II"], tons: 2, slots: 1, availability: [{ from: 3136 }], prototypeYear: 3120 },
      { id: "harjel-iii-clan", name: "HarJel III Self-Repair System", aliases: ["HarJel III", "HarJel Repair Systems (HarJel III)"], tons: 3, slots: 2, availability: [{ from: 3139 }], prototypeYear: 3137 },
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
      { id: "ba-david-light-gauss-rifle-is", name: "David Light Gauss Rifle (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 3063 }], prototypeYear: 3058, kind: "weapon", damage: "1", range: [0, 3, 5, 8], cite: { book: "TechManual", page: 346 } },
      { id: "ba-king-david-light-gauss-rifle-is", name: "King David Light Gauss Rifle (Battle Armor)", tons: 0.275, slots: 2, availability: [{ from: 3063 }], prototypeYear: 3058, kind: "weapon", damage: "1", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-magshot-gauss-rifle-is", name: "Magshot Gauss Rifle (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 3059 }], prototypeYear: 3057, kind: "weapon", damage: "2", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-grand-mauler-gauss-rifle-is", name: "Grand Mauler Gauss Rifle (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3059 }], prototypeYear: 3055, kind: "weapon", damage: "Special", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-tsunami-gauss-rifle-is", name: "Tsunami Gauss Rifle (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3056 }], prototypeYear: 3054, kind: "weapon", damage: "1", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-micro-grenade-launcher-is", name: "Micro Grenade Launcher (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 2200 }], kind: "weapon", damage: "1", range: [0, 1, 2, 0], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-grenade-launcher-is", name: "Heavy Grenade Launcher (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "1", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-machine-gun-is", name: "Light Machine Gun (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 3068 }], kind: "weapon", damage: "1", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-machine-gun-is", name: "Machine Gun (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-machine-gun-is", name: "Heavy Machine Gun (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3068 }], kind: "weapon", damage: "3", range: [0, 1, 2, 0], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-mortar-is", name: "Light Mortar (Battle Armor)", tons: 0.3, slots: 2, availability: [{ from: 3057 }], prototypeYear: 3054, kind: "weapon", damage: "3", range: [1, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-mortar-is", name: "Heavy Mortar (Battle Armor)", tons: 0.4, slots: 2, availability: [{ from: 3057 }], prototypeYear: 3054, kind: "weapon", damage: "3", range: [2, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-light-recoilless-rifle-is", name: "Light Recoilless Rifle (Battle Armor)", tons: 0.175, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "2", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-recoilless-rifle-is", name: "Medium Recoilless Rifle (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 346 } },
      { id: "ba-heavy-recoilless-rifle-is", name: "Heavy Recoilless Rifle (Battle Armor)", tons: 0.325, slots: 3, availability: [{ from: 1950 }], kind: "weapon", damage: "3", range: [0, 3, 5, 7], cite: { book: "TechManual", page: 346 } },
      { id: "ba-flamer-is", name: "Flamer (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-er-small-laser-is", name: "ER Small Laser (Battle Armor)", tons: 0.35, slots: 2, availability: [{ from: 3058 }], prototypeYear: 3055, kind: "weapon", damage: "3", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 346 } },
      { id: "ba-er-medium-laser-is", name: "ER Medium Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 3058 }], prototypeYear: 3055, kind: "weapon", damage: "5", range: [0, 4, 8, 12], cite: { book: "TechManual", page: 346 } },
      { id: "ba-small-laser-is", name: "Small Laser (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 2300 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-laser-is", name: "Medium Laser (Battle Armor)", tons: 0.5, slots: 3, availability: [{ from: 2300 }], kind: "weapon", damage: "5", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 346 } },
      { id: "ba-small-pulse-laser-is", name: "Small Pulse Laser (Battle Armor)", tons: 0.4, slots: 1, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "3", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 346 } },
      { id: "ba-medium-pulse-laser-is", name: "Medium Pulse Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2609, to: 2950 }, { from: 3037 }], kind: "weapon", damage: "6", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 347 } },
      { id: "ba-support-ppc-is", name: "Support PPC (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 2436 }], kind: "weapon", damage: "2", range: [0, 2, 5, 7], cite: { book: "TechManual", page: 347 } },
      { id: "ba-man-portable-plasma-rifle-is", name: "Man-Portable Plasma Rifle (Battle Armor)", tons: 0.3, slots: 2, availability: [{ from: 3065 }], prototypeYear: 3063, kind: "weapon", damage: "2", range: [0, 2, 4, 6], cite: { book: "TechManual", page: 347 } },
      { id: "ba-firedrake-support-needler-is", name: "Firedrake Support Needler (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 3061 }], prototypeYear: 3058, kind: "weapon", damage: "1", range: [0, 1, 2, 3], cite: { book: "TechManual", page: 347 } },
      { id: "ba-compact-narc-is", name: "Compact Narc (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3060 }], kind: "weapon", damage: "0", range: [0, 2, 4, 5], cite: { book: "TechManual", page: 347 } },
      { id: "ba-pop-up-mine-is", name: "Pop-Up Mine (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "4", range: [0, 0, 0, 0], cite: { book: "TechManual", page: 347 } },
      { id: "ba-active-probe-is", name: "Active Probe (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 3050 }], kind: "other", range: [0, 0, 0, 4], cite: { book: "TechManual", page: 347 } },
      { id: "ba-camo-system-is", name: "Camo System (Battle Armor)", tons: 0.2, slots: 2, availability: [{ from: 2800 }], prototypeYear: 2790, kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-cutting-torch-is", name: "Cutting Torch (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 1950 }], kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-ecm-suite-is", name: "ECM Suite (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 2720, to: 2788 }, { from: 3057 }], prototypeYear: 2718, kind: "other", range: [0, 0, 0, 0], cite: { book: "TechManual", page: 347 } },
      { id: "ba-extended-life-support-is", name: "Extended Life Support (Battle Armor)", tons: 0.025, slots: 1, availability: [{ from: 2715 }], prototypeYear: 2712, kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-fuel-tank-is", name: "Fuel Tank (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 2744, to: 2781 }, { from: 3051 }], prototypeYear: 2740, kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-heat-sensor-is", name: "Heat Sensor (Battle Armor)", tons: 0.02, slots: 1, availability: [{ from: 3050 }], kind: "other", range: [0, 9, 18, 27], cite: { book: "TechManual", page: 347 } },
      { id: "ba-improved-sensors-is", name: "Improved Sensors (Battle Armor)", tons: 0.065, slots: 1, availability: [{ from: 3051 }], kind: "other", range: [0, 0, 0, 2], cite: { book: "TechManual", page: 347 } },
      { id: "ba-jump-booster-is", name: "Jump Booster (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3051 }], prototypeYear: 3050, kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-laser-microphone-is", name: "Laser Microphone (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 2200 }], kind: "other", range: [0, 0, 0, 34], cite: { book: "TechManual", page: 347 } },
      { id: "ba-magnetic-clamps-is", name: "Magnetic Clamps (Battle Armor)", tons: 0.03, slots: 2, availability: [{ from: 3062 }], prototypeYear: 3057, kind: "other", cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-1-is", name: "LRM 1 (Battle Armor)", tons: 0.06, slots: 2, availability: [{ from: 3057 }], prototypeYear: 3055, kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-2-is", name: "LRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3057 }], prototypeYear: 3055, kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-3-is", name: "LRM 3 (Battle Armor)", tons: 0.18, slots: 3, availability: [{ from: 3057 }], prototypeYear: 3055, kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-4-is", name: "LRM 4 (Battle Armor)", tons: 0.24, slots: 3, availability: [{ from: 3057 }], prototypeYear: 3055, kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-lrm-5-is", name: "LRM 5 (Battle Armor)", tons: 0.3, slots: 4, availability: [{ from: 3057 }], prototypeYear: 3055, kind: "weapon", damage: "1/Msl", range: [6, 7, 14, 21], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-1-is", name: "SRM 1 (Battle Armor)", tons: 0.06, slots: 1, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-2-is", name: "SRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-3-is", name: "SRM 3 (Battle Armor)", tons: 0.18, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-4-is", name: "SRM 4 (Battle Armor)", tons: 0.24, slots: 2, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-5-is", name: "SRM 5 (Battle Armor)", tons: 0.3, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-srm-6-is", name: "SRM 6 (Battle Armor)", tons: 0.36, slots: 3, availability: [{ from: 3050 }], kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-1-is", name: "MRM 1 (Battle Armor)", tons: 0.06, slots: 1, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-2-is", name: "MRM 2 (Battle Armor)", tons: 0.12, slots: 2, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-3-is", name: "MRM 3 (Battle Armor)", tons: 0.18, slots: 2, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-4-is", name: "MRM 4 (Battle Armor)", tons: 0.24, slots: 3, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
      { id: "ba-mrm-5-is", name: "MRM 5 (Battle Armor)", tons: 0.3, slots: 3, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 3, 8, 15], cite: { book: "TechManual", page: 347 } },
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
      { id: "ba-ap-gauss-rifle-clan", name: "AP Gauss Rifle (Battle Armor)", tons: 0.2, slots: 2, availability: [{ from: 3069 }], prototypeYear: 3066, kind: "weapon", damage: "3", range: [0, 3, 6, 9] },
      { id: "ba-heavy-grenade-launcher-clan", name: "Heavy Grenade Launcher (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 2900 }], prototypeYear: 2880, kind: "weapon", damage: "1", range: [0, 1, 2, 3] },
      { id: "ba-light-machine-gun-clan", name: "Light Machine Gun (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 3060 }], prototypeYear: 3055, kind: "weapon", damage: "1", range: [0, 2, 4, 6] },
      { id: "ba-machine-gun-clan", name: "Machine Gun (Battle Armor)", tons: 0.1, slots: 1, availability: [{ from: 2868 }], kind: "weapon", damage: "2", range: [0, 1, 2, 3], yearsInferred: false },
      { id: "ba-heavy-machine-gun-clan", name: "Heavy Machine Gun (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3059 }], prototypeYear: 3055, kind: "weapon", damage: "3", range: [0, 1, 2, 0] },
      { id: "ba-bearhunter-superheavy-ac-clan", name: "Bearhunter Superheavy AC (Battle Armor)", tons: 0.15, slots: 2, availability: [{ from: 3062 }], prototypeYear: 3060, kind: "weapon", damage: "3", range: [0, 0, 1, 2] },
      { id: "ba-light-recoilless-rifle-clan", name: "Light Recoilless Rifle (Battle Armor)", tons: 0.175, slots: 2, availability: [{ from: 3062 }], kind: "weapon", damage: "2", range: [0, 2, 4, 6], yearsInferred: false },
      { id: "ba-medium-recoilless-rifle-clan", name: "Medium Recoilless Rifle (Battle Armor)", tons: 0.25, slots: 2, availability: [{ from: 3062 }], kind: "weapon", damage: "3", range: [0, 2, 4, 6], yearsInferred: false },
      { id: "ba-heavy-recoilless-rifle-clan", name: "Heavy Recoilless Rifle (Battle Armor)", tons: 0.325, slots: 3, availability: [{ from: 3062 }], kind: "weapon", damage: "3", range: [0, 3, 5, 7], yearsInferred: false },
      { id: "ba-flamer-clan", name: "Flamer (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2", range: [0, 1, 2, 3] },
      { id: "ba-er-micro-laser-clan", name: "ER Micro Laser (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 3059 }], prototypeYear: 3055, kind: "weapon", damage: "2", range: [0, 1, 2, 4] },
      { id: "ba-er-small-laser-clan", name: "ER Small Laser (Battle Armor)", tons: 0.35, slots: 2, availability: [{ from: 2825 }], kind: "weapon", damage: "5", range: [0, 2, 4, 6] },
      { id: "ba-er-medium-laser-clan", name: "ER Medium Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2824 }], kind: "weapon", damage: "7", range: [0, 5, 10, 15] },
      { id: "ba-small-laser-clan", name: "Small Laser (Battle Armor)", tons: 0.2, slots: 1, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "3", range: [0, 1, 2, 3], yearsInferred: false },
      { id: "ba-micro-pulse-laser-clan", name: "Micro Pulse Laser (Battle Armor)", tons: 0.16, slots: 1, availability: [{ from: 3060 }], prototypeYear: 3055, kind: "weapon", damage: "3", range: [0, 1, 2, 3] },
      { id: "ba-small-pulse-laser-clan", name: "Small Pulse Laser (Battle Armor)", tons: 0.4, slots: 1, availability: [{ from: 2872, to: 2950 }, { from: 3037 }], prototypeYear: 2870, kind: "weapon", damage: "3", range: [0, 2, 4, 6], yearsInferred: false },
      { id: "ba-medium-pulse-laser-clan", name: "Medium Pulse Laser (Battle Armor)", tons: 0.8, slots: 3, availability: [{ from: 2872, to: 2950 }, { from: 3037 }], prototypeYear: 2870, kind: "weapon", damage: "7", range: [0, 4, 8, 12], yearsInferred: false },
      { id: "ba-heavy-small-laser-clan", name: "Heavy Small Laser (Battle Armor)", tons: 0.5, slots: 3, availability: [{ from: 3059 }], prototypeYear: 3057, kind: "weapon", damage: "6", range: [0, 1, 2, 3] },
      { id: "ba-heavy-medium-laser-clan", name: "Heavy Medium Laser (Battle Armor)", tons: 1.0, slots: 4, availability: [{ from: 3059 }], prototypeYear: 3057, kind: "weapon", damage: "10", range: [0, 3, 6, 9] },
      { id: "ba-support-ppc-clan", name: "Support PPC (Battle Armor)", tons: 0.24, slots: 2, availability: [{ from: 2950 }], kind: "weapon", damage: "2", range: [0, 2, 5, 7], yearsInferred: false },
      { id: "ba-compact-narc-clan", name: "Compact Narc (Battle Armor)", tons: 0.15, slots: 1, availability: [{ from: 2875 }], prototypeYear: 2870, kind: "weapon", damage: "0", range: [0, 2, 4, 5] },
      { id: "ba-bomb-rack-clan", name: "Bomb Rack (Battle Armor)", tons: 0.1, slots: 2, availability: [{ from: 3060 }], prototypeYear: 3055, kind: "weapon", damage: "2", range: [0, 0, 0, 0] },
      { id: "ba-active-probe-clan", name: "Active Probe (Battle Armor)", tons: 0.15, slots: 2, availability: [{ from: 2900 }], prototypeYear: 2898, kind: "other", range: [0, 0, 0, 5] },
      { id: "ba-cutting-torch-clan", name: "Cutting Torch (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 1950 }], kind: "other", yearsInferred: true },
      { id: "ba-ecm-suite-clan", name: "ECM Suite (Battle Armor)", tons: 0.075, slots: 1, availability: [{ from: 2720, to: 2788 }, { from: 3057 }], kind: "other", range: [0, 0, 0, 0], yearsInferred: true },
      { id: "ba-extended-life-support-clan", name: "Extended Life Support (Battle Armor)", tons: 0.025, slots: 1, availability: [{ from: 2715 }], kind: "other", yearsInferred: true },
      { id: "ba-fuel-tank-clan", name: "Fuel Tank (Battle Armor)", tons: 0.05, slots: 1, availability: [{ from: 2744, to: 2781 }, { from: 3051 }], kind: "other", yearsInferred: true },
      { id: "ba-heat-sensor-clan", name: "Heat Sensor (Battle Armor)", tons: 0.02, slots: 1, availability: [{ from: 2880 }], prototypeYear: 2879, kind: "other", range: [0, 11, 23, 34] },
      { id: "ba-improved-sensors-clan", name: "Improved Sensors (Battle Armor)", tons: 0.045, slots: 1, availability: [{ from: 2890 }], prototypeYear: 2887, kind: "other", range: [0, 0, 0, 3] },
      { id: "ba-jump-booster-clan", name: "Jump Booster (Battle Armor)", tons: 0.125, slots: 2, availability: [{ from: 3062 }], kind: "other" },
      { id: "ba-laser-microphone-clan", name: "Laser Microphone (Battle Armor)", tons: 0.005, slots: 1, availability: [{ from: 2200 }], kind: "other", range: [0, 0, 0, 34], yearsInferred: true },
      { id: "ba-lrm-1-clan", name: "LRM 1 (Battle Armor)", tons: 0.035, slots: 2, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-2-clan", name: "LRM 2 (Battle Armor)", tons: 0.07, slots: 2, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-3-clan", name: "LRM 3 (Battle Armor)", tons: 0.105, slots: 3, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-4-clan", name: "LRM 4 (Battle Armor)", tons: 0.14, slots: 3, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-lrm-5-clan", name: "LRM 5 (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 3060 }], prototypeYear: 3058, kind: "weapon", damage: "1/Msl", range: [0, 7, 14, 21] },
      { id: "ba-srm-1-clan", name: "SRM 1 (Battle Armor)", tons: 0.035, slots: 1, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-2-clan", name: "SRM 2 (Battle Armor)", tons: 0.07, slots: 2, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-3-clan", name: "SRM 3 (Battle Armor)", tons: 0.105, slots: 2, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-4-clan", name: "SRM 4 (Battle Armor)", tons: 0.14, slots: 2, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-5-clan", name: "SRM 5 (Battle Armor)", tons: 0.175, slots: 3, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-srm-6-clan", name: "SRM 6 (Battle Armor)", tons: 0.21, slots: 3, availability: [{ from: 2868 }], prototypeYear: 2865, kind: "weapon", damage: "2/Msl", range: [0, 3, 6, 9] },
      { id: "ba-advanced-srm-1-clan", name: "Advanced SRM 1 (Battle Armor)", tons: 0.06, slots: 2, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-2-clan", name: "Advanced SRM 2 (Battle Armor)", tons: 0.09, slots: 2, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-3-clan", name: "Advanced SRM 3 (Battle Armor)", tons: 0.12, slots: 3, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-4-clan", name: "Advanced SRM 4 (Battle Armor)", tons: 0.15, slots: 3, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-5-clan", name: "Advanced SRM 5 (Battle Armor)", tons: 0.18, slots: 4, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
      { id: "ba-advanced-srm-6-clan", name: "Advanced SRM 6 (Battle Armor)", tons: 0.21, slots: 4, availability: [{ from: 3056 }], prototypeYear: 3052, kind: "weapon", damage: "2/Msl", range: [0, 4, 8, 12] },
    ],
  },
  // Conventional infantry weapons (TechManual, Conventional Infantry Weapons Table printed pp. 349-352, read against the page images;
  // costs and dates pp. 298-301). One row per weapon and tech base (the table's "IS / Clan" is two rows, as elsewhere), `units: ["infantry"]`,
  // so no BattleMech picker offers them. `tons` is the weapon's own weight (kg / 1000; the book says it does not enter platoon construction but is
  // there for support vehicle and battle armor design) and `slots` is 0. The book's infantry figures are per trooper and have no heat, damage text or
  // range bands, so they sit in `infantry`: the damage each trooper delivers, the Base Range (platoon range modifiers come from it, p. 149), the class
  // and mode, the damage type letter with its flag letters (A anti-air, B burst-fire, F flame, N non-penetrating), ammunition clip weight and shots
  // (the table's text: "15/5" is shots and bursts, "1-D" is single-use), crew (the table's Crew Value, kept as printed: the "1E" values add +1 to hit at range 0, see the Crew rule in the infantry weapons section), and the clip
  // price (the table's second cost: "cells" for its asterisk, "single-use" for its double asterisk). The Inferno damage of the weapons the book
  // prints a second line for is `inferno`. The price of the weapon itself is in data/cost.ts.
  // Years: "PS" is 1950 and "ES" 2200, as everywhere. A Clan row whose Clan introduction prints a dash takes the Inner Sphere year, marked
  // inferred. An extinction year the table prints in the second (Clan) slot for an Inner Sphere-only weapon (the vibro-katana, vibro-sword, Mauser
  // 960 laser rifle, Makeshift pistol, IS pulse laser pistol and rifle) is read as that weapon's extinction year.
  // Not added, because the cost and availability table prints no line for them: Club (Vibro-Mace), the five Thrown weapons, and the two Pequod
  // harpoon guns. The Blade (Shuriken) of the cost table is not the Thrown (Shuriken) of the stats table by the book's own names, so neither is a row.
  {
    defaults: { techBase: "inner-sphere", cite: { book: "TechManual", page: 349 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-bow-compound-is", name: "Bow (Compound)", tons: 0.001, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-daikyu-is", name: "Bow (Daikyu)", tons: 0.001, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-longbow-is", name: "Bow (Longbow)", tons: 0.0015, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-shortbow-is", name: "Bow (Shortbow)", tons: 0.0008, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-bow-hankyu-is", name: "Bow (Hankyu)", tons: 0.0008, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-club-blackjack-sap-is", name: "Club (Blackjack/Sap)", tons: 0.001, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-club-club-improvised-is", name: "Club (Club/Improvised)", tons: 0.002, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-crossbow-basic-is", name: "Crossbow (Basic)", tons: 0.002, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.05, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-crossbow-heavy-is", name: "Crossbow (Heavy)", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.02, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-blade-axe-is", name: "Blade (Axe)", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.11, shots: "NA", crew: "1" } },
      { id: "inf-blade-bokken-is", name: "Blade (Bokken)", tons: 0.002, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-dao-is", name: "Blade (Dao)", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-carbon-reinforced-nails-is", name: "Blade (Carbon-Reinforced Nails)", tons: 0, availability: [{ from: 2990 }], infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-blade-hatchet-tomahawk-is", name: "Blade (Hatchet/Tomahawk)", tons: 0.001, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-katana-scimitar-is", name: "Blade (Katana/Scimitar)", tons: 0.0025, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.07, shots: "NA", crew: "1" } },
      { id: "inf-blade-knife-dagger-bayonet-is", name: "Blade (Knife/Dagger/Bayonet)", tons: 0.00025, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-blade-no-dachi-is", name: "Blade (No-Dachi)", tons: 0.0045, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-blade-sword-is", name: "Blade (Sword)", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.07, shots: "NA", crew: "1" } },
      { id: "inf-blade-wakizashi-is", name: "Blade (Wakizashi)", tons: 0.0002, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-blade-vibro-axe-is", name: "Blade (Vibro-axe)", tons: 0.005, availability: [{ from: 2445 }], infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.42, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-blade-vibro-blade-is", name: "Blade (Vibro-blade)", tons: 0.00035, availability: [{ from: 2400 }], infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.21, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-blade-vibro-katana-is", name: "Blade (Vibro-katana)", tons: 0.003, availability: [{ from: 2450, to: 2850 }], infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.32, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-blade-vibro-sword-is-is", name: "Blade (Vibro-sword, IS)", tons: 0.004, availability: [{ from: 2440, to: 2850 }], infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.32, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-nunchaku-is", name: "Nunchaku", tons: 0.0015, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-staff-is", name: "Staff", tons: 0.0025, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-staff-pole-arm-is", name: "Staff (Pole Arm)", tons: 0.006, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-staff-stun-staff-single-end-is", name: "Staff (Stun Staff, Single-End)", tons: 0.003, availability: [{ from: 2150 }], infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-staff-stun-staff-double-end-is", name: "Staff (Stun Staff, Double-End)", tons: 0.003, availability: [{ from: 2155 }], infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-stunstick-is", name: "Stunstick", tons: 0.0002, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.25, shots: "20", crew: "1", clip: "cells" } },
      { id: "inf-stunstick-mini-is", name: "Stunstick (Mini)", tons: 0.00015, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-whip-is", name: "Whip", tons: 0.00035, availability: [{ from: 1950 }], infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-whip-monowire-is", name: "Whip (Monowire)", tons: 0.00025, availability: [{ from: 2200 }], infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.35, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-whip-neural-lash-is", name: "Whip (Neural Lash)", tons: 0.0001, availability: [{ from: 2200 }], infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.09, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-whip-neural-whip-is", name: "Whip (Neural Whip)", tons: 0.0003, availability: [{ from: 2215, to: 2786 }], infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.09, ammoKg: 0.25, shots: "20", crew: "1", clip: "cells" } },
      { id: "inf-auto-pistol-is", name: "Auto-Pistol", tons: 0.0005, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.14, shots: "10", crew: "1", clip: 2 } },
      { id: "inf-auto-pistol-hawk-eagle-is", name: "Auto-Pistol (Hawk Eagle)", tons: 0.0005, availability: [{ from: 3035 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.27, ammoKg: 0.11, shots: "15/5", crew: "1", clip: 10 } },
      { id: "inf-auto-pistol-magnum-is", name: "Auto-Pistol (Magnum)", tons: 0.0005, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.14, shots: "8", crew: "1", clip: 4 } },
      { id: "inf-auto-pistol-m-g-is", name: "Auto-Pistol (M&G)", tons: 0.00065, availability: [{ from: 2495 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.17, ammoKg: 0.11, shots: "8", crew: "1", clip: 3 } },
      { id: "inf-auto-pistol-nambu-is", name: "Auto-Pistol (Nambu)", tons: 0.00045, availability: [{ from: 2540 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.16, shots: "12", crew: "1", clip: 2 } },
      { id: "inf-auto-pistol-serrek-7875d-is", name: "Auto-Pistol (Serrek 7875D)", tons: 0.0004, availability: [{ from: 2810 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.16, ammoKg: 0.16, shots: "16", crew: "1", clip: 3 } },
      { id: "inf-auto-pistol-sternsnacht-python-is", name: "Auto-Pistol (Sternsnacht Python)", tons: 0.00075, availability: [{ from: 3051 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.28, ammoKg: 0.16, shots: "12", crew: "1", clip: 4 } },
      { id: "inf-dart-gun-is", name: "Dart Gun", tons: 0.00065, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.01, ammoKg: 0.01, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-flare-pistol-is", name: "Flare Pistol", tons: 0.0004, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "E", baseRange: 0, damage: 0.09, ammoKg: 0.02, shots: "5", crew: "1", clip: 2 } },
      { id: "inf-gauss-pistol-hold-out-mandrake-is", name: "Gauss Pistol (Hold-Out [Mandrake])", tons: 0.0001, availability: [{ from: 3052 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.02, ammoKg: 0.01, shots: "1", crew: "1", clip: "single-use" } },
      { id: "inf-gyrojet-pistol-is", name: "Gyrojet Pistol", tons: 0.0025, availability: [{ from: 2625 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.04, ammoKg: 0.18, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-gyrojet-pistol-coventry-handrocket-is", name: "Gyrojet Pistol (Coventry Handrocket)", tons: 0.0031, availability: [{ from: 3055 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.14, ammoKg: 0.24, shots: "5", crew: "1", clip: 3 } },
      { id: "inf-gyrojet-pistol-hold-out-is", name: "Gyrojet Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2630 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.04, ammoKg: 0.02, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-laser-pistol-is", name: "Laser Pistol", tons: 0.001, availability: [{ from: 2210 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.21, ammoKg: 0.3, shots: "16", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-blazer-is", name: "Laser Pistol (Blazer)", tons: 0.002, availability: [{ from: 2295 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.26, ammoKg: 0.3, shots: "8", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-hold-out-is", name: "Laser Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2320 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.14, ammoKg: 0.02, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-hold-out-white-dwarf-is", name: "Laser Pistol (Hold-Out [White Dwarf])", tons: 0.00025, availability: [{ from: 3058 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.02, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-laser-pistol-nakjima-is", name: "Laser Pistol (Nakjima)", tons: 0.001, availability: [{ from: 2880 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.18, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-sunbeam-is", name: "Laser Pistol (Sunbeam)", tons: 0.001, availability: [{ from: 3020 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.28, ammoKg: 0.3, shots: "7", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-sunbeam-nova-is", name: "Laser Pistol (Sunbeam Nova)", tons: 0.0015, availability: [{ from: 3053 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.26, ammoKg: 0.3, shots: "3", crew: "1", clip: "cells" } },
      { id: "inf-needler-pistol-is", name: "Needler Pistol", tons: 0.0003, availability: [{ from: 1950 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.23, ammoKg: 0.07, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-needler-pistol-hold-out-is", name: "Needler Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2515 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.03, shots: "5", crew: "1", clip: "single-use" } },
      { id: "inf-needler-pistol-m-g-flechette-is", name: "Needler Pistol (M&G Flechette)", tons: 0.0005, availability: [{ from: 2360 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.17, shots: "15/3", crew: "1", clip: 4 } },
      { id: "inf-needler-pistol-sea-eagle-is", name: "Needler Pistol (Sea Eagle)", tons: 0.00035, availability: [{ from: 3035 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.1, shots: "10/2", crew: "1", clip: 5 } },
    ],
  },
  {
    defaults: { techBase: "inner-sphere", cite: { book: "TechManual", page: 350 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-paint-gun-lgb-46r-is", name: "Paint Gun (LGB-46R)", tons: 0.0018, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0, ammoKg: 0.64, shots: "15", crew: "1", clip: 10 } },
      { id: "inf-pistol-flamer-is", name: "Pistol (Flamer)", tons: 0.0012, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.34, ammoKg: 0.8, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-pistol-hold-out-is", name: "Pistol (Hold-Out)", tons: 0.0002, availability: [{ from: 1950 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.02, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-pistol-makeshift-is", name: "Pistol (Makeshift)", tons: 0.001, availability: [{ from: 1950, to: 2800 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.02, ammoKg: 0.01, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-pistol-tk-enforcer-semi-automatic-is", name: "Pistol (TK Enforcer Semi-Automatic)", tons: 0.0016, availability: [{ from: 3058 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.2, ammoKg: 0.2, shots: "20/5", crew: "1", clip: 3 } },
      { id: "inf-pistol-spitball-gas-weapon-is", name: "Pistol (Spitball Gas Weapon)", tons: 0.001, availability: [{ from: 3059 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0, ammoKg: 0.04, shots: "25", crew: "1", clip: 2 } },
      { id: "inf-pistol-sternsnacht-heavy-claymore-is", name: "Pistol (Sternsnacht Heavy [Claymore])", tons: 0.0025, availability: [{ from: 2885 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.09, ammoKg: 0.09, shots: "3", crew: "1", clip: 1 } },
      { id: "inf-pulse-laser-pistol-is-is", name: "Pulse Laser Pistol (IS)", tons: 0.001, availability: [{ from: 2620, to: 2845 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.14, ammoKg: 0.3, shots: "15/3", crew: "1", clip: "cells" } },
      { id: "inf-revolver-is", name: "Revolver", tons: 0.0005, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.17, ammoKg: 0.06, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-revolver-magnum-is", name: "Revolver (Magnum)", tons: 0.0005, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.18, ammoKg: 0.06, shots: "5", crew: "1", clip: 3 } },
      { id: "inf-sonic-stunner-is", name: "Sonic Stunner", tons: 0.0006, availability: [{ from: 2375 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-tranq-gun-is", name: "Tranq Gun", tons: 0.0015, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.14, ammoKg: 0.04, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-auto-rifle-is", name: "Auto-Rifle", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.52, ammoKg: 0.48, shots: "30/2", crew: "1", clip: 2 } },
      { id: "inf-elephant-gun-is", name: "Elephant Gun", tons: 0.005, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.11, ammoKg: 0.04, shots: "2", crew: "1", clip: 2 } },
      { id: "inf-gauss-rifle-thunderstroke-is", name: "Gauss Rifle (Thunderstroke)", tons: 0.007, availability: [{ from: 3058 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.26, ammoKg: 0.33, shots: "5", crew: "1E", clip: 3 } },
      { id: "inf-gauss-rifle-thunderstroke-ii-is", name: "Gauss Rifle (Thunderstroke II)", tons: 0.0065, availability: [{ from: 3062 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.53, ammoKg: 0.42, shots: "20", crew: "1", clip: 10 } },
      { id: "inf-gyroslug-carbine-is", name: "Gyroslug Carbine", tons: 0.004, availability: [{ from: 2580 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.28, ammoKg: 1.84, shots: "20", crew: "1", clip: 5 } },
      { id: "inf-gyroslug-carbine-star-king-is", name: "Gyroslug Carbine (Star King)", tons: 0.0052, availability: [{ from: 2789, to: 2925 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 2.3, shots: "20", crew: "1", clip: 15 } },
      { id: "inf-gyroslug-rifle-is", name: "Gyroslug Rifle", tons: 0.008, availability: [{ from: 2530 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 5.8, shots: "50", crew: "1", clip: 20 } },
      { id: "inf-gyrojet-gun-heavy-is", name: "Gyrojet Gun (Heavy)", tons: 0.01, availability: [{ from: 2590 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.21, ammoKg: 1, shots: "5", crew: "1", clip: 250 } },
      { id: "inf-gyrojet-rifle-is", name: "Gyrojet Rifle", tons: 0.007, availability: [{ from: 2540 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 1.3, shots: "10", crew: "1", clip: 20 } },
      { id: "inf-laser-rifle-is", name: "Laser Rifle", tons: 0.005, availability: [{ from: 2230 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.28, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-blazer-is", name: "Laser Rifle (Blazer)", tons: 0.007, availability: [{ from: 2290 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.35, ammoKg: 0.3, shots: "3", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-ebony-assault-is", name: "Laser Rifle (Ebony Assault)", tons: 0.01, availability: [{ from: 3063 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.21, ammoKg: 0.3, shots: "3", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-er-starfire-is", name: "Laser Rifle (ER, Starfire)", tons: 0.005, availability: [{ from: 3052 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.28, ammoKg: 0.3, shots: "5", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-federated-barrett-m61a-is", name: "Laser Rifle (Federated-Barrett M61A)", tons: 0.006, availability: [{ from: 3062 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.75, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-intek-is", name: "Laser Rifle (Intek)", tons: 0.005, availability: [{ from: 2880 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.21, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-magna-is", name: "Laser Rifle (Magna)", tons: 0.006, availability: [{ from: 2465 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.26, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-marx-xx-is", name: "Laser Rifle (Marx XX)", tons: 0.006, availability: [{ from: 2690 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.26, ammoKg: 0.3, shots: "5", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-mauser-960-assault-sys-is", name: "Laser Rifle (Mauser 960 Assault Sys.)", tons: 0.0108, availability: [{ from: 2700, to: 3040 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.93, ammoKg: 0.3, shots: "15/2", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-mauser-1200-lss-is", name: "Laser Rifle (Mauser 1200 LSS)", tons: 0.011, availability: [{ from: 3055 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 1.04, ammoKg: 0.3, shots: "6/1", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-maxell-pl-10-is", name: "Laser Rifle (Maxell PL-10)", tons: 0.0065, availability: [{ from: 3059 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.26, ammoKg: 0.3, shots: "3", crew: "1", clip: "cells" } },
      { id: "inf-needler-rifle-is", name: "Needler Rifle", tons: 0.001, availability: [{ from: 2200 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.23, ammoKg: 0.2, shots: "20", crew: "1", clip: 2 } },
      { id: "inf-needler-rifle-shredder-heavy-is", name: "Needler Rifle (Shredder Heavy)", tons: 0.001, availability: [{ from: 3054 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.34, ammoKg: 0.24, shots: "10", crew: "1", clip: 3 } },
      { id: "inf-needler-rifle-m-g-flechette-is", name: "Needler Rifle (M&G Flechette)", tons: 0.0015, availability: [{ from: 2325 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.24, shots: "30", crew: "1", clip: 8 } },
      { id: "inf-pulse-laser-rifle-is-is", name: "Pulse Laser Rifle (IS)", tons: 0.005, availability: [{ from: 2680, to: 2880 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.25, ammoKg: 0.3, shots: "6/1", crew: "1", clip: "cells" } },
      { id: "inf-rifle-bolt-action-is", name: "Rifle (Bolt-Action)", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.14, ammoKg: 0.06, shots: "5", crew: "1", clip: 1 } },
      { id: "inf-rifle-federated-barrett-m42b-is", name: "Rifle (Federated-Barrett M42B)", tons: 0.006, availability: [{ from: 3064 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", flags: "B", baseRange: 1, damage: 1.02, ammoKg: 0.24, shots: "50/5", crew: "1", clip: 12 } },
      { id: "inf-rifle-federated-long-is", name: "Rifle (Federated Long)", tons: 0.005, availability: [{ from: 2870 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 0.15, shots: "10", crew: "1", clip: 3 } },
      { id: "inf-rifle-imperator-ax-22-assault-is", name: "Rifle (Imperator AX-22 Assault)", tons: 0.0035, availability: [{ from: 3060 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.52, ammoKg: 0.24, shots: "15/1", crew: "1", clip: 3 } },
      { id: "inf-rifle-m-g-g-150-is", name: "Rifle (M&G G-150)", tons: 0.0035, availability: [{ from: 3060 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.32, ammoKg: 0.15, shots: "9/3", crew: "1", clip: 5 } },
      { id: "inf-rifle-makeshift-is", name: "Rifle (Makeshift)", tons: 0.006, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.03, ammoKg: 0.02, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-rifle-minolta-9000-adv-sniper-sys-is", name: "Rifle (Minolta 9000 Adv. Sniper Sys.)", tons: 0.006, availability: [{ from: 3055 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.35, ammoKg: 0.12, shots: "10", crew: "1", clip: 5 } },
      { id: "inf-rifle-radium-sniper-is", name: "Rifle (Radium Sniper)", tons: 0.012, availability: [{ from: 2583, to: 2607 }, { from: 3062 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.36, ammoKg: 0.33, shots: "5", crew: "1", clip: 650 } },
      { id: "inf-rifle-sniper-is", name: "Rifle (Sniper)", tons: 0.01, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.18, ammoKg: 0.06, shots: "5", crew: "1", clip: 4 } },
      { id: "inf-rifle-tk-assault-is", name: "Rifle (TK Assault)", tons: 0.0055, availability: [{ from: 2870 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.44, ammoKg: 0.32, shots: "20/2", crew: "1", clip: 3 } },
      { id: "inf-rifle-zeus-heavy-is", name: "Rifle (Zeus Heavy)", tons: 0.008, availability: [{ from: 2740 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.22, ammoKg: 0.08, shots: "5", crew: "1", clip: 3 } },
      { id: "inf-auto-shotgun-is", name: "Auto-Shotgun", tons: 0.005, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.23, ammoKg: 0.27, shots: "12/3", crew: "1", clip: 2 } },
      { id: "inf-ceres-arms-crowdbuster-is", name: "Ceres Arms Crowdbuster", tons: 0.001, availability: [{ from: 3030 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-gel-gun-buccaneer-is", name: "Gel Gun (Buccaneer)", tons: 0.0025, availability: [{ from: 3035 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.07, ammoKg: 0.85, shots: "5", crew: "1", clip: 20 } },
      { id: "inf-shotgun-combat-is", name: "Shotgun (Combat)", tons: 0.0045, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.27, ammoKg: 0.14, shots: "8", crew: "1", clip: 2 } },
      { id: "inf-shotgun-double-barrel-is", name: "Shotgun (Double-Barrel)", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.04, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-shotgun-double-barrel-sawed-off-is", name: "Shotgun (Double-Barrel, Sawed-Off)", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.04, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-shotgun-pump-action-is", name: "Shotgun (Pump-Action)", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.08, ammoKg: 0.12, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-shotgun-pump-action-sawed-off-is", name: "Shotgun (Pump-Action, Sawed-Off)", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.08, ammoKg: 0.12, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-auto-pistol-mydron-is", name: "Auto-Pistol (Mydron)", tons: 0.0015, availability: [{ from: 2612 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.14, ammoKg: 0.14, shots: "20/4", crew: "1", clip: 4 } },
    ],
  },
  {
    defaults: { techBase: "inner-sphere", cite: { book: "TechManual", page: 351 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-auto-pistol-stetta-is", name: "Auto-Pistol (Stetta)", tons: 0.002, availability: [{ from: 3010 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.17, ammoKg: 0.68, shots: "100/10", crew: "1", clip: 10 } },
      { id: "inf-machine-pistol-martial-eagle-is", name: "Machine Pistol (Martial Eagle)", tons: 0.0018, availability: [{ from: 3045 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.25, ammoKg: 0.25, shots: "30/3", crew: "1", clip: 20 } },
      { id: "inf-submachine-gun-is", name: "Submachine Gun", tons: 0.003, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.25, ammoKg: 0.57, shots: "50/5", crew: "1", clip: 5 } },
      { id: "inf-smg-gunther-mp-20-is", name: "SMG (Gunther MP-20)", tons: 0.0025, availability: [{ from: 3007 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.33, ammoKg: 0.34, shots: "30/6", crew: "1", clip: 5 } },
      { id: "inf-smg-imperator-2894a1-is", name: "SMG (Imperator 2894A1)", tons: 0.004, availability: [{ from: 2842 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.22, ammoKg: 0.38, shots: "50/5", crew: "1", clip: 5 } },
      { id: "inf-smg-ka-23-subgun-is", name: "SMG (KA-23 Subgun)", tons: 0.0025, availability: [{ from: 2895 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.22, ammoKg: 0.3, shots: "40/4", crew: "1", clip: 6 } },
      { id: "inf-smg-rorynex-rm-3-xxi-is", name: "SMG (Rorynex RM-3/XXI)", tons: 0.003, availability: [{ from: 2660 }], infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.2, ammoKg: 0.76, shots: "100/6", crew: "1", clip: 10 } },
      { id: "inf-smg-rugan-is", name: "SMG (Rugan)", tons: 0.0035, availability: [{ from: 2720 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.2, ammoKg: 0.61, shots: "100/7", crew: "1", clip: 8 } },
      { id: "inf-grenade-is", name: "Grenade", tons: 0.0006, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.48, inferno: 0.19, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-grenade-micro-is", name: "Grenade (Micro)", tons: 0.0002, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.16, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-grenade-mini-is", name: "Grenade (Mini)", tons: 0.00045, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.27, inferno: 0.11, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-grenade-rocket-assisted-is", name: "Grenade (Rocket-Assisted)", tons: 0.0006, availability: [{ from: 3065 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 1, damage: 0.3, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-aa-weapon-mk-1-light-aa-is", name: "AA Weapon (Mk. 1 Light AA)", tons: 0.005, availability: [{ from: 2500, to: 2790 }, { from: 3056 }], infantry: { rating: "D", size: "Small", mode: "Support", damageType: "B", flags: "A", baseRange: 1, damage: 0.23, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-aa-weapon-mk-2-man-portable-aa-is", name: "AA Weapon (Mk. 2 Man-Portable AA)", tons: 0.035, availability: [{ from: 2510, to: 2790 }, { from: 3058 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "B", flags: "A", baseRange: 2, damage: 0.81, ammoKg: 14, shots: "4", crew: "2", clip: 1000 } },
      { id: "inf-autocannon-semi-portable-is", name: "Autocannon (Semi-Portable)", tons: 0.025, availability: [{ from: 2255 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.77, ammoKg: 8, shots: "200/8", crew: "2", clip: 150 } },
      { id: "inf-flamer-heavy-is", name: "Flamer (Heavy)", tons: 0.025, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "E", flags: "F", baseRange: 0, damage: 0.79, ammoKg: 2.9, shots: "3", crew: "2", clip: 200 } },
      { id: "inf-flamer-man-portable-is", name: "Flamer (Man-Portable)", tons: 0.015, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "E", flags: "F", baseRange: 0, damage: 0.55, ammoKg: 8.4, shots: "12", crew: "1E", clip: 2 } },
      { id: "inf-gauss-cannon-grand-mauler-is", name: "Gauss Cannon (Grand Mauler)", tons: 0.014, availability: [{ from: 3059 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.63, ammoKg: 4.5, shots: "5", crew: "1E", clip: 5 } },
      { id: "inf-gauss-rifle-magshot-is", name: "Gauss Rifle (Magshot)", tons: 0.045, availability: [{ from: 3059 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.74, ammoKg: 16.5, shots: "20", crew: "2", clip: 10 } },
      { id: "inf-gauss-rifle-tsunami-heavy-is", name: "Gauss Rifle (Tsunami Heavy)", tons: 0.0125, availability: [{ from: 3056 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.63, ammoKg: 4.5, shots: "5", crew: "1E", clip: 5 } },
      { id: "inf-gauss-rifle-light-david-is", name: "Gauss Rifle, Light (David)", tons: 0.018, availability: [{ from: 3063 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "B", baseRange: 3, damage: 0.56, ammoKg: 2, shots: "8/2", crew: "1E", clip: 20 } },
      { id: "inf-gauss-rifle-light-king-david-is", name: "Gauss Rifle, Light (King David)", tons: 0.03, availability: [{ from: 3063 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "B", baseRange: 3, damage: 0.68, ammoKg: 16, shots: "80/16", crew: "2", clip: 200 } },
      { id: "inf-grenade-launcher-is", name: "Grenade Launcher", tons: 0.005, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 1, damage: 0.81, inferno: 0.34, ammoKg: 4.5, shots: "10", crew: "1", clip: 80 } },
      { id: "inf-grenade-launcher-automatic-is", name: "Grenade Launcher (Automatic)", tons: 0.012, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 1.49, inferno: 0.41, ammoKg: 9, shots: "20/4", crew: "1", clip: 160 } },
      { id: "inf-grenade-launcher-compact-is", name: "Grenade Launcher (Compact)", tons: 0.003, availability: [{ from: 2200 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 1, damage: 0.16, ammoKg: 0.2, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-grenade-launcher-heavy-is", name: "Grenade Launcher (Heavy)", tons: 0.018, availability: [{ from: 3050 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 1.76, inferno: 0.69, ammoKg: 12, shots: "20/4", crew: "1E", clip: 320 } },
      { id: "inf-laser-hellbore-assault-is", name: "Laser (Hellbore Assault)", tons: 0.01, availability: [{ from: 3058 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", baseRange: 2, damage: 0.63, ammoKg: 3, shots: "15", crew: "1E", clip: "cells" } },
      { id: "inf-lrm-launcher-corean-farshot-is", name: "LRM Launcher (Corean FarShot)", tons: 0.03, availability: [{ from: 3057 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "M", baseRange: 3, damage: 0.48, inferno: 0.19, ammoKg: 8.3, shots: "1", crew: "1E", clip: 1500 } },
      { id: "inf-machine-gun-light-is", name: "Machine Gun (Light)", tons: 0.007, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.49, ammoKg: 2, shots: "45/3", crew: "1", clip: 6 } },
      { id: "inf-machine-gun-portable-is", name: "Machine Gun (Portable)", tons: 0.0115, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 1, damage: 0.65, ammoKg: 3, shots: "75/5", crew: "1E", clip: 10 } },
      { id: "inf-machine-gun-semi-portable-is", name: "Machine Gun (Semi-Portable)", tons: 0.02, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 1, damage: 0.75, ammoKg: 4, shots: "80/4", crew: "2", clip: 10 } },
      { id: "inf-machine-gun-support-is", name: "Machine Gun (Support)", tons: 0.044, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 2, damage: 0.94, ammoKg: 5, shots: "100/5", crew: "2", clip: 50 } },
      { id: "inf-mortar-heavy-is", name: "Mortar (Heavy)", tons: 0.22, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Medium", mode: "Support", damageType: "B", baseRange: 3, damage: 0.57, inferno: 0.34, ammoKg: 4, shots: "1", crew: "3", clip: 32 } },
      { id: "inf-mortar-light-is", name: "Mortar (Light)", tons: 0.05, availability: [{ from: 1950 }], infantry: { rating: "B", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.53, inferno: 0.26, ammoKg: 2, shots: "1", crew: "2", clip: 24 } },
      { id: "inf-mrm-launcher-is", name: "MRM Launcher", tons: 0.03, availability: [{ from: 3065 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 0.53, inferno: 0.26, ammoKg: 5, shots: "1", crew: "1", clip: 21 } },
      { id: "inf-needler-support-firedrake-is", name: "Needler, Support (Firedrake)", tons: 0.025, availability: [{ from: 3061 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "B", flags: "F", baseRange: 1, damage: 1.2, ammoKg: 3, shots: "30/3", crew: "2", clip: 10 } },
      { id: "inf-particle-cannon-semi-portable-is", name: "Particle Cannon (Semi-Portable)", tons: 0.04, availability: [{ from: 2436 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 2, damage: 0.72, ammoKg: 3, shots: "25", crew: "2", clip: "cells" } },
      { id: "inf-particle-cannon-support-is", name: "Particle Cannon (Support)*", tons: 1.8, availability: [{ from: 2470 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 1.58, ammoKg: 25, shots: "150", crew: "5", clip: "cells" } },
      { id: "inf-plasma-rifle-man-portable-is", name: "Plasma Rifle, Man-Portable", tons: 0.03, availability: [{ from: 3065 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", flags: "F", baseRange: 2, damage: 1.58, ammoKg: 18, shots: "10", crew: "1E", clip: 10 } },
      { id: "inf-pulse-laser-dragonsbane-disp-is", name: "Pulse Laser (Dragonsbane Disp.)", tons: 0.007, availability: [{ from: 3058 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.16, shots: "1-D", crew: "1E", clip: "single-use" } },
      { id: "inf-recoilless-rifle-heavy-is", name: "Recoilless Rifle (Heavy)", tons: 0.06, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 4, shots: "1", crew: "3", clip: 40 } },
    ],
  },
  {
    defaults: { techBase: "inner-sphere", cite: { book: "TechManual", page: 352 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-recoilless-rifle-light-is", name: "Recoilless Rifle (Light)", tons: 0.008, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 2, damage: 0.48, inferno: 0.19, ammoKg: 0.6, shots: "1", crew: "1E", clip: 20 } },
      { id: "inf-recoilless-rifle-medium-is", name: "Recoilless Rifle (Medium)", tons: 0.032, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.53, inferno: 0.26, ammoKg: 2, shots: "1", crew: "2", clip: 30 } },
      { id: "inf-rocket-launcher-law-is", name: "Rocket Launcher (LAW)", tons: 0.004, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "M", baseRange: 2, damage: 0.53, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-rocket-launcher-v-law-is", name: "Rocket Launcher (V-LAW)", tons: 0.0022, availability: [{ from: 1950 }], infantry: { rating: "C", size: "Small", mode: "Support", damageType: "M", baseRange: 1, damage: 0.48, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-srm-launcher-standard-two-shot-is", name: "SRM Launcher (Standard, Two-Shot)", tons: 0.03, availability: [{ from: 2370 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 1.14, inferno: 0.68, ammoKg: 20, shots: "2", crew: "1E", clip: 450 } },
      { id: "inf-srm-launcher-heavy-is", name: "SRM Launcher (Heavy)", tons: 0.02, availability: [{ from: 2370 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 18, shots: "1", crew: "1E", clip: 500 } },
      { id: "inf-srm-launcher-light-is", name: "SRM Launcher (Light)", tons: 0.01, availability: [{ from: 2370 }], infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 9, shots: "2", crew: "1", clip: 300 } },
      { id: "inf-support-laser-is", name: "Support Laser", tons: 0.072, availability: [{ from: 2380 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.84, ammoKg: 3, shots: "15", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-er-is-is", name: "Support Laser (ER, IS)", tons: 0.11, availability: [{ from: 3059 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", baseRange: 4, damage: 0.84, ammoKg: 3, shots: "10", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-er-heavy-is-is", name: "Support Laser (ER Heavy, IS)", tons: 0.25, availability: [{ from: 3060 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", baseRange: 6, damage: 1.05, ammoKg: 3, shots: "7", crew: "4", clip: "cells" } },
      { id: "inf-support-laser-heavy-is", name: "Support Laser (Heavy)", tons: 0.3, availability: [{ from: 2405 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 5, damage: 1.47, ammoKg: 3, shots: "7", crew: "3", clip: "cells" } },
      { id: "inf-support-laser-semi-portable-is", name: "Support Laser (Semi-Portable)", tons: 0.04, availability: [{ from: 2400 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.61, ammoKg: 3, shots: "21", crew: "2", clip: "cells" } },
      { id: "inf-support-pulse-laser-is", name: "Support Pulse Laser", tons: 0.15, availability: [{ from: 2610 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", flags: "B", baseRange: 3, damage: 0.81, ammoKg: 3, shots: "21/4", crew: "2", clip: "cells" } },
      { id: "inf-support-pulse-laser-heavy-is", name: "Support Pulse Laser (Heavy)", tons: 0.3, availability: [{ from: 2615 }], infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", flags: "B", baseRange: 4, damage: 0.98, ammoKg: 3, shots: "18/3", crew: "4", clip: "cells" } },
    ],
  },
  {
    defaults: { techBase: "clan", cite: { book: "TechManual", page: 349 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-bow-compound-clan", name: "Bow (Compound)", tons: 0.001, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-daikyu-clan", name: "Bow (Daikyu)", tons: 0.001, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-longbow-clan", name: "Bow (Longbow)", tons: 0.0015, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.07, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-bow-shortbow-clan", name: "Bow (Shortbow)", tons: 0.0008, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-bow-hankyu-clan", name: "Bow (Hankyu)", tons: 0.0008, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-club-blackjack-sap-clan", name: "Club (Blackjack/Sap)", tons: 0.001, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-club-club-improvised-clan", name: "Club (Club/Improvised)", tons: 0.002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-crossbow-basic-clan", name: "Crossbow (Basic)", tons: 0.002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.01, ammoKg: 0.05, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-crossbow-heavy-clan", name: "Crossbow (Heavy)", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "B", baseRange: 0, damage: 0.02, ammoKg: 0.06, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-blade-axe-clan", name: "Blade (Axe)", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.11, shots: "NA", crew: "1" } },
      { id: "inf-blade-bokken-clan", name: "Blade (Bokken)", tons: 0.002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-dao-clan", name: "Blade (Dao)", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-hatchet-tomahawk-clan", name: "Blade (Hatchet/Tomahawk)", tons: 0.001, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-blade-katana-scimitar-clan", name: "Blade (Katana/Scimitar)", tons: 0.0025, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.07, shots: "NA", crew: "1" } },
      { id: "inf-blade-knife-dagger-bayonet-clan", name: "Blade (Knife/Dagger/Bayonet)", tons: 0.00025, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-blade-no-dachi-clan", name: "Blade (No-Dachi)", tons: 0.0045, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-blade-sword-clan", name: "Blade (Sword)", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.07, shots: "NA", crew: "1" } },
      { id: "inf-blade-wakizashi-clan", name: "Blade (Wakizashi)", tons: 0.0002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-blade-vibro-axe-clan", name: "Blade (Vibro-axe)", tons: 0.005, availability: [{ from: 2445 }], yearsInferred: true, infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.42, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-blade-vibro-blade-clan", name: "Blade (Vibro-blade)", tons: 0.00035, availability: [{ from: 2400 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.21, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-blade-vibro-sword-clan-clan", name: "Blade (Vibro-sword, Clan)", tons: 0.004, availability: [{ from: 2800 }], infantry: { rating: "F", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.37, ammoKg: 0.28, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-nunchaku-clan", name: "Nunchaku", tons: 0.0015, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.02, shots: "NA", crew: "1" } },
      { id: "inf-staff-clan", name: "Staff", tons: 0.0025, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-staff-pole-arm-clan", name: "Staff (Pole Arm)", tons: 0.006, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.04, shots: "NA", crew: "1" } },
      { id: "inf-staff-stun-staff-single-end-clan", name: "Staff (Stun Staff, Single-End)", tons: 0.003, availability: [{ from: 2150 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-staff-stun-staff-double-end-clan", name: "Staff (Stun Staff, Double-End)", tons: 0.003, availability: [{ from: 2155 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-stunstick-clan", name: "Stunstick", tons: 0.0002, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.25, shots: "20", crew: "1", clip: "cells" } },
      { id: "inf-stunstick-mini-clan", name: "Stunstick (Mini)", tons: 0.00015, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-whip-clan", name: "Whip", tons: 0.00035, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "A", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.05, shots: "NA", crew: "1" } },
      { id: "inf-whip-monowire-clan", name: "Whip (Monowire)", tons: 0.00025, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", baseRange: 0, damage: 0.35, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-whip-medusa-clan", name: "Whip (Medusa)", tons: 0.00045, availability: [{ from: 2820 }], infantry: { rating: "E", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.16, ammoKg: 0.15, shots: "20", crew: "1", clip: "cells" } },
      { id: "inf-whip-neural-lash-clan", name: "Whip (Neural Lash)", tons: 0.0001, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Melee", damageType: "P", flags: "N", baseRange: 0, damage: 0.09, ammoKg: 0.15, shots: "15", crew: "1", clip: "cells" } },
      { id: "inf-auto-pistol-clan", name: "Auto-Pistol", tons: 0.0005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.14, shots: "10", crew: "1", clip: 2 } },
      { id: "inf-auto-pistol-magnum-clan", name: "Auto-Pistol (Magnum)", tons: 0.0005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.14, shots: "8", crew: "1", clip: 4 } },
      { id: "inf-auto-pistol-m-g-clan", name: "Auto-Pistol (M&G)", tons: 0.00065, availability: [{ from: 2495 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.17, ammoKg: 0.11, shots: "8", crew: "1", clip: 3 } },
      { id: "inf-auto-pistol-nambu-clan", name: "Auto-Pistol (Nambu)", tons: 0.00045, availability: [{ from: 2540 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.21, ammoKg: 0.16, shots: "12", crew: "1", clip: 2 } },
      { id: "inf-dart-gun-clan", name: "Dart Gun", tons: 0.00065, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.01, ammoKg: 0.01, shots: "1", crew: "1", clip: 1 } },
      { id: "inf-flare-pistol-clan", name: "Flare Pistol", tons: 0.0004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "E", baseRange: 0, damage: 0.09, ammoKg: 0.02, shots: "5", crew: "1", clip: 2 } },
      { id: "inf-gauss-pistol-clan", name: "Gauss Pistol", tons: 0.001, availability: [{ from: 2850 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.14, ammoKg: 0.01, shots: "4", crew: "1", clip: 1 } },
      { id: "inf-gyrojet-pistol-clan", name: "Gyrojet Pistol", tons: 0.0025, availability: [{ from: 2625 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.04, ammoKg: 0.18, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-gyrojet-pistol-hold-out-clan", name: "Gyrojet Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2630 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.04, ammoKg: 0.02, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-laser-pistol-clan", name: "Laser Pistol", tons: 0.001, availability: [{ from: 2210 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.21, ammoKg: 0.3, shots: "16", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-blazer-clan", name: "Laser Pistol (Blazer)", tons: 0.002, availability: [{ from: 2295 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.26, ammoKg: 0.3, shots: "8", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-er-clan", name: "Laser Pistol (ER)", tons: 0.001, availability: [{ from: 2835 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.21, ammoKg: 0.3, shots: "10", crew: "1", clip: "cells" } },
      { id: "inf-laser-pistol-hold-out-clan", name: "Laser Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2320 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.14, ammoKg: 0.02, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-needler-pistol-clan", name: "Needler Pistol", tons: 0.0003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.23, ammoKg: 0.07, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-needler-pistol-hold-out-clan", name: "Needler Pistol (Hold-Out)", tons: 5e-05, availability: [{ from: 2515 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.03, shots: "5", crew: "1", clip: "single-use" } },
      { id: "inf-needler-pistol-m-g-flechette-clan", name: "Needler Pistol (M&G Flechette)", tons: 0.0005, availability: [{ from: 2360 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.17, shots: "15/3", crew: "1", clip: 4 } },
    ],
  },
  {
    defaults: { techBase: "clan", cite: { book: "TechManual", page: 350 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-paint-gun-lgb-46r-clan", name: "Paint Gun (LGB-46R)", tons: 0.0018, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0, ammoKg: 0.64, shots: "15", crew: "1", clip: 10 } },
      { id: "inf-pistol-flamer-clan", name: "Pistol (Flamer)", tons: 0.0012, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "E", baseRange: 0, damage: 0.34, ammoKg: 0.8, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-pistol-hold-out-clan", name: "Pistol (Hold-Out)", tons: 0.0002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.02, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-pulse-laser-pistol-clan-clan", name: "Pulse Laser Pistol (Clan)", tons: 0.001, availability: [{ from: 2840 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 1, damage: 0.2, ammoKg: 0.3, shots: "10/2", crew: "1", clip: "cells" } },
      { id: "inf-revolver-clan", name: "Revolver", tons: 0.0005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.17, ammoKg: 0.06, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-revolver-magnum-clan", name: "Revolver (Magnum)", tons: 0.0005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.18, ammoKg: 0.06, shots: "5", crew: "1", clip: 3 } },
      { id: "inf-sonic-stunner-clan", name: "Sonic Stunner", tons: 0.0006, availability: [{ from: 2375 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", flags: "N", baseRange: 0, damage: 0.07, ammoKg: 0.3, shots: "30", crew: "1", clip: "cells" } },
      { id: "inf-tranq-gun-clan", name: "Tranq Gun", tons: 0.0015, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.14, ammoKg: 0.04, shots: "10", crew: "1", clip: 1 } },
      { id: "inf-auto-rifle-clan", name: "Auto-Rifle", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.52, ammoKg: 0.48, shots: "30/2", crew: "1", clip: 2 } },
      { id: "inf-elephant-gun-clan", name: "Elephant Gun", tons: 0.005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.11, ammoKg: 0.04, shots: "2", crew: "1", clip: 2 } },
      { id: "inf-gyroslug-carbine-clan", name: "Gyroslug Carbine", tons: 0.004, availability: [{ from: 2580 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.28, ammoKg: 1.84, shots: "20", crew: "1", clip: 5 } },
      { id: "inf-gyroslug-rifle-clan", name: "Gyroslug Rifle", tons: 0.008, availability: [{ from: 2530 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 5.8, shots: "50", crew: "1", clip: 20 } },
      { id: "inf-gyrojet-gun-heavy-clan", name: "Gyrojet Gun (Heavy)", tons: 0.01, availability: [{ from: 2590 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.21, ammoKg: 1, shots: "5", crew: "1", clip: 250 } },
      { id: "inf-gyrojet-rifle-clan", name: "Gyrojet Rifle", tons: 0.007, availability: [{ from: 2540 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.35, ammoKg: 1.3, shots: "10", crew: "1", clip: 20 } },
      { id: "inf-laser-rifle-clan", name: "Laser Rifle", tons: 0.005, availability: [{ from: 2230 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.28, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-blazer-clan", name: "Laser Rifle (Blazer)", tons: 0.007, availability: [{ from: 2290 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.35, ammoKg: 0.3, shots: "3", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-er-clan", name: "Laser Rifle (ER)", tons: 0.005, availability: [{ from: 2845 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.28, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-magna-clan", name: "Laser Rifle (Magna)", tons: 0.006, availability: [{ from: 2465 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.26, ammoKg: 0.3, shots: "6", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-marx-xx-clan", name: "Laser Rifle (Marx XX)", tons: 0.006, availability: [{ from: 2690 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 0.26, ammoKg: 0.3, shots: "5", crew: "1", clip: "cells" } },
      { id: "inf-laser-rifle-mauser-iic-clan", name: "Laser Rifle (Mauser IIC)", tons: 0.012, availability: [{ from: 3015 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 3, damage: 1.37, inferno: 0.9, ammoKg: 0.3, shots: "6", crew: "1E", clip: "cells" } },
      { id: "inf-needler-rifle-clan", name: "Needler Rifle", tons: 0.001, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.23, ammoKg: 0.2, shots: "20", crew: "1", clip: 2 } },
      { id: "inf-needler-rifle-m-g-flechette-clan", name: "Needler Rifle (M&G Flechette)", tons: 0.0015, availability: [{ from: 2325 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", flags: "N", baseRange: 0, damage: 0.11, ammoKg: 0.24, shots: "30", crew: "1", clip: 8 } },
      { id: "inf-pulse-laser-rifle-clan-clan", name: "Pulse Laser Rifle (Clan)", tons: 0.005, availability: [{ from: 2835 }], infantry: { rating: "F", size: "Small", mode: "Standard", damageType: "E", baseRange: 2, damage: 0.33, ammoKg: 0.3, shots: "8/1", crew: "1", clip: "cells" } },
      { id: "inf-rifle-bolt-action-clan", name: "Rifle (Bolt-Action)", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.14, ammoKg: 0.06, shots: "5", crew: "1", clip: 1 } },
      { id: "inf-rifle-sniper-clan", name: "Rifle (Sniper)", tons: 0.01, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 2, damage: 0.18, ammoKg: 0.06, shots: "5", crew: "1", clip: 4 } },
      { id: "inf-rifle-zeus-heavy-clan", name: "Rifle (Zeus Heavy)", tons: 0.008, availability: [{ from: 2740 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.22, ammoKg: 0.08, shots: "5", crew: "1", clip: 3 } },
      { id: "inf-auto-shotgun-clan", name: "Auto-Shotgun", tons: 0.005, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.23, ammoKg: 0.27, shots: "12/3", crew: "1", clip: 2 } },
      { id: "inf-shotgun-avenger-ccw-clan", name: "Shotgun (Avenger CCW)", tons: 0.0055, availability: [{ from: 3020 }], infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.33, ammoKg: 0.4, shots: "15/5", crew: "1", clip: 4 } },
      { id: "inf-shotgun-combat-clan", name: "Shotgun (Combat)", tons: 0.0045, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.27, ammoKg: 0.14, shots: "8", crew: "1", clip: 2 } },
      { id: "inf-shotgun-double-barrel-clan", name: "Shotgun (Double-Barrel)", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.04, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-shotgun-double-barrel-sawed-off-clan", name: "Shotgun (Double-Barrel, Sawed-Off)", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.03, ammoKg: 0.04, shots: "2", crew: "1", clip: 1 } },
      { id: "inf-shotgun-pump-action-clan", name: "Shotgun (Pump-Action)", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.08, ammoKg: 0.12, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-shotgun-pump-action-sawed-off-clan", name: "Shotgun (Pump-Action, Sawed-Off)", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.08, ammoKg: 0.12, shots: "6", crew: "1", clip: 1 } },
      { id: "inf-auto-pistol-mydron-clan", name: "Auto-Pistol (Mydron)", tons: 0.0015, availability: [{ from: 2612 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.14, ammoKg: 0.14, shots: "20/4", crew: "1", clip: 4 } },
    ],
  },
  {
    defaults: { techBase: "clan", cite: { book: "TechManual", page: 351 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-gauss-submachine-gun-clan", name: "Gauss Submachine Gun", tons: 0.0045, availability: [{ from: 3055 }], infantry: { rating: "E", size: "Small", mode: "Standard", damageType: "B", baseRange: 1, damage: 0.45, ammoKg: 0.52, shots: "30/10", crew: "1", clip: 10 } },
      { id: "inf-submachine-gun-clan", name: "Submachine Gun", tons: 0.003, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.25, ammoKg: 0.57, shots: "50/5", crew: "1", clip: 5 } },
      { id: "inf-smg-rorynex-rm-3-xxi-clan", name: "SMG (Rorynex RM-3/XXI)", tons: 0.003, availability: [{ from: 2660 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.2, ammoKg: 0.76, shots: "100/6", crew: "1", clip: 10 } },
      { id: "inf-smg-rugan-clan", name: "SMG (Rugan)", tons: 0.0035, availability: [{ from: 2720 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Standard", damageType: "B", baseRange: 0, damage: 0.2, ammoKg: 0.61, shots: "100/7", crew: "1", clip: 8 } },
      { id: "inf-grenade-clan", name: "Grenade", tons: 0.0006, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.48, inferno: 0.19, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-grenade-micro-clan", name: "Grenade (Micro)", tons: 0.0002, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.16, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-grenade-mini-clan", name: "Grenade (Mini)", tons: 0.00045, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 0, damage: 0.27, inferno: 0.11, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-aa-weapon-mk-1-light-aa-clan", name: "AA Weapon (Mk. 1 Light AA)", tons: 0.005, availability: [{ from: 2500 }], yearsInferred: true, infantry: { rating: "D", size: "Small", mode: "Support", damageType: "B", flags: "A", baseRange: 1, damage: 0.23, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-aa-weapon-mk-2-man-portable-aa-clan", name: "AA Weapon (Mk. 2 Man-Portable AA)", tons: 0.035, availability: [{ from: 2510 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "B", flags: "A", baseRange: 2, damage: 0.81, ammoKg: 14, shots: "4", crew: "2", clip: 1000 } },
      { id: "inf-autocannon-bearhunter-super-heavy-clan", name: "Autocannon (Bearhunter Super-Heavy)", tons: 0.04, availability: [{ from: 3062 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 0, damage: 2.33, ammoKg: 9, shots: "180/6", crew: "2", clip: 200 } },
      { id: "inf-autocannon-semi-portable-clan", name: "Autocannon (Semi-Portable)", tons: 0.025, availability: [{ from: 2255 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.77, ammoKg: 8, shots: "200/8", crew: "2", clip: 150 } },
      { id: "inf-flamer-heavy-clan", name: "Flamer (Heavy)", tons: 0.025, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "E", flags: "F", baseRange: 0, damage: 0.79, ammoKg: 2.9, shots: "3", crew: "2", clip: 200 } },
      { id: "inf-flamer-man-portable-clan", name: "Flamer (Man-Portable)", tons: 0.015, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "E", flags: "F", baseRange: 0, damage: 0.55, ammoKg: 8.4, shots: "12", crew: "1E", clip: 2 } },
      { id: "inf-grenade-launcher-clan", name: "Grenade Launcher", tons: 0.005, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 1, damage: 0.81, inferno: 0.34, ammoKg: 4.5, shots: "10", crew: "1", clip: 80 } },
      { id: "inf-grenade-launcher-automatic-clan", name: "Grenade Launcher (Automatic)", tons: 0.012, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 1.49, inferno: 0.41, ammoKg: 9, shots: "20/4", crew: "1", clip: 160 } },
      { id: "inf-grenade-launcher-compact-clan", name: "Grenade Launcher (Compact)", tons: 0.003, availability: [{ from: 2200 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 1, damage: 0.16, ammoKg: 0.2, shots: "1", crew: "1", clip: 2 } },
      { id: "inf-grenade-launcher-heavy-auto-clan", name: "Grenade Launcher (Heavy Auto)", tons: 0.02, availability: [{ from: 2900 }], infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 1.93, inferno: 0.96, ammoKg: 12, shots: "20/3", crew: "1E", clip: 400 } },
      { id: "inf-machine-gun-light-clan", name: "Machine Gun (Light)", tons: 0.007, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.49, ammoKg: 2, shots: "45/3", crew: "1", clip: 6 } },
      { id: "inf-machine-gun-portable-clan", name: "Machine Gun (Portable)", tons: 0.0115, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 1, damage: 0.65, ammoKg: 3, shots: "75/5", crew: "1E", clip: 10 } },
      { id: "inf-machine-gun-semi-portable-clan", name: "Machine Gun (Semi-Portable)", tons: 0.02, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 1, damage: 0.75, ammoKg: 4, shots: "80/4", crew: "2", clip: 10 } },
      { id: "inf-machine-gun-support-clan", name: "Machine Gun (Support)", tons: 0.044, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", flags: "B", baseRange: 2, damage: 0.94, ammoKg: 5, shots: "100/5", crew: "2", clip: 50 } },
      { id: "inf-mortar-heavy-clan", name: "Mortar (Heavy)", tons: 0.22, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Medium", mode: "Support", damageType: "B", baseRange: 3, damage: 0.57, inferno: 0.34, ammoKg: 4, shots: "1", crew: "3", clip: 32 } },
      { id: "inf-mortar-light-clan", name: "Mortar (Light)", tons: 0.05, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "B", size: "Medium", mode: "Support", damageType: "B", baseRange: 1, damage: 0.53, inferno: 0.26, ammoKg: 2, shots: "1", crew: "2", clip: 24 } },
      { id: "inf-particle-cannon-semi-portable-clan", name: "Particle Cannon (Semi-Portable)", tons: 0.04, availability: [{ from: 2436 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 2, damage: 0.72, ammoKg: 3, shots: "25", crew: "2", clip: "cells" } },
      { id: "inf-particle-cannon-support-clan", name: "Particle Cannon (Support)*", tons: 1.8, availability: [{ from: 2470 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 1.58, ammoKg: 25, shots: "150", crew: "5", clip: "cells" } },
      { id: "inf-recoilless-rifle-heavy-clan", name: "Recoilless Rifle (Heavy)", tons: 0.06, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 4, shots: "1", crew: "3", clip: 40 } },
    ],
  },
  {
    defaults: { techBase: "clan", cite: { book: "TechManual", page: 352 }, checked: "page", kind: "weapon", slots: 0, units: ["infantry"] },
    items: [
      { id: "inf-recoilless-rifle-light-clan", name: "Recoilless Rifle (Light)", tons: 0.008, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "B", baseRange: 2, damage: 0.48, inferno: 0.19, ammoKg: 0.6, shots: "1", crew: "1E", clip: 20 } },
      { id: "inf-recoilless-rifle-medium-clan", name: "Recoilless Rifle (Medium)", tons: 0.032, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "B", baseRange: 2, damage: 0.53, inferno: 0.26, ammoKg: 2, shots: "1", crew: "2", clip: 30 } },
      { id: "inf-rocket-launcher-law-clan", name: "Rocket Launcher (LAW)", tons: 0.004, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "M", baseRange: 2, damage: 0.53, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-rocket-launcher-v-law-clan", name: "Rocket Launcher (V-LAW)", tons: 0.0022, availability: [{ from: 1950 }], yearsInferred: true, infantry: { rating: "C", size: "Small", mode: "Support", damageType: "M", baseRange: 1, damage: 0.48, shots: "1-D", crew: "1", clip: "single-use" } },
      { id: "inf-srm-launcher-standard-two-shot-clan", name: "SRM Launcher (Standard, Two-Shot)", tons: 0.03, availability: [{ from: 2370 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 1.14, inferno: 0.68, ammoKg: 20, shots: "2", crew: "1E", clip: 450 } },
      { id: "inf-srm-launcher-heavy-clan", name: "SRM Launcher (Heavy)", tons: 0.02, availability: [{ from: 2370 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 18, shots: "1", crew: "1E", clip: 500 } },
      { id: "inf-srm-launcher-light-clan", name: "SRM Launcher (Light)", tons: 0.01, availability: [{ from: 2370 }], yearsInferred: true, infantry: { rating: "C", size: "Medium", mode: "Support", damageType: "M", baseRange: 2, damage: 0.57, inferno: 0.34, ammoKg: 9, shots: "2", crew: "1", clip: 300 } },
      { id: "inf-support-laser-clan", name: "Support Laser", tons: 0.072, availability: [{ from: 2380 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.84, ammoKg: 3, shots: "15", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-er-clan-clan", name: "Support Laser (ER, Clan)", tons: 0.1, availability: [{ from: 2825 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 4, damage: 1.05, ammoKg: 3, shots: "10", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-er-heavy-clan-clan", name: "Support Laser (ER Heavy, Clan)", tons: 0.24, availability: [{ from: 2827 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 7, damage: 1.26, ammoKg: 3, shots: "7", crew: "3", clip: "cells" } },
      { id: "inf-support-laser-er-semi-portable-clan", name: "Support Laser (ER, Semi-Portable)", tons: 0.025, availability: [{ from: 3060 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.7, ammoKg: 3, shots: "15", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-heavy-clan", name: "Support Laser (Heavy)", tons: 0.3, availability: [{ from: 2405 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 5, damage: 1.47, ammoKg: 3, shots: "7", crew: "3", clip: "cells" } },
      { id: "inf-support-laser-heavy-semi-portable-clan", name: "Support Laser (Heavy, Semi-Portable)", tons: 0.15, availability: [{ from: 3061 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 1.05, ammoKg: 3, shots: "10", crew: "3", clip: "cells" } },
      { id: "inf-support-laser-semi-portable-clan", name: "Support Laser (Semi-Portable)", tons: 0.04, availability: [{ from: 2400 }], yearsInferred: true, infantry: { rating: "D", size: "Medium", mode: "Support", damageType: "E", baseRange: 3, damage: 0.61, ammoKg: 3, shots: "21", crew: "2", clip: "cells" } },
      { id: "inf-support-laser-ultra-heavy-clan", name: "Support Laser (Ultra-Heavy)", tons: 0.25, availability: [{ from: 3062 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 5, damage: 1.72, ammoKg: 3, shots: "5", crew: "4", clip: "cells" } },
      { id: "inf-support-pulse-laser-clan", name: "Support Pulse Laser", tons: 0.15, availability: [{ from: 2610 }], yearsInferred: true, infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", flags: "B", baseRange: 3, damage: 0.81, ammoKg: 3, shots: "21/4", crew: "2", clip: "cells" } },
      { id: "inf-support-pulse-laser-heavy-clan", name: "Support Pulse Laser (Heavy)", tons: 0.3, availability: [{ from: 2615 }], yearsInferred: true, infantry: { rating: "E", size: "Medium", mode: "Support", damageType: "E", flags: "B", baseRange: 4, damage: 0.98, ammoKg: 3, shots: "18/3", crew: "4", clip: "cells" } },
      { id: "inf-support-pulse-laser-semi-portable-clan", name: "Support Pulse Laser (Semi-Portable)", tons: 0.04, availability: [{ from: 3059 }], infantry: { rating: "F", size: "Medium", mode: "Support", damageType: "E", baseRange: 2, damage: 0.55, ammoKg: 3, shots: "25/2", crew: "2", clip: "cells" } },
    ],
  },
  {
    // Combat vehicle turret (TechManual, Combat Vehicle construction printed p.98; cost "5,000 x Turret Tonnage", structural cost table printed
    // p.279). A turret weighs a tenth of what is mounted in it, up to the half ton (formula "turret-tons"): what is mounted in it is every mount
    // whose `linkedTo` is the turret mount's id, so a turret is one mount that holds others. It takes no item slot (it is a location, not an
    // item). The book prints no introduction year, only ratings, so the span is a floor marked inferred. The vehicle records do not exist yet; the
    // mechanism is exercised on the formula.
    defaults: { kind: "other", cite: { book: "TechManual", page: 98 }, checked: "page", tons: "turret-tons", slots: 0, availability: [{ from: 1950 }], yearsInferred: true, units: ["vehicle"] },
    items: [
      { id: "turret-is", name: "Turret", techBase: "inner-sphere" },
      { id: "turret-clan", name: "Turret", techBase: "clan" },
    ],
  },
];
