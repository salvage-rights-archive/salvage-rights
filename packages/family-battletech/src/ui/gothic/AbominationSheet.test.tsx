import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RANDOM_CREATURE } from "../../data/gothic";
import { newAbominationUnit, paginate } from "../../rules/abomination";
import type { AbominationUnit } from "../../rules/abomination";
import { loadCatalog } from "../../rules/catalog";
import AbominationSheet from "./AbominationSheet";

afterEach(cleanup);

const unit = (typeId: string, n = 1): AbominationUnit => newAbominationUnit(typeId, `u${String(n)}`);

async function drawn(props: { units?: AbominationUnit[]; blank?: "swarmer" | "hulk" | "giant" | "titan" }) {
  const { container } = render(<AbominationSheet catalog={await loadCatalog()} {...props} />);
  const svg = container.querySelector<SVGSVGElement>("svg.bt-sheet");
  if (!svg) throw new Error("no sheet");
  return svg;
}

const pipsOf = (el: Element) => el.querySelectorAll("circle[data-pip]").length;

describe("The Abomination sheet", () => {
  it("draws a tracker for each creature and one pip row for each row of the class", async () => {
    const gnat = await drawn({ units: [unit("gnat")] });
    const trackers = [...gnat.querySelectorAll("[data-tracker]")];
    expect(trackers).toHaveLength(6);
    expect(trackers.map(pipsOf)).toEqual([3, 3, 3, 3, 3, 3]);
    cleanup();
    const ravager = await drawn({ units: [unit("ravager")] });
    expect(ravager.querySelectorAll("[data-tracker]")).toHaveLength(1);
    expect([...ravager.querySelectorAll("[data-pip-row]")].map(pipsOf)).toEqual([18, 18, 18, 18, 18]);
  });

  it("prints each weapon with its catalog figures, a dash for no physical damage, and the Handler bonus box", async () => {
    const tyrant = unit("tyrant");
    tyrant.handlerBonus = true;
    const svg = await drawn({ units: [tyrant, unit("colossus", 2)] });
    const rows = [...svg.querySelectorAll("[data-block]")].map((b) => [...b.querySelectorAll("[data-weapon]")].map((w) => [...w.querySelectorAll("text")].map((t) => t.textContent)));
    expect(rows[0]).toContainEqual(["Small Laser", "3", "—", "1", "2", "3"]);
    expect(rows[0]).toContainEqual(["SRM 5 (1 shot)", "2/Msl", "—", "3", "6", "9"]);
    expect(rows[1]).toHaveLength(4);
    const boxes = (b: number, key: string) => svg.querySelectorAll("[data-block]")[b]?.querySelector(`[data-box='${key}']`)?.querySelector("text:last-of-type")?.textContent;
    expect([boxes(1, "mob"), boxes(1, "hobble"), boxes(1, "melee")]).toEqual(["—", "—", "5"]);
    expect(boxes(0, "bonus")).toBe("X");
  });

  it("packs seven units as five and two", () => {
    const units = Array.from({ length: 7 }, (_, i) => unit("gnat", i));
    expect(paginate(units).map((page) => page.length)).toEqual([5, 2]);
  });

  it("draws a blank Titan sheet as five empty unit forms and the four tables", async () => {
    const svg = await drawn({ blank: "titan" });
    const blocks = [...svg.querySelectorAll("[data-block]")];
    expect(blocks).toHaveLength(5);
    for (const block of blocks) expect(block.querySelectorAll("[data-pip-row]")).toHaveLength(5);
    expect(blocks[0]?.querySelectorAll("[data-weapon]")).toHaveLength(0);
    expect(svg.querySelectorAll("[data-table]")).toHaveLength(5);
    const random = svg.querySelector("[data-table='random']");
    expect(random?.querySelectorAll("[data-row]")).toHaveLength(RANDOM_CREATURE.length);
    expect(random?.textContent).toContain("* roll again");
  });
});
