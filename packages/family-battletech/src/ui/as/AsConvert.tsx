import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { conversionDraft, convertMech } from "../../rules/as-convert";
import type { MechConversion } from "../../rules/as-convert";
import { loadCatalog } from "../../rules/catalog";
import type { MechRecord } from "../../rules/mech";
import { STORAGE_READ_FAILED, openFamilyStorage } from "../storage";

interface Choice {
  id: string;
  name: string;
  record: MechRecord;
}

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed 'Mech";

/**
 * "Convert a Classic 'Mech" on the Alpha Strike home: the player's own saved Classic designs, worked through the conversion steps
 * (type, size, movement, armor, structure, damage, Overheat Value). The result opens on the unit page for the player to finish and save;
 * nothing is saved here. What the book gives no figure for is listed, never guessed.
 */
export default function AsConvert() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState<Choice[]>();
  const [omni, setOmni] = useState(0);
  const [problem, setProblem] = useState("");
  const [picked, setPicked] = useState("");
  const [result, setResult] = useState<{ choice: Choice; conversion: MechConversion }>();

  useEffect(() => {
    void (async () => {
      try {
        const entries = await (await openFamilyStorage()).list();
        const plain = entries.flatMap((e) => (e.game === "classic" && e.kind === "mech" && e.record ? [{ id: e.id, name: nameOf(e.record), record: e.record }] : []));
        setChoices(plain);
        setOmni(entries.filter((e) => e.game === "classic" && e.kind === "omni").length);
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  const convert = async () => {
    const choice = choices?.find((c) => c.id === picked);
    if (!choice) return;
    setProblem("");
    try {
      const catalog = await loadCatalog();
      setResult({ choice, conversion: convertMech(choice.record, catalog) });
    } catch {
      setProblem("We could not load the equipment table to convert that 'Mech.");
    }
  };

  const open = () => {
    if (!result) return;
    const draft = conversionDraft(result.choice.record, result.conversion, crypto.randomUUID(), new Date().toISOString());
    void navigate("/battletech/alpha-strike/unit", { state: { draft } });
  };

  const findings = result?.conversion.findings ?? [];
  return (
    <section className="bt-section" aria-labelledby="as-convert">
      <h2 id="as-convert">Convert a Classic 'Mech</h2>
      <p>Pick one of your own Classic designs. We work out its type, size, movement, armor, structure, damage and Overheat Value from the Alpha Strike Companion's steps, and open the card for you to check.</p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {choices && choices.length === 0 ? (
        <p>You have no saved Classic 'Mechs to convert yet.{omni > 0 ? ` Your ${String(omni)} OmniMech ${omni === 1 ? "chassis needs" : "chassis need"} a configuration saved as a 'Mech first.` : ""}</p>
      ) : (
        <div className="bt-field">
          <label htmlFor="as-convert-pick">Classic 'Mech</label>
          <select
            id="as-convert-pick"
            value={picked}
            disabled={!choices}
            onChange={(event) => {
              setPicked(event.target.value);
              setResult(undefined);
            }}
          >
            <option value="">Choose one</option>
            {choices?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" className="bt-button bt-button--secondary" disabled={!picked} onClick={() => void convert()}>
            Convert
          </button>
        </div>
      )}
      {result && (
        <div role="status">
          <p>
            {`${nameOf(result.choice.record)}: ${findings.length === 0 ? "every part we convert had a figure." : `${String(findings.length)} ${findings.length === 1 ? "part has" : "parts have"} no figure and ${findings.length === 1 ? "is" : "are"} left blank.`}`}
          </p>
          {findings.length > 0 && (
            <ul>
              {findings.map((f) => (
                <li key={`${f.code}|${f.part}`}>{`${f.part}: ${f.message}${f.cite ? ` (${f.cite.book}, p. ${String(f.cite.page)})` : ""}`}</li>
              ))}
            </ul>
          )}
          <p className="bt-hint">Point Value, role and abilities are not worked out yet: you enter them on the card.</p>
          <button type="button" className="bt-button" onClick={open}>
            Open the card to review
          </button>
        </div>
      )}
    </section>
  );
}
