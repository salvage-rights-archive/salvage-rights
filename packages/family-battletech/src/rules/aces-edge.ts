// The Edge abilities in play: which ones a unit's pilot can be offered in the phase at hand, what each costs, what the tracker can say
// about it beside the spend, and the spend itself with the effect applied where the tracker holds the numbers. The table is
// data/aces-edge.ts. Where the tracker cannot know the condition (a rear-arc target, a roll of 11) the player confirms: nothing here
// refuses on a condition it cannot see. Pure; nothing throws on a record it does not understand.
import { AS_ATTACKER_MOVE } from "../data/alpha-strike";
import { ACES_EDGE, edgeCite } from "../data/aces-edge";
import type { EdgeAbility, EdgePhase } from "../data/aces-edge";
import type { AcesGame, GameUnit } from "./aces-game";
import { combatOf, mapUnit, spendEdge } from "./aces-combat";
import { addLog, allUnits, forceOf, logLine } from "./aces-turn";
import { tracksHeat } from "./as-play";
import type { AsCard } from "./as-unit";

/** An ability by its name, ignoring case and spaces at the ends: names the player typed before still find their row. */
export const findEdgeAbility = (name: string): EdgeAbility | undefined => {
  const key = name.trim().toLowerCase();
  return key === "" ? undefined : ACES_EDGE.find((a) => a.name.toLowerCase() === key);
};

const PHASES: readonly string[] = ["movement", "combat", "end"];

/** The abilities offered for a unit type in a phase; `everyPhase` lifts the phase cut. A card with no unit-type limit is open to all. */
export function edgeAbilitiesFor(unitType: string, phase: AcesGame["phase"], everyPhase = false): EdgeAbility[] {
  return ACES_EDGE.filter((a) => (a.types === undefined || a.types.includes(unitType.toUpperCase())) && (everyPhase || !PHASES.includes(phase) || a.phases.includes(phase as EdgePhase)));
}

/** The Edge an ability costs this unit: the dearer price when the printed TMM reaches the card's figure; `amount` is the choice of an "up to" cost. */
export function edgeCostOf(a: EdgeAbility, card: Pick<AsCard, "tmm">, amount = 1): number {
  if (a.cost.upTo) return Math.min(Math.max(1, Math.floor(amount)), a.cost.edge);
  const high = a.cost.highTmm;
  return high && (card.tmm ?? 0) >= high.tmm ? high.edge : a.cost.edge;
}

/** Staged hits that have damage left to take off, newest first. */
const lastDamaged = (u: GameUnit): number => {
  for (let i = u.play.staged.length - 1; i >= 0; i--) if ((u.play.staged[i]?.damage ?? 0) >= 1) return i;
  return -1;
};

const unitById = (game: AcesGame, id: string | undefined): GameUnit | undefined => allUnits(game).find((u) => u.id === id);

/** Friendly units of a smaller size than the pilot's, in play: whom Protector may shield (the 2 inches is the player's to confirm). */
export const protectable = (game: AcesGame, unit: GameUnit): GameUnit[] =>
  allUnits(game).filter((u) => u.id !== unit.id && forceOf(game, u.id) === forceOf(game, unit.id) && !u.play.destroyed && !u.play.escaped && u.card.size < unit.card.size);

export interface EdgeChoice {
  /** Edge spent, for an "up to" cost. */
  amount?: number;
  /** Protector: the friendly unit shielded. */
  targetId?: string;
}

/** Why this ability cannot be spent now, or undefined. Only what the tracker can see counts; anything else is the player's call. */
export function edgeBlocked(game: AcesGame, unit: GameUnit, a: EdgeAbility, choice: EdgeChoice = {}): string | undefined {
  const cost = edgeCostOf(a, unit.card, choice.amount);
  if ((unit.edge ?? 0) < cost) return `Needs ${String(cost)} Edge and the pilot has ${String(unit.edge ?? 0)}.`;
  if (a.id === "coolant-flush") {
    if (!tracksHeat(unit.card)) return "This unit does not track heat.";
    if (unit.play.heat < cost) return unit.play.heat === 0 ? "No heat to take off." : `Only ${String(unit.play.heat)} heat to take off.`;
  }
  if (a.id === "bulwark" && lastDamaged(unit) < 0) return "No damage is waiting on this unit.";
  if (a.id === "protector") {
    const t = unitById(game, choice.targetId);
    if (!t || !protectable(game, unit).some((u) => u.id === t.id)) return "Pick a smaller friendly unit.";
    if (lastDamaged(t) < 0) return `No damage is waiting on ${t.name}.`;
  }
  if (a.id === "marksman") {
    const target = unitById(game, combatOf(game).done[unit.id]?.target);
    if (target && target.play.staged.length === 0) return `No hit is waiting on ${target.name}.`;
  }
  return undefined;
}

/** What the tracker can say beside the spend: the effect in figures, and whether the unit's recorded move fits the card. */
export function edgeNotes(game: AcesGame, unit: GameUnit, a: EdgeAbility, choice: EdgeChoice = {}): string[] {
  const moved = unit.play.moved;
  const lines: string[] = [];
  switch (a.id) {
    case "assassin": {
      const d = unit.card.damage;
      const word = (v: typeof d.s): string => (v === null ? "-" : v.minimal ? "0*+1" : String(v.value + 1));
      lines.push(`Damage rating with the Edge: ${word(d.s)} / ${word(d.m)} / ${word(d.l)} (Short / Medium / Long), before the rear-arc bonus.`);
      break;
    }
    case "jumping-jack":
      lines.push(`The jumping modifier is +${String(AS_ATTACKER_MOVE.jump.value - 1)} instead of +${String(AS_ATTACKER_MOVE.jump.value)}.`);
      lines.push(moved?.mode === "jump" ? "The tracker has this unit jumping this turn." : `The tracker has this unit as ${moved ? moved.mode : "not moved"}: confirm it jumped.`);
      break;
    case "patient":
      lines.push(moved?.mode === "standstill" ? "The tracker has this unit standing still." : `The tracker has this unit as ${moved ? moved.mode : "not moved"}: confirm it stood still.`);
      lines.push("Reroll all your dice by hand and enter the new result.");
      break;
    case "melee-specialist":
      lines.push("Reroll the attack by hand and enter the new result.");
      break;
    case "nimble":
      if (moved) lines.push(moved.mode === "ground" || moved.mode === "sprint" ? `TMM ${String(moved.tmm)} becomes ${String(moved.tmm + 1)} this phase.` : `The tracker has this unit as ${moved.mode}: the card is for ground or sprint movement.`);
      else lines.push("Record the move first and the TMM goes up by 1.");
      break;
    case "speed-demon":
      lines.push(moved?.mode === "sprint" ? "Sprinting: +4 inches of movement this turn." : moved?.mode === "ground" ? "Ground movement: +2 inches this turn." : "+2 inches on ground movement, +4 inches when sprinting.");
      break;
    case "coolant-flush":
      lines.push(`Heat ${String(unit.play.heat)} becomes ${String(Math.max(0, unit.play.heat - edgeCostOf(a, unit.card, choice.amount)))}.`);
      break;
    case "bulwark":
      if (lastDamaged(unit) >= 0) lines.push(`The newest damage waiting on this unit, ${String(unit.play.staged[lastDamaged(unit)]?.damage ?? 0)}, goes down by 1.`);
      break;
    case "protector": {
      const t = unitById(game, choice.targetId);
      if (t && lastDamaged(t) >= 0) lines.push(`The newest damage waiting on ${t.name}, ${String(t.play.staged[lastDamaged(t)]?.damage ?? 0)}, goes down by 1.`);
      break;
    }
    case "marksman": {
      const target = unitById(game, combatOf(game).done[unit.id]?.target);
      lines.push(target ? `A critical check is added to the hit waiting on ${target.name}.` : "Mark the critical check by hand: the tracker does not know the target.");
      break;
    }
    case "cautious":
      lines.push("Change this unit's facing before anyone attacks.");
      break;
    case "forward-observer":
      lines.push("Leave out the +1 TN for this spotter's own attack and for the unit it spots.");
      break;
  }
  return lines;
}

const withStaged = (u: GameUnit, change: (staged: GameUnit["play"]["staged"], i: number) => GameUnit["play"]["staged"]): GameUnit => {
  const i = lastDamaged(u) >= 0 ? lastDamaged(u) : u.play.staged.length - 1;
  return i < 0 ? u : { ...u, play: { ...u.play, staged: change(u.play.staged, i) } };
};

/** Spends the Edge for an ability and applies its effect where the tracker holds the numbers; unchanged when it is blocked. */
export function spendEdgeAbility(game: AcesGame, unitId: string, abilityId: string, choice: EdgeChoice = {}): AcesGame {
  const unit = unitById(game, unitId);
  const a = ACES_EDGE.find((x) => x.id === abilityId);
  if (!unit || !a || edgeBlocked(game, unit, a, choice)) return game;
  const cost = edgeCostOf(a, unit.card, choice.amount);
  let next = spendEdge(game, unitId, cost, `use ${a.name} (${edgeCite(a)})`);
  const effect = (change: (u: GameUnit) => GameUnit, id: string, text: string): void => {
    next = addLog(mapUnit(next, id, change), logLine(game, text, edgeCite(a)));
  };
  switch (a.id) {
    case "coolant-flush":
      effect((u) => ({ ...u, play: { ...u.play, heat: Math.max(0, u.play.heat - cost) } }), unitId, `${unit.name} takes ${String(cost)} heat off.`);
      break;
    case "nimble":
      if (unit.play.moved && (unit.play.moved.mode === "ground" || unit.play.moved.mode === "sprint")) {
        effect((u) => (u.play.moved ? { ...u, play: { ...u.play, moved: { ...u.play.moved, tmm: u.play.moved.tmm + 1 } } } : u), unitId, `${unit.name} gains +1 TMM this phase.`);
      }
      break;
    case "bulwark":
    case "protector": {
      const id = a.id === "bulwark" ? unitId : (choice.targetId ?? unitId);
      effect((u) => withStaged(u, (s, i) => s.map((h, j) => (j === i ? { ...h, damage: h.damage - 1 } : h))), id, `${unitById(game, id)?.name ?? "The unit"} takes 1 less damage.`);
      break;
    }
    case "marksman": {
      const id = combatOf(game).done[unitId]?.target;
      if (id) effect((u) => withStaged(u, (s, i) => s.map((h, j) => (j === i ? { ...h, critCheck: true } : h))), id, `A critical check is added to the hit on ${unitById(game, id)?.name ?? "the target"}.`);
      break;
    }
  }
  return next;
}

/** Old free-typed ability names tidied to the table's spelling where one matches; any other name is kept as typed. */
export const canonicalEdgeName = (name: string): string => findEdgeAbility(name)?.name ?? name;

/** A pilot's ability names split into the table's rows (by name, any case) and the names typed that match none. */
export function splitPilotAbilities(names: string[]): { ids: string[]; others: string[] } {
  const ids: string[] = [];
  const others: string[] = [];
  for (const n of names) {
    const row = findEdgeAbility(n);
    if (!row) others.push(n);
    else if (!ids.includes(row.id)) ids.push(row.id);
  }
  return { ids, others };
}

/** The names to keep on a pilot: the picked rows in table order, then the typed names. */
export const joinPilotAbilities = (ids: string[], others: string[]): string[] => [...ACES_EDGE.filter((a) => ids.includes(a.id)).map((a) => a.name), ...others];
