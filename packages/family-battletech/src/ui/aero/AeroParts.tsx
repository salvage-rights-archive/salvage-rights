// The editor's panels for the unit's own figures: identity, engine and thrust, structure and fuel, armor and heat sinks. Each shows only
// what the unit's edition builds (hide, do not mark): a part the edition does not offer is not in the selector, unless the unit already
// holds it, and then it stays listed and the rules check reports it. Every derived figure comes from rules/aero.ts and is left out where
// the edition prints none.
import { ENGINE_TYPES } from "../../data/chassis";
import { DEFAULT_AERO_EDITION, FIGHTER_FIGURES, aeroTypesFor, fighterArmorTypes, figureOf, kindFigureOf } from "../../data/aero";
import { ERAS } from "../../data/editions";
import { setEra, setYear } from "../../rules/availability";
import {
  aeroLocationName,
  controlTons,
  craftArmor,
  craftControlTons,
  craftEngineTons,
  craftFuelPoints,
  craftHeat,
  craftKind,
  craftMaxThrust,
  craftPumpTons,
  craftSI,
  craftSiRange,
  craftSiTons,
  engineRating,
  fighterArmor,
  fighterEngineTons,
  fighterHeat,
  fighterKind,
  fighterSI,
  fuelPoints,
  hardpoints,
  locationsOf,
  maxThrust,
} from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import { aeroLowestLevel } from "../../rules/aero-checks";
import type { Catalog } from "../../rules/catalog";
import { levelRow } from "../../rules/levels";
import { own, tidy } from "../../rules/walk";
import LevelSelect from "../editor/LevelSelect";
import { armorLocations, syncArmorLocations, techBasesFor, typeReady, typeRow, weightHint } from "./edit";
import type { AeroOnEdit } from "./edit";
import { NumberField, SelectField, TextField, fieldId } from "./fields";

const AT1 = "aerotech-1986";
const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
const TECH_BASE_LABELS: Record<string, string> = { "inner-sphere": "Inner Sphere", clan: "Clan", mixed: "Mixed" };
const ERA_CHOICES = [{ value: "", label: "Any era" }, ...ERAS.map((era) => ({ value: era.id, label: `${era.name} (${String(era.startYear)}${era.endYear === undefined ? " on" : `-${String(era.endYear)}`})` }))];
const titleCase = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);

/** A short list of derived figures, each a sentence, in the panel's own words. */
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
  record: AeroRecord;
  onEdit: AeroOnEdit;
}

export function IdentityPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const edition = record.editionId;
  const row = typeRow(edition, record.unitType);
  const types = aeroTypesFor(edition).map((t) => ({ value: t.type, label: typeReady(edition, t.type) || t.type === record.unitType ? t.label : `${t.label} (not built yet)`, disabled: !typeReady(edition, t.type) && t.type !== record.unitType }));
  const hasShape = record.unitType === "small-craft" || record.unitType === "dropship";
  const current = edition === DEFAULT_AERO_EDITION;
  const lowest = current ? aeroLowestLevel(record, catalog) : undefined;
  return (
    <section className="bt-panel" aria-labelledby="aero-identity">
      <h2 id="aero-identity">Identity</h2>
      <div className="bt-grid">
        <TextField
          id="field-name"
          label="Name"
          value={record.name.chassis}
          onChange={(v) => {
            onEdit((d) => void (d.name.chassis = v), "name");
          }}
        />
        <TextField
          id="field-name-model"
          label="Model"
          value={record.name.model}
          onChange={(v) => {
            onEdit((d) => void (d.name.model = v), "name-model");
          }}
        />
        <SelectField
          id="field-unitType"
          label="Type"
          value={record.unitType}
          options={types}
          hint={row ? `${row.cite}.${typeReady(edition, record.unitType) ? "" : " The construction steps for this type are not in the app yet, so only its identity is kept."}` : undefined}
          className="bt-level"
          onChange={(v) => {
            onEdit((d) => {
              d.unitType = v;
              const shaped = v === "small-craft" || v === "dropship";
              if (shaped) d.shape ??= "aerodyne";
              else {
                delete d.shape;
                delete d.use;
              }
              if (v !== "dropship") delete d.use;
              syncArmorLocations(d);
            });
          }}
        />
        {hasShape && (
          <SelectField
            id="field-shape"
            label="Shape"
            value={record.shape ?? "aerodyne"}
            options={[
              { value: "aerodyne", label: "Aerodyne" },
              { value: "spheroid", label: "Spheroid" },
            ]}
            onChange={(v) => {
              onEdit((d) => {
                d.shape = v === "spheroid" ? "spheroid" : "aerodyne";
                syncArmorLocations(d);
              });
            }}
          />
        )}
        {record.unitType === "dropship" && (
          <SelectField
            id="field-use"
            label="Use"
            value={record.use ?? "civilian"}
            options={[
              { value: "civilian", label: "Civilian" },
              { value: "military", label: "Military" },
            ]}
            onChange={(v) => {
              onEdit((d) => void (d.use = v === "military" ? "military" : "civilian"));
            }}
          />
        )}
        <SelectField
          id="field-techBase"
          label="Tech base"
          value={record.techBase}
          options={techBasesFor(edition, record.techBase).map((id) => ({ value: id, label: TECH_BASE_LABELS[id] ?? id }))}
          onChange={(v) => {
            onEdit((d) => void (d.techBase = v === "clan" || v === "mixed" ? v : "inner-sphere"));
          }}
        />
        <NumberField
          id="field-year"
          label="Year"
          value={record.year}
          allowEmpty
          onValid={(v) => {
            onEdit((d) => {
              setYear(d, v);
            }, "year");
          }}
        />
        <SelectField
          id="field-era"
          label="Era"
          value={record.era ?? ""}
          options={ERA_CHOICES}
          onChange={(v) => {
            onEdit((d) => {
              setEra(d, v);
            });
          }}
        />
        <NumberField
          id="field-tons"
          label="Tons"
          value={record.tons}
          min={0}
          hint={weightHint(row?.weight)}
          onValid={(v) => {
            onEdit((d) => void (d.tons = v ?? d.tons), "tons");
          }}
        />
        {current && (
          <LevelSelect
            record={record}
            onChange={(level) => {
              onEdit((d) => void (d.rulesLevel = level));
            }}
          />
        )}
      </div>
      {lowest !== undefined && <p className="bt-hint">{`The lowest rules level that fits everything on the unit: ${levelRow(lowest).label}.`}</p>}
    </section>
  );
}

/** Thrust, the engine, structure and fuel, where the unit's edition builds the unit. */
export function EnginePanel({ record, onEdit }: PartProps) {
  const edition = record.editionId;
  const fighter = fighterKind(record);
  const craft = craftKind(record);
  if (fighter === undefined && craft === undefined) return null;
  const at1 = edition === AT1;
  const rating = fighter ? engineRating(record) : null;
  const engineTons = fighter ? fighterEngineTons(record) : craftEngineTons(record);
  const max = fighter ? maxThrust(record) : craftMaxThrust(record);
  const siRange = craft ? craftSiRange(record) : null;
  const si = fighter ? fighterSI(record) : craftSI(record);
  const engines = fighter ? (kindFigureOf(FIGHTER_FIGURES.engineTypes, fighter, edition) ?? []) : [];
  const engineOptions = [...engines.filter((id) => record.techBase === "mixed" || !own(ENGINE_TYPES.types, id) || ENGINE_TYPES.types[id]?.techBase === undefined || ENGINE_TYPES.types[id]?.techBase === record.techBase), record.engine.type]
    .filter((id, index, all) => all.indexOf(id) === index)
    .map((id) => ({ value: id, label: ENGINE_TYPES.types[id]?.name ?? id }));
  const points = fighter ? fuelPoints(record) : craftFuelPoints(record);
  const lot = figureOf(FIGHTER_FIGURES.fuelLot, edition);
  return (
    <section className="bt-panel" aria-labelledby="aero-engine">
      <h2 id="aero-engine">Engine, structure and fuel</h2>
      <div className="bt-grid">
        <NumberField
          id="field-thrust"
          label={at1 ? "Thrust" : "Safe Thrust"}
          value={record.thrust.safe}
          min={0}
          onValid={(v) => {
            onEdit((d) => void (d.thrust.safe = v ?? 0), "thrust");
          }}
        />
        {fighter && (
          <SelectField
            id="field-engine"
            label="Engine type"
            value={record.engine.type}
            options={engineOptions}
            onChange={(v) => {
              onEdit((d) => void (d.engine.type = v));
            }}
          />
        )}
        {craft && siRange && (
          <NumberField
            id="field-si"
            label="Structural Integrity"
            value={si}
            allowEmpty
            hint={`${num(siRange.min)} to ${num(siRange.max)}; left empty it is the least`}
            onValid={(v) => {
              onEdit((d) => {
                if (v === null) delete d.si;
                else d.si = v;
              }, "si");
            }}
          />
        )}
        <NumberField
          id="field-fuelTons"
          label="Fuel tons"
          value={record.fuelTons}
          min={0}
          hint={lot === undefined ? undefined : `sold in lots of ${plural(lot, "ton")}`}
          onValid={(v) => {
            onEdit((d) => void (d.fuelTons = v ?? 0), "fuelTons");
          }}
        />
      </div>
      <Readout
        lines={[
          max === null ? undefined : `${at1 ? "Overthrust" : "Max Thrust"} ${num(max)}`,
          rating === null ? undefined : `Engine rating ${num(rating)}`,
          engineTons === null ? undefined : `Engine weight ${plural(engineTons, "ton")}`,
          fighter && si !== null ? `Structural Integrity ${num(si)}, from the thrust and the tons` : undefined,
          fighter ? (controlTons(record) === null ? undefined : `Cockpit and controls ${plural(controlTons(record) ?? 0, "ton")}`) : craftControlTons(record) === null ? undefined : `Controls ${plural(craftControlTons(record) ?? 0, "ton")}`,
          craft && craftSiTons(record) !== null ? `Structure ${plural(craftSiTons(record) ?? 0, "ton")}` : undefined,
          craft && craftPumpTons(record) !== null ? `Fuel pumps ${plural(craftPumpTons(record) ?? 0, "ton")}` : undefined,
          points === null ? undefined : `Fuel ${plural(points, "point")}`,
          fighter && hardpoints(record) !== undefined ? `External stores hardpoints ${num(hardpoints(record) ?? 0)}` : undefined,
        ]}
      />
    </section>
  );
}

/** Armor type, tons and the points on each location the edition gives the unit. */
export function ArmorPanel({ record, onEdit }: PartProps) {
  const edition = record.editionId;
  const fighter = fighterKind(record);
  const craft = craftKind(record);
  if (fighter === undefined && craft === undefined) return null;
  const known = locationsOf(record).armor;
  const locations = armorLocations(record, known);
  const types = fighterArmorTypes(edition)
    .filter((t) => record.techBase === "mixed" || t.techBase === "both" || t.techBase === record.techBase || t.id === record.armor.type)
    .map((t) => ({ value: t.id, label: t.name }));
  const armor = fighter ? fighterArmor(record) : craftArmor(record);
  const craftFigures = craft ? craftArmor(record) : null;
  return (
    <section className="bt-panel" aria-labelledby="aero-armor">
      <h2 id="aero-armor">Armor</h2>
      <div className="bt-grid">
        <SelectField
          id="field-armor-type"
          label="Armor type"
          value={record.armor.type}
          options={types}
          onChange={(v) => {
            onEdit((d) => void (d.armor.type = v));
          }}
        />
        <NumberField
          id="field-armor-tons"
          label="Armor tons"
          value={record.armor.tons}
          min={0}
          hint={armor?.bought === null || armor === null ? undefined : `${plural(armor.bought ?? 0, "point")}`}
          onValid={(v) => {
            onEdit((d) => void (d.armor.tons = v ?? 0), "armor-tons");
          }}
        />
      </div>
      <fieldset className="bt-arm">
        <legend>Armor points on each location</legend>
        <div className="bt-grid">
          {locations.map((loc) => (
            <NumberField
              key={loc}
              id={fieldId(`armor-${loc}`)}
              label={aeroLocationName(loc)}
              name={`${aeroLocationName(loc)} armor points`}
              value={record.armor.points[loc] ?? 0}
              min={0}
              hint={known.includes(loc) ? undefined : "this edition has no such location"}
              onValid={(v) => {
                onEdit((d) => void (d.armor.points[loc] = v ?? 0), `armor-${loc}`);
              }}
            />
          ))}
        </div>
      </fieldset>
      <Readout
        lines={[
          armor === null ? undefined : `${num(armor.allocated)} points set${armor.available === null ? "" : ` of ${num(armor.available)}`}${armor.free > 0 ? `, ${num(armor.free)} of them free` : ""}`,
          armor?.over !== null && armor?.over !== undefined && armor.over > 0 ? `${num(armor.over)} points over what the armor gives` : undefined,
          craftFigures?.limitTons === null || craftFigures === null ? undefined : `At most ${plural(craftFigures.limitTons, "ton")} of armor for this structure`,
        ]}
      />
    </section>
  );
}

/** Heat sink type and the sinks added to the engine's free ones. */
export function HeatPanel({ record, onEdit }: PartProps) {
  const edition = record.editionId;
  const fighter = fighterKind(record);
  const craft = craftKind(record);
  if (fighter === undefined && craft === undefined) return null;
  const heat = fighter ? fighterHeat(record) : craftHeat(record);
  const kinds = kindFigureOf(FIGHTER_FIGURES.heatSinkTypes, fighter ?? "aerospace", edition) ?? ["single", "double"];
  const options = [...kinds, record.heatSinks.type].filter((id, index, all) => all.indexOf(id) === index).map((id) => ({ value: id, label: `${titleCase(id)}` }));
  return (
    <section className="bt-panel" aria-labelledby="aero-heat">
      <h2 id="aero-heat">Heat sinks</h2>
      <div className="bt-grid">
        <SelectField
          id="field-heatSinks"
          label="Heat sink type"
          value={record.heatSinks.type}
          options={options}
          onChange={(v) => {
            onEdit((d) => void (d.heatSinks.type = v));
          }}
        />
        <NumberField
          id="field-heatSinks-count"
          label="Added heat sinks"
          value={record.heatSinks.count}
          min={0}
          onValid={(v) => {
            onEdit((d) => void (d.heatSinks.count = v ?? 0), "heat-count");
          }}
        />
      </div>
      <Readout lines={heat === null ? [] : [`${num(heat.free)} free with the engine, ${num(heat.total)} in all, taking away ${num(heat.capacity)} heat`]} />
    </section>
  );
}

/** The weight of every part, as a list the header's toggle opens. */
export function WeightLines({ lines }: { lines: { label: string; tons: number }[] }) {
  return (
    <ul id="aero-weight-lines" className="bt-weight">
      {lines.map((line) => (
        <li key={line.label}>{`${line.label}: ${plural(line.tons, "ton")}`}</li>
      ))}
    </ul>
  );
}
