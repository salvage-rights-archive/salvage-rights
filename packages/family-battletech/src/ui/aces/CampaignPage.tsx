// One Aces campaign: overview, roster, Named Pilots, sorties, keywords and the memorial. Edits change a draft that the player saves; leaving
// with unsaved edits asks first. The sortie and after-sortie pages open from here.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  activeUnits,
  difficultyRow,
  forceFindings,
  keywordTotals,
  nextSortieOffers,
  pilotCountFindings,
  pvPercent,
  rosterPv,
  spPercent,
  warchest,
} from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import type { AsUnit } from "../../rules/as-unit";
import { openAsStorage } from "../as/storage";
import { LeaveGuard } from "../editor/LeaveConfirm";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { PilotsSection, RosterSection } from "./CampaignParts";
import SortiesSection from "./SortiesSection";
import { downloadCampaigns } from "./campaign-file";
import { openCampaignStorage } from "./campaign-storage";
import type { CampaignStorage } from "./campaign-storage";
import { ACES_CAMPAIGNS, afterHref, gameHref, printHref, sortieHref } from "./routes";
import "./styles";

const SECTIONS = [
  { id: "overview", name: "Overview" },
  { id: "roster", name: "Roster" },
  { id: "pilots", name: "Named Pilots" },
  { id: "sorties", name: "Sorties" },
  { id: "keywords", name: "Keywords" },
  { id: "memorial", name: "Memorial" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const two = (n: number): string => String(n).padStart(2, "0");
const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;

export default function CampaignPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [loaded, setLoaded] = useState<{ storage: CampaignStorage; campaign: AcesCampaign; units: AsUnit[] }>();
  const [problem, setProblem] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const storage = await openCampaignStorage();
        const entry = await storage.get(id);
        if (!entry?.campaign) {
          setMissing(!entry);
          setProblem(entry ? "This campaign is saved in a form the app cannot read. You can export or delete it from the campaign list." : "");
          return;
        }
        const units = (await (await openAsStorage()).list()).flatMap((e) => (e.unit ? [e.unit] : []));
        setLoaded({ storage, campaign: entry.campaign, units });
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, [id]);

  if (!loaded) {
    return (
      <div className="sr-page">
        <Link className="bt-back" to={ACES_CAMPAIGNS}>
          <span aria-hidden="true">&larr; </span>Campaigns
        </Link>
        <h1>Aces campaign</h1>
        <p role="alert" className="bt-problem">
          {problem}
        </p>
        {missing ? <p>We could not find that campaign.</p> : !problem && <p role="status">Loading.</p>}
      </div>
    );
  }
  return <Campaign {...loaded} />;
}

function Campaign({ storage, campaign: initial, units }: { storage: CampaignStorage; campaign: AcesCampaign; units: AsUnit[] }) {
  const [campaign, setCampaign] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [section, setSection] = useState<SectionId>("overview");
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(campaign) !== saved;

  const edit = (next: AcesCampaign, say = "") => {
    setCampaign(next);
    setProblem("");
    setStatus(say);
  };

  const save = async () => {
    try {
      await storage.save(campaign);
    } catch {
      setStatus("");
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setSaved(JSON.stringify(campaign));
    setProblem("");
    setStatus("Saved.");
  };

  const lost = campaign.pilots.filter((p) => p.killed);
  const book = campaign.book === "scouring-sands";
  const offers = nextSortieOffers(campaign);
  const won = campaign.sorties.filter((s) => s.result === "win");
  const findings = [
    ...(campaign.sorties.length === 0 ? forceFindings(activeUnits(campaign).map((r) => ({ name: r.name, type: r.type, chassis: r.chassis, variant: r.variant, pv: r.pv }))) : []),
    ...pilotCountFindings(campaign),
  ];
  const totals = Object.entries(keywordTotals(campaign));

  return (
    <div className="sr-page">
      <LeaveGuard dirty={dirty} />
      <Link className="bt-back" to={ACES_CAMPAIGNS}>
        <span aria-hidden="true">&larr; </span>Campaigns
      </Link>
      <h1 ref={headingRef} tabIndex={-1}>
        {campaign.name}
      </h1>
      <div className="bt-actions">
        <button type="button" className="bt-button" disabled={!dirty} onClick={() => void save()}>
          Save
        </button>
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadCampaigns([campaign], units, true); setStatus("Export started."); }}>
          Export this campaign
        </button>
        <Link className="bt-button bt-button--secondary" to={printHref(campaign.id)}>
          Print the sheets
        </Link>
      </div>
      {dirty && <p className="bt-hint">You have changes that are not saved.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <nav aria-label="Campaign sections" className="aces-steps">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className="bt-button bt-button--secondary aces-step" aria-pressed={section === s.id} onClick={() => { setSection(s.id); }}>
            {s.name}
          </button>
        ))}
      </nav>

      {section === "overview" && (
        <section aria-labelledby="aces-c-overview">
          <h2 id="aces-c-overview">Overview</h2>
          <dl className="aces-facts">
            <dt>Warchest</dt>
            <dd>{`${String(warchest(campaign))} SP`}</dd>
            <dt>Difficulty</dt>
            <dd>{`${difficultyRow(campaign.difficulty).label}: PV ${pvPercent(campaign) >= 0 ? "+" : ""}${String(pvPercent(campaign))}%, SP earned ${String(spPercent(campaign))}%${campaign.existingForce ? " (force carried over)" : ""}`}</dd>
            <dt>Campaign</dt>
            <dd>{book ? "Scouring Sands" : "My own campaign"}</dd>
            <dt>Roster</dt>
            <dd>{`${plural(activeUnits(campaign).length, "unit")} ready, ${String(rosterPv(campaign))} PV`}</dd>
            <dt>Sorties</dt>
            <dd>{`${String(won.length)} won, ${String(campaign.sorties.length - won.length)} failed`}</dd>
          </dl>
          {findings.length > 0 && (
            <ul aria-label="Things to check" className="bt-hint">
              {findings.map((f) => (
                <li key={f.id + f.text}>{`${f.text} (${f.cite})`}</li>
              ))}
            </ul>
          )}
          {campaign.started ? (
            <p>
              {`Sortie ${two(campaign.started.number)} is started. `}
              <Link className="bt-button" to={gameHref(campaign.started.gameId)}>
                Open its game
              </Link>{" "}
              <Link className="bt-button" to={afterHref(campaign.id, campaign.started.number)}>
                After-sortie steps
              </Link>
            </p>
          ) : (
            <p>
              <Link className="bt-button" to={sortieHref(campaign.id)}>
                {book && offers[0] ? `Start sortie ${two(offers[0].n)}` : "Start a sortie"}
              </Link>
            </p>
          )}
          {dirty && <p className="bt-hint">Save your changes before you start a sortie.</p>}
        </section>
      )}

      {section === "roster" && <RosterSection campaign={campaign} units={units} edit={edit} />}
      {section === "pilots" && <PilotsSection campaign={campaign} edit={edit} />}

      {section === "sorties" && <SortiesSection campaign={campaign} edit={edit} />}

      {section === "keywords" && (
        <section aria-labelledby="aces-c-keywords">
          <h2 id="aces-c-keywords">Keywords</h2>
          {totals.length === 0 ? (
            <p>No keywords earned yet.</p>
          ) : (
            <ul className="bt-list">
              {totals.map(([word, n]) => (
                <li key={word} className="bt-row">
                  <span className="bt-row__text">{word}</span>
                  <span>{String(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === "memorial" && (
        <section aria-labelledby="aces-c-memorial">
          <h2 id="aces-c-memorial">Memorial</h2>
          {lost.length === 0 ? (
            <p>No Named Pilot has been lost.</p>
          ) : (
            <ul className="bt-list">
              {lost.map((p) => (
                <li key={p.id} className="bt-row">
                  <span className="bt-row__text">
                    {p.callsign}
                    <span className="bt-row__credit">{`${p.type}, ${plural(p.sorties, "sortie")}, ${String(p.totalSp)} SP earned, Most Valuable Pilot ${plural(p.mvp, "time")}`}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
