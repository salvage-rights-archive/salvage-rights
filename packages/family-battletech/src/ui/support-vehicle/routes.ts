// Where the Support Vehicle pages live: Classic's own routes.
export const SV_BASE = "/battletech/classic";
export const SV_HOME = `${SV_BASE}/home`;
export const SV_EDITOR = `${SV_BASE}/support-vehicle-editor`;
export const SV_SHEET = `${SV_BASE}/support-vehicle-sheet`;
export const svEditorHref = (id: string): string => `${SV_EDITOR}?id=${encodeURIComponent(id)}`;
export const svSheetHref = (id: string): string => `${SV_SHEET}?id=${encodeURIComponent(id)}`;
