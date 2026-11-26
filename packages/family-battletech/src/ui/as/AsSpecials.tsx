import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { AS_UNIT_TYPES } from "../../data/alpha-strike";
import { RULES_LEVELS } from "../../data/chassis";
import type { RulesLevel } from "../../data/chassis";
import { findSpecial, glossOf, specialAnchor, specialCite, specialsFor } from "../../rules/as-specials";
import { formatSpecial } from "../../rules/as-unit";
import type { AsSpecial } from "../../rules/as-unit";
import { setSpecialSettings, useSpecialSettings } from "./specialSettings";

const AIDS = "/battletech/alpha-strike/aids";

/** The one switch for our short notes, shown wherever specials are. Off shows the code and page; on adds the note. */
export function GlossSwitch({ id }: { id: string }) {
  const { glosses } = useSpecialSettings();
  return (
    <label className="as-aids__flag" htmlFor={id}>
      <input id={id} type="checkbox" checked={glosses} onChange={(event) => { setSpecialSettings({ glosses: event.target.checked }); }} />
      Show our short notes on special abilities
    </label>
  );
}

/**
 * A card's specials, each a link to its entry on the aids page with the page beside it, and our short note when the switch is on.
 * A code we do not know is written plainly. The unit's own specials always show, whatever the level.
 */
export function SpecialLinks({ specials }: { specials: AsSpecial[] }) {
  const { glosses } = useSpecialSettings();
  if (specials.length === 0) return <>none</>;
  return (
    <ul className="as-specials">
      {specials.map((s, index) => {
        const row = findSpecial(s.code);
        const text = formatSpecial(s);
        const note = row && glosses ? glossOf(row) : undefined;
        return (
          <li key={`${text}-${String(index)}`}>
            {row ? (
              <>
                <Link to={`${AIDS}#${specialAnchor(row)}`} aria-label={`${text}, ${row.name}, page ${String(row.page)}`}>
                  {text}
                </Link>
                <span className="as-specials__page">{` p. ${String(row.page)}`}</span>
                {note && <span className="as-specials__note">{` ${note}`}</span>}
              </>
            ) : (
              text
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The specials section of the aids page: the table cut to a rules level and, when asked, a unit type. */
export function SpecialsAid() {
  const { glosses, level } = useSpecialSettings();
  const hash = useLocation().hash.replace(/^#/, "");
  const [type, setType] = useState("");
  const shown = specialsFor(level, type === "" ? undefined : type);
  // A code the player followed a link for stays listed even when the level or type would hide it, so the link always lands.
  const linked = hash.startsWith("special-") ? findSpecial(hash.slice("special-".length)) : undefined;
  const rows = linked && !shown.includes(linked) ? [...shown, linked].sort((a, b) => a.code.localeCompare(b.code)) : shown;

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ block: "start" });
    el?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <section className="bt-section" aria-labelledby="as-specials">
      <h2 id="as-specials">Special abilities</h2>
      <p className="bt-hint">Each ability with the page of Alpha Strike: Commander&apos;s Edition that describes it. Standard abilities are on pp. 76-81; the optional ones from p. 82 need every player&apos;s agreement.</p>
      <div className="as-aids__grid">
        <div className="bt-field">
          <label htmlFor="as-spec-level">Rules level</label>
          <select id="as-spec-level" value={level} onChange={(event) => { setSpecialSettings({ level: event.target.value as RulesLevel }); }}>
            {RULES_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bt-field">
          <label htmlFor="as-spec-type">Unit type</label>
          <select id="as-spec-type" value={type} onChange={(event) => { setType(event.target.value); }}>
            <option value="">Any</option>
            {AS_UNIT_TYPES.map((t) => (
              <option key={t.code} value={t.code}>{`${t.name} (${t.code})`}</option>
            ))}
          </select>
        </div>
      </div>
      <GlossSwitch id="as-spec-gloss" />
      <p className="bt-hint">{`${String(rows.length)} abilities listed. Abilities outside the rules level are left out.`}</p>
      <ul className="bt-list as-specials-aid">
        {rows.map((row) => {
          const note = glosses ? glossOf(row) : undefined;
          return (
            <li key={row.code} id={specialAnchor(row)} tabIndex={-1} className="as-spec">
              <strong>{row.code}</strong>
              {` ${row.name}, ${specialCite(row)}`}
              {row.also ? `; also p. ${row.also.join(", ")}` : ""}
              {row.types ? `. Limited to ${row.types.join(", ")}` : ""}
              {shown.includes(row) ? "" : ". Listed because you followed a link to it"}
              {note && <span className="as-spec__note">{note}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
