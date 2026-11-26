// The player's own card library: decks with how complete they are, add, duplicate as another copy, export and import the library
// file, delete. A saved record the app cannot read is listed with Export raw and Delete, never dropped.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router";
import { cardLevel, completeness, deckKey } from "../../rules/aces-card";
import type { AcesCard, AcesKind, AcesRecord, DeckCompleteness } from "../../rules/aces-card";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadJson } from "../storage";
import { ACES_CARD, ACES_HOME, cardHref } from "./routes";
import { downloadLibrary, fromLibraryFile, libraryOf, openAcesStorage, planLibraryImport } from "./storage";
import type { AcesEntry, AcesStorage } from "./storage";
import "./styles";

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

export default function CardLibraryPage() {
  const [storage, setStorage] = useState<AcesStorage>();
  const [entries, setEntries] = useState<AcesEntry[]>([]);
  const [confirming, setConfirming] = useState<Target>();
  const [conflicts, setConflicts] = useState<AcesRecord[]>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
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
  const others = (["aces-command", "aces-order", "aces-support"] as const).map((k) => ({ kind: k, count: records.filter((r) => r.kind === k).length })).filter((o) => o.count > 0);
  const decks = completeness(cards);
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

  const duplicate = async (card: AcesCard) => {
    if (!storage) return;
    const sameSlot = cards.filter((c) => deckKey(c) === deckKey(card) && c.position === card.position).length;
    const label = `Copy ${String(sameSlot + 1)}`;
    try {
      await storage.save({ ...structuredClone(card), id: crypto.randomUUID(), copy: label, source: { kind: "entered", at: new Date().toISOString() } });
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
                <p className="aces-deck__words">{deckWords(d)}</p>
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
                            <span className="bt-row__credit">{{ full: "Both sides in full", movement: "Movement side", combat: "Combat side", identity: "Identity only" }[cardLevel(c)]}</span>
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
        {others.length > 0 && <p className="bt-hint">{`Also saved: ${others.map((o) => plural(o.count, KIND_WORDS[o.kind])).join(", ")}. They are in your library file; their pages come in a later step.`}</p>}
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

      <section className="bt-section" aria-labelledby="aces-add">
        <h2 id="aces-add">Add a card</h2>
        <p>
          <Link className="bt-button" to={ACES_CARD}>
            Add a behaviour card
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
          <input id="aces-file-in" type="file" accept="application/json,.json" onChange={(event) => void upload(event)} />
        </div>
      </section>
    </div>
  );
}
