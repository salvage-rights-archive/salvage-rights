// The groups of a force and their formation types: a lance, Star or Level II named and given an organisation (ASCE p. 113), a formation
// type the player designates (p. 116), what that type still needs, and its bonus named with its page. The bonus text is ours behind the
// notes switch. Shown at Standard and above, or when the force already has groups.
import { AS_FAMILY_NAMES, AS_FORMATIONS, AS_FORMATIONS_NOT_BUILT, AS_ORGANISATIONS, AS_ORGANISATION_PAGE } from "../../data/as-formations";
import type { AsOrgFamily } from "../../data/as-formations";
import { AS_FORMATION_GLOSSES } from "../../data/as-glosses";
import { AS_EDITION } from "../../data/alpha-strike";
import { bonusFigure, checkFormation, findFormation, findOrganisation, formationsMet, groupFindings, groupTotals, groupsOf, newGroup } from "../../rules/as-force";
import type { AsForce, AsGroup, ForceTotals, GroupTotals } from "../../rules/as-force";
import { unitTitle } from "../../rules/as-unit";
import { GlossSwitch } from "./AsSpecials";
import { useSpecialSettings } from "./specialSettings";

const FAMILIES: AsOrgFamily[] = ["is", "clan", "comstar"];

interface Props {
  force: AsForce;
  totals: ForceTotals;
  change: (next: AsForce, message?: string) => Promise<void>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function GroupsSection({ force, totals, change, headingRef }: Props) {
  const { glosses } = useSpecialSettings();
  const groups = groupsOf(force);
  const by = groupTotals(force, totals);

  const setGroup = (id: string, patch: Partial<AsGroup>) =>
    change({ ...force, groups: groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });

  const add = () => {
    const group = newGroup(crypto.randomUUID(), `Group ${String(groups.length + 1)}`);
    void change({ ...force, groups: [...groups, group] }, `Added ${group.name}.`);
  };

  const remove = (group: AsGroup) => {
    void change(
      { ...force, groups: groups.filter((g) => g.id !== group.id), members: force.members.map((m) => (m.group === group.id ? { ...m, group: undefined } : m)) },
      `Removed ${group.name.trim() || "the group"}. Its units stay in the force.`,
    );
    headingRef.current?.focus();
  };

  return (
    <section className="bt-section" aria-labelledby="as-force-groups">
      <h2 id="as-force-groups" ref={headingRef} tabIndex={-1}>
        Groups and formations
      </h2>
      <p className="bt-hint">
        {`Name each lance, Star or Level II and choose its organisation from the table on p. ${String(AS_ORGANISATION_PAGE)} of ${AS_EDITION.name}, then designate the formation type it is built as (pp. 117-123). A group is one type, never two (p. 116). Each unit's group is set in its row above.`}
      </p>
      <GlossSwitch id="as-groups-gloss" />
      {groups.length === 0 ? <p>No groups yet.</p> : (
        <ul className="bt-list">
          {by.groups.map((entry) => (
            <GroupCard key={entry.group.id} entry={entry} glosses={glosses} setGroup={setGroup} remove={remove} />
          ))}
        </ul>
      )}
      {groups.length > 0 && by.ungrouped.count > 0 && (
        <p>{`${String(by.ungrouped.count)} ${by.ungrouped.count === 1 ? "unit is" : "units are"} not in a group (PV ${String(by.ungrouped.total)}).`}</p>
      )}
      <button type="button" className="bt-button bt-button--secondary" onClick={add}>
        Add a group
      </button>
      <p className="bt-hint">{`Not checked here: the ${AS_FORMATIONS_NOT_BUILT.join(", ")} formations, which are built on top of another formation, and the company and battalion composition tables (p. 124).`}</p>
    </section>
  );
}

function GroupCard({ entry, glosses, setGroup, remove }: { entry: GroupTotals; glosses: boolean; setGroup: (id: string, patch: Partial<AsGroup>) => Promise<void>; remove: (group: AsGroup) => void }) {
  const { group, lines, count, total } = entry;
  const n = group.id;
  const type = findFormation(group.formation);
  const check = type ? checkFormation(type, lines) : undefined;
  const met = formationsMet(lines);
  const org = findOrganisation(group.org);
  const notes = groupFindings(group, count);
  const gloss = type && glosses ? AS_FORMATION_GLOSSES[type.id] : undefined;
  const figure = type ? bonusFigure(type, count) : undefined;
  const name = group.name.trim() || "this group";
  return (
    <li className="bt-row as-group">
      <div className="bt-field">
        <label htmlFor={`as-group-name-${n}`}>Group name</label>
        <input id={`as-group-name-${n}`} value={group.name} onChange={(e) => void setGroup(n, { name: e.target.value })} />
      </div>
      <div className="bt-field">
        <label htmlFor={`as-group-org-${n}`}>Organisation</label>
        <select id={`as-group-org-${n}`} value={org?.id ?? ""} onChange={(e) => void setGroup(n, { org: e.target.value || undefined })}>
          <option value="">Not stated</option>
          {FAMILIES.map((family) => (
            <optgroup key={family} label={AS_FAMILY_NAMES[family]}>
              {AS_ORGANISATIONS.filter((o) => o.family === family).map((o) => (
                <option key={o.id} value={o.id}>{`${o.name}, ${o.definition}`}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="bt-field">
        <label htmlFor={`as-group-type-${n}`}>Formation type</label>
        <select
          id={`as-group-type-${n}`}
          value={type?.id ?? ""}
          onChange={(e) => void setGroup(n, { formation: e.target.value || undefined, bonus: undefined })}
        >
          <option value="">None chosen</option>
          {(["ground", "aerospace"] as const).map((line) => (
            <optgroup key={line} label={line === "ground" ? "Ground formations" : "Aerospace formations"}>
              {AS_FORMATIONS.filter((f) => f.line === line).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {type?.bonus.choose && (
        <div className="bt-field">
          <label htmlFor={`as-group-bonus-${n}`}>Bonus ability chosen</label>
          <select id={`as-group-bonus-${n}`} value={group.bonus ?? ""} onChange={(e) => void setGroup(n, { bonus: e.target.value || undefined })}>
            <option value="">Not chosen yet</option>
            {type.bonus.names.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}
      <p className="as-group__totals">{`${String(count)} ${count === 1 ? "unit" : "units"}, PV ${String(total)}${lines.length > 0 ? `: ${lines.flatMap((l) => (l.unit ? [unitTitle(l.unit) || "Unnamed unit"] : [])).join(", ")}` : ""}.`}</p>
      {notes.map((text) => (
        <p key={text} className="bt-hint">{text}</p>
      ))}
      {type && check && (
        <div className="as-group__check" role="group" aria-label={`${type.name} check for ${name}`}>
          {check.met ? (
            <p>
              <strong>{`Meets the ${type.name} requirements`}</strong>
              {check.waivedBy ? ` (every unit has the ${check.waivedBy} role, which stands in for them, p. 116)` : ""}
              {`, p. ${String(type.page)}.`}
            </p>
          ) : (
            <>
              <p>
                <strong>{`Does not yet meet the ${type.name} requirements`}</strong>
                {`, p. ${String(type.page)}. Missing:`}
              </p>
              <ul>
                {check.missing.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
          <p>
            {`Bonus: ${type.bonus.names.length > 0 ? type.bonus.names.join(type.bonus.choose ? " or " : ", ") : "supports another formation"}${group.bonus ? ` (chosen: ${group.bonus})` : ""}, p. ${String(type.bonus.page)}.`}
            {figure ? ` With ${String(count)} units: ${figure}.` : ""}
            {gloss && <span className="as-spec__note">{gloss}</span>}
          </p>
        </div>
      )}
      <details>
        <summary>{`Formation types this group meets (${String(met.length)})`}</summary>
        <p>{met.length === 0 ? "None yet." : met.map((f) => f.name).join(", ")}</p>
      </details>
      <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove group ${name}`} onClick={() => { remove(group); }}>
        Remove group
      </button>
    </li>
  );
}
