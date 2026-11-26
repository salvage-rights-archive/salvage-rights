// The sixteen 'Mechs of the BattleTech: Gothic box as figures (gothic-design s.5.3), each typed from its sheet in the Deluxe Record
// Sheets (cited by PDF page index: the sheets print no page numbers, and indices 17-32 repeat 1-16). The sheets are flagged "Permission
// to photocopy for personal use"; we ship only the figures and the sheet's own names for 'Mech and weapons, never its pictures,
// text, logos or artwork, and no flavour text. Every design is an ordinary TechManual design (Inner Sphere, standard engine, standard
// armor, single heat sinks, standard structure except the PXH-1T's endo steel), so the rules check, Battle Value and record sheet
// read it as any record. The printed Battle Value is kept in `source` beside ours, and `source.baseline` is the design as typed, so
// "changed since" works as for a Mordel import.
//
// How a design is read from its sheet: armor from the diagram (front, and rear for a torso); critical slots in sheet order (slot 0 is
// the sheet's slot 1), the Roll Again cells left empty and the fixed cells (actuators, engine, gyro, cockpit, life support, sensors)
// left to the layout; the arm's actuators from the two or three cells before the first weapon; heat sinks beyond the engine's, jump
// jets, endo steel, ammunition bins (one ton each) and rear-facing weapons "(R)" as mounts. Placements are written as
// [catalog id, first slot, how many, slots each, rear]; the endo steel cells are the id "endo".
//
// Light Blazer: its weight is inferred (1.5 tons, conflict 37) and no Battle Value is printed for it; see the catalog row. The three
// designs that carry it keep their printed Battle Value regardless.
//
// KGC-0000: each AC/20 is split across a torso and an arm on its sheet (rows LT/LA and RT/RA), and our mounts have one location with
// no split support (split mounts are Classic construction work). Each AC/20 is placed in the arm, where eight of its ten slots sit, so
// the rules check reports the slots it overflows there. That finding is expected until split mounts are built.
import type { Catalog } from "../rules/catalog";
import type { LocationCode, MechRecord, Mount, SourceBaseline } from "../rules/mech";
import type { RulesLevel } from "./chassis";
import { STRUCTURE_TYPES } from "./chassis";
import { GOTHIC_SHEETS } from "./gothic";

/** [catalog id, first slot, count (default 1), slots each (default 1), rear (default false)]. */
type Place = readonly [id: string, slot: number, count?: number, step?: number, rear?: true];

export interface BoxSpec {
  /** The sheet's PDF page index. */
  pdf: number;
  chassis: string;
  model: string;
  tons: number;
  configuration: "biped" | "quad";
  engine: number;
  structure: "standard" | "endo-steel";
  /** The rules level the sheet prints; "licensed-noncanon" is the sheets' "Unofficial". */
  level: RulesLevel;
  /** All heat sinks, those in the engine included. */
  heatSinks: number;
  /** The Battle Value the sheet prints. */
  printedBv: number;
  armor: MechRecord["armor"];
  arms?: MechRecord["arms"];
  mounts: Partial<Record<LocationCode, readonly Place[]>>;
}

export const GOTHIC_BOX_YEAR = 3015;
export const GOTHIC_BOX_ERA = "gothic-endless-war";

export const GOTHIC_BOX_SPECS: BoxSpec[] = [
  {
    pdf: 1,
    chassis: "UrbanMech",
    model: "UM-R60",
    tons: 30,
    configuration: "biped",
    engine: 60,
    structure: "standard",
    level: "introductory",
    heatSinks: 11,
    printedBv: 504,
    armor: { HD: { front: 9 }, CT: { front: 11, rear: 8 }, LT: { front: 8, rear: 4 }, RT: { front: 8, rear: 4 }, LA: { front: 10 }, RA: { front: 10 }, LL: { front: 12 }, RL: { front: 12 } },
    arms: { LA: { lowerArm: false, hand: false }, RA: { lowerArm: false, hand: false } },
    mounts: {
      HD: [["heat-sink-is", 3]],
      CT: [["jump-jet-is", 10, 2]],
      LA: [["small-laser-is", 2]],
      LT: [["heat-sink-is", 0, 2]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["ac-10-is", 2]],
      RT: [["heat-sink-is", 0, 2], ["ammo-ac-10-is", 2]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 2,
    chassis: "UrbanMech",
    model: "UM-R60B",
    tons: 30,
    configuration: "biped",
    engine: 60,
    structure: "standard",
    level: "standard",
    heatSinks: 12,
    printedBv: 598,
    armor: { HD: { front: 9 }, CT: { front: 11, rear: 8 }, LT: { front: 9, rear: 5 }, RT: { front: 7, rear: 5 }, LA: { front: 10 }, RA: { front: 10 }, LL: { front: 14 }, RL: { front: 14 } },
    arms: { LA: { lowerArm: false, hand: false }, RA: { lowerArm: false, hand: false } },
    mounts: {
      CT: [["jump-jet-is", 10, 2]],
      LA: [["heavy-machine-gun-is", 2, 2], ["ammo-heavy-machine-gun-is", 4]],
      LT: [["heat-sink-is", 0, 3]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["binary-laser-is", 2]],
      RT: [["heat-sink-is", 0, 3]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 3,
    chassis: "Firestarter",
    model: "FS9-H",
    tons: 35,
    configuration: "biped",
    engine: 210,
    structure: "standard",
    level: "introductory",
    heatSinks: 10,
    printedBv: 694,
    armor: { HD: { front: 9 }, CT: { front: 13, rear: 6 }, LT: { front: 11, rear: 5 }, RT: { front: 11, rear: 5 }, LA: { front: 6 }, RA: { front: 6 }, LL: { front: 8 }, RL: { front: 8 } },
    arms: { LA: { lowerArm: true, hand: false }, RA: { lowerArm: true, hand: false } },
    mounts: {
      CT: [["flamer-is", 10], ["flamer-is", 11, 1, 1, true]],
      LA: [["medium-laser-is", 3], ["flamer-is", 4]],
      LT: [["jump-jet-is", 0, 3], ["machine-gun-is", 3]],
      LL: [["heat-sink-is", 4]],
      RA: [["medium-laser-is", 3], ["flamer-is", 4]],
      RT: [["jump-jet-is", 0, 3], ["machine-gun-is", 3], ["ammo-machine-gun-is", 4]],
      RL: [["heat-sink-is", 4]],
    },
  },
  {
    pdf: 4,
    chassis: "Firestarter",
    model: "FS9-HB",
    tons: 35,
    configuration: "biped",
    engine: 210,
    structure: "standard",
    level: "licensed-noncanon",
    heatSinks: 11,
    printedBv: 1067,
    armor: { HD: { front: 9 }, CT: { front: 13, rear: 6 }, LT: { front: 11, rear: 5 }, RT: { front: 11, rear: 5 }, LA: { front: 6 }, RA: { front: 6 }, LL: { front: 8 }, RL: { front: 8 } },
    arms: { LA: { lowerArm: true, hand: false }, RA: { lowerArm: true, hand: false } },
    mounts: {
      HD: [["heat-sink-is", 3]],
      CT: [["flamer-is", 10], ["flamer-is", 11, 1, 1, true]],
      LA: [["light-blazer-gothic", 3], ["flamer-is", 5]],
      LT: [["jump-jet-is", 0, 3]],
      LL: [["heat-sink-is", 4]],
      RA: [["light-blazer-gothic", 3], ["flamer-is", 5]],
      RT: [["jump-jet-is", 0, 3]],
      RL: [["heat-sink-is", 4]],
    },
  },
  {
    pdf: 5,
    chassis: "Scorpion",
    model: "SCP-1N",
    tons: 55,
    configuration: "quad",
    engine: 330,
    structure: "standard",
    level: "introductory",
    heatSinks: 10,
    printedBv: 1019,
    armor: { HD: { front: 8 }, CT: { front: 24, rear: 8 }, LT: { front: 11, rear: 5 }, RT: { front: 11, rear: 5 }, FLL: { front: 10 }, FRL: { front: 10 }, RLL: { front: 10 }, RRL: { front: 10 } },
    mounts: {
      LT: [["ammo-srm-6-is", 0]],
      RT: [["ppc-is", 0], ["srm-6-is", 3]],
    },
  },
  {
    pdf: 6,
    chassis: "Scorpion",
    model: "SCP-1B",
    tons: 55,
    configuration: "quad",
    engine: 275,
    structure: "standard",
    level: "standard",
    heatSinks: 14,
    printedBv: 1074,
    armor: { HD: { front: 8 }, CT: { front: 24, rear: 8 }, LT: { front: 11, rear: 5 }, RT: { front: 11, rear: 5 }, FLL: { front: 10 }, FRL: { front: 10 }, RLL: { front: 10 }, RRL: { front: 10 } },
    mounts: {
      FLL: [["heat-sink-is", 4]],
      LT: [["srm-6-is", 0], ["ammo-srm-6-is", 2, 2]],
      RLL: [["heat-sink-is", 4]],
      RT: [["binary-laser-is", 0], ["srm-6-is", 4]],
      RRL: [["heat-sink-is", 4]],
    },
  },
  {
    pdf: 7,
    chassis: "Phoenix Hawk",
    model: "PXH-1",
    tons: 45,
    configuration: "biped",
    engine: 270,
    structure: "standard",
    level: "introductory",
    heatSinks: 10,
    printedBv: 1041,
    armor: { HD: { front: 6 }, CT: { front: 23, rear: 5 }, LT: { front: 18, rear: 4 }, RT: { front: 18, rear: 4 }, LA: { front: 10 }, RA: { front: 10 }, LL: { front: 15 }, RL: { front: 15 } },
    mounts: {
      CT: [["ammo-machine-gun-is", 10]],
      LA: [["medium-laser-is", 4], ["machine-gun-is", 5]],
      LT: [["jump-jet-is", 0, 3]],
      RA: [["large-laser-is", 4], ["medium-laser-is", 6], ["machine-gun-is", 7]],
      RT: [["jump-jet-is", 0, 3]],
    },
  },
  {
    pdf: 8,
    chassis: "Phoenix Hawk",
    model: "PXH-1T",
    tons: 45,
    configuration: "biped",
    engine: 270,
    structure: "endo-steel",
    level: "standard",
    heatSinks: 10,
    printedBv: 1062,
    armor: { HD: { front: 6 }, CT: { front: 23, rear: 5 }, LT: { front: 18, rear: 4 }, RT: { front: 18, rear: 4 }, LA: { front: 10 }, RA: { front: 10 }, LL: { front: 15 }, RL: { front: 15 } },
    mounts: {
      CT: [["srm-6-is", 10]],
      LA: [["medium-laser-is", 4, 2]],
      LT: [["jump-jet-is", 0, 3], ["ammo-srm-6-is", 3], ["endo", 4, 5]],
      LL: [["endo", 4, 2]],
      RA: [["medium-laser-is", 4, 2], ["sword-is", 6]],
      RT: [["jump-jet-is", 0, 3], ["endo", 3, 5]],
      RL: [["endo", 4, 2]],
    },
  },
  {
    pdf: 9,
    chassis: "Rifleman",
    model: "RFL-3N",
    tons: 60,
    configuration: "biped",
    engine: 240,
    structure: "standard",
    level: "introductory",
    heatSinks: 10,
    printedBv: 1039,
    armor: { HD: { front: 6 }, CT: { front: 22, rear: 4 }, LT: { front: 15, rear: 2 }, RT: { front: 15, rear: 2 }, LA: { front: 15 }, RA: { front: 15 }, LL: { front: 12 }, RL: { front: 12 } },
    arms: { LA: { lowerArm: false, hand: false }, RA: { lowerArm: false, hand: false } },
    mounts: {
      CT: [["ammo-ac-5-is", 10]],
      LA: [["large-laser-is", 2], ["ac-5-is", 4]],
      LT: [["medium-laser-is", 0]],
      LL: [["heat-sink-is", 4]],
      RA: [["large-laser-is", 2], ["ac-5-is", 4]],
      RT: [["medium-laser-is", 0]],
    },
  },
  {
    pdf: 10,
    chassis: "Rifleman",
    model: "RFL-3B",
    tons: 60,
    configuration: "biped",
    engine: 240,
    structure: "standard",
    level: "standard",
    heatSinks: 20,
    printedBv: 1187,
    armor: { HD: { front: 9 }, CT: { front: 19, rear: 10 }, LT: { front: 15, rear: 7 }, RT: { front: 15, rear: 7 }, LA: { front: 14 }, RA: { front: 14 }, LL: { front: 13 }, RL: { front: 13 } },
    arms: { LA: { lowerArm: false, hand: false }, RA: { lowerArm: false, hand: false } },
    mounts: {
      CT: [["heat-sink-is", 10]],
      LA: [["binary-laser-is", 2]],
      LT: [["heat-sink-is", 0, 3]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["binary-laser-is", 2]],
      RT: [["heat-sink-is", 0, 3]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 11,
    chassis: "Marauder",
    model: "MAD-3R",
    tons: 75,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "introductory",
    heatSinks: 16,
    printedBv: 1363,
    armor: { HD: { front: 9 }, CT: { front: 35, rear: 10 }, LT: { front: 17, rear: 8 }, RT: { front: 17, rear: 8 }, LA: { front: 22 }, RA: { front: 22 }, LL: { front: 18 }, RL: { front: 18 } },
    arms: { LA: { lowerArm: true, hand: false }, RA: { lowerArm: true, hand: false } },
    mounts: {
      LA: [["ppc-is", 3], ["medium-laser-is", 6]],
      LT: [["ammo-ac-5-is", 0]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["ppc-is", 3], ["medium-laser-is", 6]],
      RT: [["ac-5-is", 0]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 12,
    chassis: "Marauder",
    model: "MAD-3H",
    tons: 75,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "licensed-noncanon",
    heatSinks: 20,
    printedBv: 1735,
    armor: { HD: { front: 9 }, CT: { front: 33, rear: 10 }, LT: { front: 20, rear: 10 }, RT: { front: 20, rear: 10 }, LA: { front: 24 }, RA: { front: 24 }, LL: { front: 28 }, RL: { front: 28 } },
    arms: { RA: { lowerArm: true, hand: false } },
    mounts: {
      CT: [["heat-sink-is", 10, 2]],
      LA: [["mace-is", 4]],
      LT: [["heat-sink-is", 0], ["light-blazer-gothic", 1, 2, 2]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["large-laser-is", 3]],
      RT: [["heat-sink-is", 0], ["light-blazer-gothic", 1, 2, 2]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 13,
    chassis: "Atlas",
    model: "AS7-D",
    tons: 100,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "introductory",
    heatSinks: 20,
    printedBv: 1897,
    armor: { HD: { front: 9 }, CT: { front: 47, rear: 14 }, LT: { front: 32, rear: 10 }, RT: { front: 32, rear: 10 }, LA: { front: 34 }, RA: { front: 34 }, LL: { front: 41 }, RL: { front: 41 } },
    mounts: {
      HD: [["heat-sink-is", 3]],
      CT: [["medium-laser-is", 10, 2, 1, true]],
      LA: [["heat-sink-is", 4], ["medium-laser-is", 5]],
      LT: [["heat-sink-is", 0], ["lrm-20-is", 1], ["srm-6-is", 6], ["ammo-srm-6-is", 8], ["ammo-lrm-20-is", 9, 2]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["heat-sink-is", 4], ["medium-laser-is", 5]],
      RT: [["ac-20-is", 0], ["ammo-ac-20-is", 10, 2]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 14,
    chassis: "Atlas",
    model: "AS7-H",
    tons: 100,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "introductory",
    heatSinks: 23,
    printedBv: 1869,
    armor: { HD: { front: 9 }, CT: { front: 47, rear: 14 }, LT: { front: 32, rear: 10 }, RT: { front: 32, rear: 10 }, LA: { front: 34 }, RA: { front: 34 }, LL: { front: 41 }, RL: { front: 41 } },
    mounts: {
      CT: [["heat-sink-is", 10, 2]],
      LA: [["large-laser-is", 4]],
      LT: [["heat-sink-is", 0, 2], ["large-laser-is", 2], ["srm-6-is", 4], ["lrm-10-is", 6], ["ammo-lrm-10-is", 8], ["ammo-srm-6-is", 9]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["medium-laser-is", 4], ["hatchet-is", 5]],
      RT: [["heat-sink-is", 0, 3], ["large-laser-is", 3]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
  {
    pdf: 15,
    chassis: "King Crab",
    model: "KGC-0000",
    tons: 100,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "introductory",
    heatSinks: 15,
    printedBv: 1810,
    armor: { HD: { front: 9 }, CT: { front: 39, rear: 12 }, LT: { front: 29, rear: 10 }, RT: { front: 29, rear: 10 }, LA: { front: 33 }, RA: { front: 33 }, LL: { front: 34 }, RL: { front: 34 } },
    mounts: {
      CT: [["heat-sink-is", 10]],
      LA: [["ac-20-is", 4]],
      LT: [["lrm-15-is", 2], ["ammo-lrm-15-is", 5], ["ammo-ac-20-is", 6]],
      LL: [["heat-sink-is", 4]],
      RA: [["ac-20-is", 4]],
      RT: [["large-laser-is", 2], ["ammo-ac-20-is", 4]],
      RL: [["heat-sink-is", 4]],
    },
  },
  {
    pdf: 16,
    chassis: "King Crab",
    model: "KGC-0KP",
    tons: 100,
    configuration: "biped",
    engine: 300,
    structure: "standard",
    level: "licensed-noncanon",
    heatSinks: 22,
    printedBv: 1986,
    armor: { HD: { front: 9 }, CT: { front: 35, rear: 12 }, LT: { front: 29, rear: 10 }, RT: { front: 29, rear: 10 }, LA: { front: 30 }, RA: { front: 30 }, LL: { front: 31 }, RL: { front: 31 } },
    mounts: {
      CT: [["jump-jet-is", 10, 2]],
      LA: [["ppc-is", 4], ["light-blazer-gothic", 7]],
      LT: [["heat-sink-is", 0, 6]],
      LL: [["heat-sink-is", 4, 2]],
      RA: [["ppc-is", 4], ["light-blazer-gothic", 7]],
      RT: [["ac-20-is", 0], ["ammo-ac-20-is", 10, 2]],
      RL: [["heat-sink-is", 4, 2]],
    },
  },
];

/** The id of a box design's record: stable, so a saved copy can say which design it started from. */
export const boxId = (spec: Pick<BoxSpec, "model">): string => `gothic-box-${spec.model.toLowerCase()}`;

/** The sixteen records. The catalog supplies each mount's name; a placement it does not know keeps its id as its name. */
export function gothicBoxMechs(catalog: Catalog): MechRecord[] {
  return GOTHIC_BOX_SPECS.map((spec) => {
    const mounts: Mount[] = [];
    const made = new Map<string, number>();
    for (const [location, places] of Object.entries(spec.mounts) as [LocationCode, readonly Place[]][]) {
      for (const [id, first, count = 1, step = 1, rear] of places) {
        for (let i = 0; i < count; i++) {
          const n = (made.get(id) ?? 0) + 1;
          made.set(id, n);
          const at = { location, slot: first + i * step, techBase: "inner-sphere" as const };
          if (id === "endo") mounts.push({ id: `structure-${n}`, equipmentId: null, part: "structure", name: STRUCTURE_TYPES.types["endo-steel"]?.name ?? "Endo Steel", ...at });
          else mounts.push({ id: `${id}-${n}`, equipmentId: id, name: catalog.byId(id)?.name ?? id, ...at, ...(rear ? { rear } : {}) });
        }
      }
    }
    const body: SourceBaseline = {
      name: { chassis: spec.chassis, model: spec.model },
      notes: {},
      tons: spec.tons,
      year: GOTHIC_BOX_YEAR,
      techBase: "inner-sphere",
      configuration: spec.configuration,
      chassis: {
        engine: { type: "standard", rating: spec.engine },
        gyro: "standard",
        cockpit: "standard",
        structure: spec.structure,
        armorType: "standard",
        myomer: "standard",
        heatSinks: { type: "single", count: spec.heatSinks },
      },
      armor: spec.armor,
      ...(spec.arms ? { arms: spec.arms } : {}),
      mounts,
    };
    return {
      schema: 1,
      id: boxId(spec),
      editionId: "gothic",
      era: GOTHIC_BOX_ERA,
      rulesLevel: spec.level,
      ...structuredClone(body),
      source: { kind: "book", cite: { book: GOTHIC_SHEETS, page: spec.pdf }, values: { battleValue: spec.printedBv }, baseline: structuredClone(body) },
    };
  });
}
