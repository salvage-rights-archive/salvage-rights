import { beforeAll, describe, expect, it } from "vitest";
import { battleValue } from "./bv";
import { loadCatalog } from "./catalog";
import type { Catalog } from "./catalog";
import { runChecks } from "./checks";
import { bipedRecord, mount } from "./fixtures";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});
const aesFindings = (record: ReturnType<typeof bipedRecord>) => runChecks(record, catalog).filter((f) => f.check === "aes").map((f) => f.message);

// Actuator Enhancement System: TO:AUE printed p.90 (construction) and p.192 (BV). UMU: p.192 (BV, calculated as jump jets).
describe("AES and UMU", () => {
  it("allows an arm AES alone, wants a leg AES on every leg, bars it on a heavy 'Mech, and bars it beside MASC", () => {
    const arm = bipedRecord({ mounts: [mount("a", "aes-arm-is", "RA", 8)] });
    expect(aesFindings(arm)).toEqual([]);
    const oneLeg = bipedRecord({ mounts: [mount("l", "aes-leg-is", "LL", 0)] });
    expect(aesFindings(oneLeg)).toEqual([expect.stringContaining("must be on every leg; the Right Leg has none")]);
    const heavyLegs = bipedRecord({ tons: 60, mounts: [mount("l", "aes-leg-is", "LL", 0), mount("r", "aes-leg-is", "RL", 0)] });
    expect(aesFindings(heavyLegs)).toEqual([expect.stringContaining("cannot mount a leg AES")]);
    const masc = bipedRecord({ mounts: [mount("a", "aes-arm-is", "RA", 8), mount("m", "masc-is", "CT", 8)] });
    expect(aesFindings(masc)).toEqual([expect.stringContaining("incompatible with MASC")]);
  });

  it("counts UMUs as jump jets in the Battle Value, the highest of the two movements", () => {
    const umu = bipedRecord({ mounts: [mount("u1", "umu-is", "LL", 0), mount("u2", "umu-is", "RL", 0), mount("u3", "umu-is", "CT", 0)] });
    const jets = bipedRecord({ mounts: [mount("j1", "jump-jet-is", "LL", 0), mount("j2", "jump-jet-is", "RL", 0), mount("j3", "jump-jet-is", "CT", 0)] });
    expect(battleValue(umu, catalog).offensive.jumpMP).toBe(3);
    const mixed = bipedRecord({ mounts: [...jets.mounts.slice(0, 2), mount("u1", "umu-is", "CT", 0), mount("u2", "umu-is", "LT", 0), mount("u3", "umu-is", "RT", 0)] });
    expect(battleValue(mixed, catalog).offensive.jumpMP).toBe(3);
  });
});

describe("the book's own figures", () => {
  it("computes the Zeus example of TO:AUE p.192: an 80-ton Mech with an AES in one arm is worked as 88 tons, and its linked weapons count 1.25", () => {
    const zeus = bipedRecord({ tons: 80, chassis: { ...bipedRecord().chassis, engine: { type: "standard", rating: 240 } }, mounts: [mount("a", "aes-arm-is", "RA", 8), mount("p", "heavy-ppc-is", "RA", 0)] });
    const bv = battleValue(zeus, catalog);
    expect(bv.offensive.tonnage).toBe(88);
    expect(bv.offensive.weapons[0]?.modifiedBv).toBeCloseTo((bv.offensive.weapons[0]?.unmodifiedBv ?? 0) * 1.25, 5);
  });

  it("gives the PPC capacitor pair the table figure of p.194 and a medium shield the 135 of p.195", () => {
    const ppc = mount("p", "ppc-is", "RA", 0);
    const pair = bipedRecord({ mounts: [ppc, { ...mount("c", "ppc-capacitor-is", "RA", 3), linkedTo: "p" }] });
    expect(battleValue(pair, catalog).offensive.weapons[0]?.unmodifiedBv).toBe(264);
    const shield = bipedRecord({ mounts: [mount("s", "shield-medium-is", "LA", 0)] });
    expect(battleValue(shield, catalog).defensive.equipment).toBe(135);
  });
});

describe("the PPC capacitor", () => {
  it("needs a PPC in its own location (TO:AUE pp.126 and 149)", () => {
    const problems = (record: ReturnType<typeof bipedRecord>) => runChecks(record, catalog).filter((f) => f.check === "placement").map((f) => f.message);
    expect(problems(bipedRecord({ mounts: [mount("c", "ppc-capacitor-is", "RA", 3)] }))).toEqual([expect.stringContaining("needs a PPC in the same location")]);
    expect(problems(bipedRecord({ mounts: [mount("p", "ppc-is", "RA", 0), mount("c", "ppc-capacitor-is", "RA", 3)] }))).toEqual([]);
  });
});
