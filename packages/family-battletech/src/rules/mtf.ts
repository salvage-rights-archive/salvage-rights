// The one reader of a MegaMekLab (.mtf) 'Mech file, and the base of the planned MML, SSW and HMP import and export. We read the file's own
// shape (key lines, one list of slots per location, a "Weapons:" list); nothing here comes from any other tool. Nothing throws on text it
// does not understand: what it cannot read is simply missing from the answer.
import { LOCATION_NAMES } from "./mech";
import type { LocationCode } from "./mech";

/** The names a file gives its locations, as one section header each (lower case). */
export const SECTION_NAMES = new Map<string, LocationCode>((Object.entries(LOCATION_NAMES) as [LocationCode, string][]).map(([code, name]) => [name.toLowerCase(), code]));

const ARM_LINES = ["Shoulder", "Upper Arm Actuator", "Lower Arm Actuator", "Hand Actuator"];
const LEG_LINES = ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"];
/** Slots every 'Mech of that part has by construction: the layout draws them, so the file's lines for them are not items. */
export const FIXED_LINES = new Set([...ARM_LINES, ...LEG_LINES, "Fusion Engine", "Engine", "Gyro", "Life Support", "Sensors", "Cockpit"].map((s) => s.toLowerCase()));

export interface MtfLines {
  keys: Map<string, string>;
  slots: Map<LocationCode, string[]>;
  weapons: { name: string; where: string }[];
}

/** Splits the text into its key lines, each location's slot lines in order, and the weapons list. */
export function readMtf(text: string): MtfLines {
  const out: MtfLines = { keys: new Map(), slots: new Map(), weapons: [] };
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

export interface ArmActuators {
  lowerArm: boolean;
  hand: boolean;
  /** The file lists a hand actuator but no lower arm actuator; the books allow no hand without a lower arm, so the hand is out too. */
  handDropped?: true;
}

/** The one arm rule: which of lower arm and hand an arm's slot lines give it. No hand without a lower arm. */
export function armActuators(slotLines: string[]): ArmActuators {
  const lines = slotLines.map((l) => l.toLowerCase());
  const lowerArm = lines.includes("lower arm actuator");
  const listed = lines.includes("hand actuator");
  return { lowerArm, hand: lowerArm && listed, ...(listed && !lowerArm ? { handDropped: true as const } : {}) };
}

/** Whether a location's lines start with a shoulder: the mark of an arm, as opposed to a section that only names one. */
export const hasShoulder = (slotLines: string[] | undefined): boolean => (slotLines ?? []).some((l) => /^shoulder$/i.test(l));

export interface MtfActuators {
  /** The arms the file lists. A quad has none, whatever the file says. */
  arms: Partial<Record<"LA" | "RA", ArmActuators>>;
  /** The legs that lack one of hip, upper leg, lower leg or foot actuator. Our records keep all four, so the importer only reports these. */
  legsMissing: Partial<Record<LocationCode, string[]>>;
}

/** The link to the .mtf file in a Mordel unit response (`unit.files.megamek`), if it has one. */
export function megamekLink(response: unknown): string | undefined {
  const get = (x: unknown, key: string): unknown => (typeof x === "object" && x !== null ? (x as Record<string, unknown>)[key] : undefined);
  const link = get(get(get(response, "unit"), "files"), "megamek");
  return typeof link === "string" && link !== "" ? link : undefined;
}

/** The actuators a .mtf file lists per limb, or undefined when the text has no limb sections. */
export function parseMtfActuators(text: string): MtfActuators | undefined {
  const { slots } = readMtf(text);
  if (slots.size === 0) return undefined;
  const quad = slots.has("FLL") || slots.has("FRL");
  const out: MtfActuators = { arms: {}, legsMissing: {} };
  for (const [code, lines] of slots) {
    if (code === "LA" || code === "RA") {
      if (!quad && hasShoulder(lines)) out.arms[code] = armActuators(lines);
      continue;
    }
    const have = lines.map((l) => l.toLowerCase());
    if (!LEG_LINES.some((part) => have.includes(part.toLowerCase()))) continue; // a leg section with no actuator at all is not this body's leg
    const missing = LEG_LINES.filter((part) => !have.includes(part.toLowerCase()));
    if (missing.length > 0) out.legsMissing[code] = missing;
  }
  return out;
}
