// The two marks on screen: the OFFICIAL / NOT OFFICIAL badge (editor header, home list), the controls that state it, and the
// Verified Standard Rules Compliant panel. Every mark is words, never colour alone.
import { useId, useState } from "react";
import { BOOKS } from "../../data/editions";
import type { MechRecord } from "../../rules/mech";
import { markOfficial, officialLabel, officialState, unmarkOfficial } from "../../rules/official";
import type { Compliance, OfficialState } from "../../rules/official";
import type { Finding } from "../../rules/checks";
import type { OnEdit } from "../EditorPage";

/** Today as year-month-day on this device, the date a verification names. */
export function today(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function OfficialBadge({ record }: { record: MechRecord }) {
  const state = officialState(record);
  const { badge, detail } = officialLabel(state);
  return (
    <span className="bt-official" data-official={state.official}>
      <strong className="bt-official__badge">{badge}</strong>
      {detail && (
        <>
          {" "}
          <span className="bt-official__detail">{detail}</span>
        </>
      )}
    </span>
  );
}

/** States the mark: the book (from the books we know, or the player's own words) and the page, or takes it off. */
export function OfficialPanel({ record, onEdit }: { record: MechRecord; onEdit: OnEdit }) {
  const state: OfficialState = officialState(record);
  const [book, setBook] = useState(record.official?.book ?? "");
  const [page, setPage] = useState(record.official?.page === undefined ? "" : String(record.official.page));
  const id = useId();
  const pageNumber = page.trim() === "" ? undefined : Number(page);
  const pageBad = pageNumber !== undefined && !(Number.isInteger(pageNumber) && pageNumber > 0);
  return (
    <section className="bt-panel" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Official or not</h2>
      <p>
        <OfficialBadge record={record} />
      </p>
      <p className="bt-hint">
        OFFICIAL means the game's publisher put this design out in a book. You state it; we never claim it for you. Changing the design (not the name, the notes or the picture) turns it
        NOT OFFICIAL, and Undo gets it back.
      </p>
      {state.official ? (
        <button
          type="button"
          className="bt-button bt-button--secondary"
          onClick={() => {
            onEdit((d) => {
              unmarkOfficial(d);
            });
          }}
        >
          Mark NOT OFFICIAL
        </button>
      ) : (
        <div className="bt-grid">
          <div className="bt-field">
            <label htmlFor={`${id}-book`}>Book</label>
            <input
              id={`${id}-book`}
              type="text"
              list={`${id}-books`}
              value={book}
              onChange={(event) => {
                setBook(event.target.value);
              }}
            />
            <datalist id={`${id}-books`}>
              {Object.keys(BOOKS).map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
          </div>
          <div className="bt-field">
            <label htmlFor={`${id}-page`}>Page (optional)</label>
            <input
              id={`${id}-page`}
              type="text"
              inputMode="numeric"
              value={page}
              aria-invalid={pageBad || undefined}
              onChange={(event) => {
                setPage(event.target.value);
              }}
            />
            {pageBad && <span className="bt-hint">Enter a page number.</span>}
          </div>
          <button
            type="button"
            className="bt-button"
            disabled={book.trim() === "" || pageBad}
            onClick={() => {
              onEdit((d) => {
                markOfficial(d, book, pageNumber);
              });
            }}
          >
            Mark OFFICIAL
          </button>
        </div>
      )}
    </section>
  );
}

/** Beside the rules check: verified, with what the check covered, or not verified, with each reason pointing at its finding or field. */
export function CompliancePanel({
  compliance,
  targetOf,
  onChoose,
}: {
  compliance: Compliance;
  targetOf: (where: Finding["where"]) => string | undefined;
  onChoose: (id: string) => void;
}) {
  return (
    <section className="bt-panel bt-compliance" aria-labelledby="bt-compliance-heading" data-verified={compliance.verified}>
      <h2 id="bt-compliance-heading">Tournament check</h2>
      {compliance.verified ? (
        <>
          <p className="bt-compliance__verdict">
            <strong>Verified Standard Rules Compliant</strong>
          </p>
          <p className="bt-hint">{`${compliance.edition}. Salvage Rights rules check, version ${compliance.version}, ${today()}.`}</p>
        </>
      ) : (
        <>
          <p className="bt-compliance__verdict">
            <strong>Not verified</strong>
          </p>
          <ul className="bt-list">
            {compliance.reasons.map((reason, index) => {
              const target = targetOf(reason.where);
              return (
                <li key={index} className="bt-finding">
                  {target ? (
                    <button
                      type="button"
                      className="bt-finding__text"
                      onClick={() => {
                        onChoose(target);
                      }}
                    >
                      {reason.text}
                    </button>
                  ) : (
                    <span className="bt-finding__text">{reason.text}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
