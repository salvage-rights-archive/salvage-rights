import { SNEAK_SYSTEMS, STEALTH_MODIFIERS } from "../../data/infantry-tables";
import type { ArmorKit } from "../../data/infantry-tables";

/**
 * The systems of a sneak suit. One rule for the choice: a one-system suit is a radio group (picking another system replaces the first); with two or
 * three, a checked box stays checked while it is the only one (an empty choice would fall back to the defaults) and unchecked boxes lock once the
 * suit's count is reached, so a player first unchecks one to swap.
 */
export default function SneakSystemsField({ kit, systems, onChange }: { kit: ArmorKit; systems: string[]; onChange: (list: string[]) => void }) {
  const count = kit.systems ?? 0;
  const single = count === 1;
  return (
    <fieldset className="bt-arm">
      <legend>{`Sneak suit systems (up to ${String(count)}; each adds to the Battle Value Defensive Factor)`}</legend>
      {SNEAK_SYSTEMS.map((id) => {
        const on = systems.includes(id);
        const name = STEALTH_MODIFIERS.find((m) => m.id === id)?.name.replace(/^Sneak, /, "") ?? id;
        return (
          <label key={id} className="bt-check" htmlFor={`field-sneak-${id}`}>
            <input
              id={`field-sneak-${id}`} type={single ? "radio" : "checkbox"} name="sneak-system" checked={on}
              disabled={single ? false : on ? systems.length <= 1 : systems.length >= count}
              onChange={(e) => { onChange(single ? [id] : SNEAK_SYSTEMS.filter((x) => (x === id ? e.target.checked : systems.includes(x)))); }}
            />
            {name}
          </label>
        );
      })}
    </fieldset>
  );
}
