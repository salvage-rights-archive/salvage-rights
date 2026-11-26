// Start a sortie (Aces pp. 30-31, Scouring Sands pp. 5-63): choose the sortie, note the reconnaissance, field units up to the adjusted PV
// limit, choose pilots and the force commander, pay for OMNI reconfiguration, check the opposing force against the saved Alpha Strike
// units, then make the game linked to the campaign. The book's own words are not here: the page names entries ("read 02-Y in your
// book") and shows figures. A campaign of the player's own types every figure on this same page.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { SS_SORTIES } from "../../data/aces-scouring-sands";
import type { SsRecon, SsSortie } from "../../data/aces-scouring-sands";
import { ACES_LETTERS } from "../../data/aces-vocab";
import type { CommandLetter } from "../../data/aces-vocab";
import type { AcesCard, CommandCard } from "../../rules/aces-card";
import {
  buildSortieGame,
  checkFielding,
  fieldableUnits,
  matchOpposingUnit,
  nextSortieOffers,
  omniLines,
  opposingRows,
  pilotsForUnit,
  pilotStats,
  sortieWaypoints,
  startSortie,
} from "../../rules/aces-campaign";
import type { AcesCampaign, FieldedUnit, OpposingRow } from "../../rules/aces-campaign";
import { recordedDecks } from "../../rules/aces-game";
import type { AcesRules } from "../../rules/aces-game";
import type { AsUnit } from "../../rules/as-unit";
import { unitTitle } from "../../rules/as-unit";
import { openAsStorage } from "../as/storage";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED } from "../storage";
import { openCampaignStorage } from "./campaign-storage";
import type { CampaignStorage } from "./campaign-storage";
import { openGameStorage } from "./game-storage";
import { ACES_CARDS, ACES_HOME, gameHref } from "./routes";
import { openAcesStorage } from "./storage";
import "./aces.scss";

interface Loaded {
  storage: CampaignStorage;
  campaign: AcesCampaign;
  roster: AsUnit[];
  cards: AcesCard[];
  commands: CommandCard[];
}

interface OwnRow {
  key: number;
  unitId: string;
  skill: number;
  commander: boolean;
}

const numberOf = (text: string): number => {
  const n = Number(text);
  return text.trim() === "" || Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
};
const two = (n: number): string => String(n).padStart(2, "0");
const squeeze = (text: string): string => text.toLowerCase().replace(/\s+/g, "");

export default function SortiePage() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaign") ?? "";
  const [loaded, setLoaded] = useState<Loaded>();
  const [problem, setProblem] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const storage = await openCampaignStorage();
        const entry = await storage.get(campaignId);
        if (!entry?.campaign) {
          setMissing(!entry);
          setProblem(entry ? "This campaign is saved in a form the app cannot read." : "");
          return;
        }
        const as = await openAsStorage();
        const aces = await openAcesStorage();
        const records = (await aces.list(["aces-card", "aces-command"])).flatMap((e) => (e.record ? [e.record] : []));
        setLoaded({
          storage,
          campaign: entry.campaign,
          roster: (await as.list()).flatMap((e) => (e.unit ? [e.unit] : [])),
          cards: records.filter((r): r is AcesCard => r.kind === "aces-card"),
          commands: records.filter((r): r is CommandCard => r.kind === "aces-command"),
        });
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, [campaignId]);

  if (!loaded) {
    return (
      <div className="sr-page">
        <h1>Start a sortie</h1>
        <p role="alert" className="bt-problem">
          {problem}
        </p>
        {missing ? (
          <p>
            We could not find that campaign. <Link to={ACES_HOME}>Back to Aces.</Link>
          </p>
        ) : (
          !problem && <p role="status">Loading.</p>
        )}
      </div>
    );
  }
  return <Sortie loaded={loaded} firstNumber={Number(params.get("n")) || undefined} />;
}

function Sortie({ loaded, firstNumber }: { loaded: Loaded; firstNumber?: number }) {
  const { campaign, roster, cards, commands } = loaded;
  const navigate = useNavigate();
  const book = campaign.book === "scouring-sands";
  const offers = nextSortieOffers(campaign);
  const [number, setNumber] = useState<number>(firstNumber ?? offers[0]?.n ?? 1);
  const sortie: SsSortie | undefined = book ? SS_SORTIES.find((s) => s.n === number && s.n > 0) : undefined;

  const [reconPicked, setReconPicked] = useState<number[]>([]);
  const [ownRecon, setOwnRecon] = useState("");
  const [ownLimit, setOwnLimit] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pilotOf, setPilotOf] = useState<Record<string, string>>({});
  const [commanderId, setCommanderId] = useState("");
  const [omni, setOmni] = useState<Record<string, string>>({});
  const [included, setIncluded] = useState<Record<number, boolean>>({});
  const [ownRows, setOwnRows] = useState<OwnRow[]>([]);
  const [ownChoice, setOwnChoice] = useState("");
  const [commander, setCommander] = useState<string | undefined>(undefined);
  const [letter, setLetter] = useState<CommandLetter | undefined>(undefined);
  const [withdrawal, setWithdrawal] = useState<AcesRules["forcedWithdrawal"]>("none");
  const [problem, setProblem] = useState("");

  const asById = useMemo(() => new Map(roster.map((u) => [u.id, u])), [roster]);
  const recorded = recordedDecks(cards);
  const units = fieldableUnits(campaign);
  const fielded: FieldedUnit[] = units
    .filter((u) => picked.includes(u.unitId))
    .map((u) => ({
      unitId: u.unitId,
      ...(pilotOf[u.unitId] ? { pilotId: pilotOf[u.unitId] } : {}),
      ...(commanderId === u.unitId ? { commander: true } : {}),
      ...(numberOf(omni[u.unitId] ?? "") > 0 ? { omniPv: numberOf(omni[u.unitId] ?? "") } : {}),
    }));
  const check = checkFielding(campaign, fielded, sortie, book ? undefined : numberOf(ownLimit));
  const fees = omniLines(campaign, fielded);

  // Reconnaissance: what the book's options cost, or the one figure the player types for a sortie of their own.
  const options: SsRecon[] = sortie?.recon.options ?? [];
  const reconChosen = reconPicked.flatMap((i) => (options[i] ? [{ option: options[i], index: i }] : []));
  const reconRecords = book
    ? reconChosen.map(({ option, index }) => ({ label: option.entry ? `Reconnaissance ${option.entry}` : `Reconnaissance option ${String(index + 1)}`, sp: option.sp }))
    : numberOf(ownRecon) > 0
      ? [{ label: "Reconnaissance", sp: numberOf(ownRecon) }]
      : [];
  const reconTotal = reconRecords.reduce((a, r) => a + r.sp, 0);

  // The opposing force: the book's rows, or the ones typed for a sortie of the player's own.
  const bookRows: OpposingRow[] = sortie ? opposingRows(sortie) : [];
  const isIn = (row: OpposingRow): boolean => (row.ifKeyword === undefined ? true : (included[row.position] ?? row.ifKeyword === false));
  const bookLive = bookRows.filter(isIn).map((row) => ({ row, unit: matchOpposingUnit(row.name, roster) }));
  const bookMissing = bookLive.filter((r) => !r.unit);
  const opposing = book
    ? bookLive.flatMap((r) => (r.unit ? [{ row: { position: r.row.position, skill: r.row.skill, commander: r.row.commander === true, name: r.row.name, deck: r.row.deck }, unit: r.unit }] : []))
    : ownRows.flatMap((r, i) => {
        const unit = asById.get(r.unitId);
        return unit ? [{ row: { position: i + 1, skill: r.skill, commander: r.commander, name: unitTitle(unit), deck: undefined }, unit }] : [];
      });

  const commanders = [...new Set(commands.map((c) => c.commander))].sort((a, b) => a.localeCompare(b));
  const wantedCommander = sortie ? commanders.find((c) => squeeze(c) === squeeze(sortie.command.commander)) : undefined;
  const chosenCommander = commander ?? wantedCommander ?? "";
  const commandCards = commands.filter((c) => c.commander === chosenCommander);
  const letters = ACES_LETTERS.filter((l) => commandCards.some((c) => c.letter === l));
  const startLetter = letter && letters.includes(letter) ? letter : sortie && letters.includes(sortie.command.start) ? sortie.command.start : letters[0];

  const playerReady = fielded.length > 0 && fielded.every((f) => asById.has(f.unitId));
  const ready = playerReady && opposing.length > 0;

  const create = async () => {
    const id = crypto.randomUUID();
    // Multiple Attack Rolls and the Front-Loaded way of moving are required in every campaign (Aces p. 24).
    const rules: Partial<AcesRules> = { multipleAttackRolls: true, frontLoaded: true, forcedWithdrawal: sortie ? sortie.withdrawal : withdrawal };
    const game = buildSortieGame({
      id,
      seed: crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
      at: new Date().toISOString(),
      campaign,
      number,
      ...(sortie ? { sortie } : {}),
      fielded: fielded.flatMap((f) => {
        const unit = asById.get(f.unitId);
        return unit ? [{ ...f, unit }] : [];
      }),
      opposing,
      cards,
      commandCards,
      ...(startLetter ? { startLetter } : {}),
      rules,
      waypoints: sortie ? sortieWaypoints(sortie) : [],
    });
    try {
      // The game is saved before the campaign that points at it, so a failure between the two leaves no dangling pointer.
      await (await openGameStorage()).save(game);
      await loaded.storage.save(startSortie(campaign, { number, gameId: id, recon: reconRecords, omni: fees }));
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    void navigate(gameHref(id));
  };

  const toggle = (list: string[], id: string, on: boolean): string[] => (on ? [...list, id] : list.filter((x) => x !== id));
  const taken = (except: string): string[] => fielded.filter((f) => f.unitId !== except && f.pilotId).map((f) => f.pilotId ?? "");

  return (
    <div className="sr-page">
      <h1>{`Start sortie ${two(number)}`}</h1>
      <p>
        <Link to={ACES_HOME}>Back to Aces</Link>
      </p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      <section className="bt-section" aria-labelledby="so-which">
        <h2 id="so-which">Which sortie</h2>
        {book ? (
          <>
            {offers.length > 0 && <p>{`Next in your campaign: ${offers.map((o) => `${two(o.n)}${o.keyword ? " (if your campaign log says so, in your book)" : ""}`).join(", ")}.`}</p>}
            <div className="bt-field">
              <label htmlFor="so-number">Sortie</label>
              <select
                id="so-number"
                value={number}
                onChange={(e) => {
                  setNumber(Number(e.target.value));
                  setReconPicked([]);
                  setIncluded({});
                }}
              >
                {SS_SORTIES.filter((s) => s.n > 0).map((s) => (
                  <option key={s.n} value={s.n}>{`${two(s.n)}, ${s.title}${offers.some((o) => o.n === s.n) ? " (next)" : ""}`}</option>
                ))}
              </select>
            </div>
            {sortie && (
              <p className="bt-hint">{`Read sortie ${two(sortie.n)} in your campaign book, pages ${sortie.pages}. We show only the figures.`}</p>
            )}
          </>
        ) : (
          <div className="bt-field">
            <label htmlFor="so-number">Sortie number</label>
            <input id="so-number" type="number" inputMode="numeric" min={1} value={number} onChange={(e) => { setNumber(Math.max(1, numberOf(e.target.value))); }} />
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="so-recon">
        <h2 id="so-recon">Reconnaissance</h2>
        {book ? (
          sortie?.recon.pick === "none" || options.length === 0 ? (
            <p>This sortie has no reconnaissance to pay for.</p>
          ) : (
            <>
              <p className="bt-hint">{sortie?.recon.pick === "one" ? "Choose one option." : "Choose any or all."}</p>
              {sortie?.recon.pick === "one" && (
                <label className="bt-check" htmlFor="so-recon-none">
                  <input id="so-recon-none" type="radio" name="so-recon" checked={reconPicked.length === 0} onChange={() => { setReconPicked([]); }} />
                  No reconnaissance
                </label>
              )}
              {options.map((o, i) => {
                const name = o.entry ? `Entry ${o.entry}` : `Option ${String(i + 1)}`;
                const cost = o.sp > 0 ? `, ${String(o.sp)} SP` : "";
                const needs = o.keyword ? ", needs a keyword from your campaign log" : "";
                const on = reconPicked.includes(i);
                return (
                  <div key={i}>
                    <label className="bt-check" htmlFor={`so-recon-${String(i)}`}>
                      <input
                        id={`so-recon-${String(i)}`}
                        type={sortie?.recon.pick === "one" ? "radio" : "checkbox"}
                        name="so-recon"
                        checked={on}
                        onChange={(e) => { setReconPicked(sortie?.recon.pick === "one" ? (e.target.checked ? [i] : []) : e.target.checked ? [...reconPicked, i] : reconPicked.filter((x) => x !== i)); }}
                      />
                      {`${name}${cost}${needs}`}
                    </label>
                    {on && o.entry && <p className="bt-hint">{`Read ${o.entry} in your book.`}</p>}
                    {on && !o.entry && <p className="bt-hint">The cost is on the sortie page of your book.</p>}
                  </div>
                );
              })}
              <p role="status">{`Reconnaissance cost: ${String(reconTotal)} SP, taken in the after-sortie expenses.`}</p>
            </>
          )
        ) : (
          <div className="bt-field">
            <label htmlFor="so-own-recon">Reconnaissance SP</label>
            <input id="so-own-recon" type="number" inputMode="numeric" min={0} value={ownRecon} onChange={(e) => { setOwnRecon(e.target.value); }} />
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="so-force">
        <h2 id="so-force">Your force</h2>
        {book ? (
          <p role="status">{`PV limit ${String(check.limit)}, adjusted for your difficulty ${String(check.adjusted)}. Fielded: ${String(fielded.length)} units, ${String(check.total)} PV.`}</p>
        ) : (
          <>
            <div className="bt-field">
              <label htmlFor="so-own-limit">PV limit of the sortie</label>
              <input id="so-own-limit" type="number" inputMode="numeric" min={0} value={ownLimit} onChange={(e) => { setOwnLimit(e.target.value); }} />
            </div>
            <p role="status">{`Adjusted for your difficulty ${String(check.adjusted)}. Fielded: ${String(fielded.length)} units, ${String(check.total)} PV.`}</p>
          </>
        )}
        {sortie?.player.allies && <p className="bt-hint">{`Allied ${sortie.player.allies.name} vehicles add nothing to your PV; see your book.`}</p>}
        {units.length === 0 ? (
          <p>Your campaign has no active units. Add them on the campaign page.</p>
        ) : (
          <ul className="bt-list">
            {units.map((u) => {
              const on = picked.includes(u.unitId);
              const pilots = pilotsForUnit(campaign, u.type, taken(u.unitId));
              const fees1 = fees.find((f) => f.unitId === u.unitId);
              return (
                <li key={u.unitId} className="bt-row aces-unit">
                  <label className="bt-check" htmlFor={`so-use-${u.unitId}`}>
                    <input id={`so-use-${u.unitId}`} type="checkbox" checked={on} disabled={!asById.has(u.unitId)} onChange={(e) => { setPicked(toggle(picked, u.unitId, e.target.checked)); }} />
                    {`${u.name} (${u.type}, ${String(u.pv)} PV)`}
                  </label>
                  {!asById.has(u.unitId) && <p className="bt-hint">This unit is not in your Alpha Strike units on this device.</p>}
                  {on && (
                    <>
                      <div className="bt-field">
                        <label htmlFor={`so-pilot-${u.unitId}`}>{`Named Pilot of ${u.name}`}</label>
                        <select id={`so-pilot-${u.unitId}`} value={pilotOf[u.unitId] ?? ""} onChange={(e) => { setPilotOf({ ...pilotOf, [u.unitId]: e.target.value }); }}>
                          <option value="">No Named Pilot</option>
                          {pilots.map((p) => (
                            <option key={p.id} value={p.id}>{`${p.callsign}, Skill ${String(pilotStats(p).skill)}`}</option>
                          ))}
                        </select>
                      </div>
                      <label className="bt-check" htmlFor={`so-cmd-${u.unitId}`}>
                        <input id={`so-cmd-${u.unitId}`} type="radio" name="so-commander" checked={commanderId === u.unitId} onChange={() => { setCommanderId(u.unitId); }} />
                        {`${u.name} is the force commander`}
                      </label>
                      <div className="bt-field">
                        <label htmlFor={`so-omni-${u.unitId}`}>{`OMNI variant PV of ${u.name}, if reconfigured`}</label>
                        <input id={`so-omni-${u.unitId}`} type="number" inputMode="numeric" min={0} value={omni[u.unitId] ?? ""} onChange={(e) => { setOmni({ ...omni, [u.unitId]: e.target.value }); }} />
                      </div>
                      {fees1 && <p role="status">{`Reconfiguring ${u.name} costs ${String(fees1.sp)} SP.`}</p>}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {check.findings.map((f) => (
          <p key={f.id} role="status" className="bt-hint">{`${f.text} (${f.cite})`}</p>
        ))}
      </section>

      <section className="bt-section" aria-labelledby="so-opp">
        <h2 id="so-opp">Opposing force</h2>
        {book ? (
          <>
            <p className="bt-hint">{`The book's list is matched by name to your saved Alpha Strike units. About ${String(sortie?.opposing.pv ?? 0)} PV in the book.`}</p>
            <ul className="bt-list">
              {bookRows.map((row) => {
                const unit = matchOpposingUnit(row.name, roster);
                const deck = row.deck ? (row.deck.subtype ? `${row.deck.role} (${row.deck.subtype})` : row.deck.role) : "no deck";
                return (
                  <li key={row.position} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{`${String(row.position)}. ${row.name}`}</strong>
                      {` Skill ${String(row.skill)}, ${deck}${row.commander ? ", commander" : ""}${row.reserve ? ", reserve" : ""}`}
                    </span>
                    {row.ifKeyword !== undefined && (
                      <label className="bt-check" htmlFor={`so-in-${String(row.position)}`}>
                        <input id={`so-in-${String(row.position)}`} type="checkbox" checked={isIn(row)} onChange={(e) => { setIncluded({ ...included, [row.position]: e.target.checked }); }} />
                        {`${row.name} (${String(row.position)}) is in the force`}
                      </label>
                    )}
                    {isIn(row) &&
                      (unit ? (
                        <span className="bt-hint">In your units.</span>
                      ) : (
                        <Link className="bt-button bt-button--secondary" to="/battletech/alpha-strike/unit" aria-label={`Add this unit: ${row.name}`}>
                          Add this unit
                        </Link>
                      ))}
                  </li>
                );
              })}
            </ul>
            {bookMissing.length > 0 && <p role="status">{`${String(bookMissing.length)} of the opposing units are not in your Alpha Strike units yet. Add them, then come back to this page.`}</p>}
          </>
        ) : (
          <>
            {roster.length === 0 ? (
              <p>Your Alpha Strike units are empty. Add some first.</p>
            ) : (
              <div className="bt-field">
                <label htmlFor="so-own-unit">Add an opposing unit</label>
                <select id="so-own-unit" value={ownChoice} onChange={(e) => { setOwnChoice(e.target.value); }}>
                  <option value="">Choose a unit</option>
                  {roster.map((u) => (
                    <option key={u.id} value={u.id}>{`${unitTitle(u)} (PV ${String(u.card.pv)})`}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="bt-button"
                  disabled={ownChoice === ""}
                  onClick={() => {
                    setOwnRows([...ownRows, { key: (ownRows.at(-1)?.key ?? 0) + 1, unitId: ownChoice, skill: 4, commander: false }]);
                    setOwnChoice("");
                  }}
                >
                  Add to the opposing force
                </button>
              </div>
            )}
            <ul className="bt-list">
              {ownRows.map((r) => {
                const name = unitTitle(asById.get(r.unitId) ?? ({ name: { chassis: "Unit", model: "" } } as AsUnit));
                return (
                  <li key={r.key} className="bt-row aces-unit">
                    <strong>{name}</strong>
                    <div className="bt-field">
                      <label htmlFor={`so-skill-${String(r.key)}`}>{`Skill of ${name}`}</label>
                      <input id={`so-skill-${String(r.key)}`} type="number" inputMode="numeric" min={0} max={8} value={r.skill} onChange={(e) => { setOwnRows(ownRows.map((x) => (x.key === r.key ? { ...x, skill: Math.min(8, numberOf(e.target.value)) } : x))); }} />
                    </div>
                    <label className="bt-check" htmlFor={`so-ocmd-${String(r.key)}`}>
                      <input id={`so-ocmd-${String(r.key)}`} type="radio" name="so-ocommander" checked={r.commander} onChange={() => { setOwnRows(ownRows.map((x) => ({ ...x, commander: x.key === r.key }))); }} />
                      {`${name} is the commander`}
                    </label>
                    <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${name} from the opposing force`} onClick={() => { setOwnRows(ownRows.filter((x) => x.key !== r.key)); }}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="bt-field">
              <label htmlFor="so-withdraw">Forced withdrawal for the opposing force</label>
              <select id="so-withdraw" value={withdrawal} onChange={(e) => { setWithdrawal(e.target.value as AcesRules["forcedWithdrawal"]); }}>
                <option value="none">Not used</option>
                <option value="automated">Automated force only</option>
                <option value="both">Both sides</option>
              </select>
            </div>
          </>
        )}
        <p role="status">{`${String(opposing.length)} opposing ${opposing.length === 1 ? "unit" : "units"} will be in the game. Decks come from your recorded cards (${String(recorded.length)} recorded).`}</p>
      </section>

      <section className="bt-section" aria-labelledby="so-cmd">
        <h2 id="so-cmd">Command deck</h2>
        {commanders.length === 0 ? (
          <p>
            You have not recorded any command cards, so the game runs without a command deck. <Link to={ACES_CARDS}>Record them with your cards.</Link>
          </p>
        ) : (
          <>
            <div className="bt-field">
              <label htmlFor="so-commander">Commander</label>
              <select id="so-commander" value={chosenCommander} onChange={(e) => { setCommander(e.target.value); setLetter(undefined); }}>
                <option value="">No command deck</option>
                {commanders.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {letters.length > 0 && (
              <div className="bt-field">
                <label htmlFor="so-letter">Start on card</label>
                <select id="so-letter" value={startLetter} onChange={(e) => { setLetter(e.target.value as CommandLetter); }}>
                  {letters.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}
            {sortie && <p className="bt-hint">{`The book names the ${sortie.command.commander} deck, starting on card ${sortie.command.start}.`}</p>}
          </>
        )}
      </section>

      <p>
        <button type="button" className="bt-button" disabled={!ready} onClick={() => void create()}>
          Create the game
        </button>
      </p>
      {!ready && <p className="bt-hint">Choose at least one of your units and have at least one opposing unit found.</p>}
    </div>
  );
}
