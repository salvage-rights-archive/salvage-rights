// The troopers of the battle armor sheet: the paper doll, one suit for each trooper with its own point (the helmet bubble) and one bubble for every
// armor point, drawn black on white. The bubbles are the ones the player marks off in play.
import type { BaRecord } from "../../rules/battlearmor/record";
import BattleArmorDiagram from "./BattleArmorDiagram";
import { troopersOf } from "./edit";

export default function BaSheetTroopers({ record, rect }: { record: BaRecord; rect: { x: number; y: number; w: number; h: number } }) {
  return <BattleArmorDiagram locations={troopersOf(record)} use="armor" body={record.body} rect={rect} label={`${String(troopersOf(record).length)} troopers, ${String(record.armor.points)} armor points each and the trooper`} />;
}
