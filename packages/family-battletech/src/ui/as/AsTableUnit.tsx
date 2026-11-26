// One unit's card at the table: bubbles, what the hits have done to its numbers, the crippled numbers, and the orders for this turn.
import { useState } from "react";
import { AS_CRIT_EFFECTS, AS_CRIT_TABLES, AS_CRIT_TABLE_OF } from "../../data/alpha-strike";
import type { CritKind } from "../../data/alpha-strike";
import { applyCrit, crippled, currentDamage, currentOv, currentMove, currentTmm, escape, recordMove, tracksHeat } from "../../rules/as-play";
import type { MotiveResult, MoveMode } from "../../rules/as-play";
import { skillAdjustedPv } from "../../rules/as-force";
import type { AsMember } from "../../rules/as-force";
import { applyMotive, attackModifier, crippleChecks, critRow, motiveRow, setPlay, setUnit, stageHit, unstageHit } from "../../rules/as-table";
import type { TableState } from "../../rules/as-table";
import { formatDamage, formatMove, unitTitle } from "../../rules/as-unit";
import type { AsUnit } from "../../rules/as-unit";
import { Bubbles, Stepper } from "./AsTableParts";

const MOVES: [MoveMode, string][] = [
  ["standstill", "Stood still"],
  ["ground", "Moved"],
  ["jump", "Jumped"],
];
const MOTIVE: [MotiveResult, string][] = [
  ["minus", "-2 Move and -1 TMM"],
  ["half", "Half Move and TMM"],
  ["immobile", "Immobilized"],
];
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const roll2d6 = () => rollDie() + rollDie();

/** The kinds of critical hit a unit's table can give, from the one data table, as the boxes of its card. */
function critKinds(type: string): CritKind[] {
  const which = AS_CRIT_TABLE_OF[type];
  if (which === undefined) return [];
  const all = which === "weapon-only" ? (["weapon"] as CritKind[]) : AS_CRIT_TABLES[which];
  return [...new Set(all)].filter((k) => k !== "none");
}

interface Props {
  index: number;
  unit: AsUnit;
  member: AsMember;
  table: TableState;
  change: (next: TableState) => void;
}

export default function AsTableUnit({ index, unit, member, table, change }: Props) {
  const entry = table.units[index];
  const [draft, setDraft] = useState(0);
  const [critCheck, setCritCheck] = useState(false);
  const [rolled, setRolled] = useState("");
  const [motive, setMotive] = useState<MotiveResult>("minus");
  if (!entry) return null;
  const { play } = entry;
  const card = unit.card;
  const name = unitTitle(unit) || "Unnamed unit";
  const dmg = currentDamage(play, card);
  const tmm = currentTmm(play, card);
  const checks = crippleChecks(play, card);
  const isCrippled = crippled(play, card, "asce");
  const out = play.destroyed || play.escaped;
  const staged = play.staged.map((h) => h.damage);
  const stagedTotal = staged.reduce((a, b) => a + b, 0);
  const vehicle = card.type === "CV" || card.type === "SV";
  const status = play.destroyed ? "Destroyed" : play.escaped ? "Left the table" : play.shutdown ? "Shut down" : isCrippled ? "Crippled" : "";
  const heat = tracksHeat(card);
  const id = (what: string) => `${what}-${String(index)}`;
  const crit = (kind: CritKind) => { change(setPlay(table, index, applyCrit(play, card, kind).state)); };
  const count = (kind: CritKind): number | null =>
    kind === "weapon" ? play.crits.weapon : kind === "fire-control" ? play.crits.fireControl : kind === "engine" ? play.crits.engine : kind === "mp" ? play.moveHits.filter((h) => h === "mp").length : null;
  const motiveHits = play.moveHits.filter((h) => h !== "mp").map((h) => (h === "motive-2" ? "-2" : h === "motive-half" ? "half" : "immobile"));
  const stageDraft = () => {
    change(stageHit(table, index, { damage: draft, ...(critCheck ? { critCheck: true } : {}) }));
    setDraft(0);
    setCritCheck(false);
  };

  const rows: [string, string][] = [
    ...(heat ? [["Heat", play.heat >= 4 ? "S (shut down)" : `${String(play.heat)} of 4, S at 4`] as [string, string]] : []),
    ["Move", formatMove(currentMove(play, card)) || "-"],
    ["TMM", tmm === null ? "-" : String(tmm)],
    ["Damage S/M/L", `${formatDamage(dmg.s)}/${formatDamage(dmg.m)}/${formatDamage(dmg.l)}`],
    ...(play.shutdown || out ? [] : [["To-hit added, weapon attacks (pp. 50, 52)", `+${String(attackModifier(play, card))}`] as [string, string]]),
    ...(play.moved ? [["Target TMM this turn", String(play.moved.tmm)] as [string, string]] : []),
    ...(motiveHits.length > 0 ? [["Motive damage", motiveHits.join(", ")] as [string, string]] : []),
    ...(play.stunned ? [["Crew", "stunned until the End Phase"] as [string, string]] : []),
  ];

  return (
    <li className={`as-table__unit${out ? " as-table__unit--down" : ""}`}>
      <h2>{`${name}${member.pilot ? `, ${member.pilot}` : ""}`}</h2>
      <p>{`Skill ${String(member.skill)}, PV ${String(skillAdjustedPv(card.pv, member.skill))}${status ? `. ${status}` : ""}`}</p>
      {!out && (
        <>
          <Bubbles name="Armor" unit="armor" count={play.armor} full={card.armor} before={0} waiting={stagedTotal} marking={draft} onMark={setDraft} />
          <Bubbles name="Structure" unit="structure" count={play.structure} full={card.structure} before={play.armor} waiting={stagedTotal} marking={draft} onMark={setDraft} />
        </>
      )}
      {out && <p>{`Armor ${String(play.armor)} of ${String(card.armor)}, structure ${String(play.structure)} of ${String(card.structure)}.`}</p>}
      <dl className="as-card__grid">
        {rows.map(([k, v]) => (
          <div key={k} className="as-card__cell">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {!play.destroyed && (
        <details className="as-table__cripple" open={isCrippled}>
          <summary>{isCrippled ? "Crippled: yes" : "Crippled: not yet"}</summary>
          <ul>
            {checks.map((c) => (
              <li key={c.id}>{`${c.met ? "Met" : "Not met"}: ${c.text}`}</li>
            ))}
          </ul>
          {isCrippled && !play.escaped && <p>With Forced Withdrawal in play (ASCE p. 126) it moves its full Move toward its home edge and leaves the game there.</p>}
        </details>
      )}
      {!out && (
        <fieldset className="as-table__controls">
          <legend>{`Orders for ${name}`}</legend>
          <Stepper id={id("hit")} label="Damage taken" value={draft} min={0} onChange={setDraft} />
          <div className="bt-field">
            <label>
              <input type="checkbox" checked={critCheck} onChange={(event) => { setCritCheck(event.target.checked); }} /> Natural 12, Death from Above or Anti-&apos;Mech hit
            </label>
          </div>
          <p className="bt-row__actions">
            <button type="button" className="bt-button bt-button--secondary" disabled={draft < 1 && !critCheck} onClick={stageDraft}>
              Stage the hit
            </button>
            <button type="button" className="bt-button bt-button--secondary" disabled={staged.length === 0} onClick={() => { change(unstageHit(table, index)); }}>
              Take back the last hit
            </button>
          </p>
          {staged.length > 0 && <p role="status">{`Waiting for the End Phase: ${staged.join(" + ")} = ${String(stagedTotal)}.`}</p>}
          <div className="bt-field">
            <label htmlFor={id("move")}>This turn it</label>
            <select id={id("move")} value={play.moved?.mode ?? ""} onChange={(event) => { if (event.target.value) change(setPlay(table, index, recordMove(play, card, event.target.value as MoveMode))); }}>
              <option value="">Has not moved yet</option>
              {MOVES.map(([v, text]) => (
                <option key={v} value={v}>
                  {text}
                </option>
              ))}
            </select>
          </div>
          {heat && (
            <>
              {!play.shutdown && (
                <div className="bt-field">
                  <label>
                    <input type="checkbox" checked={entry.attacked} onChange={(event) => { change(setUnit(table, index, { attacked: event.target.checked })); }} /> Made a weapon attack this turn
                  </label>
                </div>
              )}
              {currentOv(play, card) > 0 && (
                <Stepper id={id("ov")} label={`Overheat used (up to ${String(currentOv(play, card))})`} value={entry.overheat} max={currentOv(play, card)} onChange={(n) => { change(setUnit(table, index, { overheat: n, ...(n > 0 ? { attacked: true } : {}) })); }} />
              )}
              <div className="bt-field">
                <label>
                  <input type="checkbox" checked={entry.deliberate} onChange={(event) => { change(setUnit(table, index, { deliberate: event.target.checked })); }} /> Raises its heat by 1 on purpose
                </label>
              </div>
            </>
          )}
          {heat ? (
            <Stepper id={id("ext")} label="Heat from enemy attacks (most 2)" value={entry.external} max={2} onChange={(n) => { change(setUnit(table, index, { external: n })); }} />
          ) : (
            <Stepper id={id("ext")} label="Heat (HT) damage from enemy attacks" value={entry.external} onChange={(n) => { change(setUnit(table, index, { external: n })); }} />
          )}
          <div role="group" aria-label={`Critical hits for ${name}`} className="as-crits">
            <p className="as-crits__title">Critical hits so far (press a box to add one by hand)</p>
            <div className="as-crits__boxes">
              {critKinds(card.type).map((kind) => {
                const n = count(kind);
                return (
                  <button key={kind} type="button" className="bt-button bt-button--secondary" onClick={() => { crit(kind); }}>
                    {`${AS_CRIT_EFFECTS[kind].label}${n === null ? "" : `: ${String(n)}`}`}
                  </button>
                );
              })}
            </div>
            <p className="bt-row__actions">
              <button
                type="button"
                className="bt-button"
                onClick={() => {
                  const row = critRow(card, roll2d6());
                  const result = applyCrit(play, card, row.kind);
                  change(setPlay(table, index, result.state));
                  setRolled(`${row.text}. ${result.events.map((e) => e.text).join(" ")}`.trim());
                }}
              >
                Roll a critical for me
              </button>
              {vehicle && (
                <button
                  type="button"
                  className="bt-button"
                  onClick={() => {
                    const row = motiveRow(card, roll2d6());
                    change(setPlay(table, index, applyMotive(play, row.result)));
                    setRolled(row.text);
                  }}
                >
                  Roll motive damage for me
                </button>
              )}
            </p>
            {vehicle && (
              <div className="bt-field">
                <label htmlFor={id("motive")}>Motive result rolled by hand</label>
                <select id={id("motive")} value={motive} onChange={(event) => { setMotive(event.target.value as MotiveResult); }}>
                  {MOTIVE.map(([v, text]) => (
                    <option key={v} value={v}>
                      {text}
                    </option>
                  ))}
                </select>
                <button type="button" className="bt-button bt-button--secondary" onClick={() => { change(setPlay(table, index, applyMotive(play, motive))); }}>
                  Apply the motive result
                </button>
              </div>
            )}
            <p role="status">{rolled}</p>
          </div>
          <p className="bt-row__actions">
            {isCrippled && (
              <button type="button" className="bt-button bt-button--secondary" onClick={() => { change(setPlay(table, index, escape(play))); }}>
                Left the table
              </button>
            )}
            <button type="button" className="bt-button bt-button--secondary" onClick={() => { change(setPlay(table, index, { ...play, destroyed: true })); }}>
              Mark destroyed
            </button>
          </p>
        </fieldset>
      )}
    </li>
  );
}
