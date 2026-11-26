// The editor's panels: identity, motive and manipulators, armor, and the equipment in each location. Each lists only what the suit's rules level,
// year, era and tech base allow (hide, do not mark): a part the suit already holds stays listed, and the rules check reports it.
import { useState } from "react";
import { MOTIVE, SQUAD, armorTypeOf, unitWord, weightClassOf } from "../../data/battlearmor";
import { ERAS } from "../../data/editions";
import { setEra, setYear } from "../../rules/availability";
import { armorChoices, equipmentChoices, manipulatorChoices, motiveChoices, weightClassChoices } from "../../rules/battlearmor/availability";
import { LOCATION_NAMES, build, carriesShots, figuresOf, locationName, locationsOf, shotsOf } from "../../rules/battlearmor/construct";
import type { BaRecord } from "../../rules/battlearmor/record";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelRow } from "../../rules/levels";
import { tidy } from "../../rules/walk";
import LevelSelect from "../editor/LevelSelect";
import { NumberField, SelectField, TextField } from "../aero/fields";
import BattleArmorDiagram from "./BattleArmorDiagram";
import { mountDomId, setBody, troopersOf } from "./edit";
import type { BaOnEdit } from "./edit";

interface PartProps {
  record: BaRecord;
  onEdit: BaOnEdit;
}
const num = (n: number): string => String(tidy(n));
const ERA_CHOICES = [{ value: "", label: "Any era" }, ...ERAS.map((era) => ({ value: era.id, label: `${era.name} (${String(era.startYear)}${era.endYear === undefined ? " on" : `-${String(era.endYear)}`})` }))];
const shortName = (name: string): string => name.replace(/ \(Battle Armor\)$/, "");

export function IdentityPanel({ record, onEdit }: PartProps) {
  const cls = weightClassOf(record.weightClass);
  const classes = weightClassChoices(record, record.weightClass).map((row) => ({ value: row.id, label: `${row.label} (${num(row.minKg)} to ${num(row.maxKg)} kg)` }));
  return (
    <section className="bt-panel" aria-labelledby="ba-identity">
      <h2 id="ba-identity">Identity</h2>
      <div className="bt-grid">
        <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { onEdit((d) => void (d.name.chassis = v), "name"); }} />
        <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { onEdit((d) => void (d.name.model = v), "name-model"); }} />
        <LevelSelect record={record} onChange={(level) => { onEdit((d) => void (d.rulesLevel = level)); }} />
        <NumberField id="field-year" label="Year" value={record.year} allowEmpty onValid={(v) => { onEdit((d) => { setYear(d, v); }, "year"); }} />
        <SelectField id="field-era" label="Era" value={record.era ?? ""} options={ERA_CHOICES} onChange={(v) => { onEdit((d) => { setEra(d, v); }); }} />
        <SelectField
          id="field-techBase"
          label="Tech base"
          value={record.techBase}
          options={[{ value: "inner-sphere", label: "Inner Sphere" }, { value: "clan", label: "Clan" }]}
          hint="Inner Sphere suits use Inner Sphere equipment and Clan suits Clan equipment (TechManual, p. 160)."
          onChange={(v) => { onEdit((d) => void (d.techBase = v === "clan" ? "clan" : "inner-sphere")); }}
        />
        <SelectField
          id="field-weightClass"
          label="Weight class"
          value={record.weightClass}
          options={classes}
          hint={cls ? `Chassis ${num(cls.chassisKg[record.techBase])} kg. ${cls.cite.book}, p. ${String(cls.cite.page)}.` : undefined}
          onChange={(v) => { onEdit((d) => { d.weightClass = v; }); }}
        />
        <SelectField
          id="field-body"
          label="Body"
          value={record.body}
          options={[{ value: "humanoid", label: "Humanoid" }, { value: "quad", label: "Quad", disabled: record.weightClass === "pal" }]}
          hint="A quad has no manipulators or jump, VTOL or UMU movement."
          onChange={(v) => { onEdit((d) => { setBody(d, v === "quad" ? "quad" : "humanoid"); }); }}
        />
        <NumberField
          id="field-troopers"
          label={`Troopers in the ${unitWord(record.techBase) === "Point" ? "Point" : "squad"}`}
          value={record.troopers}
          min={1}
          hint={`One to ${String(SQUAD.max)}. The book recommends ${String(SQUAD.recommended[record.techBase])} here.`}
          onValid={(v) => { onEdit((d) => void (d.troopers = v ?? d.troopers), "troopers"); }}
        />
        <NumberField id="field-gunnery" label="Gunnery skill" value={record.skills.gunnery} min={0} onValid={(v) => { onEdit((d) => void (d.skills.gunnery = v ?? d.skills.gunnery), "gunnery"); }} />
        <NumberField id="field-antiMech" label="Anti-'Mech skill" value={record.skills.antiMech} min={0} onValid={(v) => { onEdit((d) => void (d.skills.antiMech = v ?? d.skills.antiMech), "antiMech"); }} />
      </div>
      <p className="bt-hint">{`Rules level: ${levelRow(record.rulesLevel ?? DEFAULT_LEVEL).label}.`}</p>
    </section>
  );
}

export function MotivePanel({ record, onEdit }: PartProps) {
  const cls = weightClassOf(record.weightClass);
  const quad = record.body === "quad";
  const kinds = motiveChoices(record, record.motive.kind).map((kind) => ({ value: kind as string, label: MOTIVE[kind].label }));
  const manips = manipulatorChoices(record, undefined).map((row) => ({ value: row.id, label: row.label + (row.kg ? ` (${num(row.kg)} kg)` : "") }));
  const max = cls ? (quad ? cls.ground.max.quad : cls.ground.max.humanoid) : undefined;
  const free = cls ? (quad ? cls.ground.free.quad : cls.ground.free.humanoid) : undefined;
  const optionsFor = (current: string) => (manips.some((m) => m.value === current) ? manips : [...manips, { value: current, label: current }]);
  return (
    <section className="bt-panel" aria-labelledby="ba-motive">
      <h2 id="ba-motive">Movement and manipulators</h2>
      <div className="bt-grid">
        <NumberField
          id="field-ground"
          label="Ground MP"
          value={record.ground}
          min={0}
          hint={cls ? `${num(free ?? 0)} free, at most ${num(max ?? 0)}; each more weighs ${num(cls.ground.kgPerMp)} kg.` : undefined}
          onValid={(v) => { onEdit((d) => void (d.ground = v ?? d.ground), "ground"); }}
        />
        {!quad && (
          <>
            <SelectField
              id="field-motive"
              label="Other movement"
              value={record.motive.kind}
              options={[{ value: "none", label: "None" }, ...kinds]}
              onChange={(v) => { onEdit((d) => { d.motive = { kind: v, mp: v === "none" ? 0 : Math.max(1, d.motive.mp) }; }); }}
            />
            {record.motive.kind !== "none" && (
              <NumberField id="field-motive-mp" label="Other movement MP" value={record.motive.mp} min={0} onValid={(v) => { onEdit((d) => void (d.motive.mp = v ?? d.motive.mp), "motive-mp"); }} />
            )}
            <SelectField id="field-manip-la" label="Left arm manipulator" value={record.manipulators.la} options={optionsFor(record.manipulators.la)} onChange={(v) => { onEdit((d) => void (d.manipulators.la = v)); }} />
            <SelectField id="field-manip-ra" label="Right arm manipulator" value={record.manipulators.ra} options={optionsFor(record.manipulators.ra)} onChange={(v) => { onEdit((d) => void (d.manipulators.ra = v)); }} />
          </>
        )}
      </div>
      {quad && <p className="bt-hint">A quad suit has no manipulators and no jump, VTOL or UMU movement (TechManual, p. 164).</p>}
    </section>
  );
}

export function ArmorPanel({ record, onEdit }: PartProps) {
  const cls = weightClassOf(record.weightClass);
  const armor = armorTypeOf(record.armor.type);
  const types = armorChoices(record, record.armor.type).map((row) => ({ value: row.id, label: row.label }));
  const slots = armor && record.armor.points > 0 ? armor.slots : 0;
  const plan = record.armor.slots;
  const placed = plan ? Object.values(plan).reduce((a, n) => a + n, 0) : slots;
  const where = locationsOf(record.body);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="ba-armor">
      <h2 id="ba-armor">Armor</h2>
      <div className="bt-grid">
        <SelectField
          id="field-armor"
          label="Armor type"
          value={record.armor.type}
          options={types}
          hint={armor ? `${num(armor.kg[record.techBase] ?? 0)} kg a point, ${num(armor.slots)} slots. ${armor.cite.book}, p. ${String(armor.cite.page)}.` : undefined}
          onChange={(v) => { onEdit((d) => { d.armor.type = v; delete d.armor.slots; }); }}
        />
        <NumberField
          id="field-armor-points"
          label="Armor points"
          value={record.armor.points}
          min={0}
          hint={cls ? `Up to ${num(cls.maxArmor)} on each trooper, and the trooper's own point.` : undefined}
          onValid={(v) => { onEdit((d) => void (d.armor.points = v ?? d.armor.points), "armor"); }}
        />
        {slots > 0 &&
          where.map((loc) => (
            <NumberField
              key={loc}
              id={`field-armor-slots-${loc}`}
              label={`Armor slots in the ${LOCATION_NAMES[loc]}`}
              value={plan ? (plan[loc] ?? 0) : loc === "body" ? slots : 0}
              min={0}
              hint={loc === "body" ? `${num(placed)} of ${num(slots)} placed. Armor slots may be split among locations.` : undefined}
              onValid={(v) => {
                onEdit((d) => {
                  const base = d.armor.slots ?? { body: slots };
                  d.armor.slots = { ...base, [loc]: v ?? 0 };
                }, `armor-slots-${loc}`);
              }}
            />
          ))}
      </div>
      <BattleArmorDiagram locations={troopersOf(record)} use="armor" />
    </section>
  );
}

function label(row: EquipmentRow): string {
  const kg = typeof row.tons === "number" ? tidy(row.tons * 1000) : undefined;
  return `${shortName(row.name)} (${kg === undefined ? "" : `${num(kg)} kg, `}${String(row.slots)} ${row.slots === 1 ? "slot" : "slots"})`;
}

export function EquipmentPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const offered = equipmentChoices(catalog, record);
  const [pick, setPick] = useState("");
  const [where, setWhere] = useState<string>("body");
  const here = locationsOf(record.body);
  const b = build(record, catalog);
  const options = [...offered].sort((a, c) => a.name.localeCompare(c.name));
  const chosen = options.find((row) => row.id === pick) ?? options[0];
  const place = (loc: string) => (here.includes(loc as never) ? loc : "body");
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="ba-equipment">
      <h2 id="ba-equipment">Weapons and equipment</h2>
      <div className="bt-grid">
        <div className="bt-field">
          <label htmlFor="ba-add-item">Item</label>
          <select id="ba-add-item" value={chosen?.id ?? ""} onChange={(e) => { setPick(e.target.value); }}>
            {options.map((row) => (
              <option key={row.id} value={row.id}>{label(row)}</option>
            ))}
          </select>
        </div>
        <div className="bt-field">
          <label htmlFor="ba-add-where">Location</label>
          <select id="ba-add-where" value={place(where)} onChange={(e) => { setWhere(e.target.value); }}>
            {here.map((loc) => (
              <option key={loc} value={loc}>{LOCATION_NAMES[loc]}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="bt-button"
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            onEdit((d) => {
              d.mounts.push({ id: crypto.randomUUID(), equipmentId: chosen.id, name: chosen.name, location: place(where), ...(carriesShots(chosen) ? { shots: 4 } : {}) });
            });
          }}
        >
          Add
        </button>
      </div>
      {here.map((loc) => {
        const use = b.slots[loc];
        const items = record.mounts.filter((m) => m.location === loc);
        return (
          <div key={loc}>
            <h3>{`${LOCATION_NAMES[loc]}: ${num(use?.used ?? 0)} of ${num(use?.capacity ?? 0)} slots`}</h3>
            {items.length === 0 ? (
              <p className="bt-hint">Nothing here.</p>
            ) : (
              <ul className="bt-list">
                {items.map((mount) => {
                  const figures = figuresOf(mount, catalog, record.editionId);
                  return (
                    <li key={mount.id} id={mountDomId(mount.id)} tabIndex={-1} className="bt-row">
                      <span className="bt-row__text">
                        {shortName(figures?.row.name ?? mount.name)}
                        <span className="bt-row__credit">{figures ? `${num(figures.itemKg + figures.ammoKg)} kg, ${num(figures.slots)} slots` : "Not in our table"}</span>
                      </span>
                      <span className="bt-row__actions">
                        {figures && carriesShots(figures.row) && (
                          <NumberField id={`ba-shots-${mount.id}`} label="Shots" value={shotsOf(mount)} min={0} onValid={(v) => { onEdit((d) => { const m = d.mounts.find((x) => x.id === mount.id); if (m) m.shots = v ?? 0; }, `shots-${mount.id}`); }} />
                        )}
                        {here.length > 1 && (
                          <SelectField
                            id={`ba-move-${mount.id}`}
                            label="Location"
                            value={mount.location}
                            options={here.map((l) => ({ value: l, label: locationName(l) }))}
                            onChange={(v) => { onEdit((d) => { const m = d.mounts.find((x) => x.id === mount.id); if (m) m.location = v; }); }}
                          />
                        )}
                        <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${shortName(figures?.row.name ?? mount.name)}`} onClick={() => { onEdit((d) => { d.mounts = d.mounts.filter((x) => x.id !== mount.id); }); }}>
                          Remove
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** A short list of what the suit can do, from the Capabilities table, with the squad word for the record. */
export function CapabilitiesNote({ record, catalog }: { record: BaRecord; catalog: Catalog }) {
  const b = build(record, catalog);
  const yes = [b.capabilities.swarm && "Swarm attacks", b.capabilities.leg && "Leg attacks", b.capabilities.mechanized && "Mechanized battle armor"].filter(Boolean);
  const m = b.moves;
  const parts = [`Ground ${num(m.ground)}`, m.jump > 0 && `Jump ${num(m.jump)}`, m.vtol > 0 && `VTOL ${num(m.vtol)}`, m.umu > 0 && `UMU ${num(m.umu)}`].filter(Boolean);
  return (
    <p className="bt-hint">{`Movement: ${parts.join(", ")}. Can do: ${yes.length === 0 ? "none of the anti-'Mech or mechanized actions" : yes.join(", ")}.`}</p>
  );
}

