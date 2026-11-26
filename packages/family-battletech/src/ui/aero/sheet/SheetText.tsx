// The fighter sheet as text, for a screen reader: the data as a list of terms, the weapons as a table, the armor of each area, the heat scale, and where
// the sheet's layout comes from (the page followed and, for a flagged blank, the page carrying the permission notice). Visually hidden, and not printed.
import { AERO_HEAT_TOP, AT1_HEAT, FLAGGED_HEAT } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import type { AeroRecord } from "../../../rules/aero";
import type { FighterFacts } from "./facts";

export default function SheetText({ facts, record, profile }: { facts: FighterFacts; record: AeroRecord; profile: SheetProfile }) {
  const id = `aero-sheet-text-${record.id}`;
  const heat = profile.flagged ? FLAGGED_HEAT : AT1_HEAT;
  const terms: [string, string][] = [
    ["Type", `${facts.typeLabel}, ${profile.title.toLowerCase()}`],
    ["Rules edition", facts.edition],
    ["Tons", facts.tons],
    ["Tech base", facts.techBase],
    [profile.layout === "at1" ? "Thrust" : "Safe thrust", facts.safe],
    [profile.layout === "at1" ? "Overthrust" : "Maximum thrust", facts.max || "not worked out"],
    ["Structural Integrity", facts.si || "not worked out"],
    ["Fuel points", facts.fuel || "not worked out"],
    ["Heat sinks", facts.sinks.line],
    ["Official", facts.official.detail ? `${facts.official.badge}, ${facts.official.detail}` : facts.official.badge],
    ["Layout", profile.flagged ? `Follows ${profile.follows}; drawn by us, with no logo or art.` : `Follows ${profile.follows}; drawn by us.`],
    ...(profile.notice === undefined ? [] : ([["Permission notice", `${profile.notice}; the sheet follows that page as a form.`]] as [string, string][])),
    ...(profile.thresholds && profile.thresholdCite !== undefined ? ([["Damage threshold", `A tenth of the area's armor, rounded up (${profile.thresholdCite}).`]] as [string, string][]) : []),
  ];
  return (
    <section className="sr-visually-hidden bt-sheet-text" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>The record sheet as text</h2>
      <dl>
        {terms.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <table>
        <caption>Weapons and equipment inventory</caption>
        <thead>
          <tr>
            {["Qty", "Type", "Loc", "Ht", "Short", "Medium", "Long", "Extreme", "Damage", "Hex ranges"].map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facts.weapons.map((line, index) => (
            <tr key={index}>
              <td>{line.qty}</td>
              <td>{line.name}</td>
              <td>{line.loc}</td>
              <td>{line.heat}</td>
              {line.av.map((value, i) => (
                <td key={i}>{value}</td>
              ))}
              <td>{line.damage}</td>
              <td>{line.hexes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {facts.ammo.length > 0 && <p>{`Ammunition: ${facts.ammo.join("; ")}`}</p>}
      <h3>Armor points</h3>
      <ul>
        {facts.armor.map((area) => (
          <li key={area.code}>{profile.thresholds ? `${area.name}: ${String(area.points)} points, damage threshold ${String(area.threshold)}` : `${area.name}: ${String(area.points)} points`}</li>
        ))}
        {facts.strayArmor.map((area) => (
          <li key={area.code}>{`"${area.code}": ${String(area.points)} points (an area this sheet does not draw)`}</li>
        ))}
      </ul>
      {profile.critical.length > 0 && (
        <>
          <h3>Critical damage</h3>
          <ul>
            {profile.critical.map((row) => (
              <li key={row.label}>{`${row.label}: ${row.boxes.filter((box) => box !== "").join(", ") || "one box"}`}</li>
            ))}
          </ul>
        </>
      )}
      <h3>{`Heat scale, 0 to ${String(AERO_HEAT_TOP)}`}</h3>
      <ul>
        {heat.rows.map((row) => (
          <li key={row.level}>{`${String(row.level)}: ${row.effect}`}</li>
        ))}
      </ul>
      <p>{`Heat scale read from ${heat.cite}.`}</p>
    </section>
  );
}
