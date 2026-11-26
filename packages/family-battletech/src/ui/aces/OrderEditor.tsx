// The order pieces of the command and special order cards: a command card's orders by phase, its ordered strategy rows, and the page
// for one special order card (its column, its pre-filters or its spotter keys, by which of the five orders it is). Rulebook pp. 8,
// 16-17, 20-21. The column and filter editors are the behaviour card's own.
import { useRef } from "react";
import { ACES_LETTERS, ACES_PHASES, ACES_SPECIAL_ORDERS } from "../../data/aces-vocab";
import type { CommandLetter, OrderPhase, SpecialOrderKind } from "../../data/aces-vocab";
import { renderCondition, renderFilter, renderUse } from "../../rules/aces-card";
import type { CommandCard, Order, SpecialOrderCard } from "../../rules/aces-card";
import { ColumnEditor, ColumnPreview, ConditionBuilder, FilterList, emptyColumn } from "./ColumnEditor";
import { NoteField, RecordFrame, withNote } from "./RecordFrame";
import { orderHref } from "./routes";
import { RowButtons, TokenList, moved, useRowFocus } from "./TokenPicker";

const phaseLabel = (id: string): string => ACES_PHASES.find((p) => p.id === id)?.label ?? id;

/** The command card's orders, each with the phase it belongs to, an optional "only if", and the keys or filters some orders carry. */
export function CommandOrders({ idBase, orders, onChange }: { idBase: string; orders: Order[]; onChange: (o: Order[]) => void }) {
  return (
    <TokenList
      idBase={idBase}
      heading="Orders, as printed"
      slot="order"
      side="command"
      items={orders}
      addLabel="Add an order"
      empty="No orders recorded yet."
      onChange={(items) => { onChange(items.map((i) => ({ phase: "any" as OrderPhase, ...i }))); }}
      extra={(item, set, id) => {
        const order = item as Order;
        const put = (o: Order): void => { set(o); };
        return (
          <div className="aces-order">
            <div className="bt-field">
              <label htmlFor={`${id}-phase`}>Phase</label>
              <select id={`${id}-phase`} value={order.phase} onChange={(e) => { put({ ...order, phase: e.target.value as OrderPhase }); }}>
                {ACES_PHASES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <ConditionBuilder
              idBase={`${id}-when`}
              heading="Only if"
              side="command"
              value={order.when}
              empty="It always applies."
              onChange={(c) => {
                const { when: _drop, ...rest } = order;
                void _drop;
                put(c ? { ...rest, when: c } : rest);
              }}
            />
            {order.token === "give-token" && (
              <TokenList idBase={`${id}-keys`} heading="Choose the unit by, in order" slot="key" side="command" items={order.keys ?? []} addLabel="Add a way to choose the unit" empty="Nothing recorded yet." onChange={(keys) => { put({ ...order, keys }); }} />
            )}
            {order.token === "add-filters" && (
              <FilterList idBase={`${id}-filters`} heading="Filters to put first" side="movement" filters={order.filters ?? []} addLabel="Add a filter to put first" empty="No filters recorded yet." onChange={(filters) => { put({ ...order, filters }); }} />
            )}
          </div>
        );
      }}
    />
  );
}

/** The orders in our words, for a preview. */
export function OrdersPreview({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return <p className="bt-hint">No orders recorded.</p>;
  return (
    <ol className="aces-preview-col__filters">
      {orders.map((o, i) => (
        <li key={i}>
          {`${phaseLabel(o.phase)}: ${renderUse(o)}${o.when ? `, if ${renderCondition(o.when)}` : ""}`}
          {o.keys && o.keys.length > 0 && <span className="bt-hint">{` (by ${o.keys.map(renderUse).join(", then ")})`}</span>}
          {o.filters && o.filters.length > 0 && <span className="bt-hint">{` (${o.filters.map(renderFilter).join("; ")})`}</span>}
        </li>
      ))}
    </ol>
  );
}

type Strategy = CommandCard["strategy"];

/** The strategy rows in printed order: the first whose test holds names the next card (p. 21). */
export function StrategyRows({ idBase, rows, onChange }: { idBase: string; rows: Strategy; onChange: (r: Strategy) => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  const want = useRowFocus(listRef);
  const set = (i: number, row: Strategy[number]) => { onChange(rows.map((x, at) => (at === i ? row : x))); };
  return (
    <div className="aces-list">
      <h3>Strategy rows, top to bottom</h3>
      {rows.length === 0 ? (
        <p className="bt-hint">No rows recorded yet. With none, the card stays as it is.</p>
      ) : (
        <ul ref={listRef} className="bt-list aces-use-list">
          {rows.map((row, i) => {
            const text = `${row.letter === null ? "keep this card" : `change to ${row.letter}`}, if ${renderCondition(row.when) || "no test recorded yet"}`;
            return (
              <li key={i} className="bt-row aces-use">
                <span className="bt-row__text aces-use__text">{`${String(i + 1)}. ${text}`}</span>
                <RowButtons
                  what={`${String(i + 1)}. ${text}`}
                  index={i}
                  count={rows.length}
                  onMove={(to) => {
                    want(to, to < i ? "up" : "down");
                    onChange(moved(rows, i, to));
                  }}
                  onRemove={() => {
                    want(Math.min(i, rows.length - 2), "remove");
                    onChange(rows.filter((_, at) => at !== i));
                  }}
                />
                <div className="aces-params">
                  <div className="bt-field">
                    <label htmlFor={`${idBase}-${String(i)}-letter`}>{`Row ${String(i + 1)} names`}</label>
                    <select id={`${idBase}-${String(i)}-letter`} value={row.letter ?? ""} onChange={(e) => { set(i, { ...row, letter: e.target.value === "" ? null : (e.target.value as CommandLetter) }); }}>
                      <option value="">Keep the current card</option>
                      {ACES_LETTERS.map((l) => (
                        <option key={l} value={l}>
                          {`Change to card ${l}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <ConditionBuilder
                  idBase={`${idBase}-${String(i)}-when`}
                  heading={`Row ${String(i + 1)} applies when`}
                  slot="strategy"
                  side="command"
                  value={row.when.clauses.length === 0 ? undefined : row.when}
                  empty="No test recorded yet."
                  onChange={(c) => { set(i, { ...row, when: c ?? { join: row.when.join, clauses: [] } }); }}
                />
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        className="bt-button bt-button--secondary"
        onClick={() => {
          want(rows.length, "first");
          onChange([...rows, { letter: null, when: { join: "all", clauses: [] } }]);
        }}
      >
        Add a strategy row
      </button>
    </div>
  );
}

// ---- The special order card page ------------------------------------------------------------------------------------------------

const makeOrder = (id: string, at: string): SpecialOrderCard => ({ schema: 1, kind: "aces-order", id, order: "forced-withdrawal", source: { kind: "entered", at } });
const orderLabel = (kind: SpecialOrderKind): string => ACES_SPECIAL_ORDERS.find((o) => o.id === kind)?.label ?? kind;
const COLUMN_ORDERS: SpecialOrderKind[] = ["forced-withdrawal", "fleeing"];

function OrderForm({ card, set, uid }: { card: SpecialOrderCard; set: (c: SpecialOrderCard) => void; uid: string }) {
  const name = orderLabel(card.order);
  const drop = <K extends "column" | "preFilters" | "spotter">(key: K): SpecialOrderCard => {
    const { [key]: _drop, ...rest } = card;
    void _drop;
    return rest as SpecialOrderCard;
  };
  return (
    <>
      <section aria-labelledby={`${uid}-which`}>
        <h2 id={`${uid}-which`}>Which order</h2>
        <div className="bt-field">
          <label htmlFor={`${uid}-kind`}>Special order</label>
          <select id={`${uid}-kind`} value={card.order} onChange={(e) => { set({ ...card, order: e.target.value as SpecialOrderKind }); }}>
            {ACES_SPECIAL_ORDERS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {COLUMN_ORDERS.includes(card.order) && (
        <section aria-labelledby={`${uid}-column`}>
          <h2 id={`${uid}-column`}>{`The ${name} column`}</h2>
          {card.column ? (
            <>
              <ColumnEditor idBase={`${uid}-col`} name={name} column={card.column} hasWhen side="special" onChange={(column) => { set({ ...card, column }); }} />
              <button type="button" className="bt-button bt-button--secondary" onClick={() => { set(drop("column")); }}>
                Forget the recorded column
              </button>
            </>
          ) : (
            <>
              <p className="bt-hint">Nothing recorded for this order. The game will tell you to read the card.</p>
              <button type="button" className="bt-button bt-button--secondary" onClick={() => { set({ ...card, column: emptyColumn() }); }}>
                Record the column
              </button>
            </>
          )}
        </section>
      )}

      {card.order === "movement-objective" && (
        <section aria-labelledby={`${uid}-pre`}>
          <h2 id={`${uid}-pre`}>Filters put first</h2>
          <FilterList idBase={`${uid}-pre-list`} heading="Numbered 0a, 0b, 0c, in order" side="special" filters={card.preFilters ?? []} addLabel="Add a filter to the objective's list" empty="No filters recorded yet." onChange={(f) => { set(f.length === 0 ? drop("preFilters") : { ...card, preFilters: f }); }} />
        </section>
      )}

      {card.order === "indirect-attacks" && (
        <section aria-labelledby={`${uid}-spot`}>
          <h2 id={`${uid}-spot`}>Choosing the spotter</h2>
          <TokenList idBase={`${uid}-spot-list`} heading="Choose the spotter by, in order" slot="spotter" side="special" items={card.spotter ?? []} addLabel="Add a way to choose the spotter" empty="Nothing recorded yet." onChange={(k) => { set(k.length === 0 ? drop("spotter") : { ...card, spotter: k }); }} />
        </section>
      )}

      {card.order === "destroy-objective" && <p className="bt-hint">The rulebook sets what this order does (p. 17), so there is nothing to record except your own notes.</p>}

      <NoteField id={`${uid}-note`} record={card} onChange={(n) => { set(withNote(card, n)); }} />
    </>
  );
}

function OrderPreview({ card }: { card: SpecialOrderCard }) {
  const name = orderLabel(card.order);
  return (
    <>
      <p>
        <strong>{name}</strong>
      </p>
      {card.column && <ColumnPreview name={`${name}`} column={card.column} />}
      {card.preFilters && card.preFilters.length > 0 && (
        <ol className="aces-preview-col__filters">
          {card.preFilters.map((f, i) => (
            <li key={i}>{renderFilter(f)}</li>
          ))}
        </ol>
      )}
      {card.spotter && card.spotter.length > 0 && <p>{`Spotter: ${card.spotter.map(renderUse).join(", then ")}`}</p>}
      {!card.column && !card.preFilters?.length && !card.spotter?.length && <p className="bt-hint">Nothing recorded for this order.</p>}
    </>
  );
}

export default function SpecialOrderPage() {
  return (
    <RecordFrame<SpecialOrderCard>
      kind="aces-order"
      noun="special order card"
      make={makeOrder}
      heading={(c) => `${orderLabel(c.order)} special order`}
      hint={(c) => (c.column || c.preFilters?.length || c.spotter?.length ? "This order is recorded." : "Only the order is recorded so far. The game will tell you to read the card.")}
      problems={() => []}
      href={orderHref}
      form={(card, set, uid) => <OrderForm card={card} set={set} uid={uid} />}
      preview={(card) => <OrderPreview card={card} />}
    />
  );
}

