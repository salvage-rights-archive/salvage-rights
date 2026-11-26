// The blocks of a fighter's record sheet, each drawn into a rectangle: the data and weapons inventory, critical damage, pilot data, the velocity record,
// the heat scale and heat data, the stores boxes and the conventional fighter's two tables. Everything is our own drawing: black rules on white, no
// logo, no art. Labels and printed tables follow the flagged blank each profile names. Counts are capped like the Classic sheet's heat sinks
// (MAX_SINKS_DRAWN), so a slip of the keys never hangs the page.
import { AERO_HEAT_TOP, AT1_HEAT, FIGHTER_RETURN, FLAGGED_HEAT, GROUND_MOVEMENT, PILOT_TRACK } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import Frame from "../../sheet/Frame";
import type { Rect } from "../../sheet/Frame";
import { MAX_SINKS_DRAWN } from "../../sheet/HeatData";
import { INK, squeeze } from "../../sheet/text";
import { linesFor } from "./facts";
import type { FighterFacts } from "./facts";

interface Props {
  rect: Rect;
  facts: FighterFacts;
  profile: SheetProfile;
}

export const Check = ({ x, y, on, label, size = 24 }: { x: number; y: number; on: boolean; label: string; size?: number }) => (
  <g data-check={on}>
    <rect x={x} y={y - size + 4} width={size} height={size} fill="#fff" stroke={INK} strokeWidth={2.5} />
    {on && <path d={`M ${String(x + 4)} ${String(y - size + 8)} L ${String(x + size - 4)} ${String(y)} M ${String(x + size - 4)} ${String(y - size + 8)} L ${String(x + 4)} ${String(y)}`} stroke={INK} strokeWidth={3} />}
    <text x={x + size + 8} y={y} fontSize={22} fill={INK}>
      {label}
    </text>
  </g>
);

export const Rule = ({ x1, x2, y }: { x1: number; x2: number; y: number }) => <line x1={x1} x2={x2} y1={y} y2={y} stroke={INK} strokeWidth={2} />;

/** "Label: value" with the value on a rule, as the blanks print them. */
export function Blank({ x, y, w, label, value }: { x: number; y: number; w: number; label: string; value?: string }) {
  const labelW = label.length * 12.5 + 8;
  return (
    <g>
      <text x={x} y={y} fontSize={22} fill={INK}>
        {label}
      </text>
      <Rule x1={x + labelW} x2={x + w} y={y + 4} />
      {value !== undefined && value !== "" && (
        <text x={x + labelW + 8} y={y} fontSize={23} fontWeight={700} fill={INK} {...squeeze(value, 23, Math.max(w - labelW - 12, 24), true)}>
          {value}
        </text>
      )}
    </g>
  );
}

// ---- Data and inventory -------------------------------------------------------------------------------------------------------------------

const RANGES = "Range brackets in hexes: SRV 0-6, MRV 7-12, LRV 13-20, ERV 21-25";

export function DataBlock({ rect, facts, profile }: Props) {
  const { x, y, w } = rect;
  const current = profile.layout === "current";
  const at1 = profile.layout === "at1";
  const title = current || at1 ? "FIGHTER DATA" : "VESSEL DATA";
  const half = (w - 48) / 2;
  const clan = facts.techBase === "Clan" || facts.techBase === "Mixed";
  const inner = facts.techBase === "Inner Sphere" || facts.techBase === "Mixed";
  return (
    <Frame rect={rect} title={title}>
      <Blank x={x + 24} y={y + 76} w={half * 1.45} label="Type:" value={facts.typeLabel} />
      <Blank x={x + 24 + half * 1.5} y={y + 76} w={w - 48 - half * 1.5} label="Tons:" value={facts.tons} />
      <Blank x={x + 24} y={y + 118} w={half * 0.95} label={at1 ? "Thrust:" : "Safe Thrust:"} value={facts.safe} />
      <Blank x={x + 24 + half * 1.05} y={y + 118} w={half * 0.95} label={at1 ? "Overthrust:" : "Max Thrust:"} value={facts.max} />
      {/* Structural Integrity is in the diagram on the later sheets; AeroTech (1986) states it with the unit's data. */}
      {at1 && <Blank x={x + 24} y={y + 160} w={half * 0.95} label="Struct. Int.:" value={facts.si} />}
      <Blank x={at1 ? x + 24 + half * 1.05 : x + 24} y={y + 160} w={half * 0.95} label="Fuel points:" value={facts.fuel} />
      <text x={x + 24} y={y + 204} fontSize={22} fill={INK}>
        Tech base:
      </text>
      <Check x={x + 150} y={y + 204} on={clan} label="Clan" />
      <Check x={x + 270} y={y + 204} on={inner} label="Inner Sphere" />
      {profile.kind === "conventional" && !current && <Check x={x + 440} y={y + 204} on={false} label="VSTOL" />}
      {profile.kind === "conventional" && current && (
        <g>
          <Check x={x + 450} y={y + 204} on={false} label="VSTOL" />
          <Check x={x + 570} y={y + 204} on={false} label="STOL" />
        </g>
      )}
      {!at1 && <Inventory rect={{ x, y: y + 236, w, h: rect.h - 236 }} facts={facts} profile={profile} />}
    </Frame>
  );
}

function Inventory({ rect, facts, profile }: Props) {
  const { x, y, w } = rect;
  const current = profile.layout === "current";
  const pitch = current ? 70 : 62;
  const av = w - 24 - 4 * pitch;
  const columns = { qty: 24, name: current ? 80 : 24, loc: av - 112, ht: av - 46, av };
  const MAX = linesFor(profile);
  const shown = facts.weapons.slice(0, MAX);
  const rowH = current ? 32 : 30;
  const top = y + 58;
  const ammo = facts.ammo.join("; ");
  return (
    <g data-inventory="">
      <text x={x + 24} y={y + 8} fontSize={24} fontWeight={700} fill={INK}>
        Weapons and Equipment Inventory
      </text>
      <text x={x + 24} y={y + 32} fontSize={20} fill={INK} {...squeeze(RANGES, 20, w - 48)}>
        {RANGES}
      </text>
      {current && (
        <text x={x + columns.qty} y={y + 54} fontSize={20} fontWeight={700} fill={INK}>
          Qty
        </text>
      )}
      <text x={x + columns.name} y={y + 54} fontSize={20} fontWeight={700} fill={INK}>
        Type
      </text>
      <text x={x + columns.loc} y={y + 54} fontSize={20} fontWeight={700} fill={INK}>
        Loc.
      </text>
      <text x={x + columns.ht} y={y + 54} fontSize={20} fontWeight={700} fill={INK}>
        Ht
      </text>
      {["SRV", "MRV", "LRV", "ERV"].map((label, i) => (
        <text key={label} x={x + columns.av + i * pitch + pitch / 2} y={y + 54} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
          {label}
        </text>
      ))}
      {Array.from({ length: MAX }, (_, index) => {
        const line = shown[index];
        const base = top + (index + 1) * rowH;
        return (
          <g key={index} data-line={line === undefined ? undefined : ""}>
            <Rule x1={x + 20} x2={x + w - 20} y={base + 4} />
            {line && (
              <>
                {current && (
                  <text x={x + columns.qty + 12} y={base} fontSize={22} textAnchor="middle" fill={INK}>
                    {line.qty}
                  </text>
                )}
                <text x={x + columns.name} y={base} fontSize={22} fill={INK} {...squeeze(`${current ? "" : line.qty > 1 ? `${String(line.qty)} x ` : ""}${line.name}`, 22, columns.loc - columns.name - 8)}>
                  {`${current ? "" : line.qty > 1 ? `${String(line.qty)} x ` : ""}${line.name}`}
                </text>
                <text x={x + columns.loc} y={base} fontSize={22} fill={INK} {...squeeze(line.loc, 22, 76)}>
                  {line.loc}
                </text>
                <text x={x + columns.ht} y={base} fontSize={22} fill={INK}>
                  {line.heat}
                </text>
                {line.av.map((value, i) => (
                  <text key={i} x={x + columns.av + i * pitch + pitch / 2} y={base} fontSize={22} textAnchor="middle" fill={INK} {...squeeze(value, 22, pitch - 4)}>
                    {value}
                  </text>
                ))}
              </>
            )}
          </g>
        );
      })}
      {facts.weapons.length > MAX && (
        <text x={x + 24} y={top + (MAX + 1) * rowH + 4} fontSize={20} fill={INK}>
          {`${String(facts.weapons.length - MAX)} more lines are in the text version of this sheet.`}
        </text>
      )}
      <text x={x + 24} y={top + (MAX + 2) * rowH + 6} fontSize={22} fontWeight={700} fill={INK}>
        Ammo:
      </text>
      <text x={x + 110} y={top + (MAX + 2) * rowH + 6} fontSize={21} fill={INK} {...squeeze(ammo, 21, w - 140)}>
        {ammo}
      </text>
    </g>
  );
}

/** AeroTech (1986): the four equipment areas, each the weapons and ammunition of one arc, with the book's hex figures. */
export function EquipmentAreas({ rect, facts }: { rect: Rect; facts: FighterFacts }) {
  const areas: [string, string][] = [["NO", "Nose"], ["LW", "Left Wing"], ["RW", "Right Wing"], ["AF", "Aft"]];
  const w = (rect.w - 20) / 2;
  const h = (rect.h - 20) / 2;
  return (
    <g data-equipment="">
      {areas.map(([code, name], index) => {
        const box = { x: rect.x + (index % 2) * (w + 20), y: rect.y + Math.floor(index / 2) * (h + 20), w, h };
        const lines = facts.weapons.filter((line) => line.loc.split(" ")[0] === code);
        const ammo = facts.ammo.filter((line) => line.includes(`(${code})`));
        const rows = [...lines.map((line) => ({ text: `${line.qty > 1 ? `${String(line.qty)} x ` : ""}${line.name}`, figures: `Ht ${line.heat}  Dmg ${line.damage}  Rng ${line.hexes}` })), ...ammo.map((text) => ({ text, figures: "" }))];
        const room = Math.floor((box.h - 70) / 62);
        return (
          <Frame key={code} rect={box} title={name.toUpperCase()}>
            {rows.slice(0, room).map((row, i) => (
              <g key={i} data-line="">
                <text x={box.x + 20} y={box.y + 70 + i * 62} fontSize={22} fill={INK} {...squeeze(row.text, 22, box.w - 40)}>
                  {row.text}
                </text>
                <text x={box.x + 20} y={box.y + 96 + i * 62} fontSize={20} fill={INK} {...squeeze(row.figures, 20, box.w - 40)}>
                  {row.figures}
                </text>
              </g>
            ))}
            {rows.length > room && (
              <text x={box.x + 20} y={box.y + box.h - 14} fontSize={20} fill={INK}>
                {`${String(rows.length - room)} more in the text version.`}
              </text>
            )}
          </Frame>
        );
      })}
    </g>
  );
}

// ---- Heat ---------------------------------------------------------------------------------------------------------------------------------------

export function SinkCircles({ x, y, w, count, rows }: { x: number; y: number; w: number; count: number; rows: number }) {
  const drawn = Math.min(count, MAX_SINKS_DRAWN);
  const columns = Math.max(1, Math.ceil(drawn / rows));
  const pitch = Math.min(28, w / columns);
  return (
    <g data-sinks={drawn}>
      {Array.from({ length: drawn }, (_, index) => (
        <circle key={index} cx={x + pitch / 2 + Math.floor(index / rows) * pitch} cy={y + 14 + (index % rows) * 30} r={Math.min(11, pitch / 2 - 2)} fill="#fff" stroke={INK} strokeWidth={2.5} />
      ))}
    </g>
  );
}

const heatOf = (profile: SheetProfile) => (profile.flagged ? FLAGGED_HEAT : AT1_HEAT);

/** The AeroTech 2 and AeroTech (1986) heat scale: an Overflow box over the boxes 30 to 0, each effect written beside its level. */
export function HeatScale({ rect, profile }: { rect: Rect; profile: SheetProfile }) {
  const { x, y, w, h } = rect;
  const table = heatOf(profile);
  const effects = new Map(table.rows.map((row) => [row.level, row.effect]));
  const pitch = (h - 130) / (AERO_HEAT_TOP + 1);
  return (
    <Frame rect={rect} title="HEAT SCALE">
      <text x={x + 24} y={y + 66} fontSize={20} fill={INK}>
        Overflow
      </text>
      <rect x={x + 130} y={y + 44} width={60} height={32} fill="#fff" stroke={INK} strokeWidth={2} />
      <g data-heat-source={profile.flagged ? "flagged" : "own"}>
        {Array.from({ length: AERO_HEAT_TOP + 1 }, (_, index) => {
          const level = AERO_HEAT_TOP - index;
          const top = y + 96 + index * pitch;
          const effect = effects.get(level);
          return (
            <g key={level} data-level={level}>
              <rect x={x + 24} y={top} width={56} height={pitch} fill="#fff" stroke={INK} strokeWidth={2} />
              <text x={x + 52} y={top + pitch / 2 + 7} fontSize={20} textAnchor="middle" fill={INK}>
                {String(level).padStart(2, "0")}
              </text>
              {effect !== undefined && (
                <text x={x + 100} y={top + pitch / 2 + 7} fontSize={20} fill={INK} data-effect="" {...squeeze(effect, 20, w - 120)}>
                  {effect}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </Frame>
  );
}

/** The current blank's heat scale: the Overflow box over the boxes 30 to 0 down the sheet's right edge, an asterisk on each level that has an effect. */
export function HeatScaleColumn({ rect }: { rect: Rect }) {
  const effects = new Set(FLAGGED_HEAT.rows.map((row) => row.level));
  const boxes = AERO_HEAT_TOP + 1;
  const pitch = (rect.h - 96) / boxes;
  return (
    <g data-heat-scale="">
      <text x={rect.x + rect.w / 2} y={rect.y + 20} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        Heat
      </text>
      <text x={rect.x + rect.w / 2} y={rect.y + 44} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
        Scale
      </text>
      <rect x={rect.x} y={rect.y + 56} width={rect.w} height={34} fill="#fff" stroke={INK} strokeWidth={2} />
      <text x={rect.x + rect.w / 2} y={rect.y + 79} fontSize={20} textAnchor="middle" fill={INK} textLength={rect.w - 8} lengthAdjust="spacingAndGlyphs">
        Overflow
      </text>
      {Array.from({ length: boxes }, (_, index) => {
        const level = AERO_HEAT_TOP - index;
        const top = rect.y + 96 + index * pitch;
        return (
          <g key={level} data-level={level}>
            <rect x={rect.x} y={top} width={rect.w} height={pitch} fill="#fff" stroke={INK} strokeWidth={2} />
            <text x={rect.x + rect.w / 2} y={top + pitch / 2 + 7} fontSize={20} textAnchor="middle" fill={INK}>
              {effects.has(level) ? `${String(level)}*` : String(level)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** The current blank's Heat Data: heat sinks and the effect of each level that has one. */
export function HeatData({ rect, facts }: Props) {
  const { x, y, w } = rect;
  const rows = FLAGGED_HEAT.rows;
  const tableTop = y + 150;
  const circlesTop = y + rect.h - 120;
  const pitch = 26;
  const sinkLine = `Heat Sinks: ${String(facts.sinks.total)} (${String(facts.sinks.capacity)})`;
  return (
    <Frame rect={rect} title="HEAT DATA">
      <text x={x + 24} y={y + 76} fontSize={23} fontWeight={700} fill={INK} {...squeeze(sinkLine, 23, w - 48, true)}>
        {sinkLine}
      </text>
      <Check x={x + w - 150} y={y + 112} on={facts.sinks.type === "Single"} label="Single" />
      <Check x={x + w - 150} y={y + 142} on={facts.sinks.type === "Double"} label="Double" />
      <text x={x + 24} y={tableTop - 8} fontSize={20} fontWeight={700} fill={INK}>
        Heat Level*
      </text>
      <text x={x + 150} y={tableTop - 8} fontSize={20} fontWeight={700} fill={INK}>
        Effects
      </text>
      <g data-heat-source="flagged">
        {rows.map((row, index) => (
          <g key={row.level} data-heat={row.level}>
            <text x={x + 100} y={tableTop + 18 + pitch * index} fontSize={21} textAnchor="end" fill={INK}>
              {row.level}
            </text>
            <text x={x + 120} y={tableTop + 18 + pitch * index} fontSize={21} fill={INK} data-effect="" {...squeeze(row.effect, 21, w - 120 - 24)}>
              {row.effect}
            </text>
          </g>
        ))}
      </g>
      <SinkCircles x={x + 24} y={circlesTop} w={w - 48} count={facts.sinks.total} rows={3} />
    </Frame>
  );
}

/** The heat sink line and circles of the AeroTech 2 and AeroTech (1986) sheets (they sit with the unit's data, not in a block of their own). */
export function SinksStrip({ rect, facts, profile }: Props) {
  const { x, y, w } = rect;
  const line = `Total Heat Sinks: ${String(facts.sinks.total)} (${String(facts.sinks.capacity)})`;
  return (
    <g data-sinks-strip="">
      <text x={x + 24} y={y + 28} fontSize={23} fontWeight={700} fill={INK} {...squeeze(line, 23, w * 0.55, true)}>
        {line}
      </text>
      <Check x={x + w - 150} y={y + 28} on={facts.sinks.type === "Single"} label="Single" />
      <Check x={x + w - 150} y={y + 60} on={facts.sinks.type === "Double"} label="Double" />
      <SinkCircles x={x + 24} y={y + 44} w={w - 200} count={facts.sinks.total} rows={profile.layout === "at1" ? 3 : 2} />
    </g>
  );
}

// ---- Pilot, critical damage, velocity ---------------------------------------------------------------------------------------------------

export function PilotBlock({ rect, profile }: { rect: Rect; profile: SheetProfile }) {
  const { x, y, w } = rect;
  const at1 = profile.layout === "at1";
  const cols = PILOT_TRACK.hits.length;
  const cell = (w - 220) / cols;
  const rows: [string, string[]][] = at1 ? [["Hits taken", PILOT_TRACK.hits]] : [["Hits Taken", PILOT_TRACK.hits], ["Consciousness #", PILOT_TRACK.consciousness], ["Modifier", PILOT_TRACK.modifier]];
  return (
    <Frame rect={rect} title="PILOT DATA">
      <Blank x={x + 24} y={y + 76} w={w - 48} label="Name:" />
      <Blank x={x + 24} y={y + 116} w={(w - 48) / 2 - 10} label="Gunnery:" />
      <Blank x={x + 24 + (w - 48) / 2 + 10} y={y + 116} w={(w - 48) / 2 - 10} label="Piloting:" />
      {rows.map(([label, values], r) => (
        <g key={label}>
          <text x={x + 24} y={y + 174 + r * 40} fontSize={20} fill={INK} {...squeeze(label, 20, 180)}>
            {label}
          </text>
          {values.slice(0, at1 ? 6 : cols).map((value, c) => (
            <g key={c}>
              <rect x={x + 210 + c * cell} y={y + 148 + r * 40} width={cell} height={36} fill="#fff" stroke={INK} strokeWidth={2} />
              <text x={x + 210 + c * cell + cell / 2} y={y + 173 + r * 40} fontSize={20} textAnchor="middle" fill={INK}>
                {value}
              </text>
            </g>
          ))}
        </g>
      ))}
    </Frame>
  );
}

export function CriticalBlock({ rect, profile }: { rect: Rect; profile: SheetProfile }) {
  const { x, y, h } = rect;
  const pitch = Math.min(46, (h - 80) / Math.max(profile.critical.length, 1));
  const labelW = 190;
  const left = x + 24 + labelW;
  // Six boxes fit the block; an open field is as wide as six, as the forms draw Cargo and Doors.
  const open = Math.min(6 * 56 - 6, rect.w - 48 - labelW);
  return (
    <Frame rect={rect} title="CRITICAL DAMAGE">
      {profile.critical.map((row, r) => {
        const small = row.small === true;
        const step = small ? 30 : 56;
        const size = small ? 26 : 50;
        return (
          <g key={row.label} data-critical={row.label}>
            <text x={x + 24} y={y + 84 + r * pitch} fontSize={21} fill={INK} {...squeeze(row.label, 21, labelW - 10)}>
              {row.label}
            </text>
            {row.open === true && <rect data-open="" x={left} y={y + 62 + r * pitch} width={open} height={34} rx={7} fill="#fff" stroke={INK} strokeWidth={2.5} />}
            {row.boxes.map((box, c) => (
              <g key={c}>
                <rect x={left + c * step} y={y + (small ? 66 : 62) + r * pitch} width={size} height={small ? 26 : 34} rx={small ? 4 : 7} fill="#fff" stroke={INK} strokeWidth={2.5} />
                <text x={left + c * step + size / 2} y={y + 86 + r * pitch} fontSize={20} textAnchor="middle" fill={INK}>
                  {box}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </Frame>
  );
}

export function VelocityBlock({ rect, profile, fuel }: { rect: Rect; profile: SheetProfile; fuel: string }) {
  const { x, y, w, h } = rect;
  const cols = profile.velocityColumns;
  if (profile.velocity === "down") {
    const turns = 20;
    const headH = 62;
    const rowH = (h - headH - 52) / turns;
    const colW = (w - 40) / cols.length;
    return (
      <Frame rect={rect} title="VELOCITY RECORD">
        {cols.map((label, c) => (
          <g key={label}>
            {label.split(" ").map((word, line, words) => (
              <text key={word} x={x + 20 + c * colW + colW / 2} y={y + 84 - (words.length - 1 - line) * 22} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK} {...squeeze(word, 20, colW - 6, true)}>
                {word}
              </text>
            ))}
          </g>
        ))}
        {Array.from({ length: turns }, (_, t) => (
          <g key={t} data-turn={t + 1}>
            {cols.map((label, c) => (
              <g key={label}>
                <rect x={x + 20 + c * colW} y={y + 94 + t * rowH} width={colW} height={rowH} fill="#fff" stroke={INK} strokeWidth={1.5} />
                {c === 0 && (
                  <text x={x + 20 + c * colW + colW / 2} y={y + 94 + t * rowH + rowH / 2 + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
                    {t + 1}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}
        {fuel !== "" && (
          <text x={x + w - 20 - colW / 2} y={y + 58} fontSize={20} textAnchor="middle" fill={INK} data-fuel="" {...squeeze(`start ${fuel}`, 20, colW - 6)}>
            {`start ${fuel}`}
          </text>
        )}
      </Frame>
    );
  }
  const strips = profile.velocity === "two-strips" ? 2 : 1;
  const per = 20 / strips;
  const labelW = 250;
  const colW = (w - 40 - labelW) / per;
  const stripH = (h - 56) / strips;
  const rowH = stripH / (cols.length + 1);
  return (
    <Frame rect={rect} title="VELOCITY RECORD">
      {Array.from({ length: strips }, (_, s) => {
        const top = y + 40 + s * stripH;
        return (
          <g key={s} data-strip={s}>
            <text x={x + 24} y={top + rowH - 8} fontSize={20} fontWeight={700} fill={INK}>
              Turn #
            </text>
            {Array.from({ length: per }, (_, t) => (
              <g key={t} data-turn={s * per + t + 1}>
                <rect x={x + 20 + labelW + t * colW} y={top + 4} width={colW} height={rowH - 4} fill="#fff" stroke={INK} strokeWidth={1.5} />
                <text x={x + 20 + labelW + t * colW + colW / 2} y={top + rowH - 8} fontSize={20} textAnchor="middle" fill={INK}>
                  {s * per + t + 1}
                </text>
              </g>
            ))}
            {cols.map((label, c) => (
              <g key={label}>
                <text x={x + 24} y={top + (c + 2) * rowH - 8} fontSize={20} fill={INK} {...squeeze(label, 20, labelW - 8)}>
                  {label}
                </text>
                {Array.from({ length: per }, (_, t) => (
                  <rect key={t} x={x + 20 + labelW + t * colW} y={top + (c + 1) * rowH + 4} width={colW} height={rowH - 4} fill="#fff" stroke={INK} strokeWidth={1.5} />
                ))}
                {label === "Fuel" && s === 0 && fuel !== "" && (
                  <text x={x + 20 + labelW - 8} y={top + (c + 2) * rowH - 8} fontSize={20} fontWeight={700} textAnchor="end" fill={INK} data-fuel="">
                    {fuel}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </Frame>
  );
}

// ---- Stores, notes and the conventional fighter's tables -------------------------------------------------------------------------------------

export function StoresBlock({ rect, profile }: { rect: Rect; profile: SheetProfile }) {
  const { x, y, w, h } = rect;
  const stores = profile.stores;
  if (stores.kind === "line") return null;
  if (stores.kind === "grid") {
    const cols = 5;
    const rows = stores.boxes / cols;
    const cell = Math.min((w - 40) / cols, (h - 150) / rows);
    return (
      <Frame rect={rect} title="EXTERNAL STORES/BOMBS">
        {Array.from({ length: stores.boxes }, (_, i) => (
          <rect key={i} x={x + 20 + (i % cols) * cell} y={y + 40 + Math.floor(i / cols) * cell} width={cell - 8} height={cell - 8} rx={8} fill="#fff" stroke={INK} strokeWidth={2.5} />
        ))}
        <text x={x + 20} y={y + 40 + rows * cell + 28} fontSize={20} fill={INK} data-key="">
          {`Key: ${stores.key.join(", ")}`}
        </text>
      </Frame>
    );
  }
  return (
    <Frame rect={rect} title="EXTERNAL STORES">
      {stores.groups.map((group, g) => (
        <g key={g}>
          {group.map((label, i) => {
            const cell = (w - 40) / Math.max(...stores.groups.map((each) => each.length));
            return (
              <g key={label}>
                <rect x={x + 20 + i * cell} y={y + 40 + g * 110} width={cell - 10} height={56} rx={10} fill="#fff" stroke={INK} strokeWidth={2.5} />
                <text x={x + 20 + i * cell + (cell - 10) / 2} y={y + 76 + g * 110} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK} {...squeeze(label, 20, cell - 16, true)}>
                  {label}
                </text>
                <Rule x1={x + 20 + i * cell} x2={x + 20 + i * cell + cell - 10} y={y + 124 + g * 110} />
              </g>
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

export function NotesBlock({ rect }: { rect: Rect }) {
  return <Frame rect={rect} title="NOTES" />;
}

export function GroundTables({ rect, facts }: Props) {
  const { x, y, w, h } = rect;
  const top = { x, y, w, h: h * 0.64 };
  const bottom = { x, y: y + h * 0.64 + 20, w, h: h * 0.36 - 20 };
  const pitch = (top.h - 150) / GROUND_MOVEMENT.length;
  const safe = Number(facts.safe);
  const returns = FIGHTER_RETURN.reduce((best, row, i) => (safe >= Number(row.thrust.split(/[-+]/)[0]) ? i : best), -1);
  return (
    <g data-ground="">
      <Frame rect={top} title="GROUND MAP MOVEMENT">
        <text x={x + w / 2} y={top.y + 64} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
          Minimum straight movement (hexes)
        </text>
        <text x={x + 24} y={top.y + 104} fontSize={20} fontWeight={700} fill={INK}>
          Velocity
        </text>
        <text x={x + w * 0.42} y={top.y + 104} fontSize={20} fontWeight={700} fill={INK}>
          Fighter
        </text>
        <text x={x + w * 0.66} y={top.y + 104} fontSize={20} fontWeight={700} fill={INK} {...squeeze("Small craft, fixed wing", 20, w * 0.3, true)}>
          Small craft, fixed wing
        </text>
        {GROUND_MOVEMENT.map((row, i) => (
          <g key={row.velocity} data-velocity={row.velocity}>
            <text x={x + 60} y={top.y + 140 + i * pitch} fontSize={20} textAnchor="middle" fill={INK}>
              {row.velocity}
            </text>
            <text x={x + w * 0.42 + 30} y={top.y + 140 + i * pitch} fontSize={20} textAnchor="middle" fill={INK}>
              {row.fighter}
            </text>
            <text x={x + w * 0.66 + 60} y={top.y + 140 + i * pitch} fontSize={20} textAnchor="middle" fill={INK}>
              {row.other}
            </text>
          </g>
        ))}
      </Frame>
      <Frame rect={bottom} title="FIGHTER RETURN">
        <text x={x + 24} y={bottom.y + 76} fontSize={20} fontWeight={700} fill={INK}>
          Safe Thrust
        </text>
        <text x={x + w * 0.5} y={bottom.y + 76} fontSize={20} fontWeight={700} fill={INK}>
          Turns before return
        </text>
        {FIGHTER_RETURN.map((row, i) => (
          <g key={row.thrust} data-return={row.thrust}>
            <text x={x + 40} y={bottom.y + 108 + i * 26} fontSize={20} fontWeight={i === returns ? 700 : 400} fill={INK}>
              {row.thrust}
            </text>
            <text x={x + w * 0.5 + 60} y={bottom.y + 108 + i * 26} fontSize={20} fontWeight={i === returns ? 700 : 400} fill={INK}>
              {row.turns}
            </text>
          </g>
        ))}
      </Frame>
    </g>
  );
}

/** The Advanced Movement Vectors hexagon of the AeroTech 2 sheets: the six directions A to F, each with a blank to write its vector on. */
export function MovementVectors({ x, y }: { x: number; y: number }) {
  const r = 46;
  const corner = (i: number): [number, number] => [x + 110 + r * Math.cos((Math.PI / 3) * i - Math.PI / 6), y + 120 + r * Math.sin((Math.PI / 3) * i - Math.PI / 6)];
  const points = Array.from({ length: 6 }, (_, i) => corner(i).map((n) => Math.round(n * 10) / 10).join(",")).join(" ");
  const spots: [string, number, number, "start" | "middle" | "end"][] = [
    ["A", x + 110, y + 50, "middle"],
    ["B", x + 172, y + 90, "start"],
    ["C", x + 172, y + 160, "start"],
    ["D", x + 110, y + 196, "middle"],
    ["E", x + 48, y + 160, "end"],
    ["F", x + 48, y + 90, "end"],
  ];
  return (
    <g data-vectors="">
      <text x={x} y={y + 14} fontSize={22} fontWeight={700} fill={INK}>
        Advanced Movement Vectors
      </text>
      <polygon points={points} fill="#fff" stroke={INK} strokeWidth={3} />
      {spots.map(([letter, sx, sy, anchor]) => (
        <text key={letter} x={sx} y={sy} fontSize={22} fontWeight={700} textAnchor={anchor} fill={INK}>
          {letter}
        </text>
      ))}
    </g>
  );
}
