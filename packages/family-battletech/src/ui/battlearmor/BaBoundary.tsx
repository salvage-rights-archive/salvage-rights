// The battle armor pages' way out when a saved record cannot be shown (see ../UnitBoundary.tsx).
import type { ReactNode } from "react";
import UnitBoundary from "../UnitBoundary";
import { BA_HOME } from "./routes";
import { openBaStorage } from "./storage";

export default function BaBoundary({ id, children }: { id: string; children: ReactNode }) {
  return (
    <UnitBoundary id={id} unit="unit" home={BA_HOME} open={openBaStorage}>
      {children}
    </UnitBoundary>
  );
}
