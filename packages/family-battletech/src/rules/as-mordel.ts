// Mordel's Alpha Strike block as an Alpha Strike unit. The response is the same detail body the Classic import reads; only the
// `alpha_strike` block, the top-level role, rules level, era, year and name parts are used. Nothing here throws on a body it does
// not understand: it answers with a plain message instead.
import { AS_EDITION } from "../data/alpha-strike";
import type { RulesLevel } from "../data/chassis";
import { ERAS } from "../data/editions";
import { newAsUnit, parseDamage, parseMove, parseSpecials } from "./as-unit";
import type { AsCard, AsDamage, AsUnit } from "./as-unit";

/** The unit types mordel.net holds Alpha Strike values for. */
export const AS_MORDEL_TYPES = ["bm", "cv", "im", "pm"];

export type AsMordelImport = { ok: true; unit: AsUnit } | { ok: false; message: string };

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
const LEVELS: Record<string, RulesLevel> = { introductory: "introductory", standard: "standard", advanced: "advanced", experimental: "experimental", unlimited: "unlimited" };
const unreadable = (what: string): AsMordelImport => ({ ok: false, message: `mordel.net sent Alpha Strike values we could not read (${what}). Nothing was imported.` });

/** `requested` is the unit type asked for, used when the body does not say its own. */
export function fromMordelAs(response: unknown, now: string, newId: () => string, requested = "bm"): AsMordelImport {
  try {
    return convert(response, now, newId, requested);
  } catch {
    return unreadable("the response");
  }
}

function convert(response: unknown, now: string, newId: () => string, requested: string): AsMordelImport {
  if (!isObject(response) || !isObject(response["unit"])) return { ok: false, message: "mordel.net sent nothing we can read as a unit." };
  const unit = response["unit"];
  const mordelType = (typeof unit["unit_type_short"] === "string" ? unit["unit_type_short"] : requested).toLowerCase();
  if (!AS_MORDEL_TYPES.includes(mordelType)) return { ok: false, message: "mordel.net has Alpha Strike values only for BattleMechs, IndustrialMechs, ProtoMechs and combat vehicles." };
  const block = unit["alpha_strike"];
  if (!isObject(block)) return { ok: false, message: "mordel.net has no Alpha Strike values for this unit." };

  const count = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const text = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
  const size = count(block["size"]);
  const armor = count(block["armor"]);
  const structure = count(block["structure"]);
  const pv = count(block["point_value"]) ?? count(unit["point_value"]);
  if (size === undefined || armor === undefined || structure === undefined || pv === undefined) return unreadable("size, armor, structure or Point Value");

  const move = parseMove(text(block["move"]) ?? "");
  if (!move.ok) return unreadable("movement");
  const damageText = isObject(block["damage"]) ? block["damage"] : {};
  const reach = (name: string): AsDamage | undefined => {
    const v = damageText[name];
    const parsed = parseDamage(typeof v === "number" ? String(v) : typeof v === "string" ? v : "");
    return parsed.ok ? parsed.value : undefined;
  };
  const [s, m, l] = [reach("short"), reach("medium"), reach("long")];
  if (s === undefined || m === undefined || l === undefined) return unreadable("damage");
  const specialsRaw = block["specials"];
  const specialsText = Array.isArray(specialsRaw) ? specialsRaw.filter((p): p is string => typeof p === "string").join(", ") : (text(specialsRaw) ?? "");

  const tmm = count(block["tmm"]) ?? null;
  const card: AsCard = {
    type: (text(block["type"]) ?? mordelType).toUpperCase(),
    size,
    tmm,
    move: move.value,
    role: text(unit["role"]) ?? null,
    pv,
    damage: { s, m, l },
    ov: count(block["overheat"]) ?? 0,
    armor,
    structure,
    specials: parseSpecials(specialsText),
  };

  const parts = isObject(unit["name_parts"]) ? unit["name_parts"] : {};
  const out = newAsUnit(newId());
  out.name = { chassis: text(parts["name"]) ?? text(unit["name"]) ?? "", model: text(parts["model"]) ?? "" };
  out.card = card;
  const level = LEVELS[key(text(unit["rules_level"]) ?? "")];
  if (level) out.rulesLevel = level;
  const tech = key(text(unit["tech_base"]) ?? "");
  if (unit["mixed_tech"] === true || tech === "mixed") out.techBase = "mixed";
  else if (tech === "clan") out.techBase = "clan";
  else if (tech === "innersphere") out.techBase = "inner-sphere";
  const year = count(unit["year"]);
  if (year !== undefined) out.year = year;
  const era = ERAS.find((e) => key(e.name) === key(text(unit["era"]) ?? ""));
  if (era) out.era = era.id;
  const designer = text(unit["designer"]);
  const id = count(unit["id"]);
  out.source = {
    kind: "mordel",
    credit: `${designer ? `Designed by ${designer}` : "A design"} on mordel.net; API by MordelBlacknight`,
    ...(id === undefined ? {} : { ref: `${mordelType} ${String(id)}` }),
    at: now,
    values: structuredClone(card),
  };
  out.editionId = AS_EDITION.id;
  return { ok: true, unit: out };
}
