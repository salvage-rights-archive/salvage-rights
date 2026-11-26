// The force composition tables of Alpha Strike: Commander's Edition, printed page 124 (company, binary/trinary, battalion, cluster and Level
// III): what a higher group is built of, as a count range for each kind of smaller group. Figures, names and the page only, read against the
// page image; the notes are ours. The check that runs them is in rules/as-composition.ts. Nothing here runs.
import { AS_FORMATIONS } from "./as-formations";

export const AS_COMPOSITION_PAGE = 124;

/**
 * Which smaller group fills a row. Every field set must hold: the group's formation type is one of `formations`, its organisation one of
 * `orgs`, every unit in it one of `types`. The first row of a table that a group fits is the one it fills.
 */
export interface AsChildMatch {
  formations?: string[];
  orgs?: string[];
  types?: string[];
}

export interface AsCompositionRow {
  id: string;
  /** The name the table gives the row, singular as the check reads it. */
  label: string;
  section: "core" | "detachment";
  min: number;
  max: number;
  match: AsChildMatch;
  /** At most this many for every core row of another kind (the book's "only 1 Support Lance per 1 core non-Support Lance"). */
  perCore?: number;
  /** The row also takes all-BattleMech groups when the core is vehicle groups (the footnotes of the company and battalion tables, p. 124). */
  orMechs?: true;
}

export interface AsComposition {
  id: string;
  name: string;
  /** The organisations (`AS_ORGANISATIONS` ids) the table is for. */
  orgs: string[];
  /** How many smaller groups the core is in all, by organisation id, from the table's note. */
  core: Record<string, [min: number, max: number]>;
  /** What the core is counted in, for the check's wording. */
  coreName: string;
  rows: AsCompositionRow[];
}

const names = (...prefixes: string[]): string[] => AS_FORMATIONS.filter((f) => f.line === "ground" && prefixes.some((p) => f.id === p || f.id.startsWith(`${p}-`))).map((f) => f.id);
const BASIC = names("battle", "assault", "striker", "fire", "recon", "pursuit");
const COMMAND = ["command", "command-vehicle"];
const VEHICLES = ["CV", "SV"];
const FIGHTERS = ["AF", "CF"];

const row = (id: string, label: string, section: AsCompositionRow["section"], min: number, max: number, match: AsChildMatch, perCore?: number): AsCompositionRow => ({
  id, label, section, min, max, match, ...(perCore === undefined ? {} : { perCore }),
});

/** The five tables of p. 124, the Binary/Trinary table standing for both of its organisations (and their Nova versions). */
export const AS_COMPOSITIONS: AsComposition[] = [
  {
    id: "company", name: "Company", orgs: ["is-company"], coreName: "lances", core: { "is-company": [2, 4] },
    rows: [
      row("command", "Command Lance", "core", 0, 1, { formations: COMMAND }),
      row("support", "Support Lance", "core", 0, 2, { formations: ["support"] }, 1),
      row("lances", "Battle, Assault, Striker, Fire, Recon or Pursuit Lance", "core", 1, 4, { formations: BASIC }),
      row("inf", "Conventional Infantry Platoon", "detachment", 0, 6, { types: ["CI"] }),
      row("ba", "Battle Armor Squad", "detachment", 0, 4, { types: ["BA"] }),
      { ...row("vehicle", "Vehicle Lance (a BattleMech Lance when the core is vehicle lances)", "detachment", 0, 3, { types: VEHICLES }), orMechs: true },
      row("aero", "Aerospace Squadron", "detachment", 0, 1, { types: FIGHTERS }),
    ],
  },
  {
    id: "binary", name: "Binary or Trinary", orgs: ["clan-binary", "clan-trinary", "clan-supernova-binary", "clan-supernova-trinary"], coreName: "Stars",
    core: { "clan-binary": [2, 2], "clan-supernova-binary": [2, 2], "clan-trinary": [3, 3], "clan-supernova-trinary": [3, 3] },
    rows: [
      row("command", "Command Star", "core", 0, 1, { formations: COMMAND }),
      row("support", "Support Star", "core", 0, 1, { formations: ["support"] }),
      row("stars", "Battle, Assault, Striker, Fire, Recon or Pursuit Star", "core", 1, 3, { formations: BASIC }),
      row("ba", "Battle Armor Point", "detachment", 0, 5, { types: ["BA"] }),
      row("vehicle", "Vehicle Star", "detachment", 0, 1, { types: VEHICLES }),
      row("aero", "Aerospace Star", "detachment", 0, 1, { types: FIGHTERS }),
    ],
  },
  {
    id: "battalion", name: "Battalion", orgs: ["is-battalion"], coreName: "companies", core: {},
    rows: [
      row("command", "Command Lance", "core", 0, 1, { formations: COMMAND }),
      { ...row("vehicle-co", "Vehicle Company (a BattleMech Company when the core is vehicle companies)", "detachment", 0, 3, { orgs: ["is-company"], types: VEHICLES }), orMechs: true },
      row("companies", "Ground Force Company", "core", 3, 4, { orgs: ["is-company"] }),
      row("inf", "Conventional Infantry Company", "detachment", 0, 6, { types: ["CI"] }),
      row("ba", "Battle Armor Platoon", "detachment", 0, 4, { types: ["BA"] }),
      row("aero", "Aerospace Squadron", "detachment", 0, 3, { types: FIGHTERS }),
    ],
  },
  {
    id: "cluster", name: "Cluster", orgs: ["clan-cluster"], coreName: "Binaries and Trinaries", core: {},
    rows: [
      row("binaries", "Binary or Trinary", "core", 3, 5, { orgs: ["clan-binary", "clan-trinary", "clan-supernova-binary", "clan-supernova-trinary"] }),
      row("ba", "Battle Armor Star", "detachment", 0, 2, { types: ["BA"] }),
      row("vehicle", "Vehicle Star", "detachment", 0, 3, { types: VEHICLES }),
      row("aero", "Aerospace Star", "detachment", 0, 3, { types: FIGHTERS }),
    ],
  },
  {
    id: "level-3", name: "Level III", orgs: ["cs-level-3"], coreName: "Level IIs", core: { "cs-level-3": [6, 6] },
    rows: [
      row("command", "Command Level II", "core", 0, 1, { formations: COMMAND }),
      row("support", "Support Level II", "core", 0, 1, { formations: ["support"] }),
      row("level-2", "Battle, Assault, Striker, Fire, Recon or Pursuit Level II", "core", 4, 6, { formations: BASIC }),
      row("aero", "Aerospace Level II", "detachment", 0, 3, { types: FIGHTERS }),
    ],
  },
];

/** The table for an organisation, if the book gives one. */
export const compositionFor = (orgId: string | undefined): AsComposition | undefined => AS_COMPOSITIONS.find((c) => orgId !== undefined && c.orgs.includes(orgId));
