import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { conversionDraft } from "../../rules/as-convert";
import { convertClassicMech } from "../../rules/as-convert-all";
import type { FullConversion } from "../../rules/as-convert-all";
import { formatSpecials } from "../../rules/as-unit";
import { loadCatalog } from "../../rules/catalog";
import type { MechRecord } from "../../rules/mech";
import { configurationTitle, resolveAll } from "../../rules/omni";
import { STORAGE_READ_FAILED, openFamilyStorage } from "../storage";

interface Choice {
  id: string;
  name: string;
  record: MechRecord;
}

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim() || "Unnamed 'Mech";

/**
 * "Convert a Classic 'Mech" on the Alpha Strike home: the player's own saved Classic designs and each configuration of a saved OmniMech chassis,
 * worked through the conversion steps (type, size, movement, armor, structure, damage, Overheat Value, special abilities, role, Point Value).
 * The result opens on the unit page for the player to check and save; nothing is saved here, and it is NOT OFFICIAL. What the book gives no
 * figure for is listed, never guessed.
 */
export default function AsConvert() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState<Choice[]>();
  const [problem, setProblem] = useState("");
  const [picked, setPicked] = useState("");
  const [result, setResult] = useState<{ choice: Choice; conversion: FullConversion }>();

  useEffect(() => {
    void (async () => {
      try {
        const entries = await (await openFamilyStorage()).list();
        const plain = entries.flatMap((e) => (e.game === "classic" && e.kind === "mech" && e.record ? [{ id: e.id, name: nameOf(e.record), record: e.record }] : []));
        // Each configuration of a saved OmniMech chassis converts directly, with no need to save it as a plain 'Mech first. The base chassis
        // (no pods) is not a unit, so it is not offered.
        const omni = entries.flatMap((e) => {
          const chassis = e.game === "classic" && e.kind === "omni" ? e.chassis : undefined;
          if (!chassis) return [];
          return resolveAll(chassis).flatMap((record) => {
            const configuration = chassis.configurations.find((c) => record.id === `${chassis.id}:${c.id}`);
            const title = configuration ? configurationTitle(configuration) : record.name.model;
            return [{ id: record.id, name: `${chassis.name.chassis} ${title} (OmniMech configuration)`.trim(), record }];
          });
        });
        setChoices([...plain, ...omni]);
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
      setResult({ choice, conversion: convertClassicMech(choice.record, catalog) });
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
  const card = result?.conversion.unit.card;
  const point = result?.conversion.point?.value ?? null;
  return (
    <section className="bt-section" aria-labelledby="as-convert">
      <h2 id="as-convert">Convert a Classic 'Mech</h2>
      <p>
        Pick one of your own Classic designs, or one configuration of an OmniMech. We work out its type, size, movement, armor, structure, damage, Overheat Value, abilities, role and Point Value from the Alpha Strike
        Companion's steps, and open the card for you to check. A converted card is NOT OFFICIAL: only the Master Unit List makes a card official.
      </p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {choices && choices.length === 0 ? (
        <p>You have no saved Classic 'Mechs to convert yet.</p>
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
          {point !== null && <p>{`Point Value ${String(point)}, role ${card?.role ?? "none (a support unit)"}${card?.specials?.length ? `, abilities ${formatSpecials(card.specials)}` : ""}.`}</p>}
          {findings.length > 0 && (
            <ul>
              {findings.map((f) => (
                <li key={`${f.code}|${f.part}`}>{`${f.part}: ${f.message}${f.cite ? ` (${f.cite.book}, p. ${String(f.cite.page)})` : ""}`}</li>
              ))}
            </ul>
          )}
          <p className="bt-hint">The role is the closest fit to the book's loose guide: change it on the card if you play the unit differently.</p>
          <button type="button" className="bt-button" onClick={open}>
            Open the card to review
          </button>
        </div>
      )}
    </section>
  );
}
