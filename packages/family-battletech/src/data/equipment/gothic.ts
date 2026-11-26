// What BattleTech: Gothic adds to the one equipment catalog for its 'Mechs (gothic-design s.2.1, owner ruling 2026-11-25): the Light
// Blazer, which no other book prints, and the sparse overlay of the Gothic values that differ from a catalog row. The weapons only
// Abominations carry are rows at the end of weapons.ts. There is no Gothic copy of any catalog row:
// which Classic rows Gothic offers is the `games` field on those rows, and every shared figure is read from the row itself.
// Plain data in groups, as in weapons.ts; loaded into the catalog by `loadCatalog` (rules/catalog.ts).
//
// Sources, read against the page images: the Gothic rulebook (index = printed page), its Weapons and Equipment Table on p. 93 and
// Abomination-Mounted Weapons Table on p. 92; the Deluxe Record Sheets, which print no page numbers, cited by PDF page index.
// The book prints no equipment dates: each new row takes 3015, the setting's present (Primer p. 2), marked `yearsInferred`; Gothic
// reads no dates (data/rulesets.ts `dated: false`) and no other game offers these rows.
import type { EquipmentGroup, GameOverlay } from "../../rules/catalog";

const RULEBOOK = "BattleTech: Gothic";
const SHEETS = "BattleTech: Gothic Deluxe Record Sheets";

export const GOTHIC_EQUIPMENT: EquipmentGroup[] = [
  {
    // Heat, damage and ranges: rulebook p. 93. Type: the sheets' "[DE]" (PDF indices 4, 12, 16). Slots: 2, the two-line bracket in the
    // critical table of the FS9-HB and KGC-0KP (indices 4, 16). Tons: printed nowhere; 1.5 is what the weight budgets of the FS9-HB
    // against the FS9-H and the KGC-0KP against the KGC-0000 leave per weapon, and the MAD-3H against the MAD-3R agrees (conflict 37,
    // owner answer 5). No cost (Gothic has no C-bill prices) and no Battle Value printed. The sheets put it in arms and side torsos;
    // nothing limits where. The Stone Giant's sheet (index 34) calls it "Light Binary Laser". Its level is the sheets' "Unofficial".
    defaults: { kind: "weapon", techBase: "inner-sphere", games: ["gothic"], availability: [{ from: 3015 }], yearsInferred: true, cite: { book: RULEBOOK, page: 93 }, checked: "page" },
    items: [
      { id: "light-blazer-gothic", name: "Light Blazer", aliases: ["Light Binary Laser"], tons: 1.5, tonsInferred: true, slots: 2, type: "DE", heat: 6, damage: "7", range: [0, 3, 6, 9], rulesLevel: "licensed-noncanon", levelCite: { book: SHEETS, page: 4 }, units: ["mech", "abomination"], directFire: true },
    ],
  },
];

/**
 * The Gothic values that differ from a catalog row as Classic reads it, keyed by catalog id; `catalog.rowFor(id, "gothic")` applies
 * them. Only fields that differ: a test fails on a field that repeats the row (rules/rulesets.test.ts). Every other Gothic level equals
 * what `equipmentLevel` already gives the row (the 3025 weapons and the Hatchet Introductory; the Heavy and Light Machine Gun and the
 * Sword Standard), so it is not repeated here. Every figure on p. 93 equals its catalog row.
 */
export const GOTHIC_OVERLAY: GameOverlay = {
  // Standard on the UM-R60B, SCP-1B and RFL-3B sheets (indices 2, 6, 10); Experimental in Classic.
  "binary-laser-is": { rulesLevel: "standard", levelCite: { book: SHEETS, page: 2 } },
  // On p. 93's list; its only sheet, the MAD-3H (index 12), is Unofficial for its Light Blazers. Standard is our inference, as for the
  // other physical weapons p. 93 lists; Advanced in Classic.
  "mace-is": { rulesLevel: "standard", levelCite: { book: RULEBOOK, page: 93 }, levelInferred: true },
};
