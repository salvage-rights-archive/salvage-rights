// Battle Value and C-bill cost of the aerospace unit under its edition, worked out by rules/aero-bv.ts and shown with the lines they come from and
// the edition's pages. Nothing here is stored on the record. An edition that prints neither (AeroTech, BattleSpace) shows no figure.
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Catalog } from "../../rules/catalog";
import type { AeroRecord } from "../../rules/aero";
import { aeroBattleValue, aeroCost } from "../../rules/aero-bv";
import type { AeroBv, AeroCost } from "../../rules/aero-bv";
import { Disclosure, Rows, cbills, useScrolls } from "../editor/CalculatorPanel";

// Adding 0 turns a deduction of nothing (-0) into 0.
const number = (x: number) => (x + 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const plural = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

function BvBreakdown({ bv }: { bv: AeroBv }) {
  const { defensive: d, offensive: o } = bv;
  return (
    <>
      <h4>Defensive</h4>
      <Rows
        rows={[
          ...d.lines.map((l): [string, string] => [l.label, number(l.value)]),
          ["Subtotal", number(d.subtotal)],
          ["Unit type modifier", `x ${number(d.modifier)}`],
          ["Defensive battle rating", number(d.rating)],
        ]}
      />
      <h4>Offensive</h4>
      <ul className="bt-calc__weapons">
        {o.weapons.map((w) => (
          <li key={w.mountId}>{`${w.name} (${w.arc}): ${number(w.bv)}, ${w.counted}`}</li>
        ))}
      </ul>
      <Rows
        rows={[
          ...o.lines.map((l): [string, string] => [l.label, number(l.value)]),
          ["Weapon rating", number(o.weaponRating)],
          ["Thrust", `${number(o.thrust)}, factor ${number(o.speedFactor)}`],
          ["Offensive battle rating", number(o.rating)],
          ...(bv.divisor === 1 ? [] : ([["Large vessel divisor", number(bv.divisor)]] as [string, string][])),
        ]}
      />
    </>
  );
}

function CostBreakdown({ cost }: { cost: AeroCost }) {
  return (
    <>
      <ul className="bt-calc__lines">
        {cost.lines.map((line, index) => (
          <li key={index}>
            <span>{line.label}</span>
            <span>{number(line.cost)}</span>
            <span className="bt-calc__how">{line.how}</span>
          </li>
        ))}
      </ul>
      <Rows
        rows={[
          ["Subtotal", number(cost.subtotal)],
          ["Final multiplier", number(cost.multiplier)],
        ]}
      />
    </>
  );
}

function Missing({ items, what }: { items: { name: string; why: string }[]; what: string }) {
  return (
    <div className="bt-calc__incomplete">
      <p>{`Incomplete: ${plural(items.length, "item has", "items have")} no ${what}, so the total is at least this much.`}</p>
      <Disclosure label={`items with no ${what}`}>
        <ul>
          {items.map((item, index) => (
            <li key={`${item.name}-${String(index)}`}>{`${item.name}: ${item.why}`}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

export default function AeroBvPanel({ record, catalog }: { record: AeroRecord; catalog: Catalog }) {
  // Typing in an armor box changes the record on every key; the figures follow at low priority so the box never waits for them.
  const deferred = useDeferredValue(record);
  const bv = useMemo(() => aeroBattleValue(deferred, catalog), [deferred, catalog]);
  const cost = useMemo(() => aeroCost(deferred, catalog), [deferred, catalog]);
  const bvText = bv ? `${bv.unvalued.length > 0 ? "at least " : ""}${number(bv.total)}` : "";
  const costText = cost ? `${cost.unpriced.length > 0 ? "at least " : ""}${cbills(cost.total)}` : "";

  const summary = bv ? `Battle Value ${bvText}.${cost ? ` Cost ${costText}.` : ""}` : "";
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnounced(summary);
    }, 1200);
    return () => {
      clearTimeout(timer);
    };
  }, [summary]);

  const { box, scrolls } = useScrolls();
  return (
    <section ref={box} className="bt-panel bt-calc" aria-labelledby="aero-calc-heading" data-testid="aero-calc" tabIndex={scrolls ? 0 : undefined}>
      <h2 id="aero-calc-heading">Battle Value and cost</h2>
      <p className="sr-visually-hidden" role="status">
        {announced}
      </p>
      {!bv ? (
        <p className="bt-hint">This edition prints no Battle Value or cost, so we show none.</p>
      ) : (
        <>
          <h3>Battle Value</h3>
          <p className="bt-calc__figure" data-testid="bv-total">
            {bvText}
          </p>
          {bv.unvalued.length > 0 && <Missing items={bv.unvalued} what="BV figure" />}
          <Disclosure label="Battle Value breakdown">
            <BvBreakdown bv={bv} />
          </Disclosure>

          <h3>Cost</h3>
          {cost ? (
            <>
              <p className="bt-calc__figure" data-testid="cost-total">
                {costText}
              </p>
              {cost.unpriced.length > 0 && <Missing items={cost.unpriced} what="price" />}
              <Disclosure label="cost breakdown">
                <CostBreakdown cost={cost} />
              </Disclosure>
            </>
          ) : (
            <p className="bt-hint">We do not price JumpShips, WarShips and space stations yet.</p>
          )}

          <p className="bt-calc__cite">{`Battle Value: ${bv.cite}, at Gunnery 4, Piloting 5.${cost ? ` Cost: ${cost.cite}.` : ""}`}</p>
        </>
      )}
    </section>
  );
}
