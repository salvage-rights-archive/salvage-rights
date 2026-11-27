// OFFICIAL / NOT OFFICIAL for an aerospace unit: the badge and the panel that states the mark or takes it off (see ../editor/Marks.tsx), on this
// unit type's own rule. Every unit reads NOT OFFICIAL until it is marked, as a Classic design does.
import { AERO_EDITIONS } from "../../data/aero";
import { BOOKS } from "../../data/editions";
import type { AeroRecord } from "../../rules/aero";
import { aeroOfficialState, markAeroOfficial } from "../../rules/aero-checks";
import { OfficialMark, OfficialMarkPanel } from "../editor/Marks";
import type { AeroOnEdit } from "./edit";

/** The books a mark may name: those the app knows, and the ones each AeroTech edition is built from. The player may also type their own. */
const BOOK_TITLES = [...new Set([...Object.keys(BOOKS), ...AERO_EDITIONS.flatMap((edition) => edition.books.map((book) => book.title))])];

export function AeroOfficialBadge({ record }: { record: AeroRecord }) {
  return <OfficialMark state={aeroOfficialState(record)} />;
}

export default function AeroOfficialPanel({ record, onEdit }: { record: AeroRecord; onEdit: AeroOnEdit }) {
  return (
    <OfficialMarkPanel
      wide
      state={aeroOfficialState(record)}
      stated={record.official}
      books={BOOK_TITLES}
      onMark={(book, page) => {
        onEdit((draft) => {
          markAeroOfficial(draft, book, page);
        });
      }}
      onUnmark={() => {
        onEdit((draft) => {
          delete draft.official;
        });
      }}
    />
  );
}
