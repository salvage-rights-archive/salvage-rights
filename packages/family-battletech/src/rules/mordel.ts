// Turning the JSON that mordel.net returns for one unit into our 'Mech record, and finding what a player has changed since.
// Pure functions, no network. The response is untyped input: every field is narrowed before it is used, a field that is
// present with the wrong type is skipped with a note, and nothing here throws whatever it is given. Mordel's own words
// for chassis parts are mapped to our table keys by the small tables below; a word that is not in a table is stored as
// Mordel wrote it, with a note, and the checks report it as unknown. Nothing is guessed.
import { ARMOR, HEAT_SINK_RULES, MYOMER, STRUCTURE_TYPES } from "../data/chassis";
import type { MechType } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { setYear } from "./availability";
import { levelAtLeast, lowestLevelFor } from "./levels";
import { ARM_FULL, armorSpread, armsOf, configurationOf, layout, locationName, mountParts, partMountBase, slotsTaken, splitOf } from "./mech";
import type { LocationCode, MechRecord, Mount, TechBase } from "./mech";
import { canon, designKey } from "./official";
import { defaultFixedMounts, resolveBase, resolveConfiguration, splitRecord } from "./omni";
import type { OmniChassis, OmniConfiguration } from "./omni";

/** `fixedIds` is set only when every equipment entry carries a boolean `fixed`: the ids of the mounts Mordel marks as the base's own. */
export type MordelImport = { ok: true; record: MechRecord; notes: string[]; fixedIds?: string[] } | { ok: false; message: string };

// ---------------------------------------------------------------------------------------------------------------
// Which unit a player means
// ---------------------------------------------------------------------------------------------------------------

/** "474", "bm 474", "bm/474", or a mordel.net address carrying ut= and id=. Anything else is null. */
export function parseMordelRef(text: string): { unitType: string; id: number } | null {
  const trimmed = text.trim();
  const make = (unitType: string, id: string) => {
    const n = Number(id);
    return Number.isSafeInteger(n) && n > 0 ? { unitType: unitType.toLowerCase(), id: n } : null;
  };
  const bare = /^(?:([a-z]{2,})[\s/]+)?(\d+)$/i.exec(trimmed);
  if (bare) return make(bare[1] ?? "bm", bare[2] ?? "");
  if (/mordel\.net/i.test(trimmed)) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      const unitType = url.searchParams.get("ut");
      const id = url.searchParams.get("id");
      if (/^[a-z]{2,}$/i.test(unitType ?? "") && /^\d+$/.test(id ?? "")) return make(unitType ?? "", id ?? "");
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Mordel's words to our keys. One table per kind of part, keyed by the word with case and punctuation removed. `clan` is
// the key for a Clan part where our table has a separate one.
// ---------------------------------------------------------------------------------------------------------------
interface Words {
  is: string;
  clan?: string;
}
const ENGINE_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  fusion: { is: "standard" },
  standardfusion: { is: "standard" },
  xl: { is: "xl", clan: "xl-clan" },
  xlfusion: { is: "xl", clan: "xl-clan" },
  extralight: { is: "xl", clan: "xl-clan" },
  light: { is: "light" },
  lightfusion: { is: "light" },
  compact: { is: "compact" },
  compactfusion: { is: "compact" },
  xxl: { is: "xxl", clan: "xxl-clan" },
  xxlfusion: { is: "xxl", clan: "xxl-clan" },
  ice: { is: "ice" },
  internalcombustion: { is: "ice" },
  internalcombustionengine: { is: "ice" },
  fuelcell: { is: "fuel-cell" },
  fission: { is: "fission" },
  // The Primitive 'Mechs' engines are the standard ones built a fifth higher (IO:AE p.117); the rating Mordel lists is the one before that rise.
  primitivefusion: { is: "standard" },
  primitiveinternalcombustion: { is: "ice" },
  primitivefuelcell: { is: "fuel-cell" },
  primitivefission: { is: "fission" },
};
const GYRO_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  compact: { is: "compact" },
  heavyduty: { is: "heavy-duty" },
  xl: { is: "xl" },
  extralight: { is: "xl" },
  primitive: { is: "standard" }, // a primitive gyro is a standard one weighed at the raised rating (IO:AE p.117)
  superheavy: { is: "superheavy" },
};
/** The unit types this importer reads, by Mordel's short code: bm is a BattleMech, im an IndustrialMech. */
export const UNIT_TYPE_OF: Record<string, MechType> = { bm: "mech", im: "industrialmech" };
// The IndustrialMech words below (internal combustion, fuel cell, fission, industrial cockpit and Industrial TSM) are our best reading of
// what Mordel sends for an IndustrialMech: a word not in the tables gives the importer's note and the part is left as it came.
const COCKPIT_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  small: { is: "small" },
  torsomounted: { is: "torso-mounted" },
  virtualrealitypilotingpod: { is: "vrpp" },
  vrpp: { is: "vrpp" },
  industrial: { is: "industrial" },
  industrialafc: { is: "industrial-afc" },
  industrialadvancedfirecontrol: { is: "industrial-afc" },
  primitive: { is: "primitive" },
  primitiveindustrial: { is: "primitive-industrial" },
  superheavy: { is: "superheavy" },
  superheavytripod: { is: "superheavy-tripod" },
  superheavyindustrial: { is: "superheavy-industrial" },
  tripod: { is: "tripod" },
  quadvee: { is: "quadvee" },
};
const STRUCTURE_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  endosteel: { is: "endo-steel", clan: "endo-steel-clan" },
  composite: { is: "composite" },
  endocomposite: { is: "endo-composite", clan: "endo-composite-clan" },
  reinforced: { is: "reinforced" },
  industrial: { is: "industrial" },
  primitive: { is: "standard" }, // a primitive 'Mech's structure is the standard kind (IO:AE p.117)
  primitiveindustrial: { is: "industrial" },
};
const ARMOR_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  stealth: { is: "stealth" },
  lightferrofibrous: { is: "light-ferro-fibrous" },
  ferrofibrous: { is: "ferro-fibrous", clan: "ferro-fibrous-clan" },
  heavyferrofibrous: { is: "heavy-ferro-fibrous" },
  hardened: { is: "hardened" },
  ferrolamellor: { is: "ferro-lamellor" },
  laserreflective: { is: "laser-reflective", clan: "laser-reflective-clan" },
  reactive: { is: "reactive", clan: "reactive-clan" },
  antipenetrativeablation: { is: "anti-penetrative-ablation" },
  ballisticreinforced: { is: "ballistic-reinforced" },
  heatdissipating: { is: "heat-dissipating" },
  impactresistant: { is: "impact-resistant" },
  commercial: { is: "commercial" },
  primitive: { is: "primitive" },
  primitivecommercial: { is: "commercial" },
  industrial: { is: "industrial" },
  heavyindustrial: { is: "standard" }, // the IndustrialMech chapter's name for standard armor (TechManual p.72)
};
const MYOMER_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  masc: { is: "masc", clan: "masc-clan" },
  tsm: { is: "tsm" },
  triplestrength: { is: "tsm" },
  triplestrengthmyomer: { is: "tsm" },
  industrialtsm: { is: "industrial-tsm" },
  industrialtriplestrength: { is: "industrial-tsm" },
  industrialtriplestrengthmyomer: { is: "industrial-tsm" },
  primitive: { is: "standard" },
  superheavy: { is: "standard" }, // a superheavy 'Mech's own myomer, which is plain (IO:AE p.157)
};
const HEAT_SINK_WORDS: Record<string, Words> = {
  single: { is: "single" },
  heatsink: { is: "single" },
  double: { is: "double", clan: "double-clan" },
  doubleheatsink: { is: "double", clan: "double-clan" },
  doubleclan: { is: "double-clan" },
  compact: { is: "compact" },
  compactheatsink: { is: "compact" },
  laser: { is: "laser" },
  laserheatsink: { is: "laser" },
};

const LOCATIONS: Record<string, LocationCode> = {
  H: "HD",
  HD: "HD",
  CT: "CT",
  LT: "LT",
  RT: "RT",
  LA: "LA",
  RA: "RA",
  LL: "LL",
  RL: "RL",
  CL: "CL",
  LFL: "FLL",
  RFL: "FRL",
  LRL: "RLL",
  RRL: "RRL",
  // Our own quad codes, as the .mtf reader hands them on (Mordel's API never sends these, so they cannot be misread).
  FLL: "FLL",
  FRL: "FRL",
  RLL: "RLL",
};
const TORSOS: LocationCode[] = ["CT", "LT", "RT"];
// Where structure and armor slots go when Mordel does not say: arms, side torsos, legs, then the center torso and head, lowest
// slot first. On a quad the front legs stand in the arms' place and the rear legs in the legs'.
const FILL_ORDER: Record<string, LocationCode[]> = {
  biped: ["LA", "RA", "LT", "RT", "LL", "RL", "CT", "HD"],
  quad: ["FLL", "FRL", "LT", "RT", "RLL", "RRL", "CT", "HD"],
  tripod: ["LA", "RA", "LT", "RT", "LL", "RL", "CL", "CT", "HD"],
};

type Json = Record<string, unknown>;
const own = <T>(table: Record<string, T>, key: string): T | undefined => (Object.hasOwn(table, key) ? table[key] : undefined);

// ---------------------------------------------------------------------------------------------------------------
// The importer
// ---------------------------------------------------------------------------------------------------------------
/** `requested` is the unit type asked for (bm or im), used when the response does not say its own. */
export function fromMordel(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string, requested = "bm"): MordelImport {
  try {
    return convert(response, catalog, editionId, now, newId, requested);
  } catch {
    return { ok: false, message: "This response could not be read as a Mordel unit." };
  }
}

function convert(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string, requested: string): MordelImport {
  const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
  const top = isObject(response) ? response : undefined;
  if (!top) return { ok: false, message: "Mordel sent nothing this tool can read: the response is not an object." };
  if (top["status"] !== undefined && top["status"] !== "OK") {
    const why = typeof top["message"] === "string" ? top["message"] : typeof top["error"] === "string" ? top["error"] : "";
    return { ok: false, message: `Mordel answered with the status ${JSON.stringify(top["status"])}${why ? `: ${why}` : ""}.` };
  }
  const unitValue = top["unit"];
  if (!isObject(unitValue)) return { ok: false, message: "The response has no unit in it." };
  const unit = unitValue;
  // Mordel's unit type decides ours: bm is a BattleMech and im an IndustrialMech (the types it calls cv and pm are not built yet).
  const mordelType = typeof unit["unit_type_short"] === "string" ? unit["unit_type_short"].toLowerCase() : requested.toLowerCase();
  const baseType = Object.hasOwn(UNIT_TYPE_OF, mordelType) ? UNIT_TYPE_OF[mordelType] : undefined;
  // Mordel's Primitive tech base is our Primitive BattleMech or IndustrialMech (IO:AE p.116).
  const primitiveBase = typeof unit["tech_base"] === "string" && unit["tech_base"].toLowerCase() === "primitive";
  const unitType = primitiveBase && baseType === "mech" ? "primitive-mech" : primitiveBase && baseType === "industrialmech" ? "primitive-industrialmech" : baseType;
  if (unitType === undefined) {
    return { ok: false, message: `This is a ${String(unit["unit_type_short"])} unit; only BattleMechs (bm) and IndustrialMechs (im) can be imported.` };
  }

  const notes: string[] = [];
  const note = (text: string) => notes.push(text);

  // The narrowing helpers, once. A value that is absent or null is simply missing; one that is present with the wrong type
  // gives a note naming the field. An empty string counts as missing.
  const wrong = (label: string) => note(`Mordel's ${label} is not the kind of value expected and was ignored.`);
  const str = (v: unknown, label: string): string | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v === "string" && v.trim() !== "") return v;
    wrong(label);
    return undefined;
  };
  const num = (v: unknown, label: string): number | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    wrong(label);
    return undefined;
  };
  const text = (v: unknown, label: string): string | undefined => (typeof v === "number" && Number.isFinite(v) ? String(v) : str(v, label));
  const sect = (v: unknown, label: string): Json | undefined => {
    if (v === undefined || v === null) return undefined;
    if (isObject(v)) return v;
    wrong(label);
    return undefined;
  };
  const techOf = (word: unknown, label: string): TechBase | undefined => {
    const t = str(word, label)?.toLowerCase();
    if (!t) return undefined;
    if (t.includes("clan")) return "clan";
    if (t.includes("inner") || t === "is" || t === "primitive") return "inner-sphere"; // the Primitive tech base is confined to the Inner Sphere (IO:AE p.115)
    return undefined;
  };

  // Identity and header
  const parts = sect(unit["name_parts"], "name_parts");
  const chassisName = str(parts?.["name"], "name") ?? str(unit["name"], "name") ?? "";
  if (!chassisName) note("Mordel gave no name for this unit.");
  const model = str(parts?.["model"], "model") ?? "";
  const tons = num(unit["tons"], "tonnage");
  if (tons === undefined) note("Mordel gave no tonnage; it is set to 0.");
  const year = num(unit["year"], "year") ?? null;
  const unitTech = techOf(unit["tech_base"], "tech base");
  const mixedFlag = unit["mixed_tech"];
  if (mixedFlag !== undefined && mixedFlag !== null && typeof mixedFlag !== "boolean") wrong("mixed_tech");
  const isMixed = mixedFlag === true || str(unit["tech_base"], "tech base")?.toLowerCase() === "mixed";
  if (!isMixed && !unitTech) note("Mordel did not say the tech base; Inner Sphere is assumed.");
  const techBase: MechRecord["techBase"] = isMixed ? "mixed" : (unitTech ?? "inner-sphere");
  const unitClan = !isMixed && unitTech === "clan";

  const rawConfiguration = str(unit["configuration"], "configuration");
  const configuration = rawConfiguration ? rawConfiguration.toLowerCase() : "";
  if (!rawConfiguration) note("Mordel gave no configuration.");
  else if (!configurationOf(configuration)) {
    note(`The configuration "${rawConfiguration}" is not one this tool lays out; it is stored as "${configuration}".`);
  }

  // Chassis parts
  const mapPart = (table: Record<string, Words>, label: string, sectionValue: unknown): string => {
    const part = sect(sectionValue, label);
    const raw = str(part?.["type"], `${label} type`);
    if (!raw) {
      note(`Mordel gave no ${label}.`);
      return "";
    }
    const words = own(table, raw.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (!words) {
      note(`Mordel's ${label} "${raw}" is not one this tool knows; it is stored as written.`);
      return raw;
    }
    if (words.clan === undefined) return words.is;
    const tech = techOf(part?.["technology"], `${label} technology`);
    if (tech) return tech === "clan" ? words.clan : words.is;
    if (!isMixed) return unitClan ? words.clan : words.is;
    note(`Mordel did not say whether the ${label} "${raw}" is Clan; Inner Sphere is assumed.`);
    return words.is;
  };
  const engine = sect(unit["engine"], "engine");
  const rating = num(engine?.["rating"], "engine rating");
  if (rating === undefined) note("Mordel gave no engine rating; it is set to 0.");
  const heat = sect(unit["heat_sinks"], "heat_sinks");
  const heatCount = num(heat?.["count"], "heat sink count");
  if (heatCount === undefined) note("Mordel gave no heat sink count; it is set to 0.");
  const chassis: MechRecord["chassis"] = {
    engine: { type: mapPart(ENGINE_WORDS, "engine", unit["engine"]), rating: rating ?? 0 },
    gyro: mapPart(GYRO_WORDS, "gyro", unit["gyro"]),
    cockpit: mapPart(COCKPIT_WORDS, "cockpit", unit["cockpit"]),
    structure: mapPart(STRUCTURE_WORDS, "structure", unit["structure"]),
    armorType: mapPart(ARMOR_WORDS, "armor", unit["armor"]),
    myomer: mapPart(MYOMER_WORDS, "myomer", unit["myomer"]),
    heatSinks: { type: mapPart(HEAT_SINK_WORDS, "heat sink", unit["heat_sinks"]), count: heatCount ?? 0 },
  };

  // Armor
  const armor: MechRecord["armor"] = {};
  const locations = unit["locations"];
  if (Array.isArray(locations)) {
    for (const item of locations) {
      const entry = sect(item, "location entry");
      const code = str(entry?.["code"], "location code");
      const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
      if (!entry || !loc) {
        if (entry) note(`A location${code ? ` called "${code}"` : ""} is not one this tool knows and was skipped.`);
        continue;
      }
      const front = num(entry["armor"], `${loc} armor`);
      if (front === undefined) {
        note(`Mordel gave no armor for the ${loc}.`);
        continue;
      }
      const rear = num(entry["rear_armor"], `${loc} rear armor`);
      armor[loc] = rear !== undefined && (rear > 0 || TORSOS.includes(loc)) ? { front, rear } : { front };
    }
  } else {
    if (locations !== undefined && locations !== null) wrong("locations list");
    note("Mordel gave no locations, so there is no armor.");
  }

  // Mounts: chassis parts that take slots, then the equipment list
  const mounts: Mount[] = [];
  const partMounts = (part: "structure" | "armor", name: string, count: number, base: TechBase) => {
    for (let i = 0; i < count; i++) {
      mounts.push({ id: `${part}-${i + 1}`, equipmentId: null, part, name, techBase: base, location: null, slot: null });
    }
  };
  const structure = own(STRUCTURE_TYPES.types, chassis.structure);
  if (structure) partMounts("structure", structure.name, structure.slots, partMountBase(structure, techBase));
  const armorType = own(ARMOR.types, chassis.armorType);
  if (armorType) partMounts("armor", armorType.name, armorType.slots, partMountBase(armorType, techBase));

  /** Catalog row for a name: exactly, else "<weapon> (Ammo <shots>)" as the bin of that weapon with that many shots. A trailing
   * "[LRM]" or "[SRM]" (a multiple-missile launcher's bin) names the ammunition; any other tag ("[Water]") is dropped. */
  const find = (name: string, tech: TechBase): { row?: EquipmentRow; why?: string } => {
    const direct = catalog.match(name, tech);
    if (direct) return { row: direct };
    const bin = /^(.*\S)\s*\(Ammo\s+(\d+)\)(?:\s*\[([^\]]+)\])?$/i.exec(name);
    if (!bin) return {};
    const shots = Number(bin[2]);
    // A multiple-missile launcher's tag may carry the munition after a slash ("[SRM / Artemis IV]"): the part before it names the bin.
    const tag = bin[3]?.split("/")[0]?.trim();
    const stems = [bin[3] ? `${bin[1]} ${bin[3]}` : undefined, tag && tag !== bin[3] ? `${bin[1]} ${tag}` : undefined, bin[1]].filter((x): x is string => x !== undefined);
    // The tagged stem first: "LB 20-X AC (Ammo 5) [Cluster]" is the cluster bin, not the standard one (the live Barghest BGS-1T, bm 823).
    for (const stem of stems) {
      const bins = [catalog.match(`${stem} Ammo`, tech), catalog.match(`${stem} Ammo (Half Ton)`, tech)].filter((r): r is EquipmentRow => r !== undefined);
      if (bins.length === 0) continue;
      const only = bins.length === 1 ? bins[0] : undefined;
      const row = only && only.shots === undefined ? only : bins.find((r) => r.shots === shots);
      return row ? { row } : { why: `${name} is an ammunition bin of a size this tool does not recognise (${shots} shots), so it is not matched.` };
    }
    return {};
  };

  // Mordel lists an industrial cockpit's Advanced Fire Control as an item with no location and no slots; here it is the cockpit's variant.
  let advancedFireControl = false;
  const fixedFlags = new Map<string, boolean>();
  let entryMounts = 0;
  const idToMount = new Map<number, string>();
  /** The slots Mordel gave each mount's entry, so a second entry for the same item (a split weapon) can be joined to it. */
  const partSlots = new Map<string, number>();
  const links: { mountId: string; target: number }[] = [];
  const list = unit["equipment"];
  if (list !== undefined && list !== null && !Array.isArray(list)) wrong("equipment list");
  (Array.isArray(list) ? list : []).forEach((item, index) => {
    const entry = sect(item, `equipment entry ${index + 1}`);
    const name = entry ? str(entry["name"], `equipment entry ${index + 1} name`) : undefined;
    if (!entry || !name) {
      note(`Equipment entry ${index + 1} has no usable name and was skipped.`);
      return;
    }
    // A QuadVee's conversion gear is the fifth slot of each leg, fixed in its layout, so Mordel's entries for it are not mounts of ours.
    if (/^conversion gear$/i.test(name) && configuration === "quadvee") return;
    if (/^advanced fire control system$/i.test(name) && entry["location"] == null && !catalog.match(name, unitClan ? "clan" : "inner-sphere")) {
      advancedFireControl = true;
      return;
    }
    const where = entry["location"];
    const code = str(where, `${name} location`);
    const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
    if (code && !loc) note(`${name} is in "${code}", a location this tool does not know; it is left unplaced.`);
    const tech: TechBase = techOf(entry["technology"], `${name} technology`) ?? (unitClan ? "clan" : "inner-sphere");
    const theirSlots = num(entry["slots"], `${name} slots`);
    const theirId = num(entry["id"], `${name} id`);
    // A weapon split over two locations comes as two entries with one `id` and one name, each with its location and its slots there
    // (checked live on the TechManual Barghest BGS-1T, bm 823, on 2026-11-25: LB 20-X AC, CT 2 and RT 9). They are one mount: the part
    // with more slots (the first on a tie) is its location, the other its `split`; the slots in each place are set when it is placed.
    const joined = theirId === undefined ? undefined : mounts.find((m) => m.id === idToMount.get(theirId));
    // An item the table carries as one mount in each of several places (partial wing, talons) is not a split weapon: its two entries stay two mounts.
    const joinedRow = joined?.equipmentId ? catalog.byId(joined.equipmentId) : undefined;
    if (joined && joinedRow?.perMech === undefined && joined.name === name && joined.location && loc && joined.location !== loc && joined.split === undefined && theirSlots !== undefined && theirSlots > 0) {
      const before = partSlots.get(joined.id) ?? 1;
      const [main, other] = theirSlots > before ? [loc, joined.location] : [joined.location, loc];
      joined.location = main;
      joined.split = { location: other, slot: 0, slots: Math.min(before, theirSlots) };
      partSlots.set(joined.id, before + theirSlots);
      if (joined.equipmentId === null) joined.slots = before + theirSlots;
      const row = joined.equipmentId === null ? undefined : catalog.byId(joined.equipmentId);
      if (row && typeof row.slots === "number" && row.slots !== before + theirSlots) {
        note(`${name} is split ${before} and ${theirSlots} slots between the ${locationName(main)} and the ${locationName(other)}, where the equipment table says it takes ${row.slots}.`);
      }
      return;
    }
    const looked = find(name, tech);
    let row = looked.row;
    const why = looked.why;
    let mountTech = tech;
    // Mordel may label an item with the other tech base than the one the books print it for (a PPC capacitor is Inner Sphere only): an item
    // found under the other base alone is taken as that one, with a note.
    if (!row && !/\(Ammo\s+\d+\)/i.test(name)) {
      const other: TechBase = tech === "clan" ? "inner-sphere" : "clan";
      const found = find(name, other).row;
      if (found) {
        row = found;
        mountTech = other;
        note(`Mordel calls ${name} ${tech === "clan" ? "Clan" : "Inner Sphere"}, and the books print it for ${other === "clan" ? "Clan" : "Inner Sphere"} technology only; it was read as that.`);
      }
    }
    if (!row) note(why ?? `${name} is not in our equipment table.`);
    const mount: Mount = { id: `mount-${index + 1}`, equipmentId: row?.id ?? null, name, techBase: mountTech, location: loc ?? null, slot: null };
    // An item that is not in the table keeps the slots Mordel gave it; one with no id and no location takes none.
    const slotless = entry["id"] == null && entry["location"] == null;
    // An item sold by size (cargo, communications equipment): Mordel gives its size as a count of the table's steps.
    const stack = sect(entry["stacks"], `${name} stacks`);
    const steps = num(stack?.["count"], `${name} stack count`);
    if (row?.amount && steps !== undefined && steps > 0) mount.amount = steps * row.amount.step;
    if (str(entry["facing"], `${name} facing`)?.toLowerCase() === "rear") mount.rear = true;
    if (!row && theirSlots !== undefined && theirSlots >= 0) mount.slots = theirSlots;
    else if (!row && slotless) mount.slots = 0;
    mounts.push(mount);
    entryMounts += 1;
    const fixedFlag = entry["fixed"];
    if (typeof fixedFlag === "boolean") fixedFlags.set(mount.id, fixedFlag);
    else if (fixedFlag !== undefined && fixedFlag !== null) wrong(`${name} fixed flag`);
    if (theirId !== undefined) idToMount.set(theirId, mount.id);
    if (theirSlots !== undefined) partSlots.set(mount.id, theirSlots);
    const target = num(entry["associated_id"], `${name} associated_id`);
    if (target !== undefined) links.push({ mountId: mount.id, target });
  });
  for (const { mountId, target } of links) {
    const to = idToMount.get(target);
    const mount = mounts.find((m) => m.id === mountId);
    if (mount && to && to !== mountId) mount.linkedTo = to;
    else note(`${mount?.name ?? "An item"} is associated with item ${target}, which is not in the equipment list.`);
  }

  // A unit whose jump jets are in the movement and the jump jet section but not in the equipment list (the live Tyson TYS1, bm 25466): the jets are added,
  // unplaced, so the weight, cost and Battle Value carry them.
  const jets = sect(unit["jump_jets"], "jump jets");
  const jumpMP = num(sect(unit["movement"], "movement")?.["jump"], "jump movement");
  const jetKind = jets ? str(jets["type"], "jump jet type") : undefined;
  if (jets && jumpMP !== undefined && jumpMP > 0 && jetKind && !mounts.some((m) => /jump jet/i.test(m.name))) {
    const jetTech: TechBase = techOf(jets["technology"], "jump jet technology") ?? (unitClan ? "clan" : "inner-sphere");
    const jetRow = find(/^standard$/i.test(jetKind) ? "Jump Jet" : `${jetKind} Jump Jet`, jetTech).row;
    if (jetRow) {
      for (let i = 0; i < jumpMP; i++) mounts.push({ id: `jump-jet-${i + 1}`, equipmentId: jetRow.id, name: jetRow.name, techBase: jetTech, location: null, slot: null });
      note(`Mordel gives the unit ${jumpMP} jump movement and its jump jets but lists no jump jet items, so ${jumpMP} ${jetRow.name} mounts were added and are not placed.`);
    }
  }

  // A mixed unit may list both kinds of double heat sink: the section names the main kind, and the other kind's sinks in the equipment
  // list become the second group (the owner's ruling of 2026-11-25). Whether the section's count is the total or the main kind alone is read
  // from the placed sinks: the engine holds floor(rating / 25) of them, and the rest are listed.
  const doubles = (type: string) => (type === "double" ? "double-heat-sink-is" : "double-heat-sink-clan");
  const mainType = chassis.heatSinks.type;
  const otherType = mainType === "double" ? "double-clan" : mainType === "double-clan" ? "double" : undefined;
  if (isMixed && otherType !== undefined) {
    const listed = (id: string) => mounts.filter((m) => m.equipmentId === id).length;
    const others = listed(doubles(otherType));
    if (others > 0) {
      const held = Math.min(chassis.heatSinks.count, Math.floor(chassis.engine.rating / HEAT_SINK_RULES.ratingPerHeldSink));
      const asked = chassis.heatSinks.count;
      const listedMain = held + listed(doubles(mainType));
      chassis.heatSinks.extra = [{ type: otherType, count: others }];
      if (asked !== listedMain) {
        // The count is the total of both kinds (or does not add up; the total is what we read it as).
        chassis.heatSinks.count = Math.max(0, asked - others);
        if (asked !== listedMain + others) note("Mordel's heat sink count does not match the heat sinks it lists; it is read as the total of both kinds.");
      }
    }
  }

  if (advancedFireControl) {
    if (chassis.cockpit === "industrial") chassis.cockpit = "industrial-afc";
    else note("The unit lists Advanced Fire Control, which only an industrial cockpit has; it was left out.");
  }

  // Parts named only in the chassis that the catalog stands for with mounts (Triple-Strength Myomer)
  const myomer = own(MYOMER.types, chassis.myomer);
  const myomerRow: EquipmentRow | undefined = myomer?.catalogId ? catalog.byId(myomer.catalogId) : undefined;
  if (myomerRow?.perMech !== undefined) {
    const have = mounts.filter((m) => m.equipmentId === myomerRow.id).length;
    for (let i = have; i < myomerRow.perMech; i++) {
      mounts.push({ id: `myomer-${i + 1}`, equipmentId: myomerRow.id, name: myomerRow.name, techBase: myomerRow.techBase, location: null, slot: null });
    }
  }

  // Clan CASE: Mordel only says the unit has it, not where
  const fire = sect(unit["fire_control"], "fire_control");
  const clanCase = fire?.["clan_case"];
  if (clanCase !== undefined && clanCase !== null && typeof clanCase !== "boolean") wrong("clan_case");
  if (clanCase === true) {
    const caseRow = catalog.byId("case-clan");
    if (!caseRow) note("The unit has Clan CASE, which is not in our equipment table.");
    else {
      mounts.push({ id: "case-1", equipmentId: caseRow.id, name: caseRow.name, techBase: "clan", location: null, slot: null });
      note("Mordel does not say which locations Clan CASE protects; one CASE is added unplaced.");
    }
  }

  // Fluff
  const fluff = sect(unit["fluff"], "fluff");
  const notesOut: MechRecord["notes"] = {};
  for (const key of ["overview", "capabilities", "deployment", "variants", "notables"] as const) {
    const t = str(fluff?.[key], `fluff ${key}`);
    if (t) notesOut[key] = t;
  }

  const record: MechRecord = {
    schema: 1,
    id: newId(),
    editionId,
    name: { chassis: chassisName, model },
    techBase,
    year,
    unitType,
    tons: tons ?? 0,
    configuration,
    chassis,
    armor,
    mounts,
    notes: notesOut,
    source: {
      kind: "mordel",
      unitType: mordelType,
      id: num(unit["id"], "unit id") ?? 0,
      designer: str(unit["designer"], "designer") ?? "",
      fetchedAt: now,
      original: response,
      values: {},
    },
  };
  const imageUrl = str(unit["image_url"], "image_url");
  if (imageUrl) record.imageUrl = imageUrl;
  const values = record.source?.values;
  if (values) {
    const bv = num(unit["battle_value"], "battle value");
    const cost = num(unit["cost"], "cost");
    const rules = text(unit["rules_level"], "rules level");
    const era = text(unit["era"], "era");
    if (bv !== undefined) values.battleValue = bv;
    if (cost !== undefined) values.cost = cost;
    if (rules !== undefined) values.rulesLevel = rules;
    if (era !== undefined) values.era = era;
  }

  placeMounts(record, catalog, note);
  if (record.year !== null) setYear(record, record.year); // the era follows the year where one era holds it; a year in two is left for the player to pick
  record.rulesLevel = lowestLevelFor(record, catalog);
  // Mordel's own `canon` flag is the one thing that makes an import OFFICIAL: a unit it marks canon is the publisher's design, and the
  // title of its first listed source is the book. Every other import is a member's design and reads as NOT OFFICIAL.
  if (unit["canon"] === true) {
    const sources = Array.isArray(unit["sources"]) ? unit["sources"] : [];
    const first: unknown = sources.find((s) => isObject(s) && typeof s["title"] === "string" && s["title"].trim() !== "");
    const book = isObject(first) && typeof first["title"] === "string" ? first["title"].trim() : "a published book (Mordel marks it canon)";
    record.official = { status: "official", book, design: designKey(record) };
  }
  if (record.source) {
    const { name, notes, tons, year, techBase, configuration, chassis, armor, arms, mounts } = structuredClone(record);
    record.source.baseline = { name, notes, tons, year, techBase, configuration, chassis, armor, arms, mounts };
  }
  const result: MordelImport = { ok: true, record, notes: [...new Set(notes)] };
  if (entryMounts > 0 && fixedFlags.size === entryMounts) {
    // The items a part stands for (Triple-Strength Myomer, Clan CASE) have no entry of their own; they go with the base, as the subtraction would put them.
    const standIns = record.mounts.filter((m) => !m.part && !fixedFlags.has(m.id)).map((m) => m.id);
    result.fixedIds = [...[...fixedFlags].filter(([, on]) => on).map(([id]) => id), ...standIns];
  }
  return result;
}

/** The arm actuators to try, in the order they are given up: all present, then no hand, then no lower arm (and so no hand). */
const ARM_STEPS = [undefined, { lowerArm: true, hand: false }, { lowerArm: false, hand: false }] as const;

/** Mordel does not say which arm actuators a design has. Where the equipment listed in an arm cannot fit with them all, the
 * hand actuator is taken out, and then the lower arm actuator, as far as the equipment needs. */
function inferArms(record: MechRecord, catalog: Catalog, note: (text: string) => void) {
  if (record.configuration !== "biped" && record.configuration !== "tripod") return;
  for (const arm of ["LA", "RA"] as const) {
    const needed = record.mounts
      .filter((m) => !m.part)
      .flatMap((m) => mountParts(m, Math.max(0, slotsTaken(m, record, catalog.factsOf))))
      .reduce((sum, part) => sum + (part.location === arm ? part.count : 0), 0);
    const freeWith = (step: (typeof ARM_STEPS)[number]) => {
      const cells = layout({ ...record, mounts: [], arms: step && { [arm]: step } }, catalog.factsOf).slots[arm] ?? [];
      return cells.filter((cell) => cell.kind === "empty").length;
    };
    // An arm that carries a tool gives up the actuators the tool replaces (TechManual printed pp.241-248), whatever the room.
    const tools = record.mounts.filter((m) => !m.part && m.location === arm && m.equipmentId !== null).map((m) => catalog.byId(m.equipmentId ?? ""));
    const floor = tools.some((row) => row?.armRemoves === "lower-arm") ? 2 : tools.some((row) => row?.armRemoves === "hand") ? 1 : 0;
    const found = ARM_STEPS.findIndex((step, i) => i >= floor && freeWith(step) >= needed);
    const stepAt = found < 0 ? ARM_STEPS.length - 1 : found;
    const step = ARM_STEPS[stepAt];
    if (!step) continue;
    record.arms = { ...record.arms, [arm]: { ...step } };
    if (stepAt === floor) {
      note(`The ${tools.find((row) => row?.armRemoves)?.name ?? "tool"} in the ${locationName(arm)} replaces the ${floor === 2 ? "lower arm and hand actuators" : "hand actuator"}, so ${floor === 2 ? "they were" : "it was"} left out.`);
      continue;
    }
    note(
      `Mordel does not say which actuators the ${locationName(arm)} has. The equipment listed there needs ${needed} slots, so the ${step.lowerArm ? "hand" : "lower arm and hand"} actuator${step.lowerArm ? " was" : "s were"} left out.`,
    );
  }
}

/** Places mounts in the free cells: first the equipment Mordel gave a location, each in the first free run of its size in
 * list order; then, in the fixed order of FILL_ORDER, the structure and armor slots and the items a part stands for that
 * Mordel did not place. The fixed cells come from layout(), so engine and gyro variants are the tables' business. Whatever
 * does not fit stays unplaced. */
function placeMounts(record: MechRecord, catalog: Catalog, note: (text: string) => void) {
  inferArms(record, catalog, note);
  const empty = layout({ ...record, mounts: [] }, catalog.factsOf);
  if (!empty.supported) {
    note(`The configuration "${record.configuration}" has no fixed slot layout here, so no item is placed in a slot.`);
    return;
  }
  const free = new Map<LocationCode, boolean[]>();
  for (const loc of empty.locations) free.set(loc, (empty.slots[loc] ?? []).map((cell) => cell.kind === "empty"));

  for (const mount of record.mounts) {
    if (mount.part || !mount.location) continue;
    const taken = slotsTaken(mount, record, catalog.factsOf);
    if (taken <= 0) continue;
    // Each part (two for a split weapon) takes the first free run of its size in its location; if one part finds none, neither is placed.
    const claimed: { cells: boolean[]; first: number; count: number }[] = [];
    for (const part of mountParts(mount, taken)) {
      const cells = part.location ? free.get(part.location) : undefined;
      if (!cells) {
        note(`${mount.name} is in the ${part.location ?? "?"}, which this ${record.configuration} does not have; it is left unplaced.`);
        break;
      }
      let first = 0;
      while (first + part.count <= cells.length && !cells.slice(first, first + part.count).every(Boolean)) first++;
      if (first + part.count > cells.length) break;
      cells.fill(false, first, first + part.count);
      claimed.push({ cells, first, count: part.count });
    }
    const split = splitOf(mount);
    if (claimed.length === (split && split.slots < taken ? 2 : 1)) {
      mount.slot = claimed[0]?.first ?? null;
      if (split && claimed[1]) mount.split = { ...split, slot: claimed[1].first };
    } else {
      for (const { cells, first, count } of claimed) cells.fill(true, first, first + count);
    }
  }

  // Second pass. `limit` is how many may go in each location, for an armor type with a place for every slot.
  const order = FILL_ORDER[record.configuration] ?? [];
  const fill = (group: Mount[], limit?: Partial<Record<LocationCode, number>>) => {
    if (group.length === 0) return;
    note(`Mordel does not say where the ${group.length} ${group[0]?.name ?? ""} slots are. They were placed in the first free slots.`);
    const left = { ...limit };
    for (const mount of group) {
      for (const loc of order) {
        if (limit && (left[loc] ?? 0) <= 0) continue;
        const cells = free.get(loc);
        const at = cells?.findIndex(Boolean) ?? -1;
        if (!cells || at < 0) continue;
        cells[at] = false;
        mount.location = loc;
        mount.slot = at;
        if (limit) left[loc] = (left[loc] ?? 0) - 1;
        break;
      }
    }
  };
  const armor = record.mounts.filter((m) => m.part === "armor");
  const ruled = armorSpread(own(ARMOR.types, record.chassis.armorType), record.configuration);
  fill(ruled ? armor : [], ruled);
  fill(record.mounts.filter((m) => m.part === "structure"));
  if (!ruled) fill(armor);
  const standIns = new Map<string, Mount[]>();
  for (const m of record.mounts) {
    const row = m.equipmentId ? catalog.byId(m.equipmentId) : undefined;
    if (row?.perMech !== undefined && !m.location) standIns.set(row.id, [...(standIns.get(row.id) ?? []), m]);
  }
  for (const group of standIns.values()) fill(group);
}

// ---------------------------------------------------------------------------------------------------------------
// What has changed since the import
// ---------------------------------------------------------------------------------------------------------------

/** The field paths (as the checks name them), mount ids, and `mounts.removed` that differ from what the importer produced,
 * which the record keeps as `source.baseline`. Empty when the record has no source or no baseline. */
export function changedSinceImport(record: MechRecord): Set<string> {
  const changed = new Set<string>();
  const was = record.source?.baseline;
  if (!was) return changed;
  const differ = (path: string, a: unknown, b: unknown) => {
    if (canon(a) !== canon(b)) changed.add(path);
  };
  differ("name", record.name, was.name);
  for (const key of new Set([...Object.keys(record.notes), ...Object.keys(was.notes)])) {
    differ(`notes.${key}`, record.notes[key as keyof MechRecord["notes"]], was.notes[key as keyof MechRecord["notes"]]);
  }
  for (const field of ["tons", "year", "techBase", "configuration"] as const) differ(field, record[field], was[field]);
  for (const field of ["engine", "gyro", "cockpit", "structure", "armorType", "myomer", "heatSinks"] as const) {
    differ(`chassis.${field}`, record.chassis[field], was.chassis[field]);
  }
  for (const loc of new Set([...Object.keys(record.armor), ...Object.keys(was.armor)])) {
    differ(`armor.${loc}`, record.armor[loc as LocationCode], was.armor[loc as LocationCode]);
  }
  for (const loc of new Set([...Object.keys(record.patchwork ?? {}), ...Object.keys(was.patchwork ?? {})])) {
    differ(`patchwork.${loc}`, record.patchwork?.[loc as LocationCode], was.patchwork?.[loc as LocationCode]);
  }
  for (const arm of ["LA", "RA"] as const) differ(`arms.${arm}`, armsOf(record)?.[arm] ?? ARM_FULL, armsOf(was)?.[arm] ?? ARM_FULL);
  const now = new Map(record.mounts.map((m) => [m.id, m]));
  for (const m of was.mounts) {
    const here = now.get(m.id);
    if (!here) changed.add("mounts.removed");
    else differ(m.id, here, m);
  }
  const before = new Set(was.mounts.map((m) => m.id));
  for (const m of record.mounts) if (!before.has(m.id)) changed.add(m.id);
  return changed;
}

// ---------------------------------------------------------------------------------------------------------------
// OmniMech sets: a [BASE] unit and its variants become one chassis
// ---------------------------------------------------------------------------------------------------------------
// What the owner's notes on the API record (2026-11-06 mapping, sections 2.1 and 4): a unit carries `omni` (boolean), `omni_base_id` and,
// on a base, `omni_variants` (only the variants the key can see). Each variant is its own unit with its full equipment list; the base is a
// unit named like "Fire Falcon [BASE]" (bm 2303) that lists itself as its own base; `omni_base_id` is null for a variant whose base is
// another member's private unit. A variant's pods are its equipment minus the base's. Checked against the live API on 2026-11-25 (bm 2303,
// its PRIME bm 2304 and Baker bm 15494): `omni_variants` is a list of `{ id, name }` objects; every variant repeats the base's fixed items;
// and each equipment entry carries a boolean `fixed` that the notes do not name, true on exactly the items the subtraction leaves on the
// base. The subtraction and `fixed` agree on all three. With the base in hand the subtraction decides and `fixed` is a check (any item they
// place differently is noted); without the base (private), `fixed` splits the variant, which the subtraction cannot. Where entries lack it,
// the subtraction (or the guess) stays.

export interface MordelOmniFacts {
  omni: boolean;
  /** The unit's own id. */
  id: number | null;
  /** The base's id; null when the response has none (a variant whose base is private) or says nothing. */
  baseId: number | null;
  /** True for a [BASE] unit: named so, or listing itself as its own base. */
  isBase: boolean;
  /** The variants a base lists, as far as the response says. */
  variantIds: number[];
}

/** The Omni facts of one Mordel unit response; every field is optional and a response that is not a unit says nothing. */
export function omniFacts(response: unknown): MordelOmniFacts {
  const none: MordelOmniFacts = { omni: false, id: null, baseId: null, isBase: false, variantIds: [] };
  const top = typeof response === "object" && response !== null && !Array.isArray(response) ? (response as Json) : undefined;
  const unit = top?.["unit"];
  if (typeof unit !== "object" || unit === null || Array.isArray(unit)) return none;
  const u = unit as Json;
  const id = typeof u["id"] === "number" ? u["id"] : null;
  const baseId = typeof u["omni_base_id"] === "number" ? u["omni_base_id"] : null;
  const parts = typeof u["name_parts"] === "object" && u["name_parts"] !== null ? (u["name_parts"] as Json) : {};
  const named = [parts["name"], parts["model"], u["name"]].some((t) => typeof t === "string" && /\[BASE\]/i.test(t));
  const listed = Array.isArray(u["omni_variants"]) ? u["omni_variants"] : [];
  const variantIds = listed.flatMap((v): number[] => {
    const n = typeof v === "number" ? v : typeof v === "object" && v !== null && typeof (v as Json)["id"] === "number" ? ((v as Json)["id"] as number) : undefined;
    return n === undefined || n === id ? [] : [n];
  });
  const omni = u["omni"] === true || named || baseId !== null || variantIds.length > 0;
  return { omni, id, baseId, isBase: named || (baseId !== null && baseId === id), variantIds: [...new Set(variantIds)] };
}

export interface OmniImport {
  chassis: OmniChassis;
  notes: string[];
}

const withoutBaseMark = (text: string) => text.replace(/\s*\[BASE\]\s*/gi, " ").trim();
const plainSource = (record: MechRecord): MechRecord["source"] => {
  if (!record.source) return undefined;
  const source = structuredClone(record.source);
  delete source.baseline; // "changed since import" compares a plain 'Mech with its import; a configuration is part of a chassis
  return source;
};
/** The unit's OFFICIAL mark, when the base or configuration made from it is still the design Mordel listed (the subtraction of the base's
 * equipment can differ from the listing, and then the mark does not carry over). */
const keptMark = (from: MechRecord, resolved: MechRecord | undefined): MechRecord["official"] =>
  from.official && resolved && from.official.design === designKey(resolved) ? { ...from.official } : undefined;
const mountKey = (m: Mount) => `${m.name}|${m.techBase}|${m.location ?? ""}`;

/**
 * One chassis from a base and its variants, each already converted by `fromMordel`. The base's equipment is the fixed list. A variant's
 * pods are its equipment minus the base's, matched one for one on name, tech base and location (the slot is not compared: the importer
 * places each unit's items itself, so two units' slots need not agree). A variant that lacks an item the base has, or whose chassis parts
 * differ from the base's, is reported in the notes and still imported. The first variant named Prime (else the first) is the Primary.
 */
export function importOmniSet(base: MechRecord, variants: MechRecord[], newId: () => string, fixedIds: (string[] | undefined)[] = []): OmniImport {
  const notes: string[] = [];
  const baseMounts = base.mounts;
  const taken = new Set(baseMounts.map((m) => m.id));
  const configurations: OmniConfiguration[] = [];
  for (const [variantAt, variant] of variants.entries()) {
    const flagged = fixedIds[variantAt];
    const remaining = new Map<string, Mount[]>();
    for (const m of baseMounts.filter((x) => x.part === undefined)) remaining.set(mountKey(m), [...(remaining.get(mountKey(m)) ?? []), m]);
    const asBase = new Map<string, string>();
    const pods: Mount[] = [];
    for (const m of variant.mounts) {
      if (m.part !== undefined) continue;
      const match = remaining.get(mountKey(m))?.shift();
      if (match) asBase.set(m.id, match.id);
      else pods.push(structuredClone(m));
    }
    const code = variant.name.model.trim() || nextFreeCode(configurations.map((c) => c.code));
    if (flagged) {
      // With the base in hand the subtraction decides: the base is shared by every configuration, so only "variant minus base" keeps each
      // configuration's equipment exactly the variant's (following a fixed mark the base lacks would drop the item; a pod mark on an item the
      // base has would count it twice). Mordel's fixed marks are a check on it.
      const isFixed = new Set(flagged);
      const bySubtraction = new Set(pods.map((m) => m.id));
      const differ = [...new Set(variant.mounts.filter((m) => m.part === undefined && isFixed.has(m.id) === bySubtraction.has(m.id)).map((m) => m.name))];
      if (differ.length > 0) notes.push(`${code}: the base's equipment list and Mordel's fixed marks disagree about ${differ.join(", ")}; we followed the base's list, so this configuration carries exactly the equipment Mordel lists for it.`);
    }
    for (const left of remaining.values()) for (const m of left) notes.push(`${code} does not list ${m.name} (${m.location ?? "unplaced"}), which the base has; it is kept as fixed equipment.`);
    for (const part of ["engine", "gyro", "cockpit", "structure", "armorType"] as const) {
      if (JSON.stringify(variant.chassis[part]) !== JSON.stringify(base.chassis[part])) notes.push(`${code} has a different ${part === "armorType" ? "armor type" : part} from the base; a configuration cannot change it, so the base's is used.`);
    }
    const used = new Set(taken);
    const renamed = new Map<string, string>();
    for (const m of pods) {
      if (!used.has(m.id)) {
        used.add(m.id);
        continue;
      }
      let n = 1;
      while (used.has(`pod-${n}-${m.id}`)) n += 1;
      renamed.set(m.id, `pod-${n}-${m.id}`);
      used.add(`pod-${n}-${m.id}`);
    }
    for (const m of pods) {
      m.id = renamed.get(m.id) ?? m.id;
      if (m.linkedTo !== undefined) m.linkedTo = asBase.get(m.linkedTo) ?? renamed.get(m.linkedTo) ?? m.linkedTo;
    }
    const level = variant.rulesLevel !== undefined && levelAtLeast(variant.rulesLevel, "standard") ? variant.rulesLevel : "standard";
    const configuration: OmniConfiguration = { id: newId(), code, mounts: pods, year: variant.year, rulesLevel: level, notes: structuredClone(variant.notes) };
    if (variant.arms) configuration.arms = structuredClone(variant.arms);
    if (variant.imageUrl) configuration.imageUrl = variant.imageUrl;
    const source = plainSource(variant);
    if (source) configuration.source = source;
    configurations.push(configuration);
  }
  if (configurations.length === 0) notes.push("The base lists no variants this key can see, so the chassis has an empty Prime configuration.");
  const prime = configurations.find((c) => /prime/i.test(c.code)) ?? configurations[0];
  if (!prime) configurations.push({ id: newId(), code: "Prime", mounts: [] });
  const primary = prime ?? (configurations[0] as OmniConfiguration);
  const chassis: OmniChassis = {
    schema: 1,
    id: newId(),
    editionId: base.editionId,
    name: { chassis: withoutBaseMark(base.name.chassis) || base.name.chassis },
    techBase: base.techBase,
    year: base.year,
    rulesLevel: "standard",
    tons: base.tons,
    body: base.configuration,
    base: { chassis: structuredClone(base.chassis), armor: structuredClone(base.armor), mounts: structuredClone(baseMounts) },
    configurations,
    primaryId: primary.id,
    notes: structuredClone(base.notes),
  };
  if (base.era !== undefined) chassis.era = base.era;
  if (base.imageUrl) chassis.imageUrl = base.imageUrl;
  const source = plainSource(base);
  if (source) chassis.source = source;
  const baseMark = keptMark(base, resolveBase(chassis));
  if (baseMark) chassis.official = baseMark;
  for (const [at, variant] of variants.entries()) {
    const config = configurations[at];
    const mark = config && keptMark(variant, resolveConfiguration(chassis, config.id));
    if (config && mark) config.official = mark;
  }
  return { chassis, notes: [...notes, ...actuatorNote(base.configuration)] };
}

/** The note that goes with an OmniMech import whose body has arms: Mordel's figures leave out the actuators, ours keep them (TechManual p. 48). */
function actuatorNote(body: string): string[] {
  const size = configurationOf(body)?.size;
  return size && "LA" in size
    ? ["Mordel leaves out the lower arm and hand actuators on the arms of an OmniMech. We keep them, as the TechManual does, so our cost runs a little above Mordel's until a configuration removes them."]
    : [];
}

function nextFreeCode(used: string[]): string {
  for (let i = 0; i < 26; i += 1) if (!used.includes(String.fromCharCode(65 + i))) return String.fromCharCode(65 + i);
  return `V${String(used.length + 1)}`;
}

/**
 * For an Omni variant whose base cannot be had (private, or not fetched): the one unit becomes a one-configuration chassis. With `fixedIds`
 * (the items Mordel marks fixed) the base is rebuilt from them. Without, this is the FALLBACK and which
 * items are fixed is OUR GUESS (the structure and armor slots, heat sinks, jump jets and anything the books bar from pods; the rest are pods),
 * since the notes record no pod marker; the notes say so, and the player can correct it in the editor.
 */
export function importOmniSingle(record: MechRecord, catalog: Catalog, newId: () => string, why: string, fixedIds?: string[]): OmniImport {
  const copy = structuredClone(record);
  copy.id = newId();
  const chassis = splitRecord({ ...copy, unitType: "omnimech" }, fixedIds ?? defaultFixedMounts(copy, catalog), newId);
  chassis.name = { chassis: withoutBaseMark(copy.name.chassis) || copy.name.chassis };
  chassis.rulesLevel = "standard";
  const config = chassis.configurations[0];
  if (config) {
    config.code = copy.name.model.trim() || "Prime";
    delete config.name;
    const source = plainSource(copy);
    if (source) config.source = source;
    config.rulesLevel = copy.rulesLevel !== undefined && levelAtLeast(copy.rulesLevel, "standard") ? copy.rulesLevel : "standard";
    const mark = keptMark(copy, resolveConfiguration(chassis, config.id));
    if (mark) config.official = mark;
  }
  delete chassis.source;
  const actuators = actuatorNote(copy.configuration);
  if (fixedIds) return { chassis, notes: [`${why} We rebuilt the base from this variant because the base is not visible to us: the items Mordel marks as fixed are the base's, and the rest are this configuration's pods.`, ...actuators] };
  return { chassis, notes: [`${why} Imported as a one-configuration OmniMech: which items are fixed in the base is a guess (the structure and armor slots, heat sinks, jump jets and items the books bar from pods); change it in the editor.`, ...actuators] };
}
