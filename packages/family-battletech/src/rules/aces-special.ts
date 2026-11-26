// Special orders and support in play (Aces rulebook pp. 5, 16-17): the sortie's movement and destroy objectives, and units riding in
// transports. Pure functions on the game record; the page calls them. Nothing throws on a record it does not understand.
//
// Readings we chose:
// - A building the sortie names as the destroy objective is a roster unit of type BD. Its Armor stat is the current construction factor
//   (CF) we keep in the unit's Armor, its Structure is the same figure, and its Size is the starting CF (p. 17, "Default stats").
//   Any other unit named as the objective keeps its own card figures.
// - "Always has the highest PV" is a PV no card reaches.
// - A unit under forced withdrawal or fleeing ignores a movement objective (p. 16), so the flag is read only for other units.
import type { StatId } from "./aces-resolve";
import type { AcesGame, ForceName, GameLogLine, GameUnit } from "./aces-game";
import { isEmplacement } from "./aces-game";

export const SPECIAL_CITE = { objectives: "Aces p. 17", transport: "Aces p. 5" } as const;

/** Figures no card reaches, for "always has the highest PV". */
const HIGHEST_PV = 9999;

/** The default stats of a building that is the destroy objective (p. 17); nothing for any other unit. */
export function objectiveStats(u: Pick<GameUnit, "card" | "play" | "flags">): Partial<Record<StatId, number>> | undefined {
  if (!u.flags.destroyObjective || u.card.type !== "BD") return undefined;
  const cf = u.play.armor;
  return {
    tmm: -4,
    mv: 0,
    "damage-s": 0,
    "damage-m": 0,
    "damage-l": 0,
    damage: 0,
    armor: cf,
    structure: cf,
    "armor-lost": u.card.armor - cf,
    "structure-lost": u.card.armor - cf,
    "starting-armor": u.card.armor,
    size: u.card.armor,
    pv: HIGHEST_PV,
  };
}

const allUnits = (game: AcesGame): GameUnit[] => [...game.sides.player.units, ...game.sides.automated.units];
const find = (game: AcesGame, id: string): GameUnit | undefined => allUnits(game).find((u) => u.id === id);
const onTable = (u: GameUnit): boolean => !u.play.destroyed && !u.play.escaped;
const line = (game: AcesGame, text: string, cite: string): GameLogLine => ({ turn: game.turn, text, cite });

const mapUnit = (game: AcesGame, id: string, change: (u: GameUnit) => GameUnit): AcesGame => ({
  ...game,
  sides: {
    player: { ...game.sides.player, units: game.sides.player.units.map((u) => (u.id === id ? change(u) : u)) },
    automated: { ...game.sides.automated, units: game.sides.automated.units.map((u) => (u.id === id ? change(u) : u)) },
  },
});

const withFlag = <K extends "moveObjective" | "destroyObjective">(flags: GameUnit["flags"], key: K, on: boolean): GameUnit["flags"] => {
  const { [key]: _old, ...rest } = flags;
  return on ? { ...rest, [key]: true } : rest;
};

/** Marks (or clears) a unit as pursuing the movement objective, or as the destroy objective. Emplacements move nowhere, so they take no movement objective. */
export function setObjective(game: AcesGame, unitId: string, kind: "moveObjective" | "destroyObjective", on: boolean): AcesGame {
  const u = find(game, unitId);
  if (!u || (kind === "moveObjective" && isEmplacement(u.card))) return game;
  if ((u.flags[kind] === true) === on) return game;
  const next = mapUnit(game, unitId, (x) => ({ ...x, flags: withFlag(x.flags, kind, on) }));
  const text = kind === "moveObjective" ? (on ? `${u.name} pursues the movement objective.` : `${u.name} no longer pursues the movement objective.`) : on ? `${u.name} is the destroy objective.` : `${u.name} is no longer the destroy objective.`;
  return { ...next, log: [...next.log, line(game, text, SPECIAL_CITE.objectives)] };
}

// ---- Transports (p. 5) -----------------------------------------------------------------------------------------------------------

const hasSpecial = (u: GameUnit, code: string): boolean => u.card.specials.some((s) => s.code === code);

/** The units of a force that can carry this one: infantry in an IT transport, or mechanized battle armor on an OMNI unit (p. 5). */
export function transportsFor(game: AcesGame, unit: GameUnit): GameUnit[] {
  const force: ForceName | undefined = game.sides.player.units.some((u) => u.id === unit.id) ? "player" : game.sides.automated.units.some((u) => u.id === unit.id) ? "automated" : undefined;
  if (!force || !onTable(unit)) return [];
  const infantry = unit.card.type === "CI" || unit.card.type === "BA";
  if (!infantry) return [];
  return game.sides[force].units.filter((t) => t.id !== unit.id && onTable(t) && !t.flags.mountedIn && (hasSpecial(t, "IT") || (unit.card.type === "BA" && hasSpecial(unit, "MEC") && hasSpecial(t, "OMNI"))));
}

/** An infantry unit mounts a transport (or, with `null`, dismounts). A mounted unit cannot move, attack or spot, has no part in Initiative, and cannot be attacked (p. 5). */
export function mountUnit(game: AcesGame, unitId: string, transportId: string | null): AcesGame {
  const u = find(game, unitId);
  if (!u || !onTable(u)) return game;
  if (transportId === null) {
    if (!u.flags.mountedIn) return game;
    const { mountedIn: _gone, ...rest } = u.flags;
    const t = find(game, u.flags.mountedIn);
    const next = mapUnit(game, unitId, (x) => ({ ...x, flags: rest }));
    return { ...next, log: [...next.log, line(game, `${u.name} dismounts${t ? ` from ${t.name}` : ""}. It may move up to half its Move this turn, and cannot use Standstill or Sprint to do it.`, SPECIAL_CITE.transport)] };
  }
  const t = transportsFor(game, u).find((x) => x.id === transportId);
  if (!t || u.flags.mountedIn === transportId) return game;
  const next = mapUnit(game, unitId, (x) => ({ ...x, flags: { ...x.flags, mountedIn: transportId } }));
  return { ...next, log: [...next.log, line(game, `${u.name} mounts ${t.name}. It cannot move, attack or spot while mounted, and ${t.name} cannot Sprint this turn.`, SPECIAL_CITE.transport)] };
}

/**
 * Units riding a transport that was destroyed (p. 6): infantry inside an IT transport are destroyed with it; battle armor on an OMNI unit
 * is set down in base contact and stays in play. The log says which.
 */
export function releaseFromDestroyed(game: AcesGame): AcesGame {
  let next = game;
  for (const u of allUnits(game)) {
    const at = u.flags.mountedIn;
    if (!at || !onTable(u)) continue;
    const t = find(game, at);
    if (t && !t.play.destroyed) continue;
    const omni = t !== undefined && hasSpecial(t, "OMNI");
    next = mapUnit(next, u.id, (x) => {
      const { mountedIn: _gone, ...rest } = x.flags;
      return omni || !t ? { ...x, flags: rest } : { ...x, flags: rest, play: { ...x.play, destroyed: true, staged: [] } };
    });
    next = { ...next, log: [...next.log, line(game, omni ? `${t.name} is destroyed. ${u.name} is set down in base contact with it.` : `${t?.name ?? "Its transport"} is destroyed, so ${u.name} is destroyed with it.`, "Aces p. 6")] };
  }
  return next;
}
