import { describe, expect, it } from "vitest";
import { ACES_LETTERS } from "./aces-vocab";
import { SS_AVAILABILITY, SS_SORTIES, ssSortie } from "./aces-scouring-sands";
import { expandLetters } from "../rules/aces-campaign";

describe("Scouring Sands data", () => {
  it("has the two tutorials and sorties 1 to 21, each read from the page images with its pages and a figure for every row", () => {
    expect(SS_SORTIES.filter((s) => s.n === 0).map((s) => s.id)).toEqual(["00-battlerom", "00-simulator"]);
    expect(SS_SORTIES.filter((s) => s.n > 0).map((s) => s.n)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    for (const s of SS_SORTIES) {
      const where = `sortie ${s.id}`;
      expect(s.checked, where).toBe("page");
      expect(s.pages, where).toMatch(/^\d+-\d+$/);
      expect(s.player.pv, where).toBeGreaterThan(0);
      expect(s.opposing.pv, where).toBeGreaterThan(0);
      expect(ACES_LETTERS, where).toContain(s.command.start);
      expect(s.opposing.units.length, where).toBeGreaterThan(0);
      for (const u of s.opposing.units) {
        expect(u.skill, `${where} ${u.name}`).toBeGreaterThanOrEqual(2);
        expect(u.skill, `${where} ${u.name}`).toBeLessThanOrEqual(4);
        // A unit without a deck is an emplacement, the only kind the book leaves without one.
        if (!u.deck) expect(u.name, `${where} ${u.name}`).toMatch(/Emplacement/);
      }
      for (const w of s.waypoints) expect(expandLetters(w.letters).length, `${where} ${w.letters}`).toBeGreaterThan(0);
    }
    for (const s of SS_SORTIES.filter((x) => x.n > 0)) {
      expect(s.outcomePage, `outcome of ${s.id}`).toBeGreaterThanOrEqual(64);
      expect(s.spCap, `cap of ${s.id}`).toBeGreaterThanOrEqual(80);
      expect(s.objectives.primary, `primary of ${s.id}`).toBeGreaterThan(0);
      // Every next number is a sortie in the box, and the last four go to the epilogue.
      for (const n of s.next) expect(ssSortie(n.n), `next of ${s.id}`).toBeDefined();
      expect(s.epilogue === true, `epilogue of ${s.id}`).toBe(s.next.length === 0);
    }
    expect(SS_AVAILABILITY).toHaveLength(26);
    expect(SS_AVAILABILITY.every((u) => u.pv > 0 && u.pv <= 60)).toBe(true);
  });
})
