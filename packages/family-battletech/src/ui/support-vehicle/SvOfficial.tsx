// OFFICIAL / NOT OFFICIAL for a Support Vehicle: the badge and the panel that states the mark or takes it off (see ../editor/Marks.tsx), on this
// unit type's own rule. Every unit reads NOT OFFICIAL until it is marked, as a Classic design does.
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { svOfficialState, markSvOfficial } from "../../rules/support-vehicle/checks";
import { OfficialMark, OfficialMarkPanel } from "../editor/Marks";
import type { SvOnEdit } from "./edit";

export function SvOfficialBadge({ record }: { record: SupportVehicleRecord }) {
  return <OfficialMark state={svOfficialState(record)} />;
}

export default function SvOfficialPanel({ record, onEdit }: { record: SupportVehicleRecord; onEdit: SvOnEdit }) {
  return (
    <OfficialMarkPanel
      wide
      state={svOfficialState(record)}
      stated={record.official}
      onMark={(book, page) => {
        onEdit((draft) => {
          markSvOfficial(draft, book, page);
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
