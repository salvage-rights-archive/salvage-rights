import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog";
import { mordelBiped, mordelOdd, mordelQuad, mordelWith } from "./fixtures";
import { editRecord, layout, type LocationCode, type MechRecord } from "./mech";
import { changedSinceImport, fromMordel, parseMordelRef } from "./mordel";

const catalog = await loadCatalog();
let counter = 0;
const NOW = "2026-11-24T10:00:00.000Z";
const run = (response: unknown) => fromMordel(response, catalog, "core-2026", NOW, () => `rec-${++counter}`);
function imported(response: unknown): { record: MechRecord; notes: string[] } {
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
      editionId: "core-2026",
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
    expect(odd.record).toMatchObject({ configuration: "tripod", year: null, chassis: { myomer: "" } });
    expect(odd.notes.join("\n")).toMatch(/tripod[^]*myomer|myomer[^]*tripod/);
    // The center leg is kept: its armor, and its laser in the location, though a tripod has no slots laid out.
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
      expect(changedSinceImport({ ...base, source: base.source && { ...base.source, original } })).toEqual(new Set());
    }
  });
});
