// Where the battle armor pages live: under Classic BattleTech.
export const BA_BASE = "/battletech/classic";
export const BA_HOME = `${BA_BASE}/home`;
export const BA_EDITOR = `${BA_BASE}/battlearmor-editor`;
export const BA_SHEET = `${BA_BASE}/battlearmor-sheet`;
export const editorHref = (id: string): string => `${BA_EDITOR}?id=${encodeURIComponent(id)}`;
export const sheetHref = (id: string): string => `${BA_SHEET}?id=${encodeURIComponent(id)}`;
