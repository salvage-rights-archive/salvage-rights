// Where the ProtoMech pages live: Classic's own routes.
export const CLASSIC_HOME = "/battletech/classic/home";
export const PROTO_EDITOR = "/battletech/classic/protomech-editor";
export const PROTO_SHEET = "/battletech/classic/protomech-sheet";
export const editorHref = (id: string): string => `${PROTO_EDITOR}?id=${encodeURIComponent(id)}`;
/** A sheet of one or more designs (a Point holds up to five; a design may be listed more than once). */
export const sheetHref = (ids: string[]): string => `${PROTO_SHEET}?${ids.map((id) => `id=${encodeURIComponent(id)}`).join("&")}`;
