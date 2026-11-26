import { describe, expect, it } from "vitest";
import { fighterArcs, fighterArmor, fighterArmorTons, fighterTally, newAeroRecord, withDefaults } from "./aero";
import type { AeroRecord } from "./aero";
import { aeroBattleValue, aeroCost } from "./aero-bv";
import { aeroLevelItems, checkAero, fighterPatchworkOffered } from "./aero-checks";
import { loadCatalog } from "./catalog";

const catalog = await loadCatalog();

// Patchwork armor on a fighter: Tactical Operations: AUE p. 189 (Fractional Armor Table, Patchwork Armor Table, fighter slots), Interstellar Operations:
// Alternate Eras p. 82 (Patchwork Armor Addendum). The book's worked example is a 'Mech arm: 17 points of Inner Sphere ferro-fibrous weigh 1 ton at 0.0558 a point.
function fighter(patchwork?: Record<string, string>, build: Partial<AeroRecord> = {}, edition = "tw-tm-so"): AeroRecord {
  const base = newAeroRecord({ id: "f", unitType: "aerospace-fighter", tons: 50, safeThrust: 6, year: 3080, rulesLevel: "advanced" }, edition);
  const armor = { type: "standard", tons: 5, points: { NO: 17, LW: 20, RW: 20, AF: 12 }, ...(patchwork === undefined ? {} : { patchwork }) };
  return { ...base, fuelTons: 2, armor, ...build };
}

describe("patchwork armor on a fighter", () => {
  it("weighs each location on its own, up to the half ton: the book's 17 points of ferro-fibrous are 1 ton, 12 points a ton of Anti-Penetrative Ablation", () => {
    const mixed = fighter({ NO: "ferro-aluminum", AF: "anti-penetrative-ablation" });
    expect(fighterArmorTons(mixed)).toBe(1 + 1.5 + 1.5 + 1); // nose 17 / 17.92, wings 20 / 16 each, aft 12 / 12
    expect(fighterTally(mixed).lines.find((l) => l.label === "Armor")?.tons).toBe(5);
    expect(fighterArmor(mixed)).toMatchObject({ allocated: 69, over: 0 }); // the weight follows the points, so none are bought and unset
    expect(fighterArmorTons(fighter())).toBe(5); // one type: the record's own tons
  });

  it("takes the slots of the type from that arc only: heavy ferro-aluminum two from the nose, Ballistic-Reinforced one from a wing", () => {
    const mixed = fighter({ NO: "heavy-ferro-aluminum", LW: "ballistic-reinforced" }, { armor: { type: "ferro-aluminum", tons: 5, points: { NO: 17, LW: 20, RW: 20, AF: 12 }, patchwork: { NO: "heavy-ferro-aluminum", LW: "ballistic-reinforced" } } });
    expect(fighterArcs(mixed, catalog).map((a) => [a.arc, a.limit])).toEqual([["NO", 3], ["LW", 4], ["RW", 4], ["AF", 4]]); // five items an arc, less the slots; the unset locations wear the record's own ferro-aluminum, one slot each
  });

  it("prices each type on the tons of the locations that wear it", () => {
    const cost = aeroCost(fighter({ AF: "anti-penetrative-ablation" }), catalog);
    expect(cost?.lines.filter((l) => l.label.startsWith("Armor")).map((l) => [l.label, l.cost])).toEqual([["Armor (Standard)", 10_000 * 4.5], ["Armor (Anti-Penetrative Ablation)", 15_000 * 1]]);
  });

  it("changes no Battle Value, because the aerospace method gives an armor type no modifier", () => {
    expect(aeroBattleValue(fighter({ NO: "ferro-aluminum" }), catalog)?.total).toBe(aeroBattleValue(fighter(), catalog)?.total);
  });

  it("is offered from Advanced from 3075 and from Experimental before it, to a fighter in the current rules only, and a record that has it keeps it", () => {
    const offered = (rulesLevel: AeroRecord["rulesLevel"], year: number, edition = "tw-tm-so") => fighterPatchworkOffered(fighter(undefined, { ...(rulesLevel ? { rulesLevel } : {}), year }, edition));
    expect([offered("standard", 3080), offered("advanced", 3080), offered("advanced", 3060), offered("experimental", 3060), offered("advanced", 3080, "aerotech2-revised")]).toEqual([false, true, false, true, false]);
    expect(fighterPatchworkOffered(fighter({ NO: "ferro-aluminum" }, { rulesLevel: "standard" }))).toBe(true);
    const items = aeroLevelItems(fighter({ AF: "anti-penetrative-ablation" }), catalog).filter((i) => i.what === "option" || i.name === "Anti-Penetrative Ablation");
    expect(items.map((i) => [i.name, i.level])).toEqual([["Patchwork armor", "advanced"], ["Anti-Penetrative Ablation", "advanced"]]);
  });

  it("lists a type for its level and date only where armor sits on it", () => {
    const bare = fighter({ AF: "anti-penetrative-ablation" }, { armor: { type: "standard", tons: 5, points: { NO: 17, LW: 20, RW: 20, AF: 0 }, patchwork: { AF: "anti-penetrative-ablation", NO: "ferro-aluminum" } } });
    expect(aeroLevelItems(bare, catalog).some((i) => i.name === "Anti-Penetrative Ablation")).toBe(false);
    expect(aeroLevelItems(bare, catalog).some((i) => i.name.startsWith("Ferro-Aluminum"))).toBe(true);
  });

  it("is read as one armor type, with a warning, under an edition without it, and a record without patchwork loads unchanged", () => {
    const old = fighter({ NO: "ferro-aluminum" }, {}, "aerotech2-revised");
    expect(fighterArmorTons(old)).toBe(5);
    expect(checkAero(old, catalog).some((f) => f.check === "patchwork")).toBe(true);
    const plain = fighter();
    expect(withDefaults(JSON.parse(JSON.stringify(plain)))).toEqual(plain);
    expect(withDefaults(JSON.parse(JSON.stringify(fighter({ NO: "ferro-aluminum" }))))?.armor.patchwork).toEqual({ NO: "ferro-aluminum" });
  });

  it("reports a type the option does not list for a fighter and a Clan type on an Inner Sphere unit", () => {
    expect(checkAero(fighter({ NO: "stealth" }), catalog).some((f) => f.check === "patchwork" && f.where?.field === "armor.patchwork.NO")).toBe(true);
    expect(checkAero(fighter({ NO: "ferro-aluminum-clan" }), catalog).some((f) => f.check === "armor-tech" && f.where?.field === "armor.patchwork.NO")).toBe(true);
  });
});
