// The after-sortie steps of the Aces campaign round (Aces pp. 32-37): casualties, income, expenses, earnings, the Named Pilots, purchases
// and sales, keywords and the next sortie. Every figure is shown as a sum the player can follow. The rolls are the player's: typed, or
// rolled for them. The book's wording is not repeated here; the page cites where each step is.
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AFTER_SORTIE, CAMPAIGN_FIGURES, PILOT_COLUMNS, PRICES, type PilotColumn } from "../../data/aces";
import {
  allocationFindings,
  annotateSortie,
  buyPrice,
  eligiblePilots,
  failSortie,
  keywordTotals,
  newPilot,
  nextUnlock,
  pilotStats,
  purchaseUnit,
  reconPaid,
  sellPrice,
  sellUnit,
  settleSortie,
  sortieTrades,
  sortieUnitFromGame,
  unallocated,
  warchest,
  type AcesCampaign,
  type Finding,
  type NamedPilot,
} from "../../rules/aces-campaign";
import type { AcesGame } from "../../rules/aces-game";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import SortieUnitCard from "./SortieUnitCard";
import type { SortieItem } from "./SortieUnitCard";
import { openCampaignStorage } from "./campaign-storage";
import type { CampaignStorage } from "./campaign-storage";
import { openGameStorage } from "./game-storage";
import { ACES_HOME } from "./routes";
import "./styles";

const STEPS = [
  { id: "casualties", name: "1. Casualties" },
  { id: "income", name: "2. Income" },
  { id: "expenses", name: "3. Expenses" },
  { id: "earnings", name: "4. Earnings" },
  { id: "pilots", name: "5. Named Pilots" },
  { id: "trades", name: "6. Buy and sell" },
  { id: "next", name: "7. Keywords and next sortie" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

const COLUMN_NAMES: Record<PilotColumn, string> = { skill: "Skill", edge: "Edge tokens", abilities: "Edge abilities" };
const toNumber = (text: string): number => {
  const n = Number(text);
  return text.trim() === "" || Number.isNaN(n) ? 0 : n;
};
const today = (): string => new Date().toISOString().slice(0, 10);

interface Loaded {
  storage: CampaignStorage;
  campaign: AcesCampaign;
  game?: AcesGame;
}

export default function AfterSortiePage() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaign") ?? "";
  const number = Math.max(1, Math.floor(Number(params.get("n") ?? "1")) || 1);
  const [loaded, setLoaded] = useState<Loaded>();
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const storage = await openCampaignStorage();
        const entry = await storage.get(campaignId);
        if (!entry?.campaign) {
          setProblem(entry ? "This campaign is saved in a form the app cannot read." : "");
          setLoaded(undefined);
          setNotice(entry ? "" : "missing");
          return;
        }
        const games = await (await openGameStorage()).list();
        const game = games.find((g) => g.game?.campaign?.campaignId === campaignId && g.game.campaign.sortie === String(number))?.game;
        setLoaded({ storage, campaign: entry.campaign, game });
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, [campaignId, number]);

  if (!loaded) {
    return (
      <div className="sr-page">
        <h1>After the sortie</h1>
        <p role="alert" className="bt-problem">
          {problem}
        </p>
        {notice === "missing" ? (
          <p>
            We could not find that campaign. <Link to={ACES_HOME}>Back to Aces.</Link>
          </p>
        ) : (
          !problem && <p role="status">Loading.</p>
        )}
      </div>
    );
  }
  return <Steps loaded={loaded} number={number} onSaved={(campaign) => { setLoaded({ ...loaded, campaign }); }} />;
}

function initialItems(campaign: AcesCampaign, game?: AcesGame): SortieItem[] {
  if (game) {
    const commander = game.sides.player.commanderUnitId;
    return game.sides.player.units.map((g) => ({ use: true, unit: { ...sortieUnitFromGame(g), ...(g.id === commander ? { commander: true } : {}) } }));
  }
  return campaign.roster.filter((r) => r.status === "active").map((r) => ({ use: true, unit: { unitId: r.unitId, name: r.name, type: r.type, size: r.size ?? 1, destroyed: false, repair: "none" as const } }));
}

function Steps({ loaded, number, onSaved }: { loaded: Loaded; number: number; onSaved: (c: AcesCampaign) => void }) {
  const uid = useId();
  const { campaign, storage } = loaded;
  const done = campaign.sorties.findLast((s) => s.number === number && s.result === "win");
  const [step, setStep] = useState<StepId>("casualties");
  const [items, setItems] = useState<SortieItem[]>(() => initialItems(campaign, loaded.game));
  const [primary, setPrimary] = useState("");
  const [other, setOther] = useState("");
  // The reconnaissance paid for when the sortie was started (Sortie page) is already the expense; the player may change it.
  const [recon, setRecon] = useState(() => {
    const paid = reconPaid(campaign, number).reduce((a, r) => a + r.sp, 0);
    return paid > 0 ? String(paid) : "";
  });
  const [waypoints, setWaypoints] = useState("");
  const [hired, setHired] = useState<NamedPilot[]>([]);
  const [newCallsign, setNewCallsign] = useState("");
  const [cap, setCap] = useState("");
  const [mvp, setMvp] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [confirmFail, setConfirmFail] = useState(false);
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("");

  const used = items.filter((i) => i.use).map((i) => i.unit);
  const settlement = useMemo(
    () =>
      settleSortie(campaign, {
        number,
        date,
        ...(name.trim() ? { name: name.trim() } : {}),
        units: used,
        ...(loaded.game ? { gameId: loaded.game.id } : {}),
        primarySp: toNumber(primary),
        otherSp: toNumber(other),
        recon: toNumber(recon) === 0 ? [] : [{ label: "Reconnaissance", sp: toNumber(recon) }],
        waypointSp: toNumber(waypoints),
        hired,
        shareCap: toNumber(cap),
        ...(mvp ? { mvpPilotId: mvp } : {}),
        keywords: [],
      }),
    // `used` is derived from `items`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaign, number, date, name, items, loaded.game, primary, other, recon, waypoints, hired, cap, mvp],
  );

  async function save(next: AcesCampaign, message: string): Promise<boolean> {
    try {
      await storage.save(next);
      onSaved(next);
      setProblem("");
      setStatus(message);
      return true;
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return false;
    }
  }

  const setItem = (index: number, next: SortieItem) => {
    setItems((all) => all.map((it, i) => (i === index ? next : it)));
  };
  const money = (n: number): string => String(n);

  const record = async () => {
    if (await save(settlement.campaign, `Sortie ${String(number)} recorded.`)) setStep("pilots");
  };

  const summary = done && (
    <section aria-label="Recorded figures">
      <p role="status">{`Sortie ${String(number)} is recorded${done.name ? `: ${done.name}` : ""}.`}</p>
      <ul>
        <li>{`Income ${money(done.income)}.`}</li>
        <li>{`Expenses: reconnaissance ${money(done.recon.reduce((a, r) => a + r.sp, 0))} + waypoints ${money(done.waypointSp)} + rearming ${money(done.rearm)} + personnel ${money(done.personnel)} + repairs ${money(done.repairs)}.`}</li>
        <li>{`Earnings ${money(done.earnings)}; the Named Pilots took ${money(done.shares)}.`}</li>
      </ul>
    </section>
  );

  const findings: Finding[] = done ? [] : settlement.findings.filter((f) => settlement.income.base > 0 || (f.id !== "debt" && f.id !== "warchest-empty"));
  const sortieKey = `sortie-${String(number)}`;

  return (
    <div className="sr-page">
      <h1>{`After sortie ${String(number)}`}</h1>
      <p className="bt-hint">{`${campaign.name}. The steps follow Aces pp. 33-37; every roll is yours to make, typed here or rolled for you.`}</p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <div role="status">{status}</div>
      <nav aria-label="Steps" className="aces-steps">
        {STEPS.map((s) => (
          <button key={s.id} type="button" className="bt-button bt-button--secondary aces-step" aria-pressed={step === s.id} onClick={() => { setStep(s.id); }}>
            {s.name}
          </button>
        ))}
      </nav>
      {findings.length > 0 && (
        <ul aria-label="Things to check" className="bt-hint">
          {findings.map((f) => (
            <li key={f.id}>{`${f.text} (${f.cite})`}</li>
          ))}
        </ul>
      )}

      {step === "casualties" && (
        <section aria-labelledby={`${uid}-cas`}>
          <h2 id={`${uid}-cas`}>Casualties</h2>
          {done ? (
            summary
          ) : (
            <>
              <p className="bt-hint">{`A named pilot cannot reroll the crew roll with Edge (${AFTER_SORTIE.cites.crew}).`}</p>
              <label className="bt-field">
                <span>Sortie name (optional)</span>
                <input value={name} onChange={(e) => { setName(e.target.value); }} />
              </label>
              <label className="bt-field">
                <span>Date played</span>
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); }} />
              </label>
              {items.length === 0 && <p>The roster has no active units. Add units to the campaign first.</p>}
              {items.map((item, i) => (
                <SortieUnitCard
                  key={`${item.unit.unitId}-${String(i)}`}
                  item={item}
                  result={settlement.units[used.indexOf(item.unit)] ?? { unitId: item.unit.unitId, name: item.unit.name, salvage: { truly: false, reason: "not-destroyed" }, crew: "none", category: item.unit.repair, size: item.unit.size, repairSp: 0, rearmed: false }}
                  pilots={eligiblePilots(campaign, item.unit.type)}
                  onChange={(next) => { setItem(i, next); }}
                />
              ))}
              {confirmFail ? (
                <div className="bt-confirm" role="group" aria-label="Confirm failed sortie" onKeyDown={(e) => { if (e.key === "Escape") setConfirmFail(false); }}>
                  <p>{`Record sortie ${String(number)} as failed? Nothing else is recorded and the damage is treated as never having happened; the sortie is played again (${AFTER_SORTIE.cites.failed}).`}</p>
                  <span className="bt-row__actions">
                    <button type="button" className="bt-button" onClick={() => void save(failSortie(campaign, { number, date, ...(name.trim() ? { name: name.trim() } : {}) }), `Sortie ${String(number)} recorded as failed. Play it again.`).then(() => { setConfirmFail(false); })}>
                      Record the failed sortie
                    </button>
                    <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirmFail(false); }}>
                      Keep going
                    </button>
                  </span>
                </div>
              ) : (
                <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConfirmFail(true); }}>
                  The sortie failed
                </button>
              )}
            </>
          )}
        </section>
      )}

      {step === "income" && (
        <section aria-labelledby={`${uid}-inc`}>
          <h2 id={`${uid}-inc`}>Income</h2>
          {done ? (
            summary
          ) : (
            <>
              <p className="bt-hint">The objectives list their SP in your campaign book.</p>
              <label className="bt-field">
                <span>Primary objective SP</span>
                <input type="number" inputMode="numeric" min={0} value={primary} onChange={(e) => { setPrimary(e.target.value); }} />
              </label>
              <label className="bt-field">
                <span>Other objectives SP</span>
                <input type="number" inputMode="numeric" min={0} value={other} onChange={(e) => { setOther(e.target.value); }} />
              </label>
              <p role="status">{`${money(toNumber(primary))} + ${money(toNumber(other))} = ${money(settlement.income.base)}, times ${money(settlement.income.percent)}% = ${money(settlement.income.total)} SP income.`}</p>
            </>
          )}
        </section>
      )}

      {step === "expenses" && (
        <section aria-labelledby={`${uid}-exp`}>
          <h2 id={`${uid}-exp`}>Expenses</h2>
          {done ? (
            summary
          ) : (
            <>
              <label className="bt-field">
                <span>Reconnaissance SP, spent before the sortie</span>
                <input type="number" inputMode="numeric" min={0} value={recon} onChange={(e) => { setRecon(e.target.value); }} />
              </label>
              <label className="bt-field">
                <span>Waypoints SP (lost as a positive number, gained as a negative one)</span>
                <input type="number" inputMode="numeric" value={waypoints} onChange={(e) => { setWaypoints(e.target.value); }} />
              </label>
              <h3>Replacement Named Pilots</h3>
              <p className="bt-hint">{`A killed Named Pilot may be replaced for ${String(CAMPAIGN_FIGURES.replacementPilotCost)} SP; the new pilot starts with ${String(CAMPAIGN_FIGURES.pilotStartSp)} SP to allocate.`}</p>
              <ul className="bt-list">
                {hired.map((p) => (
                  <li key={p.id} className="bt-row">
                    <span className="bt-row__text">{p.callsign}</span>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${p.callsign}`} onClick={() => { setHired(hired.filter((h) => h.id !== p.id)); }}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="bt-field">
                <label htmlFor={`${uid}-hire`}>Callsign of a replacement</label>
                <input id={`${uid}-hire`} value={newCallsign} onChange={(e) => { setNewCallsign(e.target.value); }} />
                <button
                  type="button"
                  className="bt-button"
                  disabled={newCallsign.trim() === ""}
                  onClick={() => {
                    setHired([...hired, newPilot(`pilot-${String(Date.now())}-${String(hired.length)}`, newCallsign.trim(), "BM")]);
                    setNewCallsign("");
                  }}
                >
                  Add the replacement
                </button>
              </div>
              <ul aria-label="The bill">
                <li>{`Reconnaissance ${money(settlement.expenses.recon)}`}</li>
                <li>{`Waypoints ${money(settlement.expenses.waypoints)}`}</li>
                <li>{`Rearming ${String(settlement.expenses.rearm.units)} x ${String(AFTER_SORTIE.rearmPerUnit)} = ${money(settlement.expenses.rearm.sp)}`}</li>
                <li>{`Personnel ${String(settlement.expenses.personnel.wounded)} x ${String(AFTER_SORTIE.personnelPerWounded)} + ${String(settlement.expenses.personnel.replacements)} x ${String(CAMPAIGN_FIGURES.replacementPilotCost)} = ${money(settlement.expenses.personnel.sp)}`}</li>
                {settlement.units
                  .filter((u) => u.repairSp > 0)
                  .map((u) => (
                    <li key={u.unitId}>{`Repairs, ${u.name}: Size ${String(u.size)} x ${String(AFTER_SORTIE.repairPerSize[u.category])} = ${money(u.repairSp)}`}</li>
                  ))}
                <li>{`Repairs ${money(settlement.expenses.repairs)}`}</li>
              </ul>
              <p role="status">{`Total expenses ${money(settlement.expenses.total)} SP.`}</p>
            </>
          )}
        </section>
      )}

      {step === "earnings" && (
        <section aria-labelledby={`${uid}-earn`}>
          <h2 id={`${uid}-earn`}>Earnings</h2>
          {done ? (
            summary
          ) : (
            <>
              <p role="status">{`${money(settlement.income.total)} income - ${money(settlement.expenses.total)} expenses = ${money(settlement.earnings)} SP earned.`}</p>
              <p>{`The warchest is ${money(settlement.warchestBefore)} SP before this sortie and ${money(settlement.warchestAfterEarnings)} SP once the earnings are in.`}</p>
              {settlement.skipImproving && <p>The Named Pilots are not improved this time (p. 34).</p>}
            </>
          )}
        </section>
      )}

      {step === "pilots" && (
        <section aria-labelledby={`${uid}-pil`}>
          <h2 id={`${uid}-pil`}>Named Pilots</h2>
          {!done && (
            <>
              {settlement.skipImproving ? (
                <p>With no earnings, or a warchest at zero or below, the Named Pilots take no SP from this sortie.</p>
              ) : (
                <>
                  <label className="bt-field">
                    <span>The most SP each Named Pilot may take, from the sortie outcome</span>
                    <input type="number" inputMode="numeric" min={0} value={cap} onChange={(e) => { setCap(e.target.value); }} />
                  </label>
                  <label className="bt-field">
                    <span>Most Valuable Pilot</span>
                    <select value={mvp} onChange={(e) => { setMvp(e.target.value); }}>
                      <option value="">No one yet</option>
                      {settlement.shares
                        .filter((s) => s.role === "participant")
                        .map((s) => (
                          <option key={s.pilotId} value={s.pilotId}>
                            {[...campaign.pilots, ...hired].find((p) => p.id === s.pilotId)?.callsign ?? s.pilotId}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}
              <ul aria-label="Shares">
                {settlement.shares.map((s) => (
                  <li key={s.pilotId}>{`${[...campaign.pilots, ...hired].find((p) => p.id === s.pilotId)?.callsign ?? s.pilotId}: ${s.role === "participant" ? "took part" : s.role === "sat-out" ? "sat out, half a share" : "killed"}, ${money(s.sp)} SP`}</li>
                ))}
              </ul>
              <p role="status">{`Shares ${money(settlement.shareTotal)} SP, leaving ${money(settlement.warchestAfter)} SP in the warchest. The Most Valuable Pilot's ${String(AFTER_SORTIE.mvpBonus)} SP does not come out of it${settlement.mvpBonus > 0 ? "" : " (none awarded)"}.`}</p>
              <button type="button" className="bt-button" disabled={settlement.pending.length > 0} aria-describedby={`${uid}-rec`} onClick={() => void record()}>
                Record the sortie
              </button>
              <p id={`${uid}-rec`} className="bt-hint">
                {settlement.pending.length > 0 ? "Enter every roll in step 1 first." : "Recording saves the earnings, shares, casualties and losses to the campaign."}
              </p>
            </>
          )}
          {done && (
            <>
              {summary}
              <Allocation campaign={campaign} onSave={(next) => save(next, "Allocation saved.")} />
            </>
          )}
        </section>
      )}

      {step === "trades" && (
        <section aria-labelledby={`${uid}-trade`}>
          <h2 id={`${uid}-trade`}>Buy and sell</h2>
          {!done ? (
            <p>Record the sortie in step 5 first.</p>
          ) : (
            <Trades campaign={campaign} sortieKey={sortieKey} onSave={save} />
          )}
        </section>
      )}

      {step === "next" && (
        <section aria-labelledby={`${uid}-next`}>
          <h2 id={`${uid}-next`}>Keywords and next sortie</h2>
          {!done ? (
            <p>Record the sortie in step 5 first.</p>
          ) : (
            <Keywords campaign={campaign} number={number} onSave={save} />
          )}
        </section>
      )}
    </div>
  );
}

function Allocation({ campaign, onSave }: { campaign: AcesCampaign; onSave: (c: AcesCampaign) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Record<string, Record<PilotColumn, string>>>({});
  const living = campaign.pilots.filter((p) => !p.killed);
  const value = (p: NamedPilot, col: PilotColumn): string => draft[p.id]?.[col] ?? String(p.alloc[col]);
  const withDraft = (p: NamedPilot): NamedPilot => ({ ...p, alloc: { skill: toNumber(value(p, "skill")), edge: toNumber(value(p, "edge")), abilities: toNumber(value(p, "abilities")) } });
  return (
    <div>
      <h3>Allocate the SP</h3>
      <p className="bt-hint">{`Each pilot must allocate every SP earned, even when nothing unlocks yet (${AFTER_SORTIE.cites.shares}).`}</p>
      {living.map((p) => {
        const now = withDraft(p);
        const stats = pilotStats(now);
        return (
          <fieldset key={p.id} className="aces-fieldset">
            <legend>{p.callsign}</legend>
            <p>{`Total SP earned ${String(p.totalSp)}; Skill ${String(stats.skill)}, Edge ${String(stats.edge)}, ${String(stats.abilities)} abilities; ${String(unallocated(now))} still to allocate.`}</p>
            {PILOT_COLUMNS.map((col) => {
              const next = nextUnlock(col.id, now.alloc[col.id]);
              return (
                <div key={col.id} className="bt-field">
                  <label htmlFor={`alloc-${p.id}-${col.id}`}>{`${COLUMN_NAMES[col.id]} SP for ${p.callsign}${next ? `, ${String(next.more)} more unlocks ${String(next.value)}` : ""}`}</label>
                  <input
                    id={`alloc-${p.id}-${col.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={value(p, col.id)}
                    onChange={(e) => {
                      setDraft({ ...draft, [p.id]: { skill: value(p, "skill"), edge: value(p, "edge"), abilities: value(p, "abilities"), [col.id]: e.target.value } });
                    }}
                  />
                </div>
              );
            })}
            {allocationFindings(now).map((f) => (
              <p key={f.id} className="bt-hint">{`${f.text} (${f.cite})`}</p>
            ))}
          </fieldset>
        );
      })}
      <button type="button" className="bt-button" onClick={() => void onSave({ ...campaign, pilots: campaign.pilots.map((p) => (p.killed ? p : withDraft(p))) })}>
        Save the allocation
      </button>
    </div>
  );
}

function Trades({ campaign, sortieKey, onSave }: { campaign: AcesCampaign; sortieKey: string; onSave: (c: AcesCampaign, message: string) => Promise<boolean> }) {
  const uid = useId();
  const [unitName, setUnitName] = useState("");
  const [type, setType] = useState("BM");
  const [pv, setPv] = useState("");
  const [size, setSize] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const chest = warchest(campaign);
  const trades = sortieTrades(campaign, sortieKey);
  const active = campaign.roster.filter((r) => r.status === "active");
  const price = buyPrice(toNumber(pv));
  return (
    <>
      <p role="status">{`The warchest is ${String(chest)} SP. Bought this sortie ${String(trades.purchases)}, sold ${String(trades.sales)}.`}</p>
      {chest > 0 ? (
        <div>
          <h3>Buy a unit</h3>
          <p className="bt-hint">{`A unit costs its Skill 4 PV x ${String(PRICES.buyPerPv)} (${PRICES.cite}).`}</p>
          <div className="bt-field">
            <label htmlFor={`${uid}-name`}>Name of the unit</label>
            <input id={`${uid}-name`} value={unitName} onChange={(e) => { setUnitName(e.target.value); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-type`}>Type</label>
            <select id={`${uid}-type`} value={type} onChange={(e) => { setType(e.target.value); }}>
              {["BM", "CV", "BA", "CI"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-pv`}>Skill 4 PV</label>
            <input id={`${uid}-pv`} type="number" inputMode="numeric" min={1} value={pv} onChange={(e) => { setPv(e.target.value); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${uid}-size`}>Size</label>
            <input id={`${uid}-size`} type="number" inputMode="numeric" min={0} value={size} onChange={(e) => { setSize(e.target.value); }} />
          </div>
          <p>{`${String(toNumber(pv))} x ${String(PRICES.buyPerPv)} = ${String(price)} SP.`}</p>
          <button
            type="button"
            className="bt-button"
            disabled={unitName.trim() === "" || toNumber(pv) <= 0}
            onClick={() => {
              const bought = purchaseUnit(campaign, { unitId: `unit-${String(Date.now())}`, name: unitName.trim(), type, pv: toNumber(pv), size: toNumber(size) || 1 }, `${sortieKey}-buy-${String(campaign.ledger.length)}`, sortieKey);
              setFindings(bought.findings);
              void onSave(bought.campaign, `Bought ${unitName.trim()}.`).then((ok) => {
                if (ok) {
                  setUnitName("");
                  setPv("");
                  setSize("");
                }
              });
            }}
          >
            Buy the unit
          </button>
          {findings.map((f) => (
            <p key={f.id} className="bt-hint">{`${f.text} (${f.cite})`}</p>
          ))}
        </div>
      ) : (
        <p>The warchest is at zero or below, so there is nothing to spend yet.</p>
      )}
      <h3>Sell a unit</h3>
      <ul className="bt-list">
        {active.map((r) => (
          <li key={r.unitId} className="bt-row">
            <span className="bt-row__text">{`${r.name}, PV ${String(r.pv)}`}</span>
            <button type="button" className="bt-button bt-button--secondary" aria-label={`Sell ${r.name} for ${String(sellPrice(r.pv))} SP`} onClick={() => void onSave(sellUnit(campaign, r.unitId, `${sortieKey}-sell-${String(campaign.ledger.length)}`, sortieKey), `Sold ${r.name}.`)}>
              {`Sell for ${String(sellPrice(r.pv))}`}
            </button>
          </li>
        ))}
        {active.length === 0 && <li className="bt-row">The roster has no active units.</li>}
      </ul>
    </>
  );
}

function Keywords({ campaign, number, onSave }: { campaign: AcesCampaign; number: number; onSave: (c: AcesCampaign, message: string) => Promise<boolean> }) {
  const uid = useId();
  const record = campaign.sorties.findLast((s) => s.number === number && s.result === "win");
  const [words, setWords] = useState((record?.keywords ?? []).join(", "));
  const [next, setNext] = useState(record?.next === undefined ? "" : String(record.next));
  const totals = Object.entries(keywordTotals(campaign));
  return (
    <>
      <div className="bt-field">
        <label htmlFor={`${uid}-words`}>Keywords gained, separated by commas (a number after a dash is added to the total)</label>
        <input id={`${uid}-words`} value={words} onChange={(e) => { setWords(e.target.value); }} />
      </div>
      <div className="bt-field">
        <label htmlFor={`${uid}-next`}>Number of the sortie to play next</label>
        <input id={`${uid}-next`} type="number" inputMode="numeric" min={1} value={next} onChange={(e) => { setNext(e.target.value); }} />
      </div>
      <button
        type="button"
        className="bt-button"
        onClick={() =>
          void onSave(
            annotateSortie(campaign, number, {
              keywords: words.split(",").map((w) => w.trim()).filter((w) => w !== ""),
              ...(next.trim() === "" ? {} : { next: toNumber(next) }),
            }),
            "Keywords and next sortie saved.",
          )
        }
      >
        Save keywords and next sortie
      </button>
      {totals.length > 0 && (
        <ul aria-label="Keyword totals">
          {totals.map(([k, n]) => (
            <li key={k}>{`${k} ${String(n)}`}</li>
          ))}
        </ul>
      )}
      <p>
        <Link to={ACES_HOME}>Back to Aces</Link>
      </p>
    </>
  );
}

