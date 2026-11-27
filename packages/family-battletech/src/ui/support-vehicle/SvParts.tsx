// The Support Vehicle editor's panels: identity, chassis, engine and fuel, armor, crew, heat sinks and equipment. Each shows only what the unit's rules level, tech base,
// year and motive type offer (hide, do not mark): a part the unit already holds stays listed, and the rules check reports it. Every derived figure comes from
// rules/support-vehicle and is shown as a sentence in the panel's own words.
import { useState } from "react";
import { bookName, eraLabel } from "../../data/editions";
import { CLASSIC } from "../../data/rulesets";
import { SV_PAGES, SV_FIRE_CONTROL, TECH_LEVEL_TEXT, TECH_RATINGS, svEngineOf, svMotiveOf } from "../../data/support-vehicle";
import { eraNeedsPick, erasOfYear, eraOfRecord, setEra, setYear } from "../../rules/availability";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { DEFAULT_LEVEL, techBaseChoices } from "../../rules/levels";
import { chosenMunition, munitionShort, reloadCost } from "../../rules/munitions";
import { barChoices, engineChoices, modChoices, motiveChoices } from "../../rules/support-vehicle/availability";
import {
  amplifierTons, armorCell, armorLocations, armorSlots, armorTons, assignedArmor, baseSlots, canHaveTurret, crewTally, energyHeat, engineMinimumNote, engineRating, engineTons, flankMP, fuelPercent, fuelPoints, fuelPointKg, fuelTonsForRange, isAir, isSmall, itemFacts, maxArmorPoints, maxTonsOf, minRatingOf,
  mountLocations, needsFuel, pointsPerTon, rangeKm, sizeOf, slotTally, structuralIntegrity, structurePoints, structureTons, svLocationName, weightRowOf,
} from "../../rules/support-vehicle/sv";
import type { SupportVehicleRecord } from "../../rules/support-vehicle/sv";
import { tidy } from "../../rules/walk";
import LevelSelect from "../editor/LevelSelect";
import { NumberField, SelectField, TextField } from "../aero/fields";
import VehiclePicker, { describeRow } from "../vehicle/VehiclePicker";
import type { PickerSource } from "../vehicle/VehiclePicker";
import { mountFor, munitionChoices, offeredEquipment, strayLocations, syncArmorLocations } from "./edit";
import type { SvOnEdit } from "./edit";
import SvDiagram from "./SvDiagram";

const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const tonsText = (n: number): string => (n < 1 && n > 0 ? `${num(n * 1000)} kg` : plural(n, "ton"));
export const mountDomId = (id: string): string => `sv-mount-${id}`;
export const locationFieldId = (code: string): string => `field-armor-${code}`;

function Readout({ lines }: { lines: (string | undefined)[] }) {
  const shown = lines.filter((line): line is string => line !== undefined);
  if (shown.length === 0) return null;
  return (
    <ul className="bt-list bt-readout">
      {shown.map((line, i) => (
        <li key={`${String(i)}-${line}`} className="bt-hint">
          {line}
        </li>
      ))}
    </ul>
  );
}

interface PartProps {
  record: SupportVehicleRecord;
  onEdit: SvOnEdit;
}

export function IdentityPanel({ record, onEdit }: PartProps) {
  const level = record.rulesLevel ?? DEFAULT_LEVEL;
  const row = svMotiveOf(record.motive);
  const yearEras = erasOfYear(record.year, CLASSIC);
  const above = level !== "introductory";
  const max = maxTonsOf(record);
  const weights = weightRowOf(record);
  return (
    <section className="bt-panel" aria-labelledby="sv-identity">
      <h2 id="sv-identity">Identity</h2>
      <div className="bt-grid">
        <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { onEdit((d) => void (d.name.chassis = v), "name"); }} />
        <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { onEdit((d) => void (d.name.model = v), "name-model"); }} />
        <SelectField
          id="field-motive"
          label="Type"
          value={record.motive}
          options={motiveChoices(record).map(([value, label]) => ({ value, label }))}
          hint={row ? `Support Vehicle, ${row.label}, up to ${String(max ?? row.maxTons)} tons. ${bookName(SV_PAGES.motives.book)}, p. ${String(SV_PAGES.motives.page)}.` : undefined}
          className="bt-level"
          onChange={(v) => {
            onEdit((d) => {
              d.motive = v;
              // A motive type's own engine rules: pick one it may use, and a speed it can have.
              const air = svMotiveOf(v)?.air === true;
              if (air && d.cruise > 2 && v === "airship") d.cruise = 2;
              if (v === "fixed-wing" && !Number.isInteger(d.cruise)) d.cruise = Math.ceil(d.cruise);
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
          options={techBaseChoices(record.rulesLevel, record.techBase, record).map(([value, label]) => ({ value, label }))}
          onChange={(v) => { onEdit((d) => void (d.techBase = v === "clan" || v === "mixed" ? v : "inner-sphere")); }}
        />
        <NumberField
          id="field-tons"
          label="Tons"
          value={record.tons}
          min={0.1}
          hint={`${sizeOf(record) === "small" ? "Small, weighed to the kilogram (0.001 ton)" : "Half tons"}${max === undefined ? "" : `, up to ${String(max)}`}.`}
          onValid={(v) => { onEdit((d) => { d.tons = v ?? d.tons; syncArmorLocations(d); }, "tons"); }}
        />
      </div>
      <Readout lines={[weights === undefined ? "The Master Support Vehicle Weight Table has no row for this motive type and weight." : `Size class ${sizeOf(record)}: base chassis value ${num(weights.chassis)}, base engine value ${num(weights.engine)}, at least Tech Rating ${weights.minRating}; ${plural(baseSlots(record), "item slot")}.`]} />
    </section>
  );
}

export function ChassisPanel({ record, onEdit }: PartProps) {
  const min = minRatingOf(record);
  const chassis = structureTons(record);
  const si = structuralIntegrity(record);
  const mods = modChoices(record);
  return (
    <section className="bt-panel" aria-labelledby="sv-chassis">
      <h2 id="sv-chassis">Chassis</h2>
      <div className="bt-grid">
        <SelectField
          id="field-structure-rating"
          label="Structural Tech Rating"
          value={record.structure.rating}
          options={TECH_RATINGS.filter((letter) => min === undefined || letter >= min || letter === record.structure.rating).map((letter) => ({ value: letter, label: `${letter}: ${TECH_LEVEL_TEXT[letter]}` }))}
          hint="A higher rating makes the chassis lighter."
          onChange={(v) => { onEdit((d) => void (d.structure.rating = v)); }}
        />
        {canHaveTurret(record) && (
          <label className="bt-check bt-grid__wide" htmlFor="field-turret">
            <input id="field-turret" type="checkbox" checked={record.turret} onChange={(event) => { onEdit((d) => { d.turret = event.target.checked; syncArmorLocations(d); }); }} />
            Turret (one, in its own location)
          </label>
        )}
      </div>
      <fieldset className="bt-fieldset">
        <legend>Chassis modifications</legend>
        {mods.length === 0 ? <p>None fit this unit.</p> : (
          <ul className="bt-list">
            {mods.map((mod) => {
              const raisesRating = min !== undefined && mod.minRating > (record.structure.rating as string) && !record.structure.mods.includes(mod.id);
              return (
                <li key={mod.id}>
                  <label className="bt-check" htmlFor={`field-mod-${mod.id}`}>
                    <input
                      id={`field-mod-${mod.id}`}
                      type="checkbox"
                      checked={record.structure.mods.includes(mod.id)}
                      onChange={(event) => {
                        onEdit((d) => {
                          d.structure.mods = event.target.checked ? [...d.structure.mods, mod.id] : d.structure.mods.filter((id) => id !== mod.id);
                          if (event.target.checked && d.structure.rating < mod.minRating) d.structure.rating = mod.minRating;
                          syncArmorLocations(d);
                        });
                      }}
                    />
                    {`${mod.label} (x ${num(mod.multiplier)}, Tech Rating ${mod.minRating} or better)`}
                  </label>
                  <span className="bt-hint">{` ${mod.effect}${raisesRating ? ` Choosing it raises the structural rating to ${mod.minRating}.` : ""}`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
      <Readout
        lines={[
          chassis === null ? "We cannot work out the chassis weight for these figures." : `The chassis weighs ${tonsText(chassis)}.`,
          si === null ? `${plural(structurePoints(record), "structure point")} in each location.` : `Structural integrity ${String(si)}.`,
        ]}
      />
    </section>
  );
}

export function EnginePanel({ record, onEdit }: PartProps) {
  const air = isAir(record);
  const weight = engineTons(record);
  const engine = svEngineOf(record.engine.type);
  const note = engineMinimumNote(record);
  const fuel = needsFuel(record);
  const range = rangeKm(record);
  const points = fuelPoints(record);
  const percent = fuelPercent(record);
  const wanted = (km: number) => fuelTonsForRange(record, km);
  return (
    <section className="bt-panel" aria-labelledby="sv-engine">
      <h2 id="sv-engine">Engine and fuel</h2>
      <div className="bt-grid">
        <NumberField id="field-cruise" label={air ? "Safe Thrust" : "Cruising MP"} value={record.cruise} min={air && record.motive === "airship" ? 0.25 : 1} hint={record.motive === "airship" ? "At most 2, in steps of a quarter." : undefined} onValid={(v) => { onEdit((d) => void (d.cruise = v ?? d.cruise), "cruise"); }} />
        <SelectField
          id="field-engine"
          label="Engine"
          value={record.engine.type}
          options={[...engineChoices(record).map(([value, label]) => ({ value, label })), ...(record.structure.mods.includes("trailer") || record.engine.type === "none" ? [{ value: "none", label: "None (a trailer)" }] : [])]}
          onChange={(v) => { onEdit((d) => void (d.engine.type = v)); }}
        />
        <SelectField
          id="field-engine-rating"
          label="Engine Tech Rating"
          value={record.engine.rating}
          options={TECH_RATINGS.filter((letter) => engine === undefined || engine.multiplier["ABCDEF".indexOf(letter)] !== null || letter === record.engine.rating).map((letter) => ({ value: letter, label: letter }))}
          hint="A rating above the chassis's raises the unit's overall Tech Rating."
          onChange={(v) => { onEdit((d) => void (d.engine.rating = v)); }}
        />
        {record.engine.type === "ice" && (
          <label className="bt-check bt-grid__wide" htmlFor="field-alternate-fuel">
            <input id="field-alternate-fuel" type="checkbox" checked={record.engine.alternateFuel === true} onChange={(event) => { onEdit((d) => { if (event.target.checked) d.engine.alternateFuel = true; else delete d.engine.alternateFuel; }); }} />
            Runs on alcohol or natural gas
          </label>
        )}
        <NumberField id="field-fuelTons" label="Fuel, tons" value={record.fuelTons} min={0} hint={isSmall(record) ? "To the kilogram." : "In half tons."} onValid={(v) => { onEdit((d) => void (d.fuelTons = v ?? 0), "fuelTons"); }} />
      </div>
      <Readout
        lines={[
          `${air ? "Maximum Thrust" : "Flank MP"} ${num(flankMP(record))}. Engine rating ${String(engineRating(record))}.`,
          weight === null ? "We cannot work out the engine weight for these figures." : `The engine weighs ${tonsText(weight)}.`,
          note,
          !fuel ? "This engine burns no fuel." : air ? `${plural(points ?? 0, "Fuel Point")} (${String(fuelPointKg(record) ?? "?")} kg each).` : range === null ? undefined : `A range of ${String(range)} km${percent === null ? "" : ` (${num(percent)} percent of the engine's weight for each 100 km; ${num(wanted(500) ?? 0)} tons for 500 km)`}.`,
        ]}
      />
    </section>
  );
}

export function ArmorPanel({ record, onEdit, selected, onSelect }: PartProps & { selected?: string; onSelect: (code: string) => void }) {
  const here = armorLocations(record);
  const assigned = assignedArmor(record);
  const extra = Object.entries(record.armor.points).filter(([loc, n]) => !here.includes(loc) && n !== 0).map(([loc]) => loc);
  const max = maxArmorPoints(record);
  const cell = armorCell(record.armor.bar, record.armor.rating);
  const weight = armorTons(record);
  const slots = armorSlots(record);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="sv-armor">
      <h2 id="sv-armor">Armor</h2>
      <div className="bt-grid">
        <SelectField id="field-armor-bar" label="Barrier Armor Rating (BAR)" value={String(record.armor.bar)} options={barChoices(record).map((bar) => ({ value: String(bar), label: `BAR ${String(bar)}` }))} onChange={(v) => { onEdit((d) => void (d.armor.bar = Number(v))); }} />
        <SelectField id="field-armor-rating" label="Armor Tech Rating" value={record.armor.rating} options={TECH_RATINGS.map((letter) => ({ value: letter, label: letter }))} onChange={(v) => { onEdit((d) => void (d.armor.rating = v)); }} />
        {[...here, ...extra].map((loc) => (
          <NumberField
            key={loc}
            id={locationFieldId(loc)}
            label={`${svLocationName(loc, record)} armor`}
            value={record.armor.points[loc] ?? 0}
            min={0}
            hint={loc === "rot" ? "A rotor holds 2 points at most." : undefined}
            onValid={(v) => { onEdit((d) => void (d.armor.points[loc] = v ?? 0), `armor-${loc}`); }}
          />
        ))}
      </div>
      <Readout
        lines={[
          cell === undefined ? "The table has no armor of this BAR at this Tech Rating." : `${num(cell.kg)} kg a point${cell.armoredOnly === true ? " (needs the Armored chassis modification)" : ""}; ${plural(pointsPerTon(record) ?? 0, "point")} a ton.`,
          weight === null ? undefined : `${plural(assigned, "point")} assigned weigh ${tonsText(weight)}; the most this unit may mount is ${max === null ? "not known" : String(max)}.`,
          slots > 0 ? `BAR 10 armor at this rating takes ${plural(slots, "item slot")}.` : undefined,
        ]}
      />
      <p className="bt-hint">{isAir(record) ? "An air unit's structure is its structural integrity; the drawing shows its armor areas." : "Pick a location in the drawing to go to its field."}</p>
      <div className="bt-vehicle-doll">
        <SvDiagram record={record} use="armor" {...(isAir(record) ? {} : { onSelect })} {...(selected === undefined ? {} : { selected })} />
      </div>
    </section>
  );
}

export function CrewPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const crew = crewTally(record, catalog);
  return (
    <section className="bt-panel" aria-labelledby="sv-crew">
      <h2 id="sv-crew">Crew and fire control</h2>
      <div className="bt-grid">
        <SelectField
          id="field-fireControl"
          label="Fire control"
          value={record.fireControl}
          options={[{ value: "none", label: "None (+2 to hit)" }, { value: "basic", label: "Basic (+1 to hit)" }, { value: "advanced", label: "Advanced (+0 to hit)" }]}
          hint={`Basic weighs ${String(SV_FIRE_CONTROL.weight.basic * 100)} percent and advanced ${String(SV_FIRE_CONTROL.weight.advanced * 100)} percent of the weapons; both cut the gunners.`}
          onChange={(v) => { onEdit((d) => void (d.fireControl = v === "basic" || v === "advanced" ? v : "none")); }}
        />
        <NumberField id="field-extraCrew" label="Extra crew" value={record.extraCrew} min={0} hint="Beyond the minimum below." onValid={(v) => { onEdit((d) => void (d.extraCrew = v ?? 0), "extraCrew"); }} />
      </div>
      <Readout lines={[`Minimum crew ${String(crew.minimum)}: ${String(crew.base)} base, ${String(crew.nonGunners)} for communications, kitchen and medical gear, ${String(crew.gunners)} gunners, ${String(crew.officers)} officers. The unit carries ${String(crew.crew)}.`]} />
    </section>
  );
}

export function HeatPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const heat = energyHeat(record, catalog);
  const amps = amplifierTons(record, catalog);
  return (
    <section className="bt-panel" aria-labelledby="sv-heat">
      <h2 id="sv-heat">Heat sinks</h2>
      <div className="bt-grid">
        <NumberField id="field-heatSinks" label="Heat sinks" value={record.heatSinks.count} min={0} hint="Each weighs a ton and takes no slot; no engine gives any free." onValid={(v) => { onEdit((d) => void (d.heatSinks.count = v ?? 0), "heatSinks"); }} />
      </div>
      <Readout lines={[`Heavy energy weapons fired together make ${plural(heat, "point")} of heat.`, amps > 0 ? `Power amplifiers: ${plural(amps, "ton")}.` : undefined]} />
    </section>
  );
}

/** The picker's source: the rows on offer, each with its weight and Support Vehicle slots. */
export function svPickerSource(record: SupportVehicleRecord, catalog: Catalog): PickerSource {
  return {
    offered: (everything, keep) => offeredEquipment(record, catalog, everything, keep),
    describe: (row: EquipmentRow) => {
      const facts = itemFacts({ id: "trial", equipmentId: row.id, name: row.name, location: "body" }, record, catalog);
      const size =
        row.kind === "ammunition" ? "1 slot, any weight from a ton (half a ton for machine guns)"
        : row.infantry !== undefined ? `${num((facts.tons ?? 0) * 1000)} kg, 1 slot`
        : facts.tons === null ? "weight not known"
        : `${tonsText(facts.tons)}, ${plural(facts.slots, "slot")}`;
      return describeRow(row, size);
    },
    everythingHint: "Showing every item printed for Support Vehicles of this size, whatever its tech base or era. Items above the unit's rules level stay hidden.",
  };
}

/** One weapon, ammunition bin or other item on the unit. */
export function EquipmentPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const [picking, setPicking] = useState<{ replace?: string } | undefined>();
  const places = mountLocations(record);
  const strays = strayLocations(record, places);
  const slots = slotTally(record, catalog);
  const small = isSmall(record);
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
    <section className="bt-panel bt-editor__wide" id="sv-equipment" aria-labelledby="sv-equipment-heading">
      <h2 id="sv-equipment-heading">Weapons and equipment</h2>
      <p className="bt-hint">{`${String(slots.used)} of ${String(slots.available)} item slots used. Each item takes the slots the Support Vehicle column of the weapons and equipment tables gives; ammunition goes in a bin of any weight.${small ? " A Small unit mounts Light and Medium (infantry table) weapons only." : ""}`}</p>
      {record.mounts.length === 0 ? <p>No equipment yet.</p> : (
        <ul className="bt-list bt-mounts">
          {record.mounts.map((m) => {
            const facts = itemFacts(m, record, catalog);
            const choices = facts.row === undefined ? [] : munitionChoices(record, catalog, facts.row, m.munition);
            const chosen = chosenMunition(facts.row, m.munition, catalog, record.editionId);
            const reload = reloadCost(chosen);
            const sized = facts.row?.amount !== undefined;
            return (
              <li key={m.id} id={mountDomId(m.id)} tabIndex={-1} className="bt-row">
                <span className="bt-row__text">
                  <strong>{m.name || "Unnamed item"}</strong>
                  <span className="bt-row__credit">{facts.tons === null ? "weight not known" : `${tonsText(facts.tons * facts.qty)}, ${plural(facts.slots, "slot")}`}{facts.heat > 0 ? `, heat ${String(facts.heat)}` : ""}</span>
                  {chosen !== undefined && <span className="bt-row__credit">{`${munitionShort(chosen)}${reload === undefined ? "" : `: two shots cost ${reload.toLocaleString("en-US")} C-bills to replace, not counted in the unit's cost`}.`}</span>}
                </span>
                <span className="bt-row__actions bt-vehicle-mount">
                  <SelectField
                    id={`${mountDomId(m.id)}-loc`}
                    label={`Location of ${m.name || "item"}`}
                    value={m.location}
                    options={[...places, ...strays].map((code) => ({ value: code, label: svLocationName(code, record) }))}
                    onChange={(v) => { onEdit((d) => void (d.mounts.find((x) => x.id === m.id)!.location = v)); }}
                  />
                  <NumberField id={`${mountDomId(m.id)}-qty`} label={`How many ${m.name || "items"}`} value={m.qty ?? 1} min={1} onValid={(v) => { onEdit((d) => { const at = d.mounts.find((x) => x.id === m.id); if (at) { if (v === null || v === 1) delete at.qty; else at.qty = Math.floor(v); } }, `qty-${m.id}`); }} />
                  {choices.length > 0 && (
                    <SelectField
                      id={`${mountDomId(m.id)}-munition`}
                      label={`${facts.row?.id.startsWith("vehicular-mine") === true ? "Mine type" : "Grenade type"} of ${m.name || "item"}`}
                      value={chosen?.id ?? ""}
                      options={choices.map((c) => ({ value: c.id, label: munitionShort(c) }))}
                      onChange={(v) => { onEdit((d) => { const at = d.mounts.find((x) => x.id === m.id); if (at) at.munition = v; }); }}
                    />
                  )}
                  {(facts.ammo || sized) && (
                    <NumberField id={`${mountDomId(m.id)}-tons`} label={`Tons of ${m.name || "item"}`} value={m.amount ?? 1} min={0} onValid={(v) => { onEdit((d) => void (d.mounts.find((x) => x.id === m.id)!.amount = v ?? 1), `amount-${m.id}`); }} />
                  )}
                  {facts.infantry && (
                    <NumberField id={`${mountDomId(m.id)}-clips`} label={`Clips of ${m.name || "weapon"}`} value={m.amount ?? 1} min={1} hint="The first clip is free." onValid={(v) => { onEdit((d) => void (d.mounts.find((x) => x.id === m.id)!.amount = Math.max(1, Math.floor(v ?? 1))), `clips-${m.id}`); }} />
                  )}
                  {small && facts.weapon && (
                    <label className="bt-check" htmlFor={`${mountDomId(m.id)}-pintle`}>
                      <input id={`${mountDomId(m.id)}-pintle`} type="checkbox" checked={m.pintle === true} onChange={(event) => { onEdit((d) => { const at = d.mounts.find((x) => x.id === m.id); if (at) { if (event.target.checked) at.pintle = true; else delete at.pintle; } }); }} />
                      {`Pintle mount for ${m.name || "weapon"}`}
                    </label>
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
      {picking && <VehiclePicker source={svPickerSource(record, catalog)} title={picking.replace === undefined ? "Add equipment" : "Replace equipment"} current={record.mounts.find((m) => m.id === picking.replace)?.equipmentId ?? undefined} onChoose={choose} onClose={() => { setPicking(undefined); }} />}
    </section>
  );
}
