// The printable record sheet of Abomination units (BattleTech: Gothic): up to five unit blocks down the left and the four printed
// tables (as figures) down the right, drawn in our own layout as one SVG of 1700 by 2200 units, like the 'Mech sheet. The arrangement
// follows the form of the Gothic Deluxe Record Sheets (pages 33 to 38 by PDF index), which are flagged for personal copying; no logo,
// no art, no fonts or wording of theirs. Pure: it reads only its props. The sheet is paper: white, with black ink.
import { useId } from "react";
import { ABOM_CLASSES, HOBBLE_LOCATIONS, MOB_HOBBLE_MODIFIERS, MOB_LOCATIONS, RANDOM_CREATURE } from "../../data/gothic";
import type { AbomClassId, HitLocation } from "../../data/gothic";
import { paginate, unitStats } from "../../rules/abomination";
import type { AbominationUnit, UnitStats } from "../../rules/abomination";
import type { Catalog } from "../../rules/catalog";
import Frame from "../sheet/Frame";
import type { Rect } from "../sheet/Frame";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import { FAINT, INK, MIN_SIZE, squeeze } from "../sheet/text";

export const ABOM_SHEET_WIDTH = 1700;
export const ABOM_SHEET_HEIGHT = 2200;
/** Unit blocks on one page. */
export const UNITS_PER_PAGE = 5;

const BLOCK = { x: 30, y: 190, w: 1080, h: 355, step: 385 };
const TABLES_X = 1140;
const TABLES_W = 530;
/** Pips in a blank tracker row: the printed blank sheets draw about this many. */
const BLANK_PIPS = 22;
/** The edition the weapon figures are read for. */
const EDITION = "gothic";

const HIT_NAMES: Record<HitLocation, string> = {
  HD: "Head", "CT-F": "Front CT", "CT-R": "Rear CT", "RT-F": "Front RT", "RT-R": "Rear RT", "LT-F": "Front LT", "LT-R": "Rear LT",
  RA: "Right arm", LA: "Left arm", RL: "Right leg", LL: "Left leg", RFL: "R front leg", RRL: "R rear leg", LFL: "L front leg", LRL: "L rear leg",
};

interface WeaponLine { name: string; damage: string; min: string; short: string; medium: string; long: string }

/** One line per weapon each creature carries, as the sheet lists them, with the catalog's figures. */
function weaponLines(stats: UnitStats, catalog: Catalog): WeaponLine[] {
  const lines: WeaponLine[] = [];
  for (const weapon of stats.weapons) {
    const row = catalog.rowFor(weapon.id, EDITION);
    const shots = weapon.shots === undefined ? "" : ` (${String(weapon.shots)} ${weapon.shots === 1 ? "shot" : "shots"})`;
    const [min, short, medium, long] = row?.range ?? [];
    const figure = (n: number | undefined) => (n === undefined ? "" : String(n));
    for (let i = 0; i < weapon.count; i++) {
      lines.push({ name: `${row?.name ?? weapon.id}${shots}`, damage: row?.damage ?? "", min: min === undefined ? "" : min === 0 ? "—" : String(min), short: figure(short), medium: figure(medium), long: figure(long) });
    }
  }
  return lines;
}

/** What one block draws: a unit's figures, or the blank form of a class (`stats` undefined, the class's creatures and rows). */
interface BlockModel {
  title: string;
  unit?: AbominationUnit;
  stats?: UnitStats;
  creatures: number;
  rows: number;
  pips: number;
}

function blockOf(unit: AbominationUnit): BlockModel {
  const stats = unitStats(unit);
  if (!stats) return { title: "UNKNOWN TYPE", unit, creatures: 0, rows: 1, pips: 0 };
  return { title: `${stats.name.toUpperCase()} ABOMINATION`, unit, stats, creatures: stats.creatures, rows: Math.max(1, stats.rows), pips: stats.pipsPerRow };
}

function blankBlock(classId: AbomClassId, n: number): BlockModel {
  const size = ABOM_CLASSES.find((c) => c.id === classId) ?? ABOM_CLASSES[0]!;
  return { title: `${size.label.toUpperCase()} UNIT ${String(n)}`, creatures: size.maxCreatures, rows: size.rows, pips: BLANK_PIPS };
}

const ROW_PITCH = 26;
const TRACKER = { top: 22, height: 270, x: 560, w: 496 };

function Trackers({ rect, model }: { rect: Rect; model: BlockModel }) {
  const boxHeight = model.rows * ROW_PITCH + 14;
  const gap = model.creatures > 1 ? Math.min(12, (TRACKER.height - model.creatures * boxHeight) / (model.creatures - 1)) : 0;
  const total = model.creatures * boxHeight + Math.max(0, model.creatures - 1) * gap;
  const start = rect.y + TRACKER.top + (TRACKER.height - total) / 2;
  const pitch = Math.min(24, 420 / Math.max(1, model.pips));
  return (
    <g>
      {Array.from({ length: model.creatures }, (_, c) => {
        const top = start + c * (boxHeight + gap);
        return (
          <g key={c} data-tracker={c + 1}>
            <rect x={rect.x + TRACKER.x} y={top} width={TRACKER.w} height={boxHeight} rx={12} fill="#fff" stroke={INK} strokeWidth={3} />
            <text className="bt-sheet__head" x={rect.x + TRACKER.x + 22} y={top + boxHeight / 2 + 9} fontSize={26} textAnchor="middle" fill={INK}>
              {c + 1}
            </text>
            {Array.from({ length: model.rows }, (_, r) => (
              <g key={r} data-pip-row="">
                {Array.from({ length: model.pips }, (_, p) => (
                  <circle key={p} data-pip="" cx={rect.x + TRACKER.x + 62 + p * pitch + pitch / 2} cy={top + 7 + r * ROW_PITCH + ROW_PITCH / 2} r={Math.min(9, pitch / 2 - 2)} fill="#fff" stroke={INK} strokeWidth={2} />
                ))}
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
}

const COLUMNS = { dmg: 288, min: 356, short: 410, medium: 464, long: 518 };
const MAX_WEAPON_LINES = 5;

function Block({ rect, model, catalog, handler }: { rect: Rect; model: BlockModel; catalog: Catalog; handler?: string }) {
  const { x, y } = rect;
  const { unit, stats } = model;
  const rule = (x1: number, x2: number, ry: number) => <line x1={x1} x2={x2} y1={ry} y2={ry} stroke={INK} strokeWidth={2} />;
  const lines = stats ? weaponLines(stats, catalog) : [];
  const shown = lines.length > MAX_WEAPON_LINES ? lines.slice(0, MAX_WEAPON_LINES - 1) : lines;
  const pitch = lines.length > 4 ? 18 : 24;
  const second = stats === undefined ? undefined : stats.vtol !== undefined ? (["VTOL MP", stats.vtol] as const) : stats.jump !== undefined ? (["Jump MP", stats.jump] as const) : undefined;
  const skill = (label: string, value: number | undefined, px: number, py: number) => (
    <g>
      <text x={px} y={py} fontSize={22} fontWeight={700} fill={INK}>{`${label}:`}</text>
      {value === undefined ? rule(px + 170, px + 250, py + 2) : <text x={px + 176} y={py} fontSize={24} fill={INK}>{String(value)}</text>}
    </g>
  );
  const physical = (label: string, key: string, value: number | null | undefined, lx: number, bx: number) => (
    <g data-box={key}>
      <text x={x + lx} y={y + 321} fontSize={MIN_SIZE} fontWeight={700} fill={INK}>{label}</text>
      <rect x={x + bx} y={y + 294} width={40} height={38} rx={6} fill="#fff" stroke={INK} strokeWidth={3} />
      {value !== undefined && (
        <text x={x + bx + 20} y={y + 322} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK}>{value === null ? "—" : String(value)}</text>
      )}
    </g>
  );
  const typeLine = stats === undefined ? undefined : `${stats.name}${stats.size ? ` (${stats.size.label})` : ""}`;
  const label = unit?.label ?? "";
  return (
    <Frame rect={rect} title={model.title}>
      <text x={x + 24} y={y + 66} fontSize={26} fontWeight={700} fill={INK}>Type:</text>
      {typeLine === undefined ? (
        unit ? <text x={x + 100} y={y + 66} fontSize={24} fill={INK} {...squeeze(unit.typeId ?? "", 24, 420)}>{unit.typeId ?? ""}</text> : rule(x + 100, x + 520, y + 68)
      ) : (
        <text x={x + 100} y={y + 66} fontSize={26} fill={INK} {...squeeze(typeLine, 26, label ? 190 : 420)}>{typeLine}</text>
      )}
      {label !== "" && (
        <text x={x + 300} y={y + 66} fontSize={24} fill={INK} {...squeeze(`Unit: ${label}`, 24, 230)}>
          <tspan fontWeight={700}>Unit: </tspan>
          {label}
        </text>
      )}
      {skill("Gunnery Skill", unit && stats ? unit.gunnery : undefined, x + 24, y + 106)}
      {skill("AniMelee Skill", unit && stats ? unit.animelee : undefined, x + 290, y + 106)}
      {stats === undefined && unit === undefined ? (
        <g>
          <text x={x + 24} y={y + 146} fontSize={22} fontWeight={700} fill={INK}>Ground MP:</text>
          {rule(x + 160, x + 240, y + 148)}
          {rule(x + 290, x + 400, y + 148)}
          <text x={x + 408} y={y + 146} fontSize={22} fontWeight={700} fill={INK}>MP:</text>
          {rule(x + 450, x + 520, y + 148)}
        </g>
      ) : (
        stats && (
          <g>
            <text x={x + 24} y={y + 146} fontSize={22} fontWeight={700} fill={INK}>Ground MP:</text>
            <text x={x + 160} y={y + 146} fontSize={24} fill={INK}>{String(stats.ground)}</text>
            {second && (
              <g>
                <text x={x + 290} y={y + 146} fontSize={22} fontWeight={700} fill={INK}>{`${second[0]}:`}</text>
                <text x={x + 420} y={y + 146} fontSize={24} fill={INK}>{String(second[1])}</text>
              </g>
            )}
          </g>
        )
      )}
      <text x={x + 24} y={y + 184} fontSize={MIN_SIZE} fontWeight={700} fill={INK}>Weapons &amp; Equip.</text>
      {([["Dmg", COLUMNS.dmg], ["Min", COLUMNS.min], ["Sht", COLUMNS.short], ["Med", COLUMNS.medium], ["Lng", COLUMNS.long]] as const).map(([text, at]) => (
        <text key={text} x={x + at} y={y + 184} fontSize={MIN_SIZE} fontWeight={700} textAnchor="middle" fill={INK}>{text}</text>
      ))}
      {stats === undefined && unit === undefined
        ? [0, 1, 2, 3].map((i) => (
            <g key={i}>
              {rule(x + 24, x + 262, y + 214 + i * 24)}
              {Object.values(COLUMNS).map((at) => rule(x + at - 26, x + at + 26, y + 214 + i * 24))}
            </g>
          ))
        : shown.map((line, i) => (
            <g key={i} data-weapon="">
              <text x={x + 24} y={y + 210 + i * pitch} fontSize={MIN_SIZE} fill={INK} {...squeeze(line.name, MIN_SIZE, 225)}>{line.name}</text>
              {(["damage", "min", "short", "medium", "long"] as const).map((key, k) => {
                const at = Object.values(COLUMNS)[k] ?? 0;
                return line[key] === "" ? null : (
                  <text key={key} x={x + at} y={y + 210 + i * pitch} fontSize={MIN_SIZE} textAnchor="middle" fill={line[key] === "—" ? FAINT : INK} {...squeeze(line[key], MIN_SIZE, 58)}>{line[key]}</text>
                );
              })}
            </g>
          ))}
      {lines.length > shown.length && (
        <text x={x + 24} y={y + 210 + shown.length * pitch} fontSize={MIN_SIZE} fontStyle="italic" fill={INK}>{`and ${String(lines.length - shown.length)} more`}</text>
      )}
      <text x={x + 24} y={y + 321} fontSize={MIN_SIZE} fontWeight={700} fill={INK}>Physical Damage:</text>
      {physical("Mob", "mob", unit && stats ? stats.mob : undefined, 208, 256)}
      {physical("Hobble", "hobble", unit && stats ? stats.hobble : undefined, 300, 374)}
      {physical("Melee", "melee", unit && stats ? stats.melee : undefined, 424, 486)}
      <Trackers rect={rect} model={model} />
      <text x={x + 640} y={y + 330} fontSize={22} fontWeight={700} fill={INK}>Handler:</text>
      {rule(x + 730, x + 900, y + 332)}
      {handler !== undefined && handler !== "" && (
        <text x={x + 736} y={y + 328} fontSize={MIN_SIZE} fill={INK} {...squeeze(handler, MIN_SIZE, 160)}>{handler}</text>
      )}
      <text x={x + 916} y={y + 330} fontSize={22} fontWeight={700} fill={INK}>Bonus:</text>
      <g data-box="bonus">
        <rect x={x + 1000} y={y + 302} width={36} height={36} rx={6} fill="#fff" stroke={INK} strokeWidth={3} />
        {unit?.handlerBonus === true && <text x={x + 1018} y={y + 330} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK}>X</text>}
      </g>
    </Frame>
  );
}

// ---- The four printed tables, as figures -------------------------------------------------------------------------------------

interface Column { at: number; label: string }

/** A table frame: column headings, a rule, then rows of text centered on the columns. `rowAt` is the baseline of the first row. */
function Table({ rect, title, columns, rows, pitch, headAt = 70, rowAt = 106, bold = [], note, subhead }: { rect: Rect; title: string; columns: Column[]; rows: string[][]; pitch: number; headAt?: number; rowAt?: number; bold?: number[]; note?: string; subhead?: string }) {
  return (
    <Frame rect={rect} title={title} center>
      {subhead !== undefined && (
        <text x={rect.x + 120 + 2.5 * 70} y={rect.y + 66} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK}>{subhead}</text>
      )}
      {columns.map((c) => (
        <text key={c.label} x={rect.x + c.at} y={rect.y + headAt} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK}>{c.label}</text>
      ))}
      <line x1={rect.x + 16} x2={rect.x + rect.w - 16} y1={rect.y + headAt + 12} y2={rect.y + headAt + 12} stroke={INK} strokeWidth={2} />
      {rows.map((row, r) => (
        <g key={r} data-row="">
          {row.map((cell, c) => (
            <text key={c} x={rect.x + (columns[c]?.at ?? 0)} y={rect.y + rowAt + r * pitch} fontSize={24} fontWeight={bold.includes(c) ? 700 : 400} textAnchor="middle" fill={INK} {...squeeze(cell, 24, c === 0 ? 90 : 210, bold.includes(c))}>{cell}</text>
          ))}
        </g>
      ))}
      {note !== undefined && (
        <text x={rect.x + 24} y={rect.y + rect.h - 22} fontSize={MIN_SIZE} fill={INK}>{note}</text>
      )}
    </Frame>
  );
}

const creaturesText = (n: number) => (n >= 4 ? "4-6" : String(n));
const signed = (n: number) => (n > 0 ? `+${String(n)}` : String(n));

/** The rows of the four tables, shared by the figures and the text copy. */
export function tableFigures() {
  return {
    mob: MOB_HOBBLE_MODIFIERS.toReversed().map((r) => [creaturesText(r.creatures), signed(r.mob)]),
    hobble: MOB_HOBBLE_MODIFIERS.toReversed().map((r) => [creaturesText(r.creatures), signed(r.hobble)]),
    mobLocations: MOB_LOCATIONS.map(([biped, quad], i) => [String(i + 2), HIT_NAMES[biped], HIT_NAMES[quad]]),
    hobbleLocations: HOBBLE_LOCATIONS.map(([biped, quad], i) => [String(i + 1), HIT_NAMES[biped], HIT_NAMES[quad]]),
    random: RANDOM_CREATURE.map((row, i) => [String(i + 1), ...row.map((v) => (v === "reroll" ? "*" : String(v)))]),
  };
}

function Tables() {
  const t = tableFigures();
  const x = TABLES_X;
  const modifiers: Column[] = [{ at: TABLES_W * 0.28, label: "Creatures" }, { at: TABLES_W * 0.72, label: "To-hit" }];
  const locations: Column[] = [{ at: 56, label: "Roll" }, { at: 216, label: "Biped" }, { at: 410, label: "Four-legged" }];
  const randomColumns: Column[] = [{ at: 52, label: "1D6" }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ at: 120 + (n - 1) * 70, label: String(n) }))];
  return (
    <g data-tables="">
      <g data-table="mob">
        <Table rect={{ x, y: 215, w: TABLES_W, h: 236 }} title="MOB TO-HIT" columns={modifiers} rows={t.mob} pitch={34} />
      </g>
      <g data-table="mob-locations">
        <Table rect={{ x, y: 507, w: TABLES_W, h: 454 }} title="MOB HIT LOCATION" columns={locations} rows={t.mobLocations} pitch={32} />
      </g>
      <g data-table="hobble">
        <Table rect={{ x, y: 1017, w: TABLES_W, h: 236 }} title="HOBBLE TO-HIT" columns={modifiers} rows={t.hobble} pitch={34} />
      </g>
      <g data-table="hobble-locations">
        <Table rect={{ x, y: 1309, w: TABLES_W, h: 304 }} title="HOBBLE HIT LOCATION" columns={locations} rows={t.hobbleLocations} pitch={34} />
      </g>
      <g data-table="random">
        <Table rect={{ x, y: 1669, w: TABLES_W, h: 366 }} title="RANDOM CREATURE" columns={randomColumns} rows={t.random} pitch={34} headAt={102} rowAt={142} bold={[0]} note="* roll again" subhead="Creatures in unit" />
      </g>
    </g>
  );
}

// ---- The sheet ------------------------------------------------------------------------------------------------------------------

export interface AbominationSheetProps {
  /** Up to five units; further units are not drawn (use AbominationSheets for more). */
  units?: AbominationUnit[];
  /** Draws the blank form of this class (five unit blocks, nothing filled in) instead of units. */
  blank?: AbomClassId;
  catalog: Catalog;
  /** Handler text by unit id (the 'Mech that carries it); the force page supplies it. */
  handlers?: Record<string, string>;
  /** "Page 1 of 2" and the like, printed under the title. */
  pageLabel?: string;
}

export default function AbominationSheet({ units = [], blank, catalog, handlers = {}, pageLabel }: AbominationSheetProps) {
  const id = useId();
  const models: BlockModel[] = blank ? Array.from({ length: UNITS_PER_PAGE }, (_, i) => blankBlock(blank, i + 1)) : units.slice(0, UNITS_PER_PAGE).map(blockOf);
  const heading = blank ? `Blank ${ABOM_CLASSES.find((c) => c.id === blank)?.label ?? ""} sheet` : models.map((m) => m.title).join(", ");
  const credit = "Not an official record sheet. Made with Salvage Rights, an unofficial fan project. The layout follows the form of the Gothic record sheets, which are for personal copying.";
  const tables = tableFigures();
  return (
    <>
      <svg className="bt-sheet" viewBox={`0 0 ${String(ABOM_SHEET_WIDTH)} ${String(ABOM_SHEET_HEIGHT)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Abomination record sheet: ${heading}`}>
        <rect width={ABOM_SHEET_WIDTH} height={ABOM_SHEET_HEIGHT} fill="#fff" />
        <text className="bt-sheet__head" x={40} y={96} fontSize={84} fill={INK}>ABOMINATION</text>
        <text x={42} y={150} fontSize={34} fontWeight={700} fill={INK}>{`Gothic record sheet${pageLabel ? `, ${pageLabel}` : ""}`}</text>
        <text className="bt-sheet__head" x={1670} y={150} fontSize={24} textAnchor="end" letterSpacing={3} fill={INK}>SALVAGE RIGHTS</text>
        {models.map((model, i) => (
          <g key={model.unit?.id ?? i} data-block="">
            <Block rect={{ x: BLOCK.x, y: BLOCK.y + i * BLOCK.step, w: BLOCK.w, h: BLOCK.h }} model={model} catalog={catalog} handler={model.unit ? handlers[model.unit.id] : undefined} />
          </g>
        ))}
        <Tables />
        <text x={ABOM_SHEET_WIDTH / 2} y={2160} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(credit, 20, 1640)}>{credit}</text>
        <text x={ABOM_SHEET_WIDTH / 2} y={2188} fontSize={20} textAnchor="middle" fill={INK} {...squeeze(TRADEMARK_LINE, 20, 1640)}>{TRADEMARK_LINE}</text>
      </svg>
      <section className="sr-visually-hidden bt-sheet-text" aria-labelledby={`${id}-heading`}>
        <h2 id={`${id}-heading`}>The Abomination sheet as text</h2>
        {models.map((model, i) => (
          <ModelText key={model.unit?.id ?? i} model={model} catalog={catalog} handler={model.unit ? handlers[model.unit.id] : undefined} />
        ))}
        <h3>Mob and Hobble to-hit modifiers by active creatures</h3>
        <ul>
          {tables.mob.map((m, i) => (
            <li key={m[0]}>{`${m[0] ?? ""} creatures: Mob ${m[1] ?? ""}, Hobble ${tables.hobble[i]?.[1] ?? ""}`}</li>
          ))}
        </ul>
        <h3>Mob hit locations, 2D6, biped then four-legged</h3>
        <ul>
          {tables.mobLocations.map((r) => (
            <li key={r[0]}>{r.join(", ")}</li>
          ))}
        </ul>
        <h3>Hobble hit locations, 1D6, biped then four-legged</h3>
        <ul>
          {tables.hobbleLocations.map((r) => (
            <li key={r[0]}>{r.join(", ")}</li>
          ))}
        </ul>
        <h3>Random creature number, by 1D6 roll and creatures in the unit (* is roll again)</h3>
        <ul>
          {tables.random.map((r) => (
            <li key={r[0]}>{r.join(" ")}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ModelText({ model, catalog, handler }: { model: BlockModel; catalog: Catalog; handler?: string }) {
  const { stats, unit } = model;
  const weapons = stats ? weaponLines(stats, catalog) : [];
  return (
    <section>
      <h3>{model.title}</h3>
      {stats && unit ? (
        <ul>
          <li>{`Class ${stats.size?.label ?? stats.classId}, ${String(stats.creatures)} creatures of ${String(stats.pipsEach)} pips`}</li>
          <li>{`Skills: Gunnery ${String(unit.gunnery)}, AniMelee ${String(unit.animelee)}${unit.handlerBonus ? ", Handler bonus" : ""}${handler ? `, Handler ${handler}` : ""}`}</li>
          <li>{`Ground MP ${String(stats.ground)}${stats.jump === undefined ? "" : `, Jump MP ${String(stats.jump)}`}${stats.vtol === undefined ? "" : `, VTOL MP ${String(stats.vtol)}`}`}</li>
          <li>{`Physical damage: Mob ${stats.mob === null ? "none" : String(stats.mob)}, Hobble ${stats.hobble === null ? "none" : String(stats.hobble)}, Melee ${stats.melee === null ? "none" : String(stats.melee)}`}</li>
          {weapons.map((w, i) => (
            <li key={i}>{`${w.name}: damage ${w.damage}, minimum ${w.min}, short ${w.short}, medium ${w.medium}, long ${w.long}`}</li>
          ))}
        </ul>
      ) : (
        <p>{unit ? "A type this version does not know." : `${String(model.creatures)} trackers of ${String(model.rows)} rows, left blank.`}</p>
      )}
    </section>
  );
}

/** Every page of a list of units, five to a page in order, each its own sheet. */
export function AbominationSheets({ units, catalog, handlers }: { units: AbominationUnit[]; catalog: Catalog; handlers?: Record<string, string> }) {
  const pages = paginate(units, UNITS_PER_PAGE);
  return (
    <>
      {pages.map((page, i) => (
        <div key={i} className="bt-abom-page">
          <AbominationSheet units={page} catalog={catalog} handlers={handlers} pageLabel={pages.length > 1 ? `page ${String(i + 1)} of ${String(pages.length)}` : undefined} />
        </div>
      ))}
    </>
  );
}
