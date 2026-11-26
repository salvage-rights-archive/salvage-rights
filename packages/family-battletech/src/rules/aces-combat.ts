// The Combat and End Phases of an Aces game, as plain functions on the game record: who attacks next, an attack worked out for a
// unit the players run, an attack recorded (damage staged, nothing on the card changes until the End Phase), the Edge tokens,
// the six End Phase steps (damage and critical hits, heat, objectives and the end of the game, the commander's strategy decision,
// the next turn with its waypoints) and the summary of a finished game. The page calls these; nothing here draws or touches
// storage, and nothing throws on a record it does not understand.
//
// Book: Aces rulebook pp. 18-21 (Combat Phase, the five steps, target exceptions, physical attacks, strategy decisions), p. 24
// (Edge), p. 32 (the six End Phase steps) and the Alpha Strike Quick-Start Rules, box set third printing, p. 13 (the side that lost
// Initiative resolves all its attacks first), all read against the page images (checked: "page").
//
// Readings we chose:
// - The six steps of p. 32 are for campaign sorties; p. 21 sends a single game to the same End Phase, so every game follows them.
// - A unit that cannot attack (shut down, a stunned crew, sprinted) is not offered to the players; one under the automated force
//   is still settled by its card, which says why it does not fire, and its card is cycled (p. 19).
// - Emplacements, artillery and Battlefield Support cards attack after the units (pp. 20-21); they are not run here.
// - Heat is worked out with the damage: crippled never depends on heat, so the order of steps 2 and 3 changes nothing.
import { AS_PHYSICAL_TYPES, AS_HIT_LIMITS, AS_HEAT } from "../data/alpha-strike";
import type { AsAttackFlag, AsPhysicalType } from "../data/alpha-strike";
import { cycle, mulberry32, nextCombat, reveal } from "./aces-deck";
import type { Activatable, Pick as NextUnit } from "./aces-deck";
import type { AcesGame, CombatState, EndState, ForceName, GameLogLine, GameUnit } from "./aces-game";
import { isEmplacement } from "./aces-game";
import { attackerMoveOf, damageAt, emptySheet, specialValue, targetMoveOf } from "./aces-resolve";
import type { CombatContext, StrategyContext, StrategyDecision, TableUnit } from "./aces-resolve";
import { addLog, deckCards, forceOf, isAlly, logLine, otherForce, toTable, topCard, turnStateOf, withTurnState, currentCommand } from "./aces-turn";
import type { TurnRecords } from "./aces-turn";
import { applyEndPhase, crippled, currentIf, escape, stage, tracksHeat, withdraws } from "./as-play";
import type { PlayEvent, RollKind } from "./as-play";
import { physicalDamage, rangeBracket, targetNumber } from "./as-attack";
import type { AttackResult, RangeId } from "./as-attack";

export const COMBAT_CITE = {
  order: { cite: "Aces p. 18; Alpha Strike Quick-Start Rules, p. 13", checked: "page" },
  steps: { cite: "Aces pp. 18-19", checked: "page" },
  cycle: { cite: "Aces p. 19", checked: "page" },
  physical: { cite: "Aces p. 20", checked: "page" },
  allies: { cite: "Aces p. 38", checked: "page" },
  edge: { cite: "Aces p. 24", checked: "page" },
  support: { cite: "Aces pp. 20-21", checked: "page" },
  end: { cite: "Aces p. 32", checked: "page" },
  strategy: { cite: "Aces p. 21", checked: "page" },
  staged: { cite: "Aces p. 21; Alpha Strike Quick-Start Rules, p. 13", checked: "page" },
} as const;

const inPlay = (u: GameUnit): boolean => !u.play.destroyed && !u.play.escaped;
const freshCombat = (): CombatState => ({ done: {}, pips: [] });
const freshEnd = (): EndState => ({ step: 1, rolls: {}, rerolled: {}, drawn: 0 });

export const combatOf = (game: AcesGame): CombatState => turnStateOf(game).combat ?? freshCombat();
export const withCombat = (game: AcesGame, change: (c: CombatState) => CombatState): AcesGame => withTurnState(game, (t) => ({ ...t, combat: change(t.combat ?? freshCombat()) }));
export const endOf = (game: AcesGame): EndState => turnStateOf(game).end ?? freshEnd();
export const withEnd = (game: AcesGame, change: (e: EndState) => EndState): AcesGame => withTurnState(game, (t) => ({ ...t, end: change(t.end ?? freshEnd()) }));

// ---- Who attacks, and in what order --------------------------------------------------------------------------------------------

/** The force that attacks first is the one that lost Initiative, and it resolves all its attacks before the other starts (p. 18; Quick-Start p. 13). */
export function combatSides(game: AcesGame): { first: ForceName; second: ForceName } {
  const winner = game.initiative?.turn === game.turn ? game.initiative.winner : "player";
  return { first: otherForce(winner), second: winner };
}

/** Why a unit cannot attack this turn, in our words; null when it can. */
export function attackBlock(u: GameUnit): string | null {
  if (u.play.shutdown) return "shut down";
  if (u.play.stunned) return "its crew is stunned";
  if (u.play.moved?.mode === "sprint") return "it sprinted";
  return null;
}

const hasDeck = (game: AcesGame, u: GameUnit): boolean => game.decks.decks.some((d) => d.unitId === u.id);
const notDone = (game: AcesGame, u: GameUnit): boolean => combatOf(game).done[u.id] === undefined;

/** Units of a force the players resolve by hand: no deck (the players' own units, or an automated unit whose deck was not chosen), able to attack, not yet done. Automated emplacements wait for the support step (p. 20). */
export const manualAttackers = (game: AcesGame, force: ForceName): GameUnit[] =>
  game.sides[force].units.filter((u) => inPlay(u) && !hasDeck(game, u) && notDone(game, u) && attackBlock(u) === null && !(force === "automated" && isEmplacement(u.card)));

/** Units of a force an Aces card resolves, not yet done: the automated force's, and the players' automated allies (p. 38). */
export const cardAttackers = (game: AcesGame, force: ForceName): GameUnit[] => game.sides[force].units.filter((u) => inPlay(u) && hasDeck(game, u) && notDone(game, u) && (force === "automated" || isAlly(u)));

/** The players' units that cannot attack this turn and why, for a line of explanation. */
export const cannotAttack = (game: AcesGame, force: ForceName): { unit: GameUnit; why: string }[] =>
  game.sides[force].units.flatMap((u) => {
    const why = inPlay(u) && !hasDeck(game, u) && notDone(game, u) && !(force === "automated" && isEmplacement(u.card)) ? attackBlock(u) : null;
    return why ? [{ unit: u, why }] : [];
  });

/** The force whose attacks are being resolved now, or null when both have finished. */
export function combatForce(game: AcesGame): ForceName | null {
  const { first, second } = combatSides(game);
  const pending = (f: ForceName): boolean => manualAttackers(game, f).length > 0 || cardAttackers(game, f).length > 0;
  return pending(first) ? first : pending(second) ? second : null;
}

/** The deck engine's view of the units an Aces card resolves: the combat priority of the top card (withdrawal and tokens do not count here, p. 19). */
export function combatActivatables(game: AcesGame, force: ForceName, records: TurnRecords): Activatable[] {
  const cards = deckCards(records);
  return cardAttackers(game, force).map((u) => ({ unitId: u.id, pv: u.pv, priority: reveal(game.decks, cards, u.id)?.combatPriority ?? null }));
}

/** Who attacks next among a force's card-driven units: the lowest combat priority, a tie to the lower PV, then the players choose (p. 18). */
export const whoAttacksNext = (game: AcesGame, force: ForceName, records: TurnRecords): NextUnit => nextCombat(combatActivatables(game, force, records));

/** The enemy units still in play that this unit can attack: the other force's, or for an automated ally of the players the automated force's. */
export function enemiesOf(game: AcesGame, u: GameUnit): GameUnit[] {
  const mine = forceOf(game, u.id) ?? "automated";
  const side = isAlly(u) ? "automated" : otherForce(mine);
  return game.sides[side].units.filter(inPlay);
}

/** Opens one automated unit's attack: a fresh sheet, no terrain set. */
export const beginAttack = (game: AcesGame, unitId: string): AcesGame => withCombat({ ...game, sight: emptySheet() }, (c) => ({ ...c, active: { unitId, terrain: {} } }));

/** The terrain the players set for attacks on one enemy (woods, partial cover, hull-down); the resolver re-chooses if it pushes a Target Number to 13. */
export const setTerrain = (game: AcesGame, enemyId: string, flags: AsAttackFlag[]): AcesGame =>
  withCombat(game, (c) => (c.active ? { ...c, active: { ...c.active, terrain: { ...c.active.terrain, [enemyId]: flags } } } : c));

const toTableTerrain = (units: readonly GameUnit[], terrain: Record<string, string[]>, attacked: ReadonlySet<string>): TableUnit[] =>
  units.map((u) => {
    const flags = terrain[u.id] as AsAttackFlag[] | undefined;
    return { ...toTable(u), ...(flags?.length ? { attackFlags: flags } : {}), ...(attacked.has(u.id) ? { attackedByAlly: true as const } : {}) };
  });

/** What the resolver reads for one automated unit's attack: its top card's combat side, the command card, the enemies with their terrain. */
export function combatContext(game: AcesGame, unit: GameUnit, records: TurnRecords): CombatContext {
  const mine = forceOf(game, unit.id) ?? "automated";
  const enemySide = isAlly(unit) ? "automated" : otherForce(mine);
  const behaviour = topCard(game, unit.id, records);
  const command = currentCommand(game, records);
  const terrain = combatOf(game).active?.unitId === unit.id ? combatOf(game).active?.terrain ?? {} : {};
  // Enemies an ally of this unit has already attacked this turn (Aces p. 18).
  const attacked = new Set(
    Object.entries(combatOf(game).done).flatMap(([id, d]) => (id !== unit.id && d.target !== undefined && game.sides[mine].units.some((u) => u.id === id) ? [d.target] : [])),
  );
  return {
    phase: "combat",
    unit: toTable(unit),
    ...(behaviour ? { behaviour } : {}),
    ...(command ? { command } : {}),
    specialOrders: [...records.orders],
    allies: game.sides[mine].units.filter((u) => u.id !== unit.id).map(toTable),
    enemies: toTableTerrain(game.sides[enemySide].units, terrain, attacked),
    ...(game.rules.bigTable48 ? { bigTable48: true } : {}),
    lastDistances: turnStateOf(game).lastDistances,
  };
}

// ---- Dice ----------------------------------------------------------------------------------------------------------------------

/** 2D6 drawn from the game's seed, the turn, and a count that goes up with every draw: the same game gives the same dice. */
export function dice2d6(game: AcesGame, count: number, salt = 0): number {
  const rng = mulberry32((game.seed ^ Math.imul(game.turn + 7, 0x9e3779b1) ^ Math.imul(count + 1, 0x85ebca6b) ^ Math.imul(salt + 3, 0xc2b2ae35)) >>> 0);
  rng();
  return 1 + Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6);
}

/** 1D6 drawn the same way, for a minimal (0*) hit. */
export function dice1d6(game: AcesGame, count: number): number {
  const rng = mulberry32((game.seed ^ Math.imul(game.turn + 7, 0x9e3779b1) ^ Math.imul(count + 1, 0x85ebca6b) ^ Math.imul(99, 0xc2b2ae35)) >>> 0);
  rng();
  return 1 + Math.floor(rng() * 6);
}

/** Counts one more roll of ours this turn; the count is saved with the game so a reload does not roll the same dice twice. */
export const bumpRollCount = (game: AcesGame, by = 1): AcesGame => withTurnState(game, (t) => ({ ...t, rollCount: t.rollCount + by }));

// ---- An attack's figures -------------------------------------------------------------------------------------------------------

export interface WeaponDamage {
  bracket: RangeId | null;
  /** Damage of the card at that range, before OV; 0 for minimal (0*) and beyond Long. */
  base: number;
  minimal: boolean;
  /** Points an Overheat adds at this range: at Short and Medium, and Long with OVL (ASCE p. 53). */
  ovAdds: number;
  /** What a hit deals; a minimal hit deals 1 once its 1D6 roll allows it. */
  total: number;
  /** A hit with no Overheat to add still has to roll 1D6 for its one point (ASCE p. 48; Quick-Start p. 21). */
  rollsMinimal: boolean;
}

/** The damage a weapon attack deals at a distance with an Overheat, from the unit's current values. */
export function weaponDamage(u: GameUnit, distance: number, ov: number): WeaponDamage {
  const bracket = rangeBracket(distance);
  const raw = damageAt(toTable(u), distance);
  const minimal = raw > 0 && raw < 1;
  const base = minimal ? 0 : raw;
  const ovAdds = bracket === "S" || bracket === "M" || (bracket === "L" && u.card.specials.some((s) => s.code === "OVL")) ? Math.max(0, ov) : 0;
  const sum = base + ovAdds;
  return { bracket, base, minimal, ovAdds, total: sum === 0 && minimal ? 1 : sum, rollsMinimal: sum === 0 && minimal };
}

/** The Indirect Fire damage now, Weapon Hits taken off; 0* is minimal (Aces p. 3). */
export function indirectDamage(u: GameUnit): { total: number; rollsMinimal: boolean } {
  const d = currentIf(u.play, u.card);
  return d?.minimal ? { total: 1, rollsMinimal: true } : { total: d?.value ?? 0, rollsMinimal: false };
}

/** The 1D6 of a minimal (0*) hit: 4 or higher delivers a single point, otherwise the hit delivers nothing (ASCE p. 48; Quick-Start p. 21). */
export const minimalDelivers = (roll: number): boolean => roll >= 4;

/** Heat a unit would carry after this attack, for the shutdown hint: current heat, the Overheat, an engine hit and the outside heat staged on it (ASCE p. 53; Aces p. 19). */
export const heatAfterAttack = (u: GameUnit, ov: number): number =>
  u.play.heat + ov + (u.play.crits.engine >= 1 ? 1 : 0) + Math.min(AS_HEAT.externalCap, u.play.staged.reduce((sum, h) => sum + (h.heat ?? 0), 0));

/**
 * The Target Number for an attack the players make by hand, from the same parts the resolver uses for an automated unit: Skill, how
 * both units moved, the range from the inches measured, the target's TMM, heat, Fire Control hits, and the terrain the players set.
 */
export function attackTn(attacker: GameUnit, target: GameUnit, kind: "weapon" | "physical" | "indirect", distance: number, flags: readonly AsAttackFlag[], physical?: AsPhysicalType, spotter?: GameUnit): AttackResult {
  const t = targetMoveOf(toTable(target));
  const jets = specialValue(target.card, "JMPS") - specialValue(target.card, "JMPW");
  return targetNumber({
    skill: attacker.skill,
    attackerType: attacker.card.type,
    attackerMove: attackerMoveOf(toTable(attacker)),
    distance: kind === "physical" ? 0 : distance,
    targetType: target.card.type,
    targetTmm: t.tmm,
    targetMove: t.move,
    ...(t.move === "jump" && jets ? { jumpSpecial: jets } : {}),
    stealth: target.card.specials.some((s) => s.code === "STL"),
    heat: tracksHeat(attacker.card) ? attacker.play.heat : 0,
    fireControlHits: attacker.play.crits.fireControl,
    flags: [...flags, ...(kind === "indirect" ? (["indirect"] as const) : [])],
    ...(kind === "indirect" && spotter ? { spotterMove: attackerMoveOf(toTable(spotter)), spotterType: spotter.card.type } : {}),
    ...(kind === "physical" ? { physical: physical ?? "standard" } : {}),
  });
}

/** What a hit by a physical attack deals, and what a Charge or Death from Above costs the attacker (ASCE p. 46). */
export function physicalHit(attacker: GameUnit, target: GameUnit, kind: AsPhysicalType): { toTarget: number; toAttackerOnHit: number; toAttackerOnMiss: number } {
  const short = damageAt(toTable(attacker), 0);
  const p = physicalDamage({ type: kind, size: attacker.card.size, tmm: attacker.play.moved?.tmm ?? 0, targetSize: target.card.size, shortDamage: short < 1 ? 1 : short });
  return { toTarget: p.toTarget, toAttackerOnHit: p.toAttackerOnHit, toAttackerOnMiss: p.toAttackerOnMiss };
}

/** A 2D6 roll against a Target Number: 2 or less always hits, above 12 never; a pip from Edge adds 1 (p. 24). */
export function rollHits(tn: number, roll: number, pip = false): boolean {
  if (tn <= AS_HIT_LIMITS.autoHit) return true;
  if (tn > AS_HIT_LIMITS.autoMiss) return false;
  return roll + (pip ? 1 : 0) >= tn;
}

// ---- Recording an attack -------------------------------------------------------------------------------------------------------

export interface AttackRecord {
  attackerId: string;
  /** Absent when the unit makes no attack. */
  targetId?: string;
  kind: "weapon" | "physical" | "indirect" | "none";
  physical?: AsPhysicalType;
  tn?: number;
  /** The natural 2D6 roll, before any pip; absent with multiple attack rolls. */
  roll?: number;
  pip?: boolean;
  hit?: boolean;
  /** Damage a hit deals, after OV, the 0* roll and a rear hit. */
  damage?: number;
  /** The 1D6 of a minimal (0*) hit, when there was one. */
  minimalRoll?: number;
  /** The hit struck the target's rear: one more point (Quick-Start p. 21). */
  rear?: boolean;
  ov?: number;
  /** Multiple attack rolls: rolls made, those that succeeded, and whether a natural 12 was among them. */
  rolls?: number;
  successes?: number;
  natural12?: boolean;
  /** Damage the attacker takes (Charge, Death from Above). */
  attackerDamage?: number;
  /** Why there is no attack, in our words. */
  reason?: string;
}

const kindWords = (r: AttackRecord): string => (r.kind === "physical" ? `a ${AS_PHYSICAL_TYPES[r.physical ?? "standard"].label.toLowerCase()} attack` : r.kind === "indirect" ? "an indirect attack" : "a weapon attack");

/** The log line for an attack, in our words. */
export function attackLine(game: AcesGame, r: AttackRecord): string {
  const find = (id: string | undefined): GameUnit | undefined => [...game.sides.player.units, ...game.sides.automated.units].find((u) => u.id === id);
  const who = find(r.attackerId)?.name ?? r.attackerId;
  if (r.kind === "none" || !r.targetId) return `${who} makes no attack${r.reason ? `: ${r.reason}` : ""}.`;
  const target = find(r.targetId)?.name ?? r.targetId;
  const heat = r.ov ? `, Overheat ${String(r.ov)}` : "";
  const head = `${who}: ${kindWords(r)} on ${target}, Target Number ${String(r.tn ?? 0)}${heat}`;
  if (r.rolls !== undefined) return `${head}${r.pip ? ", Edge pip" : ""}. ${String(r.successes ?? 0)} of ${String(r.rolls)} rolls succeeded${r.successes ? `${r.minimalRoll === undefined ? "" : `, 0* roll ${String(r.minimalRoll)}`}${r.rear ? ", rear hit" : ""}: ${String(r.damage ?? 0)} damage, staged until the End Phase` : ""}.`;
  const rolled = r.roll === undefined ? "" : `, rolled ${String(r.roll)}${r.pip ? " plus an Edge pip" : ""}`;
  const minimal = r.minimalRoll === undefined ? "" : `, 0* roll ${String(r.minimalRoll)}`;
  const rear = r.rear ? ", rear hit" : "";
  return `${head}${rolled}${minimal}${rear}: ${r.hit ? ((r.damage ?? 0) > 0 ? `hit for ${String(r.damage)}, staged until the End Phase` : "hit, no damage") : "miss"}.`;
}

/**
 * Records an attack: the damage is staged on the target (a natural 12 or an Anti-'Mech hit calls for a critical check at the End
 * Phase, ASCE p. 50), the attacker is marked done, an Edge pip is counted, and an attacker with a deck cycles its card (p. 19).
 * A Charge or Death from Above stages its cost on the attacker too.
 */
export function recordAttack(start: AcesGame, r: AttackRecord): AcesGame {
  // The Edge pip is spent now, with the attack, not before the roll (Aces p. 24).
  const game = r.pip === true ? addPip(start, r.attackerId) : start;
  const delivered = r.rolls !== undefined ? (r.successes ?? 0) > 0 : r.hit === true;
  const damage = delivered ? Math.max(0, r.damage ?? 0) : 0;
  const critCheck = delivered && (r.natural12 === true || r.physical === "anti-mech");
  const attackerDamage = r.attackerDamage ?? 0;
  const stageOn = (u: GameUnit): GameUnit => {
    if (u.id === r.targetId && delivered && damage > 0) return { ...u, play: { ...u.play, staged: [...u.play.staged, { damage, ...(critCheck ? { critCheck: true } : {}) }] } };
    if (u.id === r.attackerId && attackerDamage > 0) return { ...u, play: { ...u.play, staged: [...u.play.staged, { damage: attackerDamage }] } };
    return u;
  };
  const sides = { player: { ...game.sides.player, units: game.sides.player.units.map(stageOn) }, automated: { ...game.sides.automated, units: game.sides.automated.units.map(stageOn) } };
  const attacker = [...game.sides.player.units, ...game.sides.automated.units].find((u) => u.id === r.attackerId);
  const lines: GameLogLine[] = [logLine(game, attackLine(game, r), COMBAT_CITE.steps.cite)];
  let decks = game.decks;
  if (attacker && game.decks.decks.some((d) => d.unitId === attacker.id)) {
    const cycled = cycle(game.decks, attacker.id, (id) => [...game.sides.player.units, ...game.sides.automated.units].some((u) => u.id === id && inPlay(u)));
    decks = cycled.state;
    if (cycled.reshuffled) lines.push(logLine(game, `${attacker.name}'s deck is reshuffled: every card back to its movement side.`, COMBAT_CITE.cycle.cite));
  }
  const weapon = r.kind === "weapon" || r.kind === "indirect";
  const next: AcesGame = { ...game, sides, decks };
  return addLog(
    withCombat({ ...next, sight: emptySheet() }, (c) => {
      const rest = { ...c, done: { ...c.done, [r.attackerId]: { weapon, ov: r.ov ?? 0, ...(r.targetId && r.kind !== "none" ? { target: r.targetId } : {}) } } };
      delete rest.active;
      return rest;
    }),
    ...lines,
  );
}

// ---- Damage by hand and leaving the table --------------------------------------------------------------------------------------

/** Damage from something the page does not run (an emplacement, a support card, indirect fire): staged like any hit, applied in the End Phase (Aces p. 20). */
export function damageByHand(game: AcesGame, unitId: string, amount: number, critCheck: boolean): AcesGame {
  const u = [...game.sides.player.units, ...game.sides.automated.units].find((x) => x.id === unitId);
  if (!u || !inPlay(u) || !Number.isInteger(amount) || amount < 1) return game;
  const next = mapUnit(game, unitId, (x) => ({ ...x, play: stage(x.play, { damage: amount, ...(critCheck ? { critCheck: true } : {}) }) }));
  return addLog(next, logLine(game, `${u.name} takes ${String(amount)} damage entered by hand${critCheck ? ", with a critical hit check" : ""}, staged until the End Phase.`, COMBAT_CITE.support.cite));
}

/** A unit leaves the table by an escape edge: it is out of play, no longer scheduled to move, no longer a target, and counts toward a side having no units left (Aces pp. 16, 32). */
export function leaveTable(game: AcesGame, unitId: string): AcesGame {
  const u = [...game.sides.player.units, ...game.sides.automated.units].find((x) => x.id === unitId);
  const force = u ? forceOf(game, unitId) : undefined;
  if (!u || !force || !inPlay(u) || isEmplacement(u.card)) return game;
  const tokens = { ...game.tokens };
  if (tokens.moveFirst === unitId) delete tokens.moveFirst;
  if (tokens.moveLast === unitId) delete tokens.moveLast;
  const next = mapUnit({ ...game, tokens }, unitId, (x) => ({ ...x, play: { ...escape(x.play), staged: [] } }));
  // Mid Movement Phase, a unit that leaves before it moved counts as moved so the order of moving does not wait for it.
  const withMoved = withTurnState(next, (t) => (t.moved[force].includes(unitId) ? t : { ...t, moved: { ...t.moved, [force]: [...t.moved[force], unitId] } }));
  const cleared = combatOf(withMoved).active?.unitId === unitId ? withCombat(withMoved, (c) => { const rest = { ...c }; delete rest.active; return rest; }) : withMoved;
  return addLog(cleared, logLine(game, `${u.name} leaves the table.`, "Aces pp. 16, 32"));
}

// ---- Edge (p. 24) --------------------------------------------------------------------------------------------------------------

/** Edge tokens a pilot has left: the pilot's rating at the start of the sortie, less those spent. */
export const edgeLeft = (u: GameUnit): number => u.edge ?? 0;
export const hasPilotEdge = (u: GameUnit): boolean => u.edge !== undefined;

const mapUnit = (game: AcesGame, id: string, change: (u: GameUnit) => GameUnit): AcesGame => ({
  ...game,
  sides: { player: { ...game.sides.player, units: game.sides.player.units.map((u) => (u.id === id ? change(u) : u)) }, automated: { ...game.sides.automated, units: game.sides.automated.units.map((u) => (u.id === id ? change(u) : u)) } },
});

/** Spends Edge tokens from a unit's pilot for a named purpose; unchanged when the pilot has too few. */
export function spendEdge(game: AcesGame, unitId: string, count: number, purpose: string): AcesGame {
  const u = [...game.sides.player.units, ...game.sides.automated.units].find((x) => x.id === unitId);
  if (!u || count < 1 || edgeLeft(u) < count) return game;
  return addLog(
    mapUnit(game, unitId, (x) => ({ ...x, edge: edgeLeft(x) - count })),
    logLine(game, `${u.name}'s pilot spends ${String(count)} Edge: ${purpose}. ${String(edgeLeft(u) - count)} left.`, COMBAT_CITE.edge.cite),
  );
}

/** Add a pip to an attack roll after it is made: one Edge, once per Combat Phase for each pilot (p. 24). recordAttack spends it with the attack. */
export const canAddPip = (game: AcesGame, u: GameUnit): boolean => edgeLeft(u) >= 1 && !combatOf(game).pips.includes(u.id);

export function addPip(game: AcesGame, unitId: string): AcesGame {
  const u = [...game.sides.player.units, ...game.sides.automated.units].find((x) => x.id === unitId);
  if (!u || !canAddPip(game, u)) return game;
  return withCombat(spendEdge(game, unitId, 1, "an Edge pip on an attack roll"), (c) => ({ ...c, pips: [...c.pips, unitId] }));
}

// ---- The End Phase (p. 32) -----------------------------------------------------------------------------------------------------

export const END_STEPS = [
  { n: 1, title: "End Phase rules of the sortie" },
  { n: 2, title: "Apply damage" },
  { n: 3, title: "Heat" },
  { n: 4, title: "Check objectives and game end" },
  { n: 5, title: "Commander strategy decision" },
  { n: 6, title: "Next turn and waypoints" },
] as const;

/** The End Phase opens: the Combat Phase is closed (p. 32). */
export function startEnd(game: AcesGame): AcesGame {
  return addLog({ ...game, phase: "end", sight: emptySheet() }, logLine(game, "Combat Phase ends. End Phase.", COMBAT_CITE.end.cite));
}

const hashOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export interface EndRoll {
  kind: RollKind | undefined;
  value: number;
  /** The number was typed or rerolled, not drawn from the seed. */
  set: boolean;
}

export interface EndUnitReport {
  id: string;
  name: string;
  /** Damage waiting to be applied. */
  staged: number;
  before: { armor: number; structure: number; heat: number; shutdown: boolean };
  after: { armor: number; structure: number; heat: number; shutdown: boolean; destroyed: boolean };
  events: PlayEvent[];
  rolls: EndRoll[];
  /** The unit is crippled once the damage is applied (and was not before). */
  newlyCrippled: boolean;
  /** Forced withdrawal now applies to it. */
  withdraws: boolean;
  restarted: boolean;
}

/** One unit's End Phase worked out on a copy: the dice are typed or rerolled results by place, else drawn from the seed. */
function endOne(game: AcesGame, u: GameUnit): { state: GameUnit["play"]; events: PlayEvent[]; rolls: EndRoll[] } {
  const end = endOf(game);
  const set = end.rolls[u.id] ?? {};
  const rolls: EndRoll[] = [];
  const roll = (kind?: RollKind): number => {
    const slot = rolls.length;
    const typed = set[String(slot)];
    const value = typed ?? dice2d6(game, slot, hashOf(u.id));
    rolls.push({ kind, value, set: typed !== undefined });
    return value;
  };
  const done = combatOf(game).done[u.id];
  const result = applyEndPhase(u.play, u.card, { roll, variant: "aces", attacked: done?.weapon === true, overheat: done?.ov ?? 0 });
  return { state: result.state, events: result.events, rolls };
}

/** Every unit in play as the End Phase would leave it, without changing the game. */
export function previewEnd(game: AcesGame): EndUnitReport[] {
  const rule = game.rules.forcedWithdrawal;
  return (["player", "automated"] as const).flatMap((force) =>
    game.sides[force].units
      .filter(inPlay)
      .map((u) => {
        const { state, events, rolls } = endOne(game, u);
        const was = crippled(u.play, u.card, "aces");
        const now = crippled(state, u.card, "aces");
        const applies = rule === "both" || (rule === "automated" && force === "automated");
        return {
          id: u.id,
          name: u.name,
          staged: u.play.staged.reduce((s, h) => s + h.damage, 0),
          before: { armor: u.play.armor, structure: u.play.structure, heat: u.play.heat, shutdown: u.play.shutdown },
          after: { armor: state.armor, structure: state.structure, heat: state.heat, shutdown: state.shutdown, destroyed: state.destroyed },
          events,
          rolls,
          newlyCrippled: now && !was && !state.destroyed,
          withdraws: applies && withdraws(state, u.card, "aces") && !u.flags.withdrawing,
          restarted: events.some((e) => e.id === "restart"),
        };
      }),
  );
}

/** Types a result for one of a unit's critical hit or motive checks (2 to 12), or clears it to go back to the seeded roll. */
export const setEndRoll = (game: AcesGame, unitId: string, slot: number, value: number | undefined): AcesGame =>
  withEnd(game, (e) => {
    const unitRolls = { ...(e.rolls[unitId] ?? {}) };
    if (value !== undefined && Number.isInteger(value) && value >= 2 && value <= 12) unitRolls[String(slot)] = value;
    else delete unitRolls[String(slot)];
    return { ...e, rolls: { ...e.rolls, [unitId]: unitRolls } };
  });

/** Edge reroll of a critical hit or motive check: one Edge, one reroll for each check; the new result stands (p. 24). */
export function rerollWithEdge(game: AcesGame, unitId: string, slot: number, what: "critical hit" | "motive systems damage"): AcesGame {
  const e = endOf(game);
  if ((e.rerolled[unitId] ?? []).includes(slot)) return game;
  const spent = spendEdge(game, unitId, 1, `reroll a ${what} roll`);
  if (spent === game) return game;
  const value = dice2d6(game, e.drawn, hashOf(`${unitId}:${String(slot)}`));
  return withEnd(spent, (x) => ({ ...x, drawn: x.drawn + 1, rolls: { ...x.rolls, [unitId]: { ...(x.rolls[unitId] ?? {}), [String(slot)]: value } }, rerolled: { ...x.rerolled, [unitId]: [...(x.rerolled[unitId] ?? []), slot] } }));
}

export const setEndStep = (game: AcesGame, step: number): AcesGame => withEnd(game, (e) => ({ ...e, step }));

/** Step 2 and 3: the staged damage, critical hits and heat are applied to every unit, forced withdrawal is set for crippled units, and the heat report is kept for step 3. */
export function applyEnd(game: AcesGame): AcesGame {
  const reports = previewEnd(game);
  const byId = new Map(reports.map((r) => [r.id, r]));
  const lines: GameLogLine[] = [];
  const apply = (u: GameUnit): GameUnit => {
    const r = byId.get(u.id);
    if (!r) return u;
    const { state } = endOne(game, u);
    const flags = r.withdraws ? { ...u.flags, withdrawing: true as const } : u.flags;
    return { ...u, play: state, flags };
  };
  const sides = { player: { ...game.sides.player, units: game.sides.player.units.map(apply) }, automated: { ...game.sides.automated, units: game.sides.automated.units.map(apply) } };
  for (const r of reports) {
    if (r.staged > 0) lines.push(logLine(game, `${r.name} takes ${String(r.staged)} damage: Armor ${String(r.before.armor)} to ${String(r.after.armor)}, Structure ${String(r.before.structure)} to ${String(r.after.structure)}.`, COMBAT_CITE.staged.cite));
    for (const e of r.events) lines.push(logLine(game, `${r.name}: ${e.text}`, e.cite));
    if (r.after.destroyed && !r.events.some((e) => e.id === "destroyed")) lines.push(logLine(game, `${r.name} is destroyed.`, COMBAT_CITE.staged.cite));
    if (r.newlyCrippled) lines.push(logLine(game, `${r.name} is crippled.`, "Aces p. 8"));
    if (r.withdraws) lines.push(logLine(game, `${r.name} is crippled and the game uses forced withdrawal, so it withdraws.`, COMBAT_CITE.end.cite));
  }
  const heat = reports.filter((r) => !r.after.destroyed).map((r) => ({ id: r.id, name: r.name, from: r.before.heat, to: r.after.heat, shutdown: r.after.shutdown, restarted: r.restarted }));
  return addLog(withEnd({ ...game, sides }, (e) => ({ ...e, step: 3, heat })), ...lines);
}

// ---- Step 4: objectives and game end -------------------------------------------------------------------------------------------

export interface GameEndCheck {
  ended: boolean;
  reasons: { id: NonNullable<AcesGame["over"]>["reason"]; text: string }[];
}

/** Does the sortie end now: the last turn just ended, the players say the objectives are complete, or a side has nothing left on the table (p. 32). */
export function endCheck(game: AcesGame): GameEndCheck {
  const reasons: GameEndCheck["reasons"] = [];
  if (game.turnLimit !== undefined && game.turn >= game.turnLimit) reasons.push({ id: "turn-limit", text: `Turn ${String(game.turn)} was the last turn.` });
  if (endOf(game).objectivesComplete) reasons.push({ id: "objectives", text: "The objectives are complete and the sortie ends now." });
  for (const f of ["player", "automated"] as const) {
    if (game.sides[f].units.length > 0 && !game.sides[f].units.some(inPlay)) reasons.push({ id: "empty-side", text: `${f === "player" ? "Your force" : "The automated force"} has no units left on the table.` });
  }
  return { ended: reasons.length > 0, reasons };
}

export const setObjectivesComplete = (game: AcesGame, on: boolean): AcesGame => withEnd(game, (e) => ({ ...e, objectivesComplete: on }));
export const setTurnLimit = (game: AcesGame, limit: number | undefined): AcesGame => {
  const rest = { ...game };
  delete rest.turnLimit;
  return limit !== undefined && Number.isInteger(limit) && limit >= game.turn ? { ...rest, turnLimit: limit } : rest;
};

/** The game is over: why, in which turn. */
export function finishGame(game: AcesGame, reason: NonNullable<AcesGame["over"]>["reason"]): AcesGame {
  const words = { "turn-limit": "the last turn ended", objectives: "the objectives are complete", "empty-side": "a side has no units left", ended: "the players ended it" } as const;
  return addLog({ ...game, phase: "over", over: { reason, turn: game.turn }, sight: emptySheet() }, logLine(game, `The sortie ends: ${words[reason]}.`, COMBAT_CITE.end.cite));
}

// ---- Step 5: the strategy decision ---------------------------------------------------------------------------------------------

export function strategyContext(game: AcesGame, records: TurnRecords): StrategyContext {
  const command = currentCommand(game, records);
  return {
    phase: "strategy",
    ...(command ? { command } : {}),
    allies: game.sides.automated.units.map(toTable),
    enemies: game.sides.player.units.map(toTable),
    ...(game.rules.bigTable48 ? { bigTable48: true } : {}),
  };
}

/** Takes the command card the strategy decision named and puts it on top; no match keeps the current one (p. 21). Says whether the card was found. */
export function applyStrategy(game: AcesGame, records: TurnRecords, decision: StrategyDecision): { game: AcesGame; found: boolean } {
  const next = (g: AcesGame): AcesGame => withEnd({ ...g, sight: emptySheet() }, (e) => ({ ...e, step: 6, strategy: { row: decision.row, letter: decision.letter } }));
  if (decision.letter === null) return { game: addLog(next(game), logLine(game, "No strategy row holds: the command card stays for another turn.", COMBAT_CITE.strategy.cite)), found: true };
  const card = records.commands.find((c) => game.command.cardIds.includes(c.id) && c.letter === decision.letter);
  if (!card) return { game: addLog(next(game), logLine(game, `Strategy row ${String((decision.row ?? 0) + 1)} holds: take command card ${decision.letter}. It is not recorded here, so put it on top yourself.`, COMBAT_CITE.strategy.cite)), found: false };
  const changed = card.id !== game.command.current;
  const g = { ...game, command: { ...game.command, current: card.id } };
  return { game: addLog(next(g), logLine(game, `Strategy row ${String((decision.row ?? 0) + 1)} holds: ${changed ? `command card ${decision.letter} goes on top` : `command card ${decision.letter} stays on top`}.`, COMBAT_CITE.strategy.cite)), found: true };
}

// ---- Step 6: the next turn -----------------------------------------------------------------------------------------------------

/** The waypoints on the turn track in the space the Initiative token enters, oldest first (p. 32). */
export const waypointsOn = (game: AcesGame, turn: number): AcesGame["waypoints"] => game.waypoints.filter((w) => w.turn === turn && !w.done);

export const markWaypoint = (game: AcesGame, letter: string, done: boolean): AcesGame => ({ ...game, waypoints: game.waypoints.map((w) => (w.letter === letter ? { ...w, done } : w)) });

/** Moves the Initiative token on: the next turn's Initiative Phase, nobody has moved, the tokens are discarded, last turn's winner kept for its -2. */
export function nextTurn(game: AcesGame): AcesGame {
  const turn = game.turn + 1;
  const fresh = (u: GameUnit): GameUnit => ({ ...u, play: { ...u.play, moved: null } });
  return addLog(
    {
      ...game,
      turn,
      phase: "initiative",
      tokens: {},
      sight: emptySheet(),
      sides: { player: { ...game.sides.player, units: game.sides.player.units.map(fresh) }, automated: { ...game.sides.automated, units: game.sides.automated.units.map(fresh) } },
    },
    { turn, text: `Turn ${String(turn)} begins.`, cite: COMBAT_CITE.end.cite },
  );
}

// ---- The finished game ---------------------------------------------------------------------------------------------------------

export interface SideSummary {
  units: number;
  inPlay: number;
  destroyed: number;
  escaped: number;
  crippled: number;
  pvStarted: number;
  pvLost: number;
  pvLeft: number;
}

export interface GameSummary {
  turns: number;
  reason: string;
  player: SideSummary;
  automated: SideSummary;
}

const sideSummary = (units: readonly GameUnit[]): SideSummary => {
  const left = units.filter(inPlay);
  return {
    units: units.length,
    inPlay: left.length,
    destroyed: units.filter((u) => u.play.destroyed).length,
    escaped: units.filter((u) => u.play.escaped).length,
    crippled: left.filter((u) => crippled(u.play, u.card, "aces")).length,
    pvStarted: units.reduce((s, u) => s + u.pv, 0),
    pvLost: units.filter((u) => u.play.destroyed).reduce((s, u) => s + u.pv, 0),
    pvLeft: left.reduce((s, u) => s + u.pv, 0),
  };
};

const OVER_WORDS = { "turn-limit": "The last turn ended.", objectives: "The objectives were complete.", "empty-side": "A side had no units left.", ended: "The players ended the game." } as const;

export const summarize = (game: AcesGame): GameSummary => ({
  turns: game.over?.turn ?? game.turn,
  reason: game.over ? OVER_WORDS[game.over.reason] : "",
  player: sideSummary(game.sides.player.units),
  automated: sideSummary(game.sides.automated.units),
});
