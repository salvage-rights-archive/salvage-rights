// Converting a Classic 'Mech, part four: the special abilities its equipment, armor, structure, engine and cockpit earn (Alpha Strike
// Companion pp. 116-133, errata v1.6). Pure functions over the record, the catalog and the conversion so far. Each ability carries the
// working that earned it (our own short wording and the page); an item the record holds that earns an ability the book gives no figure
// for here is a finding, never a guess. Abilities that need the weapon damage (AC, LRM, SRM, IF and the rest) are worked out from the
// damage lines of part two with the heat of part three.
import {
  ALSO_EARNS,
  ARMOR_SPECIALS,
  ARTILLERY_CITE,
  ARTILLERY_CODES,
  BAR_CITE,
  CASE_RULE,
  COCKPIT_SPECIALS,
  DAMAGE_SPECIALS,
  ENE_CITE,
  ENGINE_SPECIALS,
  EQUIPMENT_SPECIALS,
  EXPLOSIVE,
  HARJEL,
  HEAT_RULE,
  HEAT_WEAPONS,
  INDUSTRIAL_ENV,
  JUMP_CITE,
  LARGE,
  MELEE_CITE,
  MELEE_IDS,
  MHQ_CITE,
  MHQ_ITEMS,
  NOT_CONVERTED,
  OMNI_CITE,
  OVL_CITE,
  STEALTH_IDS,
  TURRET_IDS,
} from "../data/as-convert-specials";
import type { AscCite } from "../data/as-convert";
import { convertMovementHeat, finalAbilityDamage, heatModifiedDamage } from "./as-convert";
import type { Finding, HeatRange, HeatState, MechConversion, RangeSet, Step, Working, WeaponLine } from "./as-convert";
import { formatDamage, formatSpecial } from "./as-unit";
import type { AsDamage, AsSpecial } from "./as-unit";
import type { Catalog } from "./catalog";
import type { MechRecord } from "./mech";
import { equipmentItems, tidy } from "./walk";
import type { Item } from "./walk";

const make = (code: string, values: string[] = []): AsSpecial => {
  const special: AsSpecial = { code, values, raw: "" };
  return { ...special, raw: formatSpecial(special) };
};
const fmt = (x: number) => String(tidy(x));
const dmgText = (d: AsDamage) => formatDamage(d);

interface Earned {
  special: AsSpecial;
  because: string;
  cite: AscCite;
}

/** The special abilities a 'Mech record earns, sorted by code as a card prints them. The value is null only when a step the damage
 * abilities need (weapon damage, heat) has no value; the abilities that do not need it are still returned in `value` when it is not. */
export function convertSpecials(record: MechRecord, catalog: Catalog, conversion: MechConversion): Step<AsSpecial[]> {
  const working: Working[] = [];
  const findings: Finding[] = [];
  const earned = new Map<string, Earned>();
  const add = (special: AsSpecial, because: string, cite: AscCite) => {
    if (earned.has(special.code)) return;
    earned.set(special.code, { special, because, cite });
    working.push({ step: "special", rule: `${special.raw}: ${because}`, detail: "", cite });
  };
  const { items } = equipmentItems(record, catalog);
  const count = (ids: string[]) => items.filter((i) => ids.includes(i.row.id)).length;
  const hasAny = (ids: string[]) => count(ids) > 0;
  const card = conversion.unit.card;
  const industrial = card.type === "IM";

  // ---- Equipment tables ----
  for (const entry of EQUIPMENT_SPECIALS) {
    const n = count(entry.ids);
    if (n === 0) continue;
    if (entry.count === "always") add(make(entry.code, [fmt(n * (entry.each ?? 1))]), entry.because, entry.cite);
    else if (entry.count === "numberFromTwo") add(make(entry.code, n >= 2 ? [String(n)] : []), entry.because, entry.cite);
    else add(make(entry.code), entry.because, entry.cite);
  }
  for (const also of ALSO_EARNS) {
    if (!hasAny(also.from)) continue;
    for (const code of also.adds) add(make(code), `it comes with ${code === "RCN" ? "the equipment" : "the system"} that earns it (${also.from[0] ?? ""})`, also.cite);
  }
  if (hasAny(MELEE_IDS)) add(make("MEL"), "a melee item (having more than one adds nothing)", MELEE_CITE);
  if (hasAny(STEALTH_IDS)) add(make("STL"), "a stealth system", ARMOR_SPECIALS.stealth!.cite);

  // ---- Armor, engine, cockpit, size ----
  const armorSpecial = Object.hasOwn(ARMOR_SPECIALS, record.chassis.armorType) ? ARMOR_SPECIALS[record.chassis.armorType] : undefined;
  if (armorSpecial) {
    if (armorSpecial.code === "BAR" && (card.armor ?? 0) === 0) working.push({ step: "special", rule: "no BAR: a unit with 0 Armor does not receive it", detail: "", cite: BAR_CITE });
    else add(make(armorSpecial.code), `${record.chassis.armorType} armor`, armorSpecial.cite);
  }
  const engine = Object.hasOwn(ENGINE_SPECIALS, record.chassis.engine.type) ? ENGINE_SPECIALS[record.chassis.engine.type] : undefined;
  if (engine) add(make(engine.code), `${record.chassis.engine.type} engine`, engine.cite);
  const cockpit = Object.hasOwn(COCKPIT_SPECIALS, record.chassis.cockpit) ? COCKPIT_SPECIALS[record.chassis.cockpit] : undefined;
  if (cockpit && (industrial || cockpit.code === "DN")) add(make(cockpit.code), `${record.chassis.cockpit} cockpit`, cockpit.cite);
  if (industrial && !cockpit) add(make("BFC"), "an IndustrialMech without advanced fire control", COCKPIT_SPECIALS.industrial!.cite);
  if (record.tons > LARGE.overTons) add(make(LARGE.code), `a 'Mech over ${String(LARGE.overTons)} tons`, LARGE.cite);
  if (record.omni !== undefined) add(make("OMNI"), "an OmniMech configuration", OMNI_CITE);
  if (industrial && hasAny(INDUSTRIAL_ENV.seal)) {
    add(make("SEAL"), "environmental sealing", INDUSTRIAL_ENV.cite);
    if (INDUSTRIAL_ENV.soaEngines.includes(record.chassis.engine.type)) add(make("SOA"), "sealing and a fusion, fission or fuel cell engine", INDUSTRIAL_ENV.soa);
  }
  if (industrial && hasAny(["ejection-seat-is", "ejection-seat-clan"])) add(make("ES"), "an ejection seat on an IndustrialMech", EQUIPMENT_SPECIALS[0]!.cite);

  // HarJel in the center, left and right torso.
  for (const [code, ids] of [["BHJ3", HARJEL.BHJ3], ["BHJ2", HARJEL.BHJ2], ["BHJ", HARJEL.BHJ]] as const) {
    if (HARJEL.locations.every((l) => items.some((i) => ids.includes(i.row.id) && i.mount.location === l))) {
      add(make(code), "HarJel in the center, left and right torso", HARJEL.cite);
      break;
    }
  }

  // The movement step's own specials: jump and underwater TMM, and Overheat Long.
  const jump = conversion.earned.jump;
  if (jump) add(make(jump.code, [String(jump.value)]), "a jump Move whose TMM differs from the ground TMM", JUMP_CITE);
  const sub = conversion.earned.submersible;
  if (sub) add(make(sub.code, [String(sub.value)]), "an underwater Move whose TMM is higher than the ground TMM", JUMP_CITE);
  if (conversion.earned.ovl) add(make("OVL"), "the Long-range heat check", OVL_CITE);

  // Mobile headquarters: the points of the listed items, rounded down.
  const mhq = MHQ_ITEMS.reduce((sum, entry) => sum + items.filter((i) => entry.ids.includes(i.row.id)).reduce((s, i) => s + entry.points * (entry.perTon ? (i.tons ?? 0) : 1), 0), 0);
  if (Math.floor(tidy(mhq)) >= 1) add(make("MHQ", [String(Math.floor(tidy(mhq)))]), `${fmt(mhq)} points of mobile headquarters equipment, rounded down`, MHQ_CITE);

  // ---- Explosive components: CASE and ENE ----
  const explosive = explosiveComponents(items);
  const listsCase = hasAny(CASE_RULE.ids);
  if (record.techBase === "clan") {
    if (explosive.length > 0) add(make("CASE"), `a Clan 'Mech with explosive components (${explosive[0] ?? ""})`, CASE_RULE.cite);
  } else if (listsCase) {
    add(make("CASE"), "it lists CASE", CASE_RULE.cite);
    if (record.techBase === "mixed") findings.push({ code: "case-mixed", part: "mixed technology", message: "A mixed-technology 'Mech might also get CASE for Clan explosive components; the book does not say how to tell, so we gave it only for a CASE item.", cite: CASE_RULE.cite });
  }
  if (explosive.length === 0) add(make("ENE"), "no explosive components", ENE_CITE);

  // ---- Heat (HT) from the heat-generating weapons table ----
  const lines = conversion.weapons?.all ?? [];
  const heatTotals: [number, number, number] = [0, 0, 0];
  for (const line of lines) {
    const row = HEAT_WEAPONS[line.tableRow.slice(line.tableRow.indexOf(": ") + 2)];
    if (row) for (let i = 0; i < 3; i += 1) heatTotals[i] = (heatTotals[i] ?? 0) + (row[i] ?? 0);
  }
  if (heatTotals.some((t) => t >= HEAT_RULE.oneAt)) {
    const rating = (t: number) => (t >= HEAT_RULE.twoAt ? 2 : t >= HEAT_RULE.oneAt ? 1 : 0);
    add(make("HT", heatTotals.map((t) => String(rating(t)))), `heat-generating weapons: ${heatTotals.join("/")} at Short, Medium, Long`, HEAT_RULE.cite);
  }

  // ---- Artillery, turrets and what the book gives no figure for here ----
  const artillery = new Map<string, number>();
  for (const i of items) {
    const code = Object.hasOwn(ARTILLERY_CODES, i.row.id) ? ARTILLERY_CODES[i.row.id] : undefined;
    if (code !== undefined) artillery.set(code, (artillery.get(code) ?? 0) + 1);
  }
  for (const [code, n] of artillery) add(make(`ART${code}`, [String(n)]), `${String(n)} artillery weapon${n === 1 ? "" : "s"}`, ARTILLERY_CITE);
  if (hasAny(TURRET_IDS)) findings.push({ code: "turret", part: "turret", message: "A turret's own attack values are a special ability (TUR) whose figures need each weapon's mount; we do not work them out, so add TUR by hand.", cite: DAMAGE_SPECIALS.AC.cite });
  for (const n of NOT_CONVERTED) {
    if (n.code === "MASH" && hasAny(n.ids)) findings.push({ code: "mash", part: "MASH equipment", message: "The MASH ability's number is the operating theatres in the unit's specs, which our record does not hold; add MASH by hand.", cite: n.cite });
  }

  // ---- Damage abilities ----
  const heat = conversion.heat;
  const weapons = conversion.weapons;
  if (weapons && heat) {
    const state = heat.state;
    const abilityFor = (code: string, pick: (l: WeaponLine) => RangeSet | null, own?: HeatState) => {
      const sums = { short: 0, medium: 0, long: 0 };
      let any = false;
      for (const l of weapons.lines) {
        const r = pick(l);
        if (r === null) continue;
        any = true;
        for (const k of ["short", "medium", "long"] as const) sums[k] = tidy(sums[k] + r[k]);
      }
      if (!any) return null;
      const s = own ?? state;
      const modified = (k: "short" | "medium" | "long") => heatModifiedDamage(sums[k], k as HeatRange, s) ?? 0;
      void code;
      return { sums, modified };
    };

    for (const code of ["AC", "LRM", "SRM", "IATM"] as const) {
      const spec = DAMAGE_SPECIALS[code];
      const result = abilityFor(code, (l) => {
        if (!l.notes.includes(spec.note)) return null;
        if (/\bMML\b/.test(l.tableRow)) {
          // MMLs give some of their damage to each: Long to LRM, Short to SRM, and half the Medium to both (errata v1.6, pp. 126, 131).
          if (code === "LRM") return { short: 0, medium: tidy(l.plain.medium / 2), long: l.plain.long, extreme: 0 };
          if (code === "SRM") return { short: l.plain.short, medium: tidy(l.plain.medium / 2), long: 0, extreme: 0 };
        }
        return l.plain;
      });
      if (!result) continue;
      if (spec.needsMedium && result.modified("medium") < 1) continue;
      const finals = (["short", "medium", "long"] as const).map((k) => finalAbilityDamage(result.modified(k)));
      if (finals.every((d) => d === null)) continue;
      add(make(code, finals.map(dmgText)), `${spec.note} weapons, heat-modified and rounded normally`, spec.cite);
    }
    const ifResult = abilityFor("IF", (l) => (l.notes.includes("Indirect Fire") ? l.plain : null));
    if (ifResult) {
      const long = finalAbilityDamage(ifResult.modified("long"));
      if (long) add(make("IF", [dmgText(long)]), "indirect-fire weapons: their Long-range damage, left-most value", DAMAGE_SPECIALS.IF.cite);
    }

    // Flak and rear weapons are a separate attack with their own heat (errata v1.6, pp. 124, 129).
    const movementHeat = convertMovementHeat(record, catalog).value ?? 0;
    const separate = (list: WeaponLine[]): HeatState => {
      const output = tidy(list.reduce((s, l) => s + l.heat, 0) + movementHeat);
      return { ...state, output, longOutput: output, reduces: output - 4 > state.dissipation };
    };
    const flak = weapons.lines.filter((l) => l.notes.includes("Flak"));
    if (flak.length > 0) {
      const own = separate(flak);
      const r = abilityFor("FLK", (l) => (l.notes.includes("Flak") ? l.damage : null), own);
      const finals = r ? (["short", "medium", "long"] as const).map((k) => finalAbilityDamage(r.modified(k))) : [];
      if (finals.some((d) => d !== null)) add(make("FLK", finals.map(dmgText)), "Flak weapons as a separate attack with their own heat", DAMAGE_SPECIALS.FLK.cite);
    }
    const rearLines = weapons.all.filter((l) => l.rear);
    if (rearLines.length > 0) {
      const own = separate(rearLines);
      const sums = { short: 0, medium: 0, long: 0 };
      for (const l of rearLines) for (const k of ["short", "medium", "long"] as const) sums[k] = tidy(sums[k] + l.damage[k]);
      const finals = (["short", "medium", "long"] as const).map((k) => finalAbilityDamage(heatModifiedDamage(sums[k], k, own) ?? 0));
      if (finals.some((d) => d !== null)) add(make("REAR", finals.map(dmgText)), "rear-firing weapons as a separate attack with their own heat", DAMAGE_SPECIALS.REAR.cite);
    }
    const rel = weapons.lines.filter((l) => l.notes.includes("REL"));
    if (rel.length > 0) {
      const r = abilityFor("REL", (l) => (l.notes.includes("REL") ? l.damage : null));
      if (r && r.modified("medium") >= 1) add(make("REL"), "re-engineered lasers delivering 1 or more at Medium range", DAMAGE_SPECIALS.REL.cite);
    }
  } else if (weapons === null || heat === null) {
    findings.push({ code: "specials-need-damage", part: "damage abilities", message: "The damage abilities (AC, LRM, SRM, IF, FLK, REAR and the like) start from the weapon damage and heat steps, which have no value yet, so we left them out." });
  }

  const specials = [...earned.values()].map((e) => e.special).sort((a, b) => a.code.localeCompare(b.code));
  return { value: specials, working, findings };
}

/** The explosive components the record carries (names, for the working). */
function explosiveComponents(items: Item[]): string[] {
  const out: string[] = [];
  for (const i of items) {
    const id = i.row.id;
    if (i.row.kind === "ammunition") {
      if (!EXPLOSIVE.ammoNot.some((s) => id.includes(s))) out.push(i.mount.name);
    } else if (EXPLOSIVE.weaponStems.some((s) => id.includes(s)) || EXPLOSIVE.weaponIds.includes(id) || EXPLOSIVE.items.includes(id)) {
      out.push(i.mount.name);
    }
  }
  return out;
}
