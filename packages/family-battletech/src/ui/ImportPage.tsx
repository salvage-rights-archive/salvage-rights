import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { editionName } from "../data/editions";
import { loadCatalog } from "../rules/catalog";
import { DEFAULT_LEVEL, levelRow } from "../rules/levels";
import { UNIT_TYPE_OF, fromMordel, importOmniSet, importOmniSingle, omniFacts, parseMordelRef } from "../rules/mordel";
import type { OmniImport } from "../rules/mordel";
import { megamekLink, parseMtfActuators } from "../rules/mtf";
import type { MtfActuators } from "../rules/mtf";
import { fromMordelProto } from "../rules/protomech/mordel";
import { editorHref } from "./protomech/routes";
import { openProtoStorage } from "./protomech/storage";
import type { MechRecord } from "../rules/mech";
import { createMordelClient } from "./mordel-client";
import type { MordelClient, MordelListRow } from "./mordel-client";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, openFamilyStorage } from "./storage";
import type { FamilyStorage } from "./storage";

export interface ImportPageProps {
  /** How a client is made from a key. Tests pass their own; the page uses the real one. */
  makeClient?: (key: string, onWait?: () => void) => MordelClient;
}

/** Most variants one import fetches: the API allows 120 requests a minute. */
const MAX_VARIANTS = 12;
const defaultMakeClient = (key: string, onWait?: () => void) => createMordelClient({ key, onWait });

export default function ImportPage({ makeClient = defaultMakeClient }: ImportPageProps) {
  const navigate = useNavigate();
  const [storage, setStorage] = useState<FamilyStorage>();
  const [storedKey, setStoredKey] = useState<string>();
  const [builtUnder, setBuiltUnder] = useState<string>();
  const [typedKey, setTypedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const waiting = () => {
    setStatus("Waiting for mordel.net…");
  };
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [designs, setDesigns] = useState<{ rows: MordelListRow[]; truncated: boolean }>();

  /** Runs a storage action; when it rejects, shows the fixed message and returns false. */
  const attempt = useCallback(async (message: string, action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch {
      setStatus("");
      setProblem(message);
      return false;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const s = await openFamilyStorage();
        setStorage(s);
        setStoredKey(await s.getKey());
        const edition = await s.getEdition();
        setBuiltUnder(editionName(edition));
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (!storedKey) return;
    let current = true;
    void makeClient(storedKey)
      .myUnits()
      .then((result) => {
        if (!current) return;
        if (result.ok) setDesigns(result.value);
        else setProblem(result.message);
      });
    return () => {
      current = false;
    };
  }, [storedKey, makeClient]);

  const testKey = async () => {
    const key = (storedKey ?? typedKey).trim();
    setStatus("");
    setProblem("");
    if (!key) {
      setProblem("Type your key first.");
      return;
    }
    setTesting(true);
    try {
      const result = await makeClient(key, waiting).testKey();
      if (result.ok) setStatus("That key works.");
      else setProblem(result.message);
    } finally {
      setTesting(false);
    }
  };

  const saveKey = async () => {
    setStatus("");
    setProblem("");
    const key = typedKey.trim();
    if (!key || !storage) {
      setProblem("Type your key first.");
      return;
    }
    const saved = await attempt(STORAGE_WRITE_FAILED, () => storage.setKey(key));
    if (!saved) return;
    setStoredKey(key);
    setTypedKey("");
    setShowKey(false);
  };

  const removeKey = async () => {
    if (!storage) return;
    setStatus("");
    setProblem("");
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.clearKey()))) return;
    setStoredKey(undefined);
    setDesigns(undefined);
  };

  const importUnit = useCallback(
    async (unitType: string, id: number) => {
      if (!storage || !storedKey) return;
      setProblem("");
      setStatus("");
      if (unitType !== "pm" && !Object.hasOwn(UNIT_TYPE_OF, unitType)) {
        setProblem("Only BattleMechs, IndustrialMechs and ProtoMechs can be imported so far.");
        return;
      }
      setBusy(true);
      try {
        setStatus("Loading the equipment table…");
        const catalog = await loadCatalog();
        setStatus("");
        const fetched = await makeClient(storedKey, waiting).unit(unitType, id);
        if (!fetched.ok) {
          setProblem(fetched.message);
          return;
        }
        const edition = await storage.getEdition();
        const now = new Date().toISOString();
        const newId = () => crypto.randomUUID();
        if (unitType === "pm") {
          // A ProtoMech is its own kind of record, kept in its own store and opened in the ProtoMech editor.
          const made = fromMordelProto(fetched.value, catalog, edition, now, newId);
          if (!made.ok) {
            setProblem(made.message);
            return;
          }
          const proto = made.record;
          const protoStorage = await openProtoStorage();
          if (!(await attempt(STORAGE_WRITE_FAILED, () => protoStorage.save(proto)))) return;
          void navigate(editorHref(proto.id), { state: { notes: [`Rules level set to ${levelRow(proto.rulesLevel ?? DEFAULT_LEVEL).label}, the lowest level that accepts everything this design uses.`, ...made.notes] } });
          return;
        }
        const facts = omniFacts(fetched.value);
        // One more request (of the 120 a minute) for the unit's .mtf file, which says which arm actuators it has. Optional: advice, not refusal.
        let mtf: MtfActuators | undefined;
        let mtfNote: string | undefined;
        if (!facts.omni) {
          const link = megamekLink(fetched.value);
          if (link) {
            setStatus("Loading the unit's .mtf file…");
            const file = await makeClient(storedKey, waiting).file(link);
            mtf = file.ok ? parseMtfActuators(file.value) : undefined;
            if (!mtf) mtfNote = "Mordel's .mtf file for this unit could not be read, so the arm actuators are worked out from the equipment instead.";
          } else mtfNote = "Mordel gave no .mtf file for this unit, so the arm actuators are worked out from the equipment instead.";
          setStatus("");
        } else mtfNote = "The .mtf file is not read for OmniMechs yet, so the arms come from Mordel's figures alone.";
        const result = fromMordel(fetched.value, catalog, edition, now, newId, unitType, mtf);
        if (!result.ok) {
          setProblem(result.message);
          return;
        }
        if (mtfNote) result.notes.push(mtfNote);
        if (facts.omni) {
          // An OmniMech: a [BASE] unit and its variants become one chassis. Any unit that cannot be had is left out with a note; with no
          // base at all the one unit comes in as a one-configuration chassis (the labelled fallback).
          const client = makeClient(storedKey, waiting);
          const convert = (value: unknown) => {
            const r = fromMordel(value, catalog, edition, now, newId, unitType);
            return r.ok ? r : undefined;
          };
          let made: OmniImport;
          const baseId = facts.isBase ? (facts.id ?? id) : facts.baseId;
          let baseValue: unknown = facts.isBase ? fetched.value : undefined;
          if (baseValue === undefined && baseId !== null) {
            setStatus("Loading the base chassis…");
            const got = await client.unit(unitType, baseId);
            if (got.ok) baseValue = got.value;
          }
          const base = baseValue === undefined ? undefined : convert(baseValue);
          if (!base) {
            made = importOmniSingle(result.record, catalog, newId, baseId === null ? "This variant names no base (its base may be another member's private unit)." : "The base chassis could not be loaded.", result.fixedIds);
          } else {
            const listed = omniFacts(baseValue).variantIds;
            const wanted = [...new Set([...(facts.isBase ? [] : [id]), ...listed])].slice(0, MAX_VARIANTS);
            const variants: MechRecord[] = [];
            const variantFixed: (string[] | undefined)[] = [];
            const missed: string[] = [];
            let at = 0;
            for (const variantId of wanted) {
              at += 1;
              let value: unknown;
              if (variantId === id && !facts.isBase) value = fetched.value;
              else {
                setStatus(`Loading configuration ${String(at)} of ${String(wanted.length)}…`);
                const got = await client.unit(unitType, variantId);
                if (got.ok) value = got.value;
              }
              const converted = value === undefined ? undefined : convert(value);
              if (converted) {
                variants.push(converted.record);
                variantFixed.push(converted.fixedIds);
              }
              else missed.push(String(variantId));
            }
            made = importOmniSet(base.record, variants, newId, variantFixed);
            if (missed.length > 0) made.notes.push(`These variants could not be loaded and were left out: ${missed.join(", ")}.`);
            if (listed.length + (facts.isBase ? 0 : 1) > MAX_VARIANTS) made.notes.push(`Only the first ${String(MAX_VARIANTS)} variants were imported.`);
            made.notes.push(...base.notes);
          }
          setStatus("");
          if (mtfNote) made.notes.push(mtfNote);
          const chassis = made.chassis;
          if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.saveOmni(chassis)))) return;
          void navigate(`/battletech/classic/editor?id=${encodeURIComponent(chassis.id)}`, { state: { notes: made.notes } });
          return;
        }
        const record = result.record;
        if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.save(record)))) return;
        void navigate(`/battletech/classic/editor?id=${encodeURIComponent(result.record.id)}`, {
          state: { notes: [`Rules level set to ${levelRow(record.rulesLevel ?? DEFAULT_LEVEL).label}, the lowest level that accepts everything this design uses.`, ...result.notes] },
        });
      } catch {
        setStatus("");
        setProblem("We could not import that 'Mech. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [storage, storedKey, makeClient, navigate, attempt],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const ref = parseMordelRef(reference);
    if (!ref) {
      setProblem("Enter a unit number such as 474, or a mordel.net address.");
      setStatus("");
      return;
    }
    void importUnit(ref.unitType, ref.id);
  };

  return (
    <div className="sr-page">
      <h1>Import from Mordel</h1>
      <p>
        Uses the mordel.net API built by MordelBlacknight.{" "}
        <a href="https://www.mordel.net/" target="_blank" rel="noreferrer">
          mordel.net
        </a>
      </p>
      {builtUnder && <p>Built under: {builtUnder}</p>}

      <section className="bt-section" aria-labelledby="bt-key">
        <h2 id="bt-key">Your key</h2>
        {storedKey ? (
          <>
            <p>A key is saved on this device.</p>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button bt-button--secondary"
                disabled={testing}
                onClick={() => {
                  void testKey();
                }}
              >
                Test key
              </button>
              <button
                type="button"
                className="bt-button bt-button--secondary"
                onClick={() => {
                  void removeKey();
                }}
              >
                Remove key
              </button>
            </span>
          </>
        ) : (
          <>
            <div className="bt-field">
              <label htmlFor="bt-key-field">Mordel key</label>
              <input
                id="bt-key-field"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={typedKey}
                onChange={(event) => {
                  setTypedKey(event.target.value);
                }}
              />
              <button
                type="button"
                className="bt-button bt-button--secondary"
                aria-pressed={showKey}
                onClick={() => {
                  setShowKey(!showKey);
                }}
              >
                {showKey ? "Hide key" : "Show key"}
              </button>
            </div>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button bt-button--secondary"
                disabled={testing}
                onClick={() => {
                  void testKey();
                }}
              >
                Test key
              </button>
              <button
                type="button"
                className="bt-button"
                disabled={!storage}
                onClick={() => {
                  void saveKey();
                }}
              >
                Save key
              </button>
            </span>
          </>
        )}
        <p className="bt-hint">Your key is kept on this device and is sent only to mordel.net.</p>
      </section>

      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>

      {storedKey && (
        <>
          <section className="bt-section" aria-labelledby="bt-unit">
            <h2 id="bt-unit">Import a 'Mech or ProtoMech</h2>
            <form onSubmit={submit}>
              <div className="bt-field">
                <label htmlFor="bt-ref">Unit number or address</label>
                <input
                  id="bt-ref"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={reference}
                  onChange={(event) => {
                    setReference(event.target.value);
                  }}
                />
                <button type="submit" className="bt-button" disabled={busy}>
                  Import
                </button>
              </div>
            </form>
          </section>

          <section className="bt-section" aria-labelledby="bt-designs">
            <h2 id="bt-designs">My designs</h2>
            {designs && designs.rows.length === 0 && <p>You have no designs on mordel.net yet.</p>}
            {designs && designs.rows.length > 0 && (
              <ul className="bt-list">
                {designs.rows.map((row) => (
                  <li key={`${row.unitType}-${row.id}`} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{row.name}</strong> {row.tons} tons, designed by {row.designer || "an unnamed designer"}
                    </span>
                    <button
                      type="button"
                      className="bt-button"
                      disabled={busy}
                      aria-label={`Import ${row.name}`}
                      onClick={() => {
                        void importUnit(row.unitType, row.id);
                      }}
                    >
                      Import
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {designs?.truncated && (
              <p className="bt-hint">This list is cut short. mordel.net has more of your designs than we can show here.</p>
            )}
          </section>
        </>
      )}
      <p>
        <Link className="sr-action" to="/battletech/classic/home">
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}
