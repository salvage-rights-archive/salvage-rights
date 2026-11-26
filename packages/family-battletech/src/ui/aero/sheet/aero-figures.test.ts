// The Total Warfare aerospace figures (pp. 303-304) on the fighter sheet, and Dead-Fire and Retro-Streak ammunition in the aerospace Battle Value (IO:AE p. 190).
import { describe, expect, it } from "vitest";
import { newAeroRecord } from "../../../rules/aero";
import type { AeroRecord } from "../../../rules/aero";
import { aeroBattleValue } from "../../../rules/aero-bv";
import { loadCatalog } from "../../../rules/catalog";
import { weaponLines } from "./facts";

const catalog = await loadCatalog();
type Mount = [arc: string, id: string, amount?: number];
const mountsOf = (list: Mount[]) => list.map(([arc, equipmentId, amount], i) => ({ id: `m${String(i)}`, equipmentId, name: equipmentId, arc, ...(amount === undefined ? {} : { amount }) }));
function fighter(mounts: Mount[]): AeroRecord {
  const r = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 6, year: 3100 }, "tw-tm-so");
  return { ...r, rulesLevel: "experimental", armor: { type: "standard", tons: 5, points: { NO: 20, LW: 15, RW: 15, AF: 10 } }, heatSinks: { type: "single", count: 10 }, mounts: mountsOf(mounts) };
}

describe("aerospace figures from Total Warfare pp. 303-304 and IO:AE p. 190", () => {
  it("an Artemis IV in the arc raises the largest launcher's attack value to the figure after the slash; a multi-mode launcher also has its SRM line; the table's to-hit modifier shows", () => {
    const lines = (mounts: Mount[]) => weaponLines(fighter(mounts), catalog);
    expect(lines([["NO", "lrm-20-is"]])[0]?.damage).toBe("12");
    expect(lines([["NO", "lrm-20-is"], ["NO", "artemis-iv-is"]])[0]?.damage).toBe("16");
    expect(lines([["NO", "srm-6-is"], ["NO", "artemis-iv-is"]])[0]?.damage).toBe("10");
    expect(lines([["NO", "mml-5-is"]]).map((l) => [l.name, l.damage])).toEqual([["mml-5-is", "3"], ["mml-5-is (SRM mode)", "6"]]);
    expect(lines([["NO", "mml-9-is"], ["NO", "artemis-iv-is"]]).map((l) => l.damage).slice(0, 2)).toEqual(["7", "14"]);
    expect(lines([["NO", "medium-pulse-laser-is"], ["NO", "heavy-large-laser-clan"], ["NO", "lb-10-x-ac-is"], ["NO", "mrm-10-is"], ["NO", "medium-laser-is"]]).map((l) => l.toHit)).toEqual(["-2", "+1", "-1", "+1", ""]);
  });
  it("Dead-Fire ammunition counts as its launcher's, Retro-Streak adds to the defense up to its Streak launchers", () => {
    const bv = (mounts: Mount[]) => aeroBattleValue(fighter(mounts), catalog);
    const withAmmo = bv([["NO", "lrm-10-is"], ["NO", "ammo-dead-fire-lrm-is", 1]]);
    expect(withAmmo?.unvalued).toEqual([]);
    expect(bv([["NO", "streak-srm-4-is"], ["NO", "ammo-retro-streak-srm-is", 1]])?.defensive.lines.find((l) => /Retro-Streak/.test(l.label))?.value).toBeGreaterThan(0);
  });
});
