// The tables of the Gothic rules reference, built from data/gothic.ts and the catalog. Headings and the one line of purpose are our own
// words; every figure is read from the data (nothing is typed in here), and every table names its pages.
import { bookName } from "../../data/editions";
import {
  ABOM_CLASSES,
  ABOM_WEAPON_CITE,
  ABOM_WEAPON_ROWS,
  ABOMINATION_ONLY_INITIATIVE,
  CONDITION_NAMES,
  DAZZLE,
  DAZZLE_FRAYED,
  DEFAULT_SKILLS,
  FLAMER,
  FORTIFIED,
  FRAYED,
  GOTHIC_BOOK,
  HANDLER,
  HEX_STACK_WEIGHT,
  HOBBLE_LOCATIONS,
  ID_DISTANCE_BANDS,
  ID_CITE,
  ID_FLAGS,
  ID_RANGE,
  LOCATION_NAMES,
  MOB_HOBBLE_CITE,
  MOB_HOBBLE_MODIFIERS,
  MOB_LOCATIONS,
  PLANETARY_CONDITIONS,
  RANDOM_CREATURE,
  RANDOM_CREATURE_CITE,
  SEARCHLIGHT,
  ULTRAVIOLET,
} from "../../data/gothic";
import type { GothicCite, HitLocation, UvEffect } from "../../data/gothic";
import type { Catalog } from "../../rules/catalog";

export interface AidTable {
  id: string;
  title: string;
  /** At most one sentence of ours: what the table is for. */
  purpose?: string;
  head: string[];
  rows: string[][];
  cites: GothicCite[];
}

const MINUS = "−";
const DASH = "—";
const sign = (n: number) => (n > 0 ? `+${String(n)}` : n < 0 ? `${MINUS}${String(-n)}` : "0");
const span = (from: number, to: number) => (from >= to ? String(to) : `${String(from)}–${String(to)}`);

/** "Catalyst Game Labs" style: the book with its publisher, then the pages, as the rest of the app cites. */
export function citeText(cites: readonly GothicCite[]): string {
  const books = [...new Set(cites.map((c) => c.book))];
  return books
    .map((book) => {
      const pages = cites.filter((c) => c.book === book).map((c) => c.page);
      return `${bookName(book)}, ${pages.length > 1 ? "pp." : "p."} ${[...new Set(pages)].join(", ")}`;
    })
    .join("; ");
}

/** A weapon's band as the book prints it: short 1 to S, medium S+1 to M, long M+1 to L, a dash where the weapon has none. */
function bands(range: readonly number[]): [string, string, string, string] {
  const [min = 0, s = 0, m = 0, l = 0] = range;
  return [min > 0 ? String(min) : DASH, s > 0 ? span(1, s) : DASH, m > s ? span(s + 1, m) : DASH, l > m ? span(m + 1, l) : DASH];
}

const uv = (effect: UvEffect) => (effect === "ignore" ? "Ignored" : effect === 0 ? DASH : effect < 0 ? `${sign(effect)} (min 0)` : sign(effect));
const location = (code: HitLocation) => LOCATION_NAMES[code];

export function aidTables(catalog?: Catalog): AidTable[] {
  const weaponRows = catalog
    ? ABOM_WEAPON_ROWS.flatMap(({ group, ids }) =>
        ids.flatMap((id) => {
          const row = catalog.rowFor(id, "gothic");
          return row ? [[group, row.name, row.damage ?? DASH, ...bands(row.range ?? [])]] : [];
        }),
      )
    : [];
  const flamerHeat = catalog?.rowFor(FLAMER.flamerId, "gothic")?.damage;
  const lastMob = MOB_HOBBLE_MODIFIERS[MOB_HOBBLE_MODIFIERS.length - 1]?.creatures ?? 0;
  const stackCite: GothicCite = { book: GOTHIC_BOOK, page: 69 };
  const idBands = ID_DISTANCE_BANDS.filter((band) => band.modifier !== 0);

  return [
    {
      id: "classes",
      title: "Size classes",
      purpose: "Figures for each class, and what one hex holds.",
      head: ["Class", "Creatures", "Pip rows", "Height", "Bonus TMM", "Stack limit", "Stack weight", "Facing"],
      rows: [
        ...ABOM_CLASSES.map((c) => [c.label, String(c.maxCreatures), String(c.rows), String(c.height), sign(c.bonusTmm), String(c.stackLimit), String(c.stackWeight), c.facing ? "Declared" : "None"]),
        ["One hex", "", "", "", "", "", String(HEX_STACK_WEIGHT), ""],
      ],
      cites: [...new Set(ABOM_CLASSES.map((c) => c.cite.page))].map((page) => ({ book: GOTHIC_BOOK, page })).concat(stackCite),
    },
    {
      id: "weapons",
      title: "Abomination-mounted weapons",
      purpose: "Damage and range bands; none of them makes heat.",
      head: ["Kind", "Weapon", "Damage", "Min", "Short", "Medium", "Long"],
      rows: weaponRows,
      cites: [ABOM_WEAPON_CITE],
    },
    {
      id: "creature",
      title: "Random Creature Number",
      purpose: "Roll down, creatures across.",
      head: ["1D6 / creatures", ...[1, 2, 3, 4, 5, 6].map(String)],
      rows: RANDOM_CREATURE.map((line, i) => [String(i + 1), ...line.map((v) => (v === "reroll" ? "Reroll" : String(v)))]),
      cites: [RANDOM_CREATURE_CITE],
    },
    {
      id: "mob-modifiers",
      title: "Mob and Hobble modifiers",
      head: ["Creatures", "Mob", "Hobble"],
      rows: MOB_HOBBLE_MODIFIERS.map((m) => [m.creatures === lastMob ? `${String(m.creatures)}–${String(ABOM_CLASSES[0]?.maxCreatures ?? m.creatures)}` : String(m.creatures), sign(m.mob), sign(m.hobble)]),
      cites: [MOB_HOBBLE_CITE],
    },
    {
      id: "mob-locations",
      title: "Mob hit locations",
      purpose: "2D6, by the 'Mech's build.",
      head: ["2D6", "Biped", "Four-legged"],
      rows: MOB_LOCATIONS.map(([biped, quad], i) => [String(i + 2), location(biped), location(quad)]),
      cites: [MOB_HOBBLE_CITE],
    },
    {
      id: "hobble-locations",
      title: "Hobble hit locations",
      purpose: "1D6, by the 'Mech's build.",
      head: ["1D6", "Biped", "Four-legged"],
      rows: HOBBLE_LOCATIONS.map(([biped, quad], i) => [String(i + 1), location(biped), location(quad)]),
      cites: [MOB_HOBBLE_CITE],
    },
    {
      id: "identification",
      title: "Abomination Identification",
      head: ["Condition", "Modifier"],
      rows: [
        ["Range in hexes", String(ID_RANGE)],
        ...idBands.map((b) => [b.to === null ? `Target ${String(b.from)}+ hexes away` : b.from === 0 ? "Same or adjacent hex" : `Target ${span(b.from, b.to)} hexes away`, sign(b.modifier)]),
        ["Target has attacked the spotter", sign(ID_FLAGS.targetAttackedSpotter)],
        ["Spotter has a Handler", sign(ID_FLAGS.spotterHasHandler)],
        ["Spotter is an Abomination", sign(ID_FLAGS.spotterIsAbomination)],
      ],
      cites: [ID_CITE],
    },
    {
      id: "conditions",
      title: "Planetary conditions",
      head: ["Condition", "MP per hex", "Weapon", "Physical", "Heat per −1"],
      rows: PLANETARY_CONDITIONS.flatMap((c) => c.ids.map((id) => [CONDITION_NAMES[id], `+${String(c.mp)}`, sign(c.weapon), sign(c.physical), String(c.heatPerStep)])),
      cites: [...new Set(PLANETARY_CONDITIONS.map((c) => c.cite.page))].map((page) => ({ book: GOTHIC_BOOK, page })),
    },
    {
      id: "ultraviolet",
      title: "Ultraviolet sensitivity",
      head: ["Condition", "Abominations", "Frayed pilot's 'Mech"],
      rows: ULTRAVIOLET.flatMap((u) => u.ids.map((id) => [CONDITION_NAMES[id], uv(u.abomination), uv(u.frayed)])),
      cites: [...new Set(ULTRAVIOLET.map((u) => u.cite.page))].map((page) => ({ book: GOTHIC_BOOK, page })),
    },
    {
      id: "scenario",
      title: "Searchlights and fortified hexes",
      head: ["Item", "Figure"],
      rows: [
        ["Searchlight: darkness modifiers", sign(-SEARCHLIGHT.reduction)],
        ["Searchlight breaks on 2D6", `${String(SEARCHLIGHT.breaksOn)}+`],
        [`Fortified hex: ${FORTIFIED.classes.map((id) => ABOM_CLASSES.find((c) => c.id === id)?.label ?? id).join(" and ")} at ground level`, sign(FORTIFIED.modifier)],
      ],
      cites: [SEARCHLIGHT.cite],
    },
    {
      id: "dazzle",
      title: "Dazzle Mode and flamers",
      head: ["Item", "Figure"],
      rows: [
        ["Dazzle: laser heat", `÷${String(DAZZLE.heatDivisor)}, min ${String(DAZZLE.minHeat)}`],
        ["Dazzle: laser damage to a 'Mech", `÷${String(DAZZLE.damageDivisor)}, min ${String(DAZZLE.minDamage)}`],
        ["Dazzle head hit on a Frayed pilot: damage", String(DAZZLE_FRAYED.pilotDamage)],
        ["Dazzle head hit on a Frayed pilot: Consciousness rolls", String(DAZZLE_FRAYED.consciousnessRolls)],
        ...(flamerHeat === undefined ? [] : [["Flamer heat to a 'Mech", flamerHeat]]),
        ["Flamer hit on an Abomination", `${FLAMER.againstAbomination}, in groups of ${String(FLAMER.clusterSize)}`],
      ],
      cites: [DAZZLE.cite],
    },
    {
      id: "skills",
      title: "Skills, Frayed pilots and Handlers",
      head: ["Item", "Figure"],
      rows: [
        ["Abomination unit: Gunnery", String(DEFAULT_SKILLS.gunnery)],
        ["Abomination unit: AniMelee", String(DEFAULT_SKILLS.animelee)],
        ["Abominations only: Initiative", sign(ABOMINATION_ONLY_INITIATIVE)],
        ["MechWarrior: Gunnery", String(DEFAULT_SKILLS.mechwarriorGunnery)],
        ["MechWarrior: Piloting", String(DEFAULT_SKILLS.mechwarriorPiloting)],
        ["Frayed: Gunnery", sign(FRAYED.gunnery)],
        ["Frayed: Piloting", sign(FRAYED.piloting)],
        ["Frayed: Initiative", sign(FRAYED.initiative)],
        ["Handler: skills of allied units", sign(HANDLER.skillBonus)],
        ["Handler: units per Handler", String(HANDLER.maxUnits)],
        ["Handler: 'Mech tons, at least", String(HANDLER.minMechTons)],
      ],
      cites: [DEFAULT_SKILLS.cite, { book: GOTHIC_BOOK, page: 7 }, FRAYED.cite, HANDLER.cite],
    },
  ];
}
