// OFFICIAL / NOT OFFICIAL for a ProtoMech: the player states it, and it holds only while the design is the one that was marked (the same rule as rules/official.ts
// for 'Mechs). The design is everything but the name, the notes and the picture. We keep no list of official designs.
import { canon } from "../official";
import type { OfficialState } from "../official";
import type { ProtoRecord } from "./record";

/** The design as the mark sees it; mounts without their ids, so two records of one design agree. */
export const protoDesignKey = (record: ProtoRecord): string =>
  canon({
    tons: record.tons,
    techBase: record.techBase,
    year: record.year,
    walk: record.walk,
    jump: record.jump,
    booster: record.booster,
    cockpit: record.cockpit,
    armorType: record.armorType,
    jumpType: record.jumpType,
    partialWing: record.partialWing,
    mainGun: record.mainGun,
    heatSinks: record.heatSinks,
    armor: record.armor,
    mounts: record.mounts.map((m) => canon({ e: m.equipmentId, l: m.location, r: m.rear, t: m.tubes, s: m.shots })).sort(),
  });

export function protoOfficialState(record: ProtoRecord): OfficialState {
  const mark = record.official;
  const book = mark?.book?.trim();
  if (mark?.status !== "official" || !book || mark.design === undefined) return { official: false };
  if (mark.design !== protoDesignKey(record)) return { official: false, changedFrom: book };
  return mark.page === undefined ? { official: true, book } : { official: true, book, page: mark.page };
}

export function markProtoOfficial(draft: ProtoRecord, book: string, page?: number | null): void {
  draft.official = { status: "official", book: book.trim(), design: protoDesignKey(draft), ...(page === undefined || page === null ? {} : { page }) };
}
