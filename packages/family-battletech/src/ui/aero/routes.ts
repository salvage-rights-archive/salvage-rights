// Where the AeroTech pages live while the game is not ready. The host serves a game's own routes only when the game is ready, and the
// manifest checks refuse a family route that starts with a game's id, so until AeroTech goes live (AERO-9) these pages sit under a
// family route of their own, as Aces' and Gothic's do. When the manifest flips AeroTech to ready, this one value becomes
// "/battletech/aerotech" and the pages move into the game's routes.
export const AERO_BASE = "/battletech/aerotech-preview";
export const AERO_HOME = `${AERO_BASE}/home`;
export const AERO_EDITOR = `${AERO_BASE}/editor`;
export const editorHref = (id: string): string => `${AERO_EDITOR}?id=${encodeURIComponent(id)}`;
