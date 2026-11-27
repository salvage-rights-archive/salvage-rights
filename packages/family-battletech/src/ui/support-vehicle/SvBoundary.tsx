// The Support Vehicle pages' way out when a saved record cannot be shown (see ../UnitBoundary.tsx).
import type { ReactNode } from "react";
import UnitBoundary from "../UnitBoundary";
import { SV_HOME } from "./routes";
import { openSvStorage } from "./storage";

export default function SvBoundary({ id, children }: { id: string; children: ReactNode }) {
  return (
    <UnitBoundary id={id} unit="Support Vehicle" home={SV_HOME} raw={async (key) => (await openSvStorage()).raw(key)}>
      {children}
    </UnitBoundary>
  );
}
