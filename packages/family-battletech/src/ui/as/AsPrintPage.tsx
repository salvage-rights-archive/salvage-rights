// Print the Alpha Strike cards and the force roster. `?unit=` prints one saved unit at its own Skill; `?force=` prints every unit of a
// force at its member's Skill, nine cards to a sheet, and a one-page roster with the totals. The choices at the top are for the screen;
// the paper holds only the sheets (alpha-strike.scss). Cards follow the blank card of ASCE p. 213, drawn by us.
import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AS_CARD_FOOT } from "../../data/alpha-strike";
import { newAsForce } from "../../rules/as-force";
import { fitSpecials, forceCards, printCard, printRoster, sheetsOf } from "../../rules/as-print";
import type { PrintCard, PrintRoster } from "../../rules/as-print";
import { STORAGE_READ_FAILED } from "../storage";
import { TRADEMARK_LINE } from "../sheet/RecordSheet";
import AsCardFace from "./AsCardFace";
import { forceHref } from "./AsForces";
import { openAsStorage } from "./storage";

const HOME = "/battletech/alpha-strike/home";

type Loaded =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "missing"; what: string }
  | { state: "ready"; heading: string; back: { to: string; text: string }; cards: PrintCard[]; roster?: PrintRoster; single?: true };

async function load(unitId: string | null, forceId: string | null): Promise<Loaded> {
  const storage = await openAsStorage();
  if (forceId !== null) {
    const entry = await storage.getForce(forceId);
    if (!entry?.force) return { state: "missing", what: "force" };
    const byId = new Map((await storage.list()).flatMap((e) => (e.unit ? [[e.unit.id, e.unit] as const] : [])));
    const roster = printRoster(entry.force, byId);
    return { state: "ready", heading: roster.name, back: { to: forceHref(forceId), text: roster.name }, cards: forceCards(entry.force, byId), roster };
  }
  const entry = unitId === null ? undefined : await storage.get(unitId);
  if (!entry?.unit) return { state: "missing", what: "unit" };
  const card = printCard(entry.unit, entry.unit.skill);
  // One unit has no roster page of its own; the same page carries the full special abilities when they did not fit on the card.
  const single = { ...newAsForce(entry.unit.id, card.title), members: [{ unitId: entry.unit.id, skill: entry.unit.skill }] };
  return { state: "ready", heading: card.title || "Unnamed unit", back: { to: HOME, text: "Alpha Strike" }, cards: [card], roster: printRoster(single, new Map([[entry.unit.id, entry.unit]])), single: true };
}

const Foot = () => <p className="as-sheet__foot">{`${TRADEMARK_LINE} Card layout: ${AS_CARD_FOOT}.`}</p>;

function Roster({ roster }: { roster: PrintRoster }) {
  const long = roster.rows.filter((r) => fitSpecials(r.specials).more);
  const pilots = roster.rows.some((r) => r.pilot !== "");
  const groups = roster.rows.some((r) => r.formation !== "");
  const abilities = roster.rows.some((r) => r.abilities !== "");
  return (
    <section className="as-sheet as-sheet--roster" aria-label="Force roster">
      <h2>{`Force roster: ${roster.name}`}</h2>
      <div className="as-sheet__scroll" tabIndex={0} role="region" aria-label="Roster table">
        <table className="as-sheet__table">
          <thead>
            <tr>
              <th scope="col">Unit</th>
              <th scope="col">TP</th>
              <th scope="col">SZ</th>
              <th scope="col">Move</th>
              <th scope="col">Role</th>
              <th scope="col">Skill</th>
              {pilots && <th scope="col">Pilot</th>}
              {groups && <th scope="col">Group</th>}
              {abilities && <th scope="col">Pilot abilities</th>}
              <th scope="col">Base PV</th>
              <th scope="col">PV at Skill</th>
            </tr>
          </thead>
          <tbody>
            {roster.rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">{r.title}</th>
                <td>{r.type}</td>
                <td>{String(r.size)}</td>
                <td>{r.move}</td>
                <td>{r.role}</td>
                <td>{String(r.skill)}</td>
                {pilots && <td>{r.pilot}</td>}
                {groups && <td>{r.formation}</td>}
                {abilities && <td>{r.abilities}</td>}
                <td>{String(r.basePv)}</td>
                <td>{String(r.pv)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={7 + Number(pilots) + Number(groups) + Number(abilities)}>{`Total, ${String(roster.rows.length)} ${roster.rows.length === 1 ? "unit" : "units"}`}</th>
              <td>{String(roster.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {roster.pvLimit !== undefined && roster.room !== undefined && (
        <p className="as-sheet__note">{`PV limit ${String(roster.pvLimit)}: ${roster.room < 0 ? `${String(-roster.room)} over` : `${String(roster.room)} to spare`}.`}</p>
      )}
      {long.length > 0 && (
        <>
          <h3>Special abilities in full</h3>
          <ul className="as-sheet__long">
            {long.map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong>
                {`: ${r.specials}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {roster.missing > 0 && <p className="as-sheet__note">{`${String(roster.missing)} ${roster.missing === 1 ? "unit is" : "units are"} no longer in the roster and left out.`}</p>}
      <Foot />
    </section>
  );
}

export default function AsPrintPage() {
  const [params] = useSearchParams();
  const unitId = params.get("unit");
  const forceId = params.get("force");
  const uid = useId();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [withCards, setWithCards] = useState(true);
  const [withRoster, setWithRoster] = useState(true);

  useEffect(() => {
    let live = true;
    load(unitId, forceId).then(
      (result) => { if (live) setLoaded(result); },
      () => { if (live) setLoaded({ state: "failed" }); },
    );
    return () => { live = false; };
  }, [unitId, forceId]);

  if (loaded.state !== "ready") {
    return (
      <div className="sr-page">
        <p>
          <Link className="bt-back" to={HOME}>
            <span aria-hidden="true">&larr; </span>Alpha Strike
          </Link>
        </p>
        <h1>Print cards</h1>
        {loaded.state === "loading" && <p role="status">Loading.</p>}
        {loaded.state === "failed" && <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p>}
        {loaded.state === "missing" && <p role="alert">{`That ${loaded.what} is not saved on this device.`}</p>}
      </div>
    );
  }
  const sheets = withCards ? sheetsOf(loaded.cards) : [];
  const moreCards = loaded.cards.filter((c) => c.specialsFit.more).length;
  const showRoster = loaded.single ? moreCards > 0 : withRoster;
  return (
    <div className="sr-page as-print">
      <div className="as-print__bar">
        <p>
          <Link className="bt-back" to={loaded.back.to}>
            <span aria-hidden="true">&larr; </span>{loaded.back.text}
          </Link>
        </p>
        <h1>{`Print: ${loaded.heading}`}</h1>
        {loaded.roster && !loaded.single && (
          <fieldset className="as-print__fieldset">
            <legend>What to print</legend>
            <label className="bt-check" htmlFor={`${uid}-cards`}>
              <input id={`${uid}-cards`} type="checkbox" checked={withCards} onChange={(e) => { setWithCards(e.target.checked); }} />
              Cards, nine to a sheet
            </label>
            <label className="bt-check" htmlFor={`${uid}-roster`}>
              <input id={`${uid}-roster`} type="checkbox" checked={withRoster} onChange={(e) => { setWithRoster(e.target.checked); }} />
              Roster page with totals
            </label>
          </fieldset>
        )}
        <p className="bt-hint">{`${String(loaded.cards.length)} ${loaded.cards.length === 1 ? "card" : "cards"}. Cards are 3.5 by 2.5 inches, nine to a sheet on Letter or A4 (landscape). In the print dialog, choose the paper and turn off headers and footers.`}</p>
        {moreCards > 0 && (
          <p className="bt-hint">{`${String(moreCards)} ${moreCards === 1 ? "card has" : "cards have"} more special abilities than fit in the box. The card says so, and the roster page lists them in full.`}</p>
        )}
        <p>
          <button type="button" className="bt-button" onClick={() => { window.print(); }}>
            Print
          </button>
        </p>
      </div>
      {sheets.map((sheet, i) => (
        <section key={i} className="as-sheet" aria-label={`Cards, sheet ${String(i + 1)} of ${String(sheets.length)}`}>
          <div className="as-sheet__cards">
            {sheet.map((card, n) => (
              <AsCardFace key={n} card={card} />
            ))}
          </div>
          <Foot />
        </section>
      ))}
      {loaded.roster && showRoster && <Roster roster={loaded.roster} />}
    </div>
  );
}
