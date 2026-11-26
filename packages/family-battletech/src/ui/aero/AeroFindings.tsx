// The rules check beside the unit: what does not add up, each finding with the printed page its rule rests on, and "Check under" another
// edition, which lists what that edition's rules say of the same unit without changing it or marking anything in the editor.
import { useId, useState } from "react";
import { aeroEditionName, AERO_EDITIONS } from "../../data/aero";
import { checkUnder } from "../../rules/aero-checks";
import type { AeroFinding } from "../../rules/aero-checks";
import type { AeroRecord } from "../../rules/aero";
import type { Catalog } from "../../rules/catalog";

const GROUPS: { level: AeroFinding["level"]; title: string }[] = [
  { level: "error", title: "Errors" },
  { level: "warning", title: "Warnings" },
  { level: "note", title: "Notes" },
];

const summaryOf = (findings: AeroFinding[]): string => {
  const count = (level: AeroFinding["level"]) => findings.filter((f) => f.level === level).length;
  return findings.length === 0 ? "No problems found." : `${String(count("error"))} errors, ${String(count("warning"))} warnings, ${String(count("note"))} notes`;
};

function FindingList({ findings, targetOf, onChoose }: { findings: AeroFinding[]; targetOf: (where: AeroFinding["where"]) => string | undefined; onChoose: (id: string) => void }) {
  return (
    <>
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
                      <button
                        type="button"
                        className="bt-finding__text"
                        onClick={() => {
                          onChoose(target);
                        }}
                      >
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
    </>
  );
}

export default function AeroFindings({
  record,
  catalog,
  findings,
  targetOf,
  onChoose,
}: {
  record: AeroRecord;
  catalog: Catalog;
  findings: AeroFinding[];
  /** The id of the element a finding points at, when the page has one. */
  targetOf: (where: AeroFinding["where"]) => string | undefined;
  onChoose: (id: string) => void;
}) {
  const [under, setUnder] = useState("");
  const selectId = useId();
  const others = AERO_EDITIONS.filter((edition) => edition.id !== record.editionId);
  const other = under === "" ? undefined : checkUnder(record, under, catalog);
  return (
    <section className="bt-panel bt-findings" aria-labelledby="aero-rules-heading">
      <h2 id="aero-rules-heading">Rules check</h2>
      <p className="bt-findings__summary" aria-live="polite">
        {summaryOf(findings)}
      </p>
      <FindingList findings={findings} targetOf={targetOf} onChoose={onChoose} />
      <div className="bt-field">
        <label htmlFor={selectId}>Check under</label>
        <select
          id={selectId}
          value={under}
          onChange={(event) => {
            setUnder(event.target.value);
          }}
        >
          <option value="">Another edition...</option>
          {others.map((edition) => (
            <option key={edition.id} value={edition.id}>
              {edition.name}
            </option>
          ))}
        </select>
      </div>
      {other && (
        <div role="region" aria-label={`Check under ${aeroEditionName(under)}`}>
          <h3>{`Under ${aeroEditionName(under)}`}</h3>
          <p className="bt-hint">This is what that edition's rules say of the unit as it stands. Nothing on the unit changes.</p>
          <p className="bt-findings__summary" aria-live="polite">
            {summaryOf(other)}
          </p>
          {/* Nothing in the editor points at these: the unit is not built under that edition. */}
          <FindingList findings={other} targetOf={() => undefined} onChoose={onChoose} />
        </div>
      )}
    </section>
  );
}
