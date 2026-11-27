// The editor's panels for the unit's own figures: identity, engine and thrust, structure and fuel, armor and heat sinks. Each shows only
// what the unit's edition builds (hide, do not mark): a part the edition does not offer is not in the selector, unless the unit already
// holds it, and then it stays listed and the rules check reports it. Every derived figure comes from rules/aero.ts and is left out where
// the edition prints none.
import { ENGINE_TYPES } from "../../data/chassis";
import { CAPITAL_ARMOR_TYPES, CAPITAL_FIGURES, CRAFT_FIGURES, DEFAULT_AERO_EDITION, FIGHTER_FIGURES, aeroTypesFor, fighterArmorTypes, fighterPatchworkTypes, figureOf, kindFigureOf } from "../../data/aero";
import { ERAS, SUB_ERAS } from "../../data/editions";
import { eraChoice, eraList, useEraRoom } from "../eraChoice";
import { eraCaptionText } from "../eraCaption";
import { eraNeedsPick, eraOfRecord, eraOutside, erasForTechBase, erasOfYear, resolveEra, setEra, setYear } from "../../rules/availability";
import {
  aeroLocationName,
  armorTypeAt,
  controlTons,
  engineRating,
  fighterArmor,
  fighterArmorTons,
  fighterEngineTons,
  fighterHeat,
  fighterKind,
  fighterPatchworkActive,
  fighterSI,
  fuelPoints,
  hardpoints,
  jumpSail,
  kfDrive,
  locationsOf,
  maxThrust,
  patchworkSlotsAt,
  patchworkTonsAt,
  stationKeeping,
  vessel,
} from "../../rules/aero";
import type { AeroRecord } from "../../rules/aero";
import { aeroLowestLevel, fighterArmorOffered, fighterPatchworkOffered } from "../../rules/aero-checks";
import type { Catalog } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelAtLeast, levelRow } from "../../rules/levels";
import { own, tidy } from "../../rules/walk";
import LevelSelect from "../editor/LevelSelect";
import { armorLocations, setFighterPatchwork, syncArmorLocations, techBaseOptionsFor, typeReady, typeRow, weightHint } from "./edit";
import type { AeroOnEdit } from "./edit";
import { NumberField, SelectField, TextField, fieldId } from "./fields";

const AT1 = "aerotech-1986";
const num = (n: number): string => String(tidy(n));
const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;
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
  const level = record.rulesLevel ?? DEFAULT_LEVEL;
  // Hide, do not mark: what the rules level or the app leaves out is not listed; the unit's own type always is.
  const types = aeroTypesFor(edition)
    .filter((t) => t.type === record.unitType || (typeReady(edition, t.type) && (edition !== DEFAULT_AERO_EDITION || levelAtLeast(level, t.level ?? DEFAULT_LEVEL))))
    .map((t) => ({ value: t.type, label: t.label }));
  const hasShape = record.unitType === "small-craft" || record.unitType === "dropship";
  const current = edition === DEFAULT_AERO_EDITION;
  const lowest = current ? aeroLowestLevel(record, catalog) : undefined;
  // The year sits above the tech base and decides the eras: one era holds it, or two (an Inner Sphere era and a Clan sub-era) and the era is picked. The current
  // rules ask for a year above Introductory; the older books have no levels, so none is asked for there.
  const yearEras = erasOfYear(record.year);
  const room = useEraRoom();
  const eraOptions = [{ value: "", label: yearEras.length > 1 && eraNeedsPick(record) ? "Choose an era" : "Any era" }, ...eraList(erasForTechBase([...ERAS, ...SUB_ERAS], record.techBase, record.rulesLevel), eraOfRecord(record)).map((era) => eraChoice(era, room, eraOutside(era, record.techBase, record.rulesLevel)))];
  const eraNow = eraOfRecord(record);
  const needsYear = current && record.year === null && level !== "introductory";
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
          hint={row ? `${row.cite}.` : undefined}
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
        {current && (
          <LevelSelect
            record={record}
            onChange={(level) => {
              onEdit((d) => void (d.rulesLevel = level));
            }}
          />
        )}
        <div className="bt-grid__wide bt-yearera">
          <NumberField
            id="field-year"
            label="Year"
            value={record.year}
            allowEmpty
            hint={needsYear ? `Needs a year at ${levelRow(level).label} rules: the year sets the era and decides what is offered.` : undefined}
            onValid={(v) => {
              onEdit((d) => {
                setYear(d, v);
              }, "year");
            }}
          />
          <SelectField
            id="field-era"
            label="Era"
            value={yearEras.length > 1 ? (eraNeedsPick(record) ? "" : (eraOfRecord(record)?.id ?? "")) : (eraOfRecord(record)?.id ?? record.era ?? "")}
            options={eraOptions}
            caption={yearEras.length > 1 && eraNeedsPick(record) ? undefined : eraCaptionText(eraNow)}
            hint={yearEras.length > 1 ? `The year ${String(record.year)} is in two eras; the era you choose decides the tech base.` : undefined}
            onChange={(v) => {
              onEdit((d) => {
                setEra(d, v);
              });
            }}
          />
        </div>
        <SelectField
          id="field-techBase"
          label="Tech base"
          value={record.techBase}
          options={techBaseOptionsFor(record).map(([value, label]) => ({ value, label }))}
          onChange={(v) => {
            onEdit((d) => {
              d.techBase = v === "clan" || v === "mixed" ? v : "inner-sphere";
              if (yearEras.length > 1) resolveEra(d);
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
      </div>
      {lowest !== undefined && <p className="bt-hint">{`The lowest rules level that fits everything on the unit: ${levelRow(lowest).label}.`}</p>}
    </section>
  );
}

/** Thrust, the engine, structure and fuel, where the unit's edition builds the unit. */
export function EnginePanel({ record, onEdit }: PartProps) {
  const edition = record.editionId;
  const fighter = fighterKind(record);
  const ship = vessel(record);
  if (fighter === undefined && ship === null) return null;
  const at1 = edition === AT1;
  const capital = ship?.group === "capital";
  const warship = record.unitType === "warship";
  // A JumpShip or station has a station-keeping drive with no thrust to choose; a WarShip chooses a maneuvering drive or, where the edition allows, a station-keeping one.
  const kept = capital && stationKeeping(record);
  const driveChoice = warship && (figureOf(CAPITAL_FIGURES.warshipStationKeeping, edition) === true || record.engine.type === "station-keeping");
  const rating = fighter ? engineRating(record) : null;
  const engineTons = fighter ? fighterEngineTons(record) : (ship?.engineTons ?? null);
  const max = fighter ? maxThrust(record) : (ship?.maxThrust ?? null);
  const siRange = ship?.siRange ?? null;
  const si = fighter ? fighterSI(record) : (ship?.si ?? null);
  const engines = fighter ? (kindFigureOf(FIGHTER_FIGURES.engineTypes, fighter, edition) ?? []) : [];
  const engineOptions = [...engines.filter((id) => record.techBase === "mixed" || !own(ENGINE_TYPES.types, id) || ENGINE_TYPES.types[id]?.techBase === undefined || ENGINE_TYPES.types[id]?.techBase === record.techBase), record.engine.type]
    .filter((id, index, all) => all.indexOf(id) === index)
    .map((id) => ({ value: id, label: ENGINE_TYPES.types[id]?.name ?? id }));
  const driveOptions = [{ value: "standard", label: "Maneuvering drive" }, ...(driveChoice ? [{ value: "station-keeping", label: "Station-keeping drive" }] : [])];
  const points = fighter ? fuelPoints(record) : (ship?.fuelPoints ?? null);
  const lot = figureOf(FIGHTER_FIGURES.fuelLot, edition);
  const towable = ship !== null && figureOf(CRAFT_FIGURES.towingSiShare, edition) !== undefined;
  const kf = capital ? kfDrive(record) : null;
  const sail = capital ? jumpSail(record) : null;
  return (
    <section className="bt-panel" aria-labelledby="aero-engine">
      <h2 id="aero-engine">Engine, structure and fuel</h2>
      <div className="bt-grid">
        {!kept && (
          <NumberField
            id="field-thrust"
            label={at1 ? "Thrust" : "Safe Thrust"}
            value={record.thrust.safe}
            min={0}
            onValid={(v) => {
              onEdit((d) => void (d.thrust.safe = v ?? 0), "thrust");
            }}
          />
        )}
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
        {warship && driveChoice && (
          <SelectField
            id="field-engine"
            label="Drive"
            value={record.engine.type === "station-keeping" ? "station-keeping" : "standard"}
            options={driveOptions}
            hint="Station-keeping: Max Thrust 1, Structural Integrity 1 to 30; the book prints no range for it."
            onChange={(v) => {
              onEdit((d) => void (d.engine.type = v));
            }}
          />
        )}
        {siRange && (
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
        {towable && (
          <label className="bt-check">
            <input
              type="checkbox"
              checked={record.towing === true}
              onChange={(event) => {
                onEdit((d) => {
                  if (event.target.checked) d.towing = true;
                  else delete d.towing;
                });
              }}
            />
            Built to tow other vessels
          </label>
        )}
      </div>
      <Readout
        lines={[
          max === null ? undefined : `${at1 ? "Overthrust" : "Max Thrust"} ${num(max)}`,
          rating === null ? undefined : `Engine rating ${num(rating)}`,
          engineTons === null ? undefined : `Engine weight ${plural(engineTons, "ton")}`,
          fighter && si !== null ? `Structural Integrity ${num(si)}, from the thrust and the tons` : undefined,
          !fighter && !siRange && si !== null ? `Structural Integrity ${num(si)}, fixed for this type` : undefined,
          fighter ? (controlTons(record) === null ? undefined : `Cockpit and controls ${plural(controlTons(record) ?? 0, "ton")}`) : ship?.controlTons == null ? undefined : `Controls ${plural(ship.controlTons, "ton")}`,
          ship?.siTons == null ? undefined : `Structure ${plural(ship.siTons, "ton")}`,
          ship?.pumpTons == null ? undefined : `Fuel pumps ${plural(ship.pumpTons, "ton")}`,
          kf ? `K-F drive ${plural(kf.tons, "ton")}, integrity ${num(kf.integrity)}` : undefined,
          sail ? `Jump sail ${plural(sail.tons, "ton")}, integrity ${num(sail.integrity)}` : undefined,
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
  const ship = vessel(record);
  if (fighter === undefined && ship === null) return null;
  const known = locationsOf(record).armor;
  const locations = armorLocations(record, known);
  const types = (ship?.group === "capital"
    ? CAPITAL_ARMOR_TYPES.filter((t) => t.editions.includes(edition)).map((t) => ({ id: t.id, name: t.name, techBase: "both" as const }))
    : fighterArmorTypes(edition).filter((t) => fighterArmorOffered(record, t))
  ).filter((t) => record.techBase === "mixed" || t.techBase === "both" || t.techBase === record.techBase || t.id === record.armor.type)
    .map((t) => ({ value: t.id, label: t.name }));
  const armor = fighter ? fighterArmor(record) : (ship?.armor ?? null);
  const craftFigures = ship?.armor ?? null;
  const patchwork = fighter !== undefined && fighterPatchworkActive(record);
  const patchworkTypes = fighterPatchworkTypes(edition)
    .filter((t) => record.techBase === "mixed" || t.techBase === "both" || t.techBase === record.techBase)
    .map((t) => ({ value: t.id, label: t.name }));
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
        {!patchwork && (
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
        )}
      </div>
      {fighter !== undefined && fighterPatchworkOffered(record) && (
        <details className="bt-patchwork" open={patchwork || undefined}>
          <summary>Patchwork armor</summary>
          <p className="bt-hint">
            A different armor type on each location (Tactical Operations: Advanced Units and Equipment, p. 189; Interstellar Operations: Alternate Eras, p. 82). Each location weighs its own armor, rounded up to the half ton, and its type takes weapon slots from that arc. The armor type above is the one for any location left at it.
          </p>
          <div className="bt-grid">
            {known.map((loc) => (
              <SelectField
                key={loc}
                id={fieldId(`patchwork-${loc}`)}
                label={`${aeroLocationName(loc)} armor type`}
                value={armorTypeAt(record, loc)}
                options={patchworkTypes}
                hint={patchwork ? `${plural(patchworkSlotsAt(record, loc), "slot")}, ${plural(patchworkTonsAt(record, loc) ?? 0, "ton")}` : undefined}
                onChange={(v) => {
                  onEdit((d) => void setFighterPatchwork(d, loc, v));
                }}
              />
            ))}
          </div>
        </details>
      )}
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
              hint={known.includes(loc) ? (patchwork ? plural(patchworkTonsAt(record, loc) ?? 0, "ton") : undefined) : "this edition has no such location"}
              onValid={(v) => {
                onEdit((d) => void (d.armor.points[loc] = v ?? 0), `armor-${loc}`);
              }}
            />
          ))}
        </div>
      </fieldset>
      <Readout
        lines={[
          patchwork ? `${plural(fighterArmorTons(record), "ton")} of armor in all, each location up to the half ton` : undefined,
          armor === null ? undefined : `${num(armor.allocated)} points set${armor.available === null ? "" : ` of ${num(armor.available)}`}${armor.free > 0 ? `, ${num(armor.free)} of them free` : ""}`,
          armor?.over !== null && armor?.over !== undefined && armor.over > 0 ? `${num(armor.over)} points over what the armor gives` : undefined,
          craftFigures?.limitTons == null ? undefined : `At most ${plural(craftFigures.limitTons, "ton")} of armor for this structure`,
        ]}
      />
    </section>
  );
}

/** Heat sink type and the sinks added to the engine's free ones. */
export function HeatPanel({ record, onEdit }: PartProps) {
  const edition = record.editionId;
  const fighter = fighterKind(record);
  const ship = vessel(record);
  if (fighter === undefined && ship === null) return null;
  const heat = fighter ? fighterHeat(record) : (ship?.heat ?? null);
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
