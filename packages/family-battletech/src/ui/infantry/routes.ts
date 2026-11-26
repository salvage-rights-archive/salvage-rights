// Where the infantry pages live: routes of the Classic game.
export const INFANTRY_EDITOR = "/battletech/classic/infantry-editor";
export const INFANTRY_SHEET = "/battletech/classic/infantry-sheet";
export const CLASSIC_HOME = "/battletech/classic/home";
export const editorHref = (id: string): string => `${INFANTRY_EDITOR}?id=${encodeURIComponent(id)}`;
export const sheetHref = (id: string): string => `${INFANTRY_SHEET}?id=${encodeURIComponent(id)}`;
