// One fielded unit in the after-sortie steps: whether it was destroyed, the Salvage Check and the crew roll (typed or rolled for the
// player; no Edge may change the crew roll, p. 33), and how it ended the game for the repair bill. Hide, do not mark: a unit that was
// not destroyed shows no rolls.
import { useId } from "react";
import { AFTER_SORTIE } from "../../data/aces";
import type { RepairCategory } from "../../data/aces";
import type { NamedPilot, SortieUnit, UnitSettlement } from "../../rules/aces-campaign";

export interface SortieItem {
  use: boolean;
  unit: SortieUnit;
}

const REPAIR_NAMES: Record<RepairCategory, string> = {
  none: "No damage",
  armor: "Armor damage only",
  structure: "Structure damage or a critical hit",
  crippled: "Crippled",
  destroyed: "Destroyed",
};

const roll2d6 = (): number => 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6);
const toNumber = (text: string): number | undefined => {
  const n = Number(text);
  return text.trim() === "" || Number.isNaN(n) ? undefined : n;
};

const SALVAGE_REASON: Record<UnitSettlement["salvage"]["reason"], string> = {
  "not-destroyed": "",
  ammo: "Truly destroyed: an Ammo or Fuel hit without CASE.",
  crash: "Truly destroyed: it crashed.",
  emplacement: "Truly destroyed: an emplacement.",
  "salvage-failed": "Truly destroyed: the Salvage Check failed.",
  salvaged: "Salvaged: it will be repaired.",
  "roll-needed": "Enter the Salvage Check roll.",
  "no-number": "This unit type has no printed Salvage Check number; say whether it is truly destroyed.",
};
const CREW_TEXT: Record<string, string> = { killed: "The crew is killed.", wounded: "The crew is wounded.", unscathed: "The crew is unscathed." };

interface Props {
  item: SortieItem;
  result: UnitSettlement;
  pilots: NamedPilot[];
  onChange: (next: SortieItem) => void;
}

export default function SortieUnitCard({ item, result, pilots, onChange }: Props) {
  const id = useId();
  const u = item.unit;
  const set = (patch: Partial<SortieUnit>) => {
    onChange({ ...item, unit: { ...u, ...patch } });
  };
  const need = AFTER_SORTIE.salvage[u.type];
  const salvageLocked = u.ammoNoCase === true || u.crashed === true || u.emplacement === true;
  const crewLocked = u.crewKilledHit === true || u.crewStunnedHit === true;
  const rollField = (label: string, value: number | undefined, key: "salvageRoll" | "crewRoll") => (
    <div className="bt-field">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input id={`${id}-${key}`} type="number" inputMode="numeric" min={2} max={12} value={value ?? ""} onChange={(e) => { set({ [key]: toNumber(e.target.value) }); }} />
      <button type="button" className="bt-button bt-button--secondary" aria-label={`Roll for me: ${label.toLowerCase()} of ${u.name}`} onClick={() => { set({ [key]: roll2d6() }); }}>
        Roll for me
      </button>
    </div>
  );
  return (
    <fieldset className="aces-fieldset">
      <legend>{u.name}</legend>
      <label className="bt-check">
        <input type="checkbox" checked={item.use} onChange={(e) => { onChange({ ...item, use: e.target.checked }); }} /> {`${u.name} was fielded`}
      </label>
      {item.use && (
        <>
          <div className="bt-field">
            <label htmlFor={`${id}-pilot`}>{`Named Pilot of ${u.name}`}</label>
            <select id={`${id}-pilot`} value={u.pilotId ?? ""} onChange={(e) => { set({ pilotId: e.target.value === "" ? undefined : e.target.value }); }}>
              <option value="">No Named Pilot</option>
              {pilots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.callsign}
                </option>
              ))}
            </select>
          </div>
          <div className="bt-field">
            <label htmlFor={`${id}-size`}>{`Size of ${u.name}`}</label>
            <input id={`${id}-size`} type="number" inputMode="numeric" min={0} value={u.size} onChange={(e) => { set({ size: toNumber(e.target.value) ?? 0 }); }} />
          </div>
          <label className="bt-check">
            <input type="checkbox" checked={u.ene === true} onChange={(e) => { set({ ene: e.target.checked }); }} /> {`${u.name} has ENE`}
          </label>
          <label className="bt-check">
            <input type="checkbox" checked={u.destroyed} onChange={(e) => { set({ destroyed: e.target.checked }); }} /> {`${u.name} was destroyed in the game`}
          </label>
          {u.destroyed ? (
            <>
              <label className="bt-check">
                <input type="checkbox" checked={u.ammoNoCase === true} onChange={(e) => { set({ ammoNoCase: e.target.checked }); }} /> Ammo or Fuel hit, no CASE
              </label>
              <label className="bt-check">
                <input type="checkbox" checked={u.crashed === true} onChange={(e) => { set({ crashed: e.target.checked }); }} /> Crashed while airborne
              </label>
              <label className="bt-check">
                <input type="checkbox" checked={u.emplacement === true} onChange={(e) => { set({ emplacement: e.target.checked }); }} /> Emplacement
              </label>
              {!salvageLocked && need !== undefined && rollField(`Salvage Check roll, ${String(need)} or more passes`, u.salvageRoll, "salvageRoll")}
              {!salvageLocked && need === undefined && (
                <label className="bt-check">
                  <input type="checkbox" checked={u.trulyDestroyed === true} onChange={(e) => { set({ trulyDestroyed: e.target.checked }); }} /> Truly destroyed
                </label>
              )}
              <p role="status">{SALVAGE_REASON[result.salvage.reason]}</p>
              <div className="bt-field">
                <label htmlFor={`${id}-crewhit`}>{`Crew hit on ${u.name}`}</label>
                <select
                  id={`${id}-crewhit`}
                  value={u.crewKilledHit ? "killed" : u.crewStunnedHit ? "stunned" : ""}
                  onChange={(e) => { set({ crewKilledHit: e.target.value === "killed", crewStunnedHit: e.target.value === "stunned" }); }}
                >
                  <option value="">No crew hit</option>
                  <option value="stunned">Crew Stunned hit</option>
                  <option value="killed">Crew Killed or Unit Destroyed hit</option>
                </select>
              </div>
              {!crewLocked && rollField("Crew roll", u.crewRoll, "crewRoll")}
              <p role="status">{result.crew === null ? "Enter the crew roll." : (CREW_TEXT[result.crew] ?? "")}</p>
            </>
          ) : (
            <div className="bt-field">
              <label htmlFor={`${id}-repair`}>{`How ${u.name} ended the game`}</label>
              <select id={`${id}-repair`} value={u.repair === "destroyed" ? "none" : u.repair} onChange={(e) => { set({ repair: e.target.value as RepairCategory }); }}>
                {(["none", "armor", "structure", "crippled"] as const).map((c) => (
                  <option key={c} value={c}>
                    {REPAIR_NAMES[c]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
