// Where the Aces pages live: the game's own routes (src/index.ts). Every Aces link is built from this base.
export const ACES_BASE = "/battletech/aces";
// The heading of the Aces section on the Alpha Strike page.
export const ACES_HEADING = "Aces";
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
export const ACES_NEW_GAME = `${ACES_BASE}/new-game`;
export const ACES_GAME = `${ACES_BASE}/game`;
export const gameHref = (id: string): string => `${ACES_GAME}?id=${encodeURIComponent(id)}`;
export const ACES_AFTER = `${ACES_BASE}/after`;
export const afterHref = (campaignId: string, sortie: number): string => `${ACES_AFTER}?campaign=${encodeURIComponent(campaignId)}&n=${String(sortie)}`;
export const ACES_SORTIE = `${ACES_BASE}/sortie`;
export const sortieHref = (campaignId: string, sortie?: number): string => `${ACES_SORTIE}?campaign=${encodeURIComponent(campaignId)}${sortie === undefined ? "" : `&n=${String(sortie)}`}`;
export const ACES_CAMPAIGNS = `${ACES_BASE}/campaigns`;
export const ACES_CAMPAIGN = `${ACES_BASE}/campaign`;
export const campaignHref = (id: string): string => `${ACES_CAMPAIGN}?id=${encodeURIComponent(id)}`;
export const ACES_PRINT = `${ACES_BASE}/print`;
export const printHref = (campaignId: string): string => `${ACES_PRINT}?id=${encodeURIComponent(campaignId)}`;
