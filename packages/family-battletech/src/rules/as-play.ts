// The table state of one Alpha Strike unit in play: armor and structure left, heat, critical hits, what it moved this turn, and the
// numbers that follow from them. Shared by the Alpha Strike table and by Aces. Pure: nothing here rolls dice or throws; a caller that
// needs a die gives us the roll (`roll` below), so the app can roll for the player or take what the player typed.
import { AS_AMMO_SAFE, AS_CRIT_TABLES, AS_CRIT_TABLE_OF, AS_HEAT, AS_MOTIVE_MODIFIER, AS_MOTIVE_ROWS, AS_UNIT_TYPES } from "../data/alpha-strike";
import type { CritKind, PlayVariant } from "../data/alpha-strike";
import type { AsCard, AsDamage, AsMove } from "./as-unit";

export type { CritKind, PlayVariant };

/** One entry of the order a unit's movement was impaired in: an MP hit, or a Motive Systems Damage result. */
export type MoveHit = "mp" | "motive-2" | "motive-half" | "immobile";

/** A hit that has landed in the Combat Phase and waits for the End Phase. */
export interface StagedHit {
  /** Points of damage (a minimal-damage hit counts as 1: the caller converts). */
  damage: number;
  /** Roll for a critical hit even without structure damage: a natural 12, Death from Above, an Anti-'Mech attack (ASCE p. 50). */
  critCheck?: boolean;
  /** Heat from outside attacks (the HT special); the End Phase keeps at most 2 a turn (ASCE p. 52). */
  heat?: number;
}

export interface PlayState {
  armor: number;
  structure: number;
  /** 0 to 4; 4 is shutdown (ASCE p. 53). */
  heat: number;
  /** Critical hits that stack by count. Move impairments are in `moveHits`, in the order they came. */
  crits: { engine: number; fireControl: number; weapon: number };
  moveHits: MoveHit[];
  /** A stunned crew: no move or attack next turn, and an immobile target meanwhile. */
  stunned: boolean;
  /** What the unit did in this turn's Movement Phase. `tmm` is the number a shooter reads off it. */
  moved: { mode: MoveMode; tmm: number } | null;
  staged: StagedHit[];
  shutdown: boolean;
  destroyed: boolean;
  escaped: boolean;
}

export type MoveMode = "standstill" | "ground" | "jump" | "sprint";

export function newPlayState(card: AsCard): PlayState {
  return {
    armor: card.armor,
    structure: card.structure,
    heat: 0,
    crits: { engine: 0, fireControl: 0, weapon: 0 },
    moveHits: [],
    stunned: false,
    moved: null,
    staged: [],
    shutdown: false,
    destroyed: false,
    escaped: false,
  };
}

/** Our own plain-words record of something the rules did, with its page. */
export interface PlayEvent {
  id: string;
  text: string;
  cite: string;
}

const cite = (pages: string): string => `Alpha Strike: Commander's Edition, ${pages}`;

const has = (card: AsCard, code: string): boolean => card.specials.some((s) => s.code === code);
const typeOf = (card: AsCard) => AS_UNIT_TYPES.find((t) => t.code === card.type);
export const tracksHeat = (card: AsCard): boolean => typeOf(card)?.heat === true;
const isVehicle = (card: AsCard): boolean => card.type === "CV" || card.type === "SV";
const isBuilding = (card: AsCard): boolean => card.type === "BD";

// ---- Damage values -------------------------------------------------------------------------------------------------------

const isZero = (d: AsDamage): boolean => d === null || (d.value === 0 && d.minimal !== true);

/** One Weapon Hit: 1 becomes 0*, 0* becomes 0, anything else loses 1 (ASCE p. 50). */
function oneLess(d: AsDamage): AsDamage {
  if (d === null) return null;
  if (d.minimal) return { value: 0 };
  if (d.value <= 0) return d;
  return d.value === 1 ? { value: 0, minimal: true } : { value: d.value - 1 };
}

const halved = (d: AsDamage): AsDamage => (d === null ? null : { value: d.minimal ? 0 : Math.floor(d.value / 2) });

/** The damage values now: Weapon Hits first, then a vehicle's engine hit halves them (ASCE p. 50). */
export function currentDamage(state: PlayState, card: AsCard): AsCard["damage"] {
  let d = { ...card.damage };
  for (let i = 0; i < state.crits.weapon; i += 1) d = { s: oneLess(d.s), m: oneLess(d.m), l: oneLess(d.l), ...(d.e !== undefined ? { e: oneLess(d.e) } : {}) };
  if (isVehicle(card) && state.crits.engine >= 1) d = { s: halved(d.s), m: halved(d.m), l: halved(d.l), ...(d.e !== undefined ? { e: halved(d.e) } : {}) };
  return d;
}

/** The Indirect Fire value now: the card's IF number with Weapon Hits taken off it (Aces p. 3); `IF0*` is minimal damage. Null with no IF. */
export function currentIf(state: PlayState, card: AsCard): AsDamage {
  const raw = card.specials.find((s) => s.code === "IF")?.values[0];
  if (raw === undefined) return null;
  let d: AsDamage = raw.trim().endsWith("*") ? { value: 0, minimal: true } : { value: Number.parseInt(raw, 10) || 0 };
  for (let i = 0; i < state.crits.weapon; i += 1) d = oneLess(d);
  return d;
}

/** The target number added to every weapon attack by Fire Control Hits: +2 each, not on physical attacks (ASCE p. 50). */
export const fireControlModifier = (state: PlayState): number => 2 * state.crits.fireControl;

/** Overheat the unit may use: its card value, none when it does not track heat, is shut down or is destroyed. */
export function currentOv(state: PlayState, card: AsCard): number {
  return tracksHeat(card) && !state.shutdown && !state.destroyed ? card.ov : 0;
}

// ---- Movement ------------------------------------------------------------------------------------------------------------

/** Halving rounds down; `minLoss` is the least the value must drop (2 inches or 1 TMM, ASCE p. 50). */
const halve = (v: number, minLoss: number): number => Math.max(0, Math.min(Math.floor(v / 2), v - minLoss));

function afterHits(value: number, hits: MoveHit[], variant: PlayVariant, unit: "move" | "tmm"): number {
  const step = unit === "move" ? 2 : 1;
  let v = value;
  for (const hit of hits) {
    if (hit === "mp") v = halve(v, step);
    else if (hit === "motive-2") v = Math.max(0, v - step);
    else if (hit === "motive-half") v = variant === "aces" ? Math.floor(v / 2) : halve(v, step);
    else v = 0;
  }
  return v;
}

/** A value after critical hits only: the order received, then a vehicle's first engine hit halves it (ASCE pp. 50-51). */
function afterCrits(value: number, state: PlayState, card: AsCard, variant: PlayVariant, unit: "move" | "tmm"): number {
  const v = afterHits(value, state.moveHits, variant, unit);
  return isVehicle(card) && state.crits.engine >= 1 ? Math.floor(v / 2) : v;
}

/** Each movement mode of the card as it is now. Heat is temporary, so it is taken off last, and not from a jump (ASCE pp. 51-52). */
export function currentMove(state: PlayState, card: AsCard, variant: PlayVariant = "asce"): AsMove[] {
  return card.move.map((m) => {
    const hit = afterCrits(m.inches, state, card, variant, "move");
    if (state.shutdown) return { ...m, inches: 0 };
    const heat = tracksHeat(card) && m.mode !== "j" ? AS_HEAT.inchesPerLevel * state.heat : 0;
    return { ...m, inches: Math.max(0, hit - heat) };
  });
}

/** A unit that cannot move now: Move 0 (any cause), shut down, a stunned crew, or an emplacement (ASCE pp. 32, 53; Aces p. 6). */
export function isImmobile(state: PlayState, card: AsCard, variant: PlayVariant = "asce"): boolean {
  if (state.shutdown || state.stunned || isBuilding(card) || has(card, "IMMOBILE")) return true;
  const move = currentMove(state, card, variant);
  return move.length > 0 && move.every((m) => m.inches === 0);
}

/**
 * The TMM a shooter uses against this unit (ASCE p. 42): -4 when immobile, otherwise the card's number after critical hits and
 * then heat (1 off from heat 2, not for a jump). Null for a card with no TMM, such as an aerospace unit.
 */
export function currentTmm(state: PlayState, card: AsCard, variant: PlayVariant = "asce", jumping = false): number | null {
  if (isImmobile(state, card, variant)) return -4;
  if (card.tmm === null) return null;
  const hit = afterCrits(card.tmm, state, card, variant, "tmm");
  const heat = tracksHeat(card) && !jumping && state.heat >= AS_HEAT.tmmFromLevel ? 1 : 0;
  return Math.max(0, hit - heat);
}

/** Records how the unit moved: standing still is TMM 0 and a jump adds 1 (ASCE p. 42); the strong and weak jump jets are for the attack piece. */
export function recordMove(state: PlayState, card: AsCard, mode: MoveMode, variant: PlayVariant = "asce"): PlayState {
  const base = currentTmm(state, card, variant, mode === "jump");
  const tmm = base !== null && base < 0 ? base : base === null || mode === "standstill" ? 0 : mode === "jump" ? base + 1 : base;
  return { ...state, moved: { mode, tmm } };
}

// ---- Critical hit tables -------------------------------------------------------------------------------------------------

/** What a 2D6 roll of `roll` does to this unit type. Infantry and emplacements take only a Weapon Hit; types with no table take none. */
export function critKind(type: string, variant: PlayVariant, roll: number): CritKind {
  const which = AS_CRIT_TABLE_OF[type];
  if (which === undefined) return "none";
  if (which === "weapon-only") return "weapon";
  const table = which === "vehicle" && variant === "aces" ? AS_CRIT_TABLES["vehicle-aces"] : AS_CRIT_TABLES[which];
  return table[Math.min(12, Math.max(2, Math.round(roll))) - 2] ?? "none";
}

export type MotiveResult = "none" | "minus" | "half" | "immobile";

/** The Motive Systems Damage Table: the movement letter's modifier added to 2D6 (ASCE p. 51; Aces p. 4). */
export function motiveResult(mode: string, roll: number): MotiveResult {
  const total = roll + (AS_MOTIVE_MODIFIER[mode.toLowerCase()] ?? 0);
  if (total <= AS_MOTIVE_ROWS.none) return "none";
  if (total <= AS_MOTIVE_ROWS.minus) return "minus";
  return total <= AS_MOTIVE_ROWS.half ? "half" : "immobile";
}

// ---- Applying damage and critical hits -----------------------------------------------------------------------------------

/** What a 2D6 roll is for: a critical hit roll or a Motive Systems Damage roll. */
export type RollKind = "crit" | "motive";

/** A source of 2D6 results: the app's dice, or what the player rolled and typed. It is told what each roll is for, in the order they are asked. */
export type Roll2d6 = (kind?: RollKind) => number;

interface Work {
  s: PlayState;
  card: AsCard;
  variant: PlayVariant;
  roll: Roll2d6;
  events: PlayEvent[];
}

const note = (w: Work, id: string, text: string, pages: string): void => {
  w.events.push({ id, text, cite: cite(pages) });
};

/** One critical hit applied to a copy of the state: for a hit rolled by hand, or a check of one effect alone. */
export function applyCrit(state: PlayState, card: AsCard, kind: CritKind, variant: PlayVariant = "asce"): { state: PlayState; events: PlayEvent[] } {
  const events: PlayEvent[] = [];
  const s: PlayState = { ...state, crits: { ...state.crits }, moveHits: [...state.moveHits] };
  critEffect({ s, card, variant, roll: () => 7, events }, kind);
  return { state: s, events };
}

/** The effect of one critical hit (ASCE p. 50). An effect that cannot apply costs 1 point of damage instead, with no further critical roll. */
function critEffect(w: Work, kind: CritKind): void {
  const { s, card } = w;
  if (s.destroyed) return;
  switch (kind) {
    case "none":
      return;
    case "weapon": {
      const d = currentDamage(s, card);
      if (isZero(d.s) && isZero(d.m) && isZero(d.l)) soak(w, 1);
      else s.crits.weapon += 1;
      note(w, "weapon", "A weapon hit: every damage value is one lower.", "p. 50");
      return;
    }
    case "fire-control":
      s.crits.fireControl += 1;
      note(w, "fire-control", "A fire control hit: weapon attacks are 2 harder.", "p. 50");
      return;
    case "mp":
      s.moveHits.push("mp");
      note(w, "mp", "A movement hit: Move and TMM are halved.", "p. 50");
      return;
    case "engine":
      s.crits.engine += 1;
      if (s.crits.engine >= 2) s.destroyed = true;
      note(w, "engine", s.destroyed ? "A second engine hit: the unit is destroyed." : "An engine hit.", "p. 50");
      return;
    case "ammo":
      if (AS_AMMO_SAFE.some((code) => has(card, code))) return;
      if (has(card, "CASE")) {
        applyDamage(w, 1, false);
        note(w, "ammo-case", "An ammunition hit, held to 1 point of damage by CASE.", "p. 50");
      } else {
        s.destroyed = true;
        note(w, "ammo", "An ammunition hit: the unit is destroyed.", "p. 50");
      }
      return;
    case "crew-stunned":
      s.stunned = true;
      note(w, "stunned", "The crew is stunned: no move or attack next turn.", "p. 50");
      return;
    case "crew-killed":
    case "destroyed":
      s.destroyed = true;
      note(w, kind, "The unit is destroyed.", "p. 50");
  }
}

/** Damage that does not roll further critical hits (the extra point from an inapplicable effect). */
function soak(w: Work, points: number): void {
  const { s } = w;
  const toArmor = Math.min(s.armor, points);
  s.armor -= toArmor;
  const toStructure = Math.min(s.structure, points - toArmor);
  s.structure -= toStructure;
  if (points - toArmor - toStructure > 0 || (toStructure > 0 && s.structure === 0)) s.destroyed = true;
}

/** How many critical rolls a hit calls for (ASCE p. 50): one for a forced check, plus one or two when it damaged structure. */
function critRolls(card: AsCard, damaged: boolean, structureHit: boolean, forced: boolean): number {
  const infantry = card.type === "BA" || card.type === "CI";
  let n = forced ? 1 : 0;
  if (structureHit && !infantry) n += card.type === "IM" || has(card, "BAR") ? 2 : 1;
  else if (damaged && has(card, "BAR")) n += 1;
  return n;
}

/** Armor, then structure (ASCE p. 49); roll criticals and, for a vehicle, motive damage when `follow` is set. */
function applyDamage(w: Work, points: number, follow: boolean, forced = false): void {
  const { s, card } = w;
  if (s.destroyed || (points <= 0 && !forced)) return;
  let left = points;
  const toArmor = Math.min(s.armor, left);
  s.armor -= toArmor;
  left -= toArmor;
  const toStructure = Math.min(s.structure, left);
  s.structure -= toStructure;
  left -= toStructure;
  const structureHit = toStructure > 0;
  if (left > 0 || (structureHit && s.structure === 0)) {
    s.destroyed = true;
    note(w, "destroyed", "All structure is gone: the unit is destroyed.", "p. 49");
    return;
  }
  const rolls = critRolls(card, points > 0, structureHit, forced);
  for (let i = 0; i < rolls && !s.destroyed; i += 1) critEffect(w, critKind(card.type, w.variant, w.roll("crit")));
  if (follow && isVehicle(card) && points > 0 && !s.destroyed) {
    const result = motiveResult(card.move[0]?.mode ?? "", w.roll("motive"));
    if (result === "minus") s.moveHits.push("motive-2");
    else if (result === "half") s.moveHits.push("motive-half");
    else if (result === "immobile") s.moveHits.push("immobile");
    if (result !== "none") note(w, `motive-${result}`, "The motive system is damaged.", "p. 51");
  }
}

// ---- The turn: staging and the End Phase ---------------------------------------------------------------------------------

/** Records a hit to be applied at the End Phase; nothing on the card changes yet (ASCE p. 49; Aces p. 21). */
export const stage = (state: PlayState, hit: StagedHit): PlayState => ({ ...state, staged: [...state.staged, hit] });

export interface EndPhaseInput {
  /** The 2D6 source for criticals and motive damage. */
  roll: Roll2d6;
  variant?: PlayVariant;
  /** The unit made a weapon attack this turn. */
  attacked?: boolean;
  /** Points of Overheat it used. */
  overheat?: number;
  /** It deliberately overheats ('Mechs only, ASCE p. 53). */
  deliberate?: boolean;
  /** It stood in water of depth 1 or more. */
  inWater?: boolean;
}

/**
 * The End Phase for one unit: stun ends, staged damage is applied in order (armor first, then structure), then heat in the order
 * of ASCE p. 53, then the turn's move is cleared. Outside heat (HT) dealt to a unit that does not track heat is damage, 1 per point,
 * with no cap and the usual critical and motive rolls (ASCE p. 52).
 */
export function applyEndPhase(state: PlayState, card: AsCard, input: EndPhaseInput): { state: PlayState; events: PlayEvent[] } {
  const events: PlayEvent[] = [];
  const s: PlayState = { ...state, crits: { ...state.crits }, moveHits: [...state.moveHits], staged: [], moved: null };
  if (s.destroyed || s.escaped) return { state: s, events };
  const w: Work = { s, card, variant: input.variant ?? "asce", roll: input.roll, events };

  s.stunned = false;
  let external = 0;
  for (const hit of state.staged) {
    applyDamage(w, hit.damage, true, hit.critCheck === true);
    external += hit.heat ?? 0;
  }
  if (!tracksHeat(card)) {
    if (external > 0 && !s.destroyed) applyDamage(w, external, true);
    return { state: s, events };
  }
  external = Math.min(external, AS_HEAT.externalCap);
  if (s.destroyed) return { state: s, events };

  const began = s.shutdown;
  let h = s.heat;
  const attacked = input.attacked === true;
  h += input.overheat ?? 0;
  if (s.crits.engine >= 1 && attacked) h += 1;
  if (input.inWater) h = Math.max(0, h - 1);
  if (!attacked) h = 0;
  if (began) {
    h = 0;
    s.shutdown = false;
    note(w, "restart", "The unit starts up again with no heat.", "p. 53");
  }
  h += external;
  if (input.deliberate) h += 1;
  s.heat = Math.min(AS_HEAT.max, Math.max(0, h));
  if (s.heat >= AS_HEAT.max) {
    s.shutdown = true;
    note(w, "shutdown", "The unit shuts down.", "p. 53");
  }
  return { state: s, events };
}

/** The unit leaves the table by its home edge (Forced Withdrawal, ASCE p. 126). */
export const escape = (state: PlayState): PlayState => ({ ...state, escaped: true });

// ---- Crippled ------------------------------------------------------------------------------------------------------------

/**
 * Is the unit crippled? (ASCE p. 127; Aces p. 8; Quick-Start p. 12.) Three conditions, any one is enough:
 *  1. no armor left and structure at or below half the starting structure, rounded up (a 1-point structure goes with its armor);
 *  2. every Medium and Long damage value is 0, unless the card began that way;
 *  3. Aces: Move cut below half the card's Move by critical hits alone. ASCE and the Quick-Start: Move cut to 0 by critical hits.
 * An emplacement is crippled when its damage values are all 0 (Aces p. 6). Heat never counts toward 3: it is temporary.
 */
export function crippled(state: PlayState, card: AsCard, variant: PlayVariant = "aces"): boolean {
  const d = currentDamage(state, card);
  if (isBuilding(card)) return isZero(d.s) && isZero(d.m) && isZero(d.l);
  if (state.armor === 0 && state.structure <= Math.ceil(card.structure / 2)) return true;
  if (isZero(d.m) && isZero(d.l) && !(isZero(card.damage.m) && isZero(card.damage.l))) return true;
  const start = card.move[0]?.inches ?? 0;
  if (start <= 0) return false;
  const left = afterCrits(start, state, card, variant, "move");
  return variant === "aces" ? left < start / 2 : left === 0;
}

/** Crippled units under Forced Withdrawal head for their home edge; an emplacement is crippled but has no movement to withdraw with (Aces p. 6). */
export const withdraws = (state: PlayState, card: AsCard, variant: PlayVariant = "aces"): boolean =>
  !state.destroyed && !state.escaped && !isBuilding(card) && crippled(state, card, variant);
