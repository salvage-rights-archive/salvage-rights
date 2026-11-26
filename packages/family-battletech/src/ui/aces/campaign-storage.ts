// What the Aces pages keep of campaigns: one record per campaign under `aces-campaign:` in the family store. A saved campaign that
// cannot be read is listed with its raw value, never thrown or dropped.
import { openStore } from "@salvage-rights/shared";
import type { Store } from "@salvage-rights/shared";
import { isAcesCampaign } from "../../rules/aces-campaign";
import type { AcesCampaign } from "../../rules/aces-campaign";

export const ACES_CAMPAIGN_PREFIX = "aces-campaign:";

export interface CampaignEntry {
  id: string;
  campaign?: AcesCampaign;
  unreadable?: string;
  savedAt?: string;
}

export interface CampaignStorage {
  persistent: boolean;
  /** Every saved campaign, readable or not, newest first. */
  list(): Promise<CampaignEntry[]>;
  get(id: string): Promise<CampaignEntry | undefined>;
  save(campaign: AcesCampaign): Promise<void>;
  /** What is stored under the id, exactly as it is, readable or not. */
  raw(id: string): Promise<unknown>;
  remove(id: string): Promise<void>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function entryOf(id: string, stored: unknown): CampaignEntry {
  if (!isObject(stored)) return { id, unreadable: "This saved campaign is not in a form the app understands." };
  const savedAt = typeof stored.savedAt === "string" ? stored.savedAt : undefined;
  if (!isAcesCampaign(stored.campaign)) return { id, savedAt, unreadable: "This saved campaign is incomplete or from a different version." };
  return { id, campaign: stored.campaign, savedAt };
}

export function wrapCampaignStore(store: Store): CampaignStorage {
  return {
    persistent: store.persistent,
    list: async () => {
      const keys = (await store.keys()).filter((k) => k.startsWith(ACES_CAMPAIGN_PREFIX));
      const entries = await Promise.all(keys.map(async (k) => entryOf(k.slice(ACES_CAMPAIGN_PREFIX.length), await store.get<unknown>(k))));
      return entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    },
    get: async (id) => {
      const stored = await store.get<unknown>(ACES_CAMPAIGN_PREFIX + id);
      return stored === undefined ? undefined : entryOf(id, stored);
    },
    save: (campaign) =>
      isAcesCampaign(campaign) ? store.set(ACES_CAMPAIGN_PREFIX + campaign.id, { campaign, savedAt: new Date().toISOString() }) : Promise.reject(new Error("This campaign is incomplete and cannot be saved.")),
    raw: (id) => store.get<unknown>(ACES_CAMPAIGN_PREFIX + id),
    remove: (id) => store.delete(ACES_CAMPAIGN_PREFIX + id),
  };
}

export async function openCampaignStorage(): Promise<CampaignStorage> {
  return wrapCampaignStore(await openStore("battletech"));
}
