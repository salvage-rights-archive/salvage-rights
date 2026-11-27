// How the record sheets spell equipment, against the names the catalog prints. Two small tables, both read by the catalog when it
// looks a name up (rules/catalog.ts `match`); neither changes a row.
//  - SHEET_ALIASES: extra spellings by row id, for names that are not a reordering of the printed one (an abbreviation, a
//    different word). The printed name is always the row's `name`; row-level `aliases` hold the older spellings.
//  - SHEET_NAME_RULES: patterns for the regular differences, tried in order on the name as read: location and stat text the
//    sheet reader left on the end, a tech base or facing mark, "Imp." for "Improved", "Medium X-Pulse Laser" for
//    "X-Pulse Laser, Medium", and the ammunition line "Ammo (LRM 20 Artemis-capable) 6" for the ammunition row of the munition.
export const SHEET_ALIASES: Record<string, string[]> = {
  "laser-anti-missile-system-is": ["Laser AMS"],
  "laser-anti-missile-system-clan": ["Laser AMS"],
  "c3-computer-slave-is": ["C3 Slave"],
  "c3-computer-master-is": ["C3 Master"],
  "c3-boosted-master-is": ["C3 Boosted System (C3BS) Master", "C3 Boosted System (C3BS)"],
  "c3-boosted-slave-is": ["C3 Boosted System (C3BS) Slave"],
  "bloodhound-active-probe-is": ["Bloodhound Active", "Bloodhound Active Probe (BAP)"],
  "angel-ecm-is": ["Angel ECM Suite"],
  "angel-ecm-clan": ["Angel ECM Suite"],
  "mrm-apollo-fcs-is": ["Apollo MRM FCS"],
  "silver-bullet-gauss-is": ["Silver Bullet Gauss Rifle"],
  "taser-is": ["BattleMech Taser", "Mech Taser"],
  "ammo-taser-is": ["Mech Taser Ammo"],
  "risc-advanced-pds-is": ["RISC APDS"],
  "tsemp-cannon-is": ["TSEMP Repeating Cannon"],
  "risc-repeating-tsemp-cannon-is": ["TSEMP Repeating"],
  "improved-heavy-gauss-is": ["Improved Heavy Gauss Rifle", "Imp. Heavy Gauss Rifle", "Imp. Heavy Gauss", "iHeavy Gauss"],
  "ammo-improved-heavy-gauss-is": ["Improved Heavy Gauss Rifle Ammo"],
  "ammo-magshot-is": ["MagShot Gauss Rifle Ammo"],
  "ammo-silver-bullet-gauss-is": ["Silver Bullet Gauss Rifle Ammo"],
  "improved-heavy-laser-small-clan": ["Improved Heavy Small Laser"],
  "improved-heavy-laser-medium-clan": ["Improved Heavy Medium Laser"],
  "improved-heavy-laser-large-clan": ["Improved Heavy Large Laser"],
  "ammo-chemical-laser-small-clan": ["Small Chemical Laser Ammo"],
  "ammo-chemical-laser-medium-clan": ["Medium Chemical Laser Ammo"],
  "ammo-chemical-laser-large-clan": ["Large Chemical Laser Ammo"],
  "binary-laser-is": ["Binary Laser Cannon"],
  "ammo-nail-rivet-gun-is": ["Nail Gun Ammo", "Rivet Gun Ammo"],
  "ammo-nail-rivet-gun-half-is": ["Nail Gun Ammo (Half Ton)", "Rivet Gun Ammo (Half Ton)"],
  "ammo-nail-rivet-gun-clan": ["Nail Gun Ammo", "Rivet Gun Ammo"],
  "ammo-nail-rivet-gun-half-clan": ["Nail Gun Ammo (Half Ton)", "Rivet Gun Ammo (Half Ton)"],
  "battlemech-turret-shoulder-is": ["Shoulder Turret"],
  "battlemech-turret-shoulder-clan": ["Shoulder Turret"],
  "battlemech-turret-head-is": ["Head Turret"],
  "battlemech-turret-quad-is": ["Quad Turret"],
  "battlemech-turret-quad-clan": ["Quad Turret"],
  "thumper-cannon-is": ["Thumper"],
  "thumper-cannon-clan": ["Thumper"],
  "sniper-cannon-is": ["Sniper"],
  "sniper-cannon-clan": ["Sniper"],
  "heavy-rifle-is": ["Rifle (Cannon, Heavy)"],
  "light-rifle-is": ["Rifle (Cannon, Light)"],
  "medium-rifle-is": ["Rifle (Cannon, Medium)"],
  "remote-sensor-dispenser-is": ["Remote Sensors/Dispenser", "Remote Sensors/Dispenser (30)"],
  "remote-sensor-dispenser-clan": ["Remote Sensors/Dispenser", "Remote Sensors/Dispenser (30)"],
  "vehicular-mine-dispenser-is": ["Vehicular Mine Dispenser", "Vehicular Mine"],
  "vehicular-mine-dispenser-clan": ["Vehicular Mine Dispenser", "Vehicular Mine"],
  "machine-gun-array-is": ["Light Machine Gun Array"],
  "lift-hoist-is": ["Lift Hoist/Arresting Hoist"],
  "lift-hoist-clan": ["Lift Hoist/Arresting Hoist"],
  "b-pods-is": ["Anti-BattleArmor Pods (B-Pods)", "Anti-BattleArmor Pods", "Anti-Battle Armor Pod"],
  "b-pods-clan": ["Anti-BattleArmor Pods (B-Pods)", "Anti-BattleArmor Pods", "Anti-Battle Armor Pod"],
};

/** Printed family name of the laser families the sheet writes in front of the size. */
const LASER_FAMILIES: Record<string, string> = {
  "x-pulse": "X-Pulse Laser",
  vsp: "Variable Speed Laser",
  chemical: "Chemical Laser",
  chem: "Chemical Laser",
  "re-engineered": "Re-Engineered Laser",
};
/** The sheet's name as read, tidied: the tails and marks that are not part of the name. */
export function tidySheetName(name: string): string {
  return name
    .replace(/\s+(?:HD|CT|LT|RT|LA|RA|LL|RL|FLL|FRL|RLL|RRL)(?:\s.*)?$/, "")
    .replace(/\s*\[(?:IS|Clan)\].*$/i, "")
    .replace(/\s*\((?:IS|Clan|C|R|T)\)\s*$/i, "")
    .replace(/\s{2,}.*$/, "")
    .trim();
}
/** Other spellings of a tidied name worth trying, most likely first. */
export function sheetNameVariants(name: string): string[] {
  const out: string[] = [];
  const tidy = tidySheetName(name);
  if (tidy !== name) out.push(tidy);
  const prototype = /^(.*?)\s*\(P\)$/.exec(tidy);
  if (prototype?.[1]) out.push(`Prototype ${prototype[1]}`, `Prototype ${prototype[1].replace(/^Ultra AC\/(\d+)$/i, "Ultra Autocannon/$1")}`);
  const counted = /^(.*?)\s*\(\d+\)$/.exec(tidy);
  if (counted?.[1]) out.push(counted[1]);
  // Items sold by size carry the size in the sheet's name: "Cargo (2 tons)", "Liquid Storage:1t", "CommsGear:2t"
  const sized = /^(.*?)(?:\s*\(\d+(?:\.\d+)? tons?\)|:\d+(?:\.\d+)?t)$/i.exec(tidy);
  if (sized?.[1]) out.push(sized[1]);
  const er = /^ER (Small|Medium|Large) Pulse(?: Laser)?$/i.exec(tidy);
  if (er?.[1]) out.push(`ER Pulse Laser, ${er[1]}`);
  const heavy = /^Imp\. Heavy (Small|Medium|Large)(?: Laser)?$/i.exec(tidy);
  if (heavy?.[1]) out.push(`Improved Heavy Laser, ${heavy[1]}`);
  const family = /^(Small|Medium|Large) (X-Pulse|VSP|Chemical|Chem|Re-engineered)(?: Laser)?$/i.exec(tidy);
  if (family?.[1] && family[2]) out.push(`${LASER_FAMILIES[family[2].toLowerCase()] ?? family[2]}, ${family[1]}`);
  const ammo = /^Ammo \((.+?)\)\s*(?:\d+.*)?$/i.exec(tidy);
  if (ammo?.[1]) {
    const what = ammo[1];
    const printed: Record<string, string> = {
      hmg: "Heavy Machine Gun",
      lmg: "Light Machine Gun",
      mg: "Machine Gun",
      flamer: "Flamer (Vehicle)",
      "silver bullet": "Silver Bullet Gauss",
      "improved gauss": "Improved Gauss Rifle",
      thumper: "Thumper Cannon",
      sniper: "Sniper Cannon",
      "arrow iv homing": "Arrow IV",
      iheavy: "Improved Heavy Gauss",
      "iheavy gauss": "Improved Heavy Gauss",
      "risc apds": "RISC Advanced PDS",
      "small chemical laser": "Chemical Laser, Small",
      "medium chemical laser": "Chemical Laser, Medium",
      "large chemical laser": "Chemical Laser, Large",
    };
    if (/artemis/i.test(what)) out.push("Artemis-Capable Missile Ammo");
    else if (/narc/i.test(what)) out.push("Narc-Capable Missile Ammo");
    else if (Object.hasOwn(printed, what.toLowerCase())) out.push(`${printed[what.toLowerCase()]} Ammo`);
    else if (/^ATM \d+ ER$/i.test(what)) out.push("ER ATM Ammo");
    else if (/^ATM \d+ HE$/i.test(what)) out.push("HE ATM Ammo");
    else if (/^Proto AC\/\d$/i.test(what)) out.push(`ProtoMech ${what.slice(6)} Ammo`);
    else out.push(`${what} Ammo`);
  }
  return out;
}
