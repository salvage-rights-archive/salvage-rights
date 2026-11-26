// The support pieces: the support side of a command card (spend rule, emplacement zone and keys, artillery keys, support card keys;
// rulebook pp. 20-21) and the page for one Battlefield Support card the player owns (name, cost, target number, damage, area).
import { tokenById } from "../../data/aces-vocab";
import type { CommandCard, SupportCard } from "../../rules/aces-card";
import { NoteField, RecordFrame, withNote } from "./RecordFrame";
import { supportHref } from "./routes";
import { Stepper, TokenList, UseFields, newUse, tokensFor } from "./TokenPicker";

type Side = CommandCard["support"];

export function SupportSide({ idBase, support, onChange }: { idBase: string; support: Side; onChange: (s: Side) => void }) {
  const spends = tokensFor("support", "command");
  const rings = support.emplacements.rings;
  const setRings = (next: number[]) => { onChange({ ...support, emplacements: { ...support.emplacements, rings: next } }); };
  return (
    <div className="aces-side">
      <h3>Spending support cards</h3>
      <div className="bt-field">
        <label htmlFor={`${idBase}-spend`}>Support cards are</label>
        <select
          id={`${idBase}-spend`}
          aria-describedby={`${idBase}-spend-hint`}
          value={support.spend.token}
          onChange={(e) => {
            const tok = tokenById.get(e.target.value);
            if (tok) onChange({ ...support, spend: newUse(tok) });
          }}
        >
          {spends.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label.replace(/\{\w+\}/g, "N")}
            </option>
          ))}
          {!spends.some((t) => t.id === support.spend.token) && <option value={support.spend.token}>A step we do not know</option>}
        </select>
        <p className="bt-hint" id={`${idBase}-spend-hint`}>
          A new card starts on keeping its support cards. Check this against your card.
        </p>
      </div>
      <UseFields idBase={`${idBase}-spend-params`} use={support.spend} onChange={(spend) => { onChange({ ...support, spend }); }} />

      <h3>Emplacements</h3>
      <fieldset className="aces-fieldset">
        <legend>Emplacement zone rings, inner to outer</legend>
        {rings.length === 0 && <p className="bt-hint">No rings recorded.</p>}
        {rings.map((r, i) => (
          <Stepper key={i} id={`${idBase}-ring-${String(i)}`} label={`Emplacement ring ${String(i + 1)}`} value={r} min={1} onChange={(v) => { setRings(rings.map((x, at) => (at === i ? (v ?? 1) : x))); }} />
        ))}
        <span className="bt-actions">
          <button type="button" className="bt-button bt-button--secondary" disabled={rings.length >= 3} onClick={() => { setRings([...rings, (rings[rings.length - 1] ?? 0) + 6]); }}>
            Add an emplacement ring
          </button>
          <button type="button" className="bt-button bt-button--secondary" disabled={rings.length === 0} onClick={() => { setRings(rings.slice(0, -1)); }}>
            Remove the last emplacement ring
          </button>
        </span>
      </fieldset>
      <TokenList idBase={`${idBase}-emp`} heading="Emplacements choose a target by, in order" slot="key" side="command" items={support.emplacements.keys} addLabel="Add a way for emplacements to choose" empty="Nothing recorded yet." onChange={(keys) => { onChange({ ...support, emplacements: { ...support.emplacements, keys } }); }} />

      <h3>Artillery</h3>
      <TokenList idBase={`${idBase}-art`} heading="Artillery chooses a target by, in order" slot="key" side="command" items={support.artillery} addLabel="Add a way for artillery to choose" empty="Nothing recorded yet." onChange={(artillery) => { onChange({ ...support, artillery }); }} />

      <h3>Support cards</h3>
      <TokenList idBase={`${idBase}-bsp`} heading="Support cards choose a target by, in order" slot="key" side="command" items={support.bsp} addLabel="Add a way for support cards to choose" empty="Nothing recorded yet." onChange={(bsp) => { onChange({ ...support, bsp }); }} />
    </div>
  );
}

// ---- The support card page ---------------------------------------------------------------------------------------------------------

const makeSupport = (id: string, at: string): SupportCard => ({ schema: 1, kind: "aces-support", id, name: "", cost: 0, tn: 7, damage: 1, area: false, source: { kind: "entered", at } });

export default function SupportCardPage() {
  return (
    <RecordFrame<SupportCard>
      kind="aces-support"
      noun="support card"
      make={makeSupport}
      heading={(c) => (c.name.trim() === "" ? "New support card" : c.name.trim())}
      hint={() => "A Battlefield Support card you own. Only its figures are recorded."}
      problems={(c) => (c.name.trim() === "" ? ["Give the card a name."] : [])}
      href={supportHref}
      form={(card, set, uid) => (
        <section aria-labelledby={`${uid}-support`}>
          <h2 id={`${uid}-support`}>Support card</h2>
          <div className="bt-field">
            <label htmlFor={`${uid}-name`}>Name</label>
            <input id={`${uid}-name`} value={card.name} onChange={(e) => { set({ ...card, name: e.target.value }); }} />
          </div>
          <Stepper id={`${uid}-cost`} label="Cost" value={card.cost} min={0} onChange={(v) => { set({ ...card, cost: v ?? 0 }); }} />
          <Stepper id={`${uid}-tn`} label="Target number" value={card.tn} min={2} max={12} onChange={(v) => { set({ ...card, tn: v ?? 2 }); }} />
          <Stepper id={`${uid}-damage`} label="Damage" value={card.damage} min={0} onChange={(v) => { set({ ...card, damage: v ?? 0 }); }} />
          <label className="bt-check" htmlFor={`${uid}-area`}>
            <input id={`${uid}-area`} type="checkbox" checked={card.area} onChange={(e) => { set({ ...card, area: e.target.checked }); }} />
            Its damage covers an area
          </label>
          <NoteField id={`${uid}-note`} record={card} onChange={(n) => { set(withNote(card, n)); }} />
        </section>
      )}
      preview={(card) => (
        <p>
          <strong>{card.name.trim() === "" ? "No name yet" : card.name.trim()}</strong>
          {`: cost ${String(card.cost)}, target number ${String(card.tn)}, damage ${String(card.damage)}${card.area ? ", area" : ""}.`}
        </p>
      )}
    />
  );
}
