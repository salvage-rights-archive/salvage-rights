import { describe, expect, it } from "vitest";
import { cardLevel, commandCompleteness, completeness, deckKey, findings, isAcesCard, isAcesRecord, newAcesCard, pairSides, render, renderOv, toDeckCard } from "./aces-card";
import type { AcesCard, Column, CommandCard } from "./aces-card";

// Every card here is invented for the tests: our own numbers and choices, no printed card.

const AT = "2026-01-01T00:00:00Z";

const column = (extra: Partial<Column> = {}): Column => ({
  target: { zone: { keyword: "nearest" }, flags: [] },
  move: { mode: "ground" },
  filters: [{ token: "stand-in", params: { terrain: "woods" } }],
  ...extra,
});

function fullCard(id: string, position: number, role = "Brawler", subtype?: string): AcesCard {
  return {
    ...newAcesCard(id, AT),
    deck: { role, ...(subtype ? { subtype } : {}) },
    position,
    movement: { priority: 100 + position, columns: { aggressive: column({ when: { join: "all", clauses: [{ token: "self-has-armor" }] } }), balanced: column({ when: { join: "all", clauses: [{ token: "always" }] } }), cautious: column() } },
    combat: { priority: 900 + position, target: { zone: { rings: [7, 21] }, flags: [], keys: [{ token: "stat", params: { amount: "fewest", stat: "tmm" } }] } },
  };
}

describe("Aces card records", () => {
  it("keeps a card with a token we do not know, names it in the findings, and refuses only a broken shape", () => {
    const card = fullCard("c1", 1);
    card.movement.columns!.cautious.filters.push({ token: "hover-over-lava", params: { inches: 3 } }, { token: "keep-distance", params: { inches: 9 } });
    expect(isAcesCard(card)).toBe(true);
    expect(isAcesRecord(JSON.parse(JSON.stringify(card)))).toBe(true);
    expect(findings(card)).toEqual([
      { at: "movement.cautious.filters.1", problem: 'unknown token "hover-over-lava"' },
      { at: "movement.cautious.filters.2", problem: '"keep-distance" needs ref' },
    ]);
    expect(findings(fullCard("c2", 2))).toEqual([]);
    const broken: [string, (c: Record<string, unknown>) => void][] = [
      ["another kind", (c) => void (c.kind = "aces-deck")],
      ["a later schema", (c) => void (c.schema = 2)],
      ["a priority in words", (c) => void ((c.movement as Record<string, unknown>).priority = "one hundred")],
      ["a filter without a token", (c) => void ((c.movement as { columns: { balanced: { filters: unknown[] } } }).columns.balanced.filters = [{ params: {} }])],
    ];
    for (const [name, change] of broken) {
      const copy = structuredClone(card) as unknown as Record<string, unknown>;
      change(copy);
      expect(isAcesCard(copy), name).toBe(false);
    }
  });

  it("pairs the two sides of each card by deck and position even when their priorities differ, copy by copy", () => {
    const pairs = pairSides([
      { deck: "Ambusher (Infantry)", position: 2, side: "movement", priority: 111, ref: "m1" },
      { deck: "Scout", position: 4, side: "combat", priority: 444, ref: "s1" },
      { deck: "ambusher  (infantry)", position: 2, side: "combat", priority: 888, ref: "c1" },
      { deck: "Ambusher (Infantry)", position: 2, side: "movement", priority: 111, ref: "m2" },
      { deck: "Ambusher (Infantry)", position: 3, side: "combat", priority: 111, ref: "c3" },
    ]);
    expect(pairs.map((p) => [p.deck, p.position, p.movement?.ref, p.combat?.ref])).toEqual([
      ["Ambusher (Infantry)", 2, "m1", "c1"],
      ["Ambusher (Infantry)", 2, "m2", undefined],
      ["Ambusher (Infantry)", 3, undefined, "c3"],
      ["Scout", 4, undefined, "s1"],
    ]);
    expect(toDeckCard(fullCard("h", 5, "Striker", "Hover"))).toEqual({ id: "h", deckKey: "Striker (Hover)", position: 5, movePriority: 105, combatPriority: 905 });
  });

  it("renders an invented column and overheat row in our words, naming a token it does not know", () => {
    const invented: Column = {
      when: {
        join: "all",
        clauses: [
          { token: "enemies-within", params: { quals: ["moved", "in-sight"], inches: 20, atLeast: 2 } },
          { token: "no-enemies-within", params: { quals: ["unmoved"], inches: 5 } },
        ],
      },
      target: { zone: { rings: [9, 17, 25] }, flags: ["moved", "attackable"], pick: "yellow" },
      move: { mode: "jump", alt: { mode: "sprint", when: { join: "all", clauses: [{ token: "no-enemies-within", params: { inches: 40 } }] } } },
      filters: [
        { token: "keep-distance", params: { inches: 11, ref: "target" } },
        { token: "closer", params: { ref: "target", behind: true } },
        { token: "no-sight", params: { ref: "enemies" }, when: { join: "all", clauses: [{ token: "self-sprinting" }] } },
        { token: "cover", params: { amount: "most", ref: "enemies" } },
        { token: "other", note: "toward the ridge" },
        { token: "not-a-token" },
      ],
    };
    expect(render(invented)).toEqual({
      when: '2 or more moved visible enemies within 20" and no unmoved enemies within 5"',
      target: 'zones 9" / 17" / 25"; moved only; attackable after moving; the YELLOW list',
      move: 'Jump (Sprint if no enemies within 40")',
      filters: [
        'keep 11" from the target',
        "close on the target (from behind if it can)",
        "if it is sprinting: out of sight of enemies",
        "cover from most enemies",
        "toward the ridge",
        "a step we do not know (not-a-token)",
      ],
    });
    expect(renderOv({ tn: { test: "at-most", value: 5 }, join: "and", also: { token: "could-reach-structure" }, action: { token: "ov-up-to", params: { ov: 2 } } })).toBe(
      "if TN 5 or less and OV could take the target into Structure: OV up to 2",
    );
  });

  it("reports each deck's positions, missing cards, whole copies and how fully each card is recorded", () => {
    const identity = { ...newAcesCard("i", AT), deck: { role: "Scout", subtype: "Hover" }, position: 3 };
    const movementOnly: AcesCard = { ...fullCard("mo", 4, "Scout", "Hover"), combat: { priority: 904 } };
    const brawlers = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6].map((n, i) => fullCard(`b${String(i)}`, n));
    expect(cardLevel(movementOnly)).toBe("movement");
    expect(deckKey(identity)).toBe("Scout (Hover)");
    expect(completeness([identity, ...brawlers, movementOnly])).toEqual([
      { key: "Brawler", of: 6, have: [1, 2, 3, 4, 5, 6], missing: [], copies: 2, levels: { full: 12, movement: 0, combat: 0, identity: 0 } },
      { key: "Scout (Hover)", of: 6, have: [3, 4], missing: [1, 2, 5, 6], copies: 0, levels: { full: 0, movement: 1, combat: 0, identity: 1 } },
    ]);
    const command = (letter: CommandCard["letter"]) => ({ commander: "Test Major", faction: "Our Militia", letter }) as CommandCard;
    expect(commandCompleteness([command("A"), command("C"), command("A")])).toEqual([{ key: "Test Major (Our Militia)", have: ["A", "C"], missing: ["B", "D", "E"] }]);
  });
});
