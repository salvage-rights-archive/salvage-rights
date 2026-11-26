// The Classic home's share of the infantry pages: the entry in the new-unit list, the call that starts a platoon, and the list of saved platoons.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motiveOf } from "../../data/infantry-tables";
import { newInfantryRecord } from "../../rules/infantry/platoon";
import type { InfantryRecord } from "../../rules/infantry/platoon";
import { setYear } from "../../rules/availability";
import type { RulesLevel } from "../../data/chassis";
import { editorHref, sheetHref } from "./routes";
import { openInfantryStorage } from "./storage";
import type { InfantryEntry } from "./storage";

export const INFANTRY_CHOICE = {
  id: "conventional",
  label: "Conventional infantry",
  note: "Conventional infantry: a platoon built under TechManual and opened in the infantry editor. TechManual, p. 144.",
};

/** Makes and saves a new platoon from the build form and returns its id. */
export async function startInfantry(form: { name: string; model: string; techBase: string; year: number | null; era?: string; rulesLevel?: RulesLevel }): Promise<string> {
  const record = newInfantryRecord({ techBase: form.techBase === "clan" ? "clan" : "inner-sphere", rulesLevel: form.rulesLevel, name: form.name, model: form.model });
  setYear(record, form.year);
  if (form.era) record.era = form.era;
  const storage = await openInfantryStorage();
  await storage.save(record);
  return record.id;
}

const titleOf = (record: InfantryRecord): string => `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed platoon";

/** The saved platoons, with the same Open and Record sheet buttons the 'Mechs have. Nothing is shown when there are none. */
export function InfantrySaved() {
  const [entries, setEntries] = useState<InfantryEntry[]>([]);
  useEffect(() => {
    let live = true;
    void openInfantryStorage()
      .then((s) => s.list())
      .then((list) => {
        if (live) setEntries(list);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (entries.length === 0) return null;
  return (
    <>
      <h3 id="bt-saved-infantry">Your infantry platoons</h3>
      <ul className="bt-list" aria-labelledby="bt-saved-infantry">
        {entries.map((entry) => {
          const record = entry.record;
          if (!record) return <li key={entry.id} className="bt-row">{entry.unreadable ?? "This saved platoon cannot be read."}</li>;
          const title = titleOf(record);
          return (
            <li key={entry.id} className="bt-row">
              <span className="bt-row__text">
                <strong>{title}</strong> {`${String(record.squads * record.perSquad)} troopers, ${motiveOf(record.motive)?.label ?? record.motive}`}
              </span>
              <span className="bt-row__actions">
                <Link className="bt-button" aria-label={`Open ${title}`} to={editorHref(record.id)}>
                  Open
                </Link>
                <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${title}`} to={sheetHref(record.id)}>
                  Record sheet
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
