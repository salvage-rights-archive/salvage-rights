// The Edge abilities of the Aces Edge cards: one row each, with its card number, category, the unit types it is limited to, the phases it is
// used in, and its Edge cost as figures. Read from the owner photos of cards 1 to 11 of 12 and, for card 12, a printed sheet of the set.
// No card wording is kept: `when` is a terse label of our own for the moment it is used, and the short `note` gives the effect as figures in
// our own phrasing, shown only behind the same switch as the Alpha Strike special notes (data/as-glosses.ts). Delete the notes and nothing
// else changes.

export type EdgePhase = "movement" | "combat" | "end";
export type EdgeCategory = "Attack" | "Defense" | "Movement" | "Indirect Fire" | "Heat" | "Melee";

/** What an ability costs in Edge: `edge` tokens, or up to that many when `upTo`; `highTmm` is the dearer price when the card's printed TMM is that high. */
export interface EdgeCost {
  edge: number;
  upTo?: true;
  highTmm?: { tmm: number; edge: number };
}

export interface EdgeAbility {
  id: string;
  /** The number on the card, out of 12. */
  card: number;
  name: string;
  category: EdgeCategory;
  /** Alpha Strike unit types the card limits it to (BM, CV); absent when the card prints no limit. */
  types?: string[];
  phases: EdgePhase[];
  /** Our label for when it is used. */
  when: string;
  cost: EdgeCost;
  /** Our own short note, behind the switch. */
  note: string;
}

export const ACES_EDGE_CARD_SET = 12;
export const ACES_EDGE_CITE = "Aces Edge card";
export const edgeCite = (a: Pick<EdgeAbility, "card">): string => `${ACES_EDGE_CITE} ${String(a.card)}/${String(ACES_EDGE_CARD_SET)}`;

export const ACES_EDGE: EdgeAbility[] = [
  { id: "assassin", card: 1, name: "Assassin", category: "Attack", phases: ["combat"], when: "Rear shot, before rolling", cost: { edge: 1 }, note: "Damage +1, as well as the rear bonus." },
  { id: "forward-observer", card: 2, name: "Forward Observer", category: "Indirect Fire", phases: ["combat"], when: "Spotting", cost: { edge: 1 }, note: "Spotter may also attack; the +1 TN is dropped for it and its ally." },
  { id: "marksman", card: 3, name: "Marksman", category: "Attack", phases: ["combat"], when: "After rolling", cost: { edge: 1 }, note: "One roll of 11 that hits adds a critical check." },
  { id: "jumping-jack", card: 4, name: "Jumping Jack", category: "Attack", types: ["BM", "CV"], phases: ["combat"], when: "Short range, after a jump", cost: { edge: 1 }, note: "Jump TN +1, not +2." },
  { id: "patient", card: 5, name: "Patient", category: "Attack", phases: ["combat"], when: "After rolling, stood still", cost: { edge: 1 }, note: "All dice rerolled." },
  { id: "cautious", card: 6, name: "Cautious", category: "Defense", types: ["BM", "CV"], phases: ["combat"], when: "Combat Phase start", cost: { edge: 1 }, note: "Facing set freely." },
  { id: "protector", card: 7, name: "Protector", category: "Defense", phases: ["combat"], when: "Smaller ally hit nearby", cost: { edge: 1 }, note: "Ally within 2 inches and a smaller size takes 1 less." },
  { id: "coolant-flush", card: 8, name: "Coolant Flush", category: "Heat", types: ["BM"], phases: ["end"], when: "End Phase", cost: { edge: 2, upTo: true }, note: "Heat -1 per Edge, 2 at most." },
  { id: "bulwark", card: 9, name: "Bulwark", category: "Melee", types: ["BM", "CV"], phases: ["combat"], when: "Hit in melee", cost: { edge: 1 }, note: "That damage -1." },
  { id: "melee-specialist", card: 10, name: "Melee Specialist", category: "Melee", phases: ["combat"], when: "Melee roll made", cost: { edge: 1 }, note: "One reroll." },
  { id: "nimble", card: 11, name: "Nimble", category: "Movement", phases: ["movement"], when: "While moving", cost: { edge: 1, highTmm: { tmm: 3, edge: 2 } }, note: "TMM +1; may cross enemy units." },
  { id: "speed-demon", card: 12, name: "Speed Demon", category: "Movement", phases: ["movement"], when: "While moving", cost: { edge: 1 }, note: "Move +2 inches, +4 sprinting." },
];
