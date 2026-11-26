// The sixteen box 'Mechs of BattleTech: Gothic as data (data/gothic-units.ts), checked against what their own sheets print: weight,
// findings, rules level, Battle Value, and that a box record survives a file and notices an edit.
import { beforeAll, describe, expect, it } from "vitest";
import { GOTHIC_BOX_SPECS, gothicBoxMechs } from "../data/gothic-units";
import { battleValue } from "./bv";
import { loadCatalog } from "./catalog";
import type { Catalog } from "./catalog";
import { runChecks } from "./checks";
import { lowestLevelFor } from "./levels";
import { weights } from "./mech";
import type { MechRecord } from "./mech";
import { changedSinceImport } from "./mordel";

let catalog: Catalog;
let records: MechRecord[];
beforeAll(async () => {
  catalog = await loadCatalog();
  records = gothicBoxMechs(catalog);
});

/** The findings the box designs are known to give, by model. The KGC-0000 sheet splits each AC/20 across a torso and an arm, which a
 * mount cannot do yet (split mounts are Classic construction work), so each sits in its arm and runs past its end. The PXH-1T sheet
 * leaves half a ton that TechManual's weights do not fill (engine, endo steel, armor, six jump jets, four medium lasers, a 45-ton sword at
 * 2.5 tons, an SRM 6 and a ton of ammunition add to 44.5); the printed Battle Value reproduces, so the items are right. */
const KNOWN: Record<string, { checks: string[]; tons?: number }> = {
  "KGC-0000": { checks: ["slots", "slots"] },
  "PXH-1T": { checks: ["weight"], tons: 44.5 },
};

describe("the box 'Mechs", () => {
  it("are sixteen designs whose parts weigh their tonnage and give no finding but the known ones", () => {
    expect(records).toHaveLength(16);
    const off: string[] = [];
    for (const r of records) {
      const known = KNOWN[r.name.model];
      const total = weights(r, catalog.factsOf).total;
      if (total !== (known?.tons ?? r.tons)) off.push(`${r.name.model} weighs ${total} of ${r.tons}`);
      const checks = runChecks(r, catalog)
        .filter((f) => f.level !== "note")
        .map((f) => f.check);
      if (checks.join() !== (known?.checks ?? []).join()) off.push(`${r.name.model} findings: ${checks.join() || "none"}`);
    }
    expect(off).toEqual([]);
  });

  it("have the rules level their sheet prints as their lowest level", () => {
    const off = records.filter((r) => lowestLevelFor(r, catalog) !== r.rulesLevel).map((r) => `${r.name.model}: ${lowestLevelFor(r, catalog)} against ${r.rulesLevel}`);
    expect(off).toEqual([]);
    expect(records.filter((r) => r.rulesLevel === "licensed-noncanon").map((r) => r.name.model)).toEqual(["FS9-HB", "MAD-3H", "KGC-0KP"]);
  });

  it("compute the Battle Value their sheet prints, every one of them", () => {
    // The FS9-HB, MAD-3H and KGC-0KP carry the Light Blazer, whose Battle Value is inferred (148, data/bv.ts) from exactly these three
    // sheets, with the MAD-3H's Mace at its TO:AUE damage; the other thirteen are the engine's own figure against the sheet.
    const off = records.flatMap((r, i) => {
      const ours = battleValue(r, catalog).total;
      const printed = GOTHIC_BOX_SPECS[i]?.printedBv;
      return ours === printed && r.source?.kind === "book" && r.source.values.battleValue === printed ? [] : [`${r.name.model}: ours ${ours}, printed ${printed}`];
    });
    expect(off).toEqual([]);
  });

  it("keep their sheet page, and a design changed after it is marked changed", () => {
    const hb = records.find((r) => r.name.model === "FS9-HB");
    if (!hb) throw new Error("the FS9-HB is missing");
    expect(hb.source?.kind === "book" && hb.source.cite).toEqual({ book: "BattleTech: Gothic Deluxe Record Sheets", page: 4 });
    expect(changedSinceImport(hb)).toEqual(new Set());
    const edited = structuredClone(hb);
    edited.armor.LA = { front: 7 };
    expect(changedSinceImport(edited)).toEqual(new Set(["armor.LA"]));
  });
});
