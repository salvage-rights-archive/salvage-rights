// Reading the file the old project's Aces pages download as AcesExport.json (JBT, the old project). It is the whole-device backup
// the file we already read (aces-jbt.ts) comes from, with two keys added: `exportedAt` and `localStorage`, a copy of every entry the
// old app keeps in the browser, settings and unrelated saves included. We never read `localStorage`: everything we take is under the
// backup's own top-level Aces keys, so nothing else in the file can be stored, shown or logged. From those keys we make:
//   - the campaigns (aces-jbt.ts), now with full card values for roster units found in the file's forces,
//   - the Alpha Strike units of the player's force and of the automated force in the game in progress,
//   - the player's behaviour, command and special order cards, the free text of each kept as our `other` token with the player's words,
//   - the one game in progress, if any.
// Pure; nothing here throws on a file it does not understand. A part we cannot read is named in `left`, in plain words.
import type { AcesCard, AcesRecord, Clause, Column, CommandCard, Condition, Filter, Key, Order, OvRow, SpecialOrderCard, TargetRule, TokenUse } from "./aces-card";
import { isAcesRecord, isCommandCard, toDeckCard } from "./aces-card";
import { buildDecks } from "./aces-deck";
import { findEdgeAbility } from "./aces-edge";
import type { UnitDeck } from "./aces-deck";
import { ACES_LETTERS } from "../data/aces-vocab";
import type { ColumnId, CommandLetter, OrderPhase, SpecialOrderKind } from "../data/aces-vocab";
import { ACES_SPECIAL_ORDERS } from "../data/aces-vocab";
import { DEFAULT_RULES, isAcesGame } from "./aces-game";
import type { AcesGame, GameUnit } from "./aces-game";
import { emptySheet } from "./aces-resolve";
import { JBT_NAME, convertJbtBackup, isObject, list, safeId, text, whole } from "./aces-jbt";
import type { JbtResult, Obj } from "./aces-jbt";
import { clampSkill, skillAdjustedPv } from "./as-force";
import type { MoveHit, PlayState } from "./as-play";
import { newPlayState } from "./as-play";
import type { AsCard, AsDamage, AsUnit } from "./as-unit";
import { newAsUnit, parseSpecials, unitTitle } from "./as-unit";

/** Caps, so a hostile or damaged file cannot make the page do endless work. */
export const EXPORT_CAPS = { units: 400, cards: 1000, lines: 60, ids: 200, log: 100 } as const;

/** The file the old project's Export everything button makes: a backup with the time it was made and a copy of its browser entries. */
export function looksLikeAcesExport(file: unknown): boolean {
  return isObject(file) && typeof file.exportedAt === "string" && isObject(file.localStorage) && file.kind === undefined;
}

export interface AcesExportRead {
  units: AsUnit[];
  cards: AcesRecord[];
  games: AcesGame[];
  /** What the file holds that we have no place for, or only part of, in plain words. */
  left: string[];
}

const words = (n: number, one: string, many = `${one}s`): string => `${String(n)} ${n === 1 ? one : many}`;
const rows = (v: unknown, cap: number): Obj[] => list(v, cap).filter(isObject);
const strings = (v: unknown, cap: number = EXPORT_CAPS.lines): string[] => list(v, cap).filter((s): s is string => typeof s === "string").map((s) => s.slice(0, 300));

// The old pages write icons into card text as [name]; here they are our own words.
const ICON_WORDS: Record<string, string> = {
  moved: "moved", notmoved: "not moved", highest: "highest", lowest: "lowest", los: "in sight", nolos: "out of sight", range: "attackable", closer: "get closer",
  spacing: "keep spacing", zone: "zone", s: "short range", m: "medium range", l: "long range", ground: "ground", sprint: "sprint", jump: "jump", standstill: "standstill",
  moveobj: "movement objective", destroyobj: "destroy objective", red: "RED", yellow: "YELLOW", blue: "BLUE",
};
const plain = (s: string): string => s.replace(/\[([A-Za-z]+)\]/g, (whole_, name: string) => ICON_WORDS[name.toLowerCase()] ?? whole_).trim();
const other = (s: string): TokenUse => ({ token: "other", note: plain(s) || "(blank)" });

// ---- Units ---------------------------------------------------------------------------------------------------------------

const damageOf = (value: unknown, minimal: unknown): AsDamage => (minimal === true ? { value: 0, minimal: true } : { value: Math.max(0, whole(value)) });

/** The card of one unit in a force, from the old unit's own figures. */
function cardOf(row: Obj): AsCard {
  const damage = isObject(row.damage) ? row.damage : {};
  const move = rows(row.move, 8).map((m) => ({ inches: Math.max(0, whole(m.move)), mode: text(m.type).trim().toLowerCase() }));
  const jump = whole(row.jumpMove);
  if (jump > 0 && !move.some((m) => m.mode === "j")) move.push({ inches: jump, mode: "j" });
  const abilities = Array.isArray(row.abilities) ? strings(row.abilities, 80).join(", ") : text(row.abilities);
  const extreme = damageOf(damage.extreme, damage.extremeMinimal);
  const threshold = whole(row.threshold);
  return {
    type: text(row.type, "BM").trim().toUpperCase() || "BM",
    size: Math.max(0, whole(row.size)),
    tmm: typeof row.tmm === "number" && Number.isFinite(row.tmm) ? Math.round(row.tmm) : null,
    move,
    role: text(row.role).trim() || null,
    pv: Math.max(0, whole(row.basePoints)),
    damage: {
      s: damageOf(damage.short, damage.shortMinimal),
      m: damageOf(damage.medium, damage.mediumMinimal),
      l: damageOf(damage.long, damage.longMinimal),
      ...(extreme && (extreme.value > 0 || extreme.minimal) ? { e: extreme } : {}),
    },
    ov: Math.max(0, whole(row.overheat)),
    armor: Math.max(0, whole(row.armor)),
    structure: Math.max(0, whole(row.structure)),
    ...(threshold > 0 ? { threshold } : {}),
    specials: abilities.trim() === "" ? [] : parseSpecials(abilities),
  };
}

const skillOf = (row: Obj): number => clampSkill(whole(row.currentSkill) || (isObject(row.pilot) ? whole(row.pilot.gunnery) : 0) || 4);

/** One unit of a force as ours. Undefined when it has no id. */
export function convertJbtUnit(row: Obj): AsUnit | undefined {
  const uuid = safeId(row.uuid);
  if (uuid === "") return undefined;
  const name = text(row.name).trim();
  const variant = text(row.variant).trim();
  const chassis = variant !== "" && name.toLowerCase().endsWith(variant.toLowerCase()) ? name.slice(0, name.length - variant.length).trim() : name;
  const mul = whole(row.mulID);
  const unit = newAsUnit(`jbt-${uuid}`);
  unit.name = { chassis: chassis || name || "Unnamed unit", model: variant };
  unit.card = cardOf(row);
  unit.skill = skillOf(row);
  unit.source = { kind: "file", credit: JBT_NAME, ...(mul > 0 ? { ref: String(mul) } : {}) };
  return unit;
}

const countTrue = (v: unknown): number => (Array.isArray(v) ? v.filter((x) => x === true).length : 0);

/** What the unit has lost, from the old unit's marked boxes. Damage staged for the End Phase comes over as one staged hit. */
function playOf(row: Obj, card: AsCard): PlayState {
  const play = newPlayState(card);
  play.armor = Math.max(0, card.armor - countTrue(row.currentArmor));
  play.structure = Math.max(0, card.structure - countTrue(row.currentStructure));
  play.heat = Math.min(4, Math.max(0, whole(row.currentHeat)));
  play.shutdown = play.heat >= 4;
  play.crits = { engine: countTrue(row.engineHits), fireControl: countTrue(row.fireControlHits), weapon: countTrue(row.weaponHits) };
  const hits: MoveHit[] = [];
  for (let i = 0; i < countTrue(row.mpControlHits); i += 1) hits.push("mp");
  for (let i = 0; i < countTrue(row.vehicleMotive910); i += 1) hits.push("motive-2");
  for (let i = 0; i < countTrue(row.vehicleMotive11); i += 1) hits.push("motive-half");
  if (row.vehicleMotive12 === true) hits.push("immobile");
  play.moveHits = hits;
  const staged = countTrue(row.roundArmor) + countTrue(row.roundStructure);
  if (staged > 0) play.staged = [{ damage: staged }];
  play.destroyed = Array.isArray(row.currentStructure) && row.currentStructure.length > 0 && play.structure === 0;
  return play;
}

const groupMembers = (force: unknown): Obj[] => (isObject(force) ? rows(force.groups, 40).flatMap((g) => rows(g.members, EXPORT_CAPS.units)) : []);

// ---- Cards ---------------------------------------------------------------------------------------------------------------

const MODES = ["ground", "jump", "sprint", "standstill"] as const;
const modeOf = (v: unknown): (typeof MODES)[number] => MODES.find((m) => m === v) ?? "ground";
const COLOURS = ["red", "yellow", "blue"] as const;
const STATS: Record<string, string> = { armor: "armor", structure: "structure", "armor-lost": "armor-lost", "structure-lost": "structure-lost", tmm: "tmm", pv: "pv", mv: "mv", "damage-s": "damage-s", "damage-m": "damage-m", "damage-l": "damage-l", size: "size", "armor-start": "starting-armor" };

/** One numbered line of a target list as a key: a stat, a colour list, or the player's own words. */
function keyOf(r: Obj): Key {
  const line = text(r.text);
  if (r.unresolved === true) return other(line);
  if (r.objective === true) return { token: "destroy-objective" };
  if (r.noArmor === true) return { token: "no-armor" };
  const colour = COLOURS.find((c) => c === r.color);
  if (colour) return { token: "colour-list", params: { colour } };
  const stat = typeof r.stat === "string" ? STATS[r.stat] : undefined;
  if (stat && (r.direction === "highest" || r.direction === "lowest")) return { token: "stat", params: { amount: r.direction === "highest" ? "most" : "fewest", stat } };
  return other(line);
}

const conditionOf = (s: string): Condition | undefined => (s.trim() === "" ? undefined : { join: "all", clauses: [other(s)] });

function columnOf(c: Obj): Column {
  const rings = list(c.zoneRings, 12).filter((n): n is number => typeof n === "number" && n > 0);
  const flags = [c.targetMoved === true ? "moved" : "", c.targetInAttackRange === true ? "attackable" : "", c.targetInLOS === true ? "in-sight" : "", c.targetNoLOS === true ? "out-of-sight" : ""].filter((f) => f !== "");
  const pick = c.targetSelect === "nearest" ? "nearest" : COLOURS.find((x) => x === c.targetSelect);
  const when = conditionOf(text(c.condition));
  const alt = c.altMoveType ? { mode: modeOf(c.altMoveType), ...(conditionOf(text(c.altMoveWhen)) ? { when: conditionOf(text(c.altMoveWhen)) } : {}) } : undefined;
  const filters: Filter[] = strings(c.filters).map(other);
  const zone: TargetRule["zone"] = rings.length > 0 ? { rings } : c.zoneKeyword === "nearest" || c.zoneKeyword === "any" ? { keyword: c.zoneKeyword } : null;
  return { ...(when ? { when } : {}), target: { zone, flags, ...(pick ? { pick } : {}) }, move: { mode: modeOf(c.moveType), ...(alt ? { alt } : {}) }, filters };
}

const num1 = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** "4/6" is position 4 of 6. */
function positionOf(v: unknown, fallbackOf: number): { position: number; of: number; known: boolean } {
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(text(v));
  return m ? { position: Number(m[1]), of: Number(m[2]), known: true } : { position: 1, of: fallbackOf, known: false };
}

function overheatOf(r: Obj): OvRow {
  const atMost = num1(r.tnAtMost);
  const atLeast = num1(r.tnAtLeast);
  const alsoId = r.also === "destroyed" ? "destroyed" : r.also === "could-hit-structure" ? "could-reach-structure" : r.also === "has-heat" ? "has-heat" : undefined;
  const action: TokenUse = r.action === "up-to" ? { token: "ov-up-to", params: { ov: Math.max(0, whole(r.ovLimit)) } } : r.action === "no-attack" ? { token: "hold-fire" } : { token: "ov-max" };
  const tn = atMost !== undefined ? { test: "at-most" as const, value: Math.round(atMost) } : atLeast !== undefined ? { test: "at-least" as const, value: Math.round(atLeast) } : undefined;
  return { ...(tn ? { tn } : {}), ...(alsoId ? { join: r.join === "or" ? ("or" as const) : ("and" as const), also: { token: alsoId } } : {}), action };
}

function convertCard(c: Obj, at: string, left: Set<string>): AcesCard | undefined {
  const id = safeId(c.id);
  const deck = text(c.deck).trim();
  if (id === "" || deck === "") return undefined;
  const sub = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(deck);
  const pos = positionOf(c.cardNumber, 6);
  if (!pos.known) left.add("Behaviour cards whose number is not written as 4/6 were numbered 1 of 6, so check their place in the deck.");
  const combat = isObject(c.combat) ? c.combat : {};
  const rings = list(combat.zoneRings, 12).filter((n): n is number => typeof n === "number" && n > 0);
  const zone: TargetRule["zone"] = rings.length > 0 ? { rings } : combat.zoneKeyword === "nearest" || combat.zoneKeyword === "any" ? { keyword: combat.zoneKeyword } : null;
  const overheat = rows(combat.overheat, 12);
  if (overheat.some((r) => num1(r.tnAtMost) !== undefined && num1(r.tnAtLeast) !== undefined)) left.add("An overheat row that gave both a highest and a lowest target number kept only the highest.");
  const note = text(c.notes).trim();
  return {
    schema: 1,
    kind: "aces-card",
    id,
    deck: { role: (sub?.[1] ?? deck).trim(), ...(sub?.[2] ? { subtype: sub[2].trim() } : {}) },
    position: pos.position,
    of: pos.of,
    movement: {
      priority: num1(c.movePriority) ?? null,
      columns: { aggressive: columnOf(isObject(c.aggressive) ? c.aggressive : {}), balanced: columnOf(isObject(c.balanced) ? c.balanced : {}), cautious: columnOf(isObject(c.cautious) ? c.cautious : {}) },
    },
    combat: {
      priority: num1(c.combatPriority) ?? null,
      target: { zone, flags: combat.indirectIfNoLOS === true ? ["indirect-if-none"] : [], keys: rows(combat.filters, 12).map(keyOf) },
      overheat: overheat.map(overheatOf),
    },
    ...(note ? { note } : {}),
    source: { kind: "entered", at },
  };
}

const letterOf = (v: unknown): CommandLetter | undefined => ACES_LETTERS.find((l) => l === text(v).trim().toUpperCase());

function orderOf(o: Obj): Order[] {
  const phase: OrderPhase = (["initiative", "movement", "combat", "end", "any"] as const).find((p) => p === o.phase) ?? "any";
  const said = plain(text(o.text));
  const note = said === "" ? {} : { note: said };
  const out: Order[] = [];
  if (o.token === "move-first" || o.token === "move-last") out.push({ token: "give-token", params: { token: o.token === "move-first" ? "first" : "last" }, phase, keys: rows(o.tokenRank, 12).map(keyOf), ...note });
  const column = (["aggressive", "balanced", "cautious"] as const).find((b) => b === o.behavior);
  if (column) out.push({ token: "force-column", params: { column: column satisfies ColumnId }, phase, ...note });
  if (text(o.filter).trim() !== "") out.push({ token: "add-filters", phase, filters: [other(text(o.filter))], ...note });
  if (out.length === 0) out.push({ ...other(said), phase });
  return out;
}

function strategyOf(r: Obj): { letter: CommandLetter | null; when: Condition } {
  const clause: Clause = r.auto === "objective-complete" ? { token: "objective-complete" } : r.auto === "enemy-no-armor" ? { token: "enemy-without-armor" } : r.auto === "maintain" ? { token: "always" } : other(text(r.text));
  return { letter: r.auto === "maintain" ? null : (letterOf(r.letter) ?? null), when: { join: "all", clauses: [clause] } };
}

function convertCommand(c: Obj, at: string): CommandCard | undefined {
  const id = safeId(c.id);
  const commander = text(c.deck).trim();
  const letter = letterOf(c.letter);
  if (id === "" || commander === "") return undefined;
  const pos = positionOf(c.cardNumber, 5);
  const supportText = text(c.supportOrders).trim();
  const note = supportText !== "" && c.supportOnlyIfStructure === true ? supportText : "";
  return {
    schema: 1,
    kind: "aces-command",
    id,
    commander,
    faction: text(c.faction).trim(),
    letter: letter ?? "A",
    position: pos.known ? pos.position : ACES_LETTERS.indexOf(letter ?? "A") + 1,
    of: pos.known ? pos.of : 5,
    orders: rows(c.orders, 20).flatMap(orderOf),
    colours: { red: rows(c.red, 12).map(keyOf), yellow: rows(c.yellow, 12).map(keyOf), blue: rows(c.blue, 12).map(keyOf) },
    support: {
      spend: c.supportOnlyIfStructure === true ? { token: "spend-if-structure" } : other(supportText || "Not written on the old card"),
      emplacements: { rings: list(c.emplacementZoneRings, 12).filter((n): n is number => typeof n === "number" && n > 0), keys: rows(c.emplacements, 12).map(keyOf) },
      artillery: rows(c.artillery, 12).map(keyOf),
      bsp: rows(c.bsp, 12).map(keyOf),
    },
    strategy: rows(c.strategy, 12).map(strategyOf),
    ...(note ? { note } : {}),
    source: { kind: "entered", at },
  };
}

function convertOrder(o: Obj, at: string): SpecialOrderCard | undefined {
  const id = safeId(o.id);
  const kind = ACES_SPECIAL_ORDERS.find((k) => k.id === o.kind)?.id as SpecialOrderKind | undefined;
  if (id === "" || !kind) return undefined;
  const note = strings(o.rules, 12).map(plain).join(" ") + (text(o.notes).trim() === "" ? "" : ` ${text(o.notes).trim()}`);
  return {
    schema: 1,
    kind: "aces-order",
    id,
    order: kind,
    ...(isObject(o.column) ? { column: columnOf(o.column) } : {}),
    ...(strings(o.preFilters).length > 0 ? { preFilters: strings(o.preFilters).map(other) } : {}),
    ...(strings(o.spotter).length > 0 ? { spotter: strings(o.spotter).map(other) } : {}),
    ...(note.trim() === "" ? {} : { note: note.trim() }),
    source: { kind: "entered", at },
  };
}

/** The player's cards in the old card library as ours. Sample cards the old app shipped and sorties are left, and said so; Edge cards are matched by name to our Edge table and the ones that match nothing are listed. */
export function convertJbtLibrary(library: unknown, at: string, left: Set<string>): AcesRecord[] {
  if (!isObject(library)) return [];
  const mine = (v: unknown): Obj[] => rows(v, EXPORT_CAPS.cards).filter((c) => c.sample !== true);
  const sampled = [library.cards, library.commandCards, library.specialOrders].reduce<number>((n, v) => n + rows(v, EXPORT_CAPS.cards).filter((c) => c.sample === true).length, 0);
  if (sampled > 0) left.add(`${words(sampled, "sample card")} the old app ships with it (not the player's own) were not imported.`);
  const made: AcesRecord[] = [];
  const skipped = { behaviour: 0, command: 0, order: 0 };
  for (const c of mine(library.cards)) {
    const r = convertCard(c, at, left);
    if (r) made.push(r);
    else skipped.behaviour += 1;
  }
  for (const c of mine(library.commandCards)) {
    const r = convertCommand(c, at);
    if (r) made.push(r);
    else skipped.command += 1;
  }
  for (const o of mine(library.specialOrders)) {
    const r = convertOrder(o, at);
    if (r) made.push(r);
    else skipped.order += 1;
  }
  const unread = skipped.behaviour + skipped.command + skipped.order;
  if (unread > 0) left.add(`${words(unread, "card")} had no id, no deck name, or a special order of a kind we do not use, and could not be read.`);
  const edgeCards = rows(library.edgeCards, EXPORT_CAPS.cards).filter((c) => c.sample !== true);
  const matched = edgeCards.filter((c) => findEdgeAbility(text(c.name)) !== undefined);
  const unmatched = edgeCards.filter((c) => findEdgeAbility(text(c.name)) === undefined).map((c) => text(c.name).trim().slice(0, 60) || "(no name)");
  if (matched.length > 0) left.add(`${words(matched.length, "Edge card")} matched an ability in our Edge table by name, so nothing needed bringing over: they are on the Edge panel and in the pilots' ability lists.`);
  if (unmatched.length > 0) left.add(`${words(unmatched.length, "Edge card")} matched nothing in our Edge table and were not imported: ${unmatched.join(", ")}. A pilot can still list such an ability as Other.`);
  const sorties = rows(library.scenarios, EXPORT_CAPS.cards).filter((c) => c.sample !== true).length;
  if (sorties > 0) left.add(`${words(sorties, "sortie record")} in the card library: our sorties belong to a campaign, so they were not imported.`);
  if (made.some((r) => r.kind === "aces-card" && r.combat.target?.keys.some((k) => k.token === "other"))) {
    left.add("Card lines the old app kept as free text (and any stat we have no word for) were kept as written, as our Other entries, so our rules check will ask you about them.");
  }
  return made.filter((r) => isAcesRecord(r));
}

// ---- The game in progress ------------------------------------------------------------------------------------------------

const GAME_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** The deck's name as the player records it ("Brawler", "Scout (Hover)") from the old deck id. */
const DECK_NAMES: Record<string, string> = {
  "ambusher-infantry": "Ambusher (Infantry)", brawler: "Brawler", "missile-boat": "Missile Boat", juggernaut: "Juggernaut", scout: "Scout", skirmisher: "Skirmisher", sniper: "Sniper", striker: "Striker",
  "scout-hover": "Scout (Hover)", "striker-hover": "Striker (Hover)", "skirmisher-jmps": "Skirmisher (JMPS)",
};
const deckNameOf = (id: unknown): string | undefined => (typeof id === "string" ? DECK_NAMES[id] : undefined);

function convertGame(game: Obj, player: unknown, cards: readonly AcesRecord[], at: string, left: Set<string>): { game?: AcesGame; units: AsUnit[] } {
  const rawId = safeId(game.id);
  const id = GAME_ID.test(rawId) ? `jbt-${rawId}` : "jbt-game";
  const states = new Map<string, Obj>(rows(game.unitStates, EXPORT_CAPS.units).flatMap((s) => (safeId(s.unitUUID) !== "" ? [[safeId(s.unitUUID), s] as [string, Obj]] : [])));
  const made: AsUnit[] = [];
  const uuidToGame = new Map<string, string>();
  const side = (which: "player" | "automated", members: Obj[]): { units: GameUnit[]; commanderUnitId?: string } => {
    const units: GameUnit[] = [];
    members.forEach((row) => {
      const unit = convertJbtUnit(row);
      if (!unit) return;
      made.push(unit);
      const gid = `${which === "player" ? "p" : "a"}${String(units.length + 1)}`;
      uuidToGame.set(safeId(row.uuid), gid);
      const skill = skillOf(row);
      units.push({
        id: gid,
        unitId: unit.id,
        name: unitTitle(unit),
        card: unit.card,
        skill,
        pv: skillAdjustedPv(unit.card.pv, skill),
        play: playOf(row, unit.card),
        flags: which === "automated" ? { automated: true } : {},
      });
    });
    const commander = uuidToGame.get(safeId(game.automatedCommanderUUID));
    return { units, ...(which === "automated" && commander ? { commanderUnitId: commander } : {}) };
  };
  const sides = { player: side("player", groupMembers(player)), automated: side("automated", groupMembers(game.automatedForce)) };

  const deckCards = cards.filter((r): r is AcesCard => r.kind === "aces-card");
  const seed = whole(isObject(game.rng) ? game.rng.seed : 0) >>> 0;
  const pending: { unit: GameUnit; key: string }[] = [];
  for (const unit of sides.automated.units) {
    const row = [...states.entries()].find(([uuid]) => uuidToGame.get(uuid) === unit.id)?.[1];
    if (!row) continue;
    const key = deckNameOf(row.deckId);
    if (row.isEmplacement !== true && key) {
      unit.deck = key;
      pending.push({ unit, key });
    }
    if (row.forcedWithdrawal === true) unit.flags.withdrawing = true;
    if (row.fleeing === true) unit.flags.fleeing = true;
    const carrier = uuidToGame.get(safeId(row.transportedBy));
    if (carrier) unit.flags.mountedIn = carrier;
  }
  const decks = buildDecks(pending.map((p) => ({ unitId: p.unit.id, deckKey: p.key, pv: p.unit.pv })), deckCards.map(toDeckCard), seed);
  const known = new Set(deckCards.map((c) => c.id));
  for (const p of pending) {
    const row = [...states.entries()].find(([uuid]) => uuidToGame.get(uuid) === p.unit.id)?.[1];
    const ids = row ? strings(row.cardIds, 12) : [];
    const mine = decks.decks.find((d: UnitDeck) => d.unitId === p.unit.id);
    if (mine && ids.length > 0 && ids.every((x) => known.has(x))) {
      const cycled = Math.max(0, whole(row?.cardsCycled));
      mine.cards = ids.map((cardId, i) => ({ id: cardId, flipped: i >= ids.length - cycled }));
    }
  }
  const tokens: AcesGame["tokens"] = {};
  for (const [uuid, row] of states) {
    const gid = uuidToGame.get(uuid);
    if (gid && row.token === "move-first") tokens.moveFirst = gid;
    if (gid && row.token === "move-last") tokens.moveLast = gid;
  }

  const commandCards = cards.filter((r): r is CommandCard => isCommandCard(r) && r.commander.toLowerCase() === text(game.commandDeck).trim().toLowerCase() && r.commander !== "");
  const sorted = [...commandCards].sort((a, b) => ACES_LETTERS.indexOf(a.letter) - ACES_LETTERS.indexOf(b.letter));
  const current = sorted.find((c) => c.id === text(game.commandCardId)) ?? sorted.find((c) => c.letter === letterOf(game.commandCard));
  const objectives = rows(game.objectives, 20);
  const movement = objectives.find((o) => o.type === "movement");
  const destroy = objectives.filter((o) => o.type === "destroy").map((o) => text(o.text).trim()).filter((t) => t !== "");
  const phases = ["initiative", "movement", "combat", "end"] as const;
  const phase = phases.find((p) => p === game.phase) ?? "initiative";
  const turn = Math.max(1, whole(game.turn));
  const limit = num1(game.turnLimit);
  const so = isObject(game.specialOrders) ? game.specialOrders : {};
  const result: AcesGame = {
    schema: 1,
    kind: "aces-game",
    id,
    name: text(game.name).trim() || "Imported game",
    seed,
    createdAt: at,
    rules: { ...DEFAULT_RULES, forcedWithdrawal: game.forcedWithdrawal === true ? "automated" : "none", acesVehicleTables: true },
    sides,
    command: { ...(sorted[0] ? { commander: sorted[0].commander } : {}), cardIds: sorted.map((c) => c.id), ...(current ? { current: current.id } : {}) },
    decks,
    supports: [],
    objectives: { ...(movement || so.movementObjective === true ? { movement: text(movement?.text).trim() || "Movement objective" } : {}), ...(destroy.length > 0 ? { destroy } : {}) },
    waypoints: rows(game.waypoints, 40).map((w, i) => ({ letter: text(w.label).trim() || String.fromCharCode(65 + (i % 26)), ...(num1(w.turn) === undefined ? {} : { turn: Math.round(num1(w.turn) ?? 0) }), done: w.resolved === true })),
    turn,
    phase,
    tokens,
    ...(limit !== undefined && limit > 0 ? { turnLimit: Math.round(limit) } : {}),
    sight: emptySheet(),
    log: strings(game.log, EXPORT_CAPS.log).map((t) => ({ turn, text: t })),
    undo: [],
  };
  if (!isAcesGame(result)) {
    left.add("The game in progress could not be rebuilt.");
    return { units: made };
  }
  const lines = [
    "Who won Initiative this turn and last (our game needs the totals).",
    "Which units had moved or attacked this turn.",
    "The link between the game and its campaign (open it from the campaign's sortie again).",
  ];
  if (rows(game.supportCards, 20).length > 0) lines.push("The Battlefield Support cards the automated force holds (the old app kept only their names; add them in your card library and pick them in a new game).");
  if (sides.automated.units.some((u) => u.deck !== undefined && !decks.decks.some((d: UnitDeck) => d.unitId === u.id && d.cards.length > 0))) lines.push("Decks for units whose behaviour cards you have not recorded.");
  left.add(`The game in progress was rebuilt at turn ${String(turn)}, ${phase} phase, without: ${lines.join(" ")}`);
  return { game: result, units: made };
}

// ---- The whole file ------------------------------------------------------------------------------------------------------

/** Every Alpha Strike unit in the file's forces that a roster line could name, whether or not the game uses it. */
export function poolUnits(file: Obj): AsUnit[] {
  const members = [...groupMembers(file.currentASForce), ...rows(file.favoriteASGroups, 40).flatMap((g) => rows(g.members, EXPORT_CAPS.units)), ...(isObject(file.acesGame) ? groupMembers(file.acesGame.automatedForce) : [])];
  const out = new Map<string, AsUnit>();
  for (const m of members.slice(0, EXPORT_CAPS.units * 4)) {
    const u = convertJbtUnit(m);
    if (u && !out.has(u.id)) out.set(u.id, u);
  }
  return [...out.values()];
}

/**
 * The cards, the game and the units of an Aces export. `used` says which of the file's force units the campaigns' rosters named, so
 * only those and the game's own units come over. Only the backup's Aces and force keys are read; nothing else in the file is touched.
 */
export function readAcesExport(file: Obj, used: ReadonlySet<string>, at: string): AcesExportRead {
  const left = new Set<string>();
  const cards = convertJbtLibrary(file.acesCardLibrary, at, left);
  const units = new Map<string, AsUnit>();
  for (const u of poolUnits(file)) if (used.has(u.id)) units.set(u.id, u);
  const games: AcesGame[] = [];
  if (isObject(file.acesGame) && isObject(file.acesGame.automatedForce)) {
    const built = convertGame(file.acesGame, file.currentASForce, cards, at, left);
    if (built.game) {
      games.push(built.game);
      for (const u of built.units) units.set(u.id, u);
    }
  } else if (isObject(file.acesGame) && Object.keys(file.acesGame).length > 0) {
    left.add("The game in progress holds no automated force, so it was not imported.");
  }
  if (Array.isArray(file.favoriteASGroups) && file.favoriteASGroups.length > 0) left.add("Saved Alpha Strike lances and forces other than those your campaigns and game use (import a unit from the Master Unit List or Mordel instead).");
  if (Array.isArray(file.acesCampaigns) === false && file.acesCampaigns !== undefined) left.add("The campaigns list was not in a form we could read.");
  return { units: [...units.values()], cards, games, left: [...left] };
}

/** The whole file: the campaigns (roster lines matched to units found in the file), then the cards, the game and the units. */
export function readAcesExportFile(file: Obj, have: readonly AsUnit[], at: string): { campaigns: JbtResult; rest: AcesExportRead } {
  const pool = poolUnits(file);
  const campaigns = convertJbtBackup(file, [...have, ...pool]);
  const poolIds = new Set(pool.map((u) => u.id));
  const used = new Set(campaigns.campaigns.flatMap((c) => c.campaign.roster.map((r) => r.unitId)).filter((id) => poolIds.has(id)));
  return { campaigns, rest: readAcesExport(file, used, at) };
}
