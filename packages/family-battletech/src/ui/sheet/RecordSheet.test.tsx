import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { battleValue } from "../../rules/bv";
import { loadCatalog } from "../../rules/catalog";
import { makeClean, mordelBiped, mordelQuad, mordelWith, tripodRecord } from "../../rules/fixtures";
import { markOfficial } from "../../rules/official";
import { fromMordel } from "../../rules/mordel";
import { editRecord } from "../../rules/mech";
import type { MechRecord } from "../../rules/mech";
import RecordSheet from "./RecordSheet";
import { sheetFacts } from "./facts";
import { inventoryStep } from "./MechData";
import { MAX_SINKS_DRAWN } from "./HeatData";

afterEach(cleanup);

async function recordOf(response: unknown): Promise<MechRecord> {
  const result = fromMordel(response, await loadCatalog(), "total-warfare", "2026-01-01T00:00:00Z", () => "sheet-1");
  if (!result.ok) throw new Error(result.message);
  return result.record;
}

/** The sheet drawn, and every line of type on it. */
async function drawn(record: MechRecord) {
  const { container } = render(<RecordSheet record={record} catalog={await loadCatalog()} />);
  const svg = container.querySelector<SVGSVGElement>("svg.bt-sheet");
  if (!svg) throw new Error("no sheet");
  const lines = [...svg.querySelectorAll("text")].map((t) => t.textContent.replace(/\s+/g, " ").trim());
  return { container, svg, lines };
}

describe("The record sheet", () => {
  it("takes hardened armor's and a large shield's movement off the printed movement and says why", async () => {
    const slowed = editRecord(await recordOf(mordelBiped()), (d) => {
      d.chassis.armorType = "hardened";
      d.mounts.push({ id: "sh", equipmentId: "shield-large-is", name: "Shield, Large", techBase: "inner-sphere", location: "LA", slot: null });
    });
    const { lines } = await drawn(slowed);
    expect(lines).toEqual(expect.arrayContaining(["Walking: 3", "Running: 4", "Jumping: 0", "Hardened: Run -1; Shield: MP -1; No jump"]));
  });

  it("prints the movement, an inventory line, the ammunition, an empty slot, the heat sinks and the credit", async () => {
    const { svg, lines } = await drawn(await recordOf(mordelBiped()));
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Test Walker TW-1 record sheet");
    expect(lines).toContain("BattleMech record sheet");
    expect(lines).toContain("Walking: 4");
    expect(lines).toContain("Running: 6");
    expect(lines).toContain("Jumping: 3");
    expect(lines).toContain("Rules edition: Total Warfare / TechManual");
    expect(lines).toContain("Rules level: Introductory");
    // Two Medium Lasers in two arms are two lines of one; the AC/10 is in the right torso.
    const ac = [...svg.querySelectorAll("[data-line]")].map((g) => [...g.querySelectorAll("text")].map((t) => t.textContent));
    expect(ac).toContainEqual(["1", "Autocannon/10", "RT", "3", "10", "—", "5", "10", "15"]);
    expect(ac).toContainEqual(["1", "Medium Laser", "LA", "3", "5", "—", "3", "6", "9"]);
    expect(lines).toContain("Ammo: (Autocannon/10) 10");
    expect(lines).toContain("BV: 1,000 (mordel.net)");
    expect(lines.filter((line) => line === "Roll Again").length).toBeGreaterThan(10);
    expect(lines).toContain("Single Heat Sinks: 10 (10)");
    expect(lines).toContain("Not an official record sheet. Made with Salvage Rights, an unofficial fan project. Designed by Nobody In Particular on mordel.net.");
    expect(svg.querySelectorAll("[data-diagram]")).toHaveLength(3);
  });

  it("prints (R) after a rear-firing weapon in the critical table", async () => {
    const rear = editRecord(await recordOf(mordelBiped()), (d) => {
      const gun = d.mounts.find((m) => m.location === "RT" && m.name === "AC/10");
      if (gun) gun.rear = true;
    });
    const { svg } = await drawn(rear);
    const cells = [...svg.querySelectorAll("[data-location='RT'] [data-slot='mount']")].map((g) => g.textContent);
    expect(cells.filter((t) => t?.includes("AC/10 (R)"))).toHaveLength(7);
  });

  it("has no credit and prints the calculated Battle Value for a Mech made here", async () => {
    const record = await recordOf(mordelBiped());
    delete record.source;
    const { lines } = await drawn(record);
    const catalog = await loadCatalog();
    expect(lines).toContain(`BV: ${battleValue(record, catalog).total.toLocaleString("en-US")} (calculated, pilot 4/5)`);
    expect(lines.some((line) => line.includes("mordel.net"))).toBe(false);
  });

  it("prints the verified line only for a record that passes, and the OFFICIAL or NOT OFFICIAL mark", async () => {
    const clean = editRecord(await recordOf(mordelBiped()), makeClean);
    const verified = (lines: string[]) => lines.filter((line) => line.startsWith("Verified Standard Rules Compliant"));
    const passing = await drawn(clean);
    expect(verified(passing.lines)).toEqual([expect.stringMatching(/^Verified Standard Rules Compliant: Salvage Rights rules check, Total Warfare \/ TechManual, \d{4}-\d{2}-\d{2}\.$/)]);
    expect(passing.lines).toContain("NOT OFFICIAL");
    const failing = await drawn(editRecord(clean, (d) => void (d.chassis.armorType = "hardened")));
    expect(verified(failing.lines)).toEqual([]);
    const official = await drawn(editRecord(clean, (d) => void markOfficial(d, "TechManual", 7)));
    expect(official.lines).toContain("OFFICIAL: TechManual, p. 7");
  });

  it("draws the three diagrams for a quad", async () => {
    const { svg, lines } = await drawn(await recordOf(mordelQuad()));
    expect(svg.querySelectorAll("[data-diagram]")).toHaveLength(3);
    expect(svg.querySelectorAll("[data-testid='mech-doll'][data-layout='quad']")).toHaveLength(3);
    expect(svg.querySelectorAll("[data-diagram='text']")).toHaveLength(0);
    expect(lines).toContain("FLL");
  });

  it("prints a tripod's critical table with the center leg and draws its three diagrams", async () => {
    const { svg, lines } = await drawn(tripodRecord());
    expect(svg.querySelector("[data-location='CL']")).not.toBeNull();
    expect(lines).toContain("Center Leg");
    expect(svg.querySelectorAll("[data-diagram]")).toHaveLength(3);
    expect(svg.querySelectorAll("[data-testid='mech-doll'][data-layout='tripod']")).toHaveLength(3);
    expect(lines).not.toContain("This sheet has no critical table for a tripod yet.");
  });

  it("lists each location's points as text in place of the diagrams for a body type with no doll", async () => {
    const record = await recordOf(mordelQuad());
    record.configuration = "hexapod";
    const { svg, lines } = await drawn(record);
    expect(svg.querySelectorAll("[data-testid='mech-doll']")).toHaveLength(0);
    expect(svg.querySelectorAll("[data-diagram='text']")).toHaveLength(2);
    expect(lines).toContain("Center Torso: 20 front, 8 rear");
    expect(lines).toContain("Front Left Leg: 20");
  });

  it("draws the player's picture before Mordel's, Mordel's before nothing, and ignores any other host", async () => {
    const own = { dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
    const unit = mordelBiped();
    const withPicture = async (image: string | undefined, picture?: MechRecord["picture"]) => {
      const record = await recordOf(mordelWith(unit, { image_url: image ?? null }));
      if (picture) record.picture = picture;
      const { svg } = await drawn(record);
      cleanup();
      const frame = svg.querySelector("[data-picture]");
      return [frame?.getAttribute("data-picture"), svg.querySelector("[data-picture] image")?.getAttribute("href")];
    };
    expect(await withPicture("https://mordel.net/a.png", own)).toEqual(["image", own.dataUrl]);
    expect(await withPicture("https://mordel.net/a.png")).toEqual(["image", "https://mordel.net/a.png"]);
    expect(await withPicture("https://example.com/a.png")).toEqual(["empty", undefined]);
    expect(await withPicture(undefined)).toEqual(["empty", undefined]);
  });

  it("draws a bounded number of heat sink circles however many heat sinks the record says, and still prints the count", async () => {
    const circles = async (count: number) => {
      const record = editRecord(await recordOf(mordelBiped()), (d) => void (d.chassis.heatSinks.count = count));
      const { svg, lines } = await drawn(record);
      cleanup();
      return { drawn: svg.querySelectorAll("circle").length, lines };
    };
    const huge = await circles(4_000_000_000);
    // The sheet has other circles (armor and structure pips); the heat sinks are what a count adds to a sheet with none.
    expect(huge.drawn - (await circles(0)).drawn).toBe(MAX_SINKS_DRAWN);
    expect(huge.drawn).toBe((await circles(1_000_000)).drawn);
    expect(huge.lines).toContain("Single Heat Sinks: 4000000000 (4000000000)");
  });

  it("steps the inventory type down to hold 14 lines at its default size and up to 19 at its smallest", () => {
    const room = 391;
    expect(inventoryStep(14, room).size).toBe(23);
    expect(inventoryStep(15, room).size).toBeLessThan(23);
    expect(inventoryStep(19, room).size).toBe(20);
    expect(inventoryStep(19, room).capacity).toBeGreaterThanOrEqual(19);
    expect(inventoryStep(30, room).capacity).toBeLessThan(30);
  });
});

describe("Multi-mode launchers and special munitions on the sheet", () => {
  const mounts = (...ids: string[]) => ids.map((id, i) => ({ id: `m${String(i)}`, equipmentId: id, name: id, techBase: "inner-sphere" as const, location: "LT" as const, slot: i }));
  const factsFor = async (...ids: string[]) => sheetFacts(editRecord(await recordOf(mordelBiped()), (d) => void (d.mounts = mounts(...ids))), await loadCatalog());

  it("prints an MML as its own line and one line each for LRM and SRM with that mode's damage and ranges", async () => {
    const { inventory } = await factsFor("mml-5-is");
    expect(inventory.map((l) => [l.name, l.heat, l.damage, l.min, l.short, l.medium, l.long])).toEqual([
      ["MML 5", "3", "", "", "", "", ""],
      ["LRM", "", "1/Msl", "6", "7", "14", "21"],
      ["SRM", "", "2/Msl", "—", "3", "6", "9"],
    ]);
  });

  it("prints an ATM as its own line and one each for standard, ER and HE, and gives ER and HE ammunition the ATM's shots", async () => {
    const { inventory, ammo } = await factsFor("atm-6-clan", "ammo-er-atm-clan", "ammo-he-atm-clan");
    expect(inventory.map((l) => [l.name, l.damage, l.min, l.short, l.medium, l.long])).toEqual([
      ["ATM 6", "", "", "", "", ""],
      ["ATM", "2/Msl", "4", "5", "10", "15"],
      ["ER", "1/Msl", "4", "9", "18", "27"],
      ["HE", "3/Msl", "—", "3", "6", "9"],
    ]);
    expect(ammo).toBe("(ATM 6 ER) 10, (ATM 6 HE) 10");
  });

  it("gives a special munition its launcher's shots, and each choice when two launchers could take it", async () => {
    expect((await factsFor("lrm-15-is", "ammo-artemis-capable-is")).ammo).toBe("(LRM 15 Artemis-capable) 8");
    expect((await factsFor("srm-4-is", "srm-6-is", "ammo-inferno-is")).ammo).toBe("(SRM 4 Inferno) 25 or (SRM 6 Inferno) 15");
    expect((await factsFor("ammo-inferno-is")).ammo).toBe("(Inferno SRM)");
  });
});

describe("Printed sheet conventions", () => {
  const plus = (d: MechRecord, id: string, equipmentId: string, location: "LT" | "RA" | "LA" | "CT", slot: number | null) =>
    void d.mounts.push({ id, equipmentId, name: id, techBase: "inner-sphere", location, slot });
  const slotsOf = (svg: SVGSVGElement, code: string) => [...svg.querySelectorAll(`[data-location='${code}'] [data-slot='mount']`)].map((g) => g.textContent.replace(/^\d\./, ""));

  it("prints an ammunition slot as Ammo (LRM 10) 12 from the bin's shots, and an Artemis-capable bin with its launcher", async () => {
    const record = editRecord(await recordOf(mordelBiped()), (d) => {
      plus(d, "bin", "ammo-lrm-10-is", "LT", 6);
      plus(d, "lrm", "lrm-10-is", "LT", 8);
      plus(d, "art", "ammo-artemis-capable-is", "LT", 10);
    });
    expect(slotsOf((await drawn(record)).svg, "LT")).toEqual(expect.arrayContaining(["Ammo (LRM 10) 12", "Ammo (LRM 10 Artemis-capable) 12"]));
  });

  it("prints a hatchet damage as a number from the tonnage of the unit", async () => {
    const record = editRecord(await recordOf(mordelBiped()), (d) => {
      d.tons = 60;
      plus(d, "axe", "hatchet-is", "RA", 2);
    });
    expect(sheetFacts(record, await loadCatalog()).inventory.find((l) => l.name === "Hatchet")).toMatchObject({ location: "RA", damage: "12" });
  });

  it("brackets the running MP for MASC and the walking and running MP for TSM", async () => {
    const catalog = await loadCatalog();
    const withMasc = editRecord(await recordOf(mordelBiped()), (d) => plus(d, "m", "masc-is", "LT", 6));
    const masc = sheetFacts(withMasc, catalog);
    expect([masc.walk, masc.walkBest, masc.run, masc.runBest]).toEqual(["4", undefined, "6", "8"]);
    const tsm = sheetFacts(editRecord(await recordOf(mordelBiped()), (d) => void (d.chassis.myomer = "tsm")), catalog);
    expect([tsm.walk, tsm.walkBest, tsm.run, tsm.runBest]).toEqual(["4", "5", "6", "8"]);
    expect((await drawn(withMasc)).lines).toContain("Running: 6 [8]");
  });

  it("draws three gyro hit boxes for a heavy-duty gyro and two for a standard one", async () => {
    const boxes = async (gyro: string) => {
      const { svg } = await drawn(editRecord(await recordOf(mordelBiped()), (d) => void (d.chassis.gyro = gyro)));
      cleanup();
      return svg.querySelectorAll("[data-hits='Gyro Hits'] circle").length;
    };
    expect([await boxes("heavy-duty"), await boxes("standard")]).toEqual([3, 2]);
  });

  it("shades the fixed equipment of an OmniMech and nothing else", async () => {
    const record = editRecord(await recordOf(mordelBiped()), (d) => {
      const gun = d.mounts.find((m) => m.name === "AC/10");
      d.omni = { chassisId: "o", configurationId: "a", code: "A", baseHeatSinks: 10, baseMountIds: gun ? [gun.id] : [] };
    });
    const { svg } = await drawn(record);
    expect(svg.querySelectorAll("[data-location='RT'] [data-fixed]")).toHaveLength(7);
    expect(svg.querySelectorAll("[data-location='LA'] [data-fixed]")).toHaveLength(0);
  });
});
