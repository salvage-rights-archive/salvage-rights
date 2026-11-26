import { describe, expect, it } from "vitest";
import { newAsUnit, parseSpecials, unitFindings } from "./as-unit";
import type { AsCard } from "./as-unit";
import { applyCrit, applyEndPhase, crippled, critKind, currentDamage, currentMove, currentTmm, fireControlModifier, isImmobile, motiveResult, newPlayState, stage, withdraws } from "./as-play";
import type { PlayState } from "./as-play";

// Invented cards only.
const card = (over: Partial<AsCard> = {}): AsCard => ({
  type: "BM", size: 2, tmm: 2, move: [{ inches: 8, mode: "" }], role: null, pv: 30,
  damage: { s: { value: 3 }, m: { value: 3 }, l: { value: 1 } }, ov: 1, armor: 3, structure: 4, specials: [], ...over,
});
const tank = card({ type: "CV", move: [{ inches: 8, mode: "h" }], tmm: 2, ov: 0 });
const emplacement = card({ type: "BD", tmm: null, move: [], ov: 0, armor: 2, structure: 2, damage: { s: { value: 1 }, m: { value: 1 }, l: { value: 0 } } });
const rolls = (...r: number[]) => () => r.shift() ?? 7;
const withState = (c: AsCard, over: Partial<PlayState>): PlayState => ({ ...newPlayState(c), ...over });

describe("table state", () => {
  it("stages hits, then at the End Phase takes armor first and structure next, rolling a critical for the structure damage", () => {
    const c = card();
    let s = stage(stage(newPlayState(c), { damage: 2 }), { damage: 2 });
    expect([s.armor, s.structure]).toEqual([3, 4]);
    const end = applyEndPhase(s, c, { roll: rolls(6) });
    s = end.state;
    expect([s.armor, s.structure, s.staged.length, s.crits.weapon]).toEqual([0, 3, 0, 1]);
    expect(currentDamage(s, c)).toEqual({ s: { value: 2 }, m: { value: 2 }, l: { value: 0, minimal: true } });
    expect(applyEndPhase(stage(s, { damage: 9 }), c, { roll: rolls() }).state.destroyed).toBe(true);
  });

  it("heat slows the unit, a fourth level shuts it down, and the next End Phase restarts it cold", () => {
    const c = card({ move: [{ inches: 8, mode: "" }, { inches: 6, mode: "j" }] });
    const warm = withState(c, { heat: 2 });
    expect(currentMove(warm, c).map((m) => m.inches)).toEqual([4, 6]);
    expect(currentTmm(warm, c)).toBe(1);
    expect(currentTmm(warm, c, "asce", true)).toBe(2);
    const hot = applyEndPhase(withState(c, { heat: 3 }), c, { roll: rolls(), attacked: true, overheat: 1 }).state;
    expect([hot.heat, hot.shutdown, isImmobile(hot, c), currentTmm(hot, c)]).toEqual([4, true, true, -4]);
    const restarted = applyEndPhase(hot, c, { roll: rolls() }).state;
    expect([restarted.heat, restarted.shutdown]).toEqual([0, false]);
    expect(applyEndPhase(warm, c, { roll: rolls() }).state.heat).toBe(0);
  });

  it.each<[string, (c: AsCard) => void]>([
    ["fire-control", (c) => expect(fireControlModifier(applyCrit(newPlayState(c), c, "fire-control").state)).toBe(2)],
    ["mp", (c) => {
      const s = applyCrit(newPlayState(c), c, "mp").state;
      expect([currentMove(s, c)[0]?.inches, currentTmm(s, c)]).toEqual([4, 1]);
    }],
    ["engine twice", (c) => {
      const once = applyCrit(newPlayState(c), c, "engine").state;
      expect(once.destroyed).toBe(false);
      expect(applyCrit(once, c, "engine").state.destroyed).toBe(true);
    }],
    ["ammo", (c) => {
      expect(applyCrit(newPlayState(c), c, "ammo").state.destroyed).toBe(true);
      const cased = { ...c, specials: parseSpecials("CASE") };
      expect([applyCrit(newPlayState(cased), cased, "ammo").state.armor, applyCrit(newPlayState(cased), cased, "ammo").state.destroyed]).toEqual([2, false]);
      const safe = { ...c, specials: parseSpecials("CASEII") };
      expect(applyCrit(newPlayState(safe), safe, "ammo").state.armor).toBe(3);
    }],
    ["weapon with nothing left to lose", (c) => {
      const spent = { ...c, damage: { s: { value: 0 }, m: { value: 0 }, l: { value: 0 } } };
      const s = applyCrit(newPlayState(spent), spent, "weapon").state;
      expect([s.crits.weapon, s.armor]).toEqual([0, 2]);
    }],
    ["crew-stunned", (c) => {
      const s = applyCrit(newPlayState(c), c, "crew-stunned").state;
      expect([isImmobile(s, c), currentTmm(s, c)]).toEqual([true, -4]);
      expect(applyEndPhase(s, c, { roll: rolls() }).state.stunned).toBe(false);
    }],
  ])("a %s critical hit has its printed effect", (_name, check) => check(card()));

  it("rolls the Aces vehicle critical table instead of the Alpha Strike one only when the game says so", () => {
    expect([critKind("CV", "asce", 6), critKind("CV", "aces", 6), critKind("CV", "aces", 7), critKind("CV", "asce", 7)]).toEqual(["none", "weapon", "mp", "none"]);
    expect([critKind("BM", "aces", 12), critKind("PM", "asce", 10), critKind("CI", "asce", 2), critKind("BD", "aces", 12)]).toEqual(["destroyed", "destroyed", "weapon", "weapon"]);
  });

  it("adds 1 to the motive roll for hover and wheeled, and a vehicle that takes damage rolls it", () => {
    expect([motiveResult("t", 8), motiveResult("h", 8), motiveResult("w", 10), motiveResult("v", 10), motiveResult("t", 12)]).toEqual(["none", "minus", "half", "immobile", "immobile"]);
    const s = applyEndPhase(stage(newPlayState(tank), { damage: 1 }), tank, { roll: rolls(9), variant: "aces" }).state;
    expect([s.armor, s.moveHits]).toEqual([2, ["motive-2"]]);
    expect(currentMove(s, tank)[0]?.inches).toBe(6);
  });

  it("halves a short Move to 0 under the Alpha Strike table and to 1 under the Aces table", () => {
    const slow = { ...tank, move: [{ inches: 2, mode: "h" }], tmm: 1 };
    const s = withState(slow, { moveHits: ["motive-half"] });
    expect([currentMove(s, slow, "asce")[0]?.inches, currentMove(s, slow, "aces")[0]?.inches]).toEqual([0, 1]);
  });

  it.each<[string, Partial<PlayState>, boolean, boolean]>([
    ["fresh", {}, false, false],
    ["no armor, structure at half", { armor: 0, structure: 2 }, true, true],
    ["no armor, structure above half", { armor: 0, structure: 3 }, false, false],
    ["Medium and Long damage gone", { crits: { engine: 0, fireControl: 0, weapon: 4 } }, true, true],
    ["one MP hit", { moveHits: ["mp"] }, false, false],
    ["two MP hits", { moveHits: ["mp", "mp"] }, true, false],
    ["three MP hits", { moveHits: ["mp", "mp", "mp"] }, true, true],
    ["heat alone", { heat: 3 }, false, false],
  ])("is crippled by the Aces conditions and the Alpha Strike ones: %s", (_name, over, aces, asce) => {
    const c = card();
    expect([crippled(withState(c, over), c, "aces"), crippled(withState(c, over), c, "asce")]).toEqual([aces, asce]);
  });

  it("calls an emplacement crippled at damage 0, rolls only Weapon Hits on it, and never withdraws it", () => {
    const hit = applyEndPhase(stage(newPlayState(emplacement), { damage: 3 }), emplacement, { roll: rolls(12), variant: "aces" }).state;
    expect([hit.structure, hit.crits.weapon, crippled(hit, emplacement)]).toEqual([1, 1, false]);
    const worn = withState(emplacement, { crits: { engine: 0, fireControl: 0, weapon: 2 } });
    expect([crippled(worn, emplacement), withdraws(worn, emplacement)]).toEqual([true, false]);
    expect(withdraws(withState(card(), { armor: 0, structure: 1 }), card())).toBe(true);
    const spent = card({ damage: { s: { value: 2 }, m: { value: 0 }, l: { value: 0 } } });
    expect(crippled(newPlayState(spent), spent)).toBe(false);
  });

  it("accepts a building card with CF and IMMOBILE without findings", () => {
    const unit = { ...newAsUnit("e1"), card: { ...emplacement, specials: parseSpecials("CF4, IMMOBILE") } };
    expect(unitFindings(unit)).toEqual([]);
  });
});
