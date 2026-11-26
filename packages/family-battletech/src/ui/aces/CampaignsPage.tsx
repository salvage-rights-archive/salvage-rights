// The player's Aces campaigns: the list, a new campaign, export and import of campaign files (our own, or the Aces campaigns of a
// BattleTech Tools backup), and delete with a confirm. A saved campaign the app cannot read is listed with Export raw and Delete.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { difficultyRow, warchest } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import type { AsUnit } from "../../rules/as-unit";
import { openAsStorage } from "../as/storage";
import type { AsStorage } from "../as/storage";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import NewCampaignForm from "./NewCampaignForm";
import { MAX_IMPORT_BYTES, downloadCampaigns, keepBoth, planCampaignImport, readImport } from "./campaign-file";
import type { ImportPlan, ImportRead } from "./campaign-file";
import { openCampaignStorage } from "./campaign-storage";
import type { CampaignEntry, CampaignStorage } from "./campaign-storage";
import { ACES_HOME, campaignHref } from "./routes";
import "./styles";

const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;

interface Pending {
  conflicts: AcesCampaign[];
}

export default function CampaignsPage() {
  const [storage, setStorage] = useState<CampaignStorage>();
  const [asStorage, setAsStorage] = useState<AsStorage>();
  const [entries, setEntries] = useState<CampaignEntry[]>([]);
  const [units, setUnits] = useState<AsUnit[]>([]);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  const [pending, setPending] = useState<Pending>();
  const [left, setLeft] = useState<ImportRead["left"]>([]);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };
  const fail = (text: string) => {
    setStatus("");
    setProblem(text);
  };

  const reload = async (s: CampaignStorage, a: AsStorage): Promise<boolean> => {
    try {
      setEntries(await s.list());
      setUnits((await a.list()).flatMap((e) => (e.unit ? [e.unit] : [])));
      return true;
    } catch {
      fail(STORAGE_READ_FAILED);
      return false;
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openCampaignStorage();
        const a = await openAsStorage();
        setStorage(s);
        setAsStorage(a);
        setEntries(await s.list());
        setUnits((await a.list()).flatMap((e) => (e.unit ? [e.unit] : [])));
      } catch {
        fail(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  useEffect(() => {
    if (pending) replaceRef.current?.focus();
  }, [pending]);

  const readable = entries.flatMap((e) => (e.campaign ? [e.campaign] : []));
  const broken = entries.filter((e) => !e.campaign);

  const remove = async (target: { id: string; name: string }) => {
    if (!storage || !asStorage) return;
    setConfirming(undefined);
    try {
      await storage.remove(target.id);
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    if (await reload(storage, asStorage)) {
      say("Deleted.");
      headingRef.current?.focus();
    }
  };

  const exportRaw = async (e: CampaignEntry) => {
    try {
      downloadJson(`${e.id.replace(/[^A-Za-z0-9-]+/g, "-") || "campaign"}.raw.json`, ((await storage?.raw(e.id)) ?? null) as unknown);
      say("Export started.");
    } catch {
      fail("We could not read that campaign to export it.");
    }
  };

  const exportThese = (campaigns: AcesCampaign[], single: boolean) => {
    const present = new Set(units.map((u) => u.id));
    const lacking = new Set(campaigns.flatMap((c) => c.roster.map((r) => r.unitId)).filter((id) => !present.has(id))).size;
    downloadCampaigns(campaigns, units, single);
    say(`Export started.${lacking > 0 ? ` ${plural(lacking, "roster unit")} could not be added to the file because ${lacking === 1 ? "it is" : "they are"} no longer saved on this device.` : ""}`);
  };

  const save = async (campaigns: AcesCampaign[], newUnits: AsUnit[]) => {
    if (!storage || !asStorage) return false;
    try {
      for (const u of newUnits) await asStorage.save(u);
      for (const c of campaigns) await storage.save(c);
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return false;
    }
    return true;
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage || !asStorage) return;
    setLeft([]);
    setPending(undefined);
    say("");
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) {
      message = "That file is too large to be a campaign file.";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a campaign file or a BattleTech Tools backup.";
      }
      if (!message) {
        const result = readImport(parsed, units);
        if (!result.ok) {
          message = result.message;
        } else {
          const plan: ImportPlan = planCampaignImport(result.read, { campaigns: readable, units });
          if (await save(plan.add, plan.addUnits) && (await reload(storage, asStorage))) {
            const from = result.read.source === "jbt" ? "a BattleTech Tools backup" : "the file";
            const parts = [`Added ${plural(plan.add.length, "campaign")} from ${from}.`];
            if (plan.same > 0) parts.push(`${plural(plan.same, "campaign")} already here, unchanged.`);
            if (plan.keptUnits > 0) parts.push(`${plural(plan.keptUnits, "unit")} you already have under the same name were kept as yours.`);
            if (plan.missingUnits > 0) parts.push(`${plural(plan.missingUnits, "roster unit")} named by the campaigns is not saved here, so it cannot be fielded until you add it.`);
            parts.push(...result.read.notes);
            say(parts.join(" "));
            setLeft(result.read.left.filter((l) => l.lines.length > 0));
            if (plan.conflicts.length > 0) setPending({ conflicts: plan.conflicts });
          }
        }
      }
    }
    if (message) fail(message);
    input.value = "";
  };

  const settle = async (how: "replace" | "both") => {
    if (!pending || !storage || !asStorage) return;
    const list = pending.conflicts;
    setPending(undefined);
    const next = how === "replace" ? list : list.map((c) => keepBoth(c, crypto.randomUUID()));
    if ((await save(next, [])) && (await reload(storage, asStorage))) say(how === "replace" ? `Replaced ${plural(list.length, "campaign")} with the file's version.` : `Kept both: ${plural(list.length, "campaign")} saved beside yours as imported copies.`);
  };

  const askDelete = (target: { id: string; name: string }, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };
  const cancel = () => {
    setConfirming(undefined);
    openerRef.current?.focus();
  };

  return (
    <div className="sr-page">
      <Link className="bt-back" to={ACES_HOME}>
        <span aria-hidden="true">&larr; </span>Aces
      </Link>
      <h1 ref={headingRef} tabIndex={-1}>
        Your Aces campaigns
      </h1>
      <p>Your campaigns stay on this device. Export them as a file to keep a backup or to open them on another device.</p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your campaigns last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <section className="bt-section" aria-labelledby="aces-camp-list">
        <h2 id="aces-camp-list">Campaigns</h2>
        {storage && readable.length === 0 && broken.length === 0 ? (
          <p>No campaigns yet. Start one below, or import a file.</p>
        ) : (
          <ul className="bt-list">
            {readable.map((c) => (
              <li key={c.id} className="bt-row">
                <span className="bt-row__text">
                  {c.name}
                  <span className="bt-row__credit">{`${c.book === "scouring-sands" ? "Scouring Sands" : "Own campaign"}, ${difficultyRow(c.difficulty).label}, warchest ${String(warchest(c))} SP, ${plural(c.sorties.filter((s) => s.result === "win").length, "sortie")} won`}</span>
                </span>
                <span className="bt-row__actions">
                  <Link className="bt-button" aria-label={`Open ${c.name}`} to={campaignHref(c.id)}>
                    Open
                  </Link>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Export ${c.name}`} onClick={() => { exportThese([c], true); }}>
                    Export
                  </button>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${c.name}`} onClick={(event) => { askDelete({ id: c.id, name: c.name }, event.currentTarget); }}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
            {broken.map((e) => (
              <li key={e.id} className="bt-row">
                <span className="bt-row__text">{`This saved campaign cannot be read. ${e.unreadable ?? ""}`}</span>
                <span className="bt-row__actions">
                  <button type="button" className="bt-button bt-button--secondary" onClick={() => void exportRaw(e)}>
                    Export raw
                  </button>
                  <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { askDelete({ id: e.id, name: "this campaign" }, event.currentTarget); }}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {confirming && (
          <div
            className="bt-confirm"
            role="group"
            aria-label="Confirm delete"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          >
            <p>{`Delete ${confirming.name}? This cannot be undone. Export it first if you want to keep it.`}</p>
            <span className="bt-row__actions">
              <button type="button" className="bt-button" onClick={() => void remove(confirming)}>
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
                Keep
              </button>
            </span>
          </div>
        )}
        {pending && (
          <div className="bt-confirm" role="group" aria-label="Campaigns that are already here">
            <p>{`${plural(pending.conflicts.length, "campaign")} in the file ${pending.conflicts.length === 1 ? "has" : "have"} the same id as ${pending.conflicts.length === 1 ? "one" : "ones"} you have saved, with other contents. Replace yours, or keep both?`}</p>
            <span className="bt-row__actions">
              <button type="button" ref={replaceRef} className="bt-button" onClick={() => void settle("replace")}>
                Replace mine
              </button>
              <button type="button" className="bt-button bt-button--secondary" onClick={() => void settle("both")}>
                Keep both
              </button>
            </span>
          </div>
        )}
        {left.length > 0 && (
          <section aria-labelledby="aces-camp-left" className="bt-section">
            <h3 id="aces-camp-left">What we could not carry over</h3>
            {left.map((l) => (
              <div key={l.name}>
                <h4>{l.name}</h4>
                <ul>
                  {l.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </section>

      <section className="bt-section" aria-labelledby="aces-camp-file">
        <h2 id="aces-camp-file">Your campaign file</h2>
        <p className="bt-hint">A file holds your campaigns and the Alpha Strike units their rosters use. You can also import the Aces campaigns from a BattleTech Tools backup file.</p>
        <p>
          <button type="button" className="bt-button bt-button--secondary" disabled={readable.length === 0} onClick={() => { exportThese(readable, false); }}>
            Export all campaigns
          </button>
        </p>
        <div className="bt-field">
          <label htmlFor="aces-camp-in">Import a campaign file or a BattleTech Tools backup</label>
          <input id="aces-camp-in" type="file" accept="application/json,.json" disabled={!storage} onChange={(event) => void upload(event)} />
        </div>
      </section>

      {storage && <NewCampaignForm storage={storage} units={units} />}
    </div>
  );
}
