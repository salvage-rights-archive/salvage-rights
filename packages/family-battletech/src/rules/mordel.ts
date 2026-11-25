// Turning the JSON that mordel.net returns for one unit into our 'Mech record, and finding what a player has changed since.
// Pure functions, no network. The response is untyped input: every field is narrowed before it is used, a field of the
// wrong type is skipped with a note, and nothing here throws whatever it is given. Mordel's own words for chassis parts
// are mapped to our table keys by the small tables below; a word that is not in a table is stored as Mordel wrote it,
// with a note, and the checks report it as unknown. Nothing is guessed.
import { ARMOR, MYOMER, STRUCTURE_TYPES } from "../data/chassis";
import type { Catalog, EquipmentRow } from "./catalog";
import { layout } from "./mech";
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
// Narrowing helpers
// ---------------------------------------------------------------------------------------------------------------
type Json = Record<string, unknown>;
const obj = (x: unknown): Json | undefined => (typeof x === "object" && x !== null && !Array.isArray(x) ? (x as Json) : undefined);
const str = (x: unknown): string | undefined => (typeof x === "string" && x.trim() !== "" ? x : undefined);
const num = (x: unknown): number | undefined => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const own = <T>(table: Record<string, T>, key: string): T | undefined => (Object.hasOwn(table, key) ? table[key] : undefined);

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
};
const GYRO_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  compact: { is: "compact" },
  heavyduty: { is: "heavy-duty" },
  xl: { is: "xl" },
  extralight: { is: "xl" },
};
const COCKPIT_WORDS: Record<string, Words> = { standard: { is: "standard" }, small: { is: "small" } };
const STRUCTURE_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  endosteel: { is: "endo-steel", clan: "endo-steel-clan" },
};
const ARMOR_WORDS: Record<string, Words> = {
  standard: { is: "standard" },
  stealth: { is: "stealth" },
  lightferrofibrous: { is: "light-ferro-fibrous" },
  ferrofibrous: { is: "ferro-fibrous", clan: "ferro-fibrous-clan" },
  heavyferrofibrous: { is: "heavy-ferro-fibrous" },
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
  LFL: "FLL",
  RFL: "FRL",
  LRL: "RLL",
  RRL: "RRL",
};
const TORSOS: LocationCode[] = ["CT", "LT", "RT"];

/** "clan" or "is" from Mordel's technology word, or undefined when it does not say. */
function techOf(word: unknown): TechBase | undefined {
  const text = str(word)?.toLowerCase();
  if (!text) return undefined;
  if (text.includes("clan")) return "clan";
  if (text.includes("inner") || text === "is") return "inner-sphere";
  return undefined;
}

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
  const top = obj(response);
  if (!top) return { ok: false, message: "Mordel sent nothing this tool can read: the response is not an object." };
  if (top["status"] !== undefined && top["status"] !== "OK") {
    const why = str(top["message"]) ?? str(top["error"]);
    return { ok: false, message: `Mordel answered with the status ${JSON.stringify(top["status"])}${why ? `: ${why}` : ""}.` };
  }
  const unit = obj(top["unit"]);
  if (!unit) return { ok: false, message: "The response has no unit in it." };
  const unitType = str(unit["unit_type_short"]);
  if (unitType !== undefined && unitType.toLowerCase() !== "bm") {
    return { ok: false, message: `This is a ${unitType} unit; only BattleMechs (bm) can be imported.` };
  }

  const notes: string[] = [];
  const note = (text: string) => notes.push(text);

  // Identity and header
  const parts = obj(unit["name_parts"]);
  const chassisName = str(parts?.["name"]) ?? str(unit["name"]) ?? "";
  if (!chassisName) note("Mordel gave no name for this unit.");
  const model = str(parts?.["model"]) ?? "";
  const tons = num(unit["tons"]);
  if (tons === undefined) note("Mordel gave no tonnage; it is set to 0.");
  const year = num(unit["year"]) ?? null;
  const unitTech = techOf(unit["tech_base"]);
  const isMixed = unit["mixed_tech"] === true || str(unit["tech_base"])?.toLowerCase() === "mixed";
  if (!isMixed && !unitTech) note("Mordel did not say the tech base; Inner Sphere is assumed.");
  const techBase: MechRecord["techBase"] = isMixed ? "mixed" : (unitTech ?? "inner-sphere");
  const unitClan = !isMixed && unitTech === "clan";

  const rawConfiguration = str(unit["configuration"]);
  const configuration = rawConfiguration ? rawConfiguration.toLowerCase() : "";
  if (!rawConfiguration) note("Mordel gave no configuration.");
  else if (configuration !== "biped" && configuration !== "quad") {
    note(`The configuration "${rawConfiguration}" is not one this tool lays out; it is stored as "${configuration}".`);
  }

  // Chassis parts
  const mapPart = (table: Record<string, Words>, label: string, section: unknown, tech?: unknown): string => {
    const part = obj(section);
    const raw = str(part?.["type"]);
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
    const tech2 = techOf(tech ?? part?.["technology"]);
    if (tech2) return tech2 === "clan" ? words.clan : words.is;
    if (!isMixed) return unitClan ? words.clan : words.is;
    note(`Mordel did not say whether the ${label} "${raw}" is Clan; Inner Sphere is assumed.`);
    return words.is;
  };
  const engine = obj(unit["engine"]);
  const rating = num(engine?.["rating"]);
  if (rating === undefined) note("Mordel gave no engine rating; it is set to 0.");
  const heat = obj(unit["heat_sinks"]);
  const heatCount = num(heat?.["count"]);
  if (heatCount === undefined) note("Mordel gave no heat sink count; it is set to 0.");
  const chassis: MechRecord["chassis"] = {
    engine: { type: mapPart(ENGINE_WORDS, "engine type", engine), rating: rating ?? 0 },
    gyro: mapPart(GYRO_WORDS, "gyro", unit["gyro"]),
    cockpit: mapPart(COCKPIT_WORDS, "cockpit", unit["cockpit"]),
    structure: mapPart(STRUCTURE_WORDS, "structure type", unit["structure"]),
    armorType: mapPart(ARMOR_WORDS, "armor type", unit["armor"]),
    myomer: mapPart(MYOMER_WORDS, "myomer", unit["myomer"]),
    heatSinks: { type: mapPart(HEAT_SINK_WORDS, "heat sink type", heat), count: heatCount ?? 0 },
  };

  // Armor
  const armor: MechRecord["armor"] = {};
  const locations = unit["locations"];
  if (Array.isArray(locations)) {
    for (const item of locations) {
      const entry = obj(item);
      const code = str(entry?.["code"]);
      const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
      if (!entry || !loc) {
        note(`A location${code ? ` called "${code}"` : ""} is not one this tool knows and was skipped.`);
        continue;
      }
      const front = num(entry["armor"]);
      if (front === undefined) {
        note(`Mordel gave no armor for the ${loc}.`);
        continue;
      }
      const rear = num(entry["rear_armor"]);
      armor[loc] = rear !== undefined && (rear > 0 || TORSOS.includes(loc)) ? { front, rear } : { front };
    }
  } else note("Mordel gave no locations, so there is no armor.");

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

  const idToMount = new Map<number, string>();
  const links: { mountId: string; target: number }[] = [];
  const list = unit["equipment"];
  if (list !== undefined && !Array.isArray(list)) note("Mordel's equipment list was not a list and was skipped.");
  (Array.isArray(list) ? list : []).forEach((item, index) => {
    const entry = obj(item);
    const name = str(entry?.["name"]);
    if (!entry || !name) {
      note(`Equipment entry ${index + 1} has no name and was skipped.`);
      return;
    }
    const code = str(entry["location"]);
    const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
    if (code && !loc) note(`${name} is in "${code}", a location this tool does not know; it is left unplaced.`);
    const tech: TechBase = techOf(entry["technology"]) ?? (unitTech === "clan" && !isMixed ? "clan" : "inner-sphere");
    // Mordel names an ammunition bin "<weapon> (Ammo <shots>)"; our rows are "<weapon> Ammo", so try that once.
    // The shot count is dropped, so a half-ton bin of a machine gun matches the full-ton row.
    const bin = /^(.*\S)\s*\(Ammo\s+\d+\)$/i.exec(name);
    const row = catalog.match(name, tech) ?? (bin ? catalog.match(`${bin[1]} Ammo`, tech) : undefined);
    if (!row) note(`${name} is not in our equipment table.`);
    const mount: Mount = { id: `mount-${index + 1}`, equipmentId: row?.id ?? null, name, techBase: tech, location: loc ?? null, slot: null };
    mounts.push(mount);
    const theirId = num(entry["id"]);
    if (theirId !== undefined) idToMount.set(theirId, mount.id);
    const target = num(entry["associated_id"]);
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

  // Clan CASE: one in each torso that carries ammunition, or a single one when the data does not say
  const fire = obj(unit["fire_control"]);
  if (fire?.["clan_case"] === true) {
    const caseRow = catalog.byId("case-clan");
    if (!caseRow) note("The unit has Clan CASE, which is not in our equipment table.");
    else {
      const isAmmo = (m: Mount) => (m.equipmentId ? catalog.byId(m.equipmentId)?.kind === "ammunition" : /\bammo\b/i.test(m.name));
      const torsos = TORSOS.filter((t) => mounts.some((m) => m.location === t && isAmmo(m)));
      const add = (location: LocationCode | null, n: number) =>
        mounts.push({ id: `case-${n}`, equipmentId: caseRow.id, name: caseRow.name, techBase: "clan", location, slot: null });
      if (torsos.length > 0) torsos.forEach((t, i) => add(t, i + 1));
      else {
        add(null, 1);
        note("The unit has Clan CASE, but no torso could be told to carry ammunition; one CASE is added unplaced.");
      }
    }
  }

  // Fluff
  const fluff = obj(unit["fluff"]);
  const notesOut: MechRecord["notes"] = {};
  for (const key of ["overview", "capabilities", "deployment", "variants", "notables"] as const) {
    const text = str(fluff?.[key]);
    if (text) notesOut[key] = text;
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
      id: num(unit["id"]) ?? 0,
      designer: str(unit["designer"]) ?? "",
      fetchedAt: now,
      original: response,
      values: {},
    },
  };
  const imageUrl = str(unit["image_url"]);
  if (imageUrl) record.imageUrl = imageUrl;
  const values = record.source?.values;
  if (values) {
    const bv = num(unit["battle_value"]);
    const cost = num(unit["cost"]);
    const rules = unit["rules_level"];
    const era = unit["era"];
    if (bv !== undefined) values.battleValue = bv;
    if (cost !== undefined) values.cost = cost;
    if (typeof rules === "string" || typeof rules === "number") values.rulesLevel = String(rules);
    if (typeof era === "string" || typeof era === "number") values.era = String(era);
  }

  placeMounts(record, catalog, note);
  return { ok: true, record, notes };
}

/** Gives each slot-taking mount that has a location the first run of free cells in it, in list order; one that does not
 * fit stays unplaced. The fixed cells come from layout(), so engine and gyro variants are the tables' business. */
function placeMounts(record: MechRecord, catalog: Catalog, note: (text: string) => void) {
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
    const taken = catalog.factsOf(mount, record)?.slots ?? 1;
    if (!cells || taken <= 0) continue;
    for (let first = 0; first + taken <= cells.length; first++) {
      if (cells.slice(first, first + taken).every(Boolean)) {
        for (let i = 0; i < taken; i++) cells[first + i] = false;
        mount.slot = first;
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// What has changed since the import
// ---------------------------------------------------------------------------------------------------------------

/** Canonical text of a value: object keys in order, so two equal values written in different key orders agree. */
function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  const o = obj(value);
  if (!o) return JSON.stringify(value) ?? "undefined";
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
    .join(",")}}`;
}

/** The field paths (as the checks name them), mount ids, and `mounts.removed` that differ from a fresh import of the
 * record's own saved Mordel response. Empty when the record has no source or the source cannot be read. */
export function changedSinceImport(record: MechRecord, catalog: Catalog): Set<string> {
  const changed = new Set<string>();
  try {
    if (!record.source) return changed;
    const fresh = fromMordel(record.source.original, catalog, record.editionId, record.source.fetchedAt, () => record.id);
    if (!fresh.ok) return changed;
    const was = fresh.record;
    const differ = (path: string, a: unknown, b: unknown) => {
      if (canon(a) !== canon(b)) changed.add(path);
    };
    differ("name", record.name, was.name);
    differ("notes", record.notes, was.notes);
    for (const field of ["tons", "year", "techBase", "configuration"] as const) differ(field, record[field], was[field]);
    for (const field of ["engine", "gyro", "cockpit", "structure", "armorType", "myomer", "heatSinks"] as const) {
      differ(`chassis.${field}`, record.chassis[field], was.chassis[field]);
    }
    for (const loc of new Set([...Object.keys(record.armor), ...Object.keys(was.armor)])) {
      differ(`armor.${loc}`, record.armor[loc as LocationCode], was.armor[loc as LocationCode]);
    }
    const now = new Map(record.mounts.map((m) => [m.id, m]));
    for (const m of was.mounts) {
      const here = now.get(m.id);
      if (!here) changed.add("mounts.removed");
      else differ(m.id, here, m);
    }
    const before = new Set(was.mounts.map((m) => m.id));
    for (const m of record.mounts) if (!before.has(m.id)) changed.add(m.id);
  } catch {
    return changed;
  }
  return changed;
}
