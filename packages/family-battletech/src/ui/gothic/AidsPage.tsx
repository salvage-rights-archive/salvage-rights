// The Gothic rules reference: the figures of the optional rules, the scenario conditions and the Abomination play tables, each with
// its pages. Figures and short headings only; every table is built from data/gothic.ts and the catalog (aidTables.ts).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { GOTHIC_BASE } from "../../data/rulesets";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { aidTables, citeText } from "./aidTables";
import { useGothicTheme } from "./theme";
import "../classic.scss";

export default function AidsPage() {
  useGothicTheme();
  const [catalog, setCatalog] = useState<Catalog>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    void loadCatalog().then(
      (loaded) => {
        if (live) setCatalog(loaded);
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="sr-page bt-aids">
      <h1>Gothic rules reference</h1>
      <p>
        <Link className="bt-back" to={`${GOTHIC_BASE}/home`}>
          Back to Gothic
        </Link>
      </p>
      {failed && (
        <p role="alert" className="bt-problem">
          The weapon list did not load, so the tables that name weapons are left short. Reload the page to try again.
        </p>
      )}
      {aidTables(catalog).map((table) => (
        <section key={table.id} className="bt-section" data-testid="aid-table" data-table={table.id}>
          <h2 id={`aid-${table.id}`}>{table.title}</h2>
          {table.purpose !== undefined && <p className="bt-hint">{table.purpose}</p>}
          {/* The wrapper scrolls on its own when a table is wider than a phone, so the page never does. */}
          <div className="bt-aids__scroll" tabIndex={0} role="region" aria-labelledby={`aid-${table.id}`}>
            <table aria-labelledby={`aid-${table.id}`}>
              <thead>
                <tr>
                  {table.head.map((heading) => (
                    <th key={heading} scope="col">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={`${String(i)}-${row[0] ?? ""}-${row[1] ?? ""}`}>
                    {row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bt-hint" data-testid="aid-cite">
            {citeText(table.cites)}
          </p>
        </section>
      ))}
    </div>
  );
}
