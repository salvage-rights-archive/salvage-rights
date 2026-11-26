// The panels beside the editor: the rules check, Battle Value and cost, and the OFFICIAL mark. Same look as the 'Mech editor's.
import { useId, useMemo, useState } from "react";
import { BOOKS } from "../../data/editions";
import { markOfficial, officialState } from "../../rules/battlearmor/checks";
import type { BaFinding } from "../../rules/battlearmor/checks";
import { battleValue, unitCost } from "../../rules/battlearmor/bv";
import type { BaRecord } from "../../rules/battlearmor/record";
import type { Catalog } from "../../rules/catalog";
import { officialLabel } from "../../rules/official";
import { Disclosure, Rows, cbills } from "../editor/CalculatorPanel";
import type { BaOnEdit } from "./edit";

const GROUPS: { level: BaFinding["level"]; title: string }[] = [
  { level: "error", title: "Errors" },
  { level: "warning", title: "Warnings" },
  { level: "note", title: "Notes" },
];

export function BaFindings({ findings, targetOf, onChoose }: { findings: BaFinding[]; targetOf: (where: BaFinding["where"]) => string | undefined; onChoose: (id: string) => void }) {
  const count = (level: BaFinding["level"]) => findings.filter((f) => f.level === level).length;
  return (
    <section className="bt-panel bt-findings" aria-labelledby="ba-findings">
      <h2 id="ba-findings">Rules check</h2>
      <p role="status">{findings.length === 0 ? "No problems found." : `${String(count("error"))} errors, ${String(count("warning"))} warnings, ${String(count("note"))} notes`}</p>
      {GROUPS.map(({ level, title }) => {
        const group = findings.filter((f) => f.level === level);
        if (group.length === 0) return null;
        return (
          <div key={level} className={`bt-findings__group bt-findings__group--${level}`}>
            <h3>{title}</h3>
            <ul className="bt-list">
              {group.map((finding, index) => {
                const target = targetOf(finding.where);
                return (
                  <li key={`${finding.check}-${String(index)}`} className="bt-finding">
                    {target ? (
                      <button type="button" className="bt-finding__text" onClick={() => { onChoose(target); }}>
                        {finding.message}
                      </button>
                    ) : (
                      <span className="bt-finding__text">{finding.message}</span>
                    )}
                    {finding.cite && <span className="bt-finding__cite">{finding.cite}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

const number = (x: number) => (x + 0).toLocaleString("en-US", { maximumFractionDigits: 3 });

export function BaCalc({ record, catalog }: { record: BaRecord; catalog: Catalog }) {
  const bv = useMemo(() => battleValue(record, catalog), [record, catalog]);
  const cost = useMemo(() => unitCost(record, catalog), [record, catalog]);
  return (
    <section className="bt-panel bt-calc" aria-labelledby="ba-calc">
      <h2 id="ba-calc">Battle Value and cost</h2>
      <p>
        <strong>{`Battle Value ${number(bv.total)}`}</strong>
        {` for the ${String(record.troopers)} suits, ${number(bv.perSuit)} each.`}
      </p>
      <Disclosure label="How the Battle Value is worked out">
        <Rows rows={[...bv.steps.map((s): [string, string] => [s.label, number(s.value)]), ["Troopers", String(record.troopers)], ["Skills", `Gunnery ${String(record.skills.gunnery)}, Anti-'Mech ${String(record.skills.antiMech)}`]]} />
        {bv.unvalued.length > 0 && <p className="bt-hint">{`Counted as nothing, with no Battle Value in the tables: ${bv.unvalued.join(", ")}.`}</p>}
        <p className="bt-hint">TechManual Battle Value v4.1, pp. 310-311.</p>
      </Disclosure>
      <p>
        <strong>{cbills(cost.total)}</strong>
        {` for the ${String(record.troopers)} suits.`}
      </p>
      <Disclosure label="How the cost is worked out">
        <Rows rows={[...cost.lines.map((l): [string, string] => [l.label, cbills(l.cost)]), ["Each suit", cbills(cost.perSuit)]]} />
        {cost.unpriced.length > 0 && <p className="bt-hint">{`No price in the tables, counted as free: ${cost.unpriced.join(", ")}.`}</p>}
        <p className="bt-hint">TechManual, pp. 281, 285, 296-297.</p>
      </Disclosure>
    </section>
  );
}

export function BaOfficialBadge({ record }: { record: BaRecord }) {
  const state = officialState(record);
  const { badge, detail } = officialLabel(state);
  return (
    <span className="bt-official" data-official={state.official}>
      <strong className="bt-official__badge">{badge}</strong>
      {detail && <span className="bt-official__detail">{` ${detail}`}</span>}
    </span>
  );
}

export function BaOfficialPanel({ record, onEdit }: { record: BaRecord; onEdit: BaOnEdit }) {
  const state = officialState(record);
  const [book, setBook] = useState(record.official?.book ?? "");
  const [pageText, setPage] = useState(record.official?.page === undefined ? "" : String(record.official.page));
  const id = useId();
  const pageNumber = pageText.trim() === "" ? undefined : Number(pageText);
  const pageBad = pageNumber !== undefined && !(Number.isInteger(pageNumber) && pageNumber > 0);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Official or not</h2>
      <p>
        <BaOfficialBadge record={record} />
      </p>
      <p className="bt-hint">OFFICIAL means the game's publisher put this design out in a book. You state it; we never claim it for you. Changing the design (not the name, the notes or the picture) turns it NOT OFFICIAL, and Undo gets it back.</p>
      {state.official ? (
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { onEdit((d) => { delete d.official; }); }}>
          Mark NOT OFFICIAL
        </button>
      ) : (
        <div className="bt-grid">
          <div className="bt-field">
            <label htmlFor={`${id}-book`}>Book</label>
            <input id={`${id}-book`} type="text" list={`${id}-books`} value={book} onChange={(e) => { setBook(e.target.value); }} />
            <datalist id={`${id}-books`}>
              {Object.keys(BOOKS).map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
          </div>
          <div className="bt-field">
            <label htmlFor={`${id}-page`}>Page (optional)</label>
            <input id={`${id}-page`} type="text" inputMode="numeric" value={pageText} aria-invalid={pageBad || undefined} onChange={(e) => { setPage(e.target.value); }} />
            {pageBad && <span className="bt-hint">Enter a page number.</span>}
          </div>
          <button type="button" className="bt-button" disabled={book.trim() === "" || pageBad} onClick={() => { onEdit((d) => { markOfficial(d, book, pageNumber); }); }}>
            Mark OFFICIAL
          </button>
        </div>
      )}
    </section>
  );
}
