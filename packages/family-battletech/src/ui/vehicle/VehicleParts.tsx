// The vehicle editor's panels: identity, engine, armor, heat sinks and equipment. Each shows only what the unit's rules level, tech base and year
// offer (hide, do not mark): a part the unit already holds stays listed, and the rules check reports it. Every derived figure comes from
// rules/vehicle and is shown as a sentence in the panel's own words.
import { useState } from "react";
import { MOTIVE_CITE } from "../../data/vehicle";
import { bookName, eraLabel } from "../../data/editions";
import { CLASSIC } from "../../data/rulesets";
import { eraNeedsPick, erasOfYear, eraOfRecord, setEra, setYear } from "../../rules/availability";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { DEFAULT_LEVEL, techBaseChoices } from "../../rules/levels";
import {
  amplifierTons, armorLocations, armorPointsFor, armorTonsFor, assignedArmor, baseRating, crewOf, energyHeat, engineRating, engineSlots, engineWeight, flankMP, freeHeatSinks, isFusion, itemFacts, maxArmorPoints, motiveRowOf, mountLocations, slotTally, structurePoints, structureTons, suspensionFactor,
  vehicleLocationName,
} from "../../rules/vehicle/vehicle";
import type { VehicleRecord } from "../../rules/vehicle/vehicle";
import { armorChoices, engineChoices, motiveChoices } from "../../rules/vehicle/availability";
import { tidy } from "../../rules/walk";
import LevelSelect from "../editor/LevelSelect";
import { NumberField, SelectField, TextField } from "../aero/fields";
import { chosenMunition, munitionShort, reloadCost } from "../../rules/munitions";
import { mountFor, munitionChoices, strayLocations, syncArmorLocations } from "./edit";
import type { VehicleOnEdit } from "./edit";
import VehicleDiagram from "./VehicleDiagram";
import VehiclePicker, { vehiclePickerSource } from "./VehiclePicker";

const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const TECH_BASE_LABELS: Record<string, string> = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" };
export const mountDomId = (id: string): string => `vehicle-mount-${id}`;
export const locationFieldId = (code: string): string => `field-armor-${code}`;

function Readout({ lines }: { lines: (string | undefined)[] }) {
  const shown = lines.filter((line): line is string => line !== undefined);
  if (shown.length === 0) return null;
  return (
    <ul className="bt-list bt-readout">
      {shown.map((line) => (
        <li key={line} className="bt-hint">
          {line}
        </li>
      ))}
    </ul>
  );
}

interface PartProps {
  record: VehicleRecord;
  onEdit: VehicleOnEdit;
}

export function IdentityPanel({ record, onEdit }: PartProps) {
  const level = record.rulesLevel ?? DEFAULT_LEVEL;
  const row = motiveRowOf(record);
  const yearEras = erasOfYear(record.year, CLASSIC);
  const above = level !== "introductory";
  return (
    <section className="bt-panel" aria-labelledby="vehicle-identity">
      <h2 id="vehicle-identity">Identity</h2>
      <div className="bt-grid">
        <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { onEdit((d) => void (d.name.chassis = v), "name"); }} />
        <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { onEdit((d) => void (d.name.model = v), "name-model"); }} />
        <SelectField
          id="field-motive"
          label="Type"
          value={record.motive}
          options={motiveChoices(record).map(([value, label]) => ({ value, label }))}
          hint={row ? `Combat vehicle, ${row.label}, up to ${String(row.maxTons)} tons. ${bookName(MOTIVE_CITE.book)}, p. ${String(MOTIVE_CITE.page)}.` : undefined}
          className="bt-level"
          onChange={(v) => {
            onEdit((d) => {
              d.motive = v;
              if (v === "vtol") d.turret = false;
              syncArmorLocations(d);
            });
          }}
        />
        <LevelSelect record={record} onChange={(next) => { onEdit((d) => void (d.rulesLevel = next)); }} />
        <NumberField
          id="field-year"
          label="Year"
          value={record.year}
          allowEmpty
          hint={above ? `Needed at ${level} rules: it sets the era and hides what did not exist yet.` : undefined}
          onValid={(v) => { onEdit((d) => { setYear(d, v); }, "year"); }}
        />
        {record.year !== null && yearEras.length === 1 ? (
          <div className="bt-field">
            <span id="field-era-label" className="bt-label">Era</span>
            <span id="field-era" tabIndex={-1} aria-labelledby="field-era-label">{(() => { const era = eraOfRecord(record); return era ? eraLabel(era) : "Any era"; })()}</span>
          </div>
        ) : record.year !== null && yearEras.length > 1 ? (
          <SelectField
            id="field-era"
            label="Era"
            value={eraNeedsPick(record) ? "" : (eraOfRecord(record)?.id ?? "")}
            options={[{ value: "", label: "Choose an era" }, ...yearEras.map((era) => ({ value: era.id, label: `${eraLabel(era)} (${String(era.startYear)}${era.endYear === undefined ? " on" : `-${String(era.endYear)}`})` }))]}
            onChange={(v) => { onEdit((d) => { setEra(d, v); }); }}
          />
        ) : null}
        <SelectField
          id="field-techBase"
          label="Tech base"
          value={record.techBase}
          options={techBaseChoices(record.rulesLevel, record.techBase, record).map(([value]) => ({ value, label: TECH_BASE_LABELS[value] ?? value }))}
          onChange={(v) => { onEdit((d) => void (d.techBase = v === "clan" || v === "mixed" ? v : "inner-sphere")); }}
        />
        <NumberField id="field-tons" label="Tons" value={record.tons} min={1} hint={row ? `Whole tons, 1 to ${String(row.maxTons)}.` : undefined} onValid={(v) => { onEdit((d) => void (d.tons = v ?? d.tons), "tons"); }} />
        {record.motive !== "vtol" && (
          <label className="bt-check bt-grid__wide" htmlFor="field-turret">
            <input id="field-turret" type="checkbox" checked={record.turret} onChange={(event) => { onEdit((d) => { d.turret = event.target.checked; syncArmorLocations(d); }); }} />
            Turret (one, in its own location)
          </label>
        )}
      </div>
    </section>
  );
}

export function EnginePanel({ record, onEdit }: PartProps) {
  const rating = engineRating(record);
  const weight = engineWeight(record);
  const base = baseRating(record);
  const slots = engineSlots(record);
  return (
    <section className="bt-panel" aria-labelledby="vehicle-engine">
      <h2 id="vehicle-engine">Engine</h2>
      <div className="bt-grid">
        <NumberField id="field-cruise" label="Cruising MP" value={record.cruise} min={1} onValid={(v) => { onEdit((d) => void (d.cruise = v ?? d.cruise), "cruise"); }} />
        <SelectField
          id="field-engine"
          label="Engine"
          value={record.engine.type}
          options={engineChoices(record).map(([value, label]) => ({ value, label }))}
          onChange={(v) => {
            onEdit((d) => {
              const was = d.engine.type;
              d.engine.type = v;
              // A fusion engine's ten free sinks come and go with it; the player's own extra sinks stay.
              if (was !== "ice" && v === "ice") d.heatSinks.count = Math.max(0, d.heatSinks.count - freeHeatSinks({ engine: { type: was } }));
              if (was === "ice" && v !== "ice") d.heatSinks.count += freeHeatSinks({ engine: { type: v } });
            });
          }}
        />
      </div>
      <Readout
        lines={[
          `Flank MP ${String(flankMP(record))}.`,
          rating === null ? "The book prints no suspension factor for this weight, so the engine cannot be worked out." : `Engine rating ${String(rating)}${base !== null && base !== rating ? ` (the formula gives ${num(base)}; the suspension factor is ${String(suspensionFactor(record))})` : ""}.`,
          weight === null ? undefined : `The engine weighs ${plural(weight, "ton")}.`,
          slots === 0 ? undefined : slots > 0 ? `The engine takes ${plural(slots, "item slot")}.` : `The engine gives ${plural(-slots, "extra item slot")}.`,
          `Structure ${plural(structureTons(record), "ton")}; ${plural(structurePoints(record), "structure point")} in each location. Crew ${String(crewOf(record))}.`,
        ]}
      />
    </section>
  );
}

export function ArmorPanel({ record, onEdit, selected, onSelect }: PartProps & { selected?: string; onSelect: (code: string) => void }) {
  const here = armorLocations(record);
  const available = armorPointsFor(record.armor.type, record.armor.tons);
  const assigned = assignedArmor(record);
  const extra = Object.entries(record.armor.points).filter(([loc, n]) => !here.includes(loc) && n !== 0).map(([loc]) => loc);
  const max = maxArmorPoints(record);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="vehicle-armor">
      <h2 id="vehicle-armor">Armor</h2>
      <div className="bt-grid">
        <SelectField
          id="field-armor-type"
          label="Armor type"
          value={record.armor.type}
          options={armorChoices(record).map(([value, label]) => ({ value, label }))}
          onChange={(v) => { onEdit((d) => void (d.armor.type = v)); }}
        />
        <NumberField
          id="field-armor-tons"
          label="Armor tons"
          value={record.armor.tons}
          min={0}
          hint="In lots of half a ton."
          onValid={(v) => { onEdit((d) => void (d.armor.tons = v ?? d.armor.tons), "armor-tons"); }}
        />
        {[...here, ...extra].map((loc) => (
          <NumberField
            key={loc}
            id={locationFieldId(loc)}
            label={`${vehicleLocationName(loc)} armor`}
            value={record.armor.points[loc] ?? 0}
            min={0}
            hint={loc === "rot" ? "A rotor holds 2 points at most." : undefined}
            onValid={(v) => { onEdit((d) => void (d.armor.points[loc] = v ?? 0), `armor-${loc}`); }}
          />
        ))}
      </div>
      <Readout
        lines={[
          available === null ? undefined : `${plural(record.armor.tons, "ton")} give ${plural(available, "armor point")}; ${plural(assigned, "point")} assigned; the most this vehicle may mount is ${String(max)}.`,
          available !== null && assigned < available ? `Armor tons for the points assigned: ${num(armorTonsFor(record.armor.type, assigned) ?? 0)}.` : undefined,
        ]}
      />
      <p className="bt-hint">Pick a location in the drawing to go to its field.</p>
      <ArmorDrawing record={record} selected={selected} onSelect={onSelect} />
    </section>
  );
}

export function ArmorDrawing({ record, selected, onSelect }: { record: VehicleRecord; selected?: string; onSelect?: (code: string) => void }) {
  const locations = armorLocations(record).map((code) => ({ code, name: vehicleLocationName(code), armor: record.armor.points[code] ?? 0, structure: structurePoints(record) }));
  return <div className="bt-vehicle-doll"><VehicleDiagram locations={locations} use="armor" motive={record.motive} {...(onSelect ? { onSelect } : {})} {...(selected === undefined ? {} : { selected })} /></div>;
}

export function HeatPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const heat = energyHeat(record, catalog);
  const free = freeHeatSinks(record);
  const amps = amplifierTons(record, catalog);
  return (
    <section className="bt-panel" aria-labelledby="vehicle-heat">
      <h2 id="vehicle-heat">Heat sinks</h2>
      <div className="bt-grid">
        <NumberField id="field-heatSinks" label="Heat sinks" value={record.heatSinks.count} min={0} hint={isFusion(record.engine.type) ? `The fusion engine gives ${String(free)} at no weight.` : "An internal combustion engine gives none: each costs a ton."} onValid={(v) => { onEdit((d) => void (d.heatSinks.count = v ?? 0), "heatSinks"); }} />
      </div>
      <Readout lines={[`Energy weapons fired together make ${plural(heat, "point")} of heat.`, amps > 0 ? `Power amplifiers: ${plural(amps, "ton")}.` : undefined]} />
    </section>
  );
}

/** One weapon, ammunition bin or other item on the unit. */
export function EquipmentPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const [picking, setPicking] = useState<{ replace?: string } | undefined>();
  const places = mountLocations(record);
  const strays = strayLocations(record, places);
  const slots = slotTally(record, catalog);
  const choose = (row: EquipmentRow) => {
    const target = picking;
    setPicking(undefined);
    onEdit((d) => {
      if (target?.replace !== undefined) {
        const at = d.mounts.find((m) => m.id === target.replace);
        if (at) {
          const next = mountFor(d, row, at.location, catalog);
          d.mounts[d.mounts.indexOf(at)] = { ...next, id: at.id };
        }
      } else d.mounts.push(mountFor(d, row, row.kind === "weapon" ? "f" : "body", catalog));
    });
  };
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="vehicle-equipment">
      <h2 id="vehicle-equipment">Weapons and equipment</h2>
      <p className="bt-hint">{`${String(slots.used)} of ${String(slots.available)} item slots used. Every item takes one slot unless the table says otherwise; ammunition goes in a bin of any weight.`}</p>
      {record.mounts.length === 0 ? <p>No equipment yet.</p> : (
        <ul className="bt-list bt-mounts">
          {record.mounts.map((m) => {
            const facts = itemFacts(m, record, catalog);
            const choices = facts.row === undefined ? [] : munitionChoices(record, catalog, facts.row, m.munition);
            const chosen = chosenMunition(facts.row, m.munition, catalog, record.editionId);
            const reload = reloadCost(chosen);
            return (
              <li key={m.id} id={mountDomId(m.id)} tabIndex={-1} className="bt-row">
                <span className="bt-row__text">
                  <strong>{m.name || "Unnamed item"}</strong>
                  <span className="bt-row__credit">{facts.tons === null ? "weight not known" : plural(facts.tons, "ton")}{facts.heat > 0 ? `, heat ${String(facts.heat)}` : ""}</span>
                  {chosen !== undefined && <span className="bt-row__credit">{`${munitionShort(chosen)}${reload === undefined ? "" : `: two shots cost ${reload.toLocaleString("en-US")} C-bills to replace, not counted in the unit's cost`}.`}</span>}
                </span>
                <span className="bt-row__actions bt-vehicle-mount">
                  <SelectField
                    id={`${mountDomId(m.id)}-loc`}
                    label={`Location of ${m.name || "item"}`}
                    value={m.location}
                    options={[...places, ...strays].map((code) => ({ value: code, label: vehicleLocationName(code) }))}
                    onChange={(v) => { onEdit((d) => void (d.mounts.find((x) => x.id === m.id)!.location = v)); }}
                  />
                  {choices.length > 0 && (
                    <SelectField
                      id={`${mountDomId(m.id)}-munition`}
                      label={`${facts.row?.id.startsWith("vehicular-mine") === true ? "Mine type" : "Grenade type"} of ${m.name || "item"}`}
                      value={chosen?.id ?? ""}
                      options={choices.map((c) => ({ value: c.id, label: munitionShort(c) }))}
                      onChange={(v) => { onEdit((d) => { const at = d.mounts.find((x) => x.id === m.id); if (at) at.munition = v; }); }}
                    />
                  )}
                  {facts.ammo && (
                    <NumberField id={`${mountDomId(m.id)}-tons`} label={`Tons of ${m.name || "ammunition"}`} value={m.amount ?? 1} min={0} onValid={(v) => { onEdit((d) => void (d.mounts.find((x) => x.id === m.id)!.amount = v ?? 1), `amount-${m.id}`); }} />
                  )}
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Replace ${m.name || "item"}`} onClick={() => { setPicking({ replace: m.id }); }}>Replace</button>
                  <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${m.name || "item"}`} onClick={() => { onEdit((d) => void (d.mounts = d.mounts.filter((x) => x.id !== m.id))); }}>Remove</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p>
        <button type="button" className="bt-button" onClick={() => { setPicking({}); }}>Add equipment</button>
      </p>
      {picking && <VehiclePicker source={vehiclePickerSource(record, catalog)} title={picking.replace === undefined ? "Add equipment" : "Replace equipment"} current={record.mounts.find((m) => m.id === picking.replace)?.equipmentId ?? undefined} onChoose={choose} onClose={() => { setPicking(undefined); }} />}
    </section>
  );
}
