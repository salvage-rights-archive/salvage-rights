import { describe, expect, it } from "vitest";
import { MUL_CREDIT, asOfficialMark, fromMulPage } from "./as-mul";
import { formatSpecials, newAsUnit } from "./as-unit";

const NOW = "2026-11-25T10:00:00.000Z";
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const run = (text: string) => fromMulPage(bytes(text), NOW, () => "new-id");

/** A page in the shape the list's unit pages have, for a unit we made up. */
const page = (over: { chips?: string; note?: string } = {}) => `<!DOCTYPE html><html><head><title>Test Hornet THR-1</title>
<link rel="canonical" href="https://masterunitlist.battletech.com/units/test-hornet-thr-1"></head><body>
<div class="eyebrow">BattleMech · Standard BattleMech</div><h1 class="ba-title">Test Hornet THR-1</h1>
<span class="ba-crumb"><a href="/">Search</a> / Test Hornet</span>
<div class="u-kv"><span class="k">Type</span><span class="v">BattleMech · Standard BattleMech</span><span class="k">Tonnage</span><span class="v">35 t</span>
<span class="k">Intro Year</span><span class="v">3058 <span>(Clan Invasion)</span></span><span class="k">Tech Base</span><span class="v">Clan</span>
<span class="k">BV</span><span class="v">700</span><span class="k">PV</span><span class="v">28</span><span class="k">Role</span><span class="v">Striker</span></div>
<button data-sheet-uid="9TESTUID99">sheet</button>
<div class="u-statgrid"><div><div class="k">PV</div><div class="v">28</div></div><div><div class="k">Size</div><div class="v">2</div></div>
<div><div class="k">Move</div><div class="v">10"/8"j</div></div><div><div class="k">TMM</div><div class="v">2</div></div>
<div><div class="k">Armor</div><div class="v">4</div></div><div><div class="k">Struct</div><div class="v">3</div></div></div>
<div class="u-abilrow">${over.chips ?? `<span class="aschip">DMG 2/2/1/0</span><span class="aschip">ECM <span class="an">words we do not read</span></span><span class="aschip">IF 1 <span class="an">more words</span></span>`}<span class="aschip">Striker</span></div>
${over.note ?? ""}</body></html>`;

/** The same page as a saved web archive: the page part encoded as asked, a picture part after it. */
function mhtml(html: string, encoding: "quoted-printable" | "base64"): string {
  const body =
    encoding === "base64"
      ? btoa(String.fromCharCode(...bytes(html))).replace(/(.{76})/g, "$1\r\n")
      : [...bytes(html)].map((b) => (b > 126 || b === 61 ? `=${b.toString(16).toUpperCase().padStart(2, "0")}` : String.fromCharCode(b))).join("").replace(/(.{70})/g, "$1=\r\n");
  return [
    "From: <Saved by test>", "MIME-Version: 1.0", 'Content-Type: multipart/related;\r\n\ttype="text/html";\r\n\tboundary="----Part--abc"', "", "------Part--abc",
    'Content-Type: text/html; charset="utf-8"', `Content-Transfer-Encoding: ${encoding}`, "Content-Location: https://example.test/", "", body, "------Part--abc",
    "Content-Type: image/png", "Content-Transfer-Encoding: base64", "", "iVBORw0KGgo=", "------Part--abc--", "",
  ].join("\r\n");
}

describe("a saved Master Unit List page", () => {
  it("reads the card, the names, the details and the id, and records the page as the source", () => {
    const result = run(page());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { unit } = result;
    expect(unit.name).toEqual({ chassis: "Test Hornet", model: "THR-1" });
    expect(unit.card).toMatchObject({ type: "BM", size: 2, tmm: 2, role: "Striker", pv: 28, ov: 0, armor: 4, structure: 3 });
    expect(unit.card.move).toEqual([{ inches: 10, mode: "" }, { inches: 8, mode: "j" }]);
    expect(unit.card.damage).toEqual({ s: { value: 2 }, m: { value: 2 }, l: { value: 1 }, e: { value: 0 } });
    expect(formatSpecials(unit.card.specials)).toBe("ECM, IF1");
    expect([unit.techBase, unit.year, unit.era]).toEqual(["clan", 3058, "clan-invasion"]);
    expect(unit.source).toMatchObject({ kind: "mul-export", credit: MUL_CREDIT, ref: "9TESTUID99", at: NOW });
    expect(JSON.stringify(unit)).not.toContain("words we do not read");
  });

  it("marks a Master Unit List import OFFICIAL", () => {
    const result = run(page());
    if (!result.ok) throw new Error(result.message);
    expect(asOfficialMark(result.unit)).toMatchObject({ official: true, text: "OFFICIAL, Master Unit List" });
  });

  it("makes the unit NOT OFFICIAL once its card is edited", () => {
    const result = run(page());
    if (!result.ok) throw new Error(result.message);
    expect(asOfficialMark({ ...result.unit, card: { ...result.unit.card, pv: 29 } })).toMatchObject({ official: false, changed: true });
  });

  it("shows NOT OFFICIAL, and says why, for a unit from another source, even one claiming the flag", () => {
    const unit = newAsUnit("x");
    const mark = asOfficialMark({ ...unit, source: { kind: "mordel", values: unit.card, official: { book: "Master Unit List" } } });
    expect(mark).toMatchObject({ official: false, text: "NOT OFFICIAL: not from the Master Unit List" });
  });

  it.each(["quoted-printable", "base64"] as const)("unpacks a web archive with the page encoded as %s, accents included", (encoding) => {
    const result = fromMulPage(bytes(mhtml(page({ note: "<p>café</p>" }), encoding)), NOW, () => "new-id");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.unit.name).toEqual({ chassis: "Test Hornet", model: "THR-1" });
  });

  it.each([
    ["a page that is not a unit page", "<html><body><h1>Hello</h1></body></html>", /not a Master Unit List unit page/],
    ["a stat block without its damage", page({ chips: '<span class="aschip">ECM</span>' }), /could not read the damage/],
    ["a web archive holding no page", 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="b"\r\n\r\n--b\r\nContent-Type: image/png\r\n\r\nxx\r\n--b--\r\n', /could not find a web page/],
  ])("answers %s with a plain message and imports nothing", (_what, text, message) => {
    const result = run(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });
});
