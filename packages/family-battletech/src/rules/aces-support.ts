// The support step of the Combat Phase (Aces pp. 20-21): after every unit has attacked, the automated force's emplacements attack,
// its artillery picks a target, and its Battlefield Support cards are played one at a time. The resolver decides (decideSupport and
// the emplacement branch of the attack); these functions build what it reads and record what the players roll. Pure.
//
// Readings we chose:
// - An emplacement attacks as a card-less automated unit, through the same attack screen as any automated unit.
// - Artillery is any automated unit with an ART special; the resolver names its target and the players resolve the shot with the
//   card's own rules, entering the damage by hand.
// - A Battlefield Support card is spent when it is played, hit or miss; a card the command card keeps stays unspent (p. 21).
// - A card hits on its Target Number or more on 2D6. Its damage is staged like any hit; the players say when it is an area attack.
import type { SupportCard } from "./aces-card";
import { combatOf, dice2d6, withCombat } from "./aces-combat";
import { isEmplacement } from "./aces-game";
import type { AcesGame, GameUnit } from "./aces-game";
import { emptySheet, step } from "./aces-resolve";
import type { SupportContext, SupportDecision } from "./aces-resolve";
import { addLog, currentCommand, isAlly, logLine, toTable } from "./aces-turn";
import type { TurnRecords } from "./aces-turn";
import { stage } from "./as-play";

export const SUPPORT_CITE = { cite: "Aces pp. 20-21", checked: "page" } as const;

const inPlay = (u: GameUnit): boolean => !u.play.destroyed && !u.play.escaped && !u.flags.mountedIn;
const isArtillery = (u: GameUnit): boolean => u.card.specials.some((s) => /^ART[A-Z0-9]*$/.test(s.code));

/** Automated emplacements that have not attacked yet; they go after the units (p. 20). */
export const emplacementAttackers = (game: AcesGame): GameUnit[] => game.sides.automated.units.filter((u) => inPlay(u) && isEmplacement(u.card) && combatOf(game).done[u.id] === undefined && !u.play.shutdown);

export const artilleryUnits = (game: AcesGame): GameUnit[] => game.sides.automated.units.filter((u) => inPlay(u) && !isEmplacement(u.card) && isArtillery(u));

/** The support cards the game was set up with that are not spent yet and are in the player's library. */
export function unspentSupports(game: AcesGame, records: TurnRecords): SupportCard[] {
  const open = new Set(game.supports.filter((s) => !s.used).map((s) => s.cardId));
  return (records.supports ?? []).filter((c) => open.has(c.id));
}

/** Is there anything left for the support step: an emplacement to attack, or cards and artillery the players have not closed? */
export const supportPending = (game: AcesGame): boolean =>
  emplacementAttackers(game).length > 0 || (combatOf(game).support?.closed !== true && (game.supports.some((s) => !s.used) || artilleryUnits(game).length > 0));

export function supportContext(game: AcesGame, records: TurnRecords): SupportContext {
  const command = currentCommand(game, records);
  const resolved = combatOf(game).support?.resolved ?? [];
  const artillery = artilleryUnits(game);
  return {
    phase: "support",
    ...(command ? { command } : {}),
    supports: unspentSupports(game, records),
    ...(resolved.length ? { resolved } : {}),
    ...(artillery.length ? { artillery: artillery.map(toTable) } : {}),
    allies: game.sides.automated.units.map(toTable),
    // The players' own side, without the automated allies that fight for it (those are not the automated force's enemies).
    enemies: game.sides.player.units.filter((u) => !isAlly(u)).map(toTable),
    ...(game.rules.bigTable48 ? { bigTable48: true } : {}),
  };
}

export const supportStep = (game: AcesGame, records: TurnRecords) => step(supportContext(game, records), game.sight);
export type SupportStep = ReturnType<typeof supportStep>;
export type { SupportDecision };

/** The 2D6 for a support card, from the game's seed, so a reload does not roll again. */
export const supportRoll = (game: AcesGame, cardId: string): number => dice2d6(game, (combatOf(game).support?.resolved.length ?? 0) + 40, [...cardId].reduce((n, ch) => n + ch.charCodeAt(0), 0));

/** Plays one card at one target with a typed or drawn roll: it hits on its Target Number or more, stages its damage, and is spent either way. */
export function playSupport(game: AcesGame, records: TurnRecords, cardId: string, targetId: string, roll: number): AcesGame {
  const card = unspentSupports(game, records).find((c) => c.id === cardId);
  const target = [...game.sides.player.units, ...game.sides.automated.units].find((u) => u.id === targetId);
  if (!card || !target || !inPlay(target) || !Number.isInteger(roll) || roll < 2 || roll > 12) return game;
  const hit = roll >= card.tn;
  const damage = Math.max(0, Math.floor(card.damage));
  const staged = (u: GameUnit): GameUnit => (u.id === target.id && hit && damage > 0 ? { ...u, play: stage(u.play, { damage }) } : u);
  const sides = { player: { ...game.sides.player, units: game.sides.player.units.map(staged) }, automated: { ...game.sides.automated, units: game.sides.automated.units.map(staged) } };
  const supports = game.supports.map((s) => (s.cardId === cardId ? { ...s, used: true } : s));
  const text = `${card.name} on ${target.name}: ${String(roll)} against Target Number ${String(card.tn)}, ${hit ? `a hit for ${String(damage)}${card.area ? " (an area attack: enter the damage to the other units under it by hand)" : ""}` : "a miss"}.`;
  const next = withCombat({ ...game, sides, supports, sight: emptySheet() }, (c) => ({ ...c, support: { ...(c.support ?? { resolved: [] }), resolved: [...(c.support?.resolved ?? []), { card: cardId, target: targetId, hit }] } }));
  return addLog(next, logLine(game, text, SUPPORT_CITE.cite));
}

/** The players close the support step: nothing more is played this turn. */
export const closeSupport = (game: AcesGame): AcesGame =>
  addLog(withCombat(game, (c) => ({ ...c, support: { ...(c.support ?? { resolved: [] }), closed: true } })), logLine(game, "The support step is done.", SUPPORT_CITE.cite));
