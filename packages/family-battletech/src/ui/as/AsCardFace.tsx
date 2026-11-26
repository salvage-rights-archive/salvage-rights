// One printed Alpha Strike card, drawn by us in SVG (3.5 by 2.5 inches, 100 units to the inch) in the arrangement and with the field labels
// of the blank card on ASCE p. 213 (the publisher marks pp. 213-215 for personal copying). No logo, no art. Black on white whatever the
// theme, so it prints the same in both.
import { AS_CARD_FOOT, DEFAULT_SKILL } from "../../data/alpha-strike";
import { bubbleLayout } from "../../rules/as-print";
import type { PrintCard } from "../../rules/as-print";

export const CARD_WIDTH = 350;
export const CARD_HEIGHT = 250;

const PANEL = "#e4e4e4";
const STRUCTURE_FILL = "#b4b4b4";
/** Three no-break spaces between one field and the next. */
const GAP = "   ";
const HEAT = ["1", "2", "3", "S"];

/**
 * An estimated width in card units for text at a font size. Bold and all-capital text is wider (about 0.7 em a letter) than plain
 * text (0.58), so a long name is squeezed to its space rather than run over.
 */
export function estimate(text: string, size: number, bold = false, mixed = false): number {
  const caps = text === text.toUpperCase() && /[A-Z]/.test(text);
  return text.length * size * (mixed ? 0.62 : bold || caps ? 0.7 : 0.58);
}

/**
 * Text kept inside `max` card units. `measure` is the text as it will read; the children may mix bold and plain. Too wide, it first
 * shrinks (down to 60 percent of its size, so it stays legible, and never stretches); only past that is it squeezed to the width.
 */
function Guard({ measure, x, y, size, max, anchor = "start", weight = 400, bold = false, mixed = false, children }: { measure: string; x: number; y: number; size: number; max: number; anchor?: "start" | "end" | "middle"; weight?: number; bold?: boolean; mixed?: boolean; children: React.ReactNode }) {
  const wide = estimate(measure, size, bold || weight >= 600, mixed);
  const shrunk = wide > max ? size * Math.max(0.6, max / wide) : size;
  const squeeze = wide * (shrunk / size) > max;
  return (
    <text x={x} y={y} fontSize={shrunk} fontWeight={weight} textAnchor={anchor} data-fit={wide > max ? "shrunk" : undefined} {...(squeeze ? { textLength: max, lengthAdjust: "spacingAndGlyphs" } : {})}>
      {children}
    </text>
  );
}

function Fit({ text, x, y, size, max, anchor = "start", weight = 400 }: { text: string; x: number; y: number; size: number; max: number; anchor?: "start" | "end" | "middle"; weight?: number }) {
  return (
    <Guard measure={text} x={x} y={y} size={size} max={max} anchor={anchor} weight={weight}>
      {text}
    </Guard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <tspan fontWeight={700}>{`${label} `}</tspan>
      {`${value}${GAP}`}
    </>
  );
}

function Crits({ card }: { card: PrintCard }) {
  if (card.crits.length === 0) return null;
  const x = 218;
  const width = 124;
  const pitch = 10.5;
  const lines = card.crits.reduce((n, row) => n + 1 + (row.also === undefined ? 0 : 1), 0);
  const height = 21 + lines * pitch;
  const top = 216 - height;
  const linesBefore = (i: number): number => card.crits.slice(0, i).reduce((n, row) => n + 1 + (row.also === undefined ? 0 : 1), 0);
  return (
    <g className="as-cardface__crits">
      <rect x={x} y={top} width={width} height={height} rx={7} fill={PANEL} stroke="#000" strokeWidth={1.2} />
      <text x={x + width / 2} y={top + 12} fontSize={9} fontWeight={700} textAnchor="middle">CRITICAL HITS</text>
      {card.crits.map((row, index) => {
        const y = top + 25 + linesBefore(index) * pitch;
        let at = x + 47;
        return (
          <g key={row.label}>
            <text x={x + 44} y={y} fontSize={5.4} fontWeight={700} textAnchor="end">{row.label.toUpperCase()}</text>
            {row.groups.map((count, g) => {
              const start = at;
              at += count * 8.2 + 1;
              const effect = row.effects[g] ?? "";
              at += effect.length * 3.3 + 3;
              return (
                <g key={g}>
                  {Array.from({ length: count }, (_, b) => (
                    <circle key={b} className="as-cardface__crit" cx={start + 3.3 + b * 8.2} cy={y - 2.2} r={3.1} fill="#fff" stroke="#000" strokeWidth={0.9} />
                  ))}
                  <text x={start + count * 8.2 + 0.5} y={y} fontSize={6.2}>{effect}</text>
                </g>
              );
            })}
            {row.also !== undefined && <text x={x + 47} y={y + pitch} fontSize={6.2}>{row.also}</text>}
          </g>
        );
      })}
    </g>
  );
}

export default function AsCardFace({ card }: { card: PrintCard }) {
  const title = card.title || "Unnamed unit";
  const bubbleWidth = card.air ? 130 : 156;
  const bubbles = bubbleLayout(card.armor, card.structure, bubbleWidth, 26);
  const rowY = (row: number) => 148 + row * bubbles.pitch + bubbles.diameter / 2;
  const fit = card.specialsFit;
  const label = `${title}: PV ${String(card.pv)} at Skill ${String(card.skill)}, armor ${String(card.armor)}, structure ${String(card.structure)}`;
  return (
    <svg className="as-cardface" viewBox={`0 0 ${String(CARD_WIDTH)} ${String(CARD_HEIGHT)}`} role="img" aria-label={label} data-unit={card.unitId}>
      <rect x={2} y={2} width={346} height={246} rx={9} fill="#fff" stroke="#000" strokeWidth={3} />

      <text x={13} y={15} fontSize={6.5} fontWeight={700} letterSpacing={0.8}>UNIT NAME</text>
      <Fit text={title} x={13} y={38} size={19} max={214} weight={800} />

      <path d="M240 6 L340 6 L340 44 L252 44 Z" fill="#d4d4d4" stroke="#000" strokeWidth={1} />
      <text x={254} y={34} fontSize={13} fontWeight={800}>PV:</text>
      <text x={334} y={36} fontSize={26} fontWeight={800} textAnchor="end" className="as-cardface__pv">{String(card.pv)}</text>

      {card.pv !== card.basePv && <text x={334} y={52} fontSize={6.5} textAnchor="end" className="as-cardface__base">{`base PV ${String(card.basePv)} at Skill ${String(DEFAULT_SKILL)}`}</text>}
      {card.pilot !== "" && (
        <g>
          <text x={226} y={68} fontSize={6} fontWeight={700} letterSpacing={0.6}>PILOT</text>
          <Fit text={card.pilot} x={226} y={80} size={9.5} max={114} weight={600} />
        </g>
      )}

      <rect x={10} y={54} width={206} height={30} rx={8} fill={PANEL} stroke="#000" strokeWidth={1.2} />
      <Guard measure={`TP: ${card.type}${GAP}SZ: ${String(card.size)}${GAP}${card.air ? `THR: ${card.thrust}` : `TMM: ${card.tmm}${GAP}MV: ${card.move}`}`} x={16} y={66} size={8.5} max={196} mixed>
        <Field label="TP:" value={card.type} />
        <Field label="SZ:" value={String(card.size)} />
        {card.air ? <Field label="THR:" value={card.thrust} /> : (
          <>
            <Field label="TMM:" value={card.tmm} />
            <Field label="MV:" value={card.move} />
          </>
        )}
      </Guard>
      <Guard measure={`ROLE: ${card.role}`} x={16} y={79} size={8.5} max={108} mixed>
        <Field label="ROLE:" value={card.role} />
      </Guard>
      <text x={130} y={79} fontSize={8.5}>
        <Field label="SKILL:" value={String(card.skill)} />
      </text>

      <rect x={10} y={88} width={206} height={30} rx={8} fill={PANEL} stroke="#000" strokeWidth={1.2} />
      <text x={17} y={103} fontSize={5} fontWeight={700} transform="rotate(-90 17 103)" textAnchor="middle">DAMAGE</text>
      {card.damage.map((d, i) => {
        const cx = 36 + (i + 0.5) * (card.damage.length === 4 ? 44 : 58);
        return (
          <g key={d.bracket}>
            <text x={cx} y={100} fontSize={8.5} fontWeight={700} textAnchor="middle">{d.bracket}</text>
            <text x={cx} y={114} fontSize={12} fontWeight={800} textAnchor="middle" className="as-cardface__damage">{d.value}</text>
          </g>
        );
      })}

      {card.ov !== null && (
        <g>
          <rect x={10} y={122} width={206} height={18} rx={7} fill={PANEL} stroke="#000" strokeWidth={1.2} />
          <text x={16} y={134.5} fontSize={8.5}>
            <tspan fontWeight={700}>OV: </tspan>
            {card.ov}
            {card.heatScale && <tspan fontWeight={700}>{"  |  HEAT SCALE"}</tspan>}
          </text>
          {card.heatScale &&
            HEAT.map((h, i) => (
              <g key={h} className="as-cardface__heat">
                <rect x={147 + i * 16} y={125} width={15} height={12} rx={2} fill="#444" />
                <text x={154.5 + i * 16} y={134.3} fontSize={8} fontWeight={700} fill="#fff" textAnchor="middle">{h}</text>
              </g>
            ))}
        </g>
      )}

      <rect x={10} y={144} width={186} height={32} rx={8} fill={PANEL} stroke="#000" strokeWidth={1.2} />
      {bubbles.mode === "bubbles" ? (
        <>
          <text x={14} y={rowY(0) + 3} fontSize={8} fontWeight={700}>A:</text>
          <text x={14} y={rowY(bubbles.rows.armor) + 3} fontSize={8} fontWeight={700}>S:</text>
          <g transform="translate(29 0)" className="as-cardface__bubbles">
            {bubbles.armor.map((b, i) => (
              <circle key={`a${String(i)}`} className="as-cardface__bubble as-cardface__bubble--armor" cx={b.x} cy={148 + b.y} r={bubbles.diameter / 2} fill="#fff" stroke="#000" strokeWidth={0.9} />
            ))}
            {bubbles.structure.map((b, i) => (
              <circle key={`s${String(i)}`} className="as-cardface__bubble as-cardface__bubble--structure" cx={b.x} cy={148 + b.y} r={bubbles.diameter / 2} fill={STRUCTURE_FILL} stroke="#000" strokeWidth={0.9} />
            ))}
          </g>
        </>
      ) : (
        <g className="as-cardface__figures">
          <text x={14} y={157} fontSize={8} fontWeight={700}>A:</text>
          <rect x={29} y={148} width={card.air ? 100 : 120} height={12} rx={3} fill="#fff" stroke="#000" strokeWidth={0.9} />
          <text x={card.air ? 79 : 89} y={157.5} fontSize={9} fontWeight={700} textAnchor="middle" className="as-cardface__figure">{String(card.armor)}</text>
          <text x={14} y={171} fontSize={8} fontWeight={700}>S:</text>
          <rect x={29} y={162} width={card.air ? 100 : 120} height={12} rx={3} fill={STRUCTURE_FILL} stroke="#000" strokeWidth={0.9} />
          <text x={card.air ? 79 : 89} y={171.5} fontSize={9} fontWeight={700} textAnchor="middle" className="as-cardface__figure">{String(card.structure)}</text>
        </g>
      )}
      {card.air && (
        <g>
          <text x={176} y={158} fontSize={7} fontWeight={700} textAnchor="middle">TH</text>
          <text x={176} y={170} fontSize={9} fontWeight={700} textAnchor="middle">{card.threshold}</text>
        </g>
      )}

      <rect x={10} y={180} width={198} height={38} rx={8} fill={PANEL} stroke="#000" strokeWidth={1.2} />
      <text x={16} y={189} fontSize={7.5} fontWeight={700}>SPECIAL:</text>
      {fit.lines.map((line, i) => (
        <text key={i} x={16} y={198 + i * (fit.size + 1.2)} fontSize={fit.size} className="as-cardface__special">{line}</text>
      ))}

      <Crits card={card} />

      <line x1={10} y1={223} x2={180} y2={223} stroke="#000" strokeWidth={2.5} />
      <text x={14} y={238} fontSize={11} fontWeight={800} letterSpacing={0.3}>ALPHA STRIKE STATS</text>
      <text x={340} y={240} fontSize={7} textAnchor="end">{AS_CARD_FOOT}</text>
    </svg>
  );
}
