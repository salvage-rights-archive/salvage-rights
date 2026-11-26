// Where the vehicle pages live: Classic's own routes.
export const VEHICLE_BASE = "/battletech/classic";
export const VEHICLE_HOME = `${VEHICLE_BASE}/home`;
export const VEHICLE_EDITOR = `${VEHICLE_BASE}/vehicle-editor`;
export const VEHICLE_SHEET = `${VEHICLE_BASE}/vehicle-sheet`;
export const vehicleEditorHref = (id: string): string => `${VEHICLE_EDITOR}?id=${encodeURIComponent(id)}`;
export const vehicleSheetHref = (id: string): string => `${VEHICLE_SHEET}?id=${encodeURIComponent(id)}`;
