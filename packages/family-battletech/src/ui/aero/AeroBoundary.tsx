// The aerospace pages' way out when a saved record cannot be shown (see ../UnitBoundary.tsx).
import type { ReactNode } from "react";
import UnitBoundary from "../UnitBoundary";
import { AERO_HOME } from "./routes";
import { openAeroStorage } from "./storage";

export default function AeroBoundary({ id, children }: { id: string; children: ReactNode }) {
  return (
    <UnitBoundary id={id} unit="unit" home={AERO_HOME} game="AeroTech" open={openAeroStorage}>
      {children}
    </UnitBoundary>
  );
}
