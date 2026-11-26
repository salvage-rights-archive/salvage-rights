// Where the Aces pages live while the game is not ready. The host serves a game's own routes only when the game is ready, and the
// manifest checks refuse a family route that starts with a game's id, so until Aces goes live these pages sit under a family
// route of their own. When the manifest flips Aces to ready they move into the game's routes and these become `aces/...`.
export const ACES_BASE = "/battletech/aces-preview";
export const ACES_HOME = `${ACES_BASE}/home`;
export const ACES_CARDS = `${ACES_BASE}/cards`;
export const ACES_CARD = `${ACES_BASE}/card`;
export const cardHref = (id: string): string => `${ACES_CARD}?id=${encodeURIComponent(id)}`;
