// The small craft, DropShip or capital ship sheet as text, for a screen reader: the data as a list of terms, the weapon bays as a table, the armor of
// each facing, the heat of each arc and where the sheet's layout comes from (the page followed and the page carrying the permission notice).
// Visually hidden, and not printed.
import { AERO_HEAT_TOP, FLAGGED_HEAT } from "../../../data/aero-sheet";
import type { SheetProfile } from "../../../data/aero-sheet";
import type { AeroRecord } from "../../../rules/aero";
import type { VesselFacts } from "./vessel-facts";

export default function VesselText({ facts, record, profile }: { facts: VesselFacts; record: AeroRecord; profile: SheetProfile }) {
  const id = `aero-sheet-text-${record.id}`;
  const terms: [string, string][] = [
    ["Type", [facts.shape, facts.use, facts.typeLabel].filter((part) => part !== "").join(" ")],
    ["Rules edition", facts.edition],
    ["Tons", facts.tons],
    ["Tech base", facts.techBase],
    ["Safe thrust", facts.safe],
    ["Maximum thrust", facts.max || "none (a station-keeping drive)"],
    ...facts.data,
    ["Crew", facts.crew.have === "" ? (facts.crew.least === "" ? "not worked out" : `at least ${facts.crew.least}`) : facts.crew.have],
    ["Heat sinks", facts.sinks.line],
    ["Official", facts.official.detail ? `${facts.official.badge}, ${facts.official.detail}` : facts.official.badge],
    ["Layout", `Follows ${profile.follows}; drawn by us, with no logo or art.`],
    ...(profile.notice === undefined ? [] : ([["Permission notice", `${profile.notice}; the sheet follows that page as a form.`]] as [string, string][])),
    ...(profile.thresholdCite === undefined ? [] : ([["Damage threshold", `A tenth of the facing's armor, rounded up (${profile.thresholdCite}).`]] as [string, string][])),
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
        <caption>{`Weapon bays (${facts.capital ? "standard-scale points, C for capital scale" : "standard-scale points"})`}</caption>
        <thead>
          <tr>
            {["Weapons", "Count", "Arc", "Heat", "Short", "Medium", "Long", "Extreme"].map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facts.weapons.map((bay, index) => (
            <tr key={index}>
              <td>{bay.name}</td>
              <td>{bay.qty}</td>
              <td>{bay.loc}</td>
              <td>{bay.heat}</td>
              {bay.av.map((value, i) => (
                <td key={i}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {facts.ammo.length > 0 && <p>{`Ammunition: ${facts.ammo.join("; ")}`}</p>}
      <h3>{`Armor points (${facts.scale.toLowerCase()})`}</h3>
      <ul>
        {facts.armor.map((area) => (
          <li key={area.code}>{`${area.name}: ${String(area.points)} points, damage threshold ${String(area.threshold)}`}</li>
        ))}
        {facts.strayArmor.map((area) => (
          <li key={area.code}>{`"${area.code}": ${String(area.points)} points (a facing this sheet does not draw)`}</li>
        ))}
      </ul>
      <h3>Heat made by each arc</h3>
      <ul>
        {facts.heatByArc.map((arc) => (
          <li key={arc.arc}>{`${arc.name}: ${String(arc.heat)}`}</li>
        ))}
      </ul>
      <h3>Critical damage</h3>
      <ul>
        {profile.critical.map((row) => (
          <li key={row.label}>{`${row.label}: ${row.open === true ? "an open field" : row.boxes.some((box) => box !== "") ? row.boxes.filter((box) => box !== "").join(", ") : `${String(row.boxes.length)} blank boxes`}`}</li>
        ))}
      </ul>
      {profile.heatScale === true && (
        <>
          <h3>{`Heat scale, 0 to ${String(AERO_HEAT_TOP)}`}</h3>
          <ul>
            {FLAGGED_HEAT.rows.map((row) => (
              <li key={row.level}>{`${String(row.level)}: ${row.effect}`}</li>
            ))}
          </ul>
          <p>{`Heat scale read from ${FLAGGED_HEAT.cite}.`}</p>
        </>
      )}
    </section>
  );
}
