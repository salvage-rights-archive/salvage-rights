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
// Clan CASE (p. 210 text: Clan CASE is weightless): 0 tons, 0 slots, so a Clan design's CASE matches a row; the year is
// the p. 291 table's, and the row is checked "text" because the Clan table lists no weight.
//
// Industrial equipment: the items of the Industrial Equipment table (pp. 344-345, years pp. 292-293) whose entries
// (pp. 241-249) allow a BattleMech and give a fixed weight and slot count. The book's dates are printed for the Inner
// Sphere only (the Clan column is a dash), so the Clan rows are marked. Placement: an asterisk on the slot count means the
// entry's special construction rule; for the backhoe, chainsaw, combine, dual saw, pile driver, mining drill, rock cutter
// and spot welder that rule is arms on a humanoid 'Mech (the hand actuator removed) or side torsos on a quad, so
// `locations` lists the arms and side torsos (the data cannot tell the two configurations apart); the wrecking ball and
// salvage arm are humanoid arms only; the lift hoist is arms and torsos; the bridgelayer is torsos (quad 'Mechs only).
// Not tabulated: the mounted searchlight (a BattleMech's first one is free), tracks (weight is a tenth of the 'Mech split
// over its legs), ladders, cargo bays and communications equipment (variable), and the items the entries bar from
// BattleMechs (manipulators, fluid suction systems, paramedic equipment, MASH, dumpers, quarters and the like).

import type { EquipmentGroup } from "../../rules/catalog";

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
      { id: "beagle-active-probe-is", name: "Beagle Active Probe", aliases: ["Active Probe (Beagle)"], tons: 1.5, slots: 2, availability: [{ from: 2576, to: 2835 }, { from: 3045 }] },
      { id: "case-is", name: "CASE", tons: 0.5, slots: 1, availability: [{ from: 2476, to: 2840 }, { from: 3036 }], locations: ["CT", "LT", "RT"] },
      { id: "c3-computer-master-is", name: "C3 Computer (Master)", tons: 5, slots: 5, availability: [{ from: 3050 }] },
      { id: "c3-computer-slave-is", name: "C3 Computer (Slave)", tons: 1, slots: 1, availability: [{ from: 3050 }] },
      { id: "improved-c3-computer-is", name: "Improved C3 Computer", aliases: ["C3i"], tons: 2.5, slots: 2, availability: [{ from: 3062 }] },
      { id: "guardian-ecm-suite-is", name: "Guardian ECM Suite", aliases: ["ECM Suite (Guardian)"], tons: 1.5, slots: 2, availability: [{ from: 2597, to: 2845 }, { from: 3045 }] },
      { id: "machine-gun-array-is", name: "Machine Gun Array", tons: 0.5, slots: 1, availability: [{ from: 3068 }], needs: "machine-gun" },
      { id: "tag-is", name: "TAG", tons: 1, slots: 1, availability: [{ from: 2600, to: 2835 }, { from: 3044 }] },
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
      { id: "targeting-computer-is", name: "Targeting Computer", tons: "targeting-computer-is", slots: "targeting-computer-is", availability: [{ from: 3062 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "backhoe-is", name: "Backhoe", tons: 5, slots: 6, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "chainsaw-is", name: "Chainsaw", tons: 5, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "combine-is", name: "Combine", tons: 2.5, slots: 4, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "dual-saw-is", name: "Dual Saw", tons: 7, slots: 7, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "heavy-duty-pile-driver-is", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "mining-drill-is", name: "Mining Drill", tons: 3, slots: 4, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "rock-cutter-is", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "spot-welder-is", name: "Spot Welder", tons: 2, slots: 1, availability: [{ from: 2320 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "nail-rivet-gun-is", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, availability: [{ from: 2310 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "inner-sphere", cite: { book: "TechManual", page: 345 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "wrecking-ball-is", name: "Wrecking Ball", tons: 4, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "inner-sphere", cite: { book: "TechManual", page: 344 }, checked: "page" },
    items: [
      // Industrial equipment a BattleMech may mount (Inner Sphere)
      { id: "salvage-arm-is", name: "Salvage Arm", tons: 3, slots: 2, availability: [{ from: 2415 }], locations: ["LA", "RA"] },
      { id: "sprayer-is", name: "Sprayer", tons: 0.5, slots: 1, availability: [{ from: 2300 }] },
      { id: "light-fluid-suction-system-is", name: "Light Fluid Suction System", tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
      { id: "remote-sensor-dispenser-is", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, availability: [{ from: 2200 }] },
      { id: "lift-hoist-is", name: "Lift Hoist", tons: 3, slots: 3, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"] },
      { id: "bridgelayer-light-is", name: "Bridgelayer (Light)", aliases: ["Light Bridgelayer"], tons: 1, slots: 2, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
      { id: "bridgelayer-medium-is", name: "Bridgelayer (Medium)", aliases: ["Medium Bridgelayer"], tons: 2, slots: 4, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
      { id: "bridgelayer-heavy-is", name: "Bridgelayer (Heavy)", aliases: ["Heavy Bridgelayer"], tons: 6, slots: 12, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
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
      { id: "active-probe-clan", name: "Active Probe", tons: 1, slots: 1, availability: [{ from: 2832 }] },
      { id: "light-active-probe-clan", name: "Light Active Probe", tons: 0.5, slots: 1, availability: [{ from: 2900 }] },
      { id: "ecm-suite-clan", name: "ECM Suite", tons: 1, slots: 1, availability: [{ from: 2832 }] },
      { id: "machine-gun-array-clan", name: "Machine Gun Array", tons: 0.25, slots: 1, availability: [{ from: 3069 }], needs: "machine-gun" },
      { id: "light-tag-clan", name: "Light TAG", tons: 0.5, slots: 1, availability: [{ from: 3054 }] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 343 }, checked: "page", yearsInferred: true },
    items: [
      // Electronics, CASE and fire control (Clan)
      { id: "tag-clan", name: "TAG", tons: 1, slots: 1, availability: [{ from: 2600 }] },
      // Artemis IV (Clan); weight and slots are derived, see the file header
      { id: "artemis-iv-clan", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2598 }], needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 210 }, checked: "page" },
    items: [
      // Clan CASE: weightless, no critical slot (p. 210 text); the Clan table does not list it
      { id: "case-clan", name: "CASE", tons: 0, slots: 0, availability: [{ from: 2825 }], checked: "text" },
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
      { id: "targeting-computer-clan", name: "Targeting Computer", tons: "targeting-computer-clan", slots: "targeting-computer-clan", availability: [{ from: 2860 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "backhoe-clan", name: "Backhoe", tons: 5, slots: 6, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "chainsaw-clan", name: "Chainsaw", tons: 5, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "combine-clan", name: "Combine", tons: 2.5, slots: 4, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "dual-saw-clan", name: "Dual Saw", tons: 7, slots: 7, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "heavy-duty-pile-driver-clan", name: "Heavy Duty Pile-Driver", aliases: ["Pile Driver"], tons: 10, slots: 8, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "mining-drill-clan", name: "Mining Drill", tons: 3, slots: 4, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "rock-cutter-clan", name: "Rock-Cutter", aliases: ["Rock Cutter"], tons: 5, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "spot-welder-clan", name: "Spot Welder", tons: 2, slots: 1, availability: [{ from: 2320 }], locations: ["LA", "RA", "LT", "RT"] },
      { id: "nail-rivet-gun-clan", name: "Nail/Rivet Gun", aliases: ["Nail Gun", "Rivet Gun"], tons: 0.5, slots: 1, availability: [{ from: 2310 }] },
    ],
  },
  {
    defaults: { kind: "weapon", techBase: "clan", cite: { book: "TechManual", page: 345 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "wrecking-ball-clan", name: "Wrecking Ball", tons: 4, slots: 5, availability: [{ from: 1950 }], locations: ["LA", "RA"] },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 344 }, checked: "page", yearsInferred: true },
    items: [
      // Industrial equipment a BattleMech may mount (Clan)
      { id: "salvage-arm-clan", name: "Salvage Arm", tons: 3, slots: 2, availability: [{ from: 2415 }], locations: ["LA", "RA"] },
      { id: "sprayer-clan", name: "Sprayer", tons: 0.5, slots: 1, availability: [{ from: 2300 }] },
      { id: "light-fluid-suction-system-clan", name: "Light Fluid Suction System", tons: 0.5, slots: 1, availability: [{ from: 1950 }] },
      { id: "remote-sensor-dispenser-clan", name: "Remote Sensor Dispenser", tons: 0.5, slots: 1, availability: [{ from: 2200 }] },
      { id: "lift-hoist-clan", name: "Lift Hoist", tons: 3, slots: 3, availability: [{ from: 1950 }], locations: ["LA", "RA", "CT", "LT", "RT"] },
      { id: "bridgelayer-light-clan", name: "Bridgelayer (Light)", aliases: ["Light Bridgelayer"], tons: 1, slots: 2, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
      { id: "bridgelayer-medium-clan", name: "Bridgelayer (Medium)", aliases: ["Medium Bridgelayer"], tons: 2, slots: 4, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
      { id: "bridgelayer-heavy-clan", name: "Bridgelayer (Heavy)", aliases: ["Heavy Bridgelayer"], tons: 6, slots: 12, availability: [{ from: 1950 }], locations: ["CT", "LT", "RT"] },
    ],
  },
];
