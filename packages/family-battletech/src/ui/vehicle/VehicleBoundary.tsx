// The vehicle pages' way out when a saved record cannot be shown (see ../UnitBoundary.tsx).
import type { ReactNode } from "react";
import UnitBoundary from "../UnitBoundary";
import { VEHICLE_HOME } from "./routes";
import { openVehicleStorage } from "./storage";

export default function VehicleBoundary({ id, children }: { id: string; children: ReactNode }) {
  return (
    <UnitBoundary id={id} unit="vehicle" home={VEHICLE_HOME} raw={async (key) => (await openVehicleStorage()).raw(key)}>
      {children}
    </UnitBoundary>
  );
}
