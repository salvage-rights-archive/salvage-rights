// The command card editor (design 6.1): identity, orders by phase, the three colour lists, the support side and the ordered strategy
// rows. A commander has five cards, lettered A to E (pp. 8, 10). Built from our own vocabulary; nothing is saved until Save.
import { useState } from "react";
import { ACES_LETTERS, ACES_VALUES } from "../../data/aces-vocab";
import type { CommandLetter } from "../../data/aces-vocab";
import { renderCondition, renderUse } from "../../rules/aces-card";
import type { CommandCard } from "../../rules/aces-card";
import { OrdersPreview, CommandOrders, StrategyRows } from "./OrderEditor";
import { NoteField, RecordFrame, withNote } from "./RecordFrame";
import { commandHref } from "./routes";
import { SupportSide } from "./SupportEditor";
import { TokenList } from "./TokenPicker";

const DECK = 10;
type Step = "identity" | "orders" | "colours" | "support" | "strategy";
const STEPS: { id: Step; name: string }[] = [
  { id: "identity", name: "1. Identity" },
  { id: "orders", name: "2. Orders" },
  { id: "colours", name: "3. Colour lists" },
  { id: "support", name: "4. Support side" },
  { id: "strategy", name: "5. Strategy rows" },
];

export const makeCommand = (id: string, at: string): CommandCard => ({
  schema: 1,
  kind: "aces-command",
  id,
  commander: "",
  faction: "",
  letter: "A",
  position: 1,
  of: DECK,
  orders: [],
  colours: { red: [], yellow: [], blue: [] },
  support: { spend: { token: "spend-never" }, emplacements: { rings: [], keys: [] }, artillery: [], bsp: [] },
  strategy: [],
  source: { kind: "entered", at },
});

const titleOf = (c: CommandCard): string => (c.commander.trim() === "" ? "New command card" : `${c.commander.trim()}${c.faction.trim() ? ` (${c.faction.trim()})` : ""}, card ${c.letter}`);

function CommandForm({ card, set, uid }: { card: CommandCard; set: (c: CommandCard) => void; uid: string }) {
  const [step, setStep] = useState<Step>("identity");
  return (
    <>
      <nav aria-label="Steps" className="aces-steps">
        {STEPS.map((s) => (
          <button key={s.id} type="button" className="bt-button bt-button--secondary aces-step" aria-pressed={step === s.id} onClick={() => { setStep(s.id); }}>
            {s.name}
          </button>
        ))}
      </nav>

      {step === "identity" && (
        <section aria-labelledby={`${uid}-identity`}>
          <h2 id={`${uid}-identity`}>Identity</h2>
          <div className="bt-field">
            <label htmlFor={`${uid}-commander`}>Commander</label>
            <input id={`${uid}-commander`} value={card.commander} onChange={(e) => { set({ ...card, commander: e.target.value }); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-faction`}>Faction</label>
            <input id={`${uid}-faction`} value={card.faction} onChange={(e) => { set({ ...card, faction: e.target.value }); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-letter`}>Card letter</label>
            <select id={`${uid}-letter`} value={card.letter} onChange={(e) => { set({ ...card, letter: e.target.value as CommandLetter }); }}>
              {ACES_LETTERS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-position`}>{`Card number in the deck (n of ${String(card.of)})`}</label>
            <select id={`${uid}-position`} value={String(card.position)} onChange={(e) => { set({ ...card, position: Number(e.target.value) }); }}>
              {Array.from({ length: card.of }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {String(n)}
                </option>
              ))}
            </select>
          </div>
          <NoteField id={`${uid}-note`} record={card} onChange={(n) => { set(withNote(card, n)); }} />
        </section>
      )}

      {step === "orders" && (
        <section aria-labelledby={`${uid}-orders`}>
          <h2 id={`${uid}-orders`}>Orders</h2>
          <CommandOrders idBase={`${uid}-orders-list`} orders={card.orders} onChange={(orders) => { set({ ...card, orders }); }} />
        </section>
      )}

      {step === "colours" && (
        <section aria-labelledby={`${uid}-colours`}>
          <h2 id={`${uid}-colours`}>Colour lists</h2>
          {ACES_VALUES.colour.map((c) => (
            <TokenList
              key={c.id}
              idBase={`${uid}-colour-${c.id}`}
              heading={`${c.label} list, in order`}
              slot="key"
              side="command"
              items={card.colours[c.id]}
              addLabel={`Add a key to the ${c.label} list`}
              empty="Nothing recorded yet."
              onChange={(keys) => { set({ ...card, colours: { ...card.colours, [c.id]: keys } }); }}
            />
          ))}
        </section>
      )}

      {step === "support" && (
        <section aria-labelledby={`${uid}-support`}>
          <h2 id={`${uid}-support`}>Support side</h2>
          <SupportSide idBase={`${uid}-support-side`} support={card.support} onChange={(support) => { set({ ...card, support }); }} />
        </section>
      )}

      {step === "strategy" && (
        <section aria-labelledby={`${uid}-strategy`}>
          <h2 id={`${uid}-strategy`}>Strategy rows</h2>
          <StrategyRows idBase={`${uid}-strategy-list`} rows={card.strategy} onChange={(strategy) => { set({ ...card, strategy }); }} />
        </section>
      )}
    </>
  );
}

function CommandPreview({ card }: { card: CommandCard }) {
  const list = (keys: CommandCard["colours"]["red"]) => (keys.length === 0 ? "nothing recorded" : keys.map(renderUse).join(", then "));
  return (
    <>
      <p>
        <strong>{titleOf(card)}</strong>
        {` (${String(card.position)} of ${String(card.of)})`}
      </p>
      <section className="aces-preview-col" aria-label="Orders preview">
        <h3>Orders</h3>
        <OrdersPreview orders={card.orders} />
      </section>
      <section className="aces-preview-col" aria-label="Colour lists preview">
        <h3>Colour lists</h3>
        <dl>
          {ACES_VALUES.colour.map((c) => (
            <div key={c.id}>
              <dt>{c.label}</dt>
              <dd>{list(card.colours[c.id])}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="aces-preview-col" aria-label="Support side preview">
        <h3>Support side</h3>
        <p>{renderUse(card.support.spend)}</p>
        <p>{`Emplacements: ${card.support.emplacements.rings.length > 0 ? `rings ${card.support.emplacements.rings.map((r) => `${String(r)}"`).join(" / ")}; ` : ""}${list(card.support.emplacements.keys)}`}</p>
        <p>{`Artillery: ${list(card.support.artillery)}`}</p>
        <p>{`Support cards: ${list(card.support.bsp)}`}</p>
      </section>
      <section className="aces-preview-col" aria-label="Strategy rows preview">
        <h3>Strategy rows</h3>
        {card.strategy.length === 0 ? (
          <p className="bt-hint">No rows recorded.</p>
        ) : (
          <ol className="aces-preview-col__filters">
            {card.strategy.map((row, i) => (
              <li key={i}>{`${row.letter === null ? "Keep this card" : `Change to ${row.letter}`}, if ${renderCondition(row.when) || "no test recorded yet"}`}</li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

export default function CommandEditorPage() {
  return (
    <RecordFrame<CommandCard>
      kind="aces-command"
      noun="command card"
      make={makeCommand}
      heading={titleOf}
      hint={(c) => (c.orders.length + c.strategy.length === 0 ? "Only the identity is recorded so far. The game will tell you to read this card." : "This card is recorded.")}
      problems={(c) => [...(c.commander.trim() === "" ? ["Name the commander."] : []), ...(c.position < 1 || c.position > c.of ? [`Choose a card number from 1 to ${String(c.of)}.`] : [])]}
      href={commandHref}
      form={(card, set, uid) => <CommandForm card={card} set={set} uid={uid} />}
      preview={(card) => <CommandPreview card={card} />}
    />
  );
}
