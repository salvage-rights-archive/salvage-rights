// The start of the planned MegaMekLab (.mtf) import and export: a reader for the one thing Mordel's JSON leaves out of a 'Mech, which
// actuators each arm and leg has. We read the file's own shape (a line "Left Arm:" or "Right Leg:", then one line per slot); nothing here
// comes from any other tool. Nothing throws on text it does not understand: the answer is then undefined.
import type { LocationCode } from "./mech";

export interface ArmActuators {
  lowerArm: boolean;
  hand: boolean;
}

export interface MtfActuators {
  /** The arms the file lists. A quad has none, whatever the file says. */
  arms: Partial<Record<"LA" | "RA", ArmActuators>>;
  /** The legs that lack one of hip, upper leg, lower leg or foot actuator. Our records keep all four, so the importer only reports these. */
  legsMissing: Partial<Record<LocationCode, string[]>>;
}

const SECTIONS: Record<string, LocationCode> = {
  "left arm": "LA",
  "right arm": "RA",
  "left leg": "LL",
  "right leg": "RL",
  "front left leg": "FLL",
  "front right leg": "FRL",
  "rear left leg": "RLL",
  "rear right leg": "RRL",
  "center leg": "CL",
};
const LEG_PARTS = ["Hip", "Upper Leg Actuator", "Lower Leg Actuator", "Foot Actuator"];

/** The link to the .mtf file in a Mordel unit response (`unit.files.megamek`), if it has one. */
export function megamekLink(response: unknown): string | undefined {
  const get = (x: unknown, key: string): unknown => (typeof x === "object" && x !== null ? (x as Record<string, unknown>)[key] : undefined);
  const link = get(get(get(response, "unit"), "files"), "megamek");
  return typeof link === "string" && link !== "" ? link : undefined;
}

/** The actuators a .mtf file lists per limb, or undefined when the text has no limb sections. */
export function parseMtfActuators(text: string): MtfActuators | undefined {
  const lines = new Map<LocationCode, string[]>();
  let current: LocationCode | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") {
      current = undefined;
      continue;
    }
    const header = /^([A-Za-z ]+?)\s*:$/.exec(line);
    const code = header ? SECTIONS[(header[1] ?? "").toLowerCase()] : undefined;
    if (code) {
      current = code;
      lines.set(code, []);
    } else if (current) lines.get(current)?.push(line.toLowerCase());
  }
  if (lines.size === 0) return undefined;
  const quad = lines.has("FLL") || lines.has("FRL");
  const out: MtfActuators = { arms: {}, legsMissing: {} };
  for (const [code, slots] of lines) {
    if (code === "LA" || code === "RA") {
      if (!quad && slots.includes("shoulder")) out.arms[code] = { lowerArm: slots.includes("lower arm actuator"), hand: slots.includes("hand actuator") };
      continue;
    }
    if (!slots.some((s) => LEG_PARTS.some((part) => part.toLowerCase() === s))) continue; // a leg section with no actuator at all is not this body's leg
    const missing = LEG_PARTS.filter((part) => !slots.includes(part.toLowerCase()));
    if (missing.length > 0) out.legsMissing[code] = missing;
  }
  return out;
}
