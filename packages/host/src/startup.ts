import { validateEdition, validateManifest } from "@salvage-rights/shared";
import type { FamilyManifest } from "@salvage-rights/shared";

/** Everything wrong with the families this build was made from; empty when the app can start. */
export function startupProblems(families: FamilyManifest[]): string[] {
  const problems = families.flatMap((family, i) => {
    const label = typeof family.id === "string" && family.id !== "" ? family.id : `family ${String(i + 1)}`;
    return validateManifest(family).map((problem) => `${label}: ${problem}`);
  });
  return [...problems, ...validateEdition(families)];
}
