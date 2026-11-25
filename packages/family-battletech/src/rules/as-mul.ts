// A Master Unit List unit page the player saved from their own browser, read as an Alpha Strike unit. The page comes as MHTML (one file
// holding the page and its pictures, each part encoded) or as a plain HTML file saved "complete". We decode MHTML ourselves, find the
// page, and take only figures and names from its markup: the Alpha Strike stat block, the damage chip, the ability codes (never the
// publisher's wording beside them), the details list and the title. Pictures, card text and the availability tables are left alone.
// Nothing here throws on a file it does not understand: it answers with a plain message.
import { AS_EDITION, AS_UNIT_TYPES } from "../data/alpha-strike";
import type { RulesLevel } from "../data/chassis";
import { ERAS } from "../data/editions";
import { canon } from "./official";
import { formatSpecials, newAsUnit, parseDamage, parseMove, parseSpecials } from "./as-unit";
import type { AsCard, AsDamage, AsUnit } from "./as-unit";

export type AsMulImport = { ok: true; unit: AsUnit } | { ok: false; message: string };

/** The book the OFFICIAL mark names for a unit read from the Master Unit List. */
export const MUL_OFFICIAL_BOOK = "Master Unit List";
export const MUL_CREDIT = "Master Unit List page you saved";

const NOT_A_UNIT_PAGE = "That file is not a Master Unit List unit page. Open a unit on the Master Unit List, save the page from your browser, and pick that file.";
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---- MHTML ---------------------------------------------------------------------------------------------------------------

const latin1 = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
};
const toBytes = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0) & 255);

interface Part {
  headers: Record<string, string>;
  body: string;
}

/** Splits headers from body, unfolding continued header lines and lowercasing names. */
function splitPart(raw: string): Part {
  const match = /\r?\n\r?\n/.exec(raw);
  const head = match ? raw.slice(0, match.index) : raw;
  const body = match ? raw.slice(match.index + match[0].length) : "";
  const headers: Record<string, string> = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  return { headers, body };
}

function decodeQuotedPrintable(text: string): Uint8Array {
  const joined = text.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < joined.length; i += 1) {
    const hex = joined[i] === "=" ? joined.slice(i + 1, i + 3) : "";
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      out.push(parseInt(hex, 16));
      i += 2;
    } else out.push(joined.charCodeAt(i) & 255);
  }
  return Uint8Array.from(out);
}

function decodeBody(part: Part): Uint8Array {
  const encoding = (part.headers["content-transfer-encoding"] ?? "").toLowerCase();
  if (encoding === "quoted-printable") return decodeQuotedPrintable(part.body);
  if (encoding === "base64") {
    try {
      return toBytes(atob(part.body.replace(/[^A-Za-z0-9+/=]/g, "")));
    } catch {
      return new Uint8Array();
    }
  }
  return toBytes(part.body);
}

const boundaryOf = (contentType: string): string | undefined => /boundary="?([^";\s]+)"?/i.exec(contentType)?.[1];

/** The first text/html part of a message, searching inside nested multiparts. */
function findHtml(raw: string, depth = 0): string | undefined {
  const message = splitPart(raw);
  const type = (message.headers["content-type"] ?? "text/plain").toLowerCase();
  const boundary = boundaryOf(message.headers["content-type"] ?? "");
  if (type.startsWith("multipart/") && boundary !== undefined && depth < 4) {
    for (const piece of message.body.split(`--${boundary}`).slice(1)) {
      if (piece.startsWith("--")) break;
      const found = findHtml(piece.replace(/^\r?\n/, ""), depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!type.startsWith("text/html")) return undefined;
  const charset = /charset="?([^";\s]+)"?/i.exec(message.headers["content-type"] ?? "")?.[1] ?? "utf-8";
  const bytes = decodeBody(message);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** The page's HTML from a saved file: MHTML is unpacked, anything else is read as an HTML file. */
export function pageHtml(file: Uint8Array): string | undefined {
  const head = latin1(file.subarray(0, 2000));
  if (/^(?:MIME-Version|From|Subject|Date|Content-Type|Snapshot-Content-Location):/im.test(head) && /MIME-Version:/i.test(head)) return findHtml(latin1(file));
  return new TextDecoder("utf-8").decode(file);
}

// ---- The page ------------------------------------------------------------------------------------------------------------

const LEVELS: Record<string, RulesLevel> = { introductory: "introductory", standard: "standard", advanced: "advanced", experimental: "experimental", unlimited: "unlimited" };
const TYPE_ALIASES: Record<string, string> = { infantry: "CI" };

function typeCode(label: string): string | undefined {
  const k = key(label.split("·")[0] ?? "");
  const row = AS_UNIT_TYPES.find((t) => key(t.name) === k);
  return row?.code ?? TYPE_ALIASES[k];
}

const textOf = (el: Element | null | undefined): string => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** Labelled pairs: `<span class="k">` followed by its value, and stat boxes with a `.k` and a `.v` inside. */
function pairs(doc: Document, container: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const root of Array.from(doc.querySelectorAll(container))) {
    const keys = Array.from(root.querySelectorAll(".k"));
    for (const k of keys) {
      const v = k.nextElementSibling?.classList.contains("v") ? k.nextElementSibling : null;
      if (v && !out.has(key(textOf(k)))) out.set(key(textOf(k)), textOf(v));
    }
  }
  return out;
}

const integer = (v: string | undefined): number | undefined => (v !== undefined && /^-?\d+$/.test(v.trim()) ? Number(v) : undefined);

// The chip text `DMG 0*/1/1/0` as short, medium, long and extreme.
function damageOf(chip: string): { s: AsDamage; m: AsDamage; l: AsDamage; e?: AsDamage } | undefined {
  const parts = chip.replace(/^DMG\s*/i, "").split("/").map((p) => parseDamage(p));
  if (parts.length < 3 || parts.length > 4 || parts.some((p) => !p.ok)) return undefined;
  const [s, m, l, e] = parts.map((p) => (p.ok ? p.value : null));
  return { s: s ?? null, m: m ?? null, l: l ?? null, ...(parts.length === 4 ? { e: e ?? null } : {}) };
}

/** Reads a saved Master Unit List page. `now` and `newId` are passed in so the answer is repeatable in tests. */
export function fromMulPage(file: Uint8Array, now: string, newId: () => string): AsMulImport {
  try {
    const html = pageHtml(file);
    if (html === undefined) return { ok: false, message: "We could not find a web page inside that file." };
    return convert(html, now, newId);
  } catch {
    return { ok: false, message: "We could not read that file. Nothing was imported." };
  }
}

function convert(html: string, now: string, newId: () => string): AsMulImport {
  // Scripts and linked files are never wanted (and must never load), so they are cut out before the page is parsed.
  const inert = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "").replace(/<link\b[^>]*\brel=["']?(?:stylesheet|preload|modulepreload|prefetch|icon)[^>]*>/gi, "");
  const doc = new DOMParser().parseFromString(inert, "text/html");
  const title = textOf(doc.querySelector("h1.ba-title"));
  const grid = pairs(doc, ".u-statgrid");
  if (!title || grid.size === 0) return { ok: false, message: NOT_A_UNIT_PAGE };
  const details = pairs(doc, ".u-kv");
  const unreadable = (what: string): AsMulImport => ({ ok: false, message: `We could not read the ${what} on that Master Unit List page. Nothing was imported.` });

  const type = typeCode(details.get("type") ?? textOf(doc.querySelector(".eyebrow")));
  if (type === undefined) return { ok: false, message: "That Master Unit List page is for a kind of unit we do not read yet. Nothing was imported." };
  const size = integer(grid.get("size"));
  const armor = integer(grid.get("armor"));
  const structure = integer(grid.get("struct") ?? grid.get("structure"));
  const pv = integer(grid.get("pv") ?? details.get("pv"));
  if (size === undefined || armor === undefined || structure === undefined || pv === undefined) return unreadable("size, armor, structure or Point Value");
  const move = parseMove((grid.get("move") ?? "").replace(/[“”″]/g, '"'));
  if (!move.ok) return unreadable("movement");

  const chips = Array.from(doc.querySelectorAll(".u-abilrow .aschip"));
  const role = details.get("role") ?? null;
  let damage: ReturnType<typeof damageOf>;
  const specialCodes: string[] = [];
  for (const chip of chips) {
    // The code is the chip's own text; the words beside it (in `.an`) are the publisher's and are never read.
    const clone = chip.cloneNode(true) as Element;
    clone.querySelectorAll(".an").forEach((n) => { n.remove(); });
    const text = textOf(clone);
    if (/^DMG\b/i.test(text)) damage = damageOf(text);
    else if (text !== "" && text !== role && /^[A-Z][A-Z0-9]*(?![A-Za-z])/.test(text)) specialCodes.push(text.replace(/\s+/g, ""));
  }
  if (damage === undefined) return unreadable("damage");

  const tmm = integer(grid.get("tmm")) ?? null;
  const thrust = integer(grid.get("thrust"));
  const threshold = integer(grid.get("threshold") ?? grid.get("thresh"));
  const card: AsCard = {
    type,
    size,
    tmm,
    move: move.value,
    ...(thrust === undefined ? {} : { thrust }),
    role,
    pv,
    damage,
    ov: integer(grid.get("ov") ?? grid.get("overheat")) ?? 0,
    armor,
    structure,
    ...(threshold === undefined ? {} : { threshold }),
    specials: parseSpecials(specialCodes.join(", ")),
  };

  const unit = newAsUnit(newId());
  const chassis = textOf(doc.querySelector(".ba-crumb")).split("/").pop()?.trim() ?? "";
  const named = chassis !== "" && title.toLowerCase().startsWith(chassis.toLowerCase());
  unit.name = named ? { chassis, model: title.slice(chassis.length).trim() } : { chassis: title.split(" ")[0] ?? title, model: title.split(" ").slice(1).join(" ") };
  unit.card = card;

  const intro = details.get("introyear") ?? "";
  const year = integer(/^\d+/.exec(intro)?.[0]);
  if (year !== undefined) {
    unit.year = year;
    const era = ERAS.find((e) => key(intro).includes(key(e.name))) ?? ERAS.find((e) => year >= e.startYear && (e.endYear === undefined || year <= e.endYear));
    if (era) unit.era = era.id;
  }
  const tech = key(details.get("techbase") ?? "");
  if (tech === "clan") unit.techBase = "clan";
  else if (tech === "innersphere") unit.techBase = "inner-sphere";
  else if (tech === "mixed") unit.techBase = "mixed";
  const level = LEVELS[key(details.get("ruleslevel") ?? details.get("rules") ?? "")];
  if (level) unit.rulesLevel = level;

  const uid = /data-sheet-uid="([A-Za-z0-9]+)"/.exec(html)?.[1] ?? /MULForce\.add\('([A-Za-z0-9]+)'\)/.exec(html)?.[1];
  const slug = /masterunitlist\.battletech\.com\/units\/([a-z0-9-]+)/i.exec(doc.querySelector("link[rel=canonical]")?.getAttribute("href") ?? "")?.[1];
  const ref = uid ?? slug;
  unit.editionId = AS_EDITION.id;
  // A Master Unit List unit is a published design, so it is marked OFFICIAL with the list as its source. The mark holds only while the
  // card still equals the values we read (checked where it is shown).
  unit.source = { kind: "mul-export", credit: MUL_CREDIT, ...(ref === undefined ? {} : { ref }), at: now, values: structuredClone(card), official: { book: MUL_OFFICIAL_BOOK } };
  return { ok: true, unit };
}

/** Whether the OFFICIAL mark still holds: the unit is marked from the list and its card is still the one we read. An edited card reads as changed. */
export function mulOfficial(unit: AsUnit): { official: boolean; changed: boolean } {
  const { source } = unit;
  if (source.official === undefined || source.values === undefined) return { official: false, changed: false };
  const shape = (card: AsCard) => canon({ ...card, specials: formatSpecials(card.specials) });
  const same = shape(unit.card) === shape(source.values);
  return { official: same, changed: !same };
}
