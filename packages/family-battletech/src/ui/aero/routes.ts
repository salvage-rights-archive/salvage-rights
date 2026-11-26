// Where the AeroTech pages live: the game's own routes.
export const AERO_BASE = "/battletech/aerotech";
export const AERO_HOME = `${AERO_BASE}/home`;
export const AERO_EDITOR = `${AERO_BASE}/editor`;
export const AERO_SHEET = `${AERO_BASE}/sheet`;
export const editorHref = (id: string): string => `${AERO_EDITOR}?id=${encodeURIComponent(id)}`;
export const sheetHref = (id: string): string => `${AERO_SHEET}?id=${encodeURIComponent(id)}`;
