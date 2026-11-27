// The ProtoMech editor's panels: identity, chassis (weight, movement, heat sinks), armor, weapons and equipment by location, Battle Value and cost, and the OFFICIAL mark.
// Each shows only what the rules level, year and era offer (hide, do not mark): an item the unit already holds stays listed, and the rules check reports it.
import { useMemo, useState } from "react";
import { PROTO_GLIDER, PROTO_PARTS, PROTO_WING, PROTO_LOCATION_NAMES, PROTO_REAR_LOCATIONS } from "../../data/protomech";
import { groupOf } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelAtLeast, levelRow } from "../../rules/levels";
import { armorPoints, ammoKg, engineKg, engineRating, holdsAt, launcherOf, limitOf, locationsOf, mountKg, mountName, plainRun, rowOf, runMP, structurePoints, structureRow, tally, tubesOf, usesAmmo } from "../../rules/protomech/build";
import { isGlider, speedLabels } from "../../rules/protomech/config";
import { armorChoices, armorTypeOf, cockpitChoices, configChoices, jumpChoices, jumpMP, jumpReach, jumpSystemOf, tonnageChoices, wingBonus, wingOffered } from "../../rules/protomech/options";
import { protoLowestLevel } from "../../rules/protomech/checks";
import type { ProtoFinding } from "../../rules/protomech/checks";
import { markProtoOfficial, protoOfficialState } from "../../rules/protomech/official";
import { offeredEquipment } from "../../rules/protomech/offered";
import { protoBattleValue, protoCost } from "../../rules/protomech/rating";
import type { ProtoRecord } from "../../rules/protomech/record";
import { tidy } from "../../rules/walk";
import { NumberField, SelectField, TextField, fieldId } from "../aero/fields";
import { YearEraFields, eraFollowsBase } from "../YearEraFields";
import LevelSelect from "../editor/LevelSelect";
import { OfficialMark, OfficialMarkPanel } from "../editor/Marks";
import ProtoDiagram from "./ProtoDiagram";
import { locationDomId, mountDomId, mountFor, pickerLabel, setChassis } from "./edit";
import type { ProtoOnEdit } from "./edit";

const num = (n: number): string => String(tidy(n));
const money = (n: number): string => `${n.toLocaleString("en-US")} C-bills`;
/** Sets a part option by its id; the TechManual part is the absence of the key. */
const setOption = (d: ProtoRecord, key: "cockpit" | "armorType" | "jumpType", id: string) => {
  if (id === "standard") delete d[key];
  else d[key] = id;
};

interface PartProps {
  record: ProtoRecord;
  onEdit: ProtoOnEdit;
}

function Readout({ lines }: { lines: (string | undefined)[] }) {
  const shown = lines.filter((line): line is string => line !== undefined);
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

export function IdentityPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const lowest = protoLowestLevel(record, catalog);
  return (
    <section className="bt-panel" aria-labelledby="pm-identity">
      <h2 id="pm-identity">Identity</h2>
      <div className="bt-grid">
        <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { onEdit((d) => void (d.name.chassis = v), "name"); }} />
        <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { onEdit((d) => void (d.name.model = v), "name-model"); }} />
        <LevelSelect record={record} onChange={(level) => { onEdit((d) => void (d.rulesLevel = level)); }} />
        <YearEraFields record={record} onEdit={onEdit} hint="Needed above Introductory. The year decides which equipment exists." />
        {record.cockpit !== "interface" && (levelAtLeast(record.rulesLevel ?? DEFAULT_LEVEL, "advanced") || record.techBase === "mixed") ? (
          <SelectField id="field-techBase" label="Tech base" value={record.techBase} options={[{ value: "clan", label: "Clan" }, { value: "mixed", label: "Mixed" }]} onChange={(v) => { onEdit((d) => { d.techBase = v; eraFollowsBase(d); }); }} hint="Clan, or Mixed Technology at Advanced rules (Tactical Operations: Advanced Units and Equipment, p. 189)." />
        ) : (
          <div className="bt-field">
            <span className="bt-label">Tech base</span>
            {record.cockpit === "interface" ? (
              <>
                <span id="field-techBase">Mixed</span>
                <span className="bt-hint">The Inner Sphere interface cockpit makes the unit Mixed Technology (Interstellar Operations: Alternate Eras, p. 96).</span>
              </>
            ) : (
              <>
                <span id="field-techBase">Clan</span>
                <span className="bt-hint">ProtoMechs are built with Clan technology (TechManual, p. 80); Mixed Technology comes with Advanced rules.</span>
              </>
            )}
          </div>
        )}
        <SelectField id="field-tons" label="Tons" value={String(record.tons)} options={tonnageChoices(record).map((t) => ({ value: String(t), label: `${String(t)} tons` }))} onChange={(v) => { onEdit((d) => void (d.tons = Number(v))); }} hint={record.tons >= 10 ? "From 10 tons a ProtoMech is Ultraheavy (Interstellar Operations: Alternate Eras, p. 94)." : undefined} />
        {configChoices(record).length > 1 && (
          <SelectField
            id="field-configuration"
            label="Chassis"
            value={record.configuration ?? "biped"}
            options={configChoices(record).map((c) => ({ value: c.id, label: c.label }))}
            onChange={(v) => { onEdit((d) => { setChassis(d, v); }); }}
            hint="A quad has no arms; a glider flies by WiGE movement and has no jump jets, wing or booster (Interstellar Operations: Alternate Eras, p. 93)."
          />
        )}
      </div>
      <p className="bt-hint">{`The lowest rules level that fits everything on the unit: ${levelRow(lowest).label}.`}</p>
    </section>
  );
}

export function ChassisPanel({ record, onEdit }: PartProps) {
  const row = structureRow(record);
  const rating = engineRating(record);
  const kg = engineKg(record);
  const cockpits = cockpitChoices(record);
  const jumps = jumpChoices(record);
  const system = jumpSystemOf(record);
  const reach = jumpReach(record);
  const glider = isGlider(record);
  const labels = speedLabels(record);
  return (
    <section className="bt-panel" aria-labelledby="pm-chassis">
      <h2 id="pm-chassis">Engine, movement and heat sinks</h2>
      <div className="bt-grid">
        <NumberField id="field-walk" label={labels.walk} value={record.walk} min={1} hint={glider ? `A glider flies at this speed and moves ${String(PROTO_GLIDER.groundMP)} MP on the ground; it needs a flanking speed of at least ${String(PROTO_PARTS.minGliderFlank)}.` : undefined} onValid={(v) => { onEdit((d) => void (d.walk = v ?? 1), "walk"); }} />
        {!glider && jumps.length > 1 && <SelectField id="field-jumpType" label="Jump system" value={record.jumpType ?? "standard"} options={jumps.map((j) => ({ value: j.id, label: j.label }))} onChange={(v) => { onEdit((d) => { setOption(d, "jumpType", v); }); }} />}
        {!glider && <NumberField id="field-jump" label={system?.unit ?? "Jumping MP"} value={record.jump} min={0} hint={`At most the ${system?.reach === "run" ? "Running MP" : "Walking MP"}, ${String(reach)}.`} onValid={(v) => { onEdit((d) => void (d.jump = v ?? 0), "jump"); }} />}
        {cockpits.length > 1 && <SelectField id="field-cockpit" label="Cockpit" value={record.cockpit ?? "standard"} options={cockpits.map((c) => ({ value: c.id, label: c.label }))} onChange={(v) => { onEdit((d) => { setOption(d, "cockpit", v); if (v === "interface") d.techBase = "mixed"; else if (record.cockpit === "interface") d.techBase = "clan"; }); }} />}
        <NumberField id="field-heatSinks" label="Heat sinks" value={record.heatSinks} min={0} hint="One for each point of energy weapon heat." onValid={(v) => { onEdit((d) => void (d.heatSinks = v ?? 0), "heatSinks"); }} />
        {!glider && (
          <div className="bt-field">
            <label className="pm-check">
              <input id="field-booster" type="checkbox" checked={record.booster} onChange={(e) => { onEdit((d) => void (d.booster = e.target.checked)); }} />
              {" Myomer Booster"}
            </label>
            <span className="bt-hint">Running MP of twice the Walking MP.</span>
          </div>
        )}
        {wingOffered(record) && (
          <div className="bt-field">
            <label className="pm-check">
              <input id="field-partialWing" type="checkbox" checked={record.partialWing === true} onChange={(e) => { onEdit((d) => { if (e.target.checked) d.partialWing = true; else delete d.partialWing; }); }} />
              {` ${PROTO_WING.label}`}
            </label>
            <span className="bt-hint">{`Weighs a fifth of the ProtoMech and takes one torso item; adds ${String(PROTO_WING.bonusAtStandard)} Jumping MP in a standard atmosphere to a unit that can jump.`}</span>
          </div>
        )}
        <div className="bt-field">
          <label className="pm-check">
            <input id="field-mainGun" type="checkbox" checked={record.mainGun} onChange={(e) => { onEdit((d) => void (d.mainGun = e.target.checked)); }} />
            {" Main gun mount"}
          </label>
          <span className="bt-hint">Adds a location with its own armor and structure; it holds one item of any weight.</span>
        </div>
      </div>
      <Readout
        lines={[
          `${labels.run} ${String(runMP(record))}${record.booster && !glider ? ` boosted (${String(plainRun(record.walk))} without the booster)` : ""}.`,
          wingBonus(record) > 0 ? `Jumping MP ${String(jumpMP(record))} with the partial wing (${String(record.jump)} from the jets).` : undefined,
          system?.underwater === true && record.jump > 0 ? `${String(record.jump)} UMU MP: underwater movement, no jumping.` : undefined,
          rating === null ? undefined : `Engine rating ${String(rating)}${kg === null ? ", which we have no weight for" : `, ${num(kg)} kg`}.`,
          row ? `Internal structure ${String(structurePoints(record) ?? 0)} points, ${String(record.tons * 100)} kg.` : undefined,
        ]}
      />
    </section>
  );
}

export function ArmorPanel({ record, onEdit, inError }: PartProps & { inError: string[] }) {
  const row = structureRow(record);
  const locations = locationsOf(record);
  const view = locations.map((code) => ({ code, name: PROTO_LOCATION_NAMES[code] ?? code, armor: record.armor[code] ?? 0, structure: row?.structure[code] }));
  const types = armorChoices(record);
  const type = armorTypeOf(record);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="pm-armor">
      <h2 id="pm-armor">Armor and structure</h2>
      {types.length > 1 && (
        <div className="bt-grid">
          <SelectField id="field-armorType" label="Armor type" value={record.armorType ?? "standard"} options={types.map((t) => ({ value: t.id, label: t.label }))} onChange={(v) => { onEdit((d) => { setOption(d, "armorType", v); }); }} />
        </div>
      )}
      <p className="bt-hint">{`${type ? `${type.label} weighs ${String(type.kgPerPoint)} kg a point` : "This armor type is not one we know"}. ${String(armorPoints(record))} points placed${row ? `, ${String(locations.reduce((s, c) => s + row.armor[c], 0))} at most` : ""}.`}</p>
      <div className="bt-grid">
        {locations.map((code) => (
          <NumberField
            key={code}
            id={fieldId(`armor-${code}`)}
            label={`${PROTO_LOCATION_NAMES[code] ?? code} armor`}
            value={record.armor[code] ?? 0}
            min={0}
            hint={row ? `Up to ${String(row.armor[code])}; structure ${String(row.structure[code])}.` : undefined}
            onValid={(v) => { onEdit((d) => void (d.armor[code] = v ?? 0), `armor-${code}`); }}
          />
        ))}
      </div>
      <div className="bt-grid">
        <ProtoDiagram locations={view} use="armor" body={record.configuration} inError={inError} onSelect={(code) => { document.getElementById(fieldId(`armor-${code}`))?.focus(); }} />
        <ProtoDiagram locations={view} use="structure" body={record.configuration} />
      </div>
    </section>
  );
}

/** What each location may hold, in words, from the table that applies to the unit. */
function limitsHint(record: ProtoRecord): string {
  const torso = limitOf(record, "t");
  const arm = limitOf(record, "la");
  const gun = limitOf(record, "mg");
  const items = (n: number) => `${String(n)} ${n === 1 ? "item" : "items"}`;
  const arms = locationsOf(record).includes("la") && arm ? `each arm ${items(arm.items)} of ${(arm.kg ?? 0).toLocaleString("en-US")} kg at most, ` : "";
  return `The torso holds ${items(torso?.items ?? 0)} weighing ${(torso?.kg ?? 0).toLocaleString("en-US")} kg together (less one item for each of Electric Discharge armor and the partial wing), ${arms}the main gun ${items(gun?.items ?? 1)} of any weight. The head and legs hold none. Ammunition does not count against these limits.`;
}

export function WeaponsPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const offered = useMemo(() => offeredEquipment(record, catalog, false, record.mounts.map((m) => m.equipmentId ?? "")), [record, catalog]);
  const [pick, setPick] = useState<Record<string, string>>({});
  // The locations that may hold items, then any other place that holds one anyway (it stays visible, and the rules check reports it).
  const main: string[] = locationsOf(record).filter((c) => (limitOf(record, c)?.items ?? 0) > 0);
  const places = [...main, ...new Set(record.mounts.map((m) => m.location).filter((c) => !main.includes(c)))];
  const groups = useMemo(() => {
    const by = new Map<string, { label: string; rows: typeof offered }>();
    for (const row of offered) {
      const g = groupOf(row);
      const entry = by.get(g.id) ?? { label: g.label, rows: [] };
      entry.rows.push(row);
      by.set(g.id, entry);
    }
    return [...by.values()];
  }, [offered]);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="pm-weapons">
      <h2 id="pm-weapons">Weapons and equipment</h2>
      <p className="bt-hint">{limitsHint(record)}</p>
      {places.map((code) => {
        const name = PROTO_LOCATION_NAMES[code] ?? `"${code}"`;
        const limit = limitOf(record, code);
        const held = holdsAt(record, catalog, code);
        const here = record.mounts.filter((m) => m.location === code);
        const full = limit !== undefined && held.items >= limit.items;
        const chosen = pick[code] ?? "";
        return (
          <div key={code} id={locationDomId(code)} tabIndex={-1}>
            <h3>{name}</h3>
            <p className="bt-hint">{limit ? `${String(held.items)} of ${String(limit.items)} ${limit.items === 1 ? "item" : "items"}${limit.kg === null ? "" : `, ${num(held.kg)} of ${num(limit.kg)} kg`}.` : `${String(held.items)} items; this is not a ProtoMech location.`}</p>
            <ul className="pm-mounts">
              {here.map((mount) => {
                const row = rowOf(catalog, record, mount);
                const launch = launcherOf(mount);
                const kg = mountKg(mount, catalog, record);
                return (
                  <li key={mount.id} id={mountDomId(mount.id)} tabIndex={-1}>
                    <strong>{mountName(mount) || "Unnamed item"}</strong>
                    {kg === undefined ? " (weight not known)" : `, ${num(kg)} kg`}
                    {row?.damage !== undefined && row.range !== undefined ? `. Damage ${row.damage}, range ${row.range.slice(1).join("/")}` : ""}
                    <div className="bt-grid">
                      {launch && (
                        <NumberField id={`${mountDomId(mount.id)}-tubes`} label="Tubes" value={tubesOf(mount)} min={1} hint={`1 to ${String(launch.launcher.maxTubes)}; ${String(launch.launcher.kgPerTube)} kg a tube.`} onValid={(v) => { onEdit((d) => { const m = d.mounts.find((x) => x.id === mount.id); if (m) m.tubes = v ?? 1; }, `${mount.id}-tubes`); }} />
                      )}
                      {usesAmmo(mount) && (
                        <NumberField id={`${mountDomId(mount.id)}-shots`} label="Shots of ammunition" value={mount.shots ?? 0} min={0} hint={`${num(ammoKg(mount))} kg.`} onValid={(v) => { onEdit((d) => { const m = d.mounts.find((x) => x.id === mount.id); if (m) m.shots = v ?? 0; }, `${mount.id}-shots`); }} />
                      )}
                      {PROTO_REAR_LOCATIONS.includes(code) && (
                        <div className="bt-field">
                          <label className="pm-check">
                            <input type="checkbox" checked={mount.rear === true} onChange={(e) => { onEdit((d) => { const m = d.mounts.find((x) => x.id === mount.id); if (m) { if (e.target.checked) m.rear = true; else delete m.rear; } }); }} />
                            {" Fires to the rear"}
                          </label>
                        </div>
                      )}
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`Remove ${mountName(mount) || "item"} from ${name}`} onClick={() => { onEdit((d) => void (d.mounts = d.mounts.filter((m) => m.id !== mount.id))); }}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {limit && limit.items > 0 && (
              <div className="bt-grid">
                <div className="bt-field">
                  <label htmlFor={`pm-add-${code}`}>{`Add to ${name}`}</label>
                  <select id={`pm-add-${code}`} value={chosen} onChange={(e) => { setPick({ ...pick, [code]: e.target.value }); }}>
                    <option value="">{full ? "Full (adding more is a rules error)" : "Choose an item"}</option>
                    {groups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.rows.map((row) => (
                          <option key={row.id} value={row.id}>
                            {pickerLabel(row)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="bt-button"
                  disabled={chosen === ""}
                  onClick={() => {
                    const row = offered.find((r) => r.id === chosen);
                    if (!row) return;
                    onEdit((d) => void d.mounts.push(mountFor(d, row, code)));
                    setPick({ ...pick, [code]: "" });
                  }}
                >
                  {`Add to ${name}`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** Weight lines, Battle Value and cost, with what could not be valued. */
export function RatingPanel({ record, catalog }: { record: ProtoRecord; catalog: Catalog }) {
  const bv = useMemo(() => protoBattleValue(record, catalog), [record, catalog]);
  const cost = useMemo(() => protoCost(record, catalog), [record, catalog]);
  const weight = useMemo(() => tally(record, catalog), [record, catalog]);
  return (
    <section className="bt-panel bt-calc" aria-labelledby="pm-rating">
      <h2 id="pm-rating">Weight, Battle Value and cost</h2>
      <p>
        <strong data-testid="pm-bv">{`Battle Value ${String(bv.total)}`}</strong>
        {" for a Gunnery 4 pilot. "}
        <strong data-testid="pm-cost">{`Cost ${money(cost.total)}`}</strong>
      </p>
      <details>
        <summary>How it adds up</summary>
        <p className="bt-hint">{`Defensive: armor ${num(bv.defensive.armor)} + structure ${num(bv.defensive.structure)} + equipment ${num(bv.defensive.equipment)} = ${num(bv.defensive.subtotal)}, times ${num(bv.defensive.factor)} (target modifier +${String(bv.defensive.targetModifier)}, and 0.1 for a ProtoMech) = ${num(bv.defensive.rating)}.`}</p>
        <p className="bt-hint">{`Offensive: weapons and ammunition ${num(bv.offensive.weapons)}, times the Speed Factor ${num(bv.offensive.speedFactor)} (speed ${String(bv.offensive.speed)}) = ${num(bv.offensive.rating)}.`}</p>
        <p className="bt-hint">{`Cost: ${money(cost.structural)} structure and ${money(cost.equipment)} equipment, times ${num(cost.multiplier)}. Ammunition is not priced, as in the book's worked example.`}</p>
        <ul className="bt-list">
          {weight.lines.map((line) => (
            <li key={line.label} className="bt-hint">{`${line.label}: ${num(line.kg)} kg`}</li>
          ))}
        </ul>
      </details>
      {[...bv.unvalued.map((u) => `${u.name}: ${u.why} (no BV)`), ...cost.unpriced.map((u) => `${u.name}: ${u.why} (no price)`)].map((line) => (
        <p key={line} className="bt-hint">{line}</p>
      ))}
    </section>
  );
}

const GROUPS: { level: ProtoFinding["level"]; title: string }[] = [
  { level: "error", title: "Errors" },
  { level: "warning", title: "Warnings" },
  { level: "note", title: "Notes" },
];

export function FindingsPanel({ findings, targetOf, onChoose }: { findings: ProtoFinding[]; targetOf: (where: ProtoFinding["where"]) => string | undefined; onChoose: (id: string) => void }) {
  const count = (level: ProtoFinding["level"]) => findings.filter((f) => f.level === level).length;
  return (
    <section className="bt-panel bt-findings" aria-labelledby="pm-rules-heading">
      <h2 id="pm-rules-heading">Rules check</h2>
      <p className="bt-findings__summary" aria-live="polite">
        {findings.length === 0 ? "No problems found." : `${String(count("error"))} errors, ${String(count("warning"))} warnings, ${String(count("note"))} notes`}
      </p>
      {GROUPS.map(({ level, title }) => {
        const group = findings.filter((f) => f.level === level);
        if (group.length === 0) return null;
        return (
          <div key={level} className={`bt-findings__group bt-findings__group--${level}`}>
            <h3>{title}</h3>
            <ul className="bt-list">
              {group.map((finding, index) => {
                const target = targetOf(finding.where);
                return (
                  <li key={`${finding.check}-${String(index)}`} className="bt-finding">
                    {target ? (
                      <button type="button" className="bt-finding__text" onClick={() => { onChoose(target); }}>
                        {finding.message}
                      </button>
                    ) : (
                      <span className="bt-finding__text">{finding.message}</span>
                    )}
                    {finding.cite && <span className="bt-finding__cite">{finding.cite}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function OfficialBadge({ record }: { record: ProtoRecord }) {
  return <OfficialMark state={protoOfficialState(record)} />;
}

export function OfficialPanel({ record, onEdit }: PartProps) {
  return (
    <OfficialMarkPanel
      wide
      state={protoOfficialState(record)}
      stated={record.official}
      onMark={(book, page) => {
        onEdit((d) => {
          markProtoOfficial(d, book, page);
        });
      }}
      onUnmark={() => {
        onEdit((d) => {
          delete d.official;
        });
      }}
    />
  );
}

export { DEFAULT_LEVEL };
