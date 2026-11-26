// Where the Aces pages live while the game is not ready. The host serves a game's own routes only when the game is ready, and the
// manifest checks refuse a family route that starts with a game's id, so until Aces goes live these pages sit under a family
// route of their own. When the manifest flips Aces to ready they move into the game's routes and these become `aces/...`.
export const ACES_BASE = "/battletech/aces-preview";
export const ACES_HOME = `${ACES_BASE}/home`;
export const ACES_CARDS = `${ACES_BASE}/cards`;
export const ACES_CARD = `${ACES_BASE}/card`;
export const cardHref = (id: string): string => `${ACES_CARD}?id=${encodeURIComponent(id)}`;
export const ACES_COMMAND = `${ACES_BASE}/command`;
export const commandHref = (id: string): string => `${ACES_COMMAND}?id=${encodeURIComponent(id)}`;
export const ACES_ORDER = `${ACES_BASE}/order`;
export const orderHref = (id: string): string => `${ACES_ORDER}?id=${encodeURIComponent(id)}`;
export const ACES_SUPPORT = `${ACES_BASE}/support`;
export const supportHref = (id: string): string => `${ACES_SUPPORT}?id=${encodeURIComponent(id)}`;
