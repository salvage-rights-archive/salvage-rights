import { useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { fromMulPage } from "../../rules/as-mul";

const MAX_PAGE_BYTES = 1024 * 1024 * 40;

/** "From a Master Unit List page" on the Alpha Strike home: reads a page the player saved, on this device, and opens the unit for review. Nothing is saved here. */
export default function AsMulImport() {
  const navigate = useNavigate();
  const [problem, setProblem] = useState("");

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setProblem("");
    if (chosen.size > MAX_PAGE_BYTES) {
      setProblem("That file is too large to be a saved page.");
    } else {
      let bytes: Uint8Array | undefined;
      try {
        bytes = new Uint8Array(await chosen.arrayBuffer());
      } catch {
        setProblem("We could not read that file.");
      }
      if (bytes) {
        const result = fromMulPage(bytes, new Date().toISOString(), () => crypto.randomUUID());
        if (result.ok) void navigate("/battletech/alpha-strike/unit", { state: { draft: result.unit } });
        else setProblem(result.message);
      }
    }
    input.value = "";
  };

  return (
    <section className="bt-section" aria-labelledby="as-mul">
      <h2 id="as-mul">From a Master Unit List page</h2>
      <p>Open a unit on the Master Unit List, save the page from your browser (as a single web archive, or as a complete web page), and pick that file here. We read the page on this device and send nothing anywhere.</p>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      <div className="bt-field">
        <label htmlFor="as-mul-file">Saved Master Unit List page</label>
        <input id="as-mul-file" type="file" accept=".mht,.mhtml,.html,.htm,multipart/related,text/html" onChange={(event) => void pick(event)} />
      </div>
      <p className="bt-hint">The unit opens for you to check before you save it. We take its numbers only, and mark it OFFICIAL because the Master Unit List publishes it.</p>
    </section>
  );
}
