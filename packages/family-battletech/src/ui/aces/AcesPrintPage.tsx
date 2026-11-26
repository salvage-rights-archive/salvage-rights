// Print the campaign sheets (Aces Log Sheets (2025), followed as forms and drawn by us): the Player Force Roster, the Campaign Log, the
// Sortie Log and a Named Pilot card for each pilot, filled from the saved campaign. The choices at the top are for the screen; the
// paper holds only the sheets. No logos, no art, and a foot line that names where the forms come from.
import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { AcesCampaign } from "../../rules/aces-campaign";
import { AFTER_SORTIE_STEPS, SHEET_FOOT, SORTIE_SETUP_STEPS, campaignLog, pilotCard, rosterSheet, sortieLogColumns } from "../../rules/aces-print";
import { STORAGE_READ_FAILED } from "../storage";
import { openCampaignStorage } from "./campaign-storage";
import { campaignHref, ACES_CAMPAIGNS } from "./routes";
import "./styles";

const SHEETS = [
  { id: "roster", name: "Player Force Roster" },
  { id: "campaign", name: "Campaign Log" },
  { id: "sortie", name: "Sortie Log" },
  { id: "pilots", name: "Named Pilot cards" },
] as const;
type SheetId = (typeof SHEETS)[number]["id"];

const blanks = (n: number): number[] => Array.from({ length: Math.max(0, n) }, (_, i) => i);
const signed = (n: number): string => `${n >= 0 ? "+" : ""}${String(n)}%`;
const SORTIES_A_SHEET = 4;

function Foot() {
  return <p className="aces-sheet__foot">{SHEET_FOOT}</p>;
}

function RosterSheet({ campaign }: { campaign: AcesCampaign }) {
  const r = rosterSheet(campaign);
  return (
    <section className="aces-sheet" tabIndex={0} aria-label="Player Force Roster">
      <h2>Aces: Player Force Roster</h2>
      <dl className="aces-sheet__fields">
        <dt>Difficulty level</dt>
        <dd>{r.level}</dd>
        <dt>Player force PV</dt>
        <dd>{signed(r.pvPercent)}</dd>
        <dt>SP earned</dt>
        <dd>{`${String(r.spPercent)}%`}</dd>
        <dt>Force name</dt>
        <dd>{r.forceName}</dd>
        <dt>Total PV</dt>
        <dd>{String(r.totalPv)}</dd>
        <dt>Commander</dt>
        <dd>{r.commander || " "}</dd>
      </dl>
      <div className="aces-sheet__cols">
        <div>
          <table className="aces-sheet__table">
            <caption>Unit roster</caption>
            <thead>
              <tr>
                <th scope="col">Unit (and variant)</th>
                <th scope="col">PV at Skill 4</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {r.units.map((u) => (
                <tr key={u.name}>
                  <td>{u.name}</td>
                  <td>{String(u.pv)}</td>
                  <td>{u.status}</td>
                </tr>
              ))}
              {blanks(8 - r.units.length).map((i) => (
                <tr key={`b${String(i)}`}>
                  <td>{" "}</td>
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          <table className="aces-sheet__table">
            <caption>Named Pilots</caption>
            <thead>
              <tr>
                <th scope="col">Wounded</th>
                <th scope="col">Call sign</th>
                <th scope="col">Skill</th>
                <th scope="col">Edge</th>
                <th scope="col">Abilities</th>
                <th scope="col">SP earned</th>
              </tr>
            </thead>
            <tbody>
              {r.pilots.map((p) => (
                <tr key={p.callsign}>
                  <td>{p.wounded ? "yes" : ""}</td>
                  <td>{`${p.callsign} (${p.type})`}</td>
                  <td>{String(p.skill)}</td>
                  <td>{String(p.edge)}</td>
                  <td>{String(p.abilities)}</td>
                  <td>{String(p.totalSp)}</td>
                </tr>
              ))}
              {blanks(6 - r.pilots.length).map((i) => (
                <tr key={`p${String(i)}`}>
                  <td />
                  <td>{" "}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={5}>Total SP earned</th>
                <td>{String(r.totalSpEarned)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="aces-sheet__memorial">
            <strong>Memorial.</strong> {r.memorial.units.length + r.memorial.pilots.length === 0 ? "Nobody lost yet." : `Units lost: ${r.memorial.units.join(", ") || "none"}. Named Pilots killed: ${r.memorial.pilots.join(", ") || "none"}.`}
          </p>
        </div>
        <div>
          <h3>Sortie setup</h3>
          <ol className="aces-sheet__steps">
            {SORTIE_SETUP_STEPS.map((s) => (
              <li key={s.name}>{`${s.name} (${s.cite})`}</li>
            ))}
          </ol>
          <h3>After the sortie</h3>
          <p className="aces-sheet__note">If the primary objective is not met the sortie is a failure and is played again (Aces p. 32).</p>
          <ol className="aces-sheet__steps">
            {AFTER_SORTIE_STEPS.map((s) => (
              <li key={s.name}>{`${s.name} (${s.cite})`}</li>
            ))}
          </ol>
        </div>
      </div>
      <Foot />
    </section>
  );
}

function CampaignLogSheet({ campaign }: { campaign: AcesCampaign }) {
  const log = campaignLog(campaign);
  return (
    <section className="aces-sheet" tabIndex={0} aria-label="Campaign Log">
      <h2>Aces: Campaign Log</h2>
      <p className="aces-sheet__fields-line">{`Campaign: ${campaign.name}. Starting warchest ${String(log.start)} SP.`}</p>
      <table className="aces-sheet__table">
        <caption>Sorties played</caption>
        <thead>
          <tr>
            <th scope="col">Date played</th>
            <th scope="col">Number</th>
            <th scope="col">Sortie name</th>
            <th scope="col">Win?</th>
            <th scope="col">Earnings (from Sortie Log)</th>
            <th scope="col">Named Pilots (total SP earned)</th>
            <th scope="col">Purchases (PV x 40 SP)</th>
            <th scope="col">Warchest balance (total SP)</th>
          </tr>
        </thead>
        <tbody>
          {log.rows.map((row, i) => (
            <tr key={`${String(row.number)}-${String(i)}`}>
              <td>{row.date}</td>
              <td>{String(row.number).padStart(2, "0")}</td>
              <td>{row.name}</td>
              <td>{row.win ? "yes" : "failed"}</td>
              <td>{row.win ? String(row.earnings) : ""}</td>
              <td>{row.win ? String(row.shares) : ""}</td>
              <td>{row.purchases > 0 ? String(row.purchases) : ""}</td>
              <td>{String(row.warchest)}</td>
            </tr>
          ))}
          {blanks(16 - log.rows.length).map((i) => (
            <tr key={`b${String(i)}`}>
              <td>{" "}</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="aces-sheet__memorial">
        <strong>Keywords gained.</strong> {log.keywords.length === 0 ? "None yet." : log.keywords.join(", ")}
      </p>
      <Foot />
    </section>
  );
}

const ROWS = [
  ["Income", "income"],
  ["Reconnaissance", "recon"],
  ["Waypoints (SP lost, or gained when negative)", "waypoints"],
  ["Rearming", "rearm"],
  ["Personnel", "personnel"],
  ["Repairs", "repairs"],
  ["Expenses", "expenses"],
  ["Earnings", "earnings"],
  ["Named Pilot shares", "shares"],
] as const;

function SortieLogSheet({ campaign, page }: { campaign: AcesCampaign; page: number }) {
  const columns = sortieLogColumns(campaign).slice(page * SORTIES_A_SHEET, (page + 1) * SORTIES_A_SHEET);
  const empty = blanks(SORTIES_A_SHEET - columns.length);
  return (
    <section className="aces-sheet" tabIndex={0} aria-label={`Sortie Log, sheet ${String(page + 1)}`}>
      <h2>Aces: Sortie Log</h2>
      <p className="aces-sheet__fields-line">{`Campaign: ${campaign.name}.`}</p>
      <table className="aces-sheet__table">
        <thead>
          <tr>
            <th scope="col">Sortie</th>
            {columns.map((c) => (
              <th key={c.number} scope="col">{`${String(c.number).padStart(2, "0")}${c.name ? ` ${c.name}` : ""}`}</th>
            ))}
            {empty.map((i) => (
              <th key={`e${String(i)}`} scope="col">Sortie ##</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, key]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              {columns.map((c) => (
                <td key={c.number}>{String(c[key])}</td>
              ))}
              {empty.map((i) => (
                <td key={`e${String(i)}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Foot />
    </section>
  );
}

function PilotCards({ campaign }: { campaign: AcesCampaign }) {
  const pilots = campaign.pilots.map(pilotCard);
  return (
    <section className="aces-sheet" tabIndex={0} aria-label="Named Pilot cards">
      <h2>Aces: Named Pilots</h2>
      <div className="aces-sheet__cards">
        {pilots.map((p) => (
          <article key={p.callsign} className="aces-sheet__pilot" aria-label={`Named Pilot ${p.callsign}`}>
            <h3>{`${p.callsign} (${p.type})`}</h3>
            <p>{`Total SP earned ${String(p.totalSp)}. To allocate ${String(p.unallocated)}. Sorties ${String(p.sorties)}, Most Valuable Pilot ${String(p.mvp)}.`}</p>
            {p.columns.map((col) => (
              <div key={col.id}>
                <p>
                  <strong>{col.label}</strong>
                  {`: ${String(col.allocated)} SP, now ${String(col.value)}`}
                </p>
                <p className="aces-sheet__steps-line">{col.steps.map((s) => `${String(s.value)} at ${String(s.at)} SP${s.reached ? " (reached)" : ""}`).join("; ")}</p>
              </div>
            ))}
            <p>{`Edge abilities: ${p.abilityNames.length ? p.abilityNames.join(", ") : "none named"}.`}</p>
          </article>
        ))}
      </div>
      <Foot />
    </section>
  );
}

export default function AcesPrintPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const uid = useId();
  const [campaign, setCampaign] = useState<AcesCampaign>();
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [chosen, setChosen] = useState<SheetId[]>(["roster", "campaign", "sortie", "pilots"]);

  useEffect(() => {
    void (async () => {
      try {
        const entry = await (await openCampaignStorage()).get(id);
        if (!entry?.campaign) setState("missing");
        else {
          setCampaign(entry.campaign);
          setState("ready");
        }
      } catch {
        setState("failed");
      }
    })();
  }, [id]);

  if (state !== "ready" || !campaign) {
    return (
      <div className="sr-page">
        <Link className="bt-back" to={ACES_CAMPAIGNS}>
          <span aria-hidden="true">&larr; </span>Campaigns
        </Link>
        <h1>Print campaign sheets</h1>
        {state === "loading" ? <p role="status">Loading.</p> : <p role="alert">{state === "failed" ? STORAGE_READ_FAILED : "We could not find that campaign."}</p>}
      </div>
    );
  }
  const sortiePages = Math.max(1, Math.ceil(sortieLogColumns(campaign).length / SORTIES_A_SHEET));
  const toggle = (sheet: SheetId): void => { setChosen(chosen.includes(sheet) ? chosen.filter((s) => s !== sheet) : [...chosen, sheet]); };

  return (
    <div className="sr-page aces-print">
      <div className="aces-print__bar">
        <Link className="bt-back" to={campaignHref(campaign.id)}>
          <span aria-hidden="true">&larr; </span>{campaign.name}
        </Link>
        <h1>Print campaign sheets</h1>
        <fieldset className="aces-fieldset">
          <legend>Sheets to print</legend>
          {SHEETS.map((s) => (
            <label key={s.id} className="bt-check" htmlFor={`${uid}-${s.id}`}>
              <input id={`${uid}-${s.id}`} type="checkbox" checked={chosen.includes(s.id)} onChange={() => { toggle(s.id); }} />
              {s.name}
            </label>
          ))}
        </fieldset>
        <p className="bt-hint">The sheets print landscape on Letter or A4: choose the paper in the print window. Save the campaign first so the sheets match it.</p>
        <p>
          <button type="button" className="bt-button" onClick={() => { window.print(); }}>
            Print
          </button>
        </p>
      </div>
      {chosen.includes("roster") && <RosterSheet campaign={campaign} />}
      {chosen.includes("campaign") && <CampaignLogSheet campaign={campaign} />}
      {chosen.includes("sortie") && blanks(sortiePages).map((i) => <SortieLogSheet key={i} campaign={campaign} page={i} />)}
      {chosen.includes("pilots") && <PilotCards campaign={campaign} />}
    </div>
  );
}
