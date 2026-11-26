// The ProtoMech editor's panels: identity, chassis (weight, movement, heat sinks), armor, weapons and equipment by location, Battle Value and cost, and the OFFICIAL mark.
// Each shows only what the rules level, year and era offer (hide, do not mark): an item the unit already holds stays listed, and the rules check reports it.
import { useId, useMemo, useState } from "react";
import { PROTO_LIMITS, PROTO_LOCATION_NAMES, PROTO_REAR_LOCATIONS, PROTO_WEIGHT } from "../../data/protomech";
import { BOOKS, eraLabel } from "../../data/editions";
import { CLASSIC } from "../../data/rulesets";
import { erasOfYear, setEra, setYear } from "../../rules/availability";
import { groupOf } from "../../rules/catalog";
import type { Catalog } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelRow } from "../../rules/levels";
import { officialLabel } from "../../rules/official";
import { armorPoints, ammoKg, engineKg, engineRating, holdsAt, launcherOf, locationsOf, mountKg, mountName, plainRun, rowOf, runMP, structurePoints, structureRow, tally, tubesOf, usesAmmo } from "../../rules/protomech/build";
import { protoLowestLevel } from "../../rules/protomech/checks";
import type { ProtoFinding } from "../../rules/protomech/checks";
import { markProtoOfficial, protoOfficialState } from "../../rules/protomech/official";
import { offeredEquipment } from "../../rules/protomech/offered";
import { protoBattleValue, protoCost } from "../../rules/protomech/rating";
import type { ProtoRecord } from "../../rules/protomech/record";
import { tidy } from "../../rules/walk";
import { NumberField, SelectField, TextField, fieldId } from "../aero/fields";
import LevelSelect from "../editor/LevelSelect";
import ProtoDiagram from "./ProtoDiagram";
import { locationDomId, mountDomId, mountFor, pickerLabel } from "./edit";
import type { ProtoOnEdit } from "./edit";

const num = (n: number): string => String(tidy(n));
const money = (n: number): string => `${n.toLocaleString("en-US")} C-bills`;
const TONNAGES = Array.from({ length: PROTO_WEIGHT.max - PROTO_WEIGHT.min + 1 }, (_, i) => PROTO_WEIGHT.min + i);

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
  const eras = erasOfYear(record.year, CLASSIC);
  const lowest = protoLowestLevel(record, catalog);
  return (
    <section className="bt-panel" aria-labelledby="pm-identity">
      <h2 id="pm-identity">Identity</h2>
      <div className="bt-grid">
        <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { onEdit((d) => void (d.name.chassis = v), "name"); }} />
        <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { onEdit((d) => void (d.name.model = v), "name-model"); }} />
        <LevelSelect record={record} onChange={(level) => { onEdit((d) => void (d.rulesLevel = level)); }} />
        <NumberField id="field-year" label="Year" value={record.year} allowEmpty hint="Needed above Introductory. The year decides which equipment exists." onValid={(v) => { onEdit((d) => { setYear(d, v); }, "year"); }} />
        {eras.length === 1 && (
          <div className="bt-field">
            <span className="bt-label">Era</span>
            <span>{eras[0] ? eraLabel(eras[0]) : ""}</span>
          </div>
        )}
        {eras.length > 1 && (
          <SelectField
            id="field-era"
            label="Era"
            value={record.era ?? ""}
            options={[{ value: "", label: "Choose an era" }, ...eras.map((era) => ({ value: era.id, label: eraLabel(era) }))]}
            onChange={(v) => { onEdit((d) => { setEra(d, v); }); }}
          />
        )}
        <div className="bt-field">
          <span className="bt-label">Tech base</span>
          <span id="field-techBase">Clan</span>
          <span className="bt-hint">ProtoMechs are built with Clan technology only (TechManual, p. 80).</span>
        </div>
        <SelectField id="field-tons" label="Tons" value={String(record.tons)} options={TONNAGES.map((t) => ({ value: String(t), label: `${String(t)} tons` }))} onChange={(v) => { onEdit((d) => void (d.tons = Number(v))); }} />
      </div>
      <p className="bt-hint">{`The lowest rules level that fits everything on the unit: ${levelRow(lowest).label}.`}</p>
    </section>
  );
}

export function ChassisPanel({ record, onEdit }: PartProps) {
  const row = structureRow(record);
  const rating = engineRating(record);
  const kg = engineKg(record);
  return (
    <section className="bt-panel" aria-labelledby="pm-chassis">
      <h2 id="pm-chassis">Engine, movement and heat sinks</h2>
      <div className="bt-grid">
        <NumberField id="field-walk" label="Walking MP" value={record.walk} min={1} onValid={(v) => { onEdit((d) => void (d.walk = v ?? 1), "walk"); }} />
        <NumberField id="field-jump" label="Jumping MP" value={record.jump} min={0} hint="At most the Walking MP." onValid={(v) => { onEdit((d) => void (d.jump = v ?? 0), "jump"); }} />
        <NumberField id="field-heatSinks" label="Heat sinks" value={record.heatSinks} min={0} hint="One for each point of energy weapon heat." onValid={(v) => { onEdit((d) => void (d.heatSinks = v ?? 0), "heatSinks"); }} />
        <div className="bt-field">
          <label>
            <input id="field-booster" type="checkbox" checked={record.booster} onChange={(e) => { onEdit((d) => void (d.booster = e.target.checked)); }} />
            {" Myomer Booster"}
          </label>
          <span className="bt-hint">Running MP of twice the Walking MP.</span>
        </div>
        <div className="bt-field">
          <label>
            <input id="field-mainGun" type="checkbox" checked={record.mainGun} onChange={(e) => { onEdit((d) => void (d.mainGun = e.target.checked)); }} />
            {" Main gun mount"}
          </label>
          <span className="bt-hint">Adds a location with its own armor and structure; it holds one item of any weight.</span>
        </div>
      </div>
      <Readout
        lines={[
          `Running MP ${String(runMP(record))}${record.booster ? ` boosted (${String(plainRun(record.walk))} without the booster)` : ""}.`,
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
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby="pm-armor">
      <h2 id="pm-armor">Armor and structure</h2>
      <p className="bt-hint">{`ProtoMech armor weighs 50 kg a point. ${String(armorPoints(record))} points placed${row ? `, ${String(locations.reduce((s, c) => s + row.armor[c], 0))} at most` : ""}.`}</p>
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
        <ProtoDiagram locations={view} use="armor" inError={inError} onSelect={(code) => { document.getElementById(fieldId(`armor-${code}`))?.focus(); }} />
        <ProtoDiagram locations={view} use="structure" />
      </div>
    </section>
  );
}

export function WeaponsPanel({ record, catalog, onEdit }: PartProps & { catalog: Catalog }) {
  const offered = useMemo(() => offeredEquipment(record, catalog, false, record.mounts.map((m) => m.equipmentId ?? "")), [record, catalog]);
  const [pick, setPick] = useState<Record<string, string>>({});
  // The locations that may hold items, then any other place that holds one anyway (it stays visible, and the rules check reports it).
  const main: string[] = locationsOf(record).filter((c) => (PROTO_LIMITS.rows[c]?.items ?? 0) > 0);
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
      <p className="bt-hint">The torso holds two items weighing 2,000 kg together, each arm one item of 500 kg at most, the main gun one item of any weight. The head and legs hold none. Ammunition does not count against these limits.</p>
      {places.map((code) => {
        const name = PROTO_LOCATION_NAMES[code] ?? `"${code}"`;
        const limit = PROTO_LIMITS.rows[code];
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
                          <label>
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
  const state = protoOfficialState(record);
  const { badge, detail } = officialLabel(state);
  return (
    <span className="bt-official" data-official={state.official}>
      <strong className="bt-official__badge">{badge}</strong>
      {detail && <span className="bt-official__detail">{` ${detail}`}</span>}
    </span>
  );
}

export function OfficialPanel({ record, onEdit }: PartProps) {
  const state = protoOfficialState(record);
  const [book, setBook] = useState(record.official?.book ?? "");
  const [page, setPage] = useState(record.official?.page === undefined ? "" : String(record.official.page));
  const id = useId();
  const pageNumber = page.trim() === "" ? undefined : Number(page);
  const pageBad = pageNumber !== undefined && !(Number.isInteger(pageNumber) && pageNumber > 0);
  return (
    <section className="bt-panel bt-editor__wide" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Official or not</h2>
      <p><OfficialBadge record={record} /></p>
      <p className="bt-hint">OFFICIAL means the game's publisher put this design out in a book. You state it; we never claim it for you. Changing the design (not the name, the notes or the picture) turns it NOT OFFICIAL, and Undo gets it back.</p>
      {state.official ? (
        <button type="button" className="bt-button bt-button--secondary" onClick={() => { onEdit((d) => void delete d.official); }}>
          Mark NOT OFFICIAL
        </button>
      ) : (
        <div className="bt-grid">
          <div className="bt-field">
            <label htmlFor={`${id}-book`}>Book</label>
            <input id={`${id}-book`} type="text" list={`${id}-books`} value={book} onChange={(e) => { setBook(e.target.value); }} />
            <datalist id={`${id}-books`}>{Object.keys(BOOKS).map((title) => <option key={title} value={title} />)}</datalist>
          </div>
          <div className="bt-field">
            <label htmlFor={`${id}-page`}>Page (optional)</label>
            <input id={`${id}-page`} type="text" inputMode="numeric" value={page} aria-invalid={pageBad || undefined} onChange={(e) => { setPage(e.target.value); }} />
            {pageBad && <span className="bt-hint">Enter a page number.</span>}
          </div>
          <button type="button" className="bt-button" disabled={book.trim() === "" || pageBad} onClick={() => { onEdit((d) => { markProtoOfficial(d, book, pageNumber); }); }}>
            Mark OFFICIAL
          </button>
        </div>
      )}
    </section>
  );
}

export { DEFAULT_LEVEL };
