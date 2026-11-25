import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { AS_MORDEL_TYPES, fromMordelAs } from "../../rules/as-mordel";
import { parseMordelRef } from "../../rules/mordel";
import { createMordelClient } from "../mordel-client";
import type { MordelClient } from "../mordel-client";
import { STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, openFamilyStorage } from "../storage";
import type { FamilyStorage } from "../storage";

export interface AsMordelImportProps {
  /** How a client is made from a key. Tests pass their own; the page uses the real one. */
  makeClient?: (key: string, onWait?: () => void) => MordelClient;
}

const defaultMakeClient = (key: string, onWait?: () => void) => createMordelClient({ key, onWait });

/** "From Mordel" on the Alpha Strike home: asks for the key the Classic import also uses, fetches one unit and opens it for review. Nothing is saved here. */
export default function AsMordelImport({ makeClient = defaultMakeClient }: AsMordelImportProps) {
  const navigate = useNavigate();
  const [storage, setStorage] = useState<FamilyStorage>();
  const [storedKey, setStoredKey] = useState<string>();
  const [typedKey, setTypedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const s = await openFamilyStorage();
        setStorage(s);
        setStoredKey(await s.getKey());
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  const saveKey = async () => {
    setStatus("");
    setProblem("");
    const key = typedKey.trim();
    if (!key || !storage) {
      setProblem("Type your key first.");
      return;
    }
    try {
      await storage.setKey(key);
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setStoredKey(key);
    setTypedKey("");
    setShowKey(false);
  };

  const removeKey = async () => {
    setStatus("");
    setProblem("");
    try {
      await storage?.clearKey();
    } catch {
      setProblem(STORAGE_WRITE_FAILED);
      return;
    }
    setStoredKey(undefined);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setProblem("");
    const ref = parseMordelRef(reference);
    if (!ref) {
      setProblem("Enter a unit number such as 474, or a mordel.net address.");
      return;
    }
    if (!AS_MORDEL_TYPES.includes(ref.unitType)) {
      setProblem("mordel.net has Alpha Strike values only for BattleMechs, IndustrialMechs, ProtoMechs and combat vehicles.");
      return;
    }
    if (!storedKey) return;
    setBusy(true);
    try {
      const fetched = await makeClient(storedKey, () => { setStatus("Waiting for mordel.net…"); }).unit(ref.unitType, ref.id);
      if (!fetched.ok) {
        setStatus("");
        setProblem(fetched.message);
        return;
      }
      const result = fromMordelAs(fetched.value, new Date().toISOString(), () => crypto.randomUUID(), ref.unitType);
      if (!result.ok) {
        setStatus("");
        setProblem(result.message);
        return;
      }
      void navigate("/battletech/alpha-strike/unit", { state: { draft: result.unit } });
    } catch {
      setStatus("");
      setProblem("We could not import that unit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bt-section" aria-labelledby="as-mordel">
      <h2 id="as-mordel">From Mordel</h2>
      <p>
        We read the Alpha Strike values mordel.net holds for a design, using the API built by MordelBlacknight. Each unit credits its designer.
      </p>
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {storedKey ? (
        <>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <div className="bt-field">
              <label htmlFor="as-mordel-ref">Unit number or address</label>
              <input id="as-mordel-ref" type="text" autoComplete="off" spellCheck={false} value={reference} onChange={(event) => { setReference(event.target.value); }} />
              <button type="submit" className="bt-button" disabled={busy}>
                Import from Mordel
              </button>
            </div>
          </form>
          <p>
            <button type="button" className="bt-button bt-button--secondary" onClick={() => void removeKey()}>
              Remove key
            </button>
          </p>
        </>
      ) : (
        <div className="bt-field">
          <label htmlFor="as-mordel-key">Mordel key</label>
          <input id="as-mordel-key" type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} value={typedKey} onChange={(event) => { setTypedKey(event.target.value); }} />
          <button type="button" className="bt-button bt-button--secondary" aria-pressed={showKey} onClick={() => { setShowKey(!showKey); }}>
            {showKey ? "Hide key" : "Show key"}
          </button>
          <button type="button" className="bt-button" disabled={!storage} onClick={() => void saveKey()}>
            Save key
          </button>
        </div>
      )}
      <p className="bt-hint">Your key is kept on this device, shared with the Classic import, and sent only to mordel.net. The values are Mordel's own, shown for you to check before you save.</p>
    </section>
  );
}
