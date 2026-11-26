// Reading the files a member downloads from a mordel.net unit page: the 'Mech file (.mtf), the Alpha Strike Conversion text, and the vehicle
// file (.blk), which only gets a plain message. We read the files' own shape (key lines, one list of slots per location, a block of "Final"
// lines); nothing here comes from any other tool. The 'Mech file is turned into the same shape Mordel's API sends and handed to `fromMordel`,
// so the equipment matching, the notes and the rules level are the API import's, then each item is put in the slot the file gives it.
// Nothing throws on text it does not understand: the answer is a plain message instead.
import { ERAS } from "../data/editions";
import type { Catalog } from "./catalog";
import { fromMordel } from "./mordel";
import { LOCATION_NAMES } from "./mech";
import type { LocationCode, MechRecord, MordelSource } from "./mech";
import { newAsUnit, parseDamage, parseMove, parseSpecials } from "./as-unit";
import type { AsCard, AsDamage, AsUnit } from "./as-unit";
import { AS_EDITION } from "../data/alpha-strike";

export type FileKind = "mtf" | "blk" | "as-conversion" | "pdf" | "unknown";

/** What a downloaded file is, from its text (and its name, for a PDF, whose text is not text). */
export function fileKind(text: string, name = ""): FileKind {
  if (/^%PDF-/.test(text) || /\.pdf$/i.test(name)) return "pdf";
  if (/<BlockVersion>|<UnitType>/i.test(text)) return "blk";
  if (/Alpha Strike Conversion/i.test(text) && /^Final Point Value\s*:/im.test(text)) return "as-conversion";
  if (/^\s*chassis\s*:/im.test(text) && /^\s*mass\s*:/im.test(text)) return "mtf";
  return "unknown";
}

/** The plain message for a file that is not the kind the importer wants: which kind it is and where it can go instead. */
export function wrongFileMessage(kind: FileKind, wanted: "mtf" | "as-conversion"): string {
  const here = wanted === "mtf" ? "the 'Mech import on the Classic BattleTech home" : "the Alpha Strike import on the Alpha Strike home";
  switch (kind) {
    case "blk":
      return wanted === "mtf"
        ? "This is a vehicle file (.blk). Classic BattleTech has no vehicle builder yet, so we cannot open it here. Download the unit's Alpha Strike Conversion text from its mordel.net page and import that on the Alpha Strike home instead."
        : "This is a vehicle file (.blk), which holds no Alpha Strike values. Download the unit's Alpha Strike Conversion text from its mordel.net page and import that here.";
    case "mtf":
      return `This is a 'Mech file (.mtf). Use ${wanted === "mtf" ? here : "the import on the Classic BattleTech home"} for it.`;
    case "as-conversion":
      return `This is an Alpha Strike Conversion text. Use ${wanted === "as-conversion" ? here : "the import on the Alpha Strike home"} for it.`;
    case "pdf":
      return "This is a PDF record sheet. We cannot read PDFs; download the unit's .mtf file or its Alpha Strike Conversion text instead.";
    default:
      return wanted === "mtf" ? "We could not read that as a Mordel 'Mech (.mtf) file." : "We could not read that as a Mordel Alpha Strike Conversion text.";
  }
}

/** The member a file names, as one of its key lines. The 'Mech files we have seen name none; the credit then reads "a mordel.net member". */
const DESIGNER_KEYS = ["designer", "author", "member", "created by"];
export const UNNAMED_MEMBER = "a mordel.net member";

// ---------------------------------------------------------------------------------------------------------------------------
// The 'Mech file
// ---------------------------------------------------------------------------------------------------------------------------

export type MtfImport = { ok: true; record: MechRecord; notes: string[] } | { ok: false; message: string };
type Json = Record<string, unknown>;

const SECTION_NAMES = new Map<string, LocationCode>((Object.entries(LOCATION_NAMES) as [LocationCode, string][]).map(([code, name]) => [name.toLowerCase(), code]));
/** Armor lines name the three rear torso facings. */
const ARMOR_CODES: Record<string, { code: LocationCode; rear: boolean }> = {
  RTL: { code: "LT", rear: true },
  RTR: { code: "RT", rear: true },
  RTC: { code: "CT", rear: true },
};
const ARMOR_FRONT: LocationCode[] = ["HD", "CT", "LT", "RT", "LA", "RA", "LL", "RL", "CL", "FLL", "FRL", "RLL", "RRL"];
/** Slots every 'Mech of that part has by construction: the layout draws them, so the file's lines for them are not items. */
const FIXED_LINES = new Set(
  ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator", "Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator", "Fusion Engine", "Engine", "Gyro", "Life Support", "Sensors", "Cockpit"].map((s) =>
    s.toLowerCase(),
  ),
);

const tidy = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const techWord = (s: string): "Clan" | "Inner Sphere" | undefined => (/\bclan\b|\bcl\b/i.test(s) ? "Clan" : /\binner sphere\b|\bis\b/i.test(s) ? "Inner Sphere" : undefined);

interface Parsed {
  keys: Map<string, string>;
  slots: Map<LocationCode, string[]>;
  weapons: { name: string; where: string }[];
}

function readLines(text: string): Parsed {
  const out: Parsed = { keys: new Map(), slots: new Map(), weapons: [] };
  let current: LocationCode | undefined;
  let inWeapons = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") {
      current = undefined;
      inWeapons = false;
      continue;
    }
    const section = /^([A-Za-z ]+?)\s*:$/.exec(line);
    const sectionCode = section ? SECTION_NAMES.get((section[1] ?? "").toLowerCase()) : undefined;
    if (sectionCode) {
      current = sectionCode;
      inWeapons = false;
      out.slots.set(sectionCode, out.slots.get(sectionCode) ?? []);
      continue;
    }
    if (current) {
      out.slots.get(current)?.push(line);
      continue;
    }
    if (/^weapons\s*:\s*\d*$/i.test(line)) {
      inWeapons = true;
      continue;
    }
    if (inWeapons) {
      const at = line.lastIndexOf(",");
      if (at > 0) out.weapons.push({ name: line.slice(0, at).trim(), where: line.slice(at + 1).trim() });
      continue;
    }
    const kv = /^([^:]+?)\s*:\s*(.*)$/.exec(line);
    if (kv && !out.keys.has((kv[1] ?? "").toLowerCase())) out.keys.set((kv[1] ?? "").toLowerCase(), kv[2] ?? "");
  }
  return out;
}

/** Spellings of an item's line to try against the equipment table, with the tech base a prefix (IS, CL or Clan) names. */
function spellings(line: string): { names: string[]; tech?: "inner-sphere" | "clan" } {
  const prefixed = /^(IS|CL|Clan)\s*(?=[A-Z0-9(])(.+)$/.exec(line);
  const tech = prefixed ? ((prefixed[1] ?? "").toLowerCase() === "is" ? ("inner-sphere" as const) : ("clan" as const)) : undefined;
  const rest = prefixed ? (prefixed[2] ?? line) : line;
  const spaced = rest.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return { names: [...new Set([line, rest, spaced])], tech };
}

interface Item {
  name: string;
  location: LocationCode;
  slot: number;
  slots: number;
  tech: "inner-sphere" | "clan";
  rear?: true;
  /** The file's line and the slots the equipment table gives the item, when the run in this location is shorter than that. */
  short?: { line: string; size: number };
  /** Shared by the two runs of one split weapon. */
  pair?: number;
}

/**
 * Turns the text of a .mtf file into a 'Mech record, unsaved, with notes for the player. `designer` on the record is the member the file
 * names, else "a mordel.net member".
 */
export function fromMtf(text: string, catalog: Catalog, editionId: string, now: string, newId: () => string): MtfImport {
  try {
    return convertMtf(text, catalog, editionId, now, newId);
  } catch {
    return { ok: false, message: "We could not read that file as a Mordel 'Mech (.mtf) file." };
  }
}

function convertMtf(text: string, catalog: Catalog, editionId: string, now: string, newId: () => string): MtfImport {
  const file = readLines(text);
  const key = (k: string) => file.keys.get(k)?.trim() || undefined;
  const chassisName = key("chassis");
  const tons = Number(key("mass"));
  if (!chassisName) return { ok: false, message: "That file has no chassis name, so it is not a Mordel 'Mech file we can read." };
  if (!Number.isFinite(tons) || tons <= 0) return { ok: false, message: "That file has no usable mass, so it is not a Mordel 'Mech file we can read." };
  const engine = /^(\d+)\s+(.+?)\s*(?:\(\s*([A-Za-z ]+?)\s*\))?$/.exec(key("engine") ?? "");
  if (!engine) return { ok: false, message: "That file has no engine we can read (it should look like \"180 Fusion Engine(IS)\")." };
  if (file.slots.size === 0 && file.weapons.length === 0) return { ok: false, message: "That file lists no locations, so it is not a Mordel 'Mech file we can read." };

  const notes: string[] = [];
  const techText = key("techbase") ?? "";
  const mixed = /mixed/i.test(techText);
  const unitTech = mixed ? undefined : techWord(techText);
  const defaultTech: "inner-sphere" | "clan" = unitTech === "Clan" ? "clan" : "inner-sphere";
  const pick = (value: string | undefined, drop?: RegExp) => {
    if (!value) return undefined;
    const tech = techWord(value.replace(/\bdouble\b/i, ""));
    const type = value.replace(/\(\s*(IS|Inner Sphere|Clan)\s*\)/i, "").replace(/^\s*(IS|Inner Sphere|Clan)\b/i, "").replace(drop ?? /$^/, "").trim();
    return { type, technology: tech };
  };

  // Where the lines are: every location's lines in order, the items among them, and which lines are the structure's and the armor's slots.
  const structure = pick(key("structure"));
  const armorHeader = pick(key("armor"));
  const structureLine = structure && !/^standard$/i.test(structure.type) ? tidy(structure.type) : undefined;
  const armorLine = armorHeader && !/^standard$/i.test(armorHeader.type) ? tidy(armorHeader.type) : undefined;
  const items: Item[] = [];
  const partCells: { part: "structure" | "armor"; location: LocationCode; slot: number }[] = [];
  const unmatched = new Set<string>();
  const find = (line: string) => {
    const { names, tech } = spellings(line);
    const order: ("inner-sphere" | "clan")[] = tech ? [tech] : mixed ? ["inner-sphere", "clan"] : [defaultTech];
    for (const t of order) for (const name of names) {
      const row = catalog.match(name, t);
      if (row) return { row, tech: t };
    }
    return { row: undefined, tech: order[0] ?? defaultTech, name: names[1] ?? line };
  };
  for (const [location, lines] of file.slots) {
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      const lower = line.toLowerCase();
      if (lower === "-empty-" || FIXED_LINES.has(lower)) {
        i += 1;
        continue;
      }
      if (structureLine && tidy(line) === structureLine) {
        partCells.push({ part: "structure", location, slot: i });
        i += 1;
        continue;
      }
      if (armorLine && tidy(line) === armorLine) {
        partCells.push({ part: "armor", location, slot: i });
        i += 1;
        continue;
      }
      let run = 1;
      while (lines[i + run] === line) run += 1;
      // A rear-firing item's line ends in "(R)"; the rest of the line is its name.
      const rear = /\s*\(R\)$/i.test(line);
      const found = find(rear ? line.replace(/\s*\(R\)$/i, "") : line);
      const each = found.row && typeof found.row.slots === "number" && found.row.slots > 0 ? found.row.slots : undefined;
      const size = each ?? run;
      const name = found.row?.name ?? found.name ?? line;
      if (!found.row) unmatched.add(line);
      for (let taken = 0; taken < run; taken += size) {
        const length = Math.min(size, run - taken);
        items.push({ name, location, slot: i + taken, slots: length, tech: found.tech, ...(rear ? { rear: true as const } : {}), ...(length < size ? { short: { line, size } } : {}) });
      }
      i += run;
    }
  }
  // A split weapon (TechManual p.57) is two short runs of one item in two locations whose slots add up to the item's: they become one
  // mount, weighed once. A short run with no partner is kept at the length the file gives, with a note.
  let pairs = 0;
  for (const a of items) {
    if (!a.short || a.pair !== undefined) continue;
    const b = items.find((x) => x !== a && x.pair === undefined && x.short?.size === a.short?.size && x.name === a.name && x.tech === a.tech && x.location !== a.location && x.slots + a.slots === a.short?.size);
    if (b) a.pair = b.pair = ++pairs;
  }
  for (const item of items) {
    if (item.short && item.pair === undefined) notes.push(`${item.short.line} fills ${item.slots} slots in the ${LOCATION_NAMES[item.location]} where the equipment table says it takes ${item.short.size}; it is kept as ${item.slots}.`);
  }
  if (items.length === 0 && file.weapons.length > 0) {
    // A file with no slot lists still names its weapons and where they are.
    for (const w of file.weapons) {
      const code = SECTION_NAMES.get(w.where.toLowerCase());
      if (!code) {
        notes.push(`${w.name} is in "${w.where}", a location we do not know; it was left out.`);
        continue;
      }
      const found = find(w.name);
      items.push({ name: found.row?.name ?? found.name ?? w.name, location: code, slot: -1, slots: 1, tech: found.tech });
    }
    notes.push("The file has no slot lists, so the weapons it names are placed for you to move.");
  }

  // The fields Mordel's API would have sent.
  const armorEntries = new Map<LocationCode, { front?: number; rear?: number }>();
  for (const [k, v] of file.keys) {
    const m = /^([a-z]{2,3}) armor$/.exec(k);
    const n = Number(v);
    if (!m || !Number.isFinite(n)) continue;
    const code = (m[1] ?? "").toUpperCase();
    const rear = Object.hasOwn(ARMOR_CODES, code) ? ARMOR_CODES[code] : undefined;
    const front = (ARMOR_FRONT as string[]).includes(code) ? (code as LocationCode) : undefined;
    if (rear) armorEntries.set(rear.code, { ...armorEntries.get(rear.code), rear: n });
    else if (front) armorEntries.set(front, { ...armorEntries.get(front), front: n });
  }
  const center = file.slots.get("CT") ?? [];
  const gyroLines = center.filter((l) => /gyro/i.test(l));
  const gyroNamed = key("gyro") ?? gyroLines.map((l) => l.replace(/gyro/i, "").trim()).find((s) => s !== "");
  const gyroByCount: Record<number, string> = { 2: "Compact", 4: "Standard", 6: "XL" };
  const gyro = gyroNamed ?? gyroByCount[gyroLines.length];
  const cockpitLine = key("cockpit") ?? [...(file.slots.get("HD") ?? []), ...center].find((l) => /cockpit/i.test(l));
  const cockpit = cockpitLine ? cockpitLine.replace(/cockpit/i, "").trim() || "Standard" : undefined;
  const sinks = /^(\d+)\s*(.*)$/.exec(key("heat sinks") ?? "");
  const sinkKind = pick(sinks?.[2]);
  const part = (p: { type: string; technology?: string } | undefined) => (p ? { type: p.type, ...(p.technology ? { technology: p.technology } : {}) } : undefined);
  const engineTech = techWord(engine[3] ?? "");
  const rulesNumber = Number(key("rules level"));
  const LEVEL_NAMES = ["Introductory", "Standard", "Advanced", "Experimental"];
  const year = Number(key("era"));
  const era = Number.isFinite(year) ? ERAS.find((e) => year >= e.startYear && (e.endYear === undefined || year <= e.endYear))?.name : undefined;
  const hasActuators = (loc: LocationCode) => (file.slots.get(loc) ?? []).some((l) => /^shoulder$/i.test(l));
  const fluff: Json = {};
  for (const k of ["overview", "capabilities", "deployment", "variants", "notables"]) if (key(k)) fluff[k] = key(k);
  const designer = DESIGNER_KEYS.map(key).find((v) => v !== undefined) ?? UNNAMED_MEMBER;
  const industrial = /industrial/i.test(cockpit ?? "");
  const response: Json = {
    status: "OK",
    unit: {
      unit_type_short: industrial ? "im" : "bm",
      name: `${chassisName} ${key("model") ?? ""}`.trim(),
      name_parts: { name: chassisName, model: key("model") ?? "" },
      designer,
      tons,
      year: Number.isFinite(year) ? year : null,
      tech_base: mixed ? "Mixed" : (unitTech ?? null),
      mixed_tech: mixed,
      configuration: (key("config") ?? "").replace(/\s*omni\s*mech\s*$/i, "").trim(),
      rules_level: Number.isInteger(rulesNumber) && rulesNumber >= 1 && rulesNumber <= 4 ? LEVEL_NAMES[rulesNumber - 1] : (key("rules level") ?? null),
      era: era ?? null,
      engine: { type: engine[2]?.replace(/\s*engine$/i, ""), rating: Number(engine[1]), technology: engineTech ?? null },
      gyro: gyro ? { type: gyro } : null,
      cockpit: cockpit ? { type: cockpit } : null,
      structure: part(structure) ?? null,
      armor: part(armorHeader) ?? null,
      myomer: key("myomer") ? { type: key("myomer") } : null,
      heat_sinks: sinks ? { type: sinkKind?.type || "Single", technology: sinkKind?.technology ?? null, count: Number(sinks[1]) } : null,
      locations: [...armorEntries].map(([code, a]) => ({ code, armor: a.front ?? 0, rear_armor: a.rear ?? 0 })),
      equipment: items.map((item) => ({ name: item.name, location: item.location, technology: item.tech === "clan" ? "Clan" : "Inner Sphere", slots: item.slots, id: item.pair ?? null, facing: item.rear ? "Rear" : "Front" })),
      fluff,
    },
  };
  const result = fromMordel(response, catalog, editionId, now, newId, industrial ? "im" : "bm");
  if (!result.ok) return { ok: false, message: result.message };
  const record = result.record;
  let kept = [...result.notes];

  // The file's own slot for each item, structure slot and armor slot; its own arm actuators.
  const fromFile = new Map<string, { location: LocationCode; slot: number }>();
  /** A split weapon's two runs, by the id of the one mount the API import made of them (its first entry's). */
  const splitFromFile = new Map<string, Item[]>();
  items.forEach((item, at) => {
    if (item.pair !== undefined) {
      const first = items.findIndex((x) => x.pair === item.pair);
      splitFromFile.set(`mount-${first + 1}`, [...(splitFromFile.get(`mount-${first + 1}`) ?? []), item]);
    } else if (item.slot >= 0) fromFile.set(`mount-${at + 1}`, { location: item.location, slot: item.slot });
  });
  const fileFits = (["structure", "armor"] as const).every((p) => partCells.filter((c) => c.part === p).length === record.mounts.filter((m) => m.part === p).length);
  if (fileFits) {
    for (const p of ["structure", "armor"] as const) {
      partCells.filter((c) => c.part === p).forEach((c, at) => fromFile.set(`${p}-${at + 1}`, { location: c.location, slot: c.slot }));
    }
    for (const m of record.mounts) {
      const spot = fromFile.get(m.id);
      if (spot) {
        m.location = spot.location;
        m.slot = spot.slot;
      }
      const runs = splitFromFile.get(m.id);
      const own = runs?.find((r) => r.location === m.location);
      const other = runs?.find((r) => r !== own);
      if (m.split && own && other && other.location === m.split.location) {
        m.slot = own.slot;
        m.split = { ...m.split, slot: other.slot };
      }
    }
    kept = kept.filter((n) => !/^Mordel does not say where the .* slots are\./.test(n));
  } else if (partCells.length > 0) {
    notes.push("The structure and armor slots in the file do not add up to what the chassis needs, so we placed them in the first free slots.");
  }
  if ((record.configuration === "biped" || record.configuration === "tripod") && hasActuators("LA") && hasActuators("RA")) {
    const arms: NonNullable<MechRecord["arms"]> = {};
    for (const arm of ["LA", "RA"] as const) {
      const lines = (file.slots.get(arm) ?? []).map((l) => l.toLowerCase());
      const state = { lowerArm: lines.includes("lower arm actuator"), hand: lines.includes("hand actuator") };
      if (!state.lowerArm || !state.hand) arms[arm] = state;
    }
    if (Object.keys(arms).length > 0) record.arms = arms;
    else delete record.arms;
    kept = kept.filter((n) => !/^Mordel does not say which actuators/.test(n));
  }
  if (/omni/i.test(key("config") ?? "")) notes.push("This file is an OmniMech. It comes in as a plain 'Mech with all its equipment; use Make Omni in the editor to split it into a base and pods.");
  if (unmatched.size > 0 && !kept.some((n) => /not in our equipment table/.test(n))) kept.push(`${[...unmatched].join(", ")} ${unmatched.size === 1 ? "is" : "are"} not in our equipment table.`);

  const designerNamed = designer !== UNNAMED_MEMBER;
  if (record.source?.kind === "mordel") {
    const source: MordelSource = { ...record.source, unitType: industrial ? "im" : "bm", id: 0, designer, original: { file: "mtf", text } };
    record.source = source;
    const { name, notes: fluffNotes, tons: t, year: y, techBase, configuration, chassis, armor, arms, mounts } = structuredClone(record);
    source.baseline = { name, notes: fluffNotes, tons: t, year: y, techBase, configuration, chassis, armor, arms, mounts };
  }
  return {
    ok: true,
    record,
    notes: [...new Set([`We read this from a file downloaded from mordel.net${designerNamed ? "" : ", which does not name its designer"}. It is not saved until you save it.`, ...kept, ...notes])],
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// The Alpha Strike Conversion text
// ---------------------------------------------------------------------------------------------------------------------------

export type AsTextImport = { ok: true; unit: AsUnit } | { ok: false; message: string };

/** Splits "Name Model" where the last word is a model code (letters and digits joined by dashes); a name without one has no model. */
function splitName(full: string): { chassis: string; model: string } {
  const words = full.trim().split(/\s+/);
  const last = words.at(-1) ?? "";
  if (words.length > 1 && /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+[A-Za-z]?$/.test(last) && /\d/.test(last)) return { chassis: words.slice(0, -1).join(" "), model: last };
  return { chassis: full.trim(), model: "" };
}

/** An Alpha Strike unit from the "Alpha Strike Conversion" text a Mordel unit page lets a member download: the Final lines give the card. */
export function fromAsConversion(text: string, now: string, newId: () => string): AsTextImport {
  try {
    return convertAs(text, now, newId);
  } catch {
    return { ok: false, message: "We could not read that file as a Mordel Alpha Strike Conversion text." };
  }
}

function convertAs(text: string, now: string, newId: () => string): AsTextImport {
  const lines = text.split(/\r?\n/);
  const finals = new Map<string, string>();
  for (const line of lines) {
    const m = /^\s*Final ([^:]+?)\s*:\s*(.*?)\s*$/.exec(line);
    if (m && !finals.has((m[1] ?? "").toLowerCase())) finals.set((m[1] ?? "").toLowerCase(), m[2] ?? "");
  }
  const head = (label: string) => new RegExp(`^\\s*${label}\\s*:\\s*(.+?)\\s*$`, "im").exec(text)?.[1];
  const unreadable = (what: string): AsTextImport => ({ ok: false, message: `That conversion text is missing ${what}, so nothing was imported.` });
  const whole = (label: string) => {
    const v = finals.get(label);
    return v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined;
  };
  const type = finals.get("unit type");
  const size = whole("weight/size class");
  const armor = whole("armor value");
  const structure = whole("structure value");
  const pv = whole("point value");
  if (!type || !/^[A-Z]{2}$/.test(type)) return unreadable("its unit type");
  if (size === undefined || armor === undefined || structure === undefined || pv === undefined) return unreadable("its size, armor, structure or Point Value");
  const move = parseMove(finals.get("movement and movement modes") ?? "");
  if (!move.ok || move.value.length === 0) return unreadable("its movement");
  const reach = (label: string): AsDamage | undefined => {
    const parsed = parseDamage(finals.get(label) ?? "");
    return parsed.ok ? parsed.value : undefined;
  };
  const [s, m, l] = [reach("short range damage value"), reach("medium range damage value"), reach("long range damage value")];
  if (s === undefined || m === undefined || l === undefined) return unreadable("its damage values");
  const extra = finals.has("extreme range damage value") ? reach("extreme range damage value") : undefined;
  const overheat = finals.get("overheat value") ?? /(\d+)\s*\(Overheat\)/.exec(text)?.[1] ?? "0";
  const tmm = /Target Movement Modifier at .+? is (-?\d+)/i.exec(text)?.[1];

  // The special abilities: what follows "=" on each line of that block.
  const start = lines.findIndex((x) => /^\s*Determine Special Abilities/i.test(x));
  const specials: string[] = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (/^={5,}/.test(line)) break;
      const at = line.lastIndexOf("=");
      const code = at >= 0 ? line.slice(at + 1).trim() : "";
      if (code !== "" && !specials.includes(code)) specials.push(code);
    }
  }

  const card: AsCard = {
    type,
    size,
    tmm: tmm === undefined ? null : Number(tmm),
    move: move.value,
    role: null,
    pv,
    damage: extra === undefined ? { s, m, l } : { s, m, l, e: extra },
    ov: Number(overheat) || 0,
    armor,
    structure,
    specials: parseSpecials(specials.join(", ")),
  };
  const unit = newAsUnit(newId());
  unit.name = splitName((head("Name/Model") ?? "").replace(/^\s+|\s+$/g, ""));
  unit.card = card;
  const tech = tidy(head("Technology") ?? "");
  if (tech === "clan") unit.techBase = "clan";
  else if (tech === "innersphere") unit.techBase = "inner-sphere";
  else if (tech === "mixed") unit.techBase = "mixed";
  const designer = DESIGNER_KEYS.map((k) => head(k)).find((v) => v !== undefined);
  unit.source = {
    kind: "mordel",
    credit: `${designer ? `Designed by ${designer}` : `Designed by ${UNNAMED_MEMBER}`} on mordel.net; Alpha Strike Conversion text you downloaded`,
    at: now,
    values: structuredClone(card),
  };
  unit.editionId = AS_EDITION.id;
  return { ok: true, unit };
}
