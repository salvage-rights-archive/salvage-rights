/** The address saved by 404.html, or null when it is missing or does not lie under the app's base path. */
export function restoredPath(stored: string | null, base: string): string | null {
  return stored !== null && stored.startsWith(base) ? stored : null;
}
