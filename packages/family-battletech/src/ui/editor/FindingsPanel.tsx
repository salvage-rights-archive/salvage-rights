// The rules check beside the 'Mech: what is illegal or does not add up, with the printed page each rule rests on.
import type { Finding } from "../../rules/checks";

const GROUPS: { level: Finding["level"]; title: string }[] = [
  { level: "error", title: "Errors" },
  { level: "warning", title: "Warnings" },
  { level: "note", title: "Notes" },
];

export const citation = (cite: NonNullable<Finding["cite"]>) => `${cite.book}, p. ${cite.page}`;

export default function FindingsPanel({
  findings,
  targetOf,
  onChoose,
}: {
  findings: Finding[];
  /** The id of the element a finding points at, when the page has one. */
  targetOf: (where: Finding["where"]) => string | undefined;
  onChoose: (id: string) => void;
}) {
  const count = (level: Finding["level"]) => findings.filter((f) => f.level === level).length;
  const summary =
    findings.length === 0 ? "No problems found." : `${count("error")} errors, ${count("warning")} warnings, ${count("note")} notes`;
  return (
    <section className="bt-panel bt-findings" aria-labelledby="bt-rules-heading">
      <h2 id="bt-rules-heading">Rules check</h2>
      <p className="bt-findings__summary" aria-live="polite">
        {summary}
      </p>
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
                  <li key={`${finding.check}-${index}`} className="bt-finding">
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
                    {finding.cite && <span className="bt-finding__cite">{citation(finding.cite)}</span>}
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
