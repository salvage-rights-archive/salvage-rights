// The two sections of the campaign page that edit the record: the roster (buy, sell, mark) and the Named Pilots (allocate SP, hire).
// Both change the draft; the page saves it. Findings are advice.
import { useId, useState } from "react";
import { CAMPAIGN_FIGURES, PILOT_COLUMNS, PILOT_TYPES, PRICES, type PilotColumn, type PilotType } from "../../data/aces";
import {
  allocationFindings,
  buyPrice,
  hirePilot,
  livingPilots,
  newPilot,
  nextUnlock,
  pilotStats,
  purchaseUnit,
  sellPrice,
  sellUnit,
  setUnitStatus,
  unallocated,
} from "../../rules/aces-campaign";
import type { AcesCampaign, NamedPilot } from "../../rules/aces-campaign";
import type { AsUnit } from "../../rules/as-unit";
import { unitTitle } from "../../rules/as-unit";

export type Edit = (next: AcesCampaign, say?: string) => void;

const COLUMN_NAMES: Record<PilotColumn, string> = { skill: "Skill", edge: "Edge tokens", abilities: "Edge abilities" };
const toNumber = (text: string): number => {
  const n = Number(text);
  return text.trim() === "" || Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
};

export function RosterSection({ campaign, units, edit }: { campaign: AcesCampaign; units: AsUnit[]; edit: Edit }) {
  const uid = useId();
  const [buying, setBuying] = useState("");
  const owned = new Set(campaign.roster.map((r) => r.unitId));
  const forSale = units.filter((u) => !owned.has(u.id));
  const visible = campaign.roster.filter((r) => r.status !== "sold");
  const sold = campaign.roster.length - visible.length;
  const buy = () => {
    const unit = forSale.find((u) => u.id === buying);
    if (!unit) return;
    const result = purchaseUnit(campaign, { unitId: unit.id, name: unitTitle(unit), type: unit.card.type, chassis: unit.name.chassis, ...(unit.name.model ? { variant: unit.name.model } : {}), pv: unit.card.pv, size: unit.card.size }, `buy-${crypto.randomUUID()}`);
    setBuying("");
    edit(result.campaign, `Bought ${unitTitle(unit)} for ${String(buyPrice(unit.card.pv))} SP.${result.findings.map((f) => ` ${f.text}`).join("")}`);
  };
  return (
    <section aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>Roster</h2>
      {visible.length === 0 ? (
        <p>No units on the roster.</p>
      ) : (
        <ul className="bt-list">
          {visible.map((r) => (
            <li key={r.unitId} className="bt-row">
              <span className="bt-row__text">
                {r.name}
                <span className="bt-row__credit">{`${r.type}, ${String(r.pv)} PV${r.size === undefined ? "" : `, Size ${String(r.size)}`}, ${r.status === "active" ? "ready" : "destroyed"}`}</span>
              </span>
              <span className="bt-row__actions">
                {r.status === "active" ? (
                  <>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Sell ${r.name} for ${String(sellPrice(r.pv))} SP`} onClick={() => { edit(sellUnit(campaign, r.unitId, `sell-${crypto.randomUUID()}`), `Sold ${r.name} for ${String(sellPrice(r.pv))} SP.`); }}>
                      Sell
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Mark ${r.name} destroyed`} onClick={() => { edit(setUnitStatus(campaign, r.unitId, "destroyed"), `${r.name} marked destroyed.`); }}>
                      Destroyed
                    </button>
                  </>
                ) : (
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Mark ${r.name} ready again`} onClick={() => { edit(setUnitStatus(campaign, r.unitId, "active"), `${r.name} marked ready.`); }}>
                    Ready again
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {sold > 0 && <p className="bt-hint">{`${String(sold)} sold unit${sold === 1 ? " is" : "s are"} not listed.`}</p>}
      <h3>Buy a unit</h3>
      {forSale.length === 0 ? (
        <p className="bt-hint">Every saved Alpha Strike unit is already on the roster.</p>
      ) : (
        <div className="bt-field">
          <label htmlFor={`${uid}-buy`}>{`Unit to buy (PV x ${String(PRICES.buyPerPv)}, ${PRICES.cite})`}</label>
          <select id={`${uid}-buy`} value={buying} onChange={(e) => { setBuying(e.target.value); }}>
            <option value="">Choose a unit</option>
            {forSale.map((u) => (
              <option key={u.id} value={u.id}>{`${unitTitle(u)} (${u.card.type}, ${String(u.card.pv)} PV, ${String(buyPrice(u.card.pv))} SP)`}</option>
            ))}
          </select>
          <button type="button" className="bt-button" disabled={buying === ""} onClick={buy}>
            Buy
          </button>
        </div>
      )}
    </section>
  );
}

function PilotCard({ pilot, onChange }: { pilot: NamedPilot; onChange: (next: NamedPilot) => void }) {
  const stats = pilotStats(pilot);
  const left = unallocated(pilot);
  const notes = allocationFindings(pilot);
  const id = useId();
  const setAlloc = (column: PilotColumn, text: string) => { onChange({ ...pilot, alloc: { ...pilot.alloc, [column]: toNumber(text) } }); };
  return (
    <fieldset className="aces-fieldset">
      <legend>{`${pilot.callsign}, ${PILOT_TYPES.find((t) => t.id === pilot.type)?.label ?? pilot.type}`}</legend>
      <p>{`Skill ${String(stats.skill)}, Edge ${String(stats.edge)}, ${String(stats.abilities)} Edge abilit${stats.abilities === 1 ? "y" : "ies"}. ${String(pilot.totalSp)} SP earned, ${String(left)} to allocate.`}</p>
      {PILOT_COLUMNS.map((c) => {
        const next = nextUnlock(c.id, pilot.alloc[c.id]);
        return (
          <div key={c.id} className="bt-field">
            <label htmlFor={`${id}-${c.id}`}>{`${COLUMN_NAMES[c.id]} SP${next ? ` (${String(next.more)} more for ${String(next.value)})` : " (top of the column)"}`}</label>
            <input id={`${id}-${c.id}`} type="number" inputMode="numeric" min={0} value={pilot.alloc[c.id]} onChange={(e) => { setAlloc(c.id, e.target.value); }} />
          </div>
        );
      })}
      <div className="bt-field">
        <label htmlFor={`${id}-abilities`}>Edge ability names, as you write them, separated by commas</label>
        <input id={`${id}-abilities`} value={pilot.abilities.join(", ")} onChange={(e) => { onChange({ ...pilot, abilities: e.target.value.split(",").map((a) => a.trim()).filter((a) => a !== "") }); }} />
      </div>
      <label className="bt-check">
        <input type="checkbox" checked={pilot.wounded} onChange={(e) => { onChange({ ...pilot, wounded: e.target.checked }); }} /> {`${pilot.callsign} is wounded`}
      </label>
      <label className="bt-check">
        <input type="checkbox" checked={pilot.killed} onChange={(e) => { onChange({ ...pilot, killed: e.target.checked, wounded: false }); }} /> {`${pilot.callsign} was killed`}
      </label>
      {notes.length > 0 && (
        <ul className="bt-hint">
          {notes.map((n) => (
            <li key={n.id}>{`${n.text} (${n.cite})`}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export function PilotsSection({ campaign, edit }: { campaign: AcesCampaign; edit: Edit }) {
  const uid = useId();
  const [callsign, setCallsign] = useState("");
  const [type, setType] = useState<PilotType>("BM");
  const [replacement, setReplacement] = useState(false);
  const living = livingPilots(campaign);
  const change = (next: NamedPilot) => { edit({ ...campaign, pilots: campaign.pilots.map((p) => (p.id === next.id ? next : p)) }); };
  const hire = () => {
    const name = callsign.trim();
    if (name === "") return;
    const pilot = newPilot(`pilot-${crypto.randomUUID()}`, name, type);
    setCallsign("");
    setReplacement(false);
    edit(hirePilot(campaign, pilot, { replacement, ledgerId: `hire-${pilot.id}` }), `Hired ${name}${replacement ? ` for ${String(CAMPAIGN_FIGURES.replacementPilotCost)} SP` : ""}.`);
  };
  return (
    <section aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>Named Pilots</h2>
      {living.length === 0 && <p>No Named Pilots yet.</p>}
      {living.map((p) => (
        <PilotCard key={p.id} pilot={p} onChange={change} />
      ))}
      <h3>Hire a Named Pilot</h3>
      <div className="bt-field">
        <label htmlFor={`${uid}-cs`}>Call sign</label>
        <input id={`${uid}-cs`} value={callsign} maxLength={40} onChange={(e) => { setCallsign(e.target.value); }} />
        <select aria-label="Type of the new pilot" value={type} onChange={(e) => { setType(e.target.value as PilotType); }}>
          {PILOT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <label className="bt-check">
        <input type="checkbox" checked={replacement} onChange={(e) => { setReplacement(e.target.checked); }} /> {`This replaces a killed pilot (costs ${String(CAMPAIGN_FIGURES.replacementPilotCost)} SP from the warchest)`}
      </label>
      <p>
        <button type="button" className="bt-button" disabled={callsign.trim() === ""} onClick={hire}>
          Hire
        </button>
      </p>
    </section>
  );
}
