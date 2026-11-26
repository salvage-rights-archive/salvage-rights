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
