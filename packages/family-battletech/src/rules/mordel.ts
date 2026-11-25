// Turning the JSON that mordel.net returns for one unit into our 'Mech record, and finding what a player has changed since.
// Pure functions, no network. The response is untyped input: every field is narrowed before it is used, a field that is
// present with the wrong type is skipped with a note, and nothing here throws whatever it is given. Mordel's own words
// for chassis parts are mapped to our table keys by the small tables below; a word that is not in a table is stored as
// Mordel wrote it, with a note, and the checks report it as unknown. Nothing is guessed.
import { ARMOR, MYOMER, STRUCTURE_TYPES } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { lowestLevelFor } from "./levels";
import { ARM_FULL, armorSpread, configurationOf, layout, locationName, slotsTaken } from "./mech";
import type { LocationCode, MechRecord, Mount, TechBase } from "./mech";

export type MordelImport = { ok: true; record: MechRecord; notes: string[] } | { ok: false; message: string };

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
};
const GYRO_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  compact: { is: "compact" },
  heavyduty: { is: "heavy-duty" },
  xl: { is: "xl" },
  extralight: { is: "xl" },
};
const COCKPIT_WORDS: Record<string, Words> = { standard: { is: "standard" }, small: { is: "small" }, torsomounted: { is: "torso-mounted" } };
const STRUCTURE_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  endosteel: { is: "endo-steel", clan: "endo-steel-clan" },
  composite: { is: "composite" },
  endocomposite: { is: "endo-composite", clan: "endo-composite-clan" },
  reinforced: { is: "reinforced" },
  industrial: { is: "industrial" },
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
  industrial: { is: "industrial" },
};
const MYOMER_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  masc: { is: "masc", clan: "masc-clan" },
  tsm: { is: "tsm" },
  triplestrength: { is: "tsm" },
  triplestrengthmyomer: { is: "tsm" },
};
const HEAT_SINK_WORDS: Record<string, Words> = {
  single: { is: "single" },
  heatsink: { is: "single" },
  double: { is: "double", clan: "double-clan" },
  doubleheatsink: { is: "double", clan: "double-clan" },
  doubleclan: { is: "double-clan" },
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
export function fromMordel(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string): MordelImport {
  try {
    return convert(response, catalog, editionId, now, newId);
  } catch {
    return { ok: false, message: "This response could not be read as a Mordel unit." };
  }
}

function convert(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string): MordelImport {
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
  if (typeof unit["unit_type_short"] === "string" && unit["unit_type_short"].toLowerCase() !== "bm") {
    return { ok: false, message: `This is a ${unit["unit_type_short"]} unit; only BattleMechs (bm) can be imported.` };
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
    if (t.includes("inner") || t === "is") return "inner-sphere";
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
  const partMounts = (part: "structure" | "armor", name: string, count: number) => {
    for (let i = 0; i < count; i++) {
      mounts.push({ id: `${part}-${i + 1}`, equipmentId: null, part, name, techBase: unitClan ? "clan" : "inner-sphere", location: null, slot: null });
    }
  };
  const structure = own(STRUCTURE_TYPES.types, chassis.structure);
  if (structure) partMounts("structure", structure.name, structure.slots);
  const armorType = own(ARMOR.types, chassis.armorType);
  if (armorType) partMounts("armor", armorType.name, armorType.slots);

  /** Catalog row for a name: exactly, else "<weapon> (Ammo <shots>)" as the bin of that weapon with that many shots. */
  const find = (name: string, tech: TechBase): { row?: EquipmentRow; why?: string } => {
    const direct = catalog.match(name, tech);
    if (direct) return { row: direct };
    const bin = /^(.*\S)\s*\(Ammo\s+(\d+)\)$/i.exec(name);
    if (!bin) return {};
    const shots = Number(bin[2]);
    const bins = [catalog.match(`${bin[1]} Ammo`, tech), catalog.match(`${bin[1]} Ammo (Half Ton)`, tech)].filter((r): r is EquipmentRow => r !== undefined);
    const only = bins.length === 1 ? bins[0] : undefined;
    const row = only && only.shots === undefined ? only : bins.find((r) => r.shots === shots);
    if (row) return { row };
    return bins.length > 0 ? { why: `${name} is an ammunition bin of a size this tool does not recognise (${shots} shots), so it is not matched.` } : {};
  };

  const idToMount = new Map<number, string>();
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
    const where = entry["location"];
    const code = str(where, `${name} location`);
    const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
    if (code && !loc) note(`${name} is in "${code}", a location this tool does not know; it is left unplaced.`);
    const tech: TechBase = techOf(entry["technology"], `${name} technology`) ?? (unitClan ? "clan" : "inner-sphere");
    const { row, why } = find(name, tech);
    if (!row) note(why ?? `${name} is not in our equipment table.`);
    const theirSlots = num(entry["slots"], `${name} slots`);
    const mount: Mount = { id: `mount-${index + 1}`, equipmentId: row?.id ?? null, name, techBase: tech, location: loc ?? null, slot: null };
    // An item that is not in the table keeps the slots Mordel gave it; one with no id and no location takes none.
    const slotless = entry["id"] == null && entry["location"] == null;
    if (!row && theirSlots !== undefined && theirSlots >= 0) mount.slots = theirSlots;
    else if (!row && slotless) mount.slots = 0;
    mounts.push(mount);
    const theirId = num(entry["id"], `${name} id`);
    if (theirId !== undefined) idToMount.set(theirId, mount.id);
    const target = num(entry["associated_id"], `${name} associated_id`);
    if (target !== undefined) links.push({ mountId: mount.id, target });
  });
  for (const { mountId, target } of links) {
    const to = idToMount.get(target);
    const mount = mounts.find((m) => m.id === mountId);
    if (mount && to && to !== mountId) mount.linkedTo = to;
    else note(`${mount?.name ?? "An item"} is associated with item ${target}, which is not in the equipment list.`);
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
    tons: tons ?? 0,
    configuration,
    chassis,
    armor,
    mounts,
    notes: notesOut,
    source: {
      kind: "mordel",
      unitType: "bm",
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
  record.rulesLevel = lowestLevelFor(record, catalog);
  if (record.source) {
    const { name, notes, tons, year, techBase, configuration, chassis, armor, arms, mounts } = structuredClone(record);
    record.source.baseline = { name, notes, tons, year, techBase, configuration, chassis, armor, arms, mounts };
  }
  return { ok: true, record, notes: [...new Set(notes)] };
}

/** The arm actuators to try, in the order they are given up: all present, then no hand, then no lower arm (and so no hand). */
const ARM_STEPS = [undefined, { lowerArm: true, hand: false }, { lowerArm: false, hand: false }] as const;

/** Mordel does not say which arm actuators a design has. Where the equipment listed in an arm cannot fit with them all, the
 * hand actuator is taken out, and then the lower arm actuator, as far as the equipment needs. */
function inferArms(record: MechRecord, catalog: Catalog, note: (text: string) => void) {
  if (record.configuration !== "biped" && record.configuration !== "tripod") return;
  for (const arm of ["LA", "RA"] as const) {
    const needed = record.mounts.filter((m) => !m.part && m.location === arm).reduce((sum, m) => sum + Math.max(0, slotsTaken(m, record, catalog.factsOf)), 0);
    const freeWith = (step: (typeof ARM_STEPS)[number]) => {
      const cells = layout({ ...record, mounts: [], arms: step && { [arm]: step } }, catalog.factsOf).slots[arm] ?? [];
      return cells.filter((cell) => cell.kind === "empty").length;
    };
    const stepAt = ARM_STEPS.findIndex((step) => freeWith(step) >= needed);
    const step = ARM_STEPS[stepAt < 0 ? ARM_STEPS.length - 1 : stepAt];
    if (!step) continue;
    record.arms = { ...record.arms, [arm]: { ...step } };
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
    const cells = free.get(mount.location);
    if (!cells) {
      note(`${mount.name} is in the ${mount.location}, which this ${record.configuration} does not have; it is left unplaced.`);
      continue;
    }
    const taken = slotsTaken(mount, record, catalog.factsOf);
    if (taken <= 0) continue;
    for (let first = 0; first + taken <= cells.length; first++) {
      if (cells.slice(first, first + taken).every(Boolean)) {
        for (let i = 0; i < taken; i++) cells[first + i] = false;
        mount.slot = first;
        break;
      }
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

/** Canonical text of a value: object keys in order, so two equal values written in different key orders agree. */
function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const o = value as Json;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

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
  for (const arm of ["LA", "RA"] as const) differ(`arms.${arm}`, record.arms?.[arm] ?? ARM_FULL, was.arms?.[arm] ?? ARM_FULL);
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
