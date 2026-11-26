// The Sorties section of the campaign page: each recorded sortie with its figures, and a small form to correct the words on it
// (name, date, keywords, the sortie to play next). The money figures stay as the after-sortie steps worked them out.
import { useId } from "react";
import { SS_SORTIES } from "../../data/aces-scouring-sands";
import { editSortie } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";
import type { Edit } from "./CampaignParts";

const two = (n: number): string => String(n).padStart(2, "0");

function SortieEdit({ campaign, index, edit }: { campaign: AcesCampaign; index: number; edit: Edit }) {
  const s = campaign.sorties[index];
  const id = useId();
  if (!s) return null;
  return (
    <details className="aces-hand">
      <summary className="aces-summary">{`Change the words on sortie ${two(s.number)}`}</summary>
      <div className="bt-field">
        <label htmlFor={`${id}-n`}>Name</label>
        <input id={`${id}-n`} value={s.name ?? ""} maxLength={80} onChange={(e) => { edit(editSortie(campaign, index, { name: e.target.value })); }} />
      </div>
      <div className="bt-field">
        <label htmlFor={`${id}-d`}>Date</label>
        <input id={`${id}-d`} value={s.date} maxLength={40} onChange={(e) => { edit(editSortie(campaign, index, { date: e.target.value })); }} />
      </div>
      {s.result === "win" && (
        <>
          <div className="bt-field">
            <label htmlFor={`${id}-k`}>Keywords, separated by commas</label>
            <input id={`${id}-k`} defaultValue={s.keywords.join(", ")} onBlur={(e) => { edit(editSortie(campaign, index, { keywords: e.target.value.split(",") })); }} />
          </div>
          <div className="bt-field">
            <label htmlFor={`${id}-x`}>Sortie to play next (empty for none)</label>
            <input
              id={`${id}-x`}
              type="number"
              inputMode="numeric"
              min={0}
              value={s.next ?? ""}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                edit(editSortie(campaign, index, { next: e.target.value.trim() === "" || Number.isNaN(n) ? null : Math.max(0, n) }));
              }}
            />
          </div>
        </>
      )}
      <p className="bt-hint">Save the campaign to keep a change.</p>
    </details>
  );
}

export default function SortiesSection({ campaign, edit }: { campaign: AcesCampaign; edit: Edit }) {
  const book = campaign.book === "scouring-sands";
  const unitName = (unitId: string) => campaign.roster.find((r) => r.unitId === unitId)?.name ?? unitId;
  return (
    <section aria-labelledby="aces-c-sorties">
      <h2 id="aces-c-sorties">Sorties</h2>
      {campaign.sorties.length === 0 ? (
        <p>No sorties recorded yet.</p>
      ) : (
        <ul className="bt-list">
          {campaign.sorties.map((s, i) => {
            const name = (book ? SS_SORTIES.find((x) => x.n === s.number)?.title : undefined) ?? s.name;
            return (
              <li key={`${String(s.number)}-${String(i)}`} className="bt-row">
                <span className="bt-row__text">
                  {`Sortie ${two(s.number)}${name ? `, ${name}` : ""}`}
                  <span className="bt-row__credit">
                    {s.result === "failed"
                      ? `${s.date}. Failed and replayed; nothing else recorded.`
                      : `${s.date}. Income ${String(s.income)}, expenses ${String(s.income - s.earnings)}, earnings ${String(s.earnings)}, Named Pilot shares ${String(s.shares)}.${s.fielded.length > 0 ? ` Fielded ${s.fielded.map((f) => unitName(f.unitId)).join(", ")}.` : ""}${s.keywords.length > 0 ? ` Keywords ${s.keywords.join(", ")}.` : ""}${s.next === undefined ? "" : ` Next: sortie ${two(s.next)}.`}`}
                  </span>
                  <SortieEdit campaign={campaign} index={i} edit={edit} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
