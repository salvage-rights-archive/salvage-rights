// The sheet's content as text, for a screen reader: the 'Mech data as a list of terms, the inventory as a table, and the
// armor and structure points of each location as a list. Visually hidden, and not printed.
import { EMPTY_SLOT } from "../../data/sheet";
import type { SheetFacts } from "./facts";
import { armorText, structureText } from "./Diagrams";

export default function SheetText({ facts, record }: { facts: SheetFacts; record: { id: string } }) {
  const id = `sheet-text-${record.id}`;
  const terms: [string, string][] = [
    ["Type", facts.title],
    ["Walking", facts.walk],
    ["Running", facts.run],
    ["Jumping", facts.jump],
    ...(facts.movementNote === undefined ? [] : [["Movement taken off", facts.movementNote] as [string, string]]),
    ["Tonnage", facts.tons],
    ["Tech base", facts.techBase],
    ["Rules edition", facts.edition],
    ["Rules level", facts.level],
    ...(facts.frankenmech ? [["Build", "FrankenMech, built from donor parts"] as [string, string]] : []),
    ...(facts.year === undefined ? [] : [["Year", facts.year] as [string, string]]),
    ["Heat sinks", facts.heatSinks.summary],
    ["Battle Value", `${facts.battleValue} (${facts.battleValueFrom})`],
  ];
  const slots = facts.layout.supported ? facts.layout.locations : [];
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
            {["Qty", "Type", "Loc", "Ht", "Dmg", "Min", "Sht", "Med", "Lng"].map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facts.inventory.map((line, index) => (
            <tr key={index}>
              <td>{line.sub ? "" : line.qty}</td>
              <td>{line.name}</td>
              <td>{line.location}</td>
              <td>{line.heat}</td>
              <td>{line.damage}</td>
              <td>{line.min}</td>
              <td>{line.short}</td>
              <td>{line.medium}</td>
              <td>{line.long}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {facts.ammo && <p>{`Ammo: ${facts.ammo}`}</p>}
      <h3>Armor points</h3>
      <ul>
        {facts.points.map((p) => (
          <li key={p.code}>{armorText(p)}</li>
        ))}
      </ul>
      <h3>Structure points</h3>
      <ul>
        {facts.points.map((p) => (
          <li key={p.code}>{structureText(p)}</li>
        ))}
      </ul>
      {slots.length > 0 && (
        <>
          <h3>Critical slots</h3>
          <ul>
            {slots.map((code) => (
              <li key={code}>
                {`${facts.points.find((p) => p.code === code)?.name ?? code}: ${(facts.layout.slots[code] ?? []).map((cell) => (cell.kind === "empty" ? EMPTY_SLOT : cell.label)).join(", ")}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
