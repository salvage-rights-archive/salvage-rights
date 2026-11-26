// The groups of a force and their formation types: a lance, Star or Level II named and given an organisation (ASCE p. 113), a formation
// type the player designates (p. 116), what that type still needs, and its bonus named with its page. The bonus text is ours behind the
// notes switch. Shown at Standard and above, or when the force already has groups.
import { AS_COMPOSITION_PAGE } from "../../data/as-compositions";
import { AS_FAMILY_NAMES, AS_FORMATIONS, AS_ORGANISATIONS, AS_ORGANISATION_PAGE, AS_OVERLAYS } from "../../data/as-formations";
import type { AsOrgFamily } from "../../data/as-formations";
import { AS_FORMATION_GLOSSES } from "../../data/as-glosses";
import { AS_EDITION } from "../../data/alpha-strike";
import { bonusFigure, checkFormation, findFormation, findOrganisation, findOverlay, formationsMet, groupFindings, groupTotals, groupsOf, newGroup } from "../../rules/as-force";
import { baseLines, checkComposition, checkOverlay, commandOfficersOver, groupScale } from "../../rules/as-composition";
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
      { ...force, groups: groups.filter((g) => g.id !== group.id).map((g) => (g.parent === group.id ? { ...g, parent: group.parent } : g)), members: force.members.map((m) => (m.group === group.id ? { ...m, group: undefined } : m)) },
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
        {`Name each lance, Star or Level II and choose its organisation from the table on p. ${String(AS_ORGANISATION_PAGE)} of ${AS_EDITION.name}, then designate the formation type it is built as (pp. 117-123). A group is one type, never two (p. 116). A Mechanized, Nova or Air Lance formation may sit on top of it (p. 121). Each unit's group is set in its row above. Put a lance in a company, or a Star in a Binary, with Part of group: a company and the groups above it are checked against the composition tables on p. ${String(AS_COMPOSITION_PAGE)}, and a formation designated on one multiplies its counts by the number of lances it holds.`}
      </p>
      <GlossSwitch id="as-groups-gloss" />
      {groups.length === 0 ? <p>No groups yet.</p> : (
        <ul className="bt-list">
          {by.groups.map((entry) => (
            <GroupCard key={entry.group.id} entry={entry} all={by.groups} glosses={glosses} setGroup={setGroup} remove={remove} />
          ))}
        </ul>
      )}
      {groups.length > 0 && by.ungrouped.count > 0 && (
        <p>{`${String(by.ungrouped.count)} ${by.ungrouped.count === 1 ? "unit is" : "units are"} not in a group (PV ${String(by.ungrouped.total)}).`}</p>
      )}
      <button type="button" className="bt-button bt-button--secondary" onClick={add}>
        Add a group
      </button>
    </section>
  );
}

/** The ids of every group inside this one, however deep, so a group is never offered as part of its own contents. */
const insideOf = (all: GroupTotals[], id: string): Set<string> => {
  const found = new Set<string>();
  const walk = (at: string) => {
    for (const child of all.find((e) => e.group.id === at)?.childIds ?? []) {
      if (!found.has(child)) {
        found.add(child);
        walk(child);
      }
    }
  };
  walk(id);
  return found;
};

function GroupCard({ entry, all, glosses, setGroup, remove }: { entry: GroupTotals; all: GroupTotals[]; glosses: boolean; setGroup: (id: string, patch: Partial<AsGroup>) => Promise<void>; remove: (group: AsGroup) => void }) {
  const { group, lines, total } = entry;
  const n = group.id;
  const type = findFormation(group.formation);
  const org = findOrganisation(group.org);
  const overlay = findOverlay(group.overlay);
  const base = baseLines(overlay, lines);
  const count = base.filter((l) => l.unit).length;
  const scale = groupScale(org, type, base);
  const held = insideOf(all, n);
  const extraOfficers = commandOfficersOver(org, type, scale, all.filter((e) => held.has(e.group.id)).flatMap((e) => (e.group.org ? [e.group.org] : [])));
  const check = type ? checkFormation(type, base, scale, extraOfficers) : undefined;
  const met = formationsMet(base, scale);
  const notes = groupFindings(group, count);
  const gloss = type && glosses ? AS_FORMATION_GLOSSES[type.id] : undefined;
  const figure = type ? bonusFigure(type, count) : undefined;
  const overlayCheck = overlay ? checkOverlay(overlay, lines) : undefined;
  const composition = checkComposition(all.filter((e) => entry.childIds.includes(e.group.id)), group.org);
  const unitCount = entry.count;
  const name = group.name.trim() || "this group";
  return (
    <li className={`bt-row as-group${entry.depth > 0 ? " as-group--nested" : ""}`} style={{ "--as-depth": Math.min(entry.depth, 3) } as React.CSSProperties}>
      <div className="bt-field">
        <label htmlFor={`as-group-name-${n}`}>Group name</label>
        <input id={`as-group-name-${n}`} value={group.name} onChange={(e) => void setGroup(n, { name: e.target.value })} />
      </div>
      <div className="bt-field">
        <label htmlFor={`as-group-parent-${n}`}>Part of group</label>
        <select id={`as-group-parent-${n}`} value={group.parent !== undefined && all.some((e) => e.group.id === group.parent) ? group.parent : ""} onChange={(e) => void setGroup(n, { parent: e.target.value || undefined })}>
          <option value="">Stands alone</option>
          {all.filter((e) => e.group.id !== n && !held.has(e.group.id)).map((e) => (
            <option key={e.group.id} value={e.group.id}>{e.group.name.trim() || "Unnamed group"}</option>
          ))}
        </select>
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
      <div className="bt-field">
        <label htmlFor={`as-group-overlay-${n}`}>Built on top as</label>
        <select id={`as-group-overlay-${n}`} value={overlay?.id ?? ""} onChange={(e) => void setGroup(n, { overlay: e.target.value || undefined })}>
          <option value="">Nothing on top</option>
          {AS_OVERLAYS.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
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
      <p className="as-group__totals">{`${String(unitCount)} ${unitCount === 1 ? "unit" : "units"}, PV ${String(total)}${lines.length > 0 ? `: ${lines.flatMap((l) => (l.unit ? [unitTitle(l.unit) || "Unnamed unit"] : [])).join(", ")}` : ""}.`}</p>
      {scale > 1 && <p className="bt-hint">{`This group holds ${String(scale)} lances, Stars or Level IIs by the sizes on p. ${String(AS_ORGANISATION_PAGE)}, so the counts of a formation are multiplied by ${String(scale)}.`}</p>}
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
      {overlay && overlayCheck && (
        <div className="as-group__check" role="group" aria-label={`${overlay.name} check for ${name}`}>
          {overlayCheck.met ? (
            <p>
              <strong>{`Meets the ${overlay.name} requirements`}</strong>
              {`, p. ${String(overlay.page)}. The formation under it is checked on the other units alone.`}
              {glosses && AS_FORMATION_GLOSSES[overlay.id] && <span className="as-spec__note">{AS_FORMATION_GLOSSES[overlay.id]}</span>}
            </p>
          ) : (
            <>
              <p>
                <strong>{`Does not yet meet the ${overlay.name} requirements`}</strong>
                {`, p. ${String(overlay.page)}. Missing:`}
              </p>
              <ul>
                {overlayCheck.missing.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {composition ? (
        <div className="as-group__check" role="group" aria-label={`Composition check for ${name}`}>
          <p>
            <strong>{composition.met ? `Fits the ${composition.table.name} composition table` : `Does not yet fit the ${composition.table.name} composition table`}</strong>
            {`, p. ${String(AS_COMPOSITION_PAGE)}. ${composition.rows.filter((r) => r.have > 0).map((r) => `${String(r.have)} ${r.row.label}`).join(", ") || "No inner group fits a row."}`}
          </p>
          {composition.problems.length > 0 && (
            <ul>
              {composition.problems.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
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
