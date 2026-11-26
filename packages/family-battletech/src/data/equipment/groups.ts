// How the equipment picker sorts equipment into groups. The groups are derived from each row's id, not assigned row by row:
// a row's id stem (its id without `-is`/`-clan`, and without `ammo-` for ammunition) is tested against the patterns below, in
// order, and the first that matches names its group. A row that matches none falls to OTHER_GROUP. Ammunition is grouped by the
// weapon family it feeds, so it has its own, shorter list. Plain data: nothing here runs. The wording of the labels is ours.

export interface GroupRule {
  id: string;
  label: string;
  /** Tested against the id stem; whole hyphen-separated words, so `ac` matches `ultra-ac-5` and not `chaff`. */
  match: RegExp;
}

const words = (list: string): RegExp => new RegExp(`(^|-)(${list})(-|$)`);

/** The groups for everything that is not ammunition, in the order the picker lists them (and the order the patterns are tried,
 * except that the picker lists weapons first: see GROUP_ORDER). */
export const EQUIPMENT_GROUPS: GroupRule[] = [
  { id: "infantry", label: "Conventional infantry weapons", match: words("inf") },
  { id: "mech-turret", label: "BattleMech turrets", match: words("battlemech-turret-shoulder|battlemech-turret-head|battlemech-turret-quad") },
  { id: "vehicle", label: "Vehicle equipment", match: words("turret|mast-mount|vtol-jet-booster|mobile-field-base|minesweeper") },
  { id: "capital", label: "Capital weapons", match: words("nac|nl|n-ppc|n-gauss|mass-driver|killer-whale|killer-whale-t|white-shark|white-shark-t|barracuda|barracuda-t|ar-10-launcher|kraken-t|screen-launcher|light-scc|medium-scc|heavy-scc|scl-1|scl-2|scl-3|piranha|stingray|swordfish|manta-ray") },
  { id: "battlearmor", label: "Battle armor equipment", match: words("ba") },
  { id: "artillery", label: "Artillery", match: words("arrow-iv|thumper|sniper|long-tom|cruise-missile-50|cruise-missile-70|cruise-missile-90|cruise-missile-120") },
  { id: "industrial", label: "Industrial equipment", match: words("backhoe|chainsaw|combine|dual-saw|pile-driver|mining-drill|rock-cutter|spot-welder|nail-rivet|wrecking-ball|salvage-arm|sprayer|fluid-suction|lift-hoist|ladder|bridgelayer|remote-sensor-dispenser|searchlight|ejection-seat|tracks|environmental-sealing|bulldozer|field-kitchen|mash|dumper|paramedic-equipment|quarters|seating|lifeboat|escape-pod|extended-fuel-tank|communications-equipment|cargo") },
  { id: "pilot-interface", label: "Cockpit and pilot interfaces", match: words("damage-interrupt-circuit|direct-neural-interface-modification|sldf-advanced-neurohelmet-mech|sldf-advanced-neurohelmet-fighter|enhanced-imaging-interface|battlemech-neural-interface-unit") },
  { id: "large-craft", label: "Large-craft systems", match: words("dropshuttle-bay|docking-collar-post-boom|docking-collar-pre-boom|sldf-sds-jammer-system|wob-super-jump-drive|dragons-breath-launch-system|mobile-hpg|ground-mobile-hpg|small-ncss|large-ncss|naval-tug-adaptor") },
  { id: "carrying", label: "Carrying and transport equipment", match: words("magnetic-clamp|vdc") },
  { id: "actuators", label: "Actuator enhancement", match: words("aes-arm|aes-leg") },
  { id: "stealth", label: "Stealth and signature systems", match: words("chameleon-lps|null-signature-system|void-signature-system") },
  { id: "command", label: "Command consoles and modules", match: words("cockpit-command-console|collapsible-command-module|remote-drone-command-console") },
  { id: "defensive", label: "Defensive equipment", match: words("ams|case|shield|laser-anti-missile|pds|armored-component|armored-motive-system|harjel|harjel-ii|harjel-iii|full-head-ejection-system|aquatic-survival-system") },
  { id: "heat", label: "Heat and movement equipment", match: words("heat-sink|jump-jet|jump-pack|mechanical-jump-booster|partial-wing|umu|supercharger|masc|tsm|triple-strength|super-cooled|coolant|laser-insulator|lam") },
  { id: "electronics", label: "Electronics and targeting", match: words("c3|ecm|probe|imager|tag|cews|electronic-warfare|recon-camera|remote-sensor|remote-sensors|apollo|targeting-computer|artemis|viral-jammer|chaff|drone-operating-system") },
  { id: "aerospace", label: "Bombs and aerospace equipment", match: words("bomb|bay-door|look-down-radar") },
  { id: "special", label: "Anti-personnel and special weapons", match: words("booby-trap|machine-gun|machine-gun-array|a-pods|b-pods|grenade|mine|mine-dispenser|taser|fluid-gun|m-pod") },
  { id: "physical", label: "Physical weapons", match: words("melee|claws|mace|lance|talons|hatchet|sword|retractable-blade|chain-whip|flail|spikes|vibroblade") },
  { id: "missile", label: "Missile weapons", match: words("fusillade|lrm|srm|srt|lrt|mrm|mml|atm|rocket-launcher|narc|thunderbolt|mortar") },
  { id: "energy", label: "Energy weapons", match: words("laser|ppc|plasma|flamer|tsemp|binary|blazer|bombast|centurion|capacitor|chemical") },
  { id: "ballistic", label: "Ballistic weapons", match: words("ac|lb|gauss|rifle|rotary|ultra|magshot") },
];
export const OTHER_GROUP = { id: "other", label: "Other equipment" };

/** Ammunition, by the weapon family it feeds. The stem is the id without `ammo-`. */
export const AMMO_GROUPS: GroupRule[] = [
  { id: "ammo-other", label: "Ammunition: machine guns, flamers and other", match: words("plasma|chemical|flamer|machine-gun|nail-rivet|fluid-gun|taser|ams|c3-remote-sensor-launcher|pds|tear-gas|remote-sensor-dispenser") },
  { id: "ammo-artillery", label: "Ammunition: artillery", match: words("arrow-iv|thumper|sniper|long-tom|artillery|air-defense-arrow|inferno-iv|active-iv|vibrabomb-iv|cruise-missile-50|cruise-missile-70|cruise-missile-90|cruise-missile-120") },
  { id: "ammo-missile", label: "Ammunition: missile", match: words("fusillade|lrm|srm|srt|lrt|mrm|mml|atm|narc|thunder|thunderbolt|inferno|swarm|swarm-i|semi-guided|harpoon|artemis|mortar|streak|rocket") },
  { id: "ammo-ballistic", label: "Ammunition: ballistic", match: words("ac|lb|gauss|rifle|rotary|ultra|magshot|armor-piercing|flechette|precision|fragmentation") },
];
export const AMMO_OTHER_GROUP = { id: "ammo-other", label: "Ammunition: machine guns, flamers and other" };

/** The order the picker lists the groups in. */
export const GROUP_ORDER: string[] = ["battlearmor", "infantry", "vehicle", "mech-turret", "capital", "energy", "ballistic", "missile", "artillery", "physical", "special", "electronics", "aerospace", "stealth", "command", "defensive", "carrying", "actuators", "heat", "industrial", "ammo-ballistic", "ammo-missile", "ammo-artillery", "ammo-other", "other"];
