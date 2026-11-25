// Battle Value and C-Bill cost beneath the rules check. Both are worked out from the record by the rules engines (rules/bv.ts,
// rules/cost.ts) and shown with the lines they come from. Nothing here is stored on the record: the pilot's skills and the
// OmniMech choice are the player's questions of the moment ("what would it be with a Gunnery 3 pilot?"), not facts of the unit.
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { bookName, playCites } from "../../data/editions";
import type { Catalog } from "../../rules/catalog";
import { battleValue } from "../../rules/bv";
import type { BvResult } from "../../rules/bv";
import { unitCost } from "../../rules/cost";
import type { UnitCost } from "../../rules/cost";
import { industrialRulesOf } from "../../rules/mech";
import type { MechRecord } from "../../rules/mech";

export const DEFAULT_PILOT = { gunnery: 4, piloting: 5 };
const SKILLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const number = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });
/** C-Bills with separators; two decimals only when the cost has cents. */
export const cbills = (x: number) => `${number(x)} C-bills`;
const plural = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="bt-calc__disclosure">
      <button
        type="button"
        className="bt-calc__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {`${open ? "Hide" : "Show"} ${label}`}
      </button>
      <div id={id} hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="bt-calc__rows">
      {rows.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BvBreakdown({ bv }: { bv: BvResult }) {
  const { defensive: d, offensive: o, modifiers: m } = bv;
  return (
    <>
      <h4>Defensive</h4>
      <Rows
        rows={[
          ["Armor", number(d.armor)],
          ["Structure", number(d.structure)],
          ["Gyro", number(d.gyro)],
          ["Defensive equipment", number(d.equipment)],
          ["Explosive ammunition and equipment", `-${number(d.explosiveAmmo)}`],
          ["Subtotal", number(d.subtotal)],
          ["Target movement factor", number(d.factor)],
          ["Defensive battle rating", number(d.rating)],
        ]}
      />
      <h4>Offensive</h4>
      <ul className="bt-calc__weapons">
        {o.weapons.map((w) => (
          <li key={w.mountId}>{`${w.name}: ${number(w.modifiedBv)} (${w.counted === "half" ? "half, past heat efficiency" : w.counted === "no heat" ? "no heat" : "full"})`}</li>
        ))}
      </ul>
      <Rows
        rows={[
          ["Ammunition", number(o.ammunition)],
          ["Offensive equipment", number(o.equipment)],
          ["Tonnage", number(o.tonnage)],
          ["Weapon rating", number(o.weaponRating)],
          ["Speed (run and jump)", `${String(o.speedMP)} MP, factor ${number(o.speedFactor)}`],
          ["Offensive battle rating", number(o.rating)],
        ]}
      />
      <h4>Modifiers</h4>
      <Rows
        rows={[
          ["Base Battle Value (Gunnery 4, Piloting 5)", number(bv.baseBv)],
          [`Pilot skill, Gunnery ${String(bv.pilot.gunnery)} / Piloting ${String(bv.pilot.piloting)}`, `x ${number(bv.skillMultiplier)}`],
          ...(m.smallCockpit ? [["Small cockpit", "applied"] as [string, string]] : []),
          ...(m.torsoCockpit ? [["Torso-mounted cockpit", "applied"] as [string, string]] : []),
          ...(m.tsm ? [["Triple-strength myomer", "applied"] as [string, string]] : []),
        ]}
      />
    </>
  );
}

function CostBreakdown({ cost }: { cost: UnitCost }) {
  return (
    <>
      <ul className="bt-calc__lines">
        {cost.lines.map((line, index) => (
          <li key={index}>
            <span>{line.label}</span>
            <span>{number(line.cost)}</span>
            <span className="bt-calc__how">{`${line.how} (${bookName(line.cite.book)}, p. ${String(line.cite.page)})`}</span>
          </li>
        ))}
      </ul>
      <Rows
        rows={[
          ["Structure and equipment", number(cost.structural + cost.equipment + cost.conversion)],
          ["Final multiplier", number(cost.multiplier)],
        ]}
      />
      {cost.notes.length > 0 && (
        <ul className="bt-calc__notes">
          {cost.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The panel scrolls on its own when the column is shorter than it; then it is a tab stop so a keyboard user can scroll it. */
function useScrolls() {
  const box = useRef<HTMLElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setScrolls(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { box, scrolls };
}

export default function CalculatorPanel({ record, catalog }: { record: MechRecord; catalog: Catalog }) {
  const [pilot, setPilot] = useState(DEFAULT_PILOT);
  const [omniChoice, setOmni] = useState(false);
  // A configuration of an OmniMech chassis is an Omni by what it is; the box is for trying the 1.25 on any other 'Mech.
  const omni = record.omni !== undefined || omniChoice;
  const isBase = record.omni?.isBase === true;
  // Typing in an armor box changes the record on every key; the figures follow at low priority so the box never waits for them.
  const deferred = useDeferredValue(record);
  const bv = useMemo(() => battleValue(deferred, catalog, pilot), [deferred, catalog, pilot]);
  const cost = useMemo(() => unitCost(deferred, catalog, { omni }), [deferred, catalog, omni]);
  const { box, scrolls } = useScrolls();

  const incompleteBv = bv.unvalued.length > 0;
  const incompleteCost = cost.unpriced.length > 0;
  const bvText = `${incompleteBv ? "at least " : ""}${number(bv.total)}`;
  const costText = `${incompleteCost ? "at least " : ""}${cbills(cost.total)}`;
  const mordelBv = record.source?.values.battleValue;

  // A status line that is read out once the figures have settled for a moment, not on every key.
  const summary = isBase ? `Cost of the base ${costText}.` : `Battle Value ${bvText}. Cost ${costText}.`;
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnounced(summary);
    }, 1200);
    return () => {
      clearTimeout(timer);
    };
  }, [summary]);

  const ids = { gunnery: useId(), piloting: useId(), omni: useId() };
  return (
    <section ref={box} className="bt-panel bt-calc" aria-labelledby="bt-calc-heading" tabIndex={scrolls ? 0 : undefined}>
      <h2 id="bt-calc-heading">Battle Value and cost</h2>
      <p className="sr-visually-hidden" role="status">
        {announced}
      </p>

      <div className="bt-calc__pilot">
        {(["gunnery", "piloting"] as const).map((skill) => (
          <div key={skill} className="bt-field">
            <label htmlFor={ids[skill]}>{skill === "gunnery" ? "Gunnery" : "Piloting"}</label>
            <select
              id={ids[skill]}
              value={pilot[skill]}
              onChange={(event) => {
                setPilot({ ...pilot, [skill]: Number(event.target.value) });
              }}
            >
              {SKILLS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <h3>Battle Value</h3>
      {isBase ? (
        <p className="bt-hint">The base has no Battle Value: it is not a legal unit until a configuration fills its pods (TechManual p. 44).</p>
      ) : (
      <>
      <p className="bt-calc__figure" data-testid="bv-total">
        {bvText}
      </p>
      {mordelBv !== undefined && mordelBv !== bv.baseBv && (
        <p className="bt-calc__differs">
          {`Mordel gives ${number(mordelBv)}; we work out ${number(bv.baseBv)} at Gunnery 4, Piloting 5, a difference of ${number(Math.abs(mordelBv - bv.baseBv))}. The record sheet prints Mordel's figure.`}
        </p>
      )}
      {incompleteBv && (
        <div className="bt-calc__incomplete">
          <p>{`Incomplete: ${plural(bv.unvalued.length, "item has", "items have")} no BV figure, so the total is at least this much.`}</p>
          <Disclosure label="items with no BV figure">
            <ul>
              {bv.unvalued.map((item, index) => (
                <li key={`${item.mountId ?? item.name}-${String(index)}`}>{`${item.name}: ${item.why}`}</li>
              ))}
            </ul>
          </Disclosure>
        </div>
      )}
      {bv.zeroByRule.length > 0 && (
        <Disclosure label={`${plural(bv.zeroByRule.length, "item", "items")} counted as 0 by the book's rule`}>
          <ul>
            {bv.zeroByRule.map((item, index) => (
              <li key={`${item.mountId ?? item.name}-${String(index)}`}>{`${item.name}: ${item.why}`}</li>
            ))}
          </ul>
        </Disclosure>
      )}
      <Disclosure label="Battle Value breakdown">
        <BvBreakdown bv={bv} />
      </Disclosure>
      </>
      )}

      <h3>{isBase ? "Cost of the base" : "Cost"}</h3>
      <p className="bt-calc__figure" data-testid="cost-total">
        {costText}
      </p>
      {record.omni !== undefined ? (
        <p className="bt-hint">OmniMech: cost x 1.25 on the whole sum, the base and any pods together (TechManual p. 285).</p>
      ) : industrialRulesOf(deferred) === undefined && (
      <label className="bt-check" htmlFor={ids.omni}>
        <input
          id={ids.omni}
          type="checkbox"
          checked={omniChoice}
          onChange={(event) => {
            setOmni(event.target.checked);
          }}
        />
        OmniMech (cost x 1.25)
      </label>
      )}
      {incompleteCost && (
        <div className="bt-calc__incomplete">
          <p>{`Incomplete: ${plural(cost.unpriced.length, "item has", "items have")} no price, so the total is at least this much.`}</p>
          <Disclosure label="items with no price">
            <ul>
              {cost.unpriced.map((item, index) => (
                <li key={`${item.id ?? item.name}-${String(index)}`}>{`${item.name}: ${item.why}`}</li>
              ))}
            </ul>
          </Disclosure>
        </div>
      )}
      <Disclosure label="cost breakdown">
        <CostBreakdown cost={cost} />
      </Disclosure>

      <p className="bt-calc__cite">
        {`Battle Value: ${bookName("TechManual")}, Battle Value v4.1 (replaces pp. 302-314), tables pp. 315-317. Cost: ${bookName("TechManual")}, p. 285, errata v8.0. Pilot skill and OmniMech are not saved with the 'Mech. Play rules it counts, from the play book of this 'Mech's edition: ${playCites(record.editionId)}`}
      </p>
    </section>
  );
}
