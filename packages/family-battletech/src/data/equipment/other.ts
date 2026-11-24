// Heat sinks, jump jets and other mounted equipment, from TechManual (corrected sixth printing, errata v8.0).
//
// Heat sinks carry tons: 0 because weights() in rules/mech.ts already counts heat sink weight from the chassis heat sink
// count; counting it again per mount would double it. Slots are the Heat Sinks table (printed p. 54). Dates are the item
// entries on pp. 220-221 (single: circa 2022; double: introduced 2567, extinct 2865 for the Inner Sphere, recovered 3040).
// The Clan double heat sink has no Clan date of its own in the book, so it starts at the same introduction year and has no
// extinction: the entry gives extinction for the Inner Sphere only.
//
// Jump jets: weight depends on the 'Mech's tonnage (Jump Jets table, printed p. 51); the "jump-jet" formula in
// rules/catalog.ts is that table. Date from p. 225 (introduced 2471); the Clan row uses it as well, the entry gives one
// date for both. Improved jump jets are not tabulated: the book gives only a Clan Wolf date (p. 225).
//
// MASC: a percentage of the 'Mech's tonnage, rounded normally, for both weight and slots (printed p. 52, with the errata
// to the rounding); dates from p. 232, the Clan row starting at the same year with no extinction.
//
// Artemis IV: the book lists launchers with Artemis built in. Every one of the 22 pairs (launcher, launcher + Artemis IV)
// on pp. 341-343 differs by exactly 1 ton and 1 critical slot, which is what a BattleMech installs separately (p. 207), so
// that is the row's weight and slots; the row is checked "text" because the figures are derived, not printed. It needs its
// launcher in the same location. Dates are the Artemis IV line of the table on p. 291.
//
// Not tabulated: the Targeting Computer (its weight follows the other weapons mounted, and this table has no weapon class
// to compute it from), Triple-Strength Myomer (the book gives 6 slots and no weight; whether a record lists it as one mount
// or six is for the importer to settle), Clan CASE (the Clan table lists none), and the Industrial Equipment table.
// Conventions for years are the same as in weapons.ts.

import type { EquipmentGroup } from "../../rules/catalog";

export const OTHER: EquipmentGroup[] = [
  {
    defaults: { kind: "heat-sink", techBase: "inner-sphere", cite: { book: "TechManual", page: 54 }, checked: "page" },
    items: [
      // Heat sinks (Inner Sphere)
      { id: "heat-sink-is", name: "Heat Sink", aliases: ["Single Heat Sink", "Standard Heat Sink"], tons: 0, slots: 1, availability: [{ from: 2022 }] },
      { id: "double-heat-sink-is", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], tons: 0, slots: 3, availability: [{ from: 2567, to: 2865 }, { from: 3040 }] },
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
    ],
  },
  {
    defaults: { kind: "heat-sink", techBase: "clan", cite: { book: "TechManual", page: 54 }, checked: "page" },
    items: [
      // Heat sinks (Clan)
      { id: "heat-sink-clan", name: "Heat Sink", aliases: ["Single Heat Sink", "Standard Heat Sink"], tons: 0, slots: 1, availability: [{ from: 2022 }] },
      { id: "double-heat-sink-clan", name: "Double Heat Sink", aliases: ["Double Heat Sinks"], tons: 0, slots: 2, availability: [{ from: 2567 }] },
    ],
  },
  {
    defaults: { kind: "jump-jet", techBase: "clan", cite: { book: "TechManual", page: 51 }, checked: "page" },
    items: [
      // Jump jets (Clan)
      { id: "jump-jet-clan", name: "Jump Jet", aliases: ["Jump Jets"], tons: "jump-jet", slots: 1, availability: [{ from: 2471 }], locations: ["CT", "LT", "RT", "LL", "RL", "FLL", "FRL", "RLL", "RRL"] },
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
      { id: "tag-clan", name: "TAG", tons: 1, slots: 1, availability: [{ from: 2600 }] },
      { id: "light-tag-clan", name: "Light TAG", tons: 0.5, slots: 1, availability: [{ from: 3054 }] },
      // Artemis IV (Clan); weight and slots are derived, see the file header
      { id: "artemis-iv-clan", name: "Artemis IV", aliases: ["Artemis IV FCS", "Artemis IV Fire-Control System"], tons: 1, slots: 1, availability: [{ from: 2598 }], needs: "launcher", checked: "text" },
    ],
  },
  {
    defaults: { kind: "other", techBase: "clan", cite: { book: "TechManual", page: 52 }, checked: "page" },
    items: [
      // MASC (Clan); weight and slots are a share of the 'Mech's tonnage
      { id: "masc-clan", name: "MASC", aliases: ["Myomer Accelerator Signal Circuitry"], tons: "masc-clan", slots: "masc-clan", availability: [{ from: 2740 }] },
    ],
  },
];
