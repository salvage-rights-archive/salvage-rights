// The player's own card library: decks with how complete they are, add, duplicate as another copy, export and import the library
// file, delete. A saved record the app cannot read is listed with Export raw and Delete, never dropped.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { ACES_SPECIAL_ORDERS } from "../../data/aces-vocab";
import { cardLevel, commandCompleteness, completeness, deckKey, isSample } from "../../rules/aces-card";
import type { AcesCard, AcesKind, AcesRecord, CommandCard, DeckCompleteness, SpecialOrderCard, SupportCard } from "../../rules/aces-card";
import { withoutShadowedSamples } from "../../rules/aces-samples";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import { ACES_COMMAND, ACES_ORDER, ACES_SUPPORT, ACES_CARD, ACES_HOME, cardHref, commandHref, orderHref, supportHref } from "./routes";
import { downloadLibrary, fromLibraryFile, libraryOf, openAcesStorage, planLibraryImport } from "./storage";
import type { AcesEntry, AcesStorage } from "./storage";
import "./aces.scss";

const MAX_IMPORT_BYTES = 1024 * 1024 * 8;
const KIND_WORDS: Record<AcesKind, string> = { "aces-card": "behaviour card", "aces-command": "command card", "aces-order": "special order card", "aces-support": "support card" };

const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;

function deckWords(d: DeckCompleteness): string {
  const parts: string[] = [];
  parts.push(d.missing.length === 0 ? `All ${String(d.of)} cards recorded` : `Missing card${d.missing.length === 1 ? "" : "s"} ${d.missing.join(", ")}`);
  if (d.missing.length === 0) parts.push(plural(d.copies, "complete copy").replace("copys", "copies"));
  const levels = [
    ["full", "with both sides in full"],
    ["movement", "with the movement side only"],
    ["combat", "with the combat side only"],
    ["identity", "with the identity only"],
  ] as const;
  const named = levels.filter(([k]) => d.levels[k] > 0).map(([k, w]) => `${String(d.levels[k])} ${w}`);
  return `${parts.join(". ")}. ${named.join(", ")}.`;
}

interface Target {
  kind: AcesKind;
  id: string;
  name: string;
}

function CardRow({ text, credit, name, to, onDelete }: { text: string; credit: string; name: string; to: string; onDelete: (opener: HTMLElement) => void }) {
  return (
    <li className="bt-row">
      <span className="bt-row__text">
        {text}
        <span className="bt-row__credit">{credit}</span>
      </span>
      <span className="bt-row__actions">
        <Link className="bt-button" aria-label={`Open ${name}`} to={to}>
          Open
        </Link>
        <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { onDelete(event.currentTarget); }}>
          Delete
        </button>
      </span>
    </li>
  );
}

export default function CardLibraryPage() {
  const [storage, setStorage] = useState<AcesStorage>();
  const [entries, setEntries] = useState<AcesEntry[]>([]);
  const [confirming, setConfirming] = useState<Target>();
  const [conflicts, setConflicts] = useState<AcesRecord[]>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [declined, setDeclined] = useState(true);
  const keepRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };
  const fail = (text: string) => {
    setStatus("");
    setProblem(text);
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openAcesStorage();
        setStorage(s);
        setEntries(await s.list());
        setDeclined(await s.samplesDeclined());
      } catch {
        fail(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  useEffect(() => {
    if (conflicts) replaceRef.current?.focus();
  }, [conflicts]);
  useEffect(() => {
    if (!focusList.current) return;
    focusList.current = false;
    (entries.length === 0 ? emptyRef.current : headingRef.current)?.focus();
  }, [entries]);

  const reload = async (s: AcesStorage): Promise<boolean> => {
    try {
      setEntries(await s.list());
      return true;
    } catch {
      fail(STORAGE_READ_FAILED);
      return false;
    }
  };

  const records = entries.flatMap((e) => (e.record ? [e.record] : []));
  const cards = records.filter((r): r is AcesCard => r.kind === "aces-card");
  const commands = records.filter((r): r is CommandCard => r.kind === "aces-command");
  const orders = records.filter((r): r is SpecialOrderCard => r.kind === "aces-order");
  const supports = records.filter((r): r is SupportCard => r.kind === "aces-support");
  const commandDecks = commandCompleteness(commands);
  const commandKey = (c: CommandCard): string => (c.faction.trim() === "" ? c.commander.trim() : `${c.commander.trim()} (${c.faction.trim()})`);
  const ordersHave = ACES_SPECIAL_ORDERS.filter((o) => orders.some((r) => r.order === o.id));
  const ordersMissing = ACES_SPECIAL_ORDERS.filter((o) => !orders.some((r) => r.order === o.id));
  const decks = completeness(withoutShadowedSamples(cards));
  const hasSamples = records.some(isSample);
  const offerSamples = storage !== undefined && entries.length === 0 && !declined;
  const broken = entries.filter((e) => !e.record);

  const remove = async (target: Target) => {
    if (!storage) return;
    setConfirming(undefined);
    try {
      await storage.remove(target.kind, target.id);
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    focusList.current = true;
    if (await reload(storage)) say("Deleted.");
  };

  const exportRaw = async (e: AcesEntry) => {
    if (!storage) return;
    try {
      downloadJson(`${e.id.replace(/[^A-Za-z0-9-]+/g, "-") || "card"}.raw.json`, (await storage.raw(e.kind, e.id)) ?? null);
      say("Export started.");
    } catch {
      fail("We could not read that card to export it.");
    }
  };

  const addSamples = async () => {
    if (!storage) return;
    try {
      await storage.addSamples();
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    if (await reload(storage)) say("Added the sample cards. They are marked Sample, and you can remove them at any time.");
  };

  const declineSamples = async () => {
    if (!storage) return;
    try {
      await storage.declineSamples();
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    setDeclined(true);
    say("We will not offer the sample cards again.");
  };

  const removeSamples = async () => {
    if (!storage) return;
    try {
      await storage.removeSamples();
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    setDeclined(true);
    focusList.current = true;
    if (await reload(storage)) say("Removed the sample cards.");
  };

  const duplicate = async (card: AcesCard) => {
    if (!storage) return;
    const sameSlot = cards.filter((c) => deckKey(c) === deckKey(card) && c.position === card.position).length;
    const label = `Copy ${String(sameSlot + 1)}`;
    try {
      const own = structuredClone(card);
      delete own.sample;
      await storage.save({ ...own, id: crypto.randomUUID(), copy: label, source: { kind: "entered", at: new Date().toISOString() } });
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    if (await reload(storage)) say(`Made another copy, labelled ${label}.`);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) {
      message = "That file is too large to be a card library.";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = "That file is not a card library.";
      }
      if (!message) {
        const result = fromLibraryFile(parsed);
        if (!result.ok) {
          message = result.message;
        } else {
          const plan = planLibraryImport(result.library, libraryOf(records));
          try {
            for (const r of plan.add) await storage.save(r);
            if (await reload(storage)) {
              const left = result.photos.length > 0 ? " Pictures in the file were not kept." : "";
              say(`Added ${plural(plan.add.length, "card")}.${left}`);
              if (plan.conflicts.length > 0) setConflicts(plan.conflicts);
            }
          } catch {
            message = STORAGE_WRITE_FAILED;
          }
        }
      }
    }
    if (message) fail(message);
    input.value = "";
  };

  const replaceConflicts = async () => {
    if (!storage || !conflicts) return;
    const list = conflicts;
    setConflicts(undefined);
    try {
      for (const r of list) await storage.save(r);
    } catch {
      fail(STORAGE_WRITE_FAILED);
      return;
    }
    if (await reload(storage)) say(`Replaced ${plural(list.length, "card")} with the file's version.`);
  };

  const askDelete = (target: Target, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };
  const cancel = () => {
    setConfirming(undefined);
    openerRef.current?.focus();
  };

  return (
    <div className="sr-page">
      <Link className="bt-back" to={ACES_HOME}>
        <span aria-hidden="true">&larr; </span>Aces
      </Link>
      <h1>Your Aces cards</h1>
      <p>You record your own cards here, in our words. They stay on this device.</p>
      {storage && !storage.persistent && <p className="bt-warning">This browser is not letting us save. Your cards last until you close this tab.</p>}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      {offerSamples && (
        <section className="bt-section" aria-labelledby="aces-samples">
          <h2 id="aces-samples">Try our sample cards</h2>
          <p>
            You have no cards yet. We can add a small set of our own invention, two behaviour decks, a command deck, the five special orders and two support cards, so you can try a sortie and a game straight away. They are marked Sample, stay out of your library file, and you can remove them at any time.
          </p>
          <p>
            <button type="button" className="bt-button" onClick={() => void addSamples()}>
              Add the sample cards
            </button>{" "}
            <button type="button" className="bt-button bt-button--secondary" onClick={() => void declineSamples()}>
              No thanks
            </button>
          </p>
        </section>
      )}
      {hasSamples && (
        <section className="bt-section" aria-labelledby="aces-samples-have">
          <h2 id="aces-samples-have">Sample cards</h2>
          <p>Cards marked Sample are ours, not yours. A deck, commander or order you record yourself is used in their place, and they are left out of your library file.</p>
          <p>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => void removeSamples()}>
              Remove the sample cards
            </button>
          </p>
        </section>
      )}

      <section className="bt-section" aria-labelledby="aces-decks">
        <h2 id="aces-decks" ref={headingRef} tabIndex={-1}>
          Behaviour decks
        </h2>
        {storage && cards.length === 0 ? (
          <p ref={emptyRef} tabIndex={-1}>
            No behaviour cards recorded yet.
          </p>
        ) : (
          <ul className="bt-list">
            {decks.map((d) => (
              <li key={d.key} className="bt-row aces-deck">
                <h3 className="aces-deck__name">{d.key}</h3>
                <p className="aces-deck__words">{`${cards.filter((c) => deckKey(c) === d.key).every(isSample) ? "Sample deck. " : ""}${deckWords(d)}`}</p>
                <ul className="bt-list aces-deck__cards">
                  {cards
                    .filter((c) => deckKey(c) === d.key)
                    .sort((a, b) => a.position - b.position)
                    .map((c) => {
                      const name = `${d.key} card ${String(c.position)}${c.copy ? `, ${c.copy}` : ""}`;
                      return (
                        <li key={c.id} className="bt-row">
                          <span className="bt-row__text">
                            {`Card ${String(c.position)} of ${String(c.of)}${c.copy ? `, ${c.copy}` : ""}`}
                            <span className="bt-row__credit">{`${isSample(c) ? "Sample. " : ""}${{ full: "Both sides in full", movement: "Movement side", combat: "Combat side", identity: "Identity only" }[cardLevel(c)]}`}</span>
                          </span>
                          <span className="bt-row__actions">
                            <Link className="bt-button" aria-label={`Open ${name}`} to={cardHref(c.id)}>
                              Open
                            </Link>
                            <button type="button" className="bt-button bt-button--secondary" aria-label={`Duplicate ${name} as another copy`} onClick={() => void duplicate(c)}>
                              Duplicate
                            </button>
                            <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { askDelete({ kind: "aces-card", id: c.id, name }, event.currentTarget); }}>
                              Delete
                            </button>
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {broken.length > 0 && (
          <ul className="bt-list">
            {broken.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="bt-row">
                <span className="bt-row__text">{`This saved ${KIND_WORDS[e.kind]} cannot be read. ${e.unreadable ?? ""}`}</span>
                <span className="bt-row__actions">
                  <button type="button" className="bt-button bt-button--secondary" onClick={() => void exportRaw(e)}>
                    Export raw
                  </button>
                  <button type="button" className="bt-button bt-button--secondary" onClick={(event) => { askDelete({ kind: e.kind, id: e.id, name: "this card" }, event.currentTarget); }}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {confirming && (
          <div
            className="bt-confirm"
            role="group"
            aria-label="Confirm delete"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          >
            <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
            <span className="bt-row__actions">
              <button type="button" className="bt-button" onClick={() => void remove(confirming)}>
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
                Keep
              </button>
            </span>
          </div>
        )}
        {conflicts && (
          <div className="bt-confirm" role="group" aria-label="Replace changed cards">
            <p>{`${plural(conflicts.length, "card")} in the file differ from the ones you have saved under the same name. Replace yours with the file's?`}</p>
            <span className="bt-row__actions">
              <button type="button" ref={replaceRef} className="bt-button" onClick={() => void replaceConflicts()}>
                Replace
              </button>
              <button type="button" className="bt-button bt-button--secondary" onClick={() => { setConflicts(undefined); say("Kept your saved cards."); }}>
                Keep mine
              </button>
            </span>
          </div>
        )}
      </section>

      <section className="bt-section" aria-labelledby="aces-commands">
        <h2 id="aces-commands">Command decks</h2>
        {storage && commands.length === 0 ? (
          <p>No command cards recorded yet.</p>
        ) : (
          <ul className="bt-list">
            {commandDecks.map((d) => (
              <li key={d.key} className="bt-row aces-deck">
                <h3 className="aces-deck__name">{d.key}</h3>
                <p className="aces-deck__words">{d.missing.length === 0 ? "All five cards, A to E, recorded." : `Recorded ${d.have.join(", ")}. Missing ${d.missing.join(", ")}.`}</p>
                <ul className="bt-list aces-deck__cards">
                  {commands
                    .filter((c) => commandKey(c) === d.key)
                    .sort((a, b) => a.letter.localeCompare(b.letter))
                    .map((c) => {
                      const name = `${d.key} card ${c.letter}`;
                      return <CardRow key={c.id} text={`Card ${c.letter}, ${String(c.position)} of ${String(c.of)}`} credit={`${isSample(c) ? "Sample. " : ""}${c.orders.length + c.strategy.length === 0 ? "Identity only" : "Recorded"}`} name={name} to={commandHref(c.id)} onDelete={(el) => { askDelete({ kind: "aces-command", id: c.id, name }, el); }} />;
                    })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bt-section" aria-labelledby="aces-orders">
        <h2 id="aces-orders">Special orders</h2>
        {orders.length === 0 ? (
          <p>No special order cards recorded yet.</p>
        ) : (
          <>
            <p>{`${String(ordersHave.length)} of 5 recorded${ordersMissing.length > 0 ? `. Missing ${ordersMissing.map((o) => o.label).join(", ")}` : ""}.`}</p>
            <ul className="bt-list">
              {orders.map((c) => {
                const name = `${ACES_SPECIAL_ORDERS.find((o) => o.id === c.order)?.label ?? c.order} special order`;
                return <CardRow key={c.id} text={name} credit={`${isSample(c) ? "Sample. " : ""}${c.column || c.preFilters?.length || c.spotter?.length ? "Recorded" : "Order only"}`} name={name} to={orderHref(c.id)} onDelete={(el) => { askDelete({ kind: "aces-order", id: c.id, name }, el); }} />;
              })}
            </ul>
          </>
        )}
      </section>

      <section className="bt-section" aria-labelledby="aces-supports">
        <h2 id="aces-supports">Support cards</h2>
        {supports.length === 0 ? (
          <p>No support cards recorded yet.</p>
        ) : (
          <ul className="bt-list">
            {[...supports]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <CardRow key={c.id} text={c.name} credit={`${isSample(c) ? "Sample. " : ""}Cost ${String(c.cost)}, target number ${String(c.tn)}, damage ${String(c.damage)}${c.area ? ", area" : ""}`} name={`${c.name} support card`} to={supportHref(c.id)} onDelete={(el) => { askDelete({ kind: "aces-support", id: c.id, name: `${c.name} support card` }, el); }} />
              ))}
          </ul>
        )}
      </section>

      <section className="bt-section" aria-labelledby="aces-add">
        <h2 id="aces-add">Add a card</h2>
        <p>
          <Link className="bt-button" to={ACES_CARD}>
            Add a behaviour card
          </Link>{" "}
          <Link className="bt-button" to={ACES_COMMAND}>
            Add a command card
          </Link>{" "}
          <Link className="bt-button" to={ACES_ORDER}>
            Add a special order card
          </Link>{" "}
          <Link className="bt-button" to={ACES_SUPPORT}>
            Add a support card
          </Link>
        </p>
      </section>

      <section className="bt-section" aria-labelledby="aces-file">
        <h2 id="aces-file">Your library file</h2>
        <p className="bt-hint">The file holds your cards and your private notes, nothing else. Keep it as your own backup.</p>
        <p>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadLibrary(libraryOf(records)); say("Export started."); }}>
            Export library
          </button>
        </p>
        <div className="bt-field">
          <label htmlFor="aces-file-in">Import a library file</label>
          <input id="aces-file-in" type="file" accept="application/json,.json" disabled={!storage} onChange={(event) => void upload(event)} />
        </div>
      </section>
    </div>
  );
}
