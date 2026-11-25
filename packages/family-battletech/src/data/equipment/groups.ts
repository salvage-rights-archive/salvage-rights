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
  { id: "vehicle", label: "Vehicle equipment", match: words("turret") },
  { id: "capital", label: "Capital weapons", match: words("killer-whale|killer-whale-t|white-shark|white-shark-t|barracuda|barracuda-t|ar-10-launcher|kraken-t|screen-launcher") },
  { id: "battlearmor", label: "Battle armor equipment", match: words("ba") },
  { id: "artillery", label: "Artillery", match: words("arrow-iv|thumper|sniper|long-tom") },
  { id: "industrial", label: "Industrial equipment", match: words("backhoe|chainsaw|combine|dual-saw|pile-driver|mining-drill|rock-cutter|spot-welder|nail-rivet|wrecking-ball|salvage-arm|sprayer|fluid-suction|lift-hoist|bridgelayer|remote-sensor-dispenser|searchlight|ejection-seat|tracks|environmental-sealing|bulldozer|field-kitchen|mash|quarters|seating|lifeboat|escape-pod|extended-fuel-tank|communications-equipment|cargo") },
  { id: "actuators", label: "Actuator enhancement", match: words("aes-arm|aes-leg") },
  { id: "stealth", label: "Stealth and signature systems", match: words("chameleon-lps|null-signature-system|void-signature-system") },
  { id: "command", label: "Command consoles and modules", match: words("cockpit-command-console|collapsible-command-module|remote-drone-command-console") },
  { id: "defensive", label: "Defensive equipment", match: words("ams|case|shield|laser-anti-missile|pds|harjel|harjel-ii|harjel-iii|full-head-ejection-system|aquatic-survival-system") },
  { id: "heat", label: "Heat and movement equipment", match: words("heat-sink|jump-jet|jump-pack|mechanical-jump-booster|partial-wing|umu|supercharger|masc|tsm|triple-strength|super-cooled|coolant|laser-insulator|lam") },
  { id: "electronics", label: "Electronics and targeting", match: words("c3|ecm|probe|tag|cews|electronic-warfare|recon-camera|remote-sensor|remote-sensors|apollo|targeting-computer|artemis|viral-jammer|chaff") },
  { id: "special", label: "Anti-personnel and special weapons", match: words("booby-trap|machine-gun|machine-gun-array|a-pods|b-pods|grenade|mine-dispenser|taser|fluid-gun|m-pod") },
  { id: "physical", label: "Physical weapons", match: words("claws|mace|lance|talons|hatchet|sword|retractable-blade|chain-whip|flail|spikes|vibroblade") },
  { id: "missile", label: "Missile weapons", match: words("lrm|srm|mrm|mml|atm|rocket-launcher|narc|thunderbolt|mortar") },
  { id: "energy", label: "Energy weapons", match: words("laser|ppc|plasma|flamer|tsemp|binary|bombast|centurion|capacitor|chemical") },
  { id: "ballistic", label: "Ballistic weapons", match: words("ac|lb|gauss|rifle|rotary|ultra|magshot") },
];
export const OTHER_GROUP = { id: "other", label: "Other equipment" };

/** Ammunition, by the weapon family it feeds. The stem is the id without `ammo-`. */
export const AMMO_GROUPS: GroupRule[] = [
  { id: "ammo-other", label: "Ammunition: machine guns, flamers and other", match: words("plasma|chemical|flamer|machine-gun|nail-rivet|fluid-gun|taser|ams|c3-remote-sensor-launcher|pds|tear-gas|remote-sensor-dispenser") },
  { id: "ammo-artillery", label: "Ammunition: artillery", match: words("arrow-iv|thumper|sniper|long-tom") },
  { id: "ammo-missile", label: "Ammunition: missile", match: words("lrm|srm|mrm|mml|atm|narc|thunder|thunderbolt|inferno|swarm|swarm-i|semi-guided|harpoon|artemis|mortar|streak|rocket") },
  { id: "ammo-ballistic", label: "Ammunition: ballistic", match: words("ac|lb|gauss|rifle|rotary|ultra|magshot|armor-piercing|flechette|precision|fragmentation") },
];
export const AMMO_OTHER_GROUP = { id: "ammo-other", label: "Ammunition: machine guns, flamers and other" };

/** The order the picker lists the groups in. */
export const GROUP_ORDER: string[] = ["battlearmor", "infantry", "vehicle", "capital", "energy", "ballistic", "missile", "artillery", "physical", "special", "electronics", "stealth", "command", "defensive", "actuators", "heat", "industrial", "ammo-ballistic", "ammo-missile", "ammo-artillery", "ammo-other", "other"];
