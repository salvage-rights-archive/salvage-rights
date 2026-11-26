// Special abilities a converted 'Mech can earn from its equipment, armor, structure, engine and cockpit: Alpha Strike Companion (ASC)
// "Converting Special Equipment to Special Abilities" pp. 116-133, with the errata v1.6 where it changes a rule (the rows say so).
// Figures, identifiers and page numbers only, each read against the page image; the rules that use them are in
// rules/as-convert-specials.ts. The ids are our catalog's ids (equipment) and the chassis tables' keys (armor, engine, cockpit).
import type { AscCite } from "./as-convert";

const sp = (page: number, errata = false): AscCite => (errata ? { book: "Alpha Strike Companion", page, errata: "v1.6", checked: "page" } : { book: "Alpha Strike Companion", page, checked: "page" });

export interface EquipmentSpecial {
  code: string;
  /** What earns it (our words). */
  because: string;
  /** Catalog ids; one of them listed is enough, unless `perItem` counts them. */
  ids: string[];
  /** The special's number is how many of the items the unit carries (written without the number for one when `numberFromTwo`). */
  count?: "always" | "numberFromTwo";
  /** Items the conversion rule counts twice (the errata's mine dispensers). */
  each?: number;
  cite: AscCite;
}

const both = (stems: string[]) => stems.flatMap((s) => [`${s}-is`, `${s}-clan`]);

/** Specials earned by carrying an item. A special named twice by two items (PRB and RCN from a probe) is written once. */
export const EQUIPMENT_SPECIALS: EquipmentSpecial[] = [
  { code: "AMS", because: "anti-missile system or laser anti-missile system", ids: both(["ams", "laser-anti-missile-system"]), cite: sp(117) },
  { code: "BRID", because: "a bridgelayer", ids: both(["bridgelayer-light", "bridgelayer-medium", "bridgelayer-heavy"]), cite: sp(121) },
  { code: "BT", because: "a booby trap", ids: ["booby-trap-is"], cite: sp(121) },
  { code: "C3BSM", because: "C3 boosted master", ids: ["c3-boosted-master-is"], count: "numberFromTwo", cite: sp(121) },
  { code: "C3BSS", because: "C3 boosted slave", ids: ["c3-boosted-slave-is"], count: "numberFromTwo", cite: sp(121) },
  { code: "C3EM", because: "C3 emergency master", ids: ["c3-emergency-master-is"], count: "numberFromTwo", cite: sp(121, true) },
  { code: "C3M", because: "C3 master", ids: ["c3-computer-master-is"], count: "numberFromTwo", cite: sp(121) },
  { code: "C3RS", because: "C3 remote sensor launcher", ids: ["c3-remote-sensor-launcher-is"], cite: sp(121) },
  { code: "C3S", because: "C3 slave or C3 emergency master", ids: ["c3-computer-slave-is", "c3-emergency-master-is"], cite: sp(121, true) },
  { code: "C3I", because: "improved C3 computer", ids: ["improved-c3-computer-is"], cite: sp(121) },
  { code: "CASEII", because: "CASE II", ids: both(["case-ii"]), cite: sp(122) },
  { code: "CASEP", because: "prototype CASE", ids: ["prototype-case-is"], cite: sp(129) },
  { code: "DCC", because: "a drone command console", ids: ["remote-drone-command-console-is"], count: "always", cite: sp(123) },
  { code: "DJ", because: "a RISC viral decoy jammer", ids: ["risc-viral-jammer-decoy-is"], cite: sp(130) },
  { code: "DRO", because: "a drone operating system", ids: both(["drone-operating-system"]), cite: sp(123) },
  { code: "ECM", because: "an ECM suite, electronic warfare equipment, or a Nova or Watchdog system", ids: ["guardian-ecm-suite-is", "prototype-guardian-ecm-suite-is", "ecm-suite-clan", "electronic-warfare-equipment-is", "nova-cews-clan", "watchdog-cews-clan"], cite: sp(123) },
  { code: "AECM", because: "an Angel ECM suite", ids: both(["angel-ecm"]), cite: sp(117) },
  { code: "ECS", because: "a RISC emergency coolant system", ids: ["risc-emergency-coolant-system-is"], cite: sp(130) },
  { code: "ENG", because: "an engineering tool (bulldozer, backhoe, pile-driver, mining drill, rock cutter, wrecking ball)", ids: both(["bulldozer", "backhoe", "heavy-duty-pile-driver", "mining-drill", "rock-cutter", "wrecking-ball"]), cite: sp(123) },
  { code: "HJ", because: "a RISC viral homing jammer", ids: ["risc-viral-jammer-homing-is"], cite: sp(130) },
  { code: "I-TSM", because: "industrial triple-strength myomer", ids: ["industrial-tsm-is"], cite: sp(125) },
  { code: "INARC", because: "an improved Narc launcher", ids: ["improved-narc-launcher-is"], count: "numberFromTwo", cite: sp(125, true) },
  { code: "CNARC", because: "a compact Narc launcher", ids: [], count: "numberFromTwo", cite: sp(128, true) },
  { code: "LPRB", because: "a light active probe", ids: ["light-active-probe-clan"], cite: sp(126, true) },
  { code: "LTAG", because: "a light TAG", ids: ["light-tag-clan"], cite: sp(126) },
  { code: "MAS", because: "a Void-Signature System", ids: ["void-signature-system-is"], cite: sp(127, true) },
  { code: "MDS", because: "mine dispensers", ids: both(["vehicular-mine-dispenser"]), count: "always", each: 2, cite: sp(127, true) },
  { code: "MTAS", because: "a 'Mech taser", ids: ["taser-is"], count: "always", cite: sp(132) },
  { code: "NOVA", because: "a Nova composite EW system", ids: ["nova-cews-clan"], cite: sp(128) },
  { code: "PRB", because: "an active probe (Beagle or Clan), or a Nova or Watchdog system's", ids: ["beagle-active-probe-is", "prototype-beagle-active-probe-is", "active-probe-clan"], cite: sp(117) },
  { code: "RHS", because: "a radical heat sink system", ids: ["radical-heat-sink-is"], cite: sp(129) },
  { code: "RSD", because: "remote sensor dispensers", ids: both(["remote-sensor-dispenser"]).concat(["prototype-remote-sensors-is"]), count: "always", cite: sp(130) },
  { code: "SAW", because: "a chainsaw, dual saw or retractable blade", ids: both(["chainsaw", "dual-saw", "retractable-blade"]), cite: sp(130) },
  { code: "SHLD", because: "a BattleMech shield", ids: ["shield-small-is", "shield-medium-is", "shield-large-is"], cite: sp(120) },
  { code: "SNARC", because: "a standard Narc launcher", ids: ["narc-missile-beacon-is", "narc-missile-beacon-clan", "prototype-narc-missile-beacon-is"], count: "numberFromTwo", cite: sp(128, true) },
  { code: "TAG", because: "a TAG, prototype TAG, or a C3 master (boosted or not)", ids: ["tag-is", "tag-clan", "prototype-tag-is", "c3-computer-master-is", "c3-boosted-master-is"], cite: sp(132, true) },
  { code: "TSM", because: "triple-strength myomer", ids: ["tsm-is"], cite: sp(132) },
  { code: "TSMX", because: "prototype triple-strength myomer", ids: ["prototype-triple-strength-myomer-is"], cite: sp(129) },
  { code: "TSEMP", because: "TSEMP cannons", ids: ["tsemp-cannon-is", "risc-repeating-tsemp-cannon-is"], count: "always", cite: sp(132) },
  { code: "TSEMP-O", because: "one-shot TSEMP weapons", ids: ["tsemp-one-shot-is"], count: "always", cite: sp(132) },
  { code: "UMU", because: "underwater maneuvering units", ids: both(["umu"]), cite: sp(133) },
];

/** Equipment that adds a second special beside its own: probes add Recon (pp. 117, 121, 128), a Watchdog adds LPRB, ECM and RCN (p. 133),
 * a Nova adds PRB and ECM (p. 128), a remote sensor dispenser adds RCN (errata v1.6, p. 130). */
export const ALSO_EARNS: { from: string[]; adds: string[]; cite: AscCite }[] = [
  { from: ["bloodhound-active-probe-is"], adds: ["BH", "RCN"], cite: sp(121) },
  { from: ["nova-cews-clan"], adds: ["PRB", "ECM", "RCN"], cite: sp(128) },
  { from: ["watchdog-cews-clan"], adds: ["WAT", "LPRB", "ECM", "RCN"], cite: sp(133) },
  { from: ["electronic-warfare-equipment-is"], adds: ["LPRB", "RCN"], cite: sp(126, true) },
  { from: ["beagle-active-probe-is", "prototype-beagle-active-probe-is", "active-probe-clan", "light-active-probe-clan"], adds: ["RCN"], cite: sp(130) },
  { from: both(["remote-sensor-dispenser"]), adds: ["RCN"], cite: sp(130, true) },
  { from: ["look-down-radar-is", "look-down-radar-clan", "recon-camera-is", "recon-camera-clan"], adds: ["RCN"], cite: sp(130) },
];

/** Melee items: any one earns MEL (p. 127). Shields are on the list. */
export const MELEE_IDS = [
  ...both(["backhoe", "chainsaw", "combine", "dual-saw", "heavy-duty-pile-driver", "mining-drill", "rock-cutter", "spot-welder", "wrecking-ball", "retractable-blade", "claws", "talons", "mace", "lance"]),
  "hatchet-is", "sword-is", "chain-whip-is", "flail-is", "spikes-is", "shield-small-is", "shield-medium-is", "shield-large-is", "vibroblade-small-is", "vibroblade-medium-is", "vibroblade-large-is",
];
export const MELEE_CITE = sp(127);

/** Explosive components (p. 123, errata v1.6): ammunition-fed weapons, Gauss rifles, improved heavy lasers, A-, B- and M-Pods, fuel tanks,
 * booby traps, coolant pods and the 'Mech taser. Plasma weapons and rocket launchers are not (errata). The ENE ability is for a unit with none. */
export const EXPLOSIVE = {
  weaponStems: ["gauss", "improved-heavy-laser"],
  weaponIds: both(["a-pods", "b-pods", "ams"]).concat(["m-pod-is", "taser-is"]),
  items: both(["extended-fuel-tank", "coolant-pod"]).concat(["booby-trap-is"]),
  /** Ammunition that does not count: plasma and the rocket launchers. */
  ammoNot: ["plasma"],
  cite: sp(123, true),
};

/** CASE (p. 122, errata v1.6): a Clan-technology unit with an explosive component has it; an Inner Sphere one only if it lists CASE. */
export const CASE_RULE = { ids: both(["case"]), cite: sp(122, true) };

/** Armor types that earn a defensive special when every location has them (pp. 117, 120, 122, 124, 125, 129, 130). */
export const ARMOR_SPECIALS: Record<string, { code: string; cite: AscCite }> = {
  "anti-penetrative-ablation": { code: "ABA", cite: sp(117) },
  "ballistic-reinforced": { code: "BRA", cite: sp(120) },
  hardened: { code: "CR", cite: sp(122) },
  "ferro-lamellor": { code: "CR", cite: sp(122) },
  "heat-dissipating": { code: "FR", cite: sp(124) },
  "impact-resistant": { code: "IRA", cite: sp(125) },
  reactive: { code: "RCA", cite: sp(129) },
  "reactive-clan": { code: "RCA", cite: sp(129) },
  "laser-reflective": { code: "RFA", cite: sp(130) },
  "laser-reflective-clan": { code: "RFA", cite: sp(130) },
  stealth: { code: "STL", cite: sp(131, true) },
  commercial: { code: "BAR", cite: sp(120, true) },
};
export const BAR_CITE = sp(120, true);
/** Items that give the Stealth ability (p. 131; the errata takes the Void-Signature System off the list). */
export const STEALTH_IDS = ["chameleon-lps-is", "null-signature-system-is"];

/** HarJel in the center, left and right torso (p. 120). */
export const HARJEL = { BHJ: ["harjel-is", "harjel-clan"], BHJ2: ["harjel-ii-clan"], BHJ3: ["harjel-iii-clan"], locations: ["CT", "LT", "RT"], cite: sp(120) };

/** Cockpits and engines: the Industrial cockpit is basic fire control (errata v1.6, p. 120), the AFC one is AFC (p. 117); the interface
 * cockpit is DN (p. 122); an internal combustion engine is EE and a fuel cell engine FC (p. 123). */
export const COCKPIT_SPECIALS = {
  industrial: { code: "BFC", cite: sp(120, true) },
  "industrial-afc": { code: "AFC", cite: sp(117) },
  interface: { code: "DN", cite: sp(122) },
  "interface-clan": { code: "DN", cite: sp(122) },
  "superheavy-industrial": { code: "BFC", cite: sp(120, true) },
} as Record<string, { code: string; cite: AscCite }>;
export const ENGINE_SPECIALS = { ice: { code: "EE", cite: sp(123) }, "fuel-cell": { code: "FC", cite: sp(123) } } as Record<string, { code: string; cite: AscCite }>;

/** Large unit: a 'Mech over 100 tons (p. 125). */
export const LARGE = { overTons: 100, code: "LG", cite: sp(125) };
export const OMNI_CITE = sp(128, true);
export const ENE_CITE = sp(123, true);
export const INDUSTRIAL_ENV = { seal: both(["environmental-sealing"]), cite: sp(123), soa: sp(131), soaEngines: ["standard", "xl", "xl-clan", "light", "compact", "xxl", "xxl-clan", "fission", "fuel-cell"] };

/** The Heat-Generating Weaponry Table (p. 124): the Heat Value of each weapon at Short, Medium and Long; a bracket total of 5 to 10 is 1 and
 * 11 or more is 2. Keyed by the weapon table's row name. */
export const HEAT_WEAPONS: Record<string, [number, number, number]> = {
  Flamer: [2, 0, 0],
  "Flamer (Vehicle)": [2, 0, 0],
  "Heavy Flamer": [4, 0, 0],
  "ER Flamer": [2, 2, 0],
  "Plasma Rifle": [3, 3, 0],
  "Plasma Cannon": [7, 7, 7],
};
export const HEAT_RULE = { oneAt: 5, twoAt: 11, cite: sp(124) };

/** The Mobile Headquarters Equipment Table (p. 127, errata v1.6): MHQ points by item; the sum rounds down. Communications equipment is 1 per ton. */
export const MHQ_ITEMS: { ids: string[]; points: number; perTon?: boolean }[] = [
  { ids: ["c3-boosted-master-is"], points: 6 },
  { ids: ["c3-boosted-slave-is"], points: 2 },
  { ids: ["c3-computer-master-is"], points: 5 },
  { ids: ["c3-computer-slave-is"], points: 1 },
  { ids: ["improved-c3-computer-is"], points: 2.5 },
  { ids: ["nova-cews-clan"], points: 1.5 },
  { ids: both(["communications-equipment"]), points: 1, perTon: true },
  { ids: ["cockpit-command-console-is", "cockpit-command-console-clan"], points: 1 },
];
export const MHQ_CITE = sp(127, true);

/** Artillery: the special's code by weapon (p. 111) and the page of the table. */
export const ARTILLERY_CODES: Record<string, string> = {
  "arrow-iv-is": "AIS",
  "prototype-arrow-iv-is": "AIS",
  "arrow-iv-clan": "AC",
  "thumper-artillery-is": "T",
  "thumper-artillery-clan": "T",
  "sniper-artillery-is": "S",
  "sniper-artillery-clan": "S",
  "long-tom-artillery-is": "LT",
  "long-tom-artillery-clan": "LT",
  "thumper-cannon-is": "TC",
  "thumper-cannon-clan": "TC",
  "sniper-cannon-is": "SC",
  "sniper-cannon-clan": "SC",
  "long-tom-cannon-is": "LTC",
  "long-tom-cannon-clan": "LTC",
};
export const ARTILLERY_CITE = sp(120);

/** The damage abilities, by the Notes word of the weapon rows that feed them (pp. 120, 124-126, 129-131, errata v1.6). */
export const DAMAGE_SPECIALS = {
  AC: { note: "AC", cite: sp(120), needsMedium: true },
  LRM: { note: "LRM", cite: sp(126, true), needsMedium: true },
  SRM: { note: "SRM", cite: sp(131, true), needsMedium: true },
  IATM: { note: "IATM", cite: sp(125, true), needsMedium: true },
  FLK: { note: "Flak", cite: sp(124, true), needsMedium: false },
  REL: { note: "REL", cite: sp(130, true), needsMedium: true },
  IF: { note: "Indirect Fire", cite: sp(125, true), needsMedium: false },
  REAR: { cite: sp(129, true) },
};
export const OVL_CITE = sp(128, true);
export const JUMP_CITE = sp(93);
export const TURRET_IDS = both(["turret"]);
export const NOT_CONVERTED = [
  { ids: both(["mash-core-unit", "mash-added-theater"]), code: "MASH", cite: sp(127, true) },
  { ids: both(["searchlight"]), code: "SRCH", cite: sp(131), note: "'Mechs get the Searchlight ability automatically and do not list it" },
];
