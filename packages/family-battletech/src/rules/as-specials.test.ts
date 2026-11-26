import { describe, expect, it } from "vitest";
import { AS_GLOSSES } from "../data/as-glosses";
import { AS_SPECIALS } from "../data/as-specials";
import { AS_UNIT_TYPES } from "../data/alpha-strike";
import {
  ALSO_EARNS,
  ARMOR_SPECIALS,
  ARTILLERY_CODES,
  COCKPIT_SPECIALS,
  DAMAGE_SPECIALS,
  ENGINE_SPECIALS,
  EQUIPMENT_SPECIALS,
  HARJEL,
  LARGE,
} from "../data/as-convert-specials";
import { findSpecial, glossOf, specialsFor } from "./as-specials";

/** The codes the conversion writes: the ones its tables name, and the ones its rules write straight into the card. */
const FROM_TABLES = [
  ...EQUIPMENT_SPECIALS.map((e) => e.code),
  ...ALSO_EARNS.flatMap((a) => a.adds),
  ...Object.values(ARMOR_SPECIALS).map((a) => a.code),
  ...Object.values(COCKPIT_SPECIALS).map((c) => c.code),
  ...Object.values(ENGINE_SPECIALS).map((e) => e.code),
  ...Object.keys(HARJEL).filter((k) => k !== "locations" && k !== "cite"),
  ...Object.keys(DAMAGE_SPECIALS),
  LARGE.code,
];
const FROM_RULES = [
  "BFC",
  "ENE",
  "ES",
  "HT",
  "JMPS",
  "JMPW",
  "MASH",
  "MEL",
  "MHQ",
  "OMNI",
  "OVL",
  "SEAL",
  "SOA",
  "STL",
  "SUBS",
  "CASE",
  "BAR",
  "TSEMP",
];

describe("special abilities table", () => {
  it("covers every code the conversion can produce, and every artillery type", () => {
    const missing = [...new Set([...FROM_TABLES, ...FROM_RULES])].filter((code) => !findSpecial(code));
    expect(missing).toEqual([]);
    for (const code of Object.values(ARTILLERY_CODES)) expect(findSpecial(`ART${code}`)?.code).toBe("ARTX");
  });

  it("has one row per code, on the pages the book gives, with real unit types, and a note only for a code in the table", () => {
    const codes = AS_SPECIALS.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(AS_SPECIALS.filter((r) => r.page < 76 || r.page > 91)).toEqual([]);
    const types = AS_UNIT_TYPES.map((t) => t.code);
    expect(AS_SPECIALS.flatMap((r) => (r.types ?? []).filter((t) => !types.includes(t)))).toEqual([]);
    expect(Object.keys(AS_GLOSSES).filter((c) => !codes.includes(c))).toEqual([]);
  });

  it("hides optional abilities below Advanced and abilities the book limits to other unit types, rather than marking them", () => {
    const standard = specialsFor("standard").map((r) => r.code);
    expect(standard).toContain("AMS");
    expect(standard).not.toContain("HPG");
    expect(specialsFor("advanced").map((r) => r.code)).toContain("HPG");
    const infantry = specialsFor("advanced", "CI").map((r) => r.code);
    expect(infantry).toContain("MTN");
    expect(infantry).not.toContain("TSM");
    expect(glossOf(findSpecial("CAP")!)).toBeUndefined();
    expect(specialsFor("introductory").map((r) => r.code)).toEqual([
      "AC",
      "AMS",
      "ARTX",
      "C3I",
      "C3M",
      "C3S",
      "CASE",
      "CASEII",
      "ECM",
      "ENE",
      "FLK",
      "HT",
      "IF",
      "JMPW",
      "LRM",
      "MEL",
      "MHQ",
      "OMNI",
      "OVL",
      "PRB",
      "RCN",
      "REAR",
      "SNARC",
      "SRM",
      "STL",
      "TAG",
      "TSM",
    ]);
  });
});
