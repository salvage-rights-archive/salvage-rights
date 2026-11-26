import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { mordelBiped, mordelOdd, mordelQuad, mordelWith } from "./fixtures";
import { editRecord, layout, weights, type LocationCode, type MechRecord } from "./mech";
import { changedSinceImport, fromMordel, importOmniSet, importOmniSingle, omniFacts, parseMordelRef } from "./mordel";

const catalog = await loadCatalog();
let counter = 0;
const NOW = "2026-11-24T10:00:00.000Z";
const run = (response: unknown) => fromMordel(response, catalog, "total-warfare", NOW, () => `rec-${++counter}`);
function imported(response: unknown): { record: MechRecord; notes: string[]; fixedIds?: string[] } {
  const result = run(response);
  if (!result.ok) throw new Error(result.message);
  return result;
}
const mountOf = (record: MechRecord, name: string, nth = 0) => record.mounts.filter((m) => m.name === name)[nth];
const entry = (id: number | null, name: string, location: string | number | null, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  location,
  technology: "Inner Sphere",
  slots: 1,
  associated_id: null,
  ...extra,
});
/** The biped with its equipment list replaced. */
const withEquipment = (equipment: unknown[], patch: Record<string, unknown> = {}) => mordelWith(mordelBiped(), { equipment, ...patch });
const placed = (record: MechRecord, part: "structure" | "armor") => record.mounts.filter((m) => m.part === part).map((m) => `${m.location}${m.slot}`);

describe("parseMordelRef", () => {
  it.each<[string, { unitType: string; id: number } | null]>([
    ["474", { unitType: "bm", id: 474 }],
    [" BM/474 ", { unitType: "bm", id: 474 }],
    ["https://mordel.net/unit.php?ut=bm&id=474", { unitType: "bm", id: 474 }],
    ["mordel.net/unit.php?id=77&ut=cv", { unitType: "cv", id: 77 }],
    ["", null],
    ["bm 0", null],
    ["https://example.com/unit?ut=bm&id=474", null],
  ])("reads %j", (text, want) => {
    expect(parseMordelRef(text)).toEqual(want);
  });
});

describe("fromMordel", () => {
  it("maps identity, tonnage, year, chassis keys, armor and Mordel's own values", () => {
    const { record, notes } = imported(mordelBiped());
    expect(record).toMatchObject({
      schema: 1,
      editionId: "total-warfare",
      name: { chassis: "Test Walker", model: "TW-1" },
      techBase: "inner-sphere",
      year: 3025,
      tons: 50,
      configuration: "biped",
      chassis: {
        engine: { type: "standard", rating: 200 },
        gyro: "standard",
        cockpit: "standard",
        structure: "standard",
        armorType: "standard",
        myomer: "standard",
        heatSinks: { type: "single", count: 10 },
      },
      notes: { overview: "A made-up walker." },
      source: {
        kind: "mordel",
        unitType: "bm",
        id: 900001,
        designer: "Nobody In Particular",
        fetchedAt: NOW,
        values: { battleValue: 1000, cost: 2000000, rulesLevel: "Introductory", era: "Succession Wars" },
      },
    });
    expect(record.armor).toEqual({
      HD: { front: 9 },
      CT: { front: 14, rear: 4 },
      LT: { front: 10, rear: 3 },
      RT: { front: 10, rear: 3 },
      LA: { front: 8 },
      RA: { front: 8 },
      LL: { front: 6 },
      RL: { front: 5 },
    });
    expect(notes).toEqual([]);
  });

  it("makes a mount of each equipment entry, places them in list order after the fixed slots and leaves one that does not fit", () => {
    const { record } = imported(mordelBiped());
    expect(record.mounts.map((m) => [m.name, m.equipmentId, m.location, m.slot])).toEqual([
      ["AC/10", "ac-10-is", "RT", 0],
      ["AC/10 Ammo", "ammo-ac-10-is", "LT", 0],
      ["Medium Laser", "medium-laser-is", "LA", 4],
      ["Medium Laser", "medium-laser-is", "RA", 4],
      ["Jump Jet", "jump-jet-is", "CT", 10],
      ["Jump Jet", "jump-jet-is", "LL", 4],
      ["Jump Jet", "jump-jet-is", "RL", 4],
      ["Heat Sink", "heat-sink-is", "LL", 5],
      ["Heat Sink", "heat-sink-is", "RL", 5],
    ]);
    // A third item in a leg has no room left and stays unplaced.
    const crowded = withEquipment([entry(1, "Jump Jet", "LL"), entry(2, "Jump Jet", "LL"), entry(3, "Jump Jet", "LL")]);
    expect(imported(crowded).record.mounts.map((m) => m.slot)).toEqual([4, 5, null]);
  });

  it("reads an equipment entry with Rear facing as a rear-firing mount, and Front as a plain one", () => {
    const { record } = imported(withEquipment([entry(1, "Medium Laser", "LT", { facing: "Rear" }), entry(2, "Medium Laser", "LT", { facing: "Front" })]));
    expect(record.mounts.filter((m) => m.rear).map((m) => m.id)).toEqual(["mount-1"]);
  });

  it("keeps an unmatched item with Mordel's slot count, links associated items, and stores odd configurations as given", () => {
    const { record, notes } = imported(mordelWith(mordelOdd(), { configuration: "Biped" }));
    expect(notes).toContain("Frobnicator 9000 is not in our equipment table.");
    const frob = mountOf(record, "Frobnicator 9000");
    expect(frob).toMatchObject({ equipmentId: null, location: "LT", slots: 2 });
    // A two-slot item among one-slot items takes two cells and the next item follows it.
    const cells = layout(record, catalog.factsOf).slots.LT?.slice(0, 6).map((c) => c.mountId);
    const [lrm, artemis, ammo] = [mountOf(record, "LRM 10"), mountOf(record, "Artemis IV"), mountOf(record, "LRM 10 (Ammo 12)")];
    expect(cells).toEqual([lrm?.id, lrm?.id, artemis?.id, frob?.id, frob?.id, ammo?.id]);
    expect(artemis?.linkedTo).toBe(lrm?.id);
    expect(lrm?.linkedTo).toBeUndefined();
    // An item that takes no slot has no location, no slot, and is not left unplaced.
    expect(mountOf(record, "Mystery Box")).toMatchObject({ location: null, slot: null, slots: 0 });
    expect(layout(record, catalog.factsOf).unplaced.map((m) => m.name)).not.toContain("Mystery Box");

    const odd = imported(mordelOdd());
    expect(odd.record).toMatchObject({ configuration: "hexapod", year: null, chassis: { myomer: "" } });
    expect(odd.notes.join("\n")).toMatch(/hexapod[^]*myomer|myomer[^]*hexapod/);
    // The center leg is kept: its armor, and its laser in the location, though a hexapod has no slots laid out.
    expect(odd.record.armor.CL).toEqual({ front: 6 });
    expect(odd.record.mounts.find((m) => m.location === "CL")).toMatchObject({ name: "Medium Laser", slot: null });
    expect(imported(mordelWith(mordelBiped(), { engine: { type: "Plasma Drive", rating: 200 } })).record.chassis.engine.type).toBe("Plasma Drive");
  });

  it("takes the hand actuator, then the lower arm actuator, out of an arm whose equipment cannot fit otherwise, and says so", () => {
    const unit = withEquipment([
      entry(1, "Ultra AC/20", "LA", { slots: 10 }),
      entry(2, "AC/10", "RA", { slots: 7 }),
      entry(3, "Medium Laser", "RA"),
      entry(4, "Medium Laser", "RA"),
    ]);
    const { record, notes } = imported(unit);
    expect(record.arms).toEqual({ LA: { lowerArm: false, hand: false }, RA: { lowerArm: true, hand: false } });
    expect(layout(record, catalog.factsOf).unplaced).toEqual([]);
    expect(notes).toEqual([
      expect.stringMatching(/Left Arm.*needs 10 slots.*lower arm and hand actuators were left out/),
      expect.stringMatching(/Right Arm.*needs 9 slots.*hand actuator was left out/),
    ]);
    expect(imported(mordelBiped()).record.arms).toBeUndefined();
  });

  it("places structure and armor slots in the first free cells, arms first, and says so once for each", () => {
    const unit = withEquipment([], { structure: { type: "Endo Steel", technology: "Inner Sphere" }, armor: { type: "Ferro-Fibrous", technology: "Inner Sphere", points: 100, tons: 6 } });
    const { record, notes } = imported(unit);
    expect(record.mounts.filter((m) => m.part)).toHaveLength(28);
    expect(record.mounts.every((m) => m.equipmentId === null || m.part === undefined)).toBe(true);
    // Left arm slots 5 to 12 first, then the right arm; the armor takes up where the structure left off.
    expect(placed(record, "structure")).toEqual([..."01234567"].map((i) => `LA${4 + Number(i)}`).concat([..."012345"].map((i) => `RA${4 + Number(i)}`)));
    expect(placed(record, "armor").slice(0, 4)).toEqual(["RA10", "RA11", "LT0", "LT1"]);
    expect(notes).toContain("Mordel does not say where the 14 Endo Steel slots are. They were placed in the first free slots.");
    expect(notes).toContain("Mordel does not say where the 14 Ferro-Fibrous slots are. They were placed in the first free slots.");
    expect(layout(record, catalog.factsOf).unplaced).toEqual([]);
    const clan = imported(withEquipment([], { tech_base: "Clan", structure: { type: "Endo Steel", technology: "Clan" } })).record;
    expect(clan.chassis.structure).toBe("endo-steel-clan");
    expect(clan.mounts.filter((m) => m.part === "structure")).toHaveLength(7);
  });

  it("places stealth armor two to a location by its rule, and leaves it unplaced where the location is full", () => {
    const stealth = { type: "Stealth", technology: "Inner Sphere", points: 100, tons: 6 };
    const roomy = imported(withEquipment([], { armor: stealth })).record;
    const counts = (record: MechRecord) => {
      const by: Partial<Record<LocationCode, number>> = {};
      for (const m of record.mounts.filter((x) => x.part === "armor" && x.location)) by[m.location as LocationCode] = (by[m.location as LocationCode] ?? 0) + 1;
      return by;
    };
    expect(counts(roomy)).toEqual({ LA: 2, RA: 2, LT: 2, RT: 2, LL: 2, RL: 2 });
    // Two jump jets fill the free cells of the left leg.
    const full = imported(withEquipment([entry(1, "Jump Jet", "LL"), entry(2, "Jump Jet", "LL")], { armor: stealth })).record;
    expect(counts(full)).toEqual({ LA: 2, RA: 2, LT: 2, RT: 2, RL: 2 });
    expect(full.mounts.filter((m) => m.part === "armor" && !m.location)).toHaveLength(2);
  });

  it("makes Triple-Strength Myomer's six mounts when only the myomer type names it", () => {
    const { record } = imported(withEquipment([], { myomer: { type: "Triple Strength Myomer" } }));
    const tsm = record.mounts.filter((m) => m.equipmentId === "tsm-is");
    expect(record.chassis.myomer).toBe("tsm");
    expect(tsm).toHaveLength(6);
    expect(tsm.every((m) => m.location !== null && m.slot !== null)).toBe(true);
  });

  it("reads a mixed-tech unit's parts by their own technology and Clan CASE as one unplaced mount", () => {
    const mixed = imported(
      mordelWith(mordelBiped(), { mixed_tech: true, engine: { type: "XL", technology: "Clan", rating: 200 }, structure: { type: "Endo Steel" } }),
    );
    expect(mixed.record).toMatchObject({ techBase: "mixed", chassis: { engine: { type: "xl-clan" }, structure: "endo-steel" } });
    expect(mixed.notes.join("\n")).toMatch(/did not say whether the structure "Endo Steel" is Clan/);

    const clan = imported(mordelWith(mordelBiped(), { tech_base: "Clan", fire_control: { artemis: false, apollo: false, clan_case: true } }));
    expect(mountOf(clan.record, "CASE")).toMatchObject({ equipmentId: "case-clan", location: null, slot: null });
    expect(clan.notes).toContain("Mordel does not say which locations Clan CASE protects; one CASE is added unplaced.");
  });

  it.each<[string, string | null, string | null]>([
    ["LRM 10 (Ammo 12)", "ammo-lrm-10-is", null],
    ["Machine Gun (Ammo 200)", "ammo-machine-gun-is", null],
    ["Machine Gun (Ammo 100)", "ammo-machine-gun-half-is", null],
    ["Machine Gun (Ammo 50)", null, "bin of a size this tool does not recognise"],
    ["Heavy Machine Gun Array Module", "machine-gun-array-is", null],
    ["Frobnicator 9000", null, "is not in our equipment table"],
  ])("matches %j to %j", (name, id, why) => {
    const { record, notes } = imported(withEquipment([entry(1, name, "LT")]));
    expect(record.mounts[0]?.equipmentId).toBe(id);
    if (why) expect(notes.join("\n")).toContain(why);
    else expect(notes).toEqual([]);
  });

  it("maps Mordel's quad location codes to ours and leaves an item in a location the quad lacks unplaced", () => {
    const { record } = imported(mordelQuad());
    expect(record.configuration).toBe("quad");
    expect(Object.keys(record.armor)).toEqual(["HD", "CT", "LT", "RT", "FLL", "FRL", "RLL", "RRL"]);
    expect(mountOf(record, "Heat Sink")).toMatchObject({ location: "RRL", slot: 4 });
    const arm = imported(mordelWith(mordelQuad(), { equipment: [entry(1, "Medium Laser", "LA")] }));
    expect(arm.record.mounts[0]).toMatchObject({ location: "LA", slot: null });
    expect(arm.notes.join("\n")).toMatch(/Medium Laser is in the LA, which this quad does not have/);
  });

  it.each<[string, Record<string, unknown>, RegExp]>([
    ["year", { year: "3025" }, /year/],
    ["designer", { designer: 5 }, /designer/],
    ["battle value", { battle_value: "high" }, /battle value/],
    ["cost", { cost: [] }, /cost/],
    ["rules level", { rules_level: {} }, /rules level/],
    ["era", { era: false }, /era/],
    ["a rear armor", { locations: [{ code: "CT", armor: 10, rear_armor: "3" }] }, /CT rear armor/],
    ["an equipment id", { equipment: [entry(null, "Medium Laser", "LA", { id: "x" })] }, /Medium Laser id/],
    ["an equipment slot count", { equipment: [entry(1, "Medium Laser", "LA", { slots: "one" })] }, /Medium Laser slots/],
    ["an associated id", { equipment: [entry(1, "Medium Laser", "LA", { associated_id: "x" })] }, /Medium Laser associated_id/],
    ["an equipment location", { equipment: [entry(1, "Medium Laser", 7)] }, /Medium Laser location/],
  ])("notes a wrong-typed %s and carries on", (_name, patch, note) => {
    const { record, notes } = imported(mordelWith(mordelBiped(), patch));
    expect(notes.join("\n")).toMatch(note);
    expect(record.name.chassis).toBe("Test Walker");
  });

  it.each<[string, unknown, RegExp | null]>([
    ["null", null, /not an object/],
    ["a list", [], /not an object/],
    ["an empty object", {}, /no unit/],
    ["a combat vehicle", mordelWith(mordelBiped(), { unit_type_short: "cv" }), /cv/],
    ["an error status", { status: "Error", message: "No such unit" }, /Error.*No such unit/],
    ["a string tonnage", mordelWith(mordelBiped(), { tons: "fifty" }), null],
    ["equipment as an object", mordelWith(mordelBiped(), { equipment: { a: 1 } }), null],
    ["null entries", mordelWith(mordelBiped(), { equipment: [null, 5, "x", []], locations: [null, 3] }), null],
    ["parts nested the wrong way", mordelWith(mordelBiped(), { engine: { type: { type: {} }, rating: [] }, armor: "x", fluff: 4 }), null],
    ["the odd unit", mordelOdd(), null],
  ])("answers %s without throwing", (_name, response, message) => {
    const result = run(response);
    if (message === null) expect(result.ok).toBe(true);
    else expect(result).toMatchObject({ ok: false, message: expect.stringMatching(message) as unknown });
  });
});

describe("fromMordel: IndustrialMechs (unit type im)", () => {
  const IS = "Inner Sphere";
  /** A hand-made 25-ton ICE IndustrialMech: industrial cockpit and structure, Heavy Industrial armor, as Mordel words them. */
  const industrial = (equipment: unknown[] = [], patch: Record<string, unknown> = {}) =>
    mordelWith(mordelBiped(), {
      unit_type_short: "im",
      tons: 25,
      engine: { type: "Internal Combustion", technology: IS, rating: 100 },
      cockpit: { type: "Industrial", technology: IS },
      structure: { type: "Industrial", technology: IS },
      armor: { type: "Heavy Industrial", technology: IS, points: 40, tons: 2.5 },
      heat_sinks: { count: 1, type: "Single", technology: IS },
      equipment,
      ...patch,
    });
  const facts = (record: MechRecord, mount: ReturnType<typeof mountOf>) => (mount ? catalog.factsOf(mount, record) : undefined);

  it.each<[string, Record<string, unknown>, string, (record: MechRecord) => string]>([
    ["internal combustion, industrial cockpit and structure, Heavy Industrial armor", {}, "industrialmech ice industrial industrial standard", (r) => `${r.unitType} ${r.chassis.engine.type} ${r.chassis.cockpit} ${r.chassis.structure} ${r.chassis.armorType}`],
    ["a fuel cell", { engine: { type: "Fuel Cell", technology: IS, rating: 100 } }, "fuel-cell", (r) => r.chassis.engine.type],
    ["fission", { engine: { type: "Fission", technology: IS, rating: 100 } }, "fission", (r) => r.chassis.engine.type],
    ["commercial armor", { armor: { type: "Commercial", technology: IS, points: 40 } }, "commercial", (r) => r.chassis.armorType],
    ["industrial armor", { armor: { type: "Industrial", technology: IS, points: 40 } }, "industrial", (r) => r.chassis.armorType],
    ["industrial triple-strength myomer", { myomer: { type: "Industrial Triple-Strength Myomer", technology: IS } }, "industrial-tsm", (r) => r.chassis.myomer],
  ])("reads %s by Mordel's words", (_name, patch, expected, read) => {
    const { record, notes } = imported(industrial([], patch));
    expect(read(record)).toBe(expected);
    expect(notes.filter((n) => /not one this tool knows/.test(n))).toEqual([]);
  });

  it("makes the cockpit's Advanced Fire Control, which Mordel lists as an item with no place, the industrial cockpit's variant", () => {
    const { record } = imported(industrial([entry(null, "Advanced Fire Control System", null, { slots: 0 }), entry(1, "Medium Laser", "RA")]));
    expect(record.chassis.cockpit).toBe("industrial-afc");
    expect(record.mounts.map((m) => m.name)).toEqual(["Medium Laser"]);
  });

  it("takes the size of cargo and communications equipment from Mordel's stacks, and a dumper's weight from the cargo it is linked to", () => {
    const { record } = imported(
      industrial([
        entry(1, "Cargo, Standard", "LT", { slots: 8, stacks: { count: 16, unit: "increments" } }),
        entry(2, "Dumper", "LT", { associated_id: 1 }),
        entry(3, "Communications Equipment", "CT", { slots: 3, stacks: { count: 3, unit: "increments" } }),
      ]),
    );
    expect(record.mounts.map((m) => m.amount)).toEqual([8, undefined, 3]);
    expect(facts(record, mountOf(record, "Cargo, Standard"))).toMatchObject({ tons: 8, slots: 8 });
    expect(facts(record, mountOf(record, "Dumper"))).toMatchObject({ tons: 0.5, slots: 1 });
    expect(facts(record, mountOf(record, "Communications Equipment"))).toMatchObject({ tons: 3, slots: 3 });
  });

  it("matches an ammunition bin by the launcher's tag, and drops a tag it has no use for", () => {
    const { record } = imported(
      industrial([entry(1, "MML 7 (Ammo 17) [LRM]", "LT"), entry(2, "MML 7 (Ammo 14) [SRM]", "LT"), entry(3, "Fluid Gun (Ammo 20) [Water]", "RT")]),
    );
    expect(record.mounts.map((m) => m.equipmentId)).toEqual(["ammo-mml-7-lrm-is", "ammo-mml-7-srm-is", "ammo-fluid-gun-is"]);
  });

  it("takes the hand actuator out of an arm that carries a tool that replaces it, and both lower arm and hand for a pile driver", () => {
    const { record, notes } = imported(industrial([entry(1, "Backhoe", "LA", { slots: 6 }), entry(2, "Heavy Duty Pile-Driver", "RA", { slots: 8 })]));
    expect(record.arms).toEqual({ LA: { lowerArm: true, hand: false }, RA: { lowerArm: false, hand: false } });
    expect(notes).toEqual([expect.stringMatching(/Backhoe in the Left Arm replaces the hand actuator/), expect.stringMatching(/Pile-Driver in the Right Arm replaces the lower arm and hand actuators/)]);
  });

  it("counts a spot welder as a heavy energy weapon, so an internal combustion engine carries power amplifiers for it", () => {
    const { record } = imported(industrial([entry(1, "Spot Welder", "RA")]));
    expect(weights(record, catalog.factsOf).lines.find((l) => l.label === "Power amplifiers")?.tons).toBe(0.5);
  });
});

describe("changedSinceImport", () => {
  const base = imported(mordelBiped()).record;
  const ac = mountOf(base, "AC/10");
  it.each<[string, (draft: MechRecord) => void, (string | undefined)[]]>([
    ["nothing", () => undefined, []],
    ["a changed readout text and arm", (d) => void ((d.notes.overview = "Mine."), (d.arms = { LA: { lowerArm: true, hand: false } })), ["notes.overview", "arms.LA"]],
    ["an armor edit and a tonnage", (d) => void ((d.armor.LA = { front: 20 }), (d.tons = 55)), ["armor.LA", "tons"]],
    ["a moved mount", (d) => void (d.mounts.find((m) => m.id === ac?.id)!.slot = 3), [ac?.id]],
    ["a replaced mount", (d) => void (d.mounts.find((m) => m.id === ac?.id)!.equipmentId = "ac-20-is"), [ac?.id]],
    ["an added mount", (d) => void d.mounts.push({ id: "mine", equipmentId: null, name: "Mine", techBase: "inner-sphere", location: null, slot: null }), ["mine"]],
    ["a removed mount", (d) => void d.mounts.pop(), ["mounts.removed"]],
    ["a picture of its own, which is not a change to the design", (d) => void (d.picture = { dataUrl: "data:image/png;base64,AAAA" }), []],
  ])("names %s", (_name, edit, want) => {
    expect(changedSinceImport(editRecord(base, edit))).toEqual(new Set(want));
  });

  it("compares with the stored baseline alone: no baseline, no source, or a response the importer cannot read, shows nothing", () => {
    expect(base.source?.baseline?.mounts).toEqual(base.mounts);
    expect(changedSinceImport({ ...base, source: undefined })).toEqual(new Set());
    expect(changedSinceImport({ ...base, tons: 99, source: base.source && { ...base.source, baseline: undefined } })).toEqual(new Set());
    for (const original of [null, 5, { status: "Error" }]) {
      expect(changedSinceImport({ ...base, source: base.source?.kind === "mordel" ? { ...base.source, original } : base.source })).toEqual(new Set());
    }
  });
});

describe("an OmniMech set (omni, omni_base_id, omni_variants; without a fixed flag a variant's pods are its equipment minus the base's)", () => {
  const fixed = [entry(5, "Jump Jet", "CT"), entry(6, "Jump Jet", "LL"), entry(7, "Jump Jet", "RL"), entry(8, "Heat Sink", "LL"), entry(9, "Heat Sink", "RL")];
  const unit = (id: number, model: string, extra: Record<string, unknown>, equipment: unknown[]) =>
    mordelWith(mordelBiped(), { id, name_parts: { name: model === "[BASE]" ? "Test Walker [BASE]" : "Test Walker", alternate_name: null, model: model === "[BASE]" ? "" : model }, equipment, ...extra });
  const base = unit(900010, "[BASE]", { omni: true, omni_base_id: 900010, omni_variants: [900011, 900012] }, fixed);
  const prime = unit(900011, "Prime", { omni: true, omni_base_id: 900010 }, [entry(1, "AC/10", "RT", { slots: 7 }), entry(2, "AC/10 Ammo", "LT"), ...fixed]);
  const alt = unit(900012, "A", { omni: true, omni_base_id: 900010 }, [entry(3, "Medium Laser", "LA"), entry(4, "Medium Laser", "RA"), ...fixed.slice(0, 4)]);

  it("reads the Omni facts, makes one chassis of the base and its variants, and reports what a variant lacks", async () => {
    expect(omniFacts(base)).toMatchObject({ omni: true, isBase: true, id: 900010, baseId: 900010, variantIds: [900011, 900012] });
    expect(omniFacts(prime)).toMatchObject({ omni: true, isBase: false, baseId: 900010 });
    expect(omniFacts(mordelBiped()).omni).toBe(false);
    let n = 0;
    const newId = () => `id-${++n}`;
    const record = (response: unknown) => imported(response).record;
    const { chassis, notes } = importOmniSet(record(base), [record(prime), record(alt)], newId);
    expect(chassis.name.chassis).toBe("Test Walker");
    expect(chassis.base.mounts.map((m) => m.name).sort()).toEqual(["Heat Sink", "Heat Sink", "Jump Jet", "Jump Jet", "Jump Jet"]);
    expect(chassis.configurations.map((c) => [c.code, c.mounts.map((m) => m.name).sort()])).toEqual([
      ["Prime", ["AC/10", "AC/10 Ammo"]],
      ["A", ["Medium Laser", "Medium Laser"]],
    ]);
    expect(chassis.primaryId).toBe(chassis.configurations[0]?.id);
    expect(chassis.configurations[0]?.source?.baseline).toBeUndefined();
    expect(notes.some((t) => t.startsWith("A does not list Heat Sink"))).toBe(true);
    expect(isOmniShaped(chassis)).toBe(true);
  });

  it("notes that Mordel leaves out the Omni arm actuators, which we keep", () => {
    const record = (response: unknown) => imported(response).record;
    const { notes } = importOmniSet(record(base), [record(prime)], () => "x");
    expect(notes.at(-1)).toContain("Mordel leaves out the lower arm and hand actuators");
  });

  it("falls back, labelled, to a one-configuration chassis when the base is not to be had", async () => {
    const { chassis, notes } = importOmniSingle(imported(prime).record, catalog, () => `solo-${++counter}`, "This variant names no base.");
    expect(chassis.configurations).toHaveLength(1);
    expect(chassis.configurations[0]?.code).toBe("Prime");
    expect(chassis.base.mounts.filter((m) => m.part === undefined).map((m) => m.name).sort()).toEqual(["Heat Sink", "Heat Sink", "Jump Jet", "Jump Jet", "Jump Jet"]);
    expect(chassis.configurations[0]?.mounts.map((m) => m.name).sort()).toEqual(["AC/10", "AC/10 Ammo"]);
    expect(notes[0]).toContain("a guess");
  });

  describe("the per-item fixed flag (live check, 2026-11-25)", () => {
    const flag = (items: ReturnType<typeof entry>[], on: boolean) => items.map((e) => ({ ...e, fixed: on }));
    const flagged = (model: string, pods: ReturnType<typeof entry>[], baseId: number | null) =>
      unit(900020, model, { omni: true, omni_base_id: baseId }, [...flag(pods, false), ...flag(fixed, true)]);
    const ids = () => {
      let n = 0;
      return () => `f-${++n}`;
    };

    it("rebuilds a private base from the variant: the fixed marks decide, not our guess", () => {
      const variant = flagged("Prime", [entry(1, "AC/10", "RT", { slots: 7 }), entry(2, "Heat Sink", "LT")], null);
      expect(omniFacts(variant)).toMatchObject({ omni: true, isBase: false, baseId: null });
      const made = imported(variant);
      const { chassis, notes } = importOmniSingle(made.record, catalog, ids(), "This variant names no base.", made.fixedIds);
      expect(chassis.base.mounts.filter((m) => m.part === undefined).map((m) => m.name).sort()).toEqual(["Heat Sink", "Heat Sink", "Jump Jet", "Jump Jet", "Jump Jet"]);
      expect(chassis.configurations[0]?.mounts.map((m) => m.name).sort()).toEqual(["AC/10", "Heat Sink"]);
      expect(notes[0]).toContain("rebuilt the base from this variant");
    });

    it("keeps the subtraction when the base is in hand, so nothing is lost, and names the items the fixed marks place differently, once", () => {
      const baseUnit = unit(900010, "[BASE]", { omni: true, omni_base_id: 900010 }, flag(fixed, true));
      const agrees = flagged("Prime", [entry(1, "AC/10", "RT", { slots: 7 })], 900010);
      const differs = unit(900012, "A", { omni: true, omni_base_id: 900010 }, [...flag([entry(3, "Medium Laser", "LA")], true), ...flag(fixed, true)]);
      const [b, p, a] = [baseUnit, agrees, differs].map(imported);
      const { chassis, notes } = importOmniSet(b!.record, [p!.record, a!.record], ids(), [p!.fixedIds, a!.fixedIds]);
      expect(chassis.configurations.map((c) => [c.code, c.mounts.map((m) => m.name)])).toEqual([["Prime", ["AC/10"]], ["A", ["Medium Laser"]]]);
      expect(notes.filter((t) => t.includes("fixed marks"))).toEqual(["A: the base's equipment list and Mordel's fixed marks disagree about Medium Laser; we followed the base's list, so this configuration carries exactly the equipment Mordel lists for it."]);
    });

    it("reports a fixed flag that is not a boolean and then reads the unit by subtraction", () => {
      const made = imported(withEquipment([entry(1, "AC/10", "RT", { fixed: "yes" })]));
      expect(made.notes).toContain("Mordel's AC/10 fixed flag is not the kind of value expected and was ignored.");
      expect(made.fixedIds).toBeUndefined();
    });
  });
});

const isOmniShaped = (c: { base: { mounts: unknown[] }; configurations: unknown[]; primaryId: string }) => c.base.mounts.length > 0 && c.configurations.length > 0 && c.primaryId !== "";
