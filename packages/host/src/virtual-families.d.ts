declare module "virtual:families" {
  import type { FamilyManifest } from "@salvage-rights/shared";

  export const families: FamilyManifest[];
  export const editionId: string;
}
