// The Edge abilities of the Aces Edge cards: one row each, with its card number, category, the unit types it is limited to, the phases it is
// used in, and its Edge cost as figures. Read from the owner's photos of cards 1 to 11 of 12 and, for card 12, a printed sheet of the set
// (the Aces Edge cards). The cards' own sentences are never kept here: `when` is our own label for the moment it is used, and the
// short `note` is our own wording, shown only behind the same switch as the Alpha Strike special notes (data/as-glosses.ts).
// Delete the notes and nothing else changes.

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
  { id: "assassin", card: 1, name: "Assassin", category: "Attack", phases: ["combat"], when: "Before the roll, target in its rear arc", cost: { edge: 1 }, note: "A rear-arc shot does 1 more damage, on top of what the rear arc already adds." },
  { id: "forward-observer", card: 2, name: "Forward Observer", category: "Indirect Fire", phases: ["combat"], when: "While spotting", cost: { edge: 1 }, note: "The spotter may attack too this Combat Phase, and neither it nor the unit it spots takes the +1 TN." },
  { id: "marksman", card: 3, name: "Marksman", category: "Attack", phases: ["combat"], when: "After the attack roll", cost: { edge: 1 }, note: "One attack roll of 11 that hits also counts as a critical hit." },
  { id: "jumping-jack", card: 4, name: "Jumping Jack", category: "Attack", types: ["BM", "CV"], phases: ["combat"], when: "Short range, after jumping this turn", cost: { edge: 1 }, note: "The TN penalty for having jumped is +1 instead of +2." },
  { id: "patient", card: 5, name: "Patient", category: "Attack", phases: ["combat"], when: "After the attack roll, after standing still", cost: { edge: 1 }, note: "Roll all your dice again and keep the new result." },
  { id: "cautious", card: 6, name: "Cautious", category: "Defense", types: ["BM", "CV"], phases: ["combat"], when: "Start of the Combat Phase", cost: { edge: 1 }, note: "Turn to face any direction before attacks begin." },
  { id: "protector", card: 7, name: "Protector", category: "Defense", phases: ["combat"], when: "A smaller friendly unit within 2 inches takes damage", cost: { edge: 1 }, note: "That unit takes 1 less damage." },
  { id: "coolant-flush", card: 8, name: "Coolant Flush", category: "Heat", types: ["BM"], phases: ["end"], when: "End Phase", cost: { edge: 2, upTo: true }, note: "Each Edge spent takes 1 heat off, up to 2." },
  { id: "bulwark", card: 9, name: "Bulwark", category: "Melee", types: ["BM", "CV"], phases: ["combat"], when: "You take damage from a physical attack, your own DFA or Charge included", cost: { edge: 1 }, note: "You take 1 less damage from it." },
  { id: "melee-specialist", card: 10, name: "Melee Specialist", category: "Melee", phases: ["combat"], when: "After rolling a physical or MEL attack", cost: { edge: 1 }, note: "Roll that attack again and keep the new result." },
  { id: "nimble", card: 11, name: "Nimble", category: "Movement", phases: ["movement"], when: "Ground or sprint movement", cost: { edge: 1, highTmm: { tmm: 3, edge: 2 } }, note: "+1 TMM, and it may pass through enemy units this Movement Phase." },
  { id: "speed-demon", card: 12, name: "Speed Demon", category: "Movement", phases: ["movement"], when: "Ground or sprint movement", cost: { edge: 1 }, note: "+2 inches of movement this turn, or +4 inches when sprinting." },
];
