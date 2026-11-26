// Starting an Aces campaign (Aces pp. 26-29): the campaign book or the player's own, the difficulty, a new force or one carried over, the
// units and the Named Pilots. Everything the rules say is advice shown beside the form; nothing here refuses to create a campaign.
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import { CAMPAIGN_FIGURES, DIFFICULTY, PILOT_TYPES, type DifficultyId, type PilotType } from "../../data/aces";
import { existingForceSetup, forceFindings, newCampaign, newPilot, pilotCountFindings, startingWarchest } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import type { AsUnit } from "../../rules/as-unit";
import { unitTitle } from "../../rules/as-unit";
import { LeaveGuard } from "../editor/LeaveConfirm";
import { STORAGE_WRITE_FAILED } from "../storage";
import type { CampaignStorage } from "./campaign-storage";
import { campaignHref } from "./routes";
import "./aces.scss";

interface PilotRow {
  key: number;
  callsign: string;
  type: PilotType;
  sp: string;
}

const toNumber = (text: string): number => {
  const n = Number(text);
  return text.trim() === "" || Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
};

const blank = () => ({
  name: "",
  book: "scouring-sands" as AcesCampaign["book"],
  difficulty: "standard" as DifficultyId,
  existing: false,
  advanced: false,
  warchest: "400",
  legendPv: "",
  legendSp: "",
  picked: [] as string[],
  pilots: [
    { key: 1, callsign: "", type: "BM" as PilotType, sp: String(CAMPAIGN_FIGURES.pilotStartSp) },
    { key: 2, callsign: "", type: "BM" as PilotType, sp: String(CAMPAIGN_FIGURES.pilotStartSp) },
  ] as PilotRow[],
});

export default function NewCampaignForm({ storage, units }: { storage: CampaignStorage; units: AsUnit[] }) {
  const uid = useId();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [problem, setProblem] = useState("");
  const [madeId, setMadeId] = useState<string>();
  const dirty = madeId === undefined && JSON.stringify(form) !== JSON.stringify(blank());

  const chosen = units.filter((u) => form.picked.includes(u.id));
  const totalPv = chosen.reduce((sum, u) => sum + u.card.pv, 0);
  const startWarchest = form.existing ? existingForceSetup({ warchest: toNumber(form.warchest), totalPv }).warchest : startingWarchest(totalPv);

  // Legendary's "or less" (p. 28): a harder number than the book's, kept only when it really is harder.
  const legend = DIFFICULTY.find((d) => d.id === "legendary");
  const legendPv = form.legendPv.trim() === "" ? undefined : Math.trunc(Number(form.legendPv));
  const legendSp = form.legendSp.trim() === "" ? undefined : Math.trunc(Number(form.legendSp));
  const customPv = form.difficulty === "legendary" && legend && legendPv !== undefined && !Number.isNaN(legendPv) && legendPv <= legend.pvPercent ? legendPv : undefined;
  const customSp = form.difficulty === "legendary" && legend && legendSp !== undefined && !Number.isNaN(legendSp) && legendSp >= 0 && legendSp <= legend.spPercent ? legendSp : undefined;

  const build = (id: string): AcesCampaign => ({
    ...newCampaign({ id, name: form.name.trim(), book: form.book, difficulty: form.difficulty, startWarchest, existingForce: form.existing }),
    ...(customPv !== undefined ? { customPvPercent: customPv } : {}),
    ...(customSp !== undefined ? { customSpPercent: customSp } : {}),
    roster: chosen.map((u) => ({ unitId: u.id, name: unitTitle(u), type: u.card.type, chassis: u.name.chassis, ...(u.name.model ? { variant: u.name.model } : {}), pv: u.card.pv, size: u.card.size, status: "active" as const })),
    pilots: form.pilots.map((p, i) => ({ ...newPilot(`${id}-p${String(i + 1)}`, p.callsign.trim() || `Pilot ${String(i + 1)}`, p.type), totalSp: form.existing ? toNumber(p.sp) : CAMPAIGN_FIGURES.pilotStartSp })),
  });
  const preview = build("preview");
  const findings = [
    ...forceFindings(
      preview.roster.map((r) => ({ name: r.name, type: r.type, chassis: r.chassis, variant: r.variant, pv: r.pv })),
      { advanced: form.advanced },
    ),
    ...pilotCountFindings(preview),
  ];

  useEffect(() => {
    if (madeId !== undefined) void navigate(campaignHref(madeId));
  }, [madeId, navigate]);

  const create = async () => {
    const campaign = build(crypto.randomUUID());
    try {
      await storage.save(campaign);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setMadeId(campaign.id);
  };

  const set = (patch: Partial<ReturnType<typeof blank>>) => { setForm((f) => ({ ...f, ...patch })); };
  const setPilot = (key: number, patch: Partial<PilotRow>) => { set({ pilots: form.pilots.map((p) => (p.key === key ? { ...p, ...patch } : p)) }); };
  const toggle = (id: string) => { set({ picked: form.picked.includes(id) ? form.picked.filter((x) => x !== id) : [...form.picked, id] }); };

  return (
    <form
      className="bt-section"
      aria-labelledby={`${uid}-h`}
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <LeaveGuard dirty={dirty} />
      <h2 id={`${uid}-h`}>New campaign</h2>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <div className="bt-field">
        <label htmlFor={`${uid}-name`}>Campaign name</label>
        <input id={`${uid}-name`} value={form.name} maxLength={80} onChange={(e) => { set({ name: e.target.value }); }} />
      </div>
      <div className="bt-field">
        <label htmlFor={`${uid}-book`}>Campaign</label>
        <select id={`${uid}-book`} value={form.book} onChange={(e) => { set({ book: e.target.value as AcesCampaign["book"] }); }}>
          <option value="scouring-sands">Scouring Sands</option>
          <option value="own">My own campaign (I type every figure)</option>
        </select>
      </div>
      <div className="bt-field">
        <label htmlFor={`${uid}-diff`}>Difficulty</label>
        <select id={`${uid}-diff`} value={form.difficulty} onChange={(e) => { set({ difficulty: e.target.value as DifficultyId }); }}>
          {DIFFICULTY.map((d) => (
            <option key={d.id} value={d.id}>{`${d.label}: PV ${d.pvPercent >= 0 ? "+" : ""}${String(d.pvPercent)}%, SP earned ${String(d.spPercent)}%`}</option>
          ))}
        </select>
      </div>
      {form.difficulty === "legendary" && legend && (
        <fieldset className="aces-fieldset">
          <legend>Legendary: a harder number</legend>
          <p className="bt-hint" id={`${uid}-leg-hint`}>{`The book allows ${String(legend.pvPercent)}% PV or lower and ${String(legend.spPercent)}% SP earned or lower (Aces p. 28). Leave a box empty to keep the book number.`}</p>
          <div className="bt-field">
            <label htmlFor={`${uid}-legpv`}>PV percent (the book number or lower)</label>
            <input id={`${uid}-legpv`} type="number" inputMode="numeric" placeholder={String(legend.pvPercent)} aria-describedby={`${uid}-leg-hint`} value={form.legendPv} onChange={(e) => { set({ legendPv: e.target.value }); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-legsp`}>SP earned percent (the book number or lower)</label>
            <input id={`${uid}-legsp`} type="number" inputMode="numeric" placeholder={String(legend.spPercent)} aria-describedby={`${uid}-leg-hint`} value={form.legendSp} onChange={(e) => { set({ legendSp: e.target.value }); }} />
          </div>
          {((legendPv !== undefined && customPv === undefined) || (legendSp !== undefined && customSp === undefined)) && (
            <p role="status" className="bt-hint">A number that is not harder than the book&apos;s is not used; the book number stays.</p>
          )}
        </fieldset>
      )}
      <label className="bt-check">
        <input type="checkbox" checked={form.existing} onChange={(e) => { set({ existing: e.target.checked, warchest: e.target.checked ? form.warchest : "400" }); }} /> The force is carried over from another campaign
      </label>
      {form.existing && (
        <div className="bt-field">
          <label htmlFor={`${uid}-wc`}>Warchest you bring (SP)</label>
          <input id={`${uid}-wc`} type="number" inputMode="numeric" min={0} value={form.warchest} onChange={(e) => { set({ warchest: e.target.value }); }} />
        </div>
      )}

      <fieldset className="aces-fieldset">
        <legend>Units</legend>
        {units.length === 0 ? (
          <p className="bt-hint">No Alpha Strike units are saved yet. Add some under Alpha Strike, or import a campaign file that carries them.</p>
        ) : (
          units.map((u) => (
            <label key={u.id} className="bt-check">
              <input type="checkbox" checked={form.picked.includes(u.id)} onChange={() => { toggle(u.id); }} /> {`${unitTitle(u)} (${u.card.type}, ${String(u.card.pv)} PV)`}
            </label>
          ))
        )}
        <label className="bt-check">
          <input type="checkbox" checked={form.advanced} onChange={(e) => { set({ advanced: e.target.checked }); }} /> Check against the advanced creation limits
        </label>
        <p role="status">{`${String(chosen.length)} unit${chosen.length === 1 ? "" : "s"}, ${String(totalPv)} PV. Starting warchest ${String(startWarchest)} SP.`}</p>
      </fieldset>

      <fieldset className="aces-fieldset">
        <legend>Named Pilots</legend>
        {form.pilots.map((p, i) => (
          <div key={p.key} className="bt-field">
            <label htmlFor={`${uid}-cs${String(p.key)}`}>{`Pilot ${String(i + 1)} call sign`}</label>
            <input id={`${uid}-cs${String(p.key)}`} value={p.callsign} maxLength={40} onChange={(e) => { setPilot(p.key, { callsign: e.target.value }); }} />
            <select aria-label={`Pilot ${String(i + 1)} type`} value={p.type} onChange={(e) => { setPilot(p.key, { type: e.target.value as PilotType }); }}>
              {PILOT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {form.existing && <input aria-label={`Pilot ${String(i + 1)} SP earned so far`} type="number" inputMode="numeric" min={0} value={p.sp} onChange={(e) => { setPilot(p.key, { sp: e.target.value }); }} />}
            {form.pilots.length > 2 && (
              <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove pilot ${String(i + 1)}`} onClick={() => { set({ pilots: form.pilots.filter((x) => x.key !== p.key) }); }}>
                Remove
              </button>
            )}
          </div>
        ))}
        {form.pilots.length < CAMPAIGN_FIGURES.maxPilots && (
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { set({ pilots: [...form.pilots, { key: Math.max(...form.pilots.map((x) => x.key)) + 1, callsign: "", type: "BM", sp: String(CAMPAIGN_FIGURES.pilotStartSp) }] }); }}>
            Add a pilot
          </button>
        )}
      </fieldset>

      {findings.length > 0 && (
        <ul aria-label="Things to check" className="bt-hint">
          {findings.map((f) => (
            <li key={f.id + f.text}>{`${f.text} (${f.cite})`}</li>
          ))}
        </ul>
      )}
      <p>
        <button type="submit" className="bt-button" disabled={form.name.trim() === ""}>
          Create campaign
        </button>
      </p>
    </form>
  );
}
