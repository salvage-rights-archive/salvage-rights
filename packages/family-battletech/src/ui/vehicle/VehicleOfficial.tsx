// OFFICIAL / NOT OFFICIAL for a vehicle: the badge and the panel that states the mark or takes it off (see ../editor/Marks.tsx), on this
// unit type's own rule. Every unit reads NOT OFFICIAL until it is marked, as a Classic design does.
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import { vehicleOfficialState, markVehicleOfficial } from "../../rules/vehicle/checks";
import { OfficialMark, OfficialMarkPanel } from "../editor/Marks";
import type { VehicleOnEdit } from "./edit";

export function VehicleOfficialBadge({ record }: { record: VehicleRecord }) {
  return <OfficialMark state={vehicleOfficialState(record)} />;
}

export default function VehicleOfficialPanel({ record, onEdit }: { record: VehicleRecord; onEdit: VehicleOnEdit }) {
  return (
    <OfficialMarkPanel
      wide
      state={vehicleOfficialState(record)}
      stated={record.official}
      onMark={(book, page) => {
        onEdit((draft) => {
          markVehicleOfficial(draft, book, page);
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
