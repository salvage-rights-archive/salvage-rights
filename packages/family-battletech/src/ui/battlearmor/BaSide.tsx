// The panels beside the editor: the rules check, Battle Value and cost, and the OFFICIAL mark. Same look as the 'Mech editor's.
import { useMemo } from "react";
import { markOfficial, officialState } from "../../rules/battlearmor/checks";
import type { BaFinding } from "../../rules/battlearmor/checks";
import { battleValue, unitCost } from "../../rules/battlearmor/bv";
import type { BaRecord } from "../../rules/battlearmor/record";
import type { Catalog } from "../../rules/catalog";
import { Disclosure, Rows, cbills } from "../editor/CalculatorPanel";
import { OfficialMark, OfficialMarkPanel } from "../editor/Marks";
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
  return <OfficialMark state={officialState(record)} />;
}

export function BaOfficialPanel({ record, onEdit }: { record: BaRecord; onEdit: BaOnEdit }) {
  return (
    <OfficialMarkPanel
      wide
      state={officialState(record)}
      stated={record.official}
      onMark={(book, page) => {
        onEdit((d) => {
          markOfficial(d, book, page);
        });
      }}
      onUnmark={() => {
        onEdit((d) => {
          delete d.official;
        });
      }}
    />
  );
}
