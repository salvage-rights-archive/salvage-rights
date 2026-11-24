// The editions the tool knows. An edition names the books it follows: which one the play rules come from and which one the
// construction rules and equipment tables come from. Plain data; nothing here runs.

export interface Edition {
  id: string;
  name: string;
  books: { role: "play" | "construction"; title: string; printing: string }[];
  unitTypes: { id: string; name: string; ready: boolean }[];
}

export const EDITIONS: Edition[] = [
  {
    id: "core-2026",
    name: "Core Rulebook (2026)",
    books: [
      { role: "play", title: "BattleTech Core Rulebook", printing: "2026, first printing" },
      { role: "construction", title: "TechManual", printing: "corrected sixth printing, errata v8.0 (22 August 2024)" },
    ],
    unitTypes: [
      { id: "mech", name: "BattleMech", ready: true },
      { id: "industrialmech", name: "IndustrialMech", ready: false },
      { id: "vehicle", name: "Vehicle", ready: false },
      { id: "protomech", name: "ProtoMech", ready: false },
      { id: "infantry", name: "Infantry", ready: false },
    ],
  },
];

export const DEFAULT_EDITION = "core-2026";
