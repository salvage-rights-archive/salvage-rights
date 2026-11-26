// What the Aces pages keep of games in progress: one record per game under `aces-game:` in the family store. A saved game that
// cannot be read is listed with its raw value, never thrown or dropped. Kept apart from the card library's storage, which has its own
// four kinds and its own library file.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { isAcesGame } from "../../rules/aces-game";
import type { AcesGame } from "../../rules/aces-game";

export const ACES_GAME_PREFIX = "aces-game:";

export interface GameEntry {
  id: string;
  game?: AcesGame;
  unreadable?: string;
  savedAt?: string;
}

export interface GameStorage {
  persistent: boolean;
  /** Every saved game, readable or not, newest first. */
  list(): Promise<GameEntry[]>;
  get(id: string): Promise<GameEntry | undefined>;
  save(game: AcesGame): Promise<void>;
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function entryOf(id: string, stored: unknown): GameEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved game is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  if (!isAcesGame(stored.game)) return { id, savedAt, unreadable: "This saved game is incomplete or from a different version." };
  return { id, game: stored.game, savedAt };
}

export function wrapGameStore(store: Store): GameStorage {
  return {
    persistent: store.persistent,
    list: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(ACES_GAME_PREFIX));
      const entries = await Promise.all(keys.map(async (k) => entryOf(k.slice(ACES_GAME_PREFIX.length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (id) => {
      const stored = await store.get<unknown>(ACES_GAME_PREFIX + id);
      return stored === undefined ? undefined : entryOf(id, stored);
    },
    save: (game) => (isAcesGame(game) ? store.set(ACES_GAME_PREFIX + game.id, { game, savedAt: new Date().toISOString() }) : Promise.reject(new Error("This game is incomplete and cannot be saved."))),
    raw: (id) => store.get<unknown>(ACES_GAME_PREFIX + id),
    remove: (id) => store.delete(ACES_GAME_PREFIX + id),
  };
}

export async function openGameStorage(): Promise<GameStorage> {
  return wrapGameStore(await openStore("battletech"));
}
