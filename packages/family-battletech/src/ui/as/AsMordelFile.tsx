import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { fileKind, fromAsConversion, wrongFileMessage } from "../../rules/mordel-files";

const MAX_BYTES = 1024 * 1024;

/**
 * "Import a Mordel Alpha Strike conversion" on the Alpha Strike home: reads the Alpha Strike Conversion text a member downloads from a
 * Mordel unit page, on this device, and opens the unit for review. No key is needed and nothing is saved here.
 */
export default function AsMordelFile() {
  const navigate = useNavigate();
  const [problem, setProblem] = useState("");
  const [offerClassic, setOfferClassic] = useState(false);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setProblem("");
    setOfferClassic(false);
    let message = "";
    if (chosen.size > MAX_BYTES) message = "That file is too large to be a Mordel conversion text.";
    else if (/\.pdf$/i.test(chosen.name)) message = wrongFileMessage("pdf", "as-conversion");
    else {
      try {
        const text = await chosen.text();
        const kind = fileKind(text, chosen.name);
        if (kind !== "as-conversion") {
          message = wrongFileMessage(kind, "as-conversion");
          setOfferClassic(kind === "mtf");
        } else {
          const result = fromAsConversion(text, new Date().toISOString(), () => crypto.randomUUID());
          if (result.ok) void navigate("/battletech/alpha-strike/unit", { state: { draft: result.unit } });
          else message = result.message;
        }
      } catch {
        message = "We could not read that file.";
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  return (
    <section className="bt-section" aria-labelledby="as-mordel-file">
      <h2 id="as-mordel-file">Import a Mordel Alpha Strike conversion</h2>
      <p>
        On a mordel.net unit page, download the unit's Alpha Strike Conversion text and pick it here. We read its final values on this device; no key is
        needed, and it works for vehicles too.
      </p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {offerClassic && (
        <p>
          <Link className="sr-action" to="/battletech/classic/home">
            Go to the Classic BattleTech home
          </Link>
        </p>
      )}
      <div className="bt-field">
        <label htmlFor="as-mordel-text">Alpha Strike Conversion file</label>
        <input
          id="as-mordel-text"
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => {
            void pick(event);
          }}
        />
      </div>
      <p className="bt-hint">The values are Mordel's own, shown for you to check before you save.</p>
    </section>
  );
}
