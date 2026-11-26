// Turning the JSON that mordel.net returns for one ProtoMech (unit type pm) into our ProtoMech record. Pure functions, no network. The response is untyped input: every
// field is narrowed before it is used, a field that is present with the wrong type is skipped with a note, and nothing here throws whatever it is given. Nothing is guessed:
// what cannot be matched to a part, a weapon or a location of ours is reported in the notes and kept as Mordel wrote it, and the rules check reports it afterwards.
// The fields read are the ones Mordel documents for a unit (name_parts, tons, year, tech_base, configuration, movement, engine, heat_sinks, jump_jets, cockpit, armor,
// locations, equipment, fluff, canon, sources, battle_value, cost). The documentation says nothing of glider or ultraheavy ProtoMechs and gives a configuration only as a
// word such as "Biped" or "Quad", so the words are matched loosely (see `chassisOf`).
import { PROTO_LAUNCHERS, PROTO_WEIGHT } from "../../data/protomech";
import { setYear } from "../availability";
import type { Catalog, EquipmentRow } from "../catalog";
import type { TechBase } from "../mech";
import { own } from "../walk";
import { engineRating, launcherOf, plainRun } from "./build";
import { protoLowestLevel } from "./checks";
import { protoDesignKey } from "./official";
import { protoBattleValue, protoCost } from "./rating";
import { newProtoRecord } from "./record";
import type { ProtoMount, ProtoRecord } from "./record";

export type ProtoMordelImport = { ok: true; record: ProtoRecord; notes: string[] } | { ok: false; message: string };

/** Mordel's location codes for a ProtoMech (documented: H, T, LA, RA, L, MG) and ours. */
const LOCATIONS: Record<string, string> = { H: "hd", HD: "hd", T: "t", CT: "t", LA: "la", RA: "ra", L: "lg", LG: "lg", MG: "mg" };

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);

/** The chassis a Mordel configuration word names: "quad", "glider", a biped (undefined) or none we know (null). Ultraheavy is a weight class here, not a chassis. */
function chassisOf(word: string): "quad" | "glider" | undefined | null {
  const w = word.toLowerCase();
  if (w.includes("quad")) return "quad";
  if (w.includes("glider")) return "glider";
  if (w.includes("biped") || w.includes("ultra") || w.trim() === "") return undefined;
  return null;
}

export function fromMordelProto(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string): ProtoMordelImport {
  try {
    return convert(response, catalog, editionId, now, newId);
  } catch {
    return { ok: false, message: "This response could not be read as a Mordel ProtoMech." };
  }
}

function convert(response: unknown, catalog: Catalog, editionId: string, now: string, newId: () => string): ProtoMordelImport {
  if (!isObject(response)) return { ok: false, message: "Mordel sent nothing this tool can read: the response is not an object." };
  if (response["status"] !== undefined && response["status"] !== "OK") {
    const why = typeof response["message"] === "string" ? response["message"] : typeof response["error"] === "string" ? response["error"] : "";
    return { ok: false, message: `Mordel answered with the status ${JSON.stringify(response["status"])}${why ? `: ${why}` : ""}.` };
  }
  const unit = response["unit"];
  if (!isObject(unit)) return { ok: false, message: "The response has no unit in it." };
  const mordelType = typeof unit["unit_type_short"] === "string" ? unit["unit_type_short"].toLowerCase() : "pm";
  if (mordelType !== "pm") return { ok: false, message: `This is a ${mordelType} unit, not a ProtoMech (pm).` };

  const notes: string[] = [];
  const note = (text: string) => notes.push(text);
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
  const sect = (v: unknown, label: string): Json | undefined => {
    if (v === undefined || v === null) return undefined;
    if (isObject(v)) return v;
    wrong(label);
    return undefined;
  };

  // Identity
  const parts = sect(unit["name_parts"], "name_parts");
  const chassisName = str(parts?.["name"], "name") ?? str(unit["name"], "name") ?? "";
  if (!chassisName) note("Mordel gave no name for this unit.");
  const tons = num(unit["tons"], "tonnage");
  if (tons === undefined) note("Mordel gave no tonnage; it is set to the lightest ProtoMech.");
  else if (tons < PROTO_WEIGHT.min || tons > PROTO_WEIGHT.max) note(`Mordel gives ${String(tons)} tons, which is outside the ${String(PROTO_WEIGHT.min)} to ${String(PROTO_WEIGHT.max)} a ProtoMech may weigh; the rules check reports it.`);
  const record = newProtoRecord({ id: newId(), chassis: chassisName, model: str(parts?.["model"], "model") ?? "", editionId, ...(tons === undefined ? {} : { tons }) });
  record.year = num(unit["year"], "year") ?? null;

  // Tech base: ProtoMechs are Clan units; Mixed comes with the Inner Sphere interface or Advanced rules.
  const techWord = str(unit["tech_base"], "tech base")?.toLowerCase();
  const mixedFlag = unit["mixed_tech"];
  if (mixedFlag !== undefined && mixedFlag !== null && typeof mixedFlag !== "boolean") wrong("mixed_tech");
  if (mixedFlag === true || techWord === "mixed") record.techBase = "mixed";
  else if (techWord?.includes("inner")) {
    record.techBase = "inner-sphere";
    note("Mordel says Inner Sphere; ProtoMechs are Clan units, so the rules check reports the tech base.");
  } else if (!techWord?.includes("clan")) note("Mordel did not say the tech base; Clan is assumed.");

  // Chassis
  const configWord = str(unit["configuration"], "configuration");
  if (!configWord) note("Mordel gave no configuration; a biped is assumed.");
  else {
    const chassis = chassisOf(configWord);
    if (chassis === null) {
      record.configuration = configWord.toLowerCase();
      note(`The configuration "${configWord}" is not one this tool lays out; it is stored as "${configWord.toLowerCase()}" and read as a biped.`);
    } else if (chassis !== undefined) record.configuration = chassis;
    else if (configWord.toLowerCase().includes("ultra")) note("Mordel calls this an Ultraheavy ProtoMech; that is a weight class, so it is a biped of its tonnage here.");
  }

  // Movement
  const movement = sect(unit["movement"], "movement");
  const walk = num(movement?.["walk"], "walking MP");
  const run = num(movement?.["run"], "running MP");
  const jump = num(movement?.["jump"], "jumping MP");
  const engine = sect(unit["engine"], "engine");
  const rating = num(engine?.["rating"], "engine rating");
  record.walk = walk ?? 1;
  if (walk === undefined) note("Mordel gave no walking MP; it is set to 1.");
  // A glider is built on its WiGE Cruising MP, which Mordel does not document: the one whose engine rating is Mordel's is read, else its walking MP.
  if (record.configuration === "glider" && rating !== undefined) {
    const fits = Array.from({ length: 40 }, (_, i) => i + 1).find((cruise) => engineRating({ ...record, walk: cruise }) === rating);
    if (fits !== undefined) {
      record.walk = fits;
      note(`A glider: its WiGE Cruising MP is read as ${String(fits)} from Mordel's engine rating of ${String(rating)}; check it.`);
    } else note("A glider: Mordel's engine rating matches no WiGE Cruising MP; its walking MP is used.");
  }
  if (record.configuration !== "glider") {
    record.jump = Math.max(0, jump ?? 0);
    if (run !== undefined && walk !== undefined && run === walk * 2 && plainRun(walk) !== run) {
      record.booster = true;
      note("Its running MP is twice its walking MP, so it is read as having the Myomer Booster.");
    }
  } else if ((jump ?? 0) > 0) note("Mordel gives a glider jumping MP; a glider has none, so it was left out.");
  const jets = sect(unit["jump_jets"], "jump_jets");
  const jetType = str(jets?.["type"], "jump jet type")?.toLowerCase();
  if (jetType && record.jump > 0) {
    if (jetType.includes("extended")) record.jumpType = "xjj";
    else if (jetType.includes("umu") || jetType.includes("underwater")) record.jumpType = "umu";
    else if (!/^(standard|protomech|jump)/.test(jetType)) note(`Mordel's jump jets "${jetType}" are not ones this tool knows; they are read as standard.`);
  }
  if (engine && rating !== undefined) {
    const ours = engineRating(record);
    if (ours !== null && ours !== rating) note(`Mordel's engine rating is ${String(rating)}; this tool works out ${String(ours)} from the speed.`);
  }
  const heat = sect(unit["heat_sinks"], "heat_sinks");
  record.heatSinks = Math.max(0, num(heat?.["count"], "heat sink count") ?? 0);

  // Parts that vary
  const cockpit = str(sect(unit["cockpit"], "cockpit")?.["type"], "cockpit type")?.toLowerCase();
  if (cockpit && (cockpit.includes("interface") || cockpit.includes("inner sphere"))) {
    record.cockpit = "interface";
    record.techBase = "mixed";
  }
  const armorPart = sect(unit["armor"], "armor");
  const armorType = str(armorPart?.["type"], "armor type")?.toLowerCase();
  if (armorType?.includes("electric") || armorType === "edp") record.armorType = "edp";
  else if (armorType && !/^(standard|protomech)/.test(armorType)) note(`Mordel's armor "${armorType}" is not one this tool knows; it is read as standard ProtoMech armor.`);

  // Armor by location, and the main gun
  const locations = unit["locations"];
  if (Array.isArray(locations)) {
    for (const item of locations) {
      const entry = sect(item, "location entry");
      const code = str(entry?.["code"], "location code");
      const loc = code ? own(LOCATIONS, code.toUpperCase()) : undefined;
      if (!entry || !loc) {
        if (entry) note(`A location${code ? ` called "${code}"` : ""} is not one a ProtoMech has and was skipped.`);
        continue;
      }
      const points = num(entry["armor"], `${loc} armor`);
      if (points === undefined) continue;
      record.armor[loc] = points;
      if (loc === "mg") record.mainGun = true;
    }
  } else {
    if (locations !== undefined && locations !== null) wrong("locations list");
    note("Mordel gave no locations, so there is no armor.");
  }

  // Equipment
  const list = unit["equipment"];
  if (list !== undefined && list !== null && !Array.isArray(list)) wrong("equipment list");
  const ammo: { name: string; shots: number }[] = [];
  const clan: TechBase = "clan";
  (Array.isArray(list) ? list : []).forEach((item, index) => {
    const entry = sect(item, `equipment entry ${String(index + 1)}`);
    const name = entry ? str(entry["name"], `equipment entry ${String(index + 1)} name`) : undefined;
    if (!entry || !name) {
      note(`Equipment entry ${String(index + 1)} has no usable name and was skipped.`);
      return;
    }
    const bin = /^(.*\S)\s*\(Ammo\s+(\d+)\)/i.exec(name);
    if (bin) {
      ammo.push({ name: (bin[1] ?? "").trim(), shots: Number(bin[2]) });
      return;
    }
    if (/^partial wing/i.test(name)) {
      record.partialWing = true;
      return;
    }
    const where = str(entry["location"], `${name} location`);
    const loc = where ? own(LOCATIONS, where.toUpperCase()) : undefined;
    if (where && !loc) note(`${name} is in "${where}", a location a ProtoMech does not have; it is left there for the rules check to report.`);
    if (!where) note(`${name} has no location; it is left unplaced for the rules check to report.`);
    if (loc === "mg") record.mainGun = true;
    const found = findRow(name, catalog, clan);
    const mount: ProtoMount = { id: `mount-${String(index + 1)}`, equipmentId: found.row?.id ?? null, name: found.row?.name ?? name, location: loc ?? where ?? "" };
    if (found.tubes !== undefined) mount.tubes = found.tubes;
    if (!found.row) note(`${name} is not in our equipment table.`);
    else if (found.tubes !== undefined) {
      const launcher = launcherOf(mount)?.launcher;
      if (launcher && found.tubes > launcher.maxTubes) note(`${name} has more tubes than a ProtoMech ${launcher.label} launcher may; the rules check reports it.`);
    }
    if (str(entry["facing"], `${name} facing`)?.toLowerCase() === "rear" && loc === "t") mount.rear = true;
    record.mounts.push(mount);
  });
  if (ammo.length > 0) note("Mordel lists ammunition as entries like \"LRM 3 (Ammo 1)\"; each is read as that many shots of the weapon it names. Check the ammunition counts.");
  for (const { name, shots } of ammo) {
    const found = findRow(name, catalog, clan);
    // Each entry goes to the next weapon of its kind that has no ammunition yet (two launchers of one size each get theirs), else to the first.
    const kind = record.mounts.filter((m) => (found.row ? m.equipmentId === found.row.id && (found.tubes === undefined || m.tubes === found.tubes) : m.name === name));
    const target = kind.find((m) => m.shots === undefined) ?? kind[0];
    if (target) target.shots = (target.shots ?? 0) + shots;
    else note(`Ammunition for ${name} was left out: no such weapon is on the unit.`);
  }

  // Notes, values, the level and the mark
  const fluff = sect(unit["fluff"], "fluff");
  for (const key of ["overview", "capabilities", "deployment", "variants", "notables"] as const) {
    const t = str(fluff?.[key], `fluff ${key}`);
    if (t) record.notes[key] = t;
  }
  if (record.year !== null) setYear(record, record.year);
  record.rulesLevel = protoLowestLevel(record, catalog);
  const values: NonNullable<ProtoRecord["source"]>["values"] = {};
  const bv = num(unit["battle_value"], "battle value");
  const cost = num(unit["cost"], "cost");
  const rules = str(unit["rules_level"], "rules level");
  const era = str(unit["era"], "era");
  if (bv !== undefined) values.battleValue = bv;
  if (cost !== undefined) values.cost = cost;
  if (rules !== undefined) values.rulesLevel = rules;
  if (era !== undefined) values.era = era;
  record.source = { kind: "mordel", unitType: "pm", id: num(unit["id"], "unit id") ?? 0, designer: str(unit["designer"], "designer") ?? "", fetchedAt: now, values };
  const ourBv = protoBattleValue(record, catalog).total;
  if (bv !== undefined && bv !== ourBv) note(`Mordel's Battle Value is ${String(bv)}; this tool works out ${String(ourBv)}.`);
  const ourCost = protoCost(record, catalog).total;
  if (cost !== undefined && Math.round(cost) !== Math.round(ourCost)) note(`Mordel's cost is ${cost.toLocaleString("en-US")} C-bills; this tool works out ${ourCost.toLocaleString("en-US")}.`);
  // Mordel's canon flag is the one thing that makes an import OFFICIAL, and the title of its first listed source is the book.
  if (unit["canon"] === true) {
    const sources = Array.isArray(unit["sources"]) ? unit["sources"] : [];
    const first: unknown = sources.find((s) => isObject(s) && typeof s["title"] === "string" && s["title"].trim() !== "");
    const book = isObject(first) && typeof first["title"] === "string" ? first["title"].trim() : "a published book (Mordel marks it canon)";
    record.official = { status: "official", book, design: protoDesignKey(record) };
  }
  return { ok: true, record, notes: [...new Set(notes)] };
}

/** The catalog row for a name Mordel gives: a missile launcher ("LRM 3", "SRM 2", "Streak SRM 4") is its family row with the tubes, any other item is matched by name. */
function findRow(name: string, catalog: Catalog, tech: TechBase): { row?: EquipmentRow; tubes?: number } {
  const launch = /^(LRM|SRM|Streak SRM)[\s-]*(\d+)$/i.exec(name.trim());
  if (launch) {
    const kind = (launch[1] ?? "").toLowerCase().replace(/\s+/g, "");
    const family = own(PROTO_LAUNCHERS.rows, kind === "streaksrm" ? "streak" : kind);
    const row = family ? catalog.byId(family.row) : undefined;
    if (row) return { row, tubes: Number(launch[2]) };
  }
  const row = catalog.match(name, tech);
  return row ? { row } : {};
}

