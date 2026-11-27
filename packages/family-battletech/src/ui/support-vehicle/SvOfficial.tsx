// OFFICIAL / NOT OFFICIAL for a Support Vehicle: the badge, and the panel that states the mark (the book, and the page if the player has it) or takes
// it off. The player states it; we never claim it. Any change to the design (not the name, the notes or the picture) turns it NOT OFFICIAL, and Undo
// gets it back. Every unit reads NOT OFFICIAL until it is marked, as a Classic design does.
import { useId, useState } from "react";
import { BOOKS } from "../../data/editions";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { svOfficialState, markSvOfficial } from "../../rules/support-vehicle/checks";
import { officialLabel } from "../../rules/official";
import type { SvOnEdit } from "./edit";

/** The books a mark may name: those the app knows. The player may also type their own. */
const BOOK_TITLES = Object.keys(BOOKS);

export function SvOfficialBadge({ record }: { record: SupportVehicleRecord }) {
  const state = svOfficialState(record);
  const { badge, detail } = officialLabel(state);
  return (
    <span className="bt-official" data-official={state.official}>
      <strong className="bt-official__badge">{badge}</strong>
      {detail && <span className="bt-official__detail">{` ${detail}`}</span>}
    </span>
  );
}

export default function SvOfficialPanel({ record, onEdit }: { record: SupportVehicleRecord; onEdit: SvOnEdit }) {
  const state = svOfficialState(record);
  const [book, setBook] = useState(record.official?.book ?? "");
  const [page, setPage] = useState(record.official?.page === undefined ? "" : String(record.official.page));
  const id = useId();
  const pageNumber = page.trim() === "" ? undefined : Number(page);
  const pageBad = pageNumber !== undefined && !(Number.isInteger(pageNumber) && pageNumber > 0);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Official or not</h2>
      <p>
        <SvOfficialBadge record={record} />
      </p>
      <p className="bt-hint">
        OFFICIAL means the game's publisher put this design out in a book. You state it; we never claim it for you. Changing the design (not the name, the notes or the picture) turns it NOT OFFICIAL, and
        Undo gets it back.
      </p>
      {state.official ? (
        <button
          type="button"
          className="bt-button bt-button--secondary"
          onClick={() => {
            onEdit((draft) => {
              delete draft.official;
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
              {BOOK_TITLES.map((title) => (
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
              onEdit((draft) => {
                markSvOfficial(draft, book, pageNumber);
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
