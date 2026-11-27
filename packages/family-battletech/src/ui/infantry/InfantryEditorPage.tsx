// The infantry editor: one saved platoon, edited in place, with the rules check beside it. The page holds the record's history (for Undo and
// Redo) and derives everything else from the current record. Hide, do not mark: what the rules level, tech base, year or era leaves out is not
// listed, unless the platoon already holds it (it then stays listed and the rules check reports it).
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ARMOR_KITS, BEASTS, FIELD_ARTILLERY_ID, FIELD_GUN_ID, FIELD_GUN_RULES, FORMATIONS, MOTIVES, SECONDARY_SLOT_TROOPS, SPECIALIZATIONS, XCT, XCT_ENVIRONMENTS, armorKitOf, beastOf, motiveOf } from "../../data/infantry-tables";
import { loadCatalog } from "../../rules/catalog";
import type { Catalog, EquipmentRow } from "../../rules/catalog";
import { DEFAULT_LEVEL, levelAtLeast, techBaseChoices } from "../../rules/levels";
import { checkInfantry } from "../../rules/infantry/checks";
import type { InfantryFinding } from "../../rules/infantry/checks";
import { beastSize, infantryBv, infantryCost, lineCode, offered as optionOffered, platoonOf, standardSize } from "../../rules/infantry/platoon";
import type { InfantryRecord } from "../../rules/infantry/platoon";
import SneakSystemsField from "./SneakSystemsField";
import LeaveConfirm from "../editor/LeaveConfirm";
import { useRecordHistory } from "../editor/useRecordHistory";
import LevelSelect from "../editor/LevelSelect";
import { STORAGE_READ_FAILED } from "../storage";
import { NumberField, SelectField, TextField } from "../aero/fields";
import { YearEraFields, eraFollowsBase } from "../YearEraFields";
import { useEraRoom } from "../eraChoice";
import InfantryDiagram from "./InfantryDiagram";
import { CLASSIC_HOME, sheetHref } from "./routes";
import { downloadInfantry, openInfantryStorage } from "./storage";
import type { InfantryStorage } from "./storage";
import "../aero/aero.scss";
import "./infantry.scss";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "unreadable"; message: string }
  | { state: "failed" }
  | { state: "ready"; storage: InfantryStorage; catalog: Catalog; record: InfantryRecord };

export default function InfantryEditorPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [storage, catalog] = await Promise.all([openInfantryStorage(), loadCatalog()]);
        const entry = await storage.get(id);
        if (!live) return;
        if (!entry) setLoaded({ state: "missing" });
        else if (!entry.record) setLoaded({ state: "unreadable", message: entry.unreadable ?? "" });
        else setLoaded({ state: "ready", storage, catalog, record: entry.record });
      } catch {
        if (live) setLoaded({ state: "failed" });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);
  if (loaded.state === "ready") return <Editor key={loaded.record.id} initial={loaded.record} catalog={loaded.catalog} storage={loaded.storage} />;
  if (loaded.state === "loading") return <div className="sr-page" role="status">Loading.</div>;
  return (
    <div className="sr-page">
      <h1>Infantry editor</h1>
      {loaded.state === "failed" ? <p role="alert" className="bt-problem">{STORAGE_READ_FAILED}</p> : <p>{loaded.state === "missing" ? "That platoon is not saved on this device." : `This saved platoon cannot be read. ${loaded.message}`}</p>}
      <p>
        <Link className="sr-action" to={CLASSIC_HOME}>
          Back to Classic BattleTech
        </Link>
      </p>
    </div>
  );
}

const num = (n: number, digits = 2): string => String(Math.round(n * 10 ** digits) / 10 ** digits);
const money = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
/** An affiliation's first name, for a phone: "Generic, mercenary, House or major Periphery" is "Generic". */
const shortAffiliation = (label: string): string => label.split(/,| or /)[0] ?? label;
const weaponLabel = (row: EquipmentRow): string => `${row.name}${row.techBase === "clan" ? " (Clan)" : ""}: ${row.infantry ? `${num(row.infantry.damage)} damage, range ${String(row.infantry.baseRange)}, crew ${row.infantry.crew}` : ""}`;

function Editor({ initial, catalog, storage }: { initial: InfantryRecord; catalog: Catalog; storage: InfantryStorage }) {
  const room = useEraRoom();
  const { record, dirty, canUndo, canRedo, edit, undo, redo, save, endGroup, justSaved, status, setStatus, problem, blocker } = useRecordHistory(initial, (r) => storage.save(r));
  const level = record.rulesLevel ?? DEFAULT_LEVEL;

  const platoon = useMemo(() => platoonOf(record, catalog), [record, catalog]);
  const findings = useMemo(() => checkInfantry(record, catalog), [record, catalog]);
  const bv = useMemo(() => infantryBv(record, catalog), [record, catalog]);
  const cost = useMemo(() => infantryCost(record, catalog), [record, catalog]);

  // What is offered
  const offered = useMemo(() => catalog.offered(record.editionId, { techBase: record.techBase, year: record.year, unit: "infantry", level }), [catalog, record.editionId, record.techBase, record.year, level]);
  const withCurrent = (rows: EquipmentRow[], id: string | null): EquipmentRow[] => {
    const current = id === null ? undefined : catalog.byId(id);
    return current && !rows.some((r) => r.id === current.id) ? [current, ...rows] : rows;
  };
  const primaries = withCurrent(offered.filter((r) => r.infantry?.mode !== "Support"), record.primary);
  const secondaries = withCurrent(offered.filter((r) => r.infantry !== undefined), record.secondary.weapon);
  const motives = MOTIVES.filter((m) => m.id === record.motive || (levelAtLeast(level, m.level) && (record.year === null || m.year === undefined || m.year <= record.year)));
  const sneakKit = record.armor ? armorKitOf(record.armor) : undefined;
  const kitsOffered = ARMOR_KITS.filter((k) => k.id === record.armor || (levelAtLeast(level, "advanced") && (k.techBase === "both" || k.techBase === record.techBase) && (record.year === null || k.year <= record.year)));
  // Hide, do not mark: a specialty the platoon type rules out is not listed (one already held stays). Combat engineers wait until their sub-types can be chosen.
  const specsOffered = SPECIALIZATIONS.filter((s) => optionOffered(level, record.year, s, record.specializations.includes(s.id)) && (record.specializations.includes(s.id) || (s.id !== "combat-engineers" && (s.motives === undefined || s.motives.includes(platoon.motive?.id ?? "foot")))));
  // Field guns and artillery come from the catalog's autocannons, Gauss weapons and artillery; the motive must be one that tows them (TO:AUE p. 122).
  const towing = FIELD_GUN_RULES.motives.includes(platoon.motive?.id ?? "foot");
  const heavy = useMemo(() => catalog.offered(record.editionId, { techBase: record.techBase, year: record.year, level }), [catalog, record.editionId, record.techBase, record.year, level]);
  const gunsOffered = withCurrent(heavy.filter((r) => FIELD_GUN_ID.test(r.id)), record.fieldGun.weapon);
  const artilleryOffered = withCurrent(heavy.filter((r) => FIELD_ARTILLERY_ID.test(r.id)), record.fieldArtillery);
  const showGuns = optionOffered(level, record.year, {}, record.fieldGun.weapon !== null || record.fieldArtillery !== null) && (towing || record.fieldGun.weapon !== null || record.fieldArtillery !== null);
  const showMedics = optionOffered(level, record.year, {}, record.paramedics > 0 || record.tagTroops > 0);
  const showXct = optionOffered(level, record.year, XCT, record.xct !== null);
  const advancedHeld = record.armor !== null || record.specializations.length > 0 || record.paramedics > 0 || record.tagTroops > 0 || record.xct !== null || record.fieldGun.weapon !== null || record.fieldArtillery !== null;
  const when = { year: record.year, era: record.era, editionId: record.editionId };
  const bases = techBaseChoices(level, record.techBase, when).filter(([value]) => value !== "mixed");
  const mechanized = platoon.motive?.mechanized ?? false;

  const resize = (d: InfantryRecord) => {
    const size = standardSize(d.formation, d.motive);
    if (size) {
      d.perSquad = Math.min(size[0], platoonOf(d, catalog).motive?.maxSquad ?? size[0]);
      d.squads = size[1];
    }
  };
  const title = `${record.name.chassis} ${record.name.model}`.trim();
  const target = (f: InfantryFinding): string | undefined => {
    const field = f.where?.field;
    if (field === undefined) return undefined;
    if (field === "skills") return "field-gunnery";
    if (field === "specializations") return `field-spec-${record.specializations[0] ?? "marines"}`;
    if (field === "rulesLevel") return "field-rulesLevel";
    return `field-${field}`;
  };

  return (
    <div className="sr-page bt-editor" onBlur={endGroup}>
      <header className="bt-editor__header">
        <div className="bt-editor__title">
          <Link className="bt-back" to={CLASSIC_HOME}>
            <span aria-hidden="true">&larr; </span>Your 'Mechs and platoons
          </Link>
          <h1 tabIndex={-1}>{title || "Unnamed platoon"}</h1>
          <p className="bt-hint">Conventional infantry, built under TechManual.</p>
        </div>
        <div className="bt-actions">
          <button type="button" className="bt-button" disabled={!dirty} onClick={() => { void save(); }}>Save</button>
          <Link className="bt-button bt-button--secondary" to={sheetHref(record.id)}>Record sheet</Link>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canUndo} onClick={undo}>Undo</button>
          <button type="button" className="bt-button bt-button--secondary" disabled={!canRedo} onClick={redo}>Redo</button>
          <button type="button" className="bt-button bt-button--secondary" onClick={() => { downloadInfantry(record); setStatus("Export started."); }}>Export</button>
        </div>
      </header>
      <div className="bt-editor__status">
        <div role="status">{justSaved && !dirty ? "Saved." : status}</div>
        <div role="alert" className="bt-problem">{problem}</div>
      </div>
      {dirty && <p className="bt-hint">You have changes that are not saved.</p>}

      <div className="bt-editor__side">
        <section className="bt-panel bt-findings" aria-labelledby="inf-rules-heading">
          <h2 id="inf-rules-heading">Rules check</h2>
          <p className="bt-findings__summary" aria-live="polite">
            {findings.length === 0 ? "No problems found." : `${String(findings.filter((f) => f.level === "error").length)} errors, ${String(findings.filter((f) => f.level === "warning").length)} warnings, ${String(findings.filter((f) => f.level === "note").length)} notes`}
          </p>
          {(["error", "warning", "note"] as const).map((lv) => {
            const group = findings.filter((f) => f.level === lv);
            return group.length === 0 ? null : (
              <div key={lv} className={`bt-findings__group bt-findings__group--${lv}`}>
                <h3>{lv === "error" ? "Errors" : lv === "warning" ? "Warnings" : "Notes"}</h3>
                <ul className="bt-list">
                  {group.map((f, i) => {
                    const to = target(f);
                    return (
                      <li key={`${f.check}-${String(i)}`} className="bt-finding">
                        {to ? <button type="button" className="bt-finding__text" onClick={() => { document.getElementById(to)?.focus(); }}>{f.message}</button> : <span className="bt-finding__text">{f.message}</span>}
                        {f.cite && <span className="bt-finding__cite">{f.cite}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
        <section className="bt-panel" aria-labelledby="inf-figures">
          <h2 id="inf-figures">Platoon figures</h2>
          <ul className="bt-list bt-readout">
            <li>{`${String(platoon.troopers)} troopers${platoon.lines.length > 1 ? ` in ${String(platoon.lines.length)} sub-platoons` : ""}`}</li>
            <li>{`Movement ${String(platoon.mp)} ${platoon.mpType}${platoon.moveOrShoot ? ", move or fire" : ""}`}</li>
            <li>{`Damage ${String(platoon.totalDamage)} at full strength, ${num(platoon.perTrooper)} a trooper`}</li>
            <li>{`Weight ${num(platoon.weight)} tons`}</li>
            <li>{bv.bv === undefined ? "Battle Value: not worked out yet." : `Battle Value ${String(bv.bv)}`}</li>
            <li>{`Cost ${money(cost.total)} C-bills`}</li>
          </ul>
          <InfantryDiagram kind={motiveOf(record.motive)?.mechanized ? "mechanized" : record.motive} locations={platoon.lines.map((n, i) => ({ code: lineCode(i, platoon.lines.length), name: platoon.lines.length === 1 ? "Platoon" : `Sub-platoon ${String(i + 1)}`, armor: n }))} use="armor" />
        </section>
      </div>

      <div className="bt-editor__body">
        <div className="bt-editor__fields">
          <section className="bt-panel" aria-labelledby="inf-identity">
            <h2 id="inf-identity">Identity</h2>
            <div className="bt-grid">
              <TextField id="field-name" label="Name" value={record.name.chassis} onChange={(v) => { edit((d) => void (d.name.chassis = v), "name"); }} />
              <TextField id="field-name-model" label="Model" value={record.name.model} onChange={(v) => { edit((d) => void (d.name.model = v), "model"); }} />
              <LevelSelect record={record} onChange={(lv) => { edit((d) => void (d.rulesLevel = lv)); }} />
              <YearEraFields record={record} onEdit={edit} hint={record.year === null ? "Without a year, no era limits what is offered." : undefined} />
              <SelectField id="field-techBase" label="Tech base" value={record.techBase} options={bases.map(([value, label]) => ({ value, label }))} onChange={(v) => { edit((d) => { d.techBase = v === "clan" ? "clan" : "inner-sphere"; eraFollowsBase(d); d.formation = d.techBase === "clan" ? "clan" : "generic"; resize(d); }); }} />
              <SelectField id="field-formation" label="Affiliation" hint={`Sets the standard squad and platoon size (TechManual, p. 147).${room === 0 ? "" : ` ${FORMATIONS.find((f) => f.id === record.formation)?.label ?? ""}.`}`} value={record.formation} options={FORMATIONS.filter((f) => (f.clan === true) === (record.techBase === "clan")).map((f) => ({ value: f.id, label: room === 0 ? f.label : shortAffiliation(f.label) }))} onChange={(v) => { edit((d) => { d.formation = v; resize(d); }); }} />
            </div>
          </section>

          <section className="bt-panel" aria-labelledby="inf-platoon">
            <h2 id="inf-platoon">Platoon</h2>
            <div className="bt-grid">
              <SelectField id="field-motive" label="Type" hint="Motive type (TechManual, p. 145)." value={record.motive} options={motives.map((m) => ({ value: m.id, label: m.label }))} onChange={(v) => { edit((d) => { d.motive = v; resize(d); if (v === "beast") { d.beast = d.beast ?? "horse"; [d.perSquad, d.squads] = beastSize(beastOf(d.beast)); } if (platoonOf(d, catalog).motive?.mechanized) d.antiMech = false; }); }} />
              {record.motive === "beast" && <SelectField id="field-beast" label="Creature" hint="Beast-Mounted Infantry Sample Types Table (Tactical Operations: Advanced Units and Equipment, p. 106)." value={record.beast ?? ""} options={[{ value: "", label: "Choose a creature" }, ...BEASTS.map((b) => ({ value: b.id, label: `${b.name} (${b.size}, ${String(b.mp)} ${b.mpType} MP, ${String(b.weight)} t)` }))]} onChange={(v) => { edit((d) => { d.beast = v === "" ? null : v; [d.perSquad, d.squads] = beastSize(beastOf(v)); }); }} />}
              <NumberField id="field-squads" label="Squads" value={record.squads} min={1} onValid={(v) => { edit((d) => void (d.squads = Math.floor(v ?? d.squads)), "squads"); }} />
              <NumberField id="field-perSquad" label="Troopers a squad" value={record.perSquad} min={1} hint={platoon.motive ? `At most ${String(platoon.motive.maxSquad)} for this type.` : undefined} onValid={(v) => { edit((d) => void (d.perSquad = Math.floor(v ?? d.perSquad)), "perSquad"); }} />
              {!mechanized && (
                <label className="bt-check bt-grid__wide" htmlFor="field-antiMech">
                  <input id="field-antiMech" type="checkbox" checked={record.antiMech} onChange={(e) => { edit((d) => void (d.antiMech = e.target.checked)); }} />
                  Anti-'Mech training and kit (TechManual, p. 155)
                </label>
              )}
              <NumberField id="field-gunnery" label="Gunnery skill" value={record.skills.gunnery} min={0} onValid={(v) => { edit((d) => void (d.skills.gunnery = Math.floor(v ?? d.skills.gunnery)), "gunnery"); }} />
              {!mechanized && record.antiMech && <NumberField id="field-antimech-skill" label="Anti-'Mech skill" value={record.skills.antiMech} min={0} onValid={(v) => { edit((d) => void (d.skills.antiMech = Math.floor(v ?? d.skills.antiMech)), "antiMech"); }} />}
            </div>
          </section>

          <section className="bt-panel" aria-labelledby="inf-weapons">
            <h2 id="inf-weapons">Weapons</h2>
            <div className="bt-grid">
              <SelectField id="field-primary" label="Primary weapon" value={record.primary ?? ""} options={[{ value: "", label: "None chosen" }, ...primaries.map((r) => ({ value: r.id, label: weaponLabel(r) }))]} onChange={(v) => { edit((d) => void (d.primary = v === "" ? null : v)); }} />
              <SelectField id="field-secondary" label="Secondary weapon" value={record.secondary.weapon ?? ""} options={[{ value: "", label: "None" }, ...secondaries.map((r) => ({ value: r.id, label: weaponLabel(r) }))]} onChange={(v) => { edit((d) => { d.secondary.weapon = v === "" ? null : v; if (v === "") d.secondary.perSquad = 0; else if (d.secondary.perSquad === 0) d.secondary.perSquad = 1; }); }} />
              <NumberField id="field-secondary-count" label="Secondary weapons a squad" value={record.secondary.perSquad} min={0} hint={platoon.secondary ? `This squad may carry up to ${String(platoon.secondaryLimit)}.` : undefined} onValid={(v) => { edit((d) => void (d.secondary.perSquad = Math.floor(v ?? 0)), "secondaryCount"); }} />
            </div>
          </section>

          {(levelAtLeast(level, "advanced") || advancedHeld) && (
            <section className="bt-panel" aria-labelledby="inf-advanced">
              <h2 id="inf-advanced">Armor, specialties and equipment</h2>
              <div className="bt-grid">
                <SelectField id="field-armor" label="Armor kit" hint={record.armor ? `Damage divisor ${String(armorKitOf(record.armor)?.divisor ?? 1)}.` : "Tactical Operations: Advanced Units and Equipment, p. 129."} value={record.armor ?? ""} options={[{ value: "", label: "No armor kit" }, ...kitsOffered.map((k) => ({ value: k.id, label: `${k.name} (divisor ${String(k.divisor)}${k.encumbering ? ", encumbering" : ""})` }))]} onChange={(v) => { edit((d) => void (d.armor = v === "" ? null : v)); }} />
              </div>
              {sneakKit?.systems && <SneakSystemsField kit={sneakKit} systems={platoon.sneakSystems} onChange={(list) => { edit((d) => void (d.sneakSystems = list)); }} />}
              <fieldset className="bt-arm">
                <legend>Specialties (Veteran troops or better)</legend>
                {specsOffered.map((s) => (
                  <label key={s.id} className="bt-check" htmlFor={`field-spec-${s.id}`}>
                    <input id={`field-spec-${s.id}`} type="checkbox" checked={record.specializations.includes(s.id)} onChange={(e) => { edit((d) => { d.specializations = e.target.checked ? [...d.specializations, s.id] : d.specializations.filter((x) => x !== s.id); }); }} />
                    {s.name}
                  </label>
                ))}
              </fieldset>
              <div className="bt-grid">
                {showMedics && (
                  <>
                    <NumberField id="field-paramedics" label="Paramedics a squad" value={record.paramedics} min={0} hint={`Each replaces a Secondary Weapon trooper; ${String(SECONDARY_SLOT_TROOPS.perSquad)} a squad with TAG troops at most (Tactical Operations: Advanced Units and Equipment, p. 153).`} onValid={(v) => { edit((d) => void (d.paramedics = Math.floor(v ?? 0)), "paramedics"); }} />
                    <NumberField id="field-tagTroops" label="TAG troops a squad" value={record.tagTroops} min={0} hint="TAG troops work only with 2 in a squad; the TAG reaches 3, 6 and 9 hexes." onValid={(v) => { edit((d) => void (d.tagTroops = Math.floor(v ?? 0)), "tagTroops"); }} />
                  </>
                )}
                {showXct && <SelectField id="field-xct" label="Condition-trained for" hint="Needs an armor kit made for the environment (Tactical Operations: Advanced Units and Equipment, p. 162)." value={record.xct ?? ""} options={[{ value: "", label: "Not condition-trained" }, ...XCT_ENVIRONMENTS.map((x) => ({ value: x.id, label: x.label }))]} onChange={(v) => { edit((d) => void (d.xct = v === "" ? null : v)); }} />}
              </div>
              {showGuns && (
                <div className="bt-grid">
                  <SelectField id="field-fieldGun" label="Field gun" hint={platoon.fieldGun ? `Each needs ${String(platoon.gunCrew)} troopers.` : "An autocannon or Gauss weapon, towed (Tactical Operations: Advanced Units and Equipment, p. 122)."} value={record.fieldGun.weapon ?? ""} options={[{ value: "", label: "No field gun" }, ...gunsOffered.map((r) => ({ value: r.id, label: `${r.name}${r.techBase === "clan" ? " (Clan)" : ""}` }))]} onChange={(v) => { edit((d) => { d.fieldGun.weapon = v === "" ? null : v; if (v === "") d.fieldGun.count = 0; else if (d.fieldGun.count === 0) d.fieldGun.count = 1; }); }} />
                  <NumberField id="field-fieldGun-count" label="Field guns" value={record.fieldGun.count} min={0} onValid={(v) => { edit((d) => void (d.fieldGun.count = Math.floor(v ?? 0)), "fieldGunCount"); }} />
                  <SelectField id="field-fieldArtillery" label="Field artillery" hint="One piece; the platoon then moves 1 MP (p. 123)." value={record.fieldArtillery ?? ""} options={[{ value: "", label: "No field artillery" }, ...artilleryOffered.map((r) => ({ value: r.id, label: `${r.name}${r.techBase === "clan" ? " (Clan)" : ""}` }))]} onChange={(v) => { edit((d) => void (d.fieldArtillery = v === "" ? null : v)); }} />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {blocker.state === "blocked" && <LeaveConfirm proceed={blocker.proceed} reset={blocker.reset} />}
    </div>
  );
}
