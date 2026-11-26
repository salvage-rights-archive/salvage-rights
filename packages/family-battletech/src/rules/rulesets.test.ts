// The Gothic ruleset against Classic (gothic-design s.2-4): what each game offers, the levels it gives, its eras, and the sparse overlay.
// Every Classic test elsewhere runs unchanged: Classic is the default everywhere.
import { beforeAll, describe, expect, it } from "vitest";
import { RULES_LEVELS } from "../data/chassis";
import type { RulesLevel } from "../data/chassis";
import { DEFAULT_EDITION } from "../data/editions";
import { GOTHIC_OVERLAY } from "../data/equipment/gothic";
import { GOTHIC } from "../data/rulesets";
import { equipmentAvailable, eraOfRecord, partAvailable, setEra, typeAvailable } from "./availability";
import { loadCatalog } from "./catalog";
import type { Catalog } from "./catalog";
import { bipedRecord, mount } from "./fixtures";
import { equipmentLevel, levelRow, lowestLevelFor, techBaseChoices } from "./levels";
import type { MechRecord } from "./mech";

let catalog: Catalog;
beforeAll(async () => {
  catalog = await loadCatalog();
});
const LEVELS: RulesLevel[] = RULES_LEVELS.map((row) => row.id);
const gothic = (patch: Partial<MechRecord> = {}): MechRecord => bipedRecord({ editionId: "gothic", techBase: "inner-sphere", year: 3015, era: "gothic-endless-war", rulesLevel: "standard", ...patch });
const classic = (patch: Partial<MechRecord> = {}): MechRecord => bipedRecord({ editionId: DEFAULT_EDITION, rulesLevel: "standard", ...patch });
const offers = (id: string, record: MechRecord, everything = false) => equipmentAvailable(catalog.byId(id)!, record, catalog, everything);

describe("the Gothic overlay", () => {
  it("holds only catalog ids, and no field that repeats the row as Classic reads it", () => {
    const repeats: string[] = [];
    for (const [id, fields] of Object.entries(GOTHIC_OVERLAY)) {
      const row = catalog.rowFor(id, DEFAULT_EDITION);
      if (!row) {
        repeats.push(`${id}: not a catalog id`);
        continue;
      }
      for (const [field, value] of Object.entries(fields)) {
        if (JSON.stringify(row[field as keyof typeof row]) === JSON.stringify(value)) repeats.push(`${id}.${field}`);
      }
    }
    expect(repeats).toEqual([]);
  });

  it("gives Gothic's level where it differs and Classic's where it does not", () => {
    const rows: [string, RulesLevel, RulesLevel][] = [
      ["binary-laser-is", "standard", "experimental"],
      ["mace-is", "standard", "advanced"],
      ["heavy-machine-gun-is", "standard", "standard"],
      ["sword-is", "standard", "standard"],
      ["hatchet-is", "introductory", "introductory"],
    ];
    const level = (id: string, editionId: string) => equipmentLevel(catalog.rowFor(id, editionId)!);
    expect(rows.map(([id]) => [id, level(id, "gothic"), level(id, DEFAULT_EDITION)])).toEqual(rows);
  });
});

describe("what each game offers", () => {
  it("never offers the Light Blazer to a Classic record, at any level, even with Show everything", () => {
    expect(LEVELS.flatMap((rulesLevel) => [offers("light-blazer-gothic", classic({ rulesLevel })), offers("light-blazer-gothic", classic({ rulesLevel }), true)])).toEqual(LEVELS.flatMap(() => [false, false]));
  });

  it("offers Gothic a row it does not list only at Unlimited, where its level asks for Unlimited", () => {
    const at = (rulesLevel: RulesLevel) => [offers("er-large-laser-is", gothic({ rulesLevel })), partAvailable("engine", "xl", gothic({ rulesLevel }))];
    expect([at("fan-made"), at("unlimited")]).toEqual([[false, false], [true, true]]);
    const laser = gothic({ rulesLevel: "unlimited", mounts: [mount("m", "er-large-laser-is", "RA", null)] });
    expect(lowestLevelFor(laser, catalog)).toBe("unlimited");
  });

  it("offers a Gothic record in 3015 the Heavy Machine Gun, since Gothic prints no dates", () => {
    expect([offers("heavy-machine-gun-is", gothic()), offers("heavy-machine-gun-is", classic({ year: 3015 }))]).toEqual([true, false]);
  });

  it("offers no Clan or mixed tech base and no IndustrialMech or OmniMech in Gothic", () => {
    const record = gothic({ rulesLevel: "fan-made" });
    expect(techBaseChoices("fan-made", "inner-sphere", record).map(([value]) => value)).toEqual(["inner-sphere"]);
    expect([typeAvailable("mech", record), typeAvailable("industrialmech", record), typeAvailable("omnimech", record)]).toEqual([true, false, false]);
  });
});

describe("Gothic eras and levels", () => {
  it("puts 3015 in the Endless War and keeps a year inside the Gothic era chosen", () => {
    expect(eraOfRecord({ editionId: "gothic", year: 3015 })?.name).toBe("Endless War");
    const draft = { editionId: "gothic", year: 3015 as number | null, era: undefined as string | undefined };
    setEra(draft, "gothic-star-league");
    expect([draft.era, draft.year]).toEqual(["gothic-star-league", null]);
  });

  it("shows Licensed non-canon as Unofficial, and the Light Blazer makes a design Unofficial", () => {
    expect([levelRow("licensed-noncanon", GOTHIC).label, levelRow("licensed-noncanon").label]).toEqual(["Unofficial", "Licensed non-canon"]);
    expect(lowestLevelFor(gothic({ mounts: [mount("b", "light-blazer-gothic", "LA", null)] }), catalog)).toBe("licensed-noncanon");
  });
});
